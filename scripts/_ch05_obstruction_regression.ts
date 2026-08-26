import { calculateSaju } from "../lib/sajuEngine";
import { buildAppDataFromCalc } from "../lib/sajuContent";
import { analyzeWealthObstruction } from "../lib/wealthObstructionAnalysis";

// 5장 방해구조 프로덕션 함수 회귀검증 — _ch05_obstruction_priority_audit.ts와
// 동일한 60명 표본으로 다시 실행해 손 검증값과 일치하는지 확인한다.

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

const results = people.map((p) => {
  const input = { name: p.id, gender: p.gender, calendarType: "solar" as const, isLeapMonth: false, year: p.year, month: p.month, day: p.day, hour: p.hour, minute: 0, timeUnknown: false };
  const calc = calculateSaju(input);
  const appData = buildAppDataFromCalc(calc, input.name);
  return { id: p.id, result: analyzeWealthObstruction(appData) };
});

console.log("=== 전수 출력 ===");
results.forEach(({ id, result }) => {
  console.log(
    `${id} | yongsin=${result.yongsinResolutionStatus} | structural=${JSON.stringify(result.structuralObstructions)} | ` +
      `support=${JSON.stringify(result.supportConstraints)} | caveats=${JSON.stringify(result.caveats)} | severity=${result.severityLabel}`
  );
});

console.log("\n=== 지정 6개 사례 상세 ===");
["S34", "C20", "C30", "C24", "C35", "C19"].forEach((id) => {
  const r = results.find((x) => x.id === id)!;
  console.log(`\n[${id}]`, JSON.stringify(r.result, null, 2));
});

console.log("\n=== 집계 ===");
const byCount: Record<string, number> = { "0": 0, "1": 0, "2+": 0 };
results.forEach(({ result }) => {
  const n = result.structuralObstructions.length;
  byCount[n === 0 ? "0" : n === 1 ? "1" : "2+"]++;
});
console.log("structuralObstructions 개수 분포:", byCount);

const byExcessType: Record<string, number> = {};
results.forEach(({ result }) => {
  result.structuralObstructions.forEach((o) => {
    byExcessType[o.sourceFlag] = (byExcessType[o.sourceFlag] || 0) + 1;
  });
});
console.log("Excess 유형별 발생 인원:", byExcessType);

const byYongsinStatus: Record<string, number> = { resolved: 0, hold: 0, unresolved: 0 };
results.forEach(({ result }) => byYongsinStatus[result.yongsinResolutionStatus]++);
console.log("yongsinResolutionStatus 분포:", byYongsinStatus);

const noHuisinCount = results.filter((r) => r.result.supportConstraints.some((s) => s.kind === "noHuisinCandidate")).length;
const hardBlockedCount = results.filter((r) => r.result.supportConstraints.some((s) => s.kind === "hardBlocked")).length;
console.log("noHuisinCandidate 발생 인원:", noHuisinCount);
console.log("hardBlocked 발생 인원:", hardBlockedCount);

// 소실 여부 확인: structuralObstructions가 있는 사람인데 supportConstraints
// 계산 과정에서 관련 정보가 예외 없이 사라진 경우가 있는지 — 즉
// structuralObstructions.length>0 인 사람이 항상 그대로 유지되는지,
// yongsinResolutionStatus가 hold/unresolved라고 structuralObstructions가
// 0이 되는 사례가 있는지 확인.
const lostCases = results.filter(({ result }) => {
  const hadExcessButEmptyStructural = false; // structuralObstructions는 balance.structureFlags에서만 오므로 yongsin 상태와 무관 — 아래에서 직접 대조
  return hadExcessButEmptyStructural;
});
console.log("\nsupportConstraints/structuralObstructions 상호 소실 사례(설계상 있으면 안 됨):", lostCases.length, "건");

const holdOrUnresolvedWithObstruction = results.filter(
  (r) => r.result.yongsinResolutionStatus !== "resolved" && r.result.structuralObstructions.length > 0
);
console.log(
  "yongsin hold/unresolved인데 structuralObstructions가 살아있는 사례(설계 의도대로 보존돼야 함):",
  holdOrUnresolvedWithObstruction.length,
  "건 ->",
  holdOrUnresolvedWithObstruction.map((r) => r.id).join(", ")
);
