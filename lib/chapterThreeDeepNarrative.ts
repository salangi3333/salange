import { AppData } from "./sajuContent";
import { Stage } from "./natalStructure";
import { SipseongCategory } from "./strengthAnalysis";
import { buildChapterThreeKey, ChapterThreeKey } from "./chapterThreeInterpretation";

/**
 * 第三章 유료 심화 — "그 힘들이 실제 사람·관계와 만났을 때 어떤 장면으로
 * 나타나는가"(현실 관계 장면 분석).
 *
 * 2026-09 재설계(승인된 구조): 第二章이 "내 안의 여러 힘이 상황에 따라
 * 어떤 순서로 움직이는가"를 다뤘다면, 이 파일은 그 힘이 "관계 안에서
 * 구체적으로 어떤 장면이 되는가"만 다룬다. 평소 모습/기질 재설명,
 * 강점·약점 재설명, 압박 시 반응(개별 심리 반응)은 一·二章이 이미
 * 다뤘으므로 여기서는 다루지 않는다 — 한 문장으로만 연결하고 바로
 * 관계 장면으로 넘어간다.
 *
 * 새 명리 계산은 하지 않는다. 3장이 이미 쓰는 buildChapterThreeKey
 * (chapterThreeInterpretation.ts, 무료 3장이 실제로 쓰는 판단값 그대로 —
 * axis/secondAxis/tier/gwansal/heChong/dayMasterRoot)를 다시 호출해
 * 재조합할 뿐이다. chapterThreeInterpretation.ts/chapterThreeNarrative.ts/
 * 一·二章 파일은 한 글자도 건드리지 않는다.
 *
 * 이번 라운드의 핵심 신규 조합: "axis가 실제로 앉은 자리 × heChong(합충)
 * 관계"다 — axis(=strength.top, 이미 계산됨)가 실제로 존재하는 자리를
 * user.pillars(sajuEngine이 이미 계산한 십성 라벨)에서 다시 찾아(새 계산
 * 아님, chapterOneDeepNarrative.ts의 visible 수집과 동일한 패턴), 그
 * 자리가 heChong.he/chong(analyzeBranchRelations, 이미 계산됨)의 어느
 * 쪽과 겹치는지만 대조한다. "평소엔 안정적인데 특정 관계에서만 흔들리는
 * 이유"를 이 교차로 설명한다 — 새 판정 기준을 만들지 않는다.
 */

const STAGE_LABEL: Record<Stage, string> = {
  year: "초년의 자리", month: "사회로 나가는 자리", day: "자기 자신이 선 자리", hour: "말년의 자리",
};

// 관계 카드 보조 캡션 — 새 명리 해석이 아니라 위 STAGE_LABEL(이미 리포트
// 전체에서 쓰이는 4주 자리 명칭)을 사주를 모르는 고객도 바로 감 잡을 수
// 있게 한 줄로 풀어쓴 것뿐이다. 년주=초년/월주=사회생활/일주=나 자신/
// 시주=말년이라는 명리 표준 관례를 그대로 옮겼다 — 새로운 자리 의미를
// 만들지 않는다.
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

