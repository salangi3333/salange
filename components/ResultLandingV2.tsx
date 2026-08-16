import { Lock } from "lucide-react";
import { RESULT_GUIDE_IMAGE } from "@/lib/guideImages";

/**
 * ResultLandingV2 — 기존 ResultLanding(scene 기반 스크롤텔링)과 완전히
 * 분리된 새 결과 페이지. 목적은 두 가지 동시 달성:
 *   1) Galaxy S24 Ultra 등 실제 모바일에서 native window 스크롤이 매끄럽게
 *      동작하는 구조를 유지한다 (검증 완료, 변경하지 않음).
 *   2) 기존 결과 페이지의 검정·금빛·아이보리 톤, 사주팔자 표, 선녀/배경
 *      이미지, 폰트 분위기 등 "공들인 비주얼"을 되살린다.
 *
 * 지켜야 하는 제약(전부 의도적):
 * - Framer Motion 등 JS 애니메이션 라이브러리를 import하지 않는다.
 * - IntersectionObserver 기반 whileInView 진입 애니메이션, typewriter,
 *   글자/문장 단위 지연 등장을 쓰지 않는다 — 뷰포트에 들어온 본문은
 *   즉시 읽을 수 있어야 한다.
 * - 이미지는 전부 정적(static)이다. 예전 GuideVisual.tsx처럼 motion.div로
 *   감싸 반복 애니메이션(scale 숨쉬기 등)을 거는 방식은 쓰지 않는다.
 * - 별도 scroll container / scroll-snap / fixed·sticky 요소를 두지 않는다.
 * - 무료 구간에는 결제 고정바·가격·할인·카운트다운을 노출하지 않는다.
 *
 * 아래 본문은 전부 짧은 자리채움 텍스트다. 실제 사주 해석 원고가 아니며,
 * 디자인이 확정된 뒤 실제 원고로 교체될 예정이다. 사주 계산 로직(lib/
 * calculateSaju 등)은 이 컴포넌트가 전혀 참조하지 않는다.
 */

type ChapterSection = {
  id: string;
  chapterLabel: string;
  title: string;
  body: string;
  // 신살/키워드 한 단어를 금테두리 박스로 강조 — 모든 챕터에 있을 필요는
  // 없어 optional로 둔다. 정적 요소이며 애니메이션 없음.
  keyword?: string;
  highlight: string;
  // "사람과 인연" 챕터 전용 — 나를 채우는 기운 / 긴장하게 되는 기운 2단
  // 비교 카드. 정적 요소이며 애니메이션 없음.
  compare?: { leftLabel: string; leftValue: string; rightLabel: string; rightValue: string; note: string };
};

const CHAPTERS: ChapterSection[] = [
  {
    id: "chapter-01",
    chapterLabel: "第一章",
    title: "타고난 본질",
    body: "(임시 문구) 일간을 중심으로 타고난 기질을 짧게 정리하는 본문이 이 자리에 들어갑니다.",
    keyword: "일간 · 무토(戊土)",
    highlight: "(핵심 문장 자리채움) 이 사람을 한 문장으로 요약하는 문장이 들어갑니다.",
  },
  {
    id: "chapter-02",
    chapterLabel: "第二章",
    title: "성격의 이면",
    body: "(임시 문구) 겉으로 보이는 모습과 실제 내면의 차이를 짚는 본문이 이 자리에 들어갑니다.",
    keyword: "화개살",
    highlight: "(핵심 문장 자리채움) 잘 드러나지 않는 진짜 성향을 짚는 문장이 들어갑니다.",
  },
  {
    id: "chapter-03",
    chapterLabel: "第三章",
    title: "사람과 인연",
    body: "(임시 문구) 관계에서 반복되는 패턴을 짚는 본문이 이 자리에 들어갑니다.",
    compare: {
      leftLabel: "나를 채우는 기운",
      leftValue: "목(木)",
      rightLabel: "긴장하게 되는 기운",
      rightValue: "수(水)",
      note: "(임시 문구) 목 기운의 사람과는 편안함을, 수 기운의 사람과는 긴장을 느끼기 쉽습니다.",
    },
    highlight: "(핵심 문장 자리채움) 인연이 가까워지고 멀어지는 지점을 짚는 문장이 들어갑니다.",
  },
  {
    id: "chapter-04",
    chapterLabel: "第四章",
    title: "재물",
    body: "(임시 문구) 돈이 들어오고 나가는 흐름을 짚는 본문이 이 자리에 들어갑니다.",
    keyword: "2026년 · 경쟁운",
    highlight: "(핵심 문장 자리채움) 재물이 새는 지점과 지키는 법을 짚는 문장이 들어갑니다.",
  },
];

// 사주팔자 표는 기존 PillarScene의 시각적 톤(다크 배경 + 아이보리 카드 +
// 금빛 강조, 일간 칸 하이라이트)만 참고했고 구현은 새로 작성했다. 데이터는
// 실제 계산 결과가 아니라 레이아웃 확인용 더미 값이다.
const DUMMY_STEMS = [
  { label: "시주", hanja: "壬", hangul: "임", element: "水(수)", sipseong: "정재" },
  { label: "일주", hanja: "戊", hangul: "무", element: "土(토)", sipseong: "일간", isDay: true },
  { label: "월주", hanja: "甲", hangul: "갑", element: "木(목)", sipseong: "편관" },
  { label: "년주", hanja: "丙", hangul: "병", element: "火(화)", sipseong: "편인" },
];

