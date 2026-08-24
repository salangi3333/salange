import { AppData } from "./sajuContent";
import { Stage } from "./natalStructure";
import { ChapterThreeKey, HeChongPattern } from "./chapterThreeInterpretation";
import { SipseongCategory } from "./strengthAnalysis";

/**
 * 3챕터("살아가는 방식과 관계운") 전용 NARRATIVE층. chapterThreeInterpretation
 * .ts가 만든 판단값(중심축·세력등급·통근·합충·관살혼잡)을 실제 문장으로
 * 조립한다.
 *
 * 승인 원칙:
 *  - GAN_PROFILE.lifestyle / CH3_FACT 등 기존 오행·일간 공통 문장뱅크는
 *    핵심 서사로 쓰지 않는다(이 파일 어디서도 import하지 않는다).
 *  - 핵심 문장은 실제 명식 조합(축·세력등급·통근 위치·합충 패턴·관살혼잡)
 *    으로만 결정한다 — 이름과 몇 단어만 바뀌는 단일 템플릿이 아니라,
 *    아래 조건들의 조합 수만큼 실제로 다른 글이 나온다.
 *  - 승인된 홍지영/한소민/윤태호 3편의 표현을 그대로 재사용할 수 있는
 *    부분(관살혼잡 문장, 통근 없음 문장, 합충 겹침 문장 등)은 그 표현을
 *    그대로 옮겼다.
 */

const STAGE_LABEL: Record<Stage, string> = {
  year: "초년의 자리",
  month: "사회로 나가는 자리",
  day: "자기 자신이 선 자리",
  hour: "말년의 자리",
};

interface AxisProfile {
  coreLabel: string;
  lifeManner: string;
  pressureVerb: string;
  /** 관계에서 이 축이 만드는 결과 — 승인된 홍지영·윤태호 원고의 마무리
   * 통찰을 5축 전체로 일반화한 것. */
  relationalConsequence: string;
  actionTip: string;
}

const AXIS_PROFILE: Record<SipseongCategory, AxisProfile> = {
  비겁: {
    coreLabel: "자기 힘으로 서려는 마음",
    lifeManner: "넓게 나누기보다, 스스로 판단하고 밀어붙일 수 있는 영역에서 더 큰 힘을 냅니다.",
    pressureVerb:
      "압박이 들어와도 그대로 눌리지 않고, 판단으로 바꾸고 다시 행동으로 옮겨 결국 자기 방식의 결과를 만들어내는 쪽으로 씁니다. 남들이 이미 만들어 놓은 길을 그대로 따라가는 것보다 직접 부딪히면서 자신에게 맞는 방법을 찾아낼 때 오히려 힘이 살아납니다.",
    relationalConsequence:
      "그래서 가까운 사람에게도 좀처럼 기대는 모습을 보이지 않습니다. 정작 힘든 순간에도 티가 나지 않다 보니, 곁에 있는 사람은 언제 다가가야 할지 타이밍을 놓치기 쉽습니다.",
    actionTip: "다른 사람에게 기대는 연습도 필요합니다.",
  },
  식상: {
    coreLabel: "생각한 것을 겉으로 풀어내려는 힘",
    lifeManner: "속에 담아두기보다, 말과 행동으로 먼저 드러낼 수 있는 자리에서 더 큰 힘을 냅니다.",
    pressureVerb:
      "쌓인 압박을 안에 오래 묵히지 않고, 말이나 행동으로 바로 풀어내는 쪽을 택합니다. 표현하고 나서야 비로소 정리가 되는 편이라, 침묵을 오래 견디는 상황일수록 오히려 더 힘들어집니다.",
    relationalConsequence:
      "속에 담아두지 못하고 바로 드러내는 편이라, 가까운 사람일수록 그 감정을 고스란히 받아낼 때가 많습니다.",
    actionTip: "표현한 뒤에는 상대의 반응을 한 번 기다려볼 필요가 있습니다.",
  },
  재성: {
    coreLabel: "이득과 손해를 계산해 판단하는 힘",
    lifeManner: "사회가 정해놓은 기준보다, 스스로 계산이 서야 움직이는 편입니다. 상황을 읽고 실익을 따진 뒤에야 행동으로 옮깁니다.",
    pressureVerb:
      "상황이 흔들려도 감정보다 먼저 손익을 따져보고, 계산이 선 뒤에야 움직입니다. 확신이 서지 않은 채로 일단 뛰어드는 쪽은 아니라서, 판단이 끝나기 전까지는 신중하게 거리를 두는 편입니다.",
    relationalConsequence: "이득과 손해를 먼저 따지는 태도가, 정작 가까운 사이에서는 계산적으로 비칠 때가 있습니다.",
    actionTip: "계산이 서지 않아도 한 번은 믿고 맡겨볼 필요가 있습니다.",
  },
  관성: {
    coreLabel: "맡은 것을 끝까지 책임지려는 힘",
    lifeManner: "정해진 기준과 순서를 지킬 때 마음이 편해지고, 그 틀 안에서 신뢰를 쌓아갑니다.",
    pressureVerb:
      "맡은 몫이 버거워도 쉽게 내려놓지 못하고, 끝까지 책임지는 쪽으로 스스로를 몰아갑니다. 중간에 그만두는 걸 스스로에게 잘 허락하지 못하는 편입니다.",
    relationalConsequence: "정해진 기준을 지키려는 태도가, 가까운 사람에게는 융통성 없이 느껴질 때가 있습니다.",
    actionTip: "다 끝내지 않아도 괜찮다는 것을 스스로에게 허락해볼 필요가 있습니다.",
  },
  인성: {
    coreLabel: "받아들이고 정리한 뒤에 움직이려는 힘",
    lifeManner: "바로 반응하기보다, 먼저 이해하고 납득해야 움직이는 편입니다. 조용히 있는 것처럼 보여도 안에서는 계속 정리를 하고 있는 쪽에 가깝습니다.",
    pressureVerb:
      "즉흥적인 반응보다 한 박자 늦게, 그러나 신중하게 판단한 뒤에야 움직입니다. 급하게 결정을 내리는 상황일수록 오히려 판단이 흐트러지기 쉽습니다.",
    relationalConsequence: "바로 답하지 않고 먼저 정리하려는 태도가, 가까운 사람에게는 거리를 두는 것처럼 비칠 때가 있습니다.",
    actionTip: "생각이 끝나기 전에 일단 움직여보는 연습도 필요합니다.",
  },
};

