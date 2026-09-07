import { AppData } from "./sajuContent";
import { Stage } from "./natalStructure";
import {
  ChapterFourKey,
  EvidencePosition,
  buildChapterFourKey,
  compareCategories,
  GapTier,
} from "./chapterFourInterpretation";
import { SipseongCategory } from "./strengthAnalysis";
import { analyzeDayMasterBalance, BalanceVerdict } from "./dayMasterBalanceAnalysis";
import { analyzeWealthObstruction, WealthObstructionResult } from "./wealthObstructionAnalysis";
import { computeSipseong } from "./aiLifeReport";
import { ChapterFourContent } from "./chapterFourNarrative";

/**
 * 第五章("재물운") 확장 — 3차 승인 완료된 第四章(사랑과 인연)에서 확립한
 * 원칙(현실 서사 HOW + 명리 근거 WHY + 여러 실제 계산 신호의 조합 + 명식별
 * 분기)을 재물운에 그대로 적용한 새 레이어. 기존 4·5·6장(chapterFourKey,
 * analyzeWealthObstruction, analyzeWealthTiming)은 이 파일에서 전혀
 * 수정하지 않는다 — 이미 계산된 값만 재호출·재조합해서 새 문장을 만든다.
 *
 * 새 계산이 필요해서 이번에 구현하지 않고 보고만 하는 것:
 *  - 삼합/방합/형/파/해, 원국 내부 천간합 — 이번에도 계산 자체가 없어
 *    판정 근거로 쓰지 않는다(제4장에서 확인된 것과 동일한 한계).
 *  - 직업명 추천 — "돈이 만들어지는 구조"까지만 설명하고 직업을 특정하지
 *    않는다(사용자 요청 원칙).
 *  - 돈 액수·확률·재물운 점수 — 내부 total/rank가 있어도 절대 수치로
 *    노출하지 않는다.
 *
 * 재사용하는 값(전부 기존 계산):
 *  - buildChapterFourKey: wealth(5축 세력)·jaeseong(재성 프로필+evidence)·
 *    evidenceByCategory(5축 전부의 정확한 십성 라벨+위치)·dayMasterRoot·
 *    bigyeopVsJaeseong/gwanseongVsBigyeop/inseongVsSiksang/jaeseongVsInseong
 *    (5축 상대관계)·siksangJaeseongLinked·daYun
 *  - analyzeDayMasterBalance: balance(신강/신약 5단계+보류)
 *  - analyzeWealthObstruction: structuralObstructions·severityLabel
 *    (⑤"돈이 새는 패턴"은 이미 이 결과로 5장이 다루므로 이 파일에서
 *    반복하지 않는다 — 여기서는 ⑦"큰돈" 조건 판단에만 참고용으로 쓴다)
 */

export interface NarrativeParagraph {
  text: string;
  sourceNote: string;
}

export interface WealthInsightSection {
  heading: string;
  body: string[];
}

// 표시 전용 번호 재계산(2026-09, 통합 독서 QA #1) — ⑦/⑧/⑨는 조건부라
// 근거가 없으면 아예 만들지 않는다(값을 지어내지 않는다는 원칙). 그런데
// 그 결과 화면 번호가 "⑥ → ⑧"처럼 하나 비어 보이는 문제가 실제로
// 확인됐다. 계산·조건·내용은 그대로 두고, 마지막에 실제로 렌더링되는
// section 배열만 보고 번호를 다시 매긴다 — null section을 억지로
// 채우거나 빈 section을 만들지 않는다. "③-2"처럼 상위 번호에 딸린
// 하위 항목은 그 상위 번호를 그대로 따라간다(예: ⑦이 빠지면 ⑧이 ⑦로
// 당겨지고, ⑧에 딸린 하위 항목은 없으므로 이 규칙은 지금은 ③ 계열에만
// 실질적으로 적용된다).
const CIRCLED_NUMBERS = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩", "⑪", "⑫"];
const HEADING_NUMBER_RE = /^([①-⑫])(-\d+)?(\s.*)$/;

function renumberSections(sections: WealthInsightSection[]): WealthInsightSection[] {
  let topIndex = -1;
  return sections.map((section) => {
    const match = section.heading.match(HEADING_NUMBER_RE);
    if (!match) return section;
    const [, , suffix, rest] = match;
    if (!suffix) topIndex += 1;
    const circled = CIRCLED_NUMBERS[topIndex] ?? CIRCLED_NUMBERS[CIRCLED_NUMBERS.length - 1];
    return { ...section, heading: `${circled}${suffix ?? ""}${rest}` };
  });
}

// ────────────────────────────────────────────────────────────────
// 공통 헬퍼
// ────────────────────────────────────────────────────────────────

const STAGE_LABEL: Record<Stage, string> = {
  year: "초년의 자리",
  month: "사회로 나가는 자리",
  day: "자기 자신이 선 자리",
  hour: "말년의 자리",
};

const SIPSEONG_HANJA: Record<string, string> = {
  비견: "比肩", 겁재: "劫財", 식신: "食神", 상관: "傷官",
  편재: "偏財", 정재: "正財", 편관: "偏官", 정관: "正官",
  편인: "偏印", 정인: "正印",
};

function termDisplay(term: string): string {
  const hanja = SIPSEONG_HANJA[term];
  return hanja ? `${term}(${hanja})` : term;
}

