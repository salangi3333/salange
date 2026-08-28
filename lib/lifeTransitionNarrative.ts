import { AppData } from "./sajuContent";
import { buildLifeFlowKey, LifeFlowKey } from "./lifeFlowInterpretation";
import { buildLifeFlowNarrative } from "./lifeFlowNarrative";
import { SipseongCategory } from "./strengthAnalysis";

/**
 * 유료 제3장 "인생의 전환점" 전용 NARRATIVE 레이어.
 *
 * 새 명리 계산을 하지 않는다 — buildLifeFlowKey(이미 승인·동결된 계산,
 * lifeFlowInterpretation.ts)가 만든 판단값(phases/currentPhaseIndex/
 * natalAxis/daYun)만 읽는다. ③은 buildLifeFlowNarrative가 이미 만들어
 * 검증까지 끝난 daYunFlowLocked.next를 그대로 재사용한다(신규 계산도
 * 신규 문장도 아님) — 조사 단계에서 "다음 흐름 설명에 활용 가치 높음"으로
 * 판정된 자산이기 때문이다.
 *
 * lifeFlowNarrative.ts/lifeFlowInterpretation.ts는 이 파일에서 전혀
 * 수정하지 않는다(import해서 읽기만 한다) — STAGE_LABEL/CATEGORY_LIFE_MEANING
 * 같은 그 파일의 작은 고정표를 export시켜 끌어오는 대신, 이 파일에
 * 판단/행동/관계 축 전용 표를 독립적으로 새로 둔다. seunAnalysis.ts가
 * daYunWealthAnalysis.ts의 지장간표를 독립적으로 복제해 둔 것과 같은
 * 패턴 — 기존 파일을 한 글자도 건드리지 않기 위한 선택이다.
 *
 * ①②④는 이 파일에서 새로 조립한 문장이지만, 전부 이미 계산되어 있는
 * LifeFlowKey 필드(phase.category/startAge/endAge, currentPhaseIndex,
 * natalAxis, daYun.next.ganCategory)만 참조한다 — 3~4장·사랑장이
 * 이미 하는 것과 같은 "계산은 그대로, 문장만 새로 쓴다" 패턴이다.
 *
 * 무료 화면(bigPicturePublic/daYunFlowPublic)과 겹치지 않도록, 이
 * 파일에서는 "삶의 앞자리에 어떤 힘이 있다"는 사실 자체를 반복하지 않고,
 * 그 힘이 판단 방식·행동 방식·관계 태도로 어떻게 나타나는지에만 집중한다.
 * 재물/명리 용어 뜻풀이(십성 한자 등)는 재물4장·lifeFlowNarrative가 이미
 * 다루므로 이 파일에서 반복하지 않는다.
 */

const CATEGORY_JUDGMENT: Record<SipseongCategory, string> = {
  비겁: "다른 의견보다 스스로 옳다고 확신한 쪽을 따라 결정하는",
  식상: "생각한 것을 직접 표현하거나 실행해봐야 판단이 서는",
  재성: "눈에 보이는 결과나 실익을 먼저 따져 판단하는",
  관성: "정해진 기준과 맡은 책임을 먼저 살펴 판단하는",
  인성: "충분히 이해하고 납득한 뒤에야 움직이는",
};

const CATEGORY_BEHAVIOR: Record<SipseongCategory, string> = {
  비겁: "스스로 주도해서 밀어붙이는",
  식상: "생각을 적극적으로 꺼내 벌이는",
  재성: "실질적인 성과로 옮기는",
  관성: "맡은 역할을 끝까지 책임지는",
  인성: "받아들이고 정리하며 신중하게 움직이는",
};

const CATEGORY_RELATION: Record<SipseongCategory, string> = {
  비겁: "각자의 영역을 존중받고 싶어 하는",
  식상: "감정과 생각을 있는 그대로 표현하고 싶어 하는",
  재성: "실질적으로 도움을 주고받는 관계를 중요하게 여기는",
  관성: "서로의 역할과 약속을 지키는 것을 중요하게 여기는",
  인성: "이해받고 신뢰를 쌓는 것을 중요하게 여기는",
};

export interface LifeTransitionSection {
  heading: string;
  body: string;
}

export interface LifeTransitionContent {
  title: string;
  sections: LifeTransitionSection[];
}

// ────────────────────────────────────────────────────────────────
// ① 지나온 시간은 나를 어떻게 만들었나
// ────────────────────────────────────────────────────────────────

function buildPastImpact(key: LifeFlowKey): string {
  const { phases, currentPhaseIndex } = key;
  const prev = phases[currentPhaseIndex - 1];

  if (!prev) {
    return "아직 첫 번째 삶의 국면을 지나는 중이라, 비교할 만한 이전 흐름은 없습니다. 지금 서 있는 자리가 곧 이 사람의 출발점입니다.";
  }
  if (!prev.category) {
    return `${prev.startAge}세부터 ${prev.endAge}세까지는 하나의 힘으로 뚜렷하게 정리되기보다, 여러 힘이 번갈아 작동했던 시기였습니다.`;
  }

  const years = prev.endAge - prev.startAge + 1;
  return `${prev.startAge}세부터 ${prev.endAge}세까지 ${years}년 동안은, ${CATEGORY_JUDGMENT[prev.category]} 편이 익숙한 시기였습니다. 그만큼 ${CATEGORY_BEHAVIOR[prev.category]} 태도가 삶의 방식으로 자리 잡았고, 관계에서도 ${CATEGORY_RELATION[prev.category]} 쪽에 무게가 실렸습니다. 오랜 시간 반복되며 몸에 밴 이 방식은, 지금도 판단이 필요한 순간이면 가장 먼저 떠오르는 습관으로 남아 있습니다.`;
}

