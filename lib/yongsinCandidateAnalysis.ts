import { SajuUser } from "@/types";
import { Element, GAN_ELEMENT, GENERATES, OVERCOMES, elementThatGenerates, elementThatOvercomes } from "./hanjaTables";
import { analyzeDayMasterBalance } from "./dayMasterBalanceAnalysis";
import { analyzeWealthCategoryStrength } from "./wealthStrengthAnalysis";
import { SipseongCategory, SIPSEONG_TO_CATEGORY } from "./strengthAnalysis";
import { analyzeSeasonStatus, analyzeBranchRelations } from "./natalStructure";
import { ATTACKS } from "./wealthTimingAnalysis";

/**
 * 05장("재물운") 준비 작업 — 억부법 기반 용신 후보 결정 엔진.
 *
 * 독립 모듈이다. 새 명리 계산은 하지 않는다 — `analyzeDayMasterBalance`
 * (신강/신약, 이미 동결·커밋됨)의 balance/structureFlags/adjQ와
 * `analyzeWealthCategoryStrength`의 count/rootHits(position/tou)만
 * 그대로 재사용해 결정 트리를 태운다. 01~04, 무료 리포트, 기존
 * `dayMasterBalanceAnalysis.ts` 자체는 이 파일에서 전혀 수정하지 않는다
 * (import해서 읽기만 한다).
 *
 * 이 결정 트리(STEP A~E + 단독 후보 안전 게이트)는 60명 검증 데이터셋
 * (17명 최초 검증 + 43명 독립 표본)을 거쳐 최종 승인된 것을 그대로 옮긴
 * 것이다 — 구현 과정에서 조건을 다시 설계하지 않는다.
 *
 * 희신·기신·구신·한신은 이 모듈의 범위 밖이다(신강/신약과 동일한 순서로,
 * 용신 후보가 프로덕션에서 안정된 뒤 별도 모듈로 설계한다).
 */

export type YongsinOutcome = "single" | "multiple" | "hold" | "unresolved";

/** hold일 때만 존재 — 왜 보류인지 두 가지로 구분한다. */
export type YongsinHoldReason =
  | "allDisqualified" // 후보 전원이 STEP C(존재/자체과다/비겁 무통근)에서 탈락
  | "soleSurvivorWeakWithWarning"; // 유일 생존 후보이나 표면근거가 약하고 경고까지 있어 확정 보류(안전 게이트)

export type Exposure = "뚜렷" | "숨음" | "미미";
type HidePosition = "본기" | "중기" | "여기";

export interface YongsinCandidateDetail {
  category: SipseongCategory;
  exposure: Exposure;
  qualified: boolean;
  /** ① 실제 탈락 사유 — 존재/자체과다/(비겁만)무통근. 비어 있으면 자격 통과. */
  disqualifyReasons: string[];
  /** ② 보조 경고 — 상대 과다 근사치(인극식/군겁쟁재/상관견관/재극인/관성의 억제).
   * 절대 이 배열의 존재만으로 자동 탈락시키지 않는다 — 05 서술에서 후보의
   * 약점을 설명할 때 쓰기 위해 보존한다. */
  warnings: string[];
  /** ④ incoming(이 카테고리를 생하는 이웃) — 서술 근거, 탈락조건 아님. */
  incoming: boolean;
  incomingLabel: string;
  /** ④ outgoing(이 카테고리가 생하는 이웃) — 서술 근거, 탈락조건 아님. */
  outgoing: boolean;
  outgoingLabel: string;
  hasRoot: boolean;
  hasTou: boolean;
  bestRootPosition: HidePosition | "없음";
  /** 노출/뿌리/투간/incoming/outgoing 중 실제로 확인된 것 — 단독 확정
   * 최소 조건(2개 이상)과 05 서술에 공용으로 쓰인다. */
  evidenceKinds: string[];
}

export interface YongsinCandidateResult {
  /** balance가 5단계(신강~신약) 중 하나가 아니면(neutral/hold) false —
   * 이 경우 candidates도 비어 있고 용신 판정 자체를 하지 않는다. */
  applicable: boolean;
  outcome: YongsinOutcome;
  /** single=1개 · multiple=2개 · unresolved=3개(참고용, 확정 아님) · hold=0개 */
  winners: SipseongCategory[];
  /** winners와 1:1 대응하는 오행(목화토금수) — 대운/세운 연결에 쓸 값.
   * 한글 라벨이 아니라 기존 Element 타입 그대로 반환한다(표시 문구는
   * 호출부에서 결정). */
  elements: Element[];
  holdReason?: YongsinHoldReason;
  /** STEP D에서 어떤 근거로 좁혀졌는지 서술(디버깅/서술용). */
  narrowingTrace: string;
  /** 후보군 전체(신강 3개 또는 신약 2개)의 개별 근거 — 경고·incoming·
   * outgoing·뿌리·투간·위치를 전부 보존한다(05 서술에서 재사용). */
  candidates: YongsinCandidateDetail[];
}

