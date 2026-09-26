// [6장 인생의 전환점 Production 이식] 확정된 scratch(scripts/_scratch_ch6_basis_v2.ts)를 로직·문장 변경 없이 그대로 옮긴 파일.
// 이식 시 바꾼 것: import 경로(../lib/x → ../x, ./_scratch_ch6_life_v7gen → ./life)뿐이다.
/**
 * 6장 ⑧ 「정리 근거」 scratch v2 — 홍지영 v4(동결) 문체를 계산 분기 전체로 일반화한 생성기.
 * 계산값·분기·항목 출력 조건은 v1과 동일(항목: 지나온 큰 시기 / 시기마다 달라진 방식 / 타고난 힘 / 지금의 시기 / 다음 시기 / 변화가 생기기 쉬운 영역 / 도움이 되는 방식).
 * 새 계산 없음. ①~⑦ 생성기의 meta와 기존 엔진 값만 사용. 본문에는 전문용어·한자·내부 코드명 없음(용어는 [명리 근거] 한 줄에서만).
 */
import { AppData } from "../sajuContent";
import { buildLifeFlowKey } from "../lifeFlowInterpretation";
import { SipseongCategory } from "../strengthAnalysis";
import { ATTACKS } from "../wealthTimingAnalysis";
import { analyzeDayMasterBalance } from "../dayMasterBalanceAnalysis";
import { analyzeYongsinCandidate } from "../yongsinCandidateAnalysis";
import { generateLife7V6 } from "./life";

type Cat = SipseongCategory;
export interface BasisItem { title: string; body: string; basis?: string; srcBody: string; srcBasis?: string }
export interface BasisResult { heading: string; intro: string; items: BasisItem[]; text: string; meta: any }

const succ = (c: Cat): Cat => ATTACKS[ATTACKS[ATTACKS[c]]];
type Rel = "same" | "feeds" | "supported" | "presses" | "pressed";
function relOf(a: Cat, natal: Cat): Rel {
  if (a === natal) return "same";
  if (a === succ(natal)) return "feeds";
  if (ATTACKS[a] === natal) return "presses";
  if (ATTACKS[natal] === a) return "pressed";
  return "supported";
}
const NUMK = ["", "한", "두", "세", "네", "다섯", "여섯", "일곱", "여덟", "아홉", "열"];
const ORDW = ["처음", "두 번째", "세 번째", "네 번째", "다섯 번째"];
const ORDN = ["첫 번째", "두 번째", "세 번째", "네 번째", "다섯 번째"];
const STEADY = new Set(["비견", "식신", "정재", "정관", "정인"]);

