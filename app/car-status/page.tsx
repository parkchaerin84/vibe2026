"use client";

import { useState } from "react";
import { SUBWAY_LINES, type SubwayLine, type Station, type CarStatus } from "@/data/subwayData";
import SubwayCarDiagram from "@/components/SubwayCarDiagram";

type StatusType = CarStatus["status"];

const STATUS_OPTIONS: { value: StatusType; label: string; icon: string; color: string }[] = [
  { value: "normal", label: "일반", icon: "🚃", color: "bg-gray-100 text-gray-700 border-gray-300" },
  { value: "standing", label: "입석 전용", icon: "📌", color: "bg-orange-100 text-orange-700 border-orange-400" },
  { value: "quiet", label: "조용한 칸", icon: "🔇", color: "bg-blue-100 text-blue-700 border-blue-400" },
  { value: "priority", label: "임산부 우선", icon: "🤰", color: "bg-pink-100 text-pink-700 border-pink-400" },
];

export default function CarStatusPage() {
  const [selectedLine, setSelectedLine] = useState<SubwayLine | null>(null);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [carStatuses, setCarStatuses] = useState<CarStatus[]>([]);
  const [editingCar, setEditingCar] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  const handleLineSelect = (line: SubwayLine) => {
    setSelectedLine(line);
    setSelectedStation(null);
    setCarStatuses([]);
    setEditingCar(null);
    setSaved(false);
  };

  const handleStationSelect = (station: Station) => {
    setSelectedStation(station);
    setCarStatuses(station.carStatuses.map((s) => ({ ...s })));
    setEditingCar(null);
    setSaved(false);
  };

  const handleCarClick = (car: number) => {
    setEditingCar(editingCar === car ? null : car);
    setSaved(false);
  };

  const handleStatusChange = (car: number, status: StatusType) => {
    const labelMap: Record<StatusType, string> = {
      normal: "일반",
      standing: "입석 전용",
      quiet: "조용한 칸",
      priority: "임산부 우선",
    };
    setCarStatuses((prev) =>
      prev.map((s) =>
        s.car === car ? { ...s, status, label: labelMap[status] } : s
      )
    );
    setEditingCar(null);
    setSaved(false);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const editingStatus = carStatuses.find((s) => s.car === editingCar);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-orange-500 to-orange-700 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-1">칸 운영 상태 관리</h1>
        <p className="text-orange-100 text-sm">
          혼잡도에 따라 각 칸의 용도를 변경할 수 있습니다. (코레일 직원 전용)
        </p>
      </div>

      {/* Role badge */}
      <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
        <span className="text-amber-600 text-lg">🛡️</span>
        <div>
          <p className="text-sm font-semibold text-amber-800">운영자 모드</p>
          <p className="text-xs text-amber-600">칸을 클릭하면 상태를 변경할 수 있습니다.</p>
        </div>
      </div>

      {/* Line selection */}
      <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h2 className="font-bold text-gray-800 mb-4">노선 선택</h2>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {SUBWAY_LINES.map((line) => (
            <button
              key={line.id}
              onClick={() => handleLineSelect(line)}
              className={`rounded-xl py-3 font-bold text-sm transition-all border-2
                ${selectedLine?.id === line.id ? "scale-105 shadow-md border-transparent" : "bg-white border-gray-200 hover:border-gray-300"}`}
              style={selectedLine?.id === line.id ? { backgroundColor: line.color, color: line.textColor } : { color: line.color }}
            >
              {line.name}
            </button>
          ))}
        </div>
      </section>

      {/* Station selection */}
      {selectedLine && (
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-800 mb-4">역 선택</h2>
          <div className="flex flex-wrap gap-2">
            {selectedLine.stations.map((station) => (
              <button
                key={station.id}
                onClick={() => handleStationSelect(station)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-all
                  ${selectedStation?.id === station.id ? "text-white border-transparent shadow" : "bg-white border-gray-200 text-gray-700 hover:border-gray-400"}`}
                style={selectedStation?.id === station.id ? { backgroundColor: selectedLine.color } : {}}
              >
                {station.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Car status editor */}
      {selectedStation && selectedLine && carStatuses.length > 0 && (
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-gray-800">
              {selectedStation.name} — 칸별 운행 상태
            </h2>
            {saved && (
              <span className="text-green-600 text-sm font-medium flex items-center gap-1">
                ✓ 저장됨
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mb-4">칸을 클릭해 상태를 변경하세요.</p>

          <SubwayCarDiagram
            totalCars={selectedLine.totalCars}
            lineColor={selectedLine.color}
            carStatuses={carStatuses}
            onCarClick={handleCarClick}
            showStatusLabel
          />

          {/* Status change panel */}
          {editingCar !== null && editingStatus && (
            <div className="mt-4 bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-sm font-semibold text-gray-700 mb-3">
                {editingCar}번 칸 상태 변경 (현재: {editingStatus.label})
              </p>
              <div className="grid grid-cols-2 gap-2">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleStatusChange(editingCar, opt.value)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all
                      ${editingStatus.status === opt.value ? "ring-2 ring-offset-1 ring-blue-500" : ""}
                      ${opt.color}`}
                  >
                    <span>{opt.icon}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Status legend */}
          <div className="mt-4 flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <span key={opt.value} className={`flex items-center gap-1 px-2 py-1 rounded-full border text-xs ${opt.color}`}>
                {opt.icon} {opt.label}
              </span>
            ))}
          </div>

          {/* Current status summary */}
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">현재 설정 요약</p>
            {carStatuses
              .filter((s) => s.status !== "normal")
              .map((s) => {
                const opt = STATUS_OPTIONS.find((o) => o.value === s.status);
                return (
                  <div key={s.car} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${opt?.color}`}>
                    <span>{opt?.icon}</span>
                    <span className="font-medium">{s.car}번 칸</span>
                    <span>→ {s.label}</span>
                  </div>
                );
              })}
            {carStatuses.every((s) => s.status === "normal") && (
              <p className="text-sm text-gray-400">모든 칸이 일반 상태입니다.</p>
            )}
          </div>

          <button
            onClick={handleSave}
            className="mt-4 w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-all shadow-md"
          >
            변경 사항 저장
          </button>
        </section>
      )}
    </div>
  );
}
