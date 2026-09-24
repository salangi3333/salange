// [5장 재물운 Production 이식] 확정된 scratch(scripts/_scratch_ch6_orgstyle_v12.ts)를 로직·문장 변경 없이 그대로 옮긴 파일.
// 이식 시 제거한 것: 데모/검증용 실행 코드(buildAppData·IntakeFormData·require.main 블록)와 그 import뿐이다.
// 제5장 ⑥ "조직·독립·사업에서 돈의 방식" scratch v12 — v4~v6의 계산/분기(A=식상vs관성, B=관성 exposure,
// 뚜렷 분류의 "전체 1위 축" 보조)는 100% 그대로. 문체만 전면 재작성(계산 결과문 → 실제 행동·업무 장면):
//  - 같은 결론을 두 번 말하던 문장을 합침(정보 삭제가 아니라 합치기)
//  - 흐름: 편한 환경 → 실제로 일하는 모습 → 답답한 상황 → 독립 운영 방식 (문단 수는 기계적으로 맞추지 않음)
//  - 추상 표현 대신 실제 상황 표현
// 새 계산값/새 구간/분기 변경 없음.
import { ChapterFourKey, EvidencePosition, buildChapterFourKey, compareCategories } from "../chapterFourInterpretation";

type ABranch = "관성뚜렷" | "관성약간" | "식상뚜렷" | "식상약간" | "비슷강" | "비슷약";
type Exposure = "겉" | "속" | "없음";

export interface NarrativeParagraph { text: string; sourceNote: string }
export interface Result { paragraphs: NarrativeParagraph[] }

function classifyA(key: ChapterFourKey): ABranch {
  const cmp = compareCategories(key.wealth, "식상", "관성");
  if (cmp.gapTier === "비슷") {
    return Math.min(key.wealth.byCategory.식상.total, key.wealth.byCategory.관성.total) >= 3 ? "비슷강" : "비슷약";
  }
  if (cmp.leadCategory === "관성") return cmp.gapTier === "뚜렷" ? "관성뚜렷" : "관성약간";
  return cmp.gapTier === "뚜렷" ? "식상뚜렷" : "식상약간";
}
function classifyB(key: ChapterFourKey): Exposure {
  const g = key.wealth.byCategory.관성;
  return g.count > 0 ? "겉" : g.rootScore > 0 ? "속" : "없음";
}
const ISGWAN = (a: ABranch) => a === "관성뚜렷" || a === "관성약간";
const ISSIK = (a: ABranch) => a === "식상뚜렷" || a === "식상약간";

// ── 문장 블록: 실제 모습(FIT) → [뚜렷 분류의 전체1위 보조] → 기준을 대하는 방식(B) → 답답한 상황 → 독립 → [B=없음 보충]
// 계산·분기(A, B, 전체1위 보조, B=없음 보충)는 v4~v6과 동일. 이번엔 (1) 블록을 내용량에 따라 문단으로 묶고,
// (2) 추상어 반복을 실제 행동으로, (3) 특정 직업·고용형태를 떠올리게 하는 표현을 일반 업무 행동으로 바꿨다.
const FIT: Record<ABranch, string> = {
  관성뚜렷: "일을 맡을 때 어디까지가 내 몫이고 어디까지 내가 정해도 되는지 알면 훨씬 빨리 시작하는 사람입니다. 그 범위 안에서는 미루지 않고 끝까지 챙기고, 맡긴 사람이 바라는 수준을 알수록 거기에 맞춰 깔끔하게 마무리합니다.",
  관성약간: "해야 할 일은 분명한데 그 일을 해내는 방법까지 일일이 정해 주면 답답해지기 쉽습니다. 같은 일이라도 순서와 방법을 스스로 정할 수 있을 때 훨씬 집중이 잘 되고, 결과도 내 것으로 느낍니다.",
  식상뚜렷: "머릿속으로 구상만 하는 것보다, 직접 손을 움직여 눈에 보이는 결과를 만들어낼 때 훨씬 만족감이 큰 사람입니다. 무언가를 직접 만들어 내는 일에서는 몰입이 오래가고, 정해진 순서를 그대로 따르기보다 직접 해 보면서 더 나은 방법을 찾아갈 때 힘이 잘 납니다.",
  식상약간: "일의 큰 틀은 정해져 있어도, 그 위에 개선안을 내거나 새로운 방법을 하나쯤 시도해 볼 여지가 있을 때 일이 재미있어지는 사람입니다. 처음부터 끝까지 혼자 벌일 필요까지는 없습니다.",
  비슷강: "해야 할 일의 틀은 정해져 있고, 그 안에서 방법은 내가 정해 결과까지 직접 만들 수 있을 때 일이 가장 잘 풀리는 사람입니다. 그래서 어디서 일하느냐보다, 그 일이 정해진 틀과 내가 고를 여지를 함께 주느냐가 더 중요합니다.",
  비슷약: "어느 한쪽 환경이 유난히 잘 맞는 사람은 아닙니다. 일을 시작할 때는 무엇을 해야 하는지만큼, 내가 어디까지 판단하고 결정할 수 있는지도 중요하게 봅니다. 해야 할 범위는 분명하되 그 안의 방법까지 하나하나 정해져 있으면 금방 답답해질 수 있습니다.",
};

