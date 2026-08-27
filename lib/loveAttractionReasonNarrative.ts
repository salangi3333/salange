import { AppData } from "./sajuContent";
import { analyzeSpouseStar } from "./spouseStarAnalysis";

/**
 * 사랑·인연 ② "이상하게 마음이 가는 사람에는 이유가 있다" 전용 고객용
 * 서술 레이어.
 *
 * 핵심 질문: 왜 나는 어떤 사람에게 유독 마음이 가는가 — 관계 안에서
 * 어떤 종류의 편안함·끌림·긴장·확신을 느끼기 쉬운가. ①("다가가는
 * 방식")·③("관계 안에서 반복되는 장면")과는 다른 질문이므로 그 두
 * 챕터의 어휘·장면을 이 파일에서 쓰지 않는다.
 *
 * 새 계산을 하지 않는다 — analyzeSpouseStar가 이미 조립해 둔
 * star.yongsinRelation/star.huisinRelation(둘 다 analyzeYongsinCandidate/
 * analyzeHuisinCandidate를 그대로 감싼 값)만 재사용한다. 이 파일에서
 * 사용하는 필드는 정확히 다음뿐이다: yongsinRelation.outcome/isWinner/
 * candidateDetail(존재 여부·evidenceKinds.length·warnings만),
 * huisinRelation.isMatch/matchedCandidate(hardBlocked·warnings만).
 * candidateDetail/matchedCandidate의 다른 세부 필드(incoming/outgoing/
 * rootPosition 등 명리 용어)는 고객 문장을 만드는 데 쓰지 않는다 —
 * 새로운 상대 특징을 창작하는 근거가 아니라 "이미 존재가 확인된
 * 후보인지·그 근거가 몇 가지였는지"만 판정/표현 선택에 쓴다.
 * evidenceKinds.length(3~5, ①③이 쓰는 exposure/subtype/visible-rooted-
 * hidden과 완전히 다른 계산 경로 — yongsin 결정 트리 내부의 근거
 * 개수)는 경쟁밀림형 안에서만, outcome(single/multiple)은 후보아님형
 * 안에서만 표현 다양화에 쓴다. 둘 다 판정(6개 분기) 자체는 바꾸지
 * 않는다 — 이미 정해진 분기 안에서 장면·결론의 "결"만 달라진다.
 *
 * 1차 분기(핵심 판정): 아래 우선순위로 정확히 6가지 중 하나로만 갈린다.
 *  1) outcome==="hold" → 판정보류형 — 이 축 자체가 지금 어느 쪽으로도
 *     뚜렷하게 안 잡히는 상태.
 *  2) isWinner && isMatch → 이중일치형 — 배우자성이 용신이면서 동시에
 *     다른 공동 용신의 희신도 됨(희귀 이중 근거).
 *  3) isWinner → 채워지는형 — 배우자성 자체가 용신(나에게 필요한 힘).
 *  4) isMatch → 방향지지형 — 배우자성이 희신(내가 원하는 방향을 뒤에서
 *     밀어주는 힘).
 *  5) candidateDetail !== null(신강 후보군에는 있었으나 경쟁에서 밀림)
 *     → 경쟁밀림형.
 *  6) candidateDetail === null(신약이라 애초에 이 축이 후보 자격 자체가
 *     없음) → 후보아님형.
 * 이 순서 자체가 판정이며 수정하지 않는다.
 *
 * 2차 조정(판정은 그대로, 문장의 확신도만 낮춤): candidateDetail.warnings
 * 또는 matchedCandidate.warnings/hardBlocked가 있으면(상대 과다 등으로
 * 이 신호가 완전히 매끈하지 않다는 이미 계산된 사실) 장면 뒤에 헤지
 * 절을 붙인다. outcome==="unresolved"(용신 3후보 다 안 갈린 참고용
 * 상태)도 같은 방식으로 확신도를 낮춘다. 새 분기를 만들지 않는다 —
 * 랜덤 없음, 같은 입력이면 항상 같은 출력.
 *
 * 안전 원칙: "운명적/반드시" 같은 확정 어휘 금지. 외모·직업·MBTI·
 * 구체적 나이·실제 연애/결혼 사건·특정 상대 성격을 만들지 않는다.
 * 명리 용어(용신/희신/재성/관성 등)는 고객 문장에 노출하지 않고 내부
 * sourceNote에만 남긴다. "무게/기준/편안함/흐름/두드러지지 않는다"
 * 같은 반복 추상어도 쓰지 않는다.
 */

export interface NarrativeParagraph {
  text: string;
  /** 고객에게 노출하지 않는 내부 검수용 근거. */
  sourceNote: string;
}

