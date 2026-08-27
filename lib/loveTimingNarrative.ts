import { AppData } from "./sajuContent";
import { LoveTimingRawSignals, LoveTimingDaYunSignal } from "./loveTimingSignals";
import { SpousePalaceDaYunSignal, SpousePalaceRelationType } from "./spousePalaceRelations";

/**
 * 사랑·인연 5번째 하위 섹션("인연의 흐름이 움직이는 때") 전용 고객용
 * INTERPRETATION 레이어. loveTimingSignals.ts(계산, 동결)의 결과만
 * 입력으로 받아 문단을 조립한다 — 여기서 새 시기 계산을 하지 않는다.
 *
 * 설계 원칙(승인된 T1~T8 분기 + 4가지 추가 원칙):
 *  1. 삶의 변화/관계의 움직임 → 시기 → 명리적 의미 순서로 쓴다. 연도나
 *     계산값을 첫머리에 내세우지 않는다.
 *  2. 연도를 사건으로 확정하지 않는다("이 해에 인연이 온다/결혼한다"
 *     금지). "마음/환경이 다르게 움직이기 쉬운 시기" 수준까지만.
 *  3. 같은 T유형 안에서도 실제 필드 조합(연속/비연속, daYunActive,
 *     current/next 보너스, 관계 종류 등)에 따라 시작 관점·현실 장면·
 *     시기 설명·결론이 달라진다 — 유형당 문장 1개 고정이 아니다. 랜덤
 *     선택은 전혀 쓰지 않는다.
 *  4. currentDaYun/nextDaYun 경계를 확인한다 — 현재 대운이 곧 끝나는
 *     사람에게 "지금 이 10년"이라고 단정하지 않는다.
 *
 * wealthTimingAnalysis.ts의 classifyPeriod를 복사하거나 카테고리만
 * 치환하지 않았다 — 그 함수는 비공개이고, 판정 축(배우자성/배우자궁
 * 두 축의 결합 여부)도 재물6장과 다르다. 이 파일이 하는 일은 재물5·6장의
 * "판정 함수 + 조립 함수 분리, HOOK_OVERRIDE류 조건 분기" 패턴만
 * 재사용한 것이다.
 */

export interface NarrativeParagraph {
  text: string;
  /** 고객에게 노출하지 않는 내부 검수용 근거. */
  sourceNote: string;
}

export interface LoveTimingNarrativeResult {
  paragraphs: NarrativeParagraph[];
}

// ── 대운 경계 확인 ──────────────────────────────────────────────
// 다른 파일이 이미 쓰는 "현재나이 = 올해 - 출생연도 + 1" 공식(sajuContent.ts
// 의 buildFortuneTimeline)과 동일한 관례를 그대로 따른다. 새 계산 개념이
// 아니라 서술 문구 선택에만 쓰는 보조값이다.
function currentAge(appData: AppData): number {
  return new Date().getFullYear() - appData.birthYear + 1;
}

/** 남은 햇수가 짧으면(2년 이하) "지금 이 10년"이라 단정하지 않는다. */
function isNearDaYunBoundary(appData: AppData, currentDaYun: LoveTimingDaYunSignal | null): boolean {
  if (!currentDaYun) return false;
  return currentDaYun.period.endAge - currentAge(appData) <= 2;
}

/** "지금 이 10년은" 계열 문구를 상황에 맞게 고른다 — 대운 시작 전 /
 * 경계 근접 / 일반 3가지. */
function periodOpeningClause(appData: AppData, timing: LoveTimingRawSignals): string {
  const { currentDaYun, nextDaYun } = timing;
  if (!currentDaYun) {
    return nextDaYun ? "앞으로 이어질 흐름을 기준으로 보면" : "지금 이 시기는";
  }
  if (isNearDaYunBoundary(appData, currentDaYun) && nextDaYun) {
    return "지금과 곧 이어질 흐름을 함께 보면";
  }
  return "지금 이 10년은";
}

