import type { SeatShareRow } from "@/lib/supabase/database";
import SeatShareCars from "./SeatShareCars";

export default function SeatShareCard({ share, lineName, routeName, currentStation, exitStation, now,
  owned = false, busy = false, onDelete }: {
  share: SeatShareRow; lineName: string; routeName: string;
  currentStation: string; exitStation: string; now: number;
  owned?: boolean; busy?: boolean; onDelete?: (id: string) => void;
}) {
  return <article className={`bg-white rounded-xl p-4 shadow-sm border ${owned ? "border-pink-300" : "border-gray-100"}`}>
    <div className="flex items-start justify-between gap-2 mb-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="line-badge"><i aria-hidden="true" />{lineName} · {routeName}</span>
        <span className="text-xs text-gray-500">등록 당시 {currentStation}</span>
        {owned && <span className="text-xs text-brand-ink">내 제보</span>}
      </div>
      {owned && onDelete && <button disabled={busy} onClick={() => onDelete(share.id)} className="text-xs text-red-700 disabled:text-gray-400" aria-label="내 하차 정보 삭제">삭제</button>}
    </div>
    <SeatShareCars carNumber={share.car_number} />
    <div className="flex flex-wrap items-center gap-4">
      <div><p className="text-xs text-gray-400">방향</p><p className="text-sm text-gray-700">{share.direction_label}</p></div>
      <span className="text-gray-300" aria-hidden="true">→</span>
      <div><p className="text-xs text-gray-400">하차 예정 역</p><p className="font-bold text-brand-ink">{exitStation}</p></div>
    </div>
    <p className="text-xs text-gray-500 mt-3">등록 {new Date(share.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} · 공유 유효시간 약 {Math.max(0, Math.ceil((Date.parse(share.expires_at) - now) / 60000))}분 남음</p>
  </article>;
}
