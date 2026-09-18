import { AppData } from "./sajuContent";
import { Stage } from "./natalStructure";
import { SipseongCategory } from "./strengthAnalysis";
import { buildChapterThreeKey, ChapterThreeKey } from "./chapterThreeInterpretation";

/**
 * 第三章 유료 심화 — 1·2장 승인 문체 기준 스크래치본. 계산은 프로덕션
 * lib/chapterThreeDeepNarrative.ts와 100% 동일 — buildChapterThreeKey를
 * 그대로 재사용하고, chapterThreeInterpretation.ts/chapterThreeNarrative.ts
 * 는 import만 하고 손대지 않는다.
 *
 * 이번 라운드에 바뀐 것:
 *  1. 모든 section의 소제목(heading)을 "" 로 비웠다(1·2장과 동일 기준).
 *     대신 ⑤ 앞에 짧은 전환 문장 하나만 추가해 문단이 끊기지 않게 했다.
 *  2. "이 명식에는/이 힘이 실제로 자리한 곳이" 같은 계산 결과 보고체를
 *     ②④⑥에서 결과·행동 중심 문장으로 바꿨다.
 *  3. ④에서 편관·정관이 같은 기둥에 있을 때 같은 자리 이름이 그대로 두 번
 *     반복되던 버그(예: "사회로 나가는 자리·사회로 나가는 자리")를 고쳤다.
 *
 * 보존(승인됨, 이번에 안 건드림): DISHI_SCENE_TEXT/DISHI_TAIL_TEXT(12운성×
 * 축 렌즈 합성 구조), REPEAT_SCENE_BY_PATTERN, RELATION_MECHANISM_TEXT,
 * EASE_TIP_TEXT, findAxisStages/comfort·tension 계산, "第三章의 발견"의
 * 4갈래 결론 로직 그 자체.
 *
 * [C 최소수정, 이번 라운드] 11명 시뮬레이션에서 발견된 "고정 전환문이
 * 여러 사람에게 토씨 하나 안 바뀌고 반복" 문제 3곳 — BRIDGE_SENTENCE
 * (섹션① 첫 문장), buildComfortConditionBody의 리드 문장(섹션⑤),
 * "第三章의 발견"의 touchingTension 리드 절(섹션⑥) — 을 각각 tier/axis/
 * heChong.pattern(전부 이미 계산된 값)으로 결정적 변형하도록 고쳤다.
 * Math.random·이름 해시 없음. 홍지영 조건(tier=B, axis=비겁,
 * heChong=충만)에 해당하는 변형은 전부 원문 그대로 유지해 기존 승인
 * 원문이 바뀌지 않게 했다.
 */

const STAGE_LABEL: Record<Stage, string> = {
  year: "초년의 자리", month: "사회로 나가는 자리", day: "자기 자신이 선 자리", hour: "말년의 자리",
};

const STAGE_HINT: Record<Stage, string> = {
  year: "어린 시절과 뿌리", month: "사회생활과 일", day: "나 자신의 중심", hour: "노후와 마무리",
};

const SIPSEONG_TO_CATEGORY: Record<string, SipseongCategory> = {
  비견: "비겁", 겁재: "비겁", 식신: "식상", 상관: "식상",
  편재: "재성", 정재: "재성", 편관: "관성", 정관: "관성",
  편인: "인성", 정인: "인성",
};

