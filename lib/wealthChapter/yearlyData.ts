// [5장 재물운 Production 이식] 확정된 scratch(scripts/_scratch_ch9_yearly_v4.ts)를 로직·문장 변경 없이 그대로 옮긴 파일.
// 이식 시 제거한 것: 데모/검증용 실행 코드(buildAppData·IntakeFormData·require.main 블록)와 그 import뿐이다.
// 제5장 ⑨ "앞으로 몇 해의 돈 흐름(연도별)" scratch v4 (Production 무수정, v1~v3와 별개 파일).
// v4 변경(문장만): 정재 문장 자연화, 총평은 그 사람의 실제 5개년 신호만 반영, 충·합 문장을 라벨(A·C·D·E·라벨 없음)별 생활 언어로 구별.
// 구조·계산 분기는 v2와 동일. v3는 고객 본문에서 판정표식 표현("유리한 조건", "타고난 조건", "부딪히는/맞물리는 신호")을 없애고
// 돈을 판단·관리할 때 체감할 수 있는 말로 바꾼다. 새 계산 없음 — 이미 있는 세운 값(간·지·지장간의 십성, 합·충·천간합, 연도 라벨·교차)만 읽는다.
//  - 재성 신호의 성격: 세운 천간·지지·지장간에 든 재성 십성이 정재(고정적으로 오가는 돈)인지 편재(그때그때 오가는 돈)인지, 그리고
//    천간·지지에 드러나 있는지(지장간에만 있으면 은근한 신호) → 해마다 "무엇을 살펴볼지"가 달라진다.
//  - 충 → "평소와 다른 상황이 생길 수 있는 해", 합·천간합 → "여러 사정이 함께 걸리기 쉬운 해"(사건 아님, 완화 어조).
//  - 판정 불가(용신 미확정)이면 라벨 없이 위 신호만, 현재 대운 값이 없으면 ⑨를 만들지 않는다(v1·v2와 동일).
import { AppData } from "../sajuContent";
import { analyzeWealthTiming, TimingLabel, CrossPattern } from "../wealthTimingAnalysis";
import { analyzeDaYunWealth, pickPastCurrentNext } from "../daYunWealthAnalysis";
import { buildSeunRange, NatalBranchInput, NatalStemInput, SeunKey } from "../seunAnalysis";

export interface NarrativeParagraph { text: string; sourceNote: string }
export interface Result { paragraphs: NarrativeParagraph[]; used: string; trace: string[] }
const b = (s: string) => `**${s}**`;
export const plainOf = (s: string) => s.replace(/\*\*/g, "");

type L = "A" | "B" | "C" | "D" | "E" | null;
type WT = "none" | "정재" | "편재" | "both";
interface Year { year: number; label: L; W: boolean; wt: WT; clear: boolean; X: boolean; T: boolean; cross?: CrossPattern; inCurrent: boolean; where: string }

const letter = (l: TimingLabel): L => (l.match(/\((.)\)/)?.[1] as L) ?? null;

function wealthDetail(sk: SeunKey): { W: boolean; wt: WT; clear: boolean; where: string } {
  const locs: { where: string; sip: string }[] = [];
  if (sk.seunGanCategory === "재성") locs.push({ where: "천간", sip: sk.seunGanSipseong });
  if (sk.seunJiCategory === "재성") locs.push({ where: "지지", sip: sk.seunJiSipseong });
  sk.hiddenStems.filter((h) => h.category === "재성").forEach((h) => locs.push({ where: "지장간", sip: h.sipseong }));
  if (!locs.length) return { W: false, wt: "none", clear: false, where: "" };
  const has정 = locs.some((l) => l.sip === "정재"), has편 = locs.some((l) => l.sip === "편재");
  const clear = locs.some((l) => l.where !== "지장간");
  return { W: true, wt: has정 && has편 ? "both" : has정 ? "정재" : "편재", clear, where: locs.map((l) => `${l.where}${l.sip}`).join("+") };
}

function yearFrom(sk: SeunKey, label: L, cross: CrossPattern | undefined, inCurrent: boolean): Year {
  const dn = inCurrent ? sk.dayunRelations : [];
  const X = sk.natalRelations.some((r) => r.type === "충") || dn.some((r) => r.type === "충");
  const T = sk.natalRelations.some((r) => r.type === "합") || dn.some((r) => r.type === "합") || sk.ganHeNatal.length > 0 || (inCurrent && sk.ganHeDayun.length > 0);
  const w = wealthDetail(sk);
  return { year: sk.year, label, W: w.W, wt: w.wt, clear: w.clear, where: w.where, X, T, cross: inCurrent ? cross : undefined, inCurrent };
}

