import { AppData } from "./sajuContent";
import { Stage } from "./natalStructure";
import { analyzeCategoryStrength, SipseongCategory } from "./strengthAnalysis";
import { analyzeDaYunWealth, pickPastCurrentNext, DaYunWealthPeriod } from "./daYunWealthAnalysis";

/**
 * 4챕터 이후 "무료→유료 전환 구간"(내 인생의 큰 흐름 / 나의 대운 흐름 /
 * 아직 펼쳐지지 않은 기록) 전용 INTERPRETATION층. 새 5챕터 장문 풀이가
 * 아니다 — 4챕터에서 검증된 함수(analyzeDaYunWealth)와 3챕터에서 검증된
 * 함수(analyzeCategoryStrength)를 그대로 재사용해 판단값만 조립한다.
 * 여기서는 문장을 만들지 않는다.
 *
 * 새로 계산하는 것은 "대운 지지 vs 원국 4지지 육합/육충" 하나뿐이고,
 * 이것도 natalStructure.ts의 기존 6쌍 고정표(LIU_HE_PAIRS/LIU_CHONG_PAIRS)를
 * 그대로 옮겨 대상만 확장한 것이다(그 파일 자체는 건드리지 않는다 — 이미
 * 3~4챕터에서 반복된 방식). 삼합/반합/천간합/형/파/해는 여전히 사용하지
 * 않는다.
 */

const LIU_HE_PAIRS: [string, string][] = [
  ["子", "丑"], ["寅", "亥"], ["卯", "戌"], ["辰", "酉"], ["巳", "申"], ["午", "未"],
];
const LIU_CHONG_PAIRS: [string, string][] = [
  ["子", "午"], ["丑", "未"], ["寅", "申"], ["卯", "酉"], ["辰", "戌"], ["巳", "亥"],
];
function pairMatches(pairs: [string, string][], a: string, b: string): boolean {
  return pairs.some(([p, q]) => (p === a && q === b) || (p === b && q === a));
}

export interface DaYunNatalRelation {
  type: "합" | "충";
  natalStage: Stage;
  natalZhi: string;
}

function findDaYunNatalRelations(
  natalBranches: { stage: Stage; zhi: string }[],
  dayYunZhi: string
): DaYunNatalRelation[] {
  const rel: DaYunNatalRelation[] = [];
  natalBranches.forEach((nb) => {
    if (pairMatches(LIU_HE_PAIRS, dayYunZhi, nb.zhi)) rel.push({ type: "합", natalStage: nb.stage, natalZhi: nb.zhi });
    if (pairMatches(LIU_CHONG_PAIRS, dayYunZhi, nb.zhi)) rel.push({ type: "충", natalStage: nb.stage, natalZhi: nb.zhi });
  });
  return rel;
}

/** 연속된 대운이 같은 5축 카테고리를 가지면 하나의 "국면"으로 묶는다.
 * 새 계산이 아니라 이미 계산된 ganCategory를 순회하며 묶는 것뿐이다.
 * 고정 3단계(초년/중년/말년) 템플릿이 아니라, 사람마다 실제 대운 배열에서
 * 자연 발생하는 경계다. */
export interface LifePhase {
  category: SipseongCategory | null;
  startAge: number;
  endAge: number;
  periods: DaYunWealthPeriod[];
  isNatalAxis: boolean;
}

function buildPhases(periods: DaYunWealthPeriod[], natalAxis: SipseongCategory | null): LifePhase[] {
  const phases: LifePhase[] = [];
  periods.forEach((p) => {
    const last = phases[phases.length - 1];
    if (last && last.category === p.ganCategory) {
      last.endAge = p.endAge;
      last.periods.push(p);
    } else {
      phases.push({ category: p.ganCategory, startAge: p.startAge, endAge: p.endAge, periods: [p], isNatalAxis: p.ganCategory === natalAxis && p.ganCategory !== null });
    }
  });
  return phases;
}

export interface LifeFlowKey {
  /** 원국 중심축 — 3챕터와 동일한 analyzeCategoryStrength 재사용. tier는
   * 내부 판단(서술 강도 선택)에만 쓰고 화면에는 절대 노출하지 않는다. */
  natalAxis: SipseongCategory | null;
  natalAxisTier: "A" | "B" | "C" | null;
  secondAxis: SipseongCategory | null;
  /** 배우자궁(일지) 자체의 정확한 십성 — "사랑과 인연" 잠금 목차 근거 */
  dayBranchSipseong: string;
  dayBranchCategory: SipseongCategory | null;
  phases: LifePhase[];
  currentPhaseIndex: number;
  /** 국면이 하나 더 있으면 다음 국면 시작 나이(=인생의 전환점 제목에 쓸
   * 실제 나이). 마지막 국면이 현재 국면이면 null. */
  nextPhaseTransitionAge: number | null;
  daYun: {
    past: DaYunWealthPeriod | null;
    current: DaYunWealthPeriod | null;
    next: DaYunWealthPeriod | null;
  };
  relations: {
    past: DaYunNatalRelation[];
    current: DaYunNatalRelation[];
    next: DaYunNatalRelation[];
  };
}

export function buildLifeFlowKey(appData: AppData): LifeFlowKey {
  const user = appData.user;
  const dayGan = user.pillars.day.hanja;

  const strength = analyzeCategoryStrength(user);
  const natalAxis = strength.top?.category ?? null;
  const natalAxisTier = strength.tier;
  const secondAxis = strength.second?.category ?? null;

  const dayBranchSipseong = user.pillars.branches.day.sipseong;
  const SIPSEONG_TO_CATEGORY: Record<string, SipseongCategory> = {
    비견: "비겁", 겁재: "비겁", 식신: "식상", 상관: "식상",
    편재: "재성", 정재: "재성", 편관: "관성", 정관: "관성",
    편인: "인성", 정인: "인성",
  };
  const dayBranchCategory = SIPSEONG_TO_CATEGORY[dayBranchSipseong] ?? null;

  const periods = analyzeDaYunWealth(dayGan, appData.fortuneTimelineNodes);
  const phases = buildPhases(periods, natalAxis);
  const currentPhaseIndex = phases.findIndex((ph) => ph.periods.some((p) => p.state === "current"));
  const nextPhaseTransitionAge =
    currentPhaseIndex >= 0 && currentPhaseIndex < phases.length - 1 ? phases[currentPhaseIndex].endAge + 1 : null;

  const daYun = pickPastCurrentNext(periods);

  const natalBranches: { stage: Stage; zhi: string }[] = [
    { stage: "year", zhi: user.pillars.branches.year.hanja },
    { stage: "month", zhi: user.pillars.branches.month.hanja },
    { stage: "day", zhi: user.pillars.branches.day.hanja },
    ...(user.pillars.branches.hour ? [{ stage: "hour" as Stage, zhi: user.pillars.branches.hour.hanja }] : []),
  ];

  return {
    natalAxis,
    natalAxisTier,
    secondAxis,
    dayBranchSipseong,
    dayBranchCategory,
    phases,
    currentPhaseIndex,
    nextPhaseTransitionAge,
    daYun,
    relations: {
      past: daYun.past ? findDaYunNatalRelations(natalBranches, daYun.past.ganZhi[1]) : [],
      current: daYun.current ? findDaYunNatalRelations(natalBranches, daYun.current.ganZhi[1]) : [],
      next: daYun.next ? findDaYunNatalRelations(natalBranches, daYun.next.ganZhi[1]) : [],
    },
  };
}
