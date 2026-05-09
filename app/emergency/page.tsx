"use client";

import { useState } from "react";
import Link from "next/link";
import { SUBWAY_LINES } from "@/data/subwayData";

type EmergencyType = "취객" | "분실물" | "위험 상황" | "시설 고장";

const EMERGENCY_TYPES: { type: EmergencyType; icon: string; color: string; description: string }[] = [
  { type: "취객", icon: "🍺", color: "border-yellow-400 bg-yellow-50 text-yellow-800", description: "음주 승객으로 인한 불편 신고" },
  { type: "분실물", icon: "🎒", color: "border-blue-400 bg-blue-50 text-blue-800", description: "열차 내 분실물 발견 또는 신고" },
  { type: "위험 상황", icon: "⚠️", color: "border-red-400 bg-red-50 text-red-800", description: "안전 위협 상황 즉시 신고" },
  { type: "시설 고장", icon: "🔧", color: "border-gray-400 bg-gray-50 text-gray-800", description: "열차·역사 시설 파손 또는 오작동" },
];

export default function EmergencyPage() {
  const [selectedType, setSelectedType] = useState<EmergencyType | null>(null);
  const [selectedLine, setSelectedLine] = useState("");
  const [selectedStation, setSelectedStation] = useState("");
  const [selectedCar, setSelectedCar] = useState("");
  const [detail, setDetail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const selectedLineData = SUBWAY_LINES.find((l) => l.name === selectedLine);

  const handleSubmit = () => {
    if (!selectedType || !selectedLine || !selectedStation) return;
    setSubmitted(true);
  };

  const handleReset = () => {
    setSelectedType(null);
    setSelectedLine("");
    setSelectedStation("");
    setSelectedCar("");
    setDetail("");
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-red-500 to-red-700 rounded-2xl p-6 text-white">
          <h1 className="text-2xl font-bold mb-1">긴급 신고</h1>
          <p className="text-red-100 text-sm">신고가 접수되었습니다.</p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center space-y-4">
          <div className="text-5xl">✅</div>
          <h2 className="text-xl font-bold text-gray-800">신고가 접수되었습니다</h2>
          <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 text-sm text-gray-700">
            <p><span className="font-semibold">신고 유형:</span> {selectedType}</p>
            <p><span className="font-semibold">노선 / 역:</span> {selectedLine} · {selectedStation}역</p>
            {selectedCar && <p><span className="font-semibold">탑승 칸:</span> {selectedCar}번 칸</p>}
            {detail && <p><span className="font-semibold">상세 내용:</span> {detail}</p>}
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
            접수된 신고는{" "}
            <Link href="/community" className="font-bold underline">
              민원 커뮤니티
            </Link>
            에서 확인할 수 있습니다.
          </div>
          <button
            onClick={handleReset}
            className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all"
          >
            새 신고 접수하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-r from-red-500 to-red-700 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-1">긴급 신고</h1>
        <p className="text-red-100 text-sm">
          열차 내 긴급 상황을 빠르게 신고하세요. 접수된 신고는 민원 커뮤니티에서 확인할 수 있습니다.
        </p>
      </div>

      {/* 안내 배너 */}
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
        <span className="text-lg">💡</span>
        <p>생명을 위협하는 응급 상황은 즉시 <strong>119</strong> 또는 <strong>112</strong>에 신고하세요.</p>
      </div>

      {/* Step 1: 신고 유형 */}
      <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span className="bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">1</span>
          신고 유형 선택
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {EMERGENCY_TYPES.map((item) => (
            <button
              key={item.type}
              onClick={() => setSelectedType(item.type)}
              className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all
                ${selectedType === item.type
                  ? item.color + " border-opacity-100 ring-2 ring-offset-1 ring-red-400"
                  : "bg-white border-gray-200 hover:border-red-300"
                }`}
            >
              <span className="text-2xl">{item.icon}</span>
              <div>
                <p className="font-bold text-sm">{item.type}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Step 2: 위치 정보 */}
      {selectedType && (
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">2</span>
            위치 정보 입력
          </h2>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {/* 노선 */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">노선 *</label>
                <select
                  value={selectedLine}
                  onChange={(e) => { setSelectedLine(e.target.value); setSelectedStation(""); setSelectedCar(""); }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                >
                  <option value="">선택</option>
                  {SUBWAY_LINES.map((l) => (
                    <option key={l.id} value={l.name}>{l.name}</option>
                  ))}
                </select>
              </div>

              {/* 역 */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">역 *</label>
                <select
                  value={selectedStation}
                  onChange={(e) => { setSelectedStation(e.target.value); setSelectedCar(""); }}
                  disabled={!selectedLine}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 disabled:bg-gray-50"
                >
                  <option value="">선택</option>
                  {selectedLineData?.stations.map((s) => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 칸 번호 */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">탑승 칸 (선택)</label>
              <select
                value={selectedCar}
                onChange={(e) => setSelectedCar(e.target.value)}
                disabled={!selectedLine}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 disabled:bg-gray-50"
              >
                <option value="">선택</option>
                {selectedLineData && Array.from({ length: selectedLineData.totalCars }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}번 칸</option>
                ))}
              </select>
            </div>

            {/* 상세 내용 */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">상세 내용 (선택)</label>
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="상황을 간략히 설명해 주세요."
                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 min-h-[80px] resize-none"
              />
            </div>
          </div>
        </section>
      )}

      {/* 안내 문구 */}
      {selectedType && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          <span>📢</span>
          <p>접수된 신고는 <Link href="/community" className="font-bold underline">민원 커뮤니티</Link>에서 확인할 수 있습니다.</p>
        </div>
      )}

      {/* 제출 버튼 */}
      {selectedType && (
        <button
          onClick={handleSubmit}
          disabled={!selectedLine || !selectedStation}
          className={`w-full py-4 rounded-xl font-bold text-white text-lg transition-all
            ${selectedLine && selectedStation
              ? "bg-red-500 hover:bg-red-600 shadow-md"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
        >
          🚨 신고 접수하기
        </button>
      )}
    </div>
  );
}
