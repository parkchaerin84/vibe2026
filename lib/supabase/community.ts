import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthorClient, getPublicClient } from "./client";
import { ConnectionError } from "./config";
import type { CommentRow, Database, PostInsert, PostRow } from "./database";
import { SHARE_LINES, type ShareReference } from "../transit/share-routes";

export const CATEGORIES = ["혼잡", "시설", "안전", "서비스", "기타"] as const;
export const POST_COLUMNS = "id,line_id,line_station_id,category,title,body,created_at,updated_at";
export const COMMENT_COLUMNS = "id,post_id,body,created_at,updated_at";
export const PAGE_SIZE = 20;
export type PostFilters = { category?: string; lineId?: string; membershipId?: string };
export type OwnedCommunityIds = { posts: string[]; comments: string[] };

function text(value: string, max: number, label: string) {
  const normalized = value.trim();
  if (!normalized || Array.from(normalized).length > max) throw new ConnectionError("validation", `${label}은 1~${max}자로 입력해 주세요.`);
  return normalized;
}

export function validatePost(draft: PostInsert, reference: ShareReference): PostInsert {
  const definition = SHARE_LINES.find(line => line.key === reference.lineKey);
  if (!definition || draft.line_id !== reference.lineId || reference.stations.length !== definition.stations.length ||
      new Set(reference.stations.map(s => s.membershipId)).size !== definition.stations.length ||
      new Set(reference.stations.map(s => s.sourceCode)).size !== definition.stations.length ||
      definition.stations.some(approved => !reference.stations.some(s => s.sourceCode === approved.sourceCode && s.name === approved.name)) ||
      (draft.line_station_id !== null && !reference.stations.some(station => station.membershipId === draft.line_station_id))) {
    throw new ConnectionError("validation", "조회된 노선과 역을 선택해 주세요.");
  }
  if (!CATEGORIES.some(category => category === draft.category)) throw new ConnectionError("validation", "분류를 선택해 주세요.");
  return { line_id: draft.line_id, line_station_id: draft.line_station_id, category: draft.category,
    title: text(draft.title, 100, "제목"), body: text(draft.body, 5000, "내용") };
}

function failure(error: { code?: string; message?: string }): ConnectionError {
  if (error.code === "P0001" && ["Write rate limit exceeded", "Daily write limit exceeded"].includes(error.message ?? "")) {
    return new ConnectionError("limit", "작성·수정 횟수 제한에 도달했습니다. 잠시 후 다시 이용해 주세요.");
  }
  if (["42501", "PGRST301", "PGRST303"].includes(error.code ?? "")) return new ConnectionError("permission", "작성자 세션 또는 접근 권한을 확인해 주세요. 브라우저 데이터를 지우면 본인 글의 관리 권한을 잃을 수 있습니다.");
  if (error.code === "23503") return new ConnectionError("reference", "게시글이 삭제되었거나 노선·역 정보가 변경되었습니다. 새로고침해 주세요.");
  if (["23514", "22P02"].includes(error.code ?? "")) return new ConnectionError("validation", "입력값을 확인해 주세요. 제목·내용의 길이와 선택한 노선·역이 유효해야 합니다.");
  return new ConnectionError("write", "처리 결과를 확인하지 못했습니다. 중복 작성을 피하려면 먼저 새로고침해 저장 여부를 확인해 주세요.");
}

function pageNumber(page: number) {
  if (!Number.isSafeInteger(page) || page < 0 || page > 1_000_000) throw new ConnectionError("validation", "페이지 번호가 유효하지 않습니다.");
  return page * PAGE_SIZE;
}

export async function loadPosts(filters: PostFilters = {}, page = 0, client: SupabaseClient<Database> = getPublicClient()) {
  const offset = pageNumber(page);
  let query = client.from("posts").select(POST_COLUMNS).order("created_at", { ascending: false }).order("id", { ascending: false });
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.lineId) query = query.eq("line_id", filters.lineId);
  if (filters.membershipId) query = query.eq("line_station_id", filters.membershipId);
  // One extra row determines whether there is a next page without an exact count.
  const { data, error } = await query.range(offset, offset + PAGE_SIZE).retry(false);
  if (error) throw new ConnectionError("read", "게시글을 불러오지 못했습니다. 연결과 공개 조회 권한을 확인한 뒤 새로고침해 주세요.");
  return { rows: (data ?? []).slice(0, PAGE_SIZE), hasNext: (data?.length ?? 0) > PAGE_SIZE };
}

