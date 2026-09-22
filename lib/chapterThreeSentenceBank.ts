/**
 * 第三章 유료 심화 「살아가는 방식」 문장뱅크 — B1~B8 + 정리(마무리).
 *
 * scripts/_scratch_ch3_b1.ts ~ _scratch_ch3_b8.ts, _scratch_ch3_closing.ts에서
 * 22명 전수검증(+B1/B2/B6/B8은 10,224건 스트레스 테스트)까지 통과해 확정한
 * 계산 조건과 문장을 그대로 옮긴 것이다. 이 파일에서 새 문장이나 새 계산을
 * 만들지 않는다 — 계산은 기존 계산 엔진(sajuEngine/natalStructure/
 * dayMasterBalanceAnalysis/wealthStrengthAnalysis/yongsinCandidateAnalysis/
 * huisinCandidateAnalysis/chapterThreeInterpretation/aiLifeReport)을 읽기만
 * 하고, 문장은 scratch에서 승인된 문장을 그대로 옮긴다.
 *
 * 1장 '조심(care)' 카테고리만 예외 — scratch는 1장 문체 재작업용 스크래치
 * 파일(scripts/_scratch_ch1_v3.ts, 프로덕션 미반영)의 buildCh1V3()를 썼지만,
 * 그 함수의 care 목록 자체는 이미 프로덕션에 있는 lib/chapterOneDeepNarrative.ts
 * (buildChapterOneDeepNarrative)의 visual.visible/hidden/effortful 값만
 * 그대로 다시 조합한 것이다(1장 문장은 전혀 쓰지 않는다). 그래서 여기서는
 * scratch 1장 파일 대신, 이미 배포된 1장 계산값을 직접 읽어 같은 조합
 * 로직으로 care 카테고리 집합만 재현한다 — 1장 파일은 import만 하고
 * 손대지 않는다.
 *
 * B1~B8 순서: B1(타고난 힘) → B2(일·사람 앞) → B3(버팀) → B4(겉/속) →
 * B5(압박·책임, 관성 없으면 생략) → B6(합충, 없으면 생략) →
 * B7(용신·희신, 신강/신약만 적용 — 중화·보류는 생략) → B8(편한 자리) →
 * 정리(마무리, 항상 생성).
 */
import { AppData } from "./sajuContent";
import { SipseongCategory } from "./strengthAnalysis";
import { buildInterpretationKey } from "./chapterOneInterpretation";
import { buildChapterOneDeepNarrative } from "./chapterOneDeepNarrative";
import { analyzeWealthCategoryStrength } from "./wealthStrengthAnalysis";
import { buildChapterThreeKey } from "./chapterThreeInterpretation";
import { analyzeDayMasterBalance, BalanceVerdict } from "./dayMasterBalanceAnalysis";
import { analyzeRoot, analyzeSeasonStatus } from "./natalStructure";
import { analyzeYongsinCandidate } from "./yongsinCandidateAnalysis";
import { analyzeHuisinCandidate } from "./huisinCandidateAnalysis";
import { computeSipseong } from "./aiLifeReport";

type Cat = SipseongCategory;
export interface Tagged { text: string; rule: string }
type Shape = "겉만" | "겉+속" | "속에만";

const CATS: Cat[] = ["비겁", "식상", "재성", "관성", "인성"];
const EL: Record<string, string> = { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" };
const CAT_OF_SIPSEONG: Record<string, Cat> = {
  비견: "비겁", 겁재: "비겁", 식신: "식상", 상관: "식상", 편재: "재성", 정재: "재성",
  편관: "관성", 정관: "관성", 편인: "인성", 정인: "인성",
};

/* ────────────────────────────────────────────────────────────────
 * 1장 '조심(care)' 카테고리 재조합 — 새 계산 아님, 1장 파일도 손대지 않음.
 * buildCh1V3()의 care 배열과 동일한 조합 로직(effortful 최대 2개 +
 * effortful에 없는 absent 최대 1개)을 이미 배포된 1장 계산값
 * (buildChapterOneDeepNarrative)에서 그대로 재현한다.
 * ──────────────────────────────────────────────────────────────── */
function chapterOneCareAndTopVisible(appData: AppData): { care: Cat[]; topVisible: Cat[] } {
  const deep = buildChapterOneDeepNarrative(appData);
  const vis: Record<Cat, number> = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 };
  deep.visual.visible.forEach((v) => { vis[v.category]++; });
  const hid: Record<Cat, number> = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 };
  deep.visual.hidden.forEach((h) => { hid[h.category]++; });
  const absent = CATS.filter((c) => vis[c] === 0 && hid[c] === 0);
  const care: Cat[] = [];
  deep.visual.effortful.slice(0, 2).forEach((c) => care.push(c));
  absent.filter((c) => !deep.visual.effortful.includes(c)).slice(0, 1).forEach((c) => care.push(c));
  const top = (m: Record<Cat, number>) => { const mx = Math.max(...CATS.map((c) => m[c])); return mx === 0 ? [] : CATS.filter((c) => m[c] === mx); };
  return { care, topVisible: top(vis) };
}

/* ────────────────────────────────────────────────────────────────
 * B1 「타고난 힘」
 * ──────────────────────────────────────────────────────────────── */
const B1_ORDER: Cat[] = ["관성", "인성", "비겁", "식상", "재성"];
const HEART: Record<Cat, string> = { 관성: "책임을 지려는 마음", 인성: "이해하고 정리하는 마음", 비겁: "내 힘으로 해내려는 마음", 식상: "생각을 밖으로 꺼내는 마음", 재성: "결과와 실속을 챙기는 마음" };
const B1_KIND: Record<Cat, string> = { 관성: "책임·기준의 기운", 인성: "이해·정리의 기운", 비겁: "자기 힘의 기운", 식상: "표현의 기운", 재성: "결과·실속의 기운" };
const B1_DEG = ["분명히 있고", "크고", "아주 크고"];
const b1DegIdx = (n: number) => (n >= 3 ? 2 : n === 2 ? 1 : 0);

const B1_BANK: Record<Cat, { lead: string; deg: (i: number) => string; tail: string; hidden: string }> = {
  관성: {
    lead: "정해진 기준과 순서를 지킬 때 마음이 편해지는 사람입니다.",
    deg: (i) => `맡은 일에는 책임을 지려는 마음이 ${B1_DEG[i]}, 그 안에서 하나씩 믿음을 쌓아 가는 편입니다.`,
    tail: "",
    hidden: "겉으로는 잘 드러나지 않지만, 마음속에는 정해진 기준과 순서를 지키며 책임을 지려는 마음이 자리하고 있습니다.",
  },
  인성: {
    lead: "무슨 일이든 먼저 이해가 되고 납득이 돼야 움직입니다.",
    deg: (i) => (i === 0 ? "바로 반응하기보다 생각을 정리한 뒤에 움직이는 쪽입니다." : "바로 반응하기보다 생각을 정리한 뒤에 움직이는 쪽이고, 충분히 이해하기 전에는 마음이 잘 움직이지 않습니다."),
    tail: "조용히 있어도 속으로는 계속 정리하고 있는 사람에 가깝습니다.",
    hidden: "겉으로는 잘 드러나지 않지만, 속으로는 먼저 이해하고 납득한 뒤에 움직이려는 마음이 있습니다.",
  },
  비겁: {
    lead: "내 힘으로 해내야 마음이 편해지는 사람입니다.",
    deg: (i) => `남에게 넘기기보다 먼저 내 손으로 해 보려는 마음이 ${B1_DEG[i]}, 내 몫은 내가 챙기려는 편입니다.`,
    tail: "",
    hidden: "겉으로는 잘 드러나지 않지만, 마음속에는 내 힘으로 해내려는 마음이 자리하고 있습니다.",
  },
  식상: {
    lead: "생각한 것을 말이나 행동으로 옮길 때 마음이 편해지는 사람입니다.",
    deg: (i) => `속에 담아 두기보다 밖으로 꺼내려는 마음이 ${B1_DEG[i]}, 떠오른 생각이 표현으로 잘 이어지는 편입니다.`,
    tail: "",
    hidden: "겉으로는 잘 드러나지 않지만, 마음속에는 생각한 것을 밖으로 꺼내려는 마음이 자리하고 있습니다.",
  },
  재성: {
    lead: "눈에 보이는 결과와 실속을 챙길 때 마음이 편해지는 사람입니다.",
    deg: (i) => `막연한 계획보다 손에 잡히는 것을 먼저 살피는 마음이 ${B1_DEG[i]}, 눈앞의 현실을 따져 보고 움직이는 편입니다.`,
    tail: "",
    hidden: "겉으로는 잘 드러나지 않지만, 마음속에는 눈에 보이는 결과와 실속을 챙기려는 마음이 자리하고 있습니다.",
  },
};

const B1_PAIR: Record<string, string> = {
  "관성+인성": "그래서 해야 할 일이 겹쳐도 아무것부터나 손대지 않고, 먼저 이해하고 순서를 정한 다음 하나씩 끝내는 쪽이 편합니다.",
  "관성+비겁": "그래서 맡은 일은 정해진 순서를 따르면서 끝까지 스스로 마무리하려 합니다.",
  "관성+식상": "그래서 하고 싶은 말이 생겨도 기준과 순서를 살핀 뒤에 꺼내는 편입니다.",
  "관성+재성": "그래서 일을 할 때 정해진 순서대로 하면서, 눈에 보이는 결과로 마무리하려는 쪽입니다.",
  "인성+비겁": "그래서 남의 말에 끌려가기보다, 충분히 이해하고 납득한 다음에 내 방식으로 움직입니다.",
  "인성+식상": "그래서 생각이 정리되면 말이나 행동으로 바로 옮기는 편입니다.",
  "인성+재성": "그래서 결과가 걸린 일일수록 충분히 이해하고 따져 본 다음에 움직이는 편입니다.",
  "비겁+식상": "그래서 하고 싶은 것이 생기면 말과 행동이 함께 나가는 편입니다.",
  "비겁+재성": "그래서 내가 한 일은 눈에 보이는 결과로 남기려 합니다.",
  "식상+재성": "그래서 생각한 것을 눈에 보이는 결과로 바꾸는 쪽으로 움직입니다.",
};
const B1_MONTH: Partial<Record<Cat, string>> = {
  관성: "그래서 일이 주어지면 무엇부터 할지 순서를 먼저 정하고, 그 순서대로 끝내 나가는 쪽이 편합니다.",
};

interface B1Up { cat: Cat; count: number; shape: Shape; score: number; visible: string[]; inMonth: boolean }
interface B1Facts { name: string; ups: B1Up[]; monthBranch: string; monthEl: string }
interface B1Out { paras: Tagged[][]; basis: string }

function b1ConnectFor(ups: B1Up[]): Tagged | null {
  const seen = B1_ORDER.map((c) => ups.find((u) => u.cat === c && u.shape !== "속에만")).filter(Boolean) as B1Up[];
  if (seen.length === 2) { const k = `${seen[0].cat}+${seen[1].cat}`; return { text: B1_PAIR[k], rule: `b1:pair:${k}` }; }
  if (seen.length === 1 && seen[0].inMonth && B1_MONTH[seen[0].cat]) return { text: B1_MONTH[seen[0].cat]!, rule: `b1:month:${seen[0].cat}` };
  return null;
}

