// 2장 「타고난 기질」 결정론 생성기 1차(scratch). Production·PDF·기존 원고 미수정.
// 새 계산식 없음: 기존 엔진 값(십성 세부, 지장간, 일간 음양, 신강/신약 계열)만 조합한다. 랜덤 없음 — 같은 계산이면 같은 글.
// 문장 변형은 일간(10종)으로만 고르며 뜻은 같다. 본문에는 명리 용어를 쓰지 않는다(용어는 「명리 근거」에서만).
// 모든 문장은 { text, rule }로 태그되어 자동 검사된다.
import { AppData } from "../lib/sajuContent";
import { computeSipseong } from "../lib/aiLifeReport";
import { GAN_YINYANG, GENERATES, OVERCOMES, getSinsalName } from "../lib/hanjaTables";
import { buildElementAnalysis } from "../lib/aiLifeReport";
import { analyzeSeasonStatus } from "../lib/natalStructure";
import { analyzeDayMasterBalance } from "../lib/dayMasterBalanceAnalysis";

export interface T { text: string; rule: string }
export interface Sec { key: "A" | "B" | "C" | "D" | "E1" | "E2" | "E3"; heading: string; paras: T[][]; basis: string; level: string; branch: string }
export interface Ch2Ki { name: string; sections: Sec[]; omitted: string[]; facts: Facts }

type Stage = "year" | "month" | "hour";
export interface Ch { stage: Stage; kind: "간" | "지"; hanja: string; sip: string }
export interface Hid { stage: Stage; branch: string; stem: string; sip: string }
export interface Facts {
  name: string; hasHour: boolean; dayGan: string; stemIdx: number; yy: "양간" | "음간"; bg: "강" | "약" | "중" | "보류";
  chars: Ch[]; hidden: Hid[];
  el: Record<string, number>; season: string; sin: { stage: "month" | "hour"; name: string; branch: string }[];
}
const STAGE_KO: Record<Stage, string> = { year: "년", month: "월", hour: "시" };
const CAT: Record<string, string> = { 비견: "비겁", 겁재: "비겁", 식신: "식상", 상관: "식상", 편재: "재성", 정재: "재성", 편관: "관성", 정관: "관성", 편인: "인성", 정인: "인성" };
const STEMS = "甲乙丙丁戊己庚辛壬癸";

export function buildFacts(a: AppData): Facts {
  const u: any = a.user; const dayGan: string = u.pillars.day.hanja;
  const chars: Ch[] = []; const hidden: Hid[] = [];
  (["year", "month", "hour"] as const).forEach((s) => {
    const st = u.pillars[s]; const br = u.pillars.branches[s];
    if (st) chars.push({ stage: s, kind: "간", hanja: st.hanja, sip: st.sipseong });
    if (br) chars.push({ stage: s, kind: "지", hanja: br.hanja, sip: br.sipseong });
    const ex = u.natal.pillars[s];
    if (br && ex) (ex.hideGan as string[]).slice(1).forEach((g) => hidden.push({ stage: s, branch: br.hanja, stem: g, sip: computeSipseong(dayGan, g) }));
  });
  const bal = analyzeDayMasterBalance(u).balance;
  const bg = bal === "clearlyStrong" || bal === "slightlyStrong" ? "강" : bal === "clearlyWeak" || bal === "slightlyWeak" ? "약" : bal === "neutral" ? "중" : "보류";
  const el = buildElementAnalysis(a.chars).counts as Record<string, number>;
  const season = analyzeSeasonStatus(u).rulingElement as string;
  const yearZ: string = u.pillars.branches.year.hanja; const sin: Facts["sin"] = [];
  (["month", "hour"] as const).forEach((s) => { const b = u.pillars.branches[s]; if (b) { const nm = getSinsalName(yearZ, b.hanja); if (nm === "역마살" || nm === "화개살") sin.push({ stage: s, name: nm, branch: b.hanja }); } });
  return { name: u.name, hasHour: !!u.pillars.hour, dayGan, stemIdx: STEMS.indexOf(dayGan), yy: GAN_YINYANG[dayGan] === "yang" ? "양간" : "음간", bg, chars, hidden, el, season, sin };
}

const cnt = (f: Facts, k: string) => f.chars.filter((c) => c.sip === k).length;
const hcnt = (f: Facts, k: string) => f.hidden.filter((c) => c.sip === k).length;
const catCnt = (f: Facts, cat: string) => f.chars.filter((c) => CAT[c.sip] === cat).length;
const catAny = (f: Facts, cat: string) => catCnt(f, cat) + f.hidden.filter((h) => CAT[h.sip] === cat).length > 0;
type Pair = "없음" | "1만" | "2만" | "둘다1" | "둘다2" | "동수";
function pairOf(f: Facts, k1: string, k2: string, src: "chars" | "hidden"): Pair {
  const a1 = src === "chars" ? cnt(f, k1) : hcnt(f, k1), a2 = src === "chars" ? cnt(f, k2) : hcnt(f, k2);
  if (!a1 && !a2) return "없음"; if (a1 && !a2) return "1만"; if (!a1 && a2) return "2만";
  return a1 > a2 ? "둘다1" : a1 < a2 ? "둘다2" : "동수";
}
type Pos = "천간만" | "지지만" | "천간+지지";
function posOf(f: Facts, kinds: string[]): Pos | null {
  const g = f.chars.some((c) => c.kind === "간" && kinds.includes(c.sip)), j = f.chars.some((c) => c.kind === "지" && kinds.includes(c.sip));
  return g && j ? "천간+지지" : g ? "천간만" : j ? "지지만" : null;
}
const eun = (f: Facts) => `${f.name}님은`;
/** 개수 많은 순, 동수면 주어진 순서. skip에 든 것은 다른 블록이 이미 다루므로 대체 근거로 쓰지 않는다. */
const desc = (f: Facts, cats: string[], skip: string[]): string | null => {
  const c = cats.filter((x) => !skip.includes(x)).map((x, i) => ({ x, n: catCnt(f, x), i })).filter((o) => o.n > 0).sort((p, q) => q.n - p.n || p.i - q.i);
  return c.length ? c[0].x : null;
};
const V = <X,>(f: Facts, arr: X[]): X => arr[f.stemIdx % arr.length]; // 일간 10종으로 표현 변형만 고른다(뜻 동일)

