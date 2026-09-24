// [5장 재물운 Production 이식] 확정된 scratch(scripts/_scratch_ch5_sense_v3.ts)를 로직·문장 변경 없이 그대로 옮긴 파일.
// 이식 시 제거한 것: 데모/검증용 실행 코드(buildAppData·IntakeFormData·require.main 블록)와 그 import뿐이다.
// 제5장 ① "타고난 돈의 감각" 개편(scratch) — 계산 엔진은 읽기 전용.
//
// [분석 — 개편 전 문제]
// 현재 ①은 intro(SENSE_EXPLAIN+rootClause) → openingPara(chapterFourNarrative.ts
// 임베드) → spendKeep → surfaceHidden → moment 순서인데, intro의 rootClause와
// openingPara 마지막 문장이 둘 다 dayMasterRoot.hasRoot 하나를 "일간 뿌리 있음
// → 여력/안 흔들림"이라는 거의 같은 뜻으로 두 번 말한다(chapterFourNarrative.ts의
// buildDayMasterRootClause가 openingPara 문장 끝에 항상 붙기 때문 — 모든 사람에게
// 100% 발생하는 중복, 새로 발견한 것). openingPara 자체(chapterFourNarrative.ts)는
// 이번 범위에서 손대지 않으므로, wealthInsightNarrative.ts 쪽의 intro에서만
// rootClause를 제거해 중복을 없앤다.
//
// [보강 — 새로 조합하는 계산값: 용신/희신]
// 현재 계산값: determineSenseType(key)가 만드는 감각 축은 재성(안정/자유/혼합형)
// 또는 wealth.all[0].category(성취형=관성, 수단형=그 외)로 이미 정해져 있다.
// 추가로 안전하게 조합할 값: analyzeYongsinCandidate/analyzeHuisinCandidate
// (이미 wealthObstructionAnalysis.ts 내부에서도 재호출하는 기존 엔진, 새 계산 아님).
// 왜 ①에 쓰는가: "타고난 돈의 감각"은 이 사람의 기본 성향(HOW)을 다루는데,
// 그 감각이 사주 전체에서 "가장 필요한 힘(용신)"/"그걸 받쳐주는 힘(희신)"과
// 맞물려 있는지는 "이 타고난 감각이 억지로 다잡지 않아도 자연스럽게 강점으로
// 작동하는지, 아니면 스스로 계속 챙겨야 유지되는지"라는, 이 섹션 고유의 질문과
// 직접 연결된다 — 기존 엔진 조사에서 제5장 어디도 용신/희신을 직접 서술 문장으로
// 안 쓰고 있었던 값이라 새 중복도 없다.
// 다른 섹션과의 중복 위험: 관살혼잡은 "서로 다른 기준 사이의 저울질"이라는 결이라
// "타고난 감각" 자체보다는 판단/행동 갈등을 다루는 다른 섹션(⑤·⑥ 등, 이번 범위 아님)에
// 더 맞아 이번엔 쓰지 않는다. spendKeepClause(bigyeopVsJaeseong/gwanseongVsBigyeop)는
// ④(버는힘/지키는힘)도 같은 두 축을 쓰지만, ①은 "마음이 쓰는 쪽/지키는 쪽 중 어디로
// 기우는가"(성향)를, ④는 "버는 힘과 지키는 힘의 구조적 크기 자체"를 물어 질문이 달라
// 기존 production도 이미 문장을 다르게 써왔다 — 이번에 새로 만든 게 아니므로 그대로 둔다.
import { AppData } from "../sajuContent";
import { ChapterFourKey, EvidencePosition, buildChapterFourKey, GapTier } from "../chapterFourInterpretation";
import { SipseongCategory } from "../strengthAnalysis";
import { computeSipseong } from "../aiLifeReport";
import { analyzeYongsinCandidate, YongsinCandidateResult } from "../yongsinCandidateAnalysis";
import { analyzeHuisinCandidate, HuisinCandidateResult } from "../huisinCandidateAnalysis";
import { buildOpeningParagraphsNoJargon } from "./senseOpeningNoJargon";

