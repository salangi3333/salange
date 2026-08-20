import { SajuUser } from "@/types";
import {
  Element,
  GAN_ELEMENT,
  GENERATES,
  OVERCOMES,
  elementThatGenerates,
  elementThatOvercomes,
} from "./hanjaTables";
import { Stage, analyzeSeasonStatus } from "./natalStructure";

/**
 * 3챕터("살아가는 방식과 관계운") 전용 — 승인된 세력 비교 설계안 구현.
 *
 * 지금까지 있던 categoryCounts(chapterOneInterpretation.ts)는 "몇 개
 * 나타나는가"만 센다. 여기서는 같은 개수라도 실제 작동 강도가 다를 수
 * 있다는 걸 반영하기 위해, 아래 4개 요인을 점수로 합산한다.
 *
 *  ① 출현 개수 — 카테고리 글자 1개당 +1점 (기존 categoryCounts와 같은
 *     스코프: 일주(일간+일지)는 세지 않는다 — "이 사람 주변에 이 기운이
 *     몇 번 나타나는가"를 보는 값이기 때문이다).
 *  ② 월령 — analyzeSeasonStatus(natalStructure.ts)의 왕상휴수사 공식을
 *     그대로 재사용하되, 일간이 아니라 각 카테고리의 오행에 적용한다.
 *     새 계산이 아니라 기존 공식을 다른 입력에 적용한 것뿐이다.
 *     왕+3 · 상+2 · 휴+0 · 수−1 · 사−2.
 *  ③ 통근(위치별) — 4개 지지(일지 포함) 지장간 중 카테고리 오행과
 *     일치하는 게 있으면 본기+3 · 중기+2 · 여기+1. 일지를 포함하는 건
 *     기존 analyzeRoot(natalStructure.ts)가 이미 일지를 포함해 통근을
 *     판정하는 것과 동일한 기준이다 — "개수(주변 요인)"와 "세력(이
 *     사람의 기반)"은 다른 질문이라 스코프가 다른 게 의도된 설계다.
 *  ④ 투간 — ③에서 찾은 뿌리와 같은 천간이 명식의 다른 자리에 실제로
 *     보이면, 그 뿌리의 위치와 같은 가중치를 추가한다(본기+3·중기+2·
 *     여기+1) — 뿌리 자체의 강도와 그것이 겉으로 드러나는 정도를 같은
 *     원칙으로 다룬다.
 *
 * 중요: 이 점수는 전통 명리의 절대 수치가 아니라, 3챕터 문장을 고르기
 * 위한 내부 비교값이다. 사용자 화면에는 숫자/등급을 노출하지 않는다.
 */

export type SipseongCategory = "비겁" | "식상" | "재성" | "관성" | "인성";

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

export interface RootHit {
  stage: Stage;
  zhi: string;
  hiddenGan: string;
  position: HidePosition;
  tou: boolean; // 투간 여부(같은 천간이 다른 자리에 실제로 보이는지)
}

export interface CategoryStrength {
  category: SipseongCategory;
  count: number;
  monthScore: number;
  rootScore: number;
  touScore: number;
  total: number;
  rootHits: RootHit[];
}

export interface StrengthResult {
  /** count > 0인 카테고리만, 세력 총점 내림차순 */
  active: CategoryStrength[];
  top: CategoryStrength | null;
  second: CategoryStrength | null;
  gap: number;
  /** A=압도(gap>=4 또는 단독) · B=우세(gap 2~3) · C=균형(gap<=1, 2개 이상일 때만) */
  tier: "A" | "B" | "C" | null;
}

interface OtherChar {
  stage: Stage;
  sipseong: string;
}

/** 일간·일지를 뺀 나머지 6(또는 4)글자 — categoryCounts(①)와 같은 스코프. */
function collectOtherChars(user: SajuUser): OtherChar[] {
  const others: OtherChar[] = [];
  (["year", "month", "hour"] as const).forEach((stage) => {
    const stem = user.pillars[stage];
    const branch = user.pillars.branches[stage];
    if (stem) others.push({ stage, sipseong: stem.sipseong });
    if (branch) others.push({ stage, sipseong: branch.sipseong });
  });
  return others;
}

export function analyzeCategoryStrength(user: SajuUser): StrengthResult {
  const dayGan = user.pillars.day.hanja;
  const dayElement = GAN_ELEMENT[dayGan];
  const season = analyzeSeasonStatus(user);
  const rulingElement = season.rulingElement;

  const counts: Record<SipseongCategory, number> = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 };
  collectOtherChars(user).forEach((c) => {
    const cat = SIPSEONG_TO_CATEGORY[c.sipseong];
    if (cat) counts[cat] += 1;
  });

  // ③④ 통근/투간 — 4개 지지(일지 포함) 지장간 전체를 대상으로 한다.
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
    if (count === 0) {
      return { category, count: 0, monthScore: 0, rootScore: 0, touScore: 0, total: -Infinity, rootHits: [] };
    }
    const targetEl = CATEGORY_TARGET_ELEMENT[category](dayElement);

    // ② 월령 — 기존 analyzeSeasonStatus 공식을 targetEl에 적용
    let monthScore: number;
    if (targetEl === rulingElement) monthScore = 3; // 왕
    else if (GENERATES[rulingElement] === targetEl) monthScore = 2; // 상
    else if (elementThatGenerates(rulingElement) === targetEl) monthScore = 0; // 휴
    else if (OVERCOMES[rulingElement] === targetEl) monthScore = -1; // 수
    else monthScore = -2; // 사

    // ③④ 통근 + 투간
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

  const active = all.filter((s) => s.count > 0).sort((a, b) => b.total - a.total);
  const top = active[0] ?? null;
  const second = active[1] ?? null;
  const gap = top && second ? top.total - second.total : Infinity;

  let tier: StrengthResult["tier"] = null;
  if (top) {
    if (!second) tier = "A";
    else if (gap >= 4) tier = "A";
    else if (gap >= 2) tier = "B";
    else tier = "C";
  }

  return { active, top, second, gap, tier };
}
