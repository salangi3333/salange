import { AppData } from "./sajuContent";
import { Stage, analyzeBranchRelations, analyzeRoot, RootAnalysis, BranchPair } from "./natalStructure";
import { SipseongCategory, CategoryStrength } from "./strengthAnalysis";
import { analyzeWealthCategoryStrength, WealthStrengthResult } from "./wealthStrengthAnalysis";
import { analyzeDaYunWealth, pickPastCurrentNext, findPriorWealthSignalSpan, DaYunWealthPeriod, WealthSignalSpan } from "./daYunWealthAnalysis";
import { computeSipseong } from "./aiLifeReport";

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

/**
 * 4챕터("금전운의 흐름") 전용 INTERPRETATION층. wealthStrengthAnalysis
 * (일지 포함 재물 세력)와 daYunWealthAnalysis(대운 지지 십성)를 조합해,
 * chapterFourNarrative.ts가 바로 쓸 수 있는 "판단 결과"로 압축한다. 여기서도
 * 문장은 만들지 않는다.
 *
 * 재성 개수만으로 재물운을 판단하지 않는다는 승인된 원칙에 따라, 재성
 * 자체의 노출 정도(뚜렷/숨음/미미)와 다른 4축(비겁·식상·관성·인성)과의
 * 상대적 관계를 함께 담는다. 삼합/반합은 이번 범위에서 판정 근거로 쓰지
 * 않는다 — 합·충은 실제로 계산되는 육합/육충만 쓴다(analyzeBranchRelations,
 * 기존 함수 재사용, 새 계산 없음).
 */

export type GapTier = "뚜렷" | "약간" | "비슷";

export interface CategoryCompare {
  a: SipseongCategory;
  b: SipseongCategory;
  /** gapTier가 "비슷"이면 의미 없음 — 서사에서 leadCategory를 쓰기 전에
   * 반드시 gapTier부터 확인해야 한다. */
  leadCategory: SipseongCategory;
  gapTier: GapTier;
}

function compareCategories(wealth: WealthStrengthResult, a: SipseongCategory, b: SipseongCategory): CategoryCompare {
  const ca = wealth.byCategory[a];
  const cb = wealth.byCategory[b];
  const gap = ca.total - cb.total;
  const absGap = Math.abs(gap);
  const gapTier: GapTier = absGap >= 4 ? "뚜렷" : absGap >= 2 ? "약간" : "비슷";
  return { a, b, leadCategory: gap >= 0 ? a : b, gapTier };
}

export type JaeseongExposure = "뚜렷" | "숨음" | "미미";

/** 실제 명식 한 자리의 재물(또는 다른 축) 근거 — 정확한 십성 라벨(정재/
 * 편재 등)과 그 라벨이 어느 슬롯(천간/지지/지장간)에서 나왔는지를 함께
 * 담는다. 전부 이미 계산되어 있는 값(pillars[].sipseong, computeSipseong,
 * rootHits)을 다시 포장한 것 — 새 명리 공식 없음. */
export interface EvidencePosition {
  stage: Stage;
  slot: "천간" | "지지" | "지장간";
  /** 정확한 십성 라벨 — 예: "편재", "정재", "비견" */
  sipseong: string;
  hidePosition?: "본기" | "중기" | "여기";
  tou?: boolean;
}

/** 카테고리 하나의 실제 근거 자리를 전부 모은다 — 천간/지지(겉으로 드러난
 * 십성, appData의 기존 계산값 그대로) + 지장간(rootHits를 computeSipseong
 * 으로 라벨만 다시 붙인 것). */
