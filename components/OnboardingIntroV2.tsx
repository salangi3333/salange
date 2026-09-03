"use client";

import { useEffect, useState } from "react";
import { HERO_GUIDE_IMAGE } from "@/lib/guideImages";

/**
 * ResultLandingV2 전용 첫 진입(브랜드 오프닝) 화면 — 기존 OnboardingIntro.tsx
 * + GuideVisual.tsx(size="large")의 레이아웃·문구·이미지·**타이밍**을 최대한
 * 그대로 복원하되, 구현은 새로 작성했다.
 *
 * 타이밍은 임의로 정하지 않고 원본 코드를 그대로 계산해서 가져왔다:
 * - 이미지 fade-in: 원본 GuideVisual(large)의 `transition:{opacity:{duration:
 *   2.4, ease:"easeOut"}}` → 2400ms.
 * - 텍스트 블록 fade-in: 원본 OnboardingIntro의 `transition:{duration:1,
 *   delay:0.6}` → 600ms 지연 후 1000ms.
 * - 버튼이 눌릴 수 있게 되는 시점: 원본은 `useTypewriterLines(["당신의
 *   이야기를","시작해볼까요?"], 45, [500])`가 다 끝나야
 *   (`isDone`) 버튼의 opacity/pointer-events가 켜졌다. 그 훅의 로직대로
 *   계산하면: 줄1 "당신의 이야기를"(8자)×45ms=360ms → gap 500ms → 줄2
 *   "시작해볼까요?"(7자)×45ms=315ms → gap 500ms(배열 길이가 1이라 마지막
 *   값 재사용) = 360+500+315+500 = **1675ms**. 글자 단위 reveal 자체는
 *   금지 항목이라 가져오지 않았지만, "화면이 충분히 머무는" 체감을 만들던
 *   진짜 원인은 이 1675ms 지연이었으므로 그 지연 시간만 그대로 복원하고,
 *   텍스트는 타이핑 대신 즉시 완성된 상태로 보여준다.
 * - 버튼 자체의 fade-in: 원본 `transition:{duration:0.6}` → 600ms.
 *
 * 재사용: HERO_GUIDE_IMAGE(선녀 배경 이미지), 문구 전부 원본 그대로, 레이아웃
 * (absolute inset-0 + bg-contain + bg-right/sm:bg-top/md:bg-right, 하단
 * 그라데이션, 골드 버튼), 배경색 bg-dark.
 *
 * 가져오지 않음: useTypewriterLines(글자 단위 reveal 자체는 금지 — 지연
 * 시간만 복원), Framer Motion의 repeat:Infinity 루프 2종(후광 pulse 6s,
 * 이미지 scale breathing 9s) — 전부 유한 CSS 1회성 애니메이션으로 대체했다.
 *
 * 여전히 순수 버튼 클릭형이다 — 자동으로 다음 화면으로 넘어가는 타이머는
 * 없다(원본도 없었다). 이 화면은 입력 폼으로 넘어가는 순간 통째로
 * 언마운트된다.
 */
const BUTTON_READY_MS = 1675;

export default function OnboardingIntroV2({ onEnter }: { onEnter: () => void }) {
  const [buttonReady, setButtonReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setButtonReady(true), BUTTON_READY_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-end overflow-hidden bg-dark px-6 pb-16 text-center">
      {/* 선녀 배경 이미지 — 마운트 시 1회 fade-in(2.4초, 원본과 동일 길이),
          그 외엔 정적(breathing 없음) */}
      <div
        className="absolute inset-0 animate-[resultV2FadeIn_2.4s_ease-out_forwards] bg-contain bg-right bg-no-repeat opacity-0 sm:bg-top md:bg-right"
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

      {/* 텍스트 블록 — 0.6초 지연 후 1초에 걸쳐 fade-in(원본과 동일 타이밍).
          타이핑 대신 완성된 문장을 그대로 보여준다(글자 단위 reveal 금지). */}
      <div className="relative flex w-full max-w-content animate-[resultV2FadeIn_1s_ease-out_0.6s_forwards] flex-col items-center gap-6 opacity-0">
        <p className="text-sm tracking-[0.3em] text-accentGoldFrom">— 命理四柱 · 사주 —</p>

        <div className="flex w-full flex-col gap-2">
          <p className="font-serif-kr text-xl font-bold leading-relaxed text-white sm:text-2xl">
            당신의 이야기를
          </p>
          <p className="font-serif-kr text-xl font-bold leading-relaxed text-white sm:text-2xl">
            시작해볼까요?
          </p>
        </div>

        {/* 버튼 — 원본의 typewriter가 끝나야(1675ms) 눌릴 수 있게 되던 지연을
            그대로 복원. 그 전까지는 투명 + pointer-events 차단, 준비되면
            0.6초에 걸쳐 fade-in(원본과 동일)하며 클릭 가능해진다. */}
        <button
          type="button"
          onClick={onEnter}
          className={`mt-4 rounded-pill bg-gradient-to-r from-accentGoldFrom to-accentGoldTo px-8 py-4 text-base font-bold text-dark shadow-[0_0_26px_rgba(231,192,126,0.4)] transition-[opacity,transform] duration-[600ms] hover:scale-[1.04] active:scale-[0.97] ${
            buttonReady ? "opacity-100" : "pointer-events-none translate-y-2.5 opacity-0"
          }`}
        >
          내 이야기 시작하기 →
        </button>
      </div>
    </section>
  );
}