// ①: 일지 12운성(natal.pillars.day.diShi) × dayMasterRoot.hasRoot — "이
// 힘이 관계 안에서 얼마나 성숙한 결로, 실제로 어떤 행동으로 작동하는가"를
// 다룬다(2026-09 시범 적용 → 2026-09 융합 개선, 승인된 작업). sajuEngine.ts가
// 이미 계산해 natal.pillars.day.diShi에 담아둔 값을 그대로 읽을 뿐, 새 계산은
// 없다. 12운성 명칭은 고객 문장에 노출하지 않고 이 표 안에서만 참조한다.
//
// 단독 길흉 판정 금지 원칙: 12단계 전부 "다른 결"로만 다루고 "더 강하다/
// 더 좋다"는 서열을 만들지 않는다(제왕도 "능숙하다"는 결이지 "우월하다"는
// 뜻이 아니고, 병·사·묘·절도 "질병/죽음/흉함"이 아니라 "안으로
// 갈무리되는 결"로만 옮긴다).
//
// 융합 원칙(2026-09 개선): 전환문 + 12운성 문장을 별도 문단 두 개로
// 붙이지 않고, 한 문단 안에서 "이 힘은 ~한 결로 쓰이고 있어서, 관계
// 안에서도 (실제 행동 장면)" 형태로 하나의 흐름으로 잇는다. 추상적 결
// 묘사에서 끝내지 않고 반드시 구체적 행동 장면 한 줄을 더한다(第三章
// 최상위 원칙 — 명리 용어보다 현실 장면). hasRoot는 별도 사실 재진술이
// 아니라, 방금 설명한 그 장면이 "이어지는지/상황마다 달라지는지"를
// 잇는 짧은 한 줄(리듬을 위한 문단 분리)로만 반영한다 — 무료 3장의
// "뿌리가 있어 흔들리지 않는다" 문장을 다시 말하지 않는다.
//
// 교차 개선(2026-09, axis 합성): 실증 조사 결과(150명 샘플, axis 다른
// pair 91건 전수 검사) diShi+hasRoot가 같으면 axis와 무관하게 문장이
// 100% 동일했다 — axis가 이 섹션에 전혀 반영되지 않던 문제. 신호별
// 역할은 분리한다: diShi=힘의 상태/결(고정, 불변), axis=그 힘이 관계
// 안에서 구체적으로 "무엇에 대해" 작동하는지(가변 렌즈). 60개
// (diShi×axis) 조합 문장을 하드코딩하지 않고, diShi 12개 문장 템플릿
// 안의 한 슬롯에 axis별 5개 렌즈 구절만 끼워 합성한다 — diShi 문장의
// 핵심 어휘·정도·결은 axis와 무관하게 그대로 유지된다.
const AXIS_RELATION_LENS: Record<SipseongCategory, string> = {
  비겁: "자기 기준을 지키는 것",
  식상: "마음을 표현하는 것",
  재성: "주고받는 셈을 따지는 것",
  관성: "맡은 몫과 책임을 지키는 것",
  인성: "상대를 이해하고 받아들이는 것",
};

const BRIDGE_SENTENCE =
  "지금까지 겉과 속, 그리고 여러 힘이 움직이는 순서를 봤다면, 이제 그 힘이 실제 사람과 관계 안에서 어떤 장면으로 나타나는지를 봅니다.";

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

// 짧은 한 줄(리듬용) — hasRoot로 갈리되, 방금 나온 그 장면을 그대로
// 이어받는 문장이라 "재진술"이 아니라 "결론"으로 읽힌다.
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

function buildRelationOpeningBody(appData: AppData, hasRoot: boolean, axis: SipseongCategory): string[] {
  const diShi = appData.user.natal.pillars.day.diShi;
  const sceneFn = DISHI_SCENE_TEXT[diShi];
  if (!sceneFn) return [BRIDGE_SENTENCE];
  const lens = AXIS_RELATION_LENS[axis];
  const scene = sceneFn(lens);
  const tail = DISHI_TAIL_TEXT[diShi];
  const tailLine = hasRoot ? tail.hasRoot : tail.noRoot;
  return [`${BRIDGE_SENTENCE} ${scene}`, tailLine];
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
  /** 합(合) 관계 — "나에게 편한 관계" 카드에 쓴다. */
  comfort: RelationPairLabel[];
  /** 충(沖) 관계 — "긴장이 생기기 쉬운 관계" 카드에 쓴다. */
  tension: RelationPairLabel[];
}

export interface ChapterThreeDeepResult {
  sections: ChapterThreeDeepSection[];
  visual: ChapterThreeDeepVisual;
}

// ────────────────────────────────────────────────────────────────
// ② axis 위치 × heChong 교차 — "관계에서 흔들리는/편안한 지점".
// ────────────────────────────────────────────────────────────────
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

