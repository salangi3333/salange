import { DaYunWealthPeriod } from "./daYunWealthAnalysis";
import { SeunKey, SeunGanHeRelation } from "./seunAnalysis";

/**
 * 사랑·인연 2단계 — 배우자궁(일지) 전용 관계 신호 추출 레이어.
 *
 * 배우자궁은 일지(day branch)로 고정한다(확정 사항). 새 합/충/형 계산을
 * 만들지 않는다:
 *
 *  - 대운 쪽: 대운 지지 vs 일지의 육합/육충만 판별한다. 육합/육충 고정
 *    6쌍표는 natalStructure.ts/lifeFlowInterpretation.ts/seunAnalysis.ts가
 *    이미 각자 독립적으로 갖고 있는 것과 동일한 표를 그대로 옮긴 것이다
 *    (그 파일들이 이미 반복해온 패턴 — 서로 import하지 않고 로컬에 같은
 *    표를 두는 방식을 그대로 따랐다). 대운 쪽 자형(自刑)은 원래 어느
 *    기존 파일에서도 계산된 적이 없어 이번에도 새로 만들지 않는다(대운은
 *    합/충만 판별).
 *  - 세운 쪽: seunAnalysis.ts의 SeunKey가 이미 계산해 둔 natalRelations
 *    (육합/육충, stage 포함)와 selfPunishNatal(자형, 辰辰·午午·酉酉·亥亥만,
 *    stage 포함)을 stage==="day"로 필터링만 한다 — 새 계산이 아니라 이미
 *    존재하는 배열을 좁히는 것뿐이다.
 *  - 파(破)·해(害)·나머지 형(삼형·자묘형 등)·삼합/반합은 어느 기존 파일도
 *    계산하지 않으므로 이번에도 다루지 않는다(향후 보강 항목).
 *  - 천간합(세운 vs 원국 각 자리 천간)은 stage==="day"라 해도 일지가
 *    아니라 일간(자기 자신)을 가리키므로 배우자궁 신호로 섞지 않는다 —
 *    별도 필드(ganHeReference)에 원본 그대로만 보존한다.
 *
 * "합=결혼/충=이별" 같은 사건 확정 규칙은 만들지 않는다. 반환값은 순수
 * 사실(관계 종류 + 원본 대운/세운 참조)뿐이다.
 */

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

export type SpousePalaceRelationType = "합" | "충" | "자형";

export interface SpousePalaceDaYunSignal {
  period: DaYunWealthPeriod;
  /** 대운 쪽은 자형을 계산하지 않으므로 합/충만 나온다. */
  relationType: "합" | "충";
}

export interface SpousePalaceSeunSignal {
  seun: SeunKey;
  relationType: SpousePalaceRelationType;
}

export interface SpousePalaceRelations {
  dayBranch: string;
  daYun: SpousePalaceDaYunSignal[];
  seun: SpousePalaceSeunSignal[];
  /** 세운 vs 원국 천간합 원본(SeunKey.ganHeNatal) — 배우자궁(지지) 신호와
   * 의미가 다르므로 섞지 않고 참조용으로만 그대로 보존한다. */
  ganHeReference: SeunGanHeRelation[];
}

export function findSpousePalaceRelations(
  dayBranch: string,
  daYunPeriods: DaYunWealthPeriod[],
  seunKeys: SeunKey[]
): SpousePalaceRelations {
  const daYun: SpousePalaceDaYunSignal[] = [];
  daYunPeriods.forEach((period) => {
    const zhi = period.ganZhi[1];
    if (pairMatches(LIU_HE_PAIRS, dayBranch, zhi)) daYun.push({ period, relationType: "합" });
    if (pairMatches(LIU_CHONG_PAIRS, dayBranch, zhi)) daYun.push({ period, relationType: "충" });
  });

  const seun: SpousePalaceSeunSignal[] = [];
  const ganHeReference: SeunGanHeRelation[] = [];
  seunKeys.forEach((sk) => {
    sk.natalRelations
      .filter((r) => r.stage === "day")
      .forEach((r) => seun.push({ seun: sk, relationType: r.type }));
    sk.selfPunishNatal
      .filter((r) => r.stage === "day")
      .forEach(() => seun.push({ seun: sk, relationType: "자형" }));
    ganHeReference.push(...sk.ganHeNatal);
  });

  return { dayBranch, daYun, seun, ganHeReference };
}
