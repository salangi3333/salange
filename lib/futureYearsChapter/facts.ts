// 7장 생성기 공통 계산값(facts) — 새 계산식 없음. 기존 엔진 값(buildTenYearNarrative·buildSeunKey·buildLifeFlowKey·analyzeCategoryStrength)만 조합.
// [재성 presence 수정] 원국 존재 판정 = 천간(일간 제외) + 지지 본기(일지 포함). 엔진 강도표의 `active`는 일지를 뺀 6글자 기준이라
// 일지에만 있는 힘(예: 홍지영의 재성)을 '없음'으로 오판했었다 → dayOnly(일지에만) / absent(어디에도 없음)로 구분한다.
import { AppData } from "../sajuContent";
import { buildTenYearNarrative } from "../tenYearNarrative";
import { buildLifeFlowKey } from "../lifeFlowInterpretation";
import { buildSeunKey, NatalBranchInput, NatalStemInput } from "../seunAnalysis";
import { analyzeCategoryStrength } from "../strengthAnalysis";

export type Cat = "비겁" | "식상" | "재성" | "관성" | "인성";
export type Rel = "same" | "feeds" | "supported" | "presses" | "pressed";
export type Stage = "year" | "month" | "day" | "hour";
export const CATS: Cat[] = ["비겁", "식상", "재성", "관성", "인성"];
export const GEN: Record<Cat, Cat> = { 비겁: "식상", 식상: "재성", 재성: "관성", 관성: "인성", 인성: "비겁" };
export const KILL: Record<Cat, Cat> = { 비겁: "재성", 재성: "인성", 인성: "식상", 식상: "관성", 관성: "비겁" };
export const SS_CAT: Record<string, Cat> = { 비견: "비겁", 겁재: "비겁", 식신: "식상", 상관: "식상", 편재: "재성", 정재: "재성", 편관: "관성", 정관: "관성", 편인: "인성", 정인: "인성" };
/** a(이 시기 계열)가 n(기준 계열)과 맺는 5종 관계 */
export const relOf = (a: Cat, n: Cat): Rel => (a === n ? "same" : GEN[n] === a ? "feeds" : KILL[a] === n ? "presses" : KILL[n] === a ? "pressed" : "supported");
/** n(기준)을 누르는 계열 */
export const presserOf = (n: Cat): Cat => (CATS.find((c) => KILL[c] === n) as Cat);

export type SigKind = "합" | "충" | "자형" | "천간합" | "전환";
export type SigTarget = Stage | "dayun";
export interface Sig { id: string; kind: SigKind; target: SigTarget; pair: string }
export type Presence = "active" | "dayOnly" | "absent";

export interface YearF {
  y: number; age: number; gan: string; ji: string;
  ganSs: string; jiSs: string; cat: Cat; jiCat: Cat;
  dayun: { ganZhi: string; ss: string; cat: Cat; startAge: number; endAge: number; startYear: number; endYear: number };
  dayunStarts: boolean; // 이 해가 그 대운의 첫 해
  isTransition: boolean; // 엔진의 대운 전환 표시(점수 +3)
  relD: Rel; relN: Rel; sameAsDayun: boolean;
  sigs: Sig[]; score: number;
  hidden: string[];
}
export interface RunF { c: Cat; ys: YearF[]; relN: Rel; rank: number; presence: Presence; fam: boolean; cls: "fam2" | "mid" | "low" | "dayOnly" | "absent" }
export interface DayunSeg { ganZhi: string; ss: string; cat: Cat; ys: number[]; startYear: number; endYear: number }
export interface Facts {
  name: string; birthYear: number;
  N: Cat; S: Cat | null; order: Cat[]; rank: Record<Cat, number>; presence: Record<Cat, Presence>; where: Record<Cat, string[]>; total: Record<string, number>;
  natalSs: { label: string; ss: string; cat: Cat; stage: Stage; kind: "gan" | "ji" }[];
  years: YearF[]; runs: RunF[]; segs: DayunSeg[];
  prevDayun: { ganZhi: string; ss: string; cat: Cat } | null;
  nextDayun: { ganZhi: string; ss: string; cat: Cat; startYear: number } | null;
  hasHour: boolean;
  natalGanji: { year: string; month: string; day: string; hour: string | null };
}

