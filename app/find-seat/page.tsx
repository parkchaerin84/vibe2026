"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import SeatShareCars from "@/components/SeatShareCars";
import SeatShareCard from "@/components/SeatShareCard";
import { safeErrorMessage } from "@/lib/supabase/config";
import type { SeatShareRow } from "@/lib/supabase/database";
import { loadSeatShares } from "@/lib/supabase/seat-shares";
import { loadShareReference } from "@/lib/supabase/share-reference";
import { routesForLine, stationsForRoute, type ShareReference, type ShareRouteId } from "@/lib/transit/share-routes";
import { searchShareCards, type ShareSearch } from "@/lib/transit/share-search";
import { ACTIVE_LINE_KEY, VISIBLE_LINES } from "@/lib/transit/service-scope";
import { shareCarNumbers } from "@/lib/transit/car-policy";

export default function FindSeatPage() {
  const [reference, setReference] = useState<ShareReference | null>(null);
  const [shares, setShares] = useState<SeatShareRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [readError, setReadError] = useState("");
  const [now, setNow] = useState(0);
  const [routeId, setRouteId] = useState<ShareRouteId>("line2-main");
  const [searchDirection, setSearchDirection] = useState("");
  const [searchCar, setSearchCar] = useState("");
  const [searchExit, setSearchExit] = useState("");
  const [search, setSearch] = useState<ShareSearch | null>(null);
  const generation = useRef(0);
  const resultsHeading = useRef<HTMLHeadingElement>(null);

  // Public reads only: search never creates or loads an author identity.
  const refresh = useCallback(async () => {
    const request = ++generation.current;
    try {
      const data = await loadShareReference(ACTIVE_LINE_KEY);
      if (request !== generation.current) return;
      const rows = await loadSeatShares(data.lineId);
      if (request !== generation.current) return;
      setReference(data); setShares(rows); setReadError(""); setNow(Date.now());
    } catch (error) {
      if (request === generation.current) { setReference(null); setShares([]); setReadError(safeErrorMessage(error)); }
    } finally { if (request === generation.current) setLoading(false); }
  }, []);

  useEffect(() => {
    const requestState = generation;
    const initial = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    const poll = window.setInterval(() => { if (!document.hidden) void refresh(); }, 30000);
    const visible = () => { if (!document.hidden) void refresh(); };
    window.addEventListener("focus", visible);
    document.addEventListener("visibilitychange", visible);
    return () => {
      requestState.current++; window.clearTimeout(initial);
      window.clearInterval(timer); window.clearInterval(poll);
      window.removeEventListener("focus", visible);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [refresh]);

  useEffect(() => {
    if (!search) return;
    resultsHeading.current?.focus({ preventScroll: true });
    resultsHeading.current?.scrollIntoView({ block: "start", behavior:
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [search]);

  const routes = routesForLine(ACTIVE_LINE_KEY);
  const route = routes.find(r => r.id === routeId) ?? routes[0];
  const stations = reference ? stationsForRoute(reference, route) : [];
  const results = searchShareCards(shares, reference, route, search, now);
  const stationName = (id: string) => reference?.stations.find(s => s.membershipId === id)?.name ?? "확인되지 않은 역";

  function resetSearch() {
    setSearchDirection(""); setSearchCar(""); setSearchExit(""); setSearch(null);
  }
  function applySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reference || loading || readError || !route.directions.some(d => d === searchDirection) ||
      !shareCarNumbers(ACTIVE_LINE_KEY).includes(Number(searchCar)) || (searchExit !== "" && !stations.some(s => s.membershipId === searchExit))) return;
    setSearch({ direction: searchDirection, carNumber: Number(searchCar), exitStationId: searchExit });
  }

  return <div className="space-y-6">
    <PageHeader title="하차 정보 찾기" description="방향과 탑승 칸을 선택하고, 승객들이 공유한 하차 예정 정보를 찾아보세요." icon="train" eyebrow="FIND YOUR CAR" line />
    <p className="ui-note">각 제보는 별도 정보입니다. 열차를 식별할 수 없어 같은 열차의 승객이라는 뜻은 아니며, 실제 빈 좌석을 보장하지 않습니다.</p>
    <section className="ui-card space-y-3" aria-labelledby="share-search-title">
      <h2 id="share-search-title" className="font-bold text-gray-800">내 탑승 칸 검색</h2>
      <form onSubmit={applySearch} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-gray-500">노선<select className="ui-field" value={ACTIVE_LINE_KEY} disabled>{VISIBLE_LINES.map(line => <option key={line.key} value={line.key}>{line.name}</option>)}</select></label>
          <label className="text-xs font-semibold text-gray-500">운행 구간<select className="ui-field" value={route.id} onChange={e => { setRouteId(e.target.value as ShareRouteId); resetSearch(); }}>{routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
          <label className="text-xs font-semibold text-gray-500">검색 방향<select required className="ui-field" value={searchDirection} disabled={loading || !!readError} onChange={e => setSearchDirection(e.target.value)}><option value="">방향 선택</option>{route.directions.map(d => <option key={d}>{d}</option>)}</select></label>
          <label className="text-xs font-semibold text-gray-500">검색 탑승 칸<select required className="ui-field" value={searchCar} disabled={loading || !!readError} onChange={e => setSearchCar(e.target.value)}><option value="">칸 선택</option>{shareCarNumbers(ACTIVE_LINE_KEY).map(n => <option key={n} value={n}>{n}번 칸</option>)}</select></label>
          <label className="col-span-2 text-xs font-semibold text-gray-500">검색 하차 예정 역<select className="ui-field" value={searchExit} disabled={loading || !!readError || !reference} onChange={e => setSearchExit(e.target.value)}><option value="">전체</option>{stations.map(s => <option key={s.membershipId} value={s.membershipId}>{s.name}</option>)}</select></label>
        </div>
        {searchCar && <SeatShareCars carNumber={Number(searchCar)} />}
        <div className="flex gap-2">
          <button type="submit" disabled={loading || !!readError || !reference || !searchDirection || !searchCar} className="ui-primary flex-1">검색하기</button>
          <button type="button" onClick={resetSearch} className="ui-secondary flex-1">검색 초기화</button>
        </div>
        {(!searchDirection || !searchCar) && <p className="text-xs text-ink-muted">방향과 탑승 칸을 선택해 주세요. 하차 예정 역은 전체로 둘 수 있어요.</p>}
      </form>
      {search && !loading && !readError && <p role="status" className="rounded-xl border border-pink-200 bg-brand-soft p-3 text-sm font-semibold text-brand-ink">{results.length ? `조건에 맞는 하차 정보 ${results.length}건을 찾았어요.` : "검색 결과 0건 · 조건에 맞는 하차 정보가 아직 없어요."} <a href="#share-search-results" className="underline underline-offset-4">검색 결과 보기</a></p>}
      {search && <p className="text-xs text-brand-ink">적용된 검색: {search.direction} · {search.carNumber}번 칸 · 하차 역 {search.exitStationId ? stationName(search.exitStationId) : "전체"}. 조건을 바꾼 뒤 검색하기를 눌러 주세요.</p>}
    </section>
    <section className="space-y-3" aria-busy={loading}>
      <div className="flex items-center justify-between gap-2">
        <h2 id="share-search-results" ref={resultsHeading} tabIndex={-1} className="scroll-mt-44 rounded-md font-bold text-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-ink lg:scroll-mt-24">{search ? "하차 정보 검색 결과" : "현재 구간의 하차 제보"} {!loading && !readError && `(${results.length}건)`}</h2>
        <button disabled={loading} onClick={() => { setLoading(true); void refresh(); }} className="text-sm text-brand-ink disabled:text-gray-400">새로고침</button>
      </div>
      <p className="text-xs text-gray-500">30초마다 갱신하며 등록 후 30분이 지난 제보는 제외합니다. 남은 시간은 도착 예상시간이 아닙니다.</p>
      {loading ? <p role="status" className="text-sm text-gray-500 py-8 text-center">하차 정보를 불러오는 중입니다…</p>
        : readError ? <p role="alert" className="text-sm text-red-700 bg-red-50 p-4 rounded-xl">{readError}</p>
        : results.length === 0 ? <div className="ui-empty"><p className="font-semibold mb-2">{search ? "선택한 조건에 맞는 하차 정보가 없어요" : "아직 공유된 하차 정보가 없습니다"}</p><p className="text-sm">{search ? "하차 예정 역을 전체로 선택하거나 검색 조건을 바꿔 보세요." : "다른 운행 구간을 확인하거나 잠시 후 다시 찾아주세요."}</p>{search && <button type="button" onClick={resetSearch} className="ui-secondary mt-4">현재 구간의 전체 제보 보기</button>}</div>
        : results.map(share => <SeatShareCard key={share.id} share={share} lineName={reference!.lineName} routeName={route.name} currentStation={stationName(share.current_line_station_id)} exitStation={stationName(share.exit_line_station_id)} now={now} />)}
    </section>
    <div className="text-center"><Link href="/share-seat" className="ui-link">내 하차 정보 공유하기 →</Link></div>
  </div>;
}
