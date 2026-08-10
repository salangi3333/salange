import { Testimonial, ReportPart } from "@/types";

/**
 * 가격 중앙관리 — 이 파일 한 곳에서만 가격을 정의한다.
 * 다른 컴포넌트는 절대 가격 문자열을 하드코딩하지 않고 이 값을 참조한다.
 * 가격 변경이 필요하면 이 세 값만 수정하면 전체 페이지에 반영된다.
 */
export const PRICE = {
  original: "89,000원",
  sale: "19,900원",
  discount: "77% 할인",
};

export const ctaMeta = {
  secretsCount: 21,
  totalStories: 21,
  readStories: 1,
  keywords: ["재물의 흐름", "숨겨진 기질", "인연과 결혼", "대운의 전환점"],
};

export const totalPaidCount = 8362;

export const assetFlowLocked = [
  "35세 전후 첫 번째 재물 전환점의 정확한 시기",
  "가장 크게 재물이 불어나는 대운 구간",
  "재물을 지키기 위해 피해야 할 시기",
  "평생 자산이 가장 커지는 나이대",
];

export const fortuneTimelineLocked = [
  "40대 도약기에 찾아오는 결정적 기회",
  "50대 결실기의 재물과 명예의 정점",
  "평생 가장 조심해야 할 대운 구간",
  "말년운을 결정짓는 60대의 선택",
];

export const reportParts: ReportPart[] = [
  {
    index: 1,
    title: "PART 1. 타고난 본질",
    subtitle: "성격 · 기질 · 잠재력",
    progress: "2/7",
    expandedByDefault: true,
    items: [
      { text: "타고난 잠재력 총평", locked: false },
      { text: "숨겨진 기질 분석", locked: false },
      { text: "타고난 성향이 겉과 속에서 다르게 나타나는 진짜 이유", locked: true },
      { text: "내 안의 두 기운이 부딪힐 때 일어나는 현상", locked: true },
      { text: "타고난 강점 점수가 오히려 독이 되는 순간", locked: true },
      { text: "사주 속 특정 글자 조합이 관계에서 만드는 '보이지 않는 벽'", locked: true },
      { text: "인생 후반, 자아 에너지의 방향이 급격히 바뀌는 시점", locked: true },
    ],
  },
  {
    index: 2,
    title: "PART 2. 재물과 커리어",
    subtitle: "부의 흐름 · 적성 · 사업운",
    progress: "0/5",
    items: [
      { text: "평생 자산 흐름 총평", locked: true },
      { text: "가장 잘 맞는 직업군 TOP 3", locked: true },
      { text: "사업을 해도 되는 사주인가", locked: true },
      { text: "재물이 새는 시기와 그 원인이 되는 사주 속 글자", locked: true },
      { text: "투자에서 유독 실패하는 패턴과 그 근본 원인", locked: true },
    ],
  },
  {
    index: 3,
    title: "PART 3. 인연과 결혼",
    subtitle: "궁합 · 배우자운 · 이성운",
    progress: "0/4",
    items: [
      { text: "이상형과 실제로 끌리는 사람이 다른 이유", locked: true },
      { text: "결혼 시기를 앞당기거나 늦추는 사주 속 신호", locked: true },
      { text: "궁합이 최악인 상대의 특징", locked: true },
      { text: "반복되는 연애 패턴의 근본 원인", locked: true },
    ],
  },
  {
    index: 4,
    title: "PART 4. 대운의 흐름",
    subtitle: "10년 단위 인생 곡선",
    progress: "0/4",
    items: [
      { text: "10대~30대, 흐름이 완전히 바뀌는 두 번의 전환점", locked: true },
      { text: "40대~50대, 인생 최대 기회가 오는 정확한 시기", locked: true },
      { text: "60대 이후 반드시 조심해야 할 대운 구간", locked: true },
      { text: "인생 전체에서 가장 위험했던 시기와 그 이유", locked: true },
    ],
  },
  {
    index: 5,
    title: "PART 5. 종합 처방",
    subtitle: "개운법 · 방향 제안",
    progress: "0/4",
    items: [
      { text: "타고난 약점을 메우는 구체적인 방법", locked: true },
      { text: "운을 끌어올리는 색·방향·숫자", locked: true },
      { text: "올해 반드시 조심해야 할 특정 시기", locked: true },
      { text: "지금 이 순간 가장 먼저 해야 할 행동", locked: true },
    ],
  },
];

export const testimonials: Testimonial[] = [
  {
    headline: "소름 돋을 정도로 정확해서 두 번 읽었어요",
    rating: 5,
    authorMasked: "김O진 · 29세 여 · 깊은 물길형",
    paymentBadge: "카카오페이 결제 인증",
    daysAgo: "3일 전",
    body: [
      {
        text: "반신반의하고 시작했는데 제 성격이랑 지금까지 살아온 방식이 너무 정확하게 나와서 놀랐어요. 특히 ",
      },
      { text: "30대 초반 전환점 부분", highlight: "30대 초반 전환점 부분" },
      { text: "은 지금 제 상황이랑 소름 돋게 똑같았습니다." },
    ],
    hashtags: ["#소름정확도", "#재구매의사"],
    helpfulCount: 128,
  },
  {
    headline: "재물운 파트만으로도 값어치 함",
    rating: 5,
    authorMasked: "박O우 · 34세 남 · 타오르는 불꽃형",
    paymentBadge: "네이버페이 결제 인증",
    daysAgo: "1주 전",
    body: [
      { text: "사업 시작 시기를 고민하고 있었는데 " },
      { text: "재물이 크게 불어나는 시기와 조심할 시기", highlight: "재물이 크게 불어나는 시기와 조심할 시기" },
      { text: "가 명확하게 나와서 결정에 큰 도움이 됐습니다." },
    ],
    hashtags: ["#재물운적중", "#사업고민해결"],
    helpfulCount: 94,
  },
  {
    headline: "친구들한테 다 추천했어요",
    rating: 5,
    authorMasked: "이O서 · 27세 여 · 너른 대지형",
    paymentBadge: "카카오페이 결제 인증",
    daysAgo: "2주 전",
    body: [
      { text: "다른 데서 본 사주풀이랑 차원이 달라요. " },
      { text: "대운 흐름 설명이 특히 자세해서", highlight: "대운 흐름 설명이 특히 자세해서" },
      { text: " 인생 계획 세우는데 참고를 많이 했습니다." },
    ],
    hashtags: ["#친구추천", "#대운흐름"],
    helpfulCount: 76,
  },
];
