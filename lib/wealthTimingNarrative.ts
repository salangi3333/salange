import { AppData } from "./sajuContent";
import { analyzeDayMasterBalance } from "./dayMasterBalanceAnalysis";
import {
  WealthTimingResult,
  DaYunTimingPeriod,
  SeunTimingYear,
  TimingLabel,
  CrossPattern,
  ATTACKS,
} from "./wealthTimingAnalysis";
import { SipseongCategory } from "./strengthAnalysis";

/**
 * 6장("돈이 움직이는 시기") — 고객용 본문 INTERPRETATION 레이어.
 *
 * `analyzeWealthTiming(appData)`의 결과(A~E 라벨·reasons·교차 패턴)만
 * 입력으로 받아 문단을 조립한다. 여기서 새 명리 계산은 하지 않는다 —
 * ATTACKS 표는 wealthTimingAnalysis.ts에서 그대로 재수출된 것을 가져다
 * "어떤 관계가 흔드는가"를 문장으로 번역하는 데만 쓴다.
 *
 * ID 기반 하드코딩 금지: 이 파일의 모든 분기는 label/reasons/crossPattern/
 * period 상태(과거·현재·미래) 같은 계산 결과의 조합에만 반응한다. 12명
 * 중 누구의 사주인지 이 함수는 전혀 알지 못한다.
 *
 * 동결된 6장 고객용 서술 가이드(표현 안전 경계)를 그대로 적용한다:
 *  - 강화형(A) → "재물에 유리한 조건이 살아난다" 수준까지만(금전 유입 단정 금지)
 *  - 분산형(D) → "지출·분산·변수가 늘 수 있는 흐름"까지만("돈이 샌다" 금지)
 *  - 신호없음(E) → "재물이 전면에 나서지 않는 시기"("재물운 없음" 금지)
 *  - 합 신호 → "다른 자리와의 관계가 겹치며 결이 달라질 수 있다"까지만
 *    (지출/사람 문제/제안/계약 등 구체 사건 창작 금지)
 *  - 금액·계약·사업 성공·투자 손실·이혼·퇴사·부동산·특정 인물 등 계산
 *    밖 사건 창작 금지, 행동 조언을 확정형으로 말하지 않음
 */

export interface NarrativeParagraph {
  text: string;
  /** 고객에게 노출하지 않는 내부 검수용 근거 — 어떤 계산값에서 나온
   * 문장인지 추적한다(요청된 [사용 근거] 태그와 동일한 목적). */
  sourceNote: string;
}

export interface WealthTimingNarrativeResult {
  applicable: boolean;
  notApplicableReason?: WealthTimingResult["notApplicableReason"];
  paragraphs: NarrativeParagraph[];
}

// 매치된 카테고리가 "무엇과 맞물리는가"를 고객 언어로 번역(십성 이름은
// 노출하지 않는다). 강화형/기반형 공용.
const MATCH_FLAVOR: Record<SipseongCategory, string> = {
  비겁: "자기 자신의 기반이 든든해지는 쪽과 맞물리는",
  식상: "표현하고 펼쳐내는 쪽과 맞물리는",
  재성: "재물 그 자체와 맞물리는",
  관성: "책임과 성과 쪽과 맞물리는",
  인성: "받아들이고 다지는 쪽과 맞물리는",
};

// 공격측 카테고리가 "무엇을 흔드는가"를 고객 언어로 번역. 분산/흔들림형
// 전용 — ATTACKS(공격측→피공격측) 5개 관계를 그대로 반영한 것뿐,
// 새 관계가 아니다.
// 비겁·재성 항목은 4·5·6장 교차검증에서 "마음" 표현이 실제 심리를
// 단정한다는 지적을 받아, 재물 흐름 자체의 상태로 낮췄다(최소 수정).
const ATTACK_FLAVOR: Record<SipseongCategory, string> = {
  비겁: "새롭게 넓히는 쪽보다, 이미 가진 것을 유지하고 관리하는 쪽에 무게가 실리는 흐름",
  식상: "마음이 앞서면서 지출이나 변수가 늘어나기 쉬운 흐름",
  재성: "한곳에 정리되어 모이기보다, 재물의 움직임이 여러 방향으로 갈라지기 쉬운 흐름",
  인성: "받아들이는 쪽과 쏟아내는 쪽이 부딪히며 결이 흔들리는 흐름",
  관성: "책임이나 부담이 커지면서 관리할 여력이 줄어드는 흐름",
};