// ── current/next 대운에 걸린 배우자궁 신호만 골라낸다(생애 전체 8개
// 대운 중 아무 때나 걸린 것은 "지금"과 무관하므로 제외). 이미 반환되는
// currentDaYun/nextDaYun.period와 같은 객체 참조를 대조하는 것뿐, 새
// 계산이 아니다. ────────────────────────────────────────────────
function findRelevantPalaceDaYun(
  timing: LoveTimingRawSignals
): { signal: SpousePalaceDaYunSignal; isNext: boolean } | null {
  const { currentDaYun, nextDaYun, spousePalace } = timing;
  for (const d of spousePalace.daYun) {
    if (currentDaYun && d.period === currentDaYun.period) return { signal: d, isNext: false };
    if (nextDaYun && d.period === nextDaYun.period) return { signal: d, isNext: true };
  }
  return null;
}

// ── 분기 판정 ───────────────────────────────────────────────────
type BranchType = "twinCross" | "sequential" | "starOnly" | "palaceOnly" | "daYunBackgroundOnly" | "quiet";

interface ClassifyResult {
  branch: BranchType;
  compoundYears: number[];
  starOnlyYears: number[];
  palaceYears: number[];
  relevantPalace: { signal: SpousePalaceDaYunSignal; isNext: boolean } | null;
}

function classify(timing: LoveTimingRawSignals): ClassifyResult {
  const compoundYears = timing.compound.years.map((y) => y.year);
  const palaceYears = timing.spousePalaceTiming.seun.map((s) => s.year);
  const starActiveYears = timing.spouseStarTiming.seunActiveYears;
  // compound에 속하지 않는 순수 "배우자성만" 연도
  const starOnlyYears = starActiveYears.filter((y) => !compoundYears.includes(y));
  const palaceOnlyYears = palaceYears.filter((y) => !compoundYears.includes(y));
  const relevantPalace = findRelevantPalaceDaYun(timing);

  let branch: BranchType;
  if (compoundYears.length > 0) {
    branch = "twinCross";
  } else if (starOnlyYears.length > 0 && palaceOnlyYears.length > 0) {
    branch = "sequential";
  } else if (starOnlyYears.length > 0) {
    branch = "starOnly";
  } else if (palaceOnlyYears.length > 0 || relevantPalace) {
    branch = "palaceOnly";
  } else if (timing.spouseStarTiming.daYunActive) {
    branch = "daYunBackgroundOnly";
  } else {
    branch = "quiet";
  }

  return { branch, compoundYears, starOnlyYears, palaceYears: palaceOnlyYears, relevantPalace };
}

// ── 연도 표기 유틸 ──────────────────────────────────────────────
function formatYears(years: number[]): string {
  const sorted = [...years].sort((a, b) => a - b);
  if (sorted.length === 1) return `${sorted[0]}년`;
  const isConsecutive = sorted[sorted.length - 1] - sorted[0] + 1 === sorted.length;
  if (isConsecutive) return `${sorted[0]}년부터 ${sorted[sorted.length - 1]}년까지`;
  return sorted.map((y) => `${y}년`).join(", ");
}

function isConsecutiveYears(years: number[]): boolean {
  if (years.length < 2) return false;
  const sorted = [...years].sort((a, b) => a - b);
  return sorted[sorted.length - 1] - sorted[0] + 1 === sorted.length;
}

const relationLabel: Record<SpousePalaceRelationType, string> = {
  합: "결이 하나로 모이는",
  충: "결이 부딪히는",
  자형: "같은 결이 되풀이해서 겹치는",
};

