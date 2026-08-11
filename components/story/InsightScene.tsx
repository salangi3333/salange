"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { StoryScene } from "@/types/story";
import { renderWithHighlights } from "./highlightText";
import { WordReveal, LineReveal } from "./textReveal";

/**
 * 챕터별로 흩어져 있던 장점/문제(fact)/행동(action)/실제 사례(realLife)를
 * 카드가 아니라 "한 장면이 이어지는" 흐름으로 보여준다.
 * ① 핵심 문장 → (여백) → ② 실제 사례 → ③ 문제 → ④ 해결 → ⑤ 다음 장면 연결
 * 순서를 고정으로 따르며, 각 문단은 줄 단위로 순차 등장한다(자막처럼).
 *
 * 등장 타이밍은 고정값이 아니라 각 문단의 실제 줄 수에서 역산한다 —
 * 텍스트가 짧은 Scene은 빠르게, 긴 Scene은 충분히 느리게 흘러가도록.
 *
 * MovieScene/RevealScene과 달리 스크롤 중 뷰포트 진입 여부를
 * onVisibilityChange로 부모(ResultLanding)에 알려, StickyBottomBar가
 * "InsightScene에서만" 노출되도록 하는 데 사용된다.
 */

const WORD_STAGGER = 0.09;
const WORD_DURATION = 0.45;
const LINE_GAP = 0.3;
const LINE_DURATION = 0.6;
const TEXT_OFFSET = 0.25;

function countLines(text?: string): number {
  if (!text) return 0;
  return text.split("\n").filter((l) => l.trim().length > 0).length;
}

// ── 챕터별 라벨 세트 ────────────────────────────────────────────────
// "현실에서는" / "짚고 넘어가야 할 부분" / "지금 필요한 방향"이 5개 챕터에
// 동일하게 반복되던 문제를 해결하기 위한 표. scene.id("ch1-insight" 등)의
// 챕터 번호만으로 라벨 세트를 고른다 — storyScenes.ts의 본문 데이터는
// 그대로 두고, 이 컴포넌트 안에서만 라벨 텍스트를 챕터별로 다르게 출력한다.
// 순서는 항상 [②실제 사례, ③문제, ④해결] 슬롯에 대응한다.
// ch1=성격, ch2=관계, ch3=재물, ch4=사랑, ch5=현재운 — 실제 화면 출력
// 순서를 확인한 뒤 각 챕터 주제에 맞게 재배치했다.
const CHAPTER_LABELS: Record<string, [string, string, string]> = {
  ch1: ["사람들이 보는 너", "혼자일 때의 너", "속으로 쌓아두는 것"],
  ch2: ["가까워지는 건 빨랐어", "멀어지는 순간은 늘 비슷했어", "끝까지 남는 사람"],
  ch3: ["돈은 들어왔어", "돈이 새는 지점", "돈을 지키는 법"],
  ch4: ["마음은 빨리 열렸어", "상대는 여기서 오해했어", "오래 가는 관계"],
  ch5: ["지금의 흐름", "지금은 피하는 게 좋은 선택", "다가올 변화"],
};
const DEFAULT_LABELS: [string, string, string] = [
  "현실에서는",
  "짚고 넘어가야 할 부분",
  "지금 필요한 방향",
];

function getChapterLabels(id: string): [string, string, string] {
  const chapterKey = id.match(/^ch(\d)/)?.[0];
  return (chapterKey && CHAPTER_LABELS[chapterKey]) || DEFAULT_LABELS;
}

