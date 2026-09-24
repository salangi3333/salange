// [5장 재물운 Production 이식] 확정된 scratch(scripts/_scratch_ch5_sipseong_main_making_v5.ts)를 로직·문장 변경 없이 그대로 옮긴 파일.
// 이식 시 제거한 것: 데모/검증용 실행 코드(buildAppData·IntakeFormData·require.main 블록)와 그 import뿐이다.
// 제5장 ③·③-2 문장 개편(scratch v5, 마지막 다듬기) — 계산 구조/분기/계산값은
// v2 이후 100% 동일. 이번엔 "결론→실제모습→왜→…" 흐름 안에서 같은 뜻이
// 여러 문단에 반복되던 걸 정리했다. 특히 WHY를 "돈에서만 그런 이유"가
// 아니라 "성격 전반에서 그런 이유"로 다시 써서 ACTION 문단과 겹치지 않게
// 했고, comboClause(자유/눌림)도 "판단이 자유롭다"는 말을 반복하지 않고
// "말리는 사람이 있는지/없는지, 그래서 끝까지 미는지/한 번 멈추는지"라는
// 새 정보를 주도록 바꿨다. "남는다/안 남는다"는 단정 대신 "관리가 따로
// 필요하다"는 성향/주의로 표현했다.
import { AppData } from "../sajuContent";
import {
  ChapterFourKey, EvidencePosition, buildChapterFourKey, GapTier,
} from "../chapterFourInterpretation";
import { buildChapterFourNarrative } from "../chapterFourNarrative";
import { SipseongCategory } from "../strengthAnalysis";
import { analyzeDayMasterBalance, BalanceVerdict } from "../dayMasterBalanceAnalysis";
import { buildChapterThreeKey } from "../chapterThreeInterpretation";
import { analyzeYongsinCandidate } from "../yongsinCandidateAnalysis";
import { analyzeHuisinCandidate } from "../huisinCandidateAnalysis";