export function collectYears(appData: AppData): { years: Year[]; baseline: L; applicable: boolean } | null {
  const timing = analyzeWealthTiming(appData);
  const dayGan = appData.user.pillars.day.hanja;
  const periods = analyzeDaYunWealth(dayGan, appData.fortuneTimelineNodes);
  const { current } = pickPastCurrentNext(periods);
  if (!current) return null;
  const endAge = current.endAge;
  if (timing.applicable) {
    if (!timing.currentDaYun || timing.representativeSeun.length === 0) return null;
    const baseline = letter(timing.currentDaYun.classification.label);
    const years = timing.representativeSeun.map((s) => yearFrom(s.seun, letter(s.classification.label), s.crossPattern, s.seun.year - appData.birthYear + 1 <= endAge));
    return { years, baseline, applicable: true };
  }
  const user = appData.user;
  const natalBranches: NatalBranchInput[] = [
    { stage: "year", zhi: user.pillars.branches.year.hanja }, { stage: "month", zhi: user.pillars.branches.month.hanja },
    { stage: "day", zhi: user.pillars.branches.day.hanja }, ...(user.pillars.branches.hour ? [{ stage: "hour" as const, zhi: user.pillars.branches.hour.hanja }] : []),
  ];
  const natalStems: NatalStemInput[] = [
    { stage: "year", gan: user.pillars.year.hanja }, { stage: "month", gan: user.pillars.month.hanja },
    { stage: "day", gan: user.pillars.day.hanja }, ...(user.pillars.hour ? [{ stage: "hour" as const, gan: user.pillars.hour.hanja }] : []),
  ];
  const thisYear = new Date().getFullYear();
  const seun = buildSeunRange(dayGan, thisYear, thisYear + 4, natalBranches, { ganZhi: current.ganZhi, ganSipseong: current.ganSipseong }, natalStems);
  return { years: seun.map((sk) => yearFrom(sk, null, undefined, sk.year - appData.birthYear + 1 <= endAge)), baseline: null, applicable: false };
}

// ── 연도 표기 ──
function groupYears(ys: number[]): number[][] {
  const g: number[][] = [];
  ys.forEach((y) => { const last = g[g.length - 1]; if (last && last[last.length - 1] === y - 1) last.push(y); else g.push([y]); });
  return g;
}
const fmtGroup = (g: number[]) => (g.length === 1 ? `${g[0]}년` : `${g[0]}~${g[g.length - 1]}년`);
function fmtYears(ys: number[]): string {
  const gs = groupYears(ys).map(fmtGroup);
  if (gs.length === 1) return gs[0];
  if (gs.length === 2) return `${gs[0]}과 ${gs[1]}`;
  return gs.join(", ");
}

