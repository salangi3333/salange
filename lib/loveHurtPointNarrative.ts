import { AppData } from "./sajuContent";
import { analyzeSpouseStar } from "./spouseStarAnalysis";
import { analyzeRoot } from "./natalStructure";
import { subtypeFocusOf, exposureShapeOf } from "./loveApproachStyleNarrative";

/**
 * 사랑·인연 새 하위 섹션("내가 사랑에서 상처받는 지점") — 第四章 확장
 * (승인된 작업, 2026-09). 핵심 질문: 이 사람이 관계 안에서 마음이
 * 흔들리기 쉬운 조건은 무엇인가. 실제 과거 사건(이별·배신 등)을 만들지
 * 않고, "이런 조건에서 마음이 흔들리기 쉽다"는 경향까지만 다룬다.
 *
 * 새 계산을 하지 않는다.
 *  - analyzeRoot(user)(natalStructure.ts, 통근) — 일간(자기 자신) 자체가
 *    원국 안에 뿌리를 내리고 있는지. ①~⑤ 어디도 이 챕터에서 통근을
 *    직접 쓰지 않는다(第三章이 세력 판정 내부에서만 쓴다) — 이 섹션에서
 *    처음으로 "배우자성"이 아니라 "일간 자신의 기반"을 사랑 서사에
 *    끌어온다.
 *  - analyzeSpouseStar(user, gender).exposure — ①③④⑤가 이미 쓰지만,
 *    조합 상대(통근)가 달라 실제로 다른 문장 갈래가 나온다. exposure가
 *    "마음을 얼마나 드러내는가"라면 통근은 "그 마음의 기반이 얼마나
 *    단단한가"로, 서로 다른 질문이다.
 *
 * 1차 분기(핵심 판정): exposure===미미면 판정보류형(이 축만으로는 상처
 * 지점을 설명하기 어려움 — ①③과 동일한 원칙). 그 외에는 hasRoot(있음/
 * 없음) × exposure(뚜렷/숨음) 총 4갈래.
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

type BranchKey = "기반있음-뚜렷" | "기반있음-숨음" | "기반없음-뚜렷" | "기반없음-숨음";

interface BranchText {
  scene: string;
  conclusion: string;
}

const BRANCH_TEXT: Record<BranchKey, BranchText> = {
  "기반있음-뚜렷": {
    scene: "이 사람은 스스로에 대한 기반이 비교적 단단한 편이라, 마음이 흔들려도 완전히 무너지는 일은 잘 없습니다. 다만 마음을 표현하는 데는 거리낌이 없다 보니, 그렇게 꺼낸 마음이 가볍게 여겨지거나 대수롭지 않게 넘어가질 때 유독 서운함이 크게 남습니다.",
    conclusion: "그래서 이 사람에게는, 표현한 마음의 무게를 가볍게 다루지 않는 관계가 오래갑니다.",
  },
  "기반있음-숨음": {
    scene: "이 사람은 스스로에 대한 기반이 단단한 편이지만, 마음을 먼저 적극적으로 드러내지는 않습니다. 그래서 혼자 서운함을 삭이고 넘어가는 일이 잦은데, 정작 그렇게 티도 안 냈던 마음을 상대가 진짜로 모르고 지나갈 때 뒤늦게 마음이 무거워지는 경우가 있습니다.",
    conclusion: "그래서 이 사람에게는, 티 내지 않아도 먼저 알아채고 물어봐 주는 관계가 오래갑니다.",
  },
  "기반없음-뚜렷": {
    scene: "이 사람은 마음을 표현하는 데는 거리낌이 없지만, 스스로를 지탱하는 기반은 상대적으로 여린 편입니다. 그래서 표현한 마음에 상대가 어떻게 반응하느냐에 따라 기분이 크게 오르내리기 쉽고, 작은 반응 하나에도 마음이 크게 흔들릴 수 있습니다.",
    conclusion: "그래서 이 사람에게는, 반응 하나하나에 일희일비하지 않아도 되도록 꾸준한 확인을 주는 관계가 오래갑니다.",
  },
  "기반없음-숨음": {
    scene: "이 사람은 마음을 잘 드러내지 않으면서 동시에 스스로를 지탱하는 기반도 상대적으로 여린 편입니다. 티도 못 내면서 혼자 마음을 다잡아야 하는 상황이 반복되면, 겉으로는 괜찮아 보여도 안에서는 꽤 오래 힘든 시간을 보내고 있을 수 있습니다.",
    conclusion: "그래서 이 사람에게는, 괜찮다는 말을 그대로 믿지 않고 먼저 다가와 살펴주는 관계가 오래갑니다.",
  },
};

/** 深化 — branch별로 "특히 두드러지는 순간" 한 문단 추가. 새 신호 없음. */
const WHEN_IT_SHOWS_BY_BRANCH: Record<BranchKey, string> = {
  "기반있음-뚜렷": "특히 오래 고민하고 어렵게 꺼낸 말을 상대가 대수롭지 않게 넘기거나 농담으로 받을 때, 이 순간이 유독 크게 다가올 수 있습니다.",
  "기반있음-숨음": "특히 며칠을 혼자 삭인 서운함을 나중에 슬쩍 내비쳤는데 상대가 '그런 일이 있었어?' 하고 정말 몰랐다는 반응을 보일 때, 이 순간이 유독 크게 다가올 수 있습니다.",
  "기반없음-뚜렷": "특히 마음을 표현한 직후 상대의 반응이 뜨뜻미지근하거나 답이 늦게 올 때, 그 짧은 시간 동안 여러 생각이 스치며 마음이 크게 흔들릴 수 있습니다.",
  "기반없음-숨음": "특히 힘든 티를 안 냈는데 상대가 평소와 다름없이 무심하게 지나갈 때, 겉으로는 티 안 내면서도 속으로는 오래 그 순간을 곱씹게 될 수 있습니다.",
};