function buildB1(f: B1Facts): B1Out {
  const ups = B1_ORDER.map((c) => f.ups.find((u) => u.cat === c)).filter(Boolean) as B1Up[];
  const paras: Tagged[][] = ups.map((u, idx) => {
    const b = B1_BANK[u.cat]; const lines: Tagged[] = [];
    if (u.shape === "속에만") {
      lines.push({ text: (idx === 0 ? `${f.name}님은 ` : "또 ") + b.hidden, rule: `b1:${u.cat}:hidden` });
      return lines;
    }
    lines.push({ text: idx === 0 ? `${f.name}님은 ${b.lead}` : `또 ${b.lead}`, rule: `b1:${u.cat}:lead` });
    lines.push({ text: b.deg(b1DegIdx(u.count)), rule: `b1:${u.cat}:deg:${b1DegIdx(u.count) + 1}` });
    if (u.shape === "겉+속" && b.tail) lines.push({ text: b.tail, rule: `b1:${u.cat}:tail` });
    return lines;
  });
  const anyHidden = ups.some((u) => u.shape === "속에만");
  const names = ups.map((u) => HEART[u.cat]);
  const list = names.length === 1 ? `${names[0]}을` : names.length === 2 ? `이 두 가지, ${names[0]}과 ${names[1]}을` : `이 ${names.length}가지, ${names.slice(0, -1).join(", ")}과 ${names[names.length - 1]}을`;
  const close: Tagged[] = [
    { text: anyHidden ? "이 마음은 애써 만든 것이 아니라 원래 타고난 성향입니다." : "이런 모습은 애써 만든 습관이 아니라 원래 타고난 성향입니다.", rule: `b1:close:${anyHidden ? "hidden" : "visible"}` },
    { text: `태어난 달이 ${list} 강하게 받쳐 주고 있기 때문입니다.`, rule: `b1:close:month:${ups.length}` },
  ];
  const conn = b1ConnectFor(ups); if (conn) paras.push([conn]);
  paras.push(close);
  const basis = `태어난 달 ${f.monthBranch}월(${f.monthEl}): ${ups.map((u) => `${u.cat}(${B1_KIND[u.cat]}) ${u.score >= 3 ? "왕" : "상"}▲`).join(", ")} · ${ups.map((u) => `${u.cat} ${u.count}개${u.visible.length ? `(${u.visible.join(", ")})` : ""}${u.shape !== "겉만" ? `${u.shape === "속에만" ? "(지장간에만 있음)" : ""}` : ""}`).join(", ")}`;
  return { paras, basis };
}

function b1FactsFor(appData: AppData, care: Cat[]): { facts: B1Facts; w: ReturnType<typeof analyzeWealthCategoryStrength>; hidn: (c: Cat) => number } {
  const u: any = appData.user;
  const ck: any = buildInterpretationKey(appData);
  const w: any = analyzeWealthCategoryStrength(u);
  const ST: Record<string, string> = { year: "년", month: "월", hour: "시" };
  const cnt = ck.categoryCounts as Record<Cat, number>;
  const hidn = (c: Cat) => { const cs = w.byCategory[c]; const dup = (x: any) => x.position === "본기" && x.stage !== "day" && CAT_OF_SIPSEONG[u.pillars.branches[x.stage].sipseong] === c; return cs.rootHits.filter((x: any) => !dup(x)).length; };
  const vis = (c: Cat) => { const a: string[] = []; (["year", "month", "hour"] as const).forEach((s) => { if (u.pillars[s] && CAT_OF_SIPSEONG[u.pillars[s].sipseong] === c) a.push(`${ST[s]}간 ${u.pillars[s].hanja} ${u.pillars[s].sipseong}`); if (u.pillars.branches[s] && CAT_OF_SIPSEONG[u.pillars.branches[s].sipseong] === c) a.push(`${ST[s]}지 ${u.pillars.branches[s].hanja} ${u.pillars.branches[s].sipseong}`); }); return a; };
  const rawCats = CATS.filter((c) => w.byCategory[c].monthScore >= 2 && (cnt[c] > 0 || hidn(c) > 0));
  const filtered = rawCats.filter((c) => !care.includes(c));
  const upsCats = filtered.length > 0 ? filtered : rawCats;
  const ups: B1Up[] = upsCats.map((c) => ({ cat: c, count: cnt[c], shape: (cnt[c] > 0 ? (hidn(c) > 0 ? "겉+속" : "겉만") : "속에만") as Shape, score: w.byCategory[c].monthScore, visible: vis(c), inMonth: vis(c).some((x) => x.startsWith("월")) }));
  const facts: B1Facts = { name: u.name, ups, monthBranch: u.pillars.branches.month.hanja, monthEl: EL[u.pillars.branches.month.element] };
  return { facts, w, hidn };
}

/* ────────────────────────────────────────────────────────────────
 * B2 「일·사람 앞에서 나서는 모습」
 * ──────────────────────────────────────────────────────────────── */
const B2_CATS: Cat[] = ["비겁", "식상", "재성", "관성", "인성"];
const B2_SEEN: Record<Cat, string> = {
  관성: "내 역할이 어디까지인지부터 분명히 하고 움직입니다.",
  인성: "상대 이야기를 끝까지 듣고 나서 입장을 밝힙니다.",
  비겁: "상대 의견을 들어도 내 입장은 쉽게 바꾸지 않습니다.",
  식상: "떠오른 생각을 그 자리에서 말로 꺼냅니다.",
  재성: "이야기가 나오면 먼저 얻는 것과 드는 것을 따져 봅니다.",
};
const B2_ADD: Record<Cat, string> = {
  관성: "여기에 맡은 일이 정해진 기준에 맞는지도 함께 따집니다.",
  인성: "여기에 말과 행동을 한 번 더 살핀 뒤에 내놓습니다.",
  비겁: "여기에 필요하면 내 몫을 분명하게 말합니다.",
  식상: "여기에 말이 필요한 자리에서는 먼저 입을 엽니다.",
  재성: "여기에 이익과 손해를 따져 본 뒤에 움직입니다.",
};

interface B2Facts {
  name: string; care: Cat[];
  x: Cat; y: Cat | null; xSub: string; ySub: string;
  gh: { present: boolean; bothInMonth: boolean };
  back: Cat[];
}
interface B2Out { paras: Tagged[][]; basis: string }

const b2JoinHearts = (cs: Cat[]) => (cs.length === 1 ? `${HEART[cs[0]]}` : cs.length === 2 ? `${HEART[cs[0]]}과 ${HEART[cs[1]]}` : `${cs.slice(0, -1).map((c) => HEART[c]).join(", ")}과 ${HEART[cs[cs.length - 1]]}`);

function buildB2(f: B2Facts): B2Out {
  const paras: Tagged[][] = [];
  const lead: Tagged[] = [];
  const xOk = !f.care.includes(f.x), yOk = f.y !== null && !f.care.includes(f.y);
  const sameKind = f.y === f.x;
  const ghSelf = f.gh.present && sameKind && f.x === "관성";
  const showDouble = sameKind && !ghSelf;
  let named = false;
  const nm = () => { if (named) return ""; named = true; return `${f.name}님은 `; };
  if (xOk) lead.push({ text: `${nm()}일이나 사람 앞에서는 ${B2_SEEN[f.x]}`, rule: `b2:seen:${f.x}` });
  if (showDouble) {
    lead.push({
      text: xOk
        ? "월주에 같은 종류가 두 겹으로 놓여 있어서, 이 행동이 유난히 분명하게 나옵니다."
        : `${nm()}일이나 사람 앞에서는 같은 기운이 월주에 두 겹으로 놓여 있어서, 그 성향이 유독 강하게 드러납니다.`,
      rule: `b2:double:${f.x}`,
    });
  }
  if (!sameKind && yOk && f.y) lead.push({ text: xOk ? B2_ADD[f.y] : `${nm()}일이나 사람 앞에서는 ${B2_SEEN[f.y]}`, rule: xOk ? `b2:add:${f.y}` : `b2:seen:${f.y}` });
  if (lead.length) paras.push(lead);
  if (f.gh.present) {
    const g: Tagged[] = [
      { text: `${nm()}책임이 걸린 일 앞에서는 두 가지 행동이 함께 나옵니다.`, rule: "b2:gh:1" },
      { text: "하나는 맡은 일의 절차를 빠뜨리지 않고 챙기는 것이고, 다른 하나는 같은 일을 남보다 더 크게 떠안는 것입니다.", rule: "b2:gh:2" },
      { text: "그래서 어떤 일도 대충 넘기지 않고 손을 대는 편입니다.", rule: "b2:gh:3" },
    ];
    if (f.gh.bothInMonth) g.push({ text: "이런 모습은 일이나 사람을 대할 때 특히 잘 나타납니다.", rule: "b2:gh:4:month" });
    paras.push(g);
  }
  if (f.back.length) paras.push([{ text: `${b2JoinHearts(f.back)}도 있지만, 일이나 사람 앞에서는 먼저 나서서 쓰기보다 필요할 때만 꺼내 쓰는 편입니다.`, rule: `b2:back:${f.back.join("+")}` }]);
  const basis = [
    `월주: 월지 ${f.xSub}(${f.x}), 월간 ${f.ySub}(${f.y ?? "-"})${sameKind ? " · 같은 종류가 겹침" : ""}`,
    f.gh.present ? `관살혼잡: 편관·정관이 함께 있음${f.gh.bothInMonth ? "(둘 다 월주)" : ""}` : "",
    f.back.length ? `월령 도움 안 됨▽이면서 월주에 없는 십성: ${f.back.join("·")}` : "",
  ].filter(Boolean).join(" · ");
  return { paras, basis };
}

function b2FactsFor(appData: AppData, care: Cat[], topVisible: Cat[]): B2Facts {
  const u: any = appData.user;
  const ck: any = buildInterpretationKey(appData);
  const w: any = analyzeWealthCategoryStrength(u);
  const k3: any = buildChapterThreeKey(appData);
  const cnt = ck.categoryCounts as Record<Cat, number>;
  const mg = u.pillars.month?.sipseong as string | undefined, mz = u.pillars.branches.month?.sipseong as string;
  const inMonth = new Set<Cat>([CAT_OF_SIPSEONG[mz], mg ? CAT_OF_SIPSEONG[mg] : (undefined as any)].filter(Boolean));
  const back = B2_CATS.filter((c) => w.byCategory[c].monthScore <= -1 && cnt[c] > 0 && !inMonth.has(c) && !topVisible.includes(c) && !(c === "관성" && k3.gwansal.present));
  return {
    name: u.name, care, x: CAT_OF_SIPSEONG[mz], y: mg ? CAT_OF_SIPSEONG[mg] : null, xSub: mz, ySub: mg ?? "-",
    gh: { present: !!k3.gwansal.present, bothInMonth: !!(mg && mz && ((mg === "편관" && mz === "정관") || (mg === "정관" && mz === "편관"))) },
    back,
  };
}

/* ────────────────────────────────────────────────────────────────
 * B3 「버팀」
 * ──────────────────────────────────────────────────────────────── */
