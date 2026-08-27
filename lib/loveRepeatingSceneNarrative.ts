import { AppData } from "./sajuContent";
import { analyzeSpouseStar, SpouseStarExposure, SpouseStarProfile } from "./spouseStarAnalysis";
import { analyzeDayMasterBalance, BalanceVerdict } from "./dayMasterBalanceAnalysis";

/**
 * 사랑·인연 ③ "사랑에서 자꾸 반복되는 장면" 전용 고객용 서술 레이어.
 *
 * 새 계산을 하지 않는다 — 이미 동결된 함수만 그대로 재호출한다.
 *  - analyzeSpouseStar(user, gender): exposure/strength.total/subtypes만 사용
 *    (배우자성 판정 자체·용신·희신 관계는 ①②에서 이미 쓰므로 여기서는
 *    건드리지 않는다)
 *  - analyzeDayMasterBalance(user): balance(6단계: clearlyStrong~hold)
 *    만 사용(재물5장이 이미 쓰는 것과 동일 함수, 여기서 재해석만 한다)
 *
 * 1차 분기(핵심 판정, 절대 원칙): exposure × balance × total 3단계
 * (HIGH/MID/LOW, 이미 계산된 total 숫자를 서술 문구 선택에만 쓰는 순수
 * 임계값 — 새 명리 개념 아님)의 조합. 이 판정이 바뀌면 안 된다.
 *
 * 2차 분기(서술 초점만 다르게, 판정은 그대로): 이미 계산되어 있는
 * subtypes([편재,정재] 또는 [편관,정관]의 visible/rooted/hidden 개수)를
 * 비교해 어느 쪽이 더 많이 드러났는지만 본다(subA 우세/subB 우세/균등).
 * 이 값은 "같은 핵심 판정 안에서 실제 계산 구조가 다른 사람"을 구분하는
 * 용도로만 쓰고, 판정 자체를 바꾸지 않는다. 랜덤 선택 없음 — 같은 입력이면
 * 항상 같은 출력이다. 정재/편재/정관/편관 같은 명리 용어는 고객 문장에
 * 절대 노출하지 않고 내부 sourceNote에만 남긴다.
 *
 * 안전 원칙: "항상/늘/반드시" 같은 확정 어휘 대신 "~하기 쉽습니다/
 * ~쪽에 가깝습니다"로 헤지한다. 실제 연애·이별·외도·결혼 등 계산에
 * 없는 사건은 만들지 않는다. 관계 "안에서의" 행동·반응까지만 다루고
 * 생활사(취업·자기계발 등 관계 밖 사건)는 다루지 않는다. "무게/기준/
 * 편안함/흐름/두드러지지 않는다" 같은 반복 추상어는 쓰지 않는다.
 */

export interface NarrativeParagraph {
  text: string;
  /** 고객에게 노출하지 않는 내부 검수용 근거. */
  sourceNote: string;
}

export interface LoveRepeatingSceneNarrativeResult {
  paragraphs: NarrativeParagraph[];
}

type TotalTier = "high" | "mid" | "low";

function totalTierOf(total: number): TotalTier {
  if (total >= 12) return "high";
  if (total >= 6) return "mid";
  return "low";
}

function isWeak(balance: BalanceVerdict): boolean {
  return balance === "clearlyWeak" || balance === "slightlyWeak";
}
function isStrong(balance: BalanceVerdict): boolean {
  return balance === "clearlyStrong" || balance === "slightlyStrong";
}

/**
 * exposure=숨음일 때 붙는 부연절 — ①(마음이 생겼을 때 표현까지 시간이
 * 걸린다는, 사랑이 "시작되는 순간"의 표현 방식)과 겹치지 않도록, 여기서는
 * "성향 설명"이 아니라 관계가 진행되는 동안 반복되는 작동 방식만 다룬다:
 * 말로 확인시키지 않고 넘어감 → 상대는 문제없다고 여김 → 확인받지 못한
 * 마음이 쌓임. 새 분기를 늘리지 않고 기존 문장 뒤에 붙이는 부연절로만
 * 쓴다(원래는 문장 앞에 붙는 수식절이었으나, ①과의 의미 중복을 없애기
 * 위해 관계 작동 과정을 담은 뒷절로 바꿨다).
 */
