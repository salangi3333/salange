import { AppData } from "./sajuContent";
import { analyzeDayMasterBalance, BalanceVerdict } from "./dayMasterBalanceAnalysis";
import { analyzeRoot } from "./natalStructure";

/**
 * 사랑·인연 새 하위 섹션("앞으로 사랑이 편해지는 방법") — 第四章 확장
 * (승인된 작업, 2026-09). 이 섹션은 새 신호를 계산하지 않고, 이 챕터
 * 안에서 이미 계산된 두 값(balance/hasRoot — ③"관계가 깊어졌을 때의 나",
 * ⑤"내가 사랑에서 상처받는 지점"이 각각 쓰는 값)을 다시 읽어 "그래서
 * 무엇이 이 사람에게 실제로 도움이 되는가"로 마무리 짓는 종합 문단이다.
 * 두 섹션의 문장을 반복하지 않도록, "그릇(balance)"과 "기반(hasRoot)"을
 * 조합했을 때의 실천 조언만 새로 쓴다 — 누구에게나 적용되는 일반 연애
 * 조언(대화를 많이 하세요 등)은 쓰지 않는다.
 *
 * 1차 분기: balance===hold면 판정보류형(짧게). 그 외에는 balanceGroup
 * (신강계열/신약계열/중화) × hasRoot(있음/없음) 총 6갈래.
 */

export interface NarrativeParagraph {
  text: string;
  sourceNote: string;
}

export interface LoveGoingForwardNarrativeResult {
  paragraphs: NarrativeParagraph[];
}

type BalanceGroup = "신강계열" | "신약계열" | "중화";
function balanceGroupOf(balance: BalanceVerdict): BalanceGroup {
  if (balance === "clearlyStrong" || balance === "slightlyStrong") return "신강계열";
  if (balance === "clearlyWeak" || balance === "slightlyWeak") return "신약계열";
  return "중화";
}

type BranchKey = `${BalanceGroup}-${"기반있음" | "기반없음"}`;

const TEXT: Record<BranchKey, string> = {
  "신강계열-기반있음": "이 사람은 스스로 감당하는 힘도, 스스로를 지탱하는 기반도 이미 단단한 편입니다. 그래서 관계를 편하게 만드는 데 필요한 건 더 애쓰는 게 아니라, 가진 여유를 상대에게도 나눠주는 방향입니다. 먼저 묻고, 먼저 맞춰보는 시도가 이 사람에게는 오히려 자연스럽게 다가올 수 있습니다.",
  "신강계열-기반없음": "이 사람은 감당하는 힘은 큰 편이지만, 스스로를 지탱하는 기반은 상대적으로 여린 편입니다. 그래서 관계 안에서 씩씩해 보이는 모습과 달리, 안에서는 상대의 반응에 의외로 흔들릴 수 있습니다. 힘든 순간을 굳이 혼자 삭이지 않고 그대로 표현해 보는 것이 이 사람에게는 관계를 더 편하게 만듭니다.",
  "중화-기반있음": "이 사람은 관계에서 힘을 크게 많이 쓰지도, 크게 여유롭지도 않으면서 스스로를 지탱하는 기반은 단단한 편입니다. 그래서 관계가 편해지는 방법은 특별한 노력보다, 지금의 균형 잡힌 태도를 꾸준히 이어가는 데 있습니다.",
  "중화-기반없음": "이 사람은 관계에서 힘을 크게 많이 쓰지도, 크게 여유롭지도 않은 편인데, 스스로를 지탱하는 기반은 상대적으로 여린 편입니다. 그래서 관계가 흔들릴 때 혼자 판단을 서두르기보다, 가까운 사람에게 지금 느끼는 것을 그대로 말해보는 쪽이 이 사람에게는 더 편안한 방향입니다.",
  "신약계열-기반있음": "이 사람은 관계에서 상대에게 맞추는 폭이 넓어지기 쉬운 편이지만, 스스로를 지탱하는 기반만큼은 단단합니다. 그래서 계속 맞춰주기만 하지 않아도 관계가 쉽게 흔들리지 않는다는 걸 스스로 믿어도 됩니다. 가끔은 원하는 것을 먼저 말해보는 시도가 이 사람에게는 관계를 더 편하게 만듭니다.",
  "신약계열-기반없음": "이 사람은 관계에서 상대에게 맞추는 폭도 넓어지기 쉽고, 스스로를 지탱하는 기반도 상대적으로 여린 편입니다. 그래서 관계 안에서 이중으로 힘든 순간이 겹칠 수 있는데, 혼자 다 감당하려 하기보다 믿을 수 있는 사람에게 기대는 것 자체가 이 사람에게는 자연스러운 방향입니다.",
};

export function generateLoveGoingForwardNarrative(appData: AppData): LoveGoingForwardNarrativeResult {
  const { balance } = analyzeDayMasterBalance(appData.user);
  const root = analyzeRoot(appData.user);

  if (balance === "hold") {
    // ③·④의 balance=hold 문장("한 가지로 딱 잘라 말하기 어려운
    // 상태입니다")과 문두가 거의 겹쳐(2026-09 第四章 반복 정리에서 발견)
    // 여기(⑨)만의 질문인 "무엇이 방법이 되는가"로 문두를 옮겼다 — 이어지는
    // 조언(관계마다 그때그때 확인하는 것이 실질적)은 그대로다.
    return {
      paragraphs: [
        {
          text: "지금 이 사람에게 어떤 방법이 도움이 될지는, 감당하는 힘의 크기 자체가 아직 하나로 잡히지 않아 미리 정해두기 어렵습니다. 그래서 특정 방법을 앞세우기보다, 관계마다 그때그때 스스로가 어떤 상태인지 먼저 확인하는 것이 이 사람에게는 가장 실질적인 방법입니다.",
          sourceNote: `balance=hold(판정보류형), hasRoot=${root.hasRoot}`,
        },
      ],
    };
  }

  const group = balanceGroupOf(balance);
  const branchKey: BranchKey = `${group}-${root.hasRoot ? "기반있음" : "기반없음"}`;
  return {
    paragraphs: [
      { text: TEXT[branchKey], sourceNote: `balance=${balance}(${group}), hasRoot=${root.hasRoot}` },
    ],
  };
}
