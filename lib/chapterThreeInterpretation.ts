import { SajuUser } from "@/types";
import { AppData } from "./sajuContent";
import { Stage, analyzeBranchRelations, analyzeRoot, RootAnalysis, BranchPair } from "./natalStructure";
import { analyzeCategoryStrength, SipseongCategory, StrengthResult, RootHit } from "./strengthAnalysis";

/**
 * 3챕터("살아가는 방식과 관계운") 전용 INTERPRETATION층 — strengthAnalysis
 * (CALCULATION에 가까운 순수 점수 계산)와 기존 natalStructure.ts(통근·
 * 합충)를 조합해, chapterThreeNarrative.ts가 바로 쓸 수 있는 "판단 결과"
 * 로 압축한다. 여기서도 문장은 만들지 않는다.
 *
 * 승인된 예외 규칙:
 *  - 관살혼잡은 세력 순위와 무관하게 항상 별도 보조 구조로 포함한다.
 *  - 통근 없음은 삭제하지 않고 별도 서사 재료로 쓴다.
 *  - 합/충 둘 다 있을 때, 같은 지지가 겹치면(合逢沖散) 그 지지를 중심으로
 *    "흔들리는 결속"으로, 겹치지 않으면 둘을 각각 다른 관계 국면으로 쓴다.
 */

export interface GwansalHonjapInfo {
  present: boolean;
  pyeongwan?: { stage: Stage; hangul: string; hanja: string };
  jeonggwan?: { stage: Stage; hangul: string; hanja: string };
}

export type HeChongPattern = "둘다없음" | "합만" | "충만" | "겹침" | "안겹침";

export interface HeChongInfo {
  he: BranchPair[];
  chong: BranchPair[];
  pattern: HeChongPattern;
  /** pattern이 "겹침"일 때만 존재 — 합과 충 모두에 관여하는 지지와 그 자리 */
  overlap?: { stage: Stage; zhi: string };
}

export interface ChapterThreeKey {
  strength: StrengthResult;
  axis: SipseongCategory | null;
  /** 1차 중심축(카테고리) 자체의 통근 — "이 기운이 실제로 지속 작동하는가"
   * 를 보조로 설명할 때만 쓴다. "쉽게 무너지지 않는다"는 안정성 문장의
   * 근거로는 쓰지 않는다(그 근거는 dayMasterRoot다). */
  axisRootHits: RootHit[];
  hasAxisRoot: boolean;
  /** 일간(day master) 자신의 통근 — natalStructure.ts의 기존 analyzeRoot를
   * 그대로 재사용한다(새 계산 아님). "쉽게 무너지지 않는 이유가 있다"는
   * 안정성/근기 문장은 반드시 이 값을 근거로 한다 — 중심축이 비겁이 아닌
   * 사람에게 중심축 통근을 일간의 근기로 둔갑시키지 않기 위함. */
  dayMasterRoot: RootAnalysis;
  secondAxis: SipseongCategory | null;
  tier: "A" | "B" | "C" | null;
  gwansal: GwansalHonjapInfo;
  heChong: HeChongInfo;
}

function detectGwansalHonjap(user: SajuUser): GwansalHonjapInfo {
  const others: { stage: Stage; sipseong: string; hangul: string; hanja: string }[] = [];
  (["year", "month", "hour"] as const).forEach((stage) => {
    const g = user.pillars[stage];
    const z = user.pillars.branches[stage];
    if (g) others.push({ stage, sipseong: g.sipseong, hangul: g.hangul, hanja: g.hanja });
    if (z) others.push({ stage, sipseong: z.sipseong, hangul: z.hangul, hanja: z.hanja });
  });
  const pyeongwan = others.find((o) => o.sipseong === "편관");
  const jeonggwan = others.find((o) => o.sipseong === "정관");
  if (!pyeongwan || !jeonggwan) return { present: false };
  return {
    present: true,
    pyeongwan: { stage: pyeongwan.stage, hangul: pyeongwan.hangul, hanja: pyeongwan.hanja },
    jeonggwan: { stage: jeonggwan.stage, hangul: jeonggwan.hangul, hanja: jeonggwan.hanja },
  };
}

function detectHeChong(user: SajuUser): HeChongInfo {
  const rel = analyzeBranchRelations(user);
  const he = rel.he;
  const chong = rel.chong;

  if (he.length === 0 && chong.length === 0) return { he, chong, pattern: "둘다없음" };
  if (he.length > 0 && chong.length === 0) return { he, chong, pattern: "합만" };
  if (he.length === 0 && chong.length > 0) return { he, chong, pattern: "충만" };

  // 둘 다 있음 — 같은 지지가 합/충에 동시에 걸리는지(合逢沖散) 확인
  const heSides = he.flatMap((p) => [p.a, p.b]);
  const chongZhis = new Set(chong.flatMap((p) => [p.a.zhi, p.b.zhi]));
  const overlapSide = heSides.find((side) => chongZhis.has(side.zhi));
  if (overlapSide) return { he, chong, pattern: "겹침", overlap: { stage: overlapSide.stage, zhi: overlapSide.zhi } };
  return { he, chong, pattern: "안겹침" };
}

export function buildChapterThreeKey(appData: AppData): ChapterThreeKey {
  const user = appData.user;
  const strength = analyzeCategoryStrength(user);
  const axis = strength.top?.category ?? null;
  const axisRootHits = strength.top?.rootHits ?? [];
  const secondAxis = strength.tier === "B" || strength.tier === "C" ? strength.second?.category ?? null : null;

  return {
    strength,
    axis,
    axisRootHits,
    hasAxisRoot: axisRootHits.length > 0,
    dayMasterRoot: analyzeRoot(user),
    secondAxis,
    tier: strength.tier,
    gwansal: detectGwansalHonjap(user),
    heChong: detectHeChong(user),
  };
}