function hiddenClauseFor(exposure: SpouseStarExposure): string {
  if (exposure !== "숨음") return "";
  return " 이런 감정을 굳이 말로 확인시키지 않고 넘어가는 편이라, 상대는 별다른 문제가 없다고 여기기 쉽습니다. 그렇게 넘어간 순간들이 쌓이면, 정작 이 사람 안에는 확인받지 못한 마음이 조금씩 남게 됩니다.";
}

/**
 * 2차 분기 — 이미 계산된 subtypes([subA, subB]) 안에서 어느 쪽이 실제로
 * 더 많이 드러났는지(visible+rooted+hidden 총 히트 수)만 비교한다.
 * 새 강도 공식이 아니라 기존 배열 길이 비교일 뿐이다.
 */
type SubtypeFocus = "subA" | "subB" | "balanced";

function subtypeFocusOf(star: SpouseStarProfile): SubtypeFocus {
  const [a, b] = star.subtypes;
  const countA = a.visible.length + a.rooted.length + a.hidden.length;
  const countB = b.visible.length + b.rooted.length + b.hidden.length;
  if (countA > countB) return "subA";
  if (countB > countA) return "subB";
  return "balanced";
}

/**
 * 3차 분기(장면 안의 결만 더 세분화, 판정·1차·2차 분기는 그대로) —
 * focus가 가리키는 subtype(또는 balanced면 둘을 합친 것) 안에서
 * visible/rooted/hidden 중 어느 슬롯이 실제로 우세한지만 비교한다.
 * 이미 계산되어 있는 배열 길이 비교일 뿐, 새 강도 공식이 아니다.
 * 어느 한쪽도 뚜렷하게 우세하지 않으면(동률 포함) "none"을 반환하고,
 * 이 경우 문장을 억지로 쪼개지 않고 2차 분기 결과를 그대로 쓴다.
 */
type ExposureShape = "visible" | "rooted" | "hidden" | "none";

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

/**
 * shape별 장면 부연절 — 특정 분기 전용 문구가 아니라 어느 분기의 장면
 * 뒤에 붙여도 성립하는 일반 문장이다("이런 모습"/"이런 성향"이 바로 앞
 * 문장이 묘사한 행동을 가리킨다). visible/rooted/hidden 같은 명리 용어는
 * 쓰지 않는다.
 *
 * visible/rooted는 ①(마음이 생겼을 때 나타나는 성향·표현 방식)과 서사
 * 역할을 분리한다 — ①이 이미 "표현이 빨리 드러난다/마음이 오래간다"는
 * 성향 자체를 말하므로, 여기서 그 결론(상대가 알아차린다/꾸준히
 * 이어진다)을 다시 반복하지 않는다. 대신 그 성향 때문에 관계 안에서
 * 실제로 반복되는 상호작용(표현 이후 상대 반응을 살펴 다음 행동을
 * 조정함 / 관계가 흔들려도 바로 정리하지 않고 지켜봄)으로 한 단계
 * 이어붙인다 — ①에 이미 나온 사실을 다른 말로 재진술하는 게 아니라
 * 그다음에 벌어지는 일을 보여준다. 계산에 없는 사건(구체적 다툼·이별
 * 등)은 만들지 않는다.
 * exposure=숨음(겉으로 티 안 남)일 때 shape=hidden까지 또 붙이면 같은
 * 말을 두 번 하게 되므로 그 조합만 예외로 생략한다(하드코딩된 인물
 * 분기가 아니라 exposure×shape 조합에 대한 일반 규칙).
 */
const SHAPE_SCENE_CLAUSE: Record<Exclude<ExposureShape, "none">, string> = {
  visible: "표현이 겉으로 드러난 뒤에는, 상대의 반응이나 거리감을 빠르게 파악하고 그에 맞춰 다음 행동을 조정하는 패턴이 반복되기 쉽습니다.",
  hidden: "이런 모습을 그때그때 말로 짚어주기보다 혼자 삭이고 넘어가는 경우가 많아, 상대는 별일 없었다는 듯 그냥 지나가기 쉽습니다. 그 사이 이 사람 안에는 정리되지 않은 감정이 조금씩 쌓입니다.",
  rooted: "이 마음이 쉽게 사그라들지 않다 보니, 관계가 흔들리는 순간에도 바로 정리하기보다 한 번 더 지켜보고 확인하려는 태도가 반복되기 쉽습니다.",
};