// ── 서사 표현층 — T1~T8 판정과 하위 분기 조건(leadWithPalace, multi,
// consecutive, starFirst, multiStar/multiPalace, daYunActive, exposure
// 등)은 지난 라운드 그대로 유지한다. 이번엔 오직 "문장 자체"만 다시
// 썼다 — 명리 용어(배우자성/배우자궁)를 문장의 주어로 세우지 않고,
// 시기+근거 문단 한 곳에서만 짧게 연결한다. 나머지 문단은 "마음이
// 움직인다/곁을 내준다/사람을 보는 눈이 달라진다"처럼 삶의 언어로만
// 쓴다. 결론도 "~보는 편이 정확합니다/~기다리기보다/~확인하는 것이
// 좋습니다" 같은 판정문 어미를 전부 걷어내고, 여운·자기이해·변화·
// 태도·시간의 의미 중 하나로 자연스럽게 닫는다. 하위 분기 개수와
// 조건은 늘리지 않았다(문구 확장 아님, 표현만 교체). ────────────────

function buildTwinCross(appData: AppData, timing: LoveTimingRawSignals, key: ClassifyResult): NarrativeParagraph[] {
  const years = key.compoundYears;
  const consecutive = isConsecutiveYears(years);
  const multi = years.length >= 2;
  const relevant = key.relevantPalace;
  const leadWithPalace = !!relevant;

  let opening: NarrativeParagraph;
  if (multi) {
    opening = leadWithPalace
      ? {
          text: `누군가와 가까워질 자리 자체가 넓어지는 때가, ${consecutive ? "한 해로 그치지 않고 이어집니다." : "몇 차례에 걸쳐 되풀이해서 찾아옵니다."}`,
          sourceNote: `twinCross-multi leadPalace consecutive=${consecutive}`,
        }
      : {
          text: `사람을 받아들이는 마음이 ${consecutive ? "몇 해 연달아" : "몇 차례에 걸쳐"} 평소와 달라집니다.`,
          sourceNote: `twinCross-multi leadStar consecutive=${consecutive}`,
        };
  } else if (leadWithPalace && relevant!.isNext) {
    opening = {
      text: "지금 당장은 아니어도, 곁을 내줄 자리가 한 번 크게 열리는 때가 앞에 있습니다.",
      sourceNote: "twinCross-single leadPalace next",
    };
  } else if (leadWithPalace) {
    opening = {
      text: "지금 걷고 있는 시간 자체가 이미 그런 자리와 맞닿아 있는데, 그중에서도 유독 한 해만 결이 짙어집니다.",
      sourceNote: "twinCross-single leadPalace current",
    };
  } else {
    opening = {
      text: "평소와 다르게, 사람을 보는 마음과 곁을 내줄 여유가 동시에 또렷해지는 순간이 있습니다.",
      sourceNote: "twinCross-single leadStar",
    };
  }

  const scene = leadWithPalace
    ? {
        text: "곁을 잘 안 주던 사람도 이 시기엔 자연스럽게 곁을 내주게 되고, 그만큼 마음도 따라 움직이기 쉽습니다.",
        sourceNote: "twinCross 장면-leadPalace",
      }
    : {
        text: "예전 같으면 눈에 안 들어왔을 사람이 자꾸 마음에 걸리고, 그 마음이 실제로 가까워질 자리로 이어지기 쉽습니다.",
        sourceNote: "twinCross 장면-leadStar",
      };

  const anchor = leadWithPalace
    ? "사주에서는 이걸 배우자 자리가 움직이면서 배우자 기운도 함께 짙어지는 경우로 봅니다."
    : "사주에서는 이걸 배우자 기운이 짙어지면서 배우자 자리도 함께 움직이는 경우로 봅니다.";
  const bonusNote = relevant
    ? relevant.isNext
      ? " 다음 몇 해도 이런 결이 이어질 가능성이 있습니다."
      : ` ${periodOpeningClause(appData, timing)} 이미 이런 결 위에 있습니다.`
    : "";
  const timingPara = {
    text: `${formatYears(years)}, 마음이 움직이는 것과 곁을 내줄 여유가 생기는 것, 이 둘이 함께 옵니다. ${anchor}${bonusNote}`,
    sourceNote: `연도=${years.join(",")}, relevantPalace=${relevant ? relevant.signal.relationType : "없음"}`,
  };

  let conclusion: NarrativeParagraph;
  if (multi && leadWithPalace) {
    conclusion = { text: "이 흐름이 그 다음 몇 해로 어떻게 이어지는지, 지켜볼 만한 지점입니다.", sourceNote: "twinCross-multi-leadPalace 결론(시간의미)" };
  } else if (multi) {
    conclusion = { text: "이 시기를 지나며 자기도 모르게 달라진 마음을, 스스로 알아차리게 될 수 있습니다.", sourceNote: "twinCross-multi-leadStar 결론(자기이해)" };
  } else if (leadWithPalace && relevant!.isNext) {
    conclusion = { text: "서두르지 않아도, 마음이 그쪽으로 열려가는 걸 그대로 받아들이면 됩니다.", sourceNote: "twinCross-single-next 결론(태도)" };
  } else if (leadWithPalace) {
    conclusion = { text: "지나고 나서 돌아봤을 때, 유독 다르게 남을 시기일 수 있습니다.", sourceNote: "twinCross-single-current 결론(시간의미)" };
  } else {
    conclusion = { text: "이 한 해가 앞으로 어떻게 이어질지, 천천히 드러날 것입니다.", sourceNote: "twinCross-single-noBonus 결론(여운)" };
  }

  return [opening, scene, timingPara, conclusion];
}

