import { calculateSaju } from "../lib/sajuEngine";
import { buildAppDataFromCalc } from "../lib/sajuContent";
import { analyzeLoveTimingSignals } from "../lib/loveTimingSignals";

/**
 * A/B/C/D 구분이 새 계산 없이 "이미 반환된 필드 조합"만으로 가능한지
 * 확인하는 검증 스크립트다. loveTimingSignals.ts는 전혀 수정하지 않고
 * 이미 있는 seunActiveYears / spousePalaceTiming.seun / compound.years /
 * spouseStarTiming.daYunActive만 읽어서 분류한다.
 *
 * A = 세운 배우자성만 있음(그 해 배우자궁 관계는 없음)
 * B = 세운 배우자궁 관계만 있음(그 해 배우자성은 비활성)
 * C = compound(같은 해에 배우자성 활성 + 배우자궁 관계 둘 다 있음)
 * D = C이면서 동시에 대운 배우자성도 활성인 경우
 */

type Gender = "male" | "female";
interface P { id: string; year: number; month: number; day: number; hour: number; gender: Gender; }

const people: P[] = [
  { id: "S34", year: 1989, month: 5, day: 22, hour: 10, gender: "male" },
  { id: "C20", year: 1998, month: 2, day: 24, hour: 23, gender: "female" },
  { id: "C30", year: 2008, month: 12, day: 14, hour: 1, gender: "female" },
  { id: "C24", year: 1966, month: 6, day: 20, hour: 19, gender: "female" },
  { id: "C35", year: 2013, month: 11, day: 23, hour: 2, gender: "male" },
  { id: "C19", year: 1961, month: 7, day: 11, hour: 18, gender: "male" },
  { id: "S8", year: 1991, month: 7, day: 28, hour: 8, gender: "male" },
  { id: "C39", year: 1981, month: 3, day: 19, hour: 22, gender: "male" },
];

const foundExamples: Record<"A" | "B" | "C" | "D", string[]> = { A: [], B: [], C: [], D: [] };

people.forEach((p) => {
  const input = { name: p.id, gender: p.gender, calendarType: "solar" as const, isLeapMonth: false, year: p.year, month: p.month, day: p.day, hour: p.hour, minute: 0, timeUnknown: false };
  const calc = calculateSaju(input);
  const appData = buildAppDataFromCalc(calc, input.name);
  const timing = analyzeLoveTimingSignals(appData, p.gender);

  const starYears = new Set(timing.spouseStarTiming.seunActiveYears);
  const palaceYearMap = new Map(timing.spousePalaceTiming.seun.map((s) => [s.year, s.relationTypes]));
  const compoundYears = new Set(timing.compound.years.map((y) => y.year));
  const daYunActive = timing.spouseStarTiming.daYunActive;

  const allYears = new Set([...starYears, ...palaceYearMap.keys()]);
  const A: number[] = [];
  const B: number[] = [];
  const C: number[] = [];
  const D: number[] = [];

  [...allYears].sort().forEach((year) => {
    const hasStar = starYears.has(year);
    const hasPalace = palaceYearMap.has(year);
    if (hasStar && hasPalace) {
      C.push(year);
      if (daYunActive) D.push(year);
    } else if (hasStar) {
      A.push(year);
    } else if (hasPalace) {
      B.push(year);
    }
  });

  console.log(`\n${p.id}(${p.gender}) daYunActive=${daYunActive}`);
  console.log(`  A(세운배우자성만): ${A.join(",") || "없음"}`);
  console.log(`  B(세운배우자궁만): ${B.join(",") || "없음"}`);
  console.log(`  C(compound):       ${C.join(",") || "없음"}`);
  console.log(`  D(C+대운활성):     ${D.join(",") || "없음"}`);

  // compound.years와 직접 대조 — 별도 재계산 없이 기존 필드만 썼는지 교차검증
  const compoundMismatch = C.length !== compoundYears.size || C.some((y) => !compoundYears.has(y));
  console.log(`  [교차검증] 직접분류 C == timing.compound.years ? ${!compoundMismatch}`);

  if (A.length) foundExamples.A.push(`${p.id}:${A.join(",")}`);
  if (B.length) foundExamples.B.push(`${p.id}:${B.join(",")}`);
  if (C.length) foundExamples.C.push(`${p.id}:${C.join(",")}`);
  if (D.length) foundExamples.D.push(`${p.id}:${D.join(",")}`);
});

console.log("\n\n=== 유형별 실제 사례 요약 ===");
(["A", "B", "C", "D"] as const).forEach((k) => {
  console.log(`${k}: ${foundExamples[k].length ? foundExamples[k].join(" / ") : "없음"}`);
});