// ── 계산 그대로(v2 이후 동일) ──
function pickLeadEvidence(list: EvidencePosition[]): EvidencePosition | null {
  const visible = list.filter((e) => e.slot !== "지장간");
  if (visible.length > 0) return visible[0];
  const weight: Record<string, number> = { 본기: 3, 중기: 2, 여기: 1 };
  const sorted = [...list].sort((a, b) => (weight[b.hidePosition ?? ""] ?? 0) - (weight[a.hidePosition ?? ""] ?? 0));
  return sorted[0] ?? null;
}
function dominantSipseong(evidence: EvidencePosition[]): string | null {
  const tally = new Map<string, number>();
  evidence.forEach((e) => tally.set(e.sipseong, (tally.get(e.sipseong) ?? 0) + 1));
  const entries = [...tally.entries()].sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;
  if (entries.length > 1 && entries[0][1] === entries[1][1]) return null;
  return entries[0][0];
}
type ShapeKind = "visible" | "hidden" | "none";
function shapeOf(evidence: EvidencePosition[], sipseong: string | null): ShapeKind {
  if (!sipseong) return "none";
  const matched = evidence.filter((e) => e.sipseong === sipseong);
  if (matched.length === 0) return "none";
  return matched.some((e) => e.slot !== "지장간") ? "visible" : "hidden";
}
type MonthBand = "high" | "low" | "neutral";
function monthBandOf(score: number): MonthBand {
  if (score >= 2) return "high";
  if (score <= -1) return "low";
  return "neutral";
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
type PickRoleLite = "main" | "making";

// ── 결론(topAxis 5갈래, 유지) ──
const OPENING_MAIN: Record<SipseongCategory, string> = {
  비겁: "이 사람은 돈이 걸린 일 앞에서 남에게 먼저 묻지 않습니다.",
  식상: "이 사람은 돈이 걸린 일 앞에서 정해진 방법을 그대로 따르지 않습니다.",
  재성: "이 사람은 돈이 걸린 선택 앞에서 계산부터 합니다.",
  관성: "이 사람은 돈이 걸린 일 앞에서 먼저 확인부터 합니다.",
  인성: "이 사람은 돈이 걸린 선택 앞에서 서두르지 않습니다.",
};

// ── 실제 모습(승인된 문장 유지) ──
const ACTION_MAIN: Record<SipseongCategory, string> = {
  비겁: "돈을 어디에 쓸지 정할 때도 남 눈치보다 자기 기준으로 정합니다. 여럿이 다 같이 정하는 상황에서도, 적어도 자기 몫이나 방향만큼은 스스로 정합니다.",
  식상: "이미 있는 방법을 그대로 따르기보다, 자기 방식대로 한번 해보고 결과를 확인합니다. 남이 짜준 계획보다 직접 판단해서 움직인 결과를 더 믿습니다.",
  재성: "돈을 쓰기 전에 먼저 따집니다. 같은 걸 사더라도 지금 이게 진짜 이득인지부터 확인한 뒤 결정합니다.",
  관성: "돈이 걸린 일을 정할 때, 정해진 기준이나 절차부터 확인합니다. 누가 책임질지가 분명한 방법을 고릅니다.",
  인성: "돈을 쓰거나 맡기기 전에 먼저 알아봅니다. 믿을 만한 사람이나 근거가 확인돼야 그다음에 움직입니다.",
};

// ── [재정리] 왜 그런지 — "돈에서만 그런 이유"가 아니라 "성격 전반에서 그런
// 이유"로 써서 ACTION("자기 기준으로 정함")과 겹치지 않게 한다. ──
const WHY_BY_SIPSEONG: Record<string, string> = {
  비견: "다른 사람이 대신 정해주면 오히려 마음이 편치 않은 성격이기 때문입니다.",
  겁재: "손에 쥔 걸 오래 갖고 있으면 답답해하는 성격이기 때문입니다.",
  식신: "빨리 내놓기보다 완성도를 먼저 채워야 마음이 놓이는 성격이기 때문입니다.",
  상관: "가진 걸 오래 담아두기보다 바로 표현해야 마음이 놓이는 성격이기 때문입니다.",
  편재: "한곳에 매여 있으면 답답해하는 성격이기 때문입니다.",
  정재: "확실히 확인되지 않으면 마음이 안 놓이는 성격이기 때문입니다.",
  편관: "애매한 채로 오래 두면 오히려 불편해하는 성격이기 때문입니다.",
  정관: "정해진 방식에서 벗어나면 마음이 편치 않은 성격이기 때문입니다.",
  편인: "남들과 같은 길을 가면 오히려 시들해지는 성격이기 때문입니다.",
  정인: "확인 안 된 것에 먼저 움직이면 마음이 안 놓이는 성격이기 때문입니다.",
};

// ── 노출도/월령(그대로 유지 — ACTION·WHY와 겹치지 않는 별개 정보) ──
const SHAPE_TEXT: Record<PickRoleLite, Record<ShapeKind, string>> = {
  main: {
    visible: "이런 모습은 평소에도 남들 눈에 잘 띕니다.",
    hidden: "이런 모습은 겉으로 잘 안 드러나서, 가까운 사람도 잘 모를 수 있습니다.",
    none: "이런 성향이 겉으로 딱 보이진 않지만, 결국 돈과 관련된 선택에 그대로 나타납니다.",
  },
  making: {
    visible: "이렇게 만들어가는 과정도 평소에 남들 눈에 잘 보입니다.",
    hidden: "이렇게 만들어가는 과정은 겉으로 잘 안 드러나고 조용히 진행됩니다.",
    none: "만드는 과정 자체가 눈에 띄진 않지만, 결국 결과물로 이어집니다.",
  },
};
const MONTH_TEXT: Record<PickRoleLite, Record<MonthBand, string>> = {
  main: {
    high: "이렇게 판단하는 데 별다른 애를 쓸 필요가 없습니다. 그냥 자연스럽게 이렇게 움직입니다.",
    low: "다만 이렇게 판단하고 움직이려면 스스로 계속 신경 써야 합니다. 안 그러면 흐지부지되기 쉽습니다.",
    neutral: "이런 판단 방식은 특별히 강해지거나 약해지지 않고, 평소 그대로 이어집니다.",
  },
  making: {
    high: "이렇게 만들어가는 데도 별다른 애를 쓸 필요가 없습니다.",
    low: "다만 이 방식을 꾸준히 이어가려면 스스로 계속 신경 써야 합니다.",
    neutral: "이 방식은 특별히 잘되거나 안되는 계기 없이, 평소 그대로 이어집니다.",
  },
};

// ── [재정리] comboClause — "판단이 자유롭다"를 반복하지 않고, "말리는 사람이
// 있는지"와 "그래서 끝까지 미는지/한 번 멈추는지"라는 새 정보를 준다. ──
function comboClauseReworded(cat: SipseongCategory, key: ChapterFourKey): string {
  const { bigyeopVsJaeseong: bj, gwanseongVsBigyeop: gb, inseongVsSiksang: is_, jaeseongVsInseong: ji } = key;
  if (cat === "재성") {
    if (bj.leadCategory === "비겁" && gapTierActive(bj.gapTier)) {
      return "다만 벌면 벌수록 나누거나 다른 데 쓰고 싶은 마음도 같이 커져서, 한 번에 다 쌓이지는 않는 편입니다.";
    }
    if (gb.leadCategory === "관성" && gapTierActive(gb.gapTier)) {
      return "다만 맡은 책임이 씀씀이를 자연스레 눌러줘서, 쉽게 흩어지지 않고 자리를 잡는 편입니다.";
    }
    return "이걸 특별히 흔들거나 지켜줄 다른 요인이 딱히 없어서, 이 성질이 비교적 그대로 나타납니다.";
  }
  if (cat === "식상") {
    return key.siksangJaeseongLinked
      ? "다만 만드는 데 마음이 가 있다 보니, 벌어들인 걸 따로 관리하지 않으면 손에 남는 게 흐릿해질 수 있습니다."
      : "다만 이 방식이 곧바로 돈으로 이어지지는 않습니다. 먼저 만들어내는 데 마음이 가 있고, 돈은 그 뒤를 따라오는 편입니다.";
  }
  if (cat === "비겁") {
    return gb.leadCategory === "관성" && gapTierActive(gb.gapTier)
      ? "다만 책임져야 할 일 앞에서는 한 박자 멈추고 다시 생각해 봅니다."
      : "이런 판단을 말리는 사람이나 상황이 딱히 없다 보니, 한 번 정하면 끝까지 밀고 나갑니다.";
  }
  if (cat === "관성") {
    return "이건 돈을 얼마나 버는지보다, 얼마나 책임 있게 다루는지를 같이 따지게 만듭니다.";
  }
  return is_.leadCategory === "인성" && gapTierActive(is_.gapTier)
    ? "다만 이 조심스러움이 지나쳐서, 적극적으로 나서야 할 순간에도 한 번 더 멈춰 서곤 합니다."
    : ji.leadCategory === "재성" && gapTierActive(ji.gapTier)
      ? "다만 돈에 대한 마음이 이 조심스러움보다 앞설 때가 있어서, 안전을 따지기보다 돈 쪽으로 먼저 움직이게 됩니다."
      : "이 조심스러움과 돈에 대한 마음이 서로 부딪히는 지점은 딱히 없어서, 둘 다 무난하게 같이 갑니다.";
}

const GWANSAL_JUDGMENT_NOTE =
  "다만 이 사람 안에는 원칙을 지키려는 마음과, 상황에 맞춰 바로 움직이려는 마음이 같이 있습니다. 그래서 돈 문제도 한 가지 기준으로 딱 정하지 못하고, 어느 쪽을 따를지 잠깐 고민하는 순간이 있을 수 있습니다.";

const SCENE_BY_CATEGORY: Record<SipseongCategory, string> = {
  비겁: "예를 들어 여럿이 같이 벌인 일에서도, 자기 몫만큼은 스스로 확인하고 넘어갑니다.",
  식상: "예를 들어 결과물을 다 만들고도 바로 내놓지 않고, 한 번 더 다듬거나 더 적극적으로 알린 뒤에야 만족합니다.",
  재성: "예를 들어 같은 물건을 사더라도, 가격과 조건을 한 번 더 비교하고 결정합니다.",
  관성: "예를 들어 돈이 걸린 결정을 내릴 때도, 정해진 절차와 책임 소재부터 먼저 확인합니다.",
  인성: "예를 들어 새로운 기회 앞에서도, 믿을 만한 사람이나 근거를 먼저 확인한 뒤에야 움직입니다.",
};

// ── [재정리] 현실 장점/주의 — "무리가 안 됩니다" 같은 애매한 표현을 구체적으로 ──
function resultReworded(group: BalanceGroup, role: PickRoleLite): string {
  if (group === "신강계열") {
    if (role === "main") return "이 정도 판단과 책임은 크게 부담스럽지 않습니다. 그래서 돈 문제에서 웬만해선 잘 흔들리지 않습니다. 다만 너무 자연스러운 나머지, 스스로 얼마나 이렇게 판단하고 있는지 잘 의식하지 못할 수 있습니다.";
    return "벌이는 만큼 결과로 잘 이어지고, 그 과정도 크게 버겁지 않습니다. 다만 그만큼 여유가 있다 보니, 필요 이상으로 크게 벌일 수 있습니다.";
  }
  if (group === "신약계열") {
    if (role === "main") return "이렇게 판단하고 움직인다는 것 자체가 분명한 강점입니다. 다만 감당할 여유가 크지 않아서, 짊어질 몫이 커지면 쉽게 지칠 수 있습니다.";
    return "적은 자원으로도 뭔가를 만들어내는 감각 자체가 강점입니다. 다만 여유가 크지 않아서, 벌이는 규모가 감당할 수 있는 선을 넘으면 금방 부담이 됩니다.";
  }
  if (role === "main") return "돈을 벌 때와 지킬 때, 어느 한쪽에 치우치지 않고 상황 봐가며 오갑니다. 다만 그러다 보니, 이런 판단력이 강점으로 잘 안 보일 수 있습니다.";
  return "벌이는 규모를 상황에 맞게 조절할 수 있어서, 무리하게 키우는 일은 적습니다. 다만 그 대신, 기회가 왔을 때 크게 밀어붙이지는 못하는 편입니다.";
}

// ── ③-2 전용: 결론(식신/상관, "성격 전반의 결"로 재정리) ──
const OPENING_MAKING: Record<"식신" | "상관", string> = {
  식신: "이 사람은 한 번에 완성해서 내놓지 않습니다.",
  상관: "이 사람은 생각을 혼자만 갖고 있으면 답답해합니다.",
};
// ── 실제 모습(만든다/보여준다 — 승인된 상관 문장 유지, 식신은 "실행+반복"에 집중) ──
const ACTION_MAKING: Record<"식신" | "상관", string> = {
  식신: "생각에서 끝내지 않고 실제로 결과물을 만듭니다. 그리고 같은 일을 여러 번 반복하면서 조금씩 다듬어갑니다.",
  상관: "그래서 만든 걸 사람들이 볼 수 있게 먼저 꺼내 보입니다. 말이든 글이든 결과물이든, 일단 밖으로 드러냅니다.",
};

// ── [재정리] 돈으로 이어지는 과정 — 만든다→보여준다(위)→반응 보고 다듬는다(여기)
// →재물 연결 시 주의(comboClause)로 앞으로 진행되는 느낌을 준다. 결과 보장
// 표현("이어지기 쉽다") 대신 가능성("~수 있습니다")으로. ──
const CHANNEL_BY_SIKSANG: Record<"식신" | "상관", string> = {
  식신: "이렇게 반복해서 다듬은 결과물은 시간이 지나며 실력으로 인정받을 수 있습니다.",
  상관: "그렇게 꺼내 보인 결과물에 사람들이 반응을 보이면, 그 반응을 보고 다시 손을 봅니다.",
};

function channelFavorabilityClause(isYongsin: boolean, isHuisin: boolean): string | null {
  if (isYongsin) {
    return "이렇게 밖으로 꺼내 보이는 게 이 사람에게는 자연스러운 일입니다. 억지로 하는 느낌 없이 잘 이어집니다.";
  }
  if (isHuisin) {
    return "한 번 시도가 잘 안 통해도, 다시 꺼내 볼 여유가 비교적 꾸준히 남아 있는 편입니다.";
  }
  return null;
}

export interface NarrativeParagraph { text: string; sourceNote: string }
export interface Result { paragraphs: NarrativeParagraph[] }

interface BuildContext {
  key: ChapterFourKey;
  group: BalanceGroup;
  glossedInIntro: Set<string>;
  gwansalPresent: boolean;
}

function buildMainSection(ctx: BuildContext): { heading: string; result: Result } {
  const { key, group } = ctx;
  const topAxis: SipseongCategory = key.wealth.all[0].category;
  const evidence = key.evidenceByCategory[topAxis];
  const lead = pickLeadEvidence(evidence);
  const sipseong = lead?.sipseong ?? dominantSipseong(evidence);
  if (!sipseong) return { heading: "③ 돈을 판단하고 움직이는 주도권", result: { paragraphs: [] } };

  const shape = shapeOf(evidence, sipseong);
  const monthBand = monthBandOf(key.wealth.byCategory[topAxis].monthScore);

  const paras: NarrativeParagraph[] = [
    { text: OPENING_MAIN[topAxis], sourceNote: `결론(topAxis=${topAxis}, ${sipseong})` },
    { text: ACTION_MAIN[topAxis], sourceNote: `실제모습(topAxis=${topAxis})` },
    { text: WHY_BY_SIPSEONG[sipseong] ?? "", sourceNote: `왜(${sipseong})` },
    { text: SHAPE_TEXT.main[shape], sourceNote: `노출도(shape=${shape})` },
    { text: MONTH_TEXT.main[monthBand], sourceNote: `유지노력(monthBand=${monthBand})` },
    { text: comboClauseReworded(topAxis, key), sourceNote: `제어여부(topAxis=${topAxis})` },
  ];
  if (ctx.gwansalPresent) {
    paras.push({ text: GWANSAL_JUDGMENT_NOTE, sourceNote: "판단고민(gwansal=true)" });
  }
  paras.push({ text: SCENE_BY_CATEGORY[topAxis], sourceNote: `생활행동(topAxis=${topAxis})` });
  paras.push({ text: resultReworded(group, "main"), sourceNote: `장점/주의(${group}:main)` });

  return { heading: "③ 돈을 판단하고 움직이는 주도권", result: { paragraphs: paras } };
}

function buildMakingSection(appData: AppData, ctx: BuildContext): { heading: string; result: Result } | null {
  const { key, group } = ctx;
  const topAxis: SipseongCategory = key.wealth.all[0].category;
  if (!key.siksangJaeseongLinked || topAxis === "식상") return null;

  const evidence = key.evidenceByCategory.식상;
  const lead = pickLeadEvidence(evidence);
  const sipseong = (lead?.sipseong ?? dominantSipseong(evidence)) as "식신" | "상관" | null;
  if (!sipseong) return null;

  const shape = shapeOf(evidence, sipseong);
  const monthBand = monthBandOf(key.wealth.byCategory.식상.monthScore);

  const yongsin = analyzeYongsinCandidate(appData.user);
  const huisin = analyzeHuisinCandidate(appData.user);
  const isYongsin = yongsin.applicable && yongsin.winners.includes("식상");
  const isHuisin = !isYongsin && huisin.applicable && huisin.pairs.some((p) => p.category === "식상");
  const favor = channelFavorabilityClause(isYongsin, isHuisin);

  const paras: NarrativeParagraph[] = [
    { text: OPENING_MAKING[sipseong], sourceNote: `결론(${sipseong})` },
    { text: ACTION_MAKING[sipseong], sourceNote: `실제모습(${sipseong})` },
    { text: WHY_BY_SIPSEONG[sipseong] ?? "", sourceNote: `왜(${sipseong})` },
    { text: SHAPE_TEXT.making[shape], sourceNote: `노출도(shape=${shape})` },
    { text: MONTH_TEXT.making[monthBand], sourceNote: `유지노력(monthBand=${monthBand})` },
    { text: CHANNEL_BY_SIKSANG[sipseong], sourceNote: `반응/인정(식상=${sipseong})` },
    { text: comboClauseReworded("식상", key), sourceNote: "관리주의(siksangJaeseongLinked)" },
  ];
  if (favor) paras.push({ text: favor, sourceNote: `유불리(yongsinMatch=${isYongsin}, huisinMatch=${isHuisin})` });
  paras.push({ text: SCENE_BY_CATEGORY.식상, sourceNote: "생활행동(식상)" });
  paras.push({ text: resultReworded(group, "making"), sourceNote: `장점/주의(${group}:making)` });

  return { heading: "③-2 돈을 만들어내는 또 다른 힘", result: { paragraphs: paras } };
}

export function generateMainMakingV5(appData: AppData, key: ChapterFourKey) {
  const balanceResult = analyzeDayMasterBalance(appData.user);
  const group = balanceGroupOf(balanceResult.balance);
  const chapterFourContent = buildChapterFourNarrative(appData, key);
  const glossedInIntro = new Set(chapterFourContent.glossedInIntro);
  const gwansalPresent = buildChapterThreeKey(appData).gwansal.present;

  const ctx: BuildContext = { key, group, glossedInIntro, gwansalPresent };
  const main = buildMainSection(ctx);
  const making = buildMakingSection(appData, ctx);
  return { main, making };
}
