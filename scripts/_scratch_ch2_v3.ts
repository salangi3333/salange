// 2장 "사랑과 인연" 새 기준(v3) — scratch 전용. 운영 파일·1장 파일은 수정하지 않는다.
// 모든 구체 문장은 { text, rule }로 태그되어 어떤 계산 조건에서 나오는지 자동 검사할 수 있다.
// 조건 값은 기존 엔진(analyzeSpouseStar, analyzeDayMasterBalance, analyzeRoot, buildChapterThreeKey,
// analyzeBranchRelations, analyzeLoveTimingSignals)을 그대로 호출해서 얻는다 — 새 계산 없음.
import { calculateSaju } from "../lib/sajuEngine";
import { buildAppDataFromCalc } from "../lib/sajuContent";
import { analyzeSpouseStar } from "../lib/spouseStarAnalysis";
import { subtypeFocusOf, exposureShapeOf } from "../lib/loveApproachStyleNarrative";
import { analyzeDayMasterBalance } from "../lib/dayMasterBalanceAnalysis";
import { analyzeRoot, analyzeBranchRelations } from "../lib/natalStructure";
import { buildChapterThreeKey } from "../lib/chapterThreeInterpretation";
import { analyzeLoveTimingSignals } from "../lib/loveTimingSignals";
import { getSinsalName, isCheoneulGwiin } from "../lib/hanjaTables";
import { judgeSpouseStar } from "./_scratch_ch2_judge";

export interface Tagged { text: string; rule: string }
export type Branch = "맥락" | "본연" | "숨음" | "미미";
export type Focus = "subA" | "subB" | "balanced";
export type Shape = "visible" | "rooted" | "hidden" | "none";
export type BGroup = "신강계열" | "신약계열" | "중화" | "hold";
export type Rel = "없음" | "합만" | "충만" | "합충모두";

export interface Ch2Facts {
  gender: "male" | "female"; target: "관성" | "재성"; subtypes: [string, string];
  subCount: [number, number]; exposure: string; isDay: boolean; branch: Branch; focus: Focus; shape: Shape;
  gwansal: boolean; balance: BGroup; hasRoot: boolean; daySip: string; match: "일치" | "불일치"; rel: Rel;
  starYears: number[]; palaceYears: { year: number; types: string[] }[]; curActive: boolean; nextActive: boolean;
  nextAge: string | null; starVia: Record<number, "gan" | "ji" | "hidden">;
  shin: string; cheoneulDay: boolean; judgedShape: string;
}
export interface Ch2 {
  name: string; facts: Ch2Facts;
  open: { title: string[]; lines: Tagged[]; need: Tagged | null; basis: string };
  std: { lead: Tagged; lines: Tagged[]; basis: string } | null;
  deepen: { lead: Tagged; lines: Tagged[]; need: Tagged; basis: string } | null;
  hurt: { lead: Tagged; lines: Tagged[]; need: Tagged; basis: string } | null;
  partner: { lead: Tagged; body: Tagged; hedge: Tagged | null; basis: string };
  stab: { avoid: Tagged; rel: Tagged | null; shin: Tagged | null; basis: string };
  timing: { lines: Tagged[]; basis: string } | null;
  fwd: { lead: Tagged | null; basis: string };
  chart: { pillars: { stage: string; stem: string; stemSip: string; stemEl: string; branch: string; branchSip: string; branchEl: string; stemStar: boolean; branchStar: boolean; palace: boolean }[]; hiddenStar: string; noHour: boolean; notes: Tagged[]; basis: string };
}

const STAGE_KO: Record<string, string> = { year: "년", month: "월", day: "일", hour: "시" };

// ─────────── 문장 은행 (기존 엔진 조건 그대로, 문장은 짧게 새로 씀) ───────────
// 1쪽 시작 문장: 조건마다 처음부터 끝까지 완성된 문장을 쓴다(조각을 조립하지 않는다).
// 선택 근거는 두 계산값뿐이다: 배우자성 자리/노출(맥락·본연·숨음·미미) × 표현 판정(중복 제거·두 종류 합산 후 visible/hidden).
// 표현 문장은 visible/hidden일 때만 쓰고, none/rooted는 자리 문장만 쓴다. 마음의 방향(한 곳/여러 곳)·연락·상대 반응은 쓰지 않는다.
const OPEN_BANK: Record<string, { title: [string, string]; body: string }> = {
  "맥락:visible": { title: ["마음이 생기면", "평소와 다른 얼굴이 나옵니다"], body: "좋아하는 사람이 생기면 평소의 내 모습과는 조금 다른 얼굴이 나옵니다. 그 마음은 표정과 말투에 비교적 빨리 드러나는 편입니다." },
  "맥락:none": { title: ["마음이 생기면", "평소와 다른 얼굴이 나옵니다"], body: "좋아하는 사람이 생기면 평소의 내 모습과는 조금 다른 얼굴이 나옵니다." },
  "맥락:hidden": { title: ["마음이 생겨도", "쉽게 티 내지는 않습니다"], body: "좋아하는 사람이 생기면 평소와는 다른 마음이 들지만, 겉으로는 곧바로 드러나지 않는 편입니다." },
  "본연:visible": { title: ["마음이 생겨도", "평소 모습 그대로입니다"], body: "좋아하는 사람이 생겨도 사랑할 때의 모습이 평소 모습과 크게 다르지 않습니다. 그 마음은 표정과 말투에 비교적 빨리 드러나는 편입니다." },
  "본연:none": { title: ["마음이 생겨도", "평소 모습 그대로입니다"], body: "좋아하는 사람이 생겨도 사랑할 때의 모습이 평소 모습과 크게 다르지 않습니다." },
  "숨음": { title: ["마음이 생겨도", "티를 내지 않고 조용히 담아 둡니다"], body: "좋아하는 사람이 생겨도 그 마음을 먼저 겉으로 드러내는 편은 아닙니다. 마음속으로 조용히 담아 두는 쪽에 가깝습니다." },
  "미미": { title: ["사랑에서의 모습은", "한 가지로 정해지지 않습니다"], body: "이 사주에서는 사랑할 때의 모습을 한 가지로 정하게 만드는 신호가 약합니다." },
};
const OPEN_NEED: Record<Exclude<Branch, "미미">, string> = {
  맥락: "‘평소의 나’와 ‘사랑할 때의 나’가 다르다는 걸 이상하게 보지 않는 사람 곁에서 편해집니다.",
  본연: "관계를 위해 억지로 다른 사람이 되지 않아도 되는 거리감에서 편해집니다.",
  숨음: "표현을 재촉하지 않는 거리감에서 서서히 마음을 엽니다.",
};

