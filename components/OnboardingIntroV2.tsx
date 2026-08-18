"use client";

import { HERO_GUIDE_IMAGE } from "@/lib/guideImages";

/**
 * ResultLandingV2 전용 첫 진입(브랜드 오프닝) 화면 — 기존 OnboardingIntro.tsx
 * + GuideVisual.tsx(size="large")의 레이아웃·문구·이미지를 최대한 그대로
 * 복원하되, 구현은 새로 작성했다:
 *
 * - 재사용: HERO_GUIDE_IMAGE(선녀 배경 이미지, /intro-character.webp),
 *   문구("— 命理四柱 —" / "당신의 이야기를" / "시작해볼까요?" /
 *   "내 이야기 시작하기 →" 전부 원본 그대로), 레이아웃(전면 배경 이미지 +
 *   하단 그라데이션 + 화면 하단 정렬 텍스트 + 골드 그라데이션 버튼),
 *   배경색 bg-dark(원본과 동일).
 * - 가져오지 않음: useTypewriterLines(글자 단위 reveal), Framer Motion의
 *   repeat:Infinity 루프 2종(후광 글로우 opacity pulse 6s, 이미지 scale
 *   breathing 9s). 전부 CSS 1회성 fade-in(resultV2FadeIn, 이미
 *   AnalyzingScreenV2에서 쓰는 것과 동일한 keyframe)으로 대체했다 — 화면
 *   전체에 남아서 계속 도는 애니메이션이 없다.
 * - 이 화면은 "입력 폼으로" 넘어가는 순간 ResultV2Flow가 통째로 다른
 *   컴포넌트로 교체한다 — 재생 중이던 애니메이션이 있어도 그 순간 사라진다.
 */
export default function OnboardingIntroV2({ onEnter }: { onEnter: () => void }) {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-end overflow-hidden bg-dark px-6 pb-16 text-center">
      {/* 선녀 배경 이미지 — 마운트 시 1회 fade-in, 그 외엔 정적(breathing 없음) */}
      <div
        className="absolute inset-0 animate-resultV2FadeIn bg-contain bg-right bg-no-repeat opacity-0 sm:bg-top md:bg-right"
        style={{ backgroundImage: `url(${HERO_GUIDE_IMAGE})` }}
      />

      {/* 후광 — 원본은 opacity 0.4~0.8을 무한 반복했지만, 여기선 중간값으로
          고정한 정적 그라데이션이다(애니메이션 없음). */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 70% 42%, rgba(231,192,126,0.55), transparent 62%)",
        }}
      />

      <div className="absolute inset-0 bg-gradient-to-t from-dark via-dark/50 to-transparent" />

      <div className="relative flex w-full max-w-content animate-resultV2FadeIn flex-col items-center gap-6">
        <p className="text-sm tracking-[0.3em] text-accentGoldFrom">— 命理四柱 —</p>

        <div className="flex w-full flex-col gap-2">
          <p className="font-serif-kr text-xl font-bold leading-relaxed text-white sm:text-2xl">
            당신의 이야기를
          </p>
          <p className="font-serif-kr text-xl font-bold leading-relaxed text-white sm:text-2xl">
            시작해볼까요?
          </p>
        </div>

        <button
          type="button"
          onClick={onEnter}
          className="mt-4 rounded-pill bg-gradient-to-r from-accentGoldFrom to-accentGoldTo px-8 py-4 text-base font-bold text-dark shadow-[0_0_26px_rgba(231,192,126,0.4)] transition-transform duration-200 hover:scale-[1.04] active:scale-[0.97]"
        >
          내 이야기 시작하기 →
        </button>
      </div>
    </section>
  );
}