// 지난 시기 서술(…성향이 강했고/커졌고)
const STYLE: Record<Cat, string> = { 관성: "정해진 기준과 책임을 중요하게 보는 성향", 재성: "눈앞의 결과를 확인하며 움직이는 성향", 식상: "생각한 것을 직접 말하고 해 보며 판단하는 성향", 비겁: "스스로 기준을 정하고 밀고 가려는 성향", 인성: "충분히 이해하고 배운 뒤에 움직이는 성향" };
// 현재 시기의 판단 방식(…방식이 전보다 더 두드러질 수 있습니다)
const CUR_METHOD: Record<Cat, string> = { 식상: "생각한 것을 직접 말하고 해 보면서 판단하는", 비겁: "스스로 기준을 정하고 밀고 가는", 재성: "눈앞의 결과를 확인하며 움직이는", 관성: "정해진 기준과 책임을 먼저 챙기는", 인성: "충분히 이해하고 배운 뒤에 움직이는" };
// 타고난 사주의 성향(…려는 성향)
const NAT: Record<Cat, string> = { 비겁: "스스로 기준을 정하고 밀고 가려는 성향", 식상: "생각을 꺼내 직접 해 보려는 성향", 재성: "눈앞의 결과를 확인하며 움직이려는 성향", 관성: "맡은 책임과 기준을 지키려는 성향", 인성: "충분히 이해하고 배운 뒤에 움직이려는 성향" };
const NATSHORT: Record<Cat, string> = { 비겁: "스스로 정하는 성향", 식상: "생각을 꺼내 해 보는 성향", 재성: "결과를 확인하는 성향", 관성: "책임과 기준을 지키는 성향", 인성: "충분히 이해하고 움직이는 성향" };
const NATQ: Record<Cat, string> = { 비겁: "스스로 정하고 움직이려는 성향", 식상: "생각을 꺼내 해 보려는 성향", 재성: "결과를 확인하며 움직이려는 성향", 관성: "책임과 기준을 지키려는 성향", 인성: "충분히 이해하고 움직이려는 성향" };
const TIER_BASE: Record<string, string> = { A: "다른 성향보다 뚜렷하게 더 크게 있", B: "다른 성향보다 조금 더 크게 있", C: "다른 성향과 큰 차이 없이 근소하게 앞서 있" };
// 지금 운
const CUR_DESIRE: Record<Cat, string> = { 식상: "생각을 밖으로 꺼내 직접 해 보려는 성향", 비겁: "스스로 정하고 밀고 가려는 성향", 재성: "눈앞의 결과를 확인하며 움직이려는 성향", 관성: "맡은 일과 정해진 기준을 먼저 지키려는 성향", 인성: "배우고 충분히 이해한 다음에 움직이려는 성향" };
const BAL_CLAUSE: Record<string, string> = {
  neutral: "일이 몰릴 때 버티는 정도는 힘이 한쪽으로 크게 기울지 않은 편이라 상황에 따라 달라질 수 있습니다.",
  slightlyStrong: "사주 전체의 힘이 조금 넉넉한 편이라, 일이 한꺼번에 몰려도 비교적 잘 받아 낼 수 있다고 봤습니다.",
  clearlyStrong: "사주 전체의 힘이 넉넉한 편이라, 일이 한꺼번에 몰려도 여유 있게 받아 낼 수 있다고 봤습니다.",
  slightlyWeak: "사주 전체의 힘이 조금 모자란 편이라, 일이 한꺼번에 몰리면 혼자 다 감당하기 어려울 수 있다고 봤습니다.",
  clearlyWeak: "사주 전체의 힘이 많이 모자란 편이라, 일이 한꺼번에 몰리면 여러 가지를 동시에 감당하기 어렵다고 봤습니다.",
};
// feeds(타고난 성향 → 이 운의 성향) 짝별 연결 표현
const FEED_LINK: Record<Cat, string> = { 비겁: "생각을 꺼내 직접 해 보는 모습으로 이어진", 식상: "해 본 결과를 확인하는 모습으로 이어진", 재성: "확인한 것을 기준과 책임으로 지키는 모습으로 이어진", 관성: "배우고 충분히 이해하는 모습으로 이어진", 인성: "스스로 정하고 밀고 가는 모습으로 이어진" };
// 다음 운
const CUR_NOW: Record<Cat, string> = { 식상: "해 보면서 고치는", 비겁: "내가 먼저 정하고 시작하는", 재성: "눈앞의 결과를 확인해 가며 시작하는", 관성: "정해진 절차를 확인하고 나서 시작하는", 인성: "이해가 된 다음에 시작하는" };
const NEXT_DESIRE: Record<Cat, string> = { 비겁: "무엇을 할지 스스로 정하고 밀고 가려는", 식상: "생각을 밖으로 꺼내 직접 해 보려는", 재성: "눈앞의 결과를 하나씩 확인하며 움직이려는", 관성: "정해진 기준과 책임을 지키며 움직이려는", 인성: "배우고 충분히 이해한 다음에 움직이려는" };
const NEXT_SHORT: Record<Cat, string> = { 비겁: "스스로 정하는", 식상: "직접 해 보는", 재성: "결과를 확인하며 움직이는", 관성: "책임과 기준을 지키는", 인성: "충분히 이해하고 움직이는" };
// 합·충 영역
const DOMAIN: Record<string, string> = { year: "집안이나 오래 알아 온 관계", month: "일이나 사회생활처럼 바깥에서 하는 일", day: "나 자신이나 가까운 사람과의 생활", hour: "앞으로의 계획" };
const STAGE_KO: Record<string, string> = { year: "년지", month: "월지", day: "일지", hour: "시지" };
// 도움이 되는 방식
const HELP: Record<Cat, string> = { 비겁: "믿을 만한 사람과 역할을 나눠 맡는 것", 식상: "생각을 밖으로 꺼내 직접 만들어 보는 것", 재성: "눈앞의 결과를 하나씩 확인해 가는 것", 관성: "해야 할 일과 기한을 미리 정해 두는 것", 인성: "잘 아는 사람에게 묻고 배운 다음에 움직이는 것" };
const REL_SHORT: Record<Rel, string> = { same: "같은 계열", feeds: "상생", supported: "상생(지금 힘이 도움)", presses: "상극(지금 힘이 누름)", pressed: "상극(타고난 힘이 누름)" };
const REL_TAIL: Record<Rel, string> = { same: "같은 계열", feeds: "상생 관계", supported: "상생 관계(다음 힘이 도움)", presses: "상극 관계(다음 힘이 누름)", pressed: "상극 관계(타고난 힘이 누름)" };

