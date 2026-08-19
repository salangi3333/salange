import { StoryScene } from "@/types/story";
import { AppData } from "./sajuContent";
import { GAN_PROFILE } from "./ganZhiProfiles";
import {
  Element,
  ELEMENT_LABEL,
  GAN_ELEMENT,
  elementThatGenerates,
  elementThatOvercomes,
} from "./hanjaTables";
import {
  buildElementAnalysis,
  buildPersonalTraitNotes,
  buildTenYearFortune,
} from "./aiLifeReport";

function firstSentence(text: string): string {
  const idx = text.indexOf(".");
  if (idx === -1) return text;
  return text.slice(0, idx + 1);
}

/** Splits a paragraph into its opening sentence (for use as a headline)
 * and the remainder, so the same sentence never appears twice on screen. */
function splitHeadline(text: string): { headline: string; rest: string } {
  const headline = firstSentence(text);
  const rest = text.slice(headline.length).trim();
  return { headline, rest };
}

// ── 챕터별 "짚고 넘어가야 할 부분(fact)" / "지금 필요한 방향(action)" / 두 번째 현실 사례 ──
// 오행 5갈래로 성격화된 짧은 문장 테이블. gan/zhi별 손수 작성된 storyblocks 콘텐츠와
// 결합해 챕터마다 사실 지적 + 행동 조언 + 복수의 현실 사례를 갖추기 위한 보조 데이터다.
// calculateSaju의 산출값(dayElement)에 따라 선택될 뿐, 새로운 명리 계산은 하지 않는다.
//
// [PART 1 폴리싱] CH1_FACT / CH1_ACTION / CH1_INNER_EXAMPLE 세 표만, 기존 문장을
// 새로 쓰지 않고 다음 원칙으로만 다듬었다: ① 5개 원소가 공유하던 동일한 템플릿
// 문장(마무리 인사말 등)을 삭제, ② 같은 뜻을 반복하던 문장 중 하나를 삭제,
// ③ 남은 문장은 표현만 다듬어 압축. 문장 내용·의미는 새로 만들지 않았다.
const CH1_FACT: Record<Element, string> = {
  wood: "곧게 뻗어가려는 힘이 강한 만큼, 방향을 스스로 정하지 못할 때 남들보다 쉽게 지칩니다.",
  fire: "밝게 타오르는 만큼, 감정이 앞서는 순간 판단이 먼저 흐려집니다.",
  earth: "묵묵히 버티는 힘이 강한 만큼, 힘들다는 말은 한계에 다다라서야 겨우 나옵니다.",
  metal: "원칙을 지키려는 힘이 강한 만큼, 상대의 실수는 오래도록 마음에 남습니다.",
  water: "상황에 맞춰 흐르는 힘이 강한 만큼, 정작 중요한 타이밍은 자주 놓칩니다.",
};
// [완성도 작업] 무료 리포트에서 구체적 실행 지침(2~4단계)이 유료 "처방"
// 파트와 겹친다는 지적에 따라, 방향을 암시하는 한 줄만 남기고 구체적인
// 방법(몇 번째 문장)은 걷어냈다. 새 문장을 짓지 않고 기존 문장의 핵심
// 어구만 서술형으로 다듬었다.
const CH1_ACTION: Record<Element, string> = {
  wood: "방향을 스스로 정하는 연습이 필요한 때입니다.",
  fire: "감정이 가라앉을 시간을 가져볼 필요가 있습니다.",
  earth: "속마음을 한 번쯤 꺼내볼 필요가 있습니다.",
  metal: "상대의 입장을 한 번 더 헤아려볼 필요가 있습니다.",
  water: "스스로 기준을 세워보는 것이 필요한 때입니다.",
};
// ResultLandingV2의 01 챕터(reportMapper.ts)가 "장점이 되는 순간"에 직접
// 재사용하기 위해 export한다 — buildFullStoryScenes 내부 구성은 그대로다.
export const CH1_STRENGTH: Record<Element, string> = {
  wood: "이 힘이 좋은 방향으로 쓰일 때는 새로운 것을 두려워하지 않는 추진력으로 나타납니다.\n남들이 망설이는 순간에도 먼저 움직이는 사람이 바로 당신입니다.\n실제로 많은 기회가, 이 추진력 하나로 시작됩니다.",
  fire: "이 힘이 좋은 방향으로 쓰일 때는 주변을 밝히는 에너지로 나타납니다.\n당신이 있는 자리는 유독 분위기가 살아나는 것을 사람들이 먼저 느낍니다.\n실제로 많은 인연이, 이 에너지 하나로 시작됩니다.",
  earth: "이 힘이 좋은 방향으로 쓰일 때는 누구도 흔들 수 없는 신뢰로 나타납니다.\n사람들이 힘든 순간 가장 먼저 찾는 사람이 바로 당신입니다.\n실제로 많은 관계가, 이 신뢰 하나로 오래갑니다.",
  metal: "이 힘이 좋은 방향으로 쓰일 때는 정확하고 흔들림 없는 판단력으로 나타납니다.\n복잡한 상황일수록 당신의 결정이 하나의 기준이 됩니다.\n실제로 많은 문제가, 이 판단력 하나로 정리됩니다.",
  water: "이 힘이 좋은 방향으로 쓰일 때는 어떤 환경에서도 적응하는 유연함으로 나타납니다.\n변화 앞에서 가장 빠르게 자리를 잡는 사람이 바로 당신입니다.\n실제로 많은 기회가, 이 유연함 하나로 열립니다.",
};
const CH1_EXAMPLE2: Record<Element, string> = {
  wood: "예를 들어 새로운 프로젝트 앞에서는 누구보다 먼저 나서지만, 정작 그 방향을 누군가 가로막으면 평소와 다르게 날카로워지는 모습을 보입니다.",
  fire: "예를 들어 사람들 앞에서는 밝고 에너지 넘치지만, 혼자 있는 시간에는 그 에너지를 채우기 위해 조용히 지치는 순간을 자주 겪습니다.",
  earth: "예를 들어 어떤 상황에서도 흔들리지 않는 사람처럼 보이지만, 정작 혼자 있을 때는 쌓아둔 걱정을 오래 곱씹는 편입니다.",
  metal: "예를 들어 냉철하고 흔들림 없는 사람으로 보이지만, 스스로 세운 기준에 미치지 못했을 때는 누구보다 자신에게 엄격해집니다.",
  water: "예를 들어 두루 잘 지내는 사람처럼 보이지만, 정작 마음을 여는 상대는 극히 소수로 제한하는 경향이 있습니다.",
};