function buildEvidencePositions(appData: AppData, category: SipseongCategory, wealth: WealthStrengthResult): EvidencePosition[] {
  const user = appData.user;
  const dayGan = user.pillars.day.hanja;
  const results: EvidencePosition[] = [];

  (["year", "month", "day", "hour"] as Stage[]).forEach((stage) => {
    const gan = user.pillars[stage];
    const zhi = user.pillars.branches[stage];
    if (gan && SIPSEONG_TO_CATEGORY[gan.sipseong] === category) {
      results.push({ stage, slot: "천간", sipseong: gan.sipseong });
    }
    if (zhi && SIPSEONG_TO_CATEGORY[zhi.sipseong] === category) {
      results.push({ stage, slot: "지지", sipseong: zhi.sipseong });
    }
  });

  wealth.byCategory[category].rootHits.forEach((hit) => {
    results.push({
      stage: hit.stage,
      slot: "지장간",
      sipseong: computeSipseong(dayGan, hit.hiddenGan),
      hidePosition: hit.position,
      tou: hit.tou,
    });
  });

  return results;
}

export interface JaeseongProfile {
  strength: CategoryStrength;
  /** 뚜렷=겉으로 드러난 재성 있음 · 숨음=지장간에만 있음 · 미미=둘 다 없음.
   * "미미"라도 서사에서는 "재물운이 없다"로 단정하지 않고 다른 축을 통한
   * 간접 재물 흐름으로 풀어낸다. */
  exposure: JaeseongExposure;
  /** 5개 카테고리 중 총점 순위(1이 가장 강함) */
  rank: number;
  /** 1위이면서 2위와 격차가 뚜렷할 때만 true */
  dominant: boolean;
  /** 재성이 실제로 존재를 드러내는 자리(겉 십성 + 지장간 뿌리) 전부, 중복 제거 */
  positions: Stage[];
  /** 정재/편재 구분 + 천간/지지/지장간 슬롯까지 담은 상세 근거 */
  evidence: EvidencePosition[];
}

function buildJaeseongProfile(appData: AppData, wealth: WealthStrengthResult): JaeseongProfile {
  const strength = wealth.byCategory.재성;
  const rank = wealth.all.findIndex((c) => c.category === "재성") + 1;
  const exposure: JaeseongExposure = strength.count > 0 ? "뚜렷" : strength.rootScore > 0 ? "숨음" : "미미";
  const gapToSecond = wealth.all[0].category === "재성" ? wealth.all[0].total - (wealth.all[1]?.total ?? -Infinity) : -Infinity;
  const dominant = rank === 1 && gapToSecond >= 4;

  const evidence = buildEvidencePositions(appData, "재성", wealth);
  const positions = [...new Set(evidence.map((e) => e.stage))];

  return { strength, exposure, rank, dominant, positions, evidence };
}

export interface ChapterFourKey {
  wealth: WealthStrengthResult;
  jaeseong: JaeseongProfile;
  /** 5개 카테고리 전부의 실제 근거 자리 — 재성이 미미할 때 "실제로 이 사람을
   * 이끄는 축"의 정확한 십성 라벨을 찾을 때 쓴다(3챕터의 coreLabel처럼
   * 추상적인 이름이 아니라, 그 축에 실제로 해당하는 정확한 십성 글자). */
  evidenceByCategory: Record<SipseongCategory, EvidencePosition[]>;
  /** 일간(day master) 자신의 통근 — natalStructure.ts의 기존 analyzeRoot를
   * 그대로 재사용(새 계산 아님). 3챕터와 같은 원칙: "이 사람이 쉽게
   * 흔들리지 않는 이유"는 이 값을 근거로만 쓴다. */
  dayMasterRoot: RootAnalysis;
  /** 식상(만드는 힘)과 재성이 둘 다 실제로 존재하는지(겉 또는 지장간).
   * 오행 순환상 식상生財는 항상 구조적으로 성립하므로, 둘의 "존재 여부"가
   * 곧 이 흐름이 실제로 작동하는지를 뜻한다. */
  siksangJaeseongLinked: boolean;
  /** 群劫爭財 — 벌어들인 것을 나누거나 다시 움직이게 하는 힘(비겁)과
   * 재성의 상대적 크기 */
  bigyeopVsJaeseong: CategoryCompare;
  /** 관성이 비겁을 억제해 재성을 지켜주는 정도 */
  gwanseongVsBigyeop: CategoryCompare;
  /** 印剋食 — 인성이 식상(만드는 힘)을 억제하는 정도 */
  inseongVsSiksang: CategoryCompare;
  /** 財剋印 — 재성이 강할 때, 안정을 추구하는 인성을 얼마나 누르는지
   * (재성이 뚜렷할 때만 의미 있게 쓴다) */
  jaeseongVsInseong: CategoryCompare;
  /** 실제로 계산되는 육합/육충 전체(analyzeBranchRelations, 필터 없음) 중,
   * 재성이 놓인 자리 또는 일간 자신의 통근 자리에 걸친 것만 — "재물 서사에
   * 관련되는 관계"로 좁힌 것. 삼합/반합/천간합/형파해는 이번에도 판정
   * 근거로 쓰지 않는다(계산 자체가 없음). */
  heChongOnWealth: { he: BranchPair[]; chong: BranchPair[] };
  daYun: {
    past: DaYunWealthPeriod | null;
    current: DaYunWealthPeriod | null;
    next: DaYunWealthPeriod | null;
    /** 직전 대운 자체엔 재물 신호가 없을 때, 그보다 앞서 재물이 실제로
     * 움직였던 연속 구간(있으면, 여러 대운이면 합쳐서). 직전 대운에 이미
     * 신호가 있으면 null. */
    priorWealthSignal: WealthSignalSpan | null;
  };
}

