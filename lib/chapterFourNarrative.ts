import { AppData } from "./sajuContent";
import { Stage } from "./natalStructure";
import { ChapterFourKey, EvidencePosition } from "./chapterFourInterpretation";
import { SipseongCategory } from "./strengthAnalysis";
import { DaYunWealthPeriod } from "./daYunWealthAnalysis";

/**
 * 4챕터("금전운의 흐름") 전용 NARRATIVE층. chapterFourInterpretation.ts가
 * 만든 판단값(재성 노출도·정확한 십성 라벨·5축 상대관계·대운 재물 신호)을
 * 실제 문장으로 조립한다.
 *
 * 이번 최종 버전의 원칙:
 *  - "실제 명리 근거 → 쉬운 뜻 → 재물 풀이" 순서를 지킨다. 정재/편재/비견
 *    같은 정확한 십성 라벨을 먼저 제시하고, 그 라벨이 처음 등장할 때만
 *    쉬운 뜻(SIPSEONG_GLOSS)을 붙인다 — 매번 반복하지 않는다.
 *  - 비겁·식상·관성·인성을 "성격/살아가는 방식"으로 설명하지 않는다.
 *    반드시 재물 동사(벌다/쓰다/지키다/키우다/흔들다)로 번역한다.
 *  - 계산에 없는 관계(삼합/반합/천간합/형/파/해)는 언급하지 않는다 — 실제
 *    계산되는 육합/육충(key.heChongOnWealth)만 근거로 쓴다.
 *  - 결핍형 단정("재성이 없습니다" 등)을 쓰지 않는다. 재성이 미미하면
 *    실제로 이 사람을 이끄는 축(topAxis)의 정확한 십성 라벨로 문을 연다.
 *  - 무료 공개(publicPreview) / 잠금(lockedDetail)로 나눈다. 공개부는
 *    ①타고난 재물 구조 ②돈을 만드는 방식 ③재물이 커지는 핵심 조건 한
 *    가지(짧게)만 담고, 마지막 문장은 결론을 다 말하지 않는다. 잠금부는
 *    ④흔들리는 조건 ⑤과거 대운 ⑥현재 대운 ⑦다음 대운 ⑧조언을 담는다.
 *  - UI(블러/렌더링)는 이 파일이 관여하지 않는다 — reportMapper.ts가
 *    publicPreview를 body에, lockedDetail을 별도 필드에 얹을 뿐, 기존
 *    ResultLandingV2.tsx 렌더링은 그대로다(lockedDetail을 아직 아무도
 *    읽지 않으므로 화면엔 자동으로 공개부만 보인다).
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
// 십성 용어 사전 — 처음 등장할 때만 뜻을 붙인다(usedTerms로 추적)
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

/** topAxis가 재성이 아닐 때, 그 축을 가리키는 일반 표현(3챕터 coreLabel과
 * 다른, 재물 관점 표현) — 정확한 십성 라벨을 못 찾았을 때만 쓰는 최후
 * fallback이다. */
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

/** 용어가 이번 원고에서 처음 등장하면 뜻풀이 문장을 별도로 반환하고, 이미
 * 등장했으면 빈 문자열을 반환한다. 항상 앞 문장 뒤에 그대로 이어 붙일 수
 * 있는 "완결된 새 문장"(앞에 공백 포함, 마침표로 끝남) 형태다 — 다른
 * 문장 중간에 쉼표로 끼워 넣지 않는다(문법 오류 방지). */
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

/** 한 카테고리의 여러 근거 자리 중 "가장 먼저 설명할 근거"를 고른다 —
 * 천간 > 지지 > 지장간(본기>중기>여기) 순으로, 겉으로 뚜렷하게 드러난
 * 것부터 우선한다. */
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

/** 일간 자신의 통근(natalStructure.analyzeRoot, 기존 계산 재사용) — 재물
 * 근거와는 별개로, 이 사람의 명식 전체가 기대는 바탕이 얼마나 단단한지를
 * "타고난 재물 구조" 문단에 함께 얹는다. 3챕터의 dayMasterRoot 원칙과
 * 동일 — 안정성 서술은 반드시 일간 자신의 통근을 근거로만 한다. */