const CATEGORY_TARGET_ELEMENT: Record<SipseongCategory, (dayEl: Element) => Element> = {
  비겁: (d) => d,
  식상: (d) => GENERATES[d],
  재성: (d) => OVERCOMES[d],
  관성: (d) => elementThatOvercomes(d),
  인성: (d) => elementThatGenerates(d),
};

const CATEGORY_KEY: Record<SipseongCategory, string> = {
  비겁: "companion", 식상: "output", 재성: "wealth", 관성: "officer", 인성: "resource",
};

const POS_RANK: Record<HidePosition, number> = { 본기: 3, 중기: 2, 여기: 1 };

const emptyResult: YongsinCandidateResult = {
  applicable: false, outcome: "hold", winners: [], elements: [], narrowingTrace: "적용 대상 아님(중화 또는 특수구조/보류)", candidates: [],
};

export function analyzeYongsinCandidate(user: SajuUser): YongsinCandidateResult {
  const balance = analyzeDayMasterBalance(user);
  const isStrong = balance.balance === "clearlyStrong" || balance.balance === "slightlyStrong";
  const isWeak = balance.balance === "slightlyWeak" || balance.balance === "clearlyWeak";
  if (!isStrong && !isWeak) return emptyResult;

  const dayGan = user.pillars.day.hanja;
  const dayElement = GAN_ELEMENT[dayGan];
  const wealth = analyzeWealthCategoryStrength(user);
  const flags = balance.structureFlags;
  const has = (key: string) => flags.includes(key);

  const exposure = (cat: SipseongCategory): Exposure => {
    const c = wealth.byCategory[cat];
    return c.count > 0 ? "뚜렷" : c.rootHits.length > 0 ? "숨음" : "미미";
  };
  const exists = (cat: SipseongCategory) => exposure(cat) !== "미미";
  const hasRoot = (cat: SipseongCategory) => wealth.byCategory[cat].rootHits.length > 0;
  const hasTou = (cat: SipseongCategory) => wealth.byCategory[cat].rootHits.some((h) => h.tou);
  const bestRootPosition = (cat: SipseongCategory): HidePosition | "없음" => {
    const hits = wealth.byCategory[cat].rootHits;
    if (!hits.length) return "없음";
    return hits.reduce((best, h) => (POS_RANK[h.position] > POS_RANK[best] ? h.position : best), hits[0].position);
  };

  // 상생 순환(비겁→식상→재성→관성→인성→비겁)의 인접 두 관계 — 전부 exposure
  // 재사용, 새 계산 없음. incoming=나를 생하는 이웃, outgoing=내가 생하는 이웃.
  const incoming: Record<SipseongCategory, boolean> = {
    비겁: exists("인성"), 식상: exists("비겁"), 재성: exists("식상"), 관성: exists("재성"), 인성: exists("관성"),
  };
  const outgoing: Record<SipseongCategory, boolean> = {
    비겁: exists("식상"), 식상: exists("재성"), 재성: exists("관성"), 관성: exists("인성"), 인성: exists("비겁"),
  };
  const incomingLabel: Record<SipseongCategory, string> = {
    비겁: "인성생비겁", 식상: "비겁생식상", 재성: "식상생재", 관성: "재생관", 인성: "관인상생",
  };
  const outgoingLabel: Record<SipseongCategory, string> = {
    비겁: "비겁생식상", 식상: "식상생재", 재성: "재생관", 관성: "관인상생", 인성: "인성생비겁",
  };

  function evidenceKindsOf(cat: SipseongCategory): string[] {
    const kinds: string[] = [];
    if (exposure(cat) === "뚜렷") kinds.push("노출");
    if (hasRoot(cat)) kinds.push("뿌리");
    if (hasTou(cat)) kinds.push("투간");
    if (incoming[cat]) kinds.push("incoming");
    if (outgoing[cat]) kinds.push("outgoing");
    return kinds;
  }

  /**
   * @param selfExcessKey  ① 자체 과다 탈락조건(structureFlags 키)
   * @param warnKey        ② 보조 경고에 쓸 상대 과다 플래그(있으면 탈락 아닌 경고만)
   * @param warnLabel      경고의 명리 용어 라벨(인극식/군겁쟁재/상관견관/재극인/관성의 억제)
   */
  function buildDetail(cat: SipseongCategory, selfExcessKey: string, warnKey: string, warnLabel: string): YongsinCandidateDetail {
    const exp = exposure(cat);
    const disqualifyReasons: string[] = [];
    const warnings: string[] = [];
    if (exp === "미미") disqualifyReasons.push("원국에 존재하지 않음(exposure=미미)");
    if (has(selfExcessKey)) disqualifyReasons.push("자체 과다(" + selfExcessKey + ")");
    if (cat === "비겁" && balance.debug.adjQ === 0) disqualifyReasons.push("일간 자신의 통근 없음(adjQ=0)");
    if (has(warnKey)) warnings.push(warnLabel + "(" + warnKey + ")");
    return {
      category: cat, exposure: exp, qualified: disqualifyReasons.length === 0,
      disqualifyReasons, warnings, incoming: incoming[cat], incomingLabel: incomingLabel[cat],
      outgoing: outgoing[cat], outgoingLabel: outgoingLabel[cat],
      hasRoot: hasRoot(cat), hasTou: hasTou(cat), bestRootPosition: bestRootPosition(cat),
      evidenceKinds: evidenceKindsOf(cat),
    };
  }

  const candidates: YongsinCandidateDetail[] = isStrong
    ? [
        buildDetail("식상", CATEGORY_KEY.식상 + "Excess", CATEGORY_KEY.인성 + "Excess", "인극식"),
        buildDetail("재성", CATEGORY_KEY.재성 + "Excess", CATEGORY_KEY.비겁 + "Excess", "군겁쟁재"),
        buildDetail("관성", CATEGORY_KEY.관성 + "Excess", CATEGORY_KEY.식상 + "Excess", "상관견관"),
      ]
    : [
        buildDetail("인성", CATEGORY_KEY.인성 + "Excess", CATEGORY_KEY.재성 + "Excess", "재극인"),
        buildDetail("비겁", CATEGORY_KEY.비겁 + "Excess", CATEGORY_KEY.관성 + "Excess", "관성의 억제"),
      ];

  const qualified = candidates.filter((c) => c.qualified);
  let outcome: YongsinOutcome;
  let winners: SipseongCategory[] = [];
  let holdReason: YongsinHoldReason | undefined;
  let narrowingTrace = "";

  if (qualified.length === 0) {
    outcome = "hold";
    holdReason = "allDisqualified";
    narrowingTrace = "자격 통과 후보 없음: " + candidates.map((c) => c.category + "(" + c.disqualifyReasons.join(";") + ")").join(" / ");
  } else {
    let pool = qualified;
    const inTrue = pool.filter((c) => c.incoming);
    if (inTrue.length >= 1 && inTrue.length < pool.length) {
      pool = inTrue;
      narrowingTrace = "incoming 유무로 좁힘(" + pool.map((c) => c.category).join(",") + ")";
    }
    if (pool.length > 1) {
      const outTrue = pool.filter((c) => c.outgoing);
      if (outTrue.length >= 1 && outTrue.length < pool.length) {
        pool = outTrue;
        narrowingTrace += (narrowingTrace ? " → " : "") + "outgoing 유무로 좁힘(" + pool.map((c) => c.category).join(",") + ")";
      }
    }
    if (pool.length > 1) {
      const maxPos = Math.max(...pool.map((c) => (c.bestRootPosition === "없음" ? 0 : POS_RANK[c.bestRootPosition])));
      const deepest = pool.filter((c) => (c.bestRootPosition === "없음" ? 0 : POS_RANK[c.bestRootPosition]) === maxPos);
      if (deepest.length < pool.length) {
        pool = deepest;
        narrowingTrace += (narrowingTrace ? " → " : "") + "통근 위치 등급으로 좁힘(" + pool.map((c) => c.category + ":" + c.bestRootPosition).join(",") + ")";
      }
    }

    if (pool.length === 1) {
      const cand = pool[0];
      if (cand.evidenceKinds.length < 2) {
        outcome = "hold";
        holdReason = "allDisqualified"; // 근거부족 — "자격은 있으나 확정할 근거가 부족"도 같은 보류 계열로 취급
        narrowingTrace += (narrowingTrace ? " / " : "") + "유일 후보(" + cand.category + ") 근거 " + cand.evidenceKinds.length + "개뿐이라 확정 보류";
      } else {
        // 단독 후보 안전 게이트 — v4에서 60명 검증 완료된 조건 그대로.
        // "애초에 경쟁 없이 혼자 남았음" + "표면 노출·투간이 약함" + "이
        // 후보를 직접 겨냥하는 경고가 실제로 있음" 셋 다 참일 때만 보류.
        const onlySurvivorFromStart = qualified.length === 1;
        const weakSurface = cand.exposure !== "뚜렷" && !cand.hasTou;
        const targetedWarning = cand.warnings.length > 0;
        if (onlySurvivorFromStart && weakSurface && targetedWarning) {
          outcome = "hold";
          holdReason = "soleSurvivorWeakWithWarning";
          narrowingTrace += (narrowingTrace ? " / " : "") + "[안전게이트] " + cand.category + "이 유일 생존 후보였으나 표면근거 약함(노출=" + cand.exposure + ", 투간없음) + 경고(" + cand.warnings.join(",") + ") 동시발생 → 단독확정 보류";
        } else {
          outcome = "single";
          winners = [cand.category];
          narrowingTrace += (narrowingTrace ? " / " : "") + "독립근거 " + cand.evidenceKinds.length + "개로 단독확정";
        }
      }
    } else if (pool.length === 2) {
      outcome = "multiple";
      winners = pool.map((c) => c.category);
      narrowingTrace = narrowingTrace || "구조적 신호로 갈리지 않아 2개 유지";
    } else {
      outcome = "unresolved";
      winners = pool.map((c) => c.category);
      narrowingTrace = "3개 후보 모두 구조적으로 구분 안 됨 — 필터가 충분히 작동하지 않음";
    }
  }

  const elements = winners.map((cat) => {
    const el = CATEGORY_TARGET_ELEMENT[cat](dayElement);
    return el;
  });

  return { applicable: true, outcome, winners, elements, holdReason, narrowingTrace, candidates };
}