function intensitySentence(a: ABranch, topAxis: string): string | null {
  if (a === "관성뚜렷") {
    return topAxis === "관성"
      ? "그래서 일을 받으면 언제까지, 어느 수준으로 해야 하는지부터 확인하고 싶어지고, 그게 정해지지 않은 채 시작하는 게 가장 부담스럽습니다."
      : "다만 이런 것이 정해지지 않았다고 손을 못 대는 사람은 아닙니다. 정해져 있을 때 훨씬 수월할 뿐입니다.";
  }
  if (a === "식상뚜렷") {
    return topAxis === "식상"
      ? "일이 재미있는지는 결국 내가 직접 만들어 볼 여지가 있느냐에 가장 크게 달려 있습니다."
      : "처음부터 끝까지 모든 것을 마음대로 해야 하는 것은 아니지만, 적어도 내가 맡은 부분에서는 판단할 여지가 있어야 답답함이 덜합니다.";
  }
  return null;
}

function exposureSentence(a: ABranch, b: Exposure): string {
  if (ISGWAN(a)) {
    return b === "속"
      ? "누가 정했다고 그대로 따르기보다, 왜 그렇게 해야 하는지 납득이 돼야 움직이는 쪽입니다."
      : "정해진 방식이 있으면 이것저것 따지기 전에 일단 해 보는 편이라, 새 업무를 맡거나 낯선 사람들과 일하게 되어도 금방 자리를 잡습니다.";
  }
  if (b === "겉") return "규칙 자체를 싫어하는 건 아니어서, 어떤 결과를 내면 되는지가 보이면 규칙이 있는 곳에서도 무리 없이 적응합니다.";
  if (b === "속") return "규칙과 절차를 미리 촘촘하게 정해 두기보다, 필요한 순간에 필요한 것을 챙기는 편입니다.";
  return "시키는 대로 나를 맞춰 가는 일은 잘 맞지 않아서, 방법을 하나하나 정해 주는 곳보다 목표만 받고 진행은 맡겨 주는 쪽이 훨씬 수월합니다.";
}
function connector(a: ABranch, b: Exposure): string {
  if (b === "겉") return "반면 ";
  if (b === "속") return ISGWAN(a) || ISSIK(a) ? "그래서 " : "다만 ";
  return ISSIK(a) ? "반대로 " : "다만 ";
}

const GALL: Record<ABranch, string> = {
  관성뚜렷: "요청이 자꾸 바뀌거나, 책임은 지는데 어디까지 정해도 되는지 애매하면 일보다 눈치 보는 데 신경이 더 쓰입니다. 이번 주와 다음 주 요청이 달라지는 일이 반복되면, 일하는 시간보다 ‘이번엔 뭘 원하는 걸까’ 짐작하는 시간이 더 길어지기도 합니다.",
  관성약간: "방법을 매번 확인받아야 하는 상황이 이어지면 답답함이 커지고, 목표부터 흐릿하면 뭘 해야 할지 잡느라 지칩니다. 작은 수정 하나에도 확인이 몇 번씩 필요하거나, 목표가 말로만 오가고 정리된 게 없으면 일이 손에 잡히지 않습니다.",
  식상뚜렷: "절차가 길어질수록 답답함이 빨리 쌓입니다. 한 가지를 진행하는 데 거쳐야 할 단계가 자꾸 늘어나면, 정작 만드는 시간은 줄고 기다리는 시간만 늘어난 느낌이 듭니다.",
  식상약간: "정해진 방식대로만 반복해야 하는 상황에서는 몇 달만 지나도 의욕이 떨어지기 쉽습니다. 같은 양식만 계속 채우는 일이 이어지면, 더 나은 방법이 보여도 손댈 수 없다는 게 점점 답답해집니다.",
  비슷강: "정해진 대로만 하라며 내가 고를 여지가 없으면 답답하고, 반대로 ‘알아서 잘 해 오라’고만 하고 뭘 기준으로 삼을지 알려 주지 않으면 갈피를 못 잡습니다. 방법까지 체크리스트로 정해 놓은 일과, 아무 기준 없이 전부 맡겨 버리는 일이 그렇습니다.",
  비슷약: "아무 기준 없이 전부 내가 정해야 하는 것도 부담입니다. 예산과 일정을 혼자 다 정하면서 기댈 기준이 하나도 없는 경우가 그렇습니다.",
};

