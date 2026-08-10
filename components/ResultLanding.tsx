"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import MobileScrollProbe from "@/components/MobileScrollProbe";
import { Lock } from "lucide-react";
import StickyBottomBar from "@/components/StickyBottomBar";
import Hero from "@/components/Hero";
import PillarTable from "@/components/PillarTable";
import ProfileSummaryCard from "@/components/ProfileSummaryCard";
import EightCharPreview from "@/components/EightCharPreview";
import StoryblockSection from "@/components/StoryblockSection";
import ResultTransition from "@/components/ResultTransition";
import AssetFlowChart from "@/components/AssetFlowChart";
import FortuneTimeline, { FortuneNode } from "@/components/FortuneTimeline";
import MainCTACard from "@/components/MainCTACard";
import Testimonials from "@/components/Testimonials";
import ReportAccordion from "@/components/ReportAccordion";
import FarewellOutro from "@/components/FarewellOutro";
import CompatibilitySection from "@/components/CompatibilitySection";

import {
  assetFlowLocked,
  fortuneTimelineLocked,
  reportParts,
  testimonials,
  PRICE,
  ctaMeta,
  totalPaidCount,
} from "@/data/sample";
import { SajuUser, StoryblockSection as StoryblockSectionType, AssetFlowPoint } from "@/types";
import { CompatibilityResult } from "@/lib/compatibility";
import { AppData } from "@/lib/sajuContent";
import { GAN_ELEMENT } from "@/lib/hanjaTables";
import {
  buildElementAnalysis,
  buildHealthNote,
  buildPersonalTraitNotes,
  buildLifeFlowSummary,
  buildTenYearFortune,
} from "@/lib/aiLifeReport";
import { buildFullStoryScenes, buildLoveStoryScenes } from "@/lib/storyScenes";
import { FortuneTopic } from "@/components/CharacterGuide";
import StoryIntro from "@/components/story/StoryIntro";
import SceneSection from "@/components/story/SceneSection";
import PillarScene from "@/components/story/PillarScene";
import MovieScene from "@/components/story/MovieScene";
import { StoryScene } from "@/types/story";

// 여덟 글자 소개(StoryIntro) 직후, 第一章이 시작되기 전에 한 번만 보여주는
// 아주 짧은 철학 브리지. 새 챕터도, 새 컴포넌트도 아니고 기존 MovieScene을
// 그대로 재사용한다(chapterLabel을 비워 "第○章" 배지가 뜨지 않게 한다).
const PHILOSOPHY_SCENE: StoryScene = {
  id: "philosophy-bridge",
  topic: "all",
  headline: "타고난 내 운명을 알면, 내 인생도 바꿀 수 있습니다.",
  narrative: [
    "명리학은 미래를 맞히는 점이 아니라, 타고난 기질과 흐름을 읽어 더 나은 선택을 돕는 길잡이입니다.",
  ],
  visualType: "movie",
  isLocked: false,
};

const totalReportItems = reportParts.reduce((sum, p) => sum + p.items.length, 0);
const unlockedReportItems = reportParts.reduce(
  (sum, p) => sum + p.items.filter((item) => !item.locked).length,
  0
);

const TEN_YEAR_LOCKED_ITEMS = [
  "10년 상세 리포트 — 3년차부터 10년차까지 연도별 전체 해석",
  "재물 상승 시기 — 가장 크게 재물이 불어나는 정확한 시점",
  "직업 전환 시기 — 이직·창업에 유리한 구체적인 시기",
  "연애·결혼 흐름 — 인연이 들어오고 맺어지는 시기",
  "인생 전환점 — 삶의 방향이 크게 바뀌는 결정적 나이",
  "AI 행동 전략 — 시기별로 무엇을 해야 할지 알려주는 맞춤 가이드",
];

function PreviewCard({
  no,
  title,
  children,
}: {
  no: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-card bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-dark text-[10px] font-bold text-accentGoldFrom">
          {no}
        </span>
        <h4 className="text-sm font-bold text-textMain">{title}</h4>
      </div>
      <div className="mt-2.5 flex flex-col gap-2 text-[15px] leading-relaxed text-textMain">
        {children}
      </div>
    </div>
  );
}

