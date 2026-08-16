import { Lock } from "lucide-react";

/**
 * ResultLandingV2 — 기존 ResultLanding(scene 기반 스크롤텔링)과 완전히 분리된
 * 새 결과 페이지 실험. 목적은 단 하나: Galaxy S24 Ultra 등 실제 모바일에서
 * 기본 window/native 스크롤이 매끄럽게 동작하는 결과 페이지 골격을 먼저
 * 확보하는 것.
 *
 * 오늘 범위(스켈레톤)의 원칙 — 전부 의도적인 제약이며, 어기지 말 것:
 * - Framer Motion 등 JS 애니메이션 라이브러리를 아예 import하지 않는다
 *   (repeat:Infinity 루프, whileInView 지연, typewriter 전부 여기 포함되지
 *   않게 하기 위한 가장 확실한 방법).
 * - 별도 scroll container(overflow-y:auto 등)를 만들지 않는다 — 페이지
 *   전체가 하나의 자연스러운 문서 흐름이며 window가 유일한 스크롤 주체.
 * - scroll-snap을 쓰지 않는다.
 * - fixed/sticky 요소를 두지 않는다(결제 CTA도 문서 흐름 안에 있는
 *   일반 섹션이다).
 * - backdrop-blur, 무거운 filter, 과도한 transform을 쓰지 않는다.
 * - 뷰포트에 들어온 본문은 지연 없이 바로 읽을 수 있어야 한다 — 그래서
 *   본문 텍스트에는 어떤 진입 애니메이션도 걸지 않았다.
 *
 * 아래 본문은 전부 자리채움(placeholder) 텍스트다. 실제 사주 해석 원고가
 * 아니며, 실제 리포트와 비슷한 분량/줄바꿈을 만들어 스크롤 성능을 먼저
 * 검증하기 위한 더미 데이터다. 사주 계산 로직(lib/calculateSaju 등)은
 * 이 컴포넌트가 전혀 참조하지 않는다 — 기존 파이프라인과 무관하게 독립
 * 실행된다.
 */

const PLACEHOLDER_PARAGRAPHS = [
  "이 문단은 실제 사주 해석 원고가 들어갈 자리를 대신하는 임시 본문입니다. 실제 서비스에서는 이 위치에 사용자의 생년월일시로 계산된 명식을 바탕으로 한 구체적인 해설이 들어갑니다.",
  "지금 단계에서는 문장의 길이, 줄바꿈, 문단 사이 여백, 글자 크기가 실제 완성 리포트와 비슷한 분량이 되도록 채워 넣은 상태이며, 콘텐츠의 진위보다는 모바일 스크롤 성능을 먼저 확인하는 데 목적이 있습니다.",
  "실제 원고가 들어오면 이 자리의 텍스트만 교체되며, 아래 레이아웃(제목 크기, 행간, 강조 처리 방식)은 그대로 유지될 예정입니다.",
  "한 문단은 대략 세 줄에서 다섯 줄 사이로 구성되어, 사용자가 한 번에 읽기 부담스럽지 않은 호흡을 유지하도록 설계되어 있습니다.",
];

type ChapterSection = {
  id: string;
  eyebrow: string;
  title: string;
  paragraphs: string[];
  highlight: string;
};

const CHAPTERS: ChapterSection[] = [
  {
    id: "chapter-01",
    eyebrow: "01",
    title: "타고난 본질",
    paragraphs: PLACEHOLDER_PARAGRAPHS,
    highlight: "(자리채움) 이 위치에는 사용자의 일간을 중심으로 한 핵심 통찰 한 문장이 굵고 금빛으로 강조되어 들어갑니다.",
  },
  {
    id: "chapter-02",
    eyebrow: "02",
    title: "성격의 이면",
    paragraphs: PLACEHOLDER_PARAGRAPHS,
    highlight: "(자리채움) 겉으로 드러나는 모습과 실제 내면의 차이를 짚는 핵심 문장이 이 자리에 들어갑니다.",
  },
  {
    id: "chapter-03",
    eyebrow: "03",
    title: "사람과 인연",
    paragraphs: PLACEHOLDER_PARAGRAPHS,
    highlight: "(자리채움) 관계에서 반복되는 패턴을 짚는 핵심 문장이 이 자리에 들어갑니다.",
  },
  {
    id: "chapter-04",
    eyebrow: "04",
    title: "재물",
    paragraphs: PLACEHOLDER_PARAGRAPHS,
    highlight: "(자리채움) 돈이 들어오고 나가는 흐름에 대한 핵심 문장이 이 자리에 들어갑니다.",
  },
];

// 사주팔자 표는 기존 PillarScene의 시각적 톤(다크 배경 + 아이보리 카드 +
// 금빛 강조)만 참고했을 뿐, 구현 코드는 새로 작성했다. 데이터도 실제 계산
// 결과가 아니라 레이아웃 확인용 더미 값이다.
const DUMMY_PILLARS = [
  { label: "시주", hanja: "壬", hangul: "임", element: "水" },
  { label: "일주", hanja: "戊", hangul: "무", element: "土" },
  { label: "월주", hanja: "甲", hangul: "갑", element: "木" },
  { label: "년주", hanja: "丙", hangul: "병", element: "火" },
];

