import { AppData } from "./sajuContent";
import { analyzeSpouseStar, SpouseStarExposure, SpouseStarProfile } from "./spouseStarAnalysis";

/**
 * 사랑·인연 ① "나는 사랑할 때 어떤 사람인가" 전용 고객용 서술 레이어.
 *
 * 핵심 질문: 누군가에게 마음이 생겼을 때 이 사람의 마음이 어떻게
 * 움직이고, 어떻게 표현되며, 어떤 방식으로 관계에 들어가는가.
 * 관계가 깊어진 뒤의 갈등·부담·역할 반복은 ③의 영역이므로 이 파일에서
 * 다루지 않는다 — "관계가 깊어질수록/버겁다/부담/역할이 쏠린다/감당하는
 * 힘" 같은 ③ 전용 어휘를 쓰지 않는다.
 *
 * 새 계산을 하지 않는다 — analyzeSpouseStar(user, gender) 하나만 그대로
 * 재호출해 exposure/isDayBranch/subtypes만 쓴다. strength.total,
 * dayMasterBalance, yongsinRelation/huisinRelation은 각각 ③·②의 신호라
 * 이 파일에서 끌어오지 않는다(② 설계 승인 없이 미리 손대지 않는다).
 *
 * 1차 분기(핵심 판정): exposure(뚜렷/숨음/미미) × isDayBranch(뚜렷일
 * 때만 유효 — 배우자성이 일지=자기 정체성 핵심 자리에 바로 있는지).
 *  - 뚜렷+본연(isDayBranch=true): 사랑할 때 모습이 평소 모습과 같은 결.
 *  - 뚜렷+맥락(isDayBranch=false): 평소와 다른 얼굴이 사랑 앞에서 나옴.
 *  - 숨음: 마음은 있어도 먼저 적극적으로 드러내는 편은 아님.
 *  - 미미: 이 축만으로는 사랑 방식을 단정하기 어려움(장면 없이 정직하게
 *    안내만 한다).
 * isDayBranch=true는 "배우자가 삶의 중심"·"결혼이 가장 중요"처럼 확대
 * 해석하지 않는다 — 사랑·관계를 받아들이는 방식이 평소 성격과 같은
 * 결인지에 대한 보조 서술로만 쓴다.
 *
 * 2차 분기(서술 초점만 다르게, 판정은 그대로): ③과 같은 메커니즘을
 * 재사용하되 다른 장면에 적용한다 — subtype(편재/정재 또는 편관/정관)
 * 우세 비교로 "관심이 여러 방향으로 뻗치는지 vs 한 사람에게 집중하는지"
 * (다가가는 방식의 결)를, visible/rooted/hidden 우세 비교로 "마음이
 * 얼마나 즉시/지속적/신중하게 표현되는지"를 고른다. 새 강도 공식이
 * 아니라 기존 배열 길이 비교이며, 랜덤 없음 — 같은 입력이면 항상 같은
 * 출력이다. 우세가 없으면(동률 포함) 억지로 쪼개지 않고 상위 판정
 * 문장을 그대로 쓴다.
 *
 * 안전 원칙: "항상/반드시/운명적으로" 같은 확정 어휘 대신 "~하기
 * 쉽습니다/~쪽에 가깝습니다"로 헤지한다. 실제 연애·이별·결혼 등 계산에
 * 없는 사건, 외모·직업·MBTI·특정 상대 성격을 만들지 않는다. 명리 용어
 * (배우자성/배우자궁/편재/정재/편관/정관/visible/rooted/hidden 등)는
 * 고객 문장에 노출하지 않고 내부 sourceNote에만 남긴다.
 */

export interface NarrativeParagraph {
  text: string;
  /** 고객에게 노출하지 않는 내부 검수용 근거. */
  sourceNote: string;
}

export interface LoveApproachStyleNarrativeResult {
  paragraphs: NarrativeParagraph[];
}

type TopBranch = "본연" | "맥락" | "숨음";
type SubtypeFocus = "subA" | "subB" | "balanced";
type ExposureShape = "visible" | "rooted" | "hidden" | "none";

function subtypeFocusOf(star: SpouseStarProfile): SubtypeFocus {
  const [a, b] = star.subtypes;
  const countA = a.visible.length + a.rooted.length + a.hidden.length;
  const countB = b.visible.length + b.rooted.length + b.hidden.length;
  if (countA > countB) return "subA";
  if (countB > countA) return "subB";
  return "balanced";
}

