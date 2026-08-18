"use client";

import { useEffect, useState } from "react";
import { RESULT_GUIDE_IMAGE } from "@/lib/guideImages";

/**
 * ResultLandingV2 전용 "선녀가 사주를 읽는" 짧은 전환 화면.
 *
 * 기존 AnalyzingScreen.tsx/GuideVisual.tsx의 구현 코드는 가져오지 않았다 —
 * 그 파일들은 typewriter(글자 단위 reveal)와 여러 개의 repeat:Infinity
 * Framer Motion 루프(선녀 이미지 breathing, 후광 pulse, 오행 점 5개 pulse)를
 * 쓰고 있어 성능 원칙과 정면으로 충돌한다. 이 화면은 그 이미지 자산
 * (RESULT_GUIDE_IMAGE)만 재사용하고, 구현은 전부 새로 작성했다:
 * - Framer Motion 등 애니메이션 라이브러리를 import하지 않는다.
 * - 애니메이션은 tailwind.config.js의 정적 keyframe 3개(resultV2FadeIn/
 *   resultV2ImageIn/resultV2DotOn)만 쓴다 — 전부 repeat 없이 1회만 재생되고
 *   끝난다(무한 반복 없음).
 * - 이 컴포넌트는 결과 화면 진입 시 통째로 언마운트된다(ResultV2Flow가
 *   단계별로 컴포넌트를 교체) — 애니메이션이 재생 중이었어도 그 순간 사라져,
 *   ResultLandingV2 쪽으로는 어떤 애니메이션도 넘어가지 않는다.
 * - 전체 체류 시간은 약 2.8초로 고정 — "즉석 계산기" 느낌을 없애기 위한
 *   의도적인 브랜드 연출이지 실제 계산 시간과는 무관하다(buildAppData 자체는
 *   거의 즉시 끝난다).
 */

const PHASE_MS = 1400; // 문구 1단계 노출 시간 — 총 대기 시간은 약 2.8초
const DOT_COUNT = 3;

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
      {/* 선녀 이미지 — 마운트 시 1회 fade+scale-in, 그 외엔 정적 */}
      <div className="relative h-24 w-24 shrink-0 animate-resultV2ImageIn opacity-0">
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

      {/* 점 3개가 순서대로 밝아지는 로딩 표시 — 각자 딱 한 번만 재생되고
          "밝은 상태(opacity:1)"로 고정된다. phase 0(읽는 중) 동안에만 보여주고,
          phase 1(완료 문구)로 넘어가면 사라진다 — 계속 도는 로딩 표시가
          아니라 "다 읽었다"는 신호로 끝을 명확히 한다. */}
      {phase === 0 && (
        <div className="flex items-center gap-2">
          {Array.from({ length: DOT_COUNT }).map((_, i) => (
            <span
              key={i}
              className="h-2 w-2 rounded-full bg-sceneGold opacity-0 animate-resultV2DotOn"
              style={{ animationDelay: `${300 + i * 220}ms` }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