/* ───────── A. 생각을 붙잡고 판단하는 방식 ───────── */
const A_MAIN: Record<Exclude<Pair, "없음">, [string[], string[]]> = {
  "1만": [
    ["결정을 앞두면 먼저 ‘이게 왜 그런 건지’부터 확인하려는 편입니다.", "무슨 일이든 근거를 먼저 확인하고 나서야 마음이 놓이는 편입니다.", "선택 앞에서는 먼저 이유와 순서를 알아보는 쪽으로 손이 갑니다."],
    ["처음 해 보는 일이라도 이유와 순서를 알고 나면 마음이 놓입니다. 반대로 이유를 모르면 판단이 서지 않아 결정을 내리기 어렵습니다.", "설명해 주는 사람이나 참고할 자료가 있으면 훨씬 빠르게 익힙니다. 무엇을 왜 하는지 모른 채 시작한 일은 끝까지 마음 한쪽이 찜찜하게 남습니다.", "새 물건이나 새 방식을 쓸 때도 설명서부터 훑어보는 쪽이고, 어떻게 돌아가는지 이해한 뒤에는 남에게 알려 줄 수 있을 만큼 정확히 익힙니다."],
  ],
  "2만": [
    ["다들 당연하게 넘기는 부분에서 ‘그런데 이건 왜 그렇지?’ 하는 생각이 먼저 드는 편입니다.", "남들이 정답이라고 하는 것도 한 번은 다른 각도에서 뒤집어 보게 되는 편입니다.", "같은 것을 봐도 남들이 잘 보지 않는 면이 먼저 눈에 들어오는 편입니다."],
    ["정해진 설명을 그대로 받아들이기보다 나만의 이유를 찾으려 하고, 한 가지에 마음이 꽂히면 남들이 지나치는 세부까지 파고듭니다. 그래서 결론이 주변과 조금 다르게 나오는 일이 잦습니다.", "한 가지가 궁금해지면 관련된 것을 끝없이 따라가 보기도 합니다. 그 과정에서 남들이 놓친 이유를 찾아내는 일이 종종 있고, 그래서 내 결론이 주변과 다르게 나오기도 합니다.", "다 아는 이야기처럼 보여도 어딘가 이상한 구석이 있으면 그냥 넘어가지 못합니다. 그 한 부분을 붙들고 파고들다 보면, 처음과는 전혀 다른 결론에 도착하기도 합니다."],
  ],
  둘다1: [
    ["근거를 확인하는 것으로 시작하되, 거기서 멈추지 않고 다른 각도로도 한 번 살펴보는 편입니다."],
    ["먼저 기본이 되는 근거를 찾아 다진 뒤에, 그 근거가 이 경우에도 정말 맞는지 한 번 더 따져 봅니다. 먼저 확인하고, 그다음에 남다른 시각을 더해 보는 순서입니다.", "기본이 되는 설명을 먼저 챙기고, 그다음에 ‘그런데 이번에는 조금 다르지 않을까?’를 덧붙여 봅니다."],
  ],
  둘다2: [
    ["남다른 각도에서 먼저 생각을 시작하되, 그 생각이 맞는지는 근거로 한 번 다져 보는 편입니다."],
    ["처음 떠오르는 것은 남들과 다른 이유나 시각인데, 그걸 그대로 밀어붙이기 전에 확인할 자료를 한 번 찾아봅니다. 먼저 떠오른 생각을 세운 다음, 그 생각이 맞는지 확인하는 순서입니다.", "발상은 나만의 각도에서 나오고, 결론을 내리기 전에는 근거로 한 번 걸러 냅니다."],
  ],
  동수: [
    ["일에 따라 근거를 차근차근 확인하기도 하고, 남들이 안 보는 각도로 파고들기도 하는 편입니다."],
    ["어떤 일은 설명과 순서를 다 확인한 뒤에야 움직이고, 어떤 일은 남들이 안 보는 이유를 찾아 끝까지 파고듭니다. 그래서 일에 따라 확인하는 모습과 파고드는 모습이 번갈아 나옵니다.", "기본을 확인하는 날도 있고, 정해진 답을 뒤집어 보는 날도 있습니다. 일의 성격에 따라 어느 쪽이 나올지 달라집니다."],
  ],
};
const A_POS: Record<Pos, string[]> = {
  천간만: ["따져 보다가 걸리는 부분이 생기면 ‘그 부분은 어떻게 된 건가요?’ 하고 그 자리에서 물어보는 편이라, 옆 사람도 어디가 걸리는지 알아챕니다.", "생각하는 동안 ‘그럼 이건 어때?’ 하고 물어보는 일이 잦아서, 어떤 점이 걸리는지 주변에서도 알게 됩니다.", "따져 보는 중에 혼잣말이 새어 나오는 편이라, 결론이 나기 전에도 무엇을 따지는 중인지 옆 사람이 알아챕니다."],
  지지만: ["따져 보는 동안에는 질문이나 말로 잘 꺼내지 않고 혼자 정리하는 편이라, 주변에서는 결론이 나온 뒤에야 알게 되는 경우가 많습니다.", "고민 중이라는 말을 잘 하지 않고 혼자 정리하는 편이라, 옆에서는 생각 없이 지나가는 것처럼 보이기도 합니다.", "생각은 혼자 있는 시간에 진행되는 편이라, 결과만 나중에 알려지는 일이 많습니다."],
  "천간+지지": ["따져 보는 과정이 질문으로 밖에 나오기도 하고, 혼자 있을 때 한 번 더 이어지기도 합니다.", "생각하는 동안 물어보기도 하고, 혼자 남았을 때 다시 곱씹기도 합니다."],
};
const A_HID: Record<string, string[]> = {
  "1만": ["그때는 무엇이 원인이었는지 순서대로 짚어 보고 나서야 마음이 정리됩니다."],
  "2만": ["그때는 남들이 놓친 부분은 없었는지 다른 각도에서 다시 들여다봅니다."],
  both: ["그때는 원인을 순서대로 짚어 보다가, 남들이 놓친 부분은 없었는지도 다른 각도에서 다시 들여다봅니다."],
};
const A_SUB: Record<string, string[]> = {
  식상: ["생각을 머릿속에 오래 쌓아 두고 정리하기보다, 말을 꺼내고 손을 움직이는 동안 판단이 굳어지는 편입니다.", "혼자 고민할 때보다 누군가에게 이야기하거나 일단 시작해 볼 때 결론이 더 빨리 섭니다."],
  재성: ["머릿속에서 오래 저울질하기보다, 눈에 보이는 결과나 실제로 해 본 경험을 보고 판단하는 편입니다.", "그래서 머릿속에서 따지는 것보다, 직접 확인한 것에서 확신을 얻습니다."],
  비겁: ["이유를 오래 따지기보다 ‘내 느낌이 어떤가’가 먼저 오고, 그 느낌이 서야 판단이 굳어집니다.", "스스로 납득한 순간 방향이 정해지고, 남이 정해 준 결론보다 내가 납득한 결론에 마음이 움직입니다."],
};

