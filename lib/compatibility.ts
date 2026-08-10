import { Element, ELEMENT_LABEL } from "./hanjaTables";

export type CompatRelation = "generates" | "generatedBy" | "overcomes" | "overcomeBy" | "same";

const GENERATES: Record<Element, Element> = {
  wood: "fire",
  fire: "earth",
  earth: "metal",
  metal: "water",
  water: "wood",
};

const OVERCOMES: Record<Element, Element> = {
  wood: "earth",
  fire: "metal",
  earth: "water",
  metal: "wood",
  water: "fire",
};

export interface CompatibilitySection {
  heading: string;
  text: string;
}

export interface CompatibilityResult {
  relation: CompatRelation;
  score: number;
  headline: string;
  sections: CompatibilitySection[];
  lockedTeaser: string;
}

export function analyzeCompatibility(
  userElement: Element,
  partnerElement: Element,
  userName: string,
  partnerName: string,
  userDayPillar: string,
  partnerDayPillar: string
): CompatibilityResult {
  const userEl = ELEMENT_LABEL[userElement];
  const partnerEl = ELEMENT_LABEL[partnerElement];

  if (userElement === partnerElement) {
    return {
      relation: "same",
      score: 78,
      headline: `${userName}님과 ${partnerName}님은 같은 기운을 타고난 사이`,
      sections: [
        {
          heading: "서로 끌리는 이유",
          text: `${userName}님의 일주는 ${userDayPillar}, ${partnerName}님의 일주는 ${partnerDayPillar}로, 두 분 모두 ${userEl} 기운을 뿌리로 갖고 있습니다. 같은 기운을 타고난 두 사람은 처음 만났을 때부터 낯설지 않은 편안함을 느끼며, 굳이 설명하지 않아도 서로의 리듬과 속도를 자연스럽게 알아챕니다.`,
        },
        {
          heading: "잘 맞는 부분",
          text: `같은 오행이라 취향과 삶의 방식이 비슷하게 흘러가는 경우가 많습니다. 함께 있을 때 무리해서 맞추지 않아도 대화와 일상의 결이 자연스럽게 겹쳐, 굳이 애쓰지 않아도 편안한 시간을 보낼 수 있습니다.`,
        },
        {
          heading: "갈등이 생기는 이유",
          text: `문제는 바로 그 닮음에서 시작됩니다. 같은 기운은 같은 방식으로 반응하기 때문에, 한 사람이 예민해지는 순간 다른 사람도 똑같이 예민해지는 식으로 감정이 겹쳐서 증폭되기 쉽습니다. 특히 의견이 갈릴 때 둘 다 물러서지 않으려는 성향이 부딪히면 사소한 다툼이 길어질 수 있습니다.`,
        },
        {
          heading: "감정 표현 방식",
          text: `두 분 모두 비슷한 방식으로 감정을 표현하고 비슷한 지점에서 서운함을 느낍니다. 감정의 곡선이 겹치는 만큼, 한쪽이 가라앉으면 분위기 전체가 함께 가라앉는 경향이 있어 서로의 기분을 살피는 여유가 필요합니다.`,
        },
        {
          heading: "연애 · 결혼 궁합",
          text: `연애 초반에는 급속도로 가까워지는 편이지만, 결혼처럼 오랜 시간을 함께해야 하는 관계에서는 같은 지점에서 반복해서 부딪히지 않도록 의식적인 조율이 필요합니다. 닮은 두 사람이기에 갈등의 패턴도 반복되기 쉽다는 점을 미리 알아두는 것이 좋습니다.`,
        },
        {
          heading: "관계를 오래 지키는 조언",
          text: `이 조합이 오래가는 커플의 공통점은 한쪽이 먼저 "내가 한 발 물러설게"라고 말할 수 있는 여유를 가진 것입니다. 두 분 중 누가 그 역할을 더 편하게 해낼 수 있는지, 그리고 그 시점이 언제 찾아오는지가 관계의 지속성을 좌우합니다.`,
        },
      ],
      lockedTeaser: `${userName}님과 ${partnerName}님이 가장 자주 부딪히는 상황과, 그 순간 누가 먼저 물러서야 관계가 오래가는지 전체 궁합 리포트에서 확인할 수 있습니다.`,
    };
  }

  if (GENERATES[userElement] === partnerElement) {
    return {
      relation: "generates",
      score: 91,
      headline: `${userName}님이 ${partnerName}님을 키워주는 궁합`,
      sections: [
        {
          heading: "서로 끌리는 이유",
          text: `${userName}님의 일주 ${userDayPillar}(${userEl})는 ${partnerName}님의 일주 ${partnerDayPillar}(${partnerEl})를 자연스럽게 북돋아주는 자리에 있습니다. 오행상 ${userEl}이 ${partnerEl}을 생(生)하는 구조로, ${partnerName}님은 ${userName}님 곁에서 편안함과 안정감을 느끼며 자연스럽게 끌립니다.`,
        },
        {
          heading: "잘 맞는 부분",
          text: `${userName}님이 곁에 있을 때 ${partnerName}님의 기운이 더 크고 편안하게 뻗어나가는 흐름이 만들어집니다. ${partnerName}님이 무언가 시도할 때 ${userName}님이 자연스럽게 힘을 보태는, 서로 무리 없이 스며드는 조합입니다.`,
        },
        {
          heading: "갈등이 생기는 이유",
          text: `관계가 한쪽으로 흐르는 만큼, 시간이 지나며 주는 쪽인 ${userName}님이 지치거나, 받는 쪽인 ${partnerName}님이 그것을 당연하게 여기는 순간부터 갈등이 시작됩니다. 균형이 무너지면 서운함이 쌓이기 쉽습니다.`,
        },
        {
          heading: "감정 표현 방식",
          text: `${userName}님은 말보다 행동으로 마음을 보여주는 경우가 많고, ${partnerName}님은 그 마음을 받아들이는 데 상대적으로 여유가 있어 감정 소모가 적은 편입니다. 다만 이 여유가 무심함으로 오해받지 않도록 가끔은 말로 표현하는 노력이 필요합니다.`,
        },
        {
          heading: "연애 · 결혼 궁합",
          text: `연애에서는 ${userName}님이 이끄는 흐름이 자연스럽지만, 결혼 이후에는 역할이 한쪽으로 고정되지 않도록 서로 주고받는 균형을 새로 맞춰야 오래갑니다. 특히 경제적, 정서적 책임이 한쪽에 쏠리지 않는지 주기적으로 점검하는 것이 좋습니다.`,
        },
        {
          heading: "관계를 오래 지키는 조언",
          text: `${partnerName}님이 받은 만큼 돌려주려는 작은 노력을 기울일 때, 그리고 ${userName}님이 주는 것에 대한 기대를 내려놓을 때 이 관계는 훨씬 편안해집니다. 이 흐름이 가장 강해지는 시기를 아는 것도 관계 유지에 큰 도움이 됩니다.`,
        },
      ],
      lockedTeaser: `이 흐름이 가장 강하게 작용하는 시기와, ${partnerName}님이 ${userName}님에게 무엇으로 보답해야 균형이 맞는지 전체 궁합 리포트에서 확인할 수 있습니다.`,
    };
  }

  if (GENERATES[partnerElement] === userElement) {
    return {
      relation: "generatedBy",
      score: 91,
      headline: `${partnerName}님이 ${userName}님을 채워주는 궁합`,
      sections: [
        {
          heading: "서로 끌리는 이유",
          text: `${partnerName}님의 일주 ${partnerDayPillar}(${partnerEl})는 ${userName}님의 일주 ${userDayPillar}(${userEl})를 자연스럽게 채워주는 자리에 있습니다. 오행상 ${partnerEl}이 ${userEl}을 생(生)하는 구조로, ${userName}님은 별다른 노력 없이도 편안함을 느끼며 끌립니다.`,
        },
        {
          heading: "잘 맞는 부분",
          text: `${userName}님이 지치거나 흔들릴 때 ${partnerName}님이 그 자리를 자연스럽게 채워주는 조합이라, 위기의 순간일수록 이 궁합의 장점이 도드라집니다. ${userName}님 입장에서는 곁에 있는 것만으로 힘을 얻는 든든한 인연입니다.`,
        },
        {
          heading: "갈등이 생기는 이유",
          text: `받는 것에 익숙해진 ${userName}님이 관계에서 수동적인 입장에 머물면, ${partnerName}님이 지치는 시점부터 갈등이 시작됩니다. 주는 쪽의 노력이 당연하게 여겨질 때 관계의 균형이 무너지기 쉽습니다.`,
        },
        {
          heading: "감정 표현 방식",
          text: `${partnerName}님이 먼저 다가가고 챙기는 역할을 자연스럽게 맡고, ${userName}님은 받은 마음을 표현하는 데는 서툰 편이라 오해가 쌓일 수 있습니다. ${userName}님이 고마움을 조금 더 자주 말로 표현하면 관계가 훨씬 부드러워집니다.`,
        },
        {
          heading: "연애 · 결혼 궁합",
          text: `연애 초반엔 ${userName}님이 유난히 편안함을 느끼지만, 결혼 후에는 ${userName}님도 적극적으로 곁을 지키려는 노력을 보여야 관계가 오래갑니다. 받기만 하는 관계는 시간이 지날수록 상대를 지치게 만듭니다.`,
        },
        {
          heading: "관계를 오래 지키는 조언",
          text: `${userName}님이 받은 것을 인식하고 표현하는 습관을 들일 때, ${partnerName}님이 지치지 않고 오래 곁을 지킬 수 있습니다. 어느 시기에, 어떤 방식으로 마음을 표현해야 가장 효과적인지가 관계의 깊이를 결정합니다.`,
        },
      ],
      lockedTeaser: `${partnerName}님이 지치지 않으려면 ${userName}님이 어떤 방식으로 마음을 표현해야 하는지 전체 궁합 리포트에서 확인할 수 있습니다.`,
    };
  }

  if (OVERCOMES[userElement] === partnerElement) {
    return {
      relation: "overcomes",
      score: 58,
      headline: `${userName}님이 주도권을 쥐기 쉬운 궁합`,
      sections: [
        {
          heading: "서로 끌리는 이유",
          text: `${userName}님의 일주 ${userDayPillar}(${userEl})는 ${partnerName}님의 일주 ${partnerDayPillar}(${partnerEl})를 극(剋)하는 구조에 있습니다. ${userName}님의 확신 있는 태도와 분명한 방향성이 ${partnerName}님에게는 처음엔 매력적으로 다가옵니다.`,
        },
        {
          heading: "잘 맞는 부분",
          text: `결정이 필요한 순간, ${userName}님이 방향을 정하고 ${partnerName}님이 따르는 구도가 자연스럽게 만들어져 오히려 효율적인 조합이 되기도 합니다. 빠른 판단이 필요한 상황에서 이 조합의 장점이 드러납니다.`,
        },
        {
          heading: "갈등이 생기는 이유",
          text: `${userEl}이 ${partnerEl}을 누르는 오행 관계라, 의도치 않아도 대화나 결정에서 ${userName}님의 뜻이 앞서고 ${partnerName}님이 점점 목소리를 줄이게 됩니다. 이런 흐름이 굳어지면 대화의 균형이 한쪽으로 완전히 기울 수 있습니다.`,
        },
        {
          heading: "감정 표현 방식",
          text: `${userName}님은 감정을 직설적으로 드러내는 편이고, ${partnerName}님은 부딪히지 않으려 감정을 안으로 삭이는 경우가 많아 표현의 균형이 맞지 않습니다. ${partnerName}님의 침묵을 동의로 오해하지 않는 것이 중요합니다.`,
        },
        {
          heading: "연애 · 결혼 궁합",
          text: `연애 초반의 확신이 결혼 후에는 일방적인 결정 구조로 굳어지기 쉬워, 두 사람 모두 의식적으로 대화의 균형을 맞추는 습관이 필요합니다. 중요한 결정일수록 ${partnerName}님의 의견을 먼저 묻는 것이 좋습니다.`,
        },
        {
          heading: "관계를 오래 지키는 조언",
          text: `${userName}님이 의식적으로 힘을 빼고 ${partnerName}님의 속도와 의견을 앞세워주는 시기를 만들 때, 관계는 훨씬 편안한 균형을 되찾습니다. 이 힘의 쏠림이 가장 크게 나타나는 시기를 아는 것이 관계 관리의 핵심입니다.`,
        },
      ],
      lockedTeaser: `이 힘의 쏠림이 가장 크게 나타나는 시기와, ${userName}님이 힘을 빼야 할 정확한 순간을 전체 궁합 리포트에서 확인할 수 있습니다.`,
    };
  }

  if (OVERCOMES[partnerElement] === userElement) {
    return {
      relation: "overcomeBy",
      score: 58,
      headline: `${partnerName}님에게 눌리기 쉬운 궁합`,
      sections: [
        {
          heading: "서로 끌리는 이유",
          text: `${partnerName}님의 일주 ${partnerDayPillar}(${partnerEl})는 ${userName}님의 일주 ${userDayPillar}(${userEl})를 극(剋)하는 구조에 있습니다. ${partnerName}님의 강한 기운과 확신 있는 태도에 ${userName}님이 처음부터 강하게 끌립니다.`,
        },
        {
          heading: "잘 맞는 부분",
          text: `${partnerName}님이 방향을 제시하고 ${userName}님이 유연하게 맞춰주는 구조라, 결정이 빨리 필요한 상황에서는 오히려 효율적일 수 있습니다. ${userName}님의 유연함이 관계를 부드럽게 만듭니다.`,
        },
        {
          heading: "갈등이 생기는 이유",
          text: `${partnerEl}이 ${userEl}을 누르는 오행 관계라, ${userName}님이 처음엔 강하게 끌리면서도 관계 안에서 스스로를 낮추고 목소리를 줄이는 패턴이 반복될 수 있습니다. 이 패턴이 굳어지면 자기 목소리를 완전히 잃어버리기 쉽습니다.`,
        },
        {
          heading: "감정 표현 방식",
          text: `${userName}님은 맞춰주는 것을 배려라 여기며 감정을 잘 드러내지 않고, 그 결과 서운함이 쌓여도 뒤늦게 터지는 경우가 많습니다. 평소에 작은 감정이라도 미리 표현하는 습관이 필요합니다.`,
        },
        {
          heading: "연애 · 결혼 궁합",
          text: `연애의 설렘이 클수록 결혼 후 균형을 되찾기 어려워질 수 있어, ${userName}님이 초반부터 자기 기준을 분명히 밝히는 것이 중요합니다. 관계가 깊어지기 전에 이 균형을 맞추는 것이 훨씬 수월합니다.`,
        },
        {
          heading: "관계를 오래 지키는 조언",
          text: `${userName}님이 자신의 속도와 기준을 분명히 밝히는 대화를 시도할 때, 눌리는 관계가 아니라 서로 존중하는 관계로 자리잡을 수 있습니다. 어느 시기에 이 대화를 꺼내야 가장 효과적인지가 중요합니다.`,
        },
      ],
      lockedTeaser: `${userName}님이 자기 속도를 지켜야 할 결정적 시기와, 관계의 균형을 되찾는 대화법을 전체 궁합 리포트에서 확인할 수 있습니다.`,
    };
  }

  return {
    relation: "same",
    score: 70,
    headline: `${userName}님과 ${partnerName}님의 궁합`,
    sections: [
      {
        heading: "서로 끌리는 이유",
        text: `${userName}님의 일주 ${userDayPillar}(${userEl})와 ${partnerName}님의 일주 ${partnerDayPillar}(${partnerEl})는 서로 다른 결을 가진 사이라, 처음엔 낯설지만 그만큼 서로에게 없는 매력에 끌립니다.`,
      },
      {
        heading: "잘 맞는 부분",
        text: `다른 방식으로 세상을 보는 두 사람이라, 혼자서는 보지 못했던 시야를 서로에게 넓혀주는 조합입니다. 알아갈수록 상대의 다름이 오히려 신선하게 느껴집니다.`,
      },
      {
        heading: "갈등이 생기는 이유",
        text: `서로 다른 기준과 속도로 인해 같은 상황을 다르게 해석하면서 오해가 쌓일 수 있습니다. 다름을 틀림으로 받아들이는 순간부터 갈등이 시작됩니다.`,
      },
      {
        heading: "감정 표현 방식",
        text: `감정을 표현하는 방식 자체가 달라, 한쪽은 직접적으로 다른 쪽은 은근하게 마음을 전하는 경우가 많습니다. 서로의 표현 방식을 미리 알아두면 오해를 줄일 수 있습니다.`,
      },
      {
        heading: "연애 · 결혼 궁합",
        text: `연애 초반엔 서로의 다름이 신선하게 느껴지지만, 결혼처럼 오랜 시간을 함께할 때는 서로의 표현 방식을 이해하려는 꾸준한 노력이 필요합니다.`,
      },
      {
        heading: "관계를 오래 지키는 조언",
        text: `다르다는 것을 틀림이 아니라 보완으로 받아들일 때, 이 관계는 서로에게 꼭 필요한 균형을 만들어주는 인연이 됩니다.`,
      },
    ],
    lockedTeaser: `두 분이 서로를 가장 잘 이해하게 되는 계기와, 관계가 편안해지기까지 걸리는 시간을 전체 궁합 리포트에서 확인할 수 있습니다.`,
  };
}
