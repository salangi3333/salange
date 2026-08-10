"use client";

import { motion } from "framer-motion";
import { Clock, Check } from "lucide-react";
import { SajuUser } from "@/types";
import { useCountdown } from "@/lib/useCountdown";

export default function MainCTACard({
  user,
  secretsCount,
  totalStories,
  readStories,
  keywords,
  originalPrice,
  discountPrice,
  discountRate,
  onClick,
}: {
  user: SajuUser;
  secretsCount: number;
  totalStories: number;
  readStories: number;
  keywords: string[];
  originalPrice: string;
  discountPrice: string;
  discountRate: string;
  onClick?: () => void;
}) {
  const timeLabel = useCountdown();

  return (
    <motion.section
      id="main-cta"
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5 }}
      className="mx-auto max-w-content scroll-mt-20 bg-sceneBg px-6 py-16"
    >
      <div className="overflow-hidden rounded-card bg-dark text-white">
        <div className="h-[1px] bg-gradient-to-r from-accentGoldFrom via-accentRed to-accentGoldTo" />

        <div className="p-6">
          <p className="text-center text-xs tracking-[0.2em] text-accentGoldFrom">
            — {user.typeLabel}의 마지막 제안 —
          </p>

          <p className="mt-4 text-center text-sm leading-relaxed text-white/85">
            지금까지 읽은 것은 당신의 운명서 중 일부입니다.
          </p>
          <p className="mt-2 text-center text-sm leading-relaxed text-white/70">
            타고난 기질부터 재물·관계·사랑·행동 방향까지 담은
            <br className="hidden sm:block" /> 약 100장 분량의 개인 운명서가 준비되어 있습니다.
          </p>

          <h3 className="mt-5 text-center font-serif-kr text-xl font-bold leading-snug">
            {user.name}님 사주엔{" "}
            <span className="text-accentGoldFrom">{secretsCount}가지 비밀</span>이
            잠겨 있습니다
          </h3>

          <div className="mt-6 grid grid-cols-2 gap-3">
            {keywords.map((keyword) => (
              <div
                key={keyword}
                className="rounded-lg border border-white/15 px-3 py-3 text-center text-sm font-medium text-white/90"
              >
                {keyword}
              </div>
            ))}
          </div>

          <p className="mt-5 text-center text-sm text-white/70">
            이 {secretsCount}가지로 총 {totalStories}개 이야기,{" "}
            {readStories}개 이야기의 일부를 읽으셨습니다
          </p>

          {/* 구매 패널 — 정보 영역과 시각적으로 분리해 "결정의 순간"을 강조 */}
          <div className="mt-7 rounded-card border border-accentGoldTo/30 bg-gradient-to-b from-white/[0.06] to-transparent p-5">
            <div className="flex items-center justify-center gap-2">
              <span className="flex items-center gap-1.5 rounded-pill bg-white/10 px-3 py-1.5 text-xs">
                <Clock size={14} className="text-accentRed" />
                <span className="font-bold tabular-nums">{timeLabel}</span>
                <span className="text-white/60">남음</span>
              </span>
            </div>

            <div className="mt-4 flex flex-col items-center gap-1">
              <div className="flex items-center gap-2">
                <span className="rounded-pill bg-accentRed px-2 py-0.5 text-xs font-bold text-white">
                  {discountRate}
                </span>
                <span className="text-sm text-white/45 line-through">
                  {originalPrice}
                </span>
              </div>
              <span className="text-[32px] font-bold leading-tight text-accentGoldFrom">
                {discountPrice}
              </span>
            </div>

            <button
              onClick={onClick}
              className="mt-5 flex w-full flex-col items-center gap-0.5 rounded-card bg-gradient-to-r from-accentGoldFrom to-accentGoldTo py-4 text-dark shadow-[0_10px_28px_rgba(184,130,60,0.35)] transition-transform active:scale-[0.98]"
            >
              <span className="text-base font-bold">
                지금 전체 사주 풀이 받기
              </span>
              <span className="text-xs font-medium text-dark/70">
                평생 한 번, 지금이 그 순간입니다 →
              </span>
            </button>
          </div>

          <div className="mt-5 flex flex-col items-center gap-1.5 text-xs text-white/60">
            <span className="flex items-center gap-1.5">
              <Check size={13} className="text-accentGoldFrom" />
              결제 즉시 전체 리포트가 발급됩니다
            </span>
            <span className="flex items-center gap-1.5">
              <Check size={13} className="text-accentGoldFrom" />
              환불 및 재상담 규정을 안내받으실 수 있습니다
            </span>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