export async function loadPost(id: string, client: SupabaseClient<Database> = getPublicClient()): Promise<PostRow | null> {
  const { data, error } = await client.from("posts").select(POST_COLUMNS).eq("id", id).maybeSingle().retry(false);
  if (error) throw new ConnectionError("read", "게시글을 불러오지 못했습니다. 새로고침해 주세요.");
  return data;
}

export async function loadComments(postId: string, page = 0, client: SupabaseClient<Database> = getPublicClient()) {
  const offset = pageNumber(page);
  const { data, error } = await client.from("comments").select(COMMENT_COLUMNS).eq("post_id", postId)
    .order("created_at").order("id").range(offset, offset + PAGE_SIZE).retry(false);
  if (error) throw new ConnectionError("read", "댓글을 불러오지 못했습니다. 새로고침해 주세요.");
  return { rows: (data ?? []).slice(0, PAGE_SIZE), hasNext: (data?.length ?? 0) > PAGE_SIZE };
}

export async function loadMyCommunityIds(client: SupabaseClient<Database> = getAuthorClient()): Promise<OwnedCommunityIds> {
  const session = await client.auth.getSession();
  if (session.error) throw new ConnectionError("session", "작성자 세션을 확인하지 못했습니다.");
  if (!session.data.session) return { posts: [], comments: [] };
  const { data, error } = await client.rpc("my_content_ids").retry(false);
  if (error) throw new ConnectionError("ownership", "본인 글 확인에 실패했습니다. 공개 조회는 가능하지만 수정·삭제 버튼은 표시하지 않습니다.");
  return { posts: (data ?? []).filter(row => row.kind === "posts").map(row => row.id),
    comments: (data ?? []).filter(row => row.kind === "comments").map(row => row.id) };
}

export async function createPost(draft: PostInsert, reference: ShareReference, client?: SupabaseClient<Database>): Promise<PostRow> {
  const payload = validatePost(draft, reference);
  const { data, error } = await (client ?? getAuthorClient()).from("posts").insert(payload).select(POST_COLUMNS).single().retry(false);
  if (error || !data) throw failure(error ?? {});
  return data;
}

export async function updatePost(previous: Pick<PostRow, "id" | "updated_at">, draft: PostInsert, reference: ShareReference, client?: SupabaseClient<Database>): Promise<PostRow> {
  const payload = validatePost(draft, reference);
  const { data, error } = await (client ?? getAuthorClient()).from("posts").update(payload)
    .eq("id", previous.id).eq("updated_at", previous.updated_at).select(POST_COLUMNS).retry(false);
  if (error) throw failure(error);
  if (data?.length !== 1) throw unchanged();
  return data[0];
}

export async function createComment(postId: string, body: string, client?: SupabaseClient<Database>): Promise<CommentRow> {
  const payload = { post_id: postId, body: text(body, 2000, "댓글") };
  const { data, error } = await (client ?? getAuthorClient()).from("comments").insert(payload).select(COMMENT_COLUMNS).single().retry(false);
  if (error || !data) throw failure(error ?? {});
  return data;
}

export async function updateComment(previous: Pick<CommentRow, "id" | "updated_at">, body: string, client?: SupabaseClient<Database>): Promise<CommentRow> {
  const payload = { body: text(body, 2000, "댓글") };
  const { data, error } = await (client ?? getAuthorClient()).from("comments").update(payload)
    .eq("id", previous.id).eq("updated_at", previous.updated_at).select(COMMENT_COLUMNS).retry(false);
  if (error) throw failure(error);
  if (data?.length !== 1) throw unchanged();
  return data[0];
}

function unchanged() { return new ConnectionError("unchanged", "변경되지 않았습니다. 본인 글이 아니거나 이미 변경·삭제되었을 수 있습니다. 새로고침 후 확인해 주세요."); }

export async function deletePost(previous: Pick<PostRow, "id" | "updated_at">, client: SupabaseClient<Database> = getAuthorClient()) {
  const { data, error } = await client.from("posts").delete().eq("id", previous.id).eq("updated_at", previous.updated_at).select("id").retry(false);
  if (error) throw failure(error);
  if (data?.length !== 1) throw unchanged();
}

export async function deleteComment(previous: Pick<CommentRow, "id" | "updated_at">, client: SupabaseClient<Database> = getAuthorClient()) {
  const { data, error } = await client.from("comments").delete().eq("id", previous.id).eq("updated_at", previous.updated_at).select("id").retry(false);
  if (error) throw failure(error);
  if (data?.length !== 1) throw unchanged();
}