const STAGE_LBL: Record<Stage, string> = { year: "년", month: "월", day: "일", hour: "시" };

export function buildFacts(a: AppData, name: string): Facts {
  const u = a.user; const key = buildLifeFlowKey(a); const ten = buildTenYearNarrative(a);
  const st = analyzeCategoryStrength(u);
  const stages: Stage[] = ["year", "month", "day", "hour"];
  const hasHour = !!u.pillars.branches.hour;
  const natalB: NatalBranchInput[] = stages.filter((s) => (u.pillars.branches as any)[s]).map((s) => ({ stage: s, zhi: (u.pillars.branches as any)[s].hanja })) as any;
  const natalS: NatalStemInput[] = stages.filter((s) => (u.pillars as any)[s]).map((s) => ({ stage: s, gan: (u.pillars as any)[s].hanja })) as any;

  // 원국 존재(천간: 일간 제외 / 지지: 본기, 일지 포함)
  const where: Record<Cat, string[]> = { 비겁: [], 식상: [], 재성: [], 관성: [], 인성: [] };
  const natalSs: Facts["natalSs"] = [];
  stages.forEach((s) => {
    const p = (u.pillars as any)[s]; const b = (u.pillars.branches as any)[s];
    if (p && s !== "day" && SS_CAT[p.sipseong]) { where[SS_CAT[p.sipseong]].push(`${STAGE_LBL[s]}간`); natalSs.push({ label: `${STAGE_LBL[s]}간`, ss: p.sipseong, cat: SS_CAT[p.sipseong], stage: s, kind: "gan" }); }
    if (b && SS_CAT[b.sipseong]) { where[SS_CAT[b.sipseong]].push(`${STAGE_LBL[s]}지`); natalSs.push({ label: `${STAGE_LBL[s]}지`, ss: b.sipseong, cat: SS_CAT[b.sipseong], stage: s, kind: "ji" }); }
  });
  const activeCats = st.active.map((x) => x.category as Cat);
  const presence = {} as Record<Cat, Presence>;
  CATS.forEach((c) => { presence[c] = activeCats.includes(c) ? "active" : where[c].length ? "dayOnly" : "absent"; });
  const dayOnly = CATS.filter((c) => presence[c] === "dayOnly"); const absent = CATS.filter((c) => presence[c] === "absent");
  const order: Cat[] = [...activeCats, ...dayOnly, ...absent];
  const rank = {} as Record<Cat, number>; order.forEach((c, i) => (rank[c] = i + 1));
  const total: Record<string, number> = {}; st.active.forEach((x) => (total[x.category] = x.total));
  const N = ((key.natalAxis as Cat | null) ?? order[0]) as Cat;
  const S = (st.second && st.second.category !== N ? (st.second.category as Cat) : null);

  // 연도별
  const periodOf = (age: number) => key.periods.find((p) => age >= p.startAge && age <= p.endAge) ?? (age < key.periods[0].startAge ? key.periods[0] : key.periods[key.periods.length - 1]);
  const years: YearF[] = ten.items.map((it) => {
    const per = periodOf(it.age);
    const sk = buildSeunKey(u.pillars.day.hanja, it.year, natalB, { ganZhi: per.ganZhi, ganSipseong: per.ganSipseong }, natalS);
    const cat = sk.seunGanCategory as Cat;
    const dcat = per.ganCategory as Cat;
    const sigs: Sig[] = [];
    const seunJi = sk.seunJiHanja; const seunGan = sk.seunGanHanja;
    sk.natalRelations.forEach((r) => sigs.push({ id: `${r.type}:${r.stage}`, kind: r.type as SigKind, target: r.stage as Stage, pair: `${seunJi}${r.natalZhi}` }));
    sk.dayunRelations.forEach((r) => sigs.push({ id: `${r.type}:dayun`, kind: r.type as SigKind, target: "dayun", pair: `${seunJi}${r.dayunZhi}` }));
    sk.ganHeNatal.forEach((r) => sigs.push({ id: `천간합:${r.stage}`, kind: "천간합", target: r.stage as Stage, pair: `${seunGan}${r.natalGan}` }));
    sk.ganHeDayun.forEach((r) => sigs.push({ id: `천간합:dayun`, kind: "천간합", target: "dayun", pair: `${seunGan}${r.dayunGan}` }));
    sk.selfPunishNatal.forEach((r) => sigs.push({ id: `자형:${r.stage}`, kind: "자형", target: r.stage as Stage, pair: `${seunJi}${r.natalZhi}` }));
    sk.selfPunishDayun.forEach((r) => sigs.push({ id: `자형:dayun`, kind: "자형", target: "dayun", pair: `${seunJi}${r.dayunZhi}` }));
    const order2 = ["year", "month", "day", "hour", "dayun"];
    sigs.sort((p, q) => order2.indexOf(p.target) - order2.indexOf(q.target) || ["충", "자형", "합", "천간합", "전환"].indexOf(p.kind) - ["충", "자형", "합", "천간합", "전환"].indexOf(q.kind));
    const trans = !!it.isTransitionYear;
    if (trans) sigs.push({ id: "전환", kind: "전환", target: "dayun", pair: per.ganZhi });
    const startYear = a.birthYear + per.startAge - 1; const endYear = a.birthYear + per.endAge - 1;
    return {
      y: it.year, age: it.age, gan: seunGan, ji: seunJi, ganSs: sk.seunGanSipseong, jiSs: sk.seunJiSipseong, cat, jiCat: sk.seunJiCategory as Cat,
      dayun: { ganZhi: per.ganZhi, ss: per.ganSipseong, cat: dcat, startAge: per.startAge, endAge: per.endAge, startYear, endYear },
      dayunStarts: it.age === per.startAge, isTransition: trans,
      relD: relOf(cat, dcat), relN: relOf(cat, N), sameAsDayun: cat === dcat,
      sigs, score: it.rawScore ?? 0, hidden: sk.hiddenStems.map((h) => `${h.hiddenGan}${h.sipseong}`),
    };
  });

  // 런(같은 계열이 이어지는 시기)
  const runs: RunF[] = [];
  years.forEach((yf) => {
    const last = runs[runs.length - 1];
    if (last && last.c === yf.cat) last.ys.push(yf);
    else {
      const rk = rank[yf.cat]; const pr = presence[yf.cat];
      const cls: RunF["cls"] = pr === "dayOnly" ? "dayOnly" : pr === "absent" ? "absent" : rk <= 2 ? "fam2" : rk === 3 ? "mid" : "low";
      runs.push({ c: yf.cat, ys: [yf], relN: relOf(yf.cat, N), rank: rk, presence: pr, fam: cls === "fam2" || cls === "mid", cls });
    }
  });
  // 대운 구간
  const segs: DayunSeg[] = [];
  years.forEach((yf) => {
    const l = segs[segs.length - 1];
    if (l && l.ganZhi === yf.dayun.ganZhi) l.ys.push(yf.y);
    else segs.push({ ganZhi: yf.dayun.ganZhi, ss: yf.dayun.ss, cat: yf.dayun.cat, ys: [yf.y], startYear: yf.dayun.startYear, endYear: yf.dayun.endYear });
  });
  const idx0 = key.periods.findIndex((p) => p.ganZhi === years[0].dayun.ganZhi);
  const prev = idx0 > 0 ? key.periods[idx0 - 1] : null;
  const lastIdx = key.periods.findIndex((p) => p.ganZhi === years[years.length - 1].dayun.ganZhi);
  const nx = lastIdx >= 0 && lastIdx < key.periods.length - 1 ? key.periods[lastIdx + 1] : null;
  return {
    name, birthYear: a.birthYear, N, S, order, rank, presence, where, total, natalSs, years, runs, segs,
    prevDayun: prev ? { ganZhi: prev.ganZhi, ss: prev.ganSipseong, cat: prev.ganCategory as Cat } : null,
    nextDayun: nx ? { ganZhi: nx.ganZhi, ss: nx.ganSipseong, cat: nx.ganCategory as Cat, startYear: a.birthYear + nx.startAge - 1 } : null,
    hasHour,
    natalGanji: { year: `${u.pillars.year.hanja}${u.pillars.branches.year.hanja}`, month: `${u.pillars.month.hanja}${u.pillars.branches.month.hanja}`, day: `${u.pillars.day.hanja}${u.pillars.branches.day.hanja}`, hour: hasHour ? `${u.pillars.hour!.hanja}${u.pillars.branches.hour!.hanja}` : null },
  };
}
