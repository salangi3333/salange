"use client";

import { useEffect, useState } from "react";
import { YearFortuneItem } from "@/lib/aiLifeReport";

// 임시 A/B 진단 전용 — URL에 ?scrollAB=timeline-pan-y가 있을 때만 아래
// overflow-x-auto 컨테이너에 touch-action:pan-y를 추가한다. 플래그가 없으면
// (일반 사용자 화면) 이 훅은 항상 false를 반환해 기존 동작과 완전히 동일하다.
// MobileScrollProbe.tsx의 게이팅 패턴을 이 파일 안에서만 독립적으로
// 재현한 것으로, 공용 코드나 다른 파일은 건드리지 않는다.
// 목적: 세로 스와이프가 이 가로 스크롤 칩 목록 위에서 시작될 때 브라우저의
// 제스처 방향 판정에 흔들려 네이티브 스크롤이 순간 멎는지 격리 검증.
// 확인 끝나면 반드시 제거할 것 — 프로덕션에 영구히 남겨둘 코드가 아니다.
function useTimelinePanYFlag(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      setEnabled(params.get("scrollAB") === "timeline-pan-y");
    } catch {
      setEnabled(false);
    }
  }, []);
  return enabled;
}

export default function TimelineScene({
  tenYear,
  unlockedCount = 2,
}: {
  tenYear: YearFortuneItem[];
  unlockedCount?: number;
}) {
  const panYEnabled = useTimelinePanYFlag();

  return (
    <div className="relative py-6">
      <div className="absolute left-0 right-0 top-[38px] h-px bg-gradient-to-r from-sceneGold/60 via-sceneSilver/25 to-transparent" />
      <div
        className="relative flex justify-between gap-1 overflow-x-auto"
        style={{
          overscrollBehaviorX: "contain",
          ...(panYEnabled ? { touchAction: "pan-y" } : {}),
        }}
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