function buildSequential(appData: AppData, timing: LoveTimingRawSignals, key: ClassifyResult): NarrativeParagraph[] {
  const starYears = key.starOnlyYears.sort((a, b) => a - b);
  const palaceYears = key.palaceYears.sort((a, b) => a - b);
  const starFirst = starYears[0] < palaceYears[0];
  const multiStar = starYears.length >= 2;
  const multiPalace = palaceYears.length >= 2;

  let opening: NarrativeParagraph;
  if (multiStar && multiPalace) {
    opening = {
      text: "마음이 움직이는 몇 해와, 곁을 내줄 여유가 넓어지는 몇 해가 서로 다른 때에 옵니다.",
      sourceNote: "sequential 다연도+다연도",
    };
  } else if (multiStar) {
    opening = {
      text: "마음이 움직이는 시기는 여러 해에 걸쳐 있고, 곁을 내줄 여유가 크게 넓어지는 시기는 그중 한 번입니다.",
      sourceNote: "sequential 다연도성+단일궁",
    };
  } else if (starFirst) {
    opening = {
      text: "마음이 먼저 움직이고, 곁을 내줄 여유는 그 뒤에 따라옵니다.",
      sourceNote: "sequential star-first",
    };
  } else {
    opening = {
      text: "곁을 내줄 여유가 먼저 열리고, 마음은 그 뒤에 따라옵니다.",
      sourceNote: "sequential palace-first",
    };
  }

  const scene = multiStar
    ? {
        text: "여러 해 동안 마음이 계속 움직이다가, 그 사이 어느 한 해에 곁을 내줄 여유가 크게 한 번 열립니다.",
        sourceNote: "sequential 장면-다연도",
      }
    : starFirst
      ? {
          text: "관계를 서두르기보다 상대를 먼저 오래 살펴보는 시간을 지난 뒤에야, 실제로 곁을 내줄 여유가 넓어지는 때가 옵니다.",
          sourceNote: "sequential 장면-star-first",
        }
      : {
          text: "곁을 내줄 자리가 먼저 넓어지고, 그 다음에야 비로소 마음이 그쪽으로 움직이기 시작합니다.",
          sourceNote: "sequential 장면-palace-first",
        };

  const timingPara = {
    text: `${formatYears(starYears)}엔 마음 쪽이, ${formatYears(palaceYears)}엔 곁을 내줄 여유 쪽이 움직입니다. 사주에서는 이를 배우자 기운과 배우자 자리가 서로 다른 해에 움직이는 흐름으로 봅니다.`,
    sourceNote: `star=${starYears.join(",")}, palace=${palaceYears.join(",")}`,
  };

  let conclusion: NarrativeParagraph;
  if (multiStar) {
    conclusion = {
      text: "두 흐름이 언젠가 만날 수도, 이대로 각자 흘러갈 수도 있습니다. 그 다음이 궁금해지는 지점입니다.",
      sourceNote: "sequential 결론(여운)",
    };
  } else if (starFirst) {
    conclusion = {
      text: "먼저 움직인 마음이, 나중에 열리는 자리 앞에서 어떤 사람을 볼지 스스로 정리해줄 수 있습니다.",
      sourceNote: "sequential 결론(태도)",
    };
  } else {
    conclusion = {
      text: "여유가 먼저 열리고 마음이 뒤따르는 편이라, 그 사이의 시간을 가만히 지켜보는 것만으로 의미가 있습니다.",
      sourceNote: "sequential 결론(시간의미)",
    };
  }

  return [opening, scene, timingPara, conclusion];
}

