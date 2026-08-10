"use client";

import { Clock } from "lucide-react";
import { useCountdown } from "@/lib/useCountdown";

export default function StickyBottomBar({
  onClick,
  originalPrice,
  discountPrice,
  discountRate,
}: {
  onClick?: () => void;
  originalPrice: string;
  discountPrice: string;
  discountRate: string;
}) {
  const timeLabel = useCountdown();

  return (
    // 2차 A/B 테스트: backdrop-blur 제거. bg-dark/95가 이미 거의 불투명해
    // 시각적 차이는 거의 없지만, opacity:0로 숨겨져 있는 동안에도 브라우저가
    // 뒤 배경을 계속 다시 계산하던 비용(스크롤 중 반복적으로 관찰된 멈춤의
    // 원인 후보)을 제거한다.
    <div
      data-probe-scene="sticky-bar"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-accentGoldTo/30 bg-dark/95 shadow-[0_-8px_24px_rgba(0,0,0,0.25)]"
    >
      <div className="mx-auto flex max-w-content items-center justify-between gap-2.5 px-4 py-2">
        <div className="flex shrink-0 items-center gap-1 text-white">
          <Clock size={13} className="text-accentRed shrink-0" />
          <span className="text-[13px] font-bold tabular-nums">{timeLabel}</span>
        </div>
        <button
          onClick={onClick}
          className="flex flex-1 items-center justify-center gap-2 rounded-pill border border-accentGoldTo/50 bg-gradient-to-r from-accentGoldFrom to-accentGoldTo px-4 py-1.5 text-dark"
        >
          <span className="flex items-baseline gap-1.5 leading-none">
            <span className="text-[11px] text-dark/60 line-through">{originalPrice}</span>
            <span className="text-[15px] font-bold">{discountPrice}</span>
          </span>
          <span className="rounded-pill bg-accentRed px-1.5 py-0.5 text-[10px] font-bold text-white">
            {discountRate}
          </span>
          <span className="text-[13px] font-bold whitespace-nowrap">지금 받기 →</span>
        </button>
      </div>
    </div>
  );
}