const B3_ST: Record<string, string> = { year: "년", month: "월", day: "일", hour: "시" };
const B3_STAGE_LABEL: Record<string, string> = { 년: "초년의 자리", 월: "사회로 나가는 자리", 일: "자기 자신이 선 자리", 시: "말년의 자리" };
type Bin = "strong" | "neutral" | "weak";
const B3_BIN: Record<Exclude<BalanceVerdict, "hold">, Bin> = { clearlyStrong: "strong", slightlyStrong: "strong", neutral: "neutral", slightlyWeak: "weak", clearlyWeak: "weak" };
const B3_CORE: Record<Bin, { core0: (gwansal: boolean) => string; root1: string; noRoot1: string }> = {
  strong: {
    core0: (g) => `${g ? "책임이 겹쳐도" : "일이 겹쳐도"}, {name}님은 크게 흔들리지 않고, 원래 갖고 있는 힘으로 끝까지 밀고 나가는 사람입니다.`,
    root1: "힘이 남는 만큼, 책임이 쌓여도 자기 속도를 잃지 않고 버팁니다.",
    noRoot1: "다만 그 힘을 오래 붙잡아 줄 자리가 따로 없어서, 한번 크게 쓰고 나면 다시 채우는 데 시간이 걸리는 편입니다.",
  },
  neutral: {
    core0: (g) => `${g ? "책임이 이렇게 겹쳐도" : "일이 겹쳐도"}, {name}님은 쉽게 무너지지 않고 버티는 사람입니다.`,
    root1: "일이 겹치고 책임이 무거워져도 한 번에 주저앉기보다 끝까지 견디는 쪽입니다. 겉으로 크게 내세우지 않아도 속으로는 중심을 잃지 않고 버팁니다.",
    noRoot1: "일이 겹치면 그때그때 자기 힘으로 버텨 내는 편이고, 고비를 넘기고 나면 다시 평소대로 돌아옵니다.",
  },
  weak: {
    core0: (g) => `${g ? "책임이 이렇게 겹치면" : "일이 겹치면"} {name}님은 부담을 꽤 크게 느끼는 편입니다.`,
    root1: "그래도 쉽게 손을 놓지는 않고, 시간이 걸리더라도 끝까지 붙들고 가는 쪽입니다.",
    noRoot1: "혼자 다 짊어지기보다, 곁에서 함께 해 줄 사람이 있을 때 한결 수월해지는 편입니다.",
  },
};

interface B3Facts {
  name: string; balance: BalanceVerdict; balanceLabel: string; hasRoot: boolean; rootStages: string[]; rootDesc: string[];
  dayGan: string; monthBranch: string; monthEl: string; seasonStatus: "왕" | "상" | "휴" | "수" | "사"; conflictFlag: boolean;
  gwansal: boolean;
}
interface B3Out { paras: Tagged[][]; basis: string }

function buildB3(f: B3Facts): B3Out {
  if (f.balance === "hold") return { paras: [], basis: `일간 강약: 자동 판정 보류` };
  const bin = B3_BIN[f.balance]; const c = B3_CORE[bin];
  const s0: Tagged = { text: c.core0(f.gwansal).replace("{name}", f.name), rule: `b3:core0:${bin}` };
  const s1: Tagged = { text: f.hasRoot ? c.root1 : c.noRoot1, rule: `b3:core1:${bin}:${f.hasRoot ? "root" : "noroot"}` };
  const paras: Tagged[][] = [[s0], [s1]];
  const gotMonth = f.seasonStatus === "왕" || f.seasonStatus === "상";
  const basis = [
    `일간 ${f.dayGan}, ${f.monthBranch}월(${f.monthEl})에 태어나 월령을 ${gotMonth ? "얻음(득령)" : "얻지 못함(실령)"}`,
    f.hasRoot ? `일간 뿌리 ${f.rootStages.length}곳: ${f.rootDesc.join(", ")}` : `일간 뿌리 없음`,
    `일간 강약: ${f.balanceLabel}${f.conflictFlag ? "(월령과 통근이 서로 다른 쪽)" : ""}`,
  ].join(" · ");
  return { paras, basis };
}

function b3FactsFor(appData: AppData): B3Facts {
  const u: any = appData.user;
  const bal = analyzeDayMasterBalance(u); const rt = analyzeRoot(u); const season = analyzeSeasonStatus(u); const k3: any = buildChapterThreeKey(appData);
  const BAL_LABEL: Record<BalanceVerdict, string> = { clearlyStrong: "명확한 신강", slightlyStrong: "다소 신강", neutral: "중화에 가까움", slightlyWeak: "다소 신약", clearlyWeak: "명확한 신약", hold: "자동 판정 보류" };
  const stages = [...new Set(rt.matches.map((x: any) => x.stage))] as string[];
  return {
    name: u.name, balance: bal.balance, balanceLabel: BAL_LABEL[bal.balance], hasRoot: rt.hasRoot,
    rootStages: stages.map((s) => B3_ST[s]),
    rootDesc: stages.map((s) => { const zhi = u.pillars.branches[s]?.hanja; return `${B3_ST[s]}지 ${zhi}(${B3_STAGE_LABEL[B3_ST[s]]})`; }),
    dayGan: u.pillars.day.hanja, monthBranch: u.pillars.branches.month.hanja, monthEl: EL[u.pillars.branches.month.element],
    seasonStatus: season.status, conflictFlag: bal.structureFlags.includes("monthRootConflict"),
    gwansal: !!k3.gwansal.present,
  };
}

/* ────────────────────────────────────────────────────────────────
 * B4 「겉으로 보이는 나 / 속에서 판단하는 나」
 * ──────────────────────────────────────────────────────────────── */
const B4_ORDER: Cat[] = ["관성", "인성", "비겁", "식상", "재성"];
const B4_LEAD = {
  겉만: (h: string) => `${h}은 굳이 숨기지 않아도 자연스럽게 드러나는 편입니다. 겉으로 보이는 모습과 속마음이 크게 다르지 않습니다.`,
  겉속: (h: string) => `${h}은 겉에서 보이는 것과 속에서 판단하는 것이 같지 않은 사람입니다. 겉으로 드러나는 부분이 있는가 하면, 속에서 따로 움직이는 부분도 있습니다.`,
  속에만: (h: string) => `${h}은 겉으로는 드러나지 않고 속에만 있습니다.`,
};
const B4_RESULT: Record<Cat, Record<Shape, (name: string) => string>> = {
  관성: {
    겉만: (n) => `그래서 일을 맡으면 맡았다는 것이 겉으로도 드러나고, 주변 사람들도 ${n}님이 그 일을 책임지고 있다는 것을 어렵지 않게 알아봅니다.`,
    "겉+속": () => `그래서 겉으로 드러난 책임 말고도, 속으로 하나 더 챙기고 있는 몫이 있는 사람입니다.`,
    속에만: () => `그래서 책임을 지려는 마음이 있어도 겉으로는 잘 드러나지 않아, 주변에서는 그 마음을 알아차리기 어렵습니다.`,
  },
  인성: {
    "겉+속": () => `그래서 누가 의견을 물어도 바로 답하기보다 생각을 정리한 뒤에 답하는 쪽이고, 결정을 내릴 때도 납득이 될 때까지 속으로 따져 본 뒤에 정합니다. 이 과정은 속에서 이루어져서 밖에서는 잘 보이지 않습니다. 조용히 있는 모습만 봐서는 다 알기 어렵고, 겉에서 보이는 것보다 속에서 정리하고 있는 것이 더 많은 사람입니다.`,
    겉만: () => `그래서 이해하고 납득하려는 태도가 다른 사람 눈에도 그대로 보입니다.`,
    속에만: () => `그래서 이해하고 정리하는 과정이 전부 속에서 이루어져, 겉에서는 좀처럼 드러나지 않습니다.`,
  },
  비겁: {
    겉만: () => `그래서 내 몫을 챙기는 모습을 다른 사람도 쉽게 알아봅니다.`,
    "겉+속": () => `그래서 겉으로 드러난 것 말고도, 속으로 더 단단하게 붙들고 있는 내 몫이 있습니다.`,
    속에만: () => `그래서 내 힘으로 해내려는 마음이 있어도 겉으로는 잘 드러나지 않습니다.`,
  },
  식상: {
    겉만: () => `그래서 하고 싶은 말을 담아 두지 않고 그 자리에서 꺼내는 편입니다.`,
    "겉+속": () => `그래서 겉으로 꺼내는 말 말고도, 속에 아직 정리되지 않은 채 남아 있는 생각이 더 있습니다.`,
    속에만: () => `그래서 하고 싶은 말이 있어도 겉으로는 잘 드러나지 않습니다.`,
  },
  재성: {
    겉만: () => `그래서 결과를 따지는 모습을 다른 사람도 쉽게 알아봅니다.`,
    "겉+속": () => `그래서 겉으로 드러난 것 말고도, 속으로 더 따지고 있는 계산이 있습니다.`,
    속에만: () => `그래서 결과를 챙기려는 마음이 있어도 겉으로는 잘 드러나지 않습니다.`,
  },
};

interface B4Up { cat: Cat; count: number; shape: Shape; hidden: number; visibleLoc: string[]; hiddenLoc: string[] }
interface B4Out { paras: Tagged[][]; basis: string }

function buildB4(name: string, ups: B4Up[]): B4Out {
  const ordered = B4_ORDER.map((c) => ups.find((u) => u.cat === c)).filter(Boolean) as B4Up[];
  let prevShape: Shape | null = null;
  const paras: Tagged[][] = ordered.map((u, idx) => {
    const h = HEART[u.cat];
    const lead = u.shape === "겉만" ? B4_LEAD.겉만(h) : u.shape === "속에만" ? B4_LEAD.속에만(h) : B4_LEAD.겉속(h);
    const connector = idx === 0 ? "" : u.shape === prevShape ? "또한 " : "반면 ";
    prevShape = u.shape;
    const leadText: Tagged = { text: connector + lead, rule: `b4:${u.cat}:lead:${u.shape}` };
    const resultText: Tagged = { text: B4_RESULT[u.cat][u.shape](name), rule: `b4:${u.cat}:result:${u.shape}` };
    return [leadText, resultText];
  });
  const basis = ordered
    .map((u) => {
      if (u.shape === "겉만") return `${u.cat}: 천간·지지에 직접 나타난 것 ${u.count}(${u.visibleLoc.join("·")}), 지장간에 숨은 것 없음`;
      if (u.shape === "속에만") return `${u.cat}: 지장간에만 있음(${u.hiddenLoc.join("·")})`;
      return `${u.cat}: 겉 ${u.count}(${u.visibleLoc.join("·")}) + 지장간에 숨은 것 ${u.hidden}(${u.hiddenLoc.join("·")})`;
    })
    .join(" · ");
  return { paras, basis };
}

const B4_ST: Record<string, string> = { year: "년", month: "월", day: "일", hour: "시" };

function b4FactsFor(appData: AppData, b1: { facts: B1Facts; w: ReturnType<typeof analyzeWealthCategoryStrength>; hidn: (c: Cat) => number }): B4Up[] {
  const u: any = appData.user;
  const visibleLocOf = (cat: Cat): string[] => {
    const a: string[] = [];
    (["year", "month", "hour"] as const).forEach((s) => {
      if (u.pillars[s] && CAT_OF_SIPSEONG[u.pillars[s].sipseong] === cat) a.push(`${B4_ST[s]}간 ${u.pillars[s].hanja}`);
      if (u.pillars.branches[s] && CAT_OF_SIPSEONG[u.pillars.branches[s].sipseong] === cat) a.push(`${B4_ST[s]}지 ${u.pillars.branches[s].hanja}`);
    });
    return a;
  };
  const hiddenLocOf = (cat: Cat): string[] => {
    const cs = (b1.w as any).byCategory[cat];
    const dup = (x: any) => x.position === "본기" && x.stage !== "day" && CAT_OF_SIPSEONG[u.pillars.branches[x.stage].sipseong] === cat;
    return cs.rootHits.filter((x: any) => !dup(x)).map((x: any) => `${B4_ST[x.stage]}지 ${x.hiddenGan}`);
  };
  return b1.facts.ups.map((u2) => ({ cat: u2.cat, count: u2.count, shape: u2.shape, hidden: b1.hidn(u2.cat), visibleLoc: visibleLocOf(u2.cat), hiddenLoc: hiddenLocOf(u2.cat) }));
}