export interface LoveAttractionReasonNarrativeResult {
  paragraphs: NarrativeParagraph[];
}

type Branch = "판정보류형" | "이중일치형" | "채워지는형" | "방향지지형" | "경쟁밀림형" | "후보아님형";

interface BranchText {
  scene: string;
  conclusion: string;
}

const BRANCH_TEXT: Record<Exclude<Branch, "경쟁밀림형" | "후보아님형">, BranchText> = {
  판정보류형: {
    scene: "이 사람은 어떤 상대에게 끌리는 이유를 한 가지로 딱 잘라 말하기 어려운 편입니다. 그때그때 다른 지점이 마음을 움직이는 것처럼 느껴질 수 있습니다.",
    conclusion: "그래서 이 사람에게는, 끌리는 이유를 억지로 하나로 정하기보다 그때그때 느껴지는 감각을 있는 그대로 존중해 주는 관계가 잘 맞습니다.",
  },
  이중일치형: {
    scene: "이 사람은 어떤 상대에게 끌리는 이유가 한 가지가 아니라 여러 갈래로 동시에 겹치는 경우가 있습니다. 그 상대 앞에서는 여러 감정이 같은 방향으로 겹쳐서 움직이기 쉽습니다.",
    conclusion: "그래서 이 사람에게는, 이유가 여러 겹으로 겹친다는 것 자체를 신호가 그만큼 뚜렷하다는 뜻으로 받아들여도 되는 관계가 잘 맞습니다.",
  },
  채워지는형: {
    scene: "이 사람은 특정 상대 앞에서 유독 편안해지고 자기다워지는 느낌을 받기 쉽습니다. 평소라면 잘 채워지지 않던 부분이 그 상대와 있을 때 자연스럽게 채워지는 감각에 가깝습니다.",
    conclusion: "그래서 이 사람에게는, 그 감각을 근거 없는 기분이 아니라 진짜 신호로 받아들여도 되는 관계가 잘 맞습니다.",
  },
  방향지지형: {
    scene: "이 사람은 어떤 상대와 있을 때, 그 상대가 특별히 뭔가를 해줘서라기보다 그냥 곁에 있는 것만으로 자연스럽게 힘을 얻는 경우가 있습니다. 그 상대가 정답이라기보다, 원하는 방향으로 자연스럽게 밀어주는 역할을 하기 쉽습니다.",
    conclusion: "그래서 이 사람에게는, 상대 자체보다 그 관계가 만들어 주는 방향을 신뢰하는 관계가 잘 맞습니다.",
  },
};

/**
 * 경쟁밀림형 전용 — evidenceKinds.length(신강 후보군 안에서 이 카테고리를
 * 뒷받침하던 근거 개수: 노출/뿌리/투간/incoming/outgoing 중 몇 개
 * 확인됐는지)가 높을수록 "거의 이겼는데 아깝게 밀림", 낮을수록
 * "애초에 힘이 약해서 밀림"이라는 실제로 다른 정도다. 새 강도 공식이
 * 아니라 이미 계산된 배열 길이를 3단계로 나눈 것뿐이다.
 */
type EvidenceTier = "high" | "mid" | "low";
function evidenceTierOf(count: number): EvidenceTier {
  if (count >= 5) return "high";
  if (count === 4) return "mid";
  return "low";
}
const COMPETED_LOSS_TEXT: Record<EvidenceTier, BranchText> = {
  high: {
    scene: "이 사람에게 마음이 가는 이유 중에는 이 부분도 꽤 여러모로 근거가 있는 편이지만, 결국 다른 쪽에 최종 자리를 내주는 경우가 많습니다. 이 힘도 분명 한몫하지만, 마지막 결정타는 다른 데서 나옵니다.",
    conclusion: "그래서 이 사람에게는, 이 부분이 나름 탄탄했다는 것까지 함께 알아봐 주는 관계가 더 잘 맞습니다.",
  },
  mid: {
    scene: "이 사람에게 마음이 가는 이유는, 이 부분도 어느 정도 힘을 갖고 있지만 다른 쪽이 조금 더 앞서면서 결정적인 이유까지는 되지 못하는 편입니다.",
    conclusion: "그래서 이 사람에게는, 이 부분이 결정적이지 않다는 걸 이해하고 다른 이유를 함께 찾아가는 관계가 잘 맞습니다.",
  },
  low: {
    scene: "이 사람에게 마음이 가는 이유는, 이 부분 하나로 설명되기보다 다른 쪽이 더 크게 작용하는 편입니다. 이 힘 자체가 크지 않아서, 마음이 가는 이유를 설명할 때 자연스럽게 뒷전으로 밀리는 경우가 많습니다.",
    conclusion: "그래서 이 사람에게는, 끌림의 결정적인 이유를 이 부분보다 다른 부분에서 먼저 확인해 보는 쪽이 더 정확합니다.",
  },
};

