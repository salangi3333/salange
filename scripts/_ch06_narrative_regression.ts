import { calculateSaju } from "../lib/sajuEngine";
import { buildAppDataFromCalc } from "../lib/sajuContent";
import { analyzeWealthTiming } from "../lib/wealthTimingAnalysis";
import { generateWealthTimingNarrative } from "../lib/wealthTimingNarrative";

type Gender = "male" | "female";
interface P { id: string; year: number; month: number; day: number; hour: number; gender: Gender; }

const people: P[] = [
  { id: "C16", year: 1970, month: 10, day: 28, hour: 3, gender: "female" },
  { id: "C39", year: 1981, month: 3, day: 19, hour: 22, gender: "male" },
  { id: "C23", year: 1989, month: 11, day: 7, hour: 14, gender: "male" },
  { id: "C35", year: 2013, month: 11, day: 23, hour: 2, gender: "male" },
  { id: "C8", year: 1974, month: 2, day: 8, hour: 11, gender: "female" },
  { id: "C24", year: 1966, month: 6, day: 20, hour: 19, gender: "female" },
  { id: "S0", year: 1957, month: 3, day: 4, hour: 0, gender: "male" },
  { id: "S8", year: 1991, month: 7, day: 28, hour: 8, gender: "male" },
  { id: "S33", year: 1966, month: 6, day: 5, hour: 21, gender: "female" },
  { id: "S47", year: 1988, month: 4, day: 19, hour: 11, gender: "female" },
  { id: "S57", year: 1993, month: 6, day: 21, hour: 21, gender: "female" },
  { id: "T12", year: 1955, month: 8, day: 8, hour: 9, gender: "female" },
];

people.forEach((p) => {
  const input = { name: p.id, gender: p.gender, calendarType: "solar" as const, isLeapMonth: false, year: p.year, month: p.month, day: p.day, hour: p.hour, minute: 0, timeUnknown: false };
  const calc = calculateSaju(input);
  const appData = buildAppDataFromCalc(calc, input.name);

  const timing = analyzeWealthTiming(appData);
  const narrative = generateWealthTimingNarrative(appData, timing);

  console.log("\n========== " + p.id + " ==========");
  if (!timing.applicable) {
    console.log("계산 요약: applicable=false,", timing.notApplicableReason);
    console.log("본문:", narrative.paragraphs.map((x) => x.text).join(" / "));
    return;
  }

  console.log(
    "계산 요약: 현재=" + (timing.currentDaYun?.classification.label ?? "-") +
      " | 다음=" + (timing.nextDaYun ? timing.nextDaYun.classification.label : "없음") +
      " | 대표세운=" + timing.representativeSeun.map((s) => s.seun.year + ":" + s.classification.label + (s.crossPattern ? "[" + s.crossPattern + "]" : "")).join(",")
  );

  console.log("\n[생성된 본문]");
  narrative.paragraphs.forEach((para) => {
    console.log(para.text);
    console.log("  [사용 근거: " + para.sourceNote + "]");
  });
});
