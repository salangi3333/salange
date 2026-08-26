import { calculateSaju } from "../lib/sajuEngine";
import { buildAppDataFromCalc } from "../lib/sajuContent";
import { buildChapterFourKey } from "../lib/chapterFourInterpretation";
import { analyzeWealthObstruction } from "../lib/wealthObstructionAnalysis";
import { analyzeWealthTiming } from "../lib/wealthTimingAnalysis";
import { buildWealthChapterBridge } from "../lib/wealthChapterBridge";

type Gender = "male" | "female";
interface P { id: string; year: number; month: number; day: number; hour: number; gender: Gender; }

const existing17: P[] = [
  { id: "C6",  year: 1960, month: 12, day: 10, hour: 1,  gender: "female" },
  { id: "C16", year: 1970, month: 10, day: 28, hour: 3,  gender: "female" },
  { id: "C1",  year: 1955, month: 1,  day: 1,  hour: 0,  gender: "male" },
  { id: "C39", year: 1981, month: 3,  day: 19, hour: 22, gender: "male" },
  { id: "C19", year: 1961, month: 7,  day: 11, hour: 18, gender: "male" },
  { id: "C23", year: 1989, month: 11, day: 7,  hour: 14, gender: "male" },
  { id: "C35", year: 2013, month: 11, day: 23, hour: 2,  gender: "male" },
  { id: "C20", year: 1998, month: 2,  day: 24, hour: 23, gender: "female" },
  { id: "C29", year: 1971, month: 5,  day: 1,  hour: 20, gender: "male" },
  { id: "C30", year: 2008, month: 12, day: 14, hour: 1,  gender: "female" },
  { id: "C8",  year: 1974, month: 2,  day: 8,  hour: 11, gender: "female" },
  { id: "C24", year: 1966, month: 6,  day: 20, hour: 19, gender: "female" },
  { id: "C22", year: 2012, month: 4,  day: 22, hour: 9,  gender: "female" },
  { id: "C40", year: 1958, month: 10, day: 4,  hour: 3,  gender: "female" },
  { id: "C2",  year: 1992, month: 8,  day: 14, hour: 5,  gender: "female" },
  { id: "T7",  year: 1970, month: 10, day: 30, hour: 2,  gender: "male" },
  { id: "T12", year: 1955, month: 8,  day: 8,  hour: 9,  gender: "female" },
];
const freshSample: P[] = [];
for (let i = 0; i < 60; i++) {
  const year = 1950 + ((i * 23 + 7) % 75);
  const month = ((i * 11 + 2) % 12) + 1;
  const day = ((i * 17 + 3) % 28) + 1;
  const hour = (i * 13) % 24;
  const gender: Gender = i % 2 === 0 ? "male" : "female";
  freshSample.push({ id: "S" + i, year, month, day, hour, gender });
}
const approved60 = new Set([
  "C6","C16","C1","C39","C19","C23","C35","C20","C29","C30","C8","C24","C22","C40","C2","T7","T12",
  "S0","S1","S5","S6","S7","S8","S9","S12","S14","S15","S16","S18","S20","S21","S22","S23","S25","S27",
  "S28","S29","S31","S33","S34","S36","S37","S38","S39","S40","S41","S42","S44","S45","S46","S47","S51",
  "S52","S53","S54","S55","S56","S57","S58","S59",
]);
const people = [...existing17, ...freshSample].filter((p) => approved60.has(p.id));

interface Row {
  id: string;
  exposure: string;
  dominant: boolean;
  structural: string[];
  severity: string;
  support: string[];
  caveats: string[];
  yongsinStatus: string;
  currentLabel: string;
  attacker: string;
  b45: string | null;
  b56: string | null;
}

const rows: Row[] = [];

people.forEach((p) => {
  const input = { name: p.id, gender: p.gender, calendarType: "solar" as const, isLeapMonth: false, year: p.year, month: p.month, day: p.day, hour: p.hour, minute: 0, timeUnknown: false };
  const calc = calculateSaju(input);
  const appData = buildAppDataFromCalc(calc, input.name);

  const ch4Key = buildChapterFourKey(appData);
  const ch5 = analyzeWealthObstruction(appData);
  const ch6 = analyzeWealthTiming(appData);
  const bridge = buildWealthChapterBridge(ch4Key, ch5, ch6);

  rows.push({
    id: p.id,
    exposure: ch4Key.jaeseong.exposure,
    dominant: ch4Key.jaeseong.dominant,
    structural: ch5.structuralObstructions.map((o) => o.sourceFlag),
    severity: ch5.severityLabel,
    support: ch5.supportConstraints.map((s) => s.kind),
    caveats: ch5.caveats.map((c) => c.kind),
    yongsinStatus: ch5.yongsinResolutionStatus,
    currentLabel: ch6.applicable && ch6.currentDaYun ? ch6.currentDaYun.classification.label : (ch6.applicable ? "대운시작전" : "적용불가:" + ch6.notApplicableReason),
    attacker: ch6.applicable && ch6.currentDaYun ? (ch6.currentDaYun.period.ganCategory ?? "-") : "-",
    b45: bridge.chapter4To5 ?? null,
    b56: bridge.chapter5To6 ?? null,
  });
});

