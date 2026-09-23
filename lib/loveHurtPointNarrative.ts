import { AppData } from "./sajuContent";
import { analyzeSpouseStar } from "./spouseStarAnalysis";
import { analyzeRoot } from "./natalStructure";
import { buildChapterThreeKey } from "./chapterThreeInterpretation";
import { subtypeFocusOf, exposureShapeOf } from "./loveApproachStyleNarrative";

/**
 * 사랑·인연 새 하위 섹션("내가 사랑에서 상처받는 지점") — 第四章 확장
 * (승인된 작업, 2026-09). 핵심 질문: 이 사람이 관계 안에서 마음이
 * 흔들리기 쉬운 조건은 무엇인가. 실제 과거 사건(이별·배신 등)을 만들지
 * 않고, "이런 조건에서 마음이 흔들리기 쉽다"는 경향까지만 다룬다.
 *
 * 새 계산을 하지 않는다.
 *  - analyzeRoot(user)(natalStructure.ts, 통근) — 일간(자기 자신) 자체가
 *    원국 안에 뿌리를 내리고 있는지.
 *  - analyzeSpouseStar(user, gender).exposure — 조합 상대(통근)가 달라
 *    실제로 다른 문장 갈래가 나온다. exposure가 "마음을 얼마나
 *    드러내는가"라면 통근은 "그 마음의 기반이 얼마나 단단한가"로, 서로
 *    다른 질문이다.
 *  - buildChapterThreeKey(appData).gwansal(③④⑨가 이미 씀) — 2차 보강에서
 *    새로 재사용.
 *
 * 1차 분기(핵심 판정): exposure===미미면 판정보류형(이 축만으로는 상처
 * 지점을 설명하기 어려움 — ①③과 동일한 원칙). 그 외에는 hasRoot(있음/
 * 없음) × effectiveSide(뚜렷/숨음, shape=hidden이면 뚜렷→숨음 오버라이드)
 * 총 4갈래.
 *
 * 2차 보강(승인된 작업, 2026-09) — 유료 평생운명록 본문으로는 짧다는
 * 지적에 따라, ⑨에서 먼저 확정한 방식(결론→왜→실제모습→예시→의미)을
 * 그대로 재사용해 문단 역할을 늘렸다. 1차 분기(hasRoot×effectiveSide)는
 * 전혀 바꾸지 않고, gwansal(이미 ③④⑨가 쓰는 값)을 "이 서운함이 실제로
 * 어떻게 다뤄지는가"라는 2차 축으로 추가했다. 같은 branchKey인데 gwansal이
 * 다른 사람들이 완전히 같은 예시를 받던 문제를 gwansal별로 예시의 초점
 * (혼자만의 순간 vs 여러 일 속에 묻히는 순간)을 다르게 해 해소했다.
 *
 * 안전 원칙: "항상/반드시" 금지, 구체적 과거 사건·상대 성격을 만들지
 * 않는다. "상처"라는 단어 자체보다 "마음이 흔들리기 쉬운 조건/순간"으로
 * 풀어 과도한 취약성 서사를 피한다.
 */

export interface NarrativeParagraph {
  text: string;
  sourceNote: string;
}

export interface LoveHurtPointNarrativeResult {
  paragraphs: NarrativeParagraph[];
}

type Side = "뚜렷" | "숨음";
type RootKey = "기반있음" | "기반없음";
type BranchKey = `${RootKey}-${Side}`;

// ── 결론 + 왜(hasRoot × effectiveSide, 4갈래 — 기존 scene 문장의 의미를 그대로 "결론/왜" 2문장으로 나눔) ──
const CORE_WHY: Record<BranchKey, { core: string; why: string }> = {
  "기반있음-뚜렷": {
    core: "이 사람이 사랑에서 유독 마음이 흔들리기 쉬운 지점은, 어렵게 꺼낸 마음이 상대에게 가볍게 여겨질 때입니다.",
    why: "스스로에 대한 기반이 비교적 단단해서 마음이 흔들려도 완전히 무너지는 일은 잘 없지만, 마음을 표현하는 데는 거리낌이 없다 보니 그렇게 꺼낸 마음이 대수롭지 않게 넘어가질 때 유독 서운함이 크게 남기 때문입니다.",
  },
  "기반있음-숨음": {
    core: "이 사람이 사랑에서 유독 마음이 흔들리기 쉬운 지점은, 혼자 삭인 마음을 상대가 끝내 모르고 지나갈 때입니다.",
    why: "스스로에 대한 기반은 단단한 편이지만 마음을 먼저 적극적으로 드러내지는 않아서, 혼자 서운함을 삭이고 넘어가는 일이 잦고 정작 그 마음을 상대가 진짜로 모르고 지나갈 때 뒤늦게 마음이 무거워지기 때문입니다.",
  },
  "기반없음-뚜렷": {
    core: "이 사람이 사랑에서 유독 마음이 흔들리기 쉬운 지점은, 표현한 마음에 상대가 보이는 반응 그 자체입니다.",
    why: "마음을 표현하는 데는 거리낌이 없지만 스스로를 지탱하는 기반은 상대적으로 여린 편이라, 상대가 어떻게 반응하느냐에 따라 기분이 크게 오르내리고 작은 반응 하나에도 마음이 크게 흔들릴 수 있기 때문입니다.",
  },
  "기반없음-숨음": {
    core: "이 사람이 사랑에서 유독 마음이 흔들리기 쉬운 지점은, 티도 못 낸 채 힘든 시간을 혼자 버텨야 할 때입니다.",
    why: "마음을 잘 드러내지 않으면서 스스로를 지탱하는 기반도 상대적으로 여린 편이라, 혼자 마음을 다잡아야 하는 상황이 반복되면 겉으로는 괜찮아 보여도 안에서는 꽤 오래 힘든 시간을 보내고 있을 수 있기 때문입니다.",
  },
};

