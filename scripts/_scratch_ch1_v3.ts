// 1장 "타고난 운명" 새 기준(v3) — scratch 전용. 운영 파일은 수정하지 않는다.
// 모든 구체 문장은 { text, rule } 로 태그되어, 어떤 계산 조건에서 나오는지 자동 검사할 수 있다.
import { calculateSaju } from "../lib/sajuEngine";
import { buildAppDataFromCalc } from "../lib/sajuContent";
import { buildReportResult } from "../lib/reportMapper";
import { buildChapterOneDeepNarrative } from "../lib/chapterOneDeepNarrative";
import { buildInterpretationKey, SipseongCategory } from "../lib/chapterOneInterpretation";
import { GAN_PROFILE, ZHI_PROFILE } from "../lib/ganZhiProfiles";
import { analyzeDayMasterBalance } from "../lib/dayMasterBalanceAnalysis";
import { buildCheoneulGwiinOpening } from "../lib/chapterOneNarrative";

export interface Tagged { text: string; rule: string }
export interface Ch1V3 {
  name: string;
  hero: { ganHangul: string; ganHanja: string; image: string; quote: string; dayLabel: string; typeName: string };
  gan: { lines: Tagged[]; basis: string };
  outer: { lead: Tagged; lines: Tagged[]; basis: string };
  inner: { lead: Tagged; lines: Tagged[]; basis: string };
  habits: { lines: { label: string; t: Tagged }[]; basis: string };
  strength: { lines: Tagged[]; care: Tagged[]; basis: string };
  chart: {
    pillars: { stage: string; stem: string; stemSip: string; branch: string; branchSip: string; stemEl: string; branchEl: string }[];
    elements: { el: string; glyph: string; cat: SipseongCategory; pct: number; meaning: string }[];
    balanceLabel: string; strongestNote: string; noHour: boolean;
  };
  facts: { visible: Record<SipseongCategory, number>; hidden: Record<SipseongCategory, number>; topVisible: SipseongCategory[]; topHidden: SipseongCategory[]; easy: SipseongCategory[]; effortful: SipseongCategory[]; absent: SipseongCategory[]; hasRoot: boolean; present: SipseongCategory[]; dayPct: number; maxPct: number; minPct: number };
}

const CATS: SipseongCategory[] = ["비겁", "관성", "식상", "재성", "인성"];
const SHORT: Record<SipseongCategory, string> = { 비겁: "자기 주도", 식상: "표현", 재성: "실속", 관성: "책임감", 인성: "신중함" };
const STRONG: Record<SipseongCategory, string> = { 비겁: "스스로 결정하고 밀고 나가는 힘", 관성: "약속과 책임을 끝까지 지키는 힘", 식상: "생각을 바로 표현하는 힘", 재성: "기회를 결과로 바꾸는 힘", 인성: "상황을 이해하고 중심을 잡는 힘" };
const EL_SUFFIX: Record<string, string> = { wood: "목", fire: "화", earth: "토", metal: "금", water: "수" };
function politeEnd(t: string): string { if (/한다$/.test(t) || /하다$/.test(t)) return t.replace(/[한하]다$/, "합니다"); if (/있다$/.test(t)) return t.replace(/있다$/, "있습니다"); return t.replace(/다$/, "습니다"); }
const PLAIN: Record<SipseongCategory, string> = { 비겁: "자기 힘으로 밀고 나가는 힘", 식상: "생각을 표현하는 힘", 재성: "결과를 잡는 힘", 관성: "책임과 기준을 지키는 힘", 인성: "이해하고 받아들이는 힘" };
const MEANING: Record<SipseongCategory, string> = { 비겁: "자기 힘 · 경쟁 · 밀고 나가는 힘", 관성: "책임 · 규칙 · 사회적 압박", 인성: "배움 · 생각 · 받아들이는 힘", 식상: "표현 · 만들어내는 힘", 재성: "돈 · 현실 · 결과를 잡는 힘" };