const STD_SUB: Record<string, string> = {
  정관: "먼저 확인하는 건 감정의 크기가 아니라, 정한 것을 꾸준히 지키는지입니다. 신뢰가 이어지는지부터 봅니다.",
  편관: "흐릿한 관계를 유독 못 견딥니다. 이 관계가 어디로 가는지, 분명한 확신부터 찾습니다.",
  정재: "큰 이벤트보다 매일의 작은 약속이 더 크게 다가옵니다. 반복해서 확인되는 신뢰로 안심합니다.",
  편재: "한 가지 방식에 얽매이면 답답해합니다. 상황에 맞춰 유연하게 넓혀 가려는 마음이 먼저 나섭니다.",
};
const STD_LEAD: Record<"female" | "male", Record<Focus, string>> = {
  female: { subB: "믿음직하게 약속을 지키는 사람에게 마음이 갑니다.", subA: "태도가 분명하고 책임을 피하지 않는 사람에게 마음이 갑니다.", balanced: "약속을 지키는 사람과 태도가 분명한 사람, 두 유형 모두에게 마음이 갑니다." },
  male: { subB: "꾸준히 약속을 지키는 안정적인 사람에게 마음이 갑니다.", subA: "변화에 유연하게 함께 움직여 주는 사람에게 마음이 갑니다.", balanced: "안정적으로 곁을 지키는 사람과 유연하게 함께 움직여 주는 사람, 두 유형 모두에게 마음이 갑니다." },
};
const STD_BOTH: Record<"female" | "male", string> = {
  female: "그래서 두 가지 기준이 함께 작동합니다. 오래 지켜진 신뢰와 지금 상황이 요구하는 분명한 태도를 동시에 보고, 무엇을 먼저 볼지 저울질하게 됩니다.",
  male: "그래서 두 가지 기준이 함께 작동합니다. 꾸준한 약속과 유연한 대응을 동시에 보고, 안정과 변화 중 무엇을 먼저 볼지 저울질하게 됩니다.",
};

type DKey = `${"혼잡있음" | "혼잡없음"}-${"신강계열" | "신약계열" | "중화"}`;
const DEEP: Record<DKey, { lead: string; scene: string; need: string }> = {
  "혼잡있음-신강계열": { lead: "관계가 깊어질수록 상대의 기대와 내 기준이 여러 갈래로 겹쳐도 크게 흔들리지 않습니다.", scene: "상대가 이것저것 바라도 겉으로는 유들유들하게 넘깁니다. 다만 속으로는 ‘이번엔 어느 쪽을 먼저 맞출까’ 계속 따져 봅니다.", need: "겉으로 잘 버틴다고 아무렇지 않은 건 아니라는 걸 알아봐 주는 사람과 오래갑니다." },
  "혼잡있음-신약계열": { lead: "가까워질수록 상대의 기대, 주변의 시선, 스스로 정한 기준이 한꺼번에 몰려 지치기 쉽습니다.", scene: "좋아서 시작한 관계인데 어느새 버거운 숙제처럼 느껴지는 때가 올 수 있습니다.", need: "한 번에 하나씩만 맞춰도 된다고 먼저 말해 주는 사람이 편합니다." },
  "혼잡있음-중화": { lead: "관계가 깊어질수록 상대에게 무조건 맞추지도, 내 방식만 밀어붙이지도 않고 중간을 찾으려 합니다.", scene: "서운한 일이 생겨도 상대의 기대와 내 마음 사이에서 한 번 더 생각하고 조정해 보려 합니다.", need: "그렇게 조율하려는 노력을 알아봐 주는 사람과 잘 맞습니다." },
  "혼잡없음-신강계열": { lead: "가까워질수록 눈치를 덜 보고 자기 색을 더 분명하게 드러냅니다.", scene: "처음엔 조심스럽다가도 편해질수록 원하는 약속 장소와 하고 싶은 말을 스스럼없이 먼저 꺼냅니다.", need: "그렇게 솔직해지는 모습을 부담스러워하지 않고 받아 주는 사람과 잘 맞습니다." },
  "혼잡없음-신약계열": { lead: "가까워질수록 상대에게 맞추는 폭이 넓어지고, 갈등을 만들기보다 스스로 조정하는 쪽을 먼저 택합니다.", scene: "가고 싶은 곳이 있어도 상대가 다른 곳을 말하면 별말 없이 맞춥니다.", need: "계속 맞춰 주지 않아도 괜찮다고 먼저 알려 주는 사람과 오래갑니다." },
  "혼잡없음-중화": { lead: "가까워져도 극적인 변화 없이 처음의 태도를 꾸준히 보여 줍니다.", scene: "특별한 기념일이 아니어도 만난 지 얼마 안 됐을 때와 비슷한 태도로 상대를 대합니다.", need: "특별한 이벤트보다 한결같음을 알아봐 주는 사람과 잘 맞습니다." },
};
const DEEP_HIDDEN = "이런 변화를 먼저 말로 표현하는 편은 아니라서, 상대가 알아채 주지 않으면 혼자 조용히 지나갑니다.";

type HKey = "지탱있음-뚜렷" | "지탱있음-숨음" | "지탱없음-뚜렷" | "지탱없음-숨음";
const HURT: Record<HKey, { lead: string; when: string; need: string }> = {
  "지탱있음-뚜렷": { lead: "마음이 흔들려도 무너지지는 않지만, 어렵게 꺼낸 마음이 가볍게 넘어갈 때 서운함이 크게 남습니다.", when: "오래 고민해서 꺼낸 말을 상대가 대수롭지 않게 넘기거나 농담으로 받을 때 특히 그렇습니다.", need: "표현한 마음의 무게를 가볍게 다루지 않는 사람과 오래갑니다." },
  "지탱있음-숨음": { lead: "혼자 서운함을 삭이고 넘어가는 일이 잦습니다. 티를 안 냈던 마음을 상대가 정말 모르고 지나가면 뒤늦게 마음이 무거워집니다.", when: "", need: "티 내지 않아도 먼저 알아채고 물어봐 주는 사람과 오래갑니다." },
  "지탱없음-뚜렷": { lead: "마음 표현은 거리낌 없지만 스스로를 지탱하는 힘이 여린 편이라, 상대의 반응에 기분이 크게 오르내립니다.", when: "마음을 표현한 뒤 상대의 반응이 미지근하거나 답이 늦으면, 여러 생각이 스치며 흔들립니다.", need: "반응 하나하나에 일희일비하지 않도록 꾸준히 확인을 주는 사람과 오래갑니다." },
  "지탱없음-숨음": { lead: "마음을 잘 드러내지 않으면서 스스로를 지탱하는 힘도 여려서, 겉으로는 괜찮아 보여도 안에서는 오래 힘든 시간을 보냅니다.", when: "힘든 티를 안 냈는데 상대가 평소와 다름없이 무심하게 지나갈 때, 그 순간을 속으로 오래 곱씹습니다.", need: "괜찮다는 말을 그대로 믿지 않고 먼저 다가와 살펴 주는 사람과 오래갑니다." },
};

