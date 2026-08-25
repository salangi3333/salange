import { SajuUser } from "@/types";
import { Stage, analyzeSeasonStatus, analyzeRoot } from "./natalStructure";
import { analyzeWealthCategoryStrength } from "./wealthStrengthAnalysis";
import { SipseongCategory } from "./strengthAnalysis";

/**
 * 05장("재물운") 준비 작업 — 억부법 기반 일간 신강/신약 자동 판정 엔진.
 *
 * 이 파일은 독립 모듈이다. 새 명리 계산은 하나도 하지 않는다 — 월령
 * (analyzeSeasonStatus), 통근(analyzeRoot), 카테고리별 count/rootHits
 * (analyzeWealthCategoryStrength)만 그대로 재사용해 결정 트리를 태운다.
 * 01~04, 무료 리포트, `lib/seunAnalysis.ts`, 기존 재물 strength 계산은
 * 이 파일에서 한 글자도 건드리지 않는다(전부 import해서 읽기만 한다).
 *
 * 용신·희신·기신은 이 모듈의 범위 밖이다 — 신강/신약이 프로덕션에서
 * 안정된 뒤 별도 모듈로 설계한다.
 *
 * STEP1~STEP6 및 특수구조 분리는 27명 검증 데이터셋(v3→v4→STEP5-fix→
 * quickfix→v7→v8→v8b)을 거쳐 최종 승인된 규칙을 그대로 옮긴 것이다.
 * 이 결정 트리 자체를 다시 설계하지 않는다 — 구현 전 최종 승인 완료.
 */

export type BalanceVerdict =
  | "clearlyStrong" // 명확한 신강
  | "slightlyStrong" // 다소 신강
  | "neutral" // 중화에 가까움
  | "slightlyWeak" // 다소 신약
  | "clearlyWeak" // 명확한 신약
  | "hold"; // 자동 판정 보류

const BALANCE_LABEL: Record<BalanceVerdict, string> = {
  clearlyStrong: "명확한 신강",
  slightlyStrong: "다소 신강",
  neutral: "중화에 가까움",
  slightlyWeak: "다소 신약",
  clearlyWeak: "명확한 신약",
  hold: "자동 판정 보류",
};

/**
 * 지금은 "일반 억부 자동판정에 넣기 위험한 극단쏠림 구조"를 구분하는
 * specialStructure 하나뿐이다. 종격/종재격/종관격 등 격국 확정은 이번
 * 범위가 아니다 — 그 판별 로직이 생기면 그때 별도 값을 추가한다.
 * boundaryConflict(두 근거가 진짜로 팽팽히 맞서는 경계형)는 27명
 * 검증에서 실제 사례가 없어 지금은 미사용이지만, 향후 더 큰 표본에서
 * 나타날 수 있어 타입만 미리 열어둔다.
 */
export type HoldType = "specialStructure" | "boundaryConflict";

export interface DayMasterBalanceResult {
  /** 5단계 + 보류 중 하나. 화면/문장 생성 로직은 이 값만 보고 분기한다. */
  balance: BalanceVerdict;
  /** balance의 한글 표시 라벨(고정 매핑, 문구 다듬기는 이 상수만 수정하면 됨). */
  balanceLabel: string;
  /** balance === "hold"일 때만 존재. 왜 보류인지(구조 문제 vs 그 외)를 구분. */
  holdType?: HoldType;
  /** 판정 결과와 분리된 구조 특징(과다/극단쏠림/월령-통근 충돌 등). 여러 개 가능. */
  structureFlags: string[];
  /** 05 서술/디버깅용 내부 추적값. 사용자에게 숫자 그대로 노출하지 않는다. */
  debug: {
    dayGan: string;
    deukryeong: boolean;
    seasonStatus: string;
    tier4: string;
    adjQ: number;
    rawSupport: number;
    rawDrain: number;
    rawGap: number;
    counts: Record<SipseongCategory, number>;
  };
}

type Pos = "본기" | "중기" | "여기";
function positionOf(index: number): Pos {
  return index === 0 ? "본기" : index === 1 ? "중기" : "여기";
}

