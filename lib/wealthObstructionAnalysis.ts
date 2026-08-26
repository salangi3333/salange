import { AppData } from "./sajuContent";
import { analyzeDayMasterBalance } from "./dayMasterBalanceAnalysis";
import { analyzeYongsinCandidate } from "./yongsinCandidateAnalysis";
import { analyzeHuisinCandidate } from "./huisinCandidateAnalysis";
import { buildChapterFourKey } from "./chapterFourInterpretation";
import { SipseongCategory } from "./strengthAnalysis";

/**
 * 5장("돈이 들어와도 남지 않는 이유") — 방해구조 판정 CALCULATION 레이어.
 *
 * 독립 모듈이다. 새 명리 계산은 하지 않는다 — 이미 동결된
 * `analyzeDayMasterBalance`/`analyzeYongsinCandidate`/`analyzeHuisinCandidate`
 * 의 structureFlags·outcome·candidates·pairs와, `buildChapterFourKey`의
 * jaeseongVsInseong·heChongOnWealth만 재사용해 사실을 조립한다. 01~04·06장
 * 계산 파일은 이 파일에서 전혀 수정하지 않는다(import해서 읽기만 한다).
 *
 * 이번 설계는 60명 실측 검증(S34/C20/C30/C24/C35/C19 등)을 거쳐 확정된
 * 원칙을 그대로 옮긴 것이다 — 이 구조 자체를 다시 설계하지 않는다.
 *
 * 핵심 원칙(변경 금지):
 *  - `yongsinResolutionStatus`(용신 확정 여부)와 `structuralObstructions`
 *    (원국 자체의 구조적 과다)는 서로 독립된 사실이다. 용신이 hold/
 *    unresolved라고 해서 structureFlags에서 이미 계산된 과다구조를
 *    지우지 않는다 — 용신을 전제로 하는 해석(supportConstraints)만
 *    자연히 비게 된다.
 *  - wealthExcess/companionExcess/outputExcess/resourceExcess/
 *    officerExcess는 서로 우선순위로 하나만 고르지 않는다. 수학적으로
 *    두 개 이상 동시 발생이 극히 드물지만(둘 다 과다이려면 나머지 3개
 *    카테고리가 명식 전체에 하나도 없어야 함), 발생하면 전부 보존한다.
 *  - `noHuisinCandidate`(지원축 후보 자체가 원국에 없음)와 `hardBlocked`
 *    (지원축 후보는 있으나 자체 과다로 작동 제한)는 "결핍"이라는 같은
 *    말로 뭉치지 않는다 — supportConstraints 안에서도 별개 kind다.
 *  - severityLabel은 `structuralObstructions.length`만으로 정한다.
 *    점수가 아니라 상태 라벨이다.
 */

export type ObstructionType = "과부하형" | "분산형" | "소모형" | "제동형" | "압박형";
type ExcessFlag = "wealthExcess" | "companionExcess" | "outputExcess" | "resourceExcess" | "officerExcess";

export interface StructuralObstruction {
  type: ObstructionType;
  sourceFlag: ExcessFlag;
  /** 이 과다가 동시에 지원축(희신) 카테고리 자체를 막고 있는지 —
   * supportConstraints의 hardBlocked 항목과 같은 근거를 가리킬 때만 true. */
  blocksSupport: boolean;
}

export type SupportConstraintKind = "noHuisinCandidate" | "hardBlocked" | "yongsinCandidateWarning" | "huisinWarning";

export interface SupportConstraint {
  kind: SupportConstraintKind;
  category?: SipseongCategory;
  linkedObstructionSourceFlag?: ExcessFlag;
  detail: string;
}

export type CaveatKind = "monthRootConflict" | "jaeseongVsInseong" | "heChongSummary";
export interface Caveat {
  kind: CaveatKind;
  detail: string;
}

export type YongsinResolutionStatus = "resolved" | "hold" | "unresolved";
export type SeverityLabel = "뚜렷한 주방해 없음" | "단일 방해축" | "복합/중첩 방해축";

export interface WealthObstructionResult {
  yongsinResolutionStatus: YongsinResolutionStatus;
  structuralObstructions: StructuralObstruction[];
  supportConstraints: SupportConstraint[];
  caveats: Caveat[];
  severityLabel: SeverityLabel;
  reasons: string[];
}

// 5개 Excess 플래그 ↔ 유형/카테고리 매핑. dayMasterBalanceAnalysis.ts의
// CATEGORY_KEY(비겁:companion·식상:output·재성:wealth·관성:officer·
// 인성:resource)와 정확히 같은 대응을 이 파일에도 독립적으로 둔다 —
// 기존 파일들이 이미 반복해온 것과 같은 패턴(공유 대신 로컬 상수).
const EXCESS_TYPE: Record<ExcessFlag, ObstructionType> = {
  wealthExcess: "과부하형",
  companionExcess: "분산형",
  outputExcess: "소모형",
  resourceExcess: "제동형",
  officerExcess: "압박형",
};
const EXCESS_FLAG_CATEGORY: Record<ExcessFlag, SipseongCategory> = {
  companionExcess: "비겁",
  outputExcess: "식상",
  wealthExcess: "재성",
  officerExcess: "관성",
  resourceExcess: "인성",
};
const CATEGORY_TO_EXCESS_FLAG: Record<SipseongCategory, ExcessFlag> = {
  비겁: "companionExcess",
  식상: "outputExcess",
  재성: "wealthExcess",
  관성: "officerExcess",
  인성: "resourceExcess",
};
// 용신/희신 엔진의 WARN_KEY와 정확히 같은 5개 관계(인극식/군겁쟁재/
// 상관견관/재극인/관성의 억제)를 "이 카테고리가 어떤 Excess 때문에
// 경고를 받는가" 방향으로 재구성한 것 — 새 관계 아님.
const WARN_SOURCE_FLAG: Record<SipseongCategory, ExcessFlag> = {
  식상: "resourceExcess",
  재성: "companionExcess",
  관성: "outputExcess",
  인성: "wealthExcess",
  비겁: "officerExcess",
};

