"use client";

import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { CompatibilityResult } from "@/lib/compatibility";

function scrollToCTA() {
  document.getElementById("main-cta")?.scrollIntoView({ behavior: "smooth" });
}

export default function CompatibilitySection({
  userName,
  partnerName,
  result,
}: {
  userName: string;
  partnerName: string;
  result: CompatibilityResult;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="mx-auto max-w-content px-6 py-10"
    >
      <div className="rounded-card bg-white p-6 shadow-sm">
        <span className="vertical-label text-[11px] text-textSub">— 宮合 —</span>
        <h2 className="mt-3 font-serif-kr text-2xl font-bold text-accentRed">
          {userName}님 × {partnerName}님 궁합
        </h2>

        <div className="mt-5 flex items-center justify-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-dark px-1 text-center text-[11px] font-bold leading-tight text-accentGoldFrom">
            {userName}
          </div>
          <span className="text-2xl text-accentRed">×</span>
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-dark px-1 text-center text-[11px] font-bold leading-tight text-accentGoldFrom">
            {partnerName}
          </div>
        </div>

        <p className="mt-5 text-center text-lg font-bold text-textMain">
          {result.headline}
        </p>

        <div className="mt-6 flex flex-col gap-5">
          {result.sections.map((s) => (
            <div key={s.heading}>
              <h4 className="text-sm font-bold text-accentRed">{s.heading}</h4>
              <p className="mt-1.5 text-[16px] leading-relaxed text-textMain">
                {s.text}
              </p>
            </div>
          ))}
        </div>

        <button
          onClick={scrollToCTA}
          className="relative mt-5 block w-full overflow-hidden rounded-card bg-bg p-5 text-left"
        >
          <p className="text-[15px] leading-relaxed text-textMain blur-[4px] select-none">
            {result.lockedTeaser}
          </p>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-bg/60">
            <Lock size={22} className="text-textSub" />
            <span className="text-xs font-medium text-textSub">
              전체 궁합 분석에서 확인 가능
            </span>
          </div>
        </button>

        <div className="mt-6 flex items-center justify-center gap-2 border-t border-bg pt-5">
          <span className="text-sm text-textSub">참고 궁합 점수</span>
          <span className="text-xl font-bold text-accentRed">{result.score}</span>
        </div>
      </div>
    </motion.section>
  );
}