// 식상 뚜렷 × 관성 속: 앞 문장(필요한 순간에 필요한 것만 챙김)의 결과로 이어지는 문장
const GALL_SIK_SOK =
  "정해진 단계를 하나씩 밟아야 하는 일이 길어지면, 일 자체보다 그 과정에서 먼저 답답함을 느낄 수 있습니다. 정작 만드는 시간은 줄고 기다리는 시간만 늘어난 느낌이 들기 때문입니다.";

// 관성 계열 × 관성 속: 앞 문장(왜 그런지 납득이 돼야 움직임)의 결과로 이어지는 문장(연결어 '그래서'는 그대로 두고 문장만 앞뒤 관계에 맞게 다시 씀)
const GALL_GWAN_SOK: Record<"뚜렷" | "약간", string> = {
  뚜렷: "시작한 뒤에도 요청이나 조건이 계속 바뀌면, 바뀔 때마다 이유를 다시 납득하고 맞춰야 해서 일 자체보다 조율하는 데 시간과 신경이 더 들어갑니다. 이번 주와 다음 주 요청이 달라지는 일이 반복되면, 일하는 시간보다 ‘이번엔 뭘 원하는 걸까’ 짐작하는 시간이 더 길어지기도 합니다.",
  약간: "이유 설명 없이 방법만 계속 확인받아야 하는 상황이 이어지면 답답함이 커지고, 목표부터 흐릿하면 뭘 해야 할지 잡느라 지칩니다. 작은 수정 하나에도 확인이 몇 번씩 필요하거나, 목표가 말로만 오가고 정리된 게 없으면 일이 손에 잡히지 않습니다.",
};
const COMBO_GALL_SOK =
  "새로운 일을 해볼지는 내가 정했는데 그 뒤로 요구가 자꾸 달라지면, 달라질 때마다 이유를 다시 납득하고 맞춰야 해서 일 자체보다 조율하는 데 시간과 신경이 더 들어갑니다. 이번 주와 다음 주 요청이 달라지는 일이 반복되면, 일하는 시간보다 ‘이번엔 뭘 원하는 걸까’ 짐작하는 시간이 더 길어지기도 합니다.";
const COMBO_SYNTH_SOK =
  "남이 다 짜 놓은 방식을 그대로 따라가는 것도, 아무 기준 없이 그때그때 움직이는 것도 잘 맞지 않습니다. 하기로 정하는 것은 내가 하고, 정한 뒤에는 내 방식으로 마무리하는 쪽이 가장 잘 맞습니다.";

const INDEP: Record<ABranch, string> = {
  관성뚜렷: "독립해서 일한다면 그때그때 혼자 정하는 방식은 오히려 지칩니다. 할 일의 범위, 진행 순서, 가격, 마감을 처음에 정해 두고 그대로 반복할 때 마음이 놓이고, 잘하는 일 하나를 같은 방식으로 꾸준히 내놓는 형태와 잘 맞습니다.",
  관성약간: "이런 답답함이 쌓이면 하던 방식을 바꾸고 싶어질 수 있습니다. 이때 한꺼번에 전부 뒤집기보다, 지금 가장 불편한 한 가지부터 손보는 편이 오히려 오래 갑니다.",
  식상뚜렷: "독립해서 일한다면 만드는 일과 알리는 일을 직접 쥐고 있을 때 수월하고, 만든 결과물이 곧 수입이 되는 방식과 잘 맞습니다. 다만 정산이나 문의 응대, 일정 관리처럼 반복되는 일까지 계속 붙잡고 있으면 만드는 시간이 줄어드니, 미리 맡길 사람이나 도구를 정해 두는 편이 낫습니다.",
  식상약간: "독립한다면 처음부터 크게 벌이기보다, 하던 일에서 조금씩 범위를 넓혀 가는 쪽이 맞습니다. 작게 해 보고 반응을 확인한 뒤 늘리는 식이 부담이 적습니다.",
  비슷강: "독립한다면 할 일의 범위, 가격, 마감부터 정해 두고, 그 안에서 만드는 일은 직접 하는 방식이 수월합니다. 처음부터 모든 걸 열어 두기보다 정해 둔 조건 하나로 시작하는 쪽이 부담이 적습니다.",
  비슷약: "독립한다면 목표와 마감은 분명하되 진행 방법은 고를 여지가 있는 형태가 맞습니다. 처음에는 작게 시작해서 필요한 것을 하나씩 정해 가면, 자기 페이스를 잡아 끝까지 밀고 가기 쉽습니다.",
};
const NO_GWAN_ADDON = "누가 정해 주지 않아도 방향이 흩어지지 않도록, 일을 시작할 때 마감일과 할 일의 범위부터 먼저 적어 두는 편이 좋습니다.";

