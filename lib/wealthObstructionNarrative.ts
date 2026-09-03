import { WealthObstructionResult, StructuralObstruction, SupportConstraint, Caveat, ObstructionType } from "./wealthObstructionAnalysis";

/**
 * 5장("돈이 들어와도 남지 않는 이유") — 고객용 본문 INTERPRETATION 레이어.
 *
 * `analyzeWealthObstruction(appData)`의 결과(structuralObstructions·
 * supportConstraints·caveats·yongsinResolutionStatus·severityLabel)만
 * 입력으로 받아 문단을 조립한다. ID 기반 하드코딩 금지 — 모든 분기는
 * 이 5개 필드의 조합에만 반응한다.
 *
 * 동결된 6장 고객용 서술 가이드와 동일한 안전 경계를 적용한다:
 *  - wealthExcess/companionExcess/outputExcess/resourceExcess/officerExcess,
 *    supportConstraint/hardBlocked/warning/caveat/severityLabel 같은 내부
 *    용어는 고객 문장에 절대 노출하지 않는다(reasons/sourceNote에만 사용).
 *  - 과거 경험 확정, 실제 심리 단정, 특정 관계·가족·동업 사건 창작 금지.
 *  - wealthExcess를 실제 수입·기회 증가로 번역하지 않는다("다뤄야 할
 *    범위가 커진다" 수준까지만).
 *  - caveat는 독립 문단의 주인공이 되지 않고 다른 문단의 보조 근거로만
 *    쓰인다.
 *  - yongsinResolutionStatus가 hold/unresolved면 구조 설명은 하되
 *    "이게 해결책이다" 식 확정 처방을 하지 않는다.
 *  - structuralObstructions가 비어 있으면 억지로 문제를 만들지 않는다
 *    ("뚜렷한 단일 원인 없음" 자체를 의미 있는 결론으로 다룬다).
 */

export interface NarrativeParagraph {
  text: string;
  sourceNote: string;
}

export interface WealthObstructionNarrativeResult {
  paragraphs: NarrativeParagraph[];
}

// ── 구조적 방해축 → 현실 언어 번역(유형별 고정 1문장 + 필요시 변주) ──
const OBSTRUCTION_EXPLANATION: Record<ObstructionType, string> = {
  과부하형:
    "재물을 얻는 힘과 그걸 감당하는 힘이 같은 속도로 움직이지 않는 쪽에 가깝습니다. 재물과 관련해 다뤄야 할 범위가 커질수록, 함께 챙겨야 할 것도 많아질 수 있습니다.",
  분산형:
    "한곳에 모으는 힘보다 여러 방향으로 움직이게 하는 힘이 더 강한 구조입니다. 재물이 혼자 고립돼 쌓이기보다, 관계나 상황 속에서 여러 방향으로 움직이기 쉬운 구조입니다.",
  소모형:
    "만드는 힘이 크다고 해서, 남기는 힘까지 같은 속도로 따라오는 건 아닙니다. 벌리고 표현하고 움직이는 쪽의 힘이 강해서, 결과가 한 곳에 머물기보다 계속 순환하는 흐름에 가깝습니다.",
  제동형:
    "받아들이고 살피는 힘이 강할수록, 실제 재물이 움직이는 속도는 오히려 늦어질 수 있습니다. 준비하고 따져보는 쪽이 앞서는 구조입니다.",
  압박형:
    "돈을 움직이기 전에 먼저 지켜야 할 것이 많은 쪽에 가깝습니다. 역할과 책임의 무게가 재물보다 앞서 있는 구조입니다.",
};

// 두 번째 이상 겹치는 구조를 추가할 때 쓰는 축약 언급(전체 문장 반복 방지)
const OBSTRUCTION_SHORT: Record<ObstructionType, string> = {
  과부하형: "감당해야 할 무게가 큰 결",
  분산형: "여러 갈래로 흩어지는 결",
  소모형: "쏟아내는 만큼 나가는 결",
  제동형: "재고 따지느라 늦어지는 결",
  압박형: "책임이 먼저 작동하는 결",
};

type OpeningStyle = "질문형" | "대비형" | "통찰형" | "구조설명형" | "뚜렷한주방해없음형";
type EndingStyle = "짧은통찰형" | "구조적결론형" | "열린질문형" | "판정보류형" | "단일원인없음형";

function hasKind(constraints: SupportConstraint[], kind: SupportConstraint["kind"]): boolean {
  return constraints.some((c) => c.kind === kind);
}