const TEN_YEAR_PREVIEW = ["다가올 3년", "그다음 3년", "그 이후 4년"];

export default function ResultLandingV2() {
  return (
    <main className="bg-sceneBg text-sceneText">
      {/* ── 사주팔자 / 일간 ───────────────────────────────────────── */}
      <section className="border-b border-white/5 px-6 py-16 sm:py-20">
        <div className="mx-auto w-full max-w-content">
          <p className="text-center text-sm tracking-[0.2em] text-sceneGold/80">命式 · 사주팔자</p>
          <h1 className="mt-2 text-center font-serif-kr text-2xl font-bold text-sceneText">
            타고난 여덟 글자 (자리채움 데이터)
          </h1>

          <div className="mt-8 grid grid-cols-4 overflow-hidden rounded-card border border-sceneGold/40 bg-sceneCard">
            {DUMMY_PILLARS.map((p) => (
              <div
                key={p.label}
                className="flex flex-col items-center gap-1 border-r border-sceneGold/15 px-1 py-4 last:border-r-0"
              >
                <span className="text-[11px] text-sceneCardText/60">{p.label}</span>
                <span className="font-serif-kr text-[26px] font-bold text-sceneCardText">{p.hanja}</span>
                <span className="text-[11px] text-sceneCardText/60">{p.hangul}</span>
                <span className="text-[10px] font-medium text-sceneGold/90">{p.element}</span>
              </div>
            ))}
          </div>

          <p className="mt-6 text-center text-[15px] leading-relaxed text-sceneBody/90">
            이 여덟 글자를 기준으로 아래 항목들을 하나씩 읽어봅니다.
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
            <span className="font-serif-kr text-sm font-bold tracking-[0.15em] text-sceneGold">
              {chapter.eyebrow}
            </span>
            <h2 className="mt-2 font-serif-kr text-[22px] font-bold leading-snug text-sceneText sm:text-[26px]">
              {chapter.title}
            </h2>

            <div className="mt-5 space-y-4">
              {chapter.paragraphs.map((p, idx) => (
                <p key={idx} className="text-[16px] leading-[1.9] text-sceneBody">
                  {p}
                </p>
              ))}
              <p className="text-[16px] leading-[1.9] text-sceneBody">
                <strong className="font-bold text-sceneGold">{chapter.highlight}</strong>
              </p>
            </div>
          </div>
        </section>
      ))}

      {/* ── 잠금 경계 ────────────────────────────────────────────── */}
      <section className="border-b border-white/5 bg-sceneBg px-6 py-14">
        <div className="mx-auto flex w-full max-w-content flex-col items-center gap-4 rounded-card border border-sceneGold/30 bg-sceneCard px-6 py-10 text-center">
          <Lock size={22} className="text-sceneGold" />
          <p className="font-serif-kr text-[18px] font-bold text-sceneCardText">
            여기까지 무료로 확인할 수 있습니다
          </p>
          <p className="max-w-[36ch] text-[14.5px] leading-relaxed text-sceneCardText/70">
            (자리채움) 아래부터는 유료 구간입니다. 실제 서비스에서는 이 지점부터 나머지 챕터와 10년 흐름이
            잠긴 상태로 미리보기만 제공됩니다.
          </p>
        </div>
      </section>

      {/* ── 앞으로 10년 미리보기 ─────────────────────────────────── */}
      <section className="border-b border-white/5 bg-sceneBg px-6 py-14 sm:py-16">
        <div className="mx-auto w-full max-w-content2">
          <span className="font-serif-kr text-sm font-bold tracking-[0.15em] text-sceneGold">05</span>
          <h2 className="mt-2 font-serif-kr text-[22px] font-bold leading-snug text-sceneText sm:text-[26px]">
            앞으로 10년 미리보기
          </h2>
          <p className="mt-5 text-[16px] leading-[1.9] text-sceneBody">
            (자리채움) 10년 흐름 요약이 이 자리에 들어갑니다. 아래 세 구간은 실제 서비스에서 각각 잠긴 상태로
            제목만 노출되고, 결제 후 펼쳐집니다.
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

      {/* ── 결제 영역 (fixed/sticky 아님 — 문서 흐름 안의 일반 섹션) ── */}
      <section className="bg-sceneBg px-6 py-16 sm:py-20">
        <div className="mx-auto flex w-full max-w-content flex-col items-center gap-5 rounded-card border border-accentGoldTo/40 bg-gradient-to-b from-sceneBgAlt to-sceneBg px-6 py-10 text-center">
          <p className="font-serif-kr text-[19px] font-bold text-sceneGold">전체 해석 잠금 해제</p>
          <p className="max-w-[34ch] text-[14.5px] leading-relaxed text-sceneTextSub">
            (자리채움) 나머지 챕터와 10년 흐름 전체를 확인할 수 있는 결제 안내 문구가 이 자리에 들어갑니다.
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-[13px] text-sceneTextSub/60 line-through">19,900원</span>
            <span className="text-[22px] font-bold text-sceneGold">9,900원</span>
          </div>
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
