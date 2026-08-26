import { AppData } from "./sajuContent";
import { analyzeDayMasterBalance } from "./dayMasterBalanceAnalysis";
import { analyzeYongsinCandidate, YongsinOutcome, YongsinHoldReason } from "./yongsinCandidateAnalysis";
import { analyzeHuisinCandidate } from "./huisinCandidateAnalysis";
import { analyzeDaYunWealth, pickPastCurrentNext, DaYunWealthPeriod } from "./daYunWealthAnalysis";
import { buildSeunRange, NatalBranchInput, NatalStemInput, SeunKey } from "./seunAnalysis";
import { SipseongCategory } from "./strengthAnalysis";

/**
 * 6장("돈이 움직이는 시기") — 대운·세운 시기 판정 CALCULATION 레이어.
 *
 * 독립 모듈이다. 새 명리 계산은 하지 않는다 — 이미 동결된
 * `analyzeDayMasterBalance`/`analyzeYongsinCandidate`/`analyzeHuisinCandidate`
 * 의 balance·winners·pairs와, `analyzeDaYunWealth`/`buildSeunRange`의
 * 대운·세운 계산값만 재사용해 A~E 분류·교차 라벨을 조립한다. 01~05장의
 * 계산 파일(dayMasterBalanceAnalysis.ts, yongsinCandidateAnalysis.ts,
 * huisinCandidateAnalysis.ts, daYunWealthAnalysis.ts, seunAnalysis.ts)은
 * 이 파일에서 전혀 수정하지 않는다(import해서 읽기만 한다).
 *
 * 설계는 scripts/_ch06_timing_design_verify.ts / _ch06_extra4_verify.ts로
 * 12명 표본에 대해 최종 PASS된 것을 그대로 옮긴 것이다 — 이 파일에서
 * 임계값·점수·새 명리 개념을 추가하지 않는다.
 *
 * 핵심 원칙(승인된 설계, 변경 금지):
 *  - 원국(체질) → 대운(그 체질이 만나는 10년 환경) → 세운(그 안의 한 해
 *    고유 신호) → 교차(대운×세운 라벨 조합) 로 역할을 분리한다.
 *  - `wealthExcess`(재다신약 등 원국 재성 과다 체질)는 대운 판정에서만
 *    배경 overlay로 쓴다(`applyWealthOverlay=true`). 세운 자체 판정에는
 *    이 값을 전혀 참조하지 않는다(`applyWealthOverlay=false`) — 그래야
 *    같은 wealthExcess 체질이라도 세운마다 다른 라벨(E/D/A/C)이 나온다.
 *  - A~E는 점수가 아니라 카테고리 일치/공격 여부만으로 정해지는
 *    결정론적 분류다. 문장 생성은 6장 해석 레이어의 몫이다 — 이 파일은
 *    "무엇이 강화형인가"만 답하고 "그래서 어떻다"는 답하지 않는다.
 */

export type TimingLabel =
  | "강화형(A)"
  | "부담형(B)"
  | "기반형(C)"
  | "분산/흔들림형(D)"
  | "신호없음형(E)";

export interface TimingClassification {
  label: TimingLabel;
  reasons: string[];
}

export interface DaYunTimingPeriod {
  period: DaYunWealthPeriod;
  classification: TimingClassification;
}

export type CrossPattern =
  | "누적강화" // 대운 A + 세운 A
  | "단발성기회" // 대운 ≠A + 세운 A
  | "좋은흐름속일시적리스크" // 대운 A + 세운 D/B
  | "부담대운속도움되는해"; // 대운 B + 세운 A

export interface SeunTimingYear {
  seun: SeunKey;
  classification: TimingClassification;
  /** 4가지 교차 패턴 중 하나에 해당할 때만 존재. 그 외엔 undefined —
   * 억지로 아무 교차나 만들어 붙이지 않는다. */
  crossPattern?: CrossPattern;
}

export type WealthTimingNotApplicableReason =
  | "yongsinNotApplicable" // 용신 자체가 적용 대상 아님(중화/특수구조/보류)
  | "yongsinHold" // 용신 outcome === "hold"
  | "yongsinUnresolved"; // 용신 outcome === "unresolved"(3후보 잔존)