function pickOpeningStyle(result: WealthObstructionResult): OpeningStyle {
  if (result.structuralObstructions.length === 0) return "뚜렷한주방해없음형";
  // 겹치는 구조가 여럿일 때만 "통찰로 시작"을 쓴다 — hardBlocked는 반전의
  // 무게를 오프닝이 아니라 종결(짧은통찰형)에 싣는 쪽이 더 세련되다는 걸
  // C24 승인본에서 확인했다(오프닝은 핵심 문장으로 바로 시작).
  if (result.severityLabel === "복합/중첩 방해축") return "통찰형";
  if (hasKind(result.supportConstraints, "yongsinCandidateWarning") || hasKind(result.supportConstraints, "huisinWarning")) return "대비형";
  if (hasKind(result.supportConstraints, "noHuisinCandidate")) return "질문형";
  return "구조설명형"; // hardBlocked 포함 — 도와줄 힘이 있으나 막힌 경우도 오프닝은 담백하게
}

function pickEndingStyle(result: WealthObstructionResult): EndingStyle {
  if (result.structuralObstructions.length === 0) return "단일원인없음형";
  // hold/unresolved(판정보류)와 "확정됐지만 지원축이 없음"(열린질문형)은
  // 서로 다른 상태다 — 전자는 용신 자체를 하나로 못 정한 것이고, 후자는
  // 용신은 정했지만 그걸 도와줄 후보가 없는 것. 같은 결론으로 뭉치면
  // 안 된다(C30/S34 승인본에서 서로 다른 종결을 쓴 이유).
  if (result.yongsinResolutionStatus !== "resolved") return "판정보류형";
  if (result.supportConstraints.length === 0) return "구조적결론형";
  if (hasKind(result.supportConstraints, "hardBlocked") || hasKind(result.supportConstraints, "yongsinCandidateWarning") || hasKind(result.supportConstraints, "huisinWarning")) {
    return "짧은통찰형";
  }
  return "열린질문형"; // noHuisinCandidate, 용신은 확정됨
}

const HOOK_BY_OPENING_STYLE: Record<Exclude<OpeningStyle, "구조설명형" | "뚜렷한주방해없음형">, string> = {
  질문형: "그런데 이 흐름을 붙잡아줄 힘은 어디에 있을까요.",
  대비형: "겉보기엔 괜찮아 보여도, 그 안에는 다른 결이 함께 있습니다.",
  통찰형: "이 사람에게는 서로 다른 결이 한 번에 겹쳐 있습니다.",
};

// 유형 자체가 이미 훅으로 강한 경우, 오프닝 스타일과 무관하게 이 문장을
// 우선 쓴다 — companionExcess는 5장 제목("남지 않는 이유")과 가장 직결
// 되는 통찰이라 승인본에서 스타일 훅보다 우선했다.
const HOOK_OVERRIDE_BY_TYPE: Partial<Record<ObstructionType, string>> = {
  분산형: `"버는 것과 남기는 것은 다르다"는 말이 이 사람에게는 유독 정확하게 들어맞습니다.`,
};

function buildOpeningParagraph(primary: StructuralObstruction, style: OpeningStyle): NarrativeParagraph {
  const explanation = OBSTRUCTION_EXPLANATION[primary.type];
  const typeHook = HOOK_OVERRIDE_BY_TYPE[primary.type];
  const hook = typeHook ?? (style === "구조설명형" ? null : HOOK_BY_OPENING_STYLE[style as Exclude<OpeningStyle, "구조설명형" | "뚜렷한주방해없음형">]);
  const text = hook ? `${hook} ${explanation}` : explanation;
  return { text, sourceNote: `structuralObstructions[0]=${primary.sourceFlag}→${primary.type}, openingStyle=${style}${typeHook ? "(유형 훅 우선)" : ""}` };
}

function buildAdditionalObstructionsParagraph(rest: StructuralObstruction[]): NarrativeParagraph {
  const shorts = rest.map((o) => OBSTRUCTION_SHORT[o.type]);
  const joined = shorts.length === 1 ? shorts[0] : shorts.slice(0, -1).join(", ") + ", " + shorts[shorts.length - 1];
  return {
    text: `여기에 ${joined}까지 함께 있어, 한 가지 결로만 설명하기는 어렵습니다.`,
    sourceNote: `structuralObstructions[1..]=${rest.map((o) => o.sourceFlag).join(",")}`,
  };
}

