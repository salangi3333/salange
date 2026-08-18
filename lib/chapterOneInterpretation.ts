import { AppData } from "./sajuContent";
import { Element } from "./hanjaTables";
import {
  analyzeRoot,
  analyzeBranchRelations,
  analyzeSeasonStatus,
  RootAnalysis,
  BranchRelations,
  SeasonStatus,
  Stage,
} from "./natalStructure";

/**
 * INTERPRETATION층 — natalStructure.ts(CALCULATION)가 만든 raw 값들을
 * "01장 RED/IVORY 문장뱅크를 어느 칸에서 고를지" 결정하는 키(key)로 압축한다.
 *
 * 이 파일은 아직 어디에서도 import되지 않는다 — chapterOneNarrative.ts/
 * reportMapper.ts 등 실제 화면에 나가는 코드와 연결하지 않은 상태다.
 *
 * 여기서 하는 일은 오직 "값을 고르는 것"이지 문장을 짓거나 계산값을
 * 왜곡/무작위화하지 않는다.
 *
 * [수정 이력] 이전 버전은 다른 6(또는 4)글자의 십성군 존재 여부만 Set으로
 * 기록하고, top-2는 "관성 > 식상 > 인성 > 재성 > 비겁"라는 편집 우선순위로
 * 뽑았다. 검토 결과 이 편집 우선순위가 실제 명식 차이보다 결과에 더 큰
 * 영향을 줄 수 있다는 지적에 따라, 실제 출현 개수(categoryCounts)를 세고
 * 그 개수로만 top을 정하도록 바꿨다. 동률이면 동률이라는 사실 그대로
 * 보존한다(임의로 우열을 만들지 않는다). CATEGORY_PRIORITY 같은 편집용
 * 순서는 해석 로직에서 완전히 제거했다 — 화면 표기 정렬(CATEGORY_ORDER)만
 * 남기고, 그마저도 "우열"이 아니라 "나열 순서"일 뿐임을 명시한다.
 */

export type SipseongCategory = "비겁" | "식상" | "재성" | "관성" | "인성";

const SIPSEONG_CATEGORY: Record<string, SipseongCategory> = {
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

/** 화면/로그에 나열할 때만 쓰는 고정 순서. 명리적 우열이 아니다 — 실제
 * 우열(무엇이 top인가)은 오직 categoryCounts의 숫자로만 정한다. */
const CATEGORY_ORDER: SipseongCategory[] = ["비겁", "관성", "식상", "재성", "인성"];

interface OtherChar {
  stage: Stage;
  sipseong: string;
}

/** 일간·일지를 뺀 나머지 4~6글자의 십성을 모은다.
 * (주의: chapterOneNarrative.ts 안에도 같은 취지의 그룹핑이 이미 있다 —
 * 그 파일은 아직 손대지 않기로 했으므로 여기서는 별도로 계산한다. 추후
 * RED/IVORY를 실제로 이 값에 연결하는 단계에서 하나로 합치는 걸 권장한다.) */
function collectOtherChars(user: AppData["user"]): OtherChar[] {
  const others: OtherChar[] = [];
  (["year", "month", "hour"] as const).forEach((stage) => {
    const stem = user.pillars[stage];
    const branch = user.pillars.branches[stage];
    if (stem) others.push({ stage, sipseong: stem.sipseong });
    if (branch) others.push({ stage, sipseong: branch.sipseong });
  });
  return others;
}

export type CategoryCounts = Record<SipseongCategory, number>;

/** 다른 6(또는 4)글자의 십성을 5개 카테고리로 묶어 실제 출현 개수를 센다.
 * 존재 여부(boolean)가 아니라 개수(number) — 이게 이번 수정의 핵심이다. */
function countCategories(others: OtherChar[]): CategoryCounts {
  const counts: CategoryCounts = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 };
  others.forEach((c) => {
    const cat = SIPSEONG_CATEGORY[c.sipseong];
    if (cat) counts[cat] += 1;
  });
  return counts;
}

/** count > 0인 카테고리만, 화면 나열 순서(CATEGORY_ORDER)로. */
function dominantCategories(counts: CategoryCounts): SipseongCategory[] {
  return CATEGORY_ORDER.filter((c) => counts[c] > 0);
}

/** 실제 최고 출현 개수와, 그 개수를 공유하는 카테고리 전체(동률 포함)를
 * 그대로 반환한다. 동률을 억지로 하나로 좁히지 않는다. */
function topCategoriesByCount(
  counts: CategoryCounts
): { categories: SipseongCategory[]; count: number } {
  const max = Math.max(...CATEGORY_ORDER.map((c) => counts[c]));
  if (max === 0) return { categories: [], count: 0 };
  return { categories: CATEGORY_ORDER.filter((c) => counts[c] === max), count: max };
}

export interface ChapterOneInterpretationKey {
  dayGan: string;
  dayElement: Element;
  /** 다른 6(또는 4)글자 각 카테고리의 실제 출현 개수 (raw) */
  categoryCounts: CategoryCounts;
  /** count > 0인 카테고리 전체, 화면 나열 순서 — 우열 아님 */
  dominantCategories: SipseongCategory[];
  /** 출현 개수가 가장 많은 카테고리(들). 2개 이상이면 동률이 실제로
   * 있다는 뜻 — isTopTie로 명시적으로 표시한다. */
  topCategories: SipseongCategory[];
  /** topCategories들이 공유하는 최고 출현 횟수 */
  topCategoryCount: number;
  /** topCategories.length > 1과 동일 — 동률 여부를 명시적으로 노출 */
  isTopTie: boolean;
  /** 왕상휴수사 5단계 그대로 — 득령/실령 같은 이진 단순화는 아직 안 함 */
  seasonStatus: SeasonStatus["status"];
  hasRoot: boolean;
  branchHeCount: number;
  branchChongCount: number;
}

export function buildInterpretationKey(appData: AppData): ChapterOneInterpretationKey {
  const user = appData.user;
  const root: RootAnalysis = analyzeRoot(user);
  const season: SeasonStatus = analyzeSeasonStatus(user);
  const relations: BranchRelations = analyzeBranchRelations(user);
  const counts = countCategories(collectOtherChars(user));
  const top = topCategoriesByCount(counts);

  return {
    dayGan: user.pillars.day.hanja,
    dayElement: user.pillars.day.element,
    categoryCounts: counts,
    dominantCategories: dominantCategories(counts),
    topCategories: top.categories,
    topCategoryCount: top.count,
    isTopTie: top.categories.length > 1,
    seasonStatus: season.status,
    hasRoot: root.hasRoot,
    branchHeCount: relations.he.length,
    branchChongCount: relations.chong.length,
  };
}

/** 로그/테스트 전용 — 문장 생성에는 쓰지 않는다. */
export function keyToString(key: ChapterOneInterpretationKey): string {
  const countsStr = CATEGORY_ORDER.map((c) => `${c}${key.categoryCounts[c]}`).join(" ");
  const topStr = key.topCategories.length
    ? `${key.topCategories.join("·")}(${key.topCategoryCount}개${key.isTopTie ? ", 동률" : ""})`
    : "-";
  return `${key.dayGan}(${key.dayElement}) | counts:[${countsStr}] | top:${topStr} | 왕상휴수사:${key.seasonStatus} | 통근:${key.hasRoot ? "O" : "X"} | 합:${key.branchHeCount} | 충:${key.branchChongCount}`;
}