function exposureShapeOf(star: SpouseStarProfile, focus: SubtypeFocus): ExposureShape {
  const [a, b] = star.subtypes;
  const pick = focus === "subA" ? a : focus === "subB" ? b : null;
  const v = pick ? pick.visible.length : a.visible.length + b.visible.length;
  const r = pick ? pick.rooted.length : a.rooted.length + b.rooted.length;
  const h = pick ? pick.hidden.length : a.hidden.length + b.hidden.length;
  if (v > r && v > h) return "visible";
  if (h > v && h > r) return "hidden";
  if (r > v && r > h) return "rooted";
  return "none";
}

/** shape별 장면 부연절 — 특정 상위 판정 전용이 아니라 어느 판정의 장면
 * 뒤에 붙여도 성립하는 일반 문장("이런 마음"이 바로 앞 문장이 묘사한
 * 상태를 가리킨다). 숨음(마음을 잘 안 드러냄) 판정에 shape=hidden까지
 * 붙이면 같은 말을 두 번 하게 되므로 그 조합만 생략한다(하드코딩된
 * 인물 분기가 아니라 topBranch×shape 조합에 대한 일반 규칙). */
const SHAPE_SCENE_CLAUSE: Record<Exclude<ExposureShape, "none">, string> = {
  visible: "이런 마음은 오래 지나지 않아 표정이나 행동으로 비교적 빨리 드러나는 편이라, 상대도 눈치채기 어렵지 않습니다.",
  rooted: "이런 마음은 특별한 계기가 없어도 시간이 지나도 크게 식지 않고 꾸준히 이어지는 쪽에 가깝습니다.",
  hidden: "다만 이런 마음이 바로 겉으로 드러나기보다, 스스로 먼저 확인하는 시간을 가진 뒤에야 표현으로 이어지는 경우가 많습니다.",
};

function shapeClauseFor(topBranch: TopBranch, shape: ExposureShape): string {
  if (shape === "none") return "";
  if (topBranch === "숨음" && shape === "hidden") return ""; // 숨음 판정 문장과 중복 방지
  return " " + SHAPE_SCENE_CLAUSE[shape];
}

/**
 * 결론 보강 — 상위 판정·focus는 그대로 두고 결론의 "의미 초점"만
 * shape에 따라 갈라지게 한다. shape=none(우세 없음)이면 이 값을 쓰지
 * 않고 BRANCH_TEXT의 기본 결론을 그대로 유지한다(억지 분리 금지).
 * focus×shape 9칸 전부 실제로 다른 서술 초점(즉시 표현/확인 시간 필요/
 * 계기 없이도 지속)을 담아야 하며, "관계가 잘 맞습니다"라는 틀만 같고
 * 그 앞의 근거 문장은 매번 달라야 한다 — 동의어 치환 금지 원칙.
 * 숨음+hidden은 상위 판정 결론 자체가 이미 "천천히 알아채 주는 관계"를
 * 말하고 있어 이 표를 적용하면 같은 말을 또 하게 되므로 제외한다(같은
 * 규칙을 장면 절에도 이미 적용 중).
 */
const CONCLUSION_FOCUS_SHAPE: Record<SubtypeFocus, Record<Exclude<ExposureShape, "none">, string>> = {
  subA: {
    visible: "그래서 이 사람에게는, 관심이 여러 곳으로 옮겨 다닐 수 있다는 걸 이해하면서도 그때그때 빠르게 드러나는 마음을 있는 그대로 봐주는 관계가 잘 맞습니다.",
    hidden: "그래서 이 사람에게는, 관심이 여러 곳을 오갈 수 있다는 걸 이해하면서도 마음을 확인하기까지 걸리는 시간을 채근하지 않고 기다려주는 관계가 잘 맞습니다.",
    rooted: "그래서 이 사람에게는, 관심이 여러 곳을 오가더라도 일단 마음이 자리를 잡으면 특별한 계기 없이도 이어간다는 걸 알아봐 주는 관계가 잘 맞습니다.",
  },
  subB: {
    visible: "그래서 이 사람에게는, 한 사람에게 집중된 마음이 빠르게 겉으로 드러난다는 걸 자연스럽게 받아주는 관계가 잘 맞습니다.",
    hidden: "그래서 이 사람에게는, 한 사람에게 집중하면서도 그 마음을 표현하기까지 시간이 걸린다는 걸 채근하지 않고 기다려주는 관계가 잘 맞습니다.",
    rooted: "그래서 이 사람에게는, 한 사람을 향한 마음이 특별한 계기 없이도 꾸준히 이어진다는 걸 믿어주는 관계가 잘 맞습니다.",
  },
  balanced: {
    visible: "그래서 이 사람에게는, 마음이 생기면 비교적 빠르게 표현으로 이어진다는 걸 자연스럽게 받아주는 관계가 잘 맞습니다.",
    hidden: "그래서 이 사람에게는, 마음을 확인하기까지 시간이 걸린다는 걸 서두르지 않고 기다려주는 관계가 잘 맞습니다.",
    rooted: "그래서 이 사람에게는, 특별한 계기가 없어도 마음이 꾸준히 이어진다는 걸 알아봐 주는 관계가 잘 맞습니다.",
  },
};