function buildStarOnly(appData: AppData, timing: LoveTimingRawSignals, key: ClassifyResult): NarrativeParagraph[] {
  const years = key.starOnlyYears;
  const multi = years.length >= 2;
  const daYunActive = timing.spouseStarTiming.daYunActive;

  let opening: NarrativeParagraph;
  if (multi && daYunActive) {
    opening = {
      text: "이 사람의 관계 이야기는 한 해에 갑자기 결정되기보다, 몇 해에 걸쳐 서서히 문이 열리는 쪽에 가깝습니다.",
      sourceNote: "starOnly-multi daYunActive=true(관계지속형)",
    };
  } else if (multi) {
    opening = {
      text: "예전과는 다른 기준으로 사람을 보게 되는 몇 해가 있습니다.",
      sourceNote: "starOnly-multi daYunActive=false(선택기준변화형)",
    };
  } else if (daYunActive) {
    opening = {
      text: `${periodOpeningClause(appData, timing)}, 사람을 받아들이는 마음이 유독 짙어지는 한 해가 있습니다.`,
      sourceNote: "starOnly-single daYunActive=true(마음변화형)",
    };
  } else {
    opening = {
      text: "평소와 다르게, 사람을 보는 마음이 살짝 움직이는 한 해가 있습니다.",
      sourceNote: "starOnly-single daYunActive=false(마음변화형-옅음)",
    };
  }

  const scene = multi
    ? {
        text: "한 번의 사건으로 정리되기보다, 몇 해 동안 사람에 대한 마음 자체가 삶의 배경에 계속 깔려 있습니다.",
        sourceNote: "starOnly 장면-multi",
      }
    : {
        text: "예전 같으면 지나쳤을 사람의 사소한 말이나 태도가, 이 시기엔 다르게 다가올 수 있습니다.",
        sourceNote: "starOnly 장면-single",
      };

  const timingPara = {
    text: `${formatYears(years)}, 그런 결이 나타납니다. 사주에서는 배우자를 뜻하는 기운이 이 시기에 두드러진다고 봅니다. 다만 곁을 내줄 여유가 함께 넓어지는 결까지는 아직 보이지 않습니다.`,
    sourceNote: `연도=${years.join(",")}`,
  };

  let conclusion: NarrativeParagraph;
  if (multi && daYunActive) {
    conclusion = { text: "이 흐름이 앞으로 어떤 계기와 만나는지가, 다음을 가르는 지점이 될 수 있습니다.", sourceNote: "starOnly-multi-active 결론(변화)" };
  } else if (multi) {
    conclusion = { text: "그 기준이 달라졌다는 걸 스스로 알아차리는 것, 그 자체가 이 시기의 핵심일 수 있습니다.", sourceNote: "starOnly-multi-inactive 결론(자기이해)" };
  } else if (daYunActive) {
    conclusion = { text: "특별히 준비할 게 있다기보다, 마음이 그쪽으로 자연스럽게 움직이도록 두면 됩니다.", sourceNote: "starOnly-single-active 결론(태도)" };
  } else {
    conclusion = { text: "짧게 지나가는 결일 수 있지만, 그 다음에 어떻게 이어지는지는 계속 지켜볼 만합니다.", sourceNote: "starOnly-single-inactive 결론(여운)" };
  }

  return [opening, scene, timingPara, conclusion];
}

