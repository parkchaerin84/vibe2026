import PageHeader from "@/components/ui/PageHeader";

export default function EmergencyPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="긴급 신고 안내" description="긴급한 순간에는 공식 신고 번호로 직접 연락해 주세요." icon="shield" eyebrow="SAFETY FIRST" />

      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
        <span aria-hidden="true" className="text-lg">💡</span>
        <p><strong>SubwayEasy는 신고를 접수하거나 기관에 전달하지 않습니다.</strong> 이 화면에서는 공식 신고 방법만 안내합니다. 커뮤니티에 글을 작성해도 공식 신고로 접수되지 않습니다.</p>
      </div>

      <section className="ui-card space-y-4" aria-labelledby="emergency-contacts">
        <h2 id="emergency-contacts" className="font-bold text-gray-800">공식 긴급 신고 번호</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl p-4 border border-red-200 bg-red-50 space-y-3">
            <p className="text-sm font-bold text-red-800">화재 · 구조 · 구급</p>
            <p className="text-3xl font-black text-red-700">119</p>
            <p className="text-sm text-gray-600">화재나 응급환자 등 긴급 상황은 119에 직접 신고해 주세요.</p>
            <a href="tel:119" className="ui-primary w-full">119 전화 앱 열기</a>
          </div>
          <div className="rounded-xl p-4 border border-blue-200 bg-blue-50 space-y-3">
            <p className="text-sm font-bold text-blue-800">범죄 · 경찰 도움이 필요한 긴급 상황</p>
            <p className="text-3xl font-black text-blue-700">112</p>
            <p className="text-sm text-gray-600">범죄나 신변 위협 등 긴급 상황은 112에 직접 신고해 주세요.</p>
            <a href="tel:112" className="ui-secondary !bg-[#EAF6FC] !text-[#2E566F] w-full">112 전화 앱 열기</a>
          </div>
        </div>
        <p className="text-xs text-gray-500">전화 링크는 기기의 전화 앱을 엽니다. 신고가 자동으로 접수되지는 않으며, 직접 통화해야 합니다. 전화 기능이 없는 기기에서는 휴대전화로 위 번호에 연락해 주세요.</p>
      </section>

      <section className="ui-card space-y-3">
        <h2 className="font-bold text-gray-800">신고할 때 전달할 정보</h2>
        <p className="text-sm text-gray-600">현재 노선과 역, 열차 진행 방향, 칸 번호와 상황을 확인할 수 있는 범위에서 신고기관에 알려주세요. 이 사이트에 입력하거나 남길 필요는 없습니다.</p>
      </section>

      <section className="ui-card space-y-3">
        <h2 className="font-bold text-gray-800">분실물 · 일반 이용 불편</h2>
        <p className="text-sm text-gray-600">긴급 상황이 아닌 분실물이나 시설 불편은 역무실 또는 해당 노선 운영기관의 고객센터로 문의해 주세요. 역·열차 안내문과 운영기관 공식 홈페이지에서 연락처를 확인할 수 있습니다.</p>
        <a href="https://www.mois.go.kr/frt/sub/a06/b10/emergencycall/screen.do" target="_blank" rel="noopener noreferrer" className="inline-block text-sm font-medium text-red-700 underline">행정안전부 공식 긴급신고 안내 (새 창)</a>
      </section>
    </div>
  );
}
