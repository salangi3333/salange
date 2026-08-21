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

// 오행 5색 — 전통 오방색(五方色) 기준: 목=청(파랑), 화=적(빨강), 토=황(노랑),
// 금=백(카드가 밝은 아이보리라 흰색 대신 시인성 있는 회색으로 대체), 수=흑(검정).
// tailwind.config.js의 wood/fire/earth/metal/water 토큰도 이 값과 맞춰뒀다.
// SVG fill에는 CSS 변수를 쓸 수 없어 동일 hex를 직접 사용한다.
const ELEMENT_COLORS = {
  wood: "#173F70",
  fire: "#9C1F13",
  earth: "#8A5D00",
  metal: "#4C4A45",
  water: "#141210",
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
        {killpoint}
      </p>
    </>
  );
}

/** 핵심 문장 카드 — 아이보리 + 금빛 좌측 강조선. 챕터당 "정말 중요한 문장" 1개에만 사용 */
function HighlightCard({ text }: { text: string }) {
  return (
    <div className="relative mt-6 overflow-hidden rounded-card border border-sceneGold/40 bg-sceneCard py-4 pl-5 pr-4">
      <span className="absolute inset-y-0 left-0 w-[3px] bg-sceneGold" />
      <p className="font-serif-kr text-[15px] font-bold leading-relaxed text-sceneCardText">{text}</p>
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
 */
function GoldPhrases({ text, phrases }: { text: string; phrases: string[] }) {
  const found = phrases.filter((p) => text.includes(p));
  if (found.length === 0) return <>{text}</>;
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
          part
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
      <strong className="font-bold text-sceneGold">{text}</strong>
    );
  }
  return (
    <>
      <strong className="font-bold text-sceneGold">{text.slice(0, idx)}</strong>
      {text.slice(idx)}
    </>
  );
}

/** 첫 줄바꿈 앞(=body3[1]에서 항상 고정으로 붙는 전환 문장 한 줄)만 gold. */
function GoldFirstLine({ text }: { text: string }) {
  const idx = text.indexOf("\n");
  if (idx === -1) {
    return <strong className="font-bold text-sceneGold">{text}</strong>;
  }
  return (
    <>
      <strong className="font-bold text-sceneGold">{text.slice(0, idx)}</strong>
      {text.slice(idx)}
    </>
  );
}

/** 문장 안의 따옴표(" ") 인용구만 gold — 오행 5종 CH1_TRUTH_SCENE 전부
 * 같은 패턴(짧은 인용구 한 개)을 쓰기 때문에 사용자와 무관하게 적용된다. */
