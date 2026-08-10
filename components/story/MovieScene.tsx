"use client";

import { motion, useReducedMotion } from "framer-motion";
import { StoryScene } from "@/types/story";
import { WordReveal } from "./textReveal";

/**
 * 챕터 오프닝 전용 "영화적" 장면. 문장을 설명하지 않고, 카메라 무빙과
 * 질감(안개/빛줄기/먼지)만으로 다음 챕터에 대한 기대감을 만든다.
 * scene.chapterLabel(第一章~第五章)에 따라 카메라/질감 조합이 자동으로
 * 정해지며, StoryScene에 새 데이터 필드를 추가하지 않고 기존 필드
 * (chapterLabel/chapterTitle/headline/narrative)만 사용한다.
 */

type CameraKey = "push" | "pull" | "zoom" | "float";
type TextureKey = "fog" | "beam" | "dust" | "particles";

const CHAPTER_VARIANT: Record<string, { camera: CameraKey; texture: TextureKey }> = {
  第一章: { camera: "push", texture: "fog" },
  第二章: { camera: "pull", texture: "beam" },
  第三章: { camera: "zoom", texture: "dust" },
  第四章: { camera: "float", texture: "particles" },
  第五章: { camera: "push", texture: "beam" },
};

const CAMERA_INITIAL_SCALE: Record<CameraKey, number> = {
  push: 1.16,
  pull: 1.05,
  zoom: 1,
  float: 1.08,
};

const CAMERA_DURATION: Record<CameraKey, number> = {
  push: 1.6,
  pull: 2.2,
  zoom: 1.8,
  float: 2.0,
};

// 고정된 위치값 — 매 렌더마다 값이 바뀌지 않도록 Math.random 대신 고정 배열 사용
const DUST_DOTS = [
  { top: "22%", left: "18%", delay: 0 },
  { top: "38%", left: "72%", delay: 0.6 },
  { top: "58%", left: "30%", delay: 1.1 },
  { top: "68%", left: "82%", delay: 0.3 },
  { top: "80%", left: "50%", delay: 1.6 },
  { top: "30%", left: "50%", delay: 0.9 },
];

// 임시 A/B 구조 테스트 전용 플래그 — MovieScene의 motion.section/절대배치
// 장식 레이어/whileInView를 전부 걷어내고 순수 normal-flow <section>으로
// 우회했을 때 모바일 스크롤이 FarewellOutro처럼 매끄러워지는지 비교하기
// 위함. 결과 확인 후 반드시 제거할 것 — 프로덕션에는 반영하지 않는다.
const STATIC_STRUCTURE_TEST = process.env.NEXT_PUBLIC_STATIC_MOVIE_SCENE === "1";

