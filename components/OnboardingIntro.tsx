"use client";

import { motion } from "framer-motion";
import GuideVisual from "./GuideVisual";
import { useTypewriterLines } from "./useTypewriterLines";

const OPENING_LINES = ["당신의 이야기를", "시작해볼까요?"];
const OPENING_LINE_GAPS = [500];

export default function OnboardingIntro({ onEnter }: { onEnter: () => void }) {
  const { completedLines, currentText, isDone } = useTypewriterLines(
    OPENING_LINES,
    45,
    OPENING_LINE_GAPS
  );

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-end overflow-hidden bg-dark px-6 pb-16 text-center">
      <GuideVisual size="large" />

      <div className="absolute inset-0 bg-gradient-to-t from-dark via-dark/50 to-transparent" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.6 }}
        className="relative flex w-full max-w-content flex-col items-center gap-6"
      >
        <p className="text-sm tracking-[0.3em] text-accentGoldFrom">
          — 命理四柱 —
        </p>

        <div className="flex w-full min-h-[100px] flex-col gap-2">
          {completedLines.map((line, i) => (
            <p
              key={i}
              className="whitespace-pre-line font-serif-kr text-xl font-bold leading-relaxed text-white sm:text-2xl"
            >
              {line}
            </p>
          ))}
          {!isDone && (
            <p className="whitespace-pre-line font-serif-kr text-xl font-bold leading-relaxed text-white sm:text-2xl">
              {currentText}
              <span className="animate-pulse">▍</span>
            </p>
          )}
        </div>

        <motion.button
          onClick={onEnter}
          animate={{ opacity: isDone ? 1 : 0, y: isDone ? 0 : 10 }}
          transition={{ duration: 0.6 }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          className={`mt-4 rounded-pill bg-gradient-to-r from-accentGoldFrom to-accentGoldTo px-8 py-4 text-base font-bold text-dark shadow-[0_0_26px_rgba(231,192,126,0.4)] ${
            isDone ? "" : "pointer-events-none"
          }`}
        >
          내 이야기 시작하기 →
        </motion.button>
      </motion.div>
    </section>
  );
}