// ── 第一章 전용 "현실 장면" 테이블 — 명리 설명이 아니라, 사용자가 실제로
// 겪었을 법한 구체적 장면으로 서술한다. 선녀가 짧게 말을 건네고, 사용자를
// 바라보듯 멈췄다가 다시 이어가는 리듬을 만들기 위해 문장을 짧게 끊는다.
const CH1_OPEN_SCENE: Record<Element, string> = {
  wood: "사람들은 당신을 보면 자연스럽게 기댑니다.\n방향을 정해주는 사람이라고 느끼기 때문입니다.\n처음 만난 자리에서도, 대화를 이끄는 쪽은 대부분 당신입니다.\n이건 우연이 아니라, 사주에 새겨진 결입니다.",
  fire: "사람들은 당신을 보면 금방 끌립니다.\n표현하지 않아도 존재감이 느껴지기 때문입니다.\n처음 만난 자리에서도, 분위기는 자연스럽게 당신 쪽으로 흘러갑니다.\n이건 우연이 아니라, 사주에 새겨진 결입니다.",
  earth: "사람들은 당신을 보면 마음을 놓습니다.\n무슨 일이 있어도 흔들리지 않을 것 같기 때문입니다.\n처음 만난 자리에서도, 사람들이 자연스럽게 곁에 앉습니다.\n이건 우연이 아니라, 사주에 새겨진 결입니다.",
  metal: "사람들은 당신을 보면 신뢰부터 합니다.\n말과 행동에 빈틈이 없기 때문입니다.\n처음 만난 자리에서도, 사람들은 당신의 판단을 먼저 물어봅니다.\n이건 우연이 아니라, 사주에 새겨진 결입니다.",
  water: "사람들은 당신을 보면 편안해합니다.\n어떤 이야기를 해도 받아줄 것 같기 때문입니다.\n처음 만난 자리에서도, 사람들이 먼저 말을 걸어옵니다.\n이건 우연이 아니라, 사주에 새겨진 결입니다.",
};

// ResultLandingV2의 01 챕터가 "관계에서 실제로 어떻게 나타나는지"에 재사용.
export const CH1_TRUTH_SCENE: Record<Element, string> = {
  wood: "하지만 가까워질수록, 다른 말이 나옵니다.\n“생각보다 고집이 세다”는 말입니다.\n이끄는 힘이, 때로는 벽처럼 느껴지기 때문입니다.\n좋은 뜻으로 한 행동이, 다르게 읽힐 때가 있다는 뜻입니다.",
  fire: "하지만 가까워질수록, 다른 말이 나옵니다.\n“속마음을 모르겠다”는 말입니다.\n밝은 겉모습 안에, 쉽게 보여주지 않는 부분이 있기 때문입니다.\n좋은 뜻으로 한 행동이, 다르게 읽힐 때가 있다는 뜻입니다.",
  earth: "하지만 가까워질수록, 다른 말이 나옵니다.\n“답답할 때가 있다”는 말입니다.\n감정을 꾹 참는 모습이, 오히려 거리감을 만들기 때문입니다.\n좋은 뜻으로 한 행동이, 다르게 읽힐 때가 있다는 뜻입니다.",
  metal: "하지만 가까워질수록, 다른 말이 나옵니다.\n“차갑게 느껴진다”는 말입니다.\n정확함을 지키려는 태도가, 냉정함으로 비칠 때가 있기 때문입니다.\n좋은 뜻으로 한 행동이, 다르게 읽힐 때가 있다는 뜻입니다.",
  water: "하지만 가까워질수록, 다른 말이 나옵니다.\n“진심을 모르겠다”는 말입니다.\n누구에게나 맞춰주는 태도가, 오히려 진심을 가리기 때문입니다.\n좋은 뜻으로 한 행동이, 다르게 읽힐 때가 있다는 뜻입니다.",
};

// ResultLandingV2의 01 챕터가 "문제가 되는 순간"에 재사용.
export const CH1_ALONE_SCENE: Record<Element, string> = {
  wood: "혼자 결정을 떠안는 시간이 길어질수록,\n아무도 모르게 지쳐가는 경우가 많습니다.\n앞에서는 늘 괜찮아 보이기 때문에, 아무도 눈치채지 못합니다.\n정작 가장 지쳐 있는 순간에도, 제일 늦게 티가 나는 쪽은 당신입니다.",
  fire: "혼자 견디는 시간이 길어질수록,\n아무도 모르게 에너지가 바닥나는 경우가 많습니다.\n밝은 모습 뒤에서 조용히 소진되고 있다는 걸, 정작 본인도 늦게 알아차립니다.\n정작 가장 지쳐 있는 순간에도, 제일 늦게 티가 나는 쪽은 당신입니다.",
  earth: "혼자 삼키는 시간이 길어질수록,\n마음속에 말 못 할 것들이 쌓여가는 경우가 많습니다.\n괜찮다는 말이 습관이 되어, 정작 힘든 순간을 놓치게 됩니다.\n정작 가장 지쳐 있는 순간에도, 제일 늦게 티가 나는 쪽은 당신입니다.",
  metal: "혼자 판단을 내리는 시간이 길어질수록,\n스스로에게 더 엄격해지는 경우가 많습니다.\n실수를 용납하지 않는 태도가, 결국 자기 자신을 가장 힘들게 합니다.\n정작 가장 지쳐 있는 순간에도, 제일 늦게 티가 나는 쪽은 당신입니다.",
  water: "혼자 맞춰주는 시간이 길어질수록,\n정작 자신이 원하는 것을 잊어버리는 경우가 많습니다.\n모두에게 맞추다 보면, 자기 자신과는 점점 멀어집니다.\n정작 가장 지쳐 있는 순간에도, 제일 늦게 티가 나는 쪽은 당신입니다.",
};

