import { Lock } from "lucide-react";
import { RESULT_GUIDE_IMAGE } from "@/lib/guideImages";
import { ReportResult } from "@/lib/reportMapper";

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
 * "템플릿 반복" 느낌을 줄이기 위해) — 01/02는 본문 중심으로 담백하게,
 * 03은 기운 비교 카드, 04는 시기 카드를 추가로 붙였다. 아이보리 강조
 * 카드는 각 챕터의 "정말 중요한 문장 1개"에만 쓴다.
 *
 * `report` prop — lib/reportMapper.ts의 buildReportResult(appData)가 만든
 * 실제 개인화 데이터. app/result-v2/page.tsx가 쿼리스트링의 생년월일시를
 * calculateSaju/buildAppData로 계산해 넘겨준다 — 쿼리가 없으면 prop 자체가
 * undefined가 되어 DEFAULT_REPORT(기존과 동일한 자리채움 문구)로 대체된다.
 * 사주팔자 표/신살/오행 분포/01~04 killpoint·title·highlight/10년 흐름
 * 제목이 이 prop을 통해 사람마다 달라진다. 기운 비교 카드(03)와 시기
 * 카드(04)의 구체적 값(목(木)/수(水), 2026년/경쟁운)은 아직 스키마에 없어
 * 자리채움 그대로 남아 있다.
 */

// 오행 5색 — tailwind.config.js의 wood/fire/earth/metal/water 토큰과
// 동일한 값. SVG fill에는 CSS 변수를 쓸 수 없어 동일 hex를 직접 사용한다.
const ELEMENT_COLORS = {
  wood: "#4C7A4A",
  fire: "#C0392B",
  earth: "#8A6D3B",
  metal: "#8C8C88",
  water: "#3B6EA5",
};