// ── 문장 ──
// 라벨별로 살펴볼 것이 다르다: A=돈 판단을 편하게 내려도 되는 해 / D=바로 정하지 않고 한 번 더 확인 / C=새로 벌이기보다 있는 것 챙기기 / E=서둘러 바꾸지 않고 지켜보기.
// n = 같은 라벨 문장이 이 사람 본문에서 이미 몇 번 나왔는지(반복 방지용 짧은 변형).
function core(label: L, cross: CrossPattern | undefined, plural: boolean, n: number): string {
  const N = plural ? "시기" : "해", S = plural ? "이 몇 해" : "이 해";
  switch (label) {
    case "A":
      if (n > 0) return `${S}도 돈 판단은 비교적 부담 없이 내려도 됩니다.`;
      if (cross === "누적강화") return `요즘도 큰 무리 없이 가는 시기인데, ${plural ? "이 몇 해에는" : "이 해에는"} 돈과 관련한 판단을 평소보다 한결 편하게 내려도 됩니다. 미뤄 둔 결정이 있다면 이때 다뤄 보기 좋습니다.`;
      if (cross === "단발성기회") return `다른 해와 견주면 ${S}만 돈과 관련한 판단을 평소보다 편하게 내려도 됩니다. 미뤄 둔 결정이 있다면 이때 다뤄 보세요.`;
      if (cross === "부담대운속도움되는해") return `신경 쓸 일이 많은 시기 안에서도 ${S}만큼은 한숨 돌리며 돈 문제를 정리해 볼 만합니다.`;
      return `돈과 관련한 판단을 평소보다 조금 편하게 내려도 되는 ${N}입니다.`;
    case "B": // 세운 자체 판정에서는 나오지 않음(방어)
      return `돈 문제에 마음을 조금 더 써야 하는 ${N}입니다.`;
    case "C":
      return n === 0 ? `새로 벌이기보다 지금 가진 것을 차분히 챙기기에 어울리는 ${N}입니다.` : `${S}도 새로 늘리기보다 있는 것을 챙기는 쪽이 어울립니다.`;
    case "D":
      if (cross === "좋은흐름속일시적리스크") return `전반적으로 무난한 시기지만 ${S}만큼은 큰 결정을 바로 내리기보다 한 번 더 확인하고 정하는 편이 좋습니다.`;
      return n === 0 ? `큰 결정을 바로 내리기보다 한 번 더 확인하고 정하는 편이 좋은 ${N}입니다.` : `${S}도 큰 지출이나 계획 변경은 서두르지 않는 쪽이 낫습니다.`;
    case "E":
      return n === 0 ? `크게 바꾸기보다 지금 상태를 지켜보는 편이 마음 편한 ${N}입니다.` : `${S}도 서둘러 바꾸지 말고 지켜보는 쪽이 낫습니다.`;
    default:
      return "";
  }
}
// 재성 신호의 성격(정재=고정적으로 오가는 돈 / 편재=그때그때 오가는 돈 / 둘 다) — 살펴볼 대상이 달라진다.
const WSENT: Record<Exclude<WT, "none">, [string, string]> = {
  정재: ["매달 반복해서 나가거나 들어오는 돈을 한 번 점검해 보기 좋은 해입니다. 항목이 여러 개라면 하나씩 정리해 보는 편이 좋습니다.", "매달 반복되는 돈 항목을 다시 살펴보면 좋습니다."],
  편재: ["그때그때 들쭉날쭉하게 오가는 돈이 눈에 띄는 해라, 규모가 큰 지출은 여유를 두고 계획하는 편이 좋습니다.", "수시로 오가는 돈이 눈에 띄니, 큰 지출은 여유를 두고 계획하세요."],
  both: ["매달 반복되는 돈과 그때그때 오가는 돈이 함께 눈에 띄는 해라, 반복 항목과 수시 지출을 나눠서 살펴보면 좋습니다.", "두 종류의 돈이 함께 눈에 띄니, 반복 항목과 수시 지출을 나눠 보세요."],
};
const W_SUBTLE: [string, string] = ["돈이 오가는 일이 겉으로 크게 드러나지는 않지만 은근히 있는 해라, 놓치는 내역이 없는지 가끔 확인해 보면 좋습니다.", "돈 움직임이 은근한 해라, 내역을 가끔 확인해 두면 좋습니다."];
const QUIET: [string, string] = ["돈 이야기가 비교적 조용한 %N%입니다.", "%S%도 돈 이야기는 조용한 편입니다."];

// 충·합·천간합: 사건이 아니라 "이 해의 분위기" 정도로만(엔진은 존재 여부만 보장). 라벨별로 살펴볼 것을 다르게 쓴다.
type RG = "A" | "C" | "D" | "E" | "N";
const rgOf = (l: L): RG => (l === "A" ? "A" : l === "C" ? "C" : l === "D" || l === "B" ? "D" : l === "E" ? "E" : "N");
const REL: Record<RG, Record<string, [string, string]>> = {
  A: {
    X: ["상황이 평소와 달라질 수 있으니, 실행하기 전에 한 번만 다시 살펴보세요.", "실행 전에 한 번만 다시 살펴보면 됩니다."],
    T: ["관련된 사항이 여러 개라면, 결정 전에 함께 봐 두면 좋습니다.", "관련 사항을 함께 봐 두면 좋습니다."],
    XT: ["상황이 평소와 달라질 수 있고 챙길 사항도 여럿이라, 실행 전에 한 번 더 살펴보세요.", "실행 전에 한 번 더 살펴보세요."],
  },
  C: {
    X: ["챙기는 과정에서 예상과 다른 일이 생길 수 있으니, 정리할 범위를 넉넉하게 잡아 두면 좋습니다.", "정리 범위를 넉넉하게 잡아 두면 좋습니다."],
    T: ["챙길 항목이 서로 이어져 있을 수 있으니, 따로따로 보지 말고 묶어서 정리해 보세요.", "관련된 항목은 묶어서 정리해 보세요."],
    XT: ["예상과 다른 일이 생길 수 있고 항목도 서로 이어져 있을 수 있으니, 정리 범위를 넉넉히 잡고 묶어서 살펴보세요.", "넉넉히 잡고 묶어서 정리해 보세요."],
  },
  D: {
    X: ["확인해야 할 범위를 평소보다 넓게 잡고, 결정은 서두르지 않는 쪽이 낫습니다.", "확인 범위를 넓게 잡는 쪽이 낫습니다."],
    T: ["확인할 때 한 가지 기준만 보지 말고 여러 기준을 함께 대조해 보세요.", "여러 기준을 함께 대조해 보세요."],
    XT: ["확인 범위를 넓게 잡고 여러 기준을 함께 대조하면서, 결정은 서두르지 않는 쪽이 낫습니다.", "확인 범위를 넓게 잡고 결정은 서두르지 마세요."],
  },
  E: {
    X: ["지켜보는 중에 예상과 다른 일이 생기면 그때 방향을 다시 살펴보면 됩니다.", "그때그때 방향을 다시 살펴보면 됩니다."],
    T: ["지켜볼 때는 관련된 사항이 함께 움직이는지도 같이 살펴보세요.", "관련 사항도 같이 살펴보세요."],
    XT: ["지켜보는 중에 예상과 다른 일이 생길 수 있고 관련 사항도 함께 움직일 수 있으니, 방향을 그때그때 다시 살펴보세요.", "방향을 그때그때 다시 살펴보세요."],
  },
  N: {
    X: ["예상과 다른 일이 생길 수 있으니, 내역은 평소보다 자주 확인해 두면 좋습니다.", "내역을 평소보다 자주 확인해 두면 좋습니다."],
    T: ["서로 이어진 항목이 있을 수 있으니, 정리하다 보면 함께 확인해 두면 좋습니다.", "이어진 항목은 함께 확인해 두면 좋습니다."],
    XT: ["예상과 다른 일이 생길 수 있고 항목도 서로 이어져 있을 수 있으니, 내역은 자주, 관련된 것끼리는 함께 확인해 두면 좋습니다.", "내역은 자주, 관련된 것끼리는 함께 확인해 두세요."],
  },
};

