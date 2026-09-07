import { AppData } from "./sajuContent";
import { analyzeSpouseStar, SpouseStarProfile } from "./spouseStarAnalysis";

/**
 * 사랑·인연 새 하위 섹션("배우자·동반자 관계") — 第四章 확장(승인된 작업,
 * 2026-09). 핵심 질문: "겉으로 끌리는 유형"(배우자성)과 "실제로 편안해질
 * 자리"(배우자궁=일지)가 같은 결인지 다른 결인지. 결혼 여부를 단정하지
 * 않고 동반자 관계 전반으로 다룬다.
 *
 * 새 계산을 하지 않는다 — analyzeSpouseStar(user, gender)만 재호출한다.
 * ①③이 이미 subtype 우세(subA/subB)를 계산에 쓰지만, 그걸 "일지(배우자궁)
 * 십성 카테고리와 나란히 비교"하는 조합은 이 섹션이 처음이다 —
 * user.pillars.branches.day.sipseong은 ⑥(구 ④, 내 인연이 머무는 자리)이
 * 이미 10종 그대로 쓰고 있지만, 거기서는 "일지 자체"만 보고 배우자성과
 * 비교하지 않는다. 이 섹션은 정확히 그 비교(배우자성 카테고리 vs 일지
 * 십성이 속한 카테고리)를 새로 한다 — 새 명리 판정이 아니라 이미 있는
 * 두 값(targetCategory, 일지 sipseong)을 견주는 것뿐이다.
 *
 * 1차 분기(핵심 판정): exposure===미미면 판정보류형. 그 외에는 "일지
 * 카테고리 === 배우자성 카테고리"(일치/불일치) × subtypeFocus(subA
 * 우세/subB 우세/균등) 총 6갈래.
 *
 * 안전 원칙: "결혼한다/못 한다" 단정 금지, "동반자 관계"로 포괄한다.
 * 명리 용어는 sourceNote에만.
 */

export interface NarrativeParagraph {
  text: string;
  sourceNote: string;
}

export interface LoveSpousePartnerNarrativeResult {
  paragraphs: NarrativeParagraph[];
}

const SIPSEONG_TO_CATEGORY: Record<string, "비겁" | "식상" | "재성" | "관성" | "인성"> = {
  비견: "비겁", 겁재: "비겁", 식신: "식상", 상관: "식상",
  편재: "재성", 정재: "재성", 편관: "관성", 정관: "관성",
  편인: "인성", 정인: "인성",
};

type SubtypeFocus = "subA" | "subB" | "balanced";
function subtypeFocusOf(star: SpouseStarProfile): SubtypeFocus {
  const [a, b] = star.subtypes;
  const countA = a.visible.length + a.rooted.length + a.hidden.length;
  const countB = b.visible.length + b.rooted.length + b.hidden.length;
  if (countA > countB) return "subA";
  if (countB > countA) return "subB";
  return "balanced";
}

type MatchState = "일치" | "불일치";
type BranchKey = `${MatchState}-${SubtypeFocus}`;

interface BranchText {
  scene: string;
  conclusion: string;
}

const BRANCH_TEXT: Record<BranchKey, BranchText> = {
  "일치-subA": {
    scene: "이 사람에게는 마음이 끌리는 방향과, 실제로 곁에서 편안해지는 자리가 크게 다르지 않습니다. 다만 그 안에서도 한 사람에게 고정되기보다 여러 기회나 방향을 열어두는 쪽에 마음이 가기 쉬워서, 동반자 관계에서도 서로의 영역을 존중하는 형태가 편안하게 느껴질 수 있습니다.",
    conclusion: "그래서 이 사람에게는, 서로의 몫과 시간을 인정해 주면서도 함께하는 동반자 관계가 잘 맞습니다.",
  },
  "일치-subB": {
    scene: "이 사람에게는 마음이 끌리는 방향과, 실제로 곁에서 편안해지는 자리가 크게 다르지 않습니다. 그 안에서 한 사람에게 꾸준히 집중하는 쪽에 무게가 실려 있어서, 처음 끌렸던 결이 관계가 깊어져도 크게 변하지 않고 이어지는 편입니다.",
    conclusion: "그래서 이 사람에게는, 처음 느꼈던 편안함을 오래 함께 쌓아가는 동반자 관계가 잘 맞습니다.",
  },
  "일치-balanced": {
    scene: "이 사람에게는 마음이 끌리는 방향과, 실제로 곁에서 편안해지는 자리가 크게 다르지 않습니다. 처음 끌렸던 이유가 관계가 깊어진 뒤에도 크게 어긋나지 않고 그대로 이어지는 경우가 많습니다.",
    conclusion: "그래서 이 사람에게는, 처음의 느낌을 믿고 천천히 쌓아가는 동반자 관계가 잘 맞습니다.",
  },
  "불일치-subA": {
    scene: "이 사람은 마음이 먼저 끌리는 유형과, 실제로 곁에 있을 때 가장 편안해지는 자리가 서로 다를 수 있습니다. 처음엔 여러 사람이나 상황에 관심이 쏠리다가도, 정작 오래 곁을 지켜주는 사람은 그런 화려함과는 결이 다른 사람일 수 있습니다.",
    conclusion: "그래서 이 사람에게는, 처음 끌림보다 함께 있을 때의 편안함을 뒤늦게라도 알아보는 관계가 더 오래갑니다.",
  },
  "불일치-subB": {
    scene: "이 사람은 마음이 먼저 끌리는 유형과, 실제로 곁에 있을 때 가장 편안해지는 자리가 서로 다를 수 있습니다. 한 사람에게 꾸준히 집중하려는 마음과, 실제로 마음이 놓이는 관계의 결이 처음엔 어긋나 보일 수 있습니다.",
    conclusion: "그래서 이 사람에게는, 처음 그리던 모습과 달라도 편안함을 주는 쪽을 다시 눈여겨보는 관계가 더 오래갑니다.",
  },
  "불일치-balanced": {
    scene: "이 사람은 마음이 먼저 끌리는 유형과, 실제로 곁에 있을 때 가장 편안해지는 자리가 서로 다를 수 있습니다. 처음 그리던 상대상과 실제로 마음을 놓게 되는 사람이 다른 경우, 스스로도 의아하게 느낄 수 있습니다.",
    conclusion: "그래서 이 사람에게는, 처음의 이상형에 얽매이기보다 실제로 편안한 쪽을 다시 살펴보는 관계가 더 오래갑니다.",
  },
};