// ── 실제모습(gwansal 유무, 2갈래) — ③④⑨가 이미 쓰는 값을 "이 서운함이 실제로 어떻게 다뤄지는가"에 재적용 ──
const HOW_BY_GWANSAL: Record<"있음" | "없음", string> = {
  있음: "이 사람은 원래도 여러 기준을 동시에 신경 쓰는 편이라, 서운한 마음이 들어도 그 감정부터 먼저 들여다보기보다 지금 당장 처리해야 할 다른 일을 먼저 정리하고 넘어가는 경우가 많습니다. 그러다 보면 정작 그 마음을 짚고 넘어갈 타이밍을 놓치기 쉽습니다.",
  없음: "이 마음은 대개 하나의 순간에 집중되어 크게 남는 편이라서, 그 순간 자체만 잘 풀리면 오래 끌지 않고 비교적 가볍게 넘기는 쪽에 가깝습니다.",
};

// gwansal=없음(단일 순간에 집중되어 크게 남는다는 "실제모습" 문장과 짝)은 기존 예시를 그대로
// 쓰고, gwansal=있음(여러 기준을 동시에 신경 쓰다 감정 짚을 타이밍을 놓친다는 "실제모습" 문장과
// 짝)에는 "여러 가지 일이 겹친/동시에 챙기느라"라는 상황을 더해 같은 트리거(가볍게 여겨짐·
// 몰라줌·반응 늦음·무심함)가 실제로 다른 장면으로 나타나게 한다. "혼자만의 순간" vs "여러 일
// 속에 묻히는 순간"으로 장면의 초점 자체가 다르다. 사건 예측 없음.
const SCENE: Record<BranchKey, Record<"있음" | "없음", string>> = {
  "기반있음-뚜렷": {
    없음: "특히 오래 고민하고 어렵게 꺼낸 말을 상대가 대수롭지 않게 넘기거나 농담으로 받을 때, 이 순간이 유독 크게 다가올 수 있습니다.",
    있음: "특히 여러 가지 일이 한꺼번에 겹친 와중에, 오래 고민해서 어렵게 꺼낸 말을 상대마저 대수롭지 않게 넘기거나 농담으로 받으면, 다른 일들 사이에 묻어 두려던 마음이 그 순간 유독 크게 올라올 수 있습니다.",
  },
  "기반있음-숨음": {
    없음: "특히 며칠을 혼자 삭인 서운함을 나중에 슬쩍 내비쳤는데 상대가 '그런 일이 있었어?' 하고 정말 몰랐다는 반응을 보일 때, 이 순간이 유독 크게 다가올 수 있습니다.",
    있음: "특히 여러 가지 일을 동시에 챙기느라 며칠을 혼자 삭인 서운함을 나중에야 슬쩍 내비쳤는데 상대가 '그런 일이 있었어?' 하고 정말 몰랐다는 반응을 보이면, 그동안 뒤로 미뤄 뒀던 마음이 한꺼번에 무겁게 다가올 수 있습니다.",
  },
  "기반없음-뚜렷": {
    없음: "특히 마음을 표현한 직후 상대의 반응이 뜨뜻미지근하거나 답이 늦게 올 때, 그 짧은 시간 동안 여러 생각이 스치며 마음이 크게 흔들릴 수 있습니다.",
    있음: "특히 여러 가지 일이 한꺼번에 몰린 상황에서 마음을 표현했는데 상대의 반응이 뜨뜻미지근하거나 답이 늦게 오면, 안 그래도 분주하던 마음이 그 짧은 시간 동안 더 크게 흔들릴 수 있습니다.",
  },
  "기반없음-숨음": {
    없음: "특히 힘든 티를 안 냈는데 상대가 평소와 다름없이 무심하게 지나갈 때, 겉으로는 티 안 내면서도 속으로는 오래 그 순간을 곱씹게 될 수 있습니다.",
    있음: "특히 여러 가지 일을 한꺼번에 챙기느라 힘든 티조차 낼 겨를이 없었는데, 상대가 평소와 다름없이 무심하게 지나가면 안에서는 그 순간을 더 오래 곱씹게 될 수 있습니다.",
  },
};