// report prop이 없을 때 쓰는 기본값 — 기존에 하드코딩되어 있던 것과
// 완전히 같은 문구/구조다. 이 값 자체를 실제 원고로 바꾸는 작업은
// 이번 단계 범위가 아니다(추후 별도 원고 연결 예정).
const DEFAULT_REPORT: ReportResult = {
  summaryTitle: "",
  dayMasterLabel: "",
  pillars: {
    stems: [
      { label: "시주", hanja: "壬", hangul: "임", element: "水(수)", sipseong: "정재" },
      { label: "일주", hanja: "戊", hangul: "무", element: "土(토)", sipseong: "일간", isDay: true },
      { label: "월주", hanja: "甲", hangul: "갑", element: "木(목)", sipseong: "편관" },
      { label: "년주", hanja: "丙", hangul: "병", element: "火(화)", sipseong: "편인" },
    ],
    branches: [
      { hanja: "戌", hangul: "술", element: "土(토)" },
      { hanja: "子", hangul: "자", element: "水(수)" },
      { hanja: "寅", hangul: "인", element: "木(목)" },
      { hanja: "午", hangul: "오", element: "火(화)" },
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
      <span className="font-serif-kr text-3xl font-bold text-sceneGold">{chapterLabel}</span>
      <h2 className="mt-2 font-serif-kr text-[22px] font-bold leading-snug text-sceneText sm:text-[26px]">
        {title}
      </h2>
      <p className="mt-4 font-serif-kr text-[17px] font-bold leading-snug text-sceneGoldLight sm:text-[19px]">
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

        <div className="relative mx-auto w-full max-w-content">
          <div className="flex items-center justify-center gap-2">
            <SealMark />
            <p className="text-sm tracking-[0.2em] text-sceneGold/80">命式 · 사주팔자</p>
          </div>
          <h1 className="mt-2 text-center font-serif-kr text-2xl font-bold text-sceneText">
            타고난 여덟 글자
          </h1>

          <div className="mt-8 grid grid-cols-4 overflow-hidden rounded-card border border-sceneGold/40 bg-sceneCard shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
            {data.pillars.stems.map((s) => (
              <div
                key={s.label}
                className={`flex flex-col items-center gap-1 border-r border-sceneGold/15 px-1 py-4 last:border-r-0 ${
                  s.isDay ? "border-b-2 border-sceneGold bg-sceneGold/10" : ""
                }`}
              >
                {s.isDay && <span className="text-[10px] font-bold text-sceneGold">★ 일간</span>}
                <span className="text-[11px] text-sceneCardText/60">{s.label}</span>
                <span className="font-serif-kr text-[26px] font-bold text-sceneCardText">{s.hanja}</span>
                <span className="text-[11px] text-sceneCardText/60">{s.hangul}</span>
                <span className="text-[10px] font-medium text-sceneGold/90">{s.element}</span>
                <span className="text-[10px] text-sceneCardText/60">{s.sipseong}</span>
              </div>
            ))}
            {data.pillars.branches.map((b, i) => (
              <div
                key={`branch-${i}`}
                className="flex flex-col items-center gap-1 border-r border-t border-sceneGold/15 px-1 py-4 last:border-r-0"
              >
                <span className="font-serif-kr text-xl font-bold text-sceneCardText">{b.hanja}</span>
                <span className="text-[11px] text-sceneCardText/60">{b.hangul}</span>
                <span className="text-[10px] font-medium text-sceneGold/90">{b.element}</span>
              </div>
            ))}
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
      {/* 第一章 — 본문 중심, 추가 카드 없음(담백하게) */}
      <section className="border-b border-white/5 bg-sceneBg px-6 py-14 sm:py-16">
        <div className="mx-auto w-full max-w-content2">
          <ChapterHead {...data.chapters[0]} />
          <div className="mt-6 space-y-4">
            {data.chapters[0].body.map((p, idx) => (
              <p key={idx} className="text-[15px] leading-[1.95] text-sceneBody">
                {p}
              </p>
            ))}
          </div>
          <HighlightCard text={data.chapters[0].highlight} />
        </div>
      </section>

      {/* 第二章 — 본문 중심, 추가 카드 없음(담백하게) */}
      <section className="border-b border-white/5 bg-sceneBgAlt px-6 py-14 sm:py-16">
        <div className="mx-auto w-full max-w-content2">
          <ChapterHead {...data.chapters[1]} />
          <div className="mt-6 space-y-4">
            {data.chapters[1].body.map((p, idx) => (
              <p key={idx} className="text-[15px] leading-[1.95] text-sceneBody">
                {p}
              </p>
            ))}
          </div>
          <HighlightCard text={data.chapters[1].highlight} />
        </div>
      </section>

      {/* 第三章 — 기운 비교 카드 추가 */}
      <section className="border-b border-white/5 bg-sceneBg px-6 py-14 sm:py-16">
        <div className="mx-auto w-full max-w-content2">
          <ChapterHead {...data.chapters[2]} />
          <div className="mt-6 space-y-4">
            {data.chapters[2].body.map((p, idx) => (
              <p key={idx} className="text-[15px] leading-[1.95] text-sceneBody">
                {p}
              </p>
            ))}
          </div>

          {/* 기운 비교 카드 — 정적 2단 레이아웃 */}
          <div className="mt-6 rounded-card border border-sceneGold/20 bg-sceneBgAlt px-5 py-6">
            <div className="flex items-center justify-around text-center">
              <div>
                <p className="text-[12px] text-sceneTextSub">나를 채우는 기운</p>
                <p className="mt-1 font-serif-kr text-[19px] font-bold text-sceneGold">목(木)</p>
              </div>
              <span className="h-8 w-px bg-white/10" />
              <div>
                <p className="text-[12px] text-sceneTextSub">긴장하게 되는 기운</p>
                <p className="mt-1 font-serif-kr text-[19px] font-bold text-sceneSilver">수(水)</p>
              </div>
            </div>
            <p className="mt-5 text-center text-[14px] leading-relaxed text-sceneText/90">
              (임시 문구) 목 기운의 사람과는 편안함을, 수 기운의 사람과는 긴장을 느끼기 쉽습니다.
            </p>
          </div>

          <HighlightCard text={data.chapters[2].highlight} />
        </div>
      </section>

      {/* 第四章 — 시기 카드 추가 */}
      <section className="border-b border-white/5 bg-sceneBgAlt px-6 py-14 sm:py-16">
        <div className="mx-auto w-full max-w-content2">
          <ChapterHead {...data.chapters[3]} />
          <div className="mt-6 space-y-4">
            {data.chapters[3].body.map((p, idx) => (
              <p key={idx} className="text-[15px] leading-[1.95] text-sceneBody">
                {p}
              </p>
            ))}
          </div>

          {/* 시기 카드 — 가로형, 기운 비교 카드와 다른 형태 */}
          <div className="mt-6 flex items-center gap-4 rounded-card border-l-2 border-sceneGold bg-sceneBg px-5 py-4">
            <span className="font-serif-kr text-[20px] font-bold text-sceneGold">2026년</span>
            <span className="h-6 w-px bg-white/10" />
            <span className="text-[15px] font-medium text-sceneText/90">경쟁운</span>
          </div>

          <HighlightCard text={data.chapters[3].highlight} />
        </div>
      </section>

      {/* ── 오행 밸런스 — 독립 섹션, 정적 SVG 다이어그램. 원본 결과지에서도
          첫 사주팔자 표가 아니라 뒤쪽 챕터에 배치되어 있던 걸 그대로 따랐다 ── */}
      <section className="border-b border-white/5 bg-sceneBg px-6 py-14 sm:py-16">
        <div className="mx-auto w-full max-w-content2">
          <span className="font-serif-kr text-3xl font-bold text-sceneGold">五行</span>
          <h2 className="mt-2 font-serif-kr text-[22px] font-bold leading-snug text-sceneText sm:text-[26px]">
            지금, 기운이 흐르는 방향
          </h2>
          <FiveElementDiagram balance={data.elementBalance} />
        </div>
      </section>

      {/* ── 선녀 이미지 패널 — 정적 이미지, 반복 사용하지 않고 잠금 직전 1회만 ── */}
      <section className="relative overflow-hidden border-b border-white/5 bg-sceneBg">
        <div
          className="relative aspect-[96/100] w-full bg-cover sm:aspect-auto sm:h-[70vh]"
          style={{
            backgroundImage: `url(${RESULT_GUIDE_IMAGE})`,
            backgroundPosition: "56% 20%",
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(180deg, rgba(16,19,29,0) 45%, rgba(16,19,29,0.92) 100%)",
            }}
          />
          <p
            className="absolute inset-x-0 bottom-8 px-6 text-center font-serif-kr text-[19px] font-bold leading-snug text-sceneText sm:text-2xl"
            style={{ wordBreak: "keep-all" }}
          >
            지나온 삶은 바꿀 수 없지만, 이제부터는 달라질 수 있습니다.
          </p>
        </div>
      </section>

      {/* ── 잠금 경계 ────────────────────────────────────────────── */}
      <section className="border-b border-white/5 bg-sceneBg px-6 py-14">
        <div className="mx-auto flex w-full max-w-content flex-col items-center gap-4 rounded-card border border-sceneGold/30 bg-sceneCard px-6 py-10 text-center">
          <Lock size={22} className="text-sceneGold" />
          <p className="font-serif-kr text-[18px] font-bold text-sceneCardText">
            여기까지 무료로 확인할 수 있습니다
          </p>
          <p className="max-w-[36ch] text-[14.5px] leading-relaxed text-sceneCardText/70">
            (임시 문구) 아래부터는 잠긴 구간입니다. 나머지 챕터와 10년 흐름은 결제 후 확인할 수 있습니다.
          </p>
        </div>
      </section>

      {/* ── 앞으로 10년 미리보기 ─────────────────────────────────── */}
      <section className="border-b border-white/5 bg-sceneBg px-6 py-14 sm:py-16">
        <div className="mx-auto w-full max-w-content2">
          <span className="font-serif-kr text-3xl font-bold text-sceneGold">第五章</span>
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

      {/* ── 결제 영역 (구조만 — 실제 문구/가격은 미확정) ────────────
          fixed/sticky 아님, 문서 흐름 안의 일반 섹션. 가격/할인/카운트다운
          없음 — 결제 CTA가 처음 등장하는 지점이라는 구조만 준비한다. */}
      <section className="bg-sceneBg px-6 py-16 sm:py-20">
        <div className="mx-auto flex w-full max-w-content flex-col items-center gap-5 rounded-card border border-accentGoldTo/40 bg-gradient-to-b from-sceneBgAlt to-sceneBg px-6 py-10 text-center">
          <p className="font-serif-kr text-[19px] font-bold text-sceneGold">전체 해석 잠금 해제</p>
          <p className="max-w-[34ch] text-[14.5px] leading-relaxed text-sceneTextSub">
            (임시 문구 — 가격/문구 미확정) 나머지 챕터와 10년 흐름 전체를 확인할 수 있습니다.
          </p>
          <button
            type="button"
            className="mt-1 w-full rounded-pill border border-accentGoldTo/50 bg-gradient-to-r from-accentGoldFrom to-accentGoldTo px-6 py-3.5 text-[15px] font-bold text-dark"
          >
            전체 해석 확인하기
          </button>
        </div>
      </section>
    </main>
  );
}