/* ────────────────────────────────────────────────────────────────
 * B5 「압박·책임」 — 관성이 겉에 없으면 생략(대체 없음).
 * ──────────────────────────────────────────────────────────────── */
type Compo = "정관만" | "편관만" | "혼잡";
type PosBucket = "일지" | "월주" | "그외";
interface B5Facts {
  name: string; present: boolean; count: number;
  monthMark: "▲" | "▽" | "○"; monthScore: number;
  compo: Compo; shape: "겉만" | "겉+속";
  pos: PosBucket;
  visibleNames: string[]; posDesc: string[];
}
interface B5Out { paras: Tagged[][]; basis: string }

const B5_CORE: Record<Compo, string> = {
  정관만: "맡은 일은 정해진 기준과 순서를 끝까지 지켜야 마음이 놓이는 편입니다.",
  편관만: "한 번 맡은 일은 어떻게든 끝을 봐야 마음이 놓이는 편입니다.",
  혼잡: "맡은 일은 정해진 기준을 지키는 것과 끝까지 밀어붙이는 것, 두 가지를 한꺼번에 챙겨야 마음이 놓이는 편입니다.",
};
const B5_LAST = (reinforced: boolean) =>
  reinforced
    ? "그래서 한 번 맡으면 그 마음이 쉽게 가벼워지지 않고 오래갑니다."
    : "다만 그 부담이 늘 크게 느껴지는 것은 아니고, 상황이 지나면 마음이 다시 가벼워지는 편입니다.";
const B5_SHAPE_EXTRA = "겉으로 드러난 부담 말고도, 아무도 모르게 혼자 짊어지고 있는 부담이 하나 더 있는 편입니다.";
const B5_POS: Record<PosBucket, (name: string) => string> = {
  일지: (n) => `이 책임은 맡은 역할과 상관없이, ${n}님 자신에게 원래부터 붙어 있는 몫에 가깝습니다.`,
  월주: () => `이 책임은 지금 맡고 있는 역할과 맞물려 있어서, 그 역할이 바뀌면 무게도 함께 달라지는 편입니다.`,
  그외: () => `이 책임은 특정한 역할 때문이라기보다, 상황이 생길 때마다 문득 떠오르는 편입니다.`,
};

function buildB5(f: B5Facts): B5Out {
  if (!f.present) return { paras: [], basis: "" };
  const reinforced = f.monthMark === "▲";
  const p1: Tagged[] = [
    { text: B5_CORE[f.compo], rule: `b5:core:${f.compo}` },
    { text: B5_LAST(reinforced), rule: `b5:month:${reinforced ? "reinforced" : "plain"}` },
  ];
  const p2: Tagged[] = [];
  if (f.shape === "겉+속") p2.push({ text: B5_SHAPE_EXTRA, rule: "b5:shape:겉+속" });
  p2.push({ text: B5_POS[f.pos](f.name), rule: `b5:pos:${f.pos}` });
  const paras: Tagged[][] = [p1, p2];
  const mark = reinforced ? `${f.monthScore >= 3 ? "왕" : "상"}▲` : f.monthMark;
  const basis = [
    `관성 ${f.count}개(${f.visibleNames.join("·")})가 겉에 직접 나타남(${f.posDesc.join(", ")})`,
    `구성: ${f.compo === "혼잡" ? "편관+정관(관살혼잡)" : f.compo}`,
    `형태: ${f.shape}`,
    `월령 ${mark}: ${reinforced ? "태어난 달이 관성을 받쳐 주어 이 힘이 상황에 따라 쉽게 약해지지 않음" : "태어난 달이 관성을 특별히 받쳐 주지는 않음"}`,
  ].join(" · ");
  return { paras, basis };
}

const B5_STAGE_LABEL: Record<string, string> = { 년: "초년의 자리", 월: "사회로 나가는 자리", 일: "자기 자신이 선 자리", 시: "말년의 자리" };

function b5FactsFor(appData: AppData): B5Facts {
  const u: any = appData.user;
  const ck: any = buildInterpretationKey(appData); const w: any = analyzeWealthCategoryStrength(u);
  const count = ck.categoryCounts["관성"] as number;
  const score = w.byCategory["관성"].monthScore;
  const monthMark: "▲" | "▽" | "○" = score >= 2 ? "▲" : score <= -1 ? "▽" : "○";
  const visibleNames: string[] = []; const posDesc: string[] = []; const stages: string[] = [];
  (["year", "month", "hour"] as const).forEach((s) => {
    if (u.pillars[s] && CAT_OF_SIPSEONG[u.pillars[s].sipseong] === "관성") { visibleNames.push(u.pillars[s].sipseong); posDesc.push(`${B3_ST[s]}간(${B5_STAGE_LABEL[B3_ST[s]]})`); stages.push(B3_ST[s]); }
    if (u.pillars.branches[s] && CAT_OF_SIPSEONG[u.pillars.branches[s].sipseong] === "관성") { visibleNames.push(u.pillars.branches[s].sipseong); posDesc.push(`${B3_ST[s]}지(${B5_STAGE_LABEL[B3_ST[s]]})`); stages.push(B3_ST[s]); }
  });
  const dayIsGwan = u.pillars.branches.day && CAT_OF_SIPSEONG[u.pillars.branches.day.sipseong] === "관성";
  if (dayIsGwan) posDesc.push(`일지(${B5_STAGE_LABEL["일"]})`);
  const compoNames = [...visibleNames, ...(dayIsGwan ? [u.pillars.branches.day.sipseong] : [])];
  const gwan = compoNames.filter((x) => x === "편관").length, jeong = compoNames.filter((x) => x === "정관").length;
  const compo: Compo = gwan > 0 && jeong > 0 ? "혼잡" : gwan > 0 ? "편관만" : "정관만";
  const cs = w.byCategory["관성"];
  const dup = (x: any) => x.position === "본기" && x.stage !== "day" && CAT_OF_SIPSEONG[u.pillars.branches[x.stage]?.sipseong] === "관성";
  const hidden = cs.rootHits.filter((x: any) => !dup(x)).length;
  const shape: "겉만" | "겉+속" = hidden > 0 ? "겉+속" : "겉만";
  const pos: PosBucket = dayIsGwan ? "일지" : stages.includes("월") ? "월주" : "그외";
  return { name: u.name, present: count > 0, count, monthMark, monthScore: score, compo, shape, pos, visibleNames, posDesc };
}

/* ────────────────────────────────────────────────────────────────
 * B6 「사람들과 얽히는 방식」(합충) — 합·충이 없으면 생략(대체 없음).
 * B6는 자체 HEART 어휘(관성/인성/비겁/식상/재성 표현이 B1~B5·B8과 살짝
 * 다름)를 쓴다 — 검증된 원문 그대로 보존.
 * ──────────────────────────────────────────────────────────────── */
const B6_HEART: Record<Cat, string> = { 관성: "책임을 지키려는 마음", 인성: "이해하고 정리하려는 마음", 비겁: "내 방식대로 하려는 마음", 식상: "생각을 꺼내려는 마음", 재성: "실속을 챙기려는 마음" };
const B6_STAGE_KO: Record<string, string> = { year: "년", month: "월", day: "일", hour: "시" };
interface CoreText { smooth: string; smoothScene: string; tense: string; tenseScene: string }
const B6_ORDER: Cat[] = ["비겁", "식상", "재성", "관성", "인성"];
const b6PairKey = (a: Cat, b: Cat) => B6_ORDER.filter((c) => c === a || c === b).join("+");

