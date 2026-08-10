"use client";

import { motion } from "framer-motion";
import { PillarCell, SajuUser } from "@/types";

const elementLabel: Record<PillarCell["element"], string> = {
  wood: "목(木)",
  fire: "화(火)",
  earth: "토(土)",
  metal: "금(金)",
  water: "수(水)",
};

const elementText: Record<PillarCell["element"], string> = {
  wood: "text-wood",
  fire: "text-fire",
  earth: "text-earth",
  metal: "text-metal",
  water: "text-water",
};

const columns: { key: "hour" | "day" | "month" | "year"; label: string }[] = [
  { key: "hour", label: "시주" },
  { key: "day", label: "일주" },
  { key: "month", label: "월주" },
  { key: "year", label: "년주" },
];

export default function PillarTable({
  pillars,
  sinsal,
}: {
  pillars: SajuUser["pillars"];
  sinsal: string[];
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="mx-auto max-w-content px-6 py-16"
    >
      <p className="mb-4 text-center text-sm tracking-[0.2em] text-textSub">
        命式 · 사주팔자
      </p>

      <div className="grid grid-cols-4 overflow-hidden rounded-card bg-white shadow-sm">
        {columns.map(({ key, label }) => {
          const cell = pillars[key];
          const isDay = key === "day";
          if (!cell) {
            return (
              <div
                key={key}
                className="flex flex-col items-center gap-1 border-r border-bg px-1 py-4 last:border-r-0"
              >
                <span className="text-xs text-textSub">{label}</span>
                <span className="font-serif-kr text-[28px] font-bold text-textSub">
                  ?
                </span>
                <span className="text-xs text-textSub">미상</span>
              </div>
            );
          }
          return (
            <div
              key={key}
              className={`flex flex-col items-center gap-1 border-r border-bg px-1 py-4 last:border-r-0 ${
                isDay ? "border-b-2 border-accentRed bg-accentRed/5" : ""
              }`}
            >
              {isDay && (
                <span className="text-[10px] font-bold text-accentRed">
                  ★ 일간
                </span>
              )}
              <span className="text-xs text-textSub">{label}</span>
              <span className="font-serif-kr text-[28px] font-bold text-textMain">
                {cell.hanja}
              </span>
              <span className="text-xs text-textSub">{cell.hangul}</span>
              <span className={`text-[11px] font-medium ${elementText[cell.element]}`}>
                {elementLabel[cell.element]}
              </span>
              <span className="text-[11px] text-textSub">{cell.sipseong}</span>
            </div>
          );
        })}

        {columns.map(({ key }) => {
          const branch = pillars.branches[key];
          if (!branch) {
            return (
              <div
                key={`branch-${key}`}
                className="flex flex-col items-center gap-1 border-r border-t border-bg px-1 py-4 last:border-r-0"
              >
                <span className="font-serif-kr text-2xl font-bold text-textSub">?</span>
                <span className="text-xs text-textSub">미상</span>
              </div>
            );
          }
          return (
            <div
              key={`branch-${key}`}
              className="flex flex-col items-center gap-1 border-r border-t border-bg px-1 py-4 last:border-r-0"
            >
              <span className="font-serif-kr text-2xl font-bold text-textMain">
                {branch.hanja}
              </span>
              <span className="text-xs text-textSub">{branch.hangul}</span>
              <span className={`text-[11px] font-medium ${elementText[branch.element]}`}>
                {elementLabel[branch.element]}
              </span>
              <span className="text-[11px] text-textSub">{branch.sipseong}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {sinsal.map((tag) => (
          <span
            key={tag}
            className="rounded-pill bg-white px-3 py-1.5 text-xs font-medium text-textMain shadow-sm"
          >
            {tag}
          </span>
        ))}
      </div>
    </motion.section>
  );
}