const relFact = (r: Rel, q: string, N: Cat): string => ({
  same: "이 성향은 타고난 성향과 같은 종류입니다.",
  feeds: N === "비겁" ? `이 성향은 타고난 ${q}이 겉으로 드러난 모습에 가깝습니다.` : `이 성향은 타고난 ${q}에서 ${FEED_LINK[N]} 성향입니다.`,
  supported: `이 성향은 타고난 ${q}을 도와주는 관계입니다.`,
  presses: `이 성향은 타고난 ${q}과 어긋나기 쉬운 관계입니다.`,
  pressed: `타고난 ${q}이 이 운의 성향을 다스리는 관계입니다.`,
} as Record<Rel, string>)[r];

export function generateBasisV2(appData: AppData): BasisResult {
  const key = buildLifeFlowKey(appData);
  const M = generateLife7V6(appData).meta;
  const { periods, relations } = key;
  const N: Cat | null = M.N, S: Cat | null = M.S, C: Cat | null = M.C, X: Cat | null = M.X;
  const hasCur: boolean = M.hasCur; const P: number = M.P; const K = P + (hasCur ? 1 : 0);
  const pastCats: Cat[] = (M.pastCats as (Cat | null)[]).filter((c): c is Cat => !!c);
  const tier = key.natalAxisTier as string;
  const bal = analyzeDayMasterBalance(appData.user); const yo = analyzeYongsinCandidate(appData.user);
  const items: BasisItem[] = [];
  const T = periods.length;

  // ① 지나온 큰 시기
  if (K >= 1) {
    const nPast = periods.filter((p) => p.state === "past").length, nFut = periods.filter((p) => p.state === "future").length;
    let body: string;
    if (hasCur && K === 1) body = "지금은 첫 번째 시기이고, 아직 앞선 큰 시기는 없습니다.";
    else if (hasCur) body = `지금까지 큰 시기를 ${NUMK[K]} 번 지나왔고, 지금은 ${ORDN[P]} 시기입니다. ${NUMK[K]} 시기는 하나씩 성격이 뚜렷하게 달랐습니다.`;
    else body = `지금까지 큰 시기를 ${NUMK[K]} 번 지나왔고, 계산되는 운은 모두 지났습니다.${K >= 2 ? ` ${NUMK[K]} 시기는 하나씩 성격이 뚜렷하게 달랐습니다.` : ""}`;
    items.push({ title: "지나온 큰 시기", body, basis: hasCur ? `대운 ${T}개 → 지금까지 큰 시기 ${K}번, 지금 ${P + 1}번째` : `대운 ${T}개 → 지금까지 큰 시기 ${K}번, 모두 지남`, srcBody: `시기 수 K=${K}, 현재 위치 ${hasCur ? P + 1 : "없음"}, 현재 대운 ${hasCur ? "있음" : "없음"}`, srcBasis: `대운 ${T}개(지난 ${nPast}·지금 ${hasCur ? 1 : 0}·남은 ${nFut})` });
  }
  // ② 시기마다 달라진 방식
  if (K >= 2) {
    const seq = pastCats.length ? pastCats : [];
    const parts = seq.map((c, i) => `${ORDW[i]} 시기에는 ${STYLE[c]}이 ${i === 0 ? "강했" : "커졌"}`);
    const chunks: string[] = []; for (let i = 0; i < parts.length; i += 2) { const g = parts.slice(i, i + 2); chunks.push(g.map((p, j) => (j < g.length - 1 ? `${p}고` : `${p}습니다.`)).join(", ")); }
    let sent1 = chunks.join(" ");
    if (hasCur && C) sent1 += ` 지금은 ${CUR_METHOD[C]} 방식이 전보다 더 두드러질 수 있습니다.`;
    items.push({ title: "시기마다 달라진 방식", body: sent1, basis: `${[...seq, ...(hasCur && C ? [C] : [])].map((c, i, a) => `${c}${hasCur && i === a.length - 1 ? "(지금)" : ""}`).join(" → ")}`, srcBody: `지난 국면 ${seq.join("→") || "없음"}${hasCur ? " + 현재 " + C : ""}`, srcBasis: "시기별 국면 종류 순서" });
  }
  // ③ 타고난 힘
  if (N) {
    const past = periods.filter((p) => p.state === "past"); const n = past.length, m = past.filter((p) => p.ganCategory === N).length;
    const hasS = !!(S && S !== N);
    const body = `타고난 사주에는 ${NAT[N]}이 ${TIER_BASE[tier] ?? "앞서 있"}${hasS ? `고, 그다음으로 ${NAT[S!]}이 함께 있습니다.` : "습니다."}`;
    items.push({ title: "타고난 힘", body, basis: `타고난 중심: ${N}${hasS ? ` · 보조: ${S}` : ""}${n > 0 ? ` · 지난 대운 ${n}개 중 같은 계열 ${m}개` : ""}`, srcBody: `중심축 ${N}, 강도 ${tier}, 보조축 ${S ?? "없음"}, 지난 대운 ${n}개 중 일치 ${m}개`, srcBasis: "중심축·보조축·지난 대운 일치 수" });
  }
  // ④ 지금의 시기
  if (hasCur && C) {
    const rc: Rel | null = N ? relOf(C, N) : null;
    const relClause = (r: Rel): string => relFact(r, `"${NATQ[N!]}"`, N!);
    const s2 = rc ? relClause(rc) : "";
    const balOn = bal.balance !== "hold";
    const body = `지금 지나는 10년 운은 ${CUR_DESIRE[C]}이 강해지는 때입니다.${s2 ? " " + s2 : ""}`;
    const basis = [`현재 대운: ${M.curSS}`, ...(N ? [`타고난 중심: ${N}`, `관계: ${REL_SHORT[rc!]}`] : []), ...(balOn ? [`힘의 세기: ${bal.balance === "neutral" ? "중화" : bal.balanceLabel}`] : [])].join(" · ");
    items.push({ title: "지금의 시기", body, basis, srcBody: `현재 대운 ${M.curSS}(${C}), 타고난 중심 ${N ?? "없음"}과의 관계 ${rc ?? "-"}, 강약 ${bal.balance}`, srcBasis: "현재 십성·중심축·관계·강약" });
  }
  // ⑤ 다음 시기
  if (hasCur && C && X) {
    const rn: Rel | null = N ? relOf(X, N) : null;
    let body: string; let s2 = "";
    if (X === C) {
      body = `${M.year}년 무렵 새 10년 운이 시작되지만, ${CUR_DESIRE[C]}이 계속 강한 운입니다.`;
      if (M.curSS !== M.nxtSS) s2 = " 같은 성향 안에서도 세부 성격은 조금 달라집니다.";
    } else {
      body = `${M.year}년 무렵 새 10년 운이 시작되면, 지금은 ${CUR_NOW[C]} 성향이 강하지만 그때부터는 ${NEXT_DESIRE[X]} 성향이 강해지는 운입니다.`;
      if (N && rn) s2 = " " + relFact(rn, `"${NATQ[N]}"`, N);
    }
    const basis = [`다음 대운: ${M.nxtSS}`, `${M.year}년 무렵`, ...(N && rn ? [`타고난 중심(${N})과 ${REL_TAIL[rn]}`] : []), ...(X === C ? ["지금 대운과 같은 계열"] : [])].join(" · ");
    items.push({ title: "다음 시기", body: body + s2, basis, srcBody: `현재 ${C} → 다음 ${X}(${M.nxtSS}), 시작 ${M.year}년, 다음↔타고난 중심 관계 ${rn ?? "-"}${X === C ? `, 세부 ${M.curSS}→${M.nxtSS}` : ""}`, srcBasis: "다음 십성·시작 연도·관계" });
  }
  // ⑥ 변화가 생기기 쉬운 영역
  {
    const fmt = (rels: any[]) => ({ ch: [...new Set(rels.filter((r) => r.type === "충").map((r) => r.natalStage as string))], he: [...new Set(rels.filter((r) => r.type === "합").map((r) => r.natalStage as string))] });
    const cur = hasCur ? fmt(relations.current) : { ch: [] as string[], he: [] as string[] };
    const nxt = X ? fmt(relations.next) : { ch: [] as string[], he: [] as string[] };
    const sent = (when: string, v: { ch: string[]; he: string[] }): string => {
      const us: string[] = [];
      if (v.ch.length) us.push(`${v.ch.map((st) => DOMAIN[st]).join(", ")}에서 변화가 생기기 쉬운 조합`);
      if (v.he.length) us.push(`${v.he.map((st) => DOMAIN[st]).join(", ")}에서 새로 맺어지는 관계나 일이 생기기 쉬운 조합`);
      return us.map((u, i) => (i === 0 ? `${when} ${u}도 함께 있습니다.` : `또 ${u}도 함께 있습니다.`)).join(" ");
    };
    const s1 = sent("지금 운에는", cur), s2 = sent("다음 운이 시작될 무렵에는", nxt);
    if (s1 || s2) {
      const bl = (label: string, v: { ch: string[]; he: string[] }) => [...v.ch.map((s) => `${label} 지지 ↔ 원국 ${STAGE_KO[s]}: 충`), ...v.he.map((s) => `${label} 지지 ↔ 원국 ${STAGE_KO[s]}: 합`)];
      items.push({ title: "변화가 생기기 쉬운 영역", body: [s1, s2].filter(Boolean).join(" "), basis: [...bl("지금 대운", cur), ...bl("다음 대운", nxt)].join(" · "), srcBody: `지금 대운 합충 ${JSON.stringify(cur)} / 다음 대운 합충 ${JSON.stringify(nxt)}`, srcBasis: "relations.current / relations.next" });
    }
  }
  // ⑦ 도움이 되는 방식
  if (X && yo.applicable && (yo.outcome === "single" || yo.outcome === "multiple") && yo.winners.length) {
    const w = yo.winners as Cat[]; const inn = w.includes(X);
    const s1 = w.length === 1 ? `사주 전체로 보면 특히 도움이 되는 것은 ${HELP[w[0]]}입니다.` : `사주 전체로 보면 특히 도움이 되는 것은 ${w.map((c) => HELP[c]).join(", 또는 ")}입니다.`;
    const s2 = `다음 운에서 강해지는 성향은 여기에 ${inn ? "들어 있습니다" : "들어 있지 않습니다"}.`;
    items.push({ title: "도움이 되는 방식", body: `${s1} ${s2}`, basis: `도움이 되는 힘: ${w.join(" · ")} · 다음 대운(${X})은 ${inn ? "포함됨" : "포함되지 않음"}`, srcBody: `용신 ${yo.outcome} winners ${w.join("/")}, 다음 ${X}`, srcBasis: "용신 winners·다음 종류" });
  }

  const intro = "앞의 풀이를 다시 설명하는 곳이 아닙니다. 앞에서 그렇게 읽은 이유가 어떤 계산에서 나왔는지, 짧게 정리했습니다.";
  const lines: string[] = ["⑧ 정리 근거", intro];
  for (const it of items) { lines.push("", it.title, it.body); if (it.basis) lines.push(`[명리 근거] ${it.basis}`); }
  return { heading: "⑧ 정리 근거", intro, items, text: lines.join("\n"), meta: M };
}