const DUMMY_BRANCHES = [
  { hanja: "戌", hangul: "술", element: "土(토)" },
  { hanja: "子", hangul: "자", element: "水(수)" },
  { hanja: "寅", hangul: "인", element: "木(목)" },
  { hanja: "午", hangul: "오", element: "火(화)" },
];

const DUMMY_SINSAL = ["화개살", "역마살", "도화살"];

const TEN_YEAR_PREVIEW = ["다가올 3년", "그다음 3년", "그 이후 4년"];

export default function ResultLandingV2() {
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
          <p className="text-center text-sm tracking-[0.2em] text-sceneGold/80">命式 · 사주팔자</p>
          <h1 className="mt-2 text-center font-serif-kr text-2xl font-bold text-sceneText">
            타고난 여덟 글자
          </h1>

          <div className="mt-8 grid grid-cols-4 overflow-hidden rounded-card border border-sceneGold/40 bg-sceneCard shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
            {DUMMY_STEMS.map((s) => (
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
            {DUMMY_BRANCHES.map((b, i) => (
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
            {DUMMY_SINSAL.map((tag) => (
              <span
                key={tag}
                className="rounded-pill border border-sceneGold/40 bg-sceneCard px-3 py-1.5 text-xs font-medium text-sceneCardText shadow-sm"
              >
                {tag}
              </span>
            ))}
          </div>

          <p className="mt-8 text-center text-[15px] leading-relaxed text-sceneBody/90">
            이 여덟 글자를 기준으로 아래 내용을 읽어봅니다.
          </p>
        </div>
      </section>

      {/* ── 01~04 챕터: 동일한 레이아웃 반복 ───────────────────────── */}
      {CHAPTERS.map((chapter, i) => (
        <section
          key={chapter.id}
          className={`border-b border-white/5 px-6 py-14 sm:py-16 ${
            i % 2 === 1 ? "bg-sceneBgAlt" : "bg-sceneBg"
          }`}
        >
          <div className="mx-auto w-full max-w-content2">
            <span className="font-serif-kr text-3xl font-bold text-sceneGold">{chapter.chapterLabel}</span>
            <h2 className="mt-2 font-serif-kr text-[22px] font-bold leading-snug text-sceneText sm:text-[26px]">
              {chapter.title}
            </h2>
            <span className="mt-4 block h-px w-14 bg-sceneGold/40" />

            {/* 키워드 강조 박스 — 금테두리, 정적. 챕터마다 있을 필요는 없음 */}
            {chapter.keyword && (
              <div className="mt-6 flex items-center justify-center rounded-card border border-sceneGold/40 bg-sceneBgAlt px-6 py-8">
                <span className="font-serif-kr text-[22px] font-bold text-sceneGold">{chapter.keyword}</span>
              </div>
            )}

            <p className="mt-6 text-[16px] leading-[1.9] text-sceneBody">{chapter.body}</p>

            {/* 기운 비교 카드 — "사람과 인연" 챕터 전용, 정적 2단 레이아웃 */}
            {chapter.compare && (
              <div className="mt-6 rounded-card border border-sceneGold/20 bg-sceneBgAlt px-5 py-6">
                <div className="flex items-center justify-around text-center">
                  <div>
                    <p className="text-[12px] text-sceneTextSub">{chapter.compare.leftLabel}</p>
                    <p className="mt-1 font-serif-kr text-[19px] font-bold text-sceneGold">
                      {chapter.compare.leftValue}
                    </p>
                  </div>
                  <span className="h-8 w-px bg-white/10" />
                  <div>
                    <p className="text-[12px] text-sceneTextSub">{chapter.compare.rightLabel}</p>
                    <p className="mt-1 font-serif-kr text-[19px] font-bold text-sceneSilver">
                      {chapter.compare.rightValue}
                    </p>
                  </div>
                </div>
                <p className="mt-5 text-center text-[15px] leading-relaxed text-sceneText/90">
                  {chapter.compare.note}
                </p>
              </div>
            )}

            {/* 핵심 문장 — 아이보리 카드 + 금빛 좌측 강조선. 정적, 애니메이션 없음 */}
            <div className="relative mt-6 overflow-hidden rounded-card border border-sceneGold/40 bg-sceneCard py-4 pl-5 pr-4">
              <span className="absolute inset-y-0 left-0 w-[3px] bg-sceneGold" />
              <p className="font-serif-kr text-[15px] font-bold leading-relaxed text-sceneCardText">
                {chapter.highlight}
              </p>
            </div>
          </div>
        </section>
      ))}

      {/* ── 선녀 이미지 패널 — 정적 이미지, 반복 애니메이션 없음 ───── */}
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
              background:
                "linear-gradient(180deg, rgba(16,19,29,0) 45%, rgba(16,19,29,0.92) 100%)",
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
          <span className="mt-4 block h-px w-14 bg-sceneGold/40" />
          <p className="mt-6 text-[16px] leading-[1.9] text-sceneBody">
            (임시 문구) 10년 흐름 요약이 이 자리에 들어갑니다.
          </p>

          <ul className="mt-6 flex flex-col gap-3">
            {TEN_YEAR_PREVIEW.map((label) => (
              <li
                key={label}
                className="flex items-center justify-between rounded-card border border-sceneGold/20 bg-sceneBgAlt px-5 py-4"
              >
                <span className="text-[15px] font-medium text-sceneText/90">{label}</span>
                <Lock size={16} className="text-sceneGold/70" />
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
