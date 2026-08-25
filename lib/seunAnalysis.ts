import { Solar } from "lunar-javascript";
import { GAN_HANGUL, ZHI_HANGUL } from "./hanjaTables";
import { computeSipseong } from "./aiLifeReport";
import { SipseongCategory } from "./strengthAnalysis";

/**
 * 04챕터("앞으로의 10년") 전용 — 세운(연간) 계산의 최소 기반.
 *
 * 새 명리 개념을 추가하는 게 아니라, 이미 검증된 부품들을 조립한다.
 *  - 세운 간지: aiLifeReport.ts의 buildTenYearFortune과 완전히 동일한
 *    lunar-javascript 호출 패턴(절기 경계를 피하려 6월 15일 기준일 사용)
 *  - 지장간 고정표: daYunWealthAnalysis.ts에 이미 있는 것과 동일한 표
 *    (그 파일의 주석대로 "실제 명식 4기둥에 쓰이는 것과 동일한 표준표",
 *    라이브러리 소스와 대조 확인됨) — 지장간은 날짜가 아니라 지지 글자
 *    자체에 대한 고정 배정이라 세운에도 그대로 적용 가능하다.
 *  - 십성: aiLifeReport.ts의 computeSipseong을 그대로 재사용
 *  - 육합/육충: natalStructure.ts / daYunWealthAnalysis.ts / lifeFlowInterpretation.ts
 *    에 이미 각자 독립적으로 존재하는 것과 동일한 고정 6쌍표
 *
 * 기존 파일(natalStructure.ts, daYunWealthAnalysis.ts, lifeFlowInterpretation.ts)은
 * 이 파일에서 전혀 import하지 않고, 그 파일들의 로컬 상수와 값이 같은 표를
 * 이 파일에도 독립적으로 둔다 — 기존 코드가 이미 3번 반복해온 것과 같은
 * 패턴이며, 기존 파일을 한 글자도 건드리지 않기 위한 선택이다.
 *
 * 이번 범위에 없는 것(의도적 제외, 추후 별도 승인 후 검토): 삼합·방합·
 * 형(자형 제외)·파·해, 합화(合化) 성립 여부 판정, 길흉/점수 판정, 사건
 * 자동 예측, 교운기(대운 전환 과도기) 정밀화. 문장은 이 파일에서 만들지
 * 않는다 — 계산값만 반환한다.
 *
 * 이번에 추가된 것(2차):
 *  - 천간합 5쌍(甲己·乙庚·丙辛·丁壬·戊癸) — "합 관계가 존재한다"는 사실만
 *    반환하고, 합화 성립 여부·오행 전환은 판정하지 않는다.
 *  - 자형(自刑)만 — 辰辰·午午·酉酉·亥亥, 세운 지지가 원국/대운의 같은
 *    글자와 만나는 경우만. 인사신·축술미 삼형, 자묘형 등 나머지 형은
 *    포함하지 않는다.
 */

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

const ZHI_HIDE_GAN_STATIC: Record<string, string[]> = {
  子: ["癸"],
  丑: ["己", "癸", "辛"],
  寅: ["甲", "丙", "戊"],
  卯: ["乙"],
  辰: ["戊", "乙", "癸"],
  巳: ["丙", "庚", "戊"],
  午: ["丁", "己"],
  未: ["己", "丁", "乙"],
  申: ["庚", "壬", "戊"],
  酉: ["辛"],
  戌: ["戊", "辛", "丁"],
  亥: ["壬", "甲"],
};