/* ───────── B. 생각과 마음이 말·행동으로 나오는 방식 ───────── */
const B_MAIN: Record<Exclude<Pair, "없음">, [string[], string[]]> = { // 1=식신 계열(차분), 2=상관 계열(즉시)
  "1만": [
    ["하려는 말이나 일이 생기면 서두르지 않고 차분하게 꺼내는 편입니다.", "말이든 일이든 급하지 않게, 차분하게 꺼내 놓는 편입니다."],
    ["말이 급하지 않아서, 듣는 사람이 따라가기 편하고 말과 결과물이 안정적이라는 인상을 주기 쉽습니다.", "급하게 결론을 내놓기보다 차례로 전달하는 쪽이라, 듣는 사람이 내용을 놓치지 않고 따라갈 수 있습니다.", "말과 결과물을 여유 있게 내놓는 편이라, 나온 것이 처음부터 안정적입니다."],
  ],
  "2만": [
    ["이야기하는 도중에 생각이 떠오르면 그 자리에서 바로 말로 꺼내는 편입니다.", "대화 속에서 떠오른 생각은 일단 말로 꺼내 놓고 보는 편입니다."],
    ["그래서 대화를 하면서 생각이 더 선명해지기도 하고, 아니다 싶은 부분은 그 자리에서 바로 고쳐 말합니다. 정해진 방식이 마음에 안 들면 참고 따르기보다 ‘이렇게 하면 안 돼요?’ 하고 다른 안을 바로 말합니다.", "말을 하면서 생각을 다듬는 일이 많아서, 처음 한 말과 끝에 남는 결론이 다를 때도 있습니다. 마음에 걸리는 부분은 넘기지 않고 바로 짚습니다.", "머릿속에서만 굴리는 것보다 말로 꺼내 볼 때 생각이 정리되는 쪽입니다."],
  ],
  둘다1: [
    ["기본적으로는 차분하게 꺼내는 편이지만, 마음에 걸리는 부분이 생기면 그때만은 말이 빨라집니다."],
    ["평소에는 느긋한데, 아닌 것을 보면 넘기지 못하고 바로 짚는 순간이 있습니다.", "평소에는 차분하다가, 짚어야 할 대목에서만 말이 빨라집니다."],
  ],
  둘다2: [
    ["기본적으로는 떠오르는 대로 바로 꺼내는 편이지만, 중요한 일일수록 한 번 다듬어서 내놓기도 합니다."],
    ["가벼운 이야기는 거침없이 나오고, 결과가 남는 일은 앞뒤를 맞춘 뒤에 꺼냅니다.", "평소에는 바로바로 꺼내는데, 결과가 오래 남는 일에서는 한 번 준비하고 꺼냅니다."],
  ],
  동수: [
    ["차분하게 꺼낼 때와 떠오르는 대로 바로 꺼낼 때가 함께 있는 편입니다."],
    ["어떤 말은 시간을 들여 내놓고, 어떤 말은 그 자리에서 바로 나옵니다. 그래서 느긋할 때와 빠를 때가 섞여 나옵니다.", "차분하게 내놓는 일과 즉석에서 꺼내는 일이 나란히 있습니다."],
  ],
};
const B_HID: Record<string, string[]> = {
  "1만": ["하고 싶은 말은 바로 꺼내지 않고, 편안한 자리나 시간이 조금 지난 뒤에 자연스럽게 나오는 편입니다."],
  "2만": ["참아 둔 말이나 하고 싶은 시도는 바로 내놓지 않다가, 시간이 지난 뒤 마음에 걸렸던 부분을 콕 집어 꺼내는 일이 있습니다."],
  both: ["하고 싶은 말은 바로 꺼내지 않고 시간이 지난 뒤 자연스럽게 나오기도 하고, 마음에 걸렸던 부분을 콕 집어 꺼내기도 합니다."],
};
const B_SUB: Record<string, string[]> = {
  비겁: ["마음이나 생각을 말로 풀어내기보다, 내 방식대로 밀고 가는 행동으로 보여 주는 편입니다.", "말은 적어도 하는 일에는 분명한 방향이 담겨 있습니다."],
  재성: ["마음이나 생각을 말로 앞세우기보다, 결과물이나 실제로 해낸 것으로 보여 주는 편입니다.", "설명은 짧고, 해낸 뒤에 결과로 이야기하는 쪽입니다."],
  인성: ["생각이나 마음을 곧바로 꺼내기보다, 충분히 이해하고 정리된 뒤에 조용히 내놓는 편입니다.", "그래서 말이 나올 때는 이미 앞뒤가 맞춰져 있고, 대신 나오기까지 시간이 걸립니다."],
};
// 정리 순서: 식신 계열은 '시작'을, 상관 계열·혼합은 '꺼냄'을 기준으로 쓴다(앞 문장과 모순되지 않게)
const B_ORDER: Record<"차분" | "즉시", Record<"있음" | "없음", string[]>> = {
  차분: {
    있음: ["한 번 꺼낸 말은 중간에 바뀌는 일이 적은 편입니다.", "나오는 말은 앞뒤가 맞는 편이라 흐트러짐이 적습니다.", "꺼낸 말이 처음 생각한 방향에서 크게 벗어나지 않는 편입니다."],
    없음: ["완성된 말을 내놓기보다 꺼내면서 다듬어 가는 쪽입니다.", "완벽하게 준비되기 전에도 꺼내 놓고, 꺼낸 뒤에 고쳐 갑니다.", "미리 다 정해 놓기보다 꺼내면서 고쳐 가는 편입니다."],
  },
  즉시: {
    있음: ["다만 말이 나올 때는 어느 정도 앞뒤가 맞아 있는 편입니다.", "빠르게 꺼내도 앞뒤가 크게 어긋나지는 않는 편입니다.", "즉석에서 나오는 듯해도 말이 뒤죽박죽이 되는 일은 드문 편입니다."],
    없음: ["정리가 끝나기를 기다리지 않고 꺼내는 편이라, 말하는 도중에 생각이 정리되는 일이 많습니다.", "완벽히 정리되기를 기다리지 않고 일단 말부터 꺼내 놓고, 나온 말을 고치면서 다듬어 갑니다.", "정리는 말이 나간 뒤에 따라옵니다."],
  },
};
const B_YY: Record<"양간" | "음간", string[]> = {
  양간: ["기분은 표정과 목소리에 바로 실려서, 굳이 말하지 않아도 옆 사람에게 분위기로 전해집니다.", "마음이 얼굴에 잘 드러나는 편이라, 기분이 좋을 때도 상했을 때도 감추기 어렵습니다.", "기분이 움직이면 표정이 먼저 반응해서, 숨기려 해도 티가 나는 편입니다."],
  음간: ["기분은 겉으로 잘 드러내지 않아서, 마음이 상해도 옆 사람은 눈치채기 어렵습니다.", "속으로는 기분이 크게 오르내려도 겉으로는 담담해 보이는 편입니다.", "기분을 표정에 싣는 데는 신중해서, 좋고 싫음이 겉으로 바로 보이지 않습니다."],
};
/* ───────── C. 내 기준과 다른 사람의 기준 사이 ───────── */
const C_MAIN: Record<Exclude<Pair, "없음">, [string[], string[]]> = { // 1=비견, 2=겁재
  "1만": [
    ["내 방식과 남의 방식이 다르면, 굳이 맞추기보다 각자 자기 방식대로 하는 쪽으로 정리하는 편입니다.", "다른 방식을 만나면 하나로 맞추려 하기보다 각자 하던 대로 하자는 쪽으로 기웁니다."],
    ["상대의 방식을 부정하지는 않지만, 내 방식을 바꾸라는 말에는 쉽게 움직이지 않습니다. 각자 자기 몫을 하되 서로 일일이 간섭하지 않는 쪽을 택합니다.", "서로 다른 방식을 억지로 하나로 맞추려 하지 않습니다. 내 방식은 내가 정한다는 생각이 분명합니다.", "내 몫은 내가, 네 몫은 네가 하는 식이 익숙하고, 그 선을 넘어 간섭받으면 불편해집니다."],
  ],
  "2만": [
    ["내 기준과 다른 기준을 만나면, 무시하고 넘어가기보다 ‘그럼 나는 어떤가’ 하고 견주어 보게 되는 편입니다.", "다른 사람의 기준을 만나면 옳고 그름보다 ‘나는 그만큼 하고 있나’가 먼저 떠오르는 편입니다."],
    ["주변에서 잘하는 사람을 보면 자극이 되고, 나만 뒤처지는 것 같으면 마음이 급해집니다. 그래서 견줄 만한 사람 앞에서 내 기준이 더 예민해집니다.", "다른 사람의 기준이 눈에 들어오면 나도 모르게 비교부터 하게 되고, 그 비교가 나를 더 움직이게도, 더 조급하게도 만듭니다.", "남이 정해 둔 기준이 높아 보이면 지지 않으려는 마음이 올라와서, 내 기준도 함께 끌어올리게 됩니다."],
  ],
  둘다1: [
    ["기본은 각자의 방식을 인정하는 쪽인데, 가끔은 남과 견주는 마음이 올라오는 편입니다."],
    ["평소에는 ‘각자 알아서 하자’로 정리되지만, 잘 아는 사람이 앞서 나가면 마음속에서 비교가 시작되기도 합니다.", "선을 긋는 쪽이 기본이고, 견주는 마음은 특정한 순간에만 나옵니다."],
  ],
  둘다2: [
    ["기본은 견주는 마음이 앞서는 편인데, ‘각자 하자’로 정리하고 넘어갈 때도 있습니다."],
    ["비교부터 하게 되지만, 상대의 방식을 그대로 두고 넘어가기도 합니다.", "견주는 마음이 먼저 오지만, 그 마음을 따라가지 않고 각자 하자고 넘기기도 합니다."],
  ],
  동수: [
    ["각자 알아서 하자는 마음과 지고 싶지 않은 마음이 함께 있는 편입니다."],
    ["평소에는 ‘각자 알아서 하자’로 정리하다가도, 옆 사람이 먼저 앞서 나가면 나도 모르게 비교하는 마음이 올라옵니다.", "같이 하는 일에서 각자 역할을 나누는 것은 편한데, 그 역할에서 누가 더 잘하는지가 눈에 들어오면 나도 모르게 비교하게 됩니다."],
  ],
};
const C_HID: Record<string, string[]> = {
  "1만": ["다른 방식을 만나도 바로 내세우지는 않지만, 중요한 대목에서는 내 방식을 조용히 지킵니다."],
  "2만": ["다른 사람의 기준을 만나도 바로 드러내지는 않지만, 혼자 있을 때 그 기준과 나를 견주어 보는 일이 있습니다."],
  both: ["다른 방식이나 기준을 만나도 바로 드러내지는 않지만, 중요한 대목에서는 내 방식을 조용히 지키고 혼자 있을 때는 그 기준과 나를 견주어 보기도 합니다."],
};
const C_SUB: Record<string, string[]> = {
  인성: ["내 기준을 앞세우기보다 상대 이야기를 이해해 보고 반영하는 쪽으로 기우는 편입니다.", "기준이 다를 때 먼저 ‘저 사람은 왜 그렇게 생각할까’를 따져 보고, 납득이 되면 방향을 고칩니다."],
  식상: ["기준이 다를 때 내 기준을 앞세우기 전에 상대 기준이 어디서 다른지부터 살펴보는 편입니다.", "다르다는 점을 확인하고 나서 내 기준을 정하는 편입니다."],
  재성: ["기준이 다를 때 누가 옳은가보다, 실제로 어느 쪽이 더 잘 굴러가는지를 보고 정하는 편입니다.", "옳고 그름을 다투기보다 결과가 나은 쪽을 따르는 데 거리낌이 적습니다."],
};
const C_IN: Record<"있음" | "없음", string[]> = {
  있음: ["다만 상대가 이유를 설명해 주면 귀담아듣고, 납득이 되면 내 방식을 고치기도 합니다.", "상대의 설명이 이해되는 순간에는 기준을 고치는 데 오래 걸리지 않습니다.", "이유가 분명한 이야기 앞에서는 내 방식을 한 발 물릴 줄도 압니다."],
  없음: ["말로 설명을 듣는 것만으로 내 기준이 움직이는 일은 많지 않은 편입니다.", "이유를 길게 들어도 기준이 바뀌기까지는 시간이 걸리는 편입니다.", "말로 하는 설득보다는 시간이 지나 상황이 달라졌을 때 기준을 고치는 편입니다."],
};
// 비견만 + 신약 + '내 방식을 바꾸라는 말에는 쉽게 움직이지 않습니다' 변형이 함께 나올 때만 쓰는 연결 문장: '평소 요구에는 버팀 / 상대의 기준이 강하게 들어오는 자리에서는 기울기 쉬움'
const C_BG_LINK: string[] = ["쉽게 움직이지 않던 내 방식도 상대의 기준이 강하게 들어오는 자리에서는 그쪽으로 기울기 쉬워서, 결정 전에 내 기준부터 한 번 적어 보면 도움이 됩니다.", "평소에는 버티는 편이라도 상대의 기준이 강할수록 내 기준이 묻히기 쉬우니, 답하기 전에 내 생각부터 정리해 두는 편이 낫습니다."];
const C_BG: Record<"강" | "약" | "중", string[]> = {
  강: ["의견이 갈려도 내 쪽 기준은 쉽게 바꾸지 않는 편입니다.", "의견이 갈리는 자리에서도 내 기준을 쉽게 내려놓지 않는 편입니다."],
  약: ["상대의 기준이 강하게 들어오면 내 기준이 그쪽으로 기울기 쉬워서, 결정 전에 내 기준부터 한 번 적어 보면 도움이 됩니다.", "상대의 기준이 강할수록 내 기준이 묻히기 쉬우니, 답하기 전에 내 생각부터 정리해 두는 편이 낫습니다."],
  중: [],
};

