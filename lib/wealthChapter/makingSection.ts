// [5장 재물운 Production 이식] 확정된 scratch(scripts/_scratch_ch5_making_v2.ts)를 로직·문장 변경 없이 그대로 옮긴 파일.
// 이식 시 제거한 것: 데모/검증용 실행 코드(buildAppData·IntakeFormData·require.main 블록)와 그 import뿐이다.
// 제5장 ② "나는 어떻게 돈을 만들어내는 사람인가" 개편(scratch) — 계산 엔진은 읽기 전용.
//
// [분석 — 현재 ②가 쓰는 계산값]
// moneyMakingType(key)가 유일한 판정축: key.wealth.all[0].category(최대세력축,
// 5갈래) + 재성일 때 key.wealth.all[1]?.category(비겁 여부)만 추가로 보고,
// 식상일 때 dominantSipseong(evidenceByCategory.식상)(식신/상관만 구분)한다.
// body는 [lead(HOW), makingPara(WHY, chapterFourNarrative.ts 임베드 — 식상生財
// 연결 여부), moment(HOW, 예시)] 3문단뿐이라 ①(6문단)보다 얇다.
//
// [안전하게 조합 가능한 기존 계산값 — 이번에 추가하는 것]
// evidenceByCategory[topAxis]의 stage 분포(EvidencePosition[].stage, 이미
// buildChapterFourKey가 계산해 둔 값 — 새 계산 아님). 이 힘이 원국의 몇 개
// 자리(초년/사회진출/자신/말년)에 걸쳐 있는지를 세어, "이 방식이 삶의 여러
// 국면에서 반복적으로 작동하는 패턴인지, 특정 시기·조건에 집중된 힘인지"를
// 말한다 — ①(돈에 대한 감각·마음이 쓸때/지킬때 어디로 기우는지)이나
// ⑥(어떤 환경에서 능력이 사는지)과는 다른, "이 방식이 삶 전체에서 얼마나
// 꾸준히/반복적으로 나타나는가"라는 ②만의 질문이다.
//
// [중복 위험 판단]
// - ①: spendKeepClause·surfaceVsHiddenDesireClause·SENSE_MOMENT 전부 이번엔
//   안 건드림, topAxis의 stage 분포는 ①이 안 쓰는 값이라 안전.
// - ③: topAxis의 "main" 픽이 evidenceByCategory[topAxis]로 shape(visible/
//   hidden/none)과 monthScore를 이미 말한다 — 같은 배열을 다시 읽지만
//   "노출 형태/월령 점수"가 아니라 "몇 개 자리에 퍼져 있는가(stage 개수)"라는
//   다른 사실을 뽑아 쓴다. 문장도 POSITION_TEXT_BY_SHAPE 뱅크를 그대로 쓰지
//   않고 새로 쓴다 — 다만 같은 원천 배열이라 완전히 무관하다고는 못하므로
//   중간 정도 위험으로 보고 문장을 확실히 다른 결(빈도/반복성)로 썼다.
// - ⑤·⑥: siksangJaeseongLinked/inseongVsSiksang/gwanVsBi 등은 이번에 전혀
//   안 씀. ⑥의 "관리 방식(검증형/시도형)"과 ②의 "만드는 방식"은 이미
//   production이 다른 값(inseongVsSiksang vs moneyMakingType)으로 구분해
//   써왔던 것을 그대로 유지한다.
import { AppData } from "../sajuContent";
import { ChapterFourKey, EvidencePosition, buildChapterFourKey } from "../chapterFourInterpretation";
import { buildChapterFourNarrative } from "../chapterFourNarrative";
import { SipseongCategory } from "../strengthAnalysis";
import { Stage } from "../natalStructure";

// ── production 그대로 복붙(계산·문장 변경 없음) ──
function dominantSipseong(evidence: EvidencePosition[]): string | null {
  const tally = new Map<string, number>();
  evidence.forEach((e) => tally.set(e.sipseong, (tally.get(e.sipseong) ?? 0) + 1));
  const entries = [...tally.entries()].sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;
  if (entries.length > 1 && entries[0][1] === entries[1][1]) return null;
  return entries[0][0];
}

