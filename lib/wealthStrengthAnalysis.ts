import { SajuUser } from "@/types";
import { Element, GAN_ELEMENT, GENERATES, OVERCOMES, elementThatGenerates, elementThatOvercomes } from "./hanjaTables";
import { Stage, analyzeSeasonStatus } from "./natalStructure";
import { SipseongCategory, CategoryStrength, RootHit } from "./strengthAnalysis";

/**
 * 4챕터("금전운의 흐름") 전용 — 3챕터 strengthAnalysis.ts와는 완전히 별도의
 * 함수다(그 파일은 이 작업에서 한 글자도 바꾸지 않는다). 타입(SipseongCategory/
 * CategoryStrength/RootHit)만 그대로 재사용해 구조를 통일한다.
 *
 * 유일한 차이: ① 개수 계산에 일지를 포함한다. 일간 자신은 늘 "일간"이라
 * 카테고리 대상이 아니지만, 일지는 재성 등으로 얼마든지 잡힐 수 있고 —
 * 재물 분석에서 일지 재성(예: 편재가 일지에 앉은 경우)을 빠뜨리면 그 사람의
 * 타고난 재물 구조를 놓치게 된다는 것이 승인된 설계다.
 *
 * ②월령 ③통근 ④투간 공식은 3챕터에서 승인된 것을 그대로 적용하되, 대상
 * 범위(4개 지지 전체, 일지 포함)도 기존 analyzeRoot/analyzeCategoryStrength와
 * 동일하게 유지한다.
 *
 * 3챕터의 active[]는 count===0인 카테고리를 아예 목록에서 뺀다(그 챕터의
 * 질문이 "무엇이 이 사람을 이끄는가"라서 개수 0은 애초에 후보가 아니기
 * 때문). 4챕터는 다르다 — 재성이 겉으로 드러난 글자가 하나도 없어도
 * 지장간에 숨어 있을 수 있고, 그 경우를 "재물이 없다"로 잘못 단정하면 안
 * 된다. 그래서 여기서는 5개 카테고리를 전부 반환한다(필터링 없음).
 */

const CATEGORY_TARGET_ELEMENT: Record<SipseongCategory, (dayEl: Element) => Element> = {
  비겁: (d) => d,
  식상: (d) => GENERATES[d],
  재성: (d) => OVERCOMES[d],
  관성: (d) => elementThatOvercomes(d),
  인성: (d) => elementThatGenerates(d),
};

const SIPSEONG_TO_CATEGORY: Record<string, SipseongCategory> = {
  비견: "비겁",
  겁재: "비겁",
  식신: "식상",
  상관: "식상",
  편재: "재성",
  정재: "재성",
  편관: "관성",
  정관: "관성",
  편인: "인성",
  정인: "인성",
};

type HidePosition = "본기" | "중기" | "여기";
const POSITION_WEIGHT: Record<HidePosition, number> = { 본기: 3, 중기: 2, 여기: 1 };
function positionOf(index: number): HidePosition {
  return index === 0 ? "본기" : index === 1 ? "중기" : "여기";
}

export interface WealthStrengthResult {
  /** 5개 카테고리 전부, 총점 내림차순(필터링 없음 — 개수 0도 포함) */
  all: CategoryStrength[];
  byCategory: Record<SipseongCategory, CategoryStrength>;
  /** 카테고리별 "겉으로 드러난" 자리(연/월/일/시 중 십성이 직접 그 카테고리인
   * 곳) — "타고난 재물 구조"처럼 실제 위치를 문장에 쓸 때 필요해서 별도로
   * 둔다. CategoryStrength(strengthAnalysis.ts 공용 타입)는 건드리지 않고
   * 이 파일에서만 추가로 반환한다. */
  visiblePositions: Record<SipseongCategory, Stage[]>;
}