/**
 * 후보아님형 전용 — outcome이 single(용신 하나로 확정)인지 multiple(둘이
 * 팽팽히 남음)인지. 신약 쪽에서 실제로 필요한 힘 자체가 하나로 좁혀지는지
 * 아닌지의 차이이며, 이미 계산된 outcome 값을 그대로 재사용한다.
 */
const NOT_CANDIDATE_TEXT: Record<"single" | "multiple", BranchText> = {
  single: {
    scene: "이 사람은 하나의 강한 이유보다, 여러 조건이 골고루 맞을 때 비로소 마음이 열리는 편입니다. 특정한 무언가 하나가 확 끌어당기는 식으로 설명되는 타입은 아닙니다.",
    conclusion: "그래서 이 사람에게는, 처음부터 강하게 끌리길 기대하기보다 천천히 여러 조건이 맞아가는 관계가 잘 맞습니다.",
  },
  multiple: {
    scene: "이 사람은 하나의 강한 이유보다, 여러 조건이 골고루 맞을 때 비로소 마음이 열리는 편입니다. 지금은 이 사람에게 필요한 힘 자체도 한 가지로 좁혀지지 않은 상태라, 그만큼 이 부분에서 뚜렷한 끌림을 기대하기는 더 어렵습니다.",
    conclusion: "그래서 이 사람에게는, 하나의 확실한 이유를 찾기보다 여러 조건이 천천히 맞아가는 과정 자체를 지켜보는 관계가 잘 맞습니다.",
  },
};

const SOFTEN_CONFIDENCE_CLAUSE = " 다만 이 감각이 항상 한결같이 확신으로 이어지는 것은 아니어서, 잠깐씩 흔들리는 순간이 섞일 수 있습니다.";
const SOFTEN_SUPPORT_CLAUSE = " 다만 그 힘이 온전히 다 발휘되지 못하고 있을 수 있어, 그 영향이 매번 또렷하게 느껴지지는 않을 수 있습니다.";

export function generateLoveAttractionReasonNarrative(appData: AppData, gender: "male" | "female"): LoveAttractionReasonNarrativeResult {
  const star = analyzeSpouseStar(appData.user, gender);
  const { yongsinRelation: y, huisinRelation: h } = star;

  let branch: Branch;
  if (y.outcome === "hold") branch = "판정보류형";
  else if (y.isWinner && h.isMatch) branch = "이중일치형";
  else if (y.isWinner) branch = "채워지는형";
  else if (h.isMatch) branch = "방향지지형";
  else if (y.candidateDetail !== null) branch = "경쟁밀림형";
  else branch = "후보아님형";

  let softenClause = "";
  let softenNote = "없음";
  if (branch === "채워지는형" || branch === "이중일치형") {
    const hasWarning = (y.candidateDetail?.warnings.length ?? 0) > 0;
    const unresolved = y.outcome === "unresolved";
    if (hasWarning || unresolved) {
      softenClause = SOFTEN_CONFIDENCE_CLAUSE;
      softenNote = hasWarning ? "yongsinWarning" : "outcome=unresolved";
    }
  } else if (branch === "방향지지형") {
    const hardBlocked = h.matchedCandidate?.hardBlocked ?? false;
    const hasWarning = (h.matchedCandidate?.warnings.length ?? 0) > 0;
    if (hardBlocked || hasWarning) {
      softenClause = SOFTEN_SUPPORT_CLAUSE;
      softenNote = hardBlocked ? "huisinHardBlocked" : "huisinWarning";
    }
  }

  let t: BranchText;
  let variantNote = "-";
  if (branch === "경쟁밀림형") {
    const tier = evidenceTierOf(y.candidateDetail?.evidenceKinds.length ?? 0);
    t = COMPETED_LOSS_TEXT[tier];
    variantNote = `evidenceTier=${tier}`;
  } else if (branch === "후보아님형") {
    const key = y.outcome === "multiple" ? "multiple" : "single";
    t = NOT_CANDIDATE_TEXT[key];
    variantNote = `outcome=${key}`;
  } else {
    t = BRANCH_TEXT[branch];
  }
  const noteHead = `outcome=${y.outcome}, isWinner=${y.isWinner}, isMatch=${h.isMatch}, candidateExists=${y.candidateDetail !== null}(${branch}), variant=${variantNote}, soften=${softenNote}`;

  return {
    paragraphs: [
      { text: `${t.scene}${softenClause}`, sourceNote: noteHead },
      { text: t.conclusion, sourceNote: `${branch} 결론` },
    ],
  };
}