interface MoneyMakingType { label: string; explain: string; moment: string }

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
  return {
    label: "신뢰와 관계를 통해 자리 잡는 돈",
    explain: "이 사람은 빠르게 벌이기보다, 사람들의 신뢰를 먼저 쌓은 뒤 그 위에서 돈이 자연스럽게 따라오는 구조에 가깝습니다.",
    moment: "예를 들어 처음 만난 기회를 바로 붙잡기보다, 충분히 검증되고 신뢰가 쌓인 뒤에야 실제로 움직이는 경우가 많습니다.",
  };
}

// ── [신규] 만드는 힘의 stage 분포 — "삶의 여러 국면에서 반복적으로 작동하는
// 패턴인지, 특정 시기·조건에 집중된 힘인지". 지장간(숨은 자리)은 "겉으로
// 드러난 국면"으로 안 치고, 천간/지지(드러난 자리)만 센다. ──
const STAGE_LABEL: Record<Stage, string> = {
  year: "초년",
  month: "사회로 나가는 시기",
  day: "지금 자기 자신의 자리",
  hour: "말년",
};

// [버그 수정] 처음엔 "과"를 하드코딩했는데, 받침 없는 단어("시기" 등) 뒤에서
// "시기과"처럼 틀린 조사가 나왔다(J 케이스에서 실제로 재현). josaGwaWa
// (chapterFourNarrative.ts 등 기존 파일들이 이미 쓰는 동일한 받침 판정 로직,
// 새 계산 아님)로 교체.
function josaGwaWa(word: string): "과" | "와" {
  const last = word.charCodeAt(word.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return "와";
  return (last - 0xac00) % 28 === 0 ? "와" : "과";
}

function joinKoreanSimple(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]}${josaGwaWa(items[0])} ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, ${items[items.length - 1]}`;
}

function makingSpreadClause(evidence: EvidencePosition[]): string {
  const visibleStages = [...new Set(evidence.filter((e) => e.slot !== "지장간").map((e) => e.stage))];
  if (visibleStages.length >= 2) {
    return `이 힘은 ${joinKoreanSimple(visibleStages.map((s) => STAGE_LABEL[s]))}, 이렇게 원국의 여러 자리에 걸쳐 나타납니다. 그래서 한때 반짝하고 마는 방식이 아니라, 삶의 여러 국면에서 이 방식이 반복적으로 되풀이되며 돈을 만들어내는 쪽에 가깝습니다.`;
  }
  if (visibleStages.length === 1) {
    return `이 힘은 원국 안에서 ${STAGE_LABEL[visibleStages[0]]}에 자리 하나로 뚜렷하게 몰려 있습니다. 그래서 여기저기서 조금씩보다, 자기 조건이 맞아떨어지는 국면에 들어서면 이 방식이 특히 강하게 발휘되는 쪽에 가깝습니다.`;
  }
  return "이 힘은 원국 앞면에 바로 자리 잡고 있지 않아, 상황이나 시기에 따라 발휘되는 정도가 달라질 수 있습니다.";
}

export interface NarrativeParagraph { text: string; sourceNote: string }
export interface Result { paragraphs: NarrativeParagraph[] }

export function generateMakingSectionV2(appData: AppData, key: ChapterFourKey): Result {
  const mt = moneyMakingType(key);
  const chapterFourContent = buildChapterFourNarrative(appData, key);
  const makingPara = chapterFourContent.publicPreview[2]; // hook(0), 오프닝(1), 식상生財(2)

  const topAxis: SipseongCategory = key.wealth.all[0].category;
  const spread = makingSpreadClause(key.evidenceByCategory[topAxis]);

  const paragraphs: NarrativeParagraph[] = [
    { text: `${mt.explain} 굳이 이름을 붙이면 '${mt.label}'에 가깝습니다.`, sourceNote: `만드는유형(topAxis=${topAxis})` },
    { text: makingPara, sourceNote: "식상生財 연결(chapterFourNarrative 임베드, 변경 없음)" },
    { text: spread, sourceNote: `stage분포(topAxis=${topAxis}, stages=${key.evidenceByCategory[topAxis].filter((e) => e.slot !== "지장간").map((e) => e.stage).join(",")})` },
    { text: mt.moment, sourceNote: `생활예시(topAxis=${topAxis})` },
  ];
  return { paragraphs };
}