const PARTNER: Record<`${"일치" | "불일치"}-${Focus}`, { lead: string; role: string; need: string }> = {
  "일치-subA": { lead: "마음이 가는 사람과, 함께 있을 때 편안한 사람이 크게 다르지 않습니다.", role: "각자 맡은 일은 알아서 하고, 필요할 때만 상의하는 사이가 편안합니다.", need: "서로의 시간을 존중하면서 함께하는 사이가 잘 맞습니다." },
  "일치-subB": { lead: "마음이 가는 사람과, 함께 있을 때 편안한 사람이 크게 다르지 않습니다.", role: "큰 결정은 함께 상의하고, 꾸준히 맞춰 가는 사이가 자연스럽게 자리 잡습니다.", need: "처음의 편안함을 오래 쌓아 가는 사이가 잘 맞습니다." },
  "일치-balanced": { lead: "마음이 가는 사람과, 함께 있을 때 편안한 사람이 크게 다르지 않습니다.", role: "처음 맞춰 본 방식을 크게 바꾸지 않고 이어 가는 사이가 편안합니다.", need: "처음의 느낌을 믿고 천천히 쌓아 가는 사이가 잘 맞습니다." },
  "불일치-subA": { lead: "마음이 가는 사람과, 함께 있을 때 편안한 사람은 조금 다를 수 있습니다.", role: "처음 끌린 유형과 오래 만날수록 편한 유형이 서로 달라서, 만나 가며 ‘이 사람이 나에게 정말 편한가’를 다시 확인하게 됩니다.", need: "처음의 끌림보다 함께 있을 때의 편안함을 뒤늦게라도 알아보는 쪽이 오래갑니다." },
  "불일치-subB": { lead: "마음이 가는 사람과, 함께 있을 때 편안한 사람은 조금 다를 수 있습니다.", role: "처음에는 이런 사람이 좋다고 생각했는데, 막상 오래 만나 보면 다른 유형에게 더 편안함을 느낄 수 있습니다.", need: "처음 그리던 모습과 달라도 편안함을 주는 쪽을 다시 눈여겨보세요." },
  "불일치-balanced": { lead: "마음이 가는 사람과, 함께 있을 때 편안한 사람은 조금 다를 수 있습니다.", role: "이상형을 미리 정해 두기보다, 만나 보며 편한지를 확인해 가는 쪽이 오래갑니다.", need: "처음의 이상형에 얽매이기보다 실제로 편안한 쪽을 다시 살펴보세요." },
};


// 배우자 자리(일지)의 십성 → "곁에서 편안한 사람의 특징(person)"과 "내가 그 사람에게 느끼는 관계 방식(feel)".
// 확정이 아니라 경향으로 쓴다(직업·외모·나이·사건은 쓰지 않음). 기존 은행(STAB)의 의미를 사람의 모습으로 옮긴 것.
const COMFORT: Record<string, { person: string; feel: string }> = {
  비견: { person: "각자의 시간과 몫을 존중하고, 하나하나 확인하려 들지 않는 사람.", feel: "각자 지내다 다시 만나 이야기하는 거리감에서 편안함을 느끼는 편입니다." },
  겁재: { person: "비용과 역할을 분명히 짚고, 내 몫을 인정해 주는 사람.", feel: "돈과 역할처럼 오해하기 쉬운 부분은 분명하게 짚고 가는 사이에서 마음이 놓이는 편입니다." },
  식신: { person: "특별한 날이 아니어도 일상 이야기를 편하게 나눌 수 있는 사람.", feel: "매번 특별하지 않아도 함께 밥 먹고 웃는 시간에서 편안함을 느끼는 편입니다." },
  상관: { person: "내 말을 검열하지 않고 있는 그대로 받아 주는 사람.", feel: "하고 싶은 말을 눌러야 하는 사이보다 솔직하게 던져도 되는 사이에서 편안한 편입니다." },
  편재: { person: "한 가지 방식에 얽매이지 않고, 계획이 틀어져도 상황에 맞춰 함께 움직여 주는 사람.", feel: "계획이 바뀌어도 부담 없이 같이 움직여 주는 상대에게 마음을 놓는 편입니다." },
  정재: { person: "약속을 꾸준히 지키고, 작은 일도 반복해서 챙겨 주는 사람.", feel: "큰 이벤트보다 작은 약속이 지켜지는 데서 안심하는 편입니다." },
  편관: { person: "생각을 분명히 말하고, 힘든 순간에 책임을 피하지 않는 사람.", feel: "관계가 흐릿하게 흘러가면 불안하고, 분명한 태도에서 마음이 놓이는 편입니다." },
  정관: { person: "정한 것을 꾸준히 지키고, 말과 행동이 어긋나지 않는 사람.", feel: "감정 표현이 많은 것보다 약속이 지켜지는 꾸준함에서 편안함을 느끼는 편입니다." },
  편인: { person: "모든 걸 설명하지 않아도 표정으로 알아주고, 혼자 있는 시간을 존중하는 사람.", feel: "캐묻지 않는 거리감에서 편안함을 느끼는 편입니다." },
  정인: { person: "힘들 때 먼저 다가와 곁에 있어 주는 사람.", feel: "확신의 말보다 힘들 때 곁에 있어 준다는 확인에서 마음이 놓이는 편입니다." },
};
const STD_SHORT: Record<"female" | "male", Record<Focus, string>> = {
  female: { subB: "약속을 지키는 믿음직한 사람", subA: "태도가 분명하고 책임을 피하지 않는 사람", balanced: "믿음직한 사람과 태도가 분명한 사람" },
  male: { subB: "꾸준히 곁을 지키는 안정적인 사람", subA: "변화에 유연하게 함께 움직여 주는 사람", balanced: "안정적인 사람과 유연한 사람" },
};
const COMFORT_HEDGE: Record<"충만" | "합충모두", string> = {
  충만: "배우자 자리에 충이 있어서, 이런 성향은 상황과 상대에 따라 달라질 수 있습니다.",
  합충모두: "배우자 자리에 합과 충이 함께 있어서, 이런 성향은 상황과 상대에 따라 달라질 수 있습니다.",
};
// 6쪽 본문용 표현. 끌리는 유형(배우자성)과 편안한 사람(일지 십성)을 사람의 말로 옮긴 것뿐, 새 조건은 없다.
const STORY_ATTRACT: Record<"female" | "male", Record<Focus, string>> = {
  female: { subB: "약속을 잘 지키는 믿음직한 사람", subA: "태도가 분명하고 책임을 피하지 않는 사람", balanced: "약속을 잘 지키고 태도가 분명한 사람" },
  male: { subB: "꾸준히 곁을 지키는 안정적인 사람", subA: "변화에 유연하게 함께 움직여 주는 사람", balanced: "꾸준히 곁을 지키면서도 변화에 유연하게 함께 움직여 주는 사람" },
};
const STORY_PERSON: Record<string, string> = {
  편재: "자기 방식만 고집하기보다, 계획이 달라져도 상황에 맞춰 함께 움직여 주는 사람",
};
const PARTNER_LEAD_NONE = "연애 인연을 뜻하는 글자가 약해 끌리는 유형은 뚜렷하지 않지만, 배우자 자리에서는 이렇게 읽힙니다.";