const B6_PAIR_CORE: Record<string, CoreText> = {
  "비겁+식상": {
    smooth: "결정을 내리면 주저 없이 바로 말로 드러내는 편입니다. 내 뜻대로 하고 싶은 마음과 그걸 표현하고 싶은 마음이 따로 놀지 않고 같이 움직이기 때문입니다.",
    smoothScene: "예를 들어 다른 사람과 의견이 갈릴 때, 속으로만 정리하지 않고 \"나는 이렇게 생각해\"라고 곧장 꺼내 놓는 식입니다.",
    tense: "평소엔 참다가도, 정말 내 방식이 맞다고 느끼는 순간에는 강하게 말을 꺼내고 쉽게 물러서지 않습니다. 내 뜻대로 하고 싶은 마음과 그걸 꺼내고 싶은 마음이 한꺼번에 세게 올라오기 때문입니다.",
    tenseScene: "예를 들어 넘어갈 수 있는 일도, 결국 참지 못하고 \"그건 아니지\"라며 제 생각을 분명히 밝히고 넘어가는 식입니다.",
  },
  "비겁+재성": {
    smooth: "함께 하는 일에서도 남에게 맡기기보다 내가 직접 나서서 마무리까지 챙기는 편입니다. 내 힘으로 해내려는 마음과 실속을 챙기려는 마음이 같은 방향을 보고 있어서, 나서서 움직인 만큼 손에 잡히는 결과로 이어지기 때문입니다.",
    smoothScene: "예를 들어 같이 준비하는 일에서도, 결과가 확실해질 때까지 직접 끝을 보고야 마는 식입니다.",
    tense: "내 뜻대로 밀고 나가고 싶으면서도, 그게 손해로 이어지는 건 잘 참지 못합니다. 내 방식대로 하려는 마음과 실속을 챙기려는 마음이 동시에 강하게 작동해서, 둘 사이에서 갈팡질팡할 때가 있기 때문입니다.",
    tenseScene: "예를 들어 내 방식을 고집하다가도, 그게 실속이 없다 싶으면 순간 방향을 바꿔서라도 손해는 보지 않으려는 식입니다.",
  },
  "비겁+관성": {
    smooth: "정해진 틀 안에서도 나만의 방식을 자연스럽게 녹여내는 편입니다. 맡은 책임을 다하려는 마음과 내 방식대로 하려는 마음이 서로 맞아떨어져서, 규칙을 지키면서도 내 식대로 풀어낼 방법을 잘 찾기 때문입니다.",
    smoothScene: "예를 들어 정해진 규칙이 있는 일에서도, 그 안에서 나만의 방식을 자연스럽게 녹여내는 모습으로 나타날 수 있습니다.",
    tense: "맡은 일은 끝까지 해내고 싶어 하면서도, 모든 것을 남이 정한 방식대로 따라가는 것은 답답하게 느낄 수 있습니다. 책임을 지키려는 마음과 내 방식대로 하려는 마음이 동시에 세게 작동해서, 둘 중 어느 쪽도 쉽게 포기가 안 되기 때문입니다.",
    tenseScene: "예를 들어 함께 일을 정할 때 해야 할 책임은 피하지 않지만, 방법까지 하나하나 정해 주면 오히려 자기 방식으로 다시 정리하고 싶어질 수 있습니다.",
  },
  "비겁+인성": {
    smooth: "새로운 일을 맡아도, 이해가 되고 나면 남 눈치 보지 않고 내 방식대로 척척 해내는 편입니다. 충분히 납득한 뒤에는 내 방식대로 하려는 마음이 거침없이 따라오기 때문입니다.",
    smoothScene: "예를 들어 낯선 일도 한 번 이해가 되고 나면, 더 묻지 않고 내 방식대로 밀고 나가는 식입니다.",
    tense: "납득이 안 되면 내 방식조차 선뜻 못 정할 때가 있습니다. 내 방식대로 하고 싶은 마음과 충분히 이해되어야 움직이는 마음이 동시에 강해서, 이해가 끝나기 전에는 방식도 정해지지 않기 때문입니다.",
    tenseScene: "예를 들어 빨리 정해야 하는 순간에도, \"이게 정말 맞는 방식인가\"를 곱씹느라 정작 결정을 미루는 식입니다.",
  },
  "식상+재성": {
    smooth: "아이디어가 떠오르면 말로만 끝내지 않고 곧바로 실속 있는 방향으로 풀어내는 편입니다. 생각을 꺼내려는 마음과 결과를 챙기려는 마음이 같이 움직여서, 말한 것이 그대로 결과로 이어지기 때문입니다.",
    smoothScene: "예를 들어 좋은 생각이 떠오르면, 그 자리에서 바로 실속 있는 쪽으로 정리해서 말하는 식입니다.",
    tense: "하고 싶은 말이 있어도 득실을 따지느라 삼킬 때가 있습니다. 생각을 꺼내려는 마음과 실속을 챙기려는 마음이 동시에 세게 작동해서, 말하기 전에 계산부터 먼저 서기 때문입니다.",
    tenseScene: "예를 들어 하고 싶은 말이 있어도, \"이 말을 하면 나한테 득이 될까\"를 먼저 따지느라 결국 돌려 말하게 되는 식입니다.",
  },
  "식상+관성": {
    smooth: "맡은 일에 문제가 생기면 숨기지 않고 제때 필요한 말을 정확히 전달하는 편입니다. 하고 싶은 말을 꺼내려는 마음과 책임을 지키려는 마음이 같은 방향으로 움직여서, 기준에 맞는 말은 망설이지 않고 나오기 때문입니다.",
    smoothScene: "예를 들어 문제가 생기면 얼버무리지 않고, 필요한 말을 정확한 타이밍에 꺼내는 식입니다.",
    tense: "하고 싶은 말과 해야 하는 말 사이에서 부딪힐 때가 있습니다. 하고 싶은 말을 꺼내려는 마음과 기준을 지키려는 마음이 동시에 강해서, 어느 쪽을 먼저 따라야 할지 스스로도 헷갈리기 때문입니다.",
    tenseScene: "예를 들어 속으로는 하고 싶은 말이 있어도, \"이 자리에서 이렇게 말해도 되나\" 하는 마음에 눌러 참다가 결국 다른 순간에 터뜨리는 식입니다.",
  },
  "식상+인성": {
    smooth: "복잡한 이야기도 혼자 정리한 뒤에는 다른 사람이 이해하기 쉽게 술술 설명하는 편입니다. 정리가 끝나고 나면 꺼내려는 마음이 막힘없이 따라오기 때문입니다.",
    smoothScene: "예를 들어 머릿속이 복잡했던 일도, 한 번 정리가 되고 나면 조리 있게 풀어서 이야기하는 식입니다.",
    tense: "하고 싶은 말이 있어도 정리가 안 끝나면 입을 못 뗄 때가 있습니다. 생각을 꺼내려는 마음과 충분히 이해되어야 움직이는 마음이 동시에 강해서, 정리가 끝나기 전에는 말도 못 꺼내기 때문입니다.",
    tenseScene: "예를 들어 마음은 이미 하고 싶은 말로 가득한데, \"이게 맞는 표현인가\" 곱씹느라 정작 타이밍을 놓치는 식입니다.",
  },
  "재성+관성": {
    smooth: "맡은 일을 할 때도 기준을 지키면서 동시에 실속까지 챙기는 방법을 자연스럽게 찾아내는 편입니다. 실속을 챙기려는 마음과 책임을 지키려는 마음이 같은 곳을 보고 있어서, 원칙과 이익이 따로 가지 않기 때문입니다.",
    smoothScene: "예를 들어 정해진 기준을 지키면서도, 그 안에서 가장 실속 있는 방법을 찾아내는 식입니다.",
    tense: "원칙과 실속 사이에서 저울질할 때가 있습니다. 실속을 챙기려는 마음과 기준을 지키려는 마음이 동시에 강해서, 어느 쪽도 쉽게 포기가 안 되기 때문입니다.",
    tenseScene: "예를 들어 정해진 기준대로 하면 손해다 싶을 때, 원칙을 지킬지 실속을 챙길지 한참을 고민하는 식입니다.",
  },
  "재성+인성": {
    smooth: "중요한 결정을 앞두고도, 이해가 되고 나면 가장 실속 있는 쪽으로 미련 없이 정리하는 편입니다. 납득이 끝나는 순간 실속을 챙기려는 마음이 곧바로 따라오기 때문입니다.",
    smoothScene: "예를 들어 눈앞에 좋은 조건이 보여도, 이해가 되고 나서야 미련 없이 그 길을 선택하는 식입니다.",
    tense: "실속이 보여도 납득이 안 되면 선뜻 움직이지 못할 때가 있습니다. 실속을 챙기려는 마음과 충분히 이해되어야 움직이는 마음이 동시에 강해서, 이해가 끝나기 전에는 실속도 소용이 없기 때문입니다.",
    tenseScene: "예를 들어 눈앞에 이득이 보여도, \"근데 이게 맞는 걸까\" 하는 생각에 붙들려 결정을 미루는 식입니다.",
  },
  "관성+인성": {
    smooth: "새로운 규칙이 주어져도, 이해가 되고 나면 두말없이 성실하게 따르는 편입니다. 납득이 끝나는 순간 기준을 지키려는 마음이 흔들림 없이 따라오기 때문입니다.",
    smoothScene: "예를 들어 따라야 할 규칙이 새로 생겨도, 이해가 되고 나면 두말없이 성실히 지키는 식입니다.",
    tense: "기준은 지켜야겠는데 납득이 안 되면 마음이 불편할 때가 있습니다. 책임을 지키려는 마음과 충분히 이해되어야 움직이는 마음이 동시에 강해서, 이해가 안 끝난 채로 기준만 따라야 하기 때문입니다.",
    tenseScene: "예를 들어 따라야 하는 규칙이 있어도, \"왜 이렇게 해야 하는지\" 납득이 안 되면 겉으로는 지키면서도 속으로는 계속 걸리는 모습으로 나타날 수 있습니다.",
  },
};

const B6_SELF_CORE: Record<Cat, CoreText> = {
  비겁: {
    smooth: "자리나 상대가 바뀌어도 내 방식만큼은 변함없이 지켜 나가는 편입니다. 내 힘으로 하려는 마음이 어느 자리에서든 같은 결로 이어지기 때문입니다.",
    smoothScene: "예를 들어 상황이 달라져도, 정해 둔 내 방식만큼은 늘 비슷하게 지켜 나가는 식입니다.",
    tense: "정작 어느 쪽 내 방식을 따라야 할지 스스로 부딪힐 때가 있습니다. 내 힘으로 하려는 마음이 서로 다른 자리에서 각각 세게 나와서, 두 방식이 동시에 고집을 부리기 때문입니다.",
    tenseScene: "예를 들어 서로 다른 상황에서 각각 정해 둔 내 방식이 부딪히면, 어느 쪽 고집을 꺾어야 할지 스스로도 정리가 안 되는 식입니다.",
  },
  식상: {
    smooth: "상대나 자리가 달라져도 하고 싶은 말은 비슷한 결로 꾸밈없이 꺼내는 편입니다. 표현하려는 마음이 어디서나 같은 방식으로 이어지기 때문입니다.",
    smoothScene: "예를 들어 누구 앞에서든, 하고 싶은 말은 비슷한 방식으로 숨김없이 꺼내는 식입니다.",
    tense: "꺼내고 싶은 말이 한꺼번에 몰릴 때가 있습니다. 표현하려는 마음이 서로 다른 자리에서 각각 세게 올라와서, 정리가 안 된 채 말이 쏟아지기 때문입니다.",
    tenseScene: "예를 들어 여러 사람에게 동시에 하고 싶은 말이 쌓이면, 무엇부터 꺼내야 할지 몰라 말이 뒤섞여 나오는 식입니다.",
  },
  재성: {
    smooth: "상황이 달라져도 실속을 챙기는 감각만큼은 한결같이 발휘되는 편입니다. 실속을 챙기려는 마음이 자리를 가리지 않고 이어지기 때문입니다.",
    smoothScene: "예를 들어 상황이 바뀌어도, 실속을 챙기는 감각만큼은 늘 비슷하게 발휘되는 식입니다.",
    tense: "이것도 놓치기 싫고 저것도 놓치기 싫어 갈팡질팡할 때가 있습니다. 실속을 챙기려는 마음이 서로 다른 자리에서 각각 강하게 작동해서, 둘 다 포기가 안 되기 때문입니다.",
    tenseScene: "예를 들어 두 가지 실속이 동시에 걸리면, 어느 쪽도 포기하지 못해 한참을 저울질하는 식입니다.",
  },
  관성: {
    smooth: "맡은 자리가 바뀌어도 지키려는 기준만큼은 변함없이 유지하는 편입니다. 책임을 지키려는 마음이 어느 자리에서든 같은 기준으로 이어지기 때문입니다.",
    smoothScene: "예를 들어 맡은 역할이 바뀌어도, 지키려는 기준만큼은 늘 비슷하게 유지하는 식입니다.",
    tense: "어느 쪽 기준을 먼저 따라야 할지 스스로도 헷갈릴 때가 있습니다. 책임을 지키려는 마음이 서로 다른 자리에서 각각 세게 작동해서, 두 기준이 동시에 자기를 앞세우기 때문입니다.",
    tenseScene: "예를 들어 서로 다른 자리에서 요구하는 기준이 동시에 걸리면, 무엇을 먼저 지켜야 할지 몰라 마음이 분주해지는 식입니다.",
  },
  인성: {
    smooth: "상황이 여러 번 바뀌어도 매번 차분히 이해한 뒤에 움직이는 편입니다. 이해하고 정리하려는 마음이 자리를 가리지 않고 이어지기 때문입니다.",
    smoothScene: "예를 들어 상황이 여러 번 바뀌어도, 매번 차분히 이해한 뒤에야 움직이는 식입니다.",
    tense: "이쪽도 이해해야 하고 저쪽도 이해해야 해서 정리가 오래 걸릴 때가 있습니다. 이해하고 정리하려는 마음이 서로 다른 자리에서 각각 강하게 작동해서, 둘 다 끝나야 움직이기 때문입니다.",
    tenseScene: "예를 들어 한 번에 여러 가지를 이해해야 하는 상황이 오면, 다 정리될 때까지 쉽게 움직이지 못하는 식입니다.",
  },
};

function b6CoreOf(a: Cat, b: Cat): CoreText { return a === b ? B6_SELF_CORE[a] : B6_PAIR_CORE[b6PairKey(a, b)]; }