// ────────────────────────────────────────────────────────────────
// ② 지금 나는 어떤 흐름 위에 서 있는가
// ────────────────────────────────────────────────────────────────

function buildCurrentStance(key: LifeFlowKey): string {
  const { phases, currentPhaseIndex, natalAxis } = key;
  const current = phases[currentPhaseIndex];
  const prev = phases[currentPhaseIndex - 1];

  if (!current || !current.category) {
    return "지금은 하나의 힘으로 뚜렷하게 정리되기보다, 여러 힘이 함께 작동하는 시기에 가깝습니다.";
  }

  const changed = Boolean(prev?.category && prev.category !== current.category);
  const lead =
    changed && prev?.category
      ? `예전에는 ${CATEGORY_JUDGMENT[prev.category]} 쪽에 가까웠다면, 지금은 조금씩 ${CATEGORY_JUDGMENT[current.category]} 쪽으로 무게가 옮겨오고 있습니다.`
      : prev?.category
        ? `예전부터 이어온 ${CATEGORY_JUDGMENT[current.category]} 방식이 지금도 그대로 이어지고 있습니다.`
        : `지금은 ${CATEGORY_JUDGMENT[current.category]} 방식이 삶의 앞자리에 있습니다.`;

  const axisNote =
    current.category === natalAxis
      ? " 타고난 중심축과 같은 성질의 힘이 지금 삶의 앞자리에 있어, 원래 갖고 있던 성향이 그대로 강하게 드러나는 시기이기도 합니다."
      : "";

  return `${lead} 그래서 선택 앞에서 ${CATEGORY_BEHAVIOR[current.category]} 쪽을 택하는 경우가 많고, 관계에서도 ${CATEGORY_RELATION[current.category]} 태도가 두드러집니다.${axisNote}`;
}

// ────────────────────────────────────────────────────────────────
// ③ 다음 큰 흐름에서 달라지는 것 — daYunFlowLocked.next를 그대로 재사용
// ────────────────────────────────────────────────────────────────

function buildNextShift(nextLockedText: string): string {
  return nextLockedText;
}

// ────────────────────────────────────────────────────────────────
// ④ 전환점에서 기억해야 할 것 — 현재/다음 대운 카테고리 조합으로
// "가져갈 것 / 앞세울 것"을 결정론적으로 조립한다. 5종 중 택1이
// 아니라, currentCategory×nextCategory 두 축을 모두 문장에 반영해
// 조합 수를 실질적으로 늘린다(같은 카테고리 유지 5가지 + 전환 20가지).
// ────────────────────────────────────────────────────────────────

function buildKeyPrinciple(key: LifeFlowKey): string {
  const current = key.phases[key.currentPhaseIndex];
  const currentCategory = current?.category ?? null;
  const nextCategory = key.daYun.next?.ganCategory ?? null;

  if (!currentCategory || !nextCategory) {
    return "지금까지 지나온 국면들을 돌아보면, 삶의 중심은 한 가지 힘에 고정되지 않고 시기마다 자연스럽게 옮겨왔습니다. 다음 흐름 역시 그 연장선에서, 지금 서 있는 자리를 있는 그대로 받아들이는 것이 출발점이 됩니다.";
  }

  if (currentCategory === nextCategory) {
    return `지금 ${CATEGORY_BEHAVIOR[currentCategory]} 방식은 다음 흐름에서도 그대로 가져가도 됩니다. 새로 바꾸기보다, ${CATEGORY_JUDGMENT[currentCategory]} 감각을 한 번 더 정교하게 다듬어가는 쪽이 이 사람에게는 더 유리합니다.`;
  }

  return `지금까지는 ${CATEGORY_BEHAVIOR[currentCategory]} 방식이 중심이었습니다. 이 방식을 완전히 버릴 필요는 없지만, ${CATEGORY_RELATION[currentCategory]} 태도는 그대로 가져가면서 ${CATEGORY_BEHAVIOR[nextCategory]} 감각을 조금씩 앞세워보는 것이 다음 흐름에는 더 잘 맞습니다.`;
}

// ────────────────────────────────────────────────────────────────

export function buildLifeTransitionNarrative(appData: AppData): LifeTransitionContent {
  const key = buildLifeFlowKey(appData);
  const lifeFlow = buildLifeFlowNarrative(appData, key);

  return {
    title: "인생의 전환점",
    sections: [
      { heading: "① 지나온 시간은 나를 어떻게 만들었나", body: buildPastImpact(key) },
      { heading: "② 지금 나는 어떤 흐름 위에 서 있는가", body: buildCurrentStance(key) },
      { heading: "③ 다음 큰 흐름에서 달라지는 것", body: buildNextShift(lifeFlow.daYunFlowLocked.next) },
      { heading: "④ 전환점에서 기억해야 할 것", body: buildKeyPrinciple(key) },
    ],
  };
}
