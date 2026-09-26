// [6장 인생의 전환점 Production 이식] 확정된 scratch(scripts/_scratch_ch6_life_v7gen.ts)를 로직·문장 변경 없이 그대로 옮긴 파일.
// 이식 시 바꾼 것: import 경로(../lib/x → ../x)뿐이다.
/**
 * 6장 ①~⑦ v6 원칙 일반화 생성기 (scratch). 홍지영 v6 원고(동결)의 문장 구조를 계산 조건별 문장 재료로 옮겼다.
 * 새 계산 함수 없음: buildLifeFlowKey / analyzeDayMasterBalance / analyzeYongsinCandidate / ATTACKS만 사용.
 * (5종 힘의 상생은 기존 ATTACKS를 세 번 합성 — ①~⑧ v2에서 이미 쓴 방식과 동일)
 * 본문에는 나이 숫자·한자·명리 용어 없음. 랜덤 없음.
 */
import { AppData } from "../sajuContent";
import { buildLifeFlowKey, LifeFlowKey, LifePhase } from "../lifeFlowInterpretation";
import { SipseongCategory } from "../strengthAnalysis";
import { ATTACKS } from "../wealthTimingAnalysis";
import { analyzeDayMasterBalance } from "../dayMasterBalanceAnalysis";
import { analyzeYongsinCandidate } from "../yongsinCandidateAnalysis";
import { Stage } from "../natalStructure";

export interface Para { text: string; note: string }
export interface Sec { heading: string; paras: Para[] }
type Cat = SipseongCategory;

// ── 관계(5종): 기존 ATTACKS 합성 ──
type Rel = "same" | "feeds" | "supported" | "presses" | "pressed";
const succ = (c: Cat): Cat => ATTACKS[ATTACKS[ATTACKS[c]]];
function relOf(a: Cat, natal: Cat): Rel {
  if (a === natal) return "same";
  if (a === succ(natal)) return "feeds";
  if (ATTACKS[a] === natal) return "presses";
  if (ATTACKS[natal] === a) return "pressed";
  return "supported";
}
const ORD_TH = ["첫", "두", "세", "네", "다섯"];
const ord = (i: number) => `${ORD_TH[i] ?? i + 1} 번째 시기`;
const CNT = ["한", "두", "세", "네", "다섯"];