export default function InsightScene({
  scene,
  onVisibilityChange,
  motionOff = false,
}: {
  scene: StoryScene;
  onVisibilityChange?: (id: string, visible: boolean) => void;
  // 임시 A/B 진단 전용 — 부모(ResultLanding)가 ?scrollAB=motion-off를
  // 판정해 내려주는 값. true면 아래 구분선 scaleX와 InsightBlock 강조선
  // scaleY를 처음부터 기존 애니메이션의 최종값으로 렌더링한다. opacity와
  // 그 전환 타이밍은 전혀 건드리지 않는다. 확인 끝나면 반드시 제거할 것.
  motionOff?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !onVisibilityChange) return;
    const observer = new IntersectionObserver(
      ([entry]) => onVisibilityChange(scene.id, entry.isIntersecting),
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      onVisibilityChange(scene.id, false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene.id]);

  const overrides = scene.highlights;
  const [realLifeLabel, factLabel, actionLabel] = getChapterLabels(scene.id);

  // ── 콘텐츠 분량에 맞춘 순차 타이밍 계산 (고정값 대신 실제 줄 수로 역산) ──
  const words = scene.headline.split(" ").length;
  const headlineEnd = words * WORD_STAGGER + WORD_DURATION;
  const dividerDelay = headlineEnd + 0.15;
  const dividerEnd = dividerDelay + 0.7;

  // "호흡" — Hook과 본문 사이, 짧게 숨을 고르는 한 줄(scene.guideLine 재사용, 새 필드 없음)
  const breathLine = Array.isArray(scene.guideLine) ? scene.guideLine[0] : scene.guideLine;
  const breathDelay = dividerEnd + 0.15;
  const breathEnd = breathLine ? breathDelay + 0.6 : dividerEnd;

  const realLifeLines = countLines(scene.realLife);
  const realLifeDelay = breathEnd + 0.2;
  const realLifeEnd = realLifeLines
    ? realLifeDelay + TEXT_OFFSET + (realLifeLines - 1) * LINE_GAP + LINE_DURATION
    : realLifeDelay;

  const factLines = countLines(scene.fact);
  const factDelay = (scene.realLife ? realLifeEnd : dividerEnd) + 0.25;
  const factEnd = factLines
    ? factDelay + TEXT_OFFSET + (factLines - 1) * LINE_GAP + LINE_DURATION
    : factDelay;

  const actionLines = countLines(scene.action);
  const actionDividerDelay = (scene.fact ? factEnd : scene.realLife ? realLifeEnd : dividerEnd) + 0.25;
  const actionTextDelay = actionDividerDelay + 0.35;
  const actionEnd = actionLines
    ? actionTextDelay + (actionLines - 1) * 0.32 + LINE_DURATION
    : actionTextDelay;

  const lastContentEnd = scene.action ? actionEnd : scene.fact ? factEnd : scene.realLife ? realLifeEnd : breathEnd;

  // "명대사" — 설명 대신 마음에 남는 한 줄(scene.nextQuestion 재사용, 새 필드 없음)
  const quoteLine = scene.nextQuestion;
  const quoteDelay = lastContentEnd + 0.35;
  const quoteEnd = quoteLine ? quoteDelay + 0.7 : lastContentEnd;

  const hintDelay = quoteEnd + 0.35;

  return (
    <motion.section
      ref={ref}
      data-probe-scene="insight"
      data-probe-id={scene.id}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative flex h-auto flex-col justify-center overflow-hidden bg-sceneBg px-6 py-10 sm:py-24"
    >
      {/* 배경이 완전히 정지해 보이지 않도록 — 아주 약한 안개 숨쉬기 */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        animate={{ opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background: "radial-gradient(ellipse at 50% 20%, rgba(212,163,74,0.1), transparent 65%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(210,160,68,0.5) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      {/* 이전 장면에서 자연스럽게 이어지는 상단 비네트 */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-16"
        style={{ background: "linear-gradient(180deg, rgba(23,20,18,0.6), transparent)" }}
      />

      <div className="relative mx-auto flex w-full max-w-content2 flex-col items-center gap-8 text-center sm:gap-10">
        {/* ① 핵심 문장 — 문장이 맺히는 순간 한 번 은은하게 밝아졌다 가라앉아, 잠시 멈춰 읽고 싶은 지점을 만든다 */}
        <div className="relative">
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: [0, 0.4, 0] }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 1.8, delay: headlineEnd + 0.2, ease: "easeInOut" }}
            style={{
              background: "radial-gradient(ellipse at 50% 50%, rgba(212,163,74,0.2), transparent 70%)",
            }}
          />
          <h2
            className="relative max-w-[18ch] font-serif-kr text-[22px] font-bold leading-[1.4] text-sceneText sm:text-[30px] sm:leading-[1.35]"
            style={{ wordBreak: "keep-all" }}
          >
            <WordReveal text={scene.headline} stagger={WORD_STAGGER} />
          </h2>
        </div>

        {/* 잠시 여백 — 다음 장면으로 넘어가기 전 숨을 고르는 지점 */}
        <motion.span
          initial={{ opacity: 0, scaleX: motionOff ? 1 : 0 }}
          whileInView={{ opacity: 1, scaleX: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7, delay: dividerDelay }}
          className="block h-px w-10 bg-sceneGold/40"
        />

        {/* 호흡 — Hook과 본문 사이, 작게 한 번 숨을 고르는 지점 */}
        {breathLine && (
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.6, delay: breathDelay }}
            className="whitespace-pre-line font-serif-kr text-[15px] italic tracking-[0.02em] text-sceneTextSub/90 sm:text-[12.5px] sm:text-sceneTextSub/80"
          >
            {breathLine}
          </motion.p>
        )}

        {/* ② 실제 사례 */}
        {scene.realLife && (
          <InsightBlock
            label={realLifeLabel}
            accent="gold"
            text={scene.realLife}
            overrides={overrides}
            delay={realLifeDelay}
            motionOff={motionOff}
          />
        )}

        {/* ③ 문제 */}
        {scene.fact && (
          <InsightBlock
            label={factLabel}
            accent="red"
            text={scene.fact}
            overrides={overrides}
            delay={factDelay}
            motionOff={motionOff}
          />
        )}

        {/* ④ 해결 — 카드 패턴을 반복하지 않고, 감정이 가라앉는 결론처럼 가운데서 조용히 맺는다 */}
        {scene.action && (
          <div className="flex w-full flex-col items-center gap-4">
            <motion.span
              initial={{ opacity: 0, scaleX: motionOff ? 1 : 0 }}
              whileInView={{ opacity: 1, scaleX: 1 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.6, delay: actionDividerDelay }}
              className="block h-px w-8 bg-sceneGold/30"
            />
            <p className="font-serif-kr text-[20px] font-semibold italic leading-snug tracking-[0.02em] text-sceneGold/60 sm:text-[13px] sm:font-normal sm:leading-normal">
              {actionLabel}
            </p>
            <LineReveal
              text={scene.action}
              delay={actionTextDelay}
              lineGap={0.32}
              className="flex flex-col items-center gap-2"
              lineClassName="max-w-[34ch] text-center font-serif-kr text-[17px] italic leading-[1.85] text-sceneGold sm:text-[18px] sm:leading-[1.9]"
              render={(line) => renderWithHighlights(line, { overrides, max: 2 })}
            />
          </div>
        )}

        {/* 명대사 — 설명이 아니라, 마음에 남는 한 줄로 챕터를 맺는다 */}
        {quoteLine && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.7, delay: quoteDelay }}
            className="max-w-[30ch] whitespace-pre-line text-center font-serif-kr text-[16px] font-bold italic leading-[1.7] text-sceneText/90 sm:text-[17px]"
            style={{ wordBreak: "keep-all" }}
          >
            {quoteLine}
          </motion.p>
        )}

      </div>
    </motion.section>
  );
}