function buildDayMasterRootClause(key: ChapterFourKey): string {
  const { dayMasterRoot } = key;
  if (dayMasterRoot.hasRoot) {
    const stages = [...new Set(dayMasterRoot.matches.map((m) => m.stage))].map((s) => STAGE_LABEL[s]);
    return ` 여기에 더해 ${joinKorean(stages)}에 자기 자신의 뿌리가 내려 있어, 이 재물의 흐름을 받쳐주는 바탕 자체는 쉽게 흔들리지 않습니다.`;
  }
  return " 다만 자기 자신의 뿌리내릴 자리가 마땅치 않아, 한 가지 방식을 오래 고집하기보다 상황에 따라 재물을 대하는 방식도 함께 조정하는 편입니다.";
}

/** publicPreview가 400자 미만일 때만 호출된다 — 이미 계산되어 있지만
 * 아직 공개부 어디에도 등장하지 않은 축(topAxis·식상·재성을 뺀 나머지 중
 * 세력이 가장 높은 축)의 실제 근거를 하나 더 얹는다. 새 명리 계산이나
 * 근거 없는 문장을 추가하지 않는다 — 대운/흔들리는 조건/조언은 절대
 * 건드리지 않고, "타고난 재물 구조" 문단에만 붙인다. */
function buildLengthBoostClause(key: ChapterFourKey, usedTerms: Set<string>): string {
  const topAxis = key.wealth.all[0].category;
  const exclude = new Set<SipseongCategory>([topAxis, "식상", "재성"]);
  const fresh = key.wealth.all.map((c) => c.category).find((c) => !exclude.has(c) && pickLeadEvidence(key.evidenceByCategory[c]));
  if (!fresh) return "";
  const evidence = pickLeadEvidence(key.evidenceByCategory[fresh])!;
  const disp = termDisplay(evidence.sipseong);
  return ` 이 외에 ${describePosition(evidence)}에는 ${disp}${josaIGa(evidence.sipseong)} 자리해, 재물을 대하는 방식에 또 다른 결이 함께 섞여 있습니다.${glossOnFirstUse(evidence.sipseong, usedTerms)}`;
}