function attackFlavorOf(cat: SipseongCategory | null): string {
  if (!cat) return "쥐고 있던 게 흔들리기 쉬운 흐름";
  return ATTACK_FLAVOR[cat];
}
function matchFlavorOf(cat: SipseongCategory | null): string {
  if (!cat) return "이 사람에게 힘이 되는 축과 맞물리는";
  return MATCH_FLAVOR[cat];
}

// 분산/흔들림형(D)일 때, 원국에 "공격측 카테고리와는 다른" 과다 체질이
// 하나라도 겹쳐 있으면 "여러 갈래로 나뉜다"는 복합 서사(분산 테마)로,
// 없으면 "지켜내는 힘 자체가 흔들린다"는 단일 서사(유지 테마)로 간다.
// wealthExcess는 별도 배경 문단(buildWealthExcessParagraph)에서 이미
// 다루므로 여기서는 제외한다 — 새 판정이 아니라 같은 structureFlags를
// 다른 관점(재물 자체 vs 다른 축과의 겹침)에서 한 번 더 쓰는 것뿐이다.
const OTHER_EXCESS_FLAG_CATEGORY: Record<string, SipseongCategory> = {
  companionExcess: "비겁",
  outputExcess: "식상",
  officerExcess: "관성",
  resourceExcess: "인성",
};

// 그 과다 체질이 평소 어떤 쪽의 기운으로 느껴지는지(고객 언어, 십성
// 이름 노출 없음). "원래 강한 체질" 같은 고정된 성격 단정 대신 "쪽의
// 기운이 상대적으로 강한 구조"로 낮춰 쓰기 위한 명사구다.
const EXCESS_TRAIT_FLAVOR: Record<SipseongCategory, string> = {
  비겁: "자기 확신을 앞세우는",
  식상: "밖으로 쏟아내고 표현하는",
  재성: "재물 쪽으로 예민하게 반응하는",
  관성: "책임과 부담을 짊어지는",
  인성: "받아들이고 쌓아두는",
};

// 공격측 카테고리가 "겹칠 때" 어떤 기운으로 끼어드는지(위 ATTACK_FLAVOR의
// 축약형 — 겹침 문장 안에서 짧게 쓰기 위한 것뿐, 새 관계 아님).
const ATTACK_TRAIT: Record<SipseongCategory, string> = {
  비겁: "자기 자신을 앞세우는 기운",
  식상: "밖으로 쏟아내려는 기운",
  재성: "재물 쪽으로 쏠리는 기운",
  인성: "받아들이고 붙잡아두려는 기운",
  관성: "책임과 부담을 지우는 기운",
};

function findCompoundingExcessCategory(structureFlags: string[], attacker: SipseongCategory | null): SipseongCategory | null {
  for (const [flag, cat] of Object.entries(OTHER_EXCESS_FLAG_CATEGORY)) {
    if (structureFlags.includes(flag) && cat !== attacker) return cat;
  }
  return null;
}

