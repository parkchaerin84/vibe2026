"use client";

import { useState, useMemo } from "react";
import { SUBWAY_LINES, type SubwayLine, type Station } from "@/data/subwayData";

type TimePattern = "rush" | "normal" | "offpeak";

interface StationPrediction {
  stationName: string;
  congestionLevel: number;
  seatProbability: number;
  passengerTrend: "increase" | "decrease" | "stable";
  isRecommended: boolean;
}

const TIME_PATTERNS: { value: TimePattern; label: string; icon: string; description: string }[] = [
  { value: "rush",    label: "출퇴근 시간", icon: "🏃", description: "7–9시 / 18–20시 · 혼잡" },
  { value: "normal",  label: "낮 시간",    icon: "☀️", description: "10–17시 · 보통"           },
  { value: "offpeak", label: "저녁/심야",  icon: "🌙", description: "20시 이후 · 여유"          },
];

function getCongestionStyle(level: number) {
  if (level <= 2) return { bg: "bg-green-50",  bar: "bg-green-500",  border: "border-green-300",  text: "text-green-700",  label: "여유", dot: "🟢" };
  if (level === 3) return { bg: "bg-yellow-50", bar: "bg-yellow-400", border: "border-yellow-300", text: "text-yellow-700", label: "보통", dot: "🟡" };
  return               { bg: "bg-red-50",    bar: "bg-red-500",    border: "border-red-300",    text: "text-red-700",    label: "혼잡", dot: "🔴" };
}

function runPrediction(
  line: SubwayLine,
  fromIndex: number,
  timePattern: TimePattern
): StationPrediction[] {
  const results: StationPrediction[] = [];

  for (let i = fromIndex + 1; i < line.stations.length && results.length < 4; i++) {
    const stopsAhead = i - fromIndex;
    const isNearEnd = i >= line.stations.length - 2;

    // Base from current station's seats congestion
    let level: number = line.stations[fromIndex].recommendations.seats.congestionLevel;

    // Time-of-day adjustment
    const timeDelta = timePattern === "rush" ? 0.2 : timePattern === "offpeak" ? -0.6 : -0.3;
    level += timeDelta * stopsAhead;

    // Natural alighting as train progresses
    level -= 0.25 * stopsAhead;

    // Near-terminal bonus: trains empty out
    if (isNearEnd) level -= 1.2;

    // Blend with actual station data (40% weight)
    const actual = line.stations[i].recommendations.seats.congestionLevel;
    level = level * 0.6 + actual * 0.4;
    level = Math.max(1, Math.min(5, level));

    const rounded = Math.round(level);
    const seatProbability = Math.round(Math.max(5, Math.min(95, ((5 - level) / 4) * 85 + 10)));

    const prevLevel = results.length > 0
      ? results[results.length - 1].congestionLevel
      : line.stations[fromIndex].recommendations.seats.congestionLevel;

    const trend: StationPrediction["passengerTrend"] =
      rounded < prevLevel - 0.4 ? "decrease" :
      rounded > prevLevel + 0.4 ? "increase" : "stable";

    results.push({ stationName: line.stations[i].name, congestionLevel: rounded, seatProbability, passengerTrend: trend, isRecommended: false });
  }

  // Mark the station with highest seat probability
  if (results.length > 0) {
    const bestIdx = results.reduce((best, curr, i) => curr.seatProbability > results[best].seatProbability ? i : best, 0);
    results[bestIdx].isRecommended = true;
  }

  return results;
}

