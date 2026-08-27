import { AppData } from "./sajuContent";
import { analyzeBranchRelations } from "./natalStructure";

/**
 * 사랑·인연 ④ "내 인연이 머무는 자리" 전용 고객용 서술 레이어.
 *
 * 핵심 질문: 이 사람은 어떤 관계 안에서 가장 오래 편안하고 안정될 수
 * 있는가 — 정적인 궁합 "조건"을 다루는 섹션이다. ①(사랑할 때 행동
 * 방식)·②(끌리는 이유)·③(관계 안 반복 장면)·⑤(시기)와는 다른 질문이므로
 * 그 네 챕터의 어휘·장면을 이 파일에서 쓰지 않는다.
 *
 * 새 계산을 하지 않는다 — 이 파일이 쓰는 값은 정확히 둘뿐이다:
 *  - user.pillars.branches.day.sipseong: 일지(배우자궁)의 십성 10종
 *    라벨. 이미 계산되어 있는 필드를 그대로 읽기만 한다.
 *  - analyzeBranchRelations(user)(natalStructure.ts, 기존 동결 함수):
 *    원국 4개 지지 사이의 정적(대운/세운과 무관한) 육합·육충. 이 중
 *    한쪽이 stage==="day"인 것만 걸러 쓴다 — 배우자궁이 원국 안에서
 *    다른 자리와 원래부터 합/충 관계인지를 본다. ⑤가 쓰는
 *    spousePalaceRelations.ts(대운/세운 "시기" 신호)와는 계산 경로가
 *    완전히 다르다 — 절대 섞지 않는다.
 * isDayBranch(spouseStarAnalysis.ts)는 별도 분기로 쓰지 않는다(지시대로
 * — 일지 십성 10종 자체가 이미 그 정보를 포함한다: 일지가 배우자성
 * 카테고리와 같은 두 유형(남성=재성 계열, 여성=관성 계열)도 10종 중
 * 하나로 자연스럽게 처리된다). strength.total/dayMasterBalance/
 * subtypes는 ③이, yongsinRelation/huisinRelation은 ②가 이미 쓰고
 * 있어 이 파일에서 재사용하지 않는다.
 *
 * 1차 분기: 일지 십성 10종(비견/겁재/식신/상관/편재/정재/편관/정관/
 * 편인/정인) 그대로 — 하나로 단정하지 않고 전부 "~하기 쉽습니다/~조건이
 * 될 수 있습니다/~한결 편안해지는 편입니다" 수준의 헤지로만 쓴다.
 * 특히 편관은 "긴장을 좋아한다"가 아니라 책임감·명확한 기준이라는,
 * 과장 위험이 낮은 언어로 옮긴다.
 *
 * 2차 조정(판정은 그대로, 장면 뒤에 조율-방식 부연절만 추가): 일지가
 * 낀 정적 합/충 개수로 없음/합만/충만/합충모두 4상태를 가른다. "합=좋은
 * 결혼/충=이별" 같은 사건 해석은 절대 하지 않는다 — 오직 "가까워지는
 * 과정의 조율 방식"으로만 옮긴다. 없음이 기본형이라 억지로 부연절을
 * 붙이지 않는다.
 *
 * 참고: "무게/기준/편안함/흐름/두드러지지 않는다" 반복 금지 규칙은 ③
 * 서술에서 나온 규칙이다. ④는 설계상 "편안함"이 이 섹션의 핵심 개념이라
 * (사용자 설계표 자체가 이 단어로 심리 번역을 요청함) 그 단어까지
 * 금지하지 않는다 — 다만 10개 유형이 전부 똑같은 문장 틀로 "편안함을
 * 느끼기 쉽습니다"를 반복하지 않도록 유형별로 표현을 실제로 다르게
 * 썼다(안정감/마음이 놓임/편안해짐 등).
 */

export interface NarrativeParagraph {
  text: string;
  /** 고객에게 노출하지 않는 내부 검수용 근거. */
  sourceNote: string;
}

export interface LoveStabilityConditionNarrativeResult {
  paragraphs: NarrativeParagraph[];
}

type DaySipseong = "비견" | "겁재" | "식신" | "상관" | "편재" | "정재" | "편관" | "정관" | "편인" | "정인";
const VALID_SIPSEONG: DaySipseong[] = ["비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인"];

interface TypeText {
  scene: string;
  conclusion: string;
}