// ── 의미(hasRoot×effectiveSide 4 + gwansal 2 = 8갈래) — 기존 conclusion 뒤에 gwansal에 따라
// 다른 초점의 문장을 덧붙인다(있음→여러 일 중에서도 그 마음을 먼저 물어봐 주는 것, 없음→그
// 순간 하나만 짚어 주는 것으로 초점 자체가 다름). ──
const CONCLUSION: Record<BranchKey, string> = {
  "기반있음-뚜렷": "그래서 이 사람에게는, 표현한 마음의 무게를 가볍게 다루지 않는 관계가 오래갑니다.",
  "기반있음-숨음": "그래서 이 사람에게는, 티 내지 않아도 먼저 알아채고 물어봐 주는 관계가 오래갑니다.",
  "기반없음-뚜렷": "그래서 이 사람에게는, 반응 하나하나에 일희일비하지 않아도 되도록 꾸준한 확인을 주는 관계가 오래갑니다.",
  "기반없음-숨음": "그래서 이 사람에게는, 괜찮다는 말을 그대로 믿지 않고 먼저 다가와 살펴주는 관계가 오래갑니다.",
};
const MEANING_FOCUS_BY_GWANSAL: Record<"있음" | "없음", string> = {
  있음: "특히 이런저런 일이 겹친 와중에도 그 마음 하나를 놓치지 않고 먼저 물어봐 주는 사람 앞에서, 이 사람은 오래 편안해질 수 있습니다.",
  없음: "그 순간 하나만 제대로 짚어 주면, 이 사람은 마음을 오래 붙들지 않고 다시 편하게 웃을 수 있습니다.",
};

export function generateLoveHurtPointNarrative(appData: AppData, gender: "male" | "female"): LoveHurtPointNarrativeResult {
  const star = analyzeSpouseStar(appData.user, gender);
  const root = analyzeRoot(appData.user);
  const gwansal = buildChapterThreeKey(appData).gwansal.present;
  const { exposure } = star;

  if (exposure === "미미") {
    return {
      paragraphs: [
        {
          text: "이 축의 신호만으로는 이 사람이 관계 안에서 유독 어떤 순간에 마음이 흔들리는지까지는 짚어내기 어렵습니다. 그 지점은 앞서 살펴본 다른 결에서 이미 더 뚜렷하게 드러났을 수 있습니다. 그래서 이 부분은 하나로 단정하기보다, 관계 안에서 유독 마음이 쓰이는 순간이 있다면 그때그때 스스로 확인해 보는 편이 더 정확합니다.",
          sourceNote: `exposure=미미(단정보류형), hasRoot=${root.hasRoot}, gwansal=${gwansal}`,
        },
      ],
    };
  }

  // shape=hidden이면 뚜렷→숨음으로 강제 전환(①과의 충돌 방지, 기존 규칙 그대로 보존)
  const focus = subtypeFocusOf(star);
  const shape = exposureShapeOf(star, focus);
  const exposureSide: Side = exposure === "뚜렷" ? "뚜렷" : "숨음";
  const effectiveSide: Side = shape === "hidden" ? "숨음" : exposureSide;
  const rootKey: RootKey = root.hasRoot ? "기반있음" : "기반없음";
  const branchKey: BranchKey = `${rootKey}-${effectiveSide}`;
  const gwansalKey: "있음" | "없음" = gwansal ? "있음" : "없음";
  const cw = CORE_WHY[branchKey];
  const noteHead = `hasRoot=${root.hasRoot}, exposure=${exposure}, shape=${shape}(focus=${focus}), gwansal=${gwansal}`;

  return {
    paragraphs: [
      { text: cw.core, sourceNote: `결론(${branchKey})` },
      { text: cw.why, sourceNote: `이유(${branchKey}), ${noteHead}` },
      { text: HOW_BY_GWANSAL[gwansalKey], sourceNote: `실제모습(gwansal=${gwansal})` },
      { text: SCENE[branchKey][gwansalKey], sourceNote: `예시(branch=${branchKey}, gwansal=${gwansal})` },
      { text: `${CONCLUSION[branchKey]} ${MEANING_FOCUS_BY_GWANSAL[gwansalKey]}`, sourceNote: `의미(${branchKey}, gwansal=${gwansal})` },
    ],
  };
}