function buildPalaceOnly(appData: AppData, timing: LoveTimingRawSignals, key: ClassifyResult): NarrativeParagraph[] {
  const seunYears = key.palaceYears;
  const hasSeun = seunYears.length > 0;
  const relevant = key.relevantPalace;
  const primaryType: SpousePalaceRelationType | null = hasSeun
    ? timing.spousePalaceTiming.seun.find((s) => seunYears.includes(s.year))?.relationTypes[0] ?? null
    : relevant?.signal.relationType ?? null;

  const opening = {
    text: "누군가와 곁을 나눌 여유 자체가, 마음보다 먼저 움직이는 시기가 있습니다.",
    sourceNote: "palaceOnly 공용 오프닝(관계환경형)",
  };

  const scene = {
    text: "혼자가 편했던 시간에서, 곁을 내줄 자리가 조금씩 열리거나 좁아집니다.",
    sourceNote: "palaceOnly 공용 장면",
  };

  let timingText: string;
  if (hasSeun && relevant) {
    const relLabels = timing.spousePalaceTiming.seun.filter((s) => seunYears.includes(s.year)).flatMap((s) => s.relationTypes.map((t) => relationLabel[t])).join(", ");
    timingText = `${formatYears(seunYears)} 곁을 내줄 여유가 움직이고(${relLabels}), ${periodOpeningClause(appData, timing)} 이미 그 위에 있습니다. 사주에서는 이를 배우자 자리가 움직이는 시기로 봅니다.`;
  } else if (hasSeun) {
    const relLabels = timing.spousePalaceTiming.seun.filter((s) => seunYears.includes(s.year)).flatMap((s) => s.relationTypes.map((t) => relationLabel[t])).join(", ");
    timingText = `${formatYears(seunYears)}, 곁을 내줄 여유가 움직입니다(${relLabels}). 사주에서는 이를 배우자 자리가 움직이는 시기로 봅니다.`;
  } else if (relevant) {
    timingText = `${periodOpeningClause(appData, timing)} 곁을 내줄 여유 자체가 이미 움직이는 흐름 위에 있습니다(${relationLabel[relevant.signal.relationType]}). 사주에서는 이를 배우자 자리가 움직이는 시기로 봅니다.`;
  } else {
    timingText = "곁을 내줄 여유가 조용히 움직입니다. 사주에서는 이를 배우자 자리가 움직이는 시기로 봅니다.";
  }
  const timingPara = { text: timingText, sourceNote: `seunYears=${seunYears.join(",")}, relevantPalace=${relevant ? relevant.signal.relationType : "없음"}` };

  const conclusion =
    primaryType === "합"
      ? { text: "이 시기를 지나며 사람을 보는 자리 자체가 새로워질 수 있습니다.", sourceNote: "palaceOnly 결론(태도)" }
      : { text: "서두르지 않고 지켜보는 것만으로 충분한 시기입니다.", sourceNote: "palaceOnly 결론(여운)" };

  return [opening, scene, timingPara, conclusion];
}

