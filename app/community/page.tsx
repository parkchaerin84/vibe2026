"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import PostForm, { communityField } from "@/components/community/PostForm";
import Turnstile from "@/components/Turnstile";
import PageHeader from "@/components/ui/PageHeader";
import Icon, { type IconName } from "@/components/ui/Icon";
import { ensureAnonymousAuthor } from "@/lib/supabase/anonymous";
import { ConnectionError, safeErrorMessage } from "@/lib/supabase/config";
import { CATEGORIES, createComment, createPost, deleteComment, deletePost, loadComments, loadMyCommunityIds, loadPost, loadPosts, updateComment, updatePost, validatePost, type OwnedCommunityIds } from "@/lib/supabase/community";
import type { CommentRow, PostInsert, PostRow } from "@/lib/supabase/database";
import { loadShareReference } from "@/lib/supabase/share-reference";
import { type ShareReference } from "@/lib/transit/share-routes";

import { ACTIVE_LINE_KEY, VISIBLE_LINES } from "@/lib/transit/service-scope";

const icons: Record<string, IconName> = { 혼잡: "train", 시설: "facilities", 안전: "shield", 서비스: "community", 기타: "share" };
const date = (value: string) => new Date(value).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
const button = "ui-secondary";

export default function CommunityPage() {
  const [references, setReferences] = useState<ShareReference[]>([]);
  const [referenceError, setReferenceError] = useState("");
  const [referenceLoading, setReferenceLoading] = useState(true);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [category, setCategory] = useState("");
  const [line, setLine] = useState("");
  const [station, setStation] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [post, setPost] = useState<PostRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [commentError, setCommentError] = useState("");
  const [commentPage, setCommentPage] = useState(0);
  const [commentsNext, setCommentsNext] = useState(false);
  const [mine, setMine] = useState<OwnedCommunityIds>({ posts: [], comments: [] });
  const [ownerError, setOwnerError] = useState("");
  const [version, setVersion] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingPost, setEditingPost] = useState(false);
  const [editingComment, setEditingComment] = useState<CommentRow | null>(null);
  const [reply, setReply] = useState("");
  const [editedReply, setEditedReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [writeError, setWriteError] = useState("");
  const [message, setMessage] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const lock = useRef(false);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();

  useEffect(() => {
    let active = true;
    Promise.allSettled(VISIBLE_LINES.map(item => loadShareReference(item.key))).then(results => {
      if (!active) return;
      const ready: ShareReference[] = [];
      const errors: string[] = [];
      results.forEach((result, index) => {
        if (result.status === "fulfilled") ready.push(result.value);
        else errors.push(`${VISIBLE_LINES[index].name}: ${safeErrorMessage(result.reason)}`);
      });
      setReferences(ready); setReferenceError(errors.join(" ")); setReferenceLoading(false);
    });
    return () => { active = false; };
  }, [version]);

  const activeLineId = references.find(item => item.lineKey === ACTIVE_LINE_KEY)?.lineId ?? "";

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setListLoading(true);
      if (!activeLineId) { setPosts([]); setHasNext(false); setListLoading(false); return; }
      loadPosts({ category, lineId: activeLineId, membershipId: station }, page).then(result => {
        if (active) { setPosts(result.rows.filter(item => item.line_id === activeLineId)); setHasNext(result.hasNext); setListError(""); }
      }).catch(error => {
        if (active) { setPosts([]); setHasNext(false); setListError(safeErrorMessage(error)); }
      }).finally(() => { if (active) setListLoading(false); });
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [category, activeLineId, station, page, version]);

  useEffect(() => {
    let active = true;
    loadMyCommunityIds().then(ids => {
      if (active) { setMine(ids); setOwnerError(""); }
    }).catch(error => {
      if (active) { setMine({ posts: [], comments: [] }); setOwnerError(safeErrorMessage(error)); }
    });
    return () => { active = false; };
  }, [version, selectedId]);

  useEffect(() => {
    if (!selectedId || !activeLineId) return;
    let active = true;
    const timer = window.setTimeout(async () => {
      setDetailLoading(true);
      try {
        const loaded = await loadPost(selectedId);
        const result = loaded?.line_id === activeLineId ? loaded : null;
        if (!active) return;
        setPost(result); setDetailError("");
        if (!result) { setComments([]); setCommentError(""); return; }
        try {
          const replies = await loadComments(selectedId, commentPage);
          if (active) { setComments(replies.rows); setCommentsNext(replies.hasNext); setCommentError(""); }
        } catch (error) {
          if (active) { setComments([]); setCommentsNext(false); setCommentError(safeErrorMessage(error)); }
        }
      } catch (error) {
        if (active) { setPost(null); setComments([]); setDetailError(safeErrorMessage(error)); }
      } finally { if (active) setDetailLoading(false); }
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [selectedId, activeLineId, commentPage, version]);

  function refresh() {
    setListLoading(true);
    if (selectedId) setDetailLoading(true);
    setVersion(value => value + 1);
  }

  async function mutate(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setWriteError(""); setMessage("");
    let saved = false;
    try { await action(); saved = true; }
    catch (error) { setWriteError(safeErrorMessage(error)); }
    finally {
      setToken(null); setAttempt(value => value + 1);
      lock.current = false; setBusy(false);
      if (saved) refresh();
    }
  }

  async function savePost(draft: PostInsert) {
    const reference = references.find(item => item.lineId === draft.line_id);
    if (!reference) { setWriteError("선택한 노선 정보를 확인하지 못했습니다. 새로고침해 주세요."); return; }
    await mutate(async () => {
      const payload = validatePost(draft, reference);
      if (editingPost && post) {
        const saved = await updatePost(post, payload, reference);
        setPost(saved); setEditingPost(false); setMessage("게시글을 수정했습니다.");
      } else {
        await ensureAnonymousAuthor({ captchaToken: token ?? undefined });
        const saved = await createPost(payload, reference);
        setShowForm(false); openPost(saved.id); setMessage("게시글을 등록했습니다.");
      }
    });
  }

  function openPost(id: string) {
    setSelectedId(id); setPost(null); setComments([]); setDetailLoading(true); setDetailError("");
    setCommentError(""); setCommentPage(0); setEditingPost(false); setEditingComment(null); setReply(""); setWriteError("");
  }

  function submitReply(event: FormEvent) {
    event.preventDefault();
    if (!post) return;
    void mutate(async () => {
      if (!reply.trim() || Array.from(reply.trim()).length > 2000) throw new ConnectionError("validation", "댓글은 1~2000자로 입력해 주세요.");
      await ensureAnonymousAuthor({ captchaToken: token ?? undefined });
      await createComment(post.id, reply);
      setReply(""); setMessage("댓글을 등록했습니다. 댓글 목록의 마지막 페이지에서 확인할 수 있습니다.");
    });
  }

  function removePost() {
    if (!post || !window.confirm("게시글을 삭제하면 달린 댓글도 모두 삭제됩니다. 삭제할까요?")) return;
    void mutate(async () => {
      await deletePost(post); setSelectedId(null); setPost(null); setEditingPost(false); setMessage("게시글과 댓글을 삭제했습니다.");
    });
  }

  function removeComment(comment: CommentRow) {
    if (!window.confirm("이 댓글을 삭제할까요?")) return;
    void mutate(async () => {
      await deleteComment(comment); setEditingComment(null); setMessage("댓글을 삭제했습니다.");
    });
  }

  const stationName = (id: string | null) => !id ? "노선 전체" : references.flatMap(item => item.stations).find(s => s.membershipId === id)?.name ?? "역 정보 확인 필요";
  const lineName = (id: string) => references.find(item => item.lineId === id)?.lineName ?? "노선 정보 확인 필요";
  const captcha = siteKey ? <Turnstile siteKey={siteKey} attempt={attempt} onToken={setToken} onError={() => setWriteError("봇 방지 확인에 실패했습니다. 다시 확인해 주세요.")} /> : null;
  const canCreate = !siteKey || !!token;
  const canUseReference = references.length > 0 && !referenceLoading;
  const filterReference = references.find(item => item.lineId === (line || activeLineId));

  return <div className="space-y-6">
    <PageHeader title="이용자 커뮤니티" description="같은 노선을 이용하는 우리, 작은 경험과 의견을 함께 나눠요." icon="community" eyebrow="OUR EVERYDAY STORIES" line />
    <section className="ui-card space-y-2">
      <p className="text-sm text-gray-600">이용자가 직접 작성하는 공개 게시판입니다. <strong>공식 철도기관 민원 접수 서비스가 아닙니다.</strong></p>
      <details className="text-xs text-ink-muted"><summary className="py-2 font-semibold">익명 작성과 개인정보 안내</summary><p className="mt-2">개인정보를 입력하지 마세요. 로그인 화면 없이 작성하며 본인 글·댓글만 수정·삭제할 수 있습니다. 브라우저 데이터를 지우거나 기기를 바꾸면 관리 권한을 잃을 수 있습니다. 작성·수정 횟수 제한이 적용됩니다.</p></details>
    </section>
    {referenceError && <p role="alert" className="text-sm text-amber-700">{referenceError} <button className="underline" onClick={refresh} disabled={busy}>다시 불러오기</button></p>}
    {ownerError && <p role="alert" className="text-sm text-amber-700">{ownerError}</p>}
    {message && <p role="status" className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 text-sm">{message}</p>}
    {writeError && <p role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{writeError}</p>}

    {selectedId ? <div className="space-y-4">
      <div className="flex justify-between gap-2">
        <button disabled={busy} className={button} onClick={() => { setSelectedId(null); setEditingPost(false); setEditingComment(null); setWriteError(""); }}>← 목록으로</button>
        <button disabled={busy || detailLoading} className={button} onClick={refresh}>새로고침</button>
      </div>
      {detailLoading ? <p role="status" className="py-8 text-center text-sm text-gray-500">게시글과 댓글을 불러오는 중입니다…</p>
        : detailError ? <p role="alert" className="text-sm text-red-700">{detailError}</p>
        : !post ? <p className="text-sm text-gray-500 py-8 text-center">게시글이 삭제되었거나 더 이상 조회할 수 없습니다.</p>
        : <>
          {editingPost && canUseReference ? <PostForm key={post.id} references={references} initial={post} busy={busy} canSubmit onSave={savePost} onCancel={() => setEditingPost(false)} />
            : <article className="ui-card">
              <div className="flex flex-wrap items-center gap-2 mb-3"><Icon name={icons[post.category] ?? "community"} width={18} height={18} /><span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{post.category}</span>{mine.posts.includes(post.id) && <span className="text-xs text-brand-ink">내 글</span>}</div>
              <h2 className="text-lg font-bold text-gray-900 mb-2 break-words">{post.title}</h2>
              <p className="text-xs text-gray-400 mb-4">{lineName(post.line_id)} · {stationName(post.line_station_id)} · 익명 이용자 · {date(post.created_at)}{post.updated_at !== post.created_at && " · 수정됨"}</p>
              <p className="text-sm text-gray-700 leading-relaxed border-t pt-4 whitespace-pre-wrap break-words">{post.body}</p>
              {mine.posts.includes(post.id) && <div className="flex gap-2 mt-4"><button disabled={busy || !canUseReference || !references.some(item => item.lineId === post.line_id)} className={button} onClick={() => { setEditingPost(true); setEditingComment(null); setWriteError(""); }}>수정</button><button disabled={busy} className={`${button} text-red-600`} onClick={removePost}>삭제</button></div>}
            </article>}
          <section className="space-y-3" aria-label="댓글 목록">
            <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2"><Icon name="community" width={18} height={18} />댓글</h3>
            {commentError ? <p role="alert" className="text-sm text-red-700">{commentError}</p>
              : comments.length === 0 ? <p className="text-sm text-gray-500">{commentPage === 0 ? "아직 댓글이 없습니다." : "이 페이지에 댓글이 없습니다. 이전 페이지를 확인해 주세요."}</p>
              : comments.map(comment => <article key={comment.id} className="rounded-xl p-4 border bg-gray-50 border-gray-200">
                <div className="flex flex-wrap gap-2 items-center mb-2"><span className="text-sm font-semibold text-gray-800">{mine.comments.includes(comment.id) ? "내 댓글" : "익명 이용자"}</span><span className="text-xs text-gray-400">{date(comment.created_at)}{comment.created_at !== comment.updated_at && " · 수정됨"}</span></div>
                {editingComment?.id === comment.id ? <form onSubmit={event => {
                  event.preventDefault(); void mutate(async () => {
                    await updateComment(editingComment, editedReply); setEditingComment(null); setMessage("댓글을 수정했습니다.");
                  });
                }} className="space-y-2">
                  <label className="block text-xs text-gray-500">댓글 수정<textarea required maxLength={2000} disabled={busy} className={`${communityField} min-h-[80px]`} value={editedReply} onChange={e => setEditedReply(e.target.value)} /></label>
                  <button disabled={busy || !editedReply.trim()} className={button}>수정 저장</button> <button disabled={busy} type="button" className={button} onClick={() => setEditingComment(null)}>취소</button>
                </form> : <>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{comment.body}</p>
                  {mine.comments.includes(comment.id) && <div className="flex gap-2 mt-3"><button disabled={busy} className={button} onClick={() => { setEditingComment(comment); setEditedReply(comment.body); setEditingPost(false); setWriteError(""); }}>수정</button><button disabled={busy} className={`${button} text-red-600`} onClick={() => removeComment(comment)}>삭제</button></div>}
                </>}
              </article>)}
            {!commentError && <div className="flex justify-between items-center"><button disabled={busy || commentPage === 0} className={button} onClick={() => { setDetailLoading(true); setCommentPage(value => value - 1); setEditingComment(null); }}>이전 댓글</button><span className="text-xs text-gray-500">{commentPage + 1}페이지</span><button disabled={busy || !commentsNext} className={button} onClick={() => { setDetailLoading(true); setCommentPage(value => value + 1); setEditingComment(null); }}>다음 댓글</button></div>}
          </section>
          {!editingPost && !editingComment && <form onSubmit={submitReply} className="ui-card space-y-3">
            <label className="block font-semibold text-gray-800 text-sm">댓글 작성<textarea className={`${communityField} min-h-[80px] mt-2`} required maxLength={2000} disabled={busy} value={reply} onChange={e => setReply(e.target.value)} placeholder="의견을 남겨주세요. (최대 2,000자)" /></label>
            {captcha}
            <button disabled={busy || !reply.trim() || !canCreate} className="ui-primary">{busy ? "저장 중…" : "댓글 등록"}</button>
          </form>}
        </>}
    </div> : <>
      {!showForm && <button disabled={busy || !canUseReference} onClick={() => { setShowForm(true); setWriteError(""); setMessage(""); }} className="ui-primary w-full">+ 게시글 작성하기</button>}
      {showForm && canUseReference && <PostForm references={references} defaultLineId={line || undefined} busy={busy} canSubmit={canCreate} onSave={savePost} onCancel={() => setShowForm(false)}>{captcha}</PostForm>}
      <div className="flex gap-2 overflow-x-auto p-2 -mx-2" aria-label="게시글 분류">
        {["", ...CATEGORIES].map(value => <button key={value} aria-pressed={category === value} disabled={busy} onClick={() => { setCategory(value); setPage(0); setListLoading(true); }} className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap border ${category === value ? "bg-brand-soft text-brand-ink border-pink-300" : "bg-white border-gray-200 text-gray-600"}`}>{value && <Icon name={icons[value]} width={17} height={17} />}{value || "전체"}</button>)}
      </div>
      <div className="ui-card grid grid-cols-2 gap-3">
        <label className="text-xs text-gray-500">노선별 검색<select disabled={busy || references.length === 0} className={communityField} value={line} onChange={e => { setLine(e.target.value); setStation(""); setPage(0); setListLoading(true); }}><option value="">2호선 전체</option>{references.map(item => <option key={item.lineId} value={item.lineId}>{item.lineName}</option>)}</select></label>
        <label className="text-xs text-gray-500">역별 검색<select disabled={busy || !activeLineId} className={communityField} value={station} onChange={e => { setStation(e.target.value); setPage(0); setListLoading(true); }}><option value="">전체 역</option>{filterReference?.stations.map(s => <option key={s.membershipId} value={s.membershipId}>{s.name}</option>)}</select></label>
      </div>
      <section className="space-y-3" aria-busy={listLoading}>
        <div className="flex items-center justify-between"><h2 className="font-bold text-gray-800">게시글 목록</h2><button disabled={busy || listLoading} className={button} onClick={refresh}>새로고침</button></div>
        {!activeLineId ? <p role="status" className="text-sm text-gray-500 text-center py-8">2호선 노선 정보를 확인한 뒤 게시글을 조회합니다.</p> : listLoading ? <p role="status" className="text-sm text-gray-500 text-center py-8">게시글을 불러오는 중입니다…</p>
          : listError ? <p role="alert" className="text-sm text-red-700 bg-red-50 rounded-xl p-4">{listError}</p>
          : posts.length === 0 ? <p className="ui-empty text-sm">{category || line || station ? "선택한 조건에 해당하는 게시글이 없습니다." : page > 0 ? "이 페이지에 게시글이 없습니다. 이전 페이지를 확인해 주세요." : "아직 작성된 게시글이 없습니다."}</p>
          : posts.map(item => <button disabled={busy} key={item.id} onClick={() => openPost(item.id)} className="w-full ui-card text-left hover:border-pink-300 hover:shadow-md">
            <div className="flex gap-2 items-center mb-2"><Icon name={icons[item.category] ?? "community"} width={18} height={18} /><span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">{item.category}</span>{mine.posts.includes(item.id) && <span className="text-xs bg-brand-soft text-brand-ink px-2 py-1 rounded-full">내 글</span>}</div>
            <h3 className="font-semibold text-gray-800 text-base mb-2 line-clamp-1 break-words">{item.title}</h3><p className="text-sm text-gray-500 line-clamp-2 mb-3">{item.body}</p>
            <p className="text-xs text-gray-400">{lineName(item.line_id)} · {stationName(item.line_station_id)} · 익명 이용자 · {date(item.created_at)}</p>
          </button>)}
        {!listLoading && !listError && <div className="flex items-center justify-between"><button disabled={busy || page === 0} className={button} onClick={() => { setPage(value => value - 1); setListLoading(true); }}>이전</button><span className="text-xs text-gray-500">{page + 1}페이지</span><button disabled={busy || !hasNext} className={button} onClick={() => { setPage(value => value + 1); setListLoading(true); }}>다음</button></div>}
      </section>
    </>}
  </div>;
}
