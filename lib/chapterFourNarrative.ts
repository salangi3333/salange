import { AppData } from "./sajuContent";
import { Stage } from "./natalStructure";
import { ChapterFourKey, EvidencePosition } from "./chapterFourInterpretation";
import { SipseongCategory } from "./strengthAnalysis";
import { DaYunWealthPeriod } from "./daYunWealthAnalysis";

/**
 * 4챕터("금전운의 흐름") — 1·2·3장 승인 문체 기준 스크래치본. 계산은
 * 프로덕션 lib/chapterFourInterpretation.ts와 100% 동일 — buildChapterFourKey를
 * 그대로 재사용하고, 그 파일은 import만 하고 손대지 않는다.
 *
 * 이번 라운드에 바뀐 것(1·2·3장과 같은 방향):
 *  1. "사주에는 [위치]에 [용어]가 자리하고 있습니다" 순서를 "실제로 어떻게
 *     돈을 대하는지(행동) → 명리에서는 이걸 X라고 부릅니다(용어)" 순서로
 *     뒤집었다. 용어 자체는 삭제하지 않았다.
 *  2. 십성 용어마다 "그래서 실제로 어떤 돈 습관이 나타나는지"(WEALTH_BEHAVIOR)
 *     문장을 새로 추가했다 — 기존 SIPSEONG_GLOSS(뜻풀이)만으로 끝내지 않는다.
 *  3. 대운 문단의 "천간에는 X가 자리합니다. 지지 지장간에는 Y가 자리합니다"
 *     이중 사실-나열을 "그 시기엔 이런 식으로 돈을 대하게 됩니다" 의미
 *     문장을 먼저 말하고, 용어는 가벼운 괄호로만 뒤에 붙이는 방식으로
 *     바꿨다.
 *  4. WEALTH_HOOK(모든 고객에게 100% 동일했던 고정 훅)을 재성 노출도×
 *     dominant(둘 다 이미 계산된 값)로 4갈래 분기시켰다.
 *  5. "비겁이 재성보다 강해서 재물이 흩어지기 쉽다"는 같은 핵심 메시지가
 *     무료 마지막 문단/유료 흔들림 문단/유료 조언 문단 세 곳에서 거의
 *     같은 표현으로 반복되던 것을, 각각 "커지는 국면"/"새는 구체적 장면"/
 *     "그래서 무엇을 하면 좋은지"로 역할을 분명히 나눴다.
 *
 * 보존(계산/판정 조건 전부 원문 그대로): analyzeWealthCategoryStrength,
 * dayMasterRoot, 재성 exposure/dominant 판정, 4개 비교쌍(비겁vs재성 등),
 * siksangJaeseongLinked, heChongOnWealth, daYun(past/current/next/
 * priorWealthSignal), glossOnFirstUse 1회 노출 원칙, publicPreview 400자
 * 미만 시 보강 로직, publicPreview/lockedDetail 분리 구조.
 */

const STAGE_LABEL: Record<Stage, string> = {
  year: "초년의 자리",
  month: "사회로 나가는 자리",
  day: "자기 자신이 선 자리",
  hour: "말년의 자리",
};

