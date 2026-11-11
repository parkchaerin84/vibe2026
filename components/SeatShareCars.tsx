import { SHARE_CAR_LIMITS } from "@/lib/transit/car-policy";

/** Read-only car indicator. Each report keeps its own car number. */
export default function SeatShareCars({ carNumber }: { carNumber: number }) {
  const carCount = SHARE_CAR_LIMITS.line2;
  const inRange = Number.isInteger(carNumber) && carNumber >= 1 && carNumber <= carCount;

  return <div className="mb-4 rounded-xl border border-pink-100 bg-brand-canvas p-3">
    <div className="mb-2 flex items-center justify-between gap-2">
      <p className="text-xs font-semibold text-ink-muted">탑승 칸</p>
      <p className="text-xs font-bold text-brand-ink">{carNumber}번 칸</p>
    </div>
    <div role="img" aria-label={inRange ? `전체 10칸 중 ${carNumber}번 칸에 탑승` : `10칸 기준 표시 범위 밖의 제보: ${carNumber}번 칸`}
      className="grid grid-cols-10 gap-1 sm:gap-2">
      {Array.from({ length: carCount }, (_, index) => index + 1).map(number => <span key={number} aria-hidden="true"
        className={`flex min-w-0 items-center justify-center rounded-md border py-2 text-[11px] leading-4 sm:rounded-lg sm:py-2.5 sm:text-xs ${number === carNumber
          ? "border-brand-ink bg-brand-ink font-black text-white ring-2 ring-brand-pink ring-offset-1 ring-offset-brand-canvas"
          : "border-pink-200 bg-white font-medium text-ink-muted"}`}>
        {number}
      </span>)}
    </div>
    {!inRange && <p className="mt-2 text-xs text-ink-muted">1~10번 칸 범위 밖의 제보입니다.</p>}
  </div>;
}
