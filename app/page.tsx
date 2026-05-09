"use client";

import { useState } from "react";
import {
  SUBWAY_LINES,
  CONDITIONS,
  CONGESTION_LABELS,
  getRecommendedCar,
  type Condition,
  type SubwayLine,
  type Station,
} from "@/data/subwayData";
import SubwayCarDiagram from "@/components/SubwayCarDiagram";

export default function Home() {
  const [selectedLine, setSelectedLine] = useState<SubwayLine | null>(null);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [selectedConditions, setSelectedConditions] = useState<Condition[]>([]);
  const [showResult, setShowResult] = useState(false);

  const handleLineSelect = (line: SubwayLine) => {
    setSelectedLine(line);
    setSelectedStation(null);
    setSelectedConditions([]);
    setShowResult(false);
  };

  const handleStationSelect = (station: Station) => {
    setSelectedStation(station);
    setSelectedConditions([]);
    setShowResult(false);
  };

  const toggleCondition = (cond: Condition) => {
    setSelectedConditions((prev) =>
      prev.includes(cond) ? prev.filter((c) => c !== cond) : [...prev, cond]
    );
    setShowResult(false);
  };

  const handleRecommend = () => {
    if (selectedStation && selectedConditions.length > 0) {
      setShowResult(true);
    }
  };

  const result =
    showResult && selectedStation && selectedConditions.length > 0
      ? getRecommendedCar(selectedStation, selectedConditions)
      : null;

  const primaryCondition = selectedConditions[0];
  const resultRec =
    result && selectedStation && primaryCondition
      ? selectedStation.recommendations[primaryCondition]
      : null;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-1">내 맞춤 지하철 칸 찾기</h1>
        <p className="text-blue-100 text-sm">
          노선과 역, 원하는 조건을 선택하면 가장 적합한 칸을 추천해드려요.
        </p>
      </div>

      {/* Step 1: Line Selection */}
      <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span className="bg-blue-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">1</span>
          노선 선택
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {SUBWAY_LINES.map((line) => (
            <button
              key={line.id}
              onClick={() => handleLineSelect(line)}
              className={`rounded-xl py-3 font-bold text-sm transition-all border-2
                ${selectedLine?.id === line.id
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

      {/* Step 2: Station Selection */}
      {selectedLine && (
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="bg-blue-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">2</span>
            역 선택
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: selectedLine.color }}
            >
              {selectedLine.name}
            </span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {selectedLine.stations.map((station) => (
              <button
                key={station.id}
                onClick={() => handleStationSelect(station)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-all
                  ${selectedStation?.id === station.id
                    ? "text-white border-transparent shadow"
                    : "bg-white border-gray-200 text-gray-700 hover:border-gray-400"
                  }`}
                style={
                  selectedStation?.id === station.id
                    ? { backgroundColor: selectedLine.color }
                    : {}
                }
              >
                {station.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Step 3: Condition Selection */}
      {selectedStation && (
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="bg-blue-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">3</span>
            원하는 조건 선택
            <span className="text-gray-400 font-normal text-xs">(복수 선택 가능)</span>
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {(Object.entries(CONDITIONS) as [Condition, typeof CONDITIONS[Condition]][]).map(
              ([key, cond]) => (
                <button
                  key={key}
                  onClick={() => toggleCondition(key)}
                  className={`flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all
                    ${selectedConditions.includes(key)
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-blue-300 bg-white"
                    }`}
                >
                  <span className="text-2xl">{cond.icon}</span>
                  <div>
                    <div className="font-semibold text-sm text-gray-800">{cond.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{cond.description}</div>
                  </div>
                </button>
              )
            )}
          </div>

          <button
            onClick={handleRecommend}
            disabled={selectedConditions.length === 0}
            className={`mt-4 w-full py-3 rounded-xl font-bold text-white transition-all
              ${selectedConditions.length > 0
                ? "bg-blue-600 hover:bg-blue-700 shadow-md"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
          >
            칸 추천받기
          </button>
        </section>
      )}

      {/* Step 4: Result */}
      {showResult && result && selectedLine && selectedStation && (
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="bg-green-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">✓</span>
            추천 결과
          </h2>

          {/* Big result display */}
          <div
            className="rounded-xl p-5 text-white text-center mb-5"
            style={{ background: `linear-gradient(135deg, ${selectedLine.color}, ${selectedLine.color}cc)` }}
          >
            <p className="text-sm opacity-80 mb-1">
              {selectedLine.name} · {selectedStation.name}
            </p>
            <p className="text-5xl font-black mb-1">{result.car}번 칸</p>
            <p className="text-sm opacity-80">을 추천합니다</p>
          </div>

          {/* Car diagram */}
          <div className="bg-gray-50 rounded-xl p-3 mb-4">
            <p className="text-xs text-gray-500 text-center mb-2">열차 위치 안내</p>
            <SubwayCarDiagram
              totalCars={selectedLine.totalCars}
              recommendedCar={result.car}
              lineColor={selectedLine.color}
              carStatuses={selectedStation.carStatuses}
            />
          </div>

          {/* Reasons */}
          <div className="space-y-3">
            {result.reasons.map((reason, i) => (
              <div key={i} className="flex items-start gap-2 bg-blue-50 rounded-lg p-3">
                <span className="text-blue-500 mt-0.5">💡</span>
                <p className="text-sm text-gray-700">{reason}</p>
              </div>
            ))}

            {/* Congestion level */}
            {resultRec && (
              <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                <span className="text-sm text-gray-500">현재 혼잡도</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`w-4 h-4 rounded-sm ${
                        level <= resultRec.congestionLevel
                          ? level <= 2
                            ? "bg-green-400"
                            : level <= 3
                            ? "bg-yellow-400"
                            : "bg-red-400"
                          : "bg-gray-200"
                      }`}
                    />
                  ))}
                </div>
                <span className={`text-sm font-medium ${CONGESTION_LABELS[resultRec.congestionLevel].color}`}>
                  {CONGESTION_LABELS[resultRec.congestionLevel].label}
                </span>
              </div>
            )}

            {/* Tips */}
            {resultRec && resultRec.tips.length > 0 && (
              <div className="bg-yellow-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-yellow-700 mb-1">참고 팁</p>
                {resultRec.tips.map((tip, i) => (
                  <p key={i} className="text-sm text-yellow-800">• {tip}</p>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