function buildOpeningParagraph(
  label: TimingLabel,
  cat: SipseongCategory | null,
  hasWealthExcessAnywhere: boolean,
  reasons: string[],
  compoundingCat: SipseongCategory | null
): NarrativeParagraph {
  const sourceNote = `현재(또는 대운 시작 전이면 다음) 대운 ${label} — ${reasons.join("; ")}${compoundingCat ? `; 복합 원인=${compoundingCat} 과다` : ""}`;
  const enrichment = reasons.some((r) => r.includes("2차 지원축과 일치"));
  const enrichmentAddendum = enrichment ? " 다만 저 뒤편에서 조용히 기반이 다져지고 있을 가능성은 있습니다." : "";

  switch (label) {
    case "강화형(A)":
      return {
        text: `지금 흐름은 ${matchFlavorOf(cat)} 시기에 가깝습니다. 재물에 유리한 조건이 살아나는 흐름이라, 전체적으로 나쁘지 않게 흘러갑니다.`,
        sourceNote,
      };
    case "부담형(B)":
      return {
        text: "지금 흐름은 쥐고 있는 것을 관리하는 데 평소보다 마음을 많이 써야 하는 시기입니다.",
        sourceNote,
      };
    case "기반형(C)":
      return {
        text: `지금은 화려하게 움직이는 시기라기보다, ${matchFlavorOf(cat)} 조용한 시기에 가깝습니다. 재물 신호 자체는 강하지 않지만, 기반이 다져지는 흐름입니다.`,
        sourceNote,
      };
    case "분산/흔들림형(D)":
      if (compoundingCat) {
        return { text: "지금 흐름은 한쪽을 지키는 힘이 아니라, 여러 갈래로 나뉘어 쓰이는 시기에 가깝습니다.", sourceNote };
      }
      return {
        text: `지금 흐름은 ${attackFlavorOf(cat)}에 가깝습니다.`,
        sourceNote,
      };
    case "신호없음형(E)":
      if (hasWealthExcessAnywhere) {
        return { text: `지금 흐름에서는 재물이 딱히 전면에 나서지 않습니다.${enrichmentAddendum}`, sourceNote };
      }
      return { text: `요즘 재물 쪽이 유난히 크게 움직이지 않는다고 느끼신 적, 있으신가요.${enrichmentAddendum}`, sourceNote };
  }
}

function buildCompoundingExcessParagraph(compoundingCat: SipseongCategory, attacker: SipseongCategory | null): NarrativeParagraph {
  const attackerTrait = attacker ? ATTACK_TRAIT[attacker] : "흔드는 기운";
  return {
    text: `이 사람은 ${EXCESS_TRAIT_FLAVOR[compoundingCat]} 쪽의 기운이 상대적으로 강한 구조입니다. 그런데 지금 이 시기엔 거기에 ${attackerTrait}까지 겹치면서, 한쪽을 지키는 데 힘을 모으기보다 여러 갈래로 나뉘어 쓰는 모양새가 됩니다.`,
    sourceNote: `structureFlags 복합: ${compoundingCat} 과다 + 현재 대운 attacker=${attacker}`,
  };
}

function buildWealthExcessParagraph(anyPastB: boolean, currentIsB: boolean, anyFutureB: boolean): NarrativeParagraph {
  let addendum = "";
  if (currentIsB) addendum = " 그 무게가 지금 이 10년에 본격적으로 실려 있습니다.";
  else if (anyFutureB && !anyPastB) addendum = " 그 무게는 앞으로 다가올 어느 한 시기에 본격적으로 실립니다.";
  else if (anyPastB && !anyFutureB) addendum = " 그 무게가 유독 세게 실렸던 시기는 이미 지나왔습니다.";
  else if (anyPastB && anyFutureB) addendum = " 그 무게는 이미 한 번 세게 실렸던 적이 있고, 앞으로 다시 한 번 더 그런 시기가 옵니다.";

  return {
    text: `이 사람은 원래 돈과 관련된 기운을 많이 쥐고 있는 구조입니다. 없어서 힘든 쪽이 아니라, 관리하고 지켜야 할 게 많아서 버거운 쪽에 가깝습니다.${addendum}`,
    sourceNote: `structureFlags: wealthExcess(daYunPeriods reasons에서 감지) — anyPastB=${anyPastB}, currentIsB=${currentIsB}, anyFutureB=${anyFutureB}`,
  };
}

interface CrossGroup {
  pattern: CrossPattern;
  years: number[];
}

