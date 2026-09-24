// [5장 재물운 Production 이식] 확정된 scratch(scripts/_scratch_ch1_opening_nojargon_v1.ts)를 로직·문장 변경 없이 그대로 옮긴 파일.
// 이식 시 제거한 것: 데모/검증용 실행 코드(buildAppData·IntakeFormData·require.main 블록)와 그 import뿐이다.
// ① "타고난 돈의 감각"에 임베드되는 legacy openingPara(chapterFourNarrative.ts의
// buildOpeningParagraphs)가 고객 본문에 "편재(偏財)", "정재(正財)" 같은
// 십성 이름+한자를 그대로 노출하는 문제를 고친다.
//
// [원칙] 계산값·분기 로직은 원문(chapterFourNarrative.ts) 그대로 전부
// 복제해서 유지한다 — exposure(뚜렷/숨음/미미) 분기, lead/second evidence
// 선정 로직(pickLeadEvidence), 같은 십성 중복 케이스 분기, dayMasterRoot
// 절까지 전부 100% 동일하다. 유일한 변경은 "명리에서는 이 성질을
// OOO(한자)라고 부릅니다"라는 이름표 문장과 뜻풀이(glossOnFirstUse)를
// 빼고, 이미 있던 WEALTH_BEHAVIOR(그래서 실제로 어떤 돈 습관이 나타나는지)
// 문장만 openLine 뒤에 바로 잇는 것뿐이다 — 새 문장을 창작하지 않고
// 기존에 이미 있던 "행동" 문장만 남기고 "이름표" 문장만 제거했다.
// chapterFourNarrative.ts 자체는 export되지 않는 내부 함수/상수라서
// 이 파일에 그대로 복제해 읽기만 한다(그 파일은 수정하지 않는다).
import { AppData } from "../sajuContent";
import { Stage } from "../natalStructure";
import { ChapterFourKey, EvidencePosition } from "../chapterFourInterpretation";
import { SipseongCategory } from "../strengthAnalysis";

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
function josaEulReul(word: string): "을" | "를" {
  const last = word.charCodeAt(word.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return "를";
  return (last - 0xac00) % 28 === 0 ? "를" : "을";
}
function joinKorean(items: string[]): string {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]}${josaGwaWa(items[0])} ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, ${items[items.length - 1]}`;
}

// [원문 그대로 복제] WEALTH_BEHAVIOR — 이미 명리 용어 없이 순수 행동만
// 서술하는 기존 문장이라 그대로 재사용한다(새로 창작하지 않음).
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

function pickLeadEvidence(list: EvidencePosition[]): EvidencePosition | null {
  const visible = list.filter((e) => e.slot !== "지장간");
  if (visible.length > 0) return visible[0];
  const weight: Record<string, number> = { 본기: 3, 중기: 2, 여기: 1 };
  const sorted = [...list].sort((a, b) => (weight[b.hidePosition ?? ""] ?? 0) - (weight[a.hidePosition ?? ""] ?? 0));
  return sorted[0] ?? null;
}

function buildDayMasterRootClause(key: ChapterFourKey): string {
  const { dayMasterRoot } = key;
  if (dayMasterRoot.hasRoot) {
    const stages = [...new Set(dayMasterRoot.matches.map((m) => m.stage))].map((s) => STAGE_LABEL[s]);
    return ` 여기에 더해 ${joinKorean(stages)}에 자기 자신의 뿌리가 내려 있어, 이 재물의 흐름을 받쳐주는 바탕 자체는 쉽게 흔들리지 않습니다.`;
  }
  return " 다만 자기 자신의 뿌리내릴 자리가 마땅치 않아, 한 가지 방식을 오래 고집하기보다 상황에 따라 재물을 대하는 방식도 함께 조정하는 편입니다.";
}

// [변경 지점] "명리에서는 이 성질을 OOO(한자)라고 부릅니다"+뜻풀이를
// 빼고, openLine 뒤에 WEALTH_BEHAVIOR만 바로 잇는다. exposure 분기·
// lead/second evidence 선정·같은 십성 중복 케이스·dayMasterRoot 절은
// buildOpeningParagraphs와 100% 동일하다.
export function buildOpeningParagraphsNoJargon(name: string, key: ChapterFourKey): string[] {
  const { jaeseong, evidenceByCategory, wealth } = key;
  const paras: string[] = [];

  if (jaeseong.exposure !== "미미") {
    const lead = pickLeadEvidence(jaeseong.evidence)!;
    const behavior1 = WEALTH_BEHAVIOR[lead.sipseong] ?? "";
    const openLine =
      jaeseong.exposure === "숨음"
        ? `${name}님에게는 재물이 겉으로 드러나기보다, 안쪽 깊숙한 곳에서 움직이는 결이 있습니다.`
        : `${name}님에게는 재물이 실제로 손에 잡히는 결이 있습니다.`;
    let sentence = `${openLine} ${behavior1}`;

    const second = jaeseong.evidence.find((e) => e !== lead && e.sipseong !== lead.sipseong) ?? jaeseong.evidence.find((e) => e !== lead);
    if (second && second.sipseong === lead.sipseong) {
      sentence += ` 이 결이 한 번으로 끝나지 않고, 다른 자리에도 같은 성질의 뿌리가 하나 더 있어서 이 재물의 흐름이 한 곳에 그치지 않습니다.`;
    } else if (second) {
      const behavior2 = WEALTH_BEHAVIOR[second.sipseong] ?? "";
      sentence += ` 그런데 이 결 하나만 있는 게 아닙니다 — 다른 결도 함께 있어서, 재물이 한 가지 방식으로만 움직이지 않습니다. ${behavior2}`;
    }
    sentence += buildDayMasterRootClause(key);
    paras.push(sentence);
  } else {
    const topAxis = wealth.all[0].category;
    const topEvidence = pickLeadEvidence(evidenceByCategory[topAxis]);
    let sentence: string;
    if (topEvidence) {
      const behavior = WEALTH_BEHAVIOR[topEvidence.sipseong] ?? "";
      sentence = `${name}님의 재물은 이 사주 앞면에 바로 드러나 있지 않습니다. 대신 다른 힘을 거쳐 돈이 현실로 이어지는 쪽에 가깝습니다. ${behavior}`;
    } else {
      sentence = `${name}님의 재물은 이 명식 전면에서 바로 드러나는 구조보다, ${CATEGORY_MONEY_ROUTE[topAxis]}${josaEulReul(CATEGORY_MONEY_ROUTE[topAxis])} 거쳐 현실적인 결과로 연결되는 쪽에 가깝습니다.`;
    }
    sentence += buildDayMasterRootClause(key);
    paras.push(sentence);
  }

  return paras;
}