function GoldQuoted({ text }: { text: string }) {
  const match = text.match(/[“"]([^”"]+)[”"]/);
  if (!match) return <>{text}</>;
  const full = match[0];
  const idx = text.indexOf(full);
  return (
    <>
      {text.slice(0, idx)}
      <strong className="font-bold text-sceneGold">{full}</strong>
      {text.slice(idx + full.length)}
    </>
  );
}

/** buildSynthesis()가 조합에 쓰는 고정 어휘 그대로 — chapterOneNarrative.ts
 * 원문을 바꾸지 않고, 렌더링 단계에서 이 단어들이 나오면 gold로만 감싼다. */
const CHAPTER_ONE_FORCE_NOUNS = ["거드는 힘", "짓누르는 힘", "풀어내는 힘", "쌓는 힘", "받쳐주는 힘"];

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
            {data.chapterOne.goldHook}
          </p>

          {/* 소제목① 예리함은 어디서 오는가 — body1[0:4](본질+일간·일지). gold 없음. */}
          <ChapterOneSubheading>예리함은 어디서 오는가</ChapterOneSubheading>
          <div className="space-y-4">
            {data.chapterOne.body1.slice(0, 4).map((p, idx) => (
              <p key={idx} className="whitespace-pre-line text-[15px] leading-[1.95] text-sceneBody">
                {p}
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
                  p
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
              {data.chapterOne.cheoneulOpening}
            </p>
          )}
          <div className="space-y-4">
            {data.chapterOne.body2.map((p, idx) => (
              <p key={idx} className="whitespace-pre-line text-[15px] leading-[1.95] text-sceneBody">
                {idx === 1 ? <GoldLeadClause text={p} /> : p}
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
            {data.chapterOne.redInsight}
          </p>

          {/* 소제목④ 칼끝이 자신을 향하는 순간 — body3(그림자) 전체.
              [1]의 첫 줄(전환 문장)만 gold. */}
          <ChapterOneSubheading>칼끝이 자신을 향하는 순간</ChapterOneSubheading>
          <div className="space-y-4">
            {data.chapterOne.body3.map((p, idx) => (
              <p key={idx} className="whitespace-pre-line text-[15px] leading-[1.95] text-sceneBody">
                {idx === 1 ? <GoldFirstLine text={p} /> : p}
              </p>
            ))}
          </div>

          {/* 소제목⑤ 가까워질수록 달라지는 온도 — body4(관계) 전체.
              [0]의 인용구만 gold. */}
          <ChapterOneSubheading>가까워질수록 달라지는 온도</ChapterOneSubheading>
          <div className="space-y-4">
            {data.chapterOne.body4.map((p, idx) => (
              <p key={idx} className="whitespace-pre-line text-[15px] leading-[1.95] text-sceneBody">
                {idx === 0 ? <GoldQuoted text={p} /> : p}
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
                  {data.chapters[1].richBody.intro}
                </p>
              )}
              <ChapterOneSubheading>{data.chapters[1].richBody.subheadingA}</ChapterOneSubheading>
              <div className="space-y-4">
                {data.chapters[1].richBody.bodyA.map((p, idx) => (
                  <p key={idx} className="text-[15px] leading-[1.95] text-sceneBody">
                    {p}
                  </p>
                ))}
              </div>

              {data.chapters[1].richBody.redLine && (
                <p className="mt-8 whitespace-pre-line font-serif-kr text-[17px] font-bold leading-snug text-sceneRed sm:text-[19px]">
                  {data.chapters[1].richBody.redLine}
                </p>
              )}

              <ChapterOneSubheading>{data.chapters[1].richBody.subheadingB}</ChapterOneSubheading>
              <div className="space-y-4">
                {data.chapters[1].richBody.bodyB.map((p, idx) => (
                  <p key={idx} className="text-[15px] leading-[1.95] text-sceneBody">
                    {p}
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
                    {p}
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
                {p}
              </p>
            ))}
          </div>

          {/* 기운 비교 카드는 출시 전 감사에서 하드코딩("목(木)/수(水)")으로
              확인돼 제거했다 — 3챕터(살아가는 방식과 관계운) 최종 원고와
              개인화 규칙이 들어오기 전까지는 숨김 처리(임의 fallback 금지). */}

          <HighlightCard text={data.chapters[2].highlight} />
        </div>
      </section>

      {/* 第四章 — 시기 카드 추가 */}
      <section className="border-b border-white/5 bg-sceneBgAlt px-6 py-14 sm:py-16">
        <div className="mx-auto w-full max-w-content2 text-center">
          <ChapterHead {...data.chapters[3]} />
          <div className="mt-6 space-y-4">
            {data.chapters[3].body.map((p, idx) => (
              <p key={idx} className="text-[15px] leading-[1.95] text-sceneBody">
                {p}
              </p>
            ))}
          </div>

          {/* 시기 카드는 출시 전 감사에서 하드코딩("2026년/경쟁운")으로
              확인돼 제거했다 — 4챕터(금전운의 흐름) 최종 원고와 개인화
              규칙이 들어오기 전까지는 숨김 처리(임의 fallback 금지). */}

          <HighlightCard text={data.chapters[3].highlight} />
        </div>
      </section>

      {/* ── 4챕터 이후 전환 구간(①~⑤) — data.lifeFlow가 있을 때만 렌더링.
          report prop 없이 DEFAULT_REPORT로 볼 때는(lifeFlow undefined)
          이 블록 전체를 건너뛰고 기존처럼 바로 五行으로 이어진다 — 기존
          자리채움 화면은 그대로 유지된다. 전부 정적 section 나열이고,
          framer-motion/IntersectionObserver/sticky·fixed는 쓰지 않는다. ── */}
      {data.lifeFlow && (
        <>
          {/* ① 전환 문장 */}
          <section className="border-b border-white/5 bg-sceneBg px-6 py-14 sm:py-16">
            <div className="mx-auto w-full max-w-content2 text-center">
              <p
                className="font-serif-kr text-[19px] font-bold leading-snug text-sceneGold sm:text-[22px]"
                style={{ wordBreak: "keep-all" }}
              >
                이제, 당신의 사주를 하나의 인생으로 읽어볼 차례입니다.
              </p>
              <p className="mt-3 text-[14px] leading-relaxed text-sceneTextSub" style={{ wordBreak: "keep-all" }}>
                지금까지는 기질과 관계, 재물의 방식을 봤습니다. 이제부터는 그 힘들이 시간 속에서 어떻게 움직여왔는지를 봅니다.
              </p>
            </div>
          </section>

          {/* ② 내 인생의 큰 흐름 — 국면 4~5개, 사람마다 나이 경계가 다르다 */}
          <section className="border-b border-white/5 bg-sceneBgAlt px-6 py-14 sm:py-16">
            <div className="mx-auto w-full max-w-content2 text-center">
              <h2 className="font-serif-kr text-[22px] font-bold leading-snug text-sceneText sm:text-[26px]">
                내 인생의 큰 흐름
              </h2>
              <p className="mt-4 whitespace-pre-line text-[15px] leading-[1.95] text-sceneBody">
                {data.lifeFlow.bigPicturePublic[0]}
              </p>
              <LifePhaseTimeline phases={data.lifeFlow.phases} />
            </div>
          </section>

          {/* ③ 그래서 지금의 내가 만들어졌습니다 — bigPicturePublic의 현재 국면
              문단만(잠금 상세는 절대 쓰지 않는다) */}
          <section className="border-b border-white/5 bg-sceneBg px-6 py-14 sm:py-16">
            <div className="mx-auto w-full max-w-content2 text-center">
              <h2 className="font-serif-kr text-[22px] font-bold leading-snug text-sceneText sm:text-[26px]">
                그래서, 지금의 내가 만들어졌습니다
              </h2>
              {data.lifeFlow.bigPicturePublic[1] && (
                <p className="mt-4 text-[15px] leading-[1.95] text-sceneBody">
                  {data.lifeFlow.bigPicturePublic[1]}
                </p>
              )}
            </div>
          </section>

          {/* ④ 당신의 기록에서 발견된 변화 — 과거→현재 정적 비교 카드,
              점수/등급 없음, daYunFlowPublic[0]/[1] 그대로만 사용 */}
          <section className="border-b border-white/5 bg-sceneBgAlt px-6 py-14 sm:py-16">
            <div className="mx-auto w-full max-w-content2 text-center">
              <h2 className="font-serif-kr text-[22px] font-bold leading-snug text-sceneText sm:text-[26px]">
                당신의 기록에서 발견된 변화
              </h2>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                {data.lifeFlow.daYunFlowPublic[0] && (
                  <div className="flex-1 rounded-card border border-sceneGold/20 bg-sceneBg px-5 py-5 text-left">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-sceneTextSub">
                      지나온 시간
                    </p>
                    <p className="mt-2 text-[14px] leading-[1.85] text-sceneBody">
                      {data.lifeFlow.daYunFlowPublic[0]}
                    </p>
                  </div>
                )}
                <div className="flex-1 rounded-card border border-sceneGold/40 bg-sceneCard px-5 py-5 text-left">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-sceneGold">지금</p>
                  <p className="mt-2 text-[14px] leading-[1.85] text-sceneCardText">
                    {data.lifeFlow.daYunFlowPublic[1]}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ⑤ 그런데 다음 변화는 조금 다릅니다 — next-tease만, 결론은 없음 */}
          <section className="border-b border-white/5 bg-sceneBg px-6 py-14 sm:py-16">
            <div className="mx-auto w-full max-w-content2 text-center">
              <h2 className="font-serif-kr text-[22px] font-bold leading-snug text-sceneText sm:text-[26px]">
                그런데, 다음 변화는 조금 다릅니다
              </h2>
              <p className="mt-4 text-[15px] leading-[1.95] text-sceneBody">
                {data.lifeFlow.daYunFlowPublic[2]}
              </p>
            </div>
          </section>
        </>
      )}

      {/* ── 오행 밸런스 — 독립 섹션, 정적 SVG 다이어그램. 원본 결과지에서도
          첫 사주팔자 표가 아니라 뒤쪽 챕터에 배치되어 있던 걸 그대로 따랐다 ── */}
      <section className="border-b border-white/5 bg-sceneBg px-6 py-14 sm:py-16">
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

      {/* ── 선녀 이미지 패널 — 정적 이미지, 반복 사용하지 않고 잠금 직전 1회만.
          이미지 위에 문구를 겹치지 않고, 이미지 아래에 별도 문단으로 배치한다 ── */}
      <section className="relative overflow-hidden border-b border-white/5 bg-sceneBg">
        <div
          className="relative aspect-[96/100] w-full bg-cover sm:aspect-auto sm:h-[70vh]"
          style={{
            backgroundImage: `url(${RESULT_GUIDE_IMAGE})`,
            backgroundPosition: "56% 20%",
          }}
        />
        <p
          className="whitespace-pre-line px-6 py-10 text-center font-serif-kr text-[19px] font-bold leading-snug text-sceneText sm:text-2xl"
          style={{ wordBreak: "keep-all" }}
        >
          {data.lifeFlow
            ? "여기까지는, 당신이 지나온 기록입니다.\n하지만 아직, 펼쳐지지 않은 기록이 남아 있습니다."
            : "지나온 삶은 바꿀 수 없지만, 이제부터는 달라질 수 있습니다."}
        </p>
      </section>

      {/* ── 잠금 경계 ────────────────────────────────────────────── */}
      <section className="border-b border-white/5 bg-sceneBg px-6 py-14">
        <div className="mx-auto flex w-full max-w-content flex-col items-center gap-4 rounded-card border border-sceneGold/30 bg-sceneCard px-6 py-10 text-center">
          <Lock size={22} className="text-sceneGold" />
          <p className="font-serif-kr text-[18px] font-bold text-sceneCardText">
            여기까지 무료로 확인할 수 있습니다
          </p>
        </div>
      </section>

      {/* ── ⑦ 아직 펼쳐지지 않은 기록 — lifeFlow.toc(4개) 잠금 목차.
          data.lifeFlow가 없을 때(DEFAULT_REPORT)는 기존 "앞으로 10년
          미리보기"(tenYearPreview) 섹션을 그대로 보여준다 — 기존 필드를
          지우지 않고 자리만 교체한다. ── */}
      {data.lifeFlow ? (
        <section className="border-b border-white/5 bg-sceneBg px-6 py-14 sm:py-16">
          <div className="mx-auto w-full max-w-content2 text-center">
            <h2 className="font-serif-kr text-[22px] font-bold leading-snug text-sceneText sm:text-[26px]">
              아직 펼쳐지지 않은 기록
            </h2>
            <p className="mt-4 font-serif-kr text-[17px] font-bold leading-snug text-sceneGoldLight sm:text-[19px]">
              전체 인생 리포트에서 이어지는 이야기입니다
            </p>

            <ul className="mt-6 flex flex-col gap-3">
              {data.lifeFlow.toc.map((item, idx) => (
                <li
                  key={item.title}
                  className="flex items-start justify-between gap-3 rounded-card border border-sceneGold/20 bg-sceneBgAlt px-5 py-4 text-left"
                >
                  <div className="min-w-0">
                    <p className="font-serif-kr text-[15px] font-bold text-sceneGold">
                      {`0${idx + 1} ${item.title}`}
                    </p>
                    <p className="mt-1 text-[13px] leading-relaxed text-sceneTextSub">{item.subtitle}</p>
                  </div>
                  <Lock size={16} className="mt-1 shrink-0 text-sceneGold/70" />
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

      {/* 결제 영역(전체 해석 잠금 해제 CTA)은 출시 전 감사에서 동작하지
          않는 버튼 + "(임시 문구 — 가격/문구 미확정)"로 확인돼 숨김
          처리했다. 실제 결제 기능은 별도 단계에서 구현한다. */}
    </main>
  );
}
