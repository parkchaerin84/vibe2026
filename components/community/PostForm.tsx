"use client";

import { useEffect, useRef, useState, type ReactNode, type FormEvent } from "react";
import { CATEGORIES } from "@/lib/supabase/community";
import type { PostInsert, PostRow } from "@/lib/supabase/database";
import type { ShareReference } from "@/lib/transit/share-routes";

export const communityField = "ui-field";

export default function PostForm({ references, defaultLineId, initial, busy, canSubmit, children, onSave, onCancel }: {
  references: ShareReference[]; defaultLineId?: string; initial?: PostRow; busy: boolean; canSubmit: boolean; children?: ReactNode;
  onSave: (draft: PostInsert) => Promise<void>; onCancel: () => void;
}) {
  const [lineId, setLineId] = useState(initial?.line_id ?? (references.some(item => item.lineId === defaultLineId) ? defaultLineId! : references[0]?.lineId ?? ""));
  const reference = references.find(item => item.lineId === lineId);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [category, setCategory] = useState(initial?.category ?? CATEGORIES[0]);
  const [station, setStation] = useState(initial?.line_station_id ?? "");
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => { formRef.current?.querySelector<HTMLInputElement>("input")?.focus(); }, []);
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!reference) return;
    void onSave({ line_id: reference.lineId, line_station_id: station || null, category, title, body });
  }
  return <form ref={formRef} onSubmit={submit} className="ui-card space-y-4">
    <div className="border-b border-pink-100 pb-4"><p className="ui-eyebrow mb-1">WRITE A STORY</p><h2 className="text-xl font-bold text-gray-800">{initial ? "게시글 수정" : "새로운 이야기 남기기"}</h2><p className="text-sm text-ink-muted mt-2">역에서의 경험이나 다른 이용자와 나눌 의견을 적어주세요.</p></div>
    <fieldset disabled={busy} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs font-semibold text-gray-500">분류<select className={communityField} value={category} onChange={e => setCategory(e.target.value)}>{CATEGORIES.map(value => <option key={value}>{value}</option>)}</select></label>
        <label className="text-xs font-semibold text-gray-500">노선<select className={communityField} value={lineId} disabled={!!initial} onChange={e => { setLineId(e.target.value); setStation(""); }}><option value="" disabled>노선 선택</option>{references.map(item => <option key={item.lineId} value={item.lineId}>{item.lineName}</option>)}</select></label>
      </div>
      <label className="block text-xs font-semibold text-gray-500">역 (선택)<select className={communityField} value={station} onChange={e => setStation(e.target.value)}><option value="">노선 전체</option>{reference?.stations.map(s => <option key={s.membershipId} value={s.membershipId}>{s.name}</option>)}</select></label>
      <label className="block text-xs font-semibold text-gray-500">제목<input className={communityField} required maxLength={100} value={title} onChange={e => setTitle(e.target.value)} placeholder="제목을 입력해 주세요." /></label>
      <label className="block text-xs font-semibold text-gray-500">내용<textarea className={`${communityField} min-h-[140px] resize-y`} required maxLength={5000} value={body} onChange={e => setBody(e.target.value)} placeholder="다른 이용자와 나눌 의견을 적어주세요." /></label>
      <p className="text-xs text-gray-500">제목 100자, 내용 5,000자까지 작성할 수 있습니다. 연락처 등 개인정보를 적지 마세요.</p>
    </fieldset>
    {children}
    <div className="flex gap-2">
      <button type="button" onClick={onCancel} disabled={busy} className="ui-secondary flex-1">취소</button>
      <button disabled={busy || !reference || !canSubmit || !title.trim() || !body.trim()} className="ui-primary flex-1">{busy ? "저장 중…" : initial ? "수정 저장" : "등록하기"}</button>
    </div>
  </form>;
}