function shapeClauseFor(exposure: SpouseStarExposure, shape: ExposureShape): string {
  if (shape === "none") return "";
  if (exposure === "숨음" && shape === "hidden") return ""; // hiddenPrefix와 같은 말 중복 방지
  return " " + SHAPE_SCENE_CLAUSE[shape];
}

interface FocusText {
  scene: string;
  conclusion: string;
}

type BranchKey = "과부하형" | "점증형" | "방향부재형" | "여유-무난형" | "여유-이끄는형" | "균형형";

const BRANCH_TEXT: Record<BranchKey, Record<SubtypeFocus, FocusText>> = {
  // 신약 + total高 — 자기보다 크게 움직이는 힘을 받쳐줄 축이 약해서,
  // 관계가 깊어질수록 스스로 감당할 일이 늘어나는 유형.
  과부하형: {
    balanced: {
      scene: "처음에는 좋아서 시작했는데, 어느 순간 상대의 기분까지 살피고 관계가 틀어지지 않도록 먼저 움직이는 쪽이 되기 쉽습니다. 이 사람 안에서 가장 크게 움직이는 힘을 받쳐주는 다른 힘은 상대적으로 여린 편이라, 관계가 깊어질수록 스스로 정리해야 할 일이 하나둘 늘어나는 경험을 하게 됩니다.",
      conclusion: "상대가 유별나서가 아니라, 이 사람에게 원래 그 정도로 크게 움직이는 힘이 있기 때문입니다. 그래서 이 사람에게는 시작부터 그 몫을 나눠서 짊어질 수 있는 관계가 더 잘 맞습니다.",
    },
    subA: {
      scene: "처음에는 좋아서 시작했는데, 관계가 이어질수록 신경 써야 할 일이 한 가지가 아니라 여러 갈래로 늘어나기 쉽습니다. 연락, 감정, 다음 약속까지 한꺼번에 챙기다 보니 정작 본인 컨디션은 뒷전이 되는 순간이 잦아집니다.",
      conclusion: "혼자 여러 몫을 동시에 감당하려 하기보다, 그때그때 하나씩만 먼저 처리해도 된다고 스스로에게 허락하는 쪽이 이 사람에게는 더 잘 맞습니다.",
    },
    subB: {
      scene: "처음에는 좋아서 시작했는데, 관계가 깊어질수록 상대 한 사람에게 맞춰 스스로를 조정하는 쪽으로 자주 기울게 됩니다. 상대가 편한 방향을 먼저 찾다 보니 정작 자신의 속도는 점점 뒤로 밀리는 경험을 하게 됩니다.",
      conclusion: "그 마음이 잘못된 게 아니라, 이 사람에게 원래 그 정도로 크게 움직이는 힘이 있기 때문입니다. 그래서 이 사람에게는 자기 속도를 먼저 물어봐 주는 관계가 더 잘 맞습니다.",
    },
  },
  // 신약 + total中 — 처음엔 안 보이다가 관계가 길어질수록 챙기고
  // 조율하는 역할이 자연스럽게 늘어나는 유형.
  점증형: {
    balanced: {
      scene: "처음 만났을 땐 크게 티가 안 나다가, 관계가 길어질수록 이 사람이 알아서 챙기고 조율하는 일이 자연스럽게 늘어납니다. 상대의 결정을 대신 정리해주거나, 갈등이 생기기 전에 먼저 조율하려는 쪽으로 움직이기 쉽습니다.",
      conclusion: "그래서 이 사람에게는, 관계가 길어질수록 그 역할이 한쪽으로만 쏠리지 않는지 스스로 가끔 확인해보는 쪽이 잘 맞습니다.",
    },
    subA: {
      scene: "처음 만났을 땐 크게 티가 안 나다가, 관계가 길어질수록 이런저런 상황을 동시에 조율하는 역할을 은근히 맡게 됩니다. 약속을 조정하거나 분위기를 살피는 자잘한 일들이 어느새 이 사람 몫으로 쌓이기 쉽습니다.",
      conclusion: "그래서 이 사람에게는, 그 조율의 몫을 계속 혼자 떠안기 전에 한 번씩 상대에게 넘겨보는 시도가 잘 맞습니다.",
    },
    subB: {
      scene: "처음 만났을 땐 크게 티가 안 나다가, 관계가 길어질수록 상대와의 약속이나 정해둔 방식을 이 사람이 먼저 챙기고 지키려는 쪽으로 자리 잡기 쉽습니다. 어긋나지 않게 조율하는 역할을 스스로 맡게 됩니다.",
      conclusion: "그래서 이 사람에게는, 그 역할이 계속 자기 쪽으로만 쏠리지 않는지 가끔 점검해보는 쪽이 잘 맞습니다.",
    },
  },
  // 신약 + total低 — 크게 힘든 일은 없지만 방향에 확신이 잘 서지 않고
  // 상대 말 한마디에 흔들리기 쉬운 유형.
  방향부재형: {
    balanced: {
      scene: "관계에서 크게 힘든 일은 잘 없는 편인데, 그렇다고 이 관계가 맞는 방향인지 스스로 확신이 잘 서지도 않습니다. 상대의 말 한마디에 마음이 이랬다저랬다 하기 쉽고, 이 관계를 계속 이어가야 할지 혼자 되묻는 순간이 자주 옵니다.",
      conclusion: "이 사람에게는 확신이 급하게 서지 않아도 괜찮은, 천천히 확인해가는 관계가 더 잘 맞습니다.",
    },
    subA: {
      scene: "관계에서 크게 힘든 일은 잘 없는 편인데, 상대의 반응이나 분위기가 조금만 달라져도 그 변화에 민감하게 마음이 움직이기 쉽습니다. 여러 순간의 작은 변화를 이것저것 곱씹다가 정작 방향은 더 흐려지는 경험을 하게 됩니다.",
      conclusion: "이 사람에게는 순간순간의 반응 하나하나에 의미를 두기보다, 조금 떨어져서 전체적으로 지켜보는 쪽이 더 잘 맞습니다.",
    },
    subB: {
      scene: "관계에서 크게 힘든 일은 잘 없는 편인데, 이 관계가 스스로 생각해온 방향과 맞는지를 혼자 자꾸 다시 따져보게 됩니다. 상대의 말 한마디가 그 생각과 다르게 느껴지면 이어가야 할지 되묻는 순간이 옵니다.",
      conclusion: "이 사람에게는 처음부터 정답을 정해두려 하기보다, 관계를 겪으며 생각 자체를 같이 조정해가는 쪽이 더 잘 맞습니다.",
    },
  },
  // 신강 + total中/低 — 관계에서 오는 크고 작은 일을 별다른 동요 없이
  // 받아들이고, 힘든 순간도 비교적 무리 없이 넘기는 유형.
  "여유-무난형": {
    balanced: {
      scene: "관계에서 오는 크고 작은 일들을 별다른 동요 없이 받아들이는 편이라, 이 부분이 유독 반복되는 고민거리로 떠오르지는 않습니다. 힘든 순간이 와도 비교적 무리 없이 넘기는 쪽에 가깝습니다.",
      conclusion: "그래서 이 사람에게는, 서로 각자의 속도를 지키면서도 무리 없이 이어지는 관계가 잘 맞습니다.",
    },
    subA: {
      scene: "관계 안에서 이런저런 일이 생겨도 그때그때 다르게 받아넘기는 편이라, 유독 이 부분이 고민거리로 남지는 않습니다. 상황에 따라 웃어넘기기도 하고 슬쩍 넘어가기도 하면서 큰 동요 없이 지나가는 쪽에 가깝습니다.",
      conclusion: "그래서 이 사람에게는, 매번 같은 방식을 정해두기보다 그때그때 다르게 대응해도 괜찮은 관계가 잘 맞습니다.",
    },
    subB: {
      scene: "관계 안에서 크고 작은 일이 생겨도 한결같은 태도로 받아들이는 편이라, 유독 이 부분이 고민거리로 남지는 않습니다. 상대가 흔들려도 이 사람 쪽에서 먼저 크게 반응하지 않고 묵묵히 지나가는 쪽에 가깝습니다.",
      conclusion: "그래서 이 사람에게는, 한번 정한 태도를 오래 지켜가는 관계가 잘 맞습니다.",
    },
  },
  // 신강 + total高 — 갈등이 생겨도 먼저 나서서 정리하고, 책임질 일이
  // 늘어도 자연스럽게 받아들이는 유형.
  "여유-이끄는형": {
    balanced: {
      scene: "관계 안에서 갈등이 생겨도 먼저 나서서 정리하고, 상대가 흔들릴 때 오히려 이 사람이 중심을 잡아주는 쪽에 서기 쉽습니다. 책임질 일이 늘어나도 크게 버거워하지 않고 자연스럽게 받아들이는 편입니다.",
      conclusion: "그래서 이 사람에게는 그 역할을 짐이 아니라 자기 자리로 받아들이는 관계가 잘 맞습니다.",
    },
    subA: {
      scene: "관계 안에서 여러 가지 일이 한꺼번에 얽혀도, 이 사람이 먼저 나서서 하나씩 정리해 나가는 쪽에 서기 쉽습니다. 상황이 복잡해질수록 오히려 이 사람 쪽이 더 적극적으로 움직이며 판을 정돈하는 역할을 맡게 됩니다.",
      conclusion: "그래서 이 사람에게는, 여러 몫을 한 번에 정리해도 벅차지 않은 만큼 그 역할을 계속 맡게 되는 관계가 잘 맞습니다.",
    },
    subB: {
      scene: "관계 안에서 갈등이 생기면, 이 사람이 평소 지켜온 방식대로 차분히 정리해 나가는 쪽에 서기 쉽습니다. 상대가 흔들려도 이 사람은 늘 하던 대로 꾸준히 중심을 지키는 역할을 맡게 됩니다.",
      conclusion: "그래서 이 사람에게는, 그 꾸준함을 믿고 따라와 주는 관계가 잘 맞습니다.",
    },
  },
  // balance=neutral — 힘을 많이 쓰는 것도 크게 여유로운 것도 아닌 유형.
  균형형: {
    balanced: {
      scene: "이 사람은 관계에서 힘을 많이 쓰는 것도, 크게 여유로운 것도 아닌 쪽입니다. 그때그때 상황에 맞게 나서기도 하고 물러서기도 하면서, 어느 한쪽으로 뚜렷하게 기울지 않는 편입니다.",
      conclusion: "그래서 이 사람에게는, 미리 역할을 정해두기보다 그때그때 자연스럽게 맞춰가는 관계가 잘 맞습니다.",
    },
    subA: {
      scene: "이 사람은 관계에서 힘을 많이 쓰는 것도, 크게 여유로운 것도 아닌 쪽입니다. 상황에 따라 나서는 정도가 매번 달라져서, 어떨 때는 적극적으로 움직이다가도 어떨 때는 한발 물러서는 모습을 보입니다.",
      conclusion: "그래서 이 사람에게는, 매번 같은 역할을 기대하기보다 상황마다 다르게 반응할 여지를 열어두는 관계가 잘 맞습니다.",
    },
    subB: {
      scene: "이 사람은 관계에서 힘을 많이 쓰는 것도, 크게 여유로운 것도 아닌 쪽입니다. 다만 한번 정한 태도는 상황이 바뀌어도 비교적 일관되게 유지하려는 모습을 보입니다.",
      conclusion: "그래서 이 사람에게는, 처음 맞춘 방식을 오래 함께 지켜가는 관계가 잘 맞습니다.",
    },
  },
};

