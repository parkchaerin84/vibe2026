"use client";

import { useState } from "react";
import { SUBWAY_LINES } from "@/data/subwayData";

interface SeatShare {
  id: number;
  user: string;
  line: string;
  lineColor: string;
  station: string;
  car: number;
  seatNumber: string;
  exitStation: string;
  stopsUntilExit: number;
  timeLeft: string;
  isCurrentUser?: boolean;
}

interface CarVacancySummary {
  key: string;
  line: string;
  lineColor: string;
  car: number;
  count: number;
  minStops: number;
}

const MOCK_SHARES: SeatShare[] = [
  {
    id: 1,
    user: "승객A",
    line: "2호선",
    lineColor: "#00A84D",
    station: "홍대입구",
    car: 3,
    seatNumber: "3-4",
    exitStation: "강남",
    stopsUntilExit: 1,
    timeLeft: "약 18분 후",
  },
  {
    id: 2,
    user: "승객B",
    line: "2호선",
    lineColor: "#00A84D",
    station: "신촌",
    car: 3,
    seatNumber: "3-2",
    exitStation: "건대입구",
    stopsUntilExit: 1,
    timeLeft: "약 25분 후",
  },
  {
    id: 3,
    user: "승객C",
    line: "5호선",
    lineColor: "#996CAC",
    station: "광화문",
    car: 2,
    seatNumber: "2-7",
    exitStation: "왕십리",
    stopsUntilExit: 2,
    timeLeft: "약 12분 후",
  },
  {
    id: 4,
    user: "승객D",
    line: "9호선",
    lineColor: "#BDB092",
    station: "여의도",
    car: 4,
    seatNumber: "4-1",
    exitStation: "고속터미널",
    stopsUntilExit: 3,
    timeLeft: "약 20분 후",
  },
  {
    id: 5,
    user: "승객E",
    line: "2호선",
    lineColor: "#00A84D",
    station: "신도림",
    car: 3,
    seatNumber: "3-6",
    exitStation: "홍대입구",
    stopsUntilExit: 1,
    timeLeft: "약 8분 후",
  },
];

function getVacancyStyle(count: number) {
  if (count >= 3)
    return {
      dot: "🟢",
      label: "자리 가능성 높음",
      bg: "bg-green-50",
      border: "border-green-300",
      badge: "bg-green-100 text-green-700",
      bar: "bg-green-400",
    };
  if (count === 2)
    return {
      dot: "🟡",
      label: "자리 가능성 보통",
      bg: "bg-yellow-50",
      border: "border-yellow-300",
      badge: "bg-yellow-100 text-yellow-700",
      bar: "bg-yellow-400",
    };
  return {
    dot: "🔴",
    label: "자리 가능성 낮음",
    bg: "bg-red-50",
    border: "border-red-300",
    badge: "bg-red-100 text-red-700",
    bar: "bg-red-300",
  };
}