function josaGwaWa(word: string): "과" | "와" {
  const last = word.charCodeAt(word.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return "와";
  return (last - 0xac00) % 28 === 0 ? "와" : "과";
}

// [보존, 원문 그대로] 12운성 문장 템플릿 + 축별 렌즈 합성.
// [신규, 최소] "왜 흔들리는가" 마무리 문장에서 카테고리명을 그대로 원인
// 주어로 쓰지 않기 위한 사람 언어 표현 — chapterThreeNarrative_v2.ts의
// AXIS_PROFILE.coreLabel과 같은 값. 새 판정이 아니라 순수 표현용 상수라
// 파일 간 의존을 늘리지 않으려고 그대로 복제했다.
const AXIS_CORE_LABEL: Record<SipseongCategory, string> = {
  비겁: "자기 힘으로 서려는 마음",
  식상: "생각한 것을 겉으로 풀어내려는 힘",
  재성: "이득과 손해를 계산해 판단하는 힘",
  관성: "맡은 것을 끝까지 책임지려는 힘",
  인성: "받아들이고 정리한 뒤에 움직이려는 힘",
};

const AXIS_RELATION_LENS: Record<SipseongCategory, string> = {
  비겁: "자기 기준을 지키는 것",
  식상: "마음을 표현하는 것",
  재성: "주고받는 셈을 따지는 것",
  관성: "맡은 몫과 책임을 지키는 것",
  인성: "상대를 이해하고 받아들이는 것",
};

// [수정: C] 유료 심화의 첫 문장이 11명 전원에게 토씨 하나 안 바뀌고
// 똑같이 나오던 것을, tier(이미 계산된 값)로 3가지 변형 중 하나를
// 결정적으로 고르게 했다. 무작위(Math.random)나 이름 기반 변형이
// 아니라 같은 사주는 항상 같은 문장이 나온다. 의미(첫머리 요약 →
// 관계 장면 전환)는 세 버전 모두 동일하고 표현만 다르다.
const BRIDGE_SENTENCE_BY_TIER: Record<"A" | "B" | "C", string> = {
  A: "지금까지 이 사람을 가장 크게 이끄는 힘을 봤다면, 이제 그 힘이 실제 관계 안에서 어떤 장면으로 나타나는지를 봅니다.",
  B: "지금까지 겉과 속, 그리고 여러 힘이 움직이는 순서를 봤다면, 이제 그 힘이 실제 사람과 관계 안에서 어떤 장면으로 나타나는지를 봅니다.",
  C: "지금까지 팽팽하게 맞서는 두 힘을 봤다면, 이제 그 힘들이 실제 관계 안에서 어떤 장면으로 나타나는지를 봅니다.",
};

const DISHI_SCENE_TEXT: Record<string, (lens: string) => string> = {
  장생: (lens) =>
    `이 힘은 자기 자신이 선 자리에서 이제 막 태어나 자라나는 결로 쓰이고 있어서, 관계 안에서도 ${lens}만큼은 매번 새로 배우고 적응해가는 쪽에 가깝습니다. 처음 해보는 상황일수록 오히려 먼저 부딪혀보며 요령을 익히고, 실수해도 다음엔 이렇게 해보자로 금방 넘어갑니다.`,
  목욕: (lens) =>
    `이 힘은 자기 자신이 선 자리에서 아직 다듬어지는 중인 결로 쓰이고 있어서, 관계 안에서 ${lens}만큼은 스스로도 예상 못한 모습이 문득 튀어나올 때가 있습니다. 평소와 다른 반응에 정작 가장 놀라는 쪽은 다름 아닌 본인입니다.`,
  관대: (lens) =>
    `이 힘은 자기 자신이 선 자리에서 이제 막 자기만의 틀을 세워가는 결로 쓰이고 있어서, 관계 안에서 ${lens}만큼은 남이 정해준 방식보다 조금씩 자기 나름의 방식을 만들어가는 쪽을 편하게 여깁니다. 아직 다 갖춰지지 않았어도, 이미 자기 색은 보이기 시작합니다.`,
  건록: (lens) =>
    `이 힘은 자기 자신이 선 자리에서 이미 익숙하게 다뤄지는 결로 쓰이고 있어서, 관계 안에서도 ${lens}만큼은 누가 옆에서 재촉하거나 끼어들지 않아도 자기 리듬대로 꾸준히 움직이는 편입니다. 남의 속도에 맞추느라 내 페이스를 잃는 일은 드뭅니다.`,
  제왕: (lens) =>
    `이 힘은 자기 자신이 선 자리에서 가장 능숙하고 거침없이 쓰이는 결로 쓰이고 있어서, ${lens} 앞에서는 망설이기보다 먼저 방향을 정하고 움직이는 쪽입니다. 다만 그 확신이 강한 만큼, 다른 의견이 끼어들 틈을 스스로 좁힐 때가 있습니다.`,
  쇠: (lens) =>
    `이 힘은 자기 자신이 선 자리에서 한 박자 물러서서 지켜보는 결로 쓰이고 있어서, ${lens} 앞에서도 바로 뛰어들기보다 한 걸음 물러나 상황을 가늠한 뒤에 움직이는 편입니다. 서두르는 사람들 사이에서 오히려 여유 있어 보일 때가 많습니다.`,
  병: (lens) =>
    `이 힘은 자기 자신이 선 자리에서 유독 애를 쓰며 쓰이는 결로 쓰이고 있어서, 관계 안에서 ${lens}만큼은 남들보다 신경을 몇 배 더 쓰면서 움직입니다. 애쓰는 티를 잘 안 내는 편이라, 곁에서는 정작 얼마나 공들이고 있는지 잘 모릅니다.`,
  사: (lens) =>
    `이 힘은 자기 자신이 선 자리에서 밖으로 드러내기보다 안으로 가라앉히며 쓰이는 결로 쓰이고 있어서, 관계 안에서 ${lens}도 속으로는 정리가 끝났는데 겉으로는 티가 잘 안 나는 편입니다. 이미 마음을 정한 뒤에도, 한참 지나서야 그 결정을 꺼내놓곤 합니다.`,
  묘: (lens) =>
    `이 힘은 자기 자신이 선 자리에서 겉으로 드러내지 않고 깊이 갈무리해두는 결로 쓰이고 있어서, 관계 안에서 ${lens}도 처음부터 다 보여주기보다 상대가 어떤 사람인지 지켜본 뒤 조금씩 곁을 내주는 편입니다. 가까워지는 데 남들보다 시간이 좀 더 걸립니다.`,
  절: (lens) =>
    `이 힘은 자기 자신이 선 자리에서 한 번 완전히 비워냈다가 다시 채우는 결로 쓰이고 있어서, 관계 안에서 ${lens}도 필요하다 느끼면 미련 없이 거리를 뒀다가 정리가 끝나면 다시 다가가는 편입니다. 끊고 다시 잇는 그 과정 자체를 낯설어하지 않습니다.`,
  태: (lens) =>
    `이 힘은 자기 자신이 선 자리에서 아직 형태를 갖추기 전, 가능성으로만 있는 결로 쓰이고 있어서, 관계 안에서 ${lens}도 미리 정해두기보다 상황을 좀 더 지켜본 뒤에 마음을 정하는 편입니다. 성급하게 결론부터 내리라고 하면 오히려 불편해집니다.`,
  양: (lens) =>
    `이 힘은 자기 자신이 선 자리에서 천천히 품어지며 자라는 결로 쓰이고 있어서, 관계 안에서 ${lens}도 급하게 드러내기보다 마음속에서 충분히 익힌 뒤에야 겉으로 꺼내는 편입니다. 겉으로 보이는 변화보다 안에서 자라는 속도가 늘 한 발 빠릅니다.`,
};

const DISHI_TAIL_TEXT: Record<string, { hasRoot: string; noRoot: string }> = {
  장생: { hasRoot: "이 배우는 속도, 쉽게 꺾이지 않습니다.", noRoot: "다만 곁에 있는 사람이나 상황에 따라 그 속도는 꽤 달라질 수 있습니다." },
  목욕: { hasRoot: "그 낯선 순간들도, 결국은 이 사람 나름의 결로 자리 잡아갑니다.", noRoot: "다만 그 모습이 매번 같은 식으로 반복되지는 않을 수 있습니다." },
  관대: { hasRoot: "그 방식은 시간이 갈수록 더 또렷해질 가능성이 큽니다.", noRoot: "다만 아직은 그 틀이 상황에 따라 조금씩 흔들릴 수 있습니다." },
  건록: { hasRoot: "이 페이스, 웬만해서는 잘 흔들리지 않습니다.", noRoot: "다만 상황에 따라 이 페이스가 조금 달라질 수는 있습니다." },
  제왕: { hasRoot: "이 거침없음, 쉽게 꺾이지 않는 힘이기도 합니다.", noRoot: "다만 상대나 상황에 따라 이 정도는 달라질 수 있습니다." },
  쇠: { hasRoot: "그 여유, 쉽게 사라지지 않습니다.", noRoot: "다만 상황에 따라 그 여유가 줄어들 때도 있습니다." },
  병: { hasRoot: "이 신경 씀은, 시간이 지나도 잘 줄어들지 않습니다.", noRoot: "다만 상황에 따라 이 정도는 오르내릴 수 있습니다." },
  사: { hasRoot: "겉으로 잘 안 보인다고 해서, 그 정리가 얕은 건 아닙니다.", noRoot: "다만 얼마나 오래 담아두는지는 상황마다 다를 수 있습니다." },
  묘: { hasRoot: "그 속도, 다그친다고 빨라지지 않습니다.", noRoot: "다만 상대에 따라 그 속도가 꽤 달라질 수 있습니다." },
  절: { hasRoot: "이 방식, 앞으로도 크게 달라지지 않을 가능성이 큽니다.", noRoot: "다만 그 거리 두는 방식은 상황마다 다르게 나타날 수 있습니다." },
  태: { hasRoot: "이렇게 열어두는 태도, 쉽게 바뀌지 않습니다.", noRoot: "다만 상황에 따라 마음을 정하는 속도가 달라질 수 있습니다." },
  양: { hasRoot: "그 안의 속도, 겉에서 재촉한다고 빨라지지 않습니다.", noRoot: "다만 그 속도는 상황에 따라 달라질 수 있습니다." },
};

function buildRelationOpeningBody(
  appData: AppData,
  hasRoot: boolean,
  axis: SipseongCategory,
  tier: "A" | "B" | "C" | null
): string[] {
  const bridge = BRIDGE_SENTENCE_BY_TIER[tier ?? "B"];
  const diShi = appData.user.natal.pillars.day.diShi;
  const sceneFn = DISHI_SCENE_TEXT[diShi];
  if (!sceneFn) return [bridge];
  const lens = AXIS_RELATION_LENS[axis];
  const scene = sceneFn(lens);
  const tail = DISHI_TAIL_TEXT[diShi];
  const tailLine = hasRoot ? tail.hasRoot : tail.noRoot;
  return [`${bridge} ${scene}`, tailLine];
}

export interface ChapterThreeDeepSection {
  heading: string;
  body: string[];
}

export interface RelationPairLabel {
  aLabel: string;
  bLabel: string;
  aHint: string;
  bHint: string;
}

export interface ChapterThreeDeepVisual {
  comfort: RelationPairLabel[];
  tension: RelationPairLabel[];
}

export interface ChapterThreeDeepResult {
  sections: ChapterThreeDeepSection[];
  visual: ChapterThreeDeepVisual;
}

function findAxisStages(appData: AppData, category: SipseongCategory): Stage[] {
  const user = appData.user;
  const stages: Stage[] = [];
  (["year", "month", "day", "hour"] as Stage[]).forEach((stage) => {
    const gan = user.pillars[stage];
    const zhi = user.pillars.branches[stage];
    if (gan && SIPSEONG_TO_CATEGORY[gan.sipseong] === category) stages.push(stage);
    if (zhi && SIPSEONG_TO_CATEGORY[zhi.sipseong] === category) stages.push(stage);
  });
  return Array.from(new Set(stages));
}

// [보존, 원문 그대로] 반복되기 쉬운 관계 장면.
const REPEAT_SCENE_BY_PATTERN: Record<string, string> = {
  합만: "평소엔 특정 사람 앞에서 자연스럽게 마음이 열리고 편해지는 흐름이 반복됩니다. 다만 그 편안함 때문에, 정작 중요한 순간에는 하고 싶은 말을 미루는 장면이 함께 반복되기 쉽습니다.",
  충만: "평소엔 무던하게 지내다가도, 특정 관계 앞에서는 유독 자주 부딪히는 장면이 반복됩니다. 먼저 맞춰주다가 어느 지점을 넘으면 갑자기 거리를 두는 식으로 나타날 수 있습니다.",
  겹침: "같은 자리가 한쪽과는 손을 잡고 다른 쪽과는 부딪히는 구조라, 편안했던 관계 안에서도 예상치 못한 순간 마찰이 반복될 수 있습니다.",
  안겹침: "가까워지는 사람과 부딪히는 사람이 뚜렷하게 나뉘는 구조라, 관계마다 온도차가 크게 반복되는 편입니다.",
  둘다없음: "원국 안에 뚜렷한 합·충이 없어, 특정 관계 패턴이 반복되기보다 상황마다 다르게 반응하는 편입니다.",
};

// [보존, 원문 그대로] axis별 관계 메커니즘.
const RELATION_MECHANISM_TEXT: Record<SipseongCategory, string> = {
  비겁: "자기 기준을 지키려는 힘이 강해서, 관계에서도 먼저 맞추다가 그 기준을 넘어서는 순간 마음을 조용히 접는 식으로 나타납니다.",
  식상: "감정을 담아두지 못하는 힘이 강해서, 편했던 관계일수록 오히려 쌓인 서운함이 어느 순간 그대로 터져 나오는 식으로 나타납니다.",
  재성: "실익을 가늠하는 힘이 강해서, 관계에서도 남는 게 있는지를 은연중에 재다가 그 계산이 안 맞을 때 거리를 두는 식으로 나타납니다.",
  관성: "책임을 다하려는 힘이 강해서, 관계에서도 맡은 몫을 다하다가 그 책임이 일방적이라 느껴지는 순간 지치는 식으로 나타납니다.",
  인성: "충분히 이해한 뒤에야 움직이는 힘이 강해서, 관계에서도 이해가 안 되는 순간이 쌓이면 조용히 마음의 문을 닫는 식으로 나타납니다.",
};

// [보존, 원문 그대로]
const EASE_TIP_TEXT: Record<SipseongCategory, string> = {
  비겁: "가끔은 스스로 정하기 전에, 남의 의견을 먼저 물어보는 순간을 의식적으로 만들어보면 관계가 한결 편해집니다.",
  식상: "표현한 뒤에는 상대의 반응을 한 번 더 기다려보는 여유가 관계를 편하게 만듭니다.",
  재성: "계산이 서지 않아도, 한 번쯤은 그냥 믿고 맡겨보는 시도가 관계를 편하게 만듭니다.",
  관성: "다 끝내지 못해도 괜찮다는 것을 스스로에게 허락하면 관계가 한결 편해집니다.",
  인성: "생각이 다 정리되지 않았어도, 먼저 한마디 건네보는 연습이 관계를 편하게 만듭니다.",
};

// [수정: C] "그렇다면 이 관계, 어떻게 하면 조금 편해질까요?"가 axis가
// 있는 사람 전원에게 동일하게 나오던 것을, axis(이미 계산된 top 카테고리)
// 로 5가지 변형 중 하나를 결정적으로 고르게 했다. 비겁은 원문 그대로 —
// 이미 승인된 홍지영(axis=비겁) 원문이 안 바뀌게 하기 위함.
const COMFORT_LEAD_BY_AXIS: Record<SipseongCategory, string> = {
  비겁: "그렇다면 이 관계, 어떻게 하면 조금 편해질까요?",
  식상: "그렇다면 이런 관계에서 조금 덜 지치려면 무엇이 필요할까요?",
  재성: "그렇다면 이 마음이 관계 안에서 조금 편해지는 길은 무엇일까요?",
  관성: "그렇다면 관계가 한결 편해지는 지점은 어디일까요?",
  인성: "그렇다면 이 관계, 어떻게 하면 조금 더 편안해질 수 있을까요?",
};

function buildComfortConditionBody(
  axis: SipseongCategory,
  secondAxis: SipseongCategory | null,
  comfort: RelationPairLabel[]
): string[] {
  const body: string[] = [COMFORT_LEAD_BY_AXIS[axis]];
  if (comfort.length > 0) {
    const first = comfort[0];
    body.push(
      `${first.aLabel}${josaGwaWa(first.aLabel)} ${first.bLabel}처럼 자연스럽게 손을 잡는 자리가 있다는 것은, 이 사람에게도 애쓰지 않아도 편안해지는 관계 축이 실제로 있다는 뜻입니다.`
    );
  }
  if (secondAxis) {
    body.push(
      `평소 앞서는 ${axis} 뒤에 ${secondAxis}이 함께 있어서, 이 힘이 자연스럽게 끼어드는 관계에서는 균형이 한결 수월해집니다.`
    );
  }
  body.push(EASE_TIP_TEXT[axis]);
  return body;
}

export function buildChapterThreeDeepNarrative(appData: AppData): ChapterThreeDeepResult {
  const key: ChapterThreeKey = buildChapterThreeKey(appData);
  const { axis, secondAxis, tier, gwansal, heChong, dayMasterRoot } = key;

  const comfort: RelationPairLabel[] = heChong.he.map((p) => ({
    aLabel: `${STAGE_LABEL[p.a.stage]}(${p.a.zhi})`,
    bLabel: `${STAGE_LABEL[p.b.stage]}(${p.b.zhi})`,
    aHint: STAGE_HINT[p.a.stage],
    bHint: STAGE_HINT[p.b.stage],
  }));
  const tension: RelationPairLabel[] = heChong.chong.map((p) => ({
    aLabel: `${STAGE_LABEL[p.a.stage]}(${p.a.zhi})`,
    bLabel: `${STAGE_LABEL[p.b.stage]}(${p.b.zhi})`,
    aHint: STAGE_HINT[p.a.stage],
    bHint: STAGE_HINT[p.b.stage],
  }));

  const sections: ChapterThreeDeepSection[] = [];
  if (!axis) {
    return { sections, visual: { comfort, tension } };
  }

  // ① 관계 안에서의 나 (원문 그대로, 소제목만 제거)
  sections.push({
    heading: "",
    body: buildRelationOpeningBody(appData, dayMasterRoot.hasRoot, axis, tier),
  });

  // ② 관계에서 흔들리는/편안한 지점 — "이 힘이 실제로 자리한 곳이" 보고체
  // 제거, 결과 중심으로 바꿨다. 대조 로직(touchingTension/touchingComfort
  // 판정)은 그대로.
  const axisStages = findAxisStages(appData, axis);
  const touchingTension = tension.filter(
    (r) => axisStages.some((s) => r.aLabel.startsWith(STAGE_LABEL[s])) || axisStages.some((s) => r.bLabel.startsWith(STAGE_LABEL[s]))
  );
  const touchingComfort = comfort.filter(
    (r) => axisStages.some((s) => r.aLabel.startsWith(STAGE_LABEL[s])) || axisStages.some((s) => r.bLabel.startsWith(STAGE_LABEL[s]))
  );
  if (touchingTension.length > 0) {
    const t = touchingTension[0];
    sections.push({
      heading: "",
      body: [
        `평소엔 ${axis}이 이끄는 대로 비교적 안정적으로 움직입니다. 그런데 ${t.aLabel}${josaGwaWa(t.aLabel)} ${t.bLabel}처럼 서로 부딪히는 자리와 맞물릴 때는, 유독 이 결이 크게 흔들릴 수 있습니다.`,
      ],
    });
  } else if (touchingComfort.length > 0) {
    const c = touchingComfort[0];
    sections.push({
      heading: "",
      body: [
        `${c.aLabel}${josaGwaWa(c.aLabel)} ${c.bLabel}처럼 자연스럽게 손을 잡는 자리와 맞물릴 때는, 평소보다 이 힘이 훨씬 쉽고 편안하게 풀립니다.`,
      ],
    });
  } else {
    sections.push({
      heading: "",
      body: [
        `특정 관계 하나 때문에 이 힘 자체가 크게 흔들리는 일은 별로 없습니다 — 상대가 누구든, 상황이 어떻든 비교적 한결같이 유지되는 편입니다.`,
      ],
    });
  }

  // ③ 반복되기 쉬운 관계 장면 (원문 그대로, 소제목만 제거)
  sections.push({
    heading: "",
    body: [REPEAT_SCENE_BY_PATTERN[heChong.pattern] ?? REPEAT_SCENE_BY_PATTERN.둘다없음],
  });

  // ④ 왜 이런 장면이 생기는가 — gwansal 분기에서 같은 기둥일 때 자리
  // 이름이 그대로 두 번 반복되던 버그를 고쳤다(sameStage 분기 추가).
  // 판정 조건(gwansal.present)은 그대로.
  if (gwansal.present && gwansal.pyeongwan && gwansal.jeonggwan) {
    const sameStage = gwansal.pyeongwan.stage === gwansal.jeonggwan.stage;
    const posClause = sameStage
      ? `이 두 기준이 ${STAGE_LABEL[gwansal.pyeongwan.stage]}에 함께 자리하고 있어서`
      : `${STAGE_LABEL[gwansal.pyeongwan.stage]}에서 온 기준과 ${STAGE_LABEL[gwansal.jeonggwan.stage]}에서 온 기준이 서로 다른 색이라서`;
    sections.push({
      heading: "",
      body: [
        `${posClause}, 관계 안에서 갈등이 생기면 머릿속에서 "지금 당장 정리해야 한다"는 목소리와 "원칙대로 풀어야 한다"는 목소리가 동시에 울립니다.`,
      ],
    });
  } else {
    sections.push({ heading: "", body: [RELATION_MECHANISM_TEXT[axis]] });
  }

  // ⑤ 관계가 편해지는 조건 — 짧은 전환 문장 하나만 추가, 나머지 원문 그대로.
  sections.push({
    heading: "",
    body: buildComfortConditionBody(axis, secondAxis, comfort),
  });

  // ⑥ 第三章의 발견 — "정리하면,"으로 마무리 전환, "이 힘이 자리한 곳이"
  // 보고체 표현만 결과 중심으로 바꿨다. 4갈래 분기 로직은 그대로.
  const hasRealSignal = touchingTension.length > 0 || touchingComfort.length > 0 || gwansal.present || heChong.pattern !== "둘다없음";
  if (hasRealSignal) {
    let discovery: string;
    if (touchingTension.length > 0) {
      // [수정: C] 첫 절이 touchingTension인 5명(heChong.pattern이 충만/
      // 겹침/안겹침 중 하나)에게 토씨 하나 안 바뀌고 똑같이 나오던 것을,
      // heChong.pattern(이미 계산된 값)으로 결정적으로 고르게 했다.
      // 충만은 원문 그대로(홍지영 원문 보존).
      const lead =
        heChong.pattern === "겹침"
          ? "편하게 느껴지는 관계 안에도 사실은 흔들리는 지점이 함께 있습니다."
          : heChong.pattern === "안겹침"
          ? "가까워지는 관계와 유독 흔들리는 관계가 이 사람 안에서는 뚜렷하게 나뉘어 있습니다."
          : "마음을 놓아도 되는 관계와, 유독 자주 흔들리는 관계가 사실은 따로 있습니다.";
      discovery = `${lead} ${AXIS_CORE_LABEL[axis]}이 부족해서가 아니라, 하필 자주 부딪히는 자리와 맞물려 있기 때문입니다. 그 지점을 알아채고 마음을 놓는 시점을 조금만 늦추면, 지금 반복되는 장면의 결이 달라질 수 있습니다.`;
    } else if (gwansal.present) {
      discovery = `문제는 사람을 보는 눈이 없는 것이 아니라, 머릿속 두 기준(편관·정관) 중 어느 쪽을 먼저 따를지 정하지 못한 순간에 있을 수 있습니다.`;
    } else if (touchingComfort.length > 0) {
      discovery = `이 사람에게 관계는 늘 어렵기만 한 것이 아닙니다 — ${axis}이 잘 맞는 사람 앞에서는 애쓰지 않아도 편해지는 쪽에 가깝습니다.`;
    } else {
      discovery = `이 사람의 관계 패턴은 특정 자리 하나로 설명되지 않습니다 — ${heChong.pattern === "안겹침" ? "가까워지는 사람과 부딪히는 사람이 뚜렷이 나뉘어 있다는 것" : "합·충이 여러 자리에 걸쳐 있다는 것"} 자체가, 이 사람이 상대에 따라 전혀 다른 얼굴을 보이는 이유입니다.`;
    }
    sections.push({ heading: "", body: [`정리하면, ${discovery}`] });
  }

  return { sections, visual: { comfort, tension } };
}
