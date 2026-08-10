"use client";

import { Lock } from "lucide-react";
import { YearFortuneItem } from "@/lib/aiLifeReport";

/**
 * 연도 흐름 미리보기 — 2026·2027은 완전 공개, 2028은 윤곽만 보이는
 * 잠금 미리보기, 2029년 이후는 "기록이 이어진다"는 느낌만 준다.
 * 모든 문구는 이미 계산된 buildTenYearFortune() 결과(tenYear)를 그대로
 * 사용할 뿐, 새로운 운세 문구를 만들어내지 않는다.
 */
export default function YearFlowCards({ tenYear }: { tenYear: YearFortuneItem[] }) {
  const [y1, y2, y3] = tenYear;
  if (!y1 || !y2 || !y3) return null;

  return (
    <div className="flex flex-col gap-4">
      {[y1, y2].map((y) => (
        <div
          key={y.year}
          className="rounded-card border border-sceneGold/30 bg-sceneCard px-6 py-5 shadow-[0_10px_28px_rgba(0,0,0,0.35)]"
        >
          <span className="text-[13px] font-bold text-sceneGold">{y.year}년</span>
          <p className="mt-1 text-[18px] font-extrabold text-sceneCardText">{y.keyword}</p>
          <p className="mt-2 text-[14.5px] leading-[1.85] text-sceneCardText/90" style={{ wordBreak: "keep-all" }}>
            {y.overview}
          </p>
        </div>
      ))}

      {/* 2028년 — 잠금 미리보기: 연도는 선명, 내용은 블러 처리 */}
      <div className="relative overflow-hidden rounded-card border border-sceneGold/30 bg-sceneCard px-6 py-5 opacity-[0.76] shadow-[0_10px_28px_rgba(0,0,0,0.35)]">
        <div className="flex items-start justify-between">
          <span className="text-[13px] font-bold text-sceneGold">{y3.year}년</span>
          <Lock size={15} className="text-sceneGold/80" />
        </div>
        <p className="mt-1 select-none text-[18px] font-extrabold text-sceneCardText blur-[6px]">
          {y3.keyword}
        </p>
        <p
          className="mt-2 select-none text-[14.5px] leading-[1.85] text-sceneCardText/90 blur-[6px]"
          style={{ wordBreak: "keep-all" }}
        >
          {y3.overview}
        </p>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-sceneGold/25 to-transparent" />
      </div>

      {/* 2029년 이후 — 나열하지 않고, 기록이 이어진다는 느낌만 */}
      <div className="flex items-center justify-center gap-2 pt-1">
        <span className="h-1 w-1 rounded-full bg-sceneGold/70" />
        <span className="h-1 w-1 rounded-full bg-sceneGold/45" />
        <span className="h-1 w-1 rounded-full bg-sceneGold/25" />
        <span className="ml-1 text-xs text-sceneTextSub">그 뒤로도 기록이 이어집니다</span>
      </div>
    </div>
  );
}