export interface WealthTimingResult {
  /** 용신이 single/multiple로 확정되지 않으면 시기 판정 자체가
   * 성립하지 않는다(카테고리 일치 여부를 매길 기준이 없음) — 이때는
   * false와 사유만 반환한다. huisinCandidateAnalysis.ts가 yongsin.outcome을
   * notApplicableReason으로 그대로 전달하는 것과 동일한 패턴이다. */
  applicable: boolean;
  notApplicableReason?: WealthTimingNotApplicableReason;
  yongsinHoldReason?: YongsinHoldReason;

  /** 전체 대운 목록(과거·현재·미래 전부) 각각의 분류. */
  daYunPeriods: DaYunTimingPeriod[];
  currentDaYun: DaYunTimingPeriod | null;
  nextDaYun: DaYunTimingPeriod | null;

  /** 현재(없으면 다음) 대운 구간을 기준으로 한 대표 5개년 세운 판정 +
   * 교차 라벨. 대운이 아직 시작 전이라 current/next가 모두 없으면
   * 빈 배열. */
  representativeSeun: SeunTimingYear[];
}

// 대운·세운 카테고리가 "무엇을 극(剋)하는가" — 용신 엔진의 WARN_KEY와
// 정확히 같은 5개 관계를 반대 방향(공격측 기준)으로 재구성한 것. 새
// 관계가 아니다.
export const ATTACKS: Record<SipseongCategory, SipseongCategory> = {
  인성: "식상",
  비겁: "재성",
  식상: "관성",
  재성: "인성",
  관성: "비겁",
};

function classifyPeriod(
  hasWealth: boolean,
  cat: SipseongCategory | null,
  yongsinCats: SipseongCategory[],
  huisinCats: SipseongCategory[],
  structureFlags: string[],
  supportIntoHuisinCats: SipseongCategory[],
  applyWealthOverlay: boolean
): TimingClassification {
  if (!cat) return { label: "신호없음형(E)", reasons: ["카테고리 불명"] };

  const attacked = ATTACKS[cat];
  const attacksYongsinOrHuisin = [...yongsinCats, ...huisinCats].includes(attacked);
  const matchesYongsin = yongsinCats.includes(cat);
  const matchesHuisin = huisinCats.includes(cat);

  if (attacksYongsinOrHuisin) {
    return { label: "분산/흔들림형(D)", reasons: [`대운·세운 ${cat}이 ${attacked}을(를) 극함(용신·희신 대상)`] };
  }

  if (matchesYongsin || matchesHuisin) {
    if (hasWealth) {
      // wealthExcess는 원국에 고정된 체질값이라 세운마다 재적용하지 않는다.
      // 대운 호출(applyWealthOverlay=true)일 때만, 원래 강화형(A)이었을
      // 결과를 "체질상 이 10년은 그 강화가 부담으로 작동한다"는 뜻의
      // 부담형(B)으로 하향한다.
      if (applyWealthOverlay && structureFlags.includes("wealthExcess")) {
        return {
          label: "부담형(B)",
          reasons: [`${cat}=용신/희신 일치+재물신호로 본래 강화형이나, 원국 wealthExcess 체질상 이 10년은 그 강화가 부담으로 작동`],
        };
      }
      return { label: "강화형(A)", reasons: [`${cat}=용신/희신 일치`, "재물신호 동반"] };
    }
    return { label: "기반형(C)", reasons: [`${cat}=용신/희신 일치`, "재물신호는 약함"] };
  }

  // E(신호없음) 보정: 억지로 다른 등급에 넣지 않되, "정말 아무 관련 없음"과
  // "희신의 2차 지원축과는 겹침"을 구분해 reasons만 풍부하게 남긴다.
  if (supportIntoHuisinCats.includes(cat)) {
    return {
      label: "신호없음형(E)",
      reasons: ["재물 직접 신호 없음", "용신/희신 자체와도 불일치", `다만 ${cat}은 희신을 뒷받침하는 2차 지원축과 일치 — 간접적으로 기반이 다져지는 시기일 수 있음`],
    };
  }
  return { label: "신호없음형(E)", reasons: ["재물 직접 신호 없음", "용신/희신 및 그 지원축과도 무관"] };
}