function groupCrossYears(seunYears: SeunTimingYear[]): CrossGroup[] {
  const groups: CrossGroup[] = [];
  seunYears.forEach((sy) => {
    if (!sy.crossPattern) return;
    const last = groups[groups.length - 1];
    if (last && last.pattern === sy.crossPattern && last.years[last.years.length - 1] === sy.seun.year - 1) {
      last.years.push(sy.seun.year);
    } else {
      groups.push({ pattern: sy.crossPattern, years: [sy.seun.year] });
    }
  });
  return groups;
}

function formatYearRange(years: number[]): string {
  if (years.length === 1) return `${years[0]}년`;
  return `${years[0]}년부터 ${years[years.length - 1]}년`;
}

function crossFlavorSentence(pattern: CrossPattern, plural: boolean, dispersedTheme: boolean): string {
  const subj = plural ? "이 몇 해" : "이 해";
  switch (pattern) {
    case "누적강화":
      return `${subj}는 원래도 나쁘지 않은 흐름 위에 좋은 기운이 한 번 더 겹칩니다.`;
    case "단발성기회":
      // 현재 대운이 "분산 테마"(D + 다른 축 과다 겹침)일 때는 반전도
      // 같은 테마의 언어("흩어지던 힘이 모인다")로 되짚는다 — 같은
      // crossPattern이라도 사람마다 서사 중심이 다르면 되짚는 표현도
      // 달라져야 한다는 원칙을 반영한 것뿐, crossPattern 판정 자체는
      // 그대로다.
      return dispersedTheme
        ? `${subj}만큼은 여러 갈래로 흩어지던 힘이 잠깐 한 곳으로 모이며, 재물 쪽 조건이 살아나는 기색을 보입니다.`
        : `${subj}만큼은 결이 다르게 움직이며, 재물 쪽 조건이 잠깐 살아나는 낌새를 보입니다.`;
    case "좋은흐름속일시적리스크":
      return `${subj}만 유독 관리에 신경이 더 필요한 결이 겹칩니다.`;
    case "부담대운속도움되는해":
      return `${subj}만큼은 짓누르던 기운이 잠깐 풀리며 숨통이 트입니다.`;
  }
}

function hasAnyRelation(sy: SeunTimingYear): boolean {
  const s = sy.seun;
  return s.natalRelations.length > 0 || s.dayunRelations.length > 0 || s.ganHeNatal.length > 0 || s.ganHeDayun.length > 0;
}

function buildSeunParagraphs(seunYears: SeunTimingYear[], dispersedTheme: boolean): NarrativeParagraph[] {
  if (seunYears.length === 0) return [];
  const groups = groupCrossYears(seunYears);

  if (groups.length === 0) {
    return [
      {
        text: "이 몇 해 동안은 특별히 결이 갈리는 해 없이, 지금의 흐름이 그대로 이어집니다.",
        sourceNote: `대표 세운 ${seunYears.map((s) => `${s.seun.year}:${s.classification.label}`).join(", ")} — crossPattern 없음`,
      },
    ];
  }

  return groups.map((g) => {
    const plural = g.years.length > 1;
    const yearText = formatYearRange(g.years);
    const flavor = crossFlavorSentence(g.pattern, plural, dispersedTheme);
    const relevantYears = seunYears.filter((s) => g.years.includes(s.seun.year));
    const relationNote = relevantYears.some(hasAnyRelation)
      ? " 이 시기는 다른 자리와의 관계도 겹쳐 있어, 평소와 결이 한 번 더 달라질 수 있습니다."
      : "";
    return {
      text: `${yearText}, ${flavor}${relationNote}`,
      sourceNote: `대표 세운 ${g.years.join(",")}년 -> ${relevantYears[0].classification.label}, crossPattern=${g.pattern}`,
    };
  });
}