/**
 * ────────────────────────────────────────────────────────────────
 * 통관(通官) 매개 오행 판정 — 중화(neutral) 명식 전용.
 *
 * 위 `analyzeYongsinCandidate`(억부법, 신강/신약 전용)와는 완전히 별도
 * 함수다. 그 함수와 isStrong/isWeak 경로, structureFlags 기반 로직은 이
 * 작업에서 한 글자도 바꾸지 않았다 — balance.balance==="neutral"일 때만
 * 아래 함수가 호출된다(신강/신약 쪽은 여전히 analyzeYongsinCandidate만 쓴다).
 *
 * 새 명리 계산은 전혀 없다. analyzeDayMasterBalance·analyzeWealthCategoryStrength·
 * analyzeSeasonStatus·analyzeBranchRelations(전부 기존·동결) 결과값만 그대로
 * 조합해 역할 기반 Boolean 판정 트리를 태운다. 이 판정 트리는 130명
 * 가상검증(2026-10-02, scripts/_tonggwan_rule_v4.ts)을 거쳐 승인된 것을
 * 그대로 옮긴 것이며, 구현 과정에서 조건을 다시 설계하지 않았다.
 * ────────────────────────────────────────────────────────────────
 */

export type TonggwanVerdict = "확정" | "보조 후보" | "보류";

