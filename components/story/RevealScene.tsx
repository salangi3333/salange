"use client";

import { motion } from "framer-motion";
import { StoryScene } from "@/types/story";
import { ElementAnalysis, YearFortuneItem } from "@/lib/aiLifeReport";
import ElementFlowScene from "./ElementFlowScene";
import YearFlowCards from "./YearFlowCards";

/**
 * "폭로(Reveal)" 전용 장면 — 설명하지 않고, 이미 계산된 사실 하나
 * (headline/evidence/narrative 중 하나)만을 영화적인 방식으로 열어 보여준다.
 * scene.id에 따라 연출 방식(variant)만 달라질 뿐, 문장은 기존 storyScenes
 * 데이터를 그대로 사용하며 새로운 해석 문구를 만들지 않는다.
 */

type Variant = "book" | "seal" | "door" | "card" | "light" | "scroll" | "silhouette" | "fade";

function pickVariant(id: string): Variant {
  if (id === "ch1-reveal") return "book";
  // ch2-reveal은 원래 "문이 열림"(신살 1개를 클리핑 애니메이션 박스로
  // 보여주는) 연출이었으나, 그 박스와 위 안내 문구가 불필요하다는 피드백에
  // 따라 제거하고 headline/narrative(관계 해석 문장)만 바로 보여주는
  // "fade"로 바꿨다. 데이터(guideLine/evidence)도 lib/storyScenes.ts의
  // ch2-reveal 항목에서 함께 제거했다.
  if (id === "ch3-reveal") return "card";
  if (id === "ch4-reveal") return "light";
  if (id === "ch5-reveal-elements") return "scroll";
  if (id === "ch5-reveal-years") return "silhouette";
  return "fade";
}

export default function RevealScene({
  scene,
  elementAnalysis,
  tenYear,
  motionOff = false,
}: {
  scene: StoryScene;
  elementAnalysis?: ElementAnalysis;
  tenYear?: YearFortuneItem[];
  // 임시 A/B 진단 전용 — 부모(ResultLanding)가 ?scrollAB=motion-off를
  // 판정해 내려주는 값. RevealBook/RevealDoor/RevealCard/RevealScroll에
  // 그대로 전달된다. 확인 끝나면 반드시 제거할 것.
  motionOff?: boolean;
}) {
  const variant = pickVariant(scene.id);

  return (
    <motion.section
      data-probe-scene="reveal"
      data-probe-id={scene.id}
      initial={false}
      className="story-paint-boundary relative flex h-auto flex-col justify-center overflow-hidden bg-sceneBg px-6 py-10 sm:py-20"
    >
      {/* 임시 A/B 테스트 — repeat:Infinity 안개 숨쉬기를 정지 상태로 고정.
          최종 디자인(그라디언트 자체)은 그대로, 무한 반복 애니메이션만 중단.
          결과 확인 후 원상복구할 것. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: 0.18,
          background: "radial-gradient(ellipse at 50% 30%, rgba(212,163,74,0.12), transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 hidden opacity-[0.05] sm:block"
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

      <div className="relative mx-auto flex w-full max-w-content2 flex-col items-center gap-6 text-center">
        {/* 텍스트보다 연출이 먼저 눈에 들어오도록, 대사는 짧은 정적 이후에 나타난다 */}
        {scene.guideLine && (
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.05 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="text-[14px] italic text-sceneTextSub/90 sm:text-[13px] sm:text-sceneTextSub/80"
          >
            {Array.isArray(scene.guideLine) ? scene.guideLine[0] : scene.guideLine}
          </motion.p>
        )}

        {variant === "book" && <RevealBook scene={scene} motionOff={motionOff} />}
        {variant === "seal" && <RevealSeal scene={scene} />}
        {variant === "door" && <RevealDoor scene={scene} motionOff={motionOff} />}
        {variant === "card" && <RevealCard scene={scene} motionOff={motionOff} />}
        {variant === "light" && <RevealLight scene={scene} />}
        {variant === "scroll" && (
          <RevealScroll scene={scene} elementAnalysis={elementAnalysis} motionOff={motionOff} />
        )}
        {variant === "silhouette" && <RevealSilhouette scene={scene} tenYear={tenYear} />}
        {variant === "fade" && <RevealFade scene={scene} />}
      </div>
    </motion.section>
  );
}

