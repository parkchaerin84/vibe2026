import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthorClient, getPublicClient } from "./client";
import { ConnectionError } from "./config";
import type { Database, SeatShareInsert, SeatShareRow } from "./database";
import { SHARE_LINES, reachableStations, routeForDirection, type ShareReference } from "../transit/share-routes";
import { SHARE_CAR_LIMITS } from "../transit/car-policy";

export const SHARE_COLUMNS = "id,line_id,current_line_station_id,exit_line_station_id,car_number,direction_label,created_at,expires_at";
export const DIRECTIONS = ["신사 방면", "광교 방면"] as const;

export function validateShare(draft: SeatShareInsert, reference: ShareReference): SeatShareInsert {
  const definition = SHARE_LINES.find(line => line.key === reference.lineKey);
  const members = new Set(reference.stations.map(s => s.membershipId));
  if (!definition || draft.line_id !== reference.lineId || reference.stations.length !== definition.stations.length ||
      members.size !== definition.stations.length ||
      new Set(reference.stations.map(s => s.sourceCode)).size !== definition.stations.length ||
      definition.stations.some(approved => !reference.stations.some(s => s.sourceCode === approved.sourceCode && s.name === approved.name)) ||
      !members.has(draft.current_line_station_id) || !members.has(draft.exit_line_station_id)) {
    throw new ConnectionError("validation", "조회된 노선의 검증된 역을 선택해 주세요.");
  }
  if (draft.current_line_station_id === draft.exit_line_station_id) throw new ConnectionError("validation", "현재 역과 하차 예정 역을 다르게 선택해 주세요.");
  const carLimit = SHARE_CAR_LIMITS[reference.lineKey];
  if (!Number.isInteger(draft.car_number) || draft.car_number < 1 || draft.car_number > carLimit) {
    throw new ConnectionError("validation", `${definition.name} 탑승 칸은 1~${carLimit}번 중에서 선택해 주세요.`);
  }
  const route = routeForDirection(reference, draft.direction_label);
  if (!route) throw new ConnectionError("validation", "운행 구간에 맞는 방향을 선택해 주세요.");
  if (!reachableStations(reference, route, draft.current_line_station_id, draft.direction_label)
      .some(s => s.membershipId === draft.exit_line_station_id)) {
    throw new ConnectionError("validation", "선택한 구간과 방향으로 도달할 수 없는 하차 예정 역입니다. 환승이 필요한 구간은 나누어 공유해 주세요.");
  }
  // Explicit allowlist: never send caller-supplied owner, IDs or timestamps.
  return { line_id: draft.line_id, current_line_station_id: draft.current_line_station_id,
    exit_line_station_id: draft.exit_line_station_id, car_number: draft.car_number, direction_label: draft.direction_label };
}

function writeFailure(error: { code?: string; message?: string }): ConnectionError {
  if (error.code === "P0001") {
    if (error.message === "An active share already exists") return new ConnectionError("active", "현재 공유 중인 정보가 있습니다. 기존 정보를 삭제하거나 만료된 뒤 등록해 주세요.");
    if (["Write rate limit exceeded", "Daily write limit exceeded"].includes(error.message ?? "")) return new ConnectionError("limit", "작성 횟수 제한에 도달했습니다. 잠시 후 다시 이용해 주세요.");
  }
  if (["42501", "PGRST301", "PGRST303"].includes(error.code ?? "")) return new ConnectionError("permission", "작성자 세션 또는 접근 권한을 확인해 주세요. 새로고침 후 다시 확인할 수 있습니다.");
  if (["23503", "23514", "22P02"].includes(error.code ?? "")) return new ConnectionError("validation", "선택한 역과 입력값이 유효하지 않습니다. 목록을 새로고침해 주세요.");
  return new ConnectionError("write", "요청 결과를 확인하지 못했습니다. 중복 등록을 피하려면 목록을 먼저 새로고침해 주세요.");
}

export async function loadSeatShares(lineId: string, client: SupabaseClient<Database> = getPublicClient()): Promise<SeatShareRow[]> {
  const { data, error } = await client.from("seat_shares").select(SHARE_COLUMNS).eq("line_id", lineId).order("created_at", { ascending: false });
  if (error) throw new ConnectionError("read", "하차 정보를 불러오지 못했습니다. 연결 및 공개 조회 권한을 확인한 뒤 새로고침해 주세요.");
  return data ?? [];
}

/** Session lookup does not create an anonymous user. RPC never exposes owner_id. */
export async function loadMyShareIds(client: SupabaseClient<Database> = getAuthorClient()): Promise<string[]> {
  const session = await client.auth.getSession();
  if (session.error) throw new ConnectionError("session", "본인 정보 확인에 실패했습니다. 작성자 세션을 확인해 주세요.");
  if (!session.data.session) return [];
  const { data, error } = await client.rpc("my_content_ids");
  if (error) throw new ConnectionError("ownership", "본인 정보 확인에 실패했습니다. 목록은 공개 조회 결과이며 삭제 버튼은 표시하지 않습니다.");
  return (data ?? []).filter(row => row.kind === "seat_shares").map(row => row.id);
}

/** Caller prepares Anonymous Auth on a user-initiated submit before invoking this. */
export async function insertSeatShare(draft: SeatShareInsert, reference: ShareReference, client?: SupabaseClient<Database>): Promise<SeatShareRow> {
  const payload = validateShare(draft, reference);
  const { data, error } = await (client ?? getAuthorClient()).from("seat_shares").insert(payload).select(SHARE_COLUMNS).single().retry(false);
  if (error || !data) throw writeFailure(error ?? {});
  return data;
}

export async function deleteSeatShare(id: string, client: SupabaseClient<Database> = getAuthorClient()): Promise<void> {
  // RLS is authoritative; a forged ID still cannot delete another author's row.
  const { data, error } = await client.from("seat_shares").delete().eq("id", id).select("id").retry(false);
  if (error) throw writeFailure(error);
  if (data?.length !== 1) throw new ConnectionError("not_deleted", "삭제되지 않았습니다. 이미 만료·삭제되었거나 본인 정보가 아닐 수 있습니다. 목록을 새로고침해 주세요.");
}

export function unexpiredShares(rows: SeatShareRow[], now: number): SeatShareRow[] {
  return rows.filter(row => Date.parse(row.expires_at) > now);
}
