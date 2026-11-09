import PageHeader from "@/components/ui/PageHeader";

export default function CarStatusPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="칸 운영 상태 관리" description="실제 운영 정보 연동 준비 중입니다." icon="train" />

      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
        <span aria-hidden="true" className="text-amber-600 text-lg">🚧</span>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-amber-800">현재 이용할 수 없는 기능입니다</p>
          <p className="text-xs text-amber-700">실제 철도 운영 시스템과 연결되어 있지 않아 칸 운영 상태를 조회·변경·저장할 수 없습니다.</p>
        </div>
      </div>

      <section className="ui-card space-y-4">
        <h2 className="font-bold text-gray-800">운영 정보 연동 준비 중</h2>
        <p className="text-sm text-gray-600">확인된 운영 정보가 없어 칸별 용도와 운행 상태를 표시하지 않습니다. 실제 운영 정보와 권한 체계를 갖추기 전까지 편집과 저장 기능을 제공하지 않습니다.</p>
        <button type="button" disabled aria-describedby="car-status-unavailable" className="w-full py-3 bg-gray-200 text-gray-500 font-bold rounded-xl cursor-not-allowed">상태 변경·저장 준비 중</button>
        <p id="car-status-unavailable" className="text-xs text-gray-500">현재 이 화면에서는 정보를 변경하거나 저장할 수 없습니다.</p>
      </section>
    </div>
  );
}