export function buildChapterFourKey(appData: AppData): ChapterFourKey {
  const user = appData.user;
  const dayGan = user.pillars.day.hanja;

  const wealth = analyzeWealthCategoryStrength(user);
  const jaeseong = buildJaeseongProfile(appData, wealth);
  const dayMasterRoot = analyzeRoot(user);

  const categories: SipseongCategory[] = ["비겁", "식상", "재성", "관성", "인성"];
  const evidenceByCategory = Object.fromEntries(
    categories.map((c) => [c, c === "재성" ? jaeseong.evidence : buildEvidencePositions(appData, c, wealth)])
  ) as Record<SipseongCategory, EvidencePosition[]>;

  const siksangJaeseongLinked =
    (wealth.byCategory.식상.count > 0 || wealth.byCategory.식상.rootScore > 0) &&
    (wealth.byCategory.재성.count > 0 || wealth.byCategory.재성.rootScore > 0);

  // "재물 서사에 관련되는 관계"로 좁힌다 — 재성이 실제로 놓인 자리 +
  // 일간 자신의 통근 자리(=명식 전체의 안정성과 직결). 전체 셋 자체는
  // analyzeBranchRelations(user)가 이미 필터 없이 계산해 준 것이고, 여기서는
  // 그중 재물 서사와 관련된 것만 고른다 — 새 계산 아님.
  const rel = analyzeBranchRelations(user);
  const relevantStages = new Set<Stage>(jaeseong.positions);
  dayMasterRoot.matches.forEach((m) => relevantStages.add(m.stage));
  const heChongOnWealth = {
    he: rel.he.filter((p) => relevantStages.has(p.a.stage) || relevantStages.has(p.b.stage)),
    chong: rel.chong.filter((p) => relevantStages.has(p.a.stage) || relevantStages.has(p.b.stage)),
  };

  const daYunPeriods = analyzeDaYunWealth(dayGan, appData.fortuneTimelineNodes);
  const daYun = {
    ...pickPastCurrentNext(daYunPeriods),
    priorWealthSignal: findPriorWealthSignalSpan(daYunPeriods),
  };

  return {
    wealth,
    jaeseong,
    evidenceByCategory,
    dayMasterRoot,
    siksangJaeseongLinked,
    bigyeopVsJaeseong: compareCategories(wealth, "비겁", "재성"),
    gwanseongVsBigyeop: compareCategories(wealth, "관성", "비겁"),
    inseongVsSiksang: compareCategories(wealth, "인성", "식상"),
    jaeseongVsInseong: compareCategories(wealth, "재성", "인성"),
    heChongOnWealth,
    daYun,
  };
}
