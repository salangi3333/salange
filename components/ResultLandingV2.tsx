import { Fragment } from "react";
import { Lock } from "lucide-react";
import { RESULT_GUIDE_IMAGE } from "@/lib/guideImages";
import { ReportResult } from "@/lib/reportMapper";
import { Element } from "@/lib/hanjaTables";
import LifePhaseTimeline from "./LifePhaseTimeline";

/**
 * ResultLandingV2 — 기존 ResultLanding(scene 기반 스크롤텔링)과 완전히
 * 분리된 새 결과 페이지. 목적은 두 가지 동시 달성:
 *   1) Galaxy S24 Ultra 등 실제 모바일에서 native window 스크롤이 매끄럽게
 *      동작하는 구조를 유지한다 (검증 완료, 절대 변경하지 않는다).
 *   2) 기존 결과 페이지의 검정·금빛·아이보리 톤, 사주팔자 표, 선녀/배경
 *      이미지, 오행, 동양적 디테일 등 "공들인 비주얼"을 정적으로 되살린다.
 *
 * 지켜야 하는 제약(전부 의도적 — 되돌리지 말 것):
 * - Framer Motion 등 JS 애니메이션 라이브러리를 import하지 않는다.
 * - IntersectionObserver 기반 whileInView 진입 애니메이션, typewriter,
 *   글자/문장 단위 지연 등장을 쓰지 않는다 — 뷰포트에 들어온 본문은
 *   즉시 읽을 수 있어야 한다.
 * - 이미지는 전부 정적(static)이다. 예전 GuideVisual.tsx처럼 motion.div로
 *   감싸 반복 애니메이션(scale 숨쉬기 등)을 거는 방식은 쓰지 않는다.
 * - 별도 scroll container / scroll-snap / fixed·sticky 요소를 두지 않는다.
 * - 무료 구간에는 결제 고정바·가격·할인·카운트다운을 노출하지 않는다.
 *
 * 챕터마다 시각 구조를 의도적으로 다르게 구성했다(같은 카드가 반복되는
 * "템플릿 반복" 느낌을 줄이기 위해) — 02는 본문 중심으로 담백하게, 03은
 * 기운 비교 카드, 04는 시기 카드를 추가로 붙였다. 아이보리 강조 카드는
 * 각 챕터의 "정말 중요한 문장 1개"에만 쓴다.
 *
 * 01(타고난 본질)만 최종 샘플 품질 구조로 확장했다: GOLD 훅(챕터 진입 시
 * 첫 핵심 문장) → 상세 해석 본문 → RED 핵심 통찰(챕터 전체에서 유일,
 * 장식 아님) → 상세 해석 본문 → 아이보리 카드(행동 조언). 02~04는 아직
 * 이 구조로 옮기지 않았다 — data.chapters[1..3] + ChapterHead를 그대로
 * 쓴다. 01은 별도로 data.chapterOne(lib/reportMapper.ts)을 쓴다.
 *
 * `report` prop — lib/reportMapper.ts의 buildReportResult(appData)가 만든
 * 실제 개인화 데이터. app/result-v2/page.tsx가 쿼리스트링의 생년월일시를
 * calculateSaju/buildAppData로 계산해 넘겨준다 — 쿼리가 없으면 prop 자체가
 * undefined가 되어 DEFAULT_REPORT(기존과 동일한 자리채움 문구)로 대체된다.
 * 사주팔자 표/신살/오행 분포/01 챕터 전체/02~04 killpoint·title·highlight/
 * 10년 흐름 제목이 이 prop을 통해 사람마다 달라진다. 기운 비교 카드(03)와
 * 시기 카드(04)의 구체적 값(목(木)/수(水), 2026년/경쟁운)은 아직 스키마에
 * 없어 자리채움 그대로 남아 있다.
 */

// 오행 5색 — 전통 오방색(五方色) 기준: 목=청, 화=적(빨강), 토=황(노랑),
// 금=백(카드가 밝은 아이보리라 흰색 대신 시인성 있는 회색으로 대체), 수=흑(검정).
// SVG fill에는 CSS 변수를 쓸 수 없어 동일 hex를 직접 사용한다(tailwind.config.js의
// wood/fire/earth/metal/water는 이 화면(ResultLandingV2)이 아니라 PillarTable.tsx
// 전용 값이라 이 상수와 별개다 — 원래부터 서로 다른 값이었다).
// [가독성 수정 ①] 수(水)의 원래 값(#141210)이 이 섹션 배경(sceneBg #171412 /
// sceneBgAlt #1C1815)과 거의 같은 검정이라 그래프·범례 모두에서 사실상
// 안 보였다 — 그래프 원과 하단 범례는 원래부터 이 상수 하나를 그대로
// 같이 쓰고 있었으므로(색 불일치가 아니라 배경과 겹치는 문제), 수만
// 배경과 뚜렷이 구분되는 블루로 바꿨다(1차 수정).
// [가독성 수정 ②] 그런데 목의 기존 값(#173F70)도 짙은 남색이라, 수를
// 블루로 바꾸고 나니 범례에서 목·수 둘 다 "파란 계열"로 보여 서로
// 구분이 잘 안 됐다(실제 모바일 화면에서 확인됨) — "청"을 초록 계열로
// 표현해 목만 그린으로 바꿨다(전통 오방색에서도 청=파랑/초록 둘 다
// 통용되는 범위). 화·토·금은 그대로다.
const ELEMENT_COLORS = {
  wood: "#1F6B47",
  fire: "#9C1F13",
  earth: "#8A5D00",
  metal: "#4C4A45",
  water: "#2B6CB0",
};

// 오행 각 기운의 뜻 — 사람마다 달라지는 데이터가 아니라 고정된 사전적 의미라
// ReportResult가 아니라 여기 정적으로 둔다(기존 화면의 범례와 동일한 문구).
// 사주팔자 표의 한자 글자색을 오행별로 물들이는 헬퍼 — 실제 만세력 표기
// 관례대로 칸 배경이 아니라 글자 자체를 오방색으로 칠한다. 시간 미상 등
// elementKey가 없는 칸은 무채색(기본 글자색)으로 둔다 — 값을 지어내지 않는다.
function elementTextColor(key?: Element): string | undefined {
  if (!key) return undefined;
  return ELEMENT_COLORS[key];
}

// "지금" 대운 카드 다음, 未開封(잠금 목차) 진입 직전에 넣는 고정 전환
// 문단 — 승인된 고정 텍스트(사람마다 바뀌지 않음). 예전엔 이 자리에
// daYunFlowPublic.next(다음 대운 상세: 몇 세부터/간지가 무엇으로 바뀌는지)를
// 그대로 노출했는데, 무료 결과에서 다음 대운을 미리 설명해버리면 궁금증이
// 해소돼버린다는 판단으로 상세 설명 대신 이 문단으로 교체했다(승인됨).
const NEXT_FLOW_TRANSITION =
  "앞으로의 흐름에서 중요한 것은 단순히 운이 좋으냐 나쁘냐가 아닙니다.\n돈이 언제 움직이는지, 어떤 일을 잡았을 때 결과가 커지는지, 누구와의 인연이 삶에 들어오는지, 그리고 어느 해에 삶의 방향이 크게 달라지는지.\n같은 10년 안에서도 그 시기는 모두 다르게 찾아옵니다.";

// 잠금 목차 4개의 제목·질문 문구 — 승인된 고정 텍스트(사람마다 바뀌지 않음).
// 각 카드의 흐림 미리보기(lockedPreview)만 lifeFlow.toc의 실제 계산값을 쓴다.
const LOCKED_TOC_ITEMS: { title: string; question: string }[] = [
  { title: "일과 재물", question: "내 돈과 일은 언제 크게 움직일까?" },
  { title: "사랑과 인연", question: "내 편이 되어줄 인연은 언제 들어올까?" },
  { title: "인생의 전환점", question: "내 삶이 크게 방향을 바꾸는 때는 언제일까?" },
  { title: "앞으로의 10년", question: "2027년부터, 내 운은 어떻게 달라질까?" },
];