// 블록은 쪼개지 않고, 내용량(글자 수)에 따라 문단으로 묶는다 — 짧은 조합은 2문단, 내용이 많은 조합은 4문단까지 자연스럽게 달라진다.
const PARA_LIMIT = 250;
function pack(blocks: string[], limit: number): string[] {
  const out: string[] = [];
  let cur = "";
  for (const b of blocks) {
    if (!cur) cur = b;
    else if ((cur + " " + b).length <= limit) cur += " " + b;
    else { out.push(cur); cur = b; }
  }
  if (cur) out.push(cur);
  return out;
}

// ── [v9 추가] 충돌 패턴 통합 규칙: 관성 뚜렷(정해진 범위·순서가 있을 때 마음이 놓임) + 전체 1위가 비겁(앞 장들이 "스스로 판단하고 움직이는 사람"으로 읽는 축)
// 두 값을 지우지 않고 "시작·무엇을 할지는 스스로 / 시작한 뒤 어디까지·어떤 순서로는 분명할수록 편함"으로 잇는다.
// 이 규칙은 A=관성뚜렷 ∧ 전체1위=비겁 조합에만 적용되고, 다른 모든 분기는 v8과 글자 단위로 같다.
const SELF_START_CONFLICT = (a: ABranch, topAxis: string) => a === "관성뚜렷" && topAxis === "비겁";

// 비겁 1위 → "무엇을 할지·시작은 스스로", 관성 뚜렷 → "한번 하기로 한 뒤엔 범위·순서가 분명할수록 편함"
const COMBO_FIT =
  "무엇을 할지, 새로 시작할지 말지는 남이 정해 주는 것보다 내가 판단하고 싶어 하는 사람입니다. 대신 한번 하기로 한 일은 어디까지 해내면 되는지, 무엇부터 처리하면 되는지가 정리돼 있을수록 마음이 놓이고, 그 범위 안에서는 미루지 않고 끝까지 해냅니다.";
// 관성 exposure(B) → 시작 뒤의 범위·순서를 어떻게 대하는가 (앞 장의 자율성과 부딪히는 "일단 따라 해 보는 편" 표현은 쓰지 않는다)
function comboExposure(b: Exposure): string {
  return b === "속"
    ? "누가 정했다고 그대로 따르기보다 왜 그렇게 해야 하는지 납득이 돼야 움직이는 쪽이라, 순서와 기한도 내가 이해하고 정한 것일 때 가장 잘 지킵니다."
    : "내가 정한 일이라면 순서나 기한을 맞추는 것도 크게 부담스러워하지 않습니다.";
}
const COMBO_GALL =
  "새로운 일을 해볼지는 내가 정했는데 그 뒤로 요구가 자꾸 달라지면, 일 자체보다 바뀐 조건을 다시 맞추는 데 신경이 더 쓰입니다. 이번 주와 다음 주 요청이 달라지는 일이 반복되면, 일하는 시간보다 ‘이번엔 뭘 원하는 걸까’ 짐작하는 시간이 더 길어지기도 합니다.";
const COMBO_SYNTH =
  "그래서 남이 다 짜 놓은 방식을 그대로 따라가는 것도, 아무 기준 없이 그때그때 움직이는 것도 잘 맞지 않습니다. 하기로 정하는 것은 내가 하고, 정한 뒤에는 내 방식으로 마무리하는 쪽이 가장 잘 맞습니다.";