// 겉모습과 실제 마음의 간격을 보여주는 장면 — ch1 InsightScene 전용 현실 사례.
// [PART 1 폴리싱] 반복되던 "쪽도 당신입니다" 꼬리표와 수식어(누구보다/정작 등)를
// 덜어내 표현만 압축했다. 문장이 말하는 내용은 그대로다.
const CH1_INNER_EXAMPLE: Record<Element, string> = {
  wood: "회의에서는 확신에 찬 목소리로 말하지만,\n집에 돌아오면 그 선택을 몇 번이고 다시 확인합니다.",
  fire: "사람들 앞에서는 망설임 없이 웃어넘기지만,\n혼자 있을 땐 방금 나눈 대화를 오래 곱씹습니다.",
  earth: "누구에게나 한결같은 태도를 보이지만,\n그걸 유지하려 얼마나 애쓰는지는 아무도 모릅니다.",
  metal: "실수 없는 사람처럼 보이지만,\n스스로 정한 기준에 못 미치면 누구보다 오래 자책합니다.",
  water: "모두와 무난하게 지내는 것처럼 보이지만,\n진심을 다 보여준 사람은 손에 꼽습니다.",
};

// 강점 장면 전용 현실 사례 — 현재는 InsightScene 압축 과정에서 사용하지 않지만
// 데이터 자체는 삭제하지 않고 보존한다.
const CH1_STRENGTH_EXAMPLE: Record<Element, string> = {
  wood: "실제로 팀 안에서 방향이 흔들릴 때, 가장 먼저 나서서 정리하는 쪽은 당신입니다.\n다른 사람들은 그제야 안도합니다.\n정작 본인은, 이걸 대단한 일이라고 생각하지 않습니다.",
  fire: "실제로 분위기가 가라앉은 자리에서, 먼저 말을 꺼내는 쪽은 당신입니다.\n다른 사람들은 그제야 편해집니다.\n정작 본인은, 이걸 대단한 일이라고 생각하지 않습니다.",
  earth: "실제로 다들 힘들어하는 시기에, 가장 먼저 연락을 받는 사람은 당신입니다.\n다른 사람들은 그제야 마음을 놓습니다.\n정작 본인은, 이걸 대단한 일이라고 생각하지 않습니다.",
  metal: "실제로 복잡하게 얽힌 문제 앞에서, 가장 먼저 정리해주는 쪽은 당신입니다.\n다른 사람들은 그제야 방향을 찾습니다.\n정작 본인은, 이걸 대단한 일이라고 생각하지 않습니다.",
  water: "실제로 의견이 갈리는 자리에서, 자연스럽게 중간을 잡아주는 쪽은 당신입니다.\n다른 사람들은 그제야 대화가 풀립니다.\n정작 본인은, 이걸 대단한 일이라고 생각하지 않습니다.",
};

// 5개 원소가 공유하던 동일 도입/마무리 문장("관계에서 반복되는 문제는
// 상대에게만 있지 않습니다." / "이 부분은 짚고 넘어가야...")을 지우고
// 원소별로 다른 가운데 두 문장만 남겼다.
const CH2_FACT: Record<Element, string> = {
  wood: "이끌려는 마음이 강한 만큼, 상대의 속도를 기다려주지 못하는 순간이 자주 있었을 겁니다.\n좋은 의도였더라도, 상대는 떠밀리는 느낌을 받았을 수 있습니다.",
  fire: "뜨겁게 다가가다가도 식으면 급격히 거리를 두는 패턴이 여러 번 반복되었을 겁니다.\n상대는 그 온도 차를 자신 탓으로 오해했을 수 있습니다.",
  earth: "너무 오래 참다가 한 번에 터뜨리는 방식이 관계를 더 어렵게 만든 적이 있을 겁니다.\n상대는 예고 없는 그 순간에 당황했을 가능성이 큽니다.",
  metal: "기준에 맞지 않으면 마음을 쉽게 닫아버리는 패턴이 반복되었을 겁니다.\n상대는 이유도 모른 채 거리가 생겼다고 느꼈을 수 있습니다.",
  water: "맞춰주는 데 익숙해져 정작 자신의 마음은 뒤로 미뤄둔 순간이 많았을 겁니다.\n상대는 오히려 진심을 알기 어렵다고 느꼈을 수 있습니다.",
};
const CH2_ACTION: Record<Element, string> = {
  wood: "한 걸음 물러나 지켜보는 여유가 필요합니다.",
  fire: "멀어지기 전에\n한 번 더 대화해 보세요.",
  earth: "그때그때 마음을 표현하는 것이 필요합니다.",
  metal: "판단보다 질문을 먼저 던져보는 것이 필요합니다.",
  water: "자신의 마음도 먼저 살피는 것이 필요합니다.",
};
export const CH2_STRENGTH: Record<Element, string> = {
  wood: "이 성향의 가장 큰 장점은, 관계 안에서 방향을 잃은 사람들에게 믿고 따를 수 있는 중심이 되어준다는 점입니다.",
  fire: "이 성향의 가장 큰 장점은, 어색한 자리도 순식간에 편안하게 만드는 힘입니다. 당신 곁에서는 낯가림도 오래가지 않습니다.",
  earth: "이 성향의 가장 큰 장점은, 한번 맺은 인연을 끝까지 책임지는 태도입니다. 오래 알수록 더 깊어지는 신뢰가 당신의 무기입니다.",
  metal: "이 성향의 가장 큰 장점은, 겉치레 없이 진심만을 주고받는 관계를 만든다는 점입니다. 소수와의 관계가 깊고 단단합니다.",
  water: "이 성향의 가장 큰 장점은, 누구와도 자연스럽게 어울리는 융통성입니다. 어느 자리에서도 이질감 없이 스며듭니다.",
};
export const CH2_EXAMPLE2: Record<Element, string> = {
  wood: "예를 들어 팀 프로젝트에서는 자연스럽게 방향을 제시하지만, 친한 사이에서는 그 주도권 때문에 오히려 서운함을 사는 경우가 있습니다.",
  fire: "예를 들어 처음 만난 자리에서는 누구보다 빨리 친해지지만, 시간이 지날수록 그 관계를 꾸준히 챙기는 데는 에너지가 부족해지곤 합니다.",
  earth: "예를 들어 오래된 인연에게는 한없이 든든하지만, 새로운 사람과 가까워지는 데는 유독 시간이 오래 걸립니다.",
  metal: "예를 들어 신뢰하는 소수에게는 깊이 마음을 열지만, 그 기준에 들지 못한 사람에게는 거리를 쉽게 좁히지 않습니다.",
  water: "예를 들어 누구와도 무난하게 지내지만, 정작 갈등이 생겼을 때는 정면으로 부딪히기보다 자연스럽게 거리를 두는 방식을 택합니다.",
};