const ELEMENT_MEANING: Record<ReportResult["elementStrongest"], string> = {
  wood: "성장 · 배움 · 새로운 시작",
  fire: "열정 · 추진력 · 표현",
  earth: "안정 · 현실 · 책임",
  metal: "결단 · 원칙 · 정리",
  water: "지혜 · 직관 · 유연함",
};

// report prop이 없을 때 쓰는 기본값 — 기존에 하드코딩되어 있던 것과
// 완전히 같은 문구/구조다. 이 값 자체를 실제 원고로 바꾸는 작업은
// 이번 단계 범위가 아니다(추후 별도 원고 연결 예정).
const DEFAULT_REPORT: ReportResult = {
  userName: "회원",
  summaryTitle: "",
  dayMasterLabel: "",
  pillars: {
    stems: [
      { label: "시주", hanja: "壬", hangul: "임", element: "水(수)", elementKey: "water", sipseong: "정재" },
      {
        label: "일주",
        hanja: "戊",
        hangul: "무",
        element: "土(토)",
        elementKey: "earth",
        sipseong: "일간",
        isDay: true,
      },
      { label: "월주", hanja: "甲", hangul: "갑", element: "木(목)", elementKey: "wood", sipseong: "편관" },
      { label: "년주", hanja: "丙", hangul: "병", element: "火(화)", elementKey: "fire", sipseong: "편인" },
    ],
    branches: [
      { hanja: "戌", hangul: "술", element: "土(토)", elementKey: "earth" },
      { hanja: "子", hangul: "자", element: "水(수)", elementKey: "water" },
      { hanja: "寅", hangul: "인", element: "木(목)", elementKey: "wood" },
      { hanja: "午", hangul: "오", element: "火(화)", elementKey: "fire" },
    ],
  },
  sinsal: ["화개살", "역마살", "도화살"],
  elementBalance: [
    { key: "wood", label: "목(木)", value: 15 },
    { key: "fire", label: "화(火)", value: 35 },
    { key: "earth", label: "토(土)", value: 25 },
    { key: "metal", label: "금(金)", value: 10 },
    { key: "water", label: "수(水)", value: 15 },
  ],
  elementStrongest: "fire",
  elementWeakest: "metal",
  chapterOne: {
    chapterLabel: "第一章",
    title: "타고난 본질",
    goldHook: "(자리채움) 타고난 개척자, 그러나 가지치기를 두려워하지 않아야 한다",
    body1: ['(자리채움) 타고난 기질과 명리적 근거 문단이 이 자리에 들어갑니다.'],
    body2: [
      "(자리채움) 실제 생활에서 드러나는 방식을 짚는 문단이 이 자리에 들어갑니다.",
      "(자리채움) 일지 보정 문장이 이 자리에 들어갑니다.",
    ],
    redInsight: "(자리채움 · 핵심 통찰) 이 챕터에서 가장 중요한 맹점 한 문장이 이 자리에 들어갑니다.",
    body3: [
      "(자리채움) 이 특징이 장점이 되는 순간을 짚는 문단이 이 자리에 들어갑니다.",
      "(자리채움) 이 특징이 문제가 되는 순간을 짚는 문단이 이 자리에 들어갑니다.",
    ],
    body4: [
      "(자리채움) 관계에서 드러나는 인식 차이를 짚는 문단이 이 자리에 들어갑니다.",
      "(자리채움) 실제 행동에서 드러나는 대조를 짚는 문단이 이 자리에 들어갑니다.",
    ],
    cardText: "(자리채움) 기억해야 할 행동 조언 한 문장이 이 자리에 들어갑니다.",
    badges: [
      { label: "통찰력", score: 88 },
      { label: "집중력", score: 90 },
      { label: "섬세함", score: 85 },
    ],
    teaser: {
      lead: "이 기질이 관계 안에서 반복되는 방식도 이미 드러나 있습니다 —",
      blurred: "(자리채움) 다음 장에서 드러나는 실제 문장이 이 자리에 들어갑니다.",
    },
  },
  chapters: [
    {
      id: "chapter-01",
      chapterLabel: "第一章",
      title: "타고난 본질",
      killpoint: "이 사람을 한 문장으로 요약하면",
      body: [
        "(임시 문구) 일간을 중심으로 타고난 기질을 정리하는 첫 번째 문단이 이 자리에 들어갑니다.",
        "(임시 문구) 그 기질이 실제 삶에서 어떻게 드러나는지 짚는 두 번째 문단이 이 자리에 들어갑니다.",
      ],
      highlight: "(핵심 문장 자리채움) 이 사람을 한 문장으로 요약하는 문장이 들어갑니다.",
    },
    {
      id: "chapter-02",
      chapterLabel: "第二章",
      title: "성격의 이면",
      killpoint: "화개살 — 혼자일 때 진짜 내가 보인다",
      body: [
        "(임시 문구) 겉으로 보이는 모습을 짚는 첫 번째 문단이 이 자리에 들어갑니다.",
        "(임시 문구) 그 이면의 실제 성향을 짚는 두 번째 문단이 이 자리에 들어갑니다.",
      ],
      highlight: "(핵심 문장 자리채움) 잘 드러나지 않는 진짜 성향을 짚는 문장이 들어갑니다.",
    },
    {
      id: "chapter-03",
      chapterLabel: "第三章",
      title: "사람과 인연",
      killpoint: "가까워지는 속도와 멀어지는 이유는 다르다",
      body: [
        "(임시 문구) 관계에서 반복되는 패턴을 짚는 첫 번째 문단이 이 자리에 들어갑니다.",
        "(임시 문구) 그 패턴이 어디서 비롯되는지 짚는 두 번째 문단이 이 자리에 들어갑니다.",
      ],
      highlight: "(핵심 문장 자리채움) 인연이 가까워지고 멀어지는 지점을 짚는 문장이 들어갑니다.",
    },
    {
      id: "chapter-04",
      chapterLabel: "第四章",
      title: "재물",
      killpoint: "2026년, 돈의 흐름이 한 번 바뀝니다",
      body: [
        "(임시 문구) 돈이 들어오고 나가는 평소 흐름을 짚는 첫 번째 문단이 이 자리에 들어갑니다.",
        "(임시 문구) 올해 특히 주의할 지점을 짚는 두 번째 문단이 이 자리에 들어갑니다.",
      ],
      highlight: "(핵심 문장 자리채움) 재물이 새는 지점과 지키는 법을 짚는 문장이 들어갑니다.",
    },
  ],
  tenYearPreview: [
    { period: "2028 – 2030", title: "(개인별 핵심 흐름 제목)", locked: true },
    { period: "2031 – 2033", title: "(개인별 핵심 흐름 제목)", locked: true },
    { period: "2034 – 2037", title: "(개인별 핵심 흐름 제목)", locked: true },
  ],
};

// 사주팔자 표는 기존 PillarScene의 시각적 톤(다크 배경 + 아이보리 카드 +
// 금빛 강조, 일간 칸 하이라이트)만 참고했고 구현은 새로 작성했다. 실제
// 데이터는 report.pillars(=user.pillars/branches를 표시용 문자열로 변환한
// 것)에서 온다 — report가 없으면 DEFAULT_REPORT.pillars로 대체된다.

/** 챕터 공통 머리(한자 라벨 + 제목 + 킬포인트) — 정적, 애니메이션 없음 */
function ChapterHead({
  chapterLabel,
  title,
  killpoint,
}: {
  chapterLabel: string;
  title: string;
  killpoint: string;
}) {
  return (
    <>
      {/* 챕터 한자 표기 — 중앙 정렬(대분류 제목). 아래 해석 제목/본문은 좌측 정렬 유지 */}
      <span className="block text-center font-serif-kr text-3xl font-bold text-sceneGold">
        {chapterLabel}
      </span>
      <h2 className="mt-2 font-serif-kr text-[22px] font-bold leading-snug text-sceneText sm:text-[26px]">
        {title}
      </h2>
      {/* 킬포인트 — 챕터당 가장 중요한 한 문장. 붉은색은 이 자리에만 쓴다 */}
      <p className="mt-4 font-serif-kr text-[17px] font-bold leading-snug text-sceneRed sm:text-[19px]">
        {wrapHanjaTokens(killpoint)}
      </p>
    </>
  );
}