console.log("=== 전수 출력 ===");
rows.forEach((r) => {
  console.log(
    `${r.id} | exposure=${r.exposure} dominant=${r.dominant} | structural=${JSON.stringify(r.structural)} support=${JSON.stringify(r.support)} caveats=${JSON.stringify(r.caveats)} yongsin=${r.yongsinStatus} | 현재=${r.currentLabel} attacker=${r.attacker} | ` +
    `4→5=${r.b45 ? "YES" : "no"} 5→6=${r.b56 ? "YES" : "no"}`
  );
});

console.log("\n=== 집계 ===");
const b45Count = rows.filter((r) => r.b45).length;
const b56Count = rows.filter((r) => r.b56).length;
const noneCount = rows.filter((r) => !r.b45 && !r.b56).length;
console.log("4→5 bridge 발생:", b45Count, "/", rows.length);
console.log("5→6 bridge 발생:", b56Count, "/", rows.length);
console.log("bridge 전혀 없음:", noneCount, "/", rows.length);

console.log("\n=== 문장 반복 집계(완전 동일 텍스트) ===");
const sentenceCounts: Record<string, number> = {};
rows.forEach((r) => {
  if (r.b45) sentenceCounts["[4→5] " + r.b45] = (sentenceCounts["[4→5] " + r.b45] || 0) + 1;
  if (r.b56) sentenceCounts["[5→6] " + r.b56] = (sentenceCounts["[5→6] " + r.b56] || 0) + 1;
});
Object.entries(sentenceCounts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([sentence, count]) => console.log(count, "회:", sentence));

console.log("\n=== 골격 반복 집계(caveat 꼬리 제외한 기본형 기준) ===");
const skeletonCounts: Record<string, number> = {};
rows.forEach((r) => {
  if (r.b56) {
    const skeleton = r.b56.split(" 여기에 다른 조건도")[0];
    skeletonCounts["[5→6-골격] " + skeleton] = (skeletonCounts["[5→6-골격] " + skeleton] || 0) + 1;
  }
  if (r.b45) skeletonCounts["[4→5-골격] " + r.b45] = (skeletonCounts["[4→5-골격] " + r.b45] || 0) + 1;
});
Object.entries(skeletonCounts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([sentence, count]) => console.log(count, "회:", sentence));

console.log("\n=== attacker별 5→6(D/B) 실제 예문 2개씩 ===");
const byAttacker: Record<string, Row[]> = {};
rows.filter((r) => r.b56).forEach((r) => {
  const key = r.attacker;
  (byAttacker[key] ||= []).push(r);
});
Object.entries(byAttacker).forEach(([attacker, list]) => {
  console.log(`\n[attacker=${attacker}] ${list.length}명`);
  list.slice(0, 2).forEach((r) => console.log(" ", r.id, "caveats=" + JSON.stringify(r.caveats), "->", r.b56));
});

console.log("\n=== 같은 attacker, caveat 유무로 문장이 갈리는 실제 비교 ===");
Object.entries(byAttacker).forEach(([attacker, list]) => {
  const withCaveat = list.find((r) => r.caveats.length > 0);
  const withoutCaveat = list.find((r) => r.caveats.length === 0);
  if (withCaveat && withoutCaveat) {
    console.log(`\nattacker=${attacker}:`);
    console.log("  caveat 없음(" + withoutCaveat.id + "):", withoutCaveat.b56);
    console.log("  caveat 있음(" + withCaveat.id + "):", withCaveat.b56);
  }
});

console.log("\n=== 잠재적 미충족 패턴 탐색(수동 검토용) ===");
console.log("A) exposure=뚜렷 이지만 wealthExcess 아닌 다른 structural이 있는 경우:");
rows.filter((r) => r.exposure === "뚜렷" && r.structural.length > 0 && !r.structural.includes("wealthExcess")).forEach((r) =>
  console.log(" ", r.id, "structural=", r.structural)
);
console.log("\nB) exposure=미미/숨음 이면서 severity=뚜렷한 주방해 없음(대비 인상 가능?):");
rows.filter((r) => (r.exposure === "미미" || r.exposure === "숨음") && r.severity === "뚜렷한 주방해 없음").forEach((r) =>
  console.log(" ", r.id, "exposure=", r.exposure)
);
console.log("\nC) structural 있음 + 현재=기반형(C) (약한 불일치 가능성):");
rows.filter((r) => r.structural.length > 0 && r.currentLabel === "기반형(C)").forEach((r) => console.log(" ", r.id, "structural=", r.structural));