// ── 서책이 펼쳐짐 — 근거(십성) 공개 ──────────────────────────────
function RevealBook({ scene, motionOff }: { scene: StoryScene; motionOff: boolean }) {
  const evidence = scene.evidence ?? [];
  const mid = Math.ceil(evidence.length / 2);
  const left = evidence.slice(0, mid);
  const right = evidence.slice(mid);

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div className="flex w-full max-w-[420px] justify-center gap-1" style={{ perspective: 900 }}>
        <motion.div
          initial={{ rotateY: motionOff ? 0 : 80, opacity: 0 }}
          whileInView={{ rotateY: 0, opacity: 1 }}
          viewport={{ once: true, amount: 0.05 }}
          transition={{ duration: 1.1, delay: 0.15, ease: "easeOut" }}
          style={{ transformOrigin: "right center" }}
          className="min-w-0 flex-1 rounded-l-card border border-sceneGold/30 bg-sceneCard px-4 py-6 text-left shadow-[0_10px_28px_rgba(0,0,0,0.35)]"
        >
          {left.map((e, i) => (
            <motion.div
              key={e.label}
              initial={{ opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.05 }}
              transition={{ duration: 0.5, delay: 0.9 + i * 0.3 }}
              className="mb-2 last:mb-0"
            >
              <p className="text-[11px] font-bold uppercase tracking-wider text-sceneGold/90">{e.label}</p>
              <p className="text-[13px] font-bold text-sceneCardText">{e.detail}</p>
            </motion.div>
          ))}
        </motion.div>
        <motion.div
          initial={{ rotateY: motionOff ? 0 : -80, opacity: 0 }}
          whileInView={{ rotateY: 0, opacity: 1 }}
          viewport={{ once: true, amount: 0.05 }}
          transition={{ duration: 1.1, delay: 0.15, ease: "easeOut" }}
          style={{ transformOrigin: "left center" }}
          className="min-w-0 flex-1 rounded-r-card border border-sceneGold/30 bg-sceneCard px-4 py-6 text-left shadow-[0_10px_28px_rgba(0,0,0,0.35)]"
        >
          {right.map((e, i) => (
            <motion.div
              key={e.label}
              initial={{ opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.05 }}
              transition={{ duration: 0.5, delay: 1.1 + i * 0.3 }}
              className="mb-2 last:mb-0"
            >
              <p className="text-[11px] font-bold uppercase tracking-wider text-sceneGold/90">{e.label}</p>
              <p className="text-[13px] font-bold text-sceneCardText">{e.detail}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
      <RevealHeadline scene={scene} delay={1.6} />
    </div>
  );
}

// ── 봉인 해제 — 혼자 감당하는 순간 ──────────────────────────────
function RevealSeal({ scene }: { scene: StoryScene }) {
  const line = scene.narrative[scene.narrative.length - 1] || scene.headline;
  return (
    <div className="flex flex-col items-center gap-8">
      <motion.div
        initial={{ scale: 1, rotate: 0, opacity: 1 }}
        whileInView={{ scale: [1, 1.15, 0], rotate: [0, 0, -10], opacity: [1, 1, 0] }}
        viewport={{ once: true, amount: 0.05 }}
        transition={{ duration: 0.9, times: [0, 0.5, 1], ease: "easeIn" }}
        className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-sceneRed/70 text-sceneRed"
      >
        <span className="font-serif-kr text-xl font-bold">封</span>
      </motion.div>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.05 }}
        transition={{ duration: 1.0, delay: 1.0 }}
        className="max-w-[32ch] whitespace-pre-line font-serif-kr text-[18px] font-bold leading-[1.6] text-sceneText sm:text-2xl"
        style={{ wordBreak: "keep-all" }}
      >
        {line}
      </motion.p>
    </div>
  );
}

// ── 문이 열림 — 신살/관계 표식 공개 ──────────────────────────────
function RevealDoor({ scene, motionOff }: { scene: StoryScene; motionOff: boolean }) {
  const mark = scene.evidence?.[0]?.detail;
  return (
    <div className="relative flex w-full max-w-[320px] flex-col items-center gap-6">
      <div className="relative flex h-40 w-full items-center justify-center overflow-hidden rounded-card border border-sceneGold/30">
        <motion.div
          initial={{ clipPath: motionOff ? "inset(0 100% 0 0)" : "inset(0 0 0 0)" }}
          whileInView={{ clipPath: "inset(0 100% 0 0)" }}
          viewport={{ once: true, amount: 0.05 }}
          transition={{ duration: 1.3, delay: 0.15, ease: "easeOut" }}
          className="absolute inset-0 bg-sceneBgAlt"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, rgba(212,163,74,0.18) 0 2px, transparent 2px 34px)",
          }}
        />
        {mark && (
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.05 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            className="relative z-10 font-serif-kr text-2xl font-bold text-sceneGold"
          >
            {mark}
          </motion.span>
        )}
      </div>
      <RevealHeadline scene={scene} delay={1.3} />
    </div>
  );
}

// ── 카드가 뒤집힘 — 올해 재물·직업 시기 공개 ──────────────────────────────
function RevealCard({ scene, motionOff }: { scene: StoryScene; motionOff: boolean }) {
  const face = scene.evidence?.[0]?.detail ?? scene.headline;
  return (
    <div className="flex flex-col items-center gap-6" style={{ perspective: 900 }}>
      <motion.div
        initial={{ rotateY: motionOff ? 180 : 0 }}
        whileInView={{ rotateY: 180 }}
        viewport={{ once: true, amount: 0.05 }}
        transition={{ duration: 0.8, delay: 0.15, ease: "easeInOut" }}
        className="flex h-28 w-52 items-center justify-center rounded-card border border-sceneGold/30 bg-sceneCard shadow-[0_10px_28px_rgba(0,0,0,0.35)]"
      >
        <motion.span
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.05 }}
          transition={{ duration: 0.4, delay: 0.55 }}
          style={{ transform: "rotateY(180deg)" }}
          className="px-3 text-center font-serif-kr text-lg font-bold text-sceneCardText"
        >
          {face}
        </motion.span>
      </motion.div>
      <RevealHeadline scene={scene} delay={1.0} />
    </div>
  );
}