function buildCaveatParagraph(caveats: Caveat[]): NarrativeParagraph | null {
  if (caveats.length === 0) return null;
  const clauses: string[] = [];
  if (caveats.some((c) => c.kind === "jaeseongVsInseong")) {
    clauses.push("이 힘은 기반이 되는 힘, 받아들이는 힘을 누르는 방향으로도 작동할 수 있습니다");
  }
  if (caveats.some((c) => c.kind === "heChongSummary")) {
    clauses.push("다른 자리와 자꾸 얽히거나 부딪히는 성질까지 겹쳐 있어, 결이 한 번으로 끝나지 않을 수 있습니다");
  }
  if (caveats.some((c) => c.kind === "monthRootConflict")) {
    clauses.push("이 판정에는 약간의 애매함도 있어, 상황에 따라 조금씩 다르게 드러날 수 있습니다");
  }
  if (clauses.length === 0) return null;
  return { text: clauses.join(". ") + ".", sourceNote: `caveats=${caveats.map((c) => c.kind).join(",")}` };
}

function buildSupportParagraph(constraints: SupportConstraint[]): NarrativeParagraph {
  if (constraints.length === 0) {
    return { text: "이걸 붙잡아줄 힘은 따로 무리 없이 작동하고 있는 편입니다.", sourceNote: "supportConstraints=[] (resolved)" };
  }
  if (hasKind(constraints, "hardBlocked")) {
    return {
      text: "이걸 눌러줄 힘이 아예 없는 건 아닙니다. 다만 그 힘도 같은 종류의 무게에 함께 눌려 있어서, 있어도 온전히 쓰이지 못하는 상태에 가깝습니다.",
      sourceNote: `supportConstraints=[hardBlocked]`,
    };
  }
  if (hasKind(constraints, "yongsinCandidateWarning") || hasKind(constraints, "huisinWarning")) {
    return {
      text: "이걸 붙잡아줄 힘이 아예 없는 건 아니지만, 그 힘조차 완전히 단정하기는 어려운 상태입니다 — 같은 흔들림의 영향을 함께 받고 있는 쪽에 가깝습니다.",
      sourceNote: `supportConstraints=[warning]`,
    };
  }
  // noHuisinCandidate
  return {
    text: "이 흐름을 붙잡아 덜어줄 힘이 원국에는 뚜렷하게 자리하고 있지 않습니다.",
    sourceNote: `supportConstraints=[noHuisinCandidate]`,
  };
}

function buildHoldParagraph(): NarrativeParagraph {
  return {
    text: "이 무게를 구체적으로 무엇이 덜어줄 수 있는지는, 지금으로선 어느 한쪽을 해결책이라 단정하기 어려운 상태입니다. 여러 힘이 팽팽하게 맞서 있어 한쪽 편을 들기보다 균형 자체를 눈여겨보는 쪽이 더 정확합니다.",
    sourceNote: "yongsinResolutionStatus≠resolved",
  };
}

// 종결 — (endingStyle, 대표 유형) 조합별 우선 문구. 6명 승인본에서 검증된
// 조합은 그대로 재사용하고, 그 외 조합은 유형 무관 범용 문구로 대체한다.
const ENDING_OVERRIDE: Partial<Record<`${EndingStyle}:${ObstructionType}`, string>> = {
  "판정보류형:과부하형": "그래서 이건 풀어야 할 문제라기보다, 매일 감당하고 있는 무게에 가깝습니다.",
  "열린질문형:과부하형": "기댈 축이 뚜렷하지 않다는 건, 이 무게를 어느 한 가지 도움으로 해결하기보다 여러 조건을 함께 살펴야 하는 구조라는 뜻에 가깝습니다.",
  "짧은통찰형:압박형": "힘이 없는 게 아니라 눌려 있는 거라면, 그걸 어떻게 다시 꺼내 쓸 수 있을지가 더 중요한 질문 아닐까요.",
  "짧은통찰형:분산형": "그래서 이 구조에서는 돈을 얼마나 오래 붙잡아두느냐보다, 어떤 방향으로 흘러가느냐가 더 본질적인 질문이 됩니다.",
  "열린질문형:소모형": "그래서 이 사람에게는 얼마나 버느냐보다, 어디서 멈추고 거둬들이느냐가 더 실질적인 질문이 됩니다.",
};