const COMBO_INDEP =
  "독립해서 일한다면 무슨 일을 할지는 스스로 고르되, 가격과 마감, 진행 순서는 처음에 정해 두고 그대로 가져가는 방식이 맞습니다.";

// ── [v10 추가] (가)(나)(다) — 10,224명 검증에서 나온 ①·②와의 부분 충돌 3후보. 새 점수·구간 없이 기존 분기값(A, 전체 1위, ①이 이미 고른 대표 근거)만 쓴다.
// (가) 관성 약간 ∧ 전체1위=비겁: ①·②의 "스스로 판단하고 움직임"과, ⑥의 "정해진 방식을 일단 따라 해 본다"가 부딪힘
const SELF_START_MILD = (a: ABranch, topAxis: string) => a === "관성약간" && topAxis === "비겁";
// (다) 관성 계열(뚜렷 통합 제외/약간 (가) 제외) ∧ 전체1위=재성: ⑥이 "같은 방식 반복"으로 재성 방향을 지움
const WEALTH_TOP_ORG = (a: ABranch, topAxis: string) => (a === "관성뚜렷" || a === "관성약간") && topAxis === "재성";
// (나) 관성 계열 ∧ ①이 "기회를 보고 움직여서 판을 키우는" 문장을 쓰는 사람. ①의 그 문장이 나오는 조건(재성 대표 근거가 편재)을
// buildOpeningParagraphsNoJargon(read-only)이 쓰는 방식 그대로 읽는다 — 새 계산 아님.
function pickLeadEvidence(list: EvidencePosition[]): EvidencePosition | null {
  const visible = list.filter((e) => e.slot !== "지장간");
  if (visible.length > 0) return visible[0];
  const weight: Record<string, number> = { 본기: 3, 중기: 2, 여기: 1 };
  const sorted = [...list].sort((a, b) => (weight[b.hidePosition ?? ""] ?? 0) - (weight[a.hidePosition ?? ""] ?? 0));
  return sorted[0] ?? null;
}
export function sense1UsesOpportunityLine(key: ChapterFourKey): boolean {
  const { jaeseong, evidenceByCategory, wealth } = key;
  if (jaeseong.exposure !== "미미") {
    const lead = pickLeadEvidence(jaeseong.evidence)!;
    if (lead.sipseong === "편재") return true;
    const second = jaeseong.evidence.find((e) => e !== lead && e.sipseong !== lead.sipseong) ?? jaeseong.evidence.find((e) => e !== lead);
    return !!second && second.sipseong !== lead.sipseong && second.sipseong === "편재";
  }
  const topEvidence = pickLeadEvidence(evidenceByCategory[wealth.all[0].category]);
  return !!topEvidence && topEvidence.sipseong === "편재";
}
const OPPORTUNITY_ORG = (a: ABranch, topAxis: string, key: ChapterFourKey) =>
  (a === "관성뚜렷" || a === "관성약간") && topAxis !== "비겁" && topAxis !== "재성" && sense1UsesOpportunityLine(key);

// (가) 문장 — 관성 약간: 큰 틀(끝 지점)은 분명한 게 편하고, 순서·방법은 내가 정하는 쪽
const MILD_FIT =
  "무엇을 할지는 스스로 정하는 편이라, 남이 정해 준 일을 그대로 넘겨받으면 답답해집니다. 그렇다고 아무 기준 없이 움직이는 게 편한 것은 아닙니다. 내가 고른 일은 어디까지 하면 끝인지가 분명하고, 무엇부터 할지는 내가 정할 수 있을 때 가장 집중이 잘 됩니다. 남이 짜 준 방식대로 움직이는 것과, 내가 고른 일을 정해 둔 기한에 맞춰 끝내는 것은 이 사람에게 서로 다른 문제입니다.";
function mildExposure(b: Exposure): string {
  return b === "속"
    ? "누가 정했다고 그대로 따르기보다, 왜 그렇게 해야 하는지 납득이 돼야 움직이는 쪽입니다."
    : "내가 하기로 한 일이면 마감이나 중간 확인 같은 절차도 크게 부담 없이 따라가서, 시작한 일이 흐지부지되는 경우는 드문 편입니다.";
}
const MILD_INDEP =
  "새 일을 벌일 때도 무엇을 할지는 내가 정하되, 시작하는 순간 목표와 마감부터 적어 두고 세부 진행은 해 가면서 다듬는 쪽이 잘 맞습니다.";