export function analyzeWealthCategoryStrength(user: SajuUser): WealthStrengthResult {
  const dayGan = user.pillars.day.hanja;
  const dayElement = GAN_ELEMENT[dayGan];
  const season = analyzeSeasonStatus(user);
  const rulingElement = season.rulingElement;

  // ① 개수 — 연간·연지·월간·월지·시간·시지 + 일지(일지 포함이 3챕터와의
  // 유일한 차이). 일간 자신은 포함하지 않는다(늘 "일간"이라 카테고리
  // 대상이 아님).
  const visible: { stage: Stage; sipseong: string }[] = [];
  (["year", "month", "hour"] as const).forEach((stage) => {
    const g = user.pillars[stage];
    const z = user.pillars.branches[stage];
    if (g) visible.push({ stage, sipseong: g.sipseong });
    if (z) visible.push({ stage, sipseong: z.sipseong });
  });
  visible.push({ stage: "day", sipseong: user.pillars.branches.day.sipseong });

  const counts: Record<SipseongCategory, number> = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 };
  const visiblePositions: Record<SipseongCategory, Stage[]> = { 비겁: [], 식상: [], 재성: [], 관성: [], 인성: [] };
  visible.forEach((p) => {
    const cat = SIPSEONG_TO_CATEGORY[p.sipseong];
    if (cat) {
      counts[cat] += 1;
      if (!visiblePositions[cat].includes(p.stage)) visiblePositions[cat].push(p.stage);
    }
  });

  const branchStages: { stage: Stage; zhi: string; hideGan: string[] }[] = [
    { stage: "year", zhi: user.pillars.branches.year.hanja, hideGan: user.natal.pillars.year.hideGan },
    { stage: "month", zhi: user.pillars.branches.month.hanja, hideGan: user.natal.pillars.month.hideGan },
    { stage: "day", zhi: user.pillars.branches.day.hanja, hideGan: user.natal.pillars.day.hideGan },
    ...(user.natal.pillars.hour && user.pillars.branches.hour
      ? [{ stage: "hour" as Stage, zhi: user.pillars.branches.hour.hanja, hideGan: user.natal.pillars.hour.hideGan }]
      : []),
  ];
  const visibleGans = [
    user.pillars.year.hanja,
    user.pillars.month.hanja,
    user.pillars.day.hanja,
    user.pillars.hour?.hanja,
  ].filter((g): g is string => Boolean(g));

  const categories: SipseongCategory[] = ["비겁", "식상", "재성", "관성", "인성"];
  const all: CategoryStrength[] = categories.map((category) => {
    const count = counts[category];
    const targetEl = CATEGORY_TARGET_ELEMENT[category](dayElement);

    // ② 월령 — 3챕터와 동일 공식(왕상휴수사)을 targetEl에 적용
    let monthScore: number;
    if (targetEl === rulingElement) monthScore = 3;
    else if (GENERATES[rulingElement] === targetEl) monthScore = 2;
    else if (elementThatGenerates(rulingElement) === targetEl) monthScore = 0;
    else if (OVERCOMES[rulingElement] === targetEl) monthScore = -1;
    else monthScore = -2;

    // ③④ 통근 + 투간 — count===0이어도 계속 계산한다(정하윤처럼 지장간에만
    // 숨어 있는 재성을 잡아내는 것이 이 함수의 핵심 목적이다).
    let rootScore = 0;
    let touScore = 0;
    const rootHits: RootHit[] = [];
    branchStages.forEach(({ stage, zhi, hideGan }) => {
      hideGan.forEach((hg, idx) => {
        if (GAN_ELEMENT[hg] !== targetEl) return;
        const position = positionOf(idx);
        const w = POSITION_WEIGHT[position];
        rootScore += w;
        const tou = visibleGans.includes(hg);
        if (tou) touScore += w;
        rootHits.push({ stage, zhi, hiddenGan: hg, position, tou });
      });
    });

    const total = count * 1 + monthScore + rootScore + touScore;
    return { category, count, monthScore, rootScore, touScore, total, rootHits };
  });

  all.sort((a, b) => b.total - a.total);
  const byCategory = Object.fromEntries(all.map((c) => [c.category, c])) as Record<SipseongCategory, CategoryStrength>;

  return { all, byCategory, visiblePositions };
}
