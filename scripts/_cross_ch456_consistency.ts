import { calculateSaju } from "../lib/sajuEngine";
import { buildAppDataFromCalc } from "../lib/sajuContent";
import { buildChapterFourKey } from "../lib/chapterFourInterpretation";
import { buildChapterFourNarrative } from "../lib/chapterFourNarrative";
import { analyzeWealthObstruction } from "../lib/wealthObstructionAnalysis";
import { generateWealthObstructionNarrative } from "../lib/wealthObstructionNarrative";
import { analyzeWealthTiming } from "../lib/wealthTimingAnalysis";
import { generateWealthTimingNarrative } from "../lib/wealthTimingNarrative";
import { buildWealthChapterBridge } from "../lib/wealthChapterBridge";

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

people.forEach((p) => {
  const input = { name: p.id, gender: p.gender, calendarType: "solar" as const, isLeapMonth: false, year: p.year, month: p.month, day: p.day, hour: p.hour, minute: 0, timeUnknown: false };
  const calc = calculateSaju(input);
  const appData = buildAppDataFromCalc(calc, input.name);

  const ch4Key = buildChapterFourKey(appData);
  const ch4 = buildChapterFourNarrative(appData, ch4Key);

  const ch5Result = analyzeWealthObstruction(appData);
  const ch5 = generateWealthObstructionNarrative(ch5Result);

  const ch6Result = analyzeWealthTiming(appData);
  const ch6 = generateWealthTimingNarrative(appData, ch6Result);

  const bridge = buildWealthChapterBridge(ch4Key, ch5Result, ch6Result);
  const ch4Paras = [...ch4.publicPreview, ...ch4.lockedDetail];
  const ch4Last = ch4Paras[ch4Paras.length - 1];

  console.log("\n\n########## " + p.id + " ##########");
  console.log("\n[고객용 연속 읽기]");
  console.log("(4장 마지막) " + ch4Last);
  if (bridge.chapter4To5) console.log("(4→5 연결) " + bridge.chapter4To5);
  ch5.paragraphs.forEach((para) => console.log("(5장) " + para.text));
  if (bridge.chapter5To6) console.log("(5→6 연결) " + bridge.chapter5To6);
  if (!ch6.applicable) {
    console.log("(6장 적용 불가: " + ch6.notApplicableReason + ")");
  } else {
    console.log("(6장 시작) " + ch6.paragraphs[0].text);
  }

  console.log("\n[계산요약]");
  console.log(
    "4장: exposure=" + ch4Key.jaeseong.exposure + " dominant=" + ch4Key.jaeseong.dominant +
    " | 5장: structural=" + JSON.stringify(ch5Result.structuralObstructions.map((o) => o.sourceFlag)) +
    " severity=" + ch5Result.severityLabel +
    " | 6장: 현재=" + (ch6Result.currentDaYun?.classification.label ?? (ch6Result.applicable ? "-" : "적용불가"))
  );
});