interface RelInstance { stage: string; zhi: string; sipseong: string }
interface RelPair { type: "합" | "충"; a: RelInstance; b: RelInstance; catA: Cat; catB: Cat }
interface B6Facts { name: string; applicable: boolean; pattern: string; he: RelPair[]; chong: RelPair[]; overlap?: { stage: string; zhi: string } }
interface B6Out { paras: Tagged[][]; basis: string }

function b6UniquePairs(pairs: RelPair[]): RelPair[] {
  const seen = new Map<string, RelPair>();
  pairs.forEach((p) => { const k = [p.catA, p.catB].sort().join("+"); if (!seen.has(k)) seen.set(k, p); });
  return [...seen.values()];
}

function b6ParaFor(type: "합" | "충", p: RelPair): Tagged[] {
  const core = b6CoreOf(p.catA, p.catB);
  const isSmooth = type === "합";
  const key = p.catA === p.catB ? p.catA : b6PairKey(p.catA, p.catB);
  return [
    { text: isSmooth ? core.smooth : core.tense, rule: `b6:${type}:${key}:core` },
    { text: isSmooth ? core.smoothScene : core.tenseScene, rule: `b6:${type}:${key}:scene` },
  ];
}

function buildB6(f: B6Facts): B6Out {
  if (!f.applicable) return { paras: [], basis: "" };
  const paras: Tagged[][] = [];
  const basisParts: string[] = [];

  if (f.pattern === "겹침" && f.overlap) {
    const hePair = f.he.find((p) => p.a.stage === f.overlap!.stage || p.b.stage === f.overlap!.stage) ?? f.he[0];
    const chongPair = f.chong.find((p) => p.a.stage === f.overlap!.stage || p.b.stage === f.overlap!.stage) ?? f.chong[0];
    const overlapSideOf = (p: RelPair) => (p.a.stage === f.overlap!.stage ? p.a : p.b);
    const otherSideOf = (p: RelPair) => (p.a.stage === f.overlap!.stage ? p.b : p.a);
    const oc: Cat = (overlapSideOf(hePair) as any).cat;
    const heOther: Cat = (otherSideOf(hePair) as any).cat;
    const chongOther: Cat = (otherSideOf(chongPair) as any).cat;

    const smoothCore = b6CoreOf(oc, heOther);
    paras.push([
      { text: smoothCore.smooth, rule: `b6:overlap:${oc}:${heOther}:smooth` },
      { text: smoothCore.smoothScene, rule: `b6:overlap:${oc}:${heOther}:smoothScene` },
    ]);

    const tenseCore = b6CoreOf(oc, chongOther);
    paras.push([
      { text: tenseCore.tense, rule: `b6:overlap:${oc}:${chongOther}:tense` },
      { text: tenseCore.tenseScene, rule: `b6:overlap:${oc}:${chongOther}:tenseScene` },
      { text: `같은 ${B6_HEART[oc]}인데도, 상황에 따라 이렇게 다른 얼굴로 나타날 수 있습니다.`, rule: "b6:overlap:close" },
    ]);

    basisParts.push(`겹침: ${B6_STAGE_KO[f.overlap.stage]}(${f.overlap.zhi})`);
    basisParts.push(`합: ${B6_STAGE_KO[hePair.a.stage]}(${hePair.a.zhi}/${hePair.a.sipseong}) ↔ ${B6_STAGE_KO[hePair.b.stage]}(${hePair.b.zhi}/${hePair.b.sipseong})`);
    basisParts.push(`충: ${B6_STAGE_KO[chongPair.a.stage]}(${chongPair.a.zhi}/${chongPair.a.sipseong}) ↔ ${B6_STAGE_KO[chongPair.b.stage]}(${chongPair.b.zhi}/${chongPair.b.sipseong})`);
  } else {
    const heU = b6UniquePairs(f.he); const chongU = b6UniquePairs(f.chong);
    heU.forEach((p) => { paras.push(b6ParaFor("합", p)); });
    chongU.forEach((p) => { paras.push(b6ParaFor("충", p)); });
    [...f.he, ...f.chong].forEach((p) => basisParts.push(`${p.type}: ${B6_STAGE_KO[p.a.stage]}(${p.a.zhi}/${p.a.sipseong}) ↔ ${B6_STAGE_KO[p.b.stage]}(${p.b.zhi}/${p.b.sipseong})`));
  }

  const basis = `패턴: ${f.pattern} · ${basisParts.join(" · ")}`;
  return { paras, basis };
}

function b6FactsFor(appData: AppData): B6Facts {
  const u: any = appData.user;
  const k3: any = buildChapterThreeKey(appData); const hc = k3.heChong;
  if (hc.pattern === "둘다없음") return { name: u.name, applicable: false, pattern: hc.pattern, he: [], chong: [] };
  const mk = (p: any, type: "합" | "충"): RelPair => {
    const sipA = u.pillars.branches[p.a.stage].sipseong; const sipB = u.pillars.branches[p.b.stage].sipseong;
    return {
      type, a: { stage: p.a.stage, zhi: p.a.zhi, sipseong: sipA } as any, b: { stage: p.b.stage, zhi: p.b.zhi, sipseong: sipB } as any,
      catA: CAT_OF_SIPSEONG[sipA], catB: CAT_OF_SIPSEONG[sipB],
    };
  };
  const withCat = (p: RelPair): RelPair => ({ ...p, a: { ...p.a, cat: p.catA } as any, b: { ...p.b, cat: p.catB } as any });
  const he = hc.he.map((p: any) => withCat(mk(p, "합")));
  const chong = hc.chong.map((p: any) => withCat(mk(p, "충")));
  return { name: u.name, applicable: true, pattern: hc.pattern, he, chong, overlap: hc.overlap };
}

/* ────────────────────────────────────────────────────────────────
 * B7 「나를 지탱해 주는 힘」(용신·희신) — 신강/신약만 적용, 중화·보류·
 * hold·unresolved는 생략(대체 없음).
 * ──────────────────────────────────────────────────────────────── */
const B7_IDX: Record<Cat, number> = { 비겁: 0, 식상: 1, 재성: 2, 관성: 3, 인성: 4 };
const B7_CONTROLLED_BY: Record<Cat, Cat> = { 비겁: "관성", 식상: "인성", 재성: "비겁", 관성: "식상", 인성: "재성" };
const B7_SITUATION: Record<Cat, string> = {
  관성: "맡은 일을 책임지고 끝까지 해낼 때",
  인성: "결정을 내리기 전에 충분히 정리하고 판단할 때",
  비겁: "누구에게도 기대지 않고 내 방식대로 밀고 나갈 때",
  식상: "생각한 것을 말이나 행동으로 꺼낼 때",
  재성: "일을 눈에 보이는 결과로 마무리 지을 때",
};
const B7_NOUN: Record<Cat, string> = {
  관성: "맡은 일을 책임지고 끝까지 해내는 힘",
  인성: "결정을 내리기 전에 충분히 정리하고 판단하는 힘",
  비겁: "누구에게도 기대지 않고 내 방식대로 밀고 나가는 힘",
  식상: "생각한 것을 말이나 행동으로 꺼내는 힘",
  재성: "일을 눈에 보이는 결과로 마무리 짓는 힘",
};
const B7_PRESSURE: Record<Cat, string> = {
  관성: "기준과 원칙부터 앞세우는 마음이 강해질 때",
  인성: "이해하고 재려는 마음이 지나치게 앞설 때",
  비겁: "내 방식을 고집하려는 마음이 강해질 때",
  식상: "하고 싶은 말부터 앞세우는 마음이 강해질 때",
  재성: "결과부터 따지려는 마음이 강해질 때",
};

interface WinnerFact { cat: Cat; hasRoot: boolean; hasTou: boolean; incoming: boolean; outgoing: boolean; ownWarning: boolean; pressureHasEvidence: boolean }
interface HuisinFact { forCat: Cat; cat: Cat; exposure: "뚜렷" | "숨음" | "미미"; hasRoot: boolean; hasTou: boolean; hardBlocked: boolean; secondSupport: boolean; ownWarning: boolean; visibleStages: string[] }
interface B7Facts { name: string; applicable: boolean; winners: WinnerFact[]; huisin: HuisinFact[]; balanceLabel: string }
interface B7Out { paras: Tagged[][]; basis: string }

const b7IsAdjacent = (a: Cat, b: Cat) => Math.abs(B7_IDX[a] - B7_IDX[b]) === 1 || Math.abs(B7_IDX[a] - B7_IDX[b]) === 4;

function b7RootClause(w: WinnerFact): Tagged {
  return w.hasRoot
    ? { text: "이 힘은 그때만 반짝하고 마는 게 아니라, 시간이 걸려도 결국 이 방식으로 돌아오는 힘입니다.", rule: `b7:root:${w.cat}:has` }
    : { text: "다만 이 힘을 오래 붙잡아 줄 자리가 마땅치 않아서, 상황이 크게 바뀌면 이 힘도 잠시 흔들릴 수 있습니다.", rule: `b7:root:${w.cat}:none` };
}
function b7TouClause(w: WinnerFact): Tagged | null {
  return w.hasTou ? { text: "여러 상황에서 반복해서 같은 방식으로 이 힘이 나오는 편입니다.", rule: `b7:tou:${w.cat}` } : null;
}
function b7FlowClause(w: WinnerFact): Tagged | null {
  if (!w.incoming) return null;
  return w.outgoing
    ? { text: "이 힘은 다른 데서 자연스럽게 이어받아 쓰는 힘이라 애써 만들지 않아도 되고, 여기서 그치지 않고 다음 상황으로도 자연스럽게 이어집니다.", rule: `b7:flow:${w.cat}:both` }
    : { text: "다만 이 힘을 다른 곳까지 넓혀 쓰기보다, 이 순간 자체에 머무르는 편입니다.", rule: `b7:flow:${w.cat}:onlyIn` };
}

