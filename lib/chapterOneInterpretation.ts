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
 * (사용자 지시: "아직 01장 최종 문구에는 연결하지 마세요")
 *
 * 여기서 하는 일은 오직 "값을 고르는 것"이지 문장을 짓거나 계산값을
 * 왜곡/무작위화하지 않는다.
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

const CATEGORY_ORDER: SipseongCategory[] = ["비겁", "관성", "식상", "재성", "인성"];

/** IVORY 절 선택용 — "어떤 두 기운이 함께 두드러지는가"가 명리적으로
 * 더 의미 있다는 판단에 따라 개수가 아니라 이 고정 우선순위로 top-2를
 * 뽑는다(관성=외부압박, 식상=표현, 인성=의지처, 재성=집착, 비겁=경쟁).
 *
 * TODO(명리 규칙 검증 필요): 이 순서(관성 > 식상 > 인성 > 재성 > 비겁)는
 * "01장 서사에서 어떤 축이 먼저 언급될 만한가"라는 편집 판단으로 정한
 * 잠정값이지, 명리학적으로 검증된 우선순위표에서 가져온 게 아니다.
 * 실제 상담 근거로 쓰려면 이 순서 자체가 맞는지 별도로 검토해야 한다.
 * 문장을 다양하게 하려는 목적으로 이 배열을 임의로 바꾸지 말 것 — 순서를
 * 바꿀 근거가 생기면(명리 규칙 검토 결과) 그때만 수정한다. */
const CATEGORY_PRIORITY: SipseongCategory[] = ["관성", "식상", "인성", "재성", "비겁"];

interface OtherChar {
  stage: Stage;
  sipseong: string;
}

/** 일간·일지를 뺀 나머지 4~6글자의 십성을 모은다.
 * (주의: chapterOneNarrative.ts 안에도 같은 취지의 그룹핑이 이미 있다 —
 * 그 파일은 이번 라운드에 손대지 않기로 했으므로 여기서는 별도로 계산한다.
 * 추후 RED/IVORY를 실제로 이 값에 연결하는 단계에서 하나로 합치는 걸 권장한다.) */
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

function presentCategories(others: OtherChar[]): Set<SipseongCategory> {
  const present = new Set<SipseongCategory>();
  others.forEach((c) => {
    const cat = SIPSEONG_CATEGORY[c.sipseong];
    if (cat) present.add(cat);
  });
  return present;
}

function dominantCategories(present: Set<SipseongCategory>): SipseongCategory[] {
  return CATEGORY_ORDER.filter((c) => present.has(c));
}

/** IVORY용 top-2. 존재하는 카테고리가 1개뿐이면 길이 1을 반환한다(억지로
 * 채우지 않음 — 계산값을 왜곡하지 않는다는 원칙). */
function topCategories(present: Set<SipseongCategory>): SipseongCategory[] {
  return CATEGORY_PRIORITY.filter((c) => present.has(c)).slice(0, 2);
}

export interface ChapterOneInterpretationKey {
  dayGan: string;
  dayElement: Element;
  /** 다른 6(또는 4)글자 중 실제로 존재하는 십성군 전체, 등장 없는 카테고리는 제외 */
  dominantCategories: SipseongCategory[];
  /** IVORY 조합용 — dominantCategories 중 고정 우선순위로 뽑은 상위 1~2개.
   * "몇 개 있는가"가 아니라 "어떤 두 기운이 같이 두드러지는가"를 본다. */
  topCategories: SipseongCategory[];
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
  const present = presentCategories(collectOtherChars(user));

  return {
    dayGan: user.pillars.day.hanja,
    dayElement: user.pillars.day.element,
    dominantCategories: dominantCategories(present),
    topCategories: topCategories(present),
    seasonStatus: season.status,
    hasRoot: root.hasRoot,
    branchHeCount: relations.he.length,
    branchChongCount: relations.chong.length,
  };
}

/** 로그/테스트 전용 — 문장 생성에는 쓰지 않는다. */
export function keyToString(key: ChapterOneInterpretationKey): string {
  return `${key.dayGan}(${key.dayElement}) | 배치:${key.dominantCategories.join("·") || "-"} | top2:${key.topCategories.join("·") || "-"} | 왕상휴수사:${key.seasonStatus} | 통근:${key.hasRoot ? "O" : "X"} | 합:${key.branchHeCount} | 충:${key.branchChongCount}`;
}