function conclusionFor(branch: TopBranch, focus: SubtypeFocus, shape: ExposureShape, baseConclusion: string): string {
  if (shape === "none") return baseConclusion;
  if (branch === "숨음" && shape === "hidden") return baseConclusion;
  return CONCLUSION_FOCUS_SHAPE[focus][shape];
}

interface FocusText {
  scene: string;
  conclusion: string;
}

const BRANCH_TEXT: Record<TopBranch, Record<SubtypeFocus, FocusText>> = {
  // 뚜렷 + isDayBranch=true — 사랑할 때 모습이 평소 모습과 같은 결.
  본연: {
    balanced: {
      scene: "이 사람은 누군가에게 마음이 생겨도 평소와 크게 다른 모습을 보이지 않습니다. 마음이 가면 가는 대로, 하던 대로 자연스럽게 다가가는 편입니다.",
      conclusion: "그래서 이 사람에게는, 있는 그대로의 모습을 보여줘도 되는 관계가 잘 맞습니다.",
    },
    subA: {
      scene: "이 사람은 누군가에게 마음이 생겨도 평소와 크게 다른 모습을 보이지 않지만, 그 관심이 한 곳에만 머물지 않고 여러 사람이나 상황으로 자연스럽게 옮겨 다니는 편입니다. 다가가는 방식도 상대나 상황에 따라 매번 조금씩 달라지기 쉽습니다.",
      conclusion: "그래서 이 사람에게는, 매번 같은 방식을 기대하기보다 그때그때 다르게 다가오는 모습 자체를 편하게 봐주는 관계가 잘 맞습니다.",
    },
    subB: {
      scene: "이 사람은 누군가에게 마음이 생겨도 평소와 크게 다른 모습을 보이지 않고, 한번 마음이 가면 그 사람 한 명에게 꾸준히 집중하는 편입니다. 여기저기 기웃거리기보다 한 사람을 향해 한결같이 다가갑니다.",
      conclusion: "그래서 이 사람에게는, 그 한결같음을 가볍게 여기지 않고 알아봐 주는 관계가 잘 맞습니다.",
    },
  },
  // 뚜렷 + isDayBranch=false — 평소와 다른 얼굴이 사랑 앞에서 나옴.
  맥락: {
    balanced: {
      scene: "이 사람은 평소 모습과는 조금 다른 얼굴이 마음이 생겼을 때 나오는 편입니다. 좋아하는 사람이 생기면 평소보다 더 적극적으로 티가 나거나 표현이 늘어나는 쪽에 가깝습니다.",
      conclusion: "그래서 이 사람에게는, '평소의 나'와 '사랑할 때의 나'가 다르다는 것을 자연스럽게 받아들여 주는 관계가 잘 맞습니다.",
    },
    subA: {
      scene: "이 사람은 평소 모습과는 조금 다른 얼굴이 마음이 생겼을 때 나오는데, 그 관심이 한 사람에게만 고정되기보다 여러 곳으로 옮겨 다니며 표현되기 쉽습니다. 마음이 쓰이는 대상이나 다가가는 방식이 그때그때 바뀌는 편입니다.",
      conclusion: "그래서 이 사람에게는, 매번 똑같은 방식을 기대하지 않고 그때그때 다른 표현을 편하게 받아주는 관계가 잘 맞습니다.",
    },
    subB: {
      scene: "이 사람은 평소 모습과는 조금 다른 얼굴이 마음이 생겼을 때 나오는데, 그 마음은 한 사람에게 집중되어 꾸준히 이어지는 편입니다. 좋아하는 사람이 생기면 평소와 달리 그 한 사람 위주로 움직이게 됩니다.",
      conclusion: "그래서 이 사람에게는, 그런 집중을 어색해하지 않고 편하게 받아주는 관계가 잘 맞습니다.",
    },
  },
  // 숨음 — 마음은 있어도 먼저 적극적으로 드러내는 편은 아님.
  숨음: {
    balanced: {
      scene: "이 사람은 마음이 생겨도 먼저 적극적으로 티를 내는 편은 아닙니다. 겉으로 드러내지 않으면서 마음속으로만 조용히 담아두는 쪽에 가깝습니다.",
      conclusion: "그래서 이 사람에게는, 표현을 재촉하지 않고 천천히 알아채 주는 관계가 잘 맞습니다.",
    },
    subA: {
      scene: "이 사람은 마음이 생겨도 먼저 적극적으로 티를 내는 편은 아닙니다. 관심이 가는 대상이나 마음이 쓰이는 방향도 한 곳에 고정되기보다 상황에 따라 조용히 바뀔 수 있습니다.",
      conclusion: "그래서 이 사람에게는, 겉으로 드러나지 않는 관심의 변화까지 조급해하지 않고 지켜봐 주는 관계가 잘 맞습니다.",
    },
    subB: {
      scene: "이 사람은 마음이 생겨도 먼저 적극적으로 티를 내는 편은 아닙니다. 다만 그 마음은 한 사람에게 조용히 집중되어, 겉으로 드러내지 않으면서도 계속 그 사람을 신경 쓰게 됩니다.",
      conclusion: "그래서 이 사람에게는, 표현이 적다고 마음이 없는 게 아니라는 걸 알고 먼저 다가와 주는 관계가 잘 맞습니다.",
    },
  },
};