// ③ 반복되기 쉬운 관계 장면 — heChong.pattern(이미 계산된 5단계)을
// "장면"으로 옮긴다. 사전 설명이 아니라 실제로 반복될 법한 순간이다.
const REPEAT_SCENE_BY_PATTERN: Record<string, string> = {
  합만: "평소엔 특정 사람 앞에서 자연스럽게 마음이 열리고 편해지는 흐름이 반복됩니다. 다만 그 편안함 때문에, 정작 중요한 순간에는 하고 싶은 말을 미루는 장면이 함께 반복되기 쉽습니다.",
  충만: "평소엔 무던하게 지내다가도, 특정 관계 앞에서는 유독 자주 부딪히는 장면이 반복됩니다. 먼저 맞춰주다가 어느 지점을 넘으면 갑자기 거리를 두는 식으로 나타날 수 있습니다.",
  겹침: "같은 자리가 한쪽과는 손을 잡고 다른 쪽과는 부딪히는 구조라, 편안했던 관계 안에서도 예상치 못한 순간 마찰이 반복될 수 있습니다.",
  안겹침: "가까워지는 사람과 부딪히는 사람이 뚜렷하게 나뉘는 구조라, 관계마다 온도차가 크게 반복되는 편입니다.",
  둘다없음: "원국 안에 뚜렷한 합·충이 없어, 특정 관계 패턴이 반복되기보다 상황마다 다르게 반응하는 편입니다.",
};

// ④ 왜 이런 장면이 생기는가 — axis의 관계 메커니즘(새 판정 아님, 이미
// 서술해온 각 카테고리의 성질을 "관계 안에서" 렌즈로만 재해석).
const RELATION_MECHANISM_TEXT: Record<SipseongCategory, string> = {
  비겁: "자기 기준을 지키려는 힘이 강해서, 관계에서도 먼저 맞추다가 그 기준을 넘어서는 순간 마음을 조용히 접는 식으로 나타납니다.",
  식상: "감정을 담아두지 못하는 힘이 강해서, 편했던 관계일수록 오히려 쌓인 서운함이 어느 순간 그대로 터져 나오는 식으로 나타납니다.",
  재성: "실익을 가늠하는 힘이 강해서, 관계에서도 남는 게 있는지를 은연중에 재다가 그 계산이 안 맞을 때 거리를 두는 식으로 나타납니다.",
  관성: "책임을 다하려는 힘이 강해서, 관계에서도 맡은 몫을 다하다가 그 책임이 일방적이라 느껴지는 순간 지치는 식으로 나타납니다.",
  인성: "충분히 이해한 뒤에야 움직이는 힘이 강해서, 관계에서도 이해가 안 되는 순간이 쌓이면 조용히 마음의 문을 닫는 식으로 나타납니다.",
};

// ⑤ 관계가 편해지는 조건 — comfort(합) 관계가 있을 때 / secondAxis가
// 있을 때 / 둘 다 없을 때(자기 완결적 팁) 세 갈래.
const EASE_TIP_TEXT: Record<SipseongCategory, string> = {
  비겁: "가끔은 스스로 정하기 전에, 남의 의견을 먼저 물어보는 순간을 의식적으로 만들어보면 관계가 한결 편해집니다.",
  식상: "표현한 뒤에는 상대의 반응을 한 번 더 기다려보는 여유가 관계를 편하게 만듭니다.",
  재성: "계산이 서지 않아도, 한 번쯤은 그냥 믿고 맡겨보는 시도가 관계를 편하게 만듭니다.",
  관성: "다 끝내지 못해도 괜찮다는 것을 스스로에게 허락하면 관계가 한결 편해집니다.",
  인성: "생각이 다 정리되지 않았어도, 먼저 한마디 건네보는 연습이 관계를 편하게 만듭니다.",
};