export default function AIPredictPage() {
  const [selectedLine, setSelectedLine] = useState<SubwayLine | null>(null);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [selectedCar, setSelectedCar] = useState<number | null>(null);
  const [timePattern, setTimePattern] = useState<TimePattern>("normal");
  const [showResult, setShowResult] = useState(false);

  const fromIndex = selectedLine && selectedStation
    ? selectedLine.stations.findIndex((s) => s.id === selectedStation.id)
    : -1;

  const predictions = useMemo(() => {
    if (!selectedLine || fromIndex < 0 || selectedCar === null || !showResult) return [];
    return runPrediction(selectedLine, fromIndex, timePattern);
  }, [selectedLine, fromIndex, selectedCar, timePattern, showResult]);

  const handleLineSelect = (line: SubwayLine) => {
    setSelectedLine(line);
    setSelectedStation(null);
    setSelectedCar(null);
    setShowResult(false);
  };

  const currentBase = selectedStation
    ? selectedStation.recommendations.seats.congestionLevel
    : null;
  const currentStyle = currentBase !== null ? getCongestionStyle(currentBase) : null;
  const currentProbability = currentBase !== null
    ? Math.round(((5 - currentBase) / 4) * 85 + 10)
    : null;

  const bestPrediction = predictions.find((p) => p.isRecommended) ?? null;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-700 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🤖</span>
          <h1 className="text-2xl font-bold">AI 자리 예측</h1>
        </div>
        <p className="text-violet-100 text-sm">
          역별 혼잡도 패턴과 승하차 데이터를 분석해 앞으로 자리 날 확률을 예측합니다.
        </p>
      </div>

      {/* Step 1 – 노선 */}
      <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span className="bg-violet-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">1</span>
          노선 선택
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {SUBWAY_LINES.map((line) => (
            <button
              key={line.id}
              onClick={() => handleLineSelect(line)}
              className={`rounded-xl py-3 font-bold text-sm transition-all border-2 ${
                selectedLine?.id === line.id
                  ? "scale-105 shadow-md border-transparent"
                  : "bg-white border-gray-200 hover:border-gray-300"
              }`}
              style={
                selectedLine?.id === line.id
                  ? { backgroundColor: line.color, color: line.textColor }
                  : { color: line.color }
              }
            >
              {line.name}
            </button>
          ))}
        </div>
      </section>

      {/* Step 2 – 현재 탑승 역 */}
      {selectedLine && (
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="bg-violet-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">2</span>
            현재 탑승 역
            <span className="text-xs text-gray-400 font-normal">(종착역 이전까지 선택)</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {selectedLine.stations.map((station, i) => {
              const isTerminal = i === selectedLine.stations.length - 1;
              return (
                <button
                  key={station.id}
                  onClick={() => { if (!isTerminal) { setSelectedStation(station); setSelectedCar(null); setShowResult(false); } }}
                  disabled={isTerminal}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                    selectedStation?.id === station.id
                      ? "text-white border-transparent shadow"
                      : isTerminal
                      ? "bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed"
                      : "bg-white border-gray-200 text-gray-700 hover:border-gray-400"
                  }`}
                  style={selectedStation?.id === station.id ? { backgroundColor: selectedLine.color } : {}}
                >
                  {station.name}
                  {isTerminal && <span className="ml-1 text-xs">(종착)</span>}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Step 3 – 탑승 칸 */}
      {selectedStation && selectedLine && (
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="bg-violet-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">3</span>
            현재 탑승 칸
          </h2>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: selectedLine.totalCars }, (_, i) => i + 1).map((car) => (
              <button
                key={car}
                onClick={() => { setSelectedCar(car); setShowResult(false); }}
                className={`w-12 h-12 rounded-xl font-bold text-sm border-2 transition-all ${
                  selectedCar === car
                    ? "text-white border-transparent shadow-md scale-105"
                    : "bg-white border-gray-200 text-gray-600 hover:border-violet-300"
                }`}
                style={selectedCar === car ? { backgroundColor: selectedLine.color } : {}}
              >
                {car}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Step 4 – 시간대 */}
      {selectedCar !== null && (
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="bg-violet-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">4</span>
            현재 시간대
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {TIME_PATTERNS.map((tp) => (
              <button
                key={tp.value}
                onClick={() => { setTimePattern(tp.value); setShowResult(false); }}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  timePattern === tp.value
                    ? "border-violet-500 bg-violet-50"
                    : "border-gray-200 hover:border-violet-200 bg-white"
                }`}
              >
                <div className="text-xl mb-1">{tp.icon}</div>
                <div className="font-semibold text-sm text-gray-800">{tp.label}</div>
                <div className="text-xs text-gray-400 mt-0.5 leading-tight">{tp.description}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 예측 버튼 */}
      {selectedCar !== null && (
        <button
          onClick={() => setShowResult(true)}
          className="w-full py-4 bg-violet-600 hover:bg-violet-700 text-white font-black text-lg rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <span>🤖</span> AI 예측 시작
        </button>
      )}

      {/* 결과 */}
      {showResult && selectedLine && selectedStation && currentStyle && currentProbability !== null && (
        <section className="space-y-4">

          {/* 현재 상태 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span>📍</span> 현재 위치
            </h2>
            <div className={`rounded-xl p-4 border-2 ${currentStyle.bg} ${currentStyle.border}`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span>{currentStyle.dot}</span>
                    <span className="font-bold text-gray-800">
                      {selectedStation.name}역 · {selectedCar}번 칸
                    </span>
                  </div>
                  <p className={`text-sm font-medium ${currentStyle.text}`}>
                    현재 혼잡도: {currentStyle.label}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-gray-800">{currentProbability}%</p>
                  <p className="text-xs text-gray-400">착석 가능성</p>
                </div>
              </div>
              <div className="h-2.5 bg-white/70 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${currentStyle.bar}`}
                  style={{ width: `${(currentBase! / 5) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* 예측 타임라인 */}
          {predictions.length > 0 ? (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h2 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
                <span>🔮</span> 앞으로의 예측
              </h2>
              <p className="text-xs text-gray-400 mb-4">승하차 패턴 · 혼잡도 데이터 기반 분석</p>

              <div className="space-y-3">
                {predictions.map((pred, i) => {
                  const style = getCongestionStyle(pred.congestionLevel);
                  const trendLabel =
                    pred.passengerTrend === "decrease" ? "↓ 혼잡 감소" :
                    pred.passengerTrend === "increase" ? "↑ 혼잡 증가" : "→ 유지";
                  const trendColor =
                    pred.passengerTrend === "decrease" ? "text-green-500" :
                    pred.passengerTrend === "increase" ? "text-red-500" : "text-gray-400";

                  return (
                    <div
                      key={pred.stationName}
                      className={`relative rounded-xl p-4 border-2 ${
                        pred.isRecommended
                          ? "border-violet-400 bg-violet-50 shadow"
                          : `${style.bg} ${style.border}`
                      }`}
                    >
                      {pred.isRecommended && (
                        <span className="absolute -top-3 left-4 bg-violet-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow">
                          ⭐ 추천 탑승 시점
                        </span>
                      )}

                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-gray-400 font-medium">{i + 1}정거장 후</span>
                          <span className="font-bold text-gray-800">{pred.stationName}역</span>
                          <span className={`text-xs font-semibold ${trendColor}`}>{trendLabel}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.bg} ${style.text}`}>
                            {style.dot} {style.label}
                          </span>
                          <span className="text-xl font-black text-gray-800">{pred.seatProbability}%</span>
                        </div>
                      </div>

                      <div className="h-2.5 bg-white/70 rounded-full overflow-hidden mb-1.5">
                        <div
                          className={`h-full rounded-full ${style.bar} transition-all`}
                          style={{ width: `${(pred.congestionLevel / 5) * 100}%` }}
                        />
                      </div>

                      <p className="text-xs text-gray-500">
                        {pred.seatProbability >= 70
                          ? "자리 날 가능성 높음 — 이 역에서 착석을 시도하세요"
                          : pred.seatProbability >= 40
                          ? "자리 날 가능성 보통 — 여유가 생길 수 있어요"
                          : "자리 나기 어려움 — 다음 정거장을 기다려 보세요"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-8 text-center text-gray-400 shadow-sm border border-gray-100">
              <p className="text-3xl mb-2">🚉</p>
              <p className="text-sm">종착역에 가까워 예측할 다음 역이 없습니다.</p>
            </div>
          )}

          {/* AI 종합 요약 */}
          {predictions.length > 0 && (
            <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 space-y-1">
              <p className="text-xs font-bold text-violet-600">🤖 AI 종합 분석</p>
              <p className="text-sm text-violet-900 leading-relaxed">
                {bestPrediction
                  ? bestPrediction.seatProbability >= 70
                    ? `${bestPrediction.stationName}역 도착 시 ${bestPrediction.seatProbability}% 확률로 착석 가능합니다. ${selectedCar}번 칸 문 앞에서 미리 대기하세요.`
                    : `이번 구간은 전반적으로 혼잡합니다. ${bestPrediction.stationName}역(${bestPrediction.seatProbability}%)이 가장 자리 날 가능성이 높습니다.`
                  : "예측 데이터가 충분하지 않습니다."
                }
              </p>
            </div>
          )}

          <p className="text-xs text-center text-gray-400">
            * 예측은 혼잡도 패턴 기반이며 실제 상황과 다를 수 있습니다.
          </p>
        </section>
      )}
    </div>
  );
}
