import { AppData } from "./sajuContent";
import { analyzeSpouseStar } from "./spouseStarAnalysis";
import { analyzeDayMasterBalance, BalanceVerdict } from "./dayMasterBalanceAnalysis";
import { buildChapterThreeKey } from "./chapterThreeInterpretation";

/**
 * 사랑·인연 새 하위 섹션("관계가 깊어졌을 때의 나") — 第四章 확장(승인된
 * 작업, 2026-09). 핵심 질문: 겉으로 보이는 모습과, 가까운 사람 앞에서
 * 실제로 드러나는 모습이 얼마나/어떻게 다른가 — 애정 표현과 거리 조절의
 * 결. ①(사랑이 "시작될 때"의 표현 방식)·④(관계 "안에서 반복되는" 장면)와
 * 다른 질문이므로 그 두 챕터의 판정 축(exposure/subtype/shape)을 이
 * 파일에서 새로 쓰지 않는다.
 *
 * 새 계산을 하지 않는다 — 전부 이미 동결된 함수 재호출뿐이다.
 *  - buildChapterThreeKey(appData).gwansal(chapterThreeInterpretation.ts,
 *    관살혼잡 여부 — 편관·정관이 동시에 존재하는 구조). 이 챕터에서는
 *    처음 쓰는 축이다(①~⑤ 어디도 관살혼잡을 참조하지 않는다).
 *  - analyzeDayMasterBalance(user).balance(5단계+보류, 재물5장이 쓰는
 *    것과 동일 함수) — ④가 이미 쓰지만 조합 상대(gwansal)가 달라
 *    실제로 다른 문장 갈래가 나온다.
 *  - analyzeSpouseStar(user, gender).exposure — ①③④⑤가 이미 쓰는
 *    값이지만, 여기서는 판정 축이 아니라 "숨음"일 때만 붙는 보조
 *    부연절로만 쓴다(3차 조정, 판정 자체를 바꾸지 않음).
 *
 * 1차 분기(핵심 판정): balance===hold면 판정보류형. 그 외에는
 * gwansal.present(있음/없음) × balanceGroup(신강계열/신약계열/중화) 총
 * 6갈래 — 여러 기준을 동시에 감당해야 하는 구조(관살혼잡)가 있는 사람과
 * 없는 사람이, 그 압박을 감당할 그릇(신강/신약/중화)에 따라 가까운
 * 관계에서 실제로 다르게 나타난다는 것이 이 섹션의 핵심 통찰이다.
 *
 * 안전 원칙: "항상/반드시/운명적으로" 금지. 실제 다툼·이별 등 계산에
 * 없는 구체적 사건을 만들지 않는다. 명리 용어(관살혼잡/신강/신약/편관/
 * 정관 등)는 고객 문장에 노출하지 않고 sourceNote에만 남긴다.
 */

export interface NarrativeParagraph {
  text: string;
  sourceNote: string;
}

export interface LoveDeepeningNarrativeResult {
  paragraphs: NarrativeParagraph[];
}

type BalanceGroup = "신강계열" | "신약계열" | "중화";
function balanceGroupOf(balance: BalanceVerdict): BalanceGroup {
  if (balance === "clearlyStrong" || balance === "slightlyStrong") return "신강계열";
  if (balance === "clearlyWeak" || balance === "slightlyWeak") return "신약계열";
  return "중화";
}

type BranchKey = `${"관살혼잡있음" | "관살혼잡없음"}-${BalanceGroup}`;

interface BranchText {
  scene: string;
  conclusion: string;
}