// [v3 수정] 기존 openingPara(chapterFourNarrative.ts 임베드)는 "편재(偏財)",
// "정재(正財)" 같은 십성 이름+한자를 고객 본문에 그대로 노출했다(22명
// 검증에서 발견된 문제). buildChapterFourNarrative 전체를 부르는 대신,
// 같은 계산값·분기를 그대로 쓰되 이름표 문장만 뺀 buildOpeningParagraphsNoJargon()
// 으로 교체한다 — ①의 개인화 구조·의미·다른 문장(intro/spendKeep/
// surfaceHidden/moment)은 전혀 바꾸지 않는다.

// ── production 그대로 복붙(계산·문장 변경 없음) ──
function dominantSipseong(evidence: EvidencePosition[]): string | null {
  const tally = new Map<string, number>();
  evidence.forEach((e) => tally.set(e.sipseong, (tally.get(e.sipseong) ?? 0) + 1));
  const entries = [...tally.entries()].sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;
  if (entries.length > 1 && entries[0][1] === entries[1][1]) return null;
  return entries[0][0];
}

type SenseType = "안정형" | "자유형" | "성취형" | "수단형" | "혼합형";

function determineSenseType(key: ChapterFourKey): SenseType {
  if (key.jaeseong.exposure !== "미미") {
    const dom = dominantSipseong(key.jaeseong.evidence);
    if (dom === "정재") return "안정형";
    if (dom === "편재") return "자유형";
    return "혼합형";
  }
  const topAxis = key.wealth.all[0].category;
  if (topAxis === "관성") return "성취형";
  return "수단형";
}

const SENSE_EXPLAIN: Record<SenseType, string> = {
  안정형: "이 사람에게 돈이란 우선 '꾸준히 쌓여야 안심이 되는 것'에 가깝습니다. 한 번의 큰 수입보다, 매달 반복되는 작은 확인이 오히려 돈에 대한 안정감을 만들어 줍니다.",
  자유형: "이 사람에게 돈이란 '움직일 수 있는 자유'에 더 가깝습니다. 한곳에 오래 묶여 있는 재물보다, 기회가 왔을 때 바로 쓸 수 있는 돈이 실제로 더 의미 있게 느껴집니다.",
  성취형: "이 사람에게 돈은 목표 그 자체라기보다, 맡은 역할을 잘 해냈을 때 자연히 따라오는 결과에 가깝습니다. 그래서 돈을 직접 좇기보다, 책임을 다하는 과정에서 돈이 뒤따라오는 구조를 더 편하게 느낍니다.",
  수단형: "이 사람에게 돈은 그 자체가 목적이라기보다, 하고 싶은 일을 하거나 관계를 지키기 위한 수단에 더 가깝습니다. 그래서 돈을 모으는 것 자체에 큰 의미를 두기보다, 무엇을 위해 쓰이는지가 더 중요하게 작동합니다.",
  혼합형: "이 사람에게 돈은 '꾸준히 쌓아야 하는 것'과 '기회가 오면 움직여야 하는 것' 두 결이 함께 있습니다. 어느 한쪽으로 완전히 기울지 않고, 상황에 따라 이 두 감각을 오가는 편입니다.",
};

function gapTierActive(gapTier: GapTier): boolean {
  return gapTier !== "비슷";
}

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

// ── [신규] 타고난 감각이 사주 전체에서 얼마나 힘을 받는지(용신/희신, 2가지 기존
// 엔진 조합) — "이 감각을 억지로 다잡지 않아도 자연스럽게 유지되는지, 스스로
// 계속 챙겨야 유지되는지"라는 ①만의 질문에만 쓴다. ──
function senseAxisCategory(key: ChapterFourKey, senseType: SenseType): SipseongCategory {
  if (senseType === "성취형") return "관성";
  if (senseType === "수단형") return key.wealth.all[0].category;
  return "재성"; // 안정형/자유형/혼합형은 전부 jaeseong(재성) 기반
}

