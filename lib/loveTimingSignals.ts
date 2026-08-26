import { AppData } from "./sajuContent";
import { analyzeDaYunWealth, pickPastCurrentNext, DaYunWealthPeriod } from "./daYunWealthAnalysis";
import { buildSeunRange, NatalBranchInput, NatalStemInput, SeunKey } from "./seunAnalysis";
import { analyzeSpouseStar, SpouseStarProfile, SpouseStarCategory } from "./spouseStarAnalysis";
import { findSpousePalaceRelations, SpousePalaceRelations, SpousePalaceDaYunSignal, SpousePalaceRelationType } from "./spousePalaceRelations";

/**
 * 사랑·인연 3단계 — 대운/세운 raw signal 계산 레이어.
 *
 * 아직 등급(A~E)이나 "좋은 시기/나쁜 시기" 판정을 하지 않는다 — 사실
 * 신호만 그대로 반환한다. wealthTimingAnalysis.ts의 classifyPeriod를
 * 복사하거나 재성→배우자성으로 단순 치환하지 않았다 — 그 함수는
 * 비공개이기도 하고, 이 파일이 하는 일 자체가 다르다(등급 분류가 아니라
 * 원시 신호 수집까지만).
 *
 * 대운/세운 계산 자체(analyzeDaYunWealth, buildSeunRange, pickPastCurrentNext)
 * 는 재물6장(wealthTimingAnalysis.ts)이 쓰는 것과 완전히 동일한, 이미
 * 검증된 함수를 그대로 재사용한다 — 새 대운/세운 계산이 아니다. 이
 * 파일에서 daYunWealthAnalysis.ts/seunAnalysis.ts를 전혀 수정하지 않는다.
 *
 * daYunWealthAnalysis.ts의 hasWealthSignal은 "재성"으로 하드코딩돼 있어
 * 그대로 재사용할 수 없다 — 그 옆의 범용 필드(ganCategory/zhiHidden)만
 * 가져다 배우자성 카테고리 기준으로 새로 판별한다. seunAnalysis.ts의
 * SeunKey(seunGanCategory/seunJiCategory/hiddenStems)는 애초에 카테고리
 * 무관하게 범용이라 그대로 쓴다.
 */

export interface LoveTimingDaYunSignal {
  period: DaYunWealthPeriod;
  /** 이 대운의 천간 또는 지지 지장간에 배우자성 카테고리가 나타나는지 —
   * daYunWealthAnalysis.ts의 hasWealthSignal과 같은 판정 방식을 배우자성
   * 대상으로 새로 적용한 것뿐, 등급이 아니라 사실 신호. */
  spouseStarActive: boolean;
}

export interface LoveTimingSeunSignal {
  seun: SeunKey;
  spouseStarActive: boolean;
}

/**
 * 배우자성 축 하나 안에서의 시기 신호. 이전 버전의 `overlapYears`가 바로
 * 이 축 내부(대운×세운, 같은 축끼리)만 보고 있었다 — 이름과 위치만
 * 명확하게 옮겼을 뿐 계산 로직(daYunSeunOverlapYears)은 전혀 바꾸지
 * 않았다. 새로 추가된 건 daYunActive/seunActiveYears뿐이고, 이것도
 * 이미 있던 currentDaYun/representativeSeun을 그대로 다시 읽은 것이다.
 */
export interface SpouseStarTimingSignals {
  daYunActive: boolean;
  seunActiveYears: number[];
  /** currentDaYun.spouseStarActive와 그 해 세운의 spouseStarActive가
   * 동시에 true인 연도 — 배우자성이라는 "같은 축" 안에서 대운·세운이
   * 겹치는 것뿐, 배우자궁 신호와는 무관하다. 이전 `overlapYears`와
   * 완전히 동일한 계산(값도 동일) — 이름과 소속만 명확히 했다. */
  daYunSeunOverlapYears: number[];
}

/** 배우자궁(일지) 축의 시기 신호 — spouseStar와 별개 축이라는 것을
 * 이름으로도 드러낸다. daYun은 findSpousePalaceRelations 결과를 그대로
 * 옮긴 것뿐(중복 계산 아님). */
export interface SpousePalaceSeunYearSignal {
  year: number;
  relationTypes: SpousePalaceRelationType[];
}

export interface SpousePalaceTimingSignals {
  daYun: SpousePalaceDaYunSignal[];
  seun: SpousePalaceSeunYearSignal[];
}

export interface CompoundSignalYear {
  year: number;
  /** 그 해 세운의 배우자성 활성 여부(=representativeSeun과 동일 값). */
  spouseStarActive: boolean;
  /** 그 해 세운이 배우자궁과 맺은 관계 종류(합/충/자형) — 없으면 빈 배열. */
  spousePalaceRelationTypes: SpousePalaceRelationType[];
}

/** "배우자성 축"과 "배우자궁 축", 서로 다른 두 축이 같은 해에 함께
 * 나타나는 경우만 담는다. spouseStarTiming.daYunSeunOverlapYears(같은
 * 축 안에서의 대운×세운 중첩)와는 반드시 구분해야 한다 — 이름도 다르고
 * 조건도 다르다(여기는 두 축이 모두 참이어야 함). 합/충/자형을 좋다/
 * 나쁘다로 나누지 않고, "함께 나타난다"는 사실만 담는다. */