export function generateYearlyV4(appData: AppData): Result {
  const data = collectYears(appData);
  if (!data) return { paragraphs: [], used: "현재 대운 값 없음 → 5개년 세운 없음 → ⑨ 생략", trace: [] };
  const { years, baseline, applicable } = data;
  const first = years[0].year, last = years[years.length - 1].year;

  const xN = years.filter((y) => y.X).length, tN = years.filter((y) => y.T).length;
  const xUniv = xN >= 4, tUniv = tN >= 4; // 거의 매년 있는 신호는 차이가 아니므로 본문에서 다루지 않는다
  const flags = years.map((y) => ({ ...y, Xm: y.X && !xUniv, Tm: y.T && !tUniv }));
  type F = (typeof flags)[number];
  const wKey = (f: F) => (f.W ? `${f.wt}${f.clear ? "" : "-은근"}` : "none");
  const primaryOf = (f: F) => `${f.label ?? "-"}|${f.cross ?? ""}|${wKey(f)}`;
  const secOf = (f: F) => `${f.Xm ? "X" : ""}${f.Tm ? "T" : ""}`;

  // ── 총평 ──
  const kinds = new Set(flags.map((f) => primaryOf(f) + "|" + secOf(f))).size;
  const sum: string[] = [];
  if (kinds > 1) {
    sum.push(`앞으로 5년(${first}~${last}년)은 모두 같은 해가 아닙니다.`);
    const groups: string[] = [];
    if (applicable) {
      if (years.some((y) => y.label === "A")) groups.push("돈 판단을 비교적 편하게 내려도 되는 해");
      if (years.some((y) => y.label === "D")) groups.push("한 번 더 확인하고 정하는 편이 좋은 해");
      if (years.some((y) => y.label === "C")) groups.push("새로 벌이기보다 있는 것을 챙기기 좋은 해");
      if (years.some((y) => y.label === "E")) groups.push("서두르지 않고 지켜보기 좋은 해");
    } else {
      const wN = years.filter((y) => y.W).length;
      if (wN > 0 && wN < years.length) groups.push("돈이 들어오고 나가는 일이 눈에 띄는 해", "조용한 해");
    }
    // 총평에는 이 사람의 실제 5개년에 존재하는 신호만 쓴다(라벨 구성·재성 신호 성격·충 연도 모두 5개년 값에서 직접 집계)
    if (groups.length === 1) sum.push(`이 5년에는 ${groups[0]}가 이어지되, 해마다 살필 내용이 조금씩 다릅니다.`);
    else if (groups.length > 1) sum.push(`이 5년에는 ${groups.join(", ")}가 섞여 있습니다.`);
    const wts = new Set(years.filter((y) => y.W).map((y) => y.wt));
    if (wts.size >= 2) sum.push("눈에 띄는 돈의 성격이 매달 반복되는 쪽인지 그때그때 오가는 쪽인지도 해마다 다릅니다.");
    if (!xUniv && xN > 0) sum.push(`예상과 다른 일이 생길 수 있는 해는 ${fmtYears(years.filter((y) => y.X).map((y) => y.year))}입니다.`);
  } else {
    sum.push(`앞으로 5년(${first}~${last}년)은 큰 차이 없이 비슷하게 이어집니다.`);
  }
  const paras: NarrativeParagraph[] = [{ text: sum.join(" "), sourceNote: "총평" }];
  const trace: string[] = ["총평 ← 5개년 라벨 구성과 재성 신호 성격(정재/편재)·충 연도 분포"];

  // ── 연도별 ──
  const ranges: F[][] = [];
  flags.forEach((f) => { const lr = ranges[ranges.length - 1]; if (lr && primaryOf(lr[0]) === primaryOf(f) && lr[lr.length - 1].year === f.year - 1) lr.push(f); else ranges.push([f]); });
  const coreCount: Record<string, number> = {}, wCount: Record<string, number> = {}, relUsed: Record<string, number> = {};
  ranges.forEach((r) => {
    const f = r[0], plural = r.length > 1;
    const head = plural ? `${r[0].year}~${r[r.length - 1].year}년` : `${f.year}년`;
    const N = plural ? "시기" : "해", S = plural ? "이 몇 해" : "이 해";
    const ck = f.label ?? "w"; const n = coreCount[ck] || 0; if (f.label || !f.W) coreCount[ck] = n + 1;
    const parts: string[] = [];
    const tr: string[] = [];
    if (f.label) { parts.push(core(f.label, f.cross, plural, n)); tr.push(`라벨 ${f.label}${f.cross ? "·" + f.cross : ""} → ${f.label === "A" ? "돈 판단 편하게" : f.label === "D" ? "한 번 더 확인" : f.label === "C" ? "있는 것 챙기기" : "지켜보기"} 문장`); }
    if (f.W) {
      const key = wKey(f); const c = wCount[key] || 0; wCount[key] = c + 1;
      const ws = f.clear ? WSENT[f.wt as Exclude<WT, "none">] : W_SUBTLE;
      parts.push(ws[c === 0 ? 0 : 1]);
      tr.push(`재성 신호(${r.map((y) => y.where).filter((v, i, a) => a.indexOf(v) === i).join(" / ")}) → ${f.clear ? (f.wt === "정재" ? "고정적으로 오가는 돈" : f.wt === "편재" ? "그때그때 오가는 돈" : "두 종류 돈") : "은근한 신호(소액 내역)"} 문장`);
    } else if (!f.label) {
      parts.push(QUIET[n === 0 ? 0 : 1].replace("%N%", N).replace("%S%", S));
      tr.push("재성 신호 없음 → 조용한 해 문장");
    }
    // 충·합 문장(같은 신호가 이 범위 안에서 해마다 다르면 해당 해만)
    const groups: { key: string; ys: F[] }[] = [];
    r.forEach((y) => { const k = secOf(y); if (!k) return; const g = groups.find((x) => x.key === k); if (g) g.ys.push(y); else groups.push({ key: k, ys: [y] }); });
    groups.forEach((g, gi) => {
      const rk = `${rgOf(f.label)}${g.key}`; const c = relUsed[rk] || 0; relUsed[rk] = c + 1;
      const clause = REL[rgOf(f.label)][g.key][c === 0 ? 0 : 1];
      parts.push(g.ys.length === r.length ? clause : `${gi === 0 ? "그중 " : ""}${fmtYears(g.ys.map((y) => y.year))}은 ${clause}`);
      tr.push(`${g.key.includes("X") ? "충" : ""}${g.key.includes("T") ? (g.key.includes("X") ? "+" : "") + "합·천간합" : ""}(${fmtYears(g.ys.map((y) => y.year))}) → ${g.key === "X" ? "평소와 다른 상황" : g.key === "T" ? "여러 사정이 함께 걸림" : "두 가지"} 문장`);
    });
    paras.push({ text: `${b(head)} ${parts.join(" ")}`, sourceNote: `${head}` });
    trace.push(`${head} ← ${tr.join(" ; ")}`);
  });

  const used = `${applicable ? `판정 가능(현재 대운 라벨 ${baseline})` : "판정 불가(라벨 없음, 세운 신호만)"} | ` + years.map((y) => `${y.year}:${y.label ?? "-"}/재성${y.W ? y.where : "×"}/충${y.X ? "O" : "×"}/합${y.T ? "O" : "×"}${y.cross ? "/" + y.cross : ""}${y.inCurrent ? "" : "/대운경계밖"}`).join(", ");
  return { paragraphs: paras, used, trace };
}