function buildOpeningParagraphs(name: string, key: ChapterFourKey, usedTerms: Set<string>): string[] {
  const { jaeseong, evidenceByCategory, wealth } = key;
  const paras: string[] = [];

  if (jaeseong.exposure !== "미미") {
    const lead = pickLeadEvidence(jaeseong.evidence)!;
    const disp1 = termDisplay(lead.sipseong);
    let sentence = `${name}님의 사주에는 ${describePosition(lead)}에 ${disp1}${josaIGa(lead.sipseong)} 자리하고 있습니다.${glossOnFirstUse(lead.sipseong, usedTerms)}`;

    const second = jaeseong.evidence.find((e) => e !== lead && e.sipseong !== lead.sipseong) ?? jaeseong.evidence.find((e) => e !== lead);
    if (second && second.sipseong === lead.sipseong) {
      sentence += ` ${describePosition(second)}에도 같은 성질의 뿌리가 하나 더 있어, 이 재물의 흐름이 한 곳에 그치지 않습니다.`;
    } else if (second) {
      const disp2 = termDisplay(second.sipseong);
      sentence += ` 여기에 ${describePosition(second)}에도 ${disp2}${josaIGa(second.sipseong)} 함께 자리해, 재물이 한 가지 성질로만 움직이지 않습니다.${glossOnFirstUse(second.sipseong, usedTerms)}`;
    }
    sentence += buildDayMasterRootClause(key);
    paras.push(sentence);
  } else {
    const topAxis = wealth.all[0].category;
    const topEvidence = pickLeadEvidence(evidenceByCategory[topAxis]);
    let sentence: string;
    if (topEvidence) {
      const disp = termDisplay(topEvidence.sipseong);
      sentence = `${name}님의 사주에는 ${describePosition(topEvidence)}에 ${disp}${josaIGa(topEvidence.sipseong)} 자리하고 있습니다.${glossOnFirstUse(topEvidence.sipseong, usedTerms)} 재성 자체는 이 명식 전면에서 바로 드러나는 구조보다, ${disp}${josaEulReul(topEvidence.sipseong)} 비롯한 다른 기운을 거쳐 현실적인 결과로 연결되는 쪽에 가깝습니다.`;
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

function buildMakingParagraph(key: ChapterFourKey, usedTerms: Set<string>): string {
  const { siksangJaeseongLinked, evidenceByCategory } = key;
  const siksangEvidence = pickLeadEvidence(evidenceByCategory.식상);

  if (siksangJaeseongLinked && siksangEvidence) {
    const disp = termDisplay(siksangEvidence.sipseong);
    return `여기에 ${disp}${josaGwaWa(siksangEvidence.sipseong)} 재물로 이어지는 흐름이 함께 있습니다.${glossOnFirstUse(siksangEvidence.sipseong, usedTerms)} 스스로 만들거나 내놓은 결과물이 곧 수익의 형태로 바뀌는 길이 원래부터 있는 구조입니다.`;
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
// 3. 재물이 커지는 핵심 조건 — 짧은 버전(PUBLIC, 궁금증 남기고 끝)
// ────────────────────────────────────────────────────────────────

function buildGrowingCorePublic(key: ChapterFourKey): string {
  const { bigyeopVsJaeseong: bj, gwanseongVsBigyeop: gb, jaeseong, siksangJaeseongLinked } = key;
  const bigyeopActive = key.wealth.byCategory.비겁.count > 0;

  if (bigyeopActive && siksangJaeseongLinked) {
    return "이 구조에서 재물은 가만히 쌓아두기보다, 벌어들인 것을 다시 움직이고 새로운 시도에 투입할 때 커지는 쪽에 가깝습니다.";
  }
  if (bj.leadCategory === "재성" && bj.gapTier !== "비슷") {
    return "벌어들인 것을 나누거나 다시 움직이게 하려는 힘보다 재물 자체의 무게가 앞서 있어, 벌어들인 것이 쉽게 흩어지지 않고 쌓이는 쪽으로 기웁니다.";
  }
  if (gb.leadCategory === "관성" && gb.gapTier !== "비슷") {
    return "맡은 역할과 책임의 힘이 나누고 흩뜨리려는 힘을 눌러주고 있어, 한 번 자리 잡은 재물이 쉽게 새어 나가지 않는 쪽에 가깝습니다.";
  }
  if (jaeseong.exposure !== "미미") {
    return "재물이 뿌리내린 자리 자체는 흔들리지 않아, 속도는 완만해도 기반은 쉽게 무너지지 않는 쪽에 가깝습니다.";
  }
  return "재물을 직접 키우는 힘 자체보다, 다른 흐름을 통해 서서히 여건이 갖춰지는 쪽에 가깝습니다.";
}

// ────────────────────────────────────────────────────────────────
// 4. 재물이 흔들리는 조건 (LOCKED)
// ────────────────────────────────────────────────────────────────

function bigyeopIsActive(key: ChapterFourKey): boolean {
  return key.wealth.byCategory.비겁.count > 0;
}

function buildShakingParagraph(key: ChapterFourKey): string {
  const { bigyeopVsJaeseong: bj, gwanseongVsBigyeop: gb, inseongVsSiksang: is_, siksangJaeseongLinked } = key;
  const clauses: string[] = [];

  // "벌어들인 만큼 빠져나간다"/"버느냐만큼 남기느냐" 같은 실제 금전 유출·
  // 회수 서술은 5장("왜 남지 않는가")의 역할이라 4장은 작동 방식(재물이
  // 한곳에 머물지 않고 여러 방향으로 움직인다는 사실)까지만 말한다 —
  // 4·5장 교차검증에서 확인된 근거 반복을 줄이기 위한 최소 수정.
  if (bigyeopIsActive(key) && siksangJaeseongLinked && bj.leadCategory === "비겁" && bj.gapTier === "뚜렷") {
    clauses.push("다만 이 움직이려는 힘이 재물 자체보다 지나치게 앞서 있어, 재물이 한곳에 머무르기보다 여러 방향으로 움직이기 쉬운 구조입니다.");
  } else if (bj.leadCategory === "비겁" && bj.gapTier !== "비슷") {
    // gwanseongVsBigyeop(관성이 비겁을 누름)이 이미 앞에서 "지켜준다"고
    // 말한 경우, 바로 뒤에 "근소하게 새어나간다"고 하면 같은 4장 안에서
    // 반대로 읽힌다(C24 교차검증에서 발견) — 그 지키는 힘 "안에서도"라는
    // 연결어로 앞 문장과 이어지게만 최소 수정한다.
    const alreadyProtected = gb.leadCategory === "관성" && gb.gapTier !== "비슷";
    clauses.push(
      bj.gapTier === "뚜렷"
        ? "가장 크게 흔드는 힘은 나누고, 함께 쓰고, 다시 다른 시도로 옮기려는 마음입니다. 재물 자체보다 이 힘이 훨씬 강해서, 벌어들인 것을 손에 오래 쥐고 있기보다 곧 다시 움직이게 만드는 쪽으로 흐릅니다."
        : alreadyProtected
          ? "다만 그 지키는 힘 안에서도, 나누거나 다시 움직이려는 힘이 근소하게 살아 있어 완전히 쌓이기 전에 한 번씩 풀리는 경우가 있습니다."
          : "재물보다 나누거나 다시 움직이려는 힘이 근소하게 앞서 있어, 벌어들인 것이 완전히 쌓이기 전에 다시 풀리는 경우가 종종 있습니다."
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
    clauses.push("또한 안정과 신뢰를 우선하는 힘이 만들어내는 힘을 눌러, 적극적으로 벌이기보다 신중하게 멈춰 서는 순간이 잦습니다.");
  }
  if (clauses.length === 0) {
    clauses.push("뚜렷하게 흔드는 힘은 없지만, 그만큼 재물을 적극적으로 키우는 힘도 크지 않아 큰 변화 없이 완만하게 흘러가는 구조입니다.");
  }
  return clauses.join(" ");
}

// ────────────────────────────────────────────────────────────────
// 5~7. 대운의 재물 흐름 (LOCKED) — 원국 재물 구조 + 대운 십성(정확한 라벨) +
// 기존 명식과의 관계를 함께 서술한다.
// ────────────────────────────────────────────────────────────────

function describeDaYunEvidence(period: DaYunWealthPeriod, usedTerms: Set<string>): string {
  const ganDisp = termDisplay(period.ganSipseong);
  let s = `이 시기 대운의 천간에는 ${ganDisp}${josaIGa(period.ganSipseong)} 자리합니다.${glossOnFirstUse(period.ganSipseong, usedTerms)}`;
  const lead = period.zhiHidden[0]; // 배열 순서 자체가 본기→중기→여기
  if (lead) {
    const zhiDisp = termDisplay(lead.sipseong);
    s += ` 지지 지장간(${lead.position})에는 ${zhiDisp}${josaIGa(lead.sipseong)} 자리합니다.${glossOnFirstUse(lead.sipseong, usedTerms)}`;
  }
  return s;
}

function describePeriodFunction(period: DaYunWealthPeriod, key: ChapterFourKey): string {
  const category = period.ganCategory;
  const hiddenJaeseong = period.zhiHidden.some((z) => z.category === "재성") && category !== "재성";
  const hiddenNote = hiddenJaeseong
    ? " 다만 지지 깊은 곳에는 재성이 함께 자리해, 겉으로 드러나는 것보다 안에서 재물 기회가 조금 더 크게 움직이는 시기이기도 합니다."
    : "";

  if (category === "재성") {
    const cross =
      key.bigyeopVsJaeseong.leadCategory === "비겁" && key.bigyeopVsJaeseong.gapTier !== "비슷"
        ? "원래는 나누고 움직이려는 힘에 밀리던 재물의 힘이 이 시기에는 앞으로 나서게 되어, 쌓아가는 감각을 실제로 느끼기 좋은 국면입니다."
        : "원래도 자리 잡고 있던 재물의 힘이 이 시기에 한 번 더 두터워지는 흐름입니다.";
    return `원국의 재물 구조와 만나, 재물을 직접 다루는 힘이 커지는 시기가 됩니다. ${cross}${hiddenNote}`;
  }
  if (category === "비겁") {
    const cross =
      key.jaeseong.exposure !== "미미" && key.bigyeopVsJaeseong.leadCategory !== "비겁"
        ? "다만 원래 재물의 기반 자체가 흔들리지 않을 만큼 있어, 이 시기에도 완전히 무너지기보다 그 힘을 다른 시도나 확장 쪽으로 옮기는 흐름에 가깝습니다."
        : "원래도 재물보다 앞서 있던 이 힘이 대운에서 한 번 더 세지는 셈이라, 나누고 쓰는 것을 스스로 관리하는 일이 특히 중요해지는 국면입니다.";
    return `원국의 재물 구조와 만나, 재물보다 나누고 움직이려는 힘이 앞서는 시기가 됩니다. ${cross}${hiddenNote}`;
  }
  if (category === "식상") {
    const cross = key.siksangJaeseongLinked
      ? "그 결과물이 실제 수익으로 이어질 통로가 원래부터 있어, 만든 것이 곧바로 돈으로 연결될 여지가 있는 국면입니다."
      : "다만 그것이 곧바로 수익으로 이어지는 구조는 아직 뚜렷하지 않아, 만들어내는 데 먼저 무게가 실리는 시기에 가깝습니다.";
    return `원국의 재물 구조와 만나, 결과물을 만들어내는 힘이 전면에 나서는 시기가 됩니다. ${cross}${hiddenNote}`;
  }
  if (category === "관성") {
    const cross =
      key.gwanseongVsBigyeop.leadCategory === "관성"
        ? "원래도 있던 지키는 힘이 이 시기에 한 번 더 강조되는 흐름입니다."
        : "평소보다 관리와 절제가 한 번 더 요구되는 시기입니다.";
    return `원국의 재물 구조와 만나, 책임과 절제 안에서 재물이 다뤄지는 시기가 됩니다. ${cross}${hiddenNote}`;
  }
  const cross =
    key.inseongVsSiksang.leadCategory === "인성"
      ? " 원래도 정리하고 납득한 뒤 움직이는 흐름이었다면, 이 시기에는 그 성향이 재물에도 그대로 이어집니다."
      : "";
  return `원국의 재물 구조와 만나, 적극적으로 벌이기보다 안정과 신뢰를 통해 서서히 다져지는 시기가 됩니다.${cross}${hiddenNote}`;
}

function buildDaYunFlow(key: ChapterFourKey, usedTerms: Set<string>): string[] {
  const { past, current, next, priorWealthSignal } = key.daYun;
  const paras: string[] = [];

  if (priorWealthSignal) {
    paras.push(`${priorWealthSignal.startAge}세부터 ${priorWealthSignal.endAge}세까지는 재물의 기운이 대운에 직접 이어지며, 현실적인 성과를 직접 다루는 힘이 강해지는 시기였습니다.`);
  }

  if (past) {
    const lead = priorWealthSignal ? `그 뒤 지나온 ${past.startAge}세부터 ${past.endAge}세까지` : `${past.startAge}세부터 ${past.endAge}세까지 지나온 시기`;
    paras.push(`${lead}, ${describeDaYunEvidence(past, usedTerms)} ${describePeriodFunction(past, key)}`);
  } else if (!priorWealthSignal) {
    paras.push("아직 첫 대운을 지나는 시기라, 그 이전과 비교할 재물의 흐름은 없습니다.");
  }

  const currentSameAsPast = Boolean(past && current && past.ganCategory === current.ganCategory && past.ganCategory !== null);
  if (current) {
    if (currentSameAsPast) {
      paras.push(`지금(${current.startAge}–${current.endAge}세)도 ${describeDaYunEvidence(current, usedTerms)} 그 흐름이 그대로 이어지는 시기입니다.`);
    } else {
      paras.push(`지금(${current.startAge}–${current.endAge}세)은 ${describeDaYunEvidence(current, usedTerms)} ${describePeriodFunction(current, key)}`);
    }
  }

  if (next) {
    const nextSameAsCurrent = Boolean(current && next.ganCategory === current.ganCategory && next.ganCategory !== null);
    if (nextSameAsCurrent) {
      paras.push(`앞으로 ${next.startAge}세 이후에도 같은 흐름이 이어집니다 — 지금 자리 잡은 방식이 한동안 더 계속된다는 뜻입니다.`);
    } else {
      paras.push(`앞으로 ${next.startAge}세 이후에는, ${describeDaYunEvidence(next, usedTerms)} ${describePeriodFunction(next, key)}`);
    }
  } else {
    paras.push("이후 대운 정보가 아직 없어 다음 시기의 변화는 비교할 수 없습니다.");
  }

  return paras;
}

// ────────────────────────────────────────────────────────────────
// 8. 돈을 지키고 키우는 조언 (LOCKED, 마지막 문단)
// ────────────────────────────────────────────────────────────────

/**
 * 개인화 보강(GPT 검수 승인 범위) — 새 계산을 추가하지 않고, 이미
 * ChapterFourKey에 있지만 이 함수에서는 그동안 쓰이지 않던 값
 * (gwanseongVsBigyeop의 gapTier, jaeseongVsInseong, siksangJaeseongLinked,
 * daYun.current)만 더 참조한다. 기존 4갈래 진단 문장(base)은 그대로 두고,
 * 그 뒤에 "그래서 어떤 습관을 의식하면 좋은지"를 계산값 기반으로 한 문장
 * 더 붙이는 구조로만 확장한다 — 서로 다른 명식이 같은 base로 묶여도 follow
 * 절이 갈라지도록 하는 것이 목적이다. 재산/소득/사건 단정은 하지 않는다.
 */
function buildAdviceParagraph(key: ChapterFourKey): string {
  const { bigyeopVsJaeseong: bj, gwanseongVsBigyeop: gb, jaeseongVsInseong: ji, jaeseong, wealth, siksangJaeseongLinked, daYun } = key;

  if (bj.leadCategory === "비겁" && bj.gapTier !== "비슷") {
    const base = "쌓이기 전에 다시 움직이려는 마음을 한 번은 붙잡아 두는 것이, 이 구조에서는 돈을 지키는 가장 실질적인 방법입니다.";
    // gb(관성 vs 비겁)로 "그 나누려는 힘을 눌러줄 장치가 이미 있는지"까지
    // 갈라, 사람/관계를 통해 오가는 돈을 다루는 기준까지 이어붙인다.
    const follow =
      gb.leadCategory === "관성" && gb.gapTier !== "비슷"
        ? " 다만 책임과 절제의 힘이 이미 어느 정도 받쳐주고 있어, 스스로 정한 원칙만 지키면 지나치게 흩어지는 데까지는 가지 않는 구조입니다."
        : " 이 흐름을 대신 눌러줄 장치가 마땅치 않은 구조이니, 사람이나 관계를 통해 오가는 돈은 미리 정해둔 기준으로 다루는 편이 안전합니다.";
    return base + follow;
  }
  // "적극적으로 키워보는 쪽이 유리하다"는 계산이 보장하지 않는 행동
  // 권고라 4·5·6장 교차검증에서 지적됨 — 구조 설명으로 낮춘다.
  if (gb.leadCategory === "관성" && gb.gapTier !== "비슷" && jaeseong.exposure === "뚜렷") {
    const base = "지키는 힘이 이미 자리하고 있어, 재물이 움직일 때 이를 받쳐주는 기반으로 작동할 수 있습니다.";
    // jaeseongVsInseong(재성이 안정 추구를 누르는 정도)으로 "지켜지는 재물
    // 때문에 오히려 움직여야 할 때를 놓치는지"까지 갈라 붙인다.
    const follow =
      ji.leadCategory === "재성" && ji.gapTier !== "비슷"
        ? " 다만 재물의 힘이 안정을 살피는 힘보다 앞서 있어, 이미 괜찮은 기회조차 더 지켜보다 놓치는 경우가 있을 수 있습니다. 움직여야 할 때를 스스로 미리 정해두는 편이 도움이 됩니다."
        : " 지금의 방식을 그대로 유지하는 것만으로도, 기반이 흔들리지 않는 지금이 다음 단계를 준비하기 좋은 시점이 될 수 있습니다.";
    return base + follow;
  }
  // "계기를 스스로 만들어보라"는 계산이 보장하지 않는 행동 처방이라
  // 마찬가지로 구조·흐름 설명까지만 남긴다.
  if (jaeseong.exposure === "숨음") {
    const base = "지금은 안쪽에서 움직이는 힘이 상대적으로 더 두드러지는 구조입니다. 재물이 밖으로 드러나는 방식보다 그 흐름이 어디에서 멈추고 어떻게 이어지는지를 함께 보는 편이 더 정확합니다.";
    const follow = siksangJaeseongLinked
      ? " 다만 만들어내는 힘과는 이어져 있어, 겉으로 드러내기보다 실제 결과물로 먼저 증명해나가는 쪽이 이 구조에는 더 잘 맞습니다."
      : " 겉으로 성과를 서두르기보다, 안에서 흐름이 정리되는 시점을 기다리는 쪽이 이 구조에는 더 잘 맞습니다.";
    return base + follow;
  }
  if (jaeseong.exposure === "미미") {
    const topAxis = wealth.all[0].category;
    const route = CATEGORY_MONEY_ROUTE[topAxis];
    const base = `${route}${josaEulReul(route)} 통해 재물이 현실화되는 구조인 만큼, 그 힘을 키우는 쪽에 집중하는 것이 유리합니다.`;
    // 현재 대운 카테고리가 topAxis와 같은지로 "지금이 그 힘을 키우기에
    // 실제로 맞는 시기인지"까지 이어붙인다(daYun.current, 새 계산 아님).
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

/** 항상 화면에 노출되는 짧은 카드 문장 — 잠금부의 결론을 미리 말하지
 * 않는, 궁금증을 남기는 한 줄(과장·공포 문구 없이). */
function buildHighlight(): string {
  return "이 흐름이 앞으로 어떻게 달라지는지는, 대운의 변화를 함께 봐야 온전히 보입니다.";
}

export interface ChapterFourContent {
  title: string;
  killpoint: string;
  /** 무료 공개 — ①타고난 재물 구조 ②돈을 만드는 방식 ③재물이 커지는
   * 핵심 조건(짧게). 약 450~700자, 결론을 다 말하지 않고 끝난다. */
  publicPreview: string[];
  /** 잠금 상세 — ④흔들리는 조건 ⑤과거 대운 ⑥현재 대운 ⑦다음 대운
   * ⑧조언. 전체 원고는 항상 생성하되, 화면에는 아직 연결하지 않는다. */
  lockedDetail: string[];
  /** 항상 노출되는 카드 한 줄(궁금증 유지용, 결론 아님) */
  highlight: string;
}

/** 4장 첫 훅 — 1~3장(성격·기질·삶의 방식)에서 벗어나 처음으로 "돈" 이야기로
 * 넘어가는 전환 문장. 명리 근거로 시작하지 않고, 독자가 가장 궁금해할
 * 결론부터 보여준 뒤 아래 buildOpeningParagraphs(실제 명리 근거)로 이어진다.
 * 승인된 고정 문구 — 사람마다 달라지는 계산값이 아니다(순서상 항상 맨
 * 앞에만 오고, 그 뒤 문단들은 기존 그대로 사람마다 다르게 이어진다). */
const WEALTH_HOOK =
  "돈을 못 버는 사주는 아닙니다. 오히려 돈을 만들어내는 힘은 분명합니다. 문제는 그 돈이 어떤 방식으로 들어오고, 언제 크게 움직이느냐입니다.";

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

  // 권장 420~600자 · 최소 400자. 미달일 때만, 아직 등장하지 않은 실제
  // 근거를 "타고난 재물 구조" 문단에 자연스럽게 보강한다(글자 수를
  // 채우려고 같은 문장을 반복하지 않는다 — 항상 새 근거만 추가).
  if (publicPreview.join("").length < 400) {
    const boost = buildLengthBoostClause(key, usedTerms);
    if (boost) publicPreview[0] = `${publicPreview[0]}${boost}`;
  }

  // 고정 훅은 길이 보강 로직(위) 이후에 맨 앞으로 붙인다 — 400자 기준
  // 판단은 항상 "실제 계산된 근거 문단들"만으로 하고(훅은 사람마다 안
  // 바뀌므로 여기 포함시키지 않는다), 화면에는 훅 → 근거 순서로 보인다.
  publicPreview.unshift(WEALTH_HOOK);

  const lockedDetail: string[] = [
    buildShakingParagraph(key),
    ...buildDaYunFlow(key, usedTerms),
    buildAdviceParagraph(key),
  ];

  const highlight = buildHighlight();

  return { title, killpoint, publicPreview, lockedDetail, highlight };
}