export interface LoveTimingCompoundSignals {
  years: CompoundSignalYear[];
}

export interface LoveTimingRawSignals {
  spouseStar: SpouseStarProfile;
  spousePalace: SpousePalaceRelations;
  daYunPeriods: LoveTimingDaYunSignal[];
  currentDaYun: LoveTimingDaYunSignal | null;
  nextDaYun: LoveTimingDaYunSignal | null;
  /** 현재(없으면 다음) 대운 구간 기준 대표 5개년 세운 신호. 대운이 아직
   * 시작 전이라 current/next가 모두 없으면 빈 배열. */
  representativeSeun: LoveTimingSeunSignal[];
  spouseStarTiming: SpouseStarTimingSignals;
  spousePalaceTiming: SpousePalaceTimingSignals;
  compound: LoveTimingCompoundSignals;
}

function findSpouseCategoryInHidden(
  category: SpouseStarCategory,
  hidden: { category: import("./strengthAnalysis").SipseongCategory | null }[]
): boolean {
  return hidden.some((h) => h.category === category);
}

export function analyzeLoveTimingSignals(appData: AppData, gender: "male" | "female"): LoveTimingRawSignals {
  const user = appData.user;
  const dayGan = user.pillars.day.hanja;
  const dayBranch = user.pillars.branches.day.hanja;

  const spouseStar = analyzeSpouseStar(user, gender);
  const target = spouseStar.targetCategory;

  const rawPeriods = analyzeDaYunWealth(dayGan, appData.fortuneTimelineNodes);
  const daYunPeriods: LoveTimingDaYunSignal[] = rawPeriods.map((period) => ({
    period,
    spouseStarActive: period.ganCategory === target || findSpouseCategoryInHidden(target, period.zhiHidden),
  }));

  const { current, next } = pickPastCurrentNext(rawPeriods);
  const currentDaYun = current ? daYunPeriods.find((d) => d.period === current) ?? null : null;
  const nextDaYun = next ? daYunPeriods.find((d) => d.period === next) ?? null : null;

  const targetPeriod = current ?? next;
  let representativeSeun: LoveTimingSeunSignal[] = [];
  let seunKeysForPalace: SeunKey[] = [];

  if (targetPeriod) {
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
    const thisYear = new Date().getFullYear();
    seunKeysForPalace = buildSeunRange(
      dayGan,
      thisYear,
      thisYear + 4,
      natalBranches,
      { ganZhi: targetPeriod.ganZhi, ganSipseong: targetPeriod.ganSipseong },
      natalStems
    );
    representativeSeun = seunKeysForPalace.map((sk) => ({
      seun: sk,
      spouseStarActive:
        sk.seunGanCategory === target || sk.seunJiCategory === target || findSpouseCategoryInHidden(target, sk.hiddenStems),
    }));
  }

  const spousePalace = findSpousePalaceRelations(dayBranch, rawPeriods, seunKeysForPalace);

  // ── 배우자성 축(같은 축 안에서의 대운×세운) ──────────────────────
  const daYunActive = currentDaYun?.spouseStarActive ?? false;
  const seunActiveYears = representativeSeun.filter((s) => s.spouseStarActive).map((s) => s.seun.year);
  const daYunSeunOverlapYears = representativeSeun
    .filter((s) => daYunActive && s.spouseStarActive)
    .map((s) => s.seun.year);
  const spouseStarTiming: SpouseStarTimingSignals = { daYunActive, seunActiveYears, daYunSeunOverlapYears };

  // ── 배우자궁 축(세운 쪽을 연도별로 정리) ─────────────────────────
  const seunYearMap = new Map<number, SpousePalaceRelationType[]>();
  spousePalace.seun.forEach((s) => {
    const list = seunYearMap.get(s.seun.year) ?? [];
    list.push(s.relationType);
    seunYearMap.set(s.seun.year, list);
  });
  const spousePalaceTiming: SpousePalaceTimingSignals = {
    daYun: spousePalace.daYun,
    seun: [...seunYearMap.entries()].map(([year, relationTypes]) => ({ year, relationTypes })),
  };

  // ── compound: 서로 다른 두 축(배우자성 활성, 배우자궁 관계)이 같은
  // 해에 함께 나타나는 연도만. spouseStarTiming.daYunSeunOverlapYears
  // (같은 축 안의 대운×세운 중첩)와는 조건 자체가 다르다 — 여기서는
  // 대운 활성 여부를 보지 않고, "그 해" 세운 두 축만 비교한다. ──────
  const compoundYears: CompoundSignalYear[] = representativeSeun
    .map((s) => {
      const palaceTypes = seunYearMap.get(s.seun.year) ?? [];
      return { year: s.seun.year, spouseStarActive: s.spouseStarActive, spousePalaceRelationTypes: palaceTypes };
    })
    .filter((y) => y.spouseStarActive && y.spousePalaceRelationTypes.length > 0);
  const compound: LoveTimingCompoundSignals = { years: compoundYears };

  return {
    spouseStar,
    spousePalace,
    daYunPeriods,
    currentDaYun,
    nextDaYun,
    representativeSeun,
    spouseStarTiming,
    spousePalaceTiming,
    compound,
  };
}