function forwardFlavorSentence(label: TimingLabel, cat: SipseongCategory | null): string {
  switch (label) {
    case "강화형(A)":
      return "이번엔 재물에 유리한 조건이 살아나는 흐름으로 들어섭니다.";
    case "부담형(B)":
      return "쥐고 있는 걸 관리하는 데 마음을 많이 써야 하는 흐름이 시작됩니다.";
    case "기반형(C)":
      return "화려하지 않아도 조용히 다져지는 흐름으로 들어섭니다.";
    case "분산/흔들림형(D)":
      return `이번엔 ${attackFlavorOf(cat)}으로 들어섭니다.`;
    case "신호없음형(E)":
      return "재물이 다시 뒤편으로 물러나는 흐름입니다.";
  }
}

function buildNextDaYunParagraph(next: DaYunTimingPeriod | null, currentLabel: TimingLabel, dispersedTheme: boolean): NarrativeParagraph {
  if (!next) {
    return {
      text: "이 뒤로 이어지는 흐름은 지금까지처럼 뚜렷한 10년 단위로 나뉘어 잡히지 않습니다.",
      sourceNote: "다음 대운 없음(계산표상 마지막 대운) — 사건·수명 관련 함의 없이 흐름 설명으로만 처리",
    };
  }
  const nextLabel = next.classification.label;
  if (nextLabel === currentLabel) {
    // 다음 대운도 같은 라벨이면 "왜 또 같은 라벨인지"까지 같은 서사
    // 테마로 이어간다 — 분산 테마면 "또 새로운 문제가 아니라 같은
    // 갈래분산"이라는 안심형 문구로, 유지 테마면 기존 문구 그대로.
    return {
      text: dispersedTheme
        ? "이 흐름은 다음 10년에도 비슷하게 이어집니다. 다만 이번에도 여러 갈래로 나뉘는 쪽이지, 완전히 새로운 문제가 생기는 건 아닙니다."
        : "이 흐름은 다음 10년으로 넘어가서도 크게 달라지지 않습니다. 같은 결이 한 번 더 이어집니다.",
      sourceNote: `다음 대운 ${next.period.startAge}-${next.period.endAge}세 ${next.period.ganZhi} -> ${nextLabel}(현재와 동일 라벨, dispersedTheme=${dispersedTheme})`,
    };
  }
  return {
    text: `그리고 ${next.period.startAge}세를 넘기면서부터는 결이 달라집니다. ${forwardFlavorSentence(nextLabel, next.period.ganCategory)}`,
    sourceNote: `다음 대운 ${next.period.startAge}-${next.period.endAge}세 ${next.period.ganZhi} -> ${nextLabel}`,
  };
}

function buildEndingParagraph(next: DaYunTimingPeriod | null, currentLabel: TimingLabel, seunYears: SeunTimingYear[], dispersedTheme: boolean): NarrativeParagraph {
  const crossYears = seunYears.filter((s) => s.crossPattern).map((s) => s.seun.year);

  if (!next) {
    if (crossYears.length > 0) {
      return {
        text: `${crossYears[0]}년은 이 흐름 안에서 잠깐 결이 달라지는 해로 기억해두시면 좋을 듯합니다.`,
        sourceNote: `다음 대운 없음 + crossPattern 존재(${crossYears.join(",")}) — 흐름설명형 종결`,
      };
    }
    return {
      text: "지금 이 흐름을 어떻게 다루느냐가, 앞으로의 결 대부분을 결정짓는 시기입니다.",
      sourceNote: "다음 대운 없음, crossPattern 없음 — 흐름설명형 종결",
    };
  }

  if (next.classification.label === currentLabel) {
    return {
      text: dispersedTheme
        ? "그래서 이 시기의 핵심은 여러 갈래로 흩어지는 흐름 자체를 먼저 알아차리는 데 있습니다."
        : "그래서 이 흐름을 가르는 건 특별한 한 해라기보다, 평소의 결 그 자체일 수 있습니다.",
      sourceNote: `다음 대운 라벨=현재와 동일 — 통찰형 종결(dispersedTheme=${dispersedTheme})`,
    };
  }
  if (next.classification.label === "강화형(A)") {
    return {
      text: `지금 지나는 시간이 ${next.period.startAge}세 이후에 어떤 모습으로 돌아올지, 궁금해지지 않으신가요.`,
      sourceNote: "다음 대운=강화형(A) — 질문형 종결",
    };
  }
  if (next.classification.label === "부담형(B)" || next.classification.label === "분산/흔들림형(D)") {
    return {
      text: `지금의 결이 계속될 거라 생각했다면, ${next.period.startAge}세 무렵부터는 지금과는 다른 마음가짐이 필요할 수 있습니다.`,
      sourceNote: `다음 대운=${next.classification.label} — 여운형 종결`,
    };
  }
  return {
    text: "그 흐름 안에서 무엇에 마음이 쏠리느냐가, 다음 결을 다르게 만들 수도 있습니다.",
    sourceNote: `다음 대운=${next.classification.label} — 짧은통찰형 종결`,
  };
}