export default function ResultLanding({
  user,
  chars,
  storyblocks,
  resultQuote,
  assetFlowPoints,
  fortuneTimelineNodes,
  birthYear,
  topic,
  topicLabel,
  compatibility,
  partnerAppData,
}: {
  user: SajuUser;
  chars: string[];
  storyblocks: StoryblockSectionType[];
  resultQuote: string;
  assetFlowPoints: AssetFlowPoint[];
  fortuneTimelineNodes: FortuneNode[];
  birthYear: number;
  topic?: FortuneTopic | null;
  topicLabel?: string;
  compatibility?: {
    partnerName: string;
    result: CompatibilityResult;
  } | null;
  partnerAppData?: AppData | null;
}) {
  const handleCheckout = () => {
    document.getElementById("main-cta")?.scrollIntoView({ behavior: "smooth" });
  };

  // 임시 A/B 진단 전용 — URL에 ?scrollAB=insight-state-off가 있을 때만,
  // 아래 StickyBottomBar 노출 제어 경로를 "React state 갱신(최상위
  // ResultLanding 리렌더)" 대신 "ref 기반 직접 DOM 스타일 반영"으로
  // 바꾼다. InsightScene 5개의 IntersectionObserver 자체와 가시성 판정
  // 시점(threshold, 콜백이 불리는 순간)은 전혀 건드리지 않는다 — 오직
  // 그 결과를 반영하는 방식만 바뀐다. 플래그가 없으면(일반 URL) 아래
  // 분기는 전혀 타지 않고 기존 state 기반 코드가 그대로 실행된다.
  // 확인 끝나면 반드시 제거할 것 — 프로덕션에 영구히 남겨둘 코드가 아니다.
  // ref로도 같은 값을 들고 있는 이유: InsightScene.tsx의 IntersectionObserver는
  // scene.id가 바뀔 때만 재구독되고 onVisibilityChange 함수 자체가 바뀌어도
  // 재구독되지 않는다(그 파일은 수정 대상이 아님). 따라서 handleInsightVisibility가
  // insightStateOff "state"를 직접 클로저로 참조하면, 마운트 시점(false)에 만들어진
  // 낡은 함수가 계속 관찰자에 묶여 있어 나중에 플래그가 true가 돼도 옛 동작을 계속
  // 수행하는 버그가 생긴다. ref는 함수 재생성 없이 항상 최신값을 읽을 수 있어
  // handleInsightVisibility 자체를 마운트 후 참조가 고정된 안정적인 함수로 유지하면서도
  // 매 호출 시점의 최신 플래그 값을 정확히 반영한다.
  const insightStateOffRef = useRef(false);
  const [insightStateOff, setInsightStateOff] = useState(false);
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const off = params.get("scrollAB") === "insight-state-off";
      insightStateOffRef.current = off;
      setInsightStateOff(off);
    } catch {
      insightStateOffRef.current = false;
      setInsightStateOff(false);
    }
  }, []);

  // 임시 A/B 진단 전용 — URL에 ?scrollAB=result-pan-y가 있을 때만 아래
  // <main>(전체 콘텐츠를 감싸는 최상위 래퍼)에 touch-action:pan-y를 추가한다.
  // 플래그가 없으면(일반 URL) style 자체가 안 붙어 기존과 완전히 동일하다.
  // 확인 끝나면 반드시 제거할 것 — 프로덕션에 영구히 남겨둘 코드가 아니다.
  const [resultPanY, setResultPanY] = useState(false);
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      setResultPanY(params.get("scrollAB") === "result-pan-y");
    } catch {
      setResultPanY(false);
    }
  }, []);

  // StickyBottomBar 노출 제어 — MovieScene/RevealScene에서는 숨기고
  // InsightScene이 화면에 걸쳐 있는 동안에만 나타난다. 마지막 선녀
  // 엔딩(FarewellOutro) 이후로는 구매 CTA 구간이므로 한 번 도달하면
  // 계속 노출 상태를 유지한다(한 방향 래치).
  const [visibleInsightIds, setVisibleInsightIds] = useState<Set<string>>(new Set());
  const [hasReachedEnding, setHasReachedEnding] = useState(false);
  const farewellRef = useRef<HTMLDivElement>(null);

  // insightStateOff일 때만 쓰는 ref 경로 — 기존 state(visibleInsightIds/
  // hasReachedEnding)와 완전히 별개로 동작해 서로 간섭하지 않는다.
  const visibleInsightIdsRef = useRef<Set<string>>(new Set());
  const hasReachedEndingRef = useRef(false);
  const purchaseBarElRef = useRef<HTMLDivElement>(null);

  // 기존 motion.div의 animate={{y, opacity}} + style.pointerEvents와
  // 동일한 값·전환 시간(0.5s easeOut)을 순수 DOM 스타일로 재현한다.
  const applyPurchaseBarVisibility = useCallback((visible: boolean) => {
    const el = purchaseBarElRef.current;
    if (!el) return;
    el.style.opacity = visible ? "1" : "0";
    el.style.transform = visible ? "translateY(0px)" : "translateY(24px)";
    el.style.pointerEvents = visible ? "auto" : "none";
    el.setAttribute("aria-hidden", visible ? "false" : "true");
  }, []);

  // 의도적으로 deps에 insightStateOff(state)를 넣지 않는다 — 이 함수 참조는
  // 마운트 후 절대 바뀌지 않아야 InsightScene.tsx의 관찰자가(재구독 없이도)
  // 항상 최신 분기를 타며, 실제 최신값은 매 호출 시 insightStateOffRef에서 읽는다.
  const handleInsightVisibility = useCallback(
    (id: string, visible: boolean) => {
      if (insightStateOffRef.current) {
        const set = visibleInsightIdsRef.current;
        if (visible) set.add(id);
        else set.delete(id);
        applyPurchaseBarVisibility(set.size > 0 || hasReachedEndingRef.current);
        return;
      }
      setVisibleInsightIds((prev) => {
        const next = new Set(prev);
        if (visible) next.add(id);
        else next.delete(id);
        return next;
      });
    },
    [applyPurchaseBarVisibility]
  );

  useEffect(() => {
    const el = farewellRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (insightStateOffRef.current) {
            hasReachedEndingRef.current = true;
            applyPurchaseBarVisibility(true);
          } else {
            setHasReachedEnding(true);
          }
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [applyPurchaseBarVisibility]);

  const showPurchaseBar = visibleInsightIds.size > 0 || hasReachedEnding;

  const personalityBlock = storyblocks.find((b) => b.title === "타고난 잠재력");
  const temperamentBlock = storyblocks.find((b) => b.title === "타고난 기질");

  const strengths = user.stats.filter((s) => !s.locked).slice(0, 3);
  const cautionParagraphs = [
    personalityBlock?.paragraphs[1],
    temperamentBlock?.paragraphs[1],
  ].filter((p): p is { text: string; highlights?: string[] } => !!p);

  const dayGan = user.pillars.day.hanja;
  const dayElement = GAN_ELEMENT[dayGan];
  const reportSeed = chars.join("");

  const elementAnalysis = buildElementAnalysis(chars);
  const traits = buildPersonalTraitNotes(dayElement);
  const healthNote = buildHealthNote(elementAnalysis.strongest, elementAnalysis.weakest);
  const lifeFlow = buildLifeFlowSummary(user.typeLabel, resultQuote, elementAnalysis.strongest);
  const tenYear = buildTenYearFortune(dayGan, birthYear, reportSeed);
  const bestYear = tenYear.reduce((a, b) => (b.score > a.score ? b : a), tenYear[0]);
  const worstYear = tenYear.reduce((a, b) => (b.score < a.score ? b : a), tenYear[0]);

  const isStoryTopic = topic === "all" || topic === "love";
  const storyAppData: AppData = {
    user,
    chars,
    storyblocks,
    resultQuote,
    assetFlowPoints,
    fortuneTimelineNodes,
    birthYear,
  };
  const storyScenes = isStoryTopic
    ? topic === "all"
      ? buildFullStoryScenes(storyAppData)
      : buildLoveStoryScenes(storyAppData)
    : [];

  return (
    <>
      {/* 임시 진단 — URL에 ?scrollDebug=1이 있을 때만 동작(그 외에는 완전히
          null 반환, 리스너도 안 붙음). 확인 끝나면 제거할 것. */}
      <MobileScrollProbe />
      {/* 결과 페이지(story) 진입 이후로는 끝까지 다크 브라운(sceneBg)을 유지한다.
          main에 배경을 걸어두면 아래 어떤 자식 컴포넌트가 자기 배경을 깜빡
          잊어도 흰 배경이 새어나오지 않는다 — 흰 띠 버그의 안전망. */}
      <main
        className={`pb-24 ${isStoryTopic ? "bg-sceneBg" : ""}`}
        style={resultPanY ? { touchAction: "pan-y" } : undefined}
      >
        {topicLabel && (
          <p className="bg-dark py-2.5 text-center text-xs font-medium text-accentGoldFrom">
            고르신 {topicLabel}부터 자세히 확인해드릴게요
          </p>
        )}

        {isStoryTopic ? (
          <>
            <PillarScene name={user.name} pillars={user.pillars} sinsal={user.sinsal} />
            <StoryIntro name={user.name} />
            <MovieScene scene={PHILOSOPHY_SCENE} />
            {storyScenes.map((scene, i) => (
              <SceneSection
                key={scene.id}
                scene={scene}
                index={i}
                elementAnalysis={elementAnalysis}
                tenYear={tenYear}
                onUnlock={handleCheckout}
                onInsightVisibilityChange={handleInsightVisibility}
              />
            ))}
          </>
        ) : (
          <>
        <Hero user={user} />

        <PillarTable pillars={user.pillars} sinsal={user.sinsal} />

        <ProfileSummaryCard user={user} />

        <EightCharPreview name={user.name} chars={chars} />

        <section className="mx-auto max-w-content px-6 py-10">
          <span className="vertical-label text-[11px] text-textSub">— AI 人生 —</span>
          <h2 className="mt-3 font-serif-kr text-2xl font-bold text-accentRed">
            {user.name}님의 AI 인생 리포트
          </h2>
          <p className="mt-2 text-sm text-textSub">
            사주팔자를 바탕으로 AI가 분석한 타고난 사주 리포트입니다
          </p>

          <div className="mt-6 flex flex-col gap-4">
            <PreviewCard no={1} title="핵심 한 줄">
              <p className="font-bold text-accentRed">{user.oneLiner}</p>
            </PreviewCard>

            <PreviewCard no={2} title="타고난 성격">
              {personalityBlock?.paragraphs[0] && (
                <p>{personalityBlock.paragraphs[0].text}</p>
              )}
              {temperamentBlock?.paragraphs[0] && (
                <p>{temperamentBlock.paragraphs[0].text}</p>
              )}
            </PreviewCard>

            <PreviewCard no={3} title="강점 3가지">
              <div className="flex flex-wrap gap-2">
                {strengths.map((s) => (
                  <div
                    key={s.label}
                    className="flex items-center gap-2 rounded-box border border-bg bg-bg/40 px-3 py-2"
                  >
                    <span className="text-xs text-textSub">{s.label}</span>
                    <span className="text-sm font-bold text-textMain">{s.score}</span>
                  </div>
                ))}
              </div>
            </PreviewCard>

            <PreviewCard no={4} title="주의해야 할 점 2가지">
              <ul className="flex flex-col gap-2">
                {cautionParagraphs.map((p, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-accentRed">·</span>
                    <span>{p.text}</span>
                  </li>
                ))}
              </ul>
            </PreviewCard>

            <PreviewCard no={5} title="인간관계 성향">
              <p>{traits.relationship}</p>
            </PreviewCard>

            <PreviewCard no={6} title="재물 성향">
              <p>{traits.money}</p>
            </PreviewCard>

            <PreviewCard no={7} title="직업 · 사업 성향">
              <p>{traits.career}</p>
            </PreviewCard>

            <PreviewCard no={8} title="연애 · 결혼 성향">
              <p>{traits.love}</p>
            </PreviewCard>

            <PreviewCard no={9} title="건강 관리 포인트">
              <p>{healthNote}</p>
            </PreviewCard>

            <PreviewCard no={10} title="오행 분석">
              <p>{elementAnalysis.summary}</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {(Object.keys(elementAnalysis.counts) as (keyof typeof elementAnalysis.counts)[]).map(
                  (el) => (
                    <div
                      key={el}
                      className="flex items-center gap-2 rounded-box border border-bg bg-bg/40 px-3 py-2"
                    >
                      <span className="text-xs text-textSub">
                        {el === "wood"
                          ? "목(木)"
                          : el === "fire"
                          ? "화(火)"
                          : el === "earth"
                          ? "토(土)"
                          : el === "metal"
                          ? "금(金)"
                          : "수(水)"}
                      </span>
                      <span className="text-sm font-bold text-textMain">
                        {elementAnalysis.counts[el]}
                      </span>
                    </div>
                  )
                )}
              </div>
            </PreviewCard>

            <PreviewCard no={11} title="인생의 기본 흐름">
              <p>{lifeFlow}</p>
            </PreviewCard>
          </div>
        </section>

        <section className="mx-auto max-w-content px-6 py-10">
          <span className="vertical-label text-[11px] text-textSub">— 十年 —</span>
          <h2 className="mt-3 font-serif-kr text-2xl font-bold text-accentRed">
            {user.name}님의 현재부터 10년 운세
          </h2>
          <p className="mt-2 text-sm text-textSub">
            {tenYear[0].year}년부터 {tenYear[9].year}년까지의 흐름을 미리 확인해보세요
          </p>

          <div className="mt-6 flex flex-col gap-4">
            <div className="rounded-card bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="rounded-pill bg-dark px-3 py-1 text-xs font-bold text-accentGoldFrom">
                  {tenYear[0].keyword}
                </span>
                <span className="text-xs text-textSub">
                  {tenYear[0].year}년 · {tenYear[0].ganZhiHangul}({tenYear[0].ganZhiHanja}) ·{" "}
                  {tenYear[0].sipseong}
                </span>
              </div>
              <p className="mt-2.5 text-[15px] leading-relaxed text-textMain">
                {tenYear[0].overview}
              </p>
            </div>

            <div className="rounded-card bg-white p-5 shadow-sm">
              <h4 className="text-sm font-bold text-textMain">앞으로 10년 타임라인</h4>
              <div className="mt-3 flex flex-wrap gap-2">
                {tenYear.map((y) => (
                  <div
                    key={y.year}
                    className="flex flex-col items-center gap-0.5 rounded-box border border-bg bg-bg/40 px-2.5 py-2 text-center"
                  >
                    <span className="text-[10px] text-textSub">{y.year}</span>
                    <span className="text-xs font-bold text-textMain">{y.keyword}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-card bg-white p-4 shadow-sm">
                <span className="text-xs text-textSub">가장 좋은 시기</span>
                <p className="mt-1 text-sm font-bold text-accentRed">
                  {bestYear.year}년 · {bestYear.keyword}
                </p>
                <p className="mt-1 text-xs text-textSub">
                  {bestYear.ganZhiHangul} · {bestYear.sipseong}
                </p>
              </div>
              <div className="rounded-card bg-white p-4 shadow-sm">
                <span className="text-xs text-textSub">주의할 시기</span>
                <p className="mt-1 text-sm font-bold text-textMain">
                  {worstYear.year}년 · {worstYear.keyword}
                </p>
                <p className="mt-1 text-xs text-textSub">
                  {worstYear.ganZhiHangul} · {worstYear.sipseong}
                </p>
              </div>
            </div>

            {tenYear.slice(0, 2).map((y) => (
              <div key={y.year} className="rounded-card bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-textMain">
                    {y.year}년 상세 미리보기
                  </h4>
                  <span className="text-xs text-textSub">
                    {y.ganZhiHangul}({y.ganZhiHanja}) · {y.sipseong}
                  </span>
                </div>
                <p className="mt-2 text-[15px] leading-relaxed text-textMain">{y.overview}</p>
                <div className="mt-3 flex flex-col gap-1.5 text-[14px] leading-relaxed text-textMain">
                  <p>
                    <strong className="text-textMain">재물 — </strong>
                    {y.wealth}
                  </p>
                  <p>
                    <strong className="text-textMain">직업 — </strong>
                    {y.career}
                  </p>
                  <p>
                    <strong className="text-textMain">연애 — </strong>
                    {y.love}
                  </p>
                  <p>
                    <strong className="text-textMain">기회 — </strong>
                    {y.opportunity}
                  </p>
                  <p>
                    <strong className="text-accentRed">주의 — </strong>
                    {y.caution}
                  </p>
                  <p>
                    <strong className="text-accentRed">조언 — </strong>
                    {y.action}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-card bg-dark p-6">
            <p className="text-center text-sm font-medium text-accentGoldFrom">
              여기까지는 무료로 보여드린 미리보기입니다
            </p>
            <ul className="mt-4 flex flex-col gap-3">
              {TEN_YEAR_LOCKED_ITEMS.map((item) => (
                <li key={item} className="flex items-center gap-2.5">
                  <Lock size={14} className="shrink-0 text-white/40" />
                  <span className="text-sm text-white/70">{item}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={handleCheckout}
              className="mt-6 w-full rounded-pill bg-gradient-to-r from-accentGoldFrom to-accentGoldTo py-4 text-base font-bold text-dark"
            >
              전체 AI 인생 리포트 보기
            </button>
          </div>
        </section>

        {storyblocks.map((block) => (
          <StoryblockSection
            key={block.title}
            data={block}
            userName={user.name}
            chars={chars}
          />
        ))}

        <ResultTransition user={user} quote={resultQuote} />
          </>
        )}

        {compatibility && partnerAppData && (
          <>
            <div className="mx-auto max-w-content px-6 pt-6">
              <span className="vertical-label text-[11px] text-textSub">— 相對方 —</span>
              <h2 className="mt-3 font-serif-kr text-2xl font-bold text-textMain">
                {compatibility.partnerName}님의 사주풀이
              </h2>
              <p className="mt-2 text-sm text-textSub">
                {compatibility.partnerName}님의 사주도 {user.name}님과 동일한 깊이로
                풀이해드립니다
              </p>
            </div>

            <PillarTable
              pillars={partnerAppData.user.pillars}
              sinsal={partnerAppData.user.sinsal}
            />

            <ProfileSummaryCard user={partnerAppData.user} />

            <EightCharPreview
              name={partnerAppData.user.name}
              chars={partnerAppData.chars}
            />

            {partnerAppData.storyblocks.map((block) => (
              <StoryblockSection
                key={block.title}
                data={block}
                userName={partnerAppData.user.name}
                chars={partnerAppData.chars}
              />
            ))}

            <CompatibilitySection
              userName={user.name}
              partnerName={compatibility.partnerName}
              result={compatibility.result}
            />
          </>
        )}

        {!isStoryTopic && (
          <>
            <AssetFlowChart
              name={user.name}
              typeLabel={user.typeLabel}
              points={assetFlowPoints}
              lockedList={assetFlowLocked}
            />

            <FortuneTimeline
              nodes={fortuneTimelineNodes}
              lockedList={fortuneTimelineLocked}
            />
          </>
        )}

        <div ref={farewellRef}>
          <FarewellOutro name={user.name} />
        </div>

        <ReportAccordion
          parts={reportParts}
          unlockedCount={unlockedReportItems}
          totalCount={totalReportItems}
        />

        <Testimonials
          list={testimonials}
          totalPaid={totalPaidCount}
          discountPrice={PRICE.sale}
          discountRate={PRICE.discount}
        />

        <MainCTACard
          user={user}
          secretsCount={ctaMeta.secretsCount}
          totalStories={ctaMeta.totalStories}
          readStories={ctaMeta.readStories}
          keywords={ctaMeta.keywords}
          originalPrice={PRICE.original}
          discountPrice={PRICE.sale}
          discountRate={PRICE.discount}
          onClick={handleCheckout}
        />
      </main>

      {/* 구매바가 화면 하단에서 갑자기 튀어나오지 않도록, 광고 배너처럼 팝업되는 대신
          아래에서 조용히 떠오르는 방식으로 등장/퇴장한다.
          예전에는 AnimatePresence로 DOM에서 mount/unmount를 반복했는데, 이 바는
          position:fixed + backdrop-blur라 InsightScene을 지날 때마다(페이지에 5개)
          GPU 레이어가 새로 생성·파괴되어 스크롤 중 컴포지팅 비용이 튀는 원인이었다.
          이제는 DOM에 항상 유지하고 opacity/pointer-events로만 보이기·숨기기를
          처리해 레이어가 페이지 로드 시 한 번만 생성되게 한다. */}
      {insightStateOff ? (
        // insight-state-off 전용 경로 — 위 applyPurchaseBarVisibility가
        // ref로 직접 opacity/transform/pointer-events를 갱신한다. 초기값은
        // showPurchaseBar(state) 기반 motion.div의 "숨김" 상태와 동일하게
        // 맞춰 첫 페인트부터 어긋나지 않게 한다.
        <div
          ref={purchaseBarElRef}
          style={{
            opacity: 0,
            transform: "translateY(24px)",
            pointerEvents: "none",
            transition: "transform 0.5s ease-out, opacity 0.5s ease-out",
          }}
          aria-hidden="true"
        >
          <StickyBottomBar
            originalPrice={PRICE.original}
            discountPrice={PRICE.sale}
            discountRate={PRICE.discount}
            onClick={handleCheckout}
          />
        </div>
      ) : (
        <motion.div
          initial={false}
          animate={{ y: showPurchaseBar ? 0 : 24, opacity: showPurchaseBar ? 1 : 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{ pointerEvents: showPurchaseBar ? "auto" : "none" }}
          aria-hidden={!showPurchaseBar}
        >
          <StickyBottomBar
            originalPrice={PRICE.original}
            discountPrice={PRICE.sale}
            discountRate={PRICE.discount}
            onClick={handleCheckout}
          />
        </motion.div>
      )}
    </>
  );
}