/** 深化 — match×focus 조합별로 "동반자 관계에서 실제로 필요한 역할
 * 분담" 한 문단 추가. 새 신호 없음. */
const ROLE_SHARING_BY_BRANCH: Record<BranchKey, string> = {
  "일치-subA": "동반자 관계에서는 한쪽이 모든 걸 정해두기보다, 각자 맡은 영역을 존중하며 필요할 때만 상의하는 역할 분담이 잘 맞습니다.",
  "일치-subB": "동반자 관계에서는 큰 결정을 함께 상의하고 꾸준히 맞춰가는 역할 분담이 이 사람에게는 자연스럽게 자리 잡습니다.",
  "일치-balanced": "동반자 관계에서는 처음 맞춰본 방식을 크게 바꾸지 않고 이어가는 역할 분담이 편안하게 느껴집니다.",
  "불일치-subA": "동반자 관계에서는 이 사람이 이끄는 부분과, 실제로 편안함을 주는 상대가 채워주는 부분이 서로 다를 수 있어, 그 다름을 인정하는 역할 분담이 필요합니다.",
  "불일치-subB": "동반자 관계에서는 처음 그리던 역할과 실제로 편안한 역할이 다를 수 있어, 미리 정해둔 틀보다 실제로 맞춰보며 역할을 조정하는 편이 낫습니다.",
  "불일치-balanced": "동반자 관계에서는 이상형에 맞춰 미리 역할을 정하기보다, 실제로 함께 지내보며 자연스럽게 역할을 맞춰가는 쪽이 이 사람에게 더 잘 맞습니다.",
};

export function generateLoveSpousePartnerNarrative(appData: AppData, gender: "male" | "female"): LoveSpousePartnerNarrativeResult {
  const star = analyzeSpouseStar(appData.user, gender);
  const { exposure, targetCategory } = star;

  if (exposure === "미미") {
    // ①의 exposure=미미 문장과 문형이 거의 같아 2026-09 第四章 반복
    // 정리에서 표현만 갈랐다(위 loveHurtPointNarrative.ts와 동일한
    // 이유) — 판정·근거는 그대로다.
    return {
      paragraphs: [
        {
          text: "이 축의 신호만으로는 배우자·동반자 관계가 이 사람에게 어떤 결로 자리 잡을지까지는 짚어내기 어렵습니다. 그 결은 지금까지 살펴본 다른 모습들 안에 이미 녹아 있을 수 있습니다.",
          sourceNote: "exposure=미미(단정보류형)",
        },
      ],
    };
  }

  const daySipseong = appData.user.pillars.branches.day.sipseong;
  const dayCategory = SIPSEONG_TO_CATEGORY[daySipseong];
  const match: MatchState = dayCategory === targetCategory ? "일치" : "불일치";
  const focus = subtypeFocusOf(star);
  const branchKey: BranchKey = `${match}-${focus}`;
  const t = BRANCH_TEXT[branchKey];
  const noteHead = `dayCategory=${dayCategory}, targetCategory=${targetCategory}, match=${match}, focus=${focus}`;

  return {
    paragraphs: [
      { text: t.scene, sourceNote: noteHead },
      { text: ROLE_SHARING_BY_BRANCH[branchKey], sourceNote: `역할분담(branch=${branchKey})` },
      { text: t.conclusion, sourceNote: `${branchKey} 결론` },
    ],
  };
}
