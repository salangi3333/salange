"use client";

import { useEffect, useState } from "react";
import { RESULT_GUIDE_IMAGE } from "@/lib/guideImages";

/**
 * ResultLandingV2 전용 "선녀가 사주를 읽는" 짧은 전환 화면.
 *
 * 기존 AnalyzingScreen.tsx/GuideVisual.tsx의 구현 코드는 가져오지 않았다 —
 * 그 파일들은 typewriter(글자 단위 reveal)와 여러 개의 repeat:Infinity
 * Framer Motion 루프(선녀 이미지 breathing, 후광 pulse, 오행 점 5개 pulse)를
 * 쓰고 있어 이번 성능 원칙과 정면으로 충돌한다. 이 화면은 그 이미지 자산
 * (RESULT_GUIDE_IMAGE)만 재사용하고, 구현은 전부 새로 작성했다:
 * - Framer Motion 등 애니메이션 라이브러리를 import하지 않는다.
 * - 애니메이션은 tailwind.config.js의 정적 1회성 keyframe(resultV2FadeIn,
 *   repeat 없음) 하나만 사용한다.
 * - 문구 전환은 고정된 짧은 setTimeout 2단계뿐 — 실제 계산(buildAppData)은
 *   거의 즉시 끝나므로, 이 화면 자체가 인위적으로 오래 기다리게 하지 않는다.
 */

const PHASE_MS = 700; // 문구 1단계 노출 시간 — 총 대기 시간은 약 1.4초

export default function AnalyzingScreenV2({
  name,
  onDone,
}: {
  name: string;
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<0 | 1>(0);

  useEffect(() => {
    const toPhase1 = setTimeout(() => setPhase(1), PHASE_MS);
    const done = setTimeout(onDone, PHASE_MS * 2);
    return () => {
      clearTimeout(toPhase1);
      clearTimeout(done);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayName = name.trim() || "당신";

  return (
    <section className="flex min-h-screen flex-col items-center justify-center gap-6 bg-sceneBg px-6 text-center">
      {/* 선녀 이미지 — 정적, 후광도 고정 opacity의 정적 배경일 뿐 애니메이션 없음 */}
      <div className="relative h-24 w-24 shrink-0">
        <div
          className="pointer-events-none absolute -inset-3 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(231,192,126,0.4), transparent 70%)",
          }}
        />
        <div
          className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-accentGoldTo/50 bg-cover"
          style={{ backgroundImage: `url(${RESULT_GUIDE_IMAGE})`, backgroundPosition: "56% 20%" }}
        />
      </div>

      <p
        key={phase}
        className="max-w-[280px] animate-resultV2FadeIn whitespace-pre-line font-serif-kr text-[16px] leading-relaxed text-sceneText"
      >
        {phase === 0
          ? `${displayName}님의 사주를 읽고 있습니다.`
          : `${displayName}님의 여덟 글자에서\n가장 먼저 드러나는 흐름을 찾았습니다.`}
      </p>
    </section>
  );
}