// (나) 문장 — 기회를 잡는 방식(먼저 움직임)과 잡은 일을 운영하는 방식(범위·순서·마감)을 구분
const OPP_INDEP: Record<"뚜렷" | "약간", string> = {
  뚜렷: "새로운 기회가 보이면 오래 재기보다 먼저 움직여 보는 편입니다. 남이 맡긴 일은 범위부터 확인하고 시작하지만, 내가 잡은 기회는 일단 부딪혀 보는 쪽입니다. 하지만 막상 일이 시작되면 무엇부터 끝낼지, 어디까지 책임질지가 분명해야 훨씬 편하게 움직입니다. 그래서 일이 늘어날수록 즉흥적으로 끌고 가기보다, 범위와 순서, 마감을 먼저 적어 두고 그 틀대로 가져가는 쪽이 잘 맞습니다.",
  약간: "새로운 기회가 보이면 오래 재기보다 먼저 움직여 보는 편입니다. 남이 맡긴 일은 목표부터 확인하고 시작하지만, 내가 잡은 기회는 일단 부딪혀 보는 쪽입니다. 하지만 막상 일이 시작되면 무엇부터 끝낼지 정해져 있어야 훨씬 편하게 움직입니다. 그래서 일이 늘어날수록 즉흥적으로 끌고 가기보다, 목표와 마감만 먼저 적어 두고 세부 진행은 내 식으로 다듬어 가는 쪽이 잘 맞습니다.",
};
// (다) 문장 — 재성 방향(결과가 더 좋아질 여지가 보이면 늘려 봄)을 실제 운영 방식(감당 가능한 양 확인 → 기준을 세워 굴림)으로 내림. ①·②의 표현("판을 키우는", "거래와 확장")은 쓰지 않는다.
const WEALTH_INDEP: Record<"뚜렷" | "약간", string> = {
  뚜렷: "한 가지 방식만 계속 반복하기보다, 결과가 더 좋아질 여지가 보이면 맡는 범위를 늘려 보는 편입니다. 다만 일이 늘어난다고 무조건 벌여 놓지는 않고, 지금 내가 감당할 수 있는 양인지부터 따져 봅니다. 늘리기로 한 뒤에는 할 일의 범위, 진행 순서, 가격, 마감을 먼저 정해 두고 그대로 굴러가게 만드는 쪽이 잘 맞습니다.",
  약간: "한 가지 방식만 계속 반복하기보다, 결과가 더 좋아질 여지가 보이면 맡는 범위를 늘려 보는 편입니다. 다만 일이 늘어난다고 무조건 벌여 놓지는 않고, 지금 내가 감당할 수 있는 양인지부터 따져 봅니다. 늘리기로 한 뒤에는 목표와 마감만 먼저 정해 두고, 세부 진행은 해 가면서 다듬는 쪽이 잘 맞습니다.",
};

// ── [v11 추가] R2 연결안 — ①(무엇을 선택·시작하는가) → ②(돈·결과를 어떤 방식으로 만들고 쌓는가) → ⑥(선택한 일을 어떤 방식으로 운영할 때 편한가).
// ②의 유형은 전체 1위 축(이미 ⑥도 씀)에서 정해지고, 재성 1위일 때만 2위 축(key.wealth.all[1])이 비겁인지가 더해진다 — ②가 이미 쓰는 기존 값이라 새 계산 없음.
//   ②=조직과 역할        : 전체1위=관성
//   ②=신뢰와 관계        : 전체1위=인성
//   ②=거래와 확장        : 전체1위=재성 ∧ 2위=비겁  (v10의 (다) 문장 유지)
//   ②=차곡차곡 축적      : 전체1위=재성 ∧ 2위≠비겁
// 강한 충돌: (나) 관성 계열 ∧ ①기회 문장 ∧ ②(조직|신뢰),  (다) 관성 계열 ∧ ②축적
// 약한 충돌: 식상 뚜렷/약간 ∧ ②(신뢰|축적)   — 기술·전문성/직접 움직임/표현/거래 확장과는 방향이 맞아 그대로 둔다.
type Two = "조직" | "신뢰" | "거래확장" | "축적" | "기타";
function twoType(key: ChapterFourKey): Two {
  const top = key.wealth.all[0].category, second = key.wealth.all[1]?.category;
  if (top === "관성") return "조직";
  if (top === "인성") return "신뢰";
  if (top === "재성") return second === "비겁" ? "거래확장" : "축적";
  return "기타";
}

