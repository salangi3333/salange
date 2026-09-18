import { WealthObstructionResult, StructuralObstruction, SupportConstraint, Caveat, ObstructionType } from "./wealthObstructionAnalysis";
import { ChapterFourKey } from "./chapterFourInterpretation";
import { SipseongCategory } from "./strengthAnalysis";

/**
 * 5장("돈이 들어와도 남지 않는 이유") — 1~4장 승인 기준 스크래치본.
 * 계산은 프로덕션 lib/wealthObstructionAnalysis.ts와 100% 동일 — import만
 * 하고 손대지 않는다. lib/wealthObstructionNarrative.ts의 구조(문단 순서,
 * openingStyle/endingStyle 분기, 5가지 유형 차이, 판정 원칙)를 그대로
 * 복사하고, 조사에서 발견된 3가지 문제만 최소 수정했다.
 *
 * [수정 1] structuralObstructions=없음 버킷(실측 92%가 여기 몰림)에
 * buildZeroObstructionTiltParagraph()를 추가 — 이미 계산된 4장 값
 * (ch4Key.wealth.all[0].category, 즉 topAxis)으로 "완전히 치우치진
 * 않았지만 그래도 이 사람만의 기울기는 있다"는 문단을 넣는다. 새 계산
 * 없음 — topAxis 5종만으로 5가지 변형.
 *
 * [수정 2] 4장→5장 연결. 별도 production 파일(lib/wealthChapterBridge.ts)
 * 의 bridgeIntro 필드는 건드리지 않았다(production/판정 로직 보호 원칙,
 * 이 함수의 트리거 조건도 극히 좁아 대부분 비어있음). 대신 수정1의
 * 문단이 "4장의 상대비교 결과 vs 5장의 절대판정"을 문단 안에서 자연스럽게
 * 이어주도록 설계해 같은 목적을 달성했다 — 별도 스크래치 파일을 더
 * 만들지 않고 한 파일 안에서 해결.
 *
 * [수정 3] 5가지 OBSTRUCTION_EXPLANATION 각각에 OBSTRUCTION_SCENE(구체적
 * 행동 한 줄)을 추가 — "각 유형마다 반드시 추가"가 아니라 5개뿐인 고정
 * 유형 각각에 실제로 다른 장면을 달아 개인화를 높였다. 계산되지 않은
 * 사건(사업/투자/가족 등)은 전혀 포함하지 않았다.
 *
 * 보존(원문 그대로, 이번에 안 건드림): OBSTRUCTION_EXPLANATION 원문,
 * openingStyle/endingStyle 분기 로직 전체, buildCaveatParagraph,
 * buildSupportParagraph, buildHoldParagraph, buildAdditionalObstructionsParagraph,
 * ENDING_OVERRIDE/ENDING_GENERIC, 내부 용어 비노출 원칙, 사건 조작 금지 원칙.
 */

export interface NarrativeParagraph {
  text: string;
  sourceNote: string;
}

export interface WealthObstructionNarrativeResult {
  paragraphs: NarrativeParagraph[];
}

// ── [보존, 원문 그대로] 구조적 방해축 → 현실 언어 번역 ──
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

// [신규 — 수정3] 유형별 구체적 행동 한 줄. 계산되지 않은 사건(사업/투자/
// 가족 등)은 없고, 전부 "기회/손실/약속 앞에서 어떻게 움직이는가" 수준의
// 일반적 행동 경향만 담았다.
const OBSTRUCTION_SCENE: Record<ObstructionType, string> = {
  과부하형: "그래서 다뤄야 할 돈이나 기회가 한꺼번에 몰리면, 정작 다 챙기지 못해 오히려 지치는 순간이 올 수 있습니다.",
  분산형: "새로운 기회가 보이면, 지키기보다 다시 움직이려는 쪽으로 먼저 마음이 갑니다.",
  소모형: "벌인 일이 잘 풀려도, 그 결과를 붙잡아두기보다 곧바로 다음 일로 넘어가는 편입니다.",
  제동형: "그래서 손실 가능성이 조금이라도 보이면, 먼저 멈추고 다시 확인한 뒤에야 움직입니다.",
  압박형: "돈보다 맡은 일이나 지켜야 할 약속이 먼저 떠오르면, 그 일부터 끝내야 마음이 놓입니다.",
};

// ── [보존, 원문 그대로] ──
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

// ── [보존, 원문 그대로] ──
function pickOpeningStyle(result: WealthObstructionResult): OpeningStyle {
  if (result.structuralObstructions.length === 0) return "뚜렷한주방해없음형";
  if (result.severityLabel === "복합/중첩 방해축") return "통찰형";
  if (hasKind(result.supportConstraints, "yongsinCandidateWarning") || hasKind(result.supportConstraints, "huisinWarning")) return "대비형";
  if (hasKind(result.supportConstraints, "noHuisinCandidate")) return "질문형";
  return "구조설명형";
}

function pickEndingStyle(result: WealthObstructionResult): EndingStyle {
  if (result.structuralObstructions.length === 0) return "단일원인없음형";
  if (result.yongsinResolutionStatus !== "resolved") return "판정보류형";
  if (result.supportConstraints.length === 0) return "구조적결론형";
  if (hasKind(result.supportConstraints, "hardBlocked") || hasKind(result.supportConstraints, "yongsinCandidateWarning") || hasKind(result.supportConstraints, "huisinWarning")) {
    return "짧은통찰형";
  }
  return "열린질문형";
}

