import { ChapterFourKey } from "./chapterFourInterpretation";
import { WealthObstructionResult } from "./wealthObstructionAnalysis";
import { WealthTimingResult, TimingLabel } from "./wealthTimingAnalysis";
import { SipseongCategory } from "./strengthAnalysis";

/**
 * 4장 ↔ 5장 ↔ 6장 연결 문장 presentation layer.
 *
 * 새 명리 판단을 만들지 않는다 — 이미 계산·확정된 세 장의 결과값만 비교해
 * "관점이 다를 뿐 모순이 아니다"를 설명하는 최대 1~2문장짜리 연결문만
 * 만든다. 연결이 필요 없으면 undefined를 반환한다(모든 사람에게 강제로
 * 넣지 않는다).
 *
 * 이 파일은 4장/5장/6장의 계산·서술 함수를 전혀 수정하지 않는다(읽기만
 * 한다). 연결문 자체도 "강하다=좋다=키워라" 같은 새 결론이나 행동 처방을
 * 만들지 않고, 두 장의 층위 차이(원국 전체 강함 vs 감당 능력, 원국 구조
 * vs 현재 시기)만 설명한다.
 *
 * 60명 회귀검증에서 발동 조건(5/60, 25/60)은 그대로 동결됐다 — 이번
 * 개정은 "같은 조건에 걸린 사람들이 전부 똑같은 문장을 받는" 문제만
 * 고친다. 문장 선택은 랜덤이 아니라, 6장이 이미 계산해 둔 공격측
 * 카테고리(ATTACKS 관계, 6장 ATTACK_FLAVOR와 동일한 의미)와 5장의
 * caveats/supportConstraints 유무만으로 결정한다 — 둘 다 이미 존재하는
 * 계산값이라 새 판정이 아니다.
 */

export interface WealthChapterBridge {
  /** 4장 마지막 문단 뒤, 5장 첫 문단 앞에 넣는 연결문. */
  chapter4To5?: string;
  /** 5장 마지막 문단 뒤, 6장 첫 문단 앞에 넣는 연결문. */
  chapter5To6?: string;
}

const DISPERSING_LABELS: TimingLabel[] = ["분산/흔들림형(D)", "부담형(B)"];

function currentTimingLabel(ch6: WealthTimingResult): TimingLabel | null {
  if (!ch6.applicable || !ch6.currentDaYun) return null;
  return ch6.currentDaYun.classification.label;
}

// ── 5→6(분산/흔들림형D) 문장을 공격측 카테고리별로 번역한다. 6장
// wealthTimingNarrative.ts의 ATTACK_FLAVOR와 같은 5개 관계(ATTACKS
// 공격측→피공격측)를 "원국은 무난한데 지금 이 결이 겹친다"는 다리
// 문맥에 맞게 다시 쓴 것뿐 — 새 관계 아니다. 실제 지출·소득 증가나
// 심리 상태를 확정하지 않도록 전부 "~하기 쉬운 결" 수준으로 헤지했다.
const ATTACKER_BRIDGE_D: Record<SipseongCategory, string> = {
  비겁: "타고난 구조에서 막는 힘이 뚜렷하진 않아도, 지금 이 10년에는 손에 쥔 것이 여러 방향으로 나뉘기 쉬운 결이 겹쳐 있습니다.",
  식상: "타고난 구조에서 막는 힘이 뚜렷하진 않아도, 지금 이 10년에는 움직이고 벌이는 쪽이 앞서면서 변수도 함께 늘어나기 쉬운 결이 겹쳐 있습니다.",
  재성: "타고난 구조에서 막는 힘이 뚜렷하진 않아도, 지금 이 10년에는 재물 자체의 움직임이 커지면서 여러 방향으로 갈라지기 쉬운 결이 겹쳐 있습니다.",
  인성: "타고난 구조에서 막는 힘이 뚜렷하진 않아도, 지금 이 10년에는 재물보다 다른 힘이 앞서면서 흐름 자체가 더뎌지기 쉬운 결이 겹쳐 있습니다.",
  관성: "타고난 구조에서 막는 힘이 뚜렷하진 않아도, 지금 이 10년에는 책임과 관리 쪽이 앞서면서 재물을 운용하는 폭이 좁아지기 쉬운 결이 겹쳐 있습니다.",
};

