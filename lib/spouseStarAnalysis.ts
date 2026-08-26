import { SajuUser } from "@/types";
import { computeSipseong } from "./aiLifeReport";
import { analyzeWealthCategoryStrength, WealthStrengthResult } from "./wealthStrengthAnalysis";
import { CategoryStrength } from "./strengthAnalysis";
import { Stage } from "./natalStructure";
import { analyzeYongsinCandidate, YongsinCandidateDetail, YongsinOutcome } from "./yongsinCandidateAnalysis";
import { analyzeHuisinCandidate, HuisinCandidate, HuisinNotApplicableReason } from "./huisinCandidateAnalysis";

/**
 * 사랑·인연 1단계 — 배우자성 판정/프로필 CALCULATION 레이어.
 *
 * 새 명리 계산을 만들지 않는다. gender→배우자성 카테고리 매핑(남성=재성,
 * 여성=관성, 전통 명리 표준)만 새로 정의하고, 나머지는 전부 이미 검증된
 * 함수를 그대로 재사용한다:
 *
 *  - 강약/위치/투간/통근: wealthStrengthAnalysis.ts의 analyzeWealthCategoryStrength.
 *    이름은 "Wealth"지만 실제로는 5개 카테고리 전부에 대해 범용이고
 *    일지(day)까지 포함해서 계산한다 — 4장이 재성에 이미 쓰고 있는 것과
 *    완전히 같은 함수를 그대로 가져다 쓴다. 이 파일에서 수정하지 않는다.
 *  - 정재/편재(또는 정관/편관) 개별 라벨: chapterFourInterpretation.ts의
 *    buildEvidencePositions와 같은 패턴이다(그 함수는 비공개라 가져올 수
 *    없어 같은 방식으로 다시 구성했다) — user.pillars[stage].sipseong
 *    (겉으로 드러난 정확한 십성 라벨)과 computeSipseong(지장간 라벨)은
 *    전부 이미 존재하는 값이다. 새 십성 판정 공식이 아니다.
 *  - 용신/희신 해당 여부: analyzeYongsinCandidate/analyzeHuisinCandidate를
 *    그대로 호출해 winners/pairs와 카테고리를 비교한다. boolean만 반환하지
 *    않고 원본 evidence(YongsinCandidateDetail/HuisinCandidate)를 함께
 *    보존해, 이후 서술 단계에서 근거를 다시 확인할 수 있게 한다.
 *
 * chapterFourInterpretation.ts / wealthStrengthAnalysis.ts /
 * yongsinCandidateAnalysis.ts / huisinCandidateAnalysis.ts 등 기존 파일은
 * 이 파일에서 전혀 수정하지 않는다(import해서 읽기만 한다).
 *
 * 이 파일은 등급화·심리 문장·사건 확정을 전혀 하지 않는다 — 순수 계산
 * 결과만 반환한다.
 */

export type SpouseStarCategory = "재성" | "관성";
export type SpouseStarSubtype = "편재" | "정재" | "편관" | "정관";
export type SpouseStarExposure = "뚜렷" | "숨음" | "미미";

const SUBTYPES_OF: Record<SpouseStarCategory, [SpouseStarSubtype, SpouseStarSubtype]> = {
  재성: ["편재", "정재"],
  관성: ["편관", "정관"],
};

/** 전통 명리 표준 — 남성=재성(아내를 뜻하는 축), 여성=관성(남편을 뜻하는
 * 축). 새 규칙이 아니라 기존 명리 상식을 코드로 옮긴 것뿐이다. */
export function determineSpouseStarCategory(gender: "male" | "female"): SpouseStarCategory {
  return gender === "male" ? "재성" : "관성";
}

export interface SpouseStarPositionHit {
  stage: Stage;
  slot: "천간" | "지지" | "지장간";
  subtype: SpouseStarSubtype;
  hidePosition?: "본기" | "중기" | "여기";
  tou?: boolean;
}

/** 같은 subtype(예: 편재) 안에서도 드러난 정도가 다르다 — 겉으로 드러난
 * 것(visible)과 지장간에만 있는 것을 같은 강도로 섞지 않는다. 지장간
 * 안에서도 투간(tou=true, 실제로 천간에 드러나 힘을 발휘)된 것과 그렇지
 * 않은 것을 다시 나눈다:
 *  - visible: 천간/지지에 직접 그 십성이 있음
 *  - rooted : 지장간에 있고 투간됨(실질적으로 작동하는 뿌리)
 *  - hidden : 지장간에만 있고 투간 안 됨(가장 약한 형태)
 * 셋 다 이미 계산되어 있는 rootHits(tou 필드 포함)를 재분류한 것뿐,
 * 새 강도 공식이 아니다. */
export interface SpouseStarSubtypeBreakdown {
  subtype: SpouseStarSubtype;
  visible: SpouseStarPositionHit[];
  rooted: SpouseStarPositionHit[];
  hidden: SpouseStarPositionHit[];
}