// 힘든 관계(일지 십성) 뒤에 이어 붙이는 "그래서 어떻게" — 일지 십성 × 배우자성과 일치/불일치로 조합한다.
const TIP_BASE: Record<string, string> = {
  비견: "각자 시간을 미리 말해 두면 서로 덜 서운합니다.",
  겁재: "돈과 역할은 먼저 이야기해 두는 편이 낫습니다.",
  식신: "평범한 날에도 마음을 한마디씩 표현해 보세요.",
  상관: "하고 싶은 말은 짧게 먼저 꺼내 보세요.",
  편재: "바꾸고 싶은 건 한 가지씩만 말해 보세요.",
  정재: "작은 약속부터 서로 확인해 보세요.",
  편관: "애매하게 느껴지면 그 자리에서 물어보세요.",
  정관: "어긋난 일은 그때 바로 짚어 보세요.",
  편인: "혼자 있고 싶은 날은 미리 알려 주세요.",
  정인: "힘들다는 말을 한 번은 꺼내 보세요.",
};
// 일지 12신살 — 검수 결과 사랑·관계 해석 근거가 충분한 5개만 보조로 쓴다. 나머지 7개는 이번 2장에서 보류.
const SHIN_TXT: Record<string, string> = {
  년살: "사람에게 호감을 주는 분위기가 있어 인연이 다가오기 쉬운 편입니다.",
  장성살: "관계에서 중요한 갈림길이 오면 방향을 정해야 한다는 책임감을 느끼는 편입니다. 관계가 흔들릴 때는 혼자 결론내리기보다, 함께 방향을 정해 보세요.",
  반안살: "안정된 자리에 앉았다는 느낌이 들 때 마음이 가장 편해집니다.",
  역마살: "함께 있어도 각자 움직임이 많은 관계가 되기 쉽습니다.",
  화개살: "가까운 사이에도 혼자만의 시간이 꼭 필요합니다.",
};
const SEPARATE_TXT: Record<string, string> = {
  자형: "인연에 마음이 가는 해와, 반복되는 관계의 모습을 돌아보게 되는 해가 서로 다른 해에 옵니다. 하나만 왔다고 조급해하지 않아도 됩니다.",
  합: "인연에 마음이 가는 해와, 관계가 가까워지는 쪽으로 힘이 실리는 해가 서로 다른 해에 옵니다. 하나만 왔다고 조급해하지 않아도 됩니다.",
  충: "인연에 마음이 가는 해와, 관계에 변화가 생기기 쉬운 해가 서로 다른 해에 옵니다. 하나만 왔다고 조급해하지 않아도 됩니다.",
  혼합: "인연에 마음이 가는 해와, 관계의 모습에 변화가 닿는 해가 서로 다른 해에 옵니다. 하나만 왔다고 조급해하지 않아도 됩니다.",
};
const GWIIN_DAY_TXT = "배우자 자리에는 천을귀인이 함께 있습니다. 어려울 때 서로 도움을 주고받는 관계로 이어지기 쉽지만, 평소 관계를 소홀히 하면 드러나지 않을 수 있습니다.";
const hasBatchim = (w: string) => (w.charCodeAt(w.length - 1) - 0xac00) % 28 !== 0;
const josaGa = (w: string) => (hasBatchim(w) ? "이" : "가");
const josaWa = (w: string) => (hasBatchim(w) ? "과" : "와");

