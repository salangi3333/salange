import { SajuUser } from "@/types";
import { Element, GAN_ELEMENT, GENERATES, OVERCOMES, elementThatGenerates, elementThatOvercomes } from "./hanjaTables";
import { Stage } from "./natalStructure";
import { analyzeDayMasterBalance } from "./dayMasterBalanceAnalysis";
import { analyzeYongsinCandidate, YongsinHoldReason, Exposure } from "./yongsinCandidateAnalysis";
import { analyzeWealthCategoryStrength } from "./wealthStrengthAnalysis";
import { SipseongCategory, RootHit } from "./strengthAnalysis";

/**
 * 05장("재물운") 준비 작업 — 희신 후보 사실 계산 엔진.
 *
 * 독립 모듈이다. 새 명리 계산은 하지 않는다 — 이미 동결된
 * `analyzeDayMasterBalance`/`analyzeYongsinCandidate`의 balance·outcome·
 * winners·holdReason과, `analyzeWealthCategoryStrength`의 count/rootHits/
 * visiblePositions만 재사용해 사실을 조립한다. 01~04, 무료 리포트,
 * `dayMasterBalanceAnalysis.ts`, `yongsinCandidateAnalysis.ts` 자체는
 * 이 파일에서 전혀 수정하지 않는다(import해서 읽기만 한다).
 *
 * 원칙: 이 엔진은 "희신이 강하다/약하다/뚜렷하다" 같은 해석 판정을 절대
 * 만들지 않는다 — manifestation은 원국에서 확인된 사실(노출 형태·뿌리
 * 위치·투간 여부)의 묶음일 뿐이고, warnings는 그 사실과 분리된 별도
 * 방해요소 목록이다. 문장 생성은 05 해석 레이어의 몫이다.
 *
 * 희신은 용신처럼 여러 후보가 경쟁하는 구조가 아니다 — 상생 순환에서
 * 용신을 생하는 카테고리 하나가 결정론적으로 정해진다(1차 후보 = 최종
 * 후보). 그래서 single/multiple/hold/unresolved 같은 경쟁형 판정 타입을
 * 그대로 옮기지 않는다 — 대신 applicable(가능 여부)과 hardBlocked(자체
 * 과다로 인한 배제)만 이분법으로 두고, 나머지는 전부 사실 나열이다.
 *
 * 희신·기신·구신·한신 중 희신만 이번 범위다.
 */

export type HuisinNotApplicableReason =
  | "neutralBalance" // balance.balance === "neutral"
  | "specialStructure" // balance.balance === "hold" && holdType === "specialStructure"
  | "boundaryConflict" // balance.balance === "hold" && holdType === "boundaryConflict"(현재 미사용, 타입 대비)
  | "yongsinHold" // 용신 outcome === "hold"
  | "yongsinUnresolved" // 용신 outcome === "unresolved"(3후보 잔존)
  | "noHuisinCandidate"; // 용신은 single/multiple로 해결됐으나, 그 용신(들) 전부 incoming=false라 후보가 하나도 없음

type HidePosition = "본기" | "중기" | "여기";

export interface HuisinRelation {
  active: boolean;
  label: string;
  category: SipseongCategory;
}

export interface HuisinManifestation {
  exposure: Exposure;
  /** exposure==="뚜렷"일 때만 값이 있음(년/월/일/시 중 겉으로 드러난 자리). */
  visiblePositions: Stage[];
  hasRoot: boolean;
  /** 압축하지 않은 전체 배열 — stage/zhi/hiddenGan/position/tou 그대로. */
  rootHits: RootHit[];
  bestRootPosition: HidePosition | "없음";
  hasTou: boolean;
}

export interface HuisinCandidate {
  forYongsin: SipseongCategory;
  category: SipseongCategory;
  element: Element;
  hardBlocked: boolean;
  hardBlockReason?: string;
  manifestation: HuisinManifestation;
  /** 희신 → 용신(이 관계가 곧 선정 근거) — active는 이 구조에서 항상 true. */
  supportTowardYongsin: HuisinRelation;
  /** 희신 자신에게 들어오는 생조(2차 지원) — 사람마다 다르게 나오는 실제 변수. */
  supportIntoHuisin: HuisinRelation;
  /** manifestation과 분리된 방해요소(상대 과다 근사치). 탈락조건 아님. */
  warnings: string[];
}