const TYPE_TEXT: Record<DaySipseong, TypeText> = {
  비견: {
    scene: "좋아한다고 해서 두 사람의 하루가 하나가 되어야 하는 것은 아닙니다. 각자의 일과 사람과 시간을 보내다가 다시 만났을 때 자연스럽게 이야기가 이어지는 관계에서 오히려 마음이 편해집니다. 다만 상대가 사소한 결정까지 다 물어보고 확인받으려 하면, 배려라는 걸 알면서도 답답함이 먼저 올라오는 순간이 있습니다.",
    conclusion: "그래서 이 사람에게는, 하나하나 확인받으려는 사이보다 각자의 몫을 믿고 맡기는 사이가 오래갑니다.",
  },
  겁재: {
    scene: "이 사람이 관계에서 가장 먼저 확인하려는 것은 이 관계 안에서 내 몫이 얼마나 인정받는가입니다. 비용이나 역할을 대충 얼버무리지 않고 확실히 정할 때 관계가 더 단단하게 느껴집니다. 상대가 좋은 게 좋은 거라며 자꾸 넘어가려 하면, 겉으로는 맞춰줘도 속으로는 신뢰가 조금씩 깎여 나갑니다.",
    conclusion: "그래서 이 사람에게는, 좋게 좋게 넘어가는 사이보다 사소한 것도 확실히 짚고 넘어가는 사이가 오래갑니다.",
  },
  식신: {
    scene: "밥을 같이 먹고 별일 아닌 이야기를 나누는 시간, 이 사람에게는 이 시간이 관계의 팔 할에 가깝습니다. 오늘 뭐 먹었는지, 요즘 뭐가 재밌는지 같은 대화가 끊기지 않을 때 관계가 편안해집니다. 그런데 매번 특별한 이벤트로 마음을 확인시키려는 상대 앞에서는, 좋으면서도 이상하게 피곤함이 먼저 쌓입니다.",
    conclusion: "그래서 이 사람에게는, 매번 특별해야 하는 사이보다 아무 날에도 편하게 웃을 수 있는 사이가 오래갑니다.",
  },
  상관: {
    scene: "마음이 있어도, 하고 싶은 말을 계속 눌러야 하는 관계에서는 이 사람은 오래 버티지 못합니다. 순간의 생각이나 감정을 꺼냈을 때 상대가 놀라거나 눈치를 주지 않고 받아줄 때 숨 쉴 구멍이 있다고 느낍니다. 재밌자고 한 말에 상대가 자꾸 정색하며 선을 그으면, 그 뒤로는 하고 싶은 말을 자기도 모르게 고르게 됩니다.",
    conclusion: "그래서 이 사람에게는, 매번 말을 조심해야 하는 사이보다 있는 그대로 던져도 되는 사이가 오래갑니다.",
  },
  편재: {
    scene: "이 사람의 연애에서는 계획이 얼마나 잘 지켜지느냐보다, 계획이 틀어졌을 때 누가 먼저 움직이느냐가 더 중요합니다. 약속이 갑자기 바뀌어도 크게 동요하지 않고 오히려 먼저 나서서 다음을 정리하는 쪽을 자연스럽게 맡습니다. 다만 이미 정해진 방식을 절대 못 바꾸게 하는 상대 앞에서는, 좋아하는 마음과 별개로 부담스러운 순간이 반복됩니다.",
    conclusion: "그래서 이 사람에게는, 한 번 정한 방식을 고수하는 사이보다 상황에 맞춰 같이 움직여주는 사이가 오래갑니다.",
  },
  정재: {
    scene: "정재에게 사랑은 강렬한 한 번보다 반복해서 지켜지는 작은 약속에 가깝습니다. 연락한다고 했던 날 연락이 오고, 다음 주에 만나기로 한 약속이 특별한 이유 없이 바뀌지 않을 때 마음을 놓기 시작합니다. 반대로 약속이 별다른 설명 없이 자주 바뀌면, 서운하다는 말을 꺼내기도 전에 마음이 먼저 한 걸음 물러섭니다.",
    conclusion: "그래서 이 사람에게는, 매번 사랑을 확인시켜주는 사이보다 확인하지 않아도 내일을 믿을 수 있는 사이가 오래갑니다.",
  },
  편관: {
    scene: "관계가 흐릿하게 흘러가면, 이 사람은 좀처럼 마음을 놓지 못합니다. 상대가 자기 생각을 분명히 말하고 힘든 상황에서 책임질 부분을 회피하지 않을 때 그제야 안심하고 곁을 내줍니다. 결정적인 순간마다 상대가 확실한 말을 피하면, 겉으로는 티 내지 않아도 속으로는 조금씩 신뢰를 접게 됩니다.",
    conclusion: "그래서 이 사람에게는, 다정하기만 하고 넘어가는 사이보다 중요한 순간 확실하게 책임지는 사이가 오래갑니다.",
  },
  정관: {
    scene: "처음에는 잘 드러나지 않지만, 가까워질수록 이 사람에게 중요해지는 건 감정의 크기가 아니라 약속이 지켜지는 꾸준함입니다. 정해둔 시간에 나타나고 하기로 한 역할을 별다른 말 없이 해내는 모습에서 신뢰가 쌓입니다. 한두 번은 넘어가지만, 정해둔 것이 자꾸 어긋나는 일이 반복되면 애정과 별개로 마음의 문이 조용히 닫힙니다.",
    conclusion: "그래서 이 사람에게는, 감정 표현이 많은 사이보다 정한 것을 지키는 사이가 오래갑니다.",
  },
  편인: {
    scene: "이 사람에게 가까움은 모든 것을 말하는 것과 조금 다릅니다. 표정 하나를 보고 오늘은 말하고 싶지 않은 날이라는 걸 알아주는 사람, 혼자 있고 싶은 시간을 거리감으로 받아들이지 않는 사람 앞에서 오히려 마음이 더 오래 열립니다. 궁금하다고 자꾸 캐묻는 것도 관심의 표현이지만, 이 사람에게는 그 관심이 오히려 자기만의 공간을 줄이는 일이 됩니다.",
    conclusion: "그래서 이 사람에게는, 계속 설명해야 유지되는 사이보다 말하지 않은 부분까지 침범하지 않는 사이가 오래갑니다.",
  },
  정인: {
    scene: "사랑한다는 확신보다 먼저 필요한 건, 힘들 때 곁에 있어 줄 사람이라는 확인입니다. 지쳐서 아무 말도 하고 싶지 않을 때 억지로 캐묻지 않고 곁을 지켜주는 사람 앞에서 마음이 놓입니다. 힘들다는 티도 안 냈는데 알아서 잘 하고 있겠거니 하고 방치되면, 겉으로는 괜찮은 척해도 서운함이 오래 남습니다.",
    conclusion: "그래서 이 사람에게는, 각자 알아서 해결하는 사이보다 힘들 때 먼저 다가와 주는 사이가 오래갑니다.",
  },
};