type HidePosition = "본기" | "중기" | "여기";
function positionOf(index: number): HidePosition {
  return index === 0 ? "본기" : index === 1 ? "중기" : "여기";
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

/** 천간합 5쌍. "합 관계가 존재한다"는 사실만 판정한다 — 합화(合化)가
 * 실제로 성립하는지(계절·세력 조건)는 이번 범위에 없다. */
const GAN_HE_PAIRS: [string, string][] = [
  ["甲", "己"],
  ["乙", "庚"],
  ["丙", "辛"],
  ["丁", "壬"],
  ["戊", "癸"],
];
function ganHeMatches(a: string, b: string): boolean {
  return GAN_HE_PAIRS.some(([p, q]) => (p === a && q === b) || (p === b && q === a));
}

/** 자형(自刑)만. 형 전체(인사신·축술미 삼형, 자묘형)가 아니라, 같은
 * 글자가 겹치는 4개(辰辰·午午·酉酉·亥亥)만 다룬다. */
const SELF_PUNISH_ZHI = new Set(["辰", "午", "酉", "亥"]);
function isSelfPunish(a: string, b: string): boolean {
  return a === b && SELF_PUNISH_ZHI.has(a);
}

export type Stage = "year" | "month" | "day" | "hour";
export type SeunRelationType = "합" | "충";

export interface SeunHiddenStem {
  hiddenGan: string;
  position: HidePosition;
  sipseong: string;
  category: SipseongCategory | null;
}

export interface SeunNatalRelation {
  type: SeunRelationType;
  stage: Stage;
  natalZhi: string;
}

export interface SeunDayunRelation {
  type: SeunRelationType;
  dayunZhi: string;
}

export interface NatalBranchInput {
  stage: Stage;
  zhi: string;
}

export interface NatalStemInput {
  stage: Stage;
  gan: string;
}

export interface SeunGanHeRelation {
  stage: Stage;
  natalGan: string;
}

export interface SeunDayunGanHeRelation {
  dayunGan: string;
}

export interface SeunSelfPunishRelation {
  stage: Stage;
  natalZhi: string;
}

export interface SeunDayunSelfPunishRelation {
  dayunZhi: string;
}

export interface CurrentDayunInput {
  /** 2글자 간지 문자열, 예: "戊午" */
  ganZhi: string;
  /** 대운 천간의 십성, 예: "상관" */
  ganSipseong: string;
}

export interface SeunKey {
  year: number;
  seunGanHanja: string;
  seunGanHangul: string;
  seunJiHanja: string;
  seunJiHangul: string;
  /** 세운 천간의 십성 */
  seunGanSipseong: string;
  seunGanCategory: SipseongCategory | null;
  /** 세운 지지 표면 십성(지장간 본기 기준 — 원국 표기 관례와 동일) */
  seunJiSipseong: string;
  seunJiCategory: SipseongCategory | null;
  /** 지장간 전체(본기/중기/여기)와 각각의 십성 */
  hiddenStems: SeunHiddenStem[];
  /** 세운 지지 vs 원국 4지지의 육합·육충 */
  natalRelations: SeunNatalRelation[];
  /** 세운 지지 vs 현재 대운 지지의 육합·육충 */
  dayunRelations: SeunDayunRelation[];
  /** 세운 천간 vs 원국 천간의 천간합(존재 여부만, 합화 판정 없음) */
  ganHeNatal: SeunGanHeRelation[];
  /** 세운 천간 vs 현재 대운 천간의 천간합 */
  ganHeDayun: SeunDayunGanHeRelation[];
  /** 세운 지지 vs 원국 지지의 자형(辰辰·午午·酉酉·亥亥만) */
  selfPunishNatal: SeunSelfPunishRelation[];
  /** 세운 지지 vs 현재 대운 지지의 자형 */
  selfPunishDayun: SeunDayunSelfPunishRelation[];
  currentDayunGanZhi: string;
  currentDayunSipseong: string;
  currentDayunCategory: SipseongCategory | null;
}

/** 실제 달력상 해당 연도의 세운 간지를 얻는다. buildTenYearFortune과
 * 완전히 동일한 호출 방식(그 함수는 건드리지 않고 패턴만 재사용) —
 * 절기 경계에 걸리지 않도록 동일하게 6월 15일을 기준일로 쓴다. */
function getSeunGanZhi(year: number): { gan: string; zhi: string } {
  const solar = Solar.fromYmd(year, 6, 15);
  const ec = solar.getLunar().getEightChar();
  return { gan: ec.getYearGan(), zhi: ec.getYearZhi() };
}

export function buildSeunKey(
  dayGan: string,
  year: number,
  natalBranches: NatalBranchInput[],
  currentDayun: CurrentDayunInput,
  natalStems: NatalStemInput[] = []
): SeunKey {
  const { gan: seunGan, zhi: seunZhi } = getSeunGanZhi(year);

  const seunGanSipseong = computeSipseong(dayGan, seunGan);
  const seunGanCategory = SIPSEONG_TO_CATEGORY[seunGanSipseong] ?? null;

  const hideGanList = ZHI_HIDE_GAN_STATIC[seunZhi] ?? [];
  const hiddenStems: SeunHiddenStem[] = hideGanList.map((hg, idx) => {
    const sipseong = computeSipseong(dayGan, hg);
    return {
      hiddenGan: hg,
      position: positionOf(idx),
      sipseong,
      category: SIPSEONG_TO_CATEGORY[sipseong] ?? null,
    };
  });

  const seunJiSipseong = hiddenStems[0]?.sipseong ?? "";
  const seunJiCategory = hiddenStems[0]?.category ?? null;

  const natalRelations: SeunNatalRelation[] = [];
  natalBranches.forEach((nb) => {
    if (pairMatches(LIU_HE_PAIRS, seunZhi, nb.zhi)) {
      natalRelations.push({ type: "합", stage: nb.stage, natalZhi: nb.zhi });
    }
    if (pairMatches(LIU_CHONG_PAIRS, seunZhi, nb.zhi)) {
      natalRelations.push({ type: "충", stage: nb.stage, natalZhi: nb.zhi });
    }
  });

  const dayunZhi = currentDayun.ganZhi[1] ?? "";
  const dayunRelations: SeunDayunRelation[] = [];
  if (dayunZhi) {
    if (pairMatches(LIU_HE_PAIRS, seunZhi, dayunZhi)) {
      dayunRelations.push({ type: "합", dayunZhi });
    }
    if (pairMatches(LIU_CHONG_PAIRS, seunZhi, dayunZhi)) {
      dayunRelations.push({ type: "충", dayunZhi });
    }
  }

  const ganHeNatal: SeunGanHeRelation[] = [];
  natalStems.forEach((ns) => {
    if (ganHeMatches(seunGan, ns.gan)) {
      ganHeNatal.push({ stage: ns.stage, natalGan: ns.gan });
    }
  });

  const dayunGan = currentDayun.ganZhi[0] ?? "";
  const ganHeDayun: SeunDayunGanHeRelation[] = [];
  if (dayunGan && ganHeMatches(seunGan, dayunGan)) {
    ganHeDayun.push({ dayunGan });
  }

  const selfPunishNatal: SeunSelfPunishRelation[] = [];
  natalBranches.forEach((nb) => {
    if (isSelfPunish(seunZhi, nb.zhi)) {
      selfPunishNatal.push({ stage: nb.stage, natalZhi: nb.zhi });
    }
  });

  const selfPunishDayun: SeunDayunSelfPunishRelation[] = [];
  if (dayunZhi && isSelfPunish(seunZhi, dayunZhi)) {
    selfPunishDayun.push({ dayunZhi });
  }

  return {
    year,
    seunGanHanja: seunGan,
    seunGanHangul: GAN_HANGUL[seunGan] ?? "",
    seunJiHanja: seunZhi,
    seunJiHangul: ZHI_HANGUL[seunZhi] ?? "",
    seunGanSipseong,
    seunGanCategory,
    seunJiSipseong,
    seunJiCategory,
    hiddenStems,
    natalRelations,
    dayunRelations,
    ganHeNatal,
    ganHeDayun,
    selfPunishNatal,
    selfPunishDayun,
    currentDayunGanZhi: currentDayun.ganZhi,
    currentDayunSipseong: currentDayun.ganSipseong,
    currentDayunCategory: SIPSEONG_TO_CATEGORY[currentDayun.ganSipseong] ?? null,
  };
}

/** 2027~2036처럼 연속된 구간을 한 번에 만들 때 쓰는 편의 함수.
 * buildSeunKey를 반복 호출할 뿐, 별도 로직은 없다. */
export function buildSeunRange(
  dayGan: string,
  startYear: number,
  endYear: number,
  natalBranches: NatalBranchInput[],
  currentDayun: CurrentDayunInput,
  natalStems: NatalStemInput[] = []
): SeunKey[] {
  const result: SeunKey[] = [];
  for (let y = startYear; y <= endYear; y++) {
    result.push(buildSeunKey(dayGan, y, natalBranches, currentDayun, natalStems));
  }
  return result;
}