/* ───────── D. 생각과 표현이 만나는 지점(A×B 조합, 새 계산 없음) ───────── */
type AT = "정" | "편" | "혼"; type BT = "식" | "상" | "혼";
const D_TABLE: Record<`${AT}${BT}`, string[]> = {
  정식: ["확인할 것이 많을수록 꺼내는 시점이 뒤로 밀릴 수 있습니다.", "준비가 충분하다고 느껴질 때까지 내놓는 시점이 늦어질 수 있습니다."],
  정상: ["근거를 확인하는 동안은 조용하다가, 확인이 끝나서 결론이 서면 그때부터는 망설임 없이 바로 말로 꺼냅니다.", "확인은 신중하게 하는데, 결론이 서고 나면 꺼내는 데 망설임이 없습니다. 옆에서 보면 조용하던 사람이 갑자기 말이 많아진 것처럼 보일 수 있습니다."],
  정혼: [],
  편식: ["혼자 오래 파고든 생각은 나오는 데 시간이 걸리지만, 나오고 나면 남들과 다른 색이 담겨 있습니다.", "남다른 각도에서 시작한 생각을 오래 다듬은 다음에 꺼내서, 나오기까지는 오래 걸려도 나오면 독특합니다."],
  편상: ["혼자 있을 때는 한 가지 생각을 오래 붙잡고 들여다보는 편입니다. 그런데 사람들과 이야기를 나눌 때는 머릿속에 있던 생각이 예상보다 빨리 말로 나올 때가 있습니다. 그래서 듣는 사람에게는 갑작스러운 이야기로 들리기도 하고, 말하면서 결론이 바뀌기도 합니다. 다만 오래 붙들고 있던 만큼, 말로 나올 때는 한 가지 이야기가 꽤 깊고 구체적으로 나오는 편입니다.", "혼자 있을 때는 한 가지 생각을 오래 파고드는 편인데, 사람들과 이야기를 나누다 보면 그 생각이 불쑥 말로 나올 때가 있습니다. 그래서 처음 듣는 사람에게는 갑작스러운 이야기로 들릴 수 있습니다. 다만 오래 파고든 만큼, 말로 나올 때는 한 가지 이야기가 꽤 깊고 구체적으로 나오는 편입니다."],
  편혼: [],
  혼식: [],
  혼상: [],
  혼혼: [],
};