const STAB: Record<string, { lead: string; avoid: string }> = {
  비견: { lead: "좋아한다고 두 사람의 하루가 하나가 될 필요는 없습니다. 각자의 시간을 보내다 다시 만나 이야기하는 사이가 편합니다.", avoid: "사소한 결정까지 확인받으려 하고 각자의 시간을 인정하지 않는 관계는 빠르게 지칩니다." },
  겁재: { lead: "관계 안에서 내 몫이 얼마나 인정받는지를 가장 먼저 확인합니다. 비용과 역할을 얼버무리지 않고 짚고 싶어 합니다.", avoid: "비용이나 역할을 얼버무리며 ‘좋은 게 좋은 거’로 일관하는 관계는 오래 맞지 않습니다." },
  식신: { lead: "밥을 같이 먹고 별일 아닌 이야기를 나누는 시간이 관계의 큰 부분을 차지합니다.", avoid: "매번 특별한 이벤트로만 마음을 확인시키려 하고 평범한 일상을 시시하게 여기는 관계는 피곤합니다." },
  상관: { lead: "마음이 있어도 하고 싶은 말을 계속 눌러야 하는 관계에서는 오래 버티지 못합니다.", avoid: "순간의 말과 감정 표현마다 정색하며 선을 긋는 관계는 스스로를 계속 검열하게 만듭니다." },
  편재: { lead: "연애에서는 계획이 얼마나 지켜지느냐보다, 계획이 틀어졌을 때 누가 먼저 움직이느냐가 중요합니다.", avoid: "자기 방식만 고집하고, 서로 맞춰 갈 여지를 주지 않는 사람과의 관계는 오래 갈수록 답답해질 수 있습니다." },
  정재: { lead: "사랑은 강렬한 한 번보다 반복해서 지켜지는 작은 약속에 가깝습니다.", avoid: "약속이 별다른 설명 없이 자주 바뀌고 대수롭지 않게 여겨지는 관계는 마음을 서서히 물러서게 합니다." },
  편관: { lead: "관계가 흐릿하게 흘러가면 마음을 놓지 못합니다. 상대가 생각을 분명히 말하고 힘들 때 책임을 피하지 않기를 바랍니다.", avoid: "결정적인 순간마다 확실한 말을 피하고 책임을 미루는 관계는 신뢰를 조금씩 깎습니다." },
  정관: { lead: "가까워질수록 중요해지는 건 감정의 크기가 아니라 약속이 지켜지는 꾸준함입니다.", avoid: "정해 둔 것이 반복해서 어긋나고 그때마다 그럴듯한 이유만 대는 관계는 애정과 별개로 마음의 문을 닫게 합니다." },
  편인: { lead: "가까움은 모든 걸 말하는 것과 다릅니다. 표정 하나로 오늘은 말하고 싶지 않다는 걸 알아주는 사람이 필요합니다.", avoid: "계속 캐묻고 혼자 있는 시간을 존중하지 않는 관계는 숨 쉴 공간을 줄어들게 합니다." },
  정인: { lead: "사랑의 확신보다 먼저 필요한 건, 힘들 때 곁에 있어 줄 사람이라는 확인입니다.", avoid: "힘들다는 티를 안 내면 정말 괜찮은 줄 알고 방치하는 관계는 서운함을 오래 남깁니다." },
};
const REL_CLAUSE: Record<Exclude<Rel, "없음">, string> = {
  합만: "실제로 만나 보면 서로 맞춰 가는 부분이 비교적 빨리 드러나는 편입니다.",
  충만: "가까워지면 사소한 부분에서 한 번씩 부딪힐 수 있습니다.",
  합충모두: "잘 맞는 부분이 있으면서도, 한 번씩 부딪히는 부분이 함께 있을 수 있습니다.",
};

const FWD: Record<Exclude<BGroup, "hold">, Record<"있음" | "없음", string>> = {
  신강계열: { 있음: "관계를 편하게 만드는 건 더 애쓰는 게 아니라, 가진 여유를 상대에게도 나눠 주는 것입니다. 먼저 묻고 먼저 맞춰 보는 시도가 자연스럽게 됩니다.", 없음: "씩씩해 보이는 모습과 달리 안에서는 상대의 반응에 의외로 흔들릴 수 있습니다. 힘든 순간을 혼자 삭이지 말고 그대로 표현해 보세요." },
  중화: { 있음: "특별한 노력보다, 지금의 균형 잡힌 태도를 꾸준히 이어 가는 것이 관계를 가장 편하게 만듭니다.", 없음: "관계가 흔들릴 때 혼자 판단을 서두르기보다, 가까운 사람에게 지금 느끼는 것을 그대로 말해 보는 쪽이 더 편안합니다." },
  신약계열: { 있음: "계속 맞춰 주기만 하지 않아도 관계는 쉽게 흔들리지 않습니다. 가끔은 원하는 것을 먼저 말해 보세요.", 없음: "맞추는 폭이 넓어지기 쉽고 스스로를 지탱하는 힘도 여려서 이중으로 힘든 순간이 겹칠 수 있습니다. 혼자 다 감당하지 말고 믿을 수 있는 사람에게 기대세요." },
};

// 배우자 자리(일지)에 세운이 합/충/자형으로 닿는 해 → 관계에서 실제로 체감되는 변화로 풀어 씀.
const REL_TYPE_TXT: Record<string, string> = {
  합: "관계가 가까워지는 쪽으로 힘이 실리는 해입니다. 마음을 더 열게 되거나 사이가 깊어지는 변화가 생기기 쉽습니다.",
  충: "관계에 변화가 생기기 쉬운 해입니다. 만나는 방식이나 거리, 함께 지내는 환경이 바뀔 수 있습니다.",
  자형: "연애에서 반복해 온 내 모습이 눈에 들어오는 해입니다. 비슷한 이유로 서운하거나 답답해지는 일이 반복되면, 내가 관계에서 무엇을 참고 있었는지, 어떤 상황에서 같은 감정이 되풀이되는지 생각이 많아지게 됩니다. 이때는 관계를 서둘러 결론내리기보다, 반복되는 문제 하나를 먼저 바꿔보는 것이 좋습니다.",
};
// 인연의 별이 오는 세운: 천간/지지로 겉에 드러나는지, 지장간 속에만 숨어 있는지에 따라 강도가 달라 문장을 나눈다.
const STAR_YEAR_TXT: Record<"gan" | "ji" | "hidden", string> = {
  gan: "인연이 겉으로 뚜렷하게 들어오는 해입니다. 새로운 사람이 눈에 들어오거나 관계를 진지하게 생각하게 되기 쉽습니다.",
  ji: "인연이 생활 속으로 현실적으로 다가오는 해입니다. 사람을 만나거나 관계를 의식하게 되는 일이 늘기 쉽습니다.",
  hidden: "연애와 인연에 대한 생각이 많아지는 해입니다. 어떤 사람이 나에게 맞는지, 어떤 관계를 원하는지 스스로 자주 떠올리게 됩니다. 이때는 사람을 빨리 만나려고 하기보다, 내가 원하는 관계의 기준부터 분명히 해두는 것이 좋습니다.",
};

// 인연의 별 종류를 숫자 없이 결과로 표시한다. 어느 쪽이 두드러지는지는 엔진 판정(subtypeFocusOf) 그대로 옮긴다.
function starSummary(names: [string, string], counts: [number, number], _focus: Focus): string {
  const [a, b] = names; const both = `${a}·${b}`;
  if (counts[0] > 0 && counts[1] > 0) return `${both} 모두 있음`;
  if (counts[0] > 0) return `${a}만 있음`;
  if (counts[1] > 0) return `${b}만 있음`;
  return "겉·속 모두 미약";
}

function balanceGroupOf(b: string): BGroup {
  if (b === "clearlyStrong" || b === "slightlyStrong") return "신강계열";
  if (b === "clearlyWeak" || b === "slightlyWeak") return "신약계열";
  if (b === "hold") return "hold";
  return "중화";
}