const BRANCH_TEXT: Record<BranchKey, BranchText> = {
  "관살혼잡있음-신강계열": {
    scene: "이 사람은 원래 동시에 여러 기준과 압박을 짊어지기 쉬운 구조를 갖고 있는데, 그걸 받쳐줄 그릇도 함께 큰 편입니다. 그래서 가까운 사이가 되어도 크게 흔들리는 모습을 잘 보이지 않고, 여러 요구를 동시에 받아도 겉으로는 유들유들하게 넘기는 경우가 많습니다. 다만 그 안에서는 '이번엔 어느 기준을 먼저 맞출지'를 계속 저울질하고 있을 수 있습니다.",
    conclusion: "그래서 이 사람에게는, 겉으로 잘 버틴다고 해서 정말 아무렇지 않은 건 아니라는 걸 알아봐 주는 관계가 오래갑니다.",
  },
  "관살혼잡있음-신약계열": {
    scene: "이 사람은 원래 동시에 여러 기준과 압박을 짊어지기 쉬운 구조인데, 그걸 받쳐줄 그릇은 상대적으로 여린 편입니다. 그래서 관계가 가까워질수록 상대의 기대, 주변의 시선, 스스로 정한 기준까지 한꺼번에 신경 쓰다가 지치는 순간이 잦아지기 쉽습니다. 좋아서 시작한 관계인데도 어느새 버거운 숙제처럼 느껴지는 때가 올 수 있습니다.",
    conclusion: "그래서 이 사람에게는, 한 번에 하나씩만 맞춰도 된다고 먼저 말해주는 관계가 훨씬 편안합니다.",
  },
  "관살혼잡있음-중화": {
    scene: "이 사람은 원래 동시에 여러 기준과 압박을 짊어지기 쉬운 구조를 갖고 있고, 그걸 감당하는 힘도 크게 넘치거나 모자라지 않은 편입니다. 그래서 가까운 관계에서 여러 요구가 겹칠 때 완전히 무너지지도, 완전히 태연하지도 않은, 그때그때 균형을 맞춰가려는 모습을 보이기 쉽습니다.",
    conclusion: "그래서 이 사람에게는, 그 균형을 잡으려는 노력 자체를 알아채 주는 관계가 잘 맞습니다.",
  },
  "관살혼잡없음-신강계열": {
    scene: "이 사람은 여러 기준에 동시에 눌리는 구조는 아니고, 감당하는 힘도 큰 편입니다. 그래서 관계가 가까워질수록 오히려 눈치를 덜 보고 자기 색을 더 분명하게 드러내는 쪽에 가깝습니다. 처음엔 조심스럽다가도, 편해질수록 하고 싶은 말과 원하는 방식을 더 뚜렷하게 표현하게 됩니다.",
    conclusion: "그래서 이 사람에게는, 그 솔직해지는 모습을 부담스러워하지 않고 그대로 받아주는 관계가 잘 맞습니다.",
  },
  "관살혼잡없음-신약계열": {
    scene: "이 사람은 여러 기준에 동시에 눌리는 구조는 아니지만, 감당하는 힘 자체는 상대적으로 여린 편입니다. 그래서 관계가 가까워질수록 상대에게 맞추는 폭이 조금씩 넓어지기 쉽고, 갈등을 만들기보다 스스로 조정하는 쪽을 먼저 택하게 됩니다.",
    conclusion: "그래서 이 사람에게는, 계속 맞춰주기만 하지 않아도 괜찮다고 먼저 알려주는 관계가 더 오래갑니다.",
  },
  "관살혼잡없음-중화": {
    scene: "이 사람은 여러 기준에 동시에 눌리는 구조도 아니고, 감당하는 힘도 크게 치우치지 않은 편입니다. 그래서 관계가 가까워져도 극적인 변화 없이, 처음의 태도와 크게 다르지 않은 모습을 꾸준히 보여주는 쪽에 가깝습니다.",
    conclusion: "그래서 이 사람에게는, 특별한 이벤트보다 한결같음을 알아봐 주는 관계가 잘 맞습니다.",
  },
};

/** 深化 — branch별로 "실제로 이런 모습이 나타나는 구체적 순간" 한 문단
 * 추가. 새 신호 없음, 같은 branch를 실생활 장면에 한 번 더 적용. */
