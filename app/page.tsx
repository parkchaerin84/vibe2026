"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Icon from "@/components/ui/Icon";
import { loadShareReference } from "@/lib/supabase/share-reference";
import { safeErrorMessage } from "@/lib/supabase/config";
import type { ShareReference } from "@/lib/transit/share-routes";
import { ACTIVE_LINE_KEY } from "@/lib/transit/service-scope";
import { FAVORITES_STORAGE_KEY, availableFavorite, changeFavorites, parseFavorites, type Favorite } from "@/lib/transit/favorites";

// Original home and recommendation/favorite implementation is preserved in components/legacy/LegacyHome.tsx.
const field = "ui-field";

function CoreLinks() {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
    <Link href="/find-seat" className="feature-card !bg-[#EDF7FC] !border-[#D4E9F4]">
      <span className="ui-icon-box !bg-white !text-[#315C74] mb-5"><Icon name="train" /></span>
      <h3 className="text-lg font-bold">하차 정보 찾기</h3>
      <p className="text-sm text-ink-muted mt-2 leading-relaxed flex-1">방향과 탑승 칸을 선택하고,<br />공유된 하차 예정 정보를 찾아봐요.</p>
      <span className="mt-5 text-sm font-bold text-[#315C74] inline-flex items-center gap-2">하차 정보 찾기 <Icon name="arrow" width={18} height={18} /></span>
    </Link>
    <Link href="/share-seat" className="feature-card !bg-brand-soft !border-pink-200 group">
      <div className="flex justify-between items-center mb-5"><span className="ui-icon-box"><Icon name="share" /></span><span className="text-xs font-bold text-brand-ink">메인 기능</span></div>
      <h3 className="text-lg font-bold">하차 정보 공유하기</h3>
      <p className="text-sm text-ink-muted mt-2 leading-relaxed flex-1">내리는 역을 나누고,<br />내가 등록한 제보를 관리해요.</p>
      <span className="mt-5 text-sm font-bold text-brand-ink inline-flex items-center gap-2">내 하차 정보 공유하기 <Icon name="arrow" width={18} height={18} /></span>
    </Link>
    <Link href="/facilities" className="feature-card">
      <span className="ui-icon-box !bg-[#EDF7FC] !border-[#D4E9F4] !text-[#315C74] mb-5"><Icon name="facilities" /></span>
      <h3 className="text-lg font-bold">역별 편의시설 안내</h3>
      <p className="text-sm text-ink-muted mt-2 leading-relaxed flex-1">화장실은 어디에 있을까?<br />공식 데이터로 위치를 확인해요.</p>
      <span className="mt-5 text-sm font-bold text-[#315C74] inline-flex items-center gap-2">편의시설 찾아보기 <Icon name="arrow" width={18} height={18} /></span>
    </Link>
    <Link href="/community" className="feature-card">
      <span className="ui-icon-box mb-5"><Icon name="community" /></span>
      <h3 className="text-lg font-bold">이용자 커뮤니티</h3>
      <p className="text-sm text-ink-muted mt-2 leading-relaxed flex-1">지하철에서의 경험과 의견,<br />함께 나누면 더 편해져요.</p>
      <span className="mt-5 text-sm font-bold text-brand-ink inline-flex items-center gap-2">이야기 나누기 <Icon name="arrow" width={18} height={18} /></span>
    </Link>
  </div>;
}