// 동일 도입 문장("돈을 만드는 힘과 돈을 지키는 힘은 다릅니다.")을 지우고
// 원소별로 다른 두 문장만 남겼다.
const CH3_FACT: Record<Element, string> = {
  wood: "돈은 들어오는 편입니다.\n하지만 들어온 만큼 나가는 속도도 빠릅니다.",
  fire: "돈은 들어오는 편입니다.\n하지만 들어온 만큼 나가는 속도도 빠릅니다.",
  earth: "돈은 들어오는 편입니다.\n하지만 들어온 만큼 나가는 속도도 빠릅니다.",
  metal: "돈은 들어오는 편입니다.\n하지만 들어온 만큼 나가는 속도도 빠릅니다.",
  water: "돈은 들어오는 편입니다.\n하지만 들어온 만큼 나가는 속도도 빠릅니다.",
};
const CH3_ACTION: Record<Element, string> = {
  wood: "벌이는 만큼 지키는 습관이 필요한 때입니다.",
  fire: "지출 전에 하루쯤 미뤄보는 습관이 필요합니다.",
  earth: "이제는 작은 기회부터 시도해볼 때입니다.",
  metal: "충분히 검토했다면 움직여야 할 때입니다.",
  water: "나눈 힘을 한 곳으로 모아볼 필요가 있습니다.",
};
const CH3_CAREER_EXAMPLE: Record<Element, string> = {
  wood: "예를 들어 새로운 프로젝트를 직접 만들어가는 역할을 맡을 때 가장 크게 성과를 냅니다.",
  fire: "예를 들어 사람들 앞에서 아이디어를 발표하거나 주목받는 역할을 맡을 때 실력이 가장 빛납니다.",
  earth: "예를 들어 여러 사람을 조율하고 중심을 잡아주는 역할을 맡을 때 신뢰를 크게 얻습니다.",
  metal: "예를 들어 정확한 기준과 분석이 필요한 업무를 맡을 때 남들보다 뛰어난 결과를 냅니다.",
  water: "예를 들어 여러 정보를 연결하고 흐름을 읽어야 하는 일을 맡을 때 두각을 나타냅니다.",
};
const CH3_STRENGTH: Record<Element, string> = {
  wood: "이 성향의 가장 큰 장점은, 남들이 보지 못한 기회를 가장 먼저 알아보고 실행에 옮기는 추진력입니다.",
  fire: "이 성향의 가장 큰 장점은, 짧은 시간 안에 폭발적인 성과를 만들어내는 순발력입니다. 결정적인 순간에 특히 강합니다.",
  earth: "이 성향의 가장 큰 장점은, 꾸준함으로 자산을 안정적으로 불려가는 관리 능력입니다. 큰 손실 없이 오래 쌓아갑니다.",
  metal: "이 성향의 가장 큰 장점은, 리스크를 정확히 계산해 손실을 최소화하는 판단력입니다. 무리한 투자에 잘 흔들리지 않습니다.",
  water: "이 성향의 가장 큰 장점은, 여러 기회 중 흐름을 가장 먼저 읽어내는 감각입니다. 시장의 변화에 민감하게 반응합니다.",
};
const CH3_LEAK: Record<Element, string> = {
  wood: "재물이 새는 가장 흔한 지점은 새로운 시도에 급하게 돈을 쏟아붓는 순간입니다. 검증되지 않은 곳에 큰돈을 넣기 전, 작게 시험해보는 습관이 필요합니다.",
  fire: "재물이 새는 가장 흔한 지점은 기분이 좋을 때의 과감한 지출입니다. 좋은 일이 생겼을 때일수록 지갑을 여는 속도를 한 번 늦춰볼 필요가 있습니다.",
  earth: "재물이 새는 지점은 크지 않지만, 새로운 기회를 놓쳐 얻지 못한 수익이 오히려 더 큽니다. 이미 검증된 곳이라면 조금 더 과감해질 필요가 있습니다.",
  metal: "재물이 새는 지점은 크지 않지만, 지나치게 아끼다가 정작 필요한 곳에 투자하지 못하는 경우가 있습니다. 확신이 섰다면 아낌없이 써야 할 때도 있습니다.",
  water: "재물이 새는 가장 흔한 지점은 여러 곳에 조금씩 나눠 투자하다 어느 하나도 제대로 키우지 못하는 상황입니다. 한 곳을 정해 집중하는 결단이 필요합니다.",
};