export interface TonggwanEvidence {
  /** A — 천간 투출: 매개 오행이 연/월/시 천간에 독립적으로 노출 */
  stemExposed: boolean;
  /** B — 지지 본기: 매개 카테고리가 어떤 지지의 본기(실제 십성)로 나타남 */
  branchRooted: boolean;
  /** C — 지장간 중기 이상(여기 단독은 제외 — C-only 감사로 확정된 기준) */
  hiddenMidQi: boolean;
  /** D — 투간: 지장간이 실제로 다른 자리 천간에 노출됨 */
  exposedFromHidden: boolean;
  /** E — 계절상 생존 상태. 왕/상만 긍정 근거이며 휴/수/사는 긍정으로 쓰지 않는다. */
  seasonStatus: "왕" | "상" | "휴" | "수" | "사";
  /** F — 매개 오행의 근거 지지가 '충'을 맞는지. 합은 현재 엔진으로 실제
   * 약화 여부를 정확히 판정할 수 없어 자동 탈락 사유로 쓰지 않는다. */
  clashesRootLocation: boolean;
}

export interface TonggwanMediatorResult {
  /** balance가 neutral이 아니면 false — candidates 판정 자체를 하지 않는다. */
  applicable: boolean;
  verdict: TonggwanVerdict;
  attackerCategory?: SipseongCategory;
  defenderCategory?: SipseongCategory;
  mediatorElement?: Element;
  mediatorCategory?: SipseongCategory;
  evidence?: TonggwanEvidence;
  /** G — 통관 연결성. 확정 사례에 한해 참고 주석만 남긴다. 등급을
   * 올리거나 내리는 독립 결정권은 없다(검증 완료, 범위 확대 없음). */
  connectivityNote?: "천간 경로로 성립" | "지지 전개로 성립" | "판정불가/불가능(참고용)";
  reason: string;
}