export default function MovieScene({ scene, index }: { scene: StoryScene; index?: number }) {
  const reduceMotion = useReducedMotion();
  const label = scene.chapterLabel ?? "";
  const variant = CHAPTER_VARIANT[label] ?? { camera: "push", texture: "fog" };
  const initialScale = CAMERA_INITIAL_SCALE[variant.camera];
  const duration = CAMERA_DURATION[variant.camera];
  const titleText = scene.chapterTitle ?? scene.headline;
  const titleWordCount = titleText.split(" ").length;
  // WordReveal 실제 stagger(0.1)/duration(0.45) 기본값과 맞춘 정밀한 타이밍 —
  // 제목이 다 드러나기 전에 그 다음 문구나 밑줄이 먼저 뜨는 일이 없도록 한다.
  const titleEnd = 0.9 + titleWordCount * 0.1 + 0.45;
  const narrativeDelay = titleEnd + 0.35;
  const dividerDelay = scene.narrative[0] ? narrativeDelay + 0.8 + 0.3 : titleEnd + 0.5;

  if (STATIC_STRUCTURE_TEST) {
    return (
      <section
        className={`relative flex flex-col items-center overflow-hidden px-6 py-12 text-center sm:min-h-[85svh] sm:justify-center sm:py-0 ${
          index !== undefined && index % 2 === 1 ? "bg-sceneBgAlt" : "bg-sceneBg"
        }`}
      >
        <div className="relative z-10 flex flex-col items-center gap-5 py-10">
          {scene.chapterLabel && (
            <span className="font-serif-kr text-4xl font-bold text-sceneGold">{scene.chapterLabel}</span>
          )}
          <h2
            className="max-w-[20ch] font-serif-kr text-[21px] font-bold leading-[1.3] text-sceneText sm:text-3xl sm:leading-snug"
            style={{ wordBreak: "keep-all" }}
          >
            {titleText}
          </h2>
          {scene.narrative[0] && (
            <p className="max-w-[38ch] whitespace-pre-line font-serif-kr text-[14.5px] italic leading-[1.85] tracking-[0.01em] text-sceneBody/90 sm:text-[13.5px] sm:leading-[1.9] sm:text-sceneBody/80">
              {scene.narrative[0]}
            </p>
          )}
          <span className="mt-2 block h-px w-16 bg-sceneGold/50" />
        </div>
      </section>
    );
  }

  return (
    <motion.section
      data-probe-scene="movie"
      data-probe-id={scene.id}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6 }}
      className={`relative flex flex-col items-center overflow-hidden px-6 py-12 text-center sm:min-h-[85svh] sm:justify-center sm:py-0 ${
        index !== undefined && index % 2 === 1 ? "bg-sceneBgAlt" : "bg-sceneBg"
      }`}
    >
      {/* 카메라 무빙 — 배경 전체가 아주 느리게 진입하며 자리를 잡는다(+ 살짝 흐렸다가 선명해지는 DOF감) */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        initial={reduceMotion ? undefined : { scale: initialScale, opacity: 0, filter: "blur(6px)" }}
        whileInView={reduceMotion ? undefined : { scale: 1, opacity: 1, filter: "blur(0px)" }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration, ease: "easeOut" }}
        style={{
          background: "radial-gradient(ellipse at 50% 40%, rgba(212,163,74,0.14), transparent 65%)",
        }}
      />

      {/* 항상 켜져 있는 아주 느린 숨쉬기(Slow Zoom) — 진입 연출이 끝난 뒤에도 화면이 완전히 멈춰 보이지 않도록 */}
      {!reduceMotion && (
        <motion.div
          className="pointer-events-none absolute inset-0"
          animate={{ scale: [1, 1.035, 1] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: duration }}
          style={{
            background: "radial-gradient(ellipse at 60% 30%, rgba(23,20,18,0), rgba(23,20,18,0.6) 78%)",
          }}
        />
      )}

      {/* Light Sweep — 은은한 빛줄기가 화면을 한 번 가로질러 지나간다 */}
      {!reduceMotion && (
        <motion.div
          className="pointer-events-none absolute inset-y-[-20%] w-[45%]"
          initial={{ left: "-55%", opacity: 0 }}
          whileInView={{ left: "125%", opacity: [0, 0.38, 0] }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 2.2, delay: duration * 0.6, ease: "easeInOut" }}
          style={{
            background: "linear-gradient(100deg, transparent 20%, rgba(255,247,234,0.16) 50%, transparent 80%)",
            transform: "rotate(-12deg)",
          }}
        />
      )}

      {/* 질감 레이어 */}
      {variant.texture === "fog" && (
        <motion.div
          className="pointer-events-none absolute inset-0"
          animate={reduceMotion ? { opacity: 0.3 } : { opacity: [0.2, 0.36, 0.2] }}
          transition={reduceMotion ? undefined : { duration: 7, repeat: Infinity, ease: "easeInOut" }}
          style={{
            background:
              "linear-gradient(180deg, rgba(28,24,21,0) 0%, rgba(28,24,21,0.55) 70%, rgba(28,24,21,0.85) 100%)",
          }}
        />
      )}
      {variant.texture === "beam" && (
        <motion.div
          className="pointer-events-none absolute inset-0"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 1.6, delay: 0.4 }}
          style={{
            background: "linear-gradient(115deg, transparent 30%, rgba(212,163,74,0.16) 48%, transparent 62%)",
          }}
        />
      )}
      {(variant.texture === "dust" || variant.texture === "particles") &&
        DUST_DOTS.map((d, i) => (
          <motion.span
            key={i}
            className="pointer-events-none absolute block rounded-full"
            style={{
              top: d.top,
              left: d.left,
              width: variant.texture === "particles" ? 4 : 2.5,
              height: variant.texture === "particles" ? 4 : 2.5,
              background:
                variant.texture === "particles" ? "rgba(212,163,74,0.55)" : "rgba(255,247,234,0.4)",
            }}
            animate={reduceMotion ? { opacity: 0.35 } : { opacity: [0.12, 0.46, 0.12], y: [0, -14, 0] }}
            transition={
              reduceMotion
                ? undefined
                : { duration: 5 + i * 0.4, repeat: Infinity, ease: "easeInOut", delay: d.delay }
            }
          />
        ))}

      {/* 점묘 패턴 — 기존 SceneSection 배경 질감과의 통일감. 아주 느린 표류(패럴랙스감)를 준다 */}
      <motion.div
        className="pointer-events-none absolute inset-[-6%] opacity-[0.05]"
        animate={reduceMotion ? undefined : { x: [0, 8, 0], y: [0, -6, 0] }}
        transition={reduceMotion ? undefined : { duration: 16, repeat: Infinity, ease: "easeInOut" }}
        style={{
          backgroundImage: "radial-gradient(circle, rgba(210,160,68,0.5) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      {/* 이전 장면에서 이어지는 느낌을 주는 상단 비네트 */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-20"
        style={{
          background: `linear-gradient(180deg, ${
            index !== undefined && index % 2 === 1 ? "rgba(28,24,21,0.7)" : "rgba(23,20,18,0.7)"
          }, transparent)`,
        }}
      />

      {/* 다음 장면으로의 자연스러운 전환을 위한 하단 비네트 */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-28"
        style={{
          background: `linear-gradient(180deg, transparent, ${
            index !== undefined && index % 2 === 1 ? "rgba(28,24,21,0.95)" : "rgba(23,20,18,0.95)"
          })`,
        }}
      />

      {/* 텍스트 — 설명하지 않고 챕터 라벨과 제목만 짧게 */}
      <div className="relative z-10 flex flex-col items-center gap-5 py-10">
        {scene.chapterLabel && (
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.9 }}
            className="font-serif-kr text-4xl font-bold text-sceneGold"
          >
            {scene.chapterLabel}
          </motion.span>
        )}
        <h2
          className="max-w-[20ch] font-serif-kr text-[21px] font-bold leading-[1.3] text-sceneText sm:text-3xl sm:leading-snug"
          style={{ wordBreak: "keep-all" }}
        >
          <WordReveal text={titleText} delay={0.9} />
        </h2>
        {scene.narrative[0] && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.7, delay: narrativeDelay }}
            className="max-w-[38ch] whitespace-pre-line font-serif-kr text-[14.5px] italic leading-[1.85] tracking-[0.01em] text-sceneBody/90 sm:text-[13.5px] sm:leading-[1.9] sm:text-sceneBody/80"
          >
            {scene.narrative[0]}
          </motion.p>
        )}
        <motion.span
          initial={{ opacity: 0, scaleX: 0 }}
          whileInView={{ opacity: 1, scaleX: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.8, delay: dividerDelay }}
          className="mt-2 block h-px w-16 bg-sceneGold/50"
        />
      </div>
    </motion.section>
  );
}