// 동일 도입 문장("좋은 기운이지만 잘못 쓰면 오히려 독이 됩니다.")을 지우고
// 원소별로 다른 두 문장만 남겼다.
const CH4_FACT: Record<Element, string> = {
  wood: "이끄는 힘이 강한 만큼, 상대를 배려가 아닌 통제로 느끼게 만드는 순간이 있었을 겁니다.\n상대의 침묵을 동의로 착각한 적도 있었을 수 있습니다.",
  fire: "뜨거운 애정 표현이 상대에게는 부담으로 느껴진 순간이 있었을 겁니다.\n관계의 속도를 자신 기준으로만 정한 적이 있었을 수 있습니다.",
  earth: "한결같음이 상대에게는 답답함으로 느껴진 순간이 있었을 겁니다.\n변화를 원하는 상대의 신호를 놓친 적이 있었을 수 있습니다.",
  metal: "분명한 기준이 상대에게는 차갑게 느껴진 순간이 있었을 겁니다.\n감정보다 논리를 앞세워 상대를 서운하게 한 적이 있었을 수 있습니다.",
  water: "잘 맞춰주는 태도가 상대에게는 진심이 안 보인다는 오해로 이어진 순간이 있었을 겁니다.\n갈등을 피하려다 문제를 키운 적이 있었을 수 있습니다.",
};
const CH4_ACTION: Record<Element, string> = {
  wood: "한 번은 먼저 물어보는 것이 필요합니다.",
  fire: "표현의 온도를 상대에게 맞춰볼 필요가 있습니다.",
  earth: "마음을 가끔은 꺼내 보이는 것이 필요합니다.",
  metal: "기준을 설명하는 한마디가 필요합니다.",
  water: "진심을 먼저 보여주는 것이 필요합니다.",
};
const CH4_STRENGTH: Record<Element, string> = {
  wood: "이 성향의 가장 큰 장점은, 관계를 위해 먼저 움직이고 먼저 책임지는 태도입니다. 상대는 그 든든함에 안심하게 됩니다.",
  fire: "이 성향의 가장 큰 장점은, 사랑을 아낌없이 표현하는 솔직함입니다. 상대는 자신이 사랑받고 있다는 걸 의심할 필요가 없습니다.",
  earth: "이 성향의 가장 큰 장점은, 어떤 순간에도 곁을 지키는 한결같음입니다. 관계가 흔들릴 때 가장 든든한 사람이 됩니다.",
  metal: "이 성향의 가장 큰 장점은, 한 번 마음을 정하면 끝까지 지키는 진지함입니다. 가벼운 관계보다 깊은 신뢰를 만듭니다.",
  water: "이 성향의 가장 큰 장점은, 상대에게 맞춰 관계를 부드럽게 이끌어가는 배려심입니다. 갈등이 오래가지 않습니다.",
};
const CH4_EXAMPLE2: Record<Element, string> = {
  wood: "예를 들어 연애 초반에는 관계를 적극적으로 이끌어가지만, 관계가 안정되면 그 주도권을 유지하려다 상대와 부딪히는 순간이 생깁니다.",
  fire: "예를 들어 마음이 생기면 숨기지 못하고 바로 표현하지만, 그 열기가 식으면 관계 자체에 대한 흥미도 함께 식는 경우가 있습니다.",
  earth: "예를 들어 한 사람에게 마음을 정하면 쉽게 흔들리지 않지만, 그 마음을 표현하는 데는 유독 서툰 편입니다.",
  metal: "예를 들어 신중하게 사람을 알아가지만, 한 번 마음을 정하면 웬만해서는 그 선택을 바꾸지 않습니다.",
  water: "예를 들어 상대에게 맞춰주는 데 능숙하지만, 그러다 보니 정작 자신이 원하는 관계의 모습을 잃어버리는 순간이 있습니다.",
};

// 동일 도입 문장("기회가 없는 것이 아니라, 기회가 왔을 때의 선택이
// 문제입니다.")을 지우고 원소별로 다른 두 문장만 남겼다.
const CH5_FACT: Record<Element, string> = {
  wood: "지금은 새로운 시도보다, 방향을 점검할 시간에 가깝습니다.",
  fire: "지금은 속도를 늦추고, 에너지를 다시 채워야 할 시간입니다.",
  earth: "지금은 쌓아온 것을 정리하고, 다음을 준비할 시간입니다.",
  metal: "지금은 원칙을 다시 세우고, 방향을 명확히 할 시간입니다.",
  water: "지금은 흩어진 흐름을, 한 방향으로 모아야 할 시간입니다.",
};
const CH5_ACTION: Record<Element, string> = {
  wood: "가진 것부터 정리해볼 때입니다.",
  fire: "잠시 멈춰 에너지를 회복할 때입니다.",
  earth: "쌓아온 것을 점검하고 준비할 때입니다.",
  metal: "흔들렸던 원칙을 다시 세울 때입니다.",
  water: "흩어진 마음을 하나로 모아볼 때입니다.",
};
const CH5_STRENGTH: Record<Element, string> = {
  wood: "다만 이 흐름에도 분명한 기회는 있습니다. 방향을 점검하는 지금이야말로 다음 도약을 준비할 가장 좋은 시점입니다.",
  fire: "다만 이 흐름에도 분명한 기회는 있습니다. 잠시 멈춰 채운 에너지가 다음 구간에서 더 큰 힘으로 돌아옵니다.",
  earth: "다만 이 흐름에도 분명한 기회는 있습니다. 지금 정리해둔 것들이 다음 단계의 단단한 기반이 되어줍니다.",
  metal: "다만 이 흐름에도 분명한 기회는 있습니다. 지금 다시 세운 원칙이 앞으로의 선택을 훨씬 명확하게 만들어줍니다.",
  water: "다만 이 흐름에도 분명한 기회는 있습니다. 지금 모은 힘이 다음 전환점에서 한 번에 터질 가능성이 큽니다.",
};
const CH5_EXAMPLE2: Record<Element, string> = {
  wood: "예를 들어 최근 들어 새로운 제안이나 기회가 여러 번 눈에 띄었을 가능성이 큽니다.",
  fire: "예를 들어 최근 들어 평소보다 쉽게 지치거나 감정 기복이 커지는 것을 느꼈을 가능성이 큽니다.",
  earth: "예를 들어 최근 들어 그동안 미뤄왔던 정리나 마무리해야 할 일들이 눈에 밟히기 시작했을 가능성이 큽니다.",
  metal: "예를 들어 최근 들어 원칙이나 기준을 다시 세워야 하는 상황을 자주 마주쳤을 가능성이 큽니다.",
  water: "예를 들어 최근 들어 여러 가지 일이 동시에 벌어지며 마음이 분산되는 느낌을 받았을 가능성이 큽니다.",
};