function uniqueStages(stages: Stage[]): Stage[] {
  return Array.from(new Set(stages));
}

/** 마지막 글자 받침 유무로 "과/와"를 고른다 — 새 명리 사실이 아니라
 * 순수 조사 처리다. */
function josaGwaWa(word: string): "과" | "와" {
  const last = word.charCodeAt(word.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return "와";
  return (last - 0xac00) % 28 === 0 ? "와" : "과";
}

function joinKorean(items: string[]): string {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]}${josaGwaWa(items[0])} ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, ${items[items.length - 1]}`;
}

/** 관살혼잡 문장 — 2챕터(buildGwansalHonjapNote)와는 다른, 3챕터 전용
 * 목소리("두 관성이 함께 자리한다" 서술체)로 새로 쓴 것. 승인된 홍지영
 * 원고의 표현을 그대로 옮겼다. gwansal.present일 때 이 문장이 body[0](3장
 * 첫 문장)이 된다 — title에서 이미 이름을 썼으므로 여기서는 "이
 * 명식에는"으로 시작한다(이름 반복 정리, 문구 나머지는 그대로). */
function buildGwansalSentence(key: ChapterThreeKey): string | null {
  const { gwansal } = key;
  if (!gwansal.present || !gwansal.pyeongwan || !gwansal.jeonggwan) return null;
  const sameStage = gwansal.pyeongwan.stage === gwansal.jeonggwan.stage;
  const names = `${gwansal.pyeongwan.hangul}${gwansal.pyeongwan.hanja}·${gwansal.jeonggwan.hangul}${gwansal.jeonggwan.hanja}`;
  const posClause = sameStage
    ? `${names}, 둘 다 ${STAGE_LABEL[gwansal.pyeongwan.stage]}`
    : `편관 ${STAGE_LABEL[gwansal.pyeongwan.stage]}, 정관 ${STAGE_LABEL[gwansal.jeonggwan.stage]}`;
  return `이 명식에는 성격이 다른 두 관성, 편관과 정관이 함께 자리합니다(${posClause}). 하나는 상황 앞에서 즉각 움직이게 하고, 다른 하나는 맡은 것을 끝까지 책임지게 합니다. 겉으로는 차분하게 움직여도 안에서는 늘 "지금 해야 한다"와 "끝까지 제대로 해야 한다" 두 기준이 동시에 작동합니다.`;
}

function buildAxisIntro(name: string, key: ChapterThreeKey): string {
  const { axis, secondAxis, tier, gwansal } = key;
  if (!axis) return `${name}님의 명식은 특정한 기운 하나로 정리되지 않고, 여러 힘이 고르게 섞여 있습니다.`;

  const core = AXIS_PROFILE[axis].coreLabel;

  if (tier === "A") {
    const lead = gwansal.present ? "이 명식에서 가장 두드러지는 힘은" : `${name}님의 명식에서 가장 두드러지는 힘은`;
    return `${lead} ${core}입니다. 다른 어떤 기운보다 크게 앞서 있어, 살아가는 방식 전체를 사실상 이 힘 하나가 이끌고 있다고 봐도 무리가 없습니다.`;
  }
  if (tier === "C" && secondAxis) {
    const core2 = AXIS_PROFILE[secondAxis].coreLabel;
    const lead = gwansal.present ? "이 명식에는" : `${name}님의 명식에는`;
    return `${lead} ${core}${josaGwaWa(core)} ${core2}, 두 힘이 비슷한 크기로 맞서 있습니다. 상황에 따라 어느 쪽이 먼저 나서는지가 달라집니다.`;
  }
  // tier B (또는 second 없음)
  const lead = gwansal.present ? "이 명식에서 가장 뚜렷한 힘은" : `${name}님의 명식에서 가장 뚜렷한 힘은`;
  const secondClause =
    tier === "B" && secondAxis
      ? gwansal.present
        ? ` 앞서 말한 두 가지 기준은 이 힘 위에 더해지는 압박에 가깝습니다 — 이미 강한 이 힘 위에, 두 겹의 책임감까지 얹히는 셈입니다.`
        : ` 그 아래에는 ${AXIS_PROFILE[secondAxis].coreLabel}이 함께, 그러나 한 걸음 물러선 자리에서 작동합니다.`
      : "";
  return `${lead} ${core}입니다.${secondClause}`;
}

/**
 * 통근 문단 — 일간(day master) 자신의 통근과 중심축(category) 통근을
 * 서로 다른 근거로 분리한다.
 *  - "쉽게 무너지지 않는 이유가 있다"는 안정성/근기 문장은 반드시
 *    dayMasterRoot(analyzeRoot, 일간 자신 기준)를 근거로만 쓴다.
 *  - 중심축 통근은 "이 기운 자체가 실제로 지속 작동하는지"를 보여주는
 *    보조 문장으로 따로 둔다. 축이 비겁이면 두 근거가 사실상 같은
 *    지지를 가리키므로(비겁의 오행=일간의 오행) 중복을 피하기 위해
 *    보조 문장을 생략한다.
 */
function buildRootParagraph(key: ChapterThreeKey): string {
  const { dayMasterRoot, axis, hasAxisRoot, axisRootHits } = key;

  const dayMasterSentence = dayMasterRoot.hasRoot
    ? (() => {
        const stages = uniqueStages(dayMasterRoot.matches.map((m) => m.stage)).map((s) => STAGE_LABEL[s]);
        return `그럼에도 쉽게 흔들리지 않는 이유가 있습니다 — ${joinKorean(stages)}에 자기 자신의 뿌리가 내려 있기 때문입니다.`;
      })()
    : "다만 뿌리내릴 자리가 마땅치 않아, 한 가지 방식을 오래 고집하기보다 상황에 따라 스스로를 계속 다시 조정하는 편입니다.";

  const showAxisSupport = axis !== "비겁" && hasAxisRoot;
  const axisSentence = showAxisSupport
    ? (() => {
        const stages = uniqueStages(axisRootHits.map((h) => h.stage)).map((s) => STAGE_LABEL[s]);
        return ` 이 기운 역시 ${joinKorean(stages)}에 뿌리를 두고 있어, 일시적인 반응에 그치지 않고 실제 삶에서 꾸준히 작동합니다.`;
      })()
    : "";

  return `${dayMasterSentence}${axisSentence}`;
}

function buildRelationshipParagraph(key: ChapterThreeKey): string {
  const { heChong } = key;
  const label = (p: { a: { stage: Stage; zhi: string }; b: { stage: Stage; zhi: string } }) =>
    `${STAGE_LABEL[p.a.stage]}(${p.a.zhi})${josaGwaWa(p.a.zhi)} ${STAGE_LABEL[p.b.stage]}(${p.b.zhi})`;

  switch (heChong.pattern as HeChongPattern) {
    case "둘다없음":
      return "관계에서는 뚜렷한 마찰도, 강한 결속도 잘 드러나지 않습니다. 각자의 영역을 지키며 담담하게 관계를 맺어가는 편에 가깝습니다.";
    case "합만":
      return `관계에서는 ${label(heChong.he[0])}가 자연스럽게 손을 잡는 구조라, 특정한 사람 앞에서 유독 마음이 쉽게 열립니다. 그 결속이 관계의 중심이 되는 편입니다.`;
    case "충만":
      return `관계에서는 ${label(heChong.chong[0])}가 서로 부딪히는 구조라, 밖에서 쌓아온 것과 개인적으로 지키고 싶은 것 사이에서 자주 마찰이 생깁니다.`;
    case "겹침": {
      const o = heChong.overlap!;
      return `관계에서는 ${STAGE_LABEL[o.stage]}(${o.zhi})가 두 얼굴을 동시에 가집니다 — 한쪽과는 자연스럽게 손을 잡고, 다른 쪽과는 부딪힙니다. 겉으로 편안해 보이는 관계도 사실은 다른 자리에서 온 긴장을 함께 데리고 있는 셈이라, 오래 편했던 사이일수록 오히려 예상치 못한 순간에 마찰이 드러나기 쉽습니다.`;
    }
    case "안겹침":
      return `관계에서는 가까워지는 사람과 부딪히는 사람이 뚜렷하게 나뉩니다 — ${label(heChong.he[0])}는 자연스럽게 가까워지고, ${label(heChong.chong[0])}는 자주 부딪힙니다. 마음이 열리는 자리와 날이 서는 자리가 서로 다른 셈입니다.`;
  }
}

export interface ChapterThreeContent {
  title: string;
  killpoint: string;
  body: string[];
  highlight: string;
}

export function buildChapterThreeNarrative(appData: AppData, key: ChapterThreeKey): ChapterThreeContent {
  const name = appData.user.name;
  const axis = key.axis;

  const title = `${name}님의 살아가는 방식`;

  // killpoint는 title 바로 아래(빨간 강조 한 줄)라 title과 이름이 겹친다.
  // 이어지는 body[0](buildGwansalSentence/buildAxisIntro)에서 다시 한 번
  // 이름을 쓰므로, killpoint에서는 이름을 빼고 "이 사람"/주어 생략으로
  // 자연스럽게 잇는다(문구·의미는 그대로, 위치만 정리).
  let killpoint: string;
  if (!axis) killpoint = "한 가지 기운으로 정리되지 않는 사람입니다.";
  else if (key.tier === "A") killpoint = `이끄는 힘은 오직 하나, ${AXIS_PROFILE[axis].coreLabel}입니다.`;
  else if (key.tier === "C" && key.secondAxis)
    killpoint = "그 안에는 팽팽하게 맞서는 두 힘이 있습니다.";
  else killpoint = `중심은 ${AXIS_PROFILE[axis].coreLabel}입니다.`;

  const body: string[] = [];
  const gwansalSentence = buildGwansalSentence(key);
  if (gwansalSentence) body.push(gwansalSentence);
  body.push(buildAxisIntro(name, key));
  if (axis) {
    body.push(`${AXIS_PROFILE[axis].lifeManner} ${buildRootParagraph(key)}`);
    // 비겁 축의 pressureVerb("압박이 들어와도 그대로 눌리지 않고...")는
    // 바로 앞 문단(lifeManner: "스스로 판단하고 밀어붙일 수 있는 영역에서
    // 힘을 냄")·buildAxisIntro의 coreLabel("자기 힘으로 서려는 마음")과
    // 의미가 겹쳐 뺐다(승인됨) — 문장 자체는 AXIS_PROFILE에 그대로
    // 남아 있고, 다른 4개 축은 그대로 노출한다.
    if (axis !== "비겁") {
      body.push(AXIS_PROFILE[axis].pressureVerb);
    }
  }
  const relationship = buildRelationshipParagraph(key);
  const consequence = axis ? ` ${AXIS_PROFILE[axis].relationalConsequence}` : "";
  body.push(`${relationship}${consequence}`);

  const highlight = axis ? AXIS_PROFILE[axis].actionTip : "스스로를 하나의 틀에 가두지 않는 것이 필요합니다.";

  return { title, killpoint, body, highlight };
}