// ═══ ① 재료 ═══
const P1: Record<Cat, string> = {
  관성: `정해진 순서와 절차를 따르는 쪽이 더 익숙했을 수 있습니다. 일을 받으면 "어떻게 하라는 건지"를 먼저 확인하는 쪽에 가까웠습니다.`,
  재성: "눈에 보이는 결과부터 확인하는 쪽이 익숙했을 수 있습니다.",
  식상: "머릿속 생각을 밖으로 꺼내 직접 해 보는 쪽이 더 익숙했을 수 있습니다. 말해 보고, 만들어 보고, 안 맞으면 바꿔 보는 쪽에 가까웠습니다.",
  비겁: "일을 어떻게 할지 내가 먼저 정하는 쪽이 더 익숙했을 수 있습니다. 남에게 묻기보다 내 기준으로 움직이는 쪽에 가까웠습니다.",
  인성: "충분히 이해하고 난 뒤에 움직이는 쪽이 더 익숙했을 수 있습니다. 배우고 물어보는 시간이 먼저였습니다.",
};
const HALF: Record<string, string> = {
  비견: "비슷한 위치의 사람들과 나란히 일하는 쪽", 겁재: "비슷한 위치의 사람과 나누거나 겨루는 쪽",
  식신: "한 가지를 꾸준히 다듬는 쪽", 상관: "하던 방법에 의문을 품고 바꿔 보는 쪽",
  편재: "이것저것 알아보는 쪽", 정재: "정해진 일을 하나씩 점검하는 쪽",
  편관: "부담이 큰 일을 빠르게 처리하는 쪽", 정관: "정해진 절차를 따르는 쪽",
  편인: "혼자 깊이 파고드는 쪽", 정인: "배우고 도움을 받으며 정리하는 쪽",
};
const CUR_SHORT: Record<Cat, string> = {
  비겁: "내가 먼저 정하고 움직입니다. 한번 정한 것은 웬만해서는 바꾸지 않고 밀고 갑니다.",
  식상: "머릿속 생각을 밖으로 꺼내 직접 해 봅니다. 말해 보고, 만들어 보고, 안 맞으면 바꿔 봅니다.",
  재성: "눈에 보이는 결과를 하나씩 확인하면서 움직입니다. 확인이 안 된 것은 미뤄 둡니다.",
  관성: "맡은 책임과 정해진 기준을 먼저 챙깁니다. 하고 싶은 것보다 해야 할 것이 앞섭니다.",
  인성: "충분히 이해하고 난 뒤에 움직입니다. 배우고 물어보는 시간이 늘어납니다.",
};
const NEXT_SHORT: Record<Cat, string> = {
  비겁: "무엇을 할지 내가 먼저 정하고 그대로 밀고 가는", 식상: "생각을 밖으로 꺼내 직접 해 보는",
  재성: "눈에 보이는 결과를 하나씩 확인하는", 관성: "맡은 책임과 정해진 기준을 먼저 챙기는",
  인성: "배우고 다른 사람의 도움을 받아들이는",
};
// ═══ ② 재료 ═══
const HABIT: Record<Cat, string> = {
  관성: `"시작하기 전에 확인하기"가 습관이 됐을 수 있습니다. 일을 받으면 바로 손대기보다 기준이 무엇인지부터 확인하는 쪽입니다. 약속한 것을 어기는 것은 스스로도 불편해합니다.`,
  재성: "", // 아래에서 편재 여부로 조립
  식상: "생각이 떠오르면 말이나 결과물로 먼저 꺼내 보는 습관이 생겼을 수 있습니다. 해 보다가 안 맞으면 방법을 바꿔 보는 것도 익숙합니다.",
  비겁: "내가 먼저 정하고 움직이는 습관이 남았을 수 있습니다. 비슷한 위치의 사람과는 서로 기준이 다르면 의견이 갈리기 쉽습니다.",
  인성: "배우고 물어본 뒤에 시작하는 습관이 남았을 수 있습니다. 이해가 되기 전에는 시작을 미루는 편입니다.",
};
// ═══ ③ 재료 ═══
const NAT_TRAIT: Record<Cat, [string, string]> = {
  비겁: ["무슨 일이든 내 기준으로 정하고 움직일 때 가장 편합니다.", "남이 어떻게 하라고 하나하나 정해 주면 갑갑해집니다."],
  식상: ["떠오른 생각을 밖으로 꺼내 보고 시도할 때 가장 편합니다.", "생각만 하고 있기보다 일단 말하거나 해 보려 합니다."],
  재성: ["눈에 보이는 결과를 확인하면서 움직일 때 가장 편합니다.", "결과를 확인하지 않은 채 밀어붙이기보다, 중간중간 결과를 확인하면서 움직이려 합니다."],
  관성: ["정해진 기준과 맡은 책임이 분명할 때 가장 편합니다.", "기준이 없으면 먼저 무엇이 기준인지부터 확인하려 합니다."],
  인성: ["충분히 이해하고 난 뒤에 움직일 때 가장 편합니다.", "설명이 없으면 먼저 물어보거나 알아본 뒤에 시작하려 합니다."],
};
const SECOND_SHORT: Record<Cat, string> = {
  비겁: "내 기준으로 정하고 움직이는 것", 식상: "생각을 꺼내 해 보는 것", 재성: "눈에 보이는 결과를 확인하며 움직이는 것",
  관성: "맡은 책임 안에서 움직이는 것", 인성: "충분히 이해한 뒤에 움직이는 것",
};
const FE_TXT: Record<Cat, string> = {
  식상: "생각을 꺼내 해 본 것의 결과를 눈으로 확인하는 일이라, 내 방식과 크게 부딪히지 않았을 수 있습니다.",
  재성: "결과를 눈으로 확인하던 습관이 기준과 절차를 맞추는 일에도 그대로 쓰여서, 무리가 적었을 수 있습니다.",
  관성: "기준과 책임을 지키던 습관이 배우고 확인하는 일에도 그대로 쓰여서, 무리가 적었을 수 있습니다.",
  인성: "충분히 이해해 둔 것을 바탕으로 내가 정하고 움직이는 일이라, 무리가 적었을 수 있습니다.",
  비겁: "내 기준으로 정한 것을 말하고 직접 해 보는 일이라, 무리가 적었을 수 있습니다.",
};
const SU_TXT: Record<Cat, string> = {
  비겁: "그러면서 배운 내용을 내가 정하고 움직일 때 쓸 기회도 있었을 수 있습니다.",
  식상: "그러면서 생각을 꺼내 직접 해 볼 기회도 있었을 수 있습니다.",
  재성: "그러면서 해 본 결과를 눈으로 확인할 기회도 있었을 수 있습니다.",
  관성: "그러면서 맡은 일이 기준에 맞는지 따져 볼 기회도 있었을 수 있습니다.",
  인성: "그러면서 일을 이해하고 나서 움직일 기회도 있었을 수 있습니다.",
};
const NAT_STATE: Record<Cat, string> = {
  비겁: "내 판단으로 밀고 가는 쪽", 식상: "생각을 꺼내 해 보는 쪽", 재성: "눈에 보이는 결과를 확인하는 쪽",
  관성: "맡은 책임과 기준을 지키는 쪽", 인성: "충분히 이해하고 움직이는 쪽",
};
const PAST_SHORT: Record<Cat, string> = {
  관성: "정해진 순서와 절차를 따르는 쪽", 재성: "눈에 보이는 결과부터 확인하는 쪽", 식상: "머릿속 생각을 밖으로 꺼내 해 보는 쪽",
  비겁: "내가 먼저 정하고 밀고 가는 쪽", 인성: "충분히 이해한 뒤에 움직이는 쪽",
};
const PAST_TASK: Record<Cat, string> = {
  관성: "정해진 절차를 따르는 일", 재성: "눈에 보이는 결과를 확인하는 일", 식상: "생각을 꺼내 직접 해 보는 일",
  비겁: "내가 먼저 정하고 밀고 가는 일", 인성: "충분히 이해하고 배우는 일",
};
const PRESS_PAST: Record<Cat, string> = {
  비겁: "시키는 순서를 그대로 따르면서도 마음 한쪽은 답답했을 수 있습니다.",
  식상: "생각이 떠올라도 바로 말하거나 해 보기보다, 먼저 이해하고 배우는 쪽으로 움직여야 했을 수 있습니다.",
  재성: "결과를 확인하기 전에 내가 먼저 정하고 움직이는 일이 앞섰을 수 있습니다.",
  관성: "정해진 기준을 지키는 일과 새로 해 보는 일이 함께 겹쳤을 수 있습니다.",
  인성: "충분히 이해할 시간이 부족한 채 눈앞의 결과를 먼저 내야 했을 수 있습니다.",
};
// ═══ ④ 재료 (현재 대운 십성별) ═══
const NOW: Record<string, { a1: string; a2: string; b: string }> = {
  상관: {
    a1: "지금은 생각이 떠오르면 머릿속에만 두지 않고 일단 말해 보거나 만들어 봅니다. 여럿이 하는 일에서도 생각이 나면 먼저 말로 꺼내는 편입니다.",
    a2: "하던 방법에 의문이 자주 생기는 것도 지금의 모습입니다. 늘 하던 순서만 따르는 것이 점점 지루해지고, 더 나은 방법이 없는지 찾아서 바꿔 보게 됩니다.",
    b: "시작은 빠릅니다. 문제는 그 뒤입니다. 여러 가지를 한꺼번에 시작해 두면 나중에 끝내야 할 일이 동시에 남아서, 무엇부터 끝낼지 고르는 것부터 일이 됩니다.",
  },
  식신: {
    a1: "지금은 한 가지를 정해서 꾸준히 만들고 다듬는 쪽입니다. 급하게 여러 가지를 벌이기보다 하나를 손에 익을 때까지 붙잡습니다.",
    a2: "한 가지를 계속 손보면서 조금씩 나아지게 만드는 편입니다.",
    b: "문제는 내놓는 때입니다. 하나를 계속 다듬다 보면 내놓는 시점이 늦어질 수 있습니다.",
  },
  비견: {
    a1: "지금은 무슨 일이든 내가 먼저 정하고 움직이는 쪽입니다. 남이 정해 주는 방법보다 내 판단대로 움직이는 편입니다.",
    a2: "나와 비슷한 위치의 사람들과 일할 때 특히 이런 모습이 드러납니다. 각자 자기 일을 자기 방법으로 하는 모습이 나옵니다.",
    b: "문제는 방법이 서로 다를 때입니다. 비슷한 위치의 사람도 자기 방법이 있어서, 누구 방법으로 갈지 정하는 데 시간이 걸릴 수 있습니다.",
  },
  겁재: {
    a1: "지금은 내가 정하고 밀고 가는 쪽인데, 혼자보다 비슷한 위치의 사람들과 함께 움직이는 일이 많습니다.",
    a2: "함께 하는 일에서 누가 더 하고 누가 덜 하는지 따지게 되기 쉽습니다.",
    b: "문제는 나눌 것이 생길 때입니다. 비슷한 위치의 사람과 무언가를 나누거나 겨루게 되는 일이 생길 수 있습니다.",
  },
  편재: {
    a1: "지금은 한 곳에 머물러 있기보다 이것저것 알아보고 여러 곳에 손을 뻗는 쪽입니다. 정하기 전에 선택지를 넓게 펼쳐 봅니다.",
    a2: "이것저것 알아보는 동안 여러 사람과 정보를 만나게 됩니다.",
    b: "문제는 좁히는 때입니다. 알아본 것이 많아서 하나로 정하기까지 오래 걸리거나, 정한 뒤에도 다른 쪽이 눈에 들어올 수 있습니다.",
  },
  정재: {
    a1: "지금은 정해진 일을 하나씩 확인하며 빈틈없이 챙기는 쪽입니다. 눈에 보이는 결과가 나와야 다음으로 넘어갑니다.",
    a2: "약속한 것과 정해진 순서를 지키려 합니다.",
    b: "문제는 정해진 순서에 없던 일이 끼어들 때입니다. 하나씩 순서대로 챙기던 중에 새 일이 끼어들면 순서를 다시 정해야 합니다.",
  },
  편관: {
    a1: "지금은 부담이 큰 일을 피하지 않고 빠르게 처리하는 쪽입니다. 급한 일이 생기면 먼저 나서서 처리합니다.",
    a2: "맡는 책임이 무거워지고, 정해진 기한과 기준을 맞춰야 하는 일이 늘어납니다.",
    b: "문제는 급한 일이 이어질 때입니다. 하나를 끝내도 다음 일이 바로 이어져서 쉴 틈이 줄어들 수 있습니다.",
  },
  정관: {
    a1: "지금은 정해진 규칙과 절차를 따라 움직이는 쪽입니다. 맡은 일은 정해진 대로 끝내고, 약속한 것은 지키려 합니다.",
    a2: "일에 대한 평가와 기준이 분명한 곳에서 움직이는 때입니다.",
    b: "문제는 정해진 것에서 벗어날 때입니다. 절차에 없는 일이 생기면 바로 판단하기보다 기준부터 확인하다가 시간이 걸릴 수 있습니다.",
  },
  편인: {
    a1: "지금은 남들이 하는 방법을 그대로 따르기보다 혼자 깊이 파고들어 이해하려는 쪽입니다.",
    a2: "남들과 다른 방법이 눈에 들어오고, 혼자 생각하고 정리하는 시간이 늘어납니다.",
    b: "문제는 혼자 하는 시간이 길어질 수 있다는 점입니다.",
  },
  정인: {
    a1: "지금은 서두르지 않고 배우고 정리하면서 움직이는 쪽입니다. 도움을 받을 수 있는 곳에서 차분히 익힌 뒤에 시작합니다.",
    a2: "모르는 것은 물어보고 배우려 하고, 알려 주는 사람의 말을 잘 받아들입니다.",
    b: "문제는 시작이 늦어질 수 있다는 점입니다. 충분히 이해했다는 느낌이 들 때까지 시작을 미루게 될 수 있습니다.",
  },
};
const NAT_ORIG: Record<Cat, string> = {
  비겁: "내가 정하고 밀고 가려는", 식상: "생각을 꺼내 표현하려는", 재성: "눈에 보이는 결과부터 확인하려는",
  관성: "맡은 책임을 지키려는", 인성: "충분히 이해하고 움직이려는",
};
const PRESS_NOW: Record<Cat, string> = {
  비겁: "정해진 순서와 평가 안에서 움직이는 일이 많아서, 내가 먼저 정하고 움직이는 일은 줄어들 수 있습니다.",
  식상: "말이나 시도를 꺼내기 전에 먼저 이해하고 배우는 시간을 더 가져야 하는 일이 늘 수 있습니다.",
  재성: "결과를 확인하기 전에 내가 먼저 정하고 움직이는 일이 앞설 수 있습니다.",
  관성: "정해진 기준을 지키는 일과 새로 해 보는 일이 함께 겹칠 수 있습니다.",
  인성: "충분히 이해할 시간이 부족한 채 눈앞의 결과를 먼저 내야 하는 일이 생길 수 있습니다.",
};
const PREV_SHORT: Record<string, string> = {
  비견: "비슷한 위치의 사람들과 나란히 일하는", 겁재: "비슷한 위치의 사람과 나누거나 겨루는",
  식신: "한 가지를 꾸준히 다듬는", 상관: "하던 방법에 의문을 품고 바꿔 보는",
  편재: "이것저것 알아보는", 정재: "정해진 일을 하나씩 점검하는",
  편관: "부담이 큰 일을 빠르게 처리하는", 정관: "정해진 절차를 따르는",
  편인: "혼자 깊이 파고드는", 정인: "배우고 도움을 받으며 정리하는",
};
// ═══ ⑤ 재료 ═══
const START_CUR: Record<Cat, string> = {
  비겁: "내가 먼저 정하고 시작하는 쪽", 식상: "일단 시작하고 하면서 고치는 쪽", 재성: "눈에 보이는 결과를 확인해 가며 시작하는 쪽",
  관성: "기준과 절차를 확인한 뒤에 시작하는 쪽", 인성: "충분히 이해한 뒤에 시작하는 쪽",
};
const START_NEXT: Record<Cat, string> = {
  비겁: "다른 사람의 기준을 따르기보다 무엇을 할지 스스로 정하고 움직이는 쪽", 식상: "생각이 나면 일단 꺼내서 해 보는 쪽",
  재성: "눈에 보이는 결과를 하나씩 확인하면서 움직이는 쪽", 관성: "맡은 책임과 정해진 기준 안에서 움직이는 쪽",
  인성: "충분히 이해하고 배운 뒤에 움직이는 쪽",
};
const FADE_S: Record<Cat, string> = {
  식상: "새 일을 벌이는 것은 예전만큼 앞서지 않고", 비겁: "내 판단만으로 밀고 가는 것은 예전만큼 앞서지 않고",
  재성: "눈에 보이는 결과부터 확인하는 것은 예전만큼 앞서지 않고", 관성: "기준부터 챙기는 것은 예전만큼 앞서지 않고",
  인성: "충분히 이해될 때까지 기다리는 것은 예전만큼 앞서지 않고",
};
const TAIL: Record<Cat, string> = {
  비겁: "한번 정한 것은 그대로 밀고 가는", 식상: "시작은 더 빨라지고 안 맞으면 바로 바꾸는",
  재성: "확인되지 않은 일은 뒤로 미루고 확인되는 일부터 끝내는", 관성: "하고 싶은 일보다 맡은 일을 먼저 끝내는",
  인성: "바로 움직이기보다 배우고 물어본 뒤에 움직이는",
};
const PEOPLE_CUR: Record<Cat, string> = {
  비겁: "내가 먼저 정해서 이끄는 쪽", 식상: "생각이 나는 대로 먼저 꺼내는 쪽", 재성: "눈에 보이는 결과를 함께 확인하는 쪽",
  관성: "맡은 책임과 약속을 먼저 챙기는 쪽", 인성: "조언을 구하며 함께 배우는 쪽",
};
const PEOPLE_NEXT: Record<Cat, string> = {
  비겁: `시작하기 전에 "이 부분은 내가, 저 부분은 당신이" 하고 나눠 두고 싶어질 수 있습니다. 내 일이 아닌 것을 대신 떠안는 것은 예전만큼 내키지 않을 수 있습니다.`,
  식상: "생각이 나는 대로 먼저 말하고 의견을 구하는 일이 늘어날 수 있습니다. 정해진 순서를 기다리기보다 먼저 나서는 쪽이 될 수 있습니다.",
  재성: "눈에 보이는 결과를 기준으로 이야기하려 할 수 있습니다. 말로만 하는 약속보다 실제로 나온 것을 보고 판단하는 쪽이 될 수 있습니다.",
  관성: "맡은 일과 약속을 분명히 정해 두는 것을 중요하게 보게 될 수 있습니다.",
  인성: "조언해 주고 가르쳐 줄 사람을 먼저 찾게 될 수 있습니다. 혼자 정하기보다 먼저 물어보는 쪽이 될 수 있습니다.",
};
const FUT: Record<string, string> = {
  비견: "나와 비슷한 위치의 사람들과 나란히 각자 자기 일을 하는 모습", 겁재: "비슷한 위치의 사람과 무언가를 나누거나 서로 겨루게 되는 모습",
  식신: "한 가지를 꾸준히 만들고 다듬는 모습", 상관: "하던 방법에 의문을 품고 바꿔 보려는 모습",
  편재: "이것저것 알아보며 여러 곳으로 손을 뻗는 모습", 정재: "정해진 일을 하나씩 확인하며 챙기는 모습",
  편관: "급하고 부담이 큰 일을 빠르게 처리해야 하는 모습", 정관: "정해진 절차를 따르는 모습",
  편인: "남과 다른 방법으로 혼자 깊이 파고드는 모습", 정인: "배우고 도움을 받으며 차분히 정리하는 모습",
};
const HQ: Record<Cat, string> = { 비겁: "내가 먼저 정하는", 식상: "떠오르면 바로 해 보는", 재성: "결과부터 확인하는", 관성: "기준부터 챙기는", 인성: "이해한 뒤에 움직이는" };
const NF: Record<Cat, string> = { 비겁: "먼저 정하는", 식상: "먼저 해 보는", 재성: "먼저 확인하는", 관성: "먼저 기준을 챙기는", 인성: "먼저 이해하는" };
const CUR_HEAD: Record<Cat, string> = {
  비겁: "내가 먼저 정하고 움직이는", 식상: "생각을 꺼내 직접 해 보는", 재성: "눈에 보이는 결과를 확인하는",
  관성: "맡은 책임과 기준을 챙기는", 인성: "이해하고 배우며 움직이는",
};
const STEADY = new Set(["비견", "식신", "정재", "정관", "정인"]);
// ═══ ⑥ 재료 ═══
const CLASH: Record<Cat, string> = {
  비겁: "다음 시기에는 나와 비슷한 위치의 사람들과 부딪히거나 무언가를 나눠야 하는 일이 늘 수 있고, 그럴 때 불편해지기 쉽습니다. 나 역시 내 판단을 중요하게 보는 쪽으로 바뀌기 때문에, 서로 생각이 다를 때는 지금보다 의견 차이가 크게 느껴질 수 있습니다.",
  식상: "다음 시기에는 생각을 꺼내 시작하는 일이 늘어서, 시작해 두고 끝내지 못한 일이 남기 쉽습니다.",
  재성: "다음 시기에는 눈에 보이는 결과를 하나씩 확인하는 일이 늘어서, 결과가 바로 확인되지 않는 일은 미뤄 두게 될 수 있습니다.",
  관성: "다음 시기에는 맡는 일과 평가받는 일이 늘어서, 정해진 절차와 기한을 맞춰야 하는 부담이 커질 수 있습니다.",
  인성: "다음 시기에는 바로 움직이기보다 배우고 이해하는 시간이 늘어서, 빨리 결과를 내야 하는 상황과 부딪힐 수 있습니다.",
};
const STAGE_PLAIN: Record<Stage, string> = {
  year: "집안이나 오래 알아 온 관계", month: "일이나 사회 활동", day: "나 자신이나 가까운 사람과의 생활", hour: "앞으로의 계획",
};
const NAT_ACT: Record<Cat, string> = { 비겁: "내가 정하는 일", 식상: "생각을 꺼내 해 보는 일", 재성: "눈으로 확인하며 처리하는 일", 관성: "맡은 책임을 지키는 일", 인성: "이해하고 배우는 일" };
const LEAN: Record<Cat, string> = {
  비겁: "믿을 만한 사람과 일을 나눠서 하는 것", 식상: "머릿속에만 두지 않고 말하거나 만들어 보는 것", 재성: "눈에 보이는 결과를 하나씩 확인하는 것",
  관성: "해야 할 일과 기한을 먼저 분명히 해 두는 것", 인성: "잘 아는 사람에게 물어보고 배운 뒤에 움직이는 것",
};
// ═══ ⑦ 재료 ═══
const KEEP: Record<Cat, string> = {
  비겁: "일을 하는 방법을 내가 정하는 쪽", 식상: "생각이 나면 일단 꺼내서 해 보는 쪽", 재성: "눈으로 확인한 뒤에 움직이는 쪽",
  관성: "맡은 책임과 약속을 지키는 쪽", 인성: "충분히 이해한 뒤에 움직이는 쪽",
};
const RELEASE: Record<Cat, string> = {
  비겁: "내 판단만으로 끝까지 밀고 가려는 습관", 식상: "떠오르는 즉시 손대는 습관", 재성: "결과가 눈에 보일 때까지 움직이지 않으려는 습관",
  관성: "정해진 기준을 먼저 확인해야만 움직이는 습관", 인성: "충분히 이해될 때까지 결정을 미루는 습관",
};