export function generateWealthTimingNarrative(appData: AppData, timing: WealthTimingResult): WealthTimingNarrativeResult {
  if (!timing.applicable) {
    return { applicable: false, notApplicableReason: timing.notApplicableReason, paragraphs: [] };
  }
  if (!timing.currentDaYun) {
    return {
      applicable: true,
      paragraphs: [
        {
          text: "이 사람은 아직 이 흐름의 대운이 시작되기 전입니다.",
          sourceNote: "currentDaYun 없음(daYunPeriods 전체가 future 상태로 판단됨) — 12명 표본에는 없던 방어적 분기, 실제 검증 안 됨",
        },
      ],
    };
  }

  // structureFlags는 WealthTimingResult에 노출되어 있지 않아, 이미 동결된
  // analyzeDayMasterBalance를 다시 읽기만 한다(huisinCandidateAnalysis.ts
  // 등 기존 코드가 이미 쓰는 것과 같은 "가벼운 순수함수 재호출" 패턴 —
  // 새 계산 아님).
  const structureFlags = analyzeDayMasterBalance(appData.user).structureFlags;

  const currentLabel = timing.currentDaYun.classification.label;
  const currentCat = timing.currentDaYun.period.ganCategory;
  const currentReasons = timing.currentDaYun.classification.reasons;

  const hasWealthExcessAnywhere = timing.daYunPeriods.some((d) => d.classification.reasons.some((r) => r.includes("wealthExcess")));
  const anyPastB = timing.daYunPeriods.some((d) => d.period.state === "past" && d.classification.label === "부담형(B)");
  const currentIsB = currentLabel === "부담형(B)";
  const anyFutureB = timing.daYunPeriods.some((d) => d.period.state === "future" && d.classification.label === "부담형(B)");

  // 분산 테마 여부: 현재 라벨이 D이고, 공격측 카테고리와는 다른 과다
  // 체질(wealthExcess 제외 4종)이 원국에 있을 때만 켠다. 이 테마는
  // 원국에 고정된 값(structureFlags)에서만 나오므로, 이 사람의 6장
  // 전체(오프닝·반전·전환·종결)에 일관되게 적용한다.
  const compoundingCat = currentLabel === "분산/흔들림형(D)" ? findCompoundingExcessCategory(structureFlags, currentCat) : null;
  const dispersedTheme = compoundingCat !== null;

  const paragraphs: NarrativeParagraph[] = [];
  paragraphs.push(buildOpeningParagraph(currentLabel, currentCat, hasWealthExcessAnywhere, currentReasons, compoundingCat));
  if (compoundingCat) {
    paragraphs.push(buildCompoundingExcessParagraph(compoundingCat, currentCat));
  }
  if (hasWealthExcessAnywhere) {
    paragraphs.push(buildWealthExcessParagraph(anyPastB, currentIsB, anyFutureB));
  }
  paragraphs.push(...buildSeunParagraphs(timing.representativeSeun, dispersedTheme));
  paragraphs.push(buildNextDaYunParagraph(timing.nextDaYun, currentLabel, dispersedTheme));
  paragraphs.push(buildEndingParagraph(timing.nextDaYun, currentLabel, timing.representativeSeun, dispersedTheme));

  return { applicable: true, paragraphs };
}