export default function ShareSeatPage() {
  const [shares, setShares] = useState<SeatShare[]>(MOCK_SHARES);
  const [showForm, setShowForm] = useState(false);
  const [formLine, setFormLine] = useState("");
  const [formStation, setFormStation] = useState("");
  const [formCar, setFormCar] = useState("");
  const [formSeat, setFormSeat] = useState("");
  const [formExit, setFormExit] = useState("");
  const [formStops, setFormStops] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [filterLine, setFilterLine] = useState("전체");

  const selectedLineData = SUBWAY_LINES.find((l) => l.name === formLine);

  // 칸별 하차 예정 요약 계산
  const vacancySummaries: CarVacancySummary[] = Object.values(
    shares.reduce<Record<string, CarVacancySummary>>((acc, share) => {
      const key = `${share.line}-${share.car}`;
      if (!acc[key]) {
        acc[key] = {
          key,
          line: share.line,
          lineColor: share.lineColor,
          car: share.car,
          count: 0,
          minStops: Infinity,
        };
      }
      acc[key].count += 1;
      if (share.stopsUntilExit < acc[key].minStops) {
        acc[key].minStops = share.stopsUntilExit;
      }
      return acc;
    }, {})
  ).sort((a, b) => a.minStops - b.minStops || b.count - a.count);

  const handleSubmit = () => {
    if (!formLine || !formStation || !formCar || !formExit) return;
    const lineData = SUBWAY_LINES.find((l) => l.name === formLine);
    const newShare: SeatShare = {
      id: Date.now(),
      user: "나",
      line: formLine,
      lineColor: lineData?.color ?? "#666",
      station: formStation,
      car: Number(formCar),
      seatNumber: formSeat || `${formCar}-?`,
      exitStation: formExit,
      stopsUntilExit: Number(formStops) || 1,
      timeLeft: "방금 등록됨",
      isCurrentUser: true,
    };
    setShares((prev) => [newShare, ...prev]);
    setShowForm(false);
    setSubmitted(true);
    setFormLine("");
    setFormStation("");
    setFormCar("");
    setFormSeat("");
    setFormExit("");
    setFormStops("");
    setTimeout(() => setSubmitted(false), 4000);
  };

  const handleDelete = (id: number) => {
    setShares((prev) => prev.filter((s) => s.id !== id));
  };

  const allLines = ["전체", ...Array.from(new Set(shares.map((s) => s.line)))];
  const filtered =
    filterLine === "전체" ? shares : shares.filter((s) => s.line === filterLine);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-700 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-1">하차 공유</h1>
        <p className="text-purple-100 text-sm">
          앉아 계신 분이 내리는 역을 공유하면, 서 있는 분이 미리 자리를 잡을 수 있어요.
        </p>
      </div>

      {/* 곧 자리 남아요 */}
      <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            <span>🪑</span> 곧 자리 남아요
          </h2>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            실시간 승객 공유 기반
          </span>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          하차 예정 승객이 공유한 칸 정보입니다. 해당 칸 앞에서 미리 대기하세요.
        </p>

        {vacancySummaries.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-3xl mb-2">🪑</p>
            <p className="text-sm">현재 공유된 자리 정보가 없습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {vacancySummaries.map((v) => {
              const style = getVacancyStyle(v.count);
              return (
                <div
                  key={v.key}
                  className={`rounded-xl p-4 border ${style.bg} ${style.border}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{style.dot}</span>
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: v.lineColor }}
                      >
                        {v.line}
                      </span>
                      <span className="font-black text-gray-800 text-lg">{v.car}번 칸</span>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.badge}`}>
                      {style.label}
                    </span>
                  </div>

                  <p className="text-sm text-gray-700 mb-3">
                    {v.minStops === 1 ? "다음 역" : `${v.minStops}정거장 후`} 하차 예정{" "}
                    <span className="font-bold">{v.count}명</span>
                  </p>

                  {/* 인원 바 */}
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(v.count, 5) }, (_, i) => (
                      <div key={i} className={`h-2 flex-1 rounded-full ${style.bar}`} />
                    ))}
                    {v.count < 5 &&
                      Array.from({ length: 5 - v.count }, (_, i) => (
                        <div key={i} className="h-2 flex-1 rounded-full bg-gray-200" />
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 이용 방법 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h2 className="font-bold text-gray-800 mb-3">이용 방법</h2>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { icon: "💺", text: "좌석에 앉은 후\n내리는 역 입력" },
            { icon: "📱", text: "앱 사용자에게\n내 위치 공유됨" },
            { icon: "🧍", text: "다른 사용자가\n내 앞에서 대기" },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center gap-2 p-3 bg-purple-50 rounded-xl">
              <span className="text-2xl">{item.icon}</span>
              <p className="text-xs text-gray-600 whitespace-pre-line leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 공유 버튼 */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md transition-all"
        >
          + 내 하차역 공유하기
        </button>
      )}

      {submitted && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 text-sm font-medium text-center">
          ✓ 하차역이 공유되었습니다! 다른 사용자들이 볼 수 있어요.
        </div>
      )}

      {/* 등록 폼 */}
      {showForm && (
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
          <h2 className="font-bold text-gray-800">하차 정보 입력</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">노선</label>
              <select
                value={formLine}
                onChange={(e) => { setFormLine(e.target.value); setFormStation(""); }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                <option value="">선택</option>
                {SUBWAY_LINES.map((l) => (
                  <option key={l.id} value={l.name}>{l.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">현재 탑승 역</label>
              <select
                value={formStation}
                onChange={(e) => setFormStation(e.target.value)}
                disabled={!formLine}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:bg-gray-50"
              >
                <option value="">선택</option>
                {selectedLineData?.stations.map((s) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">탑승 칸</label>
              <select
                value={formCar}
                onChange={(e) => setFormCar(e.target.value)}
                disabled={!formLine}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:bg-gray-50"
              >
                <option value="">선택</option>
                {selectedLineData &&
                  Array.from({ length: selectedLineData.totalCars }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}번 칸</option>
                  ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">좌석 번호 (선택)</label>
              <input
                type="text"
                placeholder="예: 3-4"
                value={formSeat}
                onChange={(e) => setFormSeat(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">내리는 역</label>
              <select
                value={formExit}
                onChange={(e) => setFormExit(e.target.value)}
                disabled={!formLine}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:bg-gray-50"
              >
                <option value="">선택</option>
                {selectedLineData?.stations.map((s) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">몇 정거장 후 하차</label>
              <select
                value={formStops}
                onChange={(e) => setFormStops(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                <option value="">선택</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n}정거장 후</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-all"
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={!formLine || !formStation || !formCar || !formExit}
              className="flex-1 py-2.5 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 disabled:bg-gray-200 disabled:text-gray-400 transition-all"
            >
              공유하기
            </button>
          </div>
        </section>
      )}

      {/* 필터 */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {allLines.map((line) => (
          <button
            key={line}
            onClick={() => setFilterLine(line)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all
              ${filterLine === line
                ? "bg-purple-600 text-white border-transparent"
                : "bg-white border-gray-200 text-gray-600 hover:border-purple-300"
              }`}
          >
            {line}
          </button>
        ))}
      </div>

      {/* 공유 목록 */}
      <section className="space-y-3">
        <h2 className="font-bold text-gray-800 flex items-center gap-2">
          <span className="text-purple-600">📍</span>
          현재 공유 중인 자리 ({filtered.length}개)
        </h2>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-3xl mb-2">🪑</p>
            <p className="text-sm">공유된 자리가 없습니다.</p>
          </div>
        )}

        {filtered.map((share) => (
          <div
            key={share.id}
            className={`bg-white rounded-xl p-4 shadow-sm border transition-all
              ${share.isCurrentUser ? "border-purple-300 bg-purple-50" : "border-gray-100"}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: share.lineColor }}
                >
                  {share.line}
                </span>
                <span className="text-xs text-gray-500">{share.station}역 탑승</span>
                {share.isCurrentUser && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">나</span>
                )}
              </div>
              {share.isCurrentUser && (
                <button
                  onClick={() => handleDelete(share.id)}
                  className="text-xs text-red-400 hover:text-red-600 transition-colors"
                >
                  삭제
                </button>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-xs text-gray-400">탑승 칸</p>
                <p className="text-xl font-black text-gray-800">{share.car}번</p>
              </div>
              {share.seatNumber && (
                <div className="text-center">
                  <p className="text-xs text-gray-400">좌석</p>
                  <p className="text-sm font-semibold text-gray-700">{share.seatNumber}</p>
                </div>
              )}
              <div className="text-center">
                <p className="text-xs text-gray-400">하차까지</p>
                <p className="text-sm font-semibold text-gray-700">{share.stopsUntilExit}정거장</p>
              </div>
              <div className="flex-1 flex items-center gap-2">
                <span className="text-gray-300">→</span>
                <div>
                  <p className="text-xs text-gray-400">내리는 역</p>
                  <p className="text-base font-bold text-purple-700">{share.exitStation}역</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">예상</p>
                <p className="text-xs font-medium text-gray-600">{share.timeLeft}</p>
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