// 카드형 박스 대신, 라벨 + 필기하듯 아래로 그어지는 강조선 + 줄 단위 자막으로
// 통일한 문단 블록. 테두리가 순간적으로 나타나지 않고 위→아래로 그려지며
// "채워지는" 느낌을 주어 정적인 박스처럼 보이지 않게 한다.
function InsightBlock({
  label,
  accent,
  text,
  overrides,
  delay,
  motionOff,
}: {
  label: string;
  accent: "gold" | "red";
  text: string;
  overrides: StoryScene["highlights"];
  delay: number;
  motionOff: boolean;
}) {
  const accentBg = accent === "gold" ? "bg-sceneGold/50" : "bg-sceneRed/50";
  const labelColor = accent === "gold" ? "text-sceneGold/65" : "text-sceneRed/65";

  return (
    <div className="w-full max-w-[38ch] text-left sm:max-w-[42ch]">
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.5, delay }}
        className={`font-serif-kr text-[20px] font-semibold italic leading-snug tracking-[0.02em] sm:text-[13px] sm:font-normal sm:leading-normal ${labelColor}`}
      >
        {label}
      </motion.p>
      <div className="relative mt-3 pl-4">
        <motion.span
          initial={{ scaleY: motionOff ? 1 : 0 }}
          whileInView={{ scaleY: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7, delay: delay + 0.1, ease: "easeOut" }}
          style={{ transformOrigin: "top" }}
          className={`absolute inset-y-0 left-0 w-[2px] ${accentBg}`}
        />
        <LineReveal
          text={text}
          delay={delay + TEXT_OFFSET}
          lineGap={LINE_GAP}
          className="flex flex-col gap-2"
          lineClassName="text-[17px] leading-[1.9] tracking-[0.005em] text-sceneBody sm:text-[16.5px] sm:leading-[1.85]"
          render={(line) => renderWithHighlights(line, { overrides, max: 2 })}
        />
      </div>
    </div>
  );
}