// (나) 기회를 알아보는 것(①) → 실제로 돈·시간을 쓰는 방식(②) → 시작한 뒤 운영(⑥)
const OPP_BY_TWO: Record<"조직" | "신뢰", Record<"뚜렷" | "약간", string>> = {
  조직: {
    뚜렷: "새로운 기회가 보이면 오래 망설이기보다 먼저 가능성을 확인해 보는 편입니다. 다만 그 기회를 실제 돈이나 결과로 바꿀 때는 새로 크게 벌이기보다, 지금 맡은 일이나 이미 하던 방식 안에서 할 수 있는 만큼부터 해 봅니다. 그래서 새 일을 시작할 기회는 열어 두되, 시작한 뒤에는 할 일의 범위와 순서, 마감을 먼저 적어 두고 맡은 몫을 끝까지 해내는 쪽이 잘 맞습니다.",
    약간: "새로운 기회가 보이면 오래 망설이기보다 먼저 가능성을 확인해 보는 편입니다. 다만 그 기회를 실제 돈이나 결과로 바꿀 때는 새로 크게 벌이기보다, 지금 맡은 일이나 이미 하던 방식 안에서 할 수 있는 만큼부터 해 봅니다. 그래서 새 일을 시작할 기회는 열어 두되, 시작한 뒤에는 목표와 마감만 먼저 적어 두고 세부 진행은 해 가면서 다듬는 쪽이 잘 맞습니다.",
  },
  신뢰: {
    뚜렷: "새로운 기회가 보이면 오래 망설이기보다 먼저 가능성을 확인해 보는 편입니다. 다만 그 기회에 실제로 돈이나 시간을 쓰는 것은, 함께할 사람과 조건을 확인해 믿을 만하다고 느낀 뒤입니다. 알아보는 것은 빠르지만 움직이는 것은 확인이 끝난 뒤이고, 일단 시작한 뒤에는 할 일의 범위와 순서, 마감을 먼저 적어 두고 그대로 진행하는 쪽이 잘 맞습니다.",
    약간: "새로운 기회가 보이면 오래 망설이기보다 먼저 가능성을 확인해 보는 편입니다. 다만 그 기회에 실제로 돈이나 시간을 쓰는 것은, 함께할 사람과 조건을 확인해 믿을 만하다고 느낀 뒤입니다. 알아보는 것은 빠르지만 움직이는 것은 확인이 끝난 뒤이고, 일단 시작한 뒤에는 목표와 마감만 먼저 적어 두고 세부 진행은 해 가면서 다듬는 쪽이 잘 맞습니다.",
  },
};
// (다) ②가 "차곡차곡 축적"일 때: 여지를 보면 확인은 해 보되, 돈·결과를 만드는 방식은 효과를 본 것을 이어 가며 조금씩 더함
const WEALTH_ACCUM_INDEP: Record<"뚜렷" | "약간", string> = {
  뚜렷: "결과가 더 좋아질 여지가 보이면 가능성부터 확인해 보는 편입니다. 그렇다고 방식 자체를 자주 바꾸는 사람은 아닙니다. 돈이나 결과를 만들 때는 한 번 효과를 본 방식을 이어 가면서 그 위에 조금씩 늘려 가는 쪽이고, 늘리기 전에는 지금 내가 감당할 수 있는 양인지부터 따져 봅니다. 늘리기로 한 뒤에는 할 일의 범위, 진행 순서, 가격, 마감을 먼저 정해 두고 그대로 굴러가게 만드는 쪽이 잘 맞습니다.",
  약간: "결과가 더 좋아질 여지가 보이면 가능성부터 확인해 보는 편입니다. 그렇다고 방식 자체를 자주 바꾸는 사람은 아닙니다. 돈이나 결과를 만들 때는 한 번 효과를 본 방식을 이어 가면서 그 위에 조금씩 늘려 가는 쪽이고, 늘리기 전에는 지금 내가 감당할 수 있는 양인지부터 따져 봅니다. 늘리기로 한 뒤에는 목표와 마감만 먼저 정해 두고, 세부 진행은 해 가면서 다듬는 쪽이 잘 맞습니다.",
};
// 약한 충돌: 식상 계열의 "직접 해 보며 고침"과 ②의 "유지·검증"을 '무엇을 유지하고 어디서 변화를 주는지'로 나눠 이어 준다 (FIT 바로 뒤에 한 블록)
const SIK_BRIDGE: Record<"축적" | "신뢰", Record<"뚜렷" | "약간", string>> = {
  축적: {
    뚜렷: "돈이나 결과를 만드는 방식은 한 번 효과를 본 것을 쉽게 버리지 않습니다. 다만 같은 과정을 계속 반복하는 것까지 좋아하는 것은 아닙니다. 결과가 쌓이는 방식은 유지하되, 그 안의 과정은 더 편하고 효율적인 쪽으로 조금씩 바꿔 가는 편입니다.",
    약간: "돈이나 결과를 만드는 방식은 한 번 효과를 본 것을 이어 가는 쪽입니다. 바꾸고 싶은 것은 방식 전체가 아니라, 일하는 방법 한두 가지입니다.",
  },
  신뢰: {
    뚜렷: "함께할 사람이나 조건은 충분히 살펴본 뒤에 정하는 편입니다. 시간이 걸려도, 한번 정한 뒤에는 생각만 오래 하기보다 바로 움직이며 결과를 보는 쪽입니다.",
    약간: "누구와 무엇을 함께할지는 확인이 끝난 뒤에 정하는 편이고, 정하고 나면 그다음부터는 비교적 빠르게 움직입니다.",
  },
};

