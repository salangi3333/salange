import { AppData } from "./sajuContent";
import { analyzeSpouseStar, SpouseStarExposure, SpouseStarProfile } from "./spouseStarAnalysis";
import { analyzeDayMasterBalance, BalanceVerdict } from "./dayMasterBalanceAnalysis";
import { analyzeRoot } from "./natalStructure";
import { buildChapterThreeKey } from "./chapterThreeInterpretation";

/**
 * 사랑·인연 ④ "사랑에서 자꾸 반복되는 장면" 전용 고객용 서술 레이어.
 *
 * 새 계산을 하지 않는다 — 이미 동결된 함수만 그대로 재호출한다.
 *  - analyzeSpouseStar(user, gender): exposure/strength.total/subtypes만 사용
 *    (배우자성 판정 자체·용신·희신 관계는 ①②에서 이미 쓰므로 여기서는
 *    건드리지 않는다)
 *  - analyzeDayMasterBalance(user): balance(6단계: clearlyStrong~hold)
 *    만 사용(재물5장이 이미 쓰는 것과 동일 함수, 여기서 재해석만 한다)
 *  - buildChapterThreeKey(appData).gwansal(③⑤⑨가 이미 씀)
 *  - analyzeRoot(user).hasRoot(⑤⑨가 이미 씀)
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
 * 2차 보강(승인된 작업, 2026-09) — 유료 평생운명록 본문으로는 짧다는
 * 지적에 따라, 기존 6(balance×total)×3(subtype) 분기 + exposure/shape
 * 보정은 전부 그대로 유지한 채 새 축 2개(gwansal, hasRoot — 둘 다 이미
 * ③⑤⑨가 쓰는 기존 값)를 "역할이 다른 조각"으로 추가했다:
 *  - gwansal → 기준/마음이 단순히 한쪽으로 가는지, 서로 다른 기준 사이에서
 *    조율하는 지점이 있는지(GWANSAL_FOCUS, SCENE_BY_BRANCH_GWANSAL)
 *  - hasRoot → "가까워지는 과정"(행동이 실제로 어떻게 달라지는가,
 *    CLOSENESS_BY_ROOT)과 "예상 밖 상황·갈등에서 기준을 어떻게
 *    정리·회복하는가"(CENTER_HOLD_BY_ROOT)에 각각 다른 역할로 쓴다 —
 *    두 문단이 "바뀐다/안 바뀐다"는 같은 뜻을 반복하지 않도록 역할을
 *    분리했다(행동 변화 vs 회복 과정).
 * 새로 쓴 문단은 branch(6가지, 기존 축) 또는 gwansal/hasRoot(2가지씩)로만
 * 갈라 "72개 고정 템플릿"이 아니라 "역할별 조각의 조합"으로 구성한다.
 *
 * 안전 원칙: "항상/늘/반드시" 같은 확정 어휘 대신 "~하기 쉽습니다/
 * ~쪽에 가깝습니다"로 헤지한다. 실제 연애·이별·외도·결혼 등 계산에
 * 없는 사건은 만들지 않는다. 관계 "안에서의" 행동·반응까지만 다루고
 * 생활사(취업·자기계발 등 관계 밖 사건)는 다루지 않는다.
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

function hiddenClauseFor(exposure: SpouseStarExposure): string {
  if (exposure !== "숨음") return "";
  return "이런 감정을 굳이 말로 확인시키지 않고 넘어가는 편이라, 상대는 별다른 문제가 없다고 여기기 쉽습니다. 그렇게 넘어간 순간들이 쌓이면, 정작 이 사람 안에는 확인받지 못한 마음이 조금씩 남게 됩니다.";
}

type SubtypeFocus = "subA" | "subB" | "balanced";

function subtypeFocusOf(star: SpouseStarProfile): SubtypeFocus {
  const [a, b] = star.subtypes;
  const countA = a.visible.length + a.rooted.length + a.hidden.length;
  const countB = b.visible.length + b.rooted.length + b.hidden.length;
  if (countA > countB) return "subA";
  if (countB > countA) return "subB";
  return "balanced";
}

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

const SHAPE_SCENE_CLAUSE: Record<Exclude<ExposureShape, "none">, string> = {
  visible: "표현이 겉으로 드러난 뒤에는, 상대의 반응이나 거리감을 빠르게 파악하고 그에 맞춰 다음 행동을 조정하는 패턴이 반복되기 쉽습니다.",
  hidden: "이런 모습을 그때그때 말로 짚어주기보다 혼자 삭이고 넘어가는 경우가 많아, 상대는 별일 없었다는 듯 그냥 지나가기 쉽습니다. 그 사이 이 사람 안에는 정리되지 않은 감정이 조금씩 쌓입니다.",
  rooted: "이 마음이 쉽게 사그라들지 않다 보니, 관계가 흔들리는 순간에도 바로 정리하기보다 한 번 더 지켜보고 확인하려는 태도가 반복되기 쉽습니다.",
};

function shapeClauseFor(exposure: SpouseStarExposure, shape: ExposureShape): string {
  if (shape === "none") return "";
  if (exposure === "숨음" && shape === "hidden") return ""; // hiddenClauseFor와 같은 말 중복 방지
  return SHAPE_SCENE_CLAUSE[shape];
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

const WHEN_LET_DOWN_BY_BRANCH: Record<BranchKey, string> = {
  과부하형: "기대했던 대로 흘러가지 않을 때, 이 사람은 상대를 탓하기보다 먼저 '내가 뭘 놓쳤나' 하고 스스로를 돌아보는 쪽에 가깝습니다. 그 반성이 지나치면 정작 상대에게 필요한 말을 못 꺼내고 혼자 끌어안게 됩니다.",
  점증형: "기대했던 대로 흘러가지 않을 때, 처음엔 티를 안 내다가 비슷한 상황이 몇 번 반복되고 나서야 서운함이 조금씩 겉으로 드러나기 시작합니다. 그전까지는 스스로도 괜찮다고 넘기는 경우가 많습니다.",
  방향부재형: "기대했던 대로 흘러가지 않을 때, 이 관계가 맞는 방향인지 자체를 다시 되묻게 됩니다. 서운함보다 '계속 가도 되는 걸까'라는 근본적인 의문이 먼저 올라오는 편입니다.",
  "여유-무난형": "기대했던 대로 흘러가지 않아도 크게 무너지지 않습니다. '이럴 수도 있지' 하고 비교적 빠르게 넘기는 편이라, 상대는 이 사람이 정말 괜찮은 건지 헷갈릴 수 있습니다.",
  "여유-이끄는형": "기대했던 대로 흘러가지 않으면, 실망하기보다 먼저 상황을 다시 정리하고 다음 방향을 잡으려 합니다. 감정을 추스르는 시간보다 대안을 찾는 속도가 더 빠른 편입니다.",
  균형형: "기대했던 대로 흘러가지 않을 때, 그 상황과 자기 마음을 번갈아 살피며 천천히 정리해갑니다. 크게 티 내지도, 완전히 무시하지도 않는 중간 지점에서 반응합니다.",
};

const HOLD_OR_LET_GO_BY_BRANCH: Record<BranchKey, string> = {
  과부하형: "관계를 붙잡을지 놓을지 고민되는 순간에도, 이 사람은 먼저 놓기보다 한 번 더 감당해보려는 쪽을 택하기 쉽습니다. 그러다 스스로 지쳐서야 비로소 거리를 두게 되는 경우가 많습니다.",
  점증형: "관계를 붙잡을지 놓을지는, 쌓여온 조율의 몫이 얼마나 한쪽으로 쏠려 있었는지에 따라 갈립니다. 그 쏠림을 계속 못 느끼면 관계를 이어가고, 뒤늦게 알아차리면 정리를 고민하게 됩니다.",
  방향부재형: "관계를 붙잡을지 놓을지 결정하는 데 시간이 걸리는 편입니다. 확신이 서지 않은 채로 관계를 이어가다가도, 어느 순간 스스로도 놀랄 만큼 담담하게 정리하는 쪽으로 마음이 기울 수 있습니다.",
  "여유-무난형": "관계를 붙잡을지 놓을지는 크게 집착하지 않고 결정하는 편입니다. 미련보다 지금 이 관계가 편안한지를 더 중요하게 보고, 아니라는 판단이 서면 비교적 담담하게 정리합니다.",
  "여유-이끄는형": "관계를 붙잡을지 놓을지는 이 사람이 먼저 주도적으로 결정하는 쪽에 가깝습니다. 애매하게 흘러가도록 두기보다, 이어갈지 정리할지를 스스로 먼저 판단하고 상대에게 전하는 편입니다.",
  균형형: "관계를 붙잡을지 놓을지는 그때그때 상황에 따라 다르게 결정합니다. 정해진 기준이 있다기보다, 그 시점에 느껴지는 것에 맞춰 유연하게 판단하는 쪽입니다.",
};

// ── 초반 반응(branch 6개, ①의 EARLY_BEHAVIOR_BY_BRANCH와 같은 패턴 — subtype까지
// 쪼개지 않는다. 뒤에 나오는 scene의 focus 서술과 역할이 겹치지 않도록 "시작 시점"만 다룬다) ──
const EARLY_BEHAVIOR_BY_BRANCH: Record<BranchKey, string> = {
  과부하형: "이 사람은 관계 초반에는 상대에게 맞추는 것을 힘들어하지 않습니다. 오히려 먼저 나서서 상대의 사정을 살피고, 조금 불편해도 웃으며 넘기는 모습을 보입니다.",
  점증형: "이 사람은 관계 초반에는 별다른 티가 나지 않습니다. 상대에게 맞추는 것도 자연스럽고, 딱히 힘들다는 느낌 없이 무난하게 시작합니다.",
  방향부재형: "이 사람은 관계 초반에는 상대에게 큰 확신 없이도 일단 시작해 보는 편입니다. 맞는지 아닌지는 나중에 겪어보며 판단하려 하지, 처음부터 확신을 갖고 들어가지는 않습니다.",
  "여유-무난형": "이 사람은 관계 초반부터 힘을 들이지 않고 편안하게 시작합니다. 상대에게 맞추는 것도, 자기 방식을 지키는 것도 크게 부담스러워하지 않습니다.",
  "여유-이끄는형": "이 사람은 관계 초반부터 자연스럽게 상황을 이끄는 쪽에 섭니다. 어디서 만날지, 무엇을 할지 먼저 제안하고 정리하는 역할을 스스럼없이 맡습니다.",
  균형형: "이 사람은 관계 초반에는 상대를 관찰하며 천천히 맞춰가는 편입니다. 너무 앞서지도, 너무 물러서지도 않으면서 적당한 거리에서 시작합니다.",
};

// hasRoot를 "가까워지는 과정"(행동이 실제로 어떻게 달라지는가)과 "자기중심 유지"
// (예상 밖 상황·갈등에서 기준을 어떻게 정리·회복하는가)에 각각 다른 역할로 쓴다.
// 여기(가까워지는 과정)는 "관계가 깊어질수록 행동 자체가 어떻게 바뀌는가"만 다룬다
// (지속성·회복력 판단은 아래 CENTER_HOLD_BY_ROOT의 몫으로 넘긴다).
const CLOSENESS_BY_ROOT: Record<"있음" | "없음", string> = {
  있음: "관계가 가까워질수록 오히려 더 편하게 자기 방식대로 행동하게 됩니다. 초반에는 상대를 의식해서 조심하던 부분도, 가까워진 뒤에는 애써 꾸미지 않고 자연스럽게 드러내는 쪽으로 바뀝니다.",
  없음: "관계가 가까워질수록 행동의 결이 상황에 따라 달라지기 시작합니다. 처음에 보였던 모습과 달리, 상대나 그날의 분위기에 맞춰 대응 방식이 그때그때 다르게 나타날 수 있습니다.",
};

// ── 기준/마음이 어떻게 움직이는지(gwansal 2가지) ──
const GWANSAL_FOCUS: Record<"있음" | "없음", string> = {
  있음: "이 사람 안에는 원래 서로 다른 두 가지 기준이 함께 있어서, 관계 안에서도 마음이 한쪽으로만 단순하게 흘러가지 않습니다. 상황에 따라 이 기준과 저 기준 사이에서 저울질하며 조율하는 지점이 자주 생깁니다.",
  없음: "이 사람은 관계 안에서 기준이 비교적 단순한 편이라, 여러 생각 사이에서 오래 갈등하기보다 한 가지 방향으로 마음이 정리되는 쪽에 가깝습니다.",
};

// ── 생활 예시(branch 6 × gwansal 2 = 12) — 계산이 허용하는 범위의 관계 "안에서" 반응만,
// 사건(이별/바람 등)은 만들지 않는다. gwansal=있음은 "두 마음이 함께 올라오는" 구도로, 없음은
// 한 방향으로 정리되는 구도로 — 같은 branch라도 실제 장면의 결이 달라진다. ──
const SCENE_BY_BRANCH_GWANSAL: Record<BranchKey, Record<"있음" | "없음", string>> = {
  과부하형: {
    있음: "예를 들어 처음 한두 번은 상대의 사정을 먼저 생각하며 넘어갈 수 있습니다. 하지만 약속이나 연락 방식처럼 서로 정해 둔 방식이 자꾸 달라지면, 그때부터는 '상대에게 사정이 있었겠지'라는 생각과 '그런데 왜 계속 내가 맞추고 있지?'라는 마음이 함께 올라올 수 있습니다.",
    없음: "예를 들어 상대의 사정으로 약속이나 연락 방식이 자꾸 달라져도, 굳이 여러 이유를 따지기보다 '그럴 수도 있지' 하고 한 방향으로 넘기는 경우가 많습니다. 다만 그런 순간이 쌓이다 보면 넘기는 것 자체가 점점 버거워질 수 있습니다.",
  },
  점증형: {
    있음: "예를 들어 약속을 조율하는 역할을 은근히 맡아 오다가도, '이 정도는 내가 맞추는 게 맞다'는 생각과 '그런데 이것도 매번 내 몫이네'라는 생각이 동시에 들 때가 있습니다. 그 두 마음 사이에서 정리가 안 된 채 시간만 흘러가기 쉽습니다.",
    없음: "예를 들어 약속을 조율하는 역할을 은근히 맡아 오다가, 어느 순간 '이건 나만 계속 챙기고 있는 것 같다'는 생각이 뚜렷하게 들면 그때부터는 비교적 분명하게 거리를 두거나 이야기를 꺼내는 쪽으로 마음이 정리됩니다.",
  },
  방향부재형: {
    있음: "예를 들어 상대의 사소한 말 한마디에 마음이 흔들릴 때, '내가 예민한 건가' 싶으면서도 동시에 '아니, 이건 짚고 넘어가야 하는 부분 아닌가' 하는 생각이 함께 듭니다. 두 생각 사이에서 정작 결론은 더 늦어지기 쉽습니다.",
    없음: "예를 들어 상대의 사소한 말 한마디에 마음이 흔들려도, 며칠 지나고 나면 '그냥 그런 뜻은 아니었겠지' 하고 비교적 단순하게 정리하며 넘어가는 쪽입니다.",
  },
  "여유-무난형": {
    있음: "예를 들어 약속이 갑자기 바뀌어도 크게 내색하지 않지만, 속으로는 '그럴 수도 있지'라는 마음과 '그래도 미리 말해줬으면' 하는 마음이 동시에 있을 수 있습니다. 겉으로는 무난하게 넘어가도 그 안에서는 두 마음이 함께 움직입니다.",
    없음: "예를 들어 약속이 갑자기 바뀌어도 크게 내색하지 않고, '그럴 수도 있지' 하며 비교적 단순하게 넘기는 편입니다. 굳이 여러 생각을 쌓아두지 않고 그 자리에서 정리하고 지나갑니다.",
  },
  "여유-이끄는형": {
    있음: "예를 들어 계획이 틀어지면 먼저 나서서 다음 방향을 정리하면서도, 마음 한쪽에서는 '내가 원하는 방식'과 '지금 상황에 맞는 방식' 사이에서 잠깐씩 저울질하게 됩니다. 다만 겉으로는 그 흔들림이 잘 드러나지 않습니다.",
    없음: "예를 들어 계획이 틀어지면 크게 망설이지 않고 곧바로 다음 방향을 정리해서 상대에게 제안하는 쪽입니다. 여러 갈래로 고민하기보다 한 가지 방향을 빠르게 정하고 움직입니다.",
  },
  균형형: {
    있음: "예를 들어 의견이 갈리는 순간, 상대 입장을 이해하려는 마음과 자기 생각을 지키려는 마음이 동시에 움직여서 바로 결론을 내리지 못하고 한 박자 멈추게 됩니다. 그 사이에서 무엇을 먼저 말할지 스스로도 정리가 필요한 순간이 반복됩니다.",
    없음: "예를 들어 의견이 갈리는 순간에도 여러 생각 사이에서 오래 머무르기보다, 그 상황에 맞는 쪽으로 비교적 담담하게 마음을 정하고 넘어가는 편입니다.",
  },
};

// 여기는 "예상 밖 상황·갈등이 생겼을 때 생각과 기준을 어떻게 정리·회복하는가"라는
// 회복 과정 자체만 다룬다("바뀐다/안 바뀐다"는 위 CLOSENESS_BY_ROOT의 몫이라 여기서 다시
// 말하지 않는다) — 기준을 다시 세우는 데 걸리는 시간과 그 과정에서 누구의 도움이 필요한지로 갈린다.
const CENTER_HOLD_BY_ROOT: Record<"있음" | "없음", string> = {
  있음: "예상하지 못한 상황이 생기거나 갈등이 일어나도, 이 사람은 자기만의 기준으로 돌아와 생각을 정리하는 과정을 거칩니다. 당장은 복잡해도 시간을 들여 스스로 납득할 지점을 찾고, 그 지점을 찾고 나면 다시 평소의 태도로 돌아옵니다.",
  없음: "예상하지 못한 상황이 생기거나 갈등이 일어나면, 스스로 기준을 다시 세우는 데 시간이 걸리는 편입니다. 혼자 정리할 여유가 없으면 그 혼란이 다음 상황에까지 이어지기 쉽고, 곁에서 함께 정리해 줄 사람이 있을 때 더 빨리 제자리를 찾습니다.",
};

// ── 이 성향의 장점(branch 6개) ──
const STRENGTH_BY_BRANCH: Record<BranchKey, string> = {
  과부하형: "이런 성향에는 분명한 장점도 있습니다. 상대의 입장에서 먼저 생각하고 필요한 것을 미리 챙기는 배려는, 관계를 편안하고 안정적으로 만드는 힘이 됩니다.",
  점증형: "이런 성향의 장점은, 관계에서 필요한 크고 작은 일들을 놓치지 않고 알아서 챙긴다는 데 있습니다. 상대는 특별히 신경 쓰지 않아도 관계가 매끄럽게 굴러가는 편안함을 느낄 수 있습니다.",
  방향부재형: "이런 성향의 장점은, 섣불리 단정 짓지 않고 상대와 관계를 천천히 알아가려 한다는 데 있습니다. 빠른 확신보다 신중한 판단을 앞세우는 만큼, 관계를 급하게 몰아가지 않습니다.",
  "여유-무난형": "이런 성향의 장점은, 웬만한 일에 크게 흔들리지 않고 관계를 안정적으로 지켜간다는 데 있습니다. 상대 입장에서는 함께 있을 때 마음이 편안해지는 사람으로 느껴지기 쉽습니다.",
  "여유-이끄는형": "이런 성향의 장점은, 관계가 흔들릴 때 오히려 중심을 잡고 상황을 정리해 준다는 데 있습니다. 상대는 이 사람 곁에서 안정감을 느끼는 경우가 많습니다.",
  균형형: "이런 성향의 장점은, 어느 한쪽으로 치우치지 않고 상황에 맞게 유연하게 움직인다는 데 있습니다. 관계 안에서 균형 잡힌 태도를 보여주는 사람으로 느껴지기 쉽습니다.",
};

function splitSceneToCoreWhy(scene: string): { core: string; why: string } {
  const idx = scene.indexOf("다. ");
  if (idx === -1) return { core: scene.trim(), why: "" };
  return { core: scene.slice(0, idx + 2).trim(), why: scene.slice(idx + 3).trim() };
}

export function generateLoveRepeatingSceneNarrative(appData: AppData, gender: "male" | "female"): LoveRepeatingSceneNarrativeResult {
  const star = analyzeSpouseStar(appData.user, gender);
  const balanceResult = analyzeDayMasterBalance(appData.user);
  const { exposure, strength } = star;
  const { balance } = balanceResult;
  const gwansal = buildChapterThreeKey(appData).gwansal.present;
  const hasRoot = analyzeRoot(appData.user).hasRoot;
  const gwansalKey: "있음" | "없음" = gwansal ? "있음" : "없음";
  const rootKey: "있음" | "없음" = hasRoot ? "있음" : "없음";

  // ── 1순위: exposure=미미 → 이 축 자체가 반복의 중심이 아님 ────────
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
  if (balance === "hold") {
    return {
      paragraphs: [
        {
          text: `이 사람에게 실제로 반복되는 장면이 무엇인지는, 지금 명식만으로 하나로 짚어내기 어렵습니다. 여러 힘이 비슷한 크기로 맞서 있다 보니, 같은 관계 안에서도 이끄는 모습과 버거워하는 모습이 번갈아 나타날 수 있습니다.${exposure === "숨음" ? " " + hiddenClauseFor(exposure) : ""}`,
          sourceNote: `balance=hold(판정보류형), exposure=${exposure}, total=${strength.total}`,
        },
        {
          text: "그래서 이 부분은 하나의 장면으로 단정하기보다, 실제 관계에서 어떤 장면이 반복되는지를 그때그때 확인해가는 편이 정확합니다.",
          sourceNote: "판정보류형 결론",
        },
      ],
    };
  }

  const tier = totalTierOf(strength.total);
  const focus = subtypeFocusOf(star);
  const shape = exposureShapeOf(star, focus);
  const [subA, subB] = star.subtypes;
  const focusDetail = `subA(${subA.subtype})=${subA.visible.length + subA.rooted.length + subA.hidden.length} vs subB(${subB.subtype})=${subB.visible.length + subB.rooted.length + subB.hidden.length}`;

  let branch: BranchKey;
  if (isWeak(balance)) branch = tier === "high" ? "과부하형" : tier === "mid" ? "점증형" : "방향부재형";
  else if (isStrong(balance)) branch = tier === "high" ? "여유-이끄는형" : "여유-무난형";
  else branch = "균형형";

  const t = BRANCH_TEXT[branch][focus];
  const { core, why } = splitSceneToCoreWhy(t.scene);
  const hidden = hiddenClauseFor(exposure);
  const shapeC = shapeClauseFor(exposure, shape);
  const howParts = [hidden, shapeC].filter(Boolean);
  const how = howParts.length ? howParts.join(" ") : "";
  const noteHead = `gwansal=${gwansal}, hasRoot=${hasRoot}, balance=${balance}(${branch}), total=${strength.total}, ${focusDetail}`;

  const paras: NarrativeParagraph[] = [
    { text: EARLY_BEHAVIOR_BY_BRANCH[branch], sourceNote: `초반반응(${branch})` },
    { text: core, sourceNote: `결론(${branch}:${focus})` },
  ];
  if (why) paras.push({ text: why, sourceNote: `이유(${branch}:${focus})` });
  if (how) paras.push({ text: how, sourceNote: `실제모습(exposure=${exposure}, shape=${shape})` });
  paras.push({ text: CLOSENESS_BY_ROOT[rootKey], sourceNote: `가까워지면(hasRoot=${hasRoot})` });
  paras.push({ text: GWANSAL_FOCUS[gwansalKey], sourceNote: `기준/마음(gwansal=${gwansal})` });
  paras.push({ text: WHEN_LET_DOWN_BY_BRANCH[branch], sourceNote: `예상과다를때(branch=${branch})` });
  paras.push({ text: SCENE_BY_BRANCH_GWANSAL[branch][gwansalKey], sourceNote: `생활예시(branch=${branch}, gwansal=${gwansal})` });
  paras.push({ text: CENTER_HOLD_BY_ROOT[rootKey], sourceNote: `자기중심유지(hasRoot=${hasRoot})` });
  paras.push({ text: STRENGTH_BY_BRANCH[branch], sourceNote: `장점(${branch})` });
  paras.push({ text: HOLD_OR_LET_GO_BY_BRANCH[branch], sourceNote: `힘든부분(branch=${branch})` });
  paras.push({ text: t.conclusion, sourceNote: `맞는관계방식(${branch}:${focus}), ${noteHead}` });

  return { paragraphs: paras };
}
