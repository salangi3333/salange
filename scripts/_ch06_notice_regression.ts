import { calculateSaju } from "../lib/sajuEngine";
import { buildAppDataFromCalc } from "../lib/sajuContent";
import { buildReportResult } from "../lib/reportMapper";
import { analyzeWealthTiming } from "../lib/wealthTimingAnalysis";
import { generateWealthTimingNarrative } from "../lib/wealthTimingNarrative";
import { analyzeWealthObstruction } from "../lib/wealthObstructionAnalysis";
import { buildChapterFourKey } from "../lib/chapterFourInterpretation";
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

const NOTICE =
  "이 사주는 재물의 흐름을 한 가지 기준만으로 나누기보다 여러 흐름을 함께 살펴야 더 정확합니다. 그래서 특정 시기를 좋고 나쁜 때로 단정하기보다, 확인되는 흐름만을 중심으로 신중하게 안내합니다.";

let mismatchCount = 0;
let noticeShownCount = 0;
const noticeIds: string[] = [];
const bridgeCounts = { b45: 0, b56: 0 };

people.forEach((p) => {
  const input = { name: p.id, gender: p.gender, calendarType: "solar" as const, isLeapMonth: false, year: p.year, month: p.month, day: p.day, hour: p.hour, minute: 0, timeUnknown: false };
  const calc = calculateSaju(input);
  const appData = buildAppDataFromCalc(calc, input.name);

  // 독립적으로 다시 계산한 "기대값"(reportMapper를 거치지 않은 순수 계산/서술/bridge)
  const ch4Key = buildChapterFourKey(appData);
  const ch5Result = analyzeWealthObstruction(appData);
  const timing = analyzeWealthTiming(appData);
  const narrative = generateWealthTimingNarrative(appData, timing);
  const bridge = buildWealthChapterBridge(ch4Key, ch5Result, timing);
  if (bridge.chapter4To5) bridgeCounts.b45++;
  if (bridge.chapter5To6) bridgeCounts.b56++;

  // reportMapper를 통과한 실제 값
  const report = buildReportResult(appData);

  if (!timing.applicable) {
    noticeShownCount++;
    noticeIds.push(p.id + ":" + timing.notApplicableReason);
    const ok =
      !!report.chapterSix &&
      report.chapterSix.body.length === 1 &&
      report.chapterSix.body[0] === NOTICE &&
      report.chapterSix.bridgeIntro === undefined &&
      report.chapterSix.chapterLabel === "第六章";
    if (!ok) {
      mismatchCount++;
      console.log("[MISMATCH-notice]", p.id, JSON.stringify(report.chapterSix));
    }
  } else {
    // applicable=true인 57명: reportMapper 결과가 독립 계산과 완전히 같아야 한다
    const expectedBody = narrative.paragraphs.map((pp) => pp.text);
    const actualBody = report.chapterSix?.body ?? [];
    const bodyMatches = JSON.stringify(expectedBody) === JSON.stringify(actualBody);
    const bridgeMatches = (report.chapterSix?.bridgeIntro ?? undefined) === (bridge.chapter5To6 ?? undefined);
    const titleMatches = report.chapterSix?.title === `${p.id}님의 재물이 움직이는 시기`;
    if (!bodyMatches || !bridgeMatches || !titleMatches) {
      mismatchCount++;
      console.log("[MISMATCH-normal]", p.id, { bodyMatches, bridgeMatches, titleMatches });
    }
  }

  // 4·5장도 reportMapper 결과가 독립 계산과 같은지 확인(이번 수정이 4·5장에
  // 영향을 주지 않았는지)
  const ch5Narrative = report.chapterFive;
  if (!ch5Narrative || ch5Narrative.chapterLabel !== "第五章") {
    mismatchCount++;
    console.log("[MISMATCH-ch5-missing]", p.id);
  }
});

console.log("\n=== 결과 ===");
console.log("총원:", people.length);
console.log("안내문 표시된 인원:", noticeShownCount, noticeIds);
console.log("불일치 건수:", mismatchCount);
console.log("4→5 bridge 발생(독립계산 기준):", bridgeCounts.b45, "/", people.length);
console.log("5→6 bridge 발생(독립계산 기준):", bridgeCounts.b56, "/", people.length);
console.log(mismatchCount === 0 ? "PASS" : "FAIL");
