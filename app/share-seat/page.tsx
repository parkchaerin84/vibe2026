"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Turnstile from "@/components/Turnstile";
import PageHeader from "@/components/ui/PageHeader";
import { ensureAnonymousAuthor } from "@/lib/supabase/anonymous";
import { safeErrorMessage } from "@/lib/supabase/config";
import type { SeatShareRow } from "@/lib/supabase/database";
import { loadShareReference } from "@/lib/supabase/share-reference";
import { reachableStations, routesForLine, stationsForRoute, type ShareLineKey, type ShareReference, type ShareRouteId } from "@/lib/transit/share-routes";
import { deleteSeatShare, insertSeatShare, loadMyShareIds, loadSeatShares, unexpiredShares, validateShare } from "@/lib/supabase/seat-shares";

import { ACTIVE_LINE_KEY, VISIBLE_LINES } from "@/lib/transit/service-scope";

const field = "ui-field";

export default function ShareSeatPage() {
  const selectedLine = ACTIVE_LINE_KEY;
  const [routeId, setRouteId] = useState<ShareRouteId>("line2-main");
  const [reference, setReference] = useState<ShareReference | null>(null);
  const [shares, setShares] = useState<SeatShareRow[]>([]);
  const [mine, setMine] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [readError, setReadError] = useState("");
  const [ownerError, setOwnerError] = useState("");
  const [writeError, setWriteError] = useState("");
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [current, setCurrent] = useState("");
  const [exit, setExit] = useState("");
  const [car, setCar] = useState("");
  const [direction, setDirection] = useState("");
  const [now, setNow] = useState(0);
  const [token, setToken] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const lock = useRef(false);
  const generation = useRef(0);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  const draftForm = useRef<HTMLFormElement>(null);
  useEffect(() => { if (showForm) draftForm.current?.querySelector<HTMLSelectElement>("select")?.focus(); }, [showForm]);

  const refresh = useCallback(async () => {
    const request = ++generation.current;
    const ownership = loadMyShareIds().then(ids => {
      if (request === generation.current) { setMine(ids); setOwnerError(""); }
    }).catch(error => {
      if (request === generation.current) { setMine([]); setOwnerError(safeErrorMessage(error)); }
    });
    try {
      const data = await loadShareReference(ACTIVE_LINE_KEY);
      if (request !== generation.current) return;
      const rows = await loadSeatShares(data.lineId);
      if (request !== generation.current) return;
      setReference(data); setShares(rows); setReadError(""); setNow(Date.now());
    } catch (error) {
      if (request === generation.current) { setReference(null); setShares([]); setReadError(safeErrorMessage(error)); }
    } finally {
      if (request === generation.current) setLoading(false);
      await ownership;
    }
  }, []);

  useEffect(() => {
    const requestState = generation;
    const initial = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    const poll = window.setInterval(() => { if (!document.hidden && !lock.current) void refresh(); }, 30000);
    const visible = () => { if (!document.hidden && !lock.current) void refresh(); };
    window.addEventListener("focus", visible);
    document.addEventListener("visibilitychange", visible);
    return () => {
      requestState.current++;
      window.clearTimeout(initial);
      window.clearInterval(timer); window.clearInterval(poll);
      window.removeEventListener("focus", visible);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [refresh]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!reference || lock.current) return;
    lock.current = true; generation.current++; setBusy(true); setWriteError(""); setMessage("");
    try {
      const payload = validateShare({ line_id: reference.lineId, current_line_station_id: current,
        exit_line_station_id: exit, car_number: Number(car), direction_label: direction }, reference);
      await ensureAnonymousAuthor({ captchaToken: token ?? undefined });
      const saved = await insertSeatShare(payload, reference);
      setShares(previous => [saved, ...previous.filter(row => row.id !== saved.id)]);
      setMine(previous => [...new Set([...previous, saved.id])]);
      setNow(Date.now()); setShowForm(false); setCurrent(""); setExit(""); setCar(""); setDirection("");
      setMessage("하차 정보가 저장되었습니다. 다른 사용자도 조회할 수 있으며 30분 후 만료됩니다.");
    } catch (error) { setWriteError(safeErrorMessage(error)); }
    finally {
      setToken(null); setAttempt(value => value + 1);
      await refresh(); setBusy(false); lock.current = false;
    }
  }

  async function remove(id: string) {
    if (lock.current) return;
    lock.current = true; generation.current++; setBusy(true); setWriteError(""); setMessage("");
    try {
      await deleteSeatShare(id);
      setShares(previous => previous.filter(row => row.id !== id));
      setMessage("하차 정보를 삭제했습니다.");
    } catch (error) { setWriteError(safeErrorMessage(error)); }
    finally { await refresh(); setBusy(false); lock.current = false; }
  }

  function resetDraft() {
    setCurrent(""); setExit(""); setCar(""); setDirection("");
    setWriteError(""); setMessage(""); setToken(null); setAttempt(value => value + 1);
  }

  function changeLine(value: string) {
    if (lock.current || !VISIBLE_LINES.some(line => line.key === value)) return;
    const key = value as ShareLineKey;
    generation.current++; // Immediately invalidate results from the previous line.
    setRouteId(routesForLine(key)[0].id);
    setReference(null); setShares([]); setMine([]); setLoading(true); setReadError("");
    resetDraft();
  }

  const routes = routesForLine(selectedLine);
  const route = routes.find(item => item.id === routeId) ?? routes[0];
  const routeStations = reference ? stationsForRoute(reference, route) : [];
  const reachable = reference ? reachableStations(reference, route, current, direction) : [];
  const reachableIds = new Set(reachable.map(s => s.membershipId));
  const routeMemberIds = new Set(routeStations.map(s => s.membershipId));
  const visibleShares = unexpiredShares(shares, now).filter(share => share.line_id === reference?.lineId &&
    routeMemberIds.has(share.current_line_station_id) && routeMemberIds.has(share.exit_line_station_id) &&
    route.directions.some(d => d === share.direction_label));
  const stationName = (id: string) => reference?.stations.find(s => s.membershipId === id)?.name ?? "확인되지 않은 역";
  const canWrite = !loading && !readError && !!reference && reference.lineKey === selectedLine;

  return <div className="space-y-6">
    <PageHeader title="하차 정보 공유" description="내리는 역을 나누고, 같은 구간을 이용하는 승객의 이야기를 확인하세요." icon="share" eyebrow="SHARE YOUR STOP" line />
    <section className="ui-card space-y-3">
      <h2 className="font-bold text-gray-800">승객이 직접 나누는 하차 예정 정보</h2>
      <p className="ui-note">실제 빈 좌석을 보장하지 않습니다. 각 제보는 별도 정보이며, 같은 칸 번호라도 같은 열차라는 뜻은 아닙니다.</p>
      <div className="flex flex-wrap gap-2 text-xs font-semibold text-brand-ink"><span className="bg-brand-soft rounded-full px-3 py-1.5">등록 후 30분간 공개</span><span className="bg-[#EDF7FC] text-[#315C74] rounded-full px-3 py-1.5">본선·지선 51개 역</span></div>
      <details className="text-xs text-ink-muted"><summary className="py-2 font-semibold">공유 정보 이용 안내</summary><p className="mt-2">등록 당시의 위치이며 실시간 열차 위치가 아닙니다. 로그인 화면 없이 한 번에 한 건을 공유할 수 있습니다. 브라우저 데이터를 지우거나 기기를 바꾸면 본인 정보의 삭제 권한을 잃을 수 있습니다.</p></details>
    </section>
    <section className="ui-card space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs font-semibold text-gray-500">노선<select className={field} value={selectedLine} disabled={busy} onChange={e => changeLine(e.target.value)}>{VISIBLE_LINES.map(line => <option key={line.key} value={line.key}>{line.name}</option>)}</select></label>
        <label className="text-xs font-semibold text-gray-500">운행 구간<select className={field} value={route.id} disabled={busy} onChange={e => { setRouteId(e.target.value as ShareRouteId); resetDraft(); }}>{routes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      </div>
      <p className="text-xs text-gray-500">선택한 노선·구간의 제보만 표시합니다. 지선은 본선과 구분하며, 환승이 필요한 이동은 구간별로 등록해 주세요.</p>
      {selectedLine === "line2" && <p className="text-xs text-gray-500">본선은 내선(시계방향)·외선(반시계방향)으로 한 바퀴 이내의 연결을 검사합니다. 실제 열차의 종착역·운행 변경이나 최단 경로를 보장하지 않습니다.</p>}
    </section>
    {!showForm && <button onClick={() => { setShowForm(true); setWriteError(""); }} disabled={!canWrite || busy}
      className="ui-primary w-full">+ 내 하차역 공유하기</button>}
    {message && <p role="status" className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 text-sm">{message}</p>}
    {writeError && <p role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{writeError}</p>}
    {ownerError && <p role="alert" className="text-sm text-amber-700">{ownerError}</p>}
    {showForm && <form ref={draftForm} onSubmit={submit} className="ui-card space-y-4">
      <h2 className="font-bold text-gray-800">하차 정보 입력</h2>
      <fieldset disabled={busy || !canWrite} className="grid grid-cols-2 gap-3">
        <p className="col-span-2 text-xs text-brand-ink">{reference?.lineName} · {route.name}</p>
        <label className="text-xs font-semibold text-gray-500">현재 역<select required className={field} value={current} onChange={e => { setCurrent(e.target.value); setExit(""); }}><option value="">선택</option>{routeStations.map(s => <option key={s.membershipId} value={s.membershipId}>{s.name}</option>)}</select></label>
        <label className="text-xs font-semibold text-gray-500">탑승 칸<input required className={field} type="number" min={1} max={20} step={1} placeholder="탑승한 칸 번호" value={car} onChange={e => setCar(e.target.value)} /></label>
        <label className="text-xs font-semibold text-gray-500">방향<select required className={field} value={direction} onChange={e => { setDirection(e.target.value); setExit(""); }}><option value="">선택</option>{route.directions.map(d => <option key={d}>{d}</option>)}</select></label>
        <label className="text-xs font-semibold text-gray-500 col-span-2">하차 예정 역<select required className={field} value={exit} onChange={e => setExit(e.target.value)}><option value="">선택</option>{routeStations.map(s => <option key={s.membershipId} value={s.membershipId} disabled={!reachableIds.has(s.membershipId)}>{s.name}</option>)}</select></label>
      </fieldset>
      <p className="text-xs text-gray-500">현재 역과 방향을 선택하면 도달 가능한 하차 역을 선택할 수 있습니다.{reachable[0] ? ` 선택 방향의 다음 역: ${reachable[0].name}.` : ""} 종착역에서 바깥쪽으로 가는 방향은 등록할 수 없습니다.</p>
      {siteKey && <Turnstile siteKey={siteKey} attempt={attempt} onToken={setToken} onError={() => setWriteError("봇 방지 확인에 실패했습니다. 다시 확인해 주세요.")} />}
      <div className="flex gap-2">
        <button type="button" disabled={busy} onClick={() => setShowForm(false)} className="ui-secondary flex-1">취소</button>
        <button disabled={busy || !canWrite || (!!siteKey && !token)} className="ui-primary flex-1">{busy ? "저장 중…" : "공유하기"}</button>
      </div>
    </form>}
    <section className="space-y-3" aria-busy={loading}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold text-gray-800">공유된 하차 정보 {!loading && !readError && `(${visibleShares.length}건)`}</h2>
        <button disabled={loading || busy} onClick={() => { setLoading(true); void refresh(); }} className="text-sm text-brand-ink disabled:text-gray-400">새로고침</button>
      </div>
      <p className="text-xs text-gray-500">30초마다 목록을 갱신합니다. 남은 시간은 공유 정보의 유효시간이며 도착 예상시간이 아닙니다.</p>
      {loading ? <p role="status" className="text-sm text-gray-500 py-8 text-center">하차 정보를 불러오는 중입니다…</p>
        : readError ? <p role="alert" className="text-sm text-red-700 bg-red-50 p-4 rounded-xl">{readError}</p>
        : visibleShares.length === 0 ? <div className="ui-empty"><p className="font-semibold mb-2">아직 공유된 하차 정보가 없습니다</p><p className="text-sm">내리는 역을 공유해 첫 번째 제보를 남겨보세요.</p></div>
        : visibleShares.map(share => <article key={share.id} className={`bg-white rounded-xl p-4 shadow-sm border ${mine.includes(share.id) ? "border-pink-300" : "border-gray-100"}`}>
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex flex-wrap items-center gap-2"><span className="line-badge"><i aria-hidden="true" />{reference?.lineName} · {route.name}</span><span className="text-xs text-gray-500">등록 당시 {stationName(share.current_line_station_id)}</span>{mine.includes(share.id) && <span className="text-xs text-brand-ink">내 제보</span>}</div>
            {mine.includes(share.id) && <button disabled={busy} onClick={() => void remove(share.id)} className="text-xs text-red-700 disabled:text-gray-400" aria-label="내 하차 정보 삭제">삭제</button>}
          </div>
          <div className="flex flex-wrap items-center gap-4"><div><p className="text-xs text-gray-400">탑승 칸</p><p className="text-xl font-black text-gray-800">{share.car_number}번</p></div><div><p className="text-xs text-gray-400">방향</p><p className="text-sm text-gray-700">{share.direction_label}</p></div><span className="text-gray-300">→</span><div><p className="text-xs text-gray-400">하차 예정 역</p><p className="font-bold text-brand-ink">{stationName(share.exit_line_station_id)}</p></div></div>
          <p className="text-xs text-gray-500 mt-3">등록 {new Date(share.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} · 공유 유효시간 약 {Math.ceil((Date.parse(share.expires_at) - now) / 60000)}분 남음</p>
        </article>)}
    </section>
  </div>;
}