export function generateOrgStyleV12(key: ChapterFourKey): Result {
  const a = classifyA(key);
  const b = classifyB(key);
  const topAxis = key.wealth.all[0].category;
  const two = twoType(key);
  if (SELF_START_CONFLICT(a, topAxis)) {
    const blocks = [COMBO_FIT, comboExposure(b), `${b === "속" ? "그래서 " : "반면 "}${b === "속" ? COMBO_GALL_SOK : COMBO_GALL}`, b === "속" ? COMBO_SYNTH_SOK : COMBO_SYNTH, COMBO_INDEP];
    return { paragraphs: pack(blocks, PARA_LIMIT).map((text, i) => ({ text, sourceNote: `문단${i + 1}(통합규칙: A=${a}, 전체1위=${topAxis}, B=${b})` })) };
  }
  if (SELF_START_MILD(a, topAxis)) {
    const blocks = [MILD_FIT, mildExposure(b), `${connector(a, b)}${b === "속" ? GALL_GWAN_SOK.약간 : GALL[a]}`, MILD_INDEP];
    return { paragraphs: pack(blocks, PARA_LIMIT).map((text, i) => ({ text, sourceNote: `문단${i + 1}((가): A=${a}, 전체1위=${topAxis}, B=${b})` })) };
  }
  const inten = intensitySentence(a, topAxis);
  const addon = b === "없음" && !ISGWAN(a);
  const tier: "뚜렷" | "약간" = a === "관성뚜렷" || a === "식상뚜렷" ? "뚜렷" : "약간";
  let indep = INDEP[a];
  let bridge: string | null = null;
  let tag = "";
  if (WEALTH_TOP_ORG(a, topAxis)) {
    if (two === "거래확장") { indep = WEALTH_INDEP[tier]; tag = "(다)거래확장"; }
    else { indep = WEALTH_ACCUM_INDEP[tier]; tag = "(다)축적"; }
  } else if (OPPORTUNITY_ORG(a, topAxis, key) && (two === "조직" || two === "신뢰")) {
    indep = OPP_BY_TWO[two][tier]; tag = `(나)${two}`;
  } else if ((a === "식상뚜렷" || a === "식상약간") && (two === "축적" || two === "신뢰")) {
    bridge = SIK_BRIDGE[two][tier]; tag = `(약)식상×${two}`;
  }
  const blocks = [FIT[a]];
  if (inten) blocks.push(inten);
  if (bridge) blocks.push(bridge);
  blocks.push(exposureSentence(a, b));
  const gallText = a === "식상뚜렷" && b === "속" ? GALL_SIK_SOK : ISGWAN(a) && b === "속" ? GALL_GWAN_SOK[a === "관성뚜렷" ? "뚜렷" : "약간"] : GALL[a];
  blocks.push(`${connector(a, b)}${gallText}`);
  blocks.push(indep);
  const paras = pack(blocks, PARA_LIMIT);
  if (addon) paras.push(NO_GWAN_ADDON);
  return { paragraphs: paras.map((text, i) => ({ text, sourceNote: `문단${i + 1}${tag}(A=${a}, B=${b}${inten ? `, 전체1위=${topAxis}` : ""}${addon ? ", B=없음 보충" : ""})` })) };
}
export { twoType };
export { SELF_START_MILD, WEALTH_TOP_ORG, OPPORTUNITY_ORG };
export { SELF_START_CONFLICT };

export const _internals = { classifyA, classifyB };