/** 핵심 문장 카드 — 아이보리 + 금빛 좌측 강조선. 챕터당 "정말 중요한 문장" 1개에만 사용 */
function HighlightCard({ text }: { text: string }) {
  return (
    <div className="relative mt-6 overflow-hidden rounded-card border border-sceneGold/40 bg-sceneCard py-4 pl-5 pr-4">
      <span className="absolute inset-y-0 left-0 w-[3px] bg-sceneGold" />
      <p className="font-serif-kr text-[15px] font-bold leading-relaxed text-sceneCardText">
        {wrapHanjaTokens(text)}
      </p>
    </div>
  );
}

/** 잠재력 배지 — GAN_PROFILE[dayGan].potential.badges 그대로. 일간 10종
 * 전량 보유한 실제 데이터라, 두 줄 랩(flex-wrap)만 하면 모바일에서도
 * 폰트 크기를 줄이지 않고 들어간다(사전 검증 완료). */
function BadgeRow({ items }: { items: { label: string; score: number }[] }) {
  return (
    <div className="mt-3 flex flex-wrap justify-center gap-2">
      {items.map((b) => (
        <span
          key={b.label}
          className="rounded-pill bg-sceneCard px-3.5 py-2 text-[13.5px] text-sceneCardText"
        >
          {b.label} <strong className="font-bold text-accentGoldTo">{b.score}</strong>
        </span>
      ))}
    </div>
  );
}

/** 챕터 전환용 블러 다리 — 다음 장의 실제 문장 일부를 블러 처리해 궁금증만
 * 남긴다. 무료→무료 전환(챕터1→챕터2)이라 자물쇠 아이콘은 붙이지 않는다 —
 * 자물쇠는 실제 유료 경계에만 쓴다는 원칙 유지. */
function BlurBridge({ lead, blurred }: { lead: string; blurred: string }) {
  return (
    <div className="mt-8 rounded-card border border-sceneGold/25 bg-sceneBgAlt px-4 py-4">
      <p className="text-[13.5px] leading-relaxed text-sceneTextSub">{lead}</p>
      <p className="mt-1.5 select-none text-[13.5px] italic leading-relaxed text-sceneTextSub/90 blur-[5px]">
        {blurred}
      </p>
    </div>
  );
}

/**
 * 01장 전용 편집 소제목. 챕터 대제목(第一章, 중앙 정렬)과는 다르게 좌측
 * 정렬 + 짧은 금색 마커 — "목차 항목"이 아니라 "다음 장면으로의 전환"
 * 느낌만 준다. 위 여백만으로 단락 전환을 표시하고, 별도 구분선/빈 공간은
 * 두지 않는다.
 */
function ChapterOneSubheading({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-10 mb-3 flex items-center justify-center gap-2 first:mt-0">
      <span aria-hidden className="h-px w-4 bg-sceneGold/70" />
      <h3 className="font-serif-kr text-[15px] font-bold tracking-wide text-sceneGold">{children}</h3>
    </div>
  );
}

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 01장 gold 강조 — 전부 "본문 안의 짧은 구절만" 골라 감싸는 순수 렌더링
 * 유틸이다. 문장 전체를 gold로 바꾸지 않는다(문단 대부분은 일반 본문색
 * 그대로). 어떤 유저가 오든 항상 같은 규칙(고정된 어휘/위치)으로 골라내는
 * 것이지, 특정 사용자 문장을 손으로 골라 하드코딩한 게 아니다.
 *
 * 아래 4개 컴포넌트는 원래 gold 강조만 하고 wrapHanjaTokens는 거치지
 * 않았다 — 그 결과 이 4개가 맡는 문단(body1 마지막 문단/body2[1]/body3[1]/
 * body4[0])에 "명리용어(한자)조사" 패턴이 오면 모바일에서 중간에 갈라지는
 * 문제가 있었다. gold로 감싸는 조각/감싸지 않는 조각 모두 wrapHanjaTokens를
 * 한 번 더 통과시켜, 어느 축에 어떤 명식이 오든 같은 규칙이 적용되게
 * 했다 — 텍스트 자체는 그대로, 렌더링 시 nowrap 구간만 추가된다.
 */
function GoldPhrases({ text, phrases }: { text: string; phrases: string[] }) {
  const found = phrases.filter((p) => text.includes(p));
  if (found.length === 0) return <>{wrapHanjaTokens(text)}</>;
  const pattern = new RegExp(`(${found.map(escapeForRegExp).join("|")})`, "g");
  const parts = text.split(pattern);
  return (
    <>
      {parts.map((part, i) =>
        found.includes(part) ? (
          <strong key={i} className="font-bold text-sceneGold">
            {part}
          </strong>
        ) : (
          <Fragment key={i}>{wrapHanjaTokens(part)}</Fragment>
        )
      )}
    </>
  );
}

/** 첫 쉼표 앞 구절만 gold(쉼표가 없으면 문장 전체 — 원래 짧은 문장이라 그대로 둠). */
function GoldLeadClause({ text }: { text: string }) {
  const idx = text.indexOf(",");
  if (idx === -1) {
    return (
      <strong className="font-bold text-sceneGold">{wrapHanjaTokens(text)}</strong>
    );
  }
  return (
    <>
      <strong className="font-bold text-sceneGold">{wrapHanjaTokens(text.slice(0, idx))}</strong>
      {wrapHanjaTokens(text.slice(idx))}
    </>
  );
}

/** 첫 줄바꿈 앞(=body3[1]에서 항상 고정으로 붙는 전환 문장 한 줄)만 gold. */
function GoldFirstLine({ text }: { text: string }) {
  const idx = text.indexOf("\n");
  if (idx === -1) {
    return <strong className="font-bold text-sceneGold">{wrapHanjaTokens(text)}</strong>;
  }
  return (
    <>
      <strong className="font-bold text-sceneGold">{wrapHanjaTokens(text.slice(0, idx))}</strong>
      {wrapHanjaTokens(text.slice(idx))}
    </>
  );
}

/** 문장 안의 따옴표(" ") 인용구만 gold — 오행 5종 CH1_TRUTH_SCENE 전부
 * 같은 패턴(짧은 인용구 한 개)을 쓰기 때문에 사용자와 무관하게 적용된다. */
function GoldQuoted({ text }: { text: string }) {
  const match = text.match(/[“"]([^”"]+)[”"]/);
  if (!match) return <>{wrapHanjaTokens(text)}</>;
  const full = match[0];
  const idx = text.indexOf(full);
  return (
    <>
      {wrapHanjaTokens(text.slice(0, idx))}
      <strong className="font-bold text-sceneGold">{full}</strong>
      {wrapHanjaTokens(text.slice(idx + full.length))}
    </>
  );
}

/** buildSynthesis()가 조합에 쓰는 고정 어휘 그대로 — chapterOneNarrative.ts
 * 원문을 바꾸지 않고, 렌더링 단계에서 이 단어들이 나오면 gold로만 감싼다. */
const CHAPTER_ONE_FORCE_NOUNS = ["거드는 힘", "짓누르는 힘", "풀어내는 힘", "쌓는 힘", "받쳐주는 힘"];

// "단어(한자)조사" 형태(예: 유금(酉金)은, 편재(偏財)가, 정화(丁火)에게는)만
// 골라 그 구간에만 nowrap을 건다 — 문단 전체 nowrap이 아니다. 괄호 안은
// 한자 병기뿐 아니라 "지장간(중기)", "지금(35–44세)"처럼 짧은 한글/숫자
// 부기도 같은 파열 위험을 가져 함께 잡는다. 괄호 앞뒤 길이를 짧게 제한해,
// 이 패턴과 무관한 일반 괄호 설명(긴 부연 등)까지 넓게 물지 않게 했다.
const HANJA_TOKEN_RE = /([가-힣A-Za-z0-9]{1,10}\([^()]{1,12}\)[가-힣]{0,4})/g;

/** 1~4장 본문 문구는 그대로 두고, 화면에 그릴 때만 위 패턴 구간을
 * <span style="white-space:nowrap">으로 감싼다 — 텍스트 내용/개수는
 * 바뀌지 않는다(매치가 없으면 원래 문자열을 그대로 반환). */
function wrapHanjaTokens(text: string): React.ReactNode {
  const parts = text.split(HANJA_TOKEN_RE);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} style={{ whiteSpace: "nowrap" }}>
        {part}
      </span>
    ) : (
      part
    )
  );
}