export function buildCh2(name: string, input: Parameters<typeof calculateSaju>[0], gender: "male" | "female"): Ch2 {
  const app = buildAppDataFromCalc(calculateSaju(input), name);
  const user: any = app.user;
  const star = analyzeSpouseStar(user, gender);
  const judged = judgeSpouseStar(star); // 본기 중복 제거 + 두 종류 합산 (1쪽 시작 문장에만 사용)
  const bal = analyzeDayMasterBalance(user);
  const bgroup = balanceGroupOf(bal.balance);
  const root = analyzeRoot(user);
  const key3 = buildChapterThreeKey(app);
  const rel = analyzeBranchRelations(user);
  const heC = rel.he.filter((p: any) => p.a.stage === "day" || p.b.stage === "day").length;
  const chC = rel.chong.filter((p: any) => p.a.stage === "day" || p.b.stage === "day").length;
  const relState: Rel = heC > 0 && chC > 0 ? "합충모두" : heC > 0 ? "합만" : chC > 0 ? "충만" : "없음";
  const daySip: string = user.pillars.branches.day.sipseong;
  const CAT: Record<string, string> = { 비견: "비겁", 겁재: "비겁", 식신: "식상", 상관: "식상", 편재: "재성", 정재: "재성", 편관: "관성", 정관: "관성", 편인: "인성", 정인: "인성" };
  const match = CAT[daySip] === star.targetCategory ? "일치" : "불일치";
  const branch: Branch = star.exposure === "미미" ? "미미" : star.exposure === "숨음" ? "숨음" : star.isDayBranch ? "본연" : "맥락";
  const subCount = star.subtypes.map((s) => s.visible.length + s.rooted.length + s.hidden.length) as [number, number];
  const subNames = [star.subtypes[0].subtype, star.subtypes[1].subtype] as [string, string];
  // 정관/편관 사이의 강약은 엔진에 실제 판정 근거가 없다(개수만 있음). 둘 다 있으면 어느 한쪽을 우세로 쓰지 않는다.
  const focus: Focus = subCount[0] > 0 && subCount[1] > 0 ? "balanced" : subCount[0] > 0 ? "subA" : subCount[1] > 0 ? "subB" : "balanced";
  const shape = judged.shape as Shape; // 본기 중복 제거 + 두 종류 합산 판정(엔진 원본은 그대로)
  // 관살혼잡(편관+정관)은 관성이 인연의 별인 여성에게만 의미가 있다. 남성은 이 축을 쓰지 않는다(혼잡없음 은행 사용).
  const mixed = gender === "female" && key3.gwansal.present;
  const gk: "혼잡있음" | "혼잡없음" = mixed ? "혼잡있음" : "혼잡없음";

  // ── 시기 신호 ──
  const timing = analyzeLoveTimingSignals(app, gender);
  const starYears = timing.spouseStarTiming.seunActiveYears;
  const palaceYears = timing.spousePalaceTiming.seun.map((p) => ({ year: p.year, types: p.relationTypes as string[] }));
  const curActive = !!timing.currentDaYun?.spouseStarActive;
  const nextActive = !!timing.nextDaYun?.spouseStarActive;
  const nextAge = timing.nextDaYun ? `${(timing.nextDaYun.period as any).startAge}~${(timing.nextDaYun.period as any).endAge}세` : null;

  const starVia: Record<number, "gan" | "ji" | "hidden"> = {}; const starViaTxt: Record<number, string> = {};
  timing.representativeSeun.forEach((r: any) => {
    if (!r.spouseStarActive) return; const k = r.seun; const y = k.year as number;
    if (k.seunGanCategory === star.targetCategory) { starVia[y] = "gan"; starViaTxt[y] = `천간의 ${star.targetCategory}`; }
    else if (k.seunJiCategory === star.targetCategory) { starVia[y] = "ji"; starViaTxt[y] = `지지의 ${star.targetCategory}`; }
    else { starVia[y] = "hidden"; const h = (k.hiddenStems as any[]).find((x) => x.category === star.targetCategory); starViaTxt[y] = `지장간 속 ${h ? h.sipseong : star.targetCategory}`; }
  });
  const facts: Ch2Facts = { gender, target: star.targetCategory, subtypes: subNames, subCount, exposure: star.exposure, isDay: star.isDayBranch, branch, focus, shape, gwansal: mixed, balance: bgroup, hasRoot: root.hasRoot, daySip, match, rel: relState, starYears, palaceYears, curActive, nextActive, nextAge, starVia, shin: getSinsalName(user.pillars.branches.year.hanja, user.pillars.branches.day.hanja), cheoneulDay: isCheoneulGwiin(user.pillars.day.hanja, user.pillars.branches.day.hanja), judgedShape: judged.shape };

  // ── P1 오프너 ──
  const openKey = branch === "숨음" || branch === "미미" ? branch
    : branch === "맥락" ? `맥락:${judged.shape === "visible" || judged.shape === "hidden" ? judged.shape : "none"}`
    : `본연:${judged.shape === "visible" ? "visible" : "none"}`;
  const exprNote = (branch === "맥락" || branch === "본연") && judged.shape === "visible" ? " / 표현: 배우자성이 천간·지지에 직접 있음"
    : branch === "맥락" && judged.shape === "hidden" ? " / 표현: 배우자성이 지장간 속에 더 많음" : "";
  const openEntry = OPEN_BANK[openKey];
  const open = {
    title: openEntry.title as string[], lines: [{ text: openEntry.body, rule: `open:body:${openKey}` }] as Tagged[],
    need: branch !== "미미" ? ({ text: OPEN_NEED[branch], rule: `open:need:${branch}` } as Tagged) : null,
    basis: `배우자성(${star.targetCategory}): ${starSummary(subNames, subCount, focus)} / 배우자 자리(일지 ${user.pillars.branches.day.hanja})에는 ${daySip}${/[가-힣]/.test(daySip) && (daySip.charCodeAt(daySip.length - 1) - 0xac00) % 28 === 0 ? "가" : "이"} 놓여 있어 배우자성(${star.targetCategory})${star.isDayBranch ? "과 같은 종류" : "과 다른 종류"}${branch === "미미" ? " / 배우자성이 겉·속 모두 미약" : ""}${exprNote}`,
  };

  // ── P2 기준(끌리는 사람) ──
  let std: Ch2["std"] = null;
  if (branch !== "미미") {
    const present = star.subtypes.map((s, i) => ({ t: s.subtype, n: subCount[i] })).filter((x) => x.n > 0).map((x) => x.t);
    const lines: Tagged[] = present.map((s) => ({ text: STD_SUB[s], rule: `std:sub:${s}` }));
    if (present.length === 2) lines.push({ text: STD_BOTH[gender], rule: `std:both:${gender}` });
    std = { lead: { text: STD_LEAD[gender][focus], rule: `std:lead:${gender}:${focus}` }, lines, basis: `배우자성: ${starSummary(subNames, subCount, focus)} (${star.targetCategory})${gender === "female" && key3.gwansal.present ? " · 편관과 정관이 함께 있음(관살혼잡)" : ""}` };
  }

  // ── P3 깊어질 때 ──
  let deepen: Ch2["deepen"] = null;
  if (bgroup !== "hold") {
    const k = `${gk}-${bgroup}` as DKey; const t = DEEP[k];
    const lines: Tagged[] = [{ text: t.scene, rule: `deep:scene:${k}` }];
    if (star.exposure === "숨음") lines.push({ text: DEEP_HIDDEN, rule: "deep:hidden" });
    deepen = { lead: { text: t.lead, rule: `deep:lead:${k}` }, lines, need: { text: t.need, rule: `deep:need:${k}` }, basis: `일간 강약: ${bal.balanceLabel}${gender === "female" ? ` · 편관과 정관이 함께 있는가(관살혼잡): ${mixed ? "있음" : "없음"}` : ""}` };
  }

  // ── P4 서운함 ──
  let hurt: Ch2["hurt"] = null;
  if (star.exposure !== "미미") {
    const side = shape === "hidden" ? "숨음" : star.exposure === "뚜렷" ? "뚜렷" : "숨음";
    const k = `${root.hasRoot ? "지탱있음" : "지탱없음"}-${side}` as HKey; const t = HURT[k];
    hurt = { lead: { text: t.lead, rule: `hurt:lead:${k}` }, lines: t.when ? [{ text: t.when, rule: `hurt:when:${k}` }] : [], need: { text: t.need, rule: `hurt:need:${k}` }, basis: `일간의 뿌리(통근): ${root.hasRoot ? "있음" : "없음"} · 배우자성이 겉으로 드러나는 정도: ${side}` };
  }

  // ── P5 끌림 vs 편안함 ──
  // 끌림 = 인연의 별(배우자성: 관성/재성), 편안함 = 배우자 자리(일지)의 십성. 서로 다른 계산 근거.
  const cf = COMFORT[daySip] ?? COMFORT["비견"];
  const hedge: Tagged | null = relState === "충만" || relState === "합충모두" ? { text: COMFORT_HEDGE[relState], rule: `comfort:hedge:${relState}` } : null;
  const pk = `${match}-${focus}` as `${"일치" | "불일치"}-${Focus}`;
  const pt = PARTNER[pk];
  const dayZhi = user.pillars.branches.day.hanja;
  const personClause = STORY_PERSON[daySip] ?? cf.person.replace(/\.$/, "");
  const attractClause = STORY_ATTRACT[gender][focus];
  const bodyKind = star.exposure === "미미" ? "미미" : match;
  const bodyText = bodyKind === "미미"
    ? `함께 있을 때는 ${personClause}에게 편안함을 느끼는 편입니다.`
    : bodyKind === "일치"
      ? `${attractClause}에게 마음이 가는 편이고, 함께 있을 때도 ${personClause}에게 편안함을 느끼는 편입니다.`
      : `${attractClause}에게 마음이 가는 편입니다. 하지만 함께 있을 때는 ${personClause}에게 더 편안함을 느낄 수 있습니다.`;
  const partner: Ch2["partner"] = {
    lead: star.exposure === "미미"
      ? { text: PARTNER_LEAD_NONE, rule: "partner:lead:미미" }
      : { text: pt.lead, rule: `partner:lead:${match}` },
    body: { text: bodyText, rule: bodyKind === "미미" ? `partner:body:미미:-:-:${daySip}` : `partner:body:${bodyKind}:${gender}:${focus}:${daySip}` },
    hedge,
    basis: `끌리는 힘(배우자성) = ${star.targetCategory} / 편안해지는 자리(배우자 자리, 일지 ${dayZhi}) = ${daySip}(${CAT[daySip]})${star.exposure === "미미" ? "" : ` → ${match}`}${hedge ? ` · 일지의 ${relState === "충만" ? "충" : "합·충"}` : ""}`,
  };

  // ── P6 오래가는 사이 ── (역할: 인연의 별과 일지의 일치/불일치 × 무게중심, 피해야 할 관계: 일지 십성, 과정: 일지 합충)
  const sb = STAB[daySip] ?? STAB["비견"];
  const shinShown = !!SHIN_TXT[facts.shin] && !(facts.shin === "년살" && star.exposure === "미미");
  const stab: Ch2["stab"] = {
    avoid: { text: sb.avoid, rule: `stab:avoid:${daySip}` },
    shin: shinShown ? { text: SHIN_TXT[facts.shin], rule: `shin:${facts.shin}` } : null,
    rel: relState !== "없음" ? { text: REL_CLAUSE[relState], rule: `stab:rel:${relState}` } : null,
    basis: `배우자 자리(일지) ${dayZhi} = ${daySip} · 일지의 합: ${heC} · 충: ${chC}${star.exposure === "미미" ? "" : ` · 배우자성과 ${match}`}${shinShown ? ` · 일지 12신살: ${facts.shin}` : ""}`,
  };

  // ── P7 시기 ──
  const tl: Tagged[] = [];
  if (starYears.length >= 4) tl.push({ text: `${starYears[0]}년부터 ${starYears[starYears.length - 1]}년까지 여러 해에 걸쳐 새로운 사람이나 인연을 의식하게 되는 흐름이 이어집니다. 마음이 자주 움직이는 시기입니다.`, rule: `timing:starmany:${starYears[0]}-${starYears[starYears.length - 1]}` });
  else {
    const byVia = new Map<string, number[]>();
    starYears.forEach((y) => byVia.set(starVia[y], [...(byVia.get(starVia[y]) ?? []), y]));
    byVia.forEach((ys, via) => {
      const runs: number[][] = []; ys.forEach((y) => { const last = runs[runs.length - 1]; if (last && y === last[last.length - 1] + 1) last.push(y); else runs.push([y]); });
      const disp = runs.map((r) => (r.length > 1 ? `${r[0]}~${r[r.length - 1]}` : `${r[0]}`)).join("·");
      const key = runs.map((r) => (r.length > 1 ? `${r[0]}-${r[r.length - 1]}` : `${r[0]}`)).join(",");
      tl.push({ text: `${disp}년 — ${STAR_YEAR_TXT[via as "gan" | "ji" | "hidden"]}`, rule: `timing:star:${key}:${via}` });
    });
  }
  palaceYears.slice(0, 3).forEach((p) => {
    const ty = p.types[0]; if (REL_TYPE_TXT[ty]) tl.push({ text: `${p.year}년 — ${REL_TYPE_TXT[ty]}`, rule: `timing:palace:${p.year}:${ty}` });
  });
  if (curActive) tl.push({ text: "지금 지나는 대운(10년 흐름) 내내 인연에 마음이 쓰이기 쉽습니다.", rule: "timing:dayun:cur" });
  else if (nextActive && nextAge) tl.push({ text: `다음 대운(${nextAge})부터 인연에 마음이 쓰이기 쉬운 흐름이 시작됩니다.`, rule: `timing:dayun:next:${nextAge}` });
  if (starYears.length > 0 && palaceYears.length > 0 && !palaceYears.some((p) => starYears.includes(p.year))) {
    const shownTypes = Array.from(new Set(palaceYears.slice(0, 3).map((p) => p.types[0]).filter((t) => REL_TYPE_TXT[t])));
    const sepKind = shownTypes.length === 1 ? shownTypes[0] : "혼합";
    tl.push({ text: SEPARATE_TXT[sepKind], rule: `timing:separate:${sepKind}` });
  }
  // 연도 항목은 시간순으로 정렬한다(별 신호 해와 배우자 자리 신호 해를 섞어서).
  const isYearItem = (t: Tagged) => /^timing:(star|palace):\d{4}[\d,-]*:/.test(t.rule);
  const yearsSorted = tl.filter(isYearItem).map((t, idx) => ({ t, idx, y: Number(t.rule.split(":")[2].slice(0, 4)) })).sort((a, b) => a.y - b.y || a.idx - b.idx).map((x) => x.t);
  const ordered = [...tl.filter((t) => t.rule.startsWith("timing:starmany")), ...yearsSorted, ...tl.filter((t) => !isYearItem(t) && !t.rule.startsWith("timing:starmany"))];
  const timingSec = tl.length ? { lines: ordered, basis: `배우자성이 오는 해(세운): ${starYears.map((y) => `${y}(${starViaTxt[y]})`).join(" · ") || "-"} / 배우자 자리(일지 ${dayZhi})에 합·충·자형이 오는 해: ${palaceYears.map((p) => `${p.year} ${p.types.join("·")}`).join(" · ") || "-"}` } : null;

  // ── P8 지켜야 할 것 ──
  const fwd = bgroup === "hold" ? { lead: null, basis: "일간 강약을 하나로 정하기 어려운 사주" } : { lead: { text: FWD[bgroup][root.hasRoot ? "있음" : "없음"], rule: `fwd:${bgroup}-${root.hasRoot ? "있음" : "없음"}` } as Tagged, basis: `일간 강약: ${bal.balanceLabel} · 일간의 뿌리(통근): ${root.hasRoot ? "있음" : "없음"}` };

  // ── 명식 표시 ──
  const targetSubs = new Set<string>(star.targetCategory === "관성" ? ["편관", "정관"] : ["편재", "정재"]);
  const pil = (["hour", "day", "month", "year"] as const).filter((st) => user.pillars[st] && user.pillars.branches[st]).map((st) => ({
    stage: { hour: "시", day: "일", month: "월", year: "년" }[st], stem: user.pillars[st].hanja, stemSip: st === "day" ? "일간" : user.pillars[st].sipseong, stemEl: user.pillars[st].element,
    branch: user.pillars.branches[st].hanja, branchSip: user.pillars.branches[st].sipseong, branchEl: user.pillars.branches[st].element,
    stemStar: st !== "day" && targetSubs.has(user.pillars[st].sipseong), branchStar: targetSubs.has(user.pillars.branches[st].sipseong), palace: st === "day",
  }));
  const kind = star.exposure === "미미" || (subCount[0] === 0 && subCount[1] === 0) ? "none" : subCount[0] > 0 && subCount[1] > 0 ? "both" : subCount[0] > 0 ? "A" : "B";
  const [nA, nB] = subNames;
  const kindTxt = kind === "both" ? `이 사주에는 ${nA}${josaWa(nA)} ${nB}${josaGa(nB)} 모두 있습니다.` : kind === "A" ? `이 사주에는 ${nA}만 있습니다.` : kind === "B" ? `이 사주에는 ${nB}만 있습니다.` : "이 사주에서는 이 글자가 겉으로 거의 드러나지 않습니다.";
  const notes: Tagged[] = [
    { text: `사주에서는 ${gender === "female" ? "여성" : "남성"}의 연애·배우자 인연을 ${gender === "female" ? "정관·편관" : "정재·편재"}${hasBatchim(gender === "female" ? "정관·편관" : "정재·편재") ? "이라는" : "라는"} 글자로 봅니다. 위 표에서 금색 테두리가 그 글자입니다.`, rule: `chart:intro:${gender}` },
    { text: kind === "none" ? kindTxt : `${kindTxt} 그래서 ${STD_SHORT[gender][focus]}에게 마음이 갑니다.`, rule: kind === "none" ? "chart:star:none" : `chart:star:${kind}:${gender}:${focus}` },
    { text: `표의 붉은 테두리는 곁에서 편안함을 느끼는 방식을 정하는 자리(일지 ${dayZhi})입니다. 여기서는 ${cf.person.replace(/\.$/, "")}에게 편안함을 느낍니다.`, rule: `chart:comfort:${daySip}:${dayZhi}` },
    { text: kind === "none" ? "그래서 마음이 가는 유형보다, 함께 있을 때 편안한 사람이 관계를 정하기 쉽습니다." : match === "일치" ? "그래서 마음이 가는 사람과 함께 있을 때 편안한 사람이 크게 다르지 않습니다." : "그래서 마음이 가는 사람과 함께 있을 때 편안한 사람은 다를 수 있습니다.", rule: `chart:link:${kind === "none" ? "none" : match}` },
  ];
  if (facts.cheoneulDay) notes.push({ text: GWIIN_DAY_TXT, rule: "gwiin:day" });
  return { name, facts, open, std, deepen, hurt, partner, stab, timing: timingSec, fwd, chart: { pillars: pil as any, hiddenStar: "", notes, basis: `배우자성(${star.targetCategory}): ${starSummary(subNames, subCount, focus)} · 배우자 자리(일지 ${dayZhi}) = ${daySip}(${CAT[daySip]})${star.exposure === "미미" ? "" : ` → 배우자성과 ${match}`}${facts.cheoneulDay ? " · 일지 천을귀인: 있음" : ""}`, noHour: !(user.pillars.hour && user.pillars.branches.hour) } };
}