const REQ: Record<Cat, string> = {
  비겁: "내가 먼저 정하고 밀고 가는 것", 식상: "생각을 꺼내 직접 해 보는 것", 재성: "눈에 보이는 결과를 하나씩 확인하는 것",
  관성: "정해진 절차와 기한을 맞추는 것", 인성: "배우고 충분히 이해한 뒤에 움직이는 것",
};
const jd = (ss: string[]) => ss.filter(Boolean).join(" ");

export function generateLife7V6(appData: AppData): { sections: Sec[]; meta: any } {
  const key: LifeFlowKey = buildLifeFlowKey(appData);
  const { phases, currentPhaseIndex, natalAxis: N, natalAxisTier: TIER, secondAxis: S, periods, daYun, relations } = key;
  const hasCur = currentPhaseIndex >= 0 && !!daYun.current && !!daYun.current.ganCategory;
  const cur = daYun.current, nxt = daYun.next;
  const C = hasCur ? (cur!.ganCategory as Cat) : null;
  const X: Cat | null = hasCur && nxt && nxt.ganCategory ? (nxt.ganCategory as Cat) : null;
  const allPast = !hasCur && periods.length > 0 && periods.every((p) => p.state === "past");
  const pastPhases: LifePhase[] = hasCur ? phases.slice(0, currentPhaseIndex) : allPast ? phases : [];
  const futurePhases: LifePhase[] = hasCur ? phases.slice(currentPhaseIndex + 1) : [];
  const P = pastPhases.length, F = futurePhases.length;
  const curSS = cur?.ganSipseong ?? "", nxtSS = nxt?.ganSipseong ?? "";
  const birthYear: number = (appData as any).birthYear;
  const year = nxt ? birthYear + nxt.startAge - 1 : null;
  const bal = analyzeDayMasterBalance(appData.user).balance;
  const yo = analyzeYongsinCandidate(appData.user);
  const sections: Sec[] = [];
  const meta: any = { P, F, hasCur, C, X, N, S, curSS, nxtSS, year, bal, yo: yo.applicable ? `${yo.outcome}:${yo.winners.join("/")}` : "n/a", pastCats: pastPhases.map((p) => p.category) };

  const halfSent = (ph: LifePhase): string => {
    const ss = [...new Set(ph.periods.map((p) => p.ganSipseong))].filter((s) => HALF[s]);
    return ss.length >= 2 ? ` 처음에는 ${HALF[ss[0]]}이었다가, 뒤로 갈수록 ${HALF[ss[1]]}으로 옮겨 갔습니다.` : "";
  };

  // ═══ ① ═══
  {
    const ps: Para[] = [];
    const seqCats: Cat[] = [...pastPhases.map((p) => p.category), ...(hasCur ? [phases[currentPhaseIndex].category] : [])].filter((c): c is Cat => !!c);
    const K = seqCats.length;
    const repeated = new Set(seqCats).size !== K;
    let clashAt = -1;
    for (let i = 0; i + 1 < seqCats.length; i++) if (ATTACKS[seqCats[i]] === seqCats[i + 1] || ATTACKS[seqCats[i + 1]] === seqCats[i]) clashAt = i;
    let repI = -1, repJ = -1;
    for (let i = 0; i < seqCats.length && repI < 0; i++) for (let j = i + 1; j < seqCats.length; j++) if (seqCats[i] === seqCats[j]) { repI = i; repJ = j; break; }
    if (K >= 2) {
      let fwd = 0, bwd = 0;
      for (let i = 0; i + 1 < seqCats.length; i++) { if (seqCats[i + 1] === succ(seqCats[i])) fwd++; else if (seqCats[i] === succ(seqCats[i + 1])) bwd++; }
      const dir = repeated ? "repeat" : fwd === K - 1 ? "fwd" : bwd === K - 1 ? "bwd" : "mix";
      const lead = dir === "repeat"
        ? `지금까지 ${CNT[K - 1]} 번의 시기를 지나왔는데, ${ord(repI)}와 ${ord(repJ)}에는 ${PAST_SHORT[seqCats[repI]]}이 다시 앞에 섰습니다.`
        : `지금까지 ${CNT[K - 1]} 번의 시기를 지나왔는데, 시기마다 더 익숙했을 판단과 행동이 꽤 달랐습니다.`;
      ps.push({ text: lead, note: `국면 ${seqCats.join("→")} / 전환 방향 ${dir}` });
    } else if (K === 1) ps.push({ text: "지금까지는 한 시기 안에서 지내 왔습니다.", note: "국면 1개" });
    pastPhases.forEach((ph, i) => {
      const c = ph.category; if (!c) return;
      const t = P1[c] + (c === "재성" ? halfSent(ph) : halfSent(ph));
      ps.push({ text: `${ord(i)}에는 ${t}`, note: `지난 국면 ${c} / 십성 ${ph.periods.map((p) => p.ganSipseong).join("+")}` });
    });
    if (hasCur && C) ps.push({ text: `지금인 ${ord(currentPhaseIndex)}에는 ${CUR_SHORT[C]}`, note: `현재 ${C}` });
    if (hasCur) {
      const nx = futurePhases.map((p) => p.category).filter((c): c is Cat => !!c);
      if (nx.length >= 2) ps.push({ text: `${X === C ? "지금과 같은 종류의 시기가 이어진 뒤에는" : "다음 시기부터는"} ${NEXT_SHORT[nx[0]]} 쪽으로 바뀌고, 그 뒤에는 ${NEXT_SHORT[nx[1]]} 쪽으로 넘어갑니다.${nx.length > 2 ? " 그 뒤로도 한 번 더 바뀝니다." : ""}`, note: `남은 국면 ${nx.join("→")}` });
      else if (nx.length === 1) ps.push({ text: `${X === C ? "지금과 같은 종류의 시기가 이어진 뒤에는" : "다음 시기부터는"} ${NEXT_SHORT[nx[0]]} 쪽으로 바뀝니다.`, note: `남은 국면 ${nx[0]}` });
      else ps.push({ text: X ? "현재 계산되는 범위에서는 지금과 같은 종류의 시기가 마지막입니다." : "현재 계산되는 범위에서는 지금 시기가 마지막입니다.", note: X ? "남은 국면 0 · 다음 대운은 같은 종류" : "남은 국면 0" });
    } else if (allPast) ps.push({ text: "현재 계산되는 큰 시기는 모두 지났습니다.", note: "현재 대운 없음" });
    sections.push({ heading: "① 내 인생의 큰 줄기", paras: ps });
  }

  // ═══ ② ═══
  {
    const ps: Para[] = [];
    if (P === 0) {
      const prev = daYun.past;
      ps.push({ text: prev && SS_HALF(prev.ganSipseong) ? `큰 시기가 바뀐 적은 아직 없지만, 지금 시기의 앞부분에는 ${SS_HALF(prev.ganSipseong)}이 익숙했습니다.` : "아직 돌아볼 앞선 시기가 없습니다.", note: "지난 국면 0" });
    } else {
      pastPhases.forEach((ph, i) => {
        const c = ph.category; if (!c) return;
        let h = HABIT[c];
        if (c === "재성") { const hasPyeon = ph.periods.some((p) => p.ganSipseong === "편재"); h = `결정하는 습관이 생겼을 수 있습니다. ${hasPyeon ? "하나로 정하기 전에 여러 가지를 알아보고, " : ""}정한 뒤에는 결과가 실제로 눈에 보이는지 확인합니다. 설명보다 눈에 보이는 결과를 먼저 봅니다.`; }
        ps.push({ text: c === "관성" ? `${ord(i)}를 지나면서 ${h}` : `${ord(i)}에는 ${h}`, note: `지난 국면 ${c}` });
      });
      if (P >= 2) {
        const cats = pastPhases.map((p) => p.category);
        ps.push({ text: new Set(cats).size === cats.length ? "이렇게 전혀 다른 일을 차례로 겪었기 때문에, 상황이 달라지면 하던 방법을 바꾸는 데 익숙한 편일 수 있습니다." : "같은 쪽이 시기를 두고 다시 돌아왔기 때문에, 예전에 쓰던 방법을 다시 꺼내 쓰는 데 익숙한 편일 수 있습니다.", note: new Set(cats).size === cats.length ? "지난 국면 모두 다름" : "지난 국면 반복" });
      }
    }
    sections.push({ heading: "② 지나온 시기가 남긴 것", paras: ps });
  }

  // ═══ ③ ═══
  {
    const ps: Para[] = [];
    if (!N) ps.push({ text: "한 가지 성향이 유난히 앞서지 않아, 타고난 성향과 지나온 시기를 나눠 비교하기는 어렵습니다.", note: "중심축 없음" });
    else {
      ps.push({ text: jd([NAT_TRAIT[N][0], TIER === "A" ? "다른 방식보다 확실히 이쪽이 편합니다." : TIER === "C" ? "다만 다른 방식과 차이가 크지 않아서, 상황에 따라 다른 방식도 무리 없이 씁니다." : "", S && S !== N ? `그다음으로 편한 것은 ${SECOND_SHORT[S]}입니다.` : "", NAT_TRAIT[N][1]]), note: `중심축 ${N} 보조축 ${S}` });
      const past = periods.filter((p) => p.state === "past"); const n = past.length, m = past.filter((p) => p.ganCategory === N).length;
      const lines: string[] = [];
      if (n > 0) {
        lines.push(m === 0 ? `지나온 시기 중에 ${NAT_STATE[N]}이 앞에 선 때는 한 번도 없었습니다.` : m / n >= 0.5 ? `지나온 시기의 상당 부분에서 ${NAT_STATE[N]}이 앞에 서 있었습니다.` : `지나온 시기 중 ${NAT_STATE[N]}이 앞에 선 때도 있었지만, 다른 쪽이 앞에 선 때가 더 많았습니다.`);
      }
      const rels = pastPhases.map((ph, i) => ({ i, c: ph.category as Cat | null, r: ph.category ? relOf(ph.category as Cat, N) : null })).filter((x) => x.c);
      const find = (r: Rel) => [...rels].reverse().find((x) => x.r === r);
      const pr = find("presses"), same = find("same"), fe = find("feeds"), su = find("supported"), pd = find("pressed");
      const rl: string[] = [];
      if (pr) rl.push(`${ord(pr.i)}에 익숙했던 것은 ${PAST_SHORT[pr.c!]}이라, ${N === "비겁" ? "내 식으로 정하는 것과는" : "내 성향과는"} 거리가 있었을 수 있습니다. ${PRESS_PAST[N]}`);
      const second = same ? `${ord(same.i)}에는 내 성향과 같은 쪽이 앞에 서 있어서, 애써 맞추지 않아도 움직이기 편했을 수 있습니다.`
        : fe ? `${ord(fe.i)}에 익숙했던 것은 ${PAST_SHORT[fe.c!]}인데, ${FE_TXT[N]}`
        : su ? `${ord(su.i)}에는 ${PAST_TASK[su.c!]}에 익숙했을 수 있는데, ${SU_TXT[N]}`
        : pd ? `${ord(pd.i)}에는 부담이 덜했을 수 있습니다. ${PAST_TASK[pd.c!]}은 필요한 것만 골라 내 식으로 처리하기가 상대적으로 쉬웠기 때문입니다.` : "";
      if (second) rl.push(second);
      ps.push({ text: jd([...lines, ...rl]) || "지나온 시기가 아직 없어 비교할 내용이 없습니다.", note: `지난 대운 ${n}개 중 중심축 일치 ${m}, 국면 관계 ${rels.map((x) => `${x.c}:${x.r}`).join(",")}` });
    }
    sections.push({ heading: "③ 타고난 기준과 시기가 요구한 방식", paras: ps });
  }

  // ═══ ④ ═══
  {
    const ps: Para[] = [];
    if (!hasCur || !C) {
      const last = pastPhases[pastPhases.length - 1];
      ps.push({ text: last?.category ? `현재 계산되는 큰 시기는 모두 지났기 때문에 지금 시기를 따로 말하기는 어렵습니다. 대신 마지막으로 지난 시기에 익숙했던 것은 ${PAST_SHORT[last.category as Cat]}이었고, 그 습관이 지금도 남아 있을 수 있습니다.` : "지금 시기를 따로 짚기는 어렵습니다.", note: "현재 대운 없음" });
      if (last?.category && N) {
        const r = relOf(last.category as Cat, N);
        const A = SECOND_SHORT[N]; ps.push({ text: r === "same" ? "그 마지막 시기에 익숙했던 것은 내가 원래 편한 방식과 같아서, 몸에 밴 습관과 원래 방식이 크게 다르지 않습니다." : r === "presses" ? `그 마지막 시기에 익숙했던 것은 내가 원래 편한 방식(${A})과 부딪히기 쉬운 것이었습니다. 몸에 밴 습관과 원래 방식 사이에 거리가 있을 수 있습니다.` : r === "feeds" ? `그 마지막 시기에 익숙했던 것은 내가 원래 편한 방식(${A})에서 한 걸음 더 나아간 것이라, 몸에 밴 습관이 원래 방식과 크게 어긋나지 않을 수 있습니다.` : r === "supported" ? `그 시기에는 내가 원래 편한 방식(${A})을 함께 쓸 일도 있어서, 몸에 밴 습관 덕분에 원래 방식을 쓰기가 수월했을 수 있습니다.` : `그 시기에 익숙했던 것은 내가 원래 편한 방식(${A})을 유지하면서 필요한 부분만 골라 내 식으로 처리할 수 있는 것이라, 몸에 밴 습관도 내 식으로 다듬어 쓰고 있을 수 있습니다.`, note: `마지막 국면 vs 중심축 ${r}` });
      }
    } else {
      const nb = NOW[curSS];
      const prev = daYun.past;
      ps.push({ text: nb.a1, note: `현재 십성 ${curSS}` });
      ps.push({ text: jd([nb.a2, prev && PREV_SHORT[prev.ganSipseong] ? `바로 앞 시기에는 ${PREV_SHORT[prev.ganSipseong]} 쪽이 익숙했는데, 그것과는 달라진 점입니다.` : ""]), note: `바로 앞 십성 ${prev?.ganSipseong ?? "없음"}` });
      ps.push({ text: nb.b, note: `현재 십성 ${curSS}의 어려운 점` });
      if (N) {
        const r = relOf(C, N);
        const t: Record<Rel, string> = {
          same: `지금 하는 일(${REQ[C]})은 내가 원래 편한 방식과 같아서, 애써 맞추지 않아도 편하게 나오는 때입니다.`,
          feeds: `이런 모습은 억지가 아닙니다. 원래 ${NAT_ORIG[N]} 성향에서 이어져 나온 것이라, 하는 동안 크게 어색하지 않을 수 있습니다.`,
          supported: `지금 하는 일(${REQ[C]})을 하다 보면, 내가 원래 편한 방식(${SECOND_SHORT[N]})을 쓸 일도 함께 늘어날 수 있습니다.`,
          presses: `지금 하는 일(${REQ[C]})은 내가 원래 편한 방식(${SECOND_SHORT[N]})과 부딪히기 쉽습니다. ${PRESS_NOW[N]} 그래서 지금은 원래 방식보다 그 일에 맞춰 움직이게 됩니다.`,
          pressed: `지금 하는 일(${REQ[C]})은 내가 원래 편한 방식(${SECOND_SHORT[N]})을 유지하면서 필요한 부분만 골라 내 식으로 처리하는 편입니다.`,
        };
        ps.push({ text: t[r], note: `현재 ${C} vs 중심축 ${N}: ${r}` });
      }
      const balT: Record<string, string> = {
        neutral: "일이 술술 풀리는 때에는 여러 개를 동시에 굴려도 버티지만, 갑자기 일이 몰리면 금방 벅차합니다. 힘이 늘 남는 편도, 늘 모자란 편도 아니라서 그 차이가 상황에 따라 크게 납니다.",
        slightlyStrong: "일이 한꺼번에 몰려도 큰 무리 없이 버티는 편입니다.",
        clearlyStrong: "일이 한꺼번에 몰려도 넉넉하게 버팁니다.",
        slightlyWeak: "혼자 다 받기에는 힘이 다소 모자라서, 일이 몰리면 금방 벅차집니다.",
        clearlyWeak: "일이 몰리면 금방 벅차서, 여러 개를 동시에 받기는 어렵습니다.",
      };
      if (balT[bal]) ps.push({ text: balT[bal], note: `강약 ${bal}` });
      if (relations.current.length) {
        const ch = [...new Set(relations.current.filter((r) => r.type === "충").map((r) => STAGE_PLAIN[r.natalStage]))].join(", ");
        const he = [...new Set(relations.current.filter((r) => r.type === "합").map((r) => STAGE_PLAIN[r.natalStage]))].join(", ");
        ps.push({ text: jd([ch ? `지금은 ${ch} 쪽에서 변화가 생기기 쉬운 때이기도 합니다.` : "", he ? `${he} 쪽에서는 새로 맺어지는 관계나 일이 생기기 쉬운 때이기도 합니다.` : ""]), note: `현재 합충 ${relations.current.map((r) => r.type + r.natalStage).join("+")}` });
      }
    }
    sections.push({ heading: "④ 지금 서 있는 시기", paras: ps });
  }

  // ═══ ⑤ ═══ (다음 대운이 없으면 만들지 않는다)
  if (hasCur && C && X && nxt) {
    const ps: Para[] = [];
    const rNx: Rel | null = N ? relOf(X, N) : null;
    if (X !== C) {
      const END: Record<string, string> = {
        same: "이 지금보다 편해질 수 있습니다.",
        feeds: "이 원래 성향에서 이어지는 모습이라 크게 낯설지 않을 수 있습니다.",
        supported: "이 늘고, 원래 성향을 함께 쓸 일도 늘 수 있습니다.",
        presses: "이 늘어나는데, 이 모습은 원래 편한 방식과 달라서 부담이 커질 수 있습니다.",
        pressed: "이 늘고, 그 안에서 필요한 것만 골라 내 식으로 처리하게 될 수 있습니다.",
        none: "이 늘 수 있습니다.",
      };
      ps.push({ text: `${year}년 무렵부터는 움직이는 모습이 지금과 달라질 수 있습니다. 지금은 ${START_CUR[C]}인데, 그때부터는 ${START_NEXT[X]}${END[rNx ?? "none"]} ${FADE_S[C]}, ${TAIL[X]} 쪽으로 기울 수 있습니다.`, note: `현재 ${C} → 다음 ${X}, 다음 vs 중심축: ${rNx ?? "없음"}, 시작 연도 ${year}` });
      ps.push({ text: `함께 일하는 사람과의 모습도 달라집니다. 지금은 ${PEOPLE_CUR[C]}이라면, 그때는 ${PEOPLE_NEXT[X]}`, note: `사람과의 모습 ${C}→${X}` });
      const nph = futurePhases[0]; const s1 = nph?.periods[0]?.ganSipseong, s2 = nph?.periods[1]?.ganSipseong;
      if (s1 && FUT[s1]) ps.push({ text: s2 && FUT[s2] && s2 !== s1 ? `처음에는 ${FUT[s1]}입니다. 그 뒤로는 ${s2 === "겁재" ? "비슷한 위치의 사람과 무언가를 나누거나 서로 겨루게 되는 일이 생길 수 있습니다." : `${FUT[s2]}이 나타날 수 있습니다.`}` : `다음 시기의 시작은 ${FUT[s1]}입니다.`, note: `다음 국면 십성 ${s1}${s2 ? "→" + s2 : ""}` });
      ps.push({ text: `지금의 "${HQ[C]}" 습관이 사라지지는 않습니다. 다만 그때는 그 습관보다 ${NF[X]} 쪽이 앞설 수 있습니다.`, note: "현재 습관이 물러남" });
    } else {
      const steady = STEADY.has(nxtSS);
      ps.push({ text: `${year}년 무렵에 다음 시기로 넘어가지만, 지금의 ${CUR_HEAD[C]} 모습은 이어집니다. 달라지는 것은 같은 일을 하는 모습입니다.`, note: `현재=다음 ${C}, 시작 연도 ${year}` });
      ps.push({ text: `지금은 ${HALF[curSS] ?? "여러 쪽이 섞인 쪽"}인데, 다음에는 ${HALF[nxtSS] ?? "여러 쪽이 섞인 쪽"}으로 넘어갑니다. ${steady ? "같은 일을 하더라도 서두르지 않고 하나씩 굳혀 가며 하게 될 수 있습니다." : "같은 일을 하더라도 더 빨리, 더 자주 바꿔 가며 하게 될 수 있습니다."}`, note: `십성 ${curSS}→${nxtSS}` });
    }
    sections.push({ heading: "⑤ 다음 전환에서 달라지는 것", paras: ps });
  }

  // ═══ ⑥ ═══
  if (hasCur && C && X && nxt) {
    const ps: Para[] = [];
    const rn = relations.next;
    const ch = [...new Set(rn.filter((r) => r.type === "충").map((r) => STAGE_PLAIN[r.natalStage]))].join(", ");
    const he = [...new Set(rn.filter((r) => r.type === "합").map((r) => STAGE_PLAIN[r.natalStage]))].join(", ");
    const HE = (h: string) => `${h} 쪽에서는 새로 맺어지는 관계나 일이 생기기 쉬운 시기이기도 합니다.`;
    const rnNote = rn.length ? rn.map((r) => r.type + r.natalStage).join("+") : "없음";
    if (X !== C) {
      ps.push({ text: jd([CLASH[X], ch ? `또 ${ch} 쪽에서 변화가 생기기 쉬운 시기이기도 합니다.` : "", he ? HE(he) : ""]), note: `다음 ${X}의 부딪힘, 다음 합충 ${rnNote}` });
      if (X === "비겁") ps.push({ text: "이런 상황에서는 일을 시작하기 전에 누가 무엇을 맡는지부터 말로 정해 두면 부딪힘이 줄어들 수 있습니다.", note: "비겁의 각자 몫에서 나온 대응" });
      else if (X === "식상") ps.push({ text: "이런 상황에서는 새 일을 시작하기 전에 지금 하는 일을 어디까지 끝낼지부터 정해 두면 마무리가 겹치는 부담이 줄어들 수 있습니다.", note: "식상의 마무리 부담에서 나온 대응" });
    } else {
      ps.push({ text: jd(["다음 시기에도 같은 종류의 일이 이어지기 때문에, 새로 크게 달라지는 부담은 없을 수 있습니다.", ch ? `또 ${ch} 쪽에서 변화가 생기기 쉬운 시기이기도 합니다.` : "", he ? HE(he) : ""]), note: `현재=다음 ${C}(부담·관계 문장은 ④와 겹쳐 생략), 다음 합충 ${rnNote}` });
    }
    if (N && X !== C) {
      const r = relOf(X, N); const rc = relOf(C, N);
      const t: Record<Rel, string> = {
        same: `방법이 바뀌는 것 자체는 힘들지 않을 가능성이 큽니다. 다음 시기는 원래 성향과 같은 쪽이라, 지금보다 ${NAT_ACT[N]}이 늘어나는 것이 오히려 익숙하게 느껴질 수 있습니다.`,
        feeds: `다음 시기에 자주 하게 되는 일(${REQ[X]})은 내가 원래 편한 방식(${SECOND_SHORT[N]})에서 한 걸음 더 나아간 것이라, 방법이 바뀌어도 크게 어렵지 않을 수 있습니다.`,
        supported: `다음 시기에 자주 하게 되는 일(${REQ[X]})은 내가 원래 편한 방식과 다르지만, 그 일을 하는 동안 내 방식(${SECOND_SHORT[N]})을 쓸 일도 함께 늘 수 있습니다.`,
        presses: `다음 시기에 자주 하게 되는 일(${REQ[X]})은 내가 원래 편한 방식(${SECOND_SHORT[N]})과 부딪히기 쉽습니다.${rc === "presses" ? " 지금 느끼는 부담이 그대로 이어질 수 있습니다." : ` ${PRESS_NOW[N]}`}`,
        pressed: `다음 시기에 자주 하게 되는 일(${REQ[X]})은 내가 원래 편한 방식(${SECOND_SHORT[N]})을 유지하면서 필요한 부분만 골라 내 식으로 처리할 수 있습니다.`,
      };
      ps.push({ text: t[r], note: `다음 ${X} vs 중심축 ${N}: ${r}` });
    }
    if (yo.applicable && (yo.outcome === "single" || yo.outcome === "multiple") && yo.winners.length) {
      const w = yo.winners as Cat[];
      const wl = w.map((c) => LEAN[c]).join(", 또는 ");
      ps.push({ text: w.includes(X) ? `나에게 특히 도움이 되는 방식은 ${wl}입니다. 다음 시기에 자주 하게 되는 일이 이 방식과 같아서, 이 시기에는 그대로 써도 무리가 없습니다.` : `나에게 특히 도움이 되는 방식은 ${wl}입니다. 다음 시기에 자주 하게 되는 일은 이 방식과 달라서, 그 일에 맞추기만 하기보다 중간중간 이 방식을 섞으면 부담을 줄일 수 있습니다.`, note: `용신 ${yo.outcome} winners=${w.join("/")}, 다음∈winners=${w.includes(X)}` });
    }
    sections.push({ heading: "⑥ 흔들릴 수 있는 곳과 도움이 되는 것", paras: ps });
  }

  // ═══ ⑦ ═══
  {
    const ps: Para[] = [];
    if (N) {
      const past = periods.filter((p) => p.state === "past"); const n = past.length, m = past.filter((p) => p.ganCategory === N).length;
      const rNx: Rel | null = hasCur && C && X ? relOf(X, N) : null;
      const rCu: Rel | null = hasCur && C ? relOf(C, N) : null;
      const lastCat = pastPhases.length ? (pastPhases[pastPhases.length - 1].category as Cat | null) : null;
      const rLast: Rel | null = !hasCur && lastCat ? relOf(lastCat, N) : null;
      meta.rN = rNx; meta.rC = rCu; meta.rLast = rLast;
      const pastS = n === 0 ? "" : m === 0 ? "지나온 시기에는 이 성향과 같은 쪽이 앞에 선 적이 없었습니다." : m / n >= 0.5 ? "지나온 시기에는 대체로 이 성향이 그대로 쓰였습니다." : "지나온 시기에는 이 성향이 앞에 선 때도, 다른 쪽에 밀린 때도 있었습니다.";
      const FUT_SAME = "다음 시기에는 이 성향과 같은 쪽이 앞에 서기 때문에, 이 성향이 그대로 쓰이기 쉽습니다.";
      const grow = X === C ? "이어져서" : "늘어서";
      const pressT = (pre: string) => `${pre}다음 시기에는 ${X ? REQ[X] : ""}이 ${grow}, ${KEEP[N]}은 뒤로 밀리기 쉽습니다.`;
      let body = "";
      if (rNx === "presses") {
        body = n === 0 ? pressT("")
          : m === 0 ? pressT("지나온 시기에도 이 성향이 앞에 선 적이 없었는데, ").replace("뒤로 밀리기", "계속 뒤로 밀리기")
          : m / n >= 0.5 ? pressT("지나온 시기에는 대체로 이 성향이 그대로 쓰였지만, ")
          : pressT("지나온 시기에는 이 성향이 앞에 선 때도, 다른 쪽에 밀린 때도 있었는데, ");
      } else if (rNx === "same") body = jd([pastS, FUT_SAME]);
      else if (rNx) body = pastS;
      else if (rCu === "presses") body = jd([pastS, `지금 시기에는 ${REQ[C!]}이 앞서서, ${KEEP[N]}은 뒤로 밀린 채 쓰이고 있을 수 있습니다.`]);
      else body = pastS;
      ps.push({ text: `가져갈 것은 ${KEEP[N]}입니다. ${body}`.trim(), note: `중심축 ${N}, 지난 대운 중 일치 ${m}/${n}, 다음 vs 중심축 ${rNx ?? "-"}, 현재 vs 중심축 ${rCu ?? "-"}, 마지막 지난 국면 vs 중심축 ${rLast ?? "-"}` });
      // 내려놓을 것: 계산 관계가 뒷받침될 때만
      if (hasCur && C && X) {
        if (X === C) ps.push({ text: STEADY.has(nxtSS) ? "내려놓아도 되는 것은 서둘러 처리하는 습관입니다. 다음 시기에는 같은 일이라도 하나씩 굳혀 가는 쪽이 앞설 수 있습니다." : "내려놓아도 되는 것은 한 가지 방식만 계속 붙잡는 습관입니다. 다음 시기에는 같은 일이라도 더 빨리, 더 자주 바꿔 가며 하는 쪽이 앞설 수 있습니다.", note: `십성 ${curSS}→${nxtSS}` });
        else if (C === N) ps.push({ text: `내려놓아도 되는 것은 지금 하던 방법 자체가 아니라, 다음 시기에 ${RELEASE[N]}이 다시 나타날 수 있을 때 그것에만 맞추는 것입니다.`, note: "현재=중심축" });
        else ps.push({ text: `내려놓아도 되는 것은 ${RELEASE[C]}입니다. 지금 시기에 몸에 붙기 쉬운 습관이지만, 다음 시기부터는 ${X === "비겁" ? "무엇을 할지 먼저 정하고 시작하는" : NF[X]} 쪽이 앞설 수 있습니다.${C === "식상" ? " 지금 시기에 시작만 해 두고 남긴 일이 있다면, 새 일보다 그 일을 끝내는 쪽이 먼저입니다." : ""}`, note: `현재 ${C} 습관 / 다음 ${X}` });
      } else if (hasCur && C && !X && rCu === "presses") {
        ps.push({ text: `내려놓아도 되는 것은 ${RELEASE[C]}입니다. 지금 시기 때문에 앞세우게 된 습관이라, 이 성향과 어긋나는 만큼 굳이 더 붙잡지 않아도 됩니다.`, note: "다음 대운 없음 · 현재가 중심축을 누름" });
      } else if (!hasCur && lastCat && rLast === "presses") {
        ps.push({ text: `내려놓아도 되는 것은 ${RELEASE[lastCat]}입니다. 마지막으로 지난 시기의 습관은 이 성향과 어긋나는 것이었으니, 굳이 더 붙잡지 않아도 됩니다.`, note: "현재 대운 없음 · 마지막 시기가 중심축을 누름" });
      }
    }
    if (ps.length) sections.push({ heading: "⑦ 가져갈 것과 내려놓을 것", paras: ps });
  }
  return { sections, meta };
}
function SS_HALF(ss: string): string { return HALF[ss] ?? ""; }