export interface HuisinCandidateResult {
  applicable: boolean;
  notApplicableReason?: HuisinNotApplicableReason;
  /** notApplicableReason === "yongsinHold"일 때만 존재 — 용신 엔진의 세부
   * 사유를 재추론 없이 그대로 전달. */
  yongsinHoldReason?: YongsinHoldReason;
  pairs: HuisinCandidate[];
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

// 상생 순환(비겁→식상→재성→관성→인성→비겁)에서 "누가 나를 생하는가" —
// 용신 엔진의 incoming 매핑과 동일한 관계를 그대로 재사용(계산 로직 불변).
const PREV_OF: Record<SipseongCategory, SipseongCategory> = {
  비겁: "인성", 식상: "비겁", 재성: "식상", 관성: "재성", 인성: "관성",
};
const INCOMING_LABEL: Record<SipseongCategory, string> = {
  비겁: "인성생비겁", 식상: "비겁생식상", 재성: "식상생재", 관성: "재생관", 인성: "관인상생",
};
const OUTGOING_LABEL: Record<SipseongCategory, string> = {
  비겁: "비겁생식상", 식상: "식상생재", 재성: "재생관", 관성: "관인상생", 인성: "인성생비겁",
};
// 상대과다 경고(용신 엔진과 동일한 5개 관계, 방향과 무관하게 전체 카테고리로 일반화)
const WARN_KEY: Record<SipseongCategory, { key: string; label: string }> = {
  식상: { key: CATEGORY_KEY.인성 + "Excess", label: "인극식" },
  재성: { key: CATEGORY_KEY.비겁 + "Excess", label: "군겁쟁재" },
  관성: { key: CATEGORY_KEY.식상 + "Excess", label: "상관견관" },
  인성: { key: CATEGORY_KEY.재성 + "Excess", label: "재극인" },
  비겁: { key: CATEGORY_KEY.관성 + "Excess", label: "관성의 억제" },
};

const POS_RANK: Record<HidePosition, number> = { 본기: 3, 중기: 2, 여기: 1 };

export function analyzeHuisinCandidate(user: SajuUser): HuisinCandidateResult {
  const balance = analyzeDayMasterBalance(user);
  const yongsin = analyzeYongsinCandidate(user);

  if (!yongsin.applicable) {
    let reason: HuisinNotApplicableReason;
    if (balance.balance === "neutral") reason = "neutralBalance";
    else if (balance.holdType === "boundaryConflict") reason = "boundaryConflict";
    else reason = "specialStructure"; // balance.balance==="hold"이고 holdType이 있는 경우(현재 유일한 실사례)
    return { applicable: false, notApplicableReason: reason, pairs: [] };
  }

  if (yongsin.outcome === "hold") {
    return { applicable: false, notApplicableReason: "yongsinHold", yongsinHoldReason: yongsin.holdReason, pairs: [] };
  }
  if (yongsin.outcome === "unresolved") {
    return { applicable: false, notApplicableReason: "yongsinUnresolved", pairs: [] };
  }

  const dayGan = user.pillars.day.hanja;
  const dayElement = GAN_ELEMENT[dayGan];
  const wealth = analyzeWealthCategoryStrength(user);
  const flags = balance.structureFlags;
  const has = (key: string) => flags.includes(key);

  const exposureOf = (cat: SipseongCategory): Exposure => {
    const c = wealth.byCategory[cat];
    return c.count > 0 ? "뚜렷" : c.rootHits.length > 0 ? "숨음" : "미미";
  };
  const existsCat = (cat: SipseongCategory) => exposureOf(cat) !== "미미";
  const bestRootPositionOf = (cat: SipseongCategory): HidePosition | "없음" => {
    const hits = wealth.byCategory[cat].rootHits;
    if (!hits.length) return "없음";
    return hits.reduce((best, h) => (POS_RANK[h.position] > POS_RANK[best] ? h.position : best), hits[0].position);
  };

  const pairs: HuisinCandidate[] = [];

  yongsin.winners.forEach((yongsinCat) => {
    const huisinCat = PREV_OF[yongsinCat];
    if (!existsCat(huisinCat)) return; // 이 용신을 생해주는 카테고리 자체가 원국에 없음 — 후보 없이 건너뜀

    const ownExcessKey = CATEGORY_KEY[huisinCat] + "Excess";
    const hardBlocked = has(ownExcessKey);
    const warnInfo = WARN_KEY[huisinCat];
    const warnings = has(warnInfo.key) ? [warnInfo.label + "(" + warnInfo.key + ")"] : [];

    const rootHits = wealth.byCategory[huisinCat].rootHits;
    const exp = exposureOf(huisinCat);
    const secondOrderSource = PREV_OF[huisinCat];

    pairs.push({
      forYongsin: yongsinCat,
      category: huisinCat,
      element: CATEGORY_TARGET_ELEMENT[huisinCat](dayElement),
      hardBlocked,
      hardBlockReason: hardBlocked ? "후보 자체가 이미 과다(" + ownExcessKey + ")" : undefined,
      manifestation: {
        exposure: exp,
        visiblePositions: exp === "뚜렷" ? wealth.visiblePositions[huisinCat] : [],
        hasRoot: rootHits.length > 0,
        rootHits,
        bestRootPosition: bestRootPositionOf(huisinCat),
        hasTou: rootHits.some((h) => h.tou),
      },
      supportTowardYongsin: { active: true, label: OUTGOING_LABEL[huisinCat], category: yongsinCat },
      supportIntoHuisin: { active: existsCat(secondOrderSource), label: INCOMING_LABEL[huisinCat], category: secondOrderSource },
      warnings,
    });
  });

  if (pairs.length === 0) {
    return { applicable: false, notApplicableReason: "noHuisinCandidate", pairs: [] };
  }

  return { applicable: true, pairs };
}
