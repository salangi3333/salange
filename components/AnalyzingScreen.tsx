"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import GuideVisual from "./GuideVisual";
import { useTypewriterLines } from "./useTypewriterLines";

// 1단계 — 선녀가 등장하며 건네는 짧은 대사. 영화 자막처럼 한 줄씩 끊어 보여준다.
const DIALOGUE_LINES = ["잠시만요...", "당신의 사주를 하나씩 살펴보겠습니다."];

// 2단계 — 오행 분석 애니메이션과 함께 순서대로 바뀌는 문장.
const ANALYSIS_STEPS = [
  "팔자를 살펴보는 중...",
  "오행의 흐름을 정리하는 중...",
  "당신의 운명을 기록하는 중...",
];
const STEP_INTERVAL_MS = 950;

// 오행 다섯 기운을 상징하는 점 — ElementFlowScene과 동일한 색 계열을 재사용해
// 결과 페이지와 시각적 언어를 맞춘다. 계산에는 관여하지 않는 순수 장식.
const ELEMENT_DOTS = ["#7FA37A", "#D98572", "#C9A96E", "#B8C4D6", "#7C93C4"];

export default function AnalyzingScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"dialogue" | "analysis">("dialogue");
  const [stepIndex, setStepIndex] = useState(0);

  const { completedLines, currentText, isDone: dialogueDone } = useTypewriterLines(
    DIALOGUE_LINES,
    45,
    [650, 550]
  );

  // 대사가 끝난 뒤 0.8~1초 정적을 두고 오행 분석 단계로 전환한다.
  useEffect(() => {
    if (!dialogueDone) return;
    const timer = setTimeout(() => setPhase("analysis"), 900);
    return () => clearTimeout(timer);
  }, [dialogueDone]);

  // 오행 분석 단계 — 문장을 순서대로 바꾸고, 마지막 문장까지 보여준 뒤 결과로 이동한다.
  useEffect(() => {
    if (phase !== "analysis") return;
    const stepTimer = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, ANALYSIS_STEPS.length - 1));
    }, STEP_INTERVAL_MS);
    const doneTimer = setTimeout(
      onDone,
      STEP_INTERVAL_MS * ANALYSIS_STEPS.length + 400
    );
    return () => {
      clearInterval(stepTimer);
      clearTimeout(doneTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  return (
    <section className="flex min-h-screen flex-col items-center justify-center gap-8 bg-dark px-6 text-center">
      {/* 선녀 원형 프로필 — AnalyzingScreen 진입 즉시(지연 없이) 가장 먼저 렌더링된다 */}
      <motion.div
        initial={{ opacity: 0, y: 6, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        <GuideVisual size="small" />
      </motion.div>

      {/* 메시지 영역 — 두 단계 모두 항상 DOM에 존재하고 opacity만 전환되므로
          레이아웃 높이가 바뀌지 않는다(화면 흔들림 방지). */}
      <div className="relative min-h-[168px] w-full max-w-content">
        {/* 1단계: 대사 */}
        <motion.div
          className="absolute inset-x-0 top-0 flex flex-col gap-2"
          animate={{ opacity: phase === "dialogue" ? 1 : 0 }}
          transition={{ duration: 0.5 }}
        >
          {completedLines.map((line, i) => (
            <p key={i} className="whitespace-pre-line text-[16px] leading-relaxed text-white">
              {line}
            </p>
          ))}
          {!dialogueDone && (
            <p className="whitespace-pre-line text-[16px] leading-relaxed text-white">
              {currentText}
              <span className="animate-pulse">▍</span>
            </p>
          )}
        </motion.div>

        {/* 2단계: 오행 분석 애니메이션 + 순환 문장 */}
        <motion.div
          className="absolute inset-x-0 top-0 flex flex-col items-center gap-5"
          animate={{ opacity: phase === "analysis" ? 1 : 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3">
            {ELEMENT_DOTS.map((color, i) => (
              <motion.span
                key={i}
                className="block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: color }}
                animate={
                  phase === "analysis"
                    ? { opacity: [0.3, 1, 0.3], scale: [0.85, 1, 0.85] }
                    : { opacity: 0.3, scale: 0.85 }
                }
                transition={{
                  duration: 1.6,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.18,
                }}
              />
            ))}
          </div>

          <motion.p
            key={stepIndex}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-[15px] text-white/85"
          >
            {ANALYSIS_STEPS[stepIndex]}
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