// ── 빛이 스며듦 — 궁합 기운 공개 ──────────────────────────────
function RevealLight({ scene }: { scene: StoryScene }) {
  const a = scene.evidence?.[0];
  const b = scene.evidence?.[1];
  return (
    <div className="relative flex w-full max-w-[420px] flex-col items-center gap-6 overflow-hidden rounded-card py-10">
      <motion.div
        className="pointer-events-none absolute inset-y-0 left-0 w-1/2"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.05 }}
        transition={{ duration: 1.0, delay: 0.15 }}
        style={{ background: "linear-gradient(90deg, rgba(212,163,74,0.22), transparent)" }}
      />
      <motion.div
        className="pointer-events-none absolute inset-y-0 right-0 w-1/2"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.05 }}
        transition={{ duration: 1.0, delay: 0.4 }}
        style={{ background: "linear-gradient(270deg, rgba(124,147,196,0.22), transparent)" }}
      />
      <div className="relative z-10 flex w-full items-center justify-center gap-6">
        {a && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.05 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-center"
          >
            <p className="text-[12px] text-sceneTextSub/90 sm:text-[11px] sm:text-sceneTextSub">{a.label}</p>
            <p className="font-serif-kr text-xl font-bold text-sceneGold">{a.detail}</p>
          </motion.div>
        )}
        <span className="text-sceneTextSub/50">·</span>
        {b && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.05 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="text-center"
          >
            <p className="text-[12px] text-sceneTextSub/90 sm:text-[11px] sm:text-sceneTextSub">{b.label}</p>
            <p className="font-serif-kr text-xl font-bold" style={{ color: "#7C93C4" }}>
              {b.detail}
            </p>
          </motion.div>
        )}
      </div>
      <RevealHeadline scene={scene} delay={1.3} />
    </div>
  );
}

// ── 운명서 펼쳐짐 — 오행 그래프 + 현재 대운 공개 (오행 그래프는 이 한 곳에서만 렌더링) ──
// 이전에는 clipPath(inset 50%→0%)로 "펼쳐지는" 연출을 썼는데, 그래프+범례를
// 포함한 세로로 긴 블록이라 whileInView의 40% 노출 조건이 쉽게 채워지지 않아
// 실제로는 화면에 전혀 나타나지 않는 경우가 있었다. opacity+scale 방식으로
// 바꾸고 임계값도 낮춰, 스크롤만 닿으면 확실히 보이도록 했다.
function RevealScroll({
  scene,
  elementAnalysis,
  motionOff,
}: {
  scene: StoryScene;
  elementAnalysis?: ElementAnalysis;
  motionOff: boolean;
}) {
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <motion.div
        initial={{ opacity: 0, scale: motionOff ? 1 : 0.98 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.05 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="w-full"
      >
        {elementAnalysis && <ElementFlowScene analysis={elementAnalysis} />}
      </motion.div>
      <RevealHeadline scene={scene} delay={1.1} />
    </div>
  );
}

// ── 실루엣 등장 — 2026·2027년 공개 ──────────────────────────────
function RevealSilhouette({ scene, tenYear }: { scene: StoryScene; tenYear?: YearFortuneItem[] }) {
  return (
    <div className="flex w-full flex-col items-center gap-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.05 }}
        transition={{ duration: 0.7, delay: 0.2 }}
        className="w-full"
      >
        {tenYear && <YearFlowCards tenYear={tenYear} />}
      </motion.div>
      <RevealHeadline scene={scene} delay={1.1} />
    </div>
  );
}

// ── 기본형 — 위 변형에 해당하지 않는 reveal Scene을 위한 안전한 fallback ──
function RevealFade({ scene }: { scene: StoryScene }) {
  return <RevealHeadline scene={scene} delay={0.2} />;
}

// ── 공통: 한 줄(또는 최대 두 줄) 폭로 문장 ──────────────────────────────
function RevealHeadline({ scene, delay }: { scene: StoryScene; delay: number }) {
  return (
    <div className="relative">
      {/* 문장이 맺히는 순간 한 번 은은하게 밝아졌다 가라앉는 여운 — 시선이 멈추는 지점을 만든다 */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: [0, 0.5, 0] }}
        viewport={{ once: true, amount: 0.05 }}
        transition={{ duration: 1.6, delay: delay + 0.3, ease: "easeInOut" }}
        style={{
          background: "radial-gradient(ellipse at 50% 50%, rgba(212,163,74,0.22), transparent 70%)",
        }}
      />
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.05 }}
        transition={{ duration: 0.8, delay }}
        className="relative max-w-[28ch] whitespace-pre-line font-serif-kr text-[19px] font-bold leading-[1.55] text-sceneText sm:text-2xl sm:leading-[1.6]"
        style={{ wordBreak: "keep-all" }}
      >
        {scene.headline}
      </motion.p>
    </div>
  );
}