export function generateLoveHurtPointNarrative(appData: AppData, gender: "male" | "female"): LoveHurtPointNarrativeResult {
  const star = analyzeSpouseStar(appData.user, gender);
  const root = analyzeRoot(appData.user);
  const { exposure } = star;

  if (exposure === "미미") {
    // ①(나는 사랑할 때 어떤 사람인가)의 exposure=미미 문장과 문형이
    // 거의 같아("이 부분만으로는 ~ 뚜렷하게 나타나지 않습니다. ~는
    // 다른 부분에서 더 분명하게 드러날 수 있습니다") 2026-09 第四章
    // 반복 정리에서 표현만 갈랐다 — "이 축 신호가 부족해 이 질문은
    // 단정 못 한다"는 같은 뜻을 이 섹션의 주제(마음이 흔들리는 순간)에
    // 맞춰 다르게 적었을 뿐, 판정(exposure=미미)이나 근거는 그대로다.
    return {
      paragraphs: [
        {
          text: "이 축의 신호만으로는 이 사람이 관계 안에서 유독 어떤 순간에 마음이 흔들리는지까지는 짚어내기 어렵습니다. 그 지점은 앞서 살펴본 다른 결에서 이미 더 뚜렷하게 드러났을 수 있습니다.",
          sourceNote: `exposure=미미(단정보류형), hasRoot=${root.hasRoot}`,
        },
      ],
    };
  }

  // [2026-09 문장 충돌 수정] ①(loveApproachStyleNarrative.ts)은 exposure
  // (뚜렷/숨음/미미) 위에 더 세밀한 shape(visible/rooted/hidden/none)
  // 신호까지 반영해 "속마음과 겉모습 사이 차이" 문장을 얹는데, 이
  // 섹션은 그동안 exposure만 보고 있어서 — exposure=뚜렷이면서
  // shape=hidden인 사람(예: 이서연)에게 ①은 "바로 안 드러난다"고
  // 해놓고 이 섹션은 "표현에 거리낌이 없다"고 말해 서로 부딪혔다.
  // 최소 수정: shape=hidden일 때만 뚜렷→숨음으로 넘긴다(반대 방향
  // 오버라이드는 아직 확인된 충돌 사례가 없어 건드리지 않는다) — 같은
  // star 객체에서 ①과 정확히 동일한 함수로 계산해 새 판정을 만들지
  //않는다. exposure 자체(계산값)는 그대로 유지, 이 파일 안의 문장
  // 선택 분기에만 쓴다.
  const focus = subtypeFocusOf(star);
  const shape = exposureShapeOf(star, focus);
  const exposureSide = exposure === "뚜렷" ? "뚜렷" : "숨음";
  const effectiveSide = shape === "hidden" ? "숨음" : exposureSide;
  const branchKey: BranchKey = `${root.hasRoot ? "기반있음" : "기반없음"}-${effectiveSide}`;
  const t = BRANCH_TEXT[branchKey];
  const noteHead = `hasRoot=${root.hasRoot}, exposure=${exposure}, shape=${shape}(focus=${focus})`;

  return {
    paragraphs: [
      { text: t.scene, sourceNote: noteHead },
      { text: WHEN_IT_SHOWS_BY_BRANCH[branchKey], sourceNote: `두드러지는 순간(branch=${branchKey})` },
      { text: t.conclusion, sourceNote: `${branchKey} 결론` },
    ],
  };
}
