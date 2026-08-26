import { calculateSaju } from "../lib/sajuEngine";
import { buildAppDataFromCalc } from "../lib/sajuContent";
import { analyzeWealthObstruction } from "../lib/wealthObstructionAnalysis";
import { generateWealthObstructionNarrative } from "../lib/wealthObstructionNarrative";

// 수동 승인 6명 중 12명 표본에 없는 4명(S34/C20/C30/C19)만 자동 생성해
// 수동 승인본과 나란히 비교한다. C24/C35는 12명 표본과 생년월일이 같아
// 위 회귀 스크립트 결과를 그대로 사용한다.

type Gender = "male" | "female";
interface P { id: string; year: number; month: number; day: number; hour: number; gender: Gender; }

const people: P[] = [
  { id: "S34", year: 1989, month: 5, day: 22, hour: 10, gender: "male" },
  { id: "C20", year: 1998, month: 2, day: 24, hour: 23, gender: "female" },
  { id: "C30", year: 2008, month: 12, day: 14, hour: 1, gender: "female" },
  { id: "C19", year: 1961, month: 7, day: 11, hour: 18, gender: "male" },
];

people.forEach((p) => {
  const input = { name: p.id, gender: p.gender, calendarType: "solar" as const, isLeapMonth: false, year: p.year, month: p.month, day: p.day, hour: p.hour, minute: 0, timeUnknown: false };
  const calc = calculateSaju(input);
  const appData = buildAppDataFromCalc(calc, input.name);

  const result = analyzeWealthObstruction(appData);
  const narrative = generateWealthObstructionNarrative(result);

  console.log("\n========== " + p.id + " ==========");
  console.log(
    "계산: structural=" + JSON.stringify(result.structuralObstructions.map((o) => o.sourceFlag)) +
    " | support=" + JSON.stringify(result.supportConstraints.map((s) => s.kind)) +
    " | caveats=" + JSON.stringify(result.caveats.map((c) => c.kind)) +
    " | yongsin=" + result.yongsinResolutionStatus
  );
  narrative.paragraphs.forEach((para) => console.log(para.text));
});
