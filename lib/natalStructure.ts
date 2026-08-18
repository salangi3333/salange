import { SajuUser } from "@/types";
import {
  Element,
  GAN_ELEMENT,
  GENERATES,
  elementThatGenerates,
  elementThatOvercomes,
} from "./hanjaTables";

/**
 * CALCULATION층 — SajuUser(이미 계산된 실제 명식)로부터 통근/육합·육충/
 * 왕상휴수사(득령 판정의 원재료)를 "사실"로만 도출한다. 해석 문장은 여기서
 * 만들지 않는다 — 다음 층(INTERPRETATION)이 이 값들을 조합해 의미를 붙인다.
 *
 * 새로 계산하는 것은 이 세 가지뿐이다. 신강/신약 종합판정, 용신, 삼합·형·파·
 * 해, 확장 신살은 이번 범위에 없다(추후 별도 승인 후).
 */

export type Stage = "year" | "month" | "day" | "hour";

// ────────────────────────────────────────────────────────────────
// 통근(通根)
// ────────────────────────────────────────────────────────────────

export interface RootMatch {
  stage: Stage;
  zhi: string;
  hiddenGan: string;
  hiddenGanElement: Element;
}

export interface RootAnalysis {
  dayElement: Element;
  hasRoot: boolean;
  matches: RootMatch[];
}

/** 4개 지지의 지장간(본기+중기+여기 전량) 중, 일간과 같은 오행을 가진
 * 천간이 있으면 전부 기록한다. 몇 개인지로 강약을 매기지 않는다(보류). */
export function analyzeRoot(user: SajuUser): RootAnalysis {
  const dayGan = user.pillars.day.hanja;
  const dayElement = GAN_ELEMENT[dayGan];

  const stages: { stage: Stage; zhi: string | null; hideGan: string[] | null }[] = [
    { stage: "year", zhi: user.pillars.branches.year.hanja, hideGan: user.natal.pillars.year.hideGan },
    { stage: "month", zhi: user.pillars.branches.month.hanja, hideGan: user.natal.pillars.month.hideGan },
    { stage: "day", zhi: user.pillars.branches.day.hanja, hideGan: user.natal.pillars.day.hideGan },
    {
      stage: "hour",
      zhi: user.pillars.branches.hour?.hanja ?? null,
      hideGan: user.natal.pillars.hour?.hideGan ?? null,
    },
  ];

  const matches: RootMatch[] = [];
  stages.forEach(({ stage, zhi, hideGan }) => {
    if (!zhi || !hideGan) return;
    hideGan.forEach((hiddenGan) => {
      const hiddenGanElement = GAN_ELEMENT[hiddenGan];
      if (hiddenGanElement === dayElement) {
        matches.push({ stage, zhi, hiddenGan, hiddenGanElement });
      }
    });
  });

  return { dayElement, hasRoot: matches.length > 0, matches };
}

// ────────────────────────────────────────────────────────────────
// 지지 육합(六合) · 육충(六沖)
// ────────────────────────────────────────────────────────────────

export interface BranchPair {
  type: "합" | "충";
  a: { stage: Stage; zhi: string };
  b: { stage: Stage; zhi: string };
}

export interface BranchRelations {
  he: BranchPair[];
  chong: BranchPair[];
}

const LIU_HE_PAIRS: [string, string][] = [
  ["子", "丑"],
  ["寅", "亥"],
  ["卯", "戌"],
  ["辰", "酉"],
  ["巳", "申"],
  ["午", "未"],
];

const LIU_CHONG_PAIRS: [string, string][] = [
  ["子", "午"],
  ["丑", "未"],
  ["寅", "申"],
  ["卯", "酉"],
  ["辰", "戌"],
  ["巳", "亥"],
];

function pairMatches(pairs: [string, string][], a: string, b: string): boolean {
  return pairs.some(([p, q]) => (p === a && q === b) || (p === b && q === a));
}

/** 실제로 존재하는 3~4개 지지 중, 고정 6쌍(육합/육충) 표와 일치하는 쌍만
 * 뽑는다. 삼합·반합처럼 3글자 조건이 필요한 것은 이번 범위에 없다. */
export function analyzeBranchRelations(user: SajuUser): BranchRelations {
  const branches: { stage: Stage; zhi: string }[] = (
    [
      { stage: "year" as Stage, zhi: user.pillars.branches.year.hanja },
      { stage: "month" as Stage, zhi: user.pillars.branches.month.hanja },
      { stage: "day" as Stage, zhi: user.pillars.branches.day.hanja },
      { stage: "hour" as Stage, zhi: user.pillars.branches.hour?.hanja ?? null },
    ] as { stage: Stage; zhi: string | null }[]
  ).filter((b): b is { stage: Stage; zhi: string } => Boolean(b.zhi));

  const he: BranchPair[] = [];
  const chong: BranchPair[] = [];

  for (let i = 0; i < branches.length; i++) {
    for (let j = i + 1; j < branches.length; j++) {
      const x = branches[i];
      const y = branches[j];
      if (pairMatches(LIU_HE_PAIRS, x.zhi, y.zhi)) {
        he.push({ type: "합", a: x, b: y });
      }
      if (pairMatches(LIU_CHONG_PAIRS, x.zhi, y.zhi)) {
        chong.push({ type: "충", a: x, b: y });
      }
    }
  }

  return { he, chong };
}

// ────────────────────────────────────────────────────────────────
// 왕상휴수사(旺相休囚死) — 득령 판정의 raw 상태값만. 득령=true/false
// 최종 단순화나 해석은 아직 붙이지 않는다.
// ────────────────────────────────────────────────────────────────

export type WangXiangStatus = "왕" | "상" | "휴" | "수" | "사";

export interface SeasonStatus {
  monthZhi: string;
  rulingElement: Element;
  dayElement: Element;
  status: WangXiangStatus;
}

/** 월지가 대표하는 계절 기운(令). 辰戌丑未는 환절기(토왕월)로 단순화했다 —
 * 절기 날짜로 매달을 이등분하는 "토왕용사" 정밀화는 이번 범위 밖. */
const SEASON_RULING_ELEMENT: Record<string, Element> = {
  寅: "wood",
  卯: "wood",
  辰: "earth",
  巳: "fire",
  午: "fire",
  未: "earth",
  申: "metal",
  酉: "metal",
  戌: "earth",
  亥: "water",
  子: "water",
  丑: "earth",
};

/** 當令者旺, 我生者相, 生我者休, 剋我者囚, 我剋者死 — 표준 정의를 그대로
 * 적용한다. 판정 자체는 5갈래 중 정확히 하나로 결정된다(모호함 없음). */
export function analyzeSeasonStatus(user: SajuUser): SeasonStatus {
  const dayGan = user.pillars.day.hanja;
  const dayElement = GAN_ELEMENT[dayGan];
  const monthZhi = user.pillars.branches.month.hanja;
  const rulingElement = SEASON_RULING_ELEMENT[monthZhi];

  let status: WangXiangStatus;
  if (dayElement === rulingElement) {
    status = "왕";
  } else if (GENERATES[rulingElement] === dayElement) {
    status = "상";
  } else if (elementThatGenerates(rulingElement) === dayElement) {
    status = "휴";
  } else if (elementThatOvercomes(rulingElement) === dayElement) {
    status = "수";
  } else {
    status = "사";
  }

  return { monthZhi, rulingElement, dayElement, status };
}