const CONCRETE_MOMENT_BY_BRANCH: Record<BranchKey, string> = {
  "관살혼잡있음-신강계열": "예를 들어 회사 일과 가족 일, 연인과의 약속이 같은 날 겹쳐도 겉으로는 크게 동요하지 않고 순서를 정해 하나씩 처리해내는 모습으로 나타나기 쉽습니다.",
  "관살혼잡있음-신약계열": "예를 들어 상대의 부탁, 가족의 기대, 스스로 정한 계획이 동시에 몰리면 다 들어주려다 정작 자기 몫은 뒤로 미루고 지쳐 있는 모습으로 나타나기 쉽습니다.",
  "관살혼잡있음-중화": "예를 들어 여러 일정이 겹치는 날, 완전히 무너지지도 완전히 태연하지도 않게 우선순위를 조정하며 하루를 넘기는 모습으로 나타나기 쉽습니다.",
  "관살혼잡없음-신강계열": "예를 들어 처음 몇 번은 상대에게 맞추다가도, 편해질수록 원하는 약속 장소나 하고 싶은 말을 스스럼없이 먼저 꺼내는 모습으로 나타나기 쉽습니다.",
  "관살혼잡없음-신약계열": "예를 들어 원래 가고 싶었던 곳이 있어도 상대가 다른 곳을 말하면 별말 없이 맞춰주는 쪽을 택하는 모습으로 반복해서 나타나기 쉽습니다.",
  "관살혼잡없음-중화": "예를 들어 특별한 기념일이 아니어도, 만난 지 얼마 안 됐을 때와 비슷한 태도로 상대를 대하는 모습이 시간이 지나도 크게 변하지 않고 이어지기 쉽습니다.",
};

const HIDDEN_CLAUSE =
  " 다만 이런 변화를 먼저 말로 표현하는 편은 아니라서, 상대가 먼저 알아채 주지 않으면 이 사람 안에서만 조용히 지나갈 수 있습니다.";

export function generateLoveDeepeningNarrative(appData: AppData, gender: "male" | "female"): LoveDeepeningNarrativeResult {
  const key = buildChapterThreeKey(appData);
  const balanceResult = analyzeDayMasterBalance(appData.user);
  const star = analyzeSpouseStar(appData.user, gender);
  const { balance } = balanceResult;

  if (balance === "hold") {
    return {
      paragraphs: [
        {
          text: "이 사람이 관계 안에서 얼마나 크게, 또 어떻게 여유를 갖는지는 한 가지로 딱 잘라 말하기 어려운 상태입니다. 여러 힘이 팽팽하게 맞서 있어, 관계마다 혹은 시기마다 가까워졌을 때의 모습이 다르게 나타날 수 있습니다.",
          sourceNote: `balance=hold(판정보류형), gwansal=${key.gwansal.present}`,
        },
        {
          text: "그래서 이 부분은 특정한 패턴으로 단정하기보다, 실제 관계 안에서 그때그때 드러나는 결 자체를 지켜보는 편이 더 정확합니다.",
          sourceNote: "판정보류형 결론",
        },
      ],
    };
  }

  const group = balanceGroupOf(balance);
  const branchKey: BranchKey = `${key.gwansal.present ? "관살혼잡있음" : "관살혼잡없음"}-${group}`;
  const t = BRANCH_TEXT[branchKey];
  const hiddenClause = star.exposure === "숨음" ? HIDDEN_CLAUSE : "";
  const noteHead = `gwansal=${key.gwansal.present}, balance=${balance}(${group}), exposure=${star.exposure}`;

  return {
    paragraphs: [
      { text: `${t.scene}${hiddenClause}`, sourceNote: noteHead },
      { text: CONCRETE_MOMENT_BY_BRANCH[branchKey], sourceNote: `구체적순간(branch=${branchKey})` },
      { text: t.conclusion, sourceNote: `${branchKey} 결론` },
    ],
  };
}