function buildB7(f: B7Facts): B7Out {
  if (!f.applicable || f.winners.length === 0) return { paras: [], basis: `일간 강약: ${f.balanceLabel} — 용신 판정 대상 아님` };
  const w = f.winners;
  const paras: Tagged[][] = [];

  const act1: Tagged[] = [];
  if (w.length === 1) {
    act1.push({ text: `${B7_SITUATION[w[0].cat]}, ${f.name}님은 오히려 힘이 나는 편입니다.`, rule: `b7:situation:${w[0].cat}` });
    act1.push(b7RootClause(w[0]));
    const tc = b7TouClause(w[0]); if (tc) act1.push(tc);
    const fc = b7FlowClause(w[0]); if (fc) act1.push(fc);
  } else {
    act1.push({
      text: `${f.name}님에게는 힘이 나는 방식이 두 가지입니다. ${B7_SITUATION[w[0].cat]}, 그리고 ${B7_SITUATION[w[1].cat]}입니다.`,
      rule: `b7:situation:${w[0].cat}+${w[1].cat}`,
    });
    if (b7IsAdjacent(w[0].cat, w[1].cat)) act1.push({ text: "이 둘은 순서대로 자연스럽게 이어져서, 한쪽이 자연스럽게 다른 쪽으로 이어지는 흐름을 만듭니다.", rule: `b7:chain:${w[0].cat}+${w[1].cat}` });
    else act1.push({ text: "이 둘은 서로 이어지는 흐름이라기보다, 각각 따로 힘이 되는 두 갈래에 가깝습니다.", rule: `b7:chain:${w[0].cat}+${w[1].cat}:sep` });
    if (w[0].hasRoot === w[1].hasRoot) act1.push(b7RootClause(w[0]));
    else { act1.push(b7RootClause(w[0])); act1.push(b7RootClause(w[1])); }
    if (w[0].hasTou === w[1].hasTou) { const tc = b7TouClause(w[0]); if (tc) act1.push(tc); }
    else { const t0 = b7TouClause(w[0]); if (t0) act1.push(t0); const t1 = b7TouClause(w[1]); if (t1) act1.push(t1); }
  }
  paras.push(act1);

  const pressured = w.filter((x) => x.pressureHasEvidence);
  if (pressured.length) {
    const act2: Tagged[] = [];
    pressured.forEach((x) => {
      const opp = B7_CONTROLLED_BY[x.cat];
      act2.push({ text: `다만 ${B7_PRESSURE[opp]}는 ${w.length > 1 ? `${B7_NOUN[x.cat]}이` : "이 힘이"} 밀리기 쉽습니다.`, rule: `b7:pressure:${x.cat}:lead` });
      act2.push({ text: `${B7_NOUN[opp].replace("힘", "쪽")}도 원래 세게 타고나서, 두 마음이 부딪히면 그렇게 됩니다.`, rule: `b7:pressure:${x.cat}:evidence` });
    });
    paras.push(act2);
  }

  const act3: Tagged[] = [];
  f.huisin.forEach((h, i) => {
    const lead = i === 0 ? `이 힘을 뒷받침해 주는, ${B7_NOUN[h.cat]}은` : `그리고 ${B7_NOUN[h.cat]}은`;
    if (h.hardBlocked) {
      act3.push({ text: `${lead} 지금 크게 막혀 있어서 기대하기 어렵고, ${f.name}님이 이 부분을 스스로 채워야 하는 편입니다.`, rule: `b7:huisin:${h.cat}:blocked` });
      return;
    }
    if (h.exposure === "뚜렷") {
      act3.push({
        text: h.hasTou
          ? `${lead} 겉으로 드러나 있을 뿐 아니라 뿌리 깊이 자리 잡고 있어서, 애써 찾지 않아도 저절로 곁에 있는 도움에 가깝습니다.`
          : `${lead} 이미 겉으로 드러나 있어서, ${f.name}님이 필요할 때 가져다 쓸 수 있는 도움입니다.`,
        rule: `b7:huisin:${h.cat}:visible:${h.hasTou ? "tou" : "plain"}`,
      });
    }
    else if (h.exposure === "숨음") act3.push({ text: `${lead} 평소에는 잘 드러나지 않다가, 정말 필요한 순간에만 슬쩍 나오는 편입니다.`, rule: `b7:huisin:${h.cat}:hidden` });
    else act3.push({ text: `${lead} 거의 있지 않아서, ${f.name}님이 이 부분을 스스로 채워야 하는 편입니다.`, rule: `b7:huisin:${h.cat}:faint` });
    if (h.ownWarning) {
      const opp = B7_CONTROLLED_BY[h.cat];
      act3.push({ text: `다만 ${B7_PRESSURE[opp]} 오히려 눌리는 상태라, 지금은 온전히 기대기 어렵습니다.`, rule: `b7:huisin:${h.cat}:pressured` });
    } else if (!h.secondSupport && h.exposure !== "미미" && !h.hardBlocked) {
      act3.push({ text: `다만 이 힘을 한 번 더 받쳐 줄 세 번째 힘까지는 없어서, ${f.name}님이 직접 채우는 몫이 좀 더 있는 편입니다.`, rule: `b7:huisin:${h.cat}:noSecond` });
    }
  });
  // 희신(hs)이 용신(ys)과 별도로 불성립이면 f.huisin이 빈 배열일 수 있다 — 그때 act3도
  // 비어 있으므로 빈 문단을 만들지 않는다(act2와 같은 방어).
  if (act3.length) paras.push(act3);

  const basis = [
    `강약: ${f.balanceLabel}`,
    `용신: ${w.map((x) => `${x.cat}(뿌리${x.hasRoot ? "O" : "X"}·투간${x.hasTou ? "O" : "X"}·이어받음${x.incoming ? "O" : "X"}·이어줌${x.outgoing ? "O" : "X"}${x.ownWarning ? "·경고O" : ""}${x.pressureHasEvidence ? `·반대(${B7_CONTROLLED_BY[x.cat]})신호O` : ""})`).join(", ")}`,
    `희신: ${f.huisin.map((h) => `${h.cat}(노출${h.exposure}${h.visibleStages.length ? `:${h.visibleStages.join("·")}` : ""}·뿌리${h.hasRoot ? "O" : "X"}·투간${h.hasTou ? "O" : "X"}${h.hardBlocked ? "·차단" : ""}·2차지원${h.secondSupport ? "O" : "X"}${h.ownWarning ? "·경고O" : ""})`).join(", ")}`,
  ].join(" · ");
  return { paras, basis };
}

const B7_BAL_LABEL: Record<string, string> = { clearlyStrong: "명확한 신강", slightlyStrong: "다소 신강", neutral: "중화에 가까움", slightlyWeak: "다소 신약", clearlyWeak: "명확한 신약", hold: "자동 판정 보류" };

function b7FactsFor(appData: AppData): B7Facts {
  const u: any = appData.user;
  const bal = analyzeDayMasterBalance(u);
  const ys = analyzeYongsinCandidate(u);
  const hs = analyzeHuisinCandidate(u);
  const w: any = analyzeWealthCategoryStrength(u);
  const balanceLabel = B7_BAL_LABEL[bal.balance];

  if (!ys.applicable || ys.outcome === "hold" || ys.outcome === "unresolved" || ys.winners.length === 0) {
    return { name: u.name, applicable: false, winners: [], huisin: [], balanceLabel };
  }

  const winners: WinnerFact[] = ys.winners.map((cat: Cat) => {
    const cd: any = ys.candidates.find((c: any) => c.category === cat);
    const opp = B7_CONTROLLED_BY[cat];
    const oppScore = w.byCategory[opp].monthScore;
    const ownWarning = cd.warnings.length > 0;
    return {
      cat, hasRoot: cd.hasRoot, hasTou: cd.hasTou, incoming: cd.incoming, outgoing: cd.outgoing,
      ownWarning, pressureHasEvidence: ownWarning || oppScore >= 2,
    };
  });

  const huisin: HuisinFact[] = hs.applicable
    ? hs.pairs.map((p: any) => ({
        forCat: p.forYongsin, cat: p.category, exposure: p.manifestation.exposure,
        hasRoot: p.manifestation.hasRoot, hasTou: p.manifestation.hasTou, hardBlocked: p.hardBlocked,
        secondSupport: !!p.supportIntoHuisin?.active, ownWarning: (p.warnings ?? []).length > 0,
        visibleStages: (p.manifestation.visiblePositions ?? []).map((s: string) => B7_STAGE_KO[s]),
      }))
    : [];

  return { name: u.name, applicable: true, winners, huisin, balanceLabel };
}
const B7_STAGE_KO: Record<string, string> = { year: "년", month: "월", day: "일", hour: "시" };

/* ────────────────────────────────────────────────────────────────
 * B8 「편한 자리에서 나오는 모습」(일지 자체 십성) — 항상 생성(생략 없음).
 * ──────────────────────────────────────────────────────────────── */
const B8_BEHAVIOR: Record<Cat, string> = {
  관성: "혼자 있을 때나 가까운 사람과 있을 때도, 아무도 확인하지 않을 상황이라고 느슨해지기보다는 스스로 정한 기준을 끝까지 지키려는 편입니다. 대충 넘어가도 티가 안 날 일에도, 정한 건 정한 대로 마무리해야 마음이 놓입니다.",
  인성: "혼자 있을 때는 그날 있었던 일을 서둘러 잊기보다, 마음속으로 다시 한번 되짚어 보고 나서야 편해지는 편입니다. 가까운 사람과 있을 때도 바로 반응하기보다 먼저 이해가 되어야 마음이 움직입니다.",
  비겁: "가까운 사람이 도와주겠다고 해도, 선뜻 맡기기보다는 내 손으로 끝까지 해보려는 편입니다. 혼자 있을 때는 남의 의견에 맞추기보다 내가 정한 방식대로 움직이는 쪽에 가깝습니다.",
  식상: "밖에서는 하고 싶은 말을 아끼다가도, 혼자 있거나 편한 사람 앞에서는 속으로만 담아 두기보다 꺼내서 말하는 쪽에 가깝습니다. 마음에 걸리는 게 있으면 그냥 넘기기보다 말이나 표정으로 드러내는 편입니다.",
  재성: "가까운 사람과 무언가를 함께 결정해야 할 때도 감정만 앞세우기보다 지금 상황에서 무엇이 현실적인지를 먼저 살펴보는 편입니다. 계획대로 되지 않는 일이 생겨도 처음 정한 방식만 고집하기보다는, 그때의 상황을 보고 다른 방법을 찾는 쪽에 가깝습니다.",
};
const B8_SCENE: Record<Cat, string> = {
  관성: "예를 들어 혼자 하기로 한 계획을 아무도 모르게 건너뛸 수 있는 상황이 생겨도, '오늘은 그냥 넘어갈까' 하는 생각에 오래 머물기보다 '그래도 정한 건 정한 거니까' 하며 결국 마무리하고 넘어가는 모습으로 나타날 수 있습니다.",
  인성: "예를 들어 낮에 있었던 대화가 마음에 걸리면, '그냥 넘기자'는 생각보다 '그때 왜 그렇게 말했을까'를 혼자 가만히 정리해 보는 시간을 갖는 모습으로 나타날 수 있습니다.",
  비겁: "예를 들어 가까운 사람이 '이렇게 하는 게 낫지 않겠냐'고 해도, 그 말을 따르기보다 '아니, 이건 내가 해볼게'라며 끝까지 스스로 해내는 모습으로 나타날 수 있습니다.",
  식상: "예를 들어 밖에서는 웃고 넘긴 일도, 집에 와서 가까운 사람 앞에서는 '사실 아까 그거 좀 그랬어' 하고 결국 이야기를 꺼내는 모습으로 나타날 수 있습니다.",
  재성: "예를 들어 함께 무언가를 준비하다 예상과 다른 상황이 생겼을 때, '원래 이렇게 하기로 했잖아'라는 말에 오래 머물기보다 '그럼 지금은 어떻게 하는 게 좋을까?'를 먼저 생각하는 모습으로 나타날 수 있습니다.",
};

interface B8Facts { name: string; dc: Cat; existsElsewhere: boolean; hasOuterRoot: boolean; innerOthers: Cat[]; dayZhi: string; daySip: string }
interface B8Out { paras: Tagged[][]; basis: string }

function b8JoinHearts(cs: Cat[]): string {
  if (cs.length === 1) return HEART[cs[0]];
  if (cs.length === 2) return `${HEART[cs[0]]}과 ${HEART[cs[1]]}`;
  return `${cs.slice(0, -1).map((c) => HEART[c]).join(", ")}과 ${HEART[cs[cs.length - 1]]}`;
}