const ENDING_GENERIC: Record<EndingStyle, string> = {
  단일원인없음형: "그래서 이 경우 재물이 흔들린다면, 하나의 타고난 약점보다 여러 조건이 함께 겹치는지를 보는 편이 더 정확합니다.",
  판정보류형: "그래서 이건 해결책을 찾는 문제라기보다, 지금 이 구조를 있는 그대로 받아들이는 쪽에 더 가깝습니다.",
  열린질문형: "그래서 중요한 건 어느 한쪽을 해결책으로 단정하는 것보다, 지금 이 결 자체를 있는 그대로 보는 쪽일 수 있습니다.",
  구조적결론형: "그래서 이건 문제라기보다, 이 사람이 재물을 다루는 하나의 방식에 가깝습니다.",
  짧은통찰형: "그래서 이 힘을 온전히 믿기보다, 함께 흔들리고 있다는 것 자체를 감안하는 편이 더 정확합니다.",
};

function buildEndingParagraph(style: EndingStyle, primaryType: ObstructionType | null): NarrativeParagraph {
  const overrideKey = primaryType ? (`${style}:${primaryType}` as const) : undefined;
  const text = (overrideKey && ENDING_OVERRIDE[overrideKey]) || ENDING_GENERIC[style];
  return { text, sourceNote: `endingStyle=${style}${primaryType ? `, primaryType=${primaryType}` : ""}` };
}

function buildZeroObstructionOpening(): NarrativeParagraph {
  return { text: "이 사람은 하나의 구조적 약점으로 설명되는 쪽이 아닙니다.", sourceNote: "structuralObstructions=[]" };
}
function buildZeroObstructionExplanation(): NarrativeParagraph {
  return {
    text: "재물을 다루는 데 있어 유독 두드러지게 걸리는 지점이 따로 없다는 뜻이라, 오히려 어느 한 가지 습관으로 이 사람을 단순하게 설명하기는 어렵습니다.",
    sourceNote: "structuralObstructions=[] + severityLabel=뚜렷한 주방해 없음",
  };
}
function buildZeroObstructionSupportNote(): NarrativeParagraph {
  return {
    text: "뚜렷하게 걸리는 지점이 없다 보니, 특별히 기대야 할 하나의 축도 따로 정해져 있지 않습니다.",
    sourceNote: "supportConstraints=[]",
  };
}

export function generateWealthObstructionNarrative(result: WealthObstructionResult): WealthObstructionNarrativeResult {
  const paragraphs: NarrativeParagraph[] = [];
  const n = result.structuralObstructions.length;

  if (n === 0) {
    paragraphs.push(buildZeroObstructionOpening());
    paragraphs.push(buildZeroObstructionExplanation());
    const caveatPara = buildCaveatParagraph(result.caveats);
    if (caveatPara) paragraphs.push(caveatPara);
    // 출시 전 감사(F-1) — structuralObstructions가 비어 있어도
    // supportConstraints/yongsinResolutionStatus는 이미 독립적으로 계산돼
    // 있다(analyzeWealthObstruction 참고). 이전에는 이 두 값을 무시하고
    // 항상 같은 두 문장(SupportNote·단일원인없음형)만 썼는데, 이미 있는
    // 데이터를 그대로 사용하도록 바꾼다 — 새 판정 기준을 만들지 않고,
    // 비어있지 않은 분기에서는 n≥1일 때 이미 쓰던 것과 같은 함수
    // (buildSupportParagraph/buildEndingParagraph)를 그대로 재사용한다.
    paragraphs.push(
      result.supportConstraints.length > 0 ? buildSupportParagraph(result.supportConstraints) : buildZeroObstructionSupportNote()
    );
    paragraphs.push(
      buildEndingParagraph(result.yongsinResolutionStatus !== "resolved" ? "판정보류형" : "단일원인없음형", null)
    );
    return { paragraphs };
  }

  const openingStyle = pickOpeningStyle(result);
  const primary = result.structuralObstructions[0];
  paragraphs.push(buildOpeningParagraph(primary, openingStyle));

  if (n >= 2) {
    paragraphs.push(buildAdditionalObstructionsParagraph(result.structuralObstructions.slice(1)));
  }

  const caveatPara = buildCaveatParagraph(result.caveats);
  if (caveatPara) paragraphs.push(caveatPara);

  if (result.yongsinResolutionStatus !== "resolved") {
    paragraphs.push(buildHoldParagraph());
  } else {
    paragraphs.push(buildSupportParagraph(result.supportConstraints));
  }

  const endingStyle = pickEndingStyle(result);
  paragraphs.push(buildEndingParagraph(endingStyle, primary.type));

  return { paragraphs };
}
