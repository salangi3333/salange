import { calculateSaju } from "../lib/sajuEngine";
import { buildAppDataFromCalc } from "../lib/sajuContent";
import { analyzeDayMasterBalance } from "../lib/dayMasterBalanceAnalysis";
import { analyzeYongsinCandidate } from "../lib/yongsinCandidateAnalysis";
import { analyzeHuisinCandidate } from "../lib/huisinCandidateAnalysis";
import { buildChapterFourKey } from "../lib/chapterFourInterpretation";

// 5장 방해구조 판정 체계 검증 전용(설계 검증 스크립트, 프로덕션 아님).
// _ch05_huisin_engine_regression.ts와 동일한 60명 표본을 그대로 재사용한다
// (새 표본 생성 안 함 — 이미 승인된 검증 풀).

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

const EXCESS_FLAGS = ["companionExcess", "outputExcess", "wealthExcess", "officerExcess", "resourceExcess"];

interface Row {
  id: string;
  balance: string;
  excessFlags: string[];
  monthRootConflict: boolean;
  yongsinOutcome: string;
  yongsinWinners: string[];
  yongsinCandidateWarnings: { cat: string; warnings: string[] }[];
  huisinApplicable: boolean;
  huisinNotApplicableReason?: string;
  huisinPairs: { forYongsin: string; category: string; hardBlocked: boolean; warnings: string[] }[];
  jaeseongVsInseongLead?: string;
  jaeseongVsInseongGapTier?: string;
}

const rows: Row[] = [];

people.forEach((p) => {
  const input = { name: p.id, gender: p.gender, calendarType: "solar" as const, isLeapMonth: false, year: p.year, month: p.month, day: p.day, hour: p.hour, minute: 0, timeUnknown: false };
  const calc = calculateSaju(input);
  const appData = buildAppDataFromCalc(calc, input.name);
  const user = appData.user;

  const balance = analyzeDayMasterBalance(user);
  const yongsin = analyzeYongsinCandidate(user);
  const huisin = analyzeHuisinCandidate(user);
  const ch4 = buildChapterFourKey(appData);

  const excessFlags = balance.structureFlags.filter((f) => EXCESS_FLAGS.includes(f));
  const monthRootConflict = balance.structureFlags.includes("monthRootConflict");

  const yongsinCandidateWarnings = yongsin.candidates
    .filter((c) => c.warnings.length > 0)
    .map((c) => ({ cat: c.category, warnings: c.warnings }));

  const huisinPairs = huisin.applicable
    ? huisin.pairs.map((pr) => ({ forYongsin: pr.forYongsin, category: pr.category, hardBlocked: pr.hardBlocked, warnings: pr.warnings }))
    : [];

  rows.push({
    id: p.id,
    balance: balance.balanceLabel,
    excessFlags,
    monthRootConflict,
    yongsinOutcome: yongsin.outcome,
    yongsinWinners: yongsin.winners,
    yongsinCandidateWarnings,
    huisinApplicable: huisin.applicable,
    huisinNotApplicableReason: huisin.notApplicableReason,
    huisinPairs,
    jaeseongVsInseongLead: ch4.jaeseongVsInseong.leadCategory,
    jaeseongVsInseongGapTier: ch4.jaeseongVsInseong.gapTier,
  });
});

console.log("=== 전수 출력 ===");
rows.forEach((r) => {
  console.log(
    `${r.id} | balance=${r.balance} | excess=${JSON.stringify(r.excessFlags)} | monthRootConflict=${r.monthRootConflict} | ` +
      `yongsin=${r.yongsinOutcome}${r.yongsinWinners.length ? "(" + r.yongsinWinners.join(",") + ")" : ""} | ` +
      `yongsinWarnings=${JSON.stringify(r.yongsinCandidateWarnings)} | ` +
      `huisin=${r.huisinApplicable ? JSON.stringify(r.huisinPairs) : "notApplicable:" + r.huisinNotApplicableReason} | ` +
      `jaeseongVsInseong=${r.jaeseongVsInseongLead}(${r.jaeseongVsInseongGapTier})`
  );
});

console.log("\n=== 패턴별 집계 ===");
const excess2plus = rows.filter((r) => r.excessFlags.length >= 2);
console.log("① Excess 2개 이상 동시 존재:", excess2plus.length, "명 ->", excess2plus.map((r) => r.id + ":" + r.excessFlags.join("+")).join(", "));

const excessAndHardBlocked = rows.filter((r) => r.excessFlags.length > 0 && r.huisinPairs.some((pr) => pr.hardBlocked));
console.log("② Excess + hardBlocked:", excessAndHardBlocked.length, "명 ->", excessAndHardBlocked.map((r) => r.id).join(", "));

const excessAndYongsinWarning = rows.filter((r) => r.excessFlags.length > 0 && r.yongsinCandidateWarnings.length > 0);
console.log("③ Excess + 용신 후보 warning:", excessAndYongsinWarning.length, "명 ->", excessAndYongsinWarning.map((r) => r.id).join(", "));

const excessAndHuisinWarning = rows.filter((r) => r.excessFlags.length > 0 && r.huisinPairs.some((pr) => pr.warnings.length > 0));
console.log("④ Excess + 희신 pair warning:", excessAndHuisinWarning.length, "명 ->", excessAndHuisinWarning.map((r) => r.id).join(", "));

const noExcessButCaveat = rows.filter(
  (r) =>
    r.excessFlags.length === 0 &&
    (r.monthRootConflict ||
      r.yongsinCandidateWarnings.length > 0 ||
      r.huisinPairs.some((pr) => pr.warnings.length > 0) ||
      (r.jaeseongVsInseongLead === "재성" && r.jaeseongVsInseongGapTier !== "비슷"))
);
console.log("⑤ Excess 없지만 caveat(monthRootConflict/warning/재극인) 있음:", noExcessButCaveat.length, "명 ->", noExcessButCaveat.map((r) => r.id).join(", "));

const noHuisinCandidateCases = rows.filter((r) => r.huisinApplicable === false && r.huisinNotApplicableReason === "noHuisinCandidate");
console.log("\nnoHuisinCandidate 사례:", noHuisinCandidateCases.length, "명 ->", noHuisinCandidateCases.map((r) => r.id).join(", "));

const hardBlockedCases = rows.filter((r) => r.huisinPairs.some((pr) => pr.hardBlocked));
console.log("hardBlocked 사례(전체):", hardBlockedCases.length, "명 ->", hardBlockedCases.map((r) => r.id).join(", "));

const bothNoHuisinAndHardBlockedPeople = rows.filter((r) => r.huisinApplicable && r.huisinPairs.length > 0 && r.huisinPairs.every((pr) => pr.hardBlocked));
console.log("모든 희신 pair가 hardBlocked인 사람:", bothNoHuisinAndHardBlockedPeople.length, "명 ->", bothNoHuisinAndHardBlockedPeople.map((r) => r.id).join(", "));