function buildDaYunBackgroundOnly(appData: AppData, timing: LoveTimingRawSignals): NarrativeParagraph[] {
  const startAge = timing.currentDaYun?.period.startAge ?? 0;
  const young = startAge < 30;

  const opening = young
    ? {
        text: "아직 이 흐름이 뚜렷하게 드러나기엔 이른 시기입니다. 다만 사람을 향한 마음의 바탕만큼은 지금 계속 이어지고 있습니다.",
        sourceNote: "daYunBackgroundOnly, young(잠잠한흐름형)",
      }
    : {
        text: "특정한 해를 짚기보다, 사람을 향한 마음의 바탕 자체가 지금 이 시간 내내 잔잔히 흐르고 있다고 보면 됩니다.",
        sourceNote: "daYunBackgroundOnly, general(잠잠한흐름형)",
      };

  const scene = {
    text: "눈에 띄는 사건 없이도, 사람을 대하는 마음결은 이 시간 내내 조용히 이어지고 있습니다.",
    sourceNote: "daYunBackgroundOnly 장면",
  };

  const conclusion = {
    text: "특별한 사건을 기다리기보다, 지금 이 시간 전체를 하나의 바탕으로 받아들이면 됩니다.",
    sourceNote: "daYunBackgroundOnly 결론(태도)",
  };

  return [opening, scene, conclusion];
}

function buildQuiet(appData: AppData, timing: LoveTimingRawSignals): NarrativeParagraph[] {
  const exposure = timing.spouseStar.exposure;
  const opening =
    exposure === "뚜렷"
      ? {
          text: "지금은 누군가를 만나는 것보다, 스스로 어떤 관계를 원하는지가 먼저 정리되는 흐름에 가깝습니다.",
          sourceNote: "quiet, exposure=뚜렷(잠잠한흐름형)",
        }
      : exposure === "숨음"
        ? {
            text: "원래도 마음을 잘 드러내지 않는 편이라, 지금 이 시기 역시 특별히 두드러지지 않습니다.",
            sourceNote: "quiet, exposure=숨음(잠잠한흐름형)",
          }
        : {
            text: "관계보다 삶의 다른 영역에 먼저 마음이 가 있는 시기라, 지금은 그쪽에 마음을 쓰는 편이 자연스럽습니다.",
            sourceNote: "quiet, exposure=미미(잠잠한흐름형)",
          };

  // exposure=뚜렷 케이스만 최소 보강 — "왜 지금 이렇게 읽히는지"를
  // classify()가 이미 quiet로 가르는 데 쓴 사실(연도·대운 신호가 전혀
  // 없음, timing.spouseStarTiming.daYunActive===false)로만 한 문장 잇는다.
  // periodOpeningClause는 기존에 다른 분기들이 이미 쓰는 동결 함수를
  // 그대로 재사용한 것— 새 계산 아님. 숨음/미미 쪽은 이번 범위 밖이라
  // 손대지 않는다.
  const basis =
    exposure === "뚜렷"
      ? [
          {
            text: `${periodOpeningClause(appData, timing)} 인연 쪽으로 뚜렷하게 붙는 신호가 따로 없다 보니, 마음이 자연스럽게 관계보다 자기 자신 쪽으로 먼저 향하는 시기입니다.`,
            sourceNote: "quiet 근거절(exposure=뚜렷, daYunActive=false, 연도 신호 없음)",
          },
        ]
      : [];

  const conclusion = {
    text: "닫혀 있는 건 아니라는 것, 지금은 그것만으로도 충분합니다.",
    sourceNote: "quiet 결론(여운)",
  };

  return [opening, ...basis, conclusion];
}

export function generateLoveTimingNarrative(appData: AppData, timing: LoveTimingRawSignals): LoveTimingNarrativeResult {
  const key = classify(timing);
  let paragraphs: NarrativeParagraph[];
  switch (key.branch) {
    case "twinCross":
      paragraphs = buildTwinCross(appData, timing, key);
      break;
    case "sequential":
      paragraphs = buildSequential(appData, timing, key);
      break;
    case "starOnly":
      paragraphs = buildStarOnly(appData, timing, key);
      break;
    case "palaceOnly":
      paragraphs = buildPalaceOnly(appData, timing, key);
      break;
    case "daYunBackgroundOnly":
      paragraphs = buildDaYunBackgroundOnly(appData, timing);
      break;
    case "quiet":
    default:
      paragraphs = buildQuiet(appData, timing);
      break;
  }
  return { paragraphs };
}