function buildB8(f: B8Facts): B8Out {
  const p1: Tagged[] = [];
  if (f.existsElsewhere) {
    p1.push({ text: `지금까지 본 여러 모습 중에서도 이미 드러났던 ${HEART[f.dc]}이, 사실은 ${f.name}님과 가장 가까운 자리에도 뿌리내리고 있습니다.`, rule: `b8:lead:${f.dc}:elsewhere` });
    p1.push({ text: "그래서 겉에서 맡은 역할과 상관없이, 혼자 있을 때나 편한 사람 앞에서는 이 마음이 자연스럽게 앞장섭니다.", rule: `b8:lead2` });
  } else {
    p1.push({ text: `지금까지 본 여러 모습에 한 가지를 더하면, ${f.name}님을 더 온전히 알 수 있습니다. ${HEART[f.dc]}은 겉으로 맡은 역할에서는 잘 안 보이지만, ${f.name}님이 가장 편한 자리, 혼자 있을 때나 가까운 사람 앞에서는 자연스럽게 나옵니다.`, rule: `b8:lead:${f.dc}:new` });
  }
  p1.push({ text: B8_BEHAVIOR[f.dc], rule: `b8:behavior:${f.dc}` });
  p1.push({ text: B8_SCENE[f.dc], rule: `b8:scene:${f.dc}` });

  const p2: Tagged[] = [];
  p2.push(
    f.hasOuterRoot
      ? { text: "이 마음은 이 자리에만 머물지 않고 다른 곳에도 뿌리를 내리고 있어서, 오래되고 뿌리 깊은 성향에 가깝습니다.", rule: `b8:root:${f.dc}:outer` }
      : { text: "다만 이 마음은 딱 이 자리에서만 강하게 나타나서, 겉모습만 아는 사람은 이런 면이 있는지 짐작하기 어렵습니다.", rule: `b8:root:${f.dc}:onlyHere` }
  );
  if (f.innerOthers.length) p2.push({ text: `그리고 이 자리 안에는 ${b8JoinHearts(f.innerOthers)}도 함께 숨어 있어서, 아주 가까운 사람만 알아챌 수 있는 또 다른 면도 있습니다.`, rule: `b8:inner:${f.innerOthers.join("+")}` });
  p2.push({ text: `겉에서 맡은 역할과 이 사적인 모습을 함께 알아야, 비로소 ${f.name}님이 실제 생활에서 어떤 사람인지 온전히 그릴 수 있습니다.`, rule: `b8:close` });

  const basis = [
    `일지: ${f.dayZhi}(${f.daySip} → ${f.dc})`,
    `6글자(년·월·시) 중 같은 카테고리: ${f.existsElsewhere ? "있음" : "없음"}`,
    `다른 자리(년·월·시)에 이 카테고리의 통근: ${f.hasOuterRoot ? "있음" : "없음"}`,
    f.innerOthers.length ? `일지 지장간 중 본기 외: ${f.innerOthers.join("·")}` : `일지 지장간: 본기만 있음(중기·여기 없음)`,
  ].join(" · ");
  return { paras: [p1, p2], basis };
}

function b8FactsFor(appData: AppData): B8Facts {
  const u: any = appData.user;
  const ck: any = buildInterpretationKey(appData); const w: any = analyzeWealthCategoryStrength(u);
  const dayZhi: string = u.pillars.branches.day.hanja;
  const daySip: string = u.pillars.branches.day.sipseong;
  const dc = CAT_OF_SIPSEONG[daySip];
  const existsElsewhere = (ck.categoryCounts[dc] ?? 0) > 0;
  const rootHits = w.byCategory[dc].rootHits as any[];
  const hasOuterRoot = rootHits.some((h) => h.stage !== "day");
  const dayGan: string = u.pillars.day.hanja;
  const hideGan: string[] = u.natal.pillars.day.hideGan ?? [];
  const innerOthers = [...new Set(hideGan.slice(1).map((hg) => CAT_OF_SIPSEONG[computeSipseong(dayGan, hg)]).filter((c) => c && c !== dc))] as Cat[];
  return { name: u.name, dc, existsElsewhere, hasOuterRoot, innerOthers, dayZhi, daySip };
}

/* ────────────────────────────────────────────────────────────────
 * 정리(마무리) — 항상 생성. B1~B8 코드/계산은 건드리지 않고, 이미 계산된
 * 결과(ups/present/applicable/dc)만 재사용한다.
 * ──────────────────────────────────────────────────────────────── */
interface ClosingFacts { name: string; ups: Cat[]; b5Present: boolean; b6Applicable: boolean; b7Applicable: boolean; dc: Cat; dcInUps: boolean }
interface ClosingOut { paras: Tagged[][]; basis: string }

const closingJoinUps = (cs: Cat[]) => (cs.length >= 2 ? `${HEART[cs[0]]}과 ${HEART[cs[1]]}` : HEART[cs[0]]);
const closingMinds = (cs: Cat[]) => (cs.length >= 2 ? "두 마음" : "마음");

function buildClosing(f: ClosingFacts): ClosingOut {
  const p1: Tagged[] = [];
  p1.push({ text: `지금까지 본 ${f.name}님의 여러 모습은 서로 다른 사람 이야기가 아니라, 한 사람이 여러 자리에 설 때마다 보여 온 얼굴들입니다.`, rule: "closing:open" });
  p1.push({ text: `타고난 뿌리, ${closingJoinUps(f.ups)}은 겉으로 드러나는 모습과 속에서 판단하는 모습에서도 거의 그대로 이어졌습니다.`, rule: `closing:root:${f.ups.join("+")}` });
  p1.push({ text: "그리고 같은 사람이 일이나 사람 앞에 설 때는 자기 역할부터 분명히 했고, 힘든 일이 겹칠 때도 쉽게 무너지지 않았습니다.", rule: "closing:b2b3" });
  if (f.b5Present) p1.push({ text: "실제로 책임을 맡는 자리에서는 그 무게를 쉽게 내려놓지 못하는 모습으로까지 이어졌습니다.", rule: "closing:b5:present" });

  const p2: Tagged[] = [];
  if (f.b6Applicable) p2.push({ text: "사람들과 함께 있을 때는 이 마음이 또 다른 마음과 부딪히거나 맞물리는 지점도 있었습니다.", rule: "closing:b6" });
  p2.push(
    f.dcInUps
      ? { text: `그리고 가장 편한 자리, 혼자 있거나 가까운 사람과 있을 때도 같은 ${HEART[f.dc]}이 자연스럽게 이어졌습니다.`, rule: `closing:b8:same:${f.dc}` }
      : { text: `그런데 가장 편한 자리, 혼자 있거나 가까운 사람과 있을 때는 이 ${closingMinds(f.ups)}과는 결이 다른 ${HEART[f.dc]}이 자연스럽게 앞으로 나왔습니다.`, rule: `closing:b8:diff:${f.dc}` }
  );
  if (f.b7Applicable) p2.push({ text: "그리고 이 모든 걸 쉽게 지치지 않고 끌고 갈 수 있는 나름의 힘도 함께 있습니다.", rule: "closing:b7" });

  const summary =
    f.dcInUps && f.b6Applicable
      ? `그러니까 ${f.name}님은 겉에서는 ${closingJoinUps(f.ups)}을 앞세우면서도, 사람들과 함께 있을 때는 또 다른 마음도 함께 움직이고, 혼자 있을 때는 그 결이 크게 달라지지 않는 사람입니다.`
      : f.dcInUps
      ? `그러니까 ${f.name}님은 겉에서 보이는 모습과 속에 있는 마음, 혼자 있을 때 나오는 모습까지 대체로 같은 결로 이어지는, 겉과 속이 잘 맞는 사람입니다.`
      : f.b6Applicable
      ? `그러니까 ${f.name}님은 겉에서는 ${closingJoinUps(f.ups)}을 앞세우고, 사람들과 함께 있을 때는 또 다른 마음도 함께 움직이며, 가장 편한 자리에서는 ${HEART[f.dc]}이 따로 움직이는, 생각보다 여러 결을 가진 사람입니다.`
      : `그러니까 ${f.name}님은 겉에서는 ${closingJoinUps(f.ups)}을 앞세우면서도, 가장 편한 자리에서는 ${HEART[f.dc]}이 따로 움직이는, 생각보다 여러 결을 가진 사람입니다.`;
  p2.push({ text: summary, rule: `closing:summary:${f.dcInUps}:${f.b6Applicable}` });

  const example = f.dcInUps
    ? `예를 들어 겉에서 보이는 ${HEART[f.ups[0]]}이, 정작 혼자 있을 때도 크게 다르지 않은 모습으로 이어질 수 있습니다.`
    : `예를 들어 겉에서는 ${HEART[f.ups[0]]}으로 움직이다가도, 정작 혼자 있을 때는 ${HEART[f.dc]}이 먼저 앞서는 식으로 나타날 수 있습니다.`;
  p2.push({ text: example, rule: `closing:example:${f.dcInUps}` });

  const basis = [
    `B1 타고난 두 힘: ${f.ups.join("·")}`,
    `B5 관성 존재: ${f.b5Present ? "있음" : "없음(해당 문단 생략됨)"}`,
    `B6 합충 적용: ${f.b6Applicable ? "있음" : "없음(해당 문단 생략됨)"}`,
    `B7 용신 판정 적용: ${f.b7Applicable ? "있음" : "없음(해당 문단 생략됨)"}`,
    `B8 일지 카테고리: ${f.dc}(B1의 두 힘과 ${f.dcInUps ? "같은 축" : "다른 축"})`,
  ].join(" · ");
  return { paras: [p1, p2], basis };
}

/* ────────────────────────────────────────────────────────────────
 * 조립 — B1→B2→B3→B4→B5(조건부)→B6(조건부)→B7(조건부)→B8→정리 순서로
 * 문단을 이어붙여 heading 없는 섹션 배열을 만든다(1·2장과 동일 기준).
 * ──────────────────────────────────────────────────────────────── */
export interface ChapterThreeSentenceBankSection { heading: string; body: string[] }

function toBody(paras: Tagged[][]): string[] {
  return paras.map((p) => p.map((t) => t.text).join(" "));
}

export function buildChapterThreeSentenceBankSections(appData: AppData): ChapterThreeSentenceBankSection[] {
  const { care, topVisible } = chapterOneCareAndTopVisible(appData);

  const b1r = b1FactsFor(appData, care);
  const b1 = buildB1(b1r.facts);
  const b2 = buildB2(b2FactsFor(appData, care, topVisible));
  const b3 = buildB3(b3FactsFor(appData));
  const b4 = buildB4(appData.user.name, b4FactsFor(appData, b1r));
  const b5facts = b5FactsFor(appData); const b5 = buildB5(b5facts);
  const b6facts = b6FactsFor(appData); const b6 = buildB6(b6facts);
  const b7facts = b7FactsFor(appData); const b7 = buildB7(b7facts);
  const b8facts = b8FactsFor(appData); const b8 = buildB8(b8facts);
  const closing = buildClosing({
    name: appData.user.name,
    ups: b1r.facts.ups.map((u) => u.cat),
    b5Present: b5facts.present,
    b6Applicable: b6facts.applicable,
    b7Applicable: b7facts.applicable,
    dc: b8facts.dc,
    dcInUps: b1r.facts.ups.map((u) => u.cat).includes(b8facts.dc),
  });

  const sections: ChapterThreeSentenceBankSection[] = [];
  const push = (out: { paras: Tagged[][] }) => { if (out.paras.length) sections.push({ heading: "", body: toBody(out.paras) }); };
  push(b1); push(b2); push(b3); push(b4); push(b5); push(b6); push(b7); push(b8);
  sections.push({ heading: "", body: toBody(closing.paras) });
  return sections;
}
