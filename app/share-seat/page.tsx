"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import Turnstile from "@/components/Turnstile";
import PageHeader from "@/components/ui/PageHeader";
import SeatShareCard from "@/components/SeatShareCard";
import { ensureAnonymousAuthor } from "@/lib/supabase/anonymous";
import { safeErrorMessage } from "@/lib/supabase/config";
import type { SeatShareRow } from "@/lib/supabase/database";
import { loadShareReference } from "@/lib/supabase/share-reference";
import { reachableStations, routeForDirection, routesForLine, stationsForRoute, type ShareLineKey, type ShareReference, type ShareRouteId } from "@/lib/transit/share-routes";
import { deleteSeatShare, insertSeatShare, loadMyShareIds, loadSeatShares, validateShare } from "@/lib/supabase/seat-shares";
import { ownShareCards } from "@/lib/transit/share-management";
import { shareCarNumbers } from "@/lib/transit/car-policy";

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
      await ownership;
      if (request === generation.current) setLoading(false);
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
  const ownShares = ownShareCards(shares, mine, reference?.lineId, now);
  const stationName = (id: string) => reference?.stations.find(s => s.membershipId === id)?.name ?? "확인되지 않은 역";
  const canWrite = !loading && !readError && !!reference && reference.lineKey === selectedLine;

  return <div className="space-y-6">
    <PageHeader title="하차 정보 공유" description="내 하차 예정 정보를 등록하고, 공유 중인 제보를 관리하세요." icon="share" eyebrow="SHARE YOUR STOP" line />
    <section className="ui-card space-y-3">
      <h2 className="font-bold text-gray-800">내 하차 정보를 나눠 주세요</h2>
      <p className="ui-note">등록한 제보는 30분 동안 공개됩니다. 같은 칸 번호라도 같은 열차라는 뜻은 아니며 실제 빈 좌석을 보장하지 않습니다.</p>
      <p className="text-xs text-ink-muted">이 브라우저의 익명 작성자만 본인 제보를 삭제할 수 있어요. 브라우저 데이터를 지우면 관리 권한을 잃을 수 있습니다.</p>
      <Link href="/find-seat" className="ui-link">다른 승객의 하차 정보 찾기 →</Link>
    </section>
    <section className="ui-card space-y-3" aria-label="공유할 노선과 구간">
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs font-semibold text-gray-500">노선<select className={field} value={selectedLine} disabled={busy} onChange={e => changeLine(e.target.value)}>{VISIBLE_LINES.map(line => <option key={line.key} value={line.key}>{line.name}</option>)}</select></label>
        <label className="text-xs font-semibold text-gray-500">운행 구간<select className={field} value={route.id} disabled={busy} onChange={e => { setRouteId(e.target.value as ShareRouteId); resetDraft(); }}>{routes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      </div>
      <p className="text-xs text-ink-muted">등록할 구간을 선택해 주세요. 본선과 지선은 구분하며, 환승이 필요한 이동은 구간별로 공유해 주세요.</p>
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
        <label className="text-xs font-semibold text-gray-500">탑승 칸<select required className={field} value={car} onChange={e => setCar(e.target.value)}><option value="">칸 선택</option>{shareCarNumbers(selectedLine).map(n => <option key={n} value={n}>{n}번 칸</option>)}</select></label>
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
        <h2 className="font-bold text-gray-800">내가 공유 중인 하차 정보 {!loading && !readError && !ownerError && `(${ownShares.length}건)`}</h2>
        <button disabled={loading || busy} onClick={() => { setLoading(true); void refresh(); }} className="text-sm text-brand-ink disabled:text-gray-400">새로고침</button>
      </div>
      <p className="text-xs text-gray-500">구간 선택과 관계없이 내 2호선 제보를 표시합니다. 30초마다 갱신하며, 등록 후 30분이 지나면 목록에서 제외됩니다.</p>
      {loading ? <p role="status" className="text-sm text-gray-500 py-8 text-center">내 하차 정보를 불러오는 중입니다…</p>
        : readError ? <p role="alert" className="text-sm text-red-700 bg-red-50 p-4 rounded-xl">{readError}</p>
        : ownerError ? <div className="ui-empty"><p>본인 제보를 확인하지 못했어요. 작성자 세션과 연결을 확인한 뒤 새로고침해 주세요.</p></div>
        : ownShares.length === 0 ? <div className="ui-empty"><p className="font-semibold mb-2">현재 내가 공유 중인 하차 정보가 없습니다</p><p className="text-sm">내 하차역을 공유하거나 다른 승객의 제보를 찾아보세요.</p><Link href="/find-seat" className="ui-link mt-3">하차 정보 찾기 →</Link></div>
        : ownShares.map(share => <SeatShareCard key={share.id} share={share} lineName={reference!.lineName}
          routeName={routeForDirection(reference!, share.direction_label)?.name ?? "구간 확인 필요"}
          currentStation={stationName(share.current_line_station_id)} exitStation={stationName(share.exit_line_station_id)}
          now={now} owned busy={busy} onDelete={id => void remove(id)} />)}
    </section>
  </div>;
}
