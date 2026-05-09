"use client";

import { useState } from "react";
import Image from "next/image";
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

interface Favorite {
  id: string;
  lineName: string;
  lineColor: string;
  stationName: string;
  destinationName: string;
}

const STORAGE_KEY = "subwayeasy_favorites";

export default function Home() {
  const [selectedLine, setSelectedLine] = useState<SubwayLine | null>(null);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<Station | null>(null);
  const [selectedConditions, setSelectedConditions] = useState<Condition[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [favorites, setFavorites] = useState<Favorite[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? (JSON.parse(stored) as Favorite[]) : [];
    } catch {
      return [];
    }
  });
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [showLanding, setShowLanding] = useState(true);

  const persistFavorites = (updated: Favorite[]) => {
    setFavorites(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  };

  const handleAddFavorite = () => {
    if (!selectedLine || !selectedStation || !selectedDestination) return;
    const duplicate = favorites.some(
      (f) =>
        f.lineName === selectedLine.name &&
        f.stationName === selectedStation.name &&
        f.destinationName === selectedDestination.name
    );
    if (duplicate) return;
    const newFav: Favorite = {
      id: Date.now().toString(),
      lineName: selectedLine.name,
      lineColor: selectedLine.color,
      stationName: selectedStation.name,
      destinationName: selectedDestination.name,
    };
    persistFavorites([...favorites, newFav]);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  const handleDeleteFavorite = (id: string) => {
    persistFavorites(favorites.filter((f) => f.id !== id));
  };

  const handleApplyFavorite = (fav: Favorite) => {
    const line = SUBWAY_LINES.find((l) => l.name === fav.lineName);
    if (!line) return;
    const station = line.stations.find((s) => s.name === fav.stationName) ?? null;
    const destination = line.stations.find((s) => s.name === fav.destinationName) ?? null;
    setSelectedLine(line);
    setSelectedStation(station);
    setSelectedDestination(destination);
    setSelectedConditions([]);
    setShowResult(false);
  };

  const handleLineSelect = (line: SubwayLine) => {
    setSelectedLine(line);
    setSelectedStation(null);
    setSelectedDestination(null);
    setSelectedConditions([]);
    setShowResult(false);
  };

  const handleStationSelect = (station: Station) => {
    setSelectedStation(station);
    setSelectedDestination(null);
    setSelectedConditions([]);
    setShowResult(false);
  };

  const handleDestinationSelect = (station: Station) => {
    setSelectedDestination(station);
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

  const isFavorited =
    selectedLine && selectedStation && selectedDestination
      ? favorites.some(
          (f) =>
            f.lineName === selectedLine.name &&
            f.stationName === selectedStation.name &&
            f.destinationName === selectedDestination.name
        )
      : false;

  if (showLanding) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] text-center px-4">
        <Image
          src="/logo.png"
          alt="SubwayEasy"
          width={300}
          height={300}
          className="w-48 sm:w-64 md:w-72 h-auto mb-8"
        />
        <h1 className="text-3xl font-black text-gray-800 mb-2">SubwayEasy</h1>
        <p className="text-gray-500 mb-12 text-lg">더 편한 지하철 탑승 경험</p>
        <button
          onClick={() => setShowLanding(false)}
          className="px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-2xl shadow-lg transition-all active:scale-95"
        >
          편한 이동 시작하기
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-1">내 맞춤 지하철 칸 찾기</h1>
        <p className="text-blue-100 text-sm">
          노선과 역, 원하는 조건을 선택하면 가장 적합한 칸을 추천해드려요.
        </p>
      </div>

      {/* 즐겨찾기 목록 */}
      {favorites.length > 0 && (
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span>⭐</span> 즐겨찾기
          </h2>
          <div className="space-y-2">
            {favorites.map((fav) => (
              <div
                key={fav.id}
                className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2"
              >
                <button
                  onClick={() => handleApplyFavorite(fav)}
                  className="flex flex-1 items-center gap-2 text-left min-w-0"
                >
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full text-white shrink-0"
                    style={{ backgroundColor: fav.lineColor }}
                  >
                    {fav.lineName}
                  </span>
                  <span className="text-sm text-gray-700 font-medium truncate">
                    {fav.stationName}
                  </span>
                  <span className="text-gray-400 text-xs shrink-0">→</span>
                  <span className="text-sm text-gray-700 font-medium truncate">
                    {fav.destinationName}
                  </span>
                </button>
                <button
                  onClick={() => handleDeleteFavorite(fav.id)}
                  className="shrink-0 text-gray-300 hover:text-red-400 transition-colors text-xl leading-none"
                  aria-label="즐겨찾기 삭제"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

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
            출발역 선택
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

      {/* Step 3: Destination Selection */}
      {selectedLine && selectedStation && (
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="bg-blue-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">3</span>
            도착역 선택
            <span className="text-gray-400 font-normal text-xs">(즐겨찾기 저장 시 필요)</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {selectedLine.stations
              .filter((s) => s.id !== selectedStation.id)
              .map((station) => (
                <button
                  key={station.id}
                  onClick={() => handleDestinationSelect(station)}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-all
                    ${selectedDestination?.id === station.id
                      ? "text-white border-transparent shadow"
                      : "bg-white border-gray-200 text-gray-700 hover:border-gray-400"
                    }`}
                  style={
                    selectedDestination?.id === station.id
                      ? { backgroundColor: selectedLine.color }
                      : {}
                  }
                >
                  {station.name}
                </button>
              ))}
          </div>

          {/* 즐겨찾기 저장 버튼 */}
          {selectedDestination && (
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={handleAddFavorite}
                disabled={isFavorited}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all
                  ${isFavorited
                    ? "border-yellow-300 bg-yellow-50 text-yellow-600 cursor-default"
                    : "border-yellow-400 bg-white text-yellow-600 hover:bg-yellow-50"
                  }`}
              >
                <span>⭐</span>
                {isFavorited ? "이미 저장된 즐겨찾기" : "즐겨찾기 저장"}
              </button>
              {savedFeedback && (
                <span className="text-sm text-green-600 font-medium">✓ 저장되었습니다</span>
              )}
            </div>
          )}
        </section>
      )}

      {/* Step 4: Condition Selection */}
      {selectedStation && (
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="bg-blue-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">4</span>
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

      {/* Step 5: Result */}
      {showResult && result && selectedLine && selectedStation && (
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="bg-green-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">✓</span>
            추천 결과
          </h2>

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

          <div className="bg-gray-50 rounded-xl p-3 mb-4">
            <p className="text-xs text-gray-500 text-center mb-2">열차 위치 안내</p>
            <SubwayCarDiagram
              totalCars={selectedLine.totalCars}
              recommendedCar={result.car}
              lineColor={selectedLine.color}
              carStatuses={selectedStation.carStatuses}
            />
          </div>

          <div className="space-y-3">
            {result.reasons.map((reason, i) => (
              <div key={i} className="flex items-start gap-2 bg-blue-50 rounded-lg p-3">
                <span className="text-blue-500 mt-0.5">💡</span>
                <p className="text-sm text-gray-700">{reason}</p>
              </div>
            ))}

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
