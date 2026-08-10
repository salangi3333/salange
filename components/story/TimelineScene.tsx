"use client";

import { YearFortuneItem } from "@/lib/aiLifeReport";

export default function TimelineScene({
  tenYear,
  unlockedCount = 2,
}: {
  tenYear: YearFortuneItem[];
  unlockedCount?: number;
}) {
  return (
    <div className="relative py-6">
      <div className="absolute left-0 right-0 top-[38px] h-px bg-gradient-to-r from-sceneGold/60 via-sceneSilver/25 to-transparent" />
      <div
        className="relative flex justify-between gap-1 overflow-x-auto"
        style={{ overscrollBehaviorX: "contain" }}
      >
        {tenYear.map((y, i) => {
          const unlocked = i < unlockedCount;
          return (
            <div key={y.year} className="flex flex-col items-center gap-2 px-1">
              <div
                className={`h-2.5 w-2.5 rounded-full ${
                  unlocked
                    ? "bg-sceneGold shadow-[0_0_10px_rgba(200,155,60,0.8)]"
                    : "bg-sceneSilver/25"
                }`}
              />
              <span className={`text-[10px] ${unlocked ? "text-sceneText" : "text-sceneTextSub/50"}`}>
                {y.year}
              </span>
              <span
                className={`text-[10px] font-bold ${
                  unlocked ? "text-sceneGold" : "text-sceneTextSub/40"
                }`}
              >
                {unlocked ? y.keyword : "?"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