/** 작은 인장(印章) 디테일 — 정적 SVG, 애니메이션 없음 */
function SealMark() {
  return (
    <svg
      width="34"
      height="34"
      viewBox="0 0 34 34"
      aria-hidden
      style={{ transform: "rotate(-6deg)" }}
      className="text-sceneRed/70"
    >
      <rect x="2" y="2" width="30" height="30" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
      <text x="17" y="23" textAnchor="middle" fontSize="16" fontFamily="serif" fill="currentColor">
        命
      </text>
    </svg>
  );
}

/** 붓선 스타일 구분선 — 정적 SVG, 애니메이션 없음 */
function BrushDivider() {
  return (
    <svg width="120" height="10" viewBox="0 0 120 10" aria-hidden className="mx-auto text-sceneGold/50">
      <path
        d="M2 6 C 20 3, 40 8, 60 5 C 80 2, 100 7, 118 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** 오행 밸런스 다이어그램 — 오각형 배치의 정적 SVG. 애니메이션 없음 */
function FiveElementDiagram({ balance }: { balance: ReportResult["elementBalance"] }) {
  const cx = 140;
  const cy = 130;
  const r = 92;
  // 오각형 5개 꼭짓점 좌표 (12시 방향부터 시계방향)
  const points = balance.map((el, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    return {
      ...el,
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  });

  return (
    <div className="mt-6 rounded-card border border-sceneGold/20 bg-sceneBgAlt px-4 py-6">
      <svg viewBox="0 0 280 260" style={{ width: "100%", height: "auto" }} aria-hidden role="img">
        {/* 상생 순환을 잇는 정적 연결선 */}
        {points.map((p, i) => {
          const next = points[(i + 1) % points.length];
          return (
            <line
              key={`line-${i}`}
              x1={p.x}
              y1={p.y}
              x2={next.x}
              y2={next.y}
              stroke="rgba(212,163,74,0.25)"
              strokeWidth={1}
            />
          );
        })}
        {points.map((p) => (
          <g key={p.key}>
            <circle cx={p.x} cy={p.y} r={18 + p.value * 0.4} fill={ELEMENT_COLORS[p.key]} opacity={0.85} />
            <text x={p.x} y={p.y + 5} textAnchor="middle" fontSize="14" fill="#FFF7EA" fontWeight={700}>
              {p.label[0]}
            </text>
          </g>
        ))}
      </svg>
      <ul className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {balance.map((el) => (
          <li key={el.key} className="flex items-center gap-1.5 text-[11px] text-sceneTextSub">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: ELEMENT_COLORS[el.key] }}
            />
            {el.label} {el.value}%
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ResultLandingV2({ report }: { report?: ReportResult } = {}) {
  const data = report ?? DEFAULT_REPORT;

  return (
    <main className="bg-sceneBg text-sceneText">
      {/* ── 사주팔자 / 일간 ───────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-white/5 bg-sceneBg px-6 py-16 sm:py-20">
        {/* 점묘 패턴 — 정적 장식. 애니메이션 없음 */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(200,155,60,0.5) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />

        <div className="relative mx-auto w-full max-w-content text-center">
          <div className="flex items-center justify-center gap-2">
            <SealMark />
            <p className="text-sm tracking-[0.2em] text-sceneGold/80">命式 · 사주팔자</p>
          </div>
          <h1 className="mt-2 text-center font-serif-kr text-2xl font-bold text-sceneText">
            타고난 여덟 글자
          </h1>

          {/* 만세력 표 형식 — 좌측에 천간/지지 행 라벨, 상단에 시주/일주/월주/년주
              열 헤더를 두고, 칸 배경이 아니라 한자 글자색을 오행별로 칠한다. */}
          <div className="mt-8 overflow-hidden rounded-card border border-sceneGold/40 bg-sceneCard shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
            <div className="grid grid-cols-[2.75rem_repeat(4,1fr)]">
              <div className="border-b border-r border-sceneGold/15" />
              {data.pillars.stems.map((s) => (
                <div
                  key={`head-${s.label}`}
                  className={`border-b border-r border-sceneGold/15 py-2 text-center text-[11px] last:border-r-0 ${
                    s.isDay ? "font-bold text-sceneGold" : "text-sceneCardText/60"
                  }`}
                >
                  {s.label}
                </div>
              ))}

              <div className="flex items-center justify-center border-r border-sceneGold/15 text-[11px] text-sceneCardText/50">
                천간
              </div>
              {data.pillars.stems.map((s) => (
                <div
                  key={s.label}
                  className={`flex flex-col items-center gap-1 border-r border-sceneGold/15 px-1 py-4 last:border-r-0 ${
                    s.isDay ? "border-b-2 border-sceneGold" : ""
                  }`}
                >
                  {s.isDay && <span className="text-[10px] font-bold text-sceneGold">★ 일간</span>}
                  <span
                    className="font-serif-kr text-[26px] font-bold"
                    style={{ color: elementTextColor(s.elementKey) }}
                  >
                    {s.hanja}
                  </span>
                  <span className="text-[11px] text-sceneCardText/60">{s.hangul}</span>
                  <span className="text-[10px] font-medium text-sceneGold/90">{s.element}</span>
                  <span className="text-[10px] text-sceneCardText/60">{s.sipseong}</span>
                </div>
              ))}

              <div className="flex items-center justify-center border-r border-t border-sceneGold/15 text-[11px] text-sceneCardText/50">
                지지
              </div>
              {data.pillars.branches.map((b, i) => (
                <div
                  key={`branch-${i}`}
                  className="flex flex-col items-center gap-1 border-r border-t border-sceneGold/15 px-1 py-4 last:border-r-0"
                >
                  <span
                    className="font-serif-kr text-xl font-bold"
                    style={{ color: elementTextColor(b.elementKey) }}
                  >
                    {b.hanja}
                  </span>
                  <span className="text-[11px] text-sceneCardText/60">{b.hangul}</span>
                  <span className="text-[10px] font-medium text-sceneGold/90">{b.element}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {data.sinsal.map((tag) => (
              <span
                key={tag}
                className="rounded-pill border border-sceneGold/40 bg-sceneCard px-3 py-1.5 text-xs font-medium text-sceneCardText shadow-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="border-b border-white/5 bg-sceneBg py-6">
        <BrushDivider />
      </div>

      {/* ── 01~04 챕터: 챕터마다 시각 구조를 다르게 구성 ───────────── */}
      {/* 第一章 — 최종 샘플 구조: GOLD 훅 → 본문 → RED 핵심 통찰(챕터당 1개) → 본문 → 아이보리 카드 */}
      <section className="border-b border-white/5 bg-sceneBg px-6 py-14 sm:py-16">
        <div className="mx-auto w-full max-w-content2 text-center">
          <span className="block text-center font-serif-kr text-3xl font-bold text-sceneGold">
            {data.chapterOne.chapterLabel}
          </span>
          <h2 className="mt-2 font-serif-kr text-[22px] font-bold leading-snug text-sceneText sm:text-[26px]">
            {data.chapterOne.title}
          </h2>

          {/* GOLD 훅 — 챕터 진입 직후 첫 핵심 문장(1개) */}
          <p className="mt-4 whitespace-pre-line font-serif-kr text-[17px] font-bold leading-snug text-sceneGold sm:text-[19px]">
            {wrapHanjaTokens(data.chapterOne.goldHook)}
          </p>

          {/* 소제목① 예리함은 어디서 오는가 — body1[0:4](본질+일간·일지). gold 없음. */}
          <ChapterOneSubheading>예리함은 어디서 오는가</ChapterOneSubheading>
          <div className="space-y-4">
            {data.chapterOne.body1.slice(0, 4).map((p, idx) => (
              <p key={idx} className="whitespace-pre-line text-[15px] leading-[1.95] text-sceneBody">
                {wrapHanjaTokens(p)}
              </p>
            ))}
          </div>

          {/* 소제목② 이 사람 안에서 부딪히는 힘들 — body1[4:](다른 글자와 기운).
              마지막 문장(종합 문장)에서만, 그 안의 짧은 어휘만 gold. */}
          <ChapterOneSubheading>이 사람 안에서 부딪히는 힘들</ChapterOneSubheading>
          <div className="space-y-4">
            {data.chapterOne.body1.slice(4).map((p, idx, arr) => (
              <p key={idx} className="whitespace-pre-line text-[15px] leading-[1.95] text-sceneBody">
                {idx === arr.length - 1 ? (
                  <GoldPhrases text={p} phrases={CHAPTER_ONE_FORCE_NOUNS} />
                ) : (
                  wrapHanjaTokens(p)
                )}
              </p>
            ))}
          </div>

          {/* 소제목③ 이 기준은 어디를 향하는가 — body2(기질+실제 삶) 전체.
              [1](일간 프로필의 "다만~" 문장) 앞 구절만 gold. */}
          <ChapterOneSubheading>이 기준은 어디를 향하는가</ChapterOneSubheading>
          {/* 천을귀인 보정 오프닝 — 일지가 실제로 천을귀인에 해당하는 사람에게만
              뜬다(cheoneulOpening이 undefined면 아무것도 렌더링하지 않는다). */}
          {data.chapterOne.cheoneulOpening && (
            <p className="mb-4 text-[15px] leading-[1.95] text-sceneBody">
              {wrapHanjaTokens(data.chapterOne.cheoneulOpening)}
            </p>
          )}
          <div className="space-y-4">
            {data.chapterOne.body2.map((p, idx) => (
              <p key={idx} className="whitespace-pre-line text-[15px] leading-[1.95] text-sceneBody">
                {idx === 1 ? <GoldLeadClause text={p} /> : wrapHanjaTokens(p)}
              </p>
            ))}
          </div>

          {/* 타고난 잠재력 배지 — GAN_PROFILE 실제 수치, 일간마다 자동으로 달라진다 */}
          <p className="mt-6 text-[15px] leading-[1.95] text-sceneBody">
            타고난 잠재력을 수치로 옮기면 이렇습니다.
          </p>
          <BadgeRow items={data.chapterOne.badges} />

          {/* RED — 이 챕터 전체에서 유일한 핵심 통찰 문장 */}
          <p className="mt-8 whitespace-pre-line font-serif-kr text-[17px] font-bold leading-snug text-sceneRed sm:text-[19px]">
            {wrapHanjaTokens(data.chapterOne.redInsight)}
          </p>

          {/* 소제목④ 칼끝이 자신을 향하는 순간 — body3(그림자) 전체.
              [1]의 첫 줄(전환 문장)만 gold. */}
          <ChapterOneSubheading>칼끝이 자신을 향하는 순간</ChapterOneSubheading>
          <div className="space-y-4">
            {data.chapterOne.body3.map((p, idx) => (
              <p key={idx} className="whitespace-pre-line text-[15px] leading-[1.95] text-sceneBody">
                {idx === 1 ? <GoldFirstLine text={p} /> : wrapHanjaTokens(p)}
              </p>
            ))}
          </div>

          {/* 소제목⑤ 가까워질수록 달라지는 온도 — body4(관계) 전체.
              [0]의 인용구만 gold. */}
          <ChapterOneSubheading>가까워질수록 달라지는 온도</ChapterOneSubheading>
          <div className="space-y-4">
            {data.chapterOne.body4.map((p, idx) => (
              <p key={idx} className="whitespace-pre-line text-[15px] leading-[1.95] text-sceneBody">
                {idx === 0 ? <GoldQuoted text={p} /> : wrapHanjaTokens(p)}
              </p>
            ))}
          </div>

          <HighlightCard text={data.chapterOne.cardText} />

          {/* 챕터 전환 블러 다리 — 다음 장 실제 문장 일부를 인용, 무료→무료라 자물쇠 없음 */}
          {data.chapterOne.teaser && (
            <BlurBridge lead={data.chapterOne.teaser.lead} blurred={data.chapterOne.teaser.blurred} />
          )}
        </div>
      </section>

      {/* 第二章 — richBody가 있으면(타고난 기질) 소제목 2개 + RED 한 줄 +
          블러 다리로 된 풍부한 레이아웃, 없으면 기존 담백한 레이아웃 */}
      <section className="border-b border-white/5 bg-sceneBgAlt px-6 py-14 sm:py-16">
        <div className="mx-auto w-full max-w-content2 text-center">
          <ChapterHead {...data.chapters[1]} />
          {data.chapters[1].richBody ? (
            <>
              {/* 관살혼잡처럼 실제로 해당하는 사람에게만 뜨는 도입 단락 */}
              {data.chapters[1].richBody.intro && (
                <p className="mt-6 text-[15px] leading-[1.95] text-sceneBody">
                  {wrapHanjaTokens(data.chapters[1].richBody.intro)}
                </p>
              )}
              <ChapterOneSubheading>{data.chapters[1].richBody.subheadingA}</ChapterOneSubheading>
              <div className="space-y-4">
                {data.chapters[1].richBody.bodyA.map((p, idx) => (
                  <p key={idx} className="text-[15px] leading-[1.95] text-sceneBody">
                    {wrapHanjaTokens(p)}
                  </p>
                ))}
              </div>

              {data.chapters[1].richBody.redLine && (
                <p className="mt-8 whitespace-pre-line font-serif-kr text-[17px] font-bold leading-snug text-sceneRed sm:text-[19px]">
                  {wrapHanjaTokens(data.chapters[1].richBody.redLine)}
                </p>
              )}

              <ChapterOneSubheading>{data.chapters[1].richBody.subheadingB}</ChapterOneSubheading>
              <div className="space-y-4">
                {data.chapters[1].richBody.bodyB.map((p, idx) => (
                  <p key={idx} className="text-[15px] leading-[1.95] text-sceneBody">
                    {wrapHanjaTokens(p)}
                  </p>
                ))}
              </div>

              <HighlightCard text={data.chapters[1].highlight} />

              {data.chapters[1].richBody.teaser && (
                <BlurBridge
                  lead={data.chapters[1].richBody.teaser.lead}
                  blurred={data.chapters[1].richBody.teaser.blurred}
                />
              )}
            </>
          ) : (
            <>
              <div className="mt-6 space-y-4">
                {data.chapters[1].body.map((p, idx) => (
                  <p key={idx} className="text-[15px] leading-[1.95] text-sceneBody">
                    {wrapHanjaTokens(p)}
                  </p>
                ))}
              </div>
              <HighlightCard text={data.chapters[1].highlight} />
            </>
          )}
        </div>
      </section>

      {/* 第三章 — 살아가는 방식과 관계운. 데이터 바인딩만 사용(레이아웃은
          그대로) — data.chapters[2]가 이제 chapterThreeNarrative.ts가
          만든 개인화 결과다. */}
      <section className="border-b border-white/5 bg-sceneBg px-6 py-14 sm:py-16">
        <div className="mx-auto w-full max-w-content2 text-center">
          <ChapterHead {...data.chapters[2]} />
          <div className="mt-6 space-y-4">
            {data.chapters[2].body.map((p, idx) => (
              <p key={idx} className="text-[15px] leading-[1.95] text-sceneBody">
                {wrapHanjaTokens(p)}
              </p>
            ))}
          </div>

          {/* 기운 비교 카드는 출시 전 감사에서 하드코딩("목(木)/수(水)")으로
              확인돼 제거했다 — 3챕터(살아가는 방식과 관계운) 최종 원고와
              개인화 규칙이 들어오기 전까지는 숨김 처리(임의 fallback 금지). */}

          <HighlightCard text={data.chapters[2].highlight} />
        </div>
      </section>

      {/* 제2장 — 사랑과 인연. 재물운(第四章)이 4·5·6장을 하나의 대제목
          아래 하위 섹션 3개로 묶은 것과 같은 패턴이다. ①~⑤ 각각에
          第二章/第三章 같은 새 한자 대제목을 붙이지 않고, 대제목은
          "제2장"(한글, 기존 第一~四章 한자 번호 체계와 겹치지 않도록
          구분) 한 번만 표시한 뒤 ChapterOneSubheading(1장에서 이미 쓰는
          소제목 스타일 재사용, 새 컴포넌트 아님)으로 ①~⑤ 경계만
          나눈다. data.chapterLove는 reportMapper.ts가 이미 승인·동결된
          ①~⑤ narrative 함수 5개의 문단을 그대로 옮겨 담은 것뿐이라 이
          컴포넌트에서 새 문장을 만들지 않는다. */}
      {data.chapterLove && (
        <section className="border-b border-white/5 bg-sceneBgAlt px-6 py-14 sm:py-16">
          <div className="mx-auto w-full max-w-content2 text-center">
            <span className="block text-center font-serif-kr text-3xl font-bold text-sceneGold">
              {data.chapterLove.chapterLabel}
            </span>
            <h2 className="mt-2 font-serif-kr text-[22px] font-bold leading-snug text-sceneText sm:text-[26px]">
              {data.chapterLove.title}
            </h2>

            {data.chapterLove.sections.map((sec, idx) => (
              <Fragment key={idx}>
                <ChapterOneSubheading>{sec.heading}</ChapterOneSubheading>
                <div className="space-y-4">
                  {sec.body.map((p, pIdx) => (
                    <p key={pIdx} className="text-[15px] leading-[1.95] text-sceneBody">
                      {wrapHanjaTokens(p)}
                    </p>
                  ))}
                </div>
              </Fragment>
            ))}
          </div>
        </section>
      )}

      {/* 第四章 — 재물운. 예전에는 4·5·6장을 각각 독립된 "第X章"으로
          표시해, 재물이라는 한 주제가 3개의 별도 챕터처럼 연속 나열되는
          것처럼 보였다(계산 모듈 경계를 그대로 章 번호로 썼기 때문).
          이번 변경은 순수 UI/정보계층 변경이다 — chapters[3] /
          chapterFive / chapterSix가 담은 계산·서술 결과(killpoint/body/
          highlight/bridgeIntro)는 내용·순서 전부 그대로 보여준다. 章
          번호는 "고객이 읽는 큰 주제"가 바뀔 때만 올라가야 한다는 원칙에
          따라 第五章/第六章 한자 라벨과 그 title(둘 다 이름만 바뀌는
          정적 템플릿이라 내용 손실 없음)을 화면에서 빼고, 대신
          ChapterOneSubheading(1장에서 이미 쓰던 소제목 스타일 그대로
          재사용, 새 컴포넌트 아님)으로 3개 하위 섹션의 경계만 표시한다. */}
      <section className="border-b border-white/5 bg-sceneBgAlt px-6 py-14 sm:py-16">
        <div className="mx-auto w-full max-w-content2 text-center">
          <span className="block text-center font-serif-kr text-3xl font-bold text-sceneGold">
            第四章
          </span>
          <h2 className="mt-2 font-serif-kr text-[22px] font-bold leading-snug text-sceneText sm:text-[26px]">
            {data.userName}님의 재물운
          </h2>

          <ChapterOneSubheading>돈이 움직이는 방식</ChapterOneSubheading>
          <p className="mt-1 font-serif-kr text-[17px] font-bold leading-snug text-sceneRed sm:text-[19px]">
            {wrapHanjaTokens(data.chapters[3].killpoint)}
          </p>
          <div className="mt-6 space-y-4">
            {data.chapters[3].body.map((p, idx) => (
              <p key={idx} className="text-[15px] leading-[1.95] text-sceneBody">
                {wrapHanjaTokens(p)}
              </p>
            ))}
          </div>

          {/* 시기 카드는 출시 전 감사에서 하드코딩("2026년/경쟁운")으로
              확인돼 제거했다 — 4챕터(금전운의 흐름) 최종 원고와 개인화
              규칙이 들어오기 전까지는 숨김 처리(임의 fallback 금지). */}

          <HighlightCard text={data.chapters[3].highlight} />

          {/* 재물 잠금 상세(chapterFourNarrative.ts의 lockedDetail) 연결 —
              ①흔들리는조건 ②과거대운 ③현재대운 ④다음대운 ⑤조언 5개 문단을
              그대로 옮긴다. 원문/계산 변경 없음, 새 컴포넌트 없음(기존
              ChapterOneSubheading + space-y-4 문단 패턴 재사용). "lockedDetail"
              이라는 내부 명칭은 화면에 노출하지 않는다.
              buildDaYunFlow()는 사용자에 따라 과거/현재/다음 대운 중 일부가
              없으면(예: 첫 대운을 지나는 중이거나 마지막 대운을 이미 지난
              경우) 배열 길이가 5가 아닐 수 있다 — 그 경우 이 5단계 라벨과
              내용이 어긋나므로, 길이가 정확히 5일 때만 렌더링한다(길이가
              다르면 이 블록 전체를 건너뛴다 — 새 fallback 문장을 만들지
              않는다). 아직 결제 게이트/블러/잠금 UI는 붙이지 않는다 —
              화면에는 계속 무료 재물운과 동일하게 완전히 보이는 상태다. */}
          {Array.isArray(data.chapters[3].lockedDetail) && data.chapters[3].lockedDetail!.length === 5 && (
            <>
              <ChapterOneSubheading>① 재물이 흔들리는 조건</ChapterOneSubheading>
              <div className="space-y-4">
                <p className="text-[15px] leading-[1.95] text-sceneBody">
                  {wrapHanjaTokens(data.chapters[3].lockedDetail![0])}
                </p>
              </div>

              <ChapterOneSubheading>② 지나온 흐름에서 돈이 움직인 방식</ChapterOneSubheading>
              <div className="space-y-4">
                <p className="text-[15px] leading-[1.95] text-sceneBody">
                  {wrapHanjaTokens(data.chapters[3].lockedDetail![1])}
                </p>
              </div>

              <ChapterOneSubheading>③ 지금의 재물 흐름</ChapterOneSubheading>
              <div className="space-y-4">
                <p className="text-[15px] leading-[1.95] text-sceneBody">
                  {wrapHanjaTokens(data.chapters[3].lockedDetail![2])}
                </p>
              </div>

              <ChapterOneSubheading>④ 다음 흐름에서 달라지는 것</ChapterOneSubheading>
              <div className="space-y-4">
                <p className="text-[15px] leading-[1.95] text-sceneBody">
                  {wrapHanjaTokens(data.chapters[3].lockedDetail![3])}
                </p>
              </div>

              <ChapterOneSubheading>⑤ 지금 기억해야 할 재물 원칙</ChapterOneSubheading>
              <div className="space-y-4">
                <p className="text-[15px] leading-[1.95] text-sceneBody">
                  {wrapHanjaTokens(data.chapters[3].lockedDetail![4])}
                </p>
              </div>
            </>
          )}

          {/* 하위 섹션 2 — 이전 第五章(돈이 들어와도 남지 않는 이유).
              bridgeIntro(4→5 연결문)는 있을 때만 본문과 같은 스타일로
              첫 문단 자리에 얹는다. */}
          {data.chapterFive && (
            <>
              <ChapterOneSubheading>돈이 머무는 힘과 흔들리는 조건</ChapterOneSubheading>
              <div className="space-y-4">
                {data.chapterFive.bridgeIntro && (
                  <p className="text-[15px] leading-[1.95] text-sceneBody">
                    {wrapHanjaTokens(data.chapterFive.bridgeIntro)}
                  </p>
                )}
                {data.chapterFive.body.map((p, idx) => (
                  <p key={idx} className="text-[15px] leading-[1.95] text-sceneBody">
                    {wrapHanjaTokens(p)}
                  </p>
                ))}
              </div>
            </>
          )}

          {/* 하위 섹션 3 — 이전 第六章(돈이 움직이는 시기). applicable=false라
              generateWealthTimingNarrative가 안내 문단 1개만 돌려준
              사람도 chapterSix 자체는 undefined가 아니므로(reportMapper.ts
              참고) 이 블록이 그대로 렌더링되고, 문단 내용만 안내문
              1개가 된다 — 별도 분기 없이 자연스럽게 처리된다. */}
          {data.chapterSix && (
            <>
              <ChapterOneSubheading>앞으로 돈의 흐름이 달라지는 때</ChapterOneSubheading>
              <div className="space-y-4">
                {data.chapterSix.bridgeIntro && (
                  <p className="text-[15px] leading-[1.95] text-sceneBody">
                    {wrapHanjaTokens(data.chapterSix.bridgeIntro)}
                  </p>
                )}
                {data.chapterSix.body.map((p, idx) => (
                  <p key={idx} className="text-[15px] leading-[1.95] text-sceneBody">
                    {wrapHanjaTokens(p)}
                  </p>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── 선녀 이미지 패널 — 4장 직후로 이동(정적 이미지, 에셋/비율/크롭
          변경 없음, RESULT_GUIDE_IMAGE 그대로 재사용). 문구는 무료 종료
          지점(구 위치)으로 분리해 뒤로 옮겼다 — 이미지와 텍스트를 각각
          다른 자리에 쓰기 위한 구조 변경일 뿐, 이미지 자체는 손대지 않았다. ── */}
      <section className="relative overflow-hidden border-b border-white/5 bg-sceneBg">
        <div
          // 모바일(96:100, 거의 정사각형)은 원본(4:3 가로)보다 훨씬 좁아
          // cover 시 좌우가 크게 잘린다. 기존 56%는 왼쪽(문/창) 쪽으로
          // 치우쳐 있어 오른쪽 화병이 통째로 잘려나갔다 — 데스크톱은
          // 손대지 않고(sm:56% 20% 그대로) 모바일만 오른쪽으로 옮겨
          // 얼굴·붓·책상은 그대로 두고 화병·가지·촛불이 자연스럽게
          // 보이게 했다(82%는 화병이 거의 안 보여 95%로 조정).
          className="relative aspect-[96/100] w-full bg-cover bg-[95%_20%] sm:aspect-auto sm:h-[70vh] sm:bg-[56%_20%]"
          style={{
            backgroundImage: `url(${RESULT_GUIDE_IMAGE})`,
          }}
        />
      </section>

      {/* ── 오행 밸런스 — 선녀 이미지 바로 다음으로 이동. 오각형 다이어그램/
          범례/강약 요약/계산 로직 전부 기존 그대로, 축소하지 않았다. ── */}
      <section className="border-b border-white/5 bg-sceneBgAlt px-6 py-14 sm:py-16">
        <div className="mx-auto w-full max-w-content2 text-center">
          <span className="block text-center font-serif-kr text-3xl font-bold text-sceneGold">五行</span>
          <h2 className="mt-2 font-serif-kr text-[22px] font-bold leading-snug text-sceneText sm:text-[26px]">
            지금, 기운이 흐르는 방향
          </h2>
          <FiveElementDiagram balance={data.elementBalance} />

          {/* 오행 범례 — 각 기운의 뜻(고정 사전적 정의). 정적, 애니메이션 없음 */}
          <div className="mt-4 rounded-card border border-sceneGold/20 bg-sceneBgAlt px-5 py-5">
            <ul className="flex flex-col gap-3">
              {data.elementBalance.map((el) => (
                <li key={el.key} className="flex items-center gap-3 text-[14px]">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: ELEMENT_COLORS[el.key] }}
                  />
                  <span className="w-14 shrink-0 font-serif-kr font-bold text-sceneText">{el.label}</span>
                  <span className="text-sceneTextSub">{ELEMENT_MEANING[el.key]}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 강한/약한 오행 요약 — 실제 계산값(elementStrongest/Weakest) 기반 */}
          <p className="mt-6 text-center text-[15px] leading-[1.9] text-sceneBody">
            현재는{" "}
            <strong className="font-bold text-sceneGold">
              {ELEMENT_MEANING[data.elementStrongest]}
            </strong>
            을 뜻하는{" "}
            <strong className="font-bold text-sceneGold">
              {data.elementBalance.find((el) => el.key === data.elementStrongest)?.label}
            </strong>
            의 기운이 강하게 나타납니다.
            <br />
            반면{" "}
            <strong className="font-bold text-sceneGold">
              {ELEMENT_MEANING[data.elementWeakest]}
            </strong>
            을 뜻하는{" "}
            <strong className="font-bold text-sceneGold">
              {data.elementBalance.find((el) => el.key === data.elementWeakest)?.label}
            </strong>
            의 기운은 보완이 필요합니다.
          </p>
        </div>
      </section>

      {/* ── 4챕터 이후 전환 구간 — data.lifeFlow가 있을 때만 렌더링.
          report prop 없이 DEFAULT_REPORT로 볼 때는(lifeFlow undefined)
          이 블록 전체를 건너뛴다. 전부 정적 section 나열이고,
          framer-motion/IntersectionObserver/sticky·fixed는 쓰지 않는다. ── */}
      {data.lifeFlow && (
        <>
          {/* 命 대운 전환 — 원형 命 표식 + 새 전환 문구(승인된 고정 문구) */}
          <section className="border-b border-white/5 bg-sceneBg px-6 py-14 sm:py-16">
            <div className="mx-auto w-full max-w-content2 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-sceneGold/40 bg-sceneBgAlt font-serif-kr text-lg text-sceneGold">
                命
              </div>
              <p
                className="mt-4 font-serif-kr text-[19px] font-bold leading-snug text-sceneGold sm:text-[22px]"
                style={{ wordBreak: "keep-all" }}
              >
                10년마다,
                <br />
                운은 달라졌습니다.
              </p>
              <p className="mt-3 text-[14px] leading-relaxed text-sceneTextSub" style={{ wordBreak: "keep-all" }}>
                이제, 그 흐름이 언제 바뀌었는지 봅니다.
              </p>
            </div>
          </section>

          {/* 人生大運 · 내 인생의 큰 흐름 — 국면 4~5개, LifePhaseTimeline
              실제 계산 데이터 그대로. 과거/현재는 그대로 노출, 미래 구간은
              LifePhaseTimeline 자체의 기존 잠금/흐림 표시를 그대로 쓴다.
              설명 문구는 승인된 고정 문구(사람마다 바뀌지 않음) — 예전엔
              이 자리에 bigPicturePublic[0](동적 생성 문장)을 썼는데, 최종
              화면 순서 확정 과정에서 이 고정 문구로 교체하기로 승인됨. */}
          <section className="border-b border-white/5 bg-sceneBgAlt px-6 py-14 sm:py-16">
            <div className="mx-auto w-full max-w-content2 text-center">
              <span className="block text-center font-serif-kr text-sm tracking-[0.2em] text-sceneGold/80">
                人生大運
              </span>
              <h2 className="mt-2 font-serif-kr text-[22px] font-bold leading-snug text-sceneText sm:text-[26px]">
                내 인생의 큰 흐름
              </h2>
              <p className="mt-4 whitespace-pre-line text-[15px] leading-[1.95] text-sceneBody">
                앞에 서는 힘이 달라질 때마다,
                {"\n"}삶의 기준도 함께 바뀌었습니다.
              </p>
              <LifePhaseTimeline phases={data.lifeFlow.phases} />
            </div>
          </section>

          {/* 지나온 시간 → 지금 — 카드 2개. daYunFlowPublic이 past/current
              이름표가 붙은 객체라(배열 인덱스 아님), 과거 대운이 없는
              사용자(첫 대운 진행 중)나 현재 대운이 없는 사용자(마지막 대운을
              이미 지남)여도 각 카드가 정확히 자기 자리의 문장만 받는다 —
              해당 문장이 없으면(빈 문자열) 그 카드 자체를 렌더링하지 않는다.
              bigPicturePublic[1] 장문 문단은 이번 배치에서 빼기로 승인됨. */}
          <section className="border-b border-white/5 bg-sceneBg px-6 py-14 sm:py-16">
            <div className="mx-auto w-full max-w-content2 text-center">
              <h2 className="font-serif-kr text-[22px] font-bold leading-snug text-sceneText sm:text-[26px]">
                그 시간들이,
                <br />
                지금의 나를 만들었습니다.
              </h2>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                {data.lifeFlow.daYunFlowPublic.past && (
                  <div className="flex-1 rounded-card border border-sceneGold/20 bg-sceneBgAlt px-5 py-5 text-left">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-sceneTextSub">
                      지나온 시간
                    </p>
                    <p className="mt-2 text-[14px] leading-[1.85] text-sceneBody">
                      {data.lifeFlow.daYunFlowPublic.past}
                    </p>
                  </div>
                )}
                {data.lifeFlow.daYunFlowPublic.current && (
                  <div className="flex-1 rounded-card border border-sceneGold/40 bg-sceneCard px-5 py-5 text-left">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-sceneGold">지금</p>
                    <p className="mt-2 text-[14px] leading-[1.85] text-sceneCardText">
                      {data.lifeFlow.daYunFlowPublic.current}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* 다음 변화 티저 — 제목(고정 문구, 최종 화면 순서에서 다시 추가됨)
              + NEXT_FLOW_TRANSITION 문단. 다음 대운 구체 설명(앞으로 몇
              세부터, 대운 간지가 무엇으로 바뀌는지 등)은 잠금 목차(未開封)로
              넘기기로 승인됨 — 여기서는 daYunFlowPublic.next를 렌더링하지
              않는다(값 자체는 그대로 계산됨, 화면에만 안 씀). "다음 변화가
              있다"는 힌트까지만 노출하고, 곧바로 기존 未開封(이제부터, 시기가
              중요합니다) 섹션으로 이어간다. */}
          <section className="border-b border-white/5 bg-sceneBgAlt px-6 py-14 sm:py-16">
            <div className="mx-auto w-full max-w-content2 text-center">
              <h2 className="font-serif-kr text-[22px] font-bold leading-snug text-sceneText sm:text-[26px]">
                그런데,
                <br />
                다음 변화는 조금 다릅니다.
              </h2>
              <p className="mt-4 whitespace-pre-line text-[15px] leading-[1.95] text-sceneBody">
                {NEXT_FLOW_TRANSITION}
              </p>
            </div>
          </section>
        </>
      )}

      {/* ── 무료 종료 문구 — 구 선녀 패널의 텍스트 부분만 이미지 없이 여기로
          이동. 문구 자체는 변경하지 않았다(lifeFlow 유무 분기도 그대로). ── */}
      <section className="border-b border-white/5 bg-sceneBg px-6 py-14 sm:py-16">
        <p
          className="whitespace-pre-line px-6 text-center font-serif-kr text-[19px] font-bold leading-snug text-sceneText sm:text-2xl"
          style={{ wordBreak: "keep-all" }}
        >
          {data.lifeFlow
            ? "여기까지는, 당신이 지나온 기록입니다.\n하지만 아직, 펼쳐지지 않은 기록이 남아 있습니다."
            : "지나온 삶은 바꿀 수 없지만, 이제부터는 달라질 수 있습니다."}
        </p>
      </section>

      {/* ── 아직 열리지 않은 기록 — lifeFlow.toc(4개) 잠금 목차. 제목/질문
          문구 4개는 승인된 고정 텍스트(LOCKED_TOC_ITEMS), blurred 미리보기만
          실제 계산된 toc[].lockedPreview를 그대로 쓴다(지어낸 예고문 없음).
          data.lifeFlow가 없을 때(DEFAULT_REPORT)는 기존 "앞으로 10년
          미리보기"(tenYearPreview) 섹션을 그대로 보여준다. ── */}
      {data.lifeFlow ? (
        <section className="border-b border-white/5 bg-sceneBg px-6 py-14 sm:py-16">
          <div className="mx-auto w-full max-w-content2 text-center">
            <span className="block text-center font-serif-kr text-sm tracking-[0.2em] text-sceneGold/80">
              未開封 · 아직 열리지 않은 기록
            </span>
            <h2 className="mt-2 font-serif-kr text-[22px] font-bold leading-snug text-sceneText sm:text-[26px]">
              이제부터,
              <br />
              시기가 중요합니다.
            </h2>
            <p className="mt-4 text-[14px] leading-relaxed text-sceneTextSub" style={{ wordBreak: "keep-all" }}>
              지나온 흐름은 여기까지입니다.
              <br />
              이제 돈·일·인연이 언제 움직이고, 삶의 방향이 언제 달라지는지를 봅니다.
            </p>

            <ul className="mt-6 flex flex-col gap-3">
              {data.lifeFlow.toc.map((item, idx) => (
                <li
                  key={item.title}
                  className="flex flex-col gap-2 rounded-card border border-sceneGold/20 bg-sceneBgAlt px-5 py-4 text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-serif-kr text-[15px] font-bold text-sceneGold">
                        {`0${idx + 1} ${LOCKED_TOC_ITEMS[idx]?.title ?? item.title}`}
                      </p>
                      <p className="mt-1 text-[13px] leading-relaxed text-sceneTextSub">
                        {LOCKED_TOC_ITEMS[idx]?.question ?? item.subtitle}
                      </p>
                    </div>
                    <Lock size={16} className="mt-1 shrink-0 text-sceneGold/70" />
                  </div>
                  {item.lockedPreview && (
                    <p className="select-none text-[12.5px] italic leading-relaxed text-sceneTextSub/80 blur-[4px]">
                      {item.lockedPreview}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : (
        <section className="border-b border-white/5 bg-sceneBg px-6 py-14 sm:py-16">
          <div className="mx-auto w-full max-w-content2 text-center">
            <span className="block text-center font-serif-kr text-3xl font-bold text-sceneGold">第五章</span>
            <h2 className="mt-2 font-serif-kr text-[22px] font-bold leading-snug text-sceneText sm:text-[26px]">
              앞으로 10년 미리보기
            </h2>
            <p className="mt-4 font-serif-kr text-[17px] font-bold leading-snug text-sceneGoldLight sm:text-[19px]">
              10년을 세 구간으로 나눠 먼저 보여드립니다
            </p>

            <ul className="mt-6 flex flex-col gap-3">
              {data.tenYearPreview.map((item) => (
                <li
                  key={item.period}
                  className="flex items-center justify-between rounded-card border border-sceneGold/20 bg-sceneBgAlt px-5 py-4"
                >
                  <div>
                    <p className="font-serif-kr text-[15px] font-bold text-sceneGold">{item.period}</p>
                    <p className="mt-0.5 text-[13px] text-sceneTextSub">{item.title}</p>
                  </div>
                  <Lock size={16} className="shrink-0 text-sceneGold/70" />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── 결제 CTA — 신규 정적 섹션. UI/문구만 구현, 실제 결제 연결 및
          "30명 이후 가격 전환" 로직은 다음 단계. 이름은 data.userName(실제
          계산 경로에서 넘어온 값)을 그대로 쓰고 하드코딩하지 않는다. ── */}
      <section className="bg-sceneBg px-6 py-16">
        {/* [카드 배경 수정] 밝은 아이보리(sceneCard) 카드를 페이지 톤과
            이어지는 짙은 갈색(sceneBgAlt) 카드로 교체 — 라운드/여백/얇은
            금색 테두리는 그대로, 안의 문구 2줄만 밝은 배경 전용 어두운
            글자색(sceneCardText/sceneCardMuted)에서 어두운 배경용 밝은
            글자색(sceneText)으로 맞춰 바꿨다. 배지·가격·버튼 색은 그대로. */}
        <div className="mx-auto flex w-full max-w-content flex-col items-center gap-4 rounded-card border border-sceneGold/40 bg-sceneBgAlt px-6 py-10 text-center">
          <span className="text-[12px] font-bold tracking-wide text-[#B83A32]">
            OPEN SPECIAL · 오픈 특가
          </span>
          <p className="font-serif-kr text-[19px] font-bold leading-snug text-sceneText sm:text-[22px]">
            {data.userName}님, 지나온 이야기는 다 읽으셨습니다.
          </p>
          <p className="text-[16px] font-semibold leading-relaxed text-sceneText/90">
            진짜 궁금한 건, 지금부터입니다.
          </p>

          <div className="mt-2 flex flex-col items-center gap-0.5">
            <span className="text-[13px] text-sceneTextSub line-through">정상가 59,800원</span>
            <span className="font-serif-kr text-[30px] font-bold text-sceneGold">29,800원</span>
          </div>

          <button
            type="button"
            className="mt-2 w-full rounded-pill bg-sceneGold px-6 py-4 text-[16px] font-bold text-sceneBg sm:w-auto sm:px-10"
          >
            나의 전체 인생 리포트 열기 →
          </button>
        </div>
      </section>
    </main>
  );
}