const BRIDGE_B = "타고난 구조에서 막는 힘이 뚜렷하진 않아도, 지금 이 10년은 재물과 관련해 신경 쓸 것이 많아지는 결이 겹쳐 있습니다.";

// caveats가 하나라도 있으면(재극인 경향·합충 등 이미 5장이 참고한
// 보조 근거) 같은 attacker라도 결이 한 겹 더 있다는 것만 짧게 덧붙인다.
// caveat의 구체 내용(어떤 관계인지)은 5장이 이미 말했으므로 여기서는
// 반복하지 않고 "한 겹 더 있다"는 사실만 짧게 얹는다.
const CAVEAT_TAIL = " 여기에 다른 조건도 함께 겹쳐 있어, 이 결이 한 번 더 흔들릴 수 있습니다.";

function buildDisperseBridge(currentLabel: TimingLabel, attacker: SipseongCategory | null, hasCaveat: boolean): string {
  if (currentLabel === "부담형(B)") return BRIDGE_B;
  const base = attacker ? ATTACKER_BRIDGE_D[attacker] : ATTACKER_BRIDGE_D.비겁;
  return hasCaveat ? base + CAVEAT_TAIL : base;
}

// ── 4→5(강함↔wealthExcess) 문장 — supportConstraint/yongsinResolutionStatus
// 로 이미 계산돼 있는 "도움축 상태"가 다르면, 강함과 감당력이 갈라지는
// 이유의 뉘앙스도 다르게 짚는다. 계산 차이가 없으면(=조건 동일) 억지로
// 문장을 나누지 않는다.
function buildStrengthVsExcessBridge(ch5: WealthObstructionResult): string {
  if (ch5.yongsinResolutionStatus !== "resolved") {
    return "재물의 힘이 강한 것과, 그걸 감당할 하나의 방향이 뚜렷한 것은 다른 이야기입니다.";
  }
  const hasWarning = ch5.supportConstraints.some((c) => c.kind === "yongsinCandidateWarning" || c.kind === "huisinWarning");
  if (hasWarning) {
    return "재물의 힘이 강하다는 것이, 그 힘을 다루는 다른 축까지 안정적으로 작동한다는 뜻은 아닙니다.";
  }
  return "재물의 힘이 강한 것과, 그 힘을 편하게 감당하는 것은 또 다른 문제입니다.";
}

export function buildWealthChapterBridge(ch4Key: ChapterFourKey, ch5: WealthObstructionResult, ch6: WealthTimingResult): WealthChapterBridge {
  const bridge: WealthChapterBridge = {};

  const hasWealthExcess = ch5.structuralObstructions.some((o) => o.sourceFlag === "wealthExcess");
  if (ch4Key.jaeseong.exposure === "뚜렷" && hasWealthExcess) {
    bridge.chapter4To5 = buildStrengthVsExcessBridge(ch5);
  }

  const currentLabel = currentTimingLabel(ch6);
  if (currentLabel) {
    const noStructuralObstruction = ch5.structuralObstructions.length === 0;
    const hasStructuralObstruction = ch5.structuralObstructions.length > 0;

    if (noStructuralObstruction && DISPERSING_LABELS.includes(currentLabel)) {
      const attacker = ch6.currentDaYun!.period.ganCategory;
      bridge.chapter5To6 = buildDisperseBridge(currentLabel, attacker, ch5.caveats.length > 0);
    } else if (hasStructuralObstruction && currentLabel === "강화형(A)") {
      bridge.chapter5To6 =
        "다만 이 흐름이 항상 불리하게만 작동하는 건 아닙니다. 지금 이 시기는 재물 쪽 조건 자체가 우호적으로 움직이고 있어, 평소보다 그 무게를 다루기가 한결 수월할 수 있습니다.";
    }
  }

  return bridge;
}