/**
 * "전체 사주" 결과를 命式 원국표 이후 5개 챕터(第一章~第五章)의 StoryScene으로 구성한다.
 * 각 챕터는 MovieScene(오프닝 연출) → RevealScene(근거/시기 공개) →
 * InsightScene(핵심 문장+실제 사례+문제+해결을 한 화면에 모은 카드 3~4개) 3단
 * 흐름을 따른다. 문장 사이를 잇던 안내 문구(nextQuestion)는 전부 제거했고,
 * 장면 전환은 텍스트가 아니라 다음 MovieScene의 연출이 대신한다. 오행 그래프는
 * 第五章의 RevealScene 한 곳에서만 노출된다. 기존 계산 결과(storyblocks,
 * aiLifeReport)를 재구성해 사용할 뿐 calculateSaju나 buildAppData의 계산
 * 로직은 그대로 둔다.
 */
export function buildFullStoryScenes(appData: AppData): StoryScene[] {
  const { user, chars, storyblocks, birthYear, fortuneTimelineNodes } = appData;
  const dayGan = user.pillars.day.hanja;
  const dayZhi = user.pillars.branches.day.hanja;
  const dayElement = GAN_ELEMENT[dayGan];
  const gan = GAN_PROFILE[dayGan];
  const seed = chars.join("");
  const name = user.name;

  const potentialBlock = storyblocks.find((b) => b.title === "타고난 잠재력");
  const temperamentBlock = storyblocks.find((b) => b.title === "타고난 기질");
  const lifestyleBlock = storyblocks.find((b) => b.title === "살아가는 방식");
  const wealthBlock = storyblocks.find((b) => b.title === "부의 흐름");

  const elementAnalysis = buildElementAnalysis(chars);
  const traits = buildPersonalTraitNotes(dayElement);
  const tenYear = buildTenYearFortune(dayGan, birthYear, seed);
  const current = tenYear[0];
  const currentDaYun = fortuneTimelineNodes.find((n) => n.state === "current");

  const nurturing = elementThatGenerates(dayElement);
  const pressuring = elementThatOvercomes(dayElement);

  const scenes: StoryScene[] = [
    // ── 第一章 · 남들이 보는 나와 실제의 나 ──────────────────────────
    {
      id: "ch1-cover",
      topic: "all",
      chapterLabel: "第一章",
      chapterTitle: "남들이 보는 나, 그리고 실제의 나",
      headline: "第一章",
      narrative: [
        `${name}님의 여덟 글자를, 지금부터 하나씩 펼쳐보겠습니다. 이미 알고 있던 모습도, 아직 모르던 모습도 모두 여기 있습니다.`,
      ],
      visualType: "movie",
      isLocked: false,
    },
    {
      id: "ch1-reveal",
      topic: "all",
      guideLine: ["잠시만요.", `${name}님의 사주를 먼저 열어보겠습니다.`],
      headline: gan.coreTrait,
      narrative: CH1_OPEN_SCENE[dayElement].split("\n").slice(0, 1),
      evidence: [
        { label: "일간", detail: `${user.pillars.day.hangul}(${dayGan}) · ${ELEMENT_LABEL[dayElement]}` },
        { label: "일지", detail: `${user.pillars.branches.day.hangul}(${dayZhi})` },
        { label: "월주 십성", detail: `${user.pillars.month.hangul}(${user.pillars.month.hanja}) · ${user.pillars.month.sipseong}` },
        { label: "년주 십성", detail: `${user.pillars.year.hangul}(${user.pillars.year.hanja}) · ${user.pillars.year.sipseong}` },
        ...(user.pillars.hour
          ? [{ label: "시주 십성", detail: `${user.pillars.hour.hangul}(${user.pillars.hour.hanja}) · ${user.pillars.hour.sipseong}` }]
          : []),
      ],
      visualType: "reveal",
      isLocked: false,
    },
    {
      id: "ch1-insight",
      topic: "all",
      headline: `${name}, 너는 원래 강한 사람이 아니야.\n강해질 수밖에 없었던 거지.`,
      narrative: [],
      realLife: CH1_INNER_EXAMPLE[dayElement],
      fact: CH1_FACT[dayElement],
      action: CH1_ACTION[dayElement],
      nextQuestion: "그래서 늘, 나만 늦게 알아차렸던 겁니다.",
      chapterEnd: true,
      visualType: "insight",
      isLocked: false,
    },
  ];

  // ── 第二章 · 관계에서 반복되는 장면 ────────────────────────────────
  scenes.push(
    {
      id: "ch2-cover",
      topic: "all",
      chapterLabel: "第二章",
      chapterTitle: "관계에서 반복되는 장면",
      headline: "第二章",
      narrative: [],
      visualType: "movie",
      isLocked: false,
    },
    {
      id: "ch2-reveal",
      topic: "all",
      headline: splitHeadline(traits.relationship).headline,
      narrative: [splitHeadline(traits.relationship).rest].filter(Boolean),
      visualType: "reveal",
      isLocked: false,
    },
    {
      id: "ch2-insight",
      topic: "all",
      guideLine: "이 부분을\n그동안 놓쳤습니다.",
      headline: `${name}, 사람은 달라졌는데\n끝은 자꾸 비슷했어.\n같은 방식이 반복됐던 거지.`,
      narrative: [],
      realLife: `${temperamentBlock?.paragraphs[2]?.text ?? ""} ${CH2_EXAMPLE2[dayElement]}`.trim(),
      action: CH2_ACTION[dayElement],
      chapterEnd: true,
      visualType: "insight",
      isLocked: false,
    }
  );

  // ── 第三章 · 돈과 일이 움직이는 방식 ────────────────────────────────
  scenes.push(
    {
      id: "ch3-cover",
      topic: "all",
      chapterLabel: "第三章",
      chapterTitle: "돈과 일이 움직이는 방식",
      headline: "第三章",
      narrative: [],
      visualType: "movie",
      isLocked: false,
    },
    {
      id: "ch3-reveal",
      topic: "all",
      guideLine: "이 부분은 그냥 지나치면 안 되겠습니다.",
      headline: "올해, 돈과 일은 이렇게 움직입니다",
      narrative: [current.wealth, current.career].filter(Boolean),
      evidence: [{ label: "올해 흐름", detail: `${current.year}년 · ${current.keyword}` }],
      // 이 시기의 wealth/career 문구는 SIPSEONG_YEAR_TEMPLATE에서 오는데,
      // 그 안에서 반복적으로 등장하는 구체적 경고·기회 어구를 명시적으로
      // 지정해 사전 매칭보다 우선 강조되도록 한다.
      highlights: [
        { text: "충동적인 지출", tone: "danger" },
        { text: "보증", tone: "danger" },
        { text: "동업", tone: "danger" },
        { text: "손실", tone: "danger" },
        { text: "조심해야 하는 시기", tone: "danger" },
        { text: "경쟁자가 눈에 띄게 늘어나는 시기", tone: "danger" },
        { text: "기회", tone: "gold" },
        { text: "인정받는", tone: "gold" },
        { text: "성과를 지키려는 노력", tone: "gold" },
      ],
      visualType: "reveal",
      isLocked: false,
    },
    {
      id: "ch3-insight",
      topic: "all",
      guideLine: "이건\n절대 우연이 아닙니다.",
      headline: `${name}, 너는 돈이 없던 사주가 아니야.\n들어온 돈을 지키지 못했던 거지.`,
      narrative: [],
      realLife: CH3_LEAK[dayElement],
      fact: CH3_FACT[dayElement],
      action: CH3_ACTION[dayElement],
      chapterEnd: true,
      visualType: "insight",
      isLocked: false,
    }
  );

  // ── 第四章 · 사랑 앞에서 달라지는 얼굴 ────────────────────────────────
  scenes.push(
    {
      id: "ch4-cover",
      topic: "all",
      chapterLabel: "第四章",
      chapterTitle: "사랑 앞에서 달라지는 얼굴",
      headline: "第四章",
      narrative: [],
      visualType: "movie",
      isLocked: false,
    },
    {
      id: "ch4-reveal",
      topic: "all",
      guideLine: "이 부분은 아마, 스스로도 반쯤은 알고 계실 거예요.",
      headline: `${ELEMENT_LABEL[nurturing]} 기운의 사람과는 편안함을, ${ELEMENT_LABEL[pressuring]} 기운의 사람과는 긴장을 느끼기 쉽습니다.`,
      narrative: [
        `당신을 채워주는 기운은 ${ELEMENT_LABEL[nurturing]}입니다. 이 기운을 가진 상대와 있으면 이유 없이 편안하고 채워지는 느낌을 받습니다.`,
        `반대로 ${ELEMENT_LABEL[pressuring]} 기운을 가진 상대 앞에서는 자신도 모르게 위축되거나 눈치를 보게 되는 경우가 많습니다.`,
      ],
      evidence: [
        { label: "나를 채우는 기운", detail: ELEMENT_LABEL[nurturing] },
        { label: "긴장하게 되는 기운", detail: ELEMENT_LABEL[pressuring] },
      ],
      visualType: "reveal",
      isLocked: false,
    },
    {
      id: "ch4-insight",
      topic: "all",
      guideLine: "여기서부터\n흐름이 달라집니다.",
      headline: `${name}, 사랑이 없던 게 아니야.\n마음을 너무 빨리 줬던 거지.`,
      narrative: [],
      realLife: CH4_EXAMPLE2[dayElement],
      action: CH4_ACTION[dayElement],
      nextQuestion: "그래서 늘, 마지막이 같았던 겁니다.",
      chapterEnd: true,
      visualType: "insight",
      isLocked: false,
    }
  );

  // ── 第五章 · 지금 서 있는 운의 구간 ────────────────────────────────
  scenes.push(
    {
      id: "ch5-cover",
      topic: "all",
      chapterLabel: "第五章",
      chapterTitle: "지금, 운이 움직이는 방향",
      headline: "第五章",
      narrative: [],
      visualType: "movie",
      isLocked: false,
    },
    {
      id: "ch5-reveal-elements",
      topic: "all",
      headline: elementAnalysis.summary,
      narrative: [],
      evidence: [
        { label: "올해 흐름", detail: `${current.year}년 · ${current.keyword}` },
        ...(currentDaYun ? [{ label: "현재 대운", detail: `${currentDaYun.age} · ${currentDaYun.label}` }] : []),
      ],
      // 오행 그래프(ElementFlowScene)는 이 RevealScene 한 곳에서만 렌더링된다.
      visualType: "reveal",
      isLocked: false,
    },
    {
      id: "ch5-insight",
      topic: "all",
      headline: `${name}, 지금은\n무리해서 밀어붙일 때가 아니야.`,
      narrative: [],
      realLife: `${firstSentence(current.caution)} ${CH5_EXAMPLE2[dayElement]}`.trim(),
      fact: CH5_FACT[dayElement],
      action: CH5_ACTION[dayElement],
      nextQuestion: "이제부터는 달라질 수 있습니다.",
      visualType: "insight",
      isLocked: false,
    },
    {
      id: "ch5-reveal-years",
      topic: "all",
      guideLine: ["여기서부터는, 시기가 함께 보입니다.", "가까운 두 해부터 먼저 열어보겠습니다."],
      headline: "가까운 두 해의 흐름",
      narrative: [
        "2027년까지의 흐름은 여기까지 보입니다.",
        "하지만 2028년부터는, 운의 방향이 한 번 더 달라집니다.",
      ],
      visualType: "reveal",
      isLocked: false,
      chapterEnd: true,
    },
    {
      id: "next-decade",
      topic: "all",
      guideLine: "이 부분은 뒤에서, 조금 더 자세히 이야기하겠습니다.",
      headline: "앞으로 10년, 빛이 지나가는 길",
      narrative: ["지금부터 10년의 흐름이 각기 다른 결로 이어집니다."],
      visualType: "timeline",
      isLocked: true,
    }
  );

  return scenes;
}