const emptyTonggwanResult: TonggwanMediatorResult = {
  applicable: false, verdict: "보류", reason: "적용 대상 아님(중화가 아님)",
};

export function analyzeTonggwanMediator(user: SajuUser): TonggwanMediatorResult {
  const balance = analyzeDayMasterBalance(user);
  if (balance.balance !== "neutral") return emptyTonggwanResult;

  const wealth = analyzeWealthCategoryStrength(user);
  const SUPPORT: SipseongCategory[] = ["비겁", "인성"];
  const DRAIN: SipseongCategory[] = ["식상", "재성", "관성"];
  const supportTop = [...SUPPORT].sort((a, b) => wealth.byCategory[b].total - wealth.byCategory[a].total)[0];
  const drainTop = [...DRAIN].sort((a, b) => wealth.byCategory[b].total - wealth.byCategory[a].total)[0];
  const drainAttacksSupport = ATTACKS[drainTop] === supportTop;
  const supportAttacksDrain = ATTACKS[supportTop] === drainTop;
  if (!drainAttacksSupport && !supportAttacksDrain) {
    return { applicable: true, verdict: "보류", reason: "지지 세력과 깎는 세력 사이에 직접적인 상극 관계가 없음" };
  }

  const attackerCategory = drainAttacksSupport ? drainTop : supportTop;
  const defenderCategory = drainAttacksSupport ? supportTop : drainTop;
  const dayGan = user.pillars.day.hanja;
  const dayElement = GAN_ELEMENT[dayGan];
  const attackerElement = CATEGORY_TARGET_ELEMENT[attackerCategory](dayElement);
  const defenderElement = CATEGORY_TARGET_ELEMENT[defenderCategory](dayElement);
  if (OVERCOMES[attackerElement] !== defenderElement) {
    return { applicable: true, verdict: "보류", attackerCategory, defenderCategory, reason: "오행 상극 관계 재확인 실패" };
  }

  const mediatorElement = GENERATES[attackerElement];
  if (GENERATES[mediatorElement] !== defenderElement) {
    return { applicable: true, verdict: "보류", attackerCategory, defenderCategory, mediatorElement, reason: "통관 공식(상생 두 단계) 불일치" };
  }

  const mediatorCategory = (Object.keys(CATEGORY_TARGET_ELEMENT) as SipseongCategory[]).find(
    (c) => CATEGORY_TARGET_ELEMENT[c](dayElement) === mediatorElement,
  );
  const mediatorHits = mediatorCategory ? wealth.byCategory[mediatorCategory] : null;
  const existsInChart = mediatorHits && (mediatorHits.count > 0 || mediatorHits.rootHits.length > 0);
  if (!existsInChart || !mediatorHits) {
    return { applicable: true, verdict: "보류", attackerCategory, defenderCategory, mediatorElement, mediatorCategory, reason: "매개 오행이 원국에 존재하지 않음" };
  }

  const stemExposed = (["year", "month", "hour"] as const).some((stage) => {
    const stem = user.pillars[stage];
    return stem && GAN_ELEMENT[stem.hanja] === mediatorElement;
  });

  const branchRooted = (["year", "month", "day", "hour"] as const).some((stage) => {
    const sip = user.pillars.branches[stage]?.sipseong;
    return sip && SIPSEONG_TO_CATEGORY[sip] === mediatorCategory;
  });

  const hiddenMidQi = mediatorHits.rootHits.some((h) => h.position === "중기");
  const exposedFromHidden = mediatorHits.rootHits.some((h) => h.tou);

  const season = analyzeSeasonStatus(user);
  const seasonStatus: TonggwanEvidence["seasonStatus"] =
    season.rulingElement === mediatorElement ? "왕"
    : GENERATES[season.rulingElement] === mediatorElement ? "상"
    : GENERATES[mediatorElement] === season.rulingElement ? "휴"
    : OVERCOMES[season.rulingElement] === mediatorElement ? "수" : "사";

  const relations = analyzeBranchRelations(user);
  const relevantZhis = new Set<string>(mediatorHits.rootHits.map((h) => h.zhi));
  if (branchRooted) {
    (["year", "month", "day", "hour"] as const).forEach((stage) => {
      const sip = user.pillars.branches[stage]?.sipseong;
      const branch = user.pillars.branches[stage];
      if (sip && branch && SIPSEONG_TO_CATEGORY[sip] === mediatorCategory) relevantZhis.add(branch.hanja);
    });
  }
  const clashesRootLocation = relations.chong.some((pair) => relevantZhis.has(pair.a.zhi) || relevantZhis.has(pair.b.zhi));

  const evidence: TonggwanEvidence = { stemExposed, branchRooted, hiddenMidQi, exposedFromHidden, seasonStatus, clashesRootLocation };

  const seasonGood = seasonStatus === "왕" || seasonStatus === "상";
  const hasPrimaryEvidence = stemExposed || branchRooted || exposedFromHidden; // A/B/D = 1차(직접) 근거
  // F는 "A(천간 독립 노출)가 없고 B/D(지지·지장간 계열)만으로 1차 근거가 성립했을 때"만
  // 강등 사유로 작동한다 — 천간에 독립적으로 노출된 힘은 지지의 충 영향권 밖이라고 보기
  // 때문이다(검증 완료, 범위 확대 없음).
  const clashAppliesToPrimary = !stemExposed && (branchRooted || exposedFromHidden) && clashesRootLocation;

  let verdict: TonggwanVerdict;
  let reason: string;
  let connectivityNote: TonggwanMediatorResult["connectivityNote"];

  if (hasPrimaryEvidence) {
    if (clashAppliesToPrimary) {
      verdict = "보조 후보";
      reason = "1차 근거(지지·지장간 계열)는 있으나 그 뿌리 지지가 충을 맞아 신뢰도가 떨어짐";
    } else if (seasonGood) {
      verdict = "확정";
      reason = "1차 근거(천간투출/지지본기/투간) + 계절상 생존(왕/상) + 충 영향 없음";
      if (stemExposed) {
        connectivityNote = "천간 경로로 성립";
      } else {
        const attackerHits = wealth.byCategory[attackerCategory].rootHits;
        const posRank: Record<string, number> = { 본기: 0, 중기: 1, 여기: 2 };
        const attackerEarliestByStage = new Map<string, number>();
        attackerHits.forEach((h) => {
          const idx = posRank[h.position] ?? 0;
          const prev = attackerEarliestByStage.get(h.stage);
          if (prev === undefined || idx < prev) attackerEarliestByStage.set(h.stage, idx);
        });
        const sameStageProgression = mediatorHits.rootHits.some((h) => {
          const attackerIdx = attackerEarliestByStage.get(h.stage);
          return attackerIdx !== undefined && attackerIdx < (posRank[h.position] ?? 0);
        });
        connectivityNote = sameStageProgression ? "지지 전개로 성립" : "판정불가/불가능(참고용)";
      }
    } else {
      verdict = "보조 후보";
      reason = "1차 근거는 있으나 계절상 뒷받침되지 않음(휴/수/사)";
    }
  } else if (hiddenMidQi && seasonGood && !clashesRootLocation) {
    // A/B/D가 전혀 없는 C-only 구조 — C-only 감사(16명 전수조사, 2026-10-02)로
    // 확정된 최소 조건만 허용한다. 여기(餘氣) 단독은 hiddenMidQi 자체가 false라
    // 이 분기에 들어오지 않는다.
    verdict = "보조 후보";
    reason = "지장간 중기 이상 근거 + 계절상 생존(왕/상) + 충 영향 없음(C-only 최소 조건)";
  } else {
    verdict = "보류";
    reason = !hiddenMidQi
      ? "직접 근거(천간/지지본기/투간)와 지장간 중기 이상 근거가 모두 없음"
      : !seasonGood
      ? "최소 근거는 있으나 계절상 뒷받침되지 않음(휴/수/사)"
      : "최소 근거는 있으나 그 뿌리 지지가 충을 맞아 근거로 쓸 수 없음";
  }

  return { applicable: true, verdict, attackerCategory, defenderCategory, mediatorElement, mediatorCategory, evidence, connectivityNote, reason };
}