function josaIGa(word: string): "이" | "가" {
  const last = word.charCodeAt(word.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return "가";
  return (last - 0xac00) % 28 === 0 ? "가" : "이";
}

/** 한 카테고리의 evidence 배열에서 정확한 십성 라벨(정재/편재 등)이 몇 번
 * 등장하는지 센다 — 새 계산이 아니라 이미 있는 EvidencePosition[]을
 * 집계만 하는 것뿐이다(spouseStarAnalysis의 subtype 우세 판정과 동일한
 * 원리를 재물 축에 적용). */
function dominantSipseong(evidence: EvidencePosition[]): string | null {
  const tally = new Map<string, number>();
  evidence.forEach((e) => tally.set(e.sipseong, (tally.get(e.sipseong) ?? 0) + 1));
  const entries = [...tally.entries()].sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;
  if (entries.length > 1 && entries[0][1] === entries[1][1]) return null; // 동률=혼합형
  return entries[0][0];
}

/** 천간/지지(겉) 우선, 없으면 지장간(본기>중기>여기) — chapterFourNarrative.ts의
 * pickLeadEvidence와 정확히 같은 규칙을 이 파일에서만 다시 쓴다(그 파일을
 * 건드리지 않기 위함, 로직은 100% 동일). */
function pickLeadEvidence(list: EvidencePosition[]): EvidencePosition | null {
  const visible = list.filter((e) => e.slot !== "지장간");
  if (visible.length > 0) return visible[0];
  const weight: Record<string, number> = { 본기: 3, 중기: 2, 여기: 1 };
  const sorted = [...list].sort((a, b) => (weight[b.hidePosition ?? ""] ?? 0) - (weight[a.hidePosition ?? ""] ?? 0));
  return sorted[0] ?? null;
}

type ShapeKind = "visible" | "hidden" | "none";
function shapeOf(evidence: EvidencePosition[], sipseong: string | null): ShapeKind {
  if (!sipseong) return "none";
  const matched = evidence.filter((e) => e.sipseong === sipseong);
  if (matched.length === 0) return "none";
  return matched.some((e) => e.slot !== "지장간") ? "visible" : "hidden";
}

/** shape(visible/hidden/none) × role(main/making/risk) 9갈래로 분리한다.
 * 한 사람의 report 안에서 role은 절대 중복되지 않지만(main은 항상 1회,
 * making·risk는 각각 최대 1회), shape+월령점수가 서로 다른 십성 사이에
 * 우연히 같아지는 경우가 실제로 있다(예: W03의 겁재 vs 식신, 둘 다
 * visible + monthScore 동일) — role로 갈라 그 경우에도 문장이 겹치지
 * 않게 한다(第四章 3차에서 확정된 원칙과 동일). */
const POSITION_TEXT_BY_SHAPE: Record<PickRole, Record<ShapeKind, string>> = {
  main: {
    visible: "겉으로 드러난 자리에 있어, 이 힘이 재물을 대하는 방식으로 비교적 뚜렷하게 나타납니다.",
    hidden: "지지 속(지장간)에만 있어, 겉으로는 잘 드러나지 않지만 안에서 작동하는 힘입니다.",
    none: "이 명식 전면에서 직접 드러나는 자리는 아니지만, 다른 힘을 거쳐 재물에 영향을 줍니다.",
  },
  making: {
    visible: "이 힘도 겉으로 드러난 자리에 있어, 만들어내는 과정 자체가 눈에 띄게 나타나는 편입니다.",
    hidden: "이 힘은 지지 속(지장간)에만 있어, 만들어내는 과정이 겉으로 잘 드러나지 않고 조용히 진행되는 편입니다.",
    none: "이 힘은 이 명식 전면에서 직접 드러나지 않지만, 다른 힘을 거쳐 만들어내는 과정에 영향을 줍니다.",
  },
  risk: {
    visible: "이 힘 역시 겉으로 드러난 자리에 있어, 흔들릴 때도 그 기미가 비교적 눈에 띄게 나타나는 편입니다.",
    hidden: "이 힘은 지지 속(지장간)에만 있어, 흔들릴 때도 겉으로 잘 드러나지 않고 안에서 조용히 작동합니다.",
    none: "이 힘은 이 명식 전면에서 직접 드러나지 않지만, 다른 힘을 거쳐 흔드는 쪽으로 영향을 줍니다.",
  },
  stability: {
    visible: "이 힘은 겉으로 드러난 자리에 있어, 안정을 지키려는 시도 자체는 눈에 띄게 나타나는 편입니다.",
    hidden: "이 힘은 지지 속(지장간)에만 있어, 안정을 지키려는 시도가 겉으로 잘 드러나지 않고 조용히 작동합니다.",
    none: "이 힘은 이 명식 전면에서 직접 드러나지 않지만, 다른 힘을 거쳐 안정을 지키는 쪽에 영향을 줍니다.",
  },
};

// role별로 문장을 갈랐다(POSITION_TEXT_BY_SHAPE와 동일한 기존 패턴 재사용,
// 새 판정 아님) — 한 사람의 리포트 안에서 role은 절대 중복되지 않지만
// (buildSipseongInsightSections 주석 참고), 예전에는 monthScoreText가
// role과 무관한 고정 문장 3개뿐이라 서로 다른 십성 픽 두 개가 같은
// 월령 등급(예: 둘 다 "도움 안 됨")이면 문장이 토씨 하나 안 틀리고 그대로
// 반복됐다(출시 전 정밀 QA에서 발견). 등급이 뜻하는 사실(밀어줌/안
// 도와줌/중립)은 4개 role 전부 동일하게 유지하고, 표현만 갈랐다.
const MONTH_SCORE_TEXT_BY_ROLE: Record<PickRole, [string, string, string]> = {
  // [score>=2, score<=-1, 그 외(중립)]
  main: [
    "태어난 달의 기운이 이 힘을 특히 밀어주고 있어, 원래부터 힘을 받고 태어난 편입니다.",
    "태어난 달의 기운은 이 힘에 그다지 도움이 되지 않는 편이라, 스스로 다지고 챙겨야 힘이 유지됩니다.",
    "태어난 달의 기운은 이 힘에 특별히 힘을 보태지도 빼지도 않는 편입니다.",
  ],
  making: [
    "태어난 달의 기운도 이 힘에 힘을 보태고 있어, 만들어내는 흐름이 원래부터 힘을 받는 편입니다.",
    "태어난 달의 기운은 이 힘에 크게 보탬이 되지 않는 편이라, 만들어내는 힘을 스스로 다지고 챙겨야 유지됩니다.",
    "태어난 달의 기운은 이 힘의 크기에 특별히 관여하지 않는 편입니다.",
  ],
  risk: [
    "태어난 달의 기운도 이 힘 쪽에 실려 있어, 흔드는 힘 자체가 원래부터 만만치 않은 편입니다.",
    "태어난 달의 기운은 이 힘에 크게 힘을 보태지 않는 편이라, 흔드는 세기는 상황에 따라 달라질 수 있습니다.",
    "태어난 달의 기운은 이 힘을 딱히 키우지도 줄이지도 않는 편입니다.",
  ],
  stability: [
    "태어난 달의 기운도 이 힘을 밀어주고 있어, 안정을 지키려는 힘이 원래부터 실려 있는 편입니다.",
    "태어난 달의 기운은 이 힘에 크게 보탬이 되지 않는 편이라, 안정을 지키려는 힘도 스스로 다잡아야 유지됩니다.",
    "태어난 달의 기운은 이 힘에 별다른 영향을 주지 않는 편입니다.",
  ],
};

function monthScoreText(score: number, role: PickRole): string {
  const [high, low, neutral] = MONTH_SCORE_TEXT_BY_ROLE[role];
  if (score >= 2) return high;
  if (score <= -1) return low;
  return neutral;
}

type BalanceGroup = "신강계열" | "신약계열" | "중화";
function balanceGroupOf(balance: BalanceVerdict): BalanceGroup {
  if (balance === "clearlyStrong" || balance === "slightlyStrong") return "신강계열";
  if (balance === "clearlyWeak" || balance === "slightlyWeak") return "신약계열";
  return "중화";
}

function gapTierActive(gapTier: GapTier): boolean {
  return gapTier !== "비슷";
}

const SIPSEONG_TO_CATEGORY: Record<string, SipseongCategory> = {
  비견: "비겁", 겁재: "비겁", 식신: "식상", 상관: "식상",
  편재: "재성", 정재: "재성", 편관: "관성", 정관: "관성",
  편인: "인성", 정인: "인성",
};

const DESIRE_TEXT: Record<SipseongCategory, string> = {
  비겁: "스스로 판단하고 직접 움직이려는",
  식상: "표현하고 만들어내려는",
  재성: "재물 그 자체를 붙잡으려는",
  관성: "책임을 다하고 인정받으려는",
  인성: "안정과 신뢰를 먼저 확인하려는",
};

/** 겉(자기 자신이 선 자리=일지, 이미 계산된 sipseong)과 속(그 지지의
 * 지장간, natal.pillars.day.hideGan — 기존 명식 계산값, 새 계산 아님)이
 * 서로 다른 카테고리를 가리키는지 비교한다. 사용자 요청 "지장간에 있는
 * 십성도 검토해, 겉으로 보이는 태도와 실제 안의 욕구가 다를 수 있는지"를
 * 반영한 것 — 4·5·6장 어디도 일지 지장간을 이 방식으로 쓰지 않는다. */
function surfaceVsHiddenDesireClause(appData: AppData): string {
  const dayZhiSipseong = appData.user.pillars.branches.day.sipseong;
  const dayZhiCategory = SIPSEONG_TO_CATEGORY[dayZhiSipseong];
  const dayGan = appData.user.pillars.day.hanja;
  const hideGan = appData.user.natal.pillars.day.hideGan;
  const hiddenCategories = new Set(
    hideGan.map((hg) => SIPSEONG_TO_CATEGORY[computeSipseong(dayGan, hg)]).filter((c): c is SipseongCategory => Boolean(c))
  );
  hiddenCategories.delete(dayZhiCategory);
  if (hiddenCategories.size === 0) {
    return "이 사람은 겉으로 보이는 돈에 대한 태도와, 마음 안에서 실제로 움직이는 욕구가 크게 다르지 않은 편입니다.";
  }
  const other = [...hiddenCategories][0];
  return `다만 겉으로 보이는 태도 안쪽, 이 사람이 자기 자신으로서 서 있는 자리(일지)의 지장간에는 ${DESIRE_TEXT[other]} 마음도 함께 숨어 있어, 겉으로 드러나는 태도와 마음 안의 실제 욕구가 한 겹 다를 수 있습니다.`;
}

// ────────────────────────────────────────────────────────────────
// ① 타고난 돈의 감각
// ────────────────────────────────────────────────────────────────

type SenseType = "안정형" | "자유형" | "성취형" | "수단형" | "혼합형";

function determineSenseType(key: ChapterFourKey): SenseType {
  if (key.jaeseong.exposure !== "미미") {
    const dom = dominantSipseong(key.jaeseong.evidence);
    if (dom === "정재") return "안정형";
    if (dom === "편재") return "자유형";
    return "혼합형"; // 정재·편재가 비슷한 비중으로 함께 있음
  }
  const topAxis = key.wealth.all[0].category;
  if (topAxis === "관성") return "성취형";
  return "수단형";
}

const SENSE_EXPLAIN: Record<SenseType, string> = {
  안정형:
    "이 사람에게 돈이란 우선 '꾸준히 쌓여야 안심이 되는 것'에 가깝습니다. 한 번의 큰 수입보다, 매달 반복되는 작은 확인이 오히려 돈에 대한 안정감을 만들어 줍니다.",
  자유형:
    "이 사람에게 돈이란 '움직일 수 있는 자유'에 더 가깝습니다. 한곳에 오래 묶여 있는 재물보다, 기회가 왔을 때 바로 쓸 수 있는 돈이 실제로 더 의미 있게 느껴집니다.",
  성취형:
    "이 사람에게 돈은 목표 그 자체라기보다, 맡은 역할을 잘 해냈을 때 자연히 따라오는 결과에 가깝습니다. 그래서 돈을 직접 좇기보다, 책임을 다하는 과정에서 돈이 뒤따라오는 구조를 더 편하게 느낍니다.",
  수단형:
    "이 사람에게 돈은 그 자체가 목적이라기보다, 하고 싶은 일을 하거나 관계를 지키기 위한 수단에 더 가깝습니다. 그래서 돈을 모으는 것 자체에 큰 의미를 두기보다, 무엇을 위해 쓰이는지가 더 중요하게 작동합니다.",
  혼합형:
    "이 사람에게 돈은 '꾸준히 쌓아야 하는 것'과 '기회가 오면 움직여야 하는 것' 두 결이 함께 있습니다. 어느 한쪽으로 완전히 기울지 않고, 상황에 따라 이 두 감각을 오가는 편입니다.",
};

function spendKeepClause(key: ChapterFourKey): string {
  const { bigyeopVsJaeseong: bj, gwanseongVsBigyeop: gb } = key;
  if (bj.leadCategory === "비겁" && gapTierActive(bj.gapTier)) {
    if (gb.leadCategory === "관성" && gapTierActive(gb.gapTier)) {
      return "쓰고 나누려는 마음이 원래 강한 편이지만, 그 마음을 다잡아주는 책임감도 함께 있어 완전히 흩어지지는 않는 쪽입니다.";
    }
    return "쓸 때와 지킬 때를 비교하면, 지키기보다 먼저 쓰고 나누는 쪽으로 마음이 움직이는 편입니다.";
  }
  if (bj.leadCategory === "재성" && gapTierActive(bj.gapTier)) {
    return "쓸 때와 지킬 때를 비교하면, 손에 들어온 것을 지키는 쪽에 자연히 무게가 실립니다.";
  }
  return "쓰는 쪽과 지키는 쪽 사이에서 크게 치우치지 않고, 상황에 따라 균형을 잡아가는 편입니다.";
}

const SENSE_MOMENT: Record<SenseType, string> = {
  안정형: "예를 들어 목돈이 생겨도 곧바로 다 쓰기보다, 일부는 반드시 남겨두고 나머지만 계획대로 쓰는 방식으로 나타나기 쉽습니다.",
  자유형: "예를 들어 계획에 없던 기회가 생기면, 이미 세워둔 예산을 조정해서라도 그 기회를 놓치지 않으려는 방식으로 나타나기 쉽습니다.",
  성취형: "예를 들어 돈 자체보다 '이 일을 얼마나 잘 해냈는가'를 먼저 따지고, 그 결과로 따라오는 보상은 나중에 확인하는 방식으로 나타나기 쉽습니다.",
  수단형: "예를 들어 돈을 모으는 이유가 뚜렷할 때는 잘 아끼다가도, 정작 목적이 분명하지 않은 저축에는 크게 마음이 가지 않는 방식으로 나타나기 쉽습니다.",
  혼합형: "예를 들어 평소에는 꾸준히 모으다가도, 확실한 기회다 싶으면 모아둔 것의 일부를 과감히 움직이는 방식으로 나타나기 쉽습니다.",
};

/** 기존 chapters[3] 오프닝 문단(재성의 정확한 위치·뿌리 사실)을 이 섹션
 * 본문 중간에 그대로 끼워 넣을 수 있도록, 여기서는 heading 없이 조각만
 * 반환한다(조립은 assembleWealthChapterSections에서). "이 사람에게 돈이란
 * ~다(HOW)" 다음에 "왜냐하면 실제로 명식에 OO가 있다(WHY, 기존 문단)"가
 * 바로 이어지도록 하기 위함(사용자 요청 #4). */
function buildWealthSenseSection(appData: AppData, key: ChapterFourKey): { intro: string; spendKeep: string; surfaceHidden: string; moment: string } {
  const senseType = determineSenseType(key);
  const rootClause = key.dayMasterRoot.hasRoot
    ? " 여기에 자기 자신의 기반(일간)도 뿌리가 있는 편이라, 이 감각을 실제 행동으로 옮길 여력 자체는 마련되어 있습니다."
    : " 다만 자기 자신의 기반(일간)은 상대적으로 여린 편이라, 이 감각이 있어도 실제로 밀어붙이는 데는 한 박자 조심스러워질 수 있습니다.";
  return {
    intro: `${SENSE_EXPLAIN[senseType]}${rootClause}`,
    spendKeep: spendKeepClause(key),
    surfaceHidden: surfaceVsHiddenDesireClause(appData),
    moment: SENSE_MOMENT[senseType],
  };
}

// ────────────────────────────────────────────────────────────────
// ② 나는 어떻게 돈을 만들어내는 사람인가
// ────────────────────────────────────────────────────────────────

interface MoneyMakingType {
  label: string;
  explain: string;
  moment: string;
}

function moneyMakingType(key: ChapterFourKey): MoneyMakingType {
  const top = key.wealth.all[0].category;
  const second = key.wealth.all[1]?.category;

  if (top === "비겁") {
    return {
      label: "직접 움직여 만드는 돈",
      explain: "이 사람은 남이 만들어둔 틀 안에서보다, 스스로 판단하고 몸을 움직여 성과를 낼 때 돈이 만들어지는 쪽에 가깝습니다.",
      moment: "예를 들어 누가 시켜서 하는 일보다, 스스로 벌인 일에서 오히려 더 좋은 결과를 만들어내는 경우가 많습니다.",
    };
  }
  if (top === "식상") {
    const dom = dominantSipseong(key.evidenceByCategory.식상);
    if (dom === "식신") {
      return {
        label: "기술과 전문성으로 쌓는 돈",
        explain: "이 사람은 화려하게 벌이기보다, 하나의 결과물을 꾸준히 다듬고 쌓아가는 방식으로 돈이 만들어지는 쪽에 가깝습니다.",
        moment: "예를 들어 새로운 걸 계속 벌이기보다, 한 가지 기술이나 방식을 오래 파고들었을 때 오히려 더 안정적인 결과가 따라옵니다.",
      };
    }
    return {
      label: "표현하고 알리는 활동으로 만드는 돈",
      explain: "이 사람은 생각이나 결과물을 적극적으로 꺼내 보이고 알릴 때, 그것이 돈으로 이어지기 쉬운 구조입니다.",
      moment: "예를 들어 만들어둔 것을 혼자 갖고 있기보다, 사람들 앞에 적극적으로 꺼내 보였을 때 실제 기회로 이어지는 경우가 많습니다.",
    };
  }
  if (top === "관성") {
    return {
      label: "조직과 역할 안에서 만들어지는 돈",
      explain: "이 사람은 정해진 자리와 책임을 맡아 그 역할을 해낼 때, 그 안에서 자연스럽게 돈이 만들어지는 구조에 가깝습니다.",
      moment: "예를 들어 스스로 새 판을 벌이기보다, 이미 있는 자리에서 맡은 몫을 확실히 해냈을 때 그 대가가 더 분명하게 돌아옵니다.",
    };
  }
  if (top === "재성") {
    if (second === "비겁") {
      return {
        label: "거래와 확장으로 키우는 돈",
        explain: "이 사람은 가진 것을 한곳에 묶어두기보다, 계속 움직이고 새로운 시도에 걸어보는 과정에서 돈이 커지는 쪽에 가깝습니다.",
        moment: "예를 들어 이미 갖고 있는 걸 그대로 두기보다, 조건이 맞으면 다른 형태로 바꾸거나 새로운 곳에 걸어보는 쪽을 택하기 쉽습니다.",
      };
    }
    return {
      label: "차곡차곡 쌓아 축적하는 돈",
      explain: "이 사람은 새로 벌이기보다, 이미 자리 잡은 방식을 반복하며 꾸준히 쌓아가는 과정에서 돈이 커지는 쪽에 가깝습니다.",
      moment: "예를 들어 당장 크게 늘리는 방법보다, 지금 방식을 흔들림 없이 오래 이어가는 쪽에서 결과적으로 더 크게 쌓이는 경우가 많습니다.",
    };
  }
  // top === "인성"
  return {
    label: "신뢰와 관계를 통해 자리 잡는 돈",
    explain: "이 사람은 빠르게 벌이기보다, 사람들의 신뢰를 먼저 쌓은 뒤 그 위에서 돈이 자연스럽게 따라오는 구조에 가깝습니다.",
    moment: "예를 들어 처음 만난 기회를 바로 붙잡기보다, 충분히 검증되고 신뢰가 쌓인 뒤에야 실제로 움직이는 경우가 많습니다.",
  };
}

/** "만들어낸 결과물이 재물로 이어지는 길이 있는지"는 기존 chapters[3]의
 * buildMakingParagraph(식상生財 문단)가 이미 정확히 같은 결론을 말한다 —
 * 여기서 다시 만들면 같은 결론을 두 번 말하게 되므로(사용자 요청 #5·#6
 * 원칙), 이 섹션에서는 자체 linkClause를 만들지 않는다. 조립 단계
 * (assembleWealthChapterSections)에서 기존 makingPara를 이 섹션 본문
 * 중간에 그대로 끼워 넣어 "만드는 방식 → 그 근거(식상生財) → 구체적 장면"
 * 순서로 자연스럽게 이어지게 한다. */
function buildMoneyMakingSection(key: ChapterFourKey): { lead: string; moment: string } {
  const mt = moneyMakingType(key);
  return { lead: `${mt.explain} 굳이 이름을 붙이면 ‘${mt.label}’에 가깝습니다.`, moment: mt.moment };
}

// ────────────────────────────────────────────────────────────────
// ③ 돈을 움직이는 나의 십성 (WHY 해설층, 第四章 3차와 동일 원칙)
// ────────────────────────────────────────────────────────────────

type PickRole = "main" | "making" | "risk" | "stability";

// "쉽게 말하면, " 없이 뜻풀이 본문만 담는다 — 앞머리(리드 문구)는 픽마다
// buildDefinitionLead()가 다르게 붙인다("쉽게 말하면"이 3~4개 픽에서
// 기계적으로 반복되는 것을 막기 위함, 제五章 구조 개편 승인 사항).
const DEFINITION: Record<string, string> = {
  비견: "비견은 나와 같은 힘으로 나란히 서서 스스로 판단하고 움직이는 기운입니다. 재물에서는 남에게 기대지 않고 직접 벌어들이려는 태도로 나타납니다.",
  겁재: "겁재는 내 것을 나누거나 다시 다른 곳으로 움직이게 만드는 기운입니다. 재물에서는 손에 쥔 것을 계속 순환시키려는 태도로 나타납니다.",
  식신: "식신은 서두르지 않고 차분하게 결과물을 만들어 쌓아가는 기운입니다. 재물에서는 하나의 방식을 꾸준히 반복해 결과를 내는 태도로 나타납니다.",
  상관: "상관은 생각한 것을 적극적으로 표현하고 벌이게 만드는 기운입니다. 재물에서는 드러내고 알려서 기회를 만들어내는 태도로 나타납니다.",
  편재: "편재는 한곳에 고정되기보다 기회와 자원을 움직이며 만들어내는 재물의 성질입니다. 재물에서는 상황에 따라 유연하게 자원을 옮기는 태도로 나타납니다.",
  정재: "정재는 꾸준하고 안정적으로 들어와 쌓이는 재물의 성질입니다. 재물에서는 반복되는 확인과 계획을 통해 안심하려는 태도로 나타납니다.",
  편관: "편관은 상황 앞에서 즉각 움직이게 만드는 기운입니다. 재물에서는 위기나 기회 앞에서 빠르게 판단하고 대응하는 태도로 나타납니다.",
  정관: "정관은 정해진 기준과 책임을 지키게 하는 기운입니다. 재물에서는 원칙과 절차를 지키며 관리하려는 태도로 나타납니다.",
  편인: "편인은 남다른 방식으로 받아들이고 정리하는 기운입니다. 재물에서는 남들과 다른 시각으로 기회를 알아보는 태도로 나타납니다.",
  정인: "정인은 안정적으로 받아들이고 신뢰를 쌓아가는 기운입니다. 재물에서는 서두르지 않고 신뢰를 먼저 쌓은 뒤 움직이는 태도로 나타납니다.",
};

/** 뜻풀이 진입 방식 — "쉽게 말하면"류 메타 문구가 픽마다 반복되면 템플릿
 * 처럼 느껴진다는 지적(第五章 최종 문장 편집 QA, 승인된 작업)에 따라,
 * 같은 정의 문장(DEFINITION)과 위치 문장(positionText)을 4가지 서로
 * 다른 방식으로 조립한다 — 새 문장을 짓는 게 아니라 있는 두 문장을
 * 다른 순서·구조로 잇는 것뿐이다. 등장 순서(defIndex)에 따라 순환한다:
 *  0(가장 먼저 나오는 픽) — "쉽게 말하면"으로 그 章에서 처음 한 번만 연다.
 *  1 — 질문형으로 열어 바로 정의로 이어간다.
 *  2 — 정의를 먼저 말하지 않고, "이 명식에서의 위치" 문장부터 시작해
 *      정의를 그 자리에서 바로 이어붙인다(개인 명식으로 바로 연결).
 *  3+ — 메타 문구 없이 정의로 곧장 들어간다.
 */
function buildDefinitionOpening(sipseong: string, positionText: string, defIndex: number): string[] {
  const def = DEFINITION[sipseong] ?? "";
  const style = defIndex % 4;
  if (style === 0) return [`쉽게 말하면, ${def}`, positionText];
  if (style === 1) return [`${termDisplay(sipseong)}은 이 사람에게 어떤 힘일까요? ${def}`, positionText];
  if (style === 2) return [`${positionText} ${def}`];
  return [def, positionText];
}

// 통합 독서 QA #3 — 사랑챕터(loveSipseongInsightNarrative.ts)와 같은
// "이 힘이 X를 향해 작동할 때는.../왜 이 사람이 Y하는지는..." 골격
// 반복 지적을 반영해 문장 진입 방식만 다양화했다. 따옴표 속 재물 태도/
// WHY 명리 근거/결론은 전부 그대로 보존했다 — 순서와 접속만 바꿨다.
const MONEY_ORIGIN_TEXT: Record<string, string> = {
  비견: "남의 방식을 그대로 따르기보다 자기 방식을 고집하는 편입니다. 스스로 판단하고 나서려는 비견의 성질이 돈 앞에서는 '남과 비교하기보다 스스로 정한 기준으로 벌고 쓰려는' 마음으로 나타나기 때문입니다.",
  겁재: "이 사람에게 돈은 쉽게 다시 움직입니다. 가진 것을 나누고 움직이려는 겁재의 힘이 그대로 이어져, '벌어들인 것을 혼자 쥐고 있기보다 나누거나 다른 곳으로 옮기려는' 마음으로 드러나기 때문입니다.",
  식신: "새로운 시도보다 익숙한 루틴을 선호하는 사람입니다. 서두르지 않고 쌓아가는 식신의 성질이 돈 앞에서는 '한 번에 크게 벌기보다 익숙한 방식을 반복해 천천히 결과를 쌓으려는' 마음으로 나타납니다.",
  상관: "가만히 있기보다 먼저 벌이는 편입니다. 생각과 결과물을 밖으로 꺼내려는 상관의 힘 때문에, 돈 앞에서도 '가진 것을 적극적으로 드러내고 알려서 기회를 만들려는' 마음이 먼저 나섭니다.",
  편재: "한곳에 자원을 묶어두는 걸 유독 답답해합니다. 기회와 자원을 움직이며 넓혀가는 편재의 성질이 돈 앞에서는 '한 가지 방식에 얽매이지 않고 여러 기회를 동시에 살피려는' 마음으로 나타나기 때문입니다.",
  정재: "한 번의 큰 수입보다 매달의 작은 확인을 더 중요하게 여깁니다. 꾸준함으로 쌓이는 정재의 성질이 돈 앞에서는 '반복되는 확인과 계획을 통해 안심하려는' 마음으로 이어지기 때문입니다.",
  편관: "애매한 상태를 오래 못 견디는 사람입니다. 상황 앞에서 분명한 태도를 요구하는 편관의 힘 때문에, 돈 앞에서도 '상황이 요구하는 순간 빠르게 결정하고 움직이려는' 마음이 먼저 섭니다.",
  정관: "즉흥적인 지출보다 계획된 지출을 선호하는 편입니다. 질서와 책임을 지키려는 정관의 성질이 돈 앞에서는 '정해진 절차와 원칙을 지키며 관리하려는' 마음으로 나타나기 때문입니다.",
  편인: "남들이 몰리는 곳을 오히려 피하는 사람입니다. 남다른 방식으로 받아들이고 정리하는 편인의 힘 때문에, 돈 앞에서도 '남들과 다른 방식으로 기회를 알아보려는' 마음이 먼저 나섭니다.",
  정인: "검증되지 않은 기회에는 쉽게 움직이지 않습니다. 안정적으로 받아들이고 신뢰를 쌓는 정인의 성질이 돈 앞에서는 '신뢰가 먼저 쌓인 뒤에야 돈과 관련된 결정을 내리려는' 마음으로 이어지기 때문입니다.",
};

function comboClause(cat: SipseongCategory, key: ChapterFourKey): string {
  const { bigyeopVsJaeseong: bj, gwanseongVsBigyeop: gb, inseongVsSiksang: is_, jaeseongVsInseong: ji } = key;
  if (cat === "재성") {
    if (bj.leadCategory === "비겁" && gapTierActive(bj.gapTier)) {
      return "다만 이 힘 곁에는 나누고 움직이려는 힘도 함께 있어, 이 힘이 온전히 혼자 쌓이기보다 자꾸 다른 곳으로 옮겨가려는 압력을 받습니다.";
    }
    if (gb.leadCategory === "관성" && gapTierActive(gb.gapTier)) {
      return "다만 이 힘을 지켜주는 책임의 힘도 함께 있어, 이 힘이 쉽게 흩어지지 않고 자리를 잡는 쪽으로 작동합니다.";
    }
    return "이 힘을 특별히 흔들거나 지켜주는 다른 축이 뚜렷하지 않아, 이 힘 자체의 성질이 비교적 그대로 드러나는 편입니다.";
  }
  if (cat === "식상") {
    // siksangJaeseongLinked===true일 때만 이 픽(③-2)이 만들어지는데, 그
    // 사실 자체는 ②(만드는 방식)에서 기존 makingPara가 이미 말한다 —
    // 여기서 같은 사실을 또 말하면 두 섹션이 같은 결론을 반복하게
    // 된다(第五章 최종 문장 편집 QA). 대신 "만든 것이 실제로 얼마나
    // 남는지"로 초점을 옮겨, 뒤에 나올 ④(버는/지키는 힘)로 자연스럽게
    // 이어지는 다리 역할을 하게 한다.
    return key.siksangJaeseongLinked
      ? "다만 이 힘으로 만든 결과가 실제로 얼마나 남는지는, 벌어들인 것을 지키려는 힘이 얼마나 뒷받침되는지에 따라 달라질 수 있습니다."
      : "다만 이 힘이 재물로 곧장 이어지는 길은 뚜렷하지 않아, 만들어내는 데 먼저 무게가 실리고 재물은 그 뒤를 따라오는 쪽입니다.";
  }
  if (cat === "비겁") {
    return gb.leadCategory === "관성" && gapTierActive(gb.gapTier)
      ? "다만 이 힘을 누르는 책임의 힘도 함께 있어, 나누고 움직이려는 마음이 완전히 제멋대로 흐르지는 않습니다."
      : "이 힘을 눌러줄 다른 축이 뚜렷하지 않아, 나누고 움직이려는 마음이 비교적 자유롭게 작동합니다.";
  }
  if (cat === "관성") {
    return "이 힘은 재성과는 다른 축이지만, 이 사람이 재물을 대할 때 '얼마나 벌었는가'보다 '얼마나 책임 있게 다뤘는가'를 함께 저울질하는 배경이 됩니다.";
  }
  // 인성
  return is_.leadCategory === "인성" && gapTierActive(is_.gapTier)
    ? "다만 이 힘이 만들어내는 힘(식상)을 누르는 쪽으로도 작동해, 적극적으로 벌이기보다 신중하게 멈춰 서는 순간이 함께 있습니다."
    : ji.leadCategory === "재성" && gapTierActive(ji.gapTier)
      ? "다만 재물의 힘이 이 힘보다 앞서 있어, 안정을 살피기보다 재물 쪽으로 먼저 마음이 기우는 편입니다."
      : "이 힘과 재물의 힘 사이에 특별히 두드러진 충돌은 없어, 두 힘이 비교적 나란히 작동합니다.";
}

/** 강점/주의점 — group(신강/신약/중화) × role(선정 슬롯) 조합별로 분리한다.
 * 第四章 3차에서 확정된 원칙(같은 사람 안에서 group이 같아도 role이
 * 다르면 문장이 겹치면 안 된다)을 그대로 재물 축에 적용한다. */
function strengthAndCaution(group: BalanceGroup, role: PickRole): { strength: string; caution: string } {
  if (group === "신강계열") {
    if (role === "main") {
      return {
        strength: "이 힘을 원래 잘 받쳐줄 그릇이라, 재물을 대하는 방식에서 안정적인 강점으로 작동하기 쉽습니다.",
        caution: "다만 여유가 있는 만큼, 스스로 이 힘을 얼마나 쓰고 있는지 잘 못 느낄 수 있어 관리에 소홀해질 수 있습니다.",
      };
    }
    if (role === "making") {
      return {
        strength: "만들어내는 힘도 무리 없이 감당할 여력이 있어, 벌이는 만큼 결과로 이어지기 쉬운 편입니다.",
        caution: "다만 감당할 수 있다는 확신 때문에, 벌이는 규모를 실제 필요보다 크게 잡을 수 있습니다.",
      };
    }
    if (role === "risk") {
      return {
        strength: "이 힘이 흔들어도 감당할 그릇 자체는 있어서, 겉으로 크게 무너지는 모습은 잘 보이지 않습니다.",
        caution: "다만 그 그릇만 믿고 있으면, 이 힘이 실제로 얼마나 새고 있는지는 스스로도 놓치기 쉽습니다.",
      };
    }
    return {
      strength: "안정을 지키려는 이 힘을 감당할 여력 자체는 있어서, 재물이 흔들려도 완전히 무너지지는 않는 편입니다.",
      caution: "다만 여유가 있는 만큼, 안정이 실제로 얼마나 눌리고 있는지는 스스로도 잘 못 느낄 수 있습니다.",
    };
  }
  if (group === "신약계열") {
    if (role === "main") {
      return {
        strength: "이 힘이 있다는 것 자체가, 재물을 대하는 마음 안에 분명한 결이 있다는 뜻입니다.",
        caution: "다만 이 힘을 다룰 여력이 크지 않아, 감당해야 할 몫이 커지면 쉽게 지칠 수 있습니다.",
      };
    }
    if (role === "making") {
      return {
        strength: "적은 자원으로도 결과를 만들어내려는 감각 자체는 이 사람의 강점입니다.",
        caution: "다만 여력이 크지 않아, 벌이는 규모가 스스로 감당할 수 있는 선을 넘으면 쉽게 부담이 됩니다.",
      };
    }
    if (role === "risk") {
      return {
        strength: "이 힘이 흔드는 걸 예민하게 알아차리는 감각 자체는 이 사람의 강점입니다.",
        caution: "다만 그걸 다 감당할 여력은 크지 않아, 이 힘 앞에서 쉽게 지칠 수 있습니다.",
      };
    }
    return {
      strength: "안정을 지키려는 마음이 있다는 것 자체가, 이 사람 안에 분명한 결이 있다는 뜻입니다.",
      caution: "다만 그 안정을 지킬 여력이 크지 않아, 재물의 힘에 눌리는 순간이 반복되면 쉽게 흔들릴 수 있습니다.",
    };
  }
  if (role === "main") {
    return {
      // 사랑(loveSipseongInsightNarrative.ts)의 같은 "중화+primary" 분기와
      // 문장이 겹쳤던 지점(통합 독서 QA #2) — 같은 사실(중화라 이 힘을
      // 한쪽으로 몰지 않는다)을 재물 챕터의 실제 주제인 "벌 때와 지킬
      // 때를 오가는 판단"으로 옮겨 쓴다. 결론(균형 때문에 강점이
      // 도드라지지 않음)은 동일하게 보존하되, 그 결론이 적용되는 장면을
      // 재물 판단으로 바꿨다.
      strength: "돈을 벌 때와 지킬 때, 어느 한쪽으로 치우치지 않고 상황에 맞게 오가는 편입니다.",
      caution: "다만 그렇게 오가는 사이, 이 힘이 재물에서 뚜렷한 강점으로 잘 드러나지 않을 수 있습니다.",
    };
  }
  if (role === "making") {
    return {
      strength: "벌이는 규모를 상황에 맞게 조절할 수 있어, 무리한 확장으로 이어지는 경우는 적은 편입니다.",
      caution: "다만 그 균형 때문에, 기회가 왔을 때 과감하게 밀어붙이는 힘은 상대적으로 약할 수 있습니다.",
    };
  }
  if (role === "risk") {
    return {
      strength: "이 힘이 흔들어도 어느 한쪽에 치우치지 않고 그때그때 맞춰가는 유연함이 있습니다.",
      caution: "다만 그렇게 맞추는 과정 자체가 잘 드러나지 않아, 스스로 얼마나 애쓰고 있는지 놓치기 쉽습니다.",
    };
  }
  return {
    strength: "안정을 지키려는 힘과 흔드는 힘 사이에서 극단으로 치우치지 않고 균형을 잡아가는 편입니다.",
    caution: "다만 그 균형 때문에, 안정을 지키려는 노력 자체는 뚜렷하게 드러나지 않을 수 있습니다.",
  };
}

// 카테고리 하나가 사람마다 두 번 등장하지 않는다(usedCategories로 이미
// 보장) — 그래서 카테고리 단위 뱅크(5개)만으로도 같은 사람 안에서 문장이
// 겹칠 위험이 없다.
const MONEY_MOMENT_BY_CATEGORY: Record<SipseongCategory, string> = {
  비겁: "예를 들어 여럿이 함께 벌인 일에서도, 자기 몫만큼은 스스로 확인하고 넘어가려는 모습으로 나타나기 쉽습니다.",
  식상: "예를 들어 결과물을 다 만들고 나서도, 바로 내놓기보다 한 번 더 다듬거나 더 적극적으로 알린 뒤에야 만족하는 모습으로 나타나기 쉽습니다.",
  재성: "예를 들어 같은 물건을 사더라도, 가격과 조건을 한 번 더 비교해보고 결정하는 모습으로 나타나기 쉽습니다.",
  관성: "예를 들어 돈이 걸린 결정을 내릴 때도, 정해진 절차와 책임 소재부터 먼저 확인하는 모습으로 나타나기 쉽습니다.",
  인성: "예를 들어 새로운 기회 앞에서도, 믿을 만한 사람이나 근거를 먼저 확인한 뒤에야 움직이는 모습으로 나타나기 쉽습니다.",
};

/** alreadyIntroduced=true면(=이 십성이 章 앞부분 "돈이 움직이는 방식"
 * 도입부에서 이미 뜻풀이가 나온 경우) 정의 문단을 생략하고 곧바로 "이
 * 명식에서의 상태"로 들어간다 — 같은 십성의 뜻을 두 번 설명하지 않기
 * 위함(사용자 요청 #3). 십성 해석 자체(상태·WHY·조합·강점/주의·장면)는
 * 하나도 빠지지 않는다. defIndex는 alreadyIntroduced가 아닐 때만
 * "쉽게 말하면" 리드 문구를 고르는 데 쓴다. */
function buildPickParagraphs(
  sipseong: string,
  category: SipseongCategory,
  key: ChapterFourKey,
  group: BalanceGroup,
  role: PickRole,
  alreadyIntroduced: boolean,
  defIndex: number,
  /** 이 픽이 章 안에서 몇 번째 십성 픽인지(1=main). 3번째부터는 "구체적
   * 장면" 문단을 생략해 3~4개 픽이 연속될 때 문단 밀도를 낮춘다 — 새
   * 정보를 추가하는 게 아니라 이미 있는 마지막 예시 문단 하나를 덜어내는
   * 것뿐이다(第五章 최종 문장 편집 QA "3단 토픽 연속 구간 호흡 개선"). */
  pickPosition: number
): string[] {
  const evidence = key.evidenceByCategory[category];
  const shape = shapeOf(evidence, sipseong);
  const monthScore = key.wealth.byCategory[category].monthScore;
  const sc = strengthAndCaution(group, role);
  const positionText = `${POSITION_TEXT_BY_SHAPE[role][shape]} ${monthScoreText(monthScore, role)}`;

  const paragraphs: string[] = [];
  if (alreadyIntroduced) {
    paragraphs.push(`앞서 잠깐 나왔던 ${termDisplay(sipseong)}이 이 명식에서 실제로 어떻게 작동하는지를 좀 더 들여다보면, ${positionText}`);
  } else {
    paragraphs.push(...buildDefinitionOpening(sipseong, positionText, defIndex));
  }
  paragraphs.push(MONEY_ORIGIN_TEXT[sipseong] ?? "", comboClause(category, key), `${sc.strength} ${sc.caution}`);
  if (pickPosition <= 2) {
    paragraphs.push(MONEY_MOMENT_BY_CATEGORY[category]);
  }
  return paragraphs;
}

function buildSipseongInsightSections(
  key: ChapterFourKey,
  balanceVerdict: BalanceVerdict,
  obstruction: WealthObstructionResult,
  glossedInIntro: Set<string>
): WealthInsightSection[] {
  const group = balanceGroupOf(balanceVerdict);
  const sections: WealthInsightSection[] = [];
  const usedCategories = new Set<SipseongCategory>();
  let defIndex = 0; // alreadyIntroduced가 아닌 픽에서만 증가 — 뜻풀이 진입 방식 순환용
  let pickPosition = 0; // 모든 픽에서 증가 — 3번째 픽부터 "구체적 장면" 문단 생략용

  function push(heading: string, sipseong: string, category: SipseongCategory, role: PickRole) {
    const alreadyIntroduced = glossedInIntro.has(sipseong);
    pickPosition += 1;
    const body = buildPickParagraphs(sipseong, category, key, group, role, alreadyIntroduced, defIndex, pickPosition);
    if (!alreadyIntroduced) defIndex += 1;
    usedCategories.add(category);
    sections.push({ heading, body });
  }

  // 1) 항상 포함 — topAxis(가장 세력이 큰 축)의 대표 십성
  const topAxis = key.wealth.all[0].category;
  const topEvidence = pickLeadEvidence(key.evidenceByCategory[topAxis]);
  const topSipseong = topEvidence?.sipseong ?? dominantSipseong(key.evidenceByCategory[topAxis]);
  if (topSipseong) {
    push(`③ 돈을 움직이는 나의 십성 — ${termDisplay(topSipseong)}`, topSipseong, topAxis, "main");
  }

  // 2) 만드는 힘(식상)이 재물과 이어져 있고, 아직 안 다뤘으면 추가
  if (key.siksangJaeseongLinked && !usedCategories.has("식상")) {
    const ev = pickLeadEvidence(key.evidenceByCategory.식상);
    const sipseong = ev?.sipseong ?? dominantSipseong(key.evidenceByCategory.식상);
    if (sipseong) {
      push(`③-2 돈을 만들어내는 또 다른 힘 — ${termDisplay(sipseong)}`, sipseong, "식상", "making");
    }
  }

  // 3) 구조적 방해축(5장 계산 재사용) 중 아직 안 다룬 축이 있으면 추가.
  // 1순위(가장 심한 방해축)가 이미 위에서 다룬 축과 겹치면, 그 다음
  // 순위(structuralObstructions[1])까지 확인한다 — 복합/중첩 방해축을
  // 가진 사람에게서 실제로 겹치는 경우가 있어(예: topAxis=재성인 동시에
  // wealthExcess도 재성), 2순위까지 보지 않으면 이 사람에게 유의미한
  // 두 번째 방해축이 있어도 놓치게 된다. 새 판정을 만드는 게 아니라, 5장
  // 계산이 이미 순서대로 반환하는 배열을 한 칸 더 보는 것뿐이다.
  const obFlagCategory = { wealthExcess: "재성", companionExcess: "비겁", outputExcess: "식상", resourceExcess: "인성", officerExcess: "관성" } as const;
  const obstructionPick = obstruction.structuralObstructions.find((o) => !usedCategories.has(obFlagCategory[o.sourceFlag]));
  if (obstructionPick) {
    const obCategory = obFlagCategory[obstructionPick.sourceFlag];
    const ev = pickLeadEvidence(key.evidenceByCategory[obCategory]);
    const sipseong = ev?.sipseong ?? dominantSipseong(key.evidenceByCategory[obCategory]);
    if (sipseong) {
      push(`③-3 돈을 흔드는 또 다른 힘 — ${termDisplay(sipseong)}`, sipseong, obCategory, "risk");
    }
  }

  // 4) 구조적 방해축으로는 안 걸리지만, 재성이 인성(안정을 지키는 힘)을
  // 뚜렷하게 누르는 관계(jaeseongVsInseong, 이미 ChapterFourKey에 계산돼
  // 있고 ④에서는 짧은 절로만 썼던 값)가 있고 인성이 아직 안 다뤄졌으면,
  // 그 자체를 하나의 흔드는 힘으로 다룬다. 새 계산이 아니라 기존
  // compareCategories 결과를 ③ 픽 기준으로 한 번 더 쓰는 것뿐이다.
  if (!usedCategories.has("인성") && key.jaeseongVsInseong.leadCategory === "재성" && gapTierActive(key.jaeseongVsInseong.gapTier)) {
    const ev = pickLeadEvidence(key.evidenceByCategory.인성);
    const sipseong = ev?.sipseong ?? dominantSipseong(key.evidenceByCategory.인성);
    if (sipseong) {
      push(`③-4 안정을 지키는 힘이 흔들리는 지점 — ${termDisplay(sipseong)}`, sipseong, "인성", "stability");
    }
  }

  return sections;
}

// ────────────────────────────────────────────────────────────────
// ⑥ '돈을 버는 힘'과 '돈을 지키는 힘'
// ────────────────────────────────────────────────────────────────

// heChongOnWealth(재물 자리의 합·충)는 기존 chapterFive(돈이 새는 이유)의
// caveat 문단이 이미 "결이 한 번으로 끝나지 않을 수 있다"는 같은 결론으로
// 다루고 있다 — 여기서 다시 별도 문단으로 만들면 같은 계산 근거로 같은
// 결론을 두 번 말하게 되어(사용자 요청 #5), 이 섹션에서는 만들지 않는다.
// chapterFive가 유일한 위치로 남는다.

/** growingCorePara(기존 chapters[3]의 "재물이 커지는 핵심 조건" 문단)를
 * 이 섹션의 첫 문단으로 그대로 옮겨온다 — "커지는 조건"과 "버는/지키는
 * 힘"은 같은 질문(재물이 왜 커지거나 안 커지는가)이라, 두 곳에 나눠
 * 두면 같은 결론이 반복된다(사용자 요청 #5·#6). 문장은 삭제하지 않고
 * 위치만 통합한다. */
function buildMakeVsKeepSection(key: ChapterFourKey, growingCorePara: string): WealthInsightSection {
  const makeStrong = key.jaeseong.exposure !== "미미" || key.siksangJaeseongLinked;
  const bigyeopLeads = key.bigyeopVsJaeseong.leadCategory === "비겁" && gapTierActive(key.bigyeopVsJaeseong.gapTier);
  const gwanProtects = key.gwanseongVsBigyeop.leadCategory === "관성" && gapTierActive(key.gwanseongVsBigyeop.gapTier);
  const keepStrong = !bigyeopLeads || gwanProtects;

  let text: string;
  if (makeStrong && keepStrong) {
    text = "이 사람은 만드는 힘과 지키는 힘이 둘 다 어느 정도 갖춰진 구조입니다. 버는 만큼 남기는 흐름 자체는 크게 무리가 없어, 규모를 키우는 쪽에 마음을 써도 되는 편입니다.";
  } else if (makeStrong && !keepStrong) {
    text = "이 사람은 만드는 힘은 뚜렷한데, 지키는 힘은 상대적으로 약한 구조입니다. 버는 감각은 있어도 손에 쥔 것이 자꾸 다른 방향으로 움직이려는 성질이 함께 있어, 버는 만큼 남지 않는다고 느낄 수 있습니다.";
  } else if (!makeStrong && keepStrong) {
    text = "이 사람은 화려하게 만들어내는 힘보다, 이미 있는 것을 지키고 흩어지지 않게 하는 힘이 더 뚜렷한 구조입니다. 적게 벌어도 잘 새지 않는 쪽에 가깝습니다.";
  } else {
    text = "이 사람은 만드는 힘도, 지키는 힘도 아직 뚜렷하게 앞서 있지 않은 구조입니다. 재물이 이 명식 전면에서 직접 움직이기보다, 다른 힘을 거쳐 서서히 자리를 잡아가는 쪽에 가깝습니다.";
  }
  const ji = key.jaeseongVsInseong;
  const stabilityClause =
    ji.leadCategory === "재성" && gapTierActive(ji.gapTier)
      ? "게다가 재물의 힘이 안정을 추구하는 힘보다 앞서 있어, 이미 갖춘 것을 지키기보다 계속 움직이고 불려나가려는 쪽으로 마음이 기울기 쉽습니다."
      : ji.leadCategory === "인성" && gapTierActive(ji.gapTier)
        ? "게다가 안정을 추구하는 힘이 재물의 힘보다 앞서 있어, 무리해서 불리기보다 이미 있는 것을 지키는 쪽으로 마음이 먼저 기웁니다."
        : "";
  const body = [growingCorePara, text];
  if (stabilityClause) body.push(stabilityClause);
  return { heading: "④ ‘버는 힘’과 ‘지키는 힘’", body };
}

// ────────────────────────────────────────────────────────────────
// ⑦ 조직·독립·사업에서 돈의 방식
// ────────────────────────────────────────────────────────────────

function buildOrgStyleSection(key: ChapterFourKey): WealthInsightSection {
  const gwanVsBi = compareCategories(key.wealth, "관성", "비겁");
  let base: string;
  if (gwanVsBi.leadCategory === "관성" && gapTierActive(gwanVsBi.gapTier)) {
    base = "이 사람은 정해진 구조와 역할이 뚜렷할 때 오히려 능력이 잘 살아나는 쪽입니다. 스스로 모든 걸 판단해야 하는 환경보다, 기준이 있고 그 안에서 책임을 다하는 환경에서 재물이 더 안정적으로 움직입니다.";
  } else if (gwanVsBi.leadCategory === "비겁" && gapTierActive(gwanVsBi.gapTier)) {
    base = "이 사람은 정해진 틀 안에서보다, 스스로 판단하고 실행할 수 있는 여지가 있을 때 능력이 더 잘 살아나는 쪽입니다. 남이 짜준 구조를 그대로 따르기보다, 자기 방식대로 움직일 수 있을 때 재물도 함께 움직이기 쉽습니다.";
  } else {
    base = "이 사람은 정해진 구조 안에서도, 스스로 판단해서 움직여야 하는 상황에서도 크게 무리 없이 능력을 발휘하는 쪽입니다. 어느 한 환경에 강하게 묶이기보다, 상황에 맞춰 유연하게 자리를 잡는 편입니다.";
  }
  const followClauses: string[] = [];
  if (key.siksangJaeseongLinked) {
    followClauses.push("여기에 더해, 만들어내거나 표현하는 결과물이 실제 수익으로 이어지는 길도 함께 있어 생산·표현 활동이 재물로 연결되기 쉬운 결도 있습니다.");
  }
  const bj = key.bigyeopVsJaeseong;
  if (key.wealth.all[0].category === "재성" || (bj.leadCategory === "비겁" && gapTierActive(bj.gapTier))) {
    followClauses.push("또한 가진 것을 계속 움직이려는 힘이 있어, 한 자리에 머무르기보다 거래하고 넓혀가는 쪽에서 강점이 나타나기 쉽습니다.");
  }
  // ①(타고난 돈의 감각)의 rootClause와 같은 계산값(dayMasterRoot.hasRoot)을
  // 쓰지만 결론(실행 여력 vs 독립 환경에서의 안정성)은 서로 다르다 —
  // 다만 두 문장이 "여기에/다만 자기 자신의 기반(일간)도[은]..." 앞머리를
  // 토씨까지 그대로 공유해, 章 안에서 읽을 때 데자뷰처럼 느껴진다는 지적
  // (출시 전 정밀 QA)에 따라 이 문장의 도입부만 다르게 바꿨다 — 근거·
  // 결론·판정은 그대로다.
  followClauses.push(
    key.dayMasterRoot.hasRoot
      ? "이 사람 자신의 기반(일간)도 뿌리를 갖고 있어, 정해진 틀을 벗어나 독립적으로 판단하고 실행해야 하는 환경에서도 쉽게 흔들리지 않을 바탕이 있습니다."
      : "이 사람 자신의 기반(일간)은 상대적으로 여린 쪽이라, 온전히 혼자 판단하고 책임져야 하는 환경보다는 함께 의지할 구조나 사람이 있는 환경에서 조금 더 편안하게 능력을 발휘할 수 있습니다."
  );
  const is_ = key.inseongVsSiksang;
  if (is_.leadCategory === "인성" && gapTierActive(is_.gapTier)) {
    followClauses.push("관리 방식으로 보면, 새로운 시도를 벌이기 전에 충분히 검증하고 확인하는 쪽이 이 사람에게는 더 잘 맞습니다.");
  } else if (is_.leadCategory === "식상" && gapTierActive(is_.gapTier)) {
    followClauses.push("관리 방식으로 보면, 완벽히 검증되기 전이라도 일단 시도해보며 조정해가는 쪽이 이 사람에게는 더 잘 맞습니다.");
  }
  return { heading: "⑥ 조직·독립·사업에서 돈의 방식", body: [base, ...followClauses] };
}

// ────────────────────────────────────────────────────────────────
// ⑧ 큰돈을 다룰 때 달라지는 모습 — 근거가 있을 때만 포함
// ────────────────────────────────────────────────────────────────

// obstruction.structuralObstructions[].type을 규모 확대 맥락에서 짧게
// 가리킬 때만 쓰는 로컬 번역(사용자 요청 #8 — 이미 있는 severityLabel/
// type 값을 조금 더 구체적으로 연결하는 것뿐, 새 판정이 아니다). 5장
// 내부에서만 쓰이는 이름과 같은 값을 이 파일에서 다시 짧게 부르는
// 것이라 5장 파일을 건드리지 않는다.
const OBSTRUCTION_SCALE_NOTE: Record<string, string> = {
  과부하형: "감당해야 할 무게가 커지는 결",
  분산형: "여러 갈래로 흩어지는 결",
  소모형: "쏟아내는 만큼 나가는 결",
  제동형: "재고 따지느라 늦어지는 결",
  압박형: "책임이 먼저 커지는 결",
};

function buildScaleSection(key: ChapterFourKey, obstruction: WealthObstructionResult): WealthInsightSection | null {
  const dominant = key.jaeseong.dominant;
  const complexObstruction = obstruction.severityLabel === "복합/중첩 방해축";
  const bj = key.bigyeopVsJaeseong;
  const gb = key.gwanseongVsBigyeop;
  const bjClear = bj.leadCategory === "비겁" && bj.gapTier === "뚜렷";
  const gbClear = gb.leadCategory === "관성" && gb.gapTier === "뚜렷";
  if (!dominant && !complexObstruction && !bjClear && !gbClear) return null;

  const clauses: string[] = [];
  if (dominant) {
    const mt = moneyMakingType(key);
    clauses.push(`이 사람은 재물의 힘 자체가 이 명식에서 가장 앞서 있는 축이라, 다루는 돈의 규모가 커질수록 그 강점도 함께 더 뚜렷해지는 쪽입니다. 특히 앞서 살펴본 ‘${mt.label}’ 방식이 작은 돈보다 큰돈을 다룰 때 오히려 더 선명하게 드러날 수 있습니다.`);
  }
  if (complexObstruction) {
    const notes = obstruction.structuralObstructions.map((o) => OBSTRUCTION_SCALE_NOTE[o.type]).filter(Boolean);
    const noteText = notes.length > 0 ? `(${notes.join(", ")})` : "";
    clauses.push(`다만 이 명식에는 재물을 흔드는 결이 한 가지가 아니라 여러 갈래${noteText}로 겹쳐 있어, 규모가 커질수록 함께 챙겨야 할 것도 그만큼 늘어나는 구조입니다. 작을 때는 크게 티가 안 나던 결들이, 규모가 커지면 동시에 드러나기 쉽습니다.`);
  }
  if (bjClear) {
    clauses.push("또한 나누고 다시 움직이려는 힘이 원래 뚜렷한 구조라, 다루는 돈이 커질수록 그 힘도 함께 커지기 쉽습니다. 작은 돈은 크게 티가 안 나도, 큰돈일수록 최소한의 원칙을 미리 정해두는 편이 이 구조에는 더 안전합니다.");
  }
  if (gbClear) {
    clauses.push("또한 책임지고 관리하려는 힘이 원래 뚜렷한 구조라, 다루는 돈이 커질수록 오히려 더 신중하고 절제된 태도가 자연스럽게 따라오는 쪽입니다.");
  }
  return { heading: "⑦ 큰돈을 다룰 때 달라지는 모습", body: clauses };
}

// ────────────────────────────────────────────────────────────────
// ⑨ 앞으로 돈을 다루는 전략 (종합, 새 계산 없이 앞선 판단만 재종합)
// ────────────────────────────────────────────────────────────────

function buildStrategySection(key: ChapterFourKey, obstruction: WealthObstructionResult): WealthInsightSection {
  const senseType = determineSenseType(key);
  const makeStrong = key.jaeseong.exposure !== "미미" || key.siksangJaeseongLinked;
  const bigyeopLeads = key.bigyeopVsJaeseong.leadCategory === "비겁" && gapTierActive(key.bigyeopVsJaeseong.gapTier);
  const gwanProtects = key.gwanseongVsBigyeop.leadCategory === "관성" && gapTierActive(key.gwanseongVsBigyeop.gapTier);
  const keepStrong = !bigyeopLeads || gwanProtects;

  let text: string;
  if (makeStrong && !keepStrong) {
    text = "지금까지 살펴본 것을 종합하면, 이 사람에게 지금 더 필요한 건 '더 버는 방법'이 아니라 '남기는 구조를 만드는 것'입니다. 만드는 힘은 이미 있으니, 벌어들인 것 중 일부를 곧바로 다시 움직이지 않고 붙잡아 두는 장치를 스스로 마련하는 쪽이 이 구조에는 더 맞습니다.";
  } else if (!makeStrong && keepStrong) {
    text = "지금까지 살펴본 것을 종합하면, 이 사람에게 지금 더 필요한 건 '더 지키는 방법'이 아니라 '만드는 힘을 조금씩 키우는 것'입니다. 이미 남기는 힘은 있으니, 작은 시도라도 실제로 만들어내는 경험을 늘려가는 쪽이 이 구조에는 더 맞습니다.";
  } else if (makeStrong && keepStrong) {
    text = "지금까지 살펴본 것을 종합하면, 이 사람은 만드는 힘과 지키는 힘이 함께 있는 구조라 특정 한쪽을 보완하기보다, 지금 쓰고 있는 방식을 꾸준히 이어가는 쪽이 더 유리합니다.";
  } else {
    text = "지금까지 살펴본 것을 종합하면, 이 사람의 재물은 이 명식 전면에서 직접 움직이기보다 다른 힘을 거쳐 서서히 자리를 잡는 구조입니다. 그래서 재물 자체를 서두르기보다, 그 재물을 실어 나르는 다른 힘(앞서 살펴본 돈을 만드는 방식)을 먼저 키우는 쪽이 더 실질적입니다.";
  }

  const senseFollow: Record<SenseType, string> = {
    안정형: " 특히 이 사람은 '안정'을 감각으로 타고났으니, 그 감각을 억지로 거스르기보다 그대로 살려 반복 가능한 구조를 만드는 편이 잘 맞습니다.",
    자유형: " 특히 이 사람은 '자유'를 감각으로 타고났으니, 하나의 방식에 억지로 묶어두기보다 여러 선택지를 열어두는 편이 잘 맞습니다.",
    성취형: " 특히 이 사람은 돈을 목표가 아니라 결과로 대하는 감각이 있으니, 돈 자체보다 맡은 역할의 완성도를 먼저 살피는 편이 잘 맞습니다.",
    수단형: " 특히 이 사람은 돈을 수단으로 대하는 감각이 있으니, '무엇을 위해 이 돈이 필요한가'를 먼저 분명히 해두는 편이 잘 맞습니다.",
    혼합형: " 특히 이 사람은 안정과 자유 두 감각을 함께 갖고 있으니, 그때그때 어느 쪽이 더 필요한 시기인지를 스스로 점검하는 편이 잘 맞습니다.",
  };

  return { heading: "⑩ 앞으로 돈을 다루는 전략", body: [text + senseFollow[senseType], buildFinalSynthesisClause(key, obstruction)] };
}

/** 마무리 종합 문장 — 돈을 만드는 방식(②③, moneyMakingType은 이미
 * strengthAndCaution 위에서 다뤘으므로 여기서는 반복하지 않는다)·버는/
 * 지키는 힘(text)·감각(senseFollow)에 이어, 흔들리는 조건(⑤의
 * severityLabel)·유리한 환경(⑥의 gwanVsBi)·시간 흐름(daYun.current)까지
 * "함께 고려해보라"는 방향으로만 짧게 연결한다. ⑤·⑥·⑨(재물이 움직이는
 * 시기)가 이미 각자 자세히 다룬 결론을 다시 풀어 쓰지 않고, 그 결론들을
 * 어디서 봤는지만 가리키는 역할이라 같은 문장을 반복하지 않는다(사용자
 * 요청 #6). */
function buildFinalSynthesisClause(key: ChapterFourKey, obstruction: WealthObstructionResult): string {
  const gwanVsBi = compareCategories(key.wealth, "관성", "비겁");
  const envPhrase =
    gwanVsBi.leadCategory === "관성" && gapTierActive(gwanVsBi.gapTier)
      ? "정해진 구조 안에 있는지"
      : gwanVsBi.leadCategory === "비겁" && gapTierActive(gwanVsBi.gapTier)
        ? "스스로 판단할 여지가 있는지"
        : "지금 환경이 이 결에 맞는지";
  const shakeNote =
    obstruction.severityLabel === "복합/중첩 방해축"
      ? "여러 결이 겹쳐 흔들리기 쉬운 구조인 만큼"
      : obstruction.severityLabel === "단일 방해축"
        ? "한 가지 결이 흔들리기 쉬운 구조인 만큼"
        : "특별히 흔들리는 결은 없는 구조이니";
  const timingNote = key.daYun.current
    ? `지금 대운(${key.daYun.current.startAge}–${key.daYun.current.endAge}세)의 결까지 함께 살펴보면`
    : "지금 이 시기의 결까지 함께 살펴보면";
  return `${shakeNote}, 지금 있는 환경이 ${envPhrase} 한 번 점검해볼 만합니다. ${timingNote}, 이 사람에게 맞는 그림이 더 뚜렷해질 것입니다.`;
}

// ────────────────────────────────────────────────────────────────
// 조립 — 第五章 구조 개편(2026-09, 승인된 작업). 기존 4·5·6장의 계산과
// 이미 만들어진 문장은 한 글자도 새로 짓지 않고, 위치만 하나의 흐름으로
// 재배치한다. 번호가 章 중간에 다시 ①로 리셋되지 않도록 ①~⑩ 하나의
// 연속된 체계만 쓴다(사용자 요청 #1·#2). chapters[3]/chapterFive/chapterSix
// 필드 자체(=PDF 등 다른 소비자가 읽는 데이터)는 reportMapper.ts에서
// 그대로 유지되고, 이 함수는 그 결과물을 입력으로만 받아 화면 전용
// 순서를 새로 만든다.
// ────────────────────────────────────────────────────────────────

export interface AssembledWealthChapter {
  /** 고정 훅(WEALTH_HOOK, 기존 chapters[3].publicPreview[0], 문구 불변) */
  hook: string;
  /** 기존 chapters[3].killpoint 그대로 */
  killpoint: string;
  /** 기존 chapters[3].highlight 그대로(章 상단 궁금증 카드) */
  highlight: string;
  /** ①~⑩ 단일 연속 번호 체계의 전체 본문 */
  sections: WealthInsightSection[];
}

export function assembleWealthChapterSections(
  appData: AppData,
  chapterFourContent: ChapterFourContent,
  chapterFiveContent: { bridgeIntro?: string; body: string[] },
  chapterSixContent: { bridgeIntro?: string; body: string[] } | undefined
): AssembledWealthChapter {
  const key = buildChapterFourKey(appData);
  const balanceResult = analyzeDayMasterBalance(appData.user);
  const obstruction = analyzeWealthObstruction(appData);
  const glossedInIntro = new Set(chapterFourContent.glossedInIntro);

  // chapters[3].publicPreview는 항상 [훅, 오프닝(재성 위치+뿌리),
  // 식상生財 문단, 커지는 조건 문단] 4개 고정 순서(buildChapterFourNarrative
  // 참고, 구조 불변) — 인덱스로 그대로 꺼내 재배치한다.
  const [hook, openingPara, makingPara, growingCorePara] = chapterFourContent.publicPreview;
  // lockedDetail은 [흔드는조건, ...대운흐름(1~4개), 조언] 순서 고정 —
  // 흔드는조건·조언은 ⑤로, 가운데 대운흐름만 ⑧로 옮긴다.
  const lockedDetail = chapterFourContent.lockedDetail;
  const shakingPara = lockedDetail[0];
  const advicePara = lockedDetail[lockedDetail.length - 1];
  const daYunFlowParas = lockedDetail.slice(1, -1);

  const sections: WealthInsightSection[] = [];

  // ① 타고난 돈의 감각 — HOW(감각 유형) → WHY(실제 재성 위치, 기존 오프닝
  // 문단) → WHY(쓸때/지킬때, 겉속차이) → HOW(구체 장면)
  const sense = buildWealthSenseSection(appData, key);
  sections.push({
    heading: "① 타고난 돈의 감각",
    body: [sense.intro, openingPara, sense.spendKeep, sense.surfaceHidden, sense.moment],
  });

  // ② 나는 어떻게 돈을 만들어내는 사람인가 — HOW(유형) → WHY(기존
  // 식상生財 문단) → HOW(구체 장면)
  const making = buildMoneyMakingSection(key);
  sections.push({
    heading: "② 나는 어떻게 돈을 만들어내는 사람인가",
    body: [making.lead, makingPara, making.moment],
  });

  // ③ 돈을 움직이는 나의 십성(1~4개) — ①·②에서 이미 뜻풀이가 나온
  // 십성은 glossedInIntro로 걸러 다시 설명하지 않는다.
  sections.push(...buildSipseongInsightSections(key, balanceResult.balance, obstruction, glossedInIntro));

  // ④ '버는 힘'과 '지키는 힘' — 기존 "커지는 조건" 문단을 첫 문단으로 흡수
  sections.push(buildMakeVsKeepSection(key, growingCorePara));

  // ⑤ 돈이 새거나 흔들리는 조건 — 짧은 진단(기존 lockedDetail[0]) → 깊은
  // 진단(기존 5장 전체) → 실질적 관리 팁(기존 lockedDetail 마지막 조언)
  const leakBody: string[] = [shakingPara];
  if (chapterFiveContent.bridgeIntro) leakBody.push(chapterFiveContent.bridgeIntro);
  leakBody.push(...chapterFiveContent.body, advicePara);
  sections.push({ heading: "⑤ 돈이 새거나 흔들리는 조건", body: leakBody });

  // ⑥ 조직·독립·사업에서 돈의 방식
  sections.push(buildOrgStyleSection(key));

  // ⑦ 큰돈을 다룰 때 달라지는 모습 — 근거 있을 때만
  const scaleSection = buildScaleSection(key, obstruction);
  if (scaleSection) sections.push(scaleSection);

  // ⑧ 지나온 흐름부터 다음 대운까지 — 기존 대운 흐름 문단을 그대로 하나의
  // 흐름으로 옮긴다. 개수(1~4개)에 상관없이 있는 만큼 그대로 보여준다
  // (예전처럼 "정확히 5개일 때만" 같은 고정 개수 조건을 걸지 않는다).
  if (daYunFlowParas.length > 0) {
    sections.push({ heading: "⑧ 지나온 흐름부터 다음 대운까지", body: daYunFlowParas });
  }

  // ⑨ 지금부터 달라지는 재물의 시기 — 기존 6장(대운·세운 A~E 분류)
  if (chapterSixContent) {
    const timingBody: string[] = [];
    if (chapterSixContent.bridgeIntro) timingBody.push(chapterSixContent.bridgeIntro);
    timingBody.push(...chapterSixContent.body);
    sections.push({ heading: "⑨ 지금부터 달라지는 재물의 시기", body: timingBody });
  }

  // ⑩ 앞으로 돈을 다루는 전략 — 章 전체의 유일한 최종 종합
  sections.push(buildStrategySection(key, obstruction));

  return {
    hook,
    killpoint: chapterFourContent.killpoint,
    highlight: chapterFourContent.highlight,
    sections: renumberSections(sections),
  };
}