function buildBranchParagraphs(branch: TopBranch, focus: SubtypeFocus, shape: ExposureShape, noteHead: string): NarrativeParagraph[] {
  const t = BRANCH_TEXT[branch][focus];
  const clause = shapeClauseFor(branch, shape);
  const conclusion = conclusionFor(branch, focus, shape, t.conclusion);
  return [
    { text: `${t.scene}${clause}`, sourceNote: `${noteHead}, focus=${focus}, shape=${shape}` },
    { text: conclusion, sourceNote: `${branch} 결론(focus=${focus}, shape=${shape})` },
  ];
}

export function generateLoveApproachStyleNarrative(appData: AppData, gender: "male" | "female"): LoveApproachStyleNarrativeResult {
  const star = analyzeSpouseStar(appData.user, gender);
  const { exposure, isDayBranch } = star;
  const focus = subtypeFocusOf(star);
  const shape = exposureShapeOf(star, focus);
  const [subA, subB] = star.subtypes;
  const focusDetail = `subA(${subA.subtype})=${subA.visible.length + subA.rooted.length + subA.hidden.length} vs subB(${subB.subtype})=${subB.visible.length + subB.rooted.length + subB.hidden.length}`;

  // ── 1순위: exposure=미미 → 이 축만으로 사랑 방식을 단정하기 어려움 ──
  if (exposure === "미미") {
    return {
      paragraphs: [
        {
          text: "이 부분만으로는 이 사람이 사랑할 때 어떤 모습을 보이는지 뚜렷하게 나타나지 않습니다. 이 사람의 사랑 방식은 다른 부분에서 더 분명하게 드러날 수 있습니다.",
          sourceNote: `exposure=미미(단정보류형), isDayBranch=${isDayBranch}`,
        },
      ],
    };
  }

  // ── 2순위: exposure=숨음 ───────────────────────────────────────
  if (exposure === "숨음") {
    const noteHead = `exposure=숨음, isDayBranch=${isDayBranch}, ${focusDetail}`;
    return { paragraphs: buildBranchParagraphs("숨음", focus, shape, noteHead) };
  }

  // ── 3순위: exposure=뚜렷 × isDayBranch ────────────────────────
  const branch: TopBranch = isDayBranch ? "본연" : "맥락";
  const noteHead = `exposure=뚜렷+isDayBranch=${isDayBranch}(${branch}), ${focusDetail}`;
  return { paragraphs: buildBranchParagraphs(branch, focus, shape, noteHead) };
}