const CATS: SipseongCategory[] = ["비겁", "식상", "재성", "관성", "인성"];

/** structureFlags에 쓸 영문 키 — 화면 문구는 이 키를 보고 별도로 고른다. */
const CATEGORY_KEY: Record<SipseongCategory, string> = {
  비겁: "companion",
  식상: "output",
  재성: "wealth",
  관성: "officer",
  인성: "resource",
};

const RANK: BalanceVerdict[] = ["clearlyWeak", "slightlyWeak", "neutral", "slightlyStrong", "clearlyStrong"];
function stepDown(v: BalanceVerdict): BalanceVerdict {
  const i = RANK.indexOf(v);
  return i > 0 ? RANK[i - 1] : v;
}
function stepUp(v: BalanceVerdict): BalanceVerdict {
  const i = RANK.indexOf(v);
  return i < RANK.length - 1 && i >= 0 ? RANK[i + 1] : v;
}

function hideGanOf(user: SajuUser, stage: Stage): string[] {
  if (stage === "hour") return user.natal.pillars.hour?.hideGan ?? [];
  return user.natal.pillars[stage].hideGan;
}

export function analyzeDayMasterBalance(user: SajuUser): DayMasterBalanceResult {
  const dayGan = user.pillars.day.hanja;
  const season = analyzeSeasonStatus(user);
  const root = analyzeRoot(user);
  const wealth = analyzeWealthCategoryStrength(user);
  const deukryeong = season.status === "왕" || season.status === "상";

  const visibleGans = [
    user.pillars.year.hanja,
    user.pillars.month.hanja,
    user.pillars.day.hanja,
    user.pillars.hour ? user.pillars.hour.hanja : undefined,
  ].filter((g): g is string => Boolean(g));
  const otherGans = visibleGans.filter((g) => g !== dayGan);

  // ── STEP2/STEP3: 통근 위치·질 등급 + 투간 보정 ──
  const rootDetails = root.matches.map((m) => {
    const hideGan = hideGanOf(user, m.stage);
    const idx = hideGan.indexOf(m.hiddenGan);
    return { stage: m.stage, pos: positionOf(idx), hiddenGan: m.hiddenGan, tou: otherGans.includes(m.hiddenGan) };
  });
  function qualityOf(stage: Stage, pos: Pos): number {
    if (stage === "month") return 0;
    if (stage === "day") return pos === "본기" ? 4 : pos === "중기" ? 3 : 2;
    return pos === "본기" ? 3 : pos === "중기" ? 2 : 1;
  }
  const gradedRoots = rootDetails.map((r) => ({ ...r, q: qualityOf(r.stage, r.pos) })).filter((r) => r.q > 0);
  const bestQ = gradedRoots.length ? Math.max(...gradedRoots.map((r) => r.q)) : 0;
  const bestRootTou = gradedRoots.filter((r) => r.q === bestQ).some((r) => r.tou);
  let adjQ = bestQ;
  if (bestRootTou && bestQ > 0 && bestQ < 3) adjQ = bestQ + 1;

  // ── STEP4: 월령×통근 기본 방향(5단계 원형) ──
  let tier4: string;
  if (deukryeong && adjQ >= 3) tier4 = "신강-강";
  else if (deukryeong && adjQ === 2) tier4 = "신강-중";
  else if (deukryeong && adjQ <= 1) tier4 = "애매";
  else if (!deukryeong && adjQ === 4) tier4 = "신강-중";
  else if (!deukryeong && adjQ === 3) tier4 = "애매";
  else if (!deukryeong && adjQ === 2) tier4 = "애매";
  else if (!deukryeong && adjQ === 1) tier4 = "신약-중";
  else tier4 = "신약-강";

  const countOf = (c: SipseongCategory) => wealth.byCategory[c].count;
  const hasBongi = (c: SipseongCategory) => wealth.byCategory[c].rootHits.some((h) => h.position === "본기");

  // "강" 등급 전용 실질작동 판정(v7에서 검증된 부분 — 이번 라운드에서 범위 밖, 그대로 유지)
  const siksangActive = countOf("식상") > 0 && (countOf("비겁") > 0 || countOf("재성") > 0 || wealth.byCategory.재성.rootScore > 0);
  const jaeseongActive = countOf("재성") > 0;
  const gwanseongActive = countOf("관성") > 0 && hasBongi("관성");
  const inseongActive = countOf("인성") > 0;
  const drainActiveCount = [siksangActive, jaeseongActive, gwanseongActive].filter(Boolean).length;

  // ── STEP5: "애매" 구간 전용 raw-count 보조 판정(v8b 최종안) ──
  const rawSupport = countOf("비겁") + countOf("인성");
  const rawDrain = countOf("식상") + countOf("재성") + countOf("관성");
  const rawGap = rawDrain - rawSupport;

  const tier5Map: Record<string, BalanceVerdict> = {
    "신강-강": "clearlyStrong",
    "신강-중": "slightlyStrong",
    "신약-중": "slightlyWeak",
    "신약-강": "clearlyWeak",
  };
  let verdict: BalanceVerdict = tier5Map[tier4] ?? "neutral";

  if (tier4 === "신강-강") {
    if (drainActiveCount >= 2) verdict = stepDown(verdict);
  } else if (tier4 === "신약-강") {
    if (inseongActive) verdict = stepUp(verdict);
  } else if (tier4 === "신강-중" || tier4 === "신약-중") {
    // 중간 등급은 STEP5 미적용 — preLabel 그대로 확정(중간등급 무버퍼 문제 방지, quickfix에서 검증)
  } else {
    // 애매: raw count 격차만으로 방향 판정, 기존 "격차 2 이상" 임계값 재사용
    if (rawGap >= 2) verdict = "slightlyWeak";
    else if (rawGap <= -2) verdict = "slightlyStrong";
    else verdict = "neutral";
  }

  // ── STEP6: 과다 보정(count>=4 && count>=나머지 합, 기존 임계값 재사용) ──
  const overabundant = (c: SipseongCategory) => {
    const others = CATS.filter((x) => x !== c);
    const s = others.reduce((a, x) => a + countOf(x), 0);
    return countOf(c) >= 4 && countOf(c) >= s;
  };
  const structureFlags: string[] = [];
  CATS.forEach((c) => {
    if (overabundant(c)) structureFlags.push(`${CATEGORY_KEY[c]}Excess`);
  });
  if (tier4 === "애매") structureFlags.push("monthRootConflict");

  const drainOver = (["식상", "재성", "관성"] as SipseongCategory[]).some(overabundant);
  const supportOver = (["비겁", "인성"] as SipseongCategory[]).some(overabundant);
  const rankIdx = RANK.indexOf(verdict);
  if (rankIdx > 2 && drainOver) verdict = stepDown(verdict);
  else if (rankIdx < 2 && supportOver) verdict = stepUp(verdict);

  // ── 일반 판정과 특수구조 분리: 억부법 자체가 위험한 극단쏠림 ──
  // 종격/종재격/종관격 등 격국 확정 아님 — "이 명식엔 일반 억부 자동판정을
  // 적용하지 않는다"는 방어적 분리만 한다.
  const maxCat = CATS.reduce((a, b) => (countOf(a) >= countOf(b) ? a : b));
  const maxCount = countOf(maxCat);
  const otherSum = CATS.filter((c) => c !== maxCat).reduce((s, c) => s + countOf(c), 0);
  const extreme = maxCount >= 5 || maxCount >= otherSum + 2;

  let holdType: HoldType | undefined;
  if (extreme) {
    verdict = "hold";
    holdType = "specialStructure";
    structureFlags.push(`${CATEGORY_KEY[maxCat]}Extreme`);
  }

  return {
    balance: verdict,
    balanceLabel: BALANCE_LABEL[verdict],
    holdType,
    structureFlags,
    debug: {
      dayGan,
      deukryeong,
      seasonStatus: season.status,
      tier4,
      adjQ,
      rawSupport,
      rawDrain,
      rawGap,
      counts: Object.fromEntries(CATS.map((c) => [c, countOf(c)])) as Record<SipseongCategory, number>,
    },
  };
}
