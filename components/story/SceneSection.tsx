"use client";

import { motion } from "framer-motion";
import { StoryScene } from "@/types/story";
import { ElementAnalysis, YearFortuneItem } from "@/lib/aiLifeReport";
import GuideScene from "./GuideScene";
import HeadlineScene from "./HeadlineScene";
import EvidenceScene from "./EvidenceScene";
import ElementFlowScene from "./ElementFlowScene";
import LockedScene from "./LockedScene";
import YearFlowCards from "./YearFlowCards";
import MovieScene from "./MovieScene";
import RevealScene from "./RevealScene";
import InsightScene from "./InsightScene";
import { renderWithHighlights, splitLeadSentence } from "./highlightText";

export default function SceneSection({
  scene,
  index,
  elementAnalysis,
  tenYear,
  onUnlock,
  onInsightVisibilityChange,
  motionOff,
}: {
  scene: StoryScene;
  index: number;
  elementAnalysis?: ElementAnalysis;
  tenYear?: YearFortuneItem[];
  onUnlock?: () => void;
  onInsightVisibilityChange?: (id: string, visible: boolean) => void;
  motionOff: boolean;
}) {
  // MovieScene / RevealScene / InsightScene은 기존 padding-tier/카드
  // 레이아웃과 무관한 전용 연출을 쓰므로, 공통 wrapper에 들어가기 전에
  // 여기서 바로 반환한다. 이 세 타입 외에는(잠금 Scene 등) 기존 렌더링
  // 경로를 그대로 탄다.
  if (scene.visualType === "movie") {
    return <MovieScene scene={scene} index={index} motionOff={motionOff} />;
  }
  if (scene.visualType === "reveal") {
    return (
      <RevealScene
        scene={scene}
        elementAnalysis={elementAnalysis}
        tenYear={tenYear}
        motionOff={motionOff}
      />
    );
  }
  if (scene.visualType === "insight") {
    return (
      <InsightScene scene={scene} onVisibilityChange={onInsightVisibilityChange} motionOff={motionOff} />
    );
  }

  const overrides = scene.highlights;
  const cardShadow = "shadow-[0_10px_28px_rgba(0,0,0,0.35)]";
  const cardBase = `rounded-card border border-sceneGold/30 ${cardShadow} px-6 py-6`;
  // 카드 라벨 — 본문과 확실히 구분되도록 크기·굵기를 올리고, 아래 여백을 넉넉히 둔 공통 스타일
  const cardLabel = "text-[17px] font-extrabold uppercase tracking-wide";
  const cardBody = "mt-5 whitespace-pre-line text-[15.5px] leading-[1.9] tracking-[0.01em] text-sceneCardText";

  // ── Scene 높이 분류 ──────────────────────────────────────────────
  // min-h-screen(=100vh)은 모바일에서 주소창이 접히고 펼쳐질 때마다
  // 실제 표시 영역이 달라져 스크롤 흔들림의 핵심 원인이었다. 표지(cover)
  // 장면만 안정적인 svh 단위로 화면감을 유지하고, 나머지는 실제 콘텐츠
  // 길이에 맞춰 height: auto로 흐르게 하여 과도한 빈 공간을 없앤다.
  const isCover = scene.visualType === "cover";
  const hasCard = !!(scene.realLife || scene.fact || scene.action);
  const hasNarrative = scene.narrative.some((p) => p.trim().length > 0);
  const isTransitionOnly = !hasNarrative && !hasCard && !scene.evidence?.length;

  const heightClass = isCover
    ? "min-h-[85svh]"
    : isTransitionOnly
    ? "h-auto"
    : "h-auto";
  const paddingClass = isCover
    ? "py-16"
    : isTransitionOnly
    ? "py-9 sm:py-11"
    : hasCard && !hasNarrative
    ? "py-12 sm:py-16"
    : "py-14 sm:py-16";

  return (
    <motion.section
      data-probe-scene="section"
      data-probe-id={scene.id}
      initial={false}
      className={`story-paint-boundary relative flex ${heightClass} flex-col justify-center overflow-hidden px-6 ${paddingClass} ${
        index % 2 === 0 ? "bg-sceneBg" : "bg-sceneBgAlt"
      }`}
    >
      <div
        className="pointer-events-none absolute inset-0 hidden opacity-[0.05] sm:block"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(210,160,68,0.5) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      <div className="relative mx-auto flex w-full max-w-content2 flex-col gap-8">
        {scene.visualType === "cover" ? (
          <div className="flex flex-col items-center gap-5 py-10 text-center">
            {scene.chapterLabel && (
              <span className="font-serif-kr text-4xl font-bold text-sceneGold">{scene.chapterLabel}</span>
            )}
            <h2
              className="font-serif-kr text-[21px] font-bold leading-[1.3] tracking-normal text-sceneText sm:text-3xl sm:leading-snug"
              style={{ wordBreak: "keep-all" }}
            >
              {scene.chapterTitle ?? scene.headline}
            </h2>
            {scene.narrative[0] && (
              <p className="max-w-[42ch] text-[14.5px] leading-[1.85] text-sceneBody/90">{scene.narrative[0]}</p>
            )}
            <span className="mt-2 block h-px w-16 bg-sceneGold/50" />
          </div>
        ) : (
          <>
            {scene.guideLine && <GuideScene text={scene.guideLine} />}

            {scene.isLocked ? (
              <LockedScene scene={scene} tenYear={tenYear} onUnlock={onUnlock} />
            ) : (
              <>
                <HeadlineScene scene={scene} />

                {scene.visualType === "elements" && elementAnalysis && (
                  <ElementFlowScene analysis={elementAnalysis} />
                )}

                {scene.visualType === "yearflow" && tenYear && (
                  <YearFlowCards tenYear={tenYear} />
                )}

                {scene.evidence && <EvidenceScene items={scene.evidence} />}

                {scene.realLife && (() => {
                  const { lead, rest } = splitLeadSentence(scene.realLife);
                  return (
                    <div className={`${cardBase} border-l-4 border-l-sceneGold bg-sceneCard`}>
                      <p className={`${cardLabel} text-sceneGold/90`}>
                        현실에서는 이렇게 나타납니다
                      </p>
                      <p className={cardBody}>
                        <strong className="font-bold">{renderWithHighlights(lead, { overrides })}</strong>
                        {rest && <> {renderWithHighlights(rest, { overrides })}</>}
                      </p>
                    </div>
                  );
                })()}

                {scene.fact && (
                  <div
                    className={`${cardBase} border-l-4 border-l-sceneRedDeep`}
                    style={{ background: "linear-gradient(180deg, #FBEDE9 0%, #F8F3E9 55%)" }}
                  >
                    <p className={`${cardLabel} text-sceneRedDeep/90`}>
                      짚고 넘어가야 할 부분
                    </p>
                    <p className={`${cardBody} font-medium`}>
                      {renderWithHighlights(scene.fact, { overrides, max: 2 })}
                    </p>
                  </div>
                )}

                {scene.action && (
                  <div className={`${cardBase} border-l-4 border-l-sceneGold bg-sceneCard`}>
                    <p className={`${cardLabel} text-sceneGold/90`}>
                      지금 필요한 방향
                    </p>
                    <p className={cardBody}>
                      {renderWithHighlights(scene.action, { overrides, max: 2 })}
                    </p>
                  </div>
                )}

                {scene.nextQuestion && (
                  scene.chapterEnd ? (
                    <div className="text-right">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-sceneGold/60">
                        다음 기록
                      </p>
                      <p className="mt-1.5 font-serif-kr text-lg italic text-sceneGold">
                        {scene.nextQuestion}
                      </p>
                    </div>
                  ) : (
                    <p className="text-right font-serif-kr text-[15px] italic text-sceneTextSub">
                      {scene.nextQuestion}
                    </p>
                  )
                )}
              </>
            )}
          </>
        )}
      </div>
    </motion.section>
  );
}
