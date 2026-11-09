"use client";

import { useEffect, useRef, useState } from "react";
import { loadShareReference } from "@/lib/supabase/share-reference";
import { safeErrorMessage } from "@/lib/supabase/config";
import type { ShareReference } from "@/lib/transit/share-routes";
import { FACILITY_SOURCE, RESTROOM_STATIONS, RESTROOM_COVERAGE, type FacilityData, type FacilityResponse } from "@/lib/facilities";
import { SHARE_ROUTES, stationsForRoute } from "@/lib/transit/share-routes";
import PageHeader from "@/components/ui/PageHeader";
import Icon from "@/components/ui/Icon";

const date = (value: string | null) => value && /^\d{8}$/.test(value)
  ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}` : value || "기준일 미제공";
const value = (text: string | null) => text ?? "정보 미제공";
const mainStationCodes = new Set(SHARE_ROUTES.find(r => r.id === "line2-main")?.sourceCodes);

export default function FacilitiesPage() {
  const [reference, setReference] = useState<ShareReference | null>(null);
  const [referenceLoading, setReferenceLoading] = useState(true);
  const [referenceError, setReferenceError] = useState("");
  const [selected, setSelected] = useState("");
  const [data, setData] = useState<FacilityData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [retryReference, setRetryReference] = useState(0);
  const generation = useRef(0);
  const activeRequest = useRef<AbortController | null>(null);
  const recent = useRef(new Map<string, FacilityData>());

  useEffect(() => {
    let active = true;
    const lifecycle = generation;
    const inFlight = activeRequest;
    const controller = new AbortController();
    loadShareReference("line2", controller.signal).then(result => { if (active) { setReference(result); setReferenceError(""); } })
      .catch(cause => { if (active) { setReference(null); setReferenceError(safeErrorMessage(cause)); } })
      .finally(() => { if (active) setReferenceLoading(false); });
    return () => { active = false; controller.abort(); inFlight.current?.abort(); lifecycle.current++; };
  }, [retryReference]);

  const station = reference?.stations.find(s => s.membershipId === selected);
  const code = station?.sourceCode.startsWith("02호선:") ? station.sourceCode.slice("02호선:".length) : "";
  const supported = Object.hasOwn(RESTROOM_STATIONS, code);

  async function lookup(membershipId: string) {
    const request = ++generation.current;
    activeRequest.current?.abort();
    setSelected(membershipId); setData(null); setError(""); setLoading(false);
    const chosen = reference?.stations.find(s => s.membershipId === membershipId);
    if (!chosen || !chosen.sourceCode.startsWith("02호선:")) return;
    const stationCode = chosen.sourceCode.slice("02호선:".length);
    if (!Object.hasOwn(RESTROOM_STATIONS, stationCode)) return; // No upstream request for unaudited station codes.
    const cached = recent.current.get(membershipId);
    if (cached && Date.now() - Date.parse(cached.fetchedAt) < 10 * 60_000) { setData(cached); return; }
    setLoading(true);
    const controller = new AbortController(); activeRequest.current = controller;
    try {
      const params = new URLSearchParams({ lineCode: "02호선", stationCode, membershipId });
      const result = await fetch(`/api/facilities/restrooms?${params}`, { signal: controller.signal, cache: "no-store", redirect: "error" });
      // Static-only deployments may return HTML/404. Never disguise that as an empty facility list.
      if (!result.headers.get("content-type")?.includes("application/json")) throw new Error("server-unavailable");
      const body: FacilityResponse = await result.json();
      if (request !== generation.current) return;
      if (body.status === "error") { setError(body.message); return; }
      if (!result.ok || !["ok", "empty"].includes(body.status) || body.lineCode !== "02호선" ||
          body.stationCode !== stationCode || body.stationName !== chosen.name || body.membershipId !== membershipId ||
          !Array.isArray(body.restrooms) || !Number.isFinite(Date.parse(body.fetchedAt))) throw new Error("mismatch");
      recent.current.set(membershipId, body); setData(body);
    } catch {
      if (request === generation.current) setError("편의시설 조회 서버에 연결하지 못했습니다. 서버 기능이 포함된 미리보기 주소인지 확인하고 다시 시도해 주세요.");
    } finally { if (request === generation.current) setLoading(false); }
  }

  return <div className="space-y-6">
    <PageHeader title="역별 편의시설 안내" description="필요한 시설을 더 쉽게. 공식 데이터로 역 안의 위치를 확인하세요." icon="facilities" eyebrow="FIND YOUR WAY" line />
    <section aria-label="시설별 제공 현황" className="grid grid-cols-3 gap-2 sm:gap-3">
      <div className="flex flex-col gap-3 items-start rounded-2xl border border-pink-300 bg-brand-soft p-3 sm:p-5"><span className="ui-icon-box !w-10 !h-10 sm:!w-12 sm:!h-12"><Icon name="toilet" /></span><div><h2 className="font-bold text-xs sm:text-base">화장실</h2><p className="text-xs text-brand-ink mt-1">위치 조회</p></div></div>
      <div className="flex flex-col gap-3 items-start rounded-2xl border border-gray-200 bg-white p-3 sm:p-5"><span className="ui-icon-box !w-10 !h-10 sm:!w-12 sm:!h-12 !bg-[#EDF7FC] !text-[#315C74] !border-[#D4E9F4]"><Icon name="elevator" /></span><div><h2 className="font-bold text-xs sm:text-base">엘리베이터</h2><p className="text-xs text-ink-muted mt-1">연동 준비 중</p></div></div>
      <div className="flex flex-col gap-3 items-start rounded-2xl border border-gray-200 bg-white p-3 sm:p-5"><span className="ui-icon-box !w-10 !h-10 sm:!w-12 sm:!h-12 !bg-[#EDF7FC] !text-[#315C74] !border-[#D4E9F4]"><Icon name="escalator" /></span><div><h2 className="font-bold text-xs sm:text-base">에스컬레이터</h2><p className="text-xs text-ink-muted mt-1">연동 준비 중</p></div></div>
    </section>
    <section className="ui-card space-y-3">
      <h2 className="text-lg font-bold text-gray-800">어느 역의 화장실을 찾으세요?</h2>
      <p className="ui-note">위치 안내용 데이터입니다. 기준일을 확인하고 현장 안내를 함께 참고해 주세요. 현재 운영 상태·접근 가능 여부는 보장하지 않습니다.</p>
      {referenceLoading ? <p role="status" className="text-sm text-gray-500">2호선 역 정보를 확인하고 있습니다…</p> : referenceError ? <p role="alert" className="text-red-700 text-sm">{referenceError} <button className="underline" onClick={() => { setReferenceLoading(true); setRetryReference(n => n + 1); }}>다시 불러오기</button></p> :
        <label className="block text-sm font-medium text-gray-700">2호선 역 선택<select value={selected} onChange={e => void lookup(e.target.value)} className="ui-field"><option value="">역을 선택해 주세요</option>{reference && SHARE_ROUTES.filter(r => r.lineKey === "line2").map(route => <optgroup key={route.id} label={route.name}>{stationsForRoute(reference, route).filter(s => route.id === "line2-main" || !mainStationCodes.has(s.sourceCode)).map(s => <option key={s.membershipId} value={s.membershipId}>{s.name}</option>)}</optgroup>)}</select></label>}
      <details className="text-xs text-ink-muted"><summary className="font-semibold py-2">제공 범위와 조회 기준</summary><p className="mt-2">{RESTROOM_COVERAGE.total}개 역을 조회할 수 있습니다. {new Date(RESTROOM_COVERAGE.checkedAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })} 전체 조회에서 {RESTROOM_COVERAGE.verified}개 역의 정보가 확인됐으며, {RESTROOM_COVERAGE.empty.join("·")}역은 결과가 없었습니다. 시설이 없다는 의미는 아닙니다. 정상 결과는 최대 10분간 재사용하며 자동 새로고침은 하지 않습니다.</p></details>
    </section>
    {!station && !referenceLoading && !referenceError && <div className="ui-empty"><Icon name="toilet" className="mx-auto mb-3 text-brand-ink" width={32} height={32} /><p className="text-sm">역을 선택하면 화장실의 상세 위치와 층 정보를 확인할 수 있어요.</p></div>}
    {station && !supported ? <p role="status" className="ui-empty">아직 제공되지 않는 역입니다</p> : null}
    {loading && <p role="status" className="text-center py-8 text-gray-500">공식 화장실 위치정보를 조회하고 있습니다…</p>}
    {error && <div role="alert" className="bg-red-50 border border-red-100 text-red-700 rounded-xl p-4 text-sm">{error} <button disabled={loading} className="underline ml-2" onClick={() => void lookup(selected)}>다시 조회</button></div>}
    {data && <section className="space-y-3">
      <h2 className="font-bold text-gray-800">2호선 {data.stationName}역 · 화장실 {data.restrooms.length}건</h2>
      <p className="text-xs text-gray-500">노선 코드 {data.lineCode} · 역 코드 {data.stationCode} · 조회 시각 {new Date(data.fetchedAt).toLocaleString("ko-KR")}</p>
      {data.status === "empty" ? <p role="status" className="ui-empty">조회된 화장실 정보가 없습니다. 시설이 없다는 의미는 아닙니다.</p> : data.restrooms.map((room, i) => <article key={`${room.facilityNumber ?? "room"}-${i}`} className="ui-card space-y-5">
        <h3 className="font-semibold text-gray-800">{value(room.facilityName)}</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="sm:col-span-2 bg-[#F3F8FC] rounded-xl p-4"><dt className="text-gray-500 text-xs mb-1">상세 위치 원문</dt><dd className="text-gray-800 whitespace-pre-wrap break-words font-medium">{value(room.detailLocation)}</dd></div>
          <div><dt className="text-gray-500 text-xs mb-1">층 정보</dt><dd>{value(room.floor)} · {value(room.groundType)}</dd></div>
          <div><dt className="text-gray-500 text-xs mb-1">근접 출입구 (별도 필드)</dt><dd>{value(room.nearbyEntrances)}</dd></div>
          <div><dt className="text-gray-500 text-xs mb-1">개찰구 안·밖</dt><dd>{value(room.gateSide)}</dd></div>
          <div><dt className="text-gray-500 text-xs mb-1">화장실 구분</dt><dd>{value(room.restroomType)}</dd></div>
          <div><dt className="text-gray-500 text-xs mb-1">휠체어 접근 여부 (제공 데이터 기준)</dt><dd>{room.wheelchairAccess === "Y" ? "가능(Y)" : room.wheelchairAccess === "N" ? "불가(N)" : value(room.wheelchairAccess)}</dd></div>
          <div><dt className="text-gray-500 text-xs mb-1">데이터 기준일</dt><dd className="font-semibold text-brand-ink">{date(room.referenceDate)}</dd></div>
        </dl>
      </article>)}
    </section>}
    <div className="border-t border-pink-100 pt-4 text-xs text-ink-muted space-y-2"><p>출처: <a href={FACILITY_SOURCE} target="_blank" rel="noreferrer" className="underline underline-offset-4">서울교통공사 · 공공데이터포털 편의시설위치정보 (새 창)</a></p><p>상세 위치와 근접 출입구는 제공된 원문을 각각 표시합니다. 다른 값이 있어도 임의로 합치지 않습니다.</p></div>
  </div>;
}