export default function Home() {
  const [showLanding, setShowLanding] = useState(true);
  const [reference, setReference] = useState<ShareReference | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [storageError, setStorageError] = useState("");
  const [entries, setEntries] = useState<unknown[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [current, setCurrent] = useState("");
  const [destination, setDestination] = useState("");
  const [message, setMessage] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const read = () => {
      try { setEntries(parseFavorites(localStorage.getItem(FAVORITES_STORAGE_KEY))); setStorageReady(true); setStorageError(""); }
      catch { setStorageReady(false); setStorageError("기존 즐겨찾기를 읽을 수 없어 변경을 막았습니다. 저장 내용은 삭제하거나 덮어쓰지 않았습니다."); }
    };
    const timer = window.setTimeout(read, 0);
    const changed = (event: StorageEvent) => { if (event.key === FAVORITES_STORAGE_KEY || event.key === null) read(); };
    window.addEventListener("storage", changed);
    return () => { window.clearTimeout(timer); window.removeEventListener("storage", changed); };
  }, []);

  useEffect(() => {
    let active = true;
    loadShareReference(ACTIVE_LINE_KEY).then(data => { if (active) { setReference(data); setError(""); } })
      .catch(cause => { if (active) { setReference(null); setError(safeErrorMessage(cause)); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);

  const stations = reference?.stations ?? [];
  const names = new Set(stations.map(s => s.name));
  const favorites = entries.filter((item): item is Favorite => availableFavorite(item, names));
  const archivedCount = entries.length - favorites.length;
  const from = stations.find(s => s.membershipId === current);
  const to = stations.find(s => s.membershipId === destination);
  const alreadySaved = favorites.some(item => item.stationName === from?.name && item.destinationName === to?.name);

  function persist(action: { add: Favorite } | { remove: string }) {
    if (!reference || !storageReady) return;
    try {
      const updated = changeFavorites(localStorage.getItem(FAVORITES_STORAGE_KEY), names, action);
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updated));
      setEntries(updated); setMessage("add" in action ? "즐겨찾기를 저장했습니다." : "2호선 즐겨찾기를 삭제했습니다.");
    } catch { setStorageReady(false); setStorageError("기존 즐겨찾기를 안전하게 저장할 수 없어 변경을 중단했습니다. 기존 저장 내용은 자동으로 초기화하지 않습니다."); }
  }

  return <div className="space-y-8 sm:space-y-10">
    <section className="relative overflow-hidden rounded-[28px] sm:rounded-[36px] border border-pink-100 bg-gradient-to-br from-[#FFE9F2] via-[#FFF2F7] to-[#E9F5FC] px-6 py-8 sm:px-10 sm:py-10 grid md:grid-cols-[1.25fr_1fr] items-center gap-4">
      <div className="relative z-10">
        <span className="line-badge mb-5"><i aria-hidden="true" />서울 2호선과 함께</span>
        <h1 className="text-[24px] sm:text-[36px] md:text-[30px] lg:text-[40px] xl:text-[44px] font-bold leading-[1.35] tracking-tight"><span className="block">앉고 싶은데,</span><span className="block text-[#B83C6D]">언제쯤 자리가 날까?</span></h1>
        <p className="text-sm sm:text-base text-ink-muted leading-relaxed mt-5 max-w-md">내리는 역을 공유하고 필요한 정보를 찾아보세요.<br className="hidden sm:block" /> 지하철의 작은 불편을 함께 덜어가요.</p>
        <div className="flex flex-col sm:flex-row gap-3 mt-7"><Link href="/share-seat" className="ui-primary">하차 정보 공유하기 <Icon name="arrow" width={18} height={18} /></Link><Link href="/find-seat" className="ui-secondary !bg-white/70">하차 정보 찾기</Link></div>
        <p className="text-xs text-ink-muted mt-4">회원가입 화면 없이 가볍게 시작하세요.</p>
      </div>
      <div className="flex w-full min-w-0 justify-center py-2 sm:py-4 md:py-0">
        <Image src="/home-logo-fin-transparent.png" alt="SubwayEasy 로고" width={1254} height={1254} priority className="h-auto w-full max-w-[220px] object-contain sm:max-w-[300px] md:max-w-[360px] lg:max-w-[400px]" sizes="(max-width: 639px) 220px, (max-width: 767px) 300px, (max-width: 1023px) 360px, 400px" />
      </div>
    </section>
    <section aria-labelledby="core-title"><div className="flex items-end justify-between gap-4 mb-4"><div><p className="ui-section-label mb-1">EVERYDAY, EASIER</p><h2 id="core-title" className="text-xl sm:text-2xl font-bold tracking-tight">지하철 일상을 더 편하게</h2></div><span className="hidden sm:block text-xs text-ink-muted">필요한 기능을 한곳에서</span></div><CoreLinks /></section>
    <section className="ui-card flex flex-col sm:flex-row sm:items-center gap-4 justify-between"><div className="flex items-center gap-4"><span className="ui-icon-box !bg-brand-soft"><Icon name="heart" /></span><div><h2 className="font-bold">매일 가는 구간은 즐겨찾기로</h2><p className="text-sm text-ink-muted mt-1">자주 이용하는 역을 이 브라우저에 저장해 두세요.</p></div></div><button aria-expanded={!showLanding} aria-controls="favorites-panel" onClick={() => setShowLanding(value => !value)} className="ui-secondary shrink-0">{showLanding ? "즐겨찾기 열기" : "즐겨찾기 접기"}</button></section>
    <div id="favorites-panel" hidden={showLanding} className="space-y-5">
    {storageError && <p role="alert" className="bg-amber-50 text-amber-800 rounded-xl p-4 text-sm">{storageError}</p>}
    {message && <p role="status" className="text-green-700 text-sm">{message}</p>}
    {loading ? <p role="status">2호선 역 정보를 불러오는 중입니다…</p> : error ? <p role="alert" className="text-red-700 text-sm">{error} <button className="underline" onClick={() => { setLoading(true); setReload(value => value + 1); }}>다시 불러오기</button></p> : <>
      {archivedCount > 0 && <p className="bg-orange-50 border border-orange-100 text-orange-800 rounded-xl p-4 text-sm">기존 즐겨찾기 {archivedCount}건은 보관 중입니다. 다른 노선 또는 현재 역 목록과 일치하지 않는 항목은 삭제하거나 2호선으로 변환하지 않고 자동 적용만 중지했습니다.</p>}
      <section className="ui-card space-y-3">
        <h2 className="font-bold text-gray-800 flex items-center gap-2"><Icon name="heart" width={19} height={19} />2호선 즐겨찾기</h2>
        {favorites.length === 0 ? <p className="text-sm text-gray-500">저장된 2호선 즐겨찾기가 없습니다.</p> : favorites.map((fav, index) => <div key={`${fav.id}-${index}`} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2">
          <button className="flex-1 text-left text-sm text-gray-700" onClick={() => { setCurrent(stations.find(s => s.name === fav.stationName)!.membershipId); setDestination(stations.find(s => s.name === fav.destinationName)!.membershipId); setMessage(""); }}><span className="line-badge mr-2"><i aria-hidden="true" />2호선</span>{fav.stationName} → {fav.destinationName}</button>
          <button disabled={!storageReady} onClick={() => persist({ remove: fav.id })} aria-label="즐겨찾기 삭제" className="text-gray-400 hover:text-red-700 min-w-11 text-xl">×</button>
        </div>)}
      </section>
      <section className="ui-card space-y-4">
        <h2 className="font-bold text-gray-800">자주 이용하는 구간 저장</h2>
        <label className="block text-xs text-gray-500">노선<select className={field} value="line2" disabled><option value="line2">2호선</option></select></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-gray-500">출발역<select className={field} value={current} onChange={e => { setCurrent(e.target.value); setDestination(""); setMessage(""); }}><option value="">선택</option>{stations.map(s => <option key={s.membershipId} value={s.membershipId}>{s.name}</option>)}</select></label>
          <label className="text-xs text-gray-500">도착역<select className={field} value={destination} onChange={e => setDestination(e.target.value)}><option value="">선택</option>{stations.filter(s => s.membershipId !== current).map(s => <option key={s.membershipId} value={s.membershipId}>{s.name}</option>)}</select></label>
        </div>
        <p className="text-xs text-gray-500">본선·지선을 포함한 51개 역을 지원합니다. 즐겨찾기는 경로·열차·빈 좌석을 추천하는 기능이 아닙니다. 이 브라우저에만 저장됩니다.</p>
        <button disabled={!from || !to || current === destination || !storageReady || alreadySaved} onClick={() => { if (from && to) persist({ add: { id: crypto.randomUUID(), lineName: "2호선", lineColor: "#EA580C", stationName: from.name, destinationName: to.name } }); }} className="ui-primary"><Icon name="heart" width={18} height={18} />{alreadySaved ? "이미 저장된 즐겨찾기" : "즐겨찾기 저장"}</button>
      </section>
    </>}
    </div>
  </div>;
}