function buildComfortConditionBody(
  axis: SipseongCategory,
  secondAxis: SipseongCategory | null,
  comfort: RelationPairLabel[]
): string[] {
  const body: string[] = [];
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
  const { axis, secondAxis, gwansal, heChong, dayMasterRoot } = key;

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

  // ① 관계 안에서의 나 — 기존 전환 문장은 그대로 두고, 12운성(일지)
  // 교차 문장 하나만 보조로 더한다(2026-09 시범 적용). 나머지 ②~⑥은
  // 전혀 건드리지 않는다.
  sections.push({
    heading: "관계 안에서의 나",
    body: buildRelationOpeningBody(appData, dayMasterRoot.hasRoot, axis),
  });

  // ② 관계에서 흔들리는/편안한 지점 — axis 위치 × heChong 교차 ────
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
      heading: "관계에서 흔들리는 지점",
      body: [
        `평소엔 ${axis}이 이끄는 대로 비교적 안정적으로 움직입니다. 그런데 이 힘이 실제로 자리한 곳이 마침 ${t.aLabel}${josaGwaWa(t.aLabel)} ${t.bLabel}가 부딪히는 자리이기도 해서, 이 관계·상황 앞에서만 유독 이 결이 크게 흔들릴 수 있습니다.`,
      ],
    });
  } else if (touchingComfort.length > 0) {
    const c = touchingComfort[0];
    sections.push({
      heading: "관계에서 편안해지는 지점",
      body: [
        `이 힘이 실제로 자리한 곳이 ${c.aLabel}${josaGwaWa(c.aLabel)} ${c.bLabel}가 자연스럽게 손을 잡는 자리이기도 해서, 특정 관계 앞에서는 평소보다 이 힘이 훨씬 쉽고 편안하게 작동할 수 있습니다.`,
      ],
    });
  } else {
    sections.push({
      heading: "관계에서 흔들리는 지점",
      body: [
        `이 힘이 자리한 곳은 원국의 합·충 어느 쪽과도 직접 얽혀 있지 않습니다 — 그래서 특정 관계 하나 때문에 이 힘 자체가 크게 흔들리기보다, 관계와 무관하게 비교적 한결같이 작동하는 편입니다.`,
      ],
    });
  }

  // ③ 반복되기 쉬운 관계 장면 ────────────────────────────────
  sections.push({
    heading: "반복되기 쉬운 관계 장면",
    body: [REPEAT_SCENE_BY_PATTERN[heChong.pattern] ?? REPEAT_SCENE_BY_PATTERN.둘다없음],
  });

  // ④ 왜 이런 장면이 생기는가 ───────────────────────────────
  if (gwansal.present && gwansal.pyeongwan && gwansal.jeonggwan) {
    sections.push({
      heading: "왜 이런 장면이 생기는가",
      body: [
        `이 명식에는 편관과 정관이 함께 있습니다(${STAGE_LABEL[gwansal.pyeongwan.stage]}·${STAGE_LABEL[gwansal.jeonggwan.stage]}). 관계 안에서 갈등이 생기면, 머릿속에서 "지금 당장 정리해야 한다"는 목소리와 "원칙대로 풀어야 한다"는 목소리가 동시에 울리기 때문입니다.`,
      ],
    });
  } else {
    sections.push({ heading: "왜 이런 장면이 생기는가", body: [RELATION_MECHANISM_TEXT[axis]] });
  }

  // ⑤ 관계가 편해지는 조건 ─────────────────────────────────
  sections.push({
    heading: "관계가 편해지는 조건",
    body: buildComfortConditionBody(axis, secondAxis, comfort),
  });

  // ⑥ 第三章의 발견 — 실제 신호가 있을 때만, 표본마다 달라짐 ────────
  const hasRealSignal = touchingTension.length > 0 || touchingComfort.length > 0 || gwansal.present || heChong.pattern !== "둘다없음";
  if (hasRealSignal) {
    let discovery: string;
    if (touchingTension.length > 0) {
      discovery = `문제는 ${axis}이 약해서가 아니라, 이 힘이 자리한 곳이 하필 부딪히는 자리라는 데 있을 수 있습니다. 마음을 놓는 지점을 조금만 늦추면, 지금 반복되는 장면의 결이 달라질 수 있습니다.`;
    } else if (gwansal.present) {
      discovery = `문제는 사람을 보는 눈이 없는 것이 아니라, 머릿속 두 기준(편관·정관) 중 어느 쪽을 먼저 따를지 정하지 못한 순간에 있을 수 있습니다.`;
    } else if (touchingComfort.length > 0) {
      discovery = `이 사람에게 관계는 늘 어렵기만 한 것이 아닙니다 — ${axis}이 자리한 곳 자체가 이미 편안해지는 방향으로 놓여 있어, 맞는 사람 앞에서는 애쓰지 않아도 편해집니다.`;
    } else {
      discovery = `이 사람의 관계 패턴은 특정 자리 하나로 설명되지 않습니다 — ${heChong.pattern === "안겹침" ? "가까워지는 사람과 부딪히는 사람이 뚜렷이 나뉘어 있다는 것" : "합·충이 여러 자리에 걸쳐 있다는 것"} 자체가, 이 사람이 상대에 따라 전혀 다른 얼굴을 보이는 이유입니다.`;
    }
    sections.push({ heading: "第三章의 발견", body: [discovery] });
  }

  return { sections, visual: { comfort, tension } };
}