/**
 * "연애운" 결과를 6개의 Scene으로 구성한다.
 */
export function buildLoveStoryScenes(appData: AppData): StoryScene[] {
  const { user, chars, storyblocks, birthYear } = appData;
  const dayGan = user.pillars.day.hanja;
  const dayElement = GAN_ELEMENT[dayGan];
  const seed = chars.join("");

  const potentialBlock = storyblocks.find((b) => b.title === "타고난 잠재력");
  const temperamentBlock = storyblocks.find((b) => b.title === "타고난 기질");

  const traits = buildPersonalTraitNotes(dayElement);
  const tenYear = buildTenYearFortune(dayGan, birthYear, seed);

  const nurturing = elementThatGenerates(dayElement); // 나를 채워주는 기운
  const pressuring = elementThatOvercomes(dayElement); // 나를 긴장시키는 기운

  const cautionParagraphs = [
    potentialBlock?.paragraphs[1]?.text,
    temperamentBlock?.paragraphs[1]?.text,
  ].filter((t): t is string => !!t);

  const scenes: StoryScene[] = [
    {
      id: "love-first-look",
      topic: "love",
      guideLine: `잠시만요, ${user.name}님. 연애에서 가장 먼저 드러나는 건 따로 있어요.`,
      headline: splitHeadline(traits.love).headline,
      narrative: [splitHeadline(traits.love).rest].filter(Boolean),
      evidence: [
        { label: "일간", detail: `${user.pillars.day.hangul}(${dayGan}) · ${ELEMENT_LABEL[dayElement]}` },
      ],
      nextQuestion: "그렇다면 끌림은 어떻게 시작될까요?",
      visualType: "hero",
      isLocked: false,
    },
    {
      id: "love-attraction",
      topic: "love",
      guideLine: "끌림에도 나름의 방식이 있습니다.",
      headline: splitHeadline(traits.relationship).headline,
      narrative: [splitHeadline(traits.relationship).rest].filter(Boolean),
      nextQuestion: "그런데 가까워질수록 생기는 문제가 있어요.",
      visualType: "quote",
      isLocked: false,
    },
    {
      id: "love-friction",
      topic: "love",
      guideLine: "가까워질수록, 이 부분이 반복해서 부딪힙니다.",
      headline: cautionParagraphs[0]
        ? splitHeadline(cautionParagraphs[0]).headline
        : "가까워질수록 드러나는 결",
      narrative: [
        cautionParagraphs[0] ? splitHeadline(cautionParagraphs[0]).rest : "",
        cautionParagraphs[1] ?? "",
      ].filter(Boolean),
      nextQuestion: "그렇다면 누구와는 편하고, 누구와는 긴장하게 될까요?",
      visualType: "relationship",
      isLocked: false,
    },
    {
      id: "love-match",
      topic: "love",
      guideLine: "사람마다 당신에게 다르게 다가옵니다.",
      headline: `${ELEMENT_LABEL[nurturing]} 기운의 사람과는 편안함을, ${ELEMENT_LABEL[pressuring]} 기운의 사람과는 긴장을 느끼기 쉽습니다.`,
      narrative: [
        `당신을 채워주는 기운은 ${ELEMENT_LABEL[nurturing]}입니다. 이 기운을 가진 상대와 있으면 이유 없이 편안하고 채워지는 느낌을 받습니다.`,
        `반대로 ${ELEMENT_LABEL[pressuring]} 기운을 가진 상대 앞에서는 자신도 모르게 위축되거나 눈치를 보게 되는 경우가 많습니다.`,
      ],
      evidence: [
        { label: "나를 채우는 기운", detail: ELEMENT_LABEL[nurturing] },
        { label: "긴장하게 되는 기운", detail: ELEMENT_LABEL[pressuring] },
      ],
      nextQuestion: "결혼처럼 오래 함께할 관계에서는 무엇이 핵심일까요?",
      visualType: "relationship",
      isLocked: false,
    },
    {
      id: "love-marriage",
      topic: "love",
      guideLine: "결혼은, 조금 더 다른 이야기입니다.",
      headline: firstSentence(traits.love),
      narrative: [traits.relationship],
      nextQuestion: "그렇다면 앞으로의 인연은 언제, 어떻게 찾아올까요?",
      visualType: "quote",
      isLocked: false,
    },
    {
      id: "love-timeline",
      topic: "love",
      guideLine: "이 부분은 뒤에서, 조금 더 자세히 이야기하겠습니다.",
      headline: "앞으로의 인연, 빛이 지나가는 길",
      narrative: ["지금부터 10년, 인연이 짙어지는 시기가 각기 다르게 찾아옵니다."],
      nextQuestion: undefined,
      visualType: "timeline",
      isLocked: true,
    },
  ];

  return scenes;
}

export { buildTenYearFortune };