const HOOK_BY_OPENING_STYLE: Record<Exclude<OpeningStyle, "구조설명형" | "뚜렷한주방해없음형">, string> = {
  질문형: "그런데 이 흐름을 붙잡아줄 힘은 어디에 있을까요.",
  대비형: "겉보기엔 괜찮아 보여도, 그 안에는 다른 결이 함께 있습니다.",
  통찰형: "이 사람에게는 서로 다른 결이 한 번에 겹쳐 있습니다.",
};

const HOOK_OVERRIDE_BY_TYPE: Partial<Record<ObstructionType, string>> = {
  분산형: `"버는 것과 남기는 것은 다르다"는 말이 이 사람에게는 유독 정확하게 들어맞습니다.`,
};

// [수정3] explanation 뒤에 OBSTRUCTION_SCENE 한 줄을 더 붙였다. 훅 선택
// 로직과 explanation 원문은 그대로다.
function buildOpeningParagraph(primary: StructuralObstruction, style: OpeningStyle): NarrativeParagraph {
  const explanation = OBSTRUCTION_EXPLANATION[primary.type];
  const scene = OBSTRUCTION_SCENE[primary.type];
  const typeHook = HOOK_OVERRIDE_BY_TYPE[primary.type];
  const hook = typeHook ?? (style === "구조설명형" ? null : HOOK_BY_OPENING_STYLE[style as Exclude<OpeningStyle, "구조설명형" | "뚜렷한주방해없음형">]);
  const text = hook ? `${hook} ${explanation} ${scene}` : `${explanation} ${scene}`;
  return { text, sourceNote: `structuralObstructions[0]=${primary.sourceFlag}→${primary.type}, openingStyle=${style}${typeHook ? "(유형 훅 우선)" : ""} [+수정3: scene]` };
}

// ── [보존, 원문 그대로] ──
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
    // [수정] "이 판정에는"이 앞에 받는 대상 없이 계산 과정 자체를 가리켜
    // 읽는 사람이 "무슨 판정?"이라고 되물을 수 있었다. "이 부분은"으로
    // 바꿔 사람의 특성을 가리키게 하고, 의미(상황마다 다르게 드러날 수
    // 있다는 것)는 그대로 유지했다.
    clauses.push("다만 이 부분은 상황에 따라 조금씩 다르게 드러날 수 있어, 딱 잘라 말하기는 어렵습니다");
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

// [신규 — 수정1+수정2] "구조적 과다 없음" 92% 동일 문제 해결 + 4→5장
// 자연스러운 연결을 한 문단에서 함께 처리한다. topAxis(이미 계산된 4장
// 값, 새 계산 아님)로 5가지 변형. 첫 문장이 "4장의 상대비교 결과와 이번
// 장의 절대판정은 다른 질문"이라는 걸 자연스럽게 잇는 다리 역할도 한다.
const TILT_BY_AXIS: Record<SipseongCategory, string> = {
  비겁: "돈이 생겨도 가만히 쥐고 있기보다, 다시 움직이거나 새로운 시도에 써보고 싶어지는 쪽으로 살짝 기웁니다.",
  식상: "결과를 만들어내고 표현하는 쪽에 마음이 먼저 가서, 벌어들인 걸 붙잡아두기보다 계속 움직이게 하는 쪽으로 살짝 기웁니다.",
  재성: "눈에 보이는 결과와 실익을 먼저 확인하려는 쪽으로 살짝 기울어서, 확실하지 않은 것에는 잘 안 움직입니다.",
  관성: "돈을 움직이기 전에 맡은 역할이나 책임부터 챙기려는 쪽으로 살짝 기웁니다.",
  인성: "바로 움직이기보다 먼저 이해하고 납득한 뒤에 움직이려는 쪽으로 살짝 기웁니다.",
};

function buildZeroObstructionTiltParagraph(ch4Key: ChapterFourKey): NarrativeParagraph {
  const topAxis = ch4Key.wealth.all[0].category;
  return {
    text: `완전히 어느 한쪽으로 치우친 구조는 아니지만, 그렇다고 모든 힘이 똑같은 무게로 움직이는 것도 아닙니다. ${TILT_BY_AXIS[topAxis]}`,
    sourceNote: `[신규 수정1+2] ch4Key.wealth.all[0].category=${topAxis} (이미 계산된 4장 topAxis 재사용, 새 계산 없음)`,
  };
}

export function generateWealthObstructionNarrative(
  result: WealthObstructionResult,
  ch4Key: ChapterFourKey
): WealthObstructionNarrativeResult {
  const paragraphs: NarrativeParagraph[] = [];
  const n = result.structuralObstructions.length;

  if (n === 0) {
    paragraphs.push(buildZeroObstructionOpening());
    paragraphs.push(buildZeroObstructionExplanation());
    paragraphs.push(buildZeroObstructionTiltParagraph(ch4Key)); // [신규]
    const caveatPara = buildCaveatParagraph(result.caveats);
    if (caveatPara) paragraphs.push(caveatPara);
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