// 겉으로 드러난 모습 — 해당 카테고리가 "겉에서 가장 많을 때"만 쓴다(rule: outer:top:<cat>)
const OUTER: Record<SipseongCategory, string[]> = {
  비겁: ["자기 몫은 분명히 챙깁니다.", "다른 사람 말을 충분히 들어도, 중요한 결정은 스스로 내려야 마음이 놓입니다."],
  식상: ["생각이 정리되면 눈치 보지 않고 먼저 말을 꺼냅니다.", "하고 싶은 말을 오래 담아두는 쪽이 아닙니다."],
  재성: ["말보다 결과로 증명하려 합니다.", "'일단 해보고 보여줄게'가 자연스럽게 나옵니다."],
  관성: ["약속과 마감을 어기는 걸 유독 못 견딥니다.", "남들은 대충 넘어가도 본인만은 그러지 못합니다."],
  인성: ["확신이 서기 전에는 '조금만 더 생각해볼게'라고 말합니다.", "누가 채근해도 납득이 되어야 움직입니다."],
};
// 안쪽에서 움직이는 힘 — 해당 카테고리가 "지장간에서 가장 많을 때"만 쓴다(rule: inner:top:<cat>)
const INNER: Record<SipseongCategory, string> = {
  비겁: "남 앞에서는 '하고 싶은 대로 해'라고 쿨하게 말하고도, 중요한 일은 결국 자기 뜻대로 결론을 냅니다.",
  식상: "그 자리에서는 웃어넘기고도, 나중에 하고 싶었던 말은 결국 꺼내고 맙니다.",
  재성: "'괜찮아, 신경 안 써'라고 말하면서도, 속으로는 손익을 이미 다 계산해 둡니다.",
  관성: "'나중에 해도 돼'라고 말해도, 맡은 일을 끝내기 전에는 머릿속에서 그 일이 떠나지 않습니다.",
  인성: "'그런가 보다' 하고 넘기는 척해도, 혼자 있을 때 몇 번이고 곱씹고서야 넘어갑니다.",
};
// 자주 나오는 모습 — 그 카테고리가 겉 또는 안에 "존재할 때"만(rule: habit:<cat>)
const HABIT: Record<SipseongCategory, string> = {
  비겁: "내 느낌이 오면 남들이 말려도 일단 해보는 편이고, 아니다 싶으면 다들 좋다고 해도 마음이 가지 않습니다.",
  관성: "갑자기 일이 터지면 제일 먼저 나서서 수습합니다. 정작 본인이 힘들 때는 기댈 곳을 몰라 혼자 끙끙댑니다.",
  식상: "속으로 삭이려 해도 말이나 표정으로 새어 나옵니다. 참으려 애쓸수록 더 티가 납니다.",
  재성: "기회가 보이면 계획보다 먼저 손에 쥘 수 있는 것부터 챙깁니다.",
  인성: "아무리 힘든 일이 있어도 마지막 순간에는 스스로를 다독여 중심을 잡아냅니다.",
};
// 쉽게 쓰는 힘(강점) / 의식해야 하는 힘(조심) / 완전 부재 — rule: easy:<cat>, effort:<cat>, absent:<cat>
const EASY: Record<SipseongCategory, string> = {
  비겁: "다툰 뒤에도 얼버무리지 않습니다. 납득이 안 되면 끝을 볼 때까지 다시 꺼냅니다.",
  식상: "생각한 것을 말과 행동으로 옮기는 일이 자연스럽습니다.",
  재성: "결과와 실익을 챙기는 일이 자연스럽습니다.",
  관성: "맡은 몫과 기준을 지키는 일이 자연스럽습니다.",
  인성: "상황을 이해하고 받아들이는 일이 자연스럽습니다.",
};
const EFFORT: Record<SipseongCategory, string> = {
  비겁: "스스로 결정하고 밀어붙이는 일은 자동으로 나오지 않습니다. 필요할 때 의식해서 꺼내야 합니다.",
  식상: "생각을 밖으로 표현하는 일은 자동으로 나오지 않습니다. 필요할 때 의식해서 꺼내야 합니다.",
  재성: "결과와 실익부터 따지는 일은 자동으로 나오지 않습니다. 필요할 때 의식해서 꺼내야 합니다.",
  관성: "기준과 책임을 앞세우는 일은 자동으로 나오지 않습니다. 필요할 때 의식해서 꺼내야 합니다.",
  인성: "충분히 이해한 뒤에 움직이는 일은 자동으로 나오지 않습니다. 필요할 때 의식해서 꺼내야 합니다.",
};
const ABSENT: Record<SipseongCategory, string> = {
  비겁: "앞장서서 내 몫부터 내세우는 건 낯선 방식입니다.",
  식상: "하고 싶은 말이 있어도 먼저 꺼내지 않고 넘어가는 경우가 많습니다.",
  재성: "눈에 보이는 결과를 서둘러 좇기보다 그 자리에 머무는 쪽이 편합니다.",
  관성: "정해진 틀에 맞추기보다 상황에 따라 유연하게 움직입니다.",
  인성: "충분히 재고 따지기보다 몸이 먼저 반응합니다.",
};