/* ───────── E1. 기본 에너지가 붙는 환경(오행 우세/부족 + 함께 타고난 바탕) ───────── */
type El = "wood" | "fire" | "earth" | "metal" | "water";
const EL_KO: Record<string, string> = { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" };
const E1_DOM: Record<El, string[]> = {
  wood: ["같은 일이 되풀이되면 흥미가 식고, 방법이나 범위가 새로워지면 다시 마음이 붙는 편입니다.", "하던 일이라도 방법이나 범위를 바꿀 여지가 있으면 마음이 붙고, 똑같이 되풀이되는 일에는 금세 흥미가 식습니다."],
  fire: ["옆에서 지켜보기만 하는 일보다, 내가 직접 말하고 보여 주고 움직여 볼 수 있는 일에 마음이 더 빨리 붙는 편입니다. 그런 일에는 한번 빠지면 시간 가는 줄 모르고 몰두합니다."],
  earth: ["갑자기 몰아치는 일보다 매일 비슷하게 돌아가는 일에 마음이 붙는 편입니다. 한 가지 일도 오래 하다 보면 손에 익어서, 익숙해질수록 오히려 마음이 더 붙습니다.", "갑자기 바뀌거나 몰아치는 일보다, 하던 순서대로 돌아가는 일에 마음이 붙는 편입니다."],
  metal: ["정리가 되어 있고 결론이 분명한 일에 마음이 붙고, 어수선하거나 결론이 안 난 일에는 좀처럼 마음이 붙지 않는 편입니다.", "군더더기를 덜어내고 남길 것만 남긴 일에 마음이 붙는 편입니다."],
  water: ["정해진 틀에 맞추기보다 상황을 보면서 그때그때 방향을 바꿀 수 있는 일에 마음이 가는 편입니다.", "한 가지 방법에 매이기보다 상황을 살피며 방법을 바꿔 갈 수 있는 일에 마음이 붙는 편입니다."],
};
const E1_ABS: Record<El, string[]> = {
  wood: ["새로운 일 앞에서는 마음이 천천히 붙는 편입니다."],
  fire: ["한 가지에 확 달아오르는 일은 드물어서, 무슨 일이든 들뜨지 않고 차분하게 하는 쪽입니다."],
  earth: ["같은 일을 오래 하면 금방 지루해져서, 일정한 루틴을 지키려면 일부러 애를 써야 합니다."],
  metal: ["정리하고 끊어내는 일에는 손이 잘 가지 않아서, 결론을 못 낸 채 오래 두는 일이 생깁니다."],
  water: ["상황에 따라 방향을 자주 바꾸는 일에는 마음이 잘 붙지 않아서, 한 번 잡은 방향을 그대로 가는 쪽이 편합니다."],
};
const E1_REL: Record<"back" | "press", string[]> = {
  back: ["주변 분위기가 받쳐 주는 편이라, 관심이 가는 일에는 굳이 애쓰지 않아도 마음이 붙습니다.", "분위기나 여건이 도와주는 편이라, 관심이 가는 일에는 억지로 끌어올리지 않아도 마음이 붙습니다."],
  press: ["다만 관심이 가는 일이라도 주변 분위기가 어느 정도 갖춰져야 마음이 붙는 편입니다.", "다만 관심이 가는 일이라도 분위기나 여건이 어느 정도 맞아야 제대로 마음이 붙습니다."],
};
const E1_ABS_WATER_AFTER_WOOD = "다만 상황에 따라 방향까지 자주 바꾸는 일에는 마음이 잘 붙지 않아서, 한 번 잡은 방향은 그대로 가는 쪽이 편합니다.";
const E1_ABS_BACK = "다만 그 점을 자연스럽게 채워 주는 면도 함께 있어서, 이런 모습이 실제 생활에서는 크게 눈에 띄지 않습니다.";

/* ───────── E2. 결정한 뒤 행동으로 옮길 때(식신·상관 겉 글자가 있을 때만) ─────────
   식신 = 시작한 일을 조금씩 이어 가는 모습, 상관 = 정한 일을 오래 미루지 않고 시작하는 모습.
   인성(생각·판단)은 2번, 표현은 3번에서 쓰므로 여기서는 쓰지 않는다. 마무리(재성)는 근거가 부족해 다루지 않는다. */
const E2_ACT: Record<"식" | "상" | "둘다", string> = {
  식: "하기로 정한 일을 한 번 시작하면 조금씩 이어 가는 편입니다. 그렇게 이어 가다 보면 쌓인 것이 어느새 눈에 보이는 결과가 됩니다.",
  상: "하기로 정한 일을 오래 미루지 않고 바로 시작하는 편입니다. 결정이 서면 할 수 있는 부분부터 먼저 손을 대는 식입니다.",
  둘다: "하기로 정한 일을 오래 미루지 않고 시작하고, 시작한 뒤에는 조금씩 이어 가는 편입니다. 그래서 일을 벌이기까지는 빠르고, 벌인 일이 흐지부지되지 않고 이어지는 쪽입니다.",
};

/* ───────── E3. 낯선 곳과 혼자 있는 시간(해당 신호가 실제 있을 때만) ───────── */
const E3_TXT: Record<"역마" | "화개" | "둘다", string[]> = {
  역마: ["새로운 곳이나 낯선 환경에 놓여도 위축되기보다 그 안에서 할 만한 것을 찾아내는 편입니다."],
  화개: ["혼자 있는 시간에는 한 가지에 깊이 빠져들어 집중하는 편입니다."],
  둘다: ["낯선 환경에서도 위축되지 않고 움직이다가, 혼자 있는 시간에는 한 가지에 깊이 빠져듭니다."],
};

function label(f: Facts, kinds: string[]): string {
  const p = f.chars.filter((c) => kinds.includes(c.sip)).map((c) => `${STAGE_KO[c.stage]}${c.kind} ${c.hanja}(${c.sip})`);
  return p.length ? p.join(", ") : "없음";
}
function hidLabel(f: Facts, kinds: string[]): string {
  const p = f.hidden.filter((c) => kinds.includes(c.sip)).map((c) => `${STAGE_KO[c.stage]}지 ${c.branch} 속 ${c.stem}(${c.sip})`);
  return p.length ? p.join(", ") : "없음";
}
const pairKo = (p: Pair, a: string, b: string) => (p === "1만" ? a : p === "2만" ? b : p === "둘다1" ? `${a}·${b}(${a} 우세)` : p === "둘다2" ? `${a}·${b}(${b} 우세)` : `${a}·${b}(같은 수)`);
/** '편인 1 (시간 乙)' 처럼 종류별 개수와 자리만 짧게 적는다. */
function lst(f: Facts, kinds: string[]): string {
  const p = kinds.map((k) => { const m = f.chars.filter((c) => c.sip === k); return m.length ? `${k} ${m.length} (${m.map((c) => `${STAGE_KO[c.stage]}${c.kind} ${c.hanja}`).join(", ")})` : ""; }).filter(Boolean);
  return p.length ? p.join(" · ") : "없음";
}
const insNo = (f: Facts, has: boolean) => `인성 ${has ? "있음" : "없음"}`;
const dayYY = (f: Facts) => `일간 ${f.dayGan}(${f.yy === "양간" ? "양" : "음"})`;

export function buildCh2Ki(a: AppData): Ch2Ki {
  const f = buildFacts(a); const N = eun(f);
  const sections: Sec[] = []; const omitted: string[] = [];
  const insAny = catAny(f, "인성");
  const timeNote = f.hasHour ? "" : " (태어난 시간을 몰라 년·월 글자만 봤습니다)";
  const mk = (rule: string, text: string): T => ({ rule, text });
  const pA = pairOf(f, "정인", "편인", "chars"), hA = pairOf(f, "정인", "편인", "hidden");
  const pB = pairOf(f, "식신", "상관", "chars"), hB = pairOf(f, "식신", "상관", "hidden");
  const pC = pairOf(f, "비견", "겁재", "chars"), hC = pairOf(f, "비견", "겁재", "hidden");
  const ownA = pA !== "없음" || hA !== "없음", ownB = pB !== "없음" || hB !== "없음", ownC = pC !== "없음" || hC !== "없음";
  // 같은 뜻을 두 블록에서 되풀이하는 조합만 피한다(A의 식상 대체 ↔ B, B의 인성 대체 ↔ A). 관점이 다른 경우(C의 대체 등)는 허용.
  const skipFor = (k: "A" | "B" | "C") => { const s: string[] = []; if (k === "A" && ownB) s.push("식상"); if (k === "B" && ownA) s.push("인성"); void ownC; return s; };
  const hb = (h: Pair) => (h === "1만" ? "1만" : h === "2만" ? "2만" : "both");

  /* ── A ── */
  {
    let level = "", branch = ""; const paras: T[][] = []; let basis = "";
    if (pA !== "없음") {
      level = "main"; branch = pA; const [c, s] = A_MAIN[pA];
      paras.push([mk(`A:main:${pA}:c`, `${N} ${V(f, c)}`), mk(`A:main:${pA}:s`, V(f, s))]);
      basis = `인성 글자: ${lst(f, ["정인", "편인"])}${timeNote}`;
    } else if (hA !== "없음") {
      level = "hidden"; branch = `숨음:${hb(hA)}`;
      paras.push([mk("A:hidden:lead", `${N} 혼자 있게 되면 지나간 일을 다시 떠올려 이유를 따져 보는 시간이 찾아옵니다.`), mk(`A:hidden:${hb(hA)}`, A_HID[hb(hA)][0])]);
      basis = `인성 글자: 겉으로 드러난 글자에는 없고 지장간(속)에 있음 — ${hidLabel(f, ["정인", "편인"])}${timeNote}`;
    } else {
      const d = desc(f, ["재성", "식상", "비겁"], skipFor("A"));
      if (d) {
        level = "sub"; branch = `대체:${d}`;
        paras.push([mk(`A:sub:${d}:c`, `${N} ${A_SUB[d][0]}`), mk(`A:sub:${d}:s`, A_SUB[d][1])]);
        basis = `인성 글자: 겉·속 모두 없음 · 대신 ${d} 글자가 가장 뚜렷함(${catCnt(f, d)}개)${timeNote}`;
      } else { level = "omit"; branch = "생략"; omitted.push("A"); }
    }
    if (level !== "omit") sections.push({ key: "A", heading: "결론을 내리기까지의 생각", paras, basis, level, branch });
  }

  /* ── B ── */
  {
    let level = "", branch = ""; const paras: T[][] = []; let basis = "";
    if (pB !== "없음") {
      const tone: "차분" | "즉시" = pB === "1만" || pB === "둘다1" ? "차분" : "즉시";
      level = "main"; branch = `${pB}|인성${insAny ? "有" : "無"}|${f.yy}`; const [c, s] = B_MAIN[pB];
      paras.push([mk(`B:main:${pB}:c`, `${N} ${V(f, c)}`), mk(`B:main:${pB}:s`, V(f, s))]);
      const second: T[] = [mk(`B:order:${tone}:${insAny ? "in" : "no"}`, V(f, B_ORDER[tone][insAny ? "있음" : "없음"]))];
      paras.push(second);
      basis = `식상 글자: ${lst(f, ["식신", "상관"])} · ${insNo(f, insAny)}${timeNote}`;
    } else if (hB !== "없음") {
      level = "hidden"; branch = `숨음:${hb(hB)}`;
      paras.push([mk(`B:hidden:${hb(hB)}`, `${N} ${B_HID[hb(hB)][0]}`)]);
      basis = `식상 글자: 겉으로 드러난 글자에는 없고 지장간(속)에 있음 — ${hidLabel(f, ["식신", "상관"])}${timeNote}`;
    } else {
      const d = desc(f, ["비겁", "재성", "인성"], skipFor("B"));
      if (d) {
        level = "sub"; branch = `대체:${d}`;
        paras.push([mk(`B:sub:${d}:c`, `${N} ${B_SUB[d][0]}`), mk(`B:sub:${d}:s`, B_SUB[d][1])]);
        basis = `식상 글자: 겉·속 모두 없음 · 대신 ${d} 글자가 가장 뚜렷함(${catCnt(f, d)}개)${timeNote}`;
      } else { level = "omit"; branch = "생략"; omitted.push("B"); }
    }
    if (level !== "omit") sections.push({ key: "B", heading: "말과 행동, 표정으로 드러나는 모습", paras, basis, level, branch });
  }

  /* ── C ── */
  {
    let level = "", branch = ""; const paras: T[][] = []; let basis = "";
    const tail = (linked = false): T[] => { const o: T[] = [mk(`C:in:${insAny ? "있음" : "없음"}`, V(f, C_IN[insAny ? "있음" : "없음"]))]; if (f.bg === "강" || f.bg === "약") o.push(mk(`C:bg:${f.bg}`, V(f, f.bg === "약" && linked ? C_BG_LINK : C_BG[f.bg]))); return o; };
    const bgKo = f.bg === "강" ? "강한 편" : f.bg === "약" ? "약한 편" : f.bg === "중" ? "중간" : "판정 보류(글에는 반영 안 함)";
    if (pC !== "없음") {
      level = "main"; branch = `${pC}|인성${insAny ? "有" : "無"}|${f.bg}`; const [c, s] = C_MAIN[pC];
      paras.push([mk(`C:main:${pC}:c`, `${N} ${V(f, c)}`), mk(`C:main:${pC}:s`, V(f, s))]);
      paras.push(tail(pC === "1만" && f.bg === "약" && f.stemIdx % C_MAIN["1만"][1].length === 0));
      basis = `비겁 글자: ${lst(f, ["비견", "겁재"])} · ${insNo(f, insAny)} · 일간의 힘: ${bgKo}${timeNote}`;
    } else if (hC !== "없음") {
      level = "hidden"; branch = `숨음:${hb(hC)}`;
      paras.push([mk(`C:hidden:${hb(hC)}`, `${N} ${C_HID[hb(hC)][0]}`)]); paras.push(tail());
      basis = `비겁 글자: 겉으로 드러난 글자에는 없고 지장간(속)에 있음 — ${hidLabel(f, ["비견", "겁재"])} · ${insNo(f, insAny)} · 일간의 힘: ${bgKo}${timeNote}`;
    } else {
      const d = desc(f, ["인성", "식상", "재성"], skipFor("C"));
      if (d) {
        level = "sub"; branch = `대체:${d}`;
        paras.push([mk(`C:sub:${d}:c`, `${N} ${C_SUB[d][0]}`), mk(`C:sub:${d}:s`, C_SUB[d][1])]);
        basis = `비겁 글자: 겉·속 모두 없음 · 대신 ${d} 글자가 가장 뚜렷함(${catCnt(f, d)}개)${timeNote}`;
      } else { level = "omit"; branch = "생략"; omitted.push("C"); }
    }
    if (level !== "omit") sections.push({ key: "C", heading: "내 기준과 다른 사람의 기준 사이에서", paras, basis, level, branch });
  }

  /* ── D (A×B 조합, 둘 다 '직접 신호(main)'일 때만) ── */
  {
    const sa = sections.find((s) => s.key === "A"), sb = sections.find((s) => s.key === "B");
    if (sa?.level === "main" && sb?.level === "main") {
      const at: AT = pA === "1만" || pA === "둘다1" ? "정" : pA === "2만" || pA === "둘다2" ? "편" : "혼";
      const bt: BT = pB === "1만" || pB === "둘다1" ? "식" : pB === "2만" || pB === "둘다2" ? "상" : "혼";
      const key = `${at}${bt}` as `${AT}${BT}`;
      if (D_TABLE[key].length) sections.push({ key: "D", heading: "생각이 밖으로 나오는 순간", paras: [[mk(`D:${key}`, V(f, D_TABLE[key]))]], basis: `인성(${pairKo(pA, "정인", "편인")})과 식상(${pairKo(pB, "식신", "상관")})을 함께 본 것${timeNote}`, level: "combo", branch: key });
    }
  }

  /* ── E1 ── */
  {
    const cn = f.el; const mx = Math.max(...Object.values(cn)); const tops = Object.keys(cn).filter((k) => cn[k] === mx);
    const dom = tops.length === 1 && mx >= 3 ? (tops[0] as El) : null;
    const zeros = Object.keys(cn).filter((k) => cn[k] === 0); const absE = zeros.length === 1 ? (zeros[0] as El) : null;
    const se = f.season as El;
    if (dom || absE) {
      const lines: T[] = [];
      let relKey = "-";
      if (dom) {
        lines.push(mk(`E1:dom:${dom}`, `${N} ${V(f, E1_DOM[dom])}`));
        const rel = se === dom ? "same" : GENERATES[se] === dom ? "back" : GENERATES[dom] === se ? "give" : OVERCOMES[se] === dom ? "press" : "over";
        relKey = rel;
        if ((rel === "back" || rel === "press") && dom !== "fire") lines.push(mk(`E1:rel:${rel}`, V(f, E1_REL[rel])));
      }
      if (absE) {
        const lead = dom ? "" : `${N} `;
        lines.push(mk(`E1:abs:${absE}`, `${lead}${dom === "wood" && absE === "water" ? E1_ABS_WATER_AFTER_WOOD : E1_ABS[absE][0]}`));
        if (!dom && (se === absE || GENERATES[se] === absE)) lines.push(mk("E1:absback", E1_ABS_BACK));
      }
      const cnStr = (["wood", "fire", "earth", "metal", "water"] as El[]).map((k) => `${EL_KO[k]} ${cn[k]}`).join(" · ");
            const basis = `오행 분포: ${cnStr}${dom ? ` · 가장 많은 오행: ${EL_KO[dom]} ${cn[dom]}개` : ""}${absE ? ` · 없는 오행: ${EL_KO[absE]}` : ""} · 태어난 달의 오행: ${EL_KO[se]}${timeNote}`;
      sections.push({ key: "E1", heading: "어떤 일에 마음이 붙는가", paras: lines.length > 2 ? [lines.slice(0, 2), lines.slice(2)] : [lines], basis, level: dom ? (absE ? "dom+abs" : "dom") : "abs", branch: `${dom ?? "-"}/${absE ?? "-"}/${se}` });
    } else omitted.push("E1");
  }
  /* ── E2 (식신·상관 겉 글자가 하나도 없으면 블록 전체 생략) ── */
  {
    const s1 = cnt(f, "식신"), g1 = cnt(f, "상관");
    if (s1 + g1 > 0) {
      const k: "식" | "상" | "둘다" = s1 && g1 ? "둘다" : s1 ? "식" : "상";
      sections.push({ key: "E2", heading: "결정한 뒤 행동으로 옮길 때", paras: [[mk(`E2:act:${k}`, `${N} ${E2_ACT[k]}`)]], basis: `식상 글자: ${lst(f, ["식신", "상관"])}${timeNote}`, level: "main", branch: `act=${k}` });
    } else omitted.push("E2");
  }
  /* ── E3 (신호가 실제 있을 때만, 없으면 아무것도 만들지 않는다) ── */
  {
    const ym = f.sin.filter((s) => s.name === "역마살"), hg = f.sin.filter((s) => s.name === "화개살");
    if (ym.length || hg.length) {
      const k: "역마" | "화개" | "둘다" = ym.length && hg.length ? "둘다" : ym.length ? "역마" : "화개";
      sections.push({ key: "E3", heading: "낯선 곳과 혼자 있는 시간", paras: [[mk(`E3:${k}`, V(f, E3_TXT[k]))]], basis: `12신살(년지 기준): ${f.sin.map((s) => `${STAGE_KO[s.stage]}지 ${s.branch}(${s.name})`).join(", ")}${timeNote}`, level: "cond", branch: k });
    }
  }
  // 읽는 순서: 기본 에너지 → 생각 → 표현 → 조합 → 기준 → 결정 후 → (조건부)
  const order = ["E1", "A", "B", "D", "C", "E2", "E3"];
  sections.sort((x, y) => order.indexOf(x.key) - order.indexOf(y.key));
  return { name: f.name, sections, omitted, facts: f };
}

export const flatText = (c: Ch2Ki): string => c.sections.flatMap((s) => [s.heading, ...s.paras.map((p) => p.map((t) => t.text).join(" "))]).join("\n");