type RelationState = "없음" | "합만" | "충만" | "합충모두";

const RELATION_CLAUSE: Record<Exclude<RelationState, "없음">, string> = {
  합만: " 실제로 만나보면 대화 타이밍이 잘 맞고, 서로 다른 걸 원해도 자연스럽게 절충점을 찾게 되는 경우가 많습니다.",
  충만: " 다만 가까워지는 동안 사소한 부분에서 부딪히는 순간이 한 번씩은 있는데, 그 부딪힘을 넘기고 나면 오히려 서로를 더 정확히 알게 되는 계기가 됩니다.",
  합충모두: " 가까워지는 과정이 마냥 순탄하지도, 마냥 삐걱대지도 않아서, 잘 맞는다 싶다가도 한 번씩 부딪히는 굴곡을 함께 넘게 되는 경우가 많습니다.",
};

function relationStateOf(heCount: number, chongCount: number): RelationState {
  if (heCount > 0 && chongCount > 0) return "합충모두";
  if (heCount > 0) return "합만";
  if (chongCount > 0) return "충만";
  return "없음";
}

export function generateLoveStabilityConditionNarrative(appData: AppData, gender: "male" | "female"): LoveStabilityConditionNarrativeResult {
  const rawSipseong = appData.user.pillars.branches.day.sipseong;
  const daySipseong: DaySipseong = (VALID_SIPSEONG as string[]).includes(rawSipseong) ? (rawSipseong as DaySipseong) : "비견";

  const rel = analyzeBranchRelations(appData.user);
  const heCount = rel.he.filter((p) => p.a.stage === "day" || p.b.stage === "day").length;
  const chongCount = rel.chong.filter((p) => p.a.stage === "day" || p.b.stage === "day").length;
  const state = relationStateOf(heCount, chongCount);

  const t = TYPE_TEXT[daySipseong];
  const clause = state === "없음" ? "" : RELATION_CLAUSE[state];
  const noteHead = `daySipseong=${daySipseong}, he=${heCount}, chong=${chongCount}, state=${state}, gender=${gender}`;

  return {
    paragraphs: [
      { text: `${t.scene}${clause}`, sourceNote: noteHead },
      { text: t.conclusion, sourceNote: `${daySipseong} 결론(state=${state})` },
    ],
  };
}