const ELEMENT_KO: Record<string, string> = { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" };
const GEN: Record<string, string> = { wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" };
const CTL: Record<string, string> = { wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" };
function catOfElement(day: string, el: string): SipseongCategory {
  if (el === day) return "비겁";
  if (GEN[day] === el) return "식상";
  if (CTL[day] === el) return "재성";
  if (CTL[el] === day) return "관성";
  return "인성";
}

export function buildCh1V3(name: string, input: Parameters<typeof calculateSaju>[0], gender: "male" | "female"): Ch1V3 {
  const app = buildAppDataFromCalc(calculateSaju(input), name);
  const report: any = buildReportResult(app, gender);
  const user: any = app.user;
  const deep = buildChapterOneDeepNarrative(app);
  const key = buildInterpretationKey(app);
  const dayGan: string = user.pillars.day.hanja;
  const dayEl: string = user.pillars.day.element;
  const gan = (GAN_PROFILE as any)[dayGan];
  const balance = analyzeDayMasterBalance(user);

  const vis: Record<SipseongCategory, number> = { 비겁: 0, 관성: 0, 식상: 0, 재성: 0, 인성: 0 };
  deep.visual.visible.forEach((v) => vis[v.category]++);
  const hid: Record<SipseongCategory, number> = { 비겁: 0, 관성: 0, 식상: 0, 재성: 0, 인성: 0 };
  deep.visual.hidden.forEach((h) => hid[h.category]++);
  const top = (m: Record<SipseongCategory, number>) => { const mx = Math.max(...CATS.map((c) => m[c])); return mx === 0 ? [] : CATS.filter((c) => m[c] === mx); };
  const topVisible = top(vis), topHidden = top(hid);
  const absent = CATS.filter((c) => vis[c] === 0 && hid[c] === 0);
  const hangul = user.pillars.day.hangul as string;
  const elLabel = ELEMENT_KO[dayEl];

  // ── 일간 ──
  const ganLines: Tagged[] = [
    { text: `${gan.coreTrait}입니다.`, rule: `gan:profile:${dayGan}` },
  ];
  const elCounts = key.categoryCounts; // 다른 글자 십성 개수(엔진)
  const balanceElements: any[] = report.elementBalance;
  const dayPct = balanceElements.find((e) => e.key === dayEl)?.value ?? 0;
  const maxPct = Math.max(...balanceElements.map((e) => e.value));
  const minPct = Math.min(...balanceElements.map((e) => e.value));
  if (dayPct === maxPct && maxPct !== minPct) ganLines.push({ text: `내 사주에서도 ${elLabel}가 가장 많아서, 이 성질이 겉으로 뚜렷하게 드러납니다.`, rule: `gan:dayElement:strongest:${elLabel}` });
  else if (dayPct === minPct && maxPct !== minPct) ganLines.push({ text: `내 사주에서는 ${elLabel}가 가장 적은 편이라, 그만큼 이 성질이 도드라져 보입니다.`, rule: `gan:dayElement:weakest:${elLabel}` });
  const dayZhi: string = user.pillars.branches.day.hanja;
  const zhiNote: string | undefined = (ZHI_PROFILE as any)[dayZhi]?.potentialNote;
  if (zhiNote) ganLines.push({ text: zhiNote, rule: `gan:zhi:${dayZhi}` });
  if (key.hasRoot) ganLines.push({ text: `일간의 뿌리가 지지에 내려 있어서, 흔들려도 결국 자기 자리로 돌아옵니다.`, rule: "gan:hasRoot" });
  const gwiin = buildCheoneulGwiinOpening(app);
  const ganBasis = `일간 ${hangul}${EL_SUFFIX[dayEl]}(${dayGan}${elLabel}) · ${report.dayMasterLabel}${gwiin ? " · 일지에 천을귀인" : ""}`;

  // ── 겉 ──
  const outerLines: Tagged[] = [];
  let outerLead: Tagged;
  if (topVisible.length === 1) {
    outerLead = { text: `처음 만난 사람이 가장 먼저 느끼는 건 ‘${SHORT[topVisible[0]]}’입니다.`, rule: `outer:top:${topVisible[0]}` };
    OUTER[topVisible[0]].forEach((t, i) => outerLines.push({ text: t, rule: `outer:topcat:${topVisible[0]}:${i}` }));
  } else if (topVisible.length > 1) {
    outerLead = { text: `겉으로는 ${topVisible.map((c) => `‘${SHORT[c]}’`).join("와 ")}이 함께 보입니다.`.replace("’와 ‘책임감’이", "’와 ‘책임감’이").replace(/’이 함께/, "’이 함께"), rule: `outer:tie:${topVisible.join("+")}` };
    topVisible.forEach((c) => outerLines.push({ text: OUTER[c][0], rule: `outer:topcat:${c}:0` }));
  } else {
    outerLead = { text: "겉으로는 특정한 색이 유독 두드러지지 않습니다.", rule: "outer:none" };
  }
  const outerBasis = `겉으로 드러난 글자: ${CATS.filter((c) => vis[c] > 0).map((c) => `${c} ${vis[c]}`).join(" · ") || "-"}`;

  // ── 속 ──  (hidden 최다 카테고리 중 "겉 top이 아닌 것"을 안쪽 힘으로 본다. 전부 겹치면 겉=속)
  const innerLines: Tagged[] = [];
  let innerLead: Tagged;
  const innerCats = topHidden.filter((c) => !topVisible.includes(c));
  if (topHidden.length === 0) {
    innerLead = { text: "안쪽에서 유독 크게 움직이는 힘은 두드러지지 않습니다.", rule: "inner:none" };
  } else if (innerCats.length === 0) {
    innerLead = { text: "겉과 속이 크게 다르지 않은 사람입니다.", rule: "inner:match" };
    innerLines.push({ text: INNER[topHidden[0]], rule: `inner:top:${topHidden[0]}` });
  } else {
    const shown = innerCats.slice(0, 3);
    innerLead = { text: `겉으로는 잘 안 보이지만, 안쪽에서는 ${shown.map((c) => `‘${SHORT[c]}’`).join(", ")}이 함께 움직입니다.`, rule: `inner:gap:${shown.join("+")}` };
    shown.forEach((c) => innerLines.push({ text: INNER[c], rule: `inner:top:${c}` }));
  }
  const innerBasis = `지장간(속) 십성: ${CATS.filter((c) => hid[c] > 0).map((c) => `${c} ${hid[c]}`).join(" · ") || "-"}`;

  // ── 자주 나오는 모습: 안쪽 힘에서 이미 말한 카테고리는 제외, 겉/속/일지에 존재하는 것만 최대 3개 ──
  const daySip: string = user.pillars.branches.day.sipseong;
  const dayBranchCat = (Object.entries({ 비견: "비겁", 겁재: "비겁", 식신: "식상", 상관: "식상", 편재: "재성", 정재: "재성", 편관: "관성", 정관: "관성", 편인: "인성", 정인: "인성" }) as [string, SipseongCategory][]).find(([k]) => k === daySip)?.[1];
  const presentAll = (c: SipseongCategory) => vis[c] + hid[c] > 0 || dayBranchCat === c;
  const habitCats = CATS.filter((c) => presentAll(c) && !innerCats.includes(c)).slice(0, 3);
  const habitLines = habitCats.map((c) => ({ label: SHORT[c], t: { text: HABIT[c], rule: `habit:${c}` } }));

  // ── 강점/조심 ── 강점은 겉·속 페이지의 설명을 반복하지 않고 이름만 한 줄로 모은다.
  const strongCats = Array.from(new Set<SipseongCategory>([...topVisible, ...deep.visual.easy])).filter((c) => !deep.visual.effortful.includes(c)).slice(0, 4);
  const strengthLines: Tagged[] = strongCats.map((c) => ({ text: STRONG[c], rule: `strong:${c}` }));
  const care: Tagged[] = [];
  deep.visual.effortful.slice(0, 2).forEach((c) => {
    if (absent.includes(c)) care.push({ text: ABSENT[c], rule: `absent:${c}` });
    else care.push({ text: EFFORT[c], rule: `effort:${c}` });
  });
  absent.filter((c) => !deep.visual.effortful.includes(c)).slice(0, 1).forEach((c) => care.push({ text: ABSENT[c], rule: `absent:${c}` }));
  const wq = String(gan.resultQuoteFragment || "");
  const careOnly = wq.includes(",") ? politeEnd(wq.split(",").slice(1).join(",").trim().replace(/^그러나\s*/, "")) : "";
  if (careOnly) care.push({ text: `${careOnly}.`, rule: `care:gan:${dayGan}` });

  // ── 명식/오행 ──
  const pil = ["hour", "day", "month", "year"].filter((st) => user.pillars[st] && user.pillars.branches[st]).map((st) => ({
    stage: { hour: "시", day: "일 (나)", month: "월", year: "년" }[st as "hour"],
    stem: user.pillars[st].hanja, stemSip: user.pillars[st].sipseong, stemEl: user.pillars[st].element,
    branch: user.pillars.branches[st].hanja, branchSip: user.pillars.branches[st].sipseong, branchEl: user.pillars.branches[st].element,
  }));
  const elements = ["wood", "fire", "earth", "metal", "water"].map((el) => ({ el, glyph: ELEMENT_KO[el], cat: catOfElement(dayEl, el), pct: balanceElements.find((e) => e.key === el)?.value ?? 0, meaning: "" }));
  elements.forEach((e) => (e.meaning = MEANING[e.cat]));
  elements.sort((a, b) => b.pct - a.pct);
  const strongestNote = `${ELEMENT_KO[report.elementStrongest]}(${catOfElement(dayEl, report.elementStrongest)})가 가장 강하고, ${ELEMENT_KO[report.elementWeakest]}(${catOfElement(dayEl, report.elementWeakest)})은 보완이 필요합니다.`;

  return {
    name,
    hero: { ganHangul: hangul, ganHanja: dayGan, image: gan.image, quote: wq, dayLabel: report.dayMasterLabel, typeName: report.summaryTitle },
    gan: { lines: ganLines, basis: ganBasis },
    outer: { lead: outerLead, lines: outerLines, basis: outerBasis },
    inner: { lead: innerLead, lines: innerLines, basis: innerBasis },
    habits: { lines: habitLines, basis: `그 밖에 나타나는 십성: ${habitCats.join(" · ") || "-"}` },
    strength: { lines: strengthLines, care, basis: `자연스럽게 쓰는 힘: ${deep.visual.easy.join("·") || "-"} / 의식이 필요한 힘: ${deep.visual.effortful.join("·") || "-"}` },
    chart: { pillars: pil as any, elements, balanceLabel: balance.balanceLabel, strongestNote, noHour: !(user.pillars.hour && user.pillars.branches.hour) },
    facts: { visible: vis, hidden: hid, topVisible, topHidden, easy: deep.visual.easy, effortful: deep.visual.effortful, absent, hasRoot: key.hasRoot, present: CATS.filter((c) => presentAll(c)), dayPct, maxPct, minPct },
  };
}