function buildSubtypeBreakdown(
  user: SajuUser,
  subtype: SpouseStarSubtype,
  targetCategory: SpouseStarCategory,
  wealth: WealthStrengthResult,
  dayGan: string
): SpouseStarSubtypeBreakdown {
  const visible: SpouseStarPositionHit[] = [];
  (["year", "month", "day", "hour"] as Stage[]).forEach((stage) => {
    const gan = user.pillars[stage];
    const zhi = user.pillars.branches[stage];
    if (gan && gan.sipseong === subtype) visible.push({ stage, slot: "천간", subtype });
    if (zhi && zhi.sipseong === subtype) visible.push({ stage, slot: "지지", subtype });
  });

  const rooted: SpouseStarPositionHit[] = [];
  const hidden: SpouseStarPositionHit[] = [];
  wealth.byCategory[targetCategory].rootHits.forEach((hit) => {
    const label = computeSipseong(dayGan, hit.hiddenGan);
    if (label !== subtype) return;
    const entry: SpouseStarPositionHit = {
      stage: hit.stage,
      slot: "지장간",
      subtype,
      hidePosition: hit.position,
      tou: hit.tou,
    };
    if (hit.tou) rooted.push(entry);
    else hidden.push(entry);
  });

  return { subtype, visible, rooted, hidden };
}

/** boolean만 반환하지 않는다 — outcome/candidateDetail을 그대로 보존해
 * 서술 단계에서 "왜 용신이 아닌지/왜 보류인지" 같은 원래 근거를 다시
 * 확인할 수 있게 한다. */
export interface SpouseStarYongsinRelation {
  applicable: boolean;
  outcome: YongsinOutcome;
  isWinner: boolean;
  /** winners에 들었는지와 무관하게, 이 카테고리의 원본 후보 평가(경고·
   * incoming·outgoing·뿌리·투간 등)를 그대로 보존한다 — 애초에 후보군에
   * 없었으면(예: applicable=false) null. */
  candidateDetail: YongsinCandidateDetail | null;
}

export interface SpouseStarHuisinRelation {
  applicable: boolean;
  notApplicableReason?: HuisinNotApplicableReason;
  isMatch: boolean;
  /** 일치하는 희신 페어의 원본 evidence(hardBlocked·manifestation·
   * supportTowardYongsin 등)를 그대로 보존한다 — 없으면 null. */
  matchedCandidate: HuisinCandidate | null;
}

export interface SpouseStarProfile {
  gender: "male" | "female";
  targetCategory: SpouseStarCategory;
  /** analyzeWealthCategoryStrength(user).byCategory[targetCategory] 그대로. */
  strength: CategoryStrength;
  exposure: SpouseStarExposure;
  /** 일지(배우자궁) 자체가 배우자성 카테고리인지 — 4장의 겉 위치 계산과
   * 동일한 값(visiblePositions에 "day"가 포함되는지)을 그대로 쓴 것. */
  isDayBranch: boolean;
  /** [편재,정재] 또는 [편관,정관] 순서 고정, 각각의 visible/rooted/hidden. */
  subtypes: [SpouseStarSubtypeBreakdown, SpouseStarSubtypeBreakdown];
  yongsinRelation: SpouseStarYongsinRelation;
  huisinRelation: SpouseStarHuisinRelation;
}

export function analyzeSpouseStar(user: SajuUser, gender: "male" | "female"): SpouseStarProfile {
  const dayGan = user.pillars.day.hanja;
  const targetCategory = determineSpouseStarCategory(gender);
  const wealth = analyzeWealthCategoryStrength(user);
  const strength = wealth.byCategory[targetCategory];
  const exposure: SpouseStarExposure = strength.count > 0 ? "뚜렷" : strength.rootScore > 0 ? "숨음" : "미미";
  const isDayBranch = wealth.visiblePositions[targetCategory].includes("day");

  const [subA, subB] = SUBTYPES_OF[targetCategory];
  const subtypes: [SpouseStarSubtypeBreakdown, SpouseStarSubtypeBreakdown] = [
    buildSubtypeBreakdown(user, subA, targetCategory, wealth, dayGan),
    buildSubtypeBreakdown(user, subB, targetCategory, wealth, dayGan),
  ];

  const yongsin = analyzeYongsinCandidate(user);
  const yongsinRelation: SpouseStarYongsinRelation = {
    applicable: yongsin.applicable,
    outcome: yongsin.outcome,
    isWinner: yongsin.winners.includes(targetCategory),
    candidateDetail: yongsin.candidates.find((c) => c.category === targetCategory) ?? null,
  };

  const huisin = analyzeHuisinCandidate(user);
  const huisinRelation: SpouseStarHuisinRelation = {
    applicable: huisin.applicable,
    notApplicableReason: huisin.notApplicableReason,
    isMatch: huisin.pairs.some((p) => p.category === targetCategory),
    matchedCandidate: huisin.pairs.find((p) => p.category === targetCategory) ?? null,
  };

  return { gender, targetCategory, strength, exposure, isDayBranch, subtypes, yongsinRelation, huisinRelation };
}