function buildBranchParagraphs(
  branch: BranchKey,
  focus: SubtypeFocus,
  shape: ExposureShape,
  exposure: SpouseStarExposure,
  noteHead: string
): NarrativeParagraph[] {
  const t = BRANCH_TEXT[branch][focus];
  const hiddenClause = hiddenClauseFor(exposure);
  const shapeClause = shapeClauseFor(exposure, shape);
  return [
    { text: `${t.scene}${hiddenClause}${shapeClause}`, sourceNote: `${noteHead}, focus=${focus}, shape=${shape}` },
    { text: t.conclusion, sourceNote: `${branch} 결론(focus=${focus})` },
  ];
}

export function generateLoveRepeatingSceneNarrative(appData: AppData, gender: "male" | "female"): LoveRepeatingSceneNarrativeResult {
  const star = analyzeSpouseStar(appData.user, gender);
  const balanceResult = analyzeDayMasterBalance(appData.user);
  const { exposure, strength } = star;
  const { balance } = balanceResult;
  const tier = totalTierOf(strength.total);
  const focus = subtypeFocusOf(star);
  const shape = exposureShapeOf(star, focus);
  const [subA, subB] = star.subtypes;
  const focusDetail = `subA(${subA.subtype})=${subA.visible.length + subA.rooted.length + subA.hidden.length} vs subB(${subB.subtype})=${subB.visible.length + subB.rooted.length + subB.hidden.length}`;

  // ── 1순위: exposure=미미 → 이 축 자체가 반복의 중심이 아님 ────────
  // (subtype 초점을 나눌 근거 자체가 없는 상태이므로 분리하지 않는다)
  if (exposure === "미미") {
    return {
      paragraphs: [
        {
          text: "이 부분에서는 유독 반복되는 장면이 눈에 띄지 않습니다. 관계 안에서 이 사람을 설명하는 결은 다른 곳에서 더 뚜렷하게 나타납니다.",
          sourceNote: `exposure=미미(비반복형), total=${strength.total}, balance=${balance}`,
        },
      ],
    };
  }

  // ── 2순위: balance=hold(판정 보류) ────────────────────────────────
  // (판정 자체가 "여러 힘이 팽팽하다"는 의미이므로 추가로 쪼개지 않는다)
  if (balance === "hold") {
    return {
      paragraphs: [
        {
          text: `이 사람은 관계 안에서 감당하는 힘을 하나로 딱 잘라 말하기 어려운 상태입니다. 여러 힘이 팽팽하게 맞서 있어, 어떤 관계에서는 여유 있게 이끌다가도 다른 관계에서는 유독 버거워하는 식으로 다르게 나타날 수 있습니다.${hiddenClauseFor(exposure)}`,
          sourceNote: `balance=hold(판정보류형), exposure=${exposure}, total=${strength.total}`,
        },
        {
          text: "그래서 이 부분은 특정한 패턴으로 단정하기보다, 관계마다 다르게 나타나는 그 결 자체를 지켜보는 편이 정확합니다.",
          sourceNote: "판정보류형 결론",
        },
      ],
    };
  }

  // ── 3순위: 신약 계열(clearlyWeak/slightlyWeak) × total tier ───────
  if (isWeak(balance)) {
    const branch: BranchKey = tier === "high" ? "과부하형" : tier === "mid" ? "점증형" : "방향부재형";
    const noteHead = `신약+total${tier === "high" ? "高" : tier === "mid" ? "中" : "低"}(${branch}), balance=${balance}, total=${strength.total}, ${focusDetail}`;
    return { paragraphs: buildBranchParagraphs(branch, focus, shape, exposure, noteHead) };
  }

  // ── 4순위: 신강 계열(clearlyStrong/slightlyStrong) × total tier ──
  if (isStrong(balance)) {
    const branch: BranchKey = tier === "high" ? "여유-이끄는형" : "여유-무난형";
    const noteHead = `신강+total${tier === "high" ? "高" : "中低"}(${branch}), balance=${balance}, total=${strength.total}, ${focusDetail}`;
    return { paragraphs: buildBranchParagraphs(branch, focus, shape, exposure, noteHead) };
  }

  // ── 5순위: neutral(균형) ───────────────────────────────────────
  const noteHead = `balance=neutral(균형형), exposure=${exposure}, total=${strength.total}, ${focusDetail}`;
  return { paragraphs: buildBranchParagraphs("균형형", focus, shape, exposure, noteHead) };
}