// [문장 리듬 수정] hasRoot=false일 때 openingPara(chapterFourNarrative.ts,
// buildDayMasterRootClause)의 마지막 문장이 이미 "다만 자기 자신의 뿌리내릴
// 자리가 마땅치 않아~"로 "다만"을 쓰고 있어, 바로 뒤에 이 문단까지 "다만"으로
// 시작하면 "다만...다만..."이 연달아 반복된다(hasRoot=true일 때는 앞 문장이
// "다만"으로 시작하지 않아 문제가 없다). 의미·분기·분량은 그대로 두고,
// hasRoot=false + 미해당(neither) 조합에서만 문장 시작을 "다만"→"그런 데다"로
// 바꿔 리듬만 고친다.
function yongsinHuisinClause(
  category: SipseongCategory,
  yongsin: YongsinCandidateResult,
  huisin: HuisinCandidateResult,
  hasRoot: boolean
): string {
  const isYongsin = yongsin.applicable && yongsin.winners.includes(category);
  const isHuisin = !isYongsin && huisin.applicable && huisin.pairs.some((p) => p.category === category);
  if (isYongsin) {
    return "게다가 이 감각은 지금 이 사람에게 가장 필요한 힘과 정확히 맞물려 있어서, 돈과 관련된 결정을 내릴 때 별다른 고민 없이도 자연스럽게 이 방향으로 움직이게 됩니다. 억지로 다잡지 않아도 꾸준히 이어지는 감각에 가깝습니다.";
  }
  if (isHuisin) {
    return "이 감각을 옆에서 받쳐주는 힘도 함께 있어서, 한 번 흔들리는 순간이 와도 다시 원래 방식으로 돌아오는 게 어렵지 않은 편입니다.";
  }
  const opener = hasRoot ? "다만" : "그런 데다";
  return `${opener} 이 감각을 계속 받쳐줄 다른 힘까지 뚜렷하게 갖춰진 건 아니라서, 마음먹은 방향을 유지하려면 그때그때 의식적으로 챙기고 다잡아야 흔들리지 않습니다.`;
}

export interface NarrativeParagraph { text: string; sourceNote: string }
export interface Result { paragraphs: NarrativeParagraph[] }

export function generateSenseSectionV2(appData: AppData, key: ChapterFourKey): Result {
  const senseType = determineSenseType(key);
  const openingPara = buildOpeningParagraphsNoJargon(appData.user.name, key)[0];

  const user = appData.user;
  const yongsin = analyzeYongsinCandidate(user);
  const huisin = analyzeHuisinCandidate(user);
  const axisCategory = senseAxisCategory(key, senseType);

  const paragraphs: NarrativeParagraph[] = [
    { text: SENSE_EXPLAIN[senseType], sourceNote: `감각유형(${senseType})` },
    { text: openingPara, sourceNote: "재성 위치+일간뿌리(buildOpeningParagraphsNoJargon — 계산 동일, 이름표 문장만 제거)" },
    { text: yongsinHuisinClause(axisCategory, yongsin, huisin, key.dayMasterRoot.hasRoot), sourceNote: `용신/희신(category=${axisCategory}, yongsinMatch=${yongsin.applicable && yongsin.winners.includes(axisCategory)}, huisinMatch=${huisin.applicable && huisin.pairs.some((p) => p.category === axisCategory)}, hasRoot=${key.dayMasterRoot.hasRoot})` },
    { text: spendKeepClause(key), sourceNote: "쓸때/지킬때(bigyeopVsJaeseong·gwanseongVsBigyeop, 기존 그대로)" },
    { text: surfaceVsHiddenDesireClause(appData), sourceNote: "겉/속 욕구차이(일지vs지장간, 기존 그대로)" },
    { text: SENSE_MOMENT[senseType], sourceNote: `생활예시(${senseType})` },
  ];
  return { paragraphs };
}
