"use client";

import { motion } from "framer-motion";
import { PillarCell, SajuUser } from "@/types";

const ELEMENT_LABEL: Record<PillarCell["element"], string> = {
  wood: "목(木)",
  fire: "화(火)",
  earth: "토(土)",
  metal: "금(金)",
  water: "수(水)",
};

const columns: { key: "hour" | "day" | "month" | "year"; label: string }[] = [
  { key: "hour", label: "시주" },
  { key: "day", label: "일주" },
  { key: "month", label: "월주" },
  { key: "year", label: "년주" },
];

/**
 * 결과 첫 장면에 표시되는 사주 원국표. calculateSaju/AppData가 이미
 * 계산해 둔 user.pillars/user.sinsal 값을 그대로 읽어 표시할 뿐,
 * 새로운 계산은 하지 않는다.
 */
export default function PillarScene({
  name,
  pillars,
  sinsal,
}: {
  name: string;
  pillars: SajuUser["pillars"];
  sinsal: string[];
}) {
  return (
    <section className="relative flex flex-col overflow-hidden bg-sceneBg px-6 py-16 sm:min-h-[85svh] sm:justify-center">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(200,155,60,0.5) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative mx-auto w-full max-w-content"
      >
        <p className="text-center text-sm tracking-[0.2em] text-sceneGold/80">
          命式 · 사주팔자
        </p>
        <h2 className="mt-2 text-center font-serif-kr text-2xl font-bold text-sceneText">
          {name}님의 타고난 여덟 글자
        </h2>

        <div className="mt-8 grid grid-cols-4 overflow-hidden rounded-card border border-sceneGold/40 bg-sceneCard shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
          {columns.map(({ key, label }) => {
            const cell = pillars[key];
            const isDay = key === "day";
            if (!cell) {
              return (
                <div
                  key={key}
                  className="flex flex-col items-center gap-1 border-r border-sceneGold/15 px-1 py-4 last:border-r-0"
                >
                  <span className="text-[11px] text-sceneCardText/50">{label}</span>
                  <span className="font-serif-kr text-[26px] font-bold text-sceneCardText/40">
                    ?
                  </span>
                  <span className="text-[11px] text-sceneCardText/50">미상</span>
                </div>
              );
            }
            return (
              <div
                key={key}
                className={`flex flex-col items-center gap-1 border-r border-sceneGold/15 px-1 py-4 last:border-r-0 ${
                  isDay ? "border-b-2 border-sceneGold bg-sceneGold/10" : ""
                }`}
              >
                {isDay && (
                  <span className="text-[10px] font-bold text-sceneGold">★ 일간</span>
                )}
                <span className="text-[11px] text-sceneCardText/60">{label}</span>
                <span className="font-serif-kr text-[26px] font-bold text-sceneCardText">
                  {cell.hanja}
                </span>
                <span className="text-[11px] text-sceneCardText/60">{cell.hangul}</span>
                <span className="text-[10px] font-medium text-sceneGold/90">
                  {ELEMENT_LABEL[cell.element]}
                </span>
                <span className="text-[10px] text-sceneCardText/60">{cell.sipseong}</span>
              </div>
            );
          })}

          {columns.map(({ key }) => {
            const branch = pillars.branches[key];
            if (!branch) {
              return (
                <div
                  key={`branch-${key}`}
                  className="flex flex-col items-center gap-1 border-r border-t border-sceneGold/15 px-1 py-4 last:border-r-0"
                >
                  <span className="font-serif-kr text-xl font-bold text-sceneCardText/40">
                    ?
                  </span>
                  <span className="text-[11px] text-sceneCardText/50">미상</span>
                </div>
              );
            }
            return (
              <div
                key={`branch-${key}`}
                className="flex flex-col items-center gap-1 border-r border-t border-sceneGold/15 px-1 py-4 last:border-r-0"
              >
                <span className="font-serif-kr text-xl font-bold text-sceneCardText">
                  {branch.hanja}
                </span>
                <span className="text-[11px] text-sceneCardText/60">{branch.hangul}</span>
                <span className="text-[10px] font-medium text-sceneGold/90">
                  {ELEMENT_LABEL[branch.element]}
                </span>
                <span className="text-[10px] text-sceneCardText/60">{branch.sipseong}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {sinsal.map((tag) => (
            <span
              key={tag}
              className="rounded-pill border border-sceneGold/40 bg-sceneCard px-3 py-1.5 text-xs font-medium text-sceneCardText shadow-sm"
            >
              {tag}
            </span>
          ))}
        </div>

        <p className="mt-10 text-center text-[16px] leading-relaxed text-white/90">
          이 여덟 글자가
          <br />
          당신의 타고난 기질과
          <br />
          삶의 흐름을 만들고 있습니다.
        </p>
        <p className="mt-4 text-center text-[15px] italic text-sceneGold">
          이제 하나씩 읽어볼게요.
        </p>
      </motion.div>
    </section>
  );
}
