"use client";

import { CarStatus } from "@/data/subwayData";

interface Props {
  totalCars: number;
  recommendedCar?: number;
  lineColor: string;
  carStatuses?: CarStatus[];
  onCarClick?: (car: number) => void;
  showStatusLabel?: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  normal: "bg-white border-gray-300 text-gray-700",
  standing: "bg-orange-50 border-orange-400 text-orange-700",
  quiet: "bg-blue-50 border-blue-400 text-blue-700",
  priority: "bg-pink-50 border-pink-400 text-pink-700",
};

const STATUS_ICONS: Record<string, string> = {
  normal: "",
  standing: "📌",
  quiet: "🔇",
  priority: "🤰",
};

export default function SubwayCarDiagram({
  totalCars,
  recommendedCar,
  lineColor,
  carStatuses,
  onCarClick,
  showStatusLabel = false,
}: Props) {
  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-end gap-2 min-w-max mx-auto py-4 px-2">
        {/* Front indicator */}
        <div className="flex flex-col items-center justify-center mb-1">
          <div
            className="w-6 h-14 rounded-l-full flex items-center justify-center"
            style={{ backgroundColor: lineColor }}
          >
            <span className="text-white text-[10px] font-bold [writing-mode:vertical-rl] rotate-180">앞</span>
          </div>
        </div>

        {Array.from({ length: totalCars }, (_, i) => {
          const carNum = i + 1;
          const isRecommended = carNum === recommendedCar;
          const status = carStatuses?.find((s) => s.car === carNum);
          const statusKey = status?.status ?? "normal";
          const baseStyle = STATUS_STYLES[statusKey];

          return (
            <div key={carNum} className="flex flex-col items-center gap-1">
              {isRecommended && (
                <div
                  className="text-xs font-bold px-2 py-0.5 rounded-full text-white animate-bounce"
                  style={{ backgroundColor: lineColor }}
                >
                  추천!
                </div>
              )}
              {!isRecommended && <div className="h-5" />}

              <button
                onClick={() => onCarClick?.(carNum)}
                className={`subway-car border-2 rounded-lg transition-all duration-200 flex flex-col items-center justify-center gap-1 p-2
                  ${baseStyle}
                  ${isRecommended ? "subway-car-recommended shadow-lg" : "hover:shadow-md"}
                  ${onCarClick ? "cursor-pointer" : "cursor-default"}
                `}
                style={
                  isRecommended
                    ? { borderColor: lineColor, backgroundColor: `${lineColor}15` }
                    : {}
                }
              >
                {STATUS_ICONS[statusKey] && (
                  <span className="text-sm">{STATUS_ICONS[statusKey]}</span>
                )}
                <span className="text-base font-bold">{carNum}</span>
                <span className="text-[10px] text-gray-500">호차</span>
              </button>

              {showStatusLabel && status && (
                <span className="text-[10px] text-center font-medium text-gray-600 max-w-[56px]">
                  {status.label}
                </span>
              )}
            </div>
          );
        })}

        {/* Rear indicator */}
        <div className="flex flex-col items-center justify-center mb-1">
          <div
            className="w-6 h-14 rounded-r-full flex items-center justify-center"
            style={{ backgroundColor: lineColor }}
          >
            <span className="text-white text-[10px] font-bold [writing-mode:vertical-rl] rotate-180">뒤</span>
          </div>
        </div>
      </div>
    </div>
  );
}
