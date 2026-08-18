"use client";

import { useEffect, useState } from "react";
import { RESULT_GUIDE_IMAGE } from "@/lib/guideImages";

/**
 * ResultLandingV2 전용 "선녀가 사주를 읽는" 전환 화면 — 기존 AnalyzingScreen.tsx
 * 의 브랜드 경험(선녀 이미지 + 오행 5색 점 + "분석 중" 단계별 문구)을 최대한
 * 비슷하게 복원하되, 구현 코드는 새로 작성했다:
 *
 * - 재사용: RESULT_GUIDE_IMAGE(선녀 이미지 자산), 오행 점 5색
 *   (#7FA37A/#D98572/#C9A96E/#B8C4D6/#7C93C4, 기존 ELEMENT_DOTS 그대로),
 *   배경색 bg-dark(기존 AnalyzingScreen과 동일).
 * - 가져오지 않음: 기존의 useTypewriterLines(글자 단위 reveal),
 *   Framer Motion, dot의 repeat:Infinity 펄스. 대신 CSS keyframe +
 *   유한 반복(2회, tailwind.config.js의 resultV2DotPulse)으로 같은
 *   "물결처럼 밝아지는" 느낌만 재현했다.
 * - 이 컴포넌트는 결과 화면 진입 시 통째로 언마운트된다(ResultV2Flow가
 *   단계별로 컴포넌트를 교체) — 애니메이션이 재생 중이었어도 그 순간
 *   사라져 ResultLandingV2 쪽으로는 아무 애니메이션도 넘어가지 않는다.
 * - 전체 체류 시간은 약 2.7초 — 기존 원본(대사+분석 합쳐 6초 이상)보다는
 *   짧지만, "즉석 계산기" 느낌을 없애기에는 충분한 선에서 고정했다.
 */

const PHASE_MS = 900; // 문구 1단계 노출 시간 — 3단계 × 0.9초 ≈ 2.7초
const DOT_COLORS = ["#7FA37A", "#D98572", "#C9A96E", "#B8C4D6", "#7C93C4"];

export default function AnalyzingScreenV2({
  name,
  onDone,
}: {
  name: string;
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), PHASE_MS);
    const t2 = setTimeout(() => setPhase(2), PHASE_MS * 2);
    const done = setTimeout(onDone, PHASE_MS * 3);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(done);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayName = name.trim() || "당신";

  const messages = [
    `${displayName}님의 사주를 분석하고 있습니다.`,
    "오행의 흐름을 살펴보는 중입니다.",
    `${displayName}님의 여덟 글자에서\n가장 먼저 드러나는 흐름을 찾았습니다.`,
  ];

  return (
    <section className="flex min-h-screen flex-col items-center justify-center gap-8 bg-dark px-6 text-center">
      {/* 선녀 이미지 — 마운트 시 1회 fade+scale-in, 그 외엔 정적 */}
      <div className="relative h-24 w-24 shrink-0 animate-resultV2ImageIn opacity-0">
        <div
          className="pointer-events-none absolute -inset-3 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(231,192,126,0.5), transparent 70%)",
          }}
        />
        <div
          className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-accentGoldTo/50 bg-cover"
          style={{ backgroundImage: `url(${RESULT_GUIDE_IMAGE})`, backgroundPosition: "56% 20%" }}
        />
      </div>

      <p
        key={phase}
        className="max-w-[280px] animate-resultV2FadeIn whitespace-pre-line text-[16px] leading-relaxed text-white"
      >
        {messages[phase]}
      </p>

      {/* 오행 5색 점 — "읽는 중" 두 단계(phase 0~1) 동안만 표시. 각 점은
          유한 반복(2회, ~1.8초)만 펄스하고 멈춘다 — repeat:Infinity 아님.
          phase 2(완료 문구)로 넘어가면 DOM에서 사라진다. */}
      {phase < 2 && (
        <div className="flex items-center gap-3">
          {DOT_COLORS.map((color, i) => (
            <span
              key={i}
              className="block h-2.5 w-2.5 rounded-full animate-resultV2DotPulse"
              style={{ backgroundColor: color, animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