function computeCrossPattern(daYunLabel: TimingLabel, seunLabel: TimingLabel): CrossPattern | undefined {
  if (seunLabel === "강화형(A)" && daYunLabel === "강화형(A)") return "누적강화";
  if (seunLabel === "강화형(A)" && daYunLabel !== "강화형(A)") return "단발성기회";
  if (daYunLabel === "강화형(A)" && (seunLabel === "분산/흔들림형(D)" || seunLabel === "부담형(B)")) return "좋은흐름속일시적리스크";
  if (daYunLabel === "부담형(B)" && seunLabel === "강화형(A)") return "부담대운속도움되는해";
  return undefined;
}

function yongsinNotApplicableResult(reason: WealthTimingNotApplicableReason, holdReason?: YongsinHoldReason): WealthTimingResult {
  return {
    applicable: false,
    notApplicableReason: reason,
    yongsinHoldReason: holdReason,
    daYunPeriods: [],
    currentDaYun: null,
    nextDaYun: null,
    representativeSeun: [],
  };
}

export function analyzeWealthTiming(appData: AppData): WealthTimingResult {
  const user = appData.user;
  const dayGan = user.pillars.day.hanja;

  const balance = analyzeDayMasterBalance(user);
  const yongsin = analyzeYongsinCandidate(user);
  const huisin = analyzeHuisinCandidate(user);

  if (!yongsin.applicable) return yongsinNotApplicableResult("yongsinNotApplicable");
  if (yongsin.outcome === "hold") return yongsinNotApplicableResult("yongsinHold", yongsin.holdReason);
  if (yongsin.outcome === "unresolved") return yongsinNotApplicableResult("yongsinUnresolved");

  const yongsinCats = yongsin.winners;
  const huisinCats = huisin.applicable ? huisin.pairs.map((p) => p.category) : [];
  const supportIntoHuisinCats = huisin.applicable ? huisin.pairs.map((p) => p.supportIntoHuisin.category) : [];

  const periods = analyzeDaYunWealth(dayGan, appData.fortuneTimelineNodes);
  const daYunPeriods: DaYunTimingPeriod[] = periods.map((period) => ({
    period,
    classification: classifyPeriod(period.hasWealthSignal, period.ganCategory, yongsinCats, huisinCats, balance.structureFlags, supportIntoHuisinCats, true),
  }));

  const { current, next } = pickPastCurrentNext(periods);
  const currentDaYun = current ? daYunPeriods.find((d) => d.period === current) ?? null : null;
  const nextDaYun = next ? daYunPeriods.find((d) => d.period === next) ?? null : null;

  const target = current ?? next;
  let representativeSeun: SeunTimingYear[] = [];

  if (target) {
    const natalBranches: NatalBranchInput[] = [
      { stage: "year", zhi: user.pillars.branches.year.hanja },
      { stage: "month", zhi: user.pillars.branches.month.hanja },
      { stage: "day", zhi: user.pillars.branches.day.hanja },
      ...(user.pillars.branches.hour ? [{ stage: "hour" as const, zhi: user.pillars.branches.hour.hanja }] : []),
    ];
    const natalStems: NatalStemInput[] = [
      { stage: "year", gan: user.pillars.year.hanja },
      { stage: "month", gan: user.pillars.month.hanja },
      { stage: "day", gan: user.pillars.day.hanja },
      ...(user.pillars.hour ? [{ stage: "hour" as const, gan: user.pillars.hour.hanja }] : []),
    ];

    const daYunLabel = classifyPeriod(target.hasWealthSignal, target.ganCategory, yongsinCats, huisinCats, balance.structureFlags, supportIntoHuisinCats, true).label;

    const thisYear = new Date().getFullYear();
    const seunRange = buildSeunRange(dayGan, thisYear, thisYear + 4, natalBranches, { ganZhi: target.ganZhi, ganSipseong: target.ganSipseong }, natalStems);

    representativeSeun = seunRange.map((sk) => {
      const seunHasWealth = sk.seunGanCategory === "재성" || sk.seunJiCategory === "재성" || sk.hiddenStems.some((h) => h.category === "재성");
      const classification = classifyPeriod(seunHasWealth, sk.seunGanCategory, yongsinCats, huisinCats, balance.structureFlags, supportIntoHuisinCats, false);
      return { seun: sk, classification, crossPattern: computeCrossPattern(daYunLabel, classification.label) };
    });
  }

  return { applicable: true, daYunPeriods, currentDaYun, nextDaYun, representativeSeun };
}