function josaGwaWa(word: string): "과" | "와" {
  const last = word.charCodeAt(word.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return "와";
  return (last - 0xac00) % 28 === 0 ? "와" : "과";
}

function josaIGa(word: string): "이" | "가" {
  const last = word.charCodeAt(word.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return "가";
  return (last - 0xac00) % 28 === 0 ? "가" : "이";
}

function josaEulReul(word: string): "을" | "를" {
  const last = word.charCodeAt(word.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return "를";
  return (last - 0xac00) % 28 === 0 ? "를" : "을";
}

function josaEunNeun(word: string): "은" | "는" {
  const last = word.charCodeAt(word.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return "는";
  return (last - 0xac00) % 28 === 0 ? "는" : "은";
}

function joinKorean(items: string[]): string {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]}${josaGwaWa(items[0])} ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, ${items[items.length - 1]}`;
}

function stageList(stages: Stage[]): string {
  return joinKorean(stages.map((s) => STAGE_LABEL[s]));
}

// ────────────────────────────────────────────────────────────────
// 십성 용어 — [보존] 뜻풀이는 원문 그대로, [신규] 돈 습관 문장만 추가.
// ────────────────────────────────────────────────────────────────

const SIPSEONG_HANJA: Record<string, string> = {
  비견: "比肩", 겁재: "劫財", 식신: "食神", 상관: "傷官",
  편재: "偏財", 정재: "正財", 편관: "偏官", 정관: "正官",
  편인: "偏印", 정인: "正印",
};

const SIPSEONG_GLOSS: Record<string, string> = {
  비견: "나와 같은 힘으로 나란히 서서, 스스로 판단하고 움직이게 하는 기운",
  겁재: "내 것을 나누거나 다시 다른 곳으로 움직이게 만드는 기운",
  식신: "서두르지 않고 차분하게 결과물을 만들어 쌓아가는 기운",
  상관: "생각한 것을 적극적으로 표현하고 벌이게 만드는 기운",
  편재: "한곳에 고정되어 쌓이는 돈보다, 기회와 자원을 움직이며 만들어내는 재물의 성질",
  정재: "꾸준하고 안정적으로 들어와 쌓이는 재물의 성질",
  편관: "상황 앞에서 즉각 움직이게 만드는 기운",
  정관: "정해진 기준과 책임을 지키게 하는 기운",
  편인: "남다른 방식으로 받아들이고 정리하는 기운",
  정인: "안정적으로 받아들이고 신뢰를 쌓아가는 기운",
};

/** [신규] "그래서 실제로 이 사람은 돈을 어떻게 다루는가"까지 내려가는
 * 한 줄 — 1~3장의 "구체적 장면 찾기" 기법을 재물 버전으로 적용했다. */
const WEALTH_BEHAVIOR: Record<string, string> = {
  비견: "그래서 여럿이 함께 돈을 쓰는 자리에서도, 남 눈치를 보기보다는 자기 몫을 정확히 챙기는 쪽에 가깝습니다.",
  겁재: "그래서 목돈이 생겨도 혼자 오래 쥐고 있기보다, 누군가와 나누거나 새 판을 벌이는 데 다시 쓰는 일이 잦습니다.",
  식신: "그래서 한 번에 크게 버는 것보다, 꾸준히 만들어낸 것들이 시간이 지나 자연스럽게 돈으로 돌아오는 쪽을 더 편하게 느낍니다.",
  상관: "그래서 아이디어를 붙잡고만 있기보다 일단 벌여서 보여주는 편이고, 그 과정에서 돈이 따라붙습니다.",
  편재: "그래서 안정된 구조보다, 기회를 보고 움직여서 판을 키우는 쪽에서 더 큰 결과를 냅니다.",
  정재: "그래서 크게 한 방을 노리기보다, 조금씩이라도 꾸준히 쌓이는 구조를 훨씬 편안하게 느낍니다.",
  편관: "그래서 갑자기 돈 쓸 일이 생겨도 당황하기보다, 오히려 그 순간에 더 빠르게 결정하고 움직입니다.",
  정관: "그래서 예산이나 계획이 정해진 틀 안에서 돈을 쓸 때 마음이 편하고, 즉흥적인 지출은 잘 안 맞습니다.",
  편인: "그래서 남들이 안 보는 기회를 먼저 알아채면서도, 실제로 움직이기 전엔 한 번 더 따져보고 정리하는 편입니다.",
  정인: "그래서 낯선 곳에 혼자 뛰어들기보다, 믿을 만한 사람이나 검증된 구조를 통해 돈을 맡기거나 벌 때 더 안심합니다.",
};

const CATEGORY_MONEY_ROUTE: Record<SipseongCategory, string> = {
  비겁: "스스로의 판단과 실행",
  식상: "표현하고 만들어내는 활동",
  재성: "재물 그 자체",
  관성: "맡은 역할과 책임",
  인성: "관계와 신뢰",
};

function termDisplay(term: string): string {
  const hanja = SIPSEONG_HANJA[term];
  return hanja ? `${term}(${hanja})` : term;
}

/** [보존, 원문 그대로] 용어가 처음 등장할 때만 뜻풀이를 반환한다. */
function glossOnFirstUse(term: string, usedTerms: Set<string>): string {
  if (usedTerms.has(term)) return "";
  usedTerms.add(term);
  const gloss = SIPSEONG_GLOSS[term];
  return gloss ? ` ${term}${josaEunNeun(term)} ${gloss}입니다.` : "";
}

function describePosition(e: EvidencePosition): string {
  if (e.slot === "지장간") return `${STAGE_LABEL[e.stage]} 지장간(${e.hidePosition})`;
  return `${STAGE_LABEL[e.stage]} ${e.slot}`;
}

/** [보존, 원문 그대로] */
function pickLeadEvidence(list: EvidencePosition[]): EvidencePosition | null {
  const visible = list.filter((e) => e.slot !== "지장간");
  if (visible.length > 0) return visible[0];
  const weight: Record<string, number> = { 본기: 3, 중기: 2, 여기: 1 };
  const sorted = [...list].sort((a, b) => (weight[b.hidePosition ?? ""] ?? 0) - (weight[a.hidePosition ?? ""] ?? 0));
  return sorted[0] ?? null;
}

// ────────────────────────────────────────────────────────────────
// 1. 타고난 재물 구조 (PUBLIC)
// ────────────────────────────────────────────────────────────────

/** [보존, 원문 그대로] */
function buildDayMasterRootClause(key: ChapterFourKey): string {
  const { dayMasterRoot } = key;
  if (dayMasterRoot.hasRoot) {
    const stages = [...new Set(dayMasterRoot.matches.map((m) => m.stage))].map((s) => STAGE_LABEL[s]);
    return ` 여기에 더해 ${joinKorean(stages)}에 자기 자신의 뿌리가 내려 있어, 이 재물의 흐름을 받쳐주는 바탕 자체는 쉽게 흔들리지 않습니다.`;
  }
  return " 다만 자기 자신의 뿌리내릴 자리가 마땅치 않아, 한 가지 방식을 오래 고집하기보다 상황에 따라 재물을 대하는 방식도 함께 조정하는 편입니다.";
}

/** [수정] 400자 미만일 때만 호출되는 보강 문장 — 위치+용어 나열 대신
 * 행동까지 붙였다. 호출 조건(400자 미만)과 어떤 축을 고르는지의 로직은
 * 원문 그대로. */
function buildLengthBoostClause(key: ChapterFourKey, usedTerms: Set<string>): string {
  const topAxis = key.wealth.all[0].category;
  const exclude = new Set<SipseongCategory>([topAxis, "식상", "재성"]);
  const fresh = key.wealth.all.map((c) => c.category).find((c) => !exclude.has(c) && pickLeadEvidence(key.evidenceByCategory[c]));
  if (!fresh) return "";
  const evidence = pickLeadEvidence(key.evidenceByCategory[fresh])!;
  const disp = termDisplay(evidence.sipseong);
  const behavior = WEALTH_BEHAVIOR[evidence.sipseong] ?? "";
  return ` 이 외에 ${disp}${josaIGa(evidence.sipseong)} 하나 더 섞여 있어, 재물을 대하는 방식에 또 다른 결이 함께 있습니다.${glossOnFirstUse(evidence.sipseong, usedTerms)} ${behavior}`;
}

/** [수정] "사주에는 [위치]에 [용어]가 자리하고 있습니다" 순서를 뒤집었다.
 * 실제 돈을 대하는 행동을 먼저 말하고, 그 근거인 용어를 뒤에 붙인다.
 * exposure 분기(뚜렷/숨음/미미)와 evidence를 고르는 로직은 그대로다. */
function buildOpeningParagraphs(name: string, key: ChapterFourKey, usedTerms: Set<string>): string[] {
  const { jaeseong, evidenceByCategory, wealth } = key;
  const paras: string[] = [];

  if (jaeseong.exposure !== "미미") {
    const lead = pickLeadEvidence(jaeseong.evidence)!;
    const disp1 = termDisplay(lead.sipseong);
    const behavior1 = WEALTH_BEHAVIOR[lead.sipseong] ?? "";
    // [최소수정] exposure="숨음"일 때 "손에 잡히는"(가시적 뉘앙스) 리드
    // 문장이 killpoint/hook의 "겉이 아니라 안에서 움직입니다"와 모순되던
    // 문제를 고쳤다 — exposure 값(이미 계산됨)으로 리드 문장만 분기.
    const openLine =
      jaeseong.exposure === "숨음"
        ? `${name}님에게는 재물이 겉으로 드러나기보다, 안쪽 깊숙한 곳에서 움직이는 결이 있습니다.`
        : `${name}님에게는 재물이 실제로 손에 잡히는 결이 있습니다.`;
    let sentence = `${openLine} 명리에서는 이 성질을 ${disp1}라고 부릅니다.${glossOnFirstUse(lead.sipseong, usedTerms)} ${behavior1}`;

    const second = jaeseong.evidence.find((e) => e !== lead && e.sipseong !== lead.sipseong) ?? jaeseong.evidence.find((e) => e !== lead);
    if (second && second.sipseong === lead.sipseong) {
      sentence += ` 이 결이 한 번으로 끝나지 않고, 다른 자리에도 같은 성질의 뿌리가 하나 더 있어서 이 재물의 흐름이 한 곳에 그치지 않습니다.`;
    } else if (second) {
      const disp2 = termDisplay(second.sipseong);
      const behavior2 = WEALTH_BEHAVIOR[second.sipseong] ?? "";
      sentence += ` 그런데 이 성질 하나만 있는 게 아닙니다 — ${disp2}${josaIGa(second.sipseong)} 함께 있어서, 재물이 한 가지 방식으로만 움직이지 않습니다.${glossOnFirstUse(second.sipseong, usedTerms)} ${behavior2}`;
    }
    sentence += buildDayMasterRootClause(key);
    paras.push(sentence);
  } else {
    const topAxis = wealth.all[0].category;
    const topEvidence = pickLeadEvidence(evidenceByCategory[topAxis]);
    let sentence: string;
    if (topEvidence) {
      const disp = termDisplay(topEvidence.sipseong);
      const behavior = WEALTH_BEHAVIOR[topEvidence.sipseong] ?? "";
      sentence = `${name}님의 재물은 이 사주 앞면에 바로 드러나 있지 않습니다. 대신 ${disp}${josaIGa(topEvidence.sipseong)} 실제로 자리하고 있어서, 이 힘을 거쳐 돈이 현실로 이어지는 쪽에 가깝습니다.${glossOnFirstUse(topEvidence.sipseong, usedTerms)} ${behavior}`;
    } else {
      sentence = `${name}님의 재물은 이 명식 전면에서 바로 드러나는 구조보다, ${CATEGORY_MONEY_ROUTE[topAxis]}${josaEulReul(CATEGORY_MONEY_ROUTE[topAxis])} 거쳐 현실적인 결과로 연결되는 쪽에 가깝습니다.`;
    }
    sentence += buildDayMasterRootClause(key);
    paras.push(sentence);
  }

  return paras;
}

// ────────────────────────────────────────────────────────────────
// 2. 돈을 만드는 방식 — 식상生財 (PUBLIC)
// ────────────────────────────────────────────────────────────────

/** [수정] 용어를 먼저 던지지 않고, 행동 장면부터 시작한다. */
function buildMakingParagraph(key: ChapterFourKey, usedTerms: Set<string>): string {
  const { siksangJaeseongLinked, evidenceByCategory } = key;
  const siksangEvidence = pickLeadEvidence(evidenceByCategory.식상);

  if (siksangJaeseongLinked && siksangEvidence) {
    const disp = termDisplay(siksangEvidence.sipseong);
    const behavior = WEALTH_BEHAVIOR[siksangEvidence.sipseong] ?? "";
    return `스스로 만들거나 내놓은 결과물이 곧 수익의 형태로 바뀌는 길이 이 사람에게는 원래부터 있습니다. 명리에서는 이 힘을 ${disp}${josaGwaWa(siksangEvidence.sipseong)} 재물이 이어지는 흐름으로 봅니다.${glossOnFirstUse(siksangEvidence.sipseong, usedTerms)} ${behavior}`;
  }
  if (siksangJaeseongLinked) {
    return "만들어내는 힘과 재물이 이어지는 길 자체는 있지만, 그 힘이 겉으로 크게 드러나 있지는 않습니다. 결과물을 한 번에 큰돈으로 바꾸기보다, 천천히 흔적을 쌓아가는 쪽에 가깝습니다.";
  }
  const otherLead = key.wealth.all.find((c) => c.category !== "식상" && c.category !== "재성");
  const route = otherLead ? CATEGORY_MONEY_ROUTE[otherLead.category] : "다른 힘";
  const otherEvidence = otherLead ? pickLeadEvidence(evidenceByCategory[otherLead.category]) : null;
  const cite = otherEvidence ? `앞서 말한 ${termDisplay(otherEvidence.sipseong)}의 힘, 곧 ` : "";
  return `이 사람에게 돈이 만들어지는 길은 새로 벌여 결과를 내놓는 방식보다, ${cite}${route}${josaEulReul(route)} 통하는 쪽에 가깝습니다.`;
}

// ────────────────────────────────────────────────────────────────
// 3. 재물이 커지는 핵심 조건 — 짧은 버전(PUBLIC). [수정] 아래 흔들리는
// 조건/조언 문단과 같은 핵심(비겁 vs 재성 등)을 다루더라도, 여기서는
// "커지는 국면"(기회 앞에서의 반응)에만 집중하도록 역할을 분리했다.
// ────────────────────────────────────────────────────────────────

function buildGrowingCorePublic(key: ChapterFourKey): string {
  const { bigyeopVsJaeseong: bj, gwanseongVsBigyeop: gb, jaeseong, siksangJaeseongLinked } = key;
  const bigyeopActive = key.wealth.byCategory.비겁.count > 0;

  if (bigyeopActive && siksangJaeseongLinked) {
    return "새로운 기회가 보일 때 주저하지 않고 움직이는 편이라, 그 판을 키울수록 재물도 함께 커지는 구조입니다. 가만히 묶어두기보다 새로운 시도에 다시 투입할 때 오히려 결과가 좋아집니다.";
  }
  if (bj.leadCategory === "재성" && bj.gapTier !== "비슷") {
    return "한번 손에 들어온 것을 쉽게 흩뜨리지 않는 편이라, 벌어들인 것이 그대로 쌓이는 쪽으로 기웁니다.";
  }
  if (gb.leadCategory === "관성" && gb.gapTier !== "비슷") {
    return "맡은 책임을 지키려는 마음이 씀씀이를 자연스럽게 눌러줘서, 한 번 자리 잡은 재물이 쉽게 새어 나가지 않는 편입니다.";
  }
  if (jaeseong.exposure !== "미미") {
    return "재물이 뿌리내린 자리 자체는 흔들리지 않아, 속도는 완만해도 기반은 쉽게 무너지지 않는 쪽에 가깝습니다.";
  }
  return "재물을 직접 키우는 힘 자체보다, 다른 흐름을 통해 서서히 여건이 갖춰지는 쪽에 가깝습니다.";
}

// ────────────────────────────────────────────────────────────────
// 4. 재물이 흔들리는 조건 (LOCKED). [수정] "새는 구체적 장면"에 집중 —
// 위 ③과 같은 계산값(비겁vs재성 등)을 근거로 쓰더라도, 여기서는 반대
// 국면(위험/유출)만 다루도록 역할을 분리했다. 판정 조건은 전부 원문 그대로.
// ────────────────────────────────────────────────────────────────

function bigyeopIsActive(key: ChapterFourKey): boolean {
  return key.wealth.byCategory.비겁.count > 0;
}

function buildShakingParagraph(key: ChapterFourKey): string {
  const { bigyeopVsJaeseong: bj, gwanseongVsBigyeop: gb, inseongVsSiksang: is_, siksangJaeseongLinked } = key;
  const clauses: string[] = [];

  if (bigyeopIsActive(key) && siksangJaeseongLinked && bj.leadCategory === "비겁" && bj.gapTier === "뚜렷") {
    clauses.push("특히 사람이나 관계를 통해 돈이 오갈 때, 나누고 함께 쓰려는 마음이 그대로 커져서 재물이 한곳에 머무르기보다 여러 방향으로 흩어지기 쉽습니다.");
  } else if (bj.leadCategory === "비겁" && bj.gapTier !== "비슷") {
    const alreadyProtected = gb.leadCategory === "관성" && gb.gapTier !== "비슷";
    clauses.push(
      bj.gapTier === "뚜렷"
        ? "이 재물을 가장 크게 흔드는 건 나누고, 함께 쓰고, 다시 다른 시도로 옮기려는 마음입니다. 그 마음이 재물 자체보다 훨씬 강해서, 손에 오래 쥐고 있기보다 곧 다시 움직이게 만드는 쪽으로 흐릅니다."
        : alreadyProtected
          ? "다만 책임으로 지켜지는 그 안에서도, 나누거나 다시 움직이려는 마음이 근소하게 살아 있어 완전히 쌓이기 전에 한 번씩 풀리는 경우가 있습니다."
          : "재물보다 나누거나 다시 움직이려는 마음이 근소하게 앞서 있어, 벌어들인 것이 완전히 쌓이기 전에 다시 풀리는 경우가 종종 있습니다."
    );
  }
  if (gb.leadCategory === "비겁" && gb.gapTier !== "비슷") {
    clauses.push(
      clauses.length === 0
        ? "이 사람의 재물을 가장 크게 흔드는 지점은, 나누고 움직이려는 마음을 눌러줄 책임의 힘이 충분치 않다는 데 있습니다."
        : "이 흐름을 눌러줄 책임의 힘도 충분치 않아서, 나누고 움직이려는 마음을 제어할 장치가 약한 편입니다."
    );
  }
  if (is_.leadCategory === "인성" && is_.gapTier !== "비슷") {
    clauses.push(
      clauses.length === 0
        ? "안정과 신뢰를 우선하는 마음이 만들어내는 힘을 눌러, 적극적으로 벌이기보다 신중하게 멈춰 서는 순간이 잦습니다."
        : "여기에 안정과 신뢰를 우선하는 마음까지 더해져, 적극적으로 벌이기보다 신중하게 멈춰 서는 순간이 잦습니다."
    );
  }
  if (clauses.length === 0) {
    clauses.push("뚜렷하게 흔드는 힘은 없지만, 그만큼 재물을 적극적으로 키우는 힘도 크지 않아 큰 변화 없이 완만하게 흘러가는 구조입니다.");
  }
  return clauses.join(" ");
}

// ────────────────────────────────────────────────────────────────
// 5~7. 대운의 재물 흐름 (LOCKED). [수정] "천간에는 X가 자리합니다 / 지지
// 지장간에는 Y가 자리합니다" 이중 사실-나열을 없애고, 그 시기에 돈을
// 대하는 태도가 어떻게 달라지는지부터 말한 뒤 용어는 가벼운 괄호로
// 뒤에 붙인다. 대운 판정(어느 시기에 어떤 카테고리인지)은 원문 그대로다.
// ────────────────────────────────────────────────────────────────

/** [수정] ganDisp(그 시기를 이끄는 십성 표시)를 별도 괄호로 붙이지 않고,
 * "OO의 기운이 ~하면서" 형태로 의미 문장의 주어 자리에 바로 엮었다 —
 * "천간에는 X가 자리합니다"류 사실-나열 문장을 없애고, 그 시기 재물을
 * 대하는 태도가 무엇인지부터 말하도록 더 구체적으로 다듬었다. 판정
 * 조건(category별 분기, cross 갈림)은 전부 원문 그대로다. */
function describePeriodFunction(period: DaYunWealthPeriod, key: ChapterFourKey, ganDisp: string): string {
  const category = period.ganCategory;
  const hiddenJaeseong = period.zhiHidden.some((z) => z.category === "재성") && category !== "재성";
  const hiddenNote = hiddenJaeseong
    ? " 다만 겉으로 드러나지 않은 안쪽에도 재물 기회가 함께 움직여서, 눈에 보이는 것보다 실제로는 조금 더 크게 오가는 시기이기도 합니다."
    : "";

  if (category === "재성") {
    const cross =
      key.bigyeopVsJaeseong.leadCategory === "비겁" && key.bigyeopVsJaeseong.gapTier !== "비슷"
        ? "원래는 나누고 움직이려는 마음에 밀리던 재물의 힘이 이 시기에는 앞으로 나서서, 쌓아가는 감각을 실제로 느끼기 좋은 시기입니다."
        : "원래도 자리 잡고 있던 재물의 힘이 이 시기에 한 번 더 두터워지는 흐름입니다.";
    return `${ganDisp}의 기운이 앞으로 나서면서, 재물을 직접 손에 쥐고 다루는 힘이 커집니다. ${cross}${hiddenNote}`;
  }
  if (category === "비겁") {
    const cross =
      key.jaeseong.exposure !== "미미" && key.bigyeopVsJaeseong.leadCategory !== "비겁"
        ? "다만 원래 재물의 기반 자체가 흔들리지 않을 만큼 있어, 이 시기에도 완전히 무너지기보다 그 힘을 다른 시도나 확장 쪽으로 옮기는 흐름에 가깝습니다."
        : "원래도 재물보다 앞서 있던 이 힘이 한 번 더 세지는 셈이라, 나누고 쓰는 것을 스스로 관리하는 일이 특히 중요해지는 시기입니다.";
    return `${ganDisp}의 기운이 앞서면서, 벌어들인 것을 붙잡아두기보다 나누거나 새 판으로 옮기고 싶은 마음이 커집니다. ${cross}${hiddenNote}`;
  }
  if (category === "식상") {
    const cross = key.siksangJaeseongLinked
      ? "그 결과물이 실제 수익으로 이어질 통로가 원래부터 있어, 만든 것이 곧바로 돈으로 연결될 여지가 있는 시기입니다."
      : "다만 그것이 곧바로 수익으로 이어지는 구조는 아직 뚜렷하지 않아, 만들어내는 데 먼저 무게가 실리는 시기에 가깝습니다.";
    return `${ganDisp}의 기운이 앞에 서면서, 직접 벌이거나 만들어낸 일이 돈으로 이어지기 쉬운 시기가 됩니다. ${cross}${hiddenNote}`;
  }
  if (category === "관성") {
    const cross =
      key.gwanseongVsBigyeop.leadCategory === "관성"
        ? "원래도 있던 지키는 힘이 이 시기에 한 번 더 강조되는 흐름입니다."
        : "평소보다 관리와 절제가 한 번 더 요구되는 시기입니다.";
    return `${ganDisp}의 기운이 자리 잡으면서, 정해둔 기준과 책임 안에서 돈을 다룰 때 오히려 마음이 편해지는 시기가 됩니다. ${cross}${hiddenNote}`;
  }
  const cross =
    key.inseongVsSiksang.leadCategory === "인성"
      ? " 원래도 정리하고 납득한 뒤 움직이는 흐름이었다면, 이 시기에는 그 성향이 재물에도 그대로 이어집니다."
      : "";
  return `${ganDisp}의 기운이 짙어지면서, 서둘러 벌이기보다 믿을 만한 사람이나 안정된 구조를 통해 돈을 다루고 싶어지는 시기가 됩니다.${cross}${hiddenNote}`;
}

function buildDaYunFlow(key: ChapterFourKey, usedTerms: Set<string>): string[] {
  const { past, current, next, priorWealthSignal } = key.daYun;
  const paras: string[] = [];

  if (priorWealthSignal) {
    paras.push(`${priorWealthSignal.startAge}세부터 ${priorWealthSignal.endAge}세까지는 재물의 기운이 대운에 직접 이어지며, 현실적인 성과를 직접 다루는 힘이 강해지는 시기였을 가능성이 큽니다.`);
  }

  if (past) {
    const lead = priorWealthSignal ? `그 뒤 지나온 ${past.startAge}세부터 ${past.endAge}세까지는` : `${past.startAge}세부터 ${past.endAge}세까지 지나온 시기는`;
    const ganDisp = termDisplay(past.ganSipseong);
    const gloss = glossOnFirstUse(past.ganSipseong, usedTerms);
    paras.push(`${lead} ${describePeriodFunction(past, key, ganDisp)}${gloss}`);
  } else if (!priorWealthSignal) {
    paras.push("아직 첫 대운을 지나는 시기라, 그 이전과 비교할 재물의 흐름은 없습니다.");
  }

  const currentSameAsPast = Boolean(past && current && past.ganCategory === current.ganCategory && past.ganCategory !== null);
  if (current) {
    const ganDisp = termDisplay(current.ganSipseong);
    const gloss = glossOnFirstUse(current.ganSipseong, usedTerms);
    if (currentSameAsPast) {
      paras.push(`지금(${current.startAge}–${current.endAge}세)도 ${ganDisp}의 기운으로 그 흐름이 그대로 이어지는 시기입니다.${gloss}`);
    } else {
      paras.push(`지금(${current.startAge}–${current.endAge}세)은 ${describePeriodFunction(current, key, ganDisp)}${gloss}`);
    }
  }

  if (next) {
    const nextSameAsCurrent = Boolean(current && next.ganCategory === current.ganCategory && next.ganCategory !== null);
    if (nextSameAsCurrent) {
      paras.push(`앞으로 ${next.startAge}세 이후에도 같은 흐름이 이어집니다 — 지금 자리 잡은 방식이 한동안 더 계속된다는 뜻입니다.`);
    } else {
      const ganDisp = termDisplay(next.ganSipseong);
      const gloss = glossOnFirstUse(next.ganSipseong, usedTerms);
      paras.push(`앞으로 ${next.startAge}세 이후에는 ${describePeriodFunction(next, key, ganDisp)}${gloss}`);
    }
  } else {
    paras.push("이후 대운 정보가 아직 없어 다음 시기의 변화는 비교할 수 없습니다.");
  }

  return paras;
}

// ────────────────────────────────────────────────────────────────
// 8. 돈을 지키고 키우는 조언 (LOCKED, 마지막 문단). [수정] 위 ④(흔들리는
// 조건)와 같은 계산값을 근거로 쓰더라도, 여기서는 "그래서 구체적으로
// 무엇을 하면 좋은지"(대응 행동)만 다루도록 역할을 분리했다. 판정
// 조건은 원문 그대로.
// ────────────────────────────────────────────────────────────────

function buildAdviceParagraph(key: ChapterFourKey): string {
  const { bigyeopVsJaeseong: bj, gwanseongVsBigyeop: gb, jaeseongVsInseong: ji, jaeseong, wealth, siksangJaeseongLinked, daYun } = key;

  if (bj.leadCategory === "비겁" && bj.gapTier !== "비슷") {
    const base = "이 사람에게는 나누고 움직이려는 마음이 원래 재물 그 자체보다 강합니다. 그래서 벌어들인 걸 손 가는 대로 두면 그 마음이 이끄는 쪽으로 자꾸 풀리기 쉽고, 손대지 않을 몫을 미리 정해둬야 그나마 붙잡아집니다.";
    const follow =
      gb.leadCategory === "관성" && gb.gapTier !== "비슷"
        ? " 다만 책임과 절제의 힘이 이미 어느 정도 받쳐주고 있어, 스스로 정한 원칙만 지키면 지나치게 흩어지는 데까지는 가지 않습니다."
        : " 이 흐름을 대신 눌러줄 장치가 마땅치 않으니, 사람이나 관계를 통해 오가는 돈일수록 미리 정해둔 기준으로 다루는 편이 안전합니다.";
    return base + follow;
  }
  if (gb.leadCategory === "관성" && gb.gapTier !== "비슷" && jaeseong.exposure === "뚜렷") {
    const base = "지금 방식을 크게 바꾸기보다, 이미 자리 잡은 지키는 힘을 기반 삼아 움직이는 편이 유리합니다.";
    const follow =
      ji.leadCategory === "재성" && ji.gapTier !== "비슷"
        ? " 다만 지켜보다가 이미 괜찮은 기회조차 놓치는 경우가 있을 수 있으니, '여기까지 확인되면 움직인다'는 기준을 스스로 미리 정해두는 편이 도움이 됩니다."
        : " 지금의 방식을 그대로 유지하는 것만으로도, 다음 단계를 준비하기 좋은 시점이 될 수 있습니다."
    return base + follow;
  }
  if (jaeseong.exposure === "숨음") {
    const base = "재물이 겉으로 드러나는 방식보다, 그 흐름이 어디에서 멈추고 어떻게 이어지는지를 먼저 살펴보는 편이 더 정확합니다.";
    const follow = siksangJaeseongLinked
      ? " 다만 만들어내는 힘과는 이어져 있으니, 겉으로 드러내기보다 실제 결과물로 먼저 증명해나가는 쪽이 이 구조에는 더 잘 맞습니다."
      : " 겉으로 성과를 서두르기보다, 안에서 흐름이 정리되는 시점을 기다리는 쪽이 이 구조에는 더 잘 맞습니다.";
    return base + follow;
  }
  if (jaeseong.exposure === "미미") {
    const topAxis = wealth.all[0].category;
    const route = CATEGORY_MONEY_ROUTE[topAxis];
    const base = `${route}${josaEulReul(route)} 통해 재물이 현실화되는 구조인 만큼, 그 힘을 키우는 쪽에 집중하는 것이 유리합니다.`;
    const follow =
      daYun.current?.ganCategory === topAxis
        ? " 마침 지금 대운에서 이 힘이 한 번 더 강조되는 시기이기도 해, 지금이 그 힘을 키우기에 특히 맞는 때일 수 있습니다."
        : " 지금 대운은 이 힘과는 결이 다른 흐름이 지나는 중이니, 조급하게 키우기보다 꾸준히 쌓아가는 쪽을 우선하는 편이 좋습니다.";
    return base + follow;
  }
  const base = "지금의 흐름을 그대로 이어가되, 지키는 힘과 키우는 힘의 균형을 계속 살펴보는 것이 관건입니다.";
  const fallbackTopAxis = wealth.all[0].category;
  const follow =
    daYun.current?.ganCategory === fallbackTopAxis
      ? " 지금 대운에서도 그 축이 이어지고 있어, 지금 방식을 크게 바꾸기보다 다듬어가는 쪽이 더 유리합니다."
      : " 다만 지금 대운은 결이 다른 힘이 지나는 중이라, 그 변화를 한 번쯤 점검해보는 것도 좋습니다.";
  return base + follow;
}

// ────────────────────────────────────────────────────────────────
// 조립 — publicPreview / lockedDetail 분리
// ────────────────────────────────────────────────────────────────

function buildKillpoint(name: string, key: ChapterFourKey): string {
  const { jaeseong, wealth } = key;
  if (jaeseong.exposure === "뚜렷" && jaeseong.dominant) return `${name}님의 재물은 이 사주에서 가장 강하게 움직이는 힘입니다.`;
  if (jaeseong.exposure === "뚜렷") return `${name}님의 재물은 뚜렷하게 자리를 잡고 있지만, 그 힘의 방향은 다른 기운과의 관계에 달려 있습니다.`;
  if (jaeseong.exposure === "숨음") return `${name}님의 재물은 겉이 아니라 안에서 움직입니다.`;
  const topAxis = wealth.all[0].category;
  const route = CATEGORY_MONEY_ROUTE[topAxis];
  return `${name}님의 재물은 ${route}${josaEulReul(route)} 거쳐 현실로 연결됩니다.`;
}

/** [수정: 고정 템플릿 해소] 재성 노출도×dominant(둘 다 이미 계산된 값)로
 * 4갈래 분기시켰다 — 모든 고객에게 100% 동일했던 WEALTH_HOOK을 실제
 * 계산 결과에 따라 결론 자체가 달라지도록 바꿨다. */
function buildWealthHook(key: ChapterFourKey): string {
  const { jaeseong } = key;
  if (jaeseong.exposure === "뚜렷" && jaeseong.dominant) {
    return "이 사주는 재물이 가장 크게 움직이는 힘입니다. 문제는 벌지 못하는 게 아니라, 그 힘을 어떤 방향으로 쓰느냐입니다.";
  }
  if (jaeseong.exposure === "뚜렷") {
    return "돈을 못 버는 사주는 아닙니다. 오히려 돈을 만들어내는 힘은 분명합니다. 문제는 그 돈이 어떤 방식으로 들어오고, 언제 크게 움직이느냐입니다.";
  }
  if (jaeseong.exposure === "숨음") {
    return "겉으로 재물 욕심이 커 보이는 사람은 아닙니다. 그런데 안쪽에서는 재물이 실제로 움직이고 있는 구조입니다.";
  }
  return "이 사주는 재물 자체보다, 다른 힘을 거쳐 현실적인 결과로 이어지는 쪽입니다. 돈을 직접 좇기보다, 그 힘을 키우는 쪽이 더 잘 맞습니다.";
}

/** [수정] 다음 대운이 지금과 같은 흐름인지(이미 계산된 값)로 2갈래
 * 분기시켰다 — 모든 고객에게 동일했던 고정 한 줄을 최소 개인화했다. */
function buildHighlight(key: ChapterFourKey): string {
  const { current, next } = key.daYun;
  const staysSame = Boolean(current && next && current.ganCategory === next.ganCategory && current.ganCategory !== null);
  if (staysSame) {
    return "지금 자리 잡은 흐름이 앞으로도 한동안 이어집니다 — 그 결이 실제로 어떻게 이어지는지는 대운을 함께 봐야 온전히 보입니다.";
  }
  return "이 흐름이 앞으로 어떻게 달라지는지는, 대운의 변화를 함께 봐야 온전히 보입니다.";
}

export interface ChapterFourContent {
  title: string;
  killpoint: string;
  publicPreview: string[];
  lockedDetail: string[];
  highlight: string;
  glossedInIntro: string[];
}

export function buildChapterFourNarrative(appData: AppData, key: ChapterFourKey): ChapterFourContent {
  const name = appData.user.name;
  const title = `${name}님의 재물이 움직이는 방식`;
  const killpoint = buildKillpoint(name, key);
  const usedTerms = new Set<string>();

  const publicPreview: string[] = [
    ...buildOpeningParagraphs(name, key, usedTerms),
    buildMakingParagraph(key, usedTerms),
    buildGrowingCorePublic(key),
  ];

  if (publicPreview.join("").length < 400) {
    const boost = buildLengthBoostClause(key, usedTerms);
    if (boost) publicPreview[0] = `${publicPreview[0]}${boost}`;
  }

  const glossedInIntro = [...usedTerms];

  publicPreview.unshift(buildWealthHook(key));

  const lockedDetail: string[] = [
    buildShakingParagraph(key),
    ...buildDaYunFlow(key, usedTerms),
    buildAdviceParagraph(key),
  ];

  const highlight = buildHighlight(key);

  return { title, killpoint, publicPreview, lockedDetail, highlight, glossedInIntro };
}