const EXCESS_FLAG_ORDER: ExcessFlag[] = ["companionExcess", "outputExcess", "wealthExcess", "officerExcess", "resourceExcess"];

export function analyzeWealthObstruction(appData: AppData): WealthObstructionResult {
  const user = appData.user;
  const balance = analyzeDayMasterBalance(user);
  const yongsin = analyzeYongsinCandidate(user);
  const huisin = analyzeHuisinCandidate(user);
  const ch4 = buildChapterFourKey(appData);

  const yongsinResolutionStatus: YongsinResolutionStatus =
    yongsin.outcome === "single" || yongsin.outcome === "multiple" ? "resolved" : yongsin.outcome === "hold" ? "hold" : "unresolved";

  // ── 1. structuralObstructions — 원국 자체의 과다, yongsin 상태와 무관 ──
  const structuralObstructions: StructuralObstruction[] = EXCESS_FLAG_ORDER.filter((flag) => balance.structureFlags.includes(flag)).map(
    (flag) => {
      const category = EXCESS_FLAG_CATEGORY[flag];
      const blocksSupport = huisin.applicable && huisin.pairs.some((pr) => pr.category === category && pr.hardBlocked);
      return { type: EXCESS_TYPE[flag], sourceFlag: flag, blocksSupport };
    }
  );

  // ── 2. supportConstraints — 확정된 용신·희신(winners)에 관한 것만 ──
  const supportConstraints: SupportConstraint[] = [];

  if (!huisin.applicable && huisin.notApplicableReason === "noHuisinCandidate") {
    supportConstraints.push({
      kind: "noHuisinCandidate",
      detail: `용신(${yongsin.winners.join(",")})을 뒷받침할 지원축 후보가 원국에 뚜렷하지 않음`,
    });
  }

  if (huisin.applicable) {
    huisin.pairs.forEach((pr) => {
      if (pr.hardBlocked) {
        supportConstraints.push({
          kind: "hardBlocked",
          category: pr.category,
          linkedObstructionSourceFlag: CATEGORY_TO_EXCESS_FLAG[pr.category],
          detail: `희신 후보(${pr.category})가 ${CATEGORY_TO_EXCESS_FLAG[pr.category]} 자체 과다로 작동 제한`,
        });
      }
      if (pr.warnings.length > 0) {
        supportConstraints.push({
          kind: "huisinWarning",
          category: pr.category,
          linkedObstructionSourceFlag: WARN_SOURCE_FLAG[pr.category],
          detail: `확정된 희신(${pr.forYongsin}의 지원축, ${pr.category})에 경고 발생: ${pr.warnings.join(",")}`,
        });
      }
    });
  }

  // 후보였다가 탈락한 카테고리의 경고는 담지 않는다 — winners에 속한
  // 카테고리에 대한 경고만 "확정된 용신에 대한 사실"로 인정한다.
  yongsin.candidates
    .filter((c) => c.warnings.length > 0 && yongsin.winners.includes(c.category))
    .forEach((c) => {
      supportConstraints.push({
        kind: "yongsinCandidateWarning",
        category: c.category,
        linkedObstructionSourceFlag: WARN_SOURCE_FLAG[c.category],
        detail: `확정된 용신(${c.category})에 경고 발생: ${c.warnings.join(",")}`,
      });
    });

  // ── 3. caveats — 4장 heChongOnWealth는 요약만, 상세 재서술 안 함 ──
  const caveats: Caveat[] = [];
  if (balance.structureFlags.includes("monthRootConflict")) {
    caveats.push({ kind: "monthRootConflict", detail: "월지 통근 판정이 애매해 대안 판정 기준 사용" });
  }
  const jvi = ch4.jaeseongVsInseong;
  if (jvi.leadCategory === "재성" && jvi.gapTier !== "비슷") {
    caveats.push({ kind: "jaeseongVsInseong", detail: `재성(${jvi.gapTier}) 우위 — 재극인 경향` });
  }
  const { he, chong } = ch4.heChongOnWealth;
  if (he.length > 0 || chong.length > 0) {
    caveats.push({ kind: "heChongSummary", detail: `재성 또는 일간 통근 자리에 합 ${he.length}건, 충 ${chong.length}건 존재(상세는 4장 참고)` });
  }

  // ── 4. severityLabel — structuralObstructions.length만 기준, 점수 아님 ──
  const severityLabel: SeverityLabel =
    structuralObstructions.length === 0 ? "뚜렷한 주방해 없음" : structuralObstructions.length === 1 ? "단일 방해축" : "복합/중첩 방해축";

  const reasons: string[] = [
    `yongsinResolutionStatus=${yongsinResolutionStatus}`,
    ...structuralObstructions.map((o) => `${o.sourceFlag}→${o.type}${o.blocksSupport ? "(지원축 차단)" : ""}`),
    ...supportConstraints.map((s) => `${s.kind}${s.category ? "(" + s.category + ")" : ""}`),
    ...caveats.map((c) => c.kind),
  ];

  return { yongsinResolutionStatus, structuralObstructions, supportConstraints, caveats, severityLabel, reasons };
}
