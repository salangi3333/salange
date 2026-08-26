import { calculateSaju } from "../lib/sajuEngine";
import { buildAppDataFromCalc } from "../lib/sajuContent";
import { analyzeDayMasterBalance } from "../lib/dayMasterBalanceAnalysis";
import { analyzeYongsinCandidate } from "../lib/yongsinCandidateAnalysis";
import { analyzeHuisinCandidate } from "../lib/huisinCandidateAnalysis";
import { analyzeWealthCategoryStrength } from "../lib/wealthStrengthAnalysis";
import { analyzeDaYunWealth, pickPastCurrentNext, DaYunWealthPeriod } from "../lib/daYunWealthAnalysis";
import { buildSeunRange, NatalBranchInput, NatalStemInput } from "../lib/seunAnalysis";
import { SipseongCategory } from "../lib/strengthAnalysis";

/**
 * 6장 "시기 판정" 설계 검증용(검증 전용, 프로덕션 아님). 기존 엔진은
 * 전혀 수정하지 않고, 이번에 설계한 분류 로직만 여기서 스크립트로
 * 시험 계산한다. 새 숫자 임계값 없음 — 전부 기존 값의 카테고리 일치/
 * 불일치 조합으로만 판정한다.
 */

type Gender = "male" | "female";
interface P { id: string; year: number; month: number; day: number; hour: number; gender: Gender; }

const people: P[] = [
  { id: "C16", year: 1970, month: 10, day: 28, hour: 3,  gender: "female" },
  { id: "C39", year: 1981, month: 3,  day: 19, hour: 22, gender: "male" },
  { id: "C35", year: 2013, month: 11, day: 23, hour: 2,  gender: "male" },
  { id: "C24", year: 1966, month: 6,  day: 20, hour: 19, gender: "female" },
  { id: "S8",  year: 1991, month: 7,  day: 28, hour: 8,  gender: "male" },
  { id: "S47", year: 1988, month: 4,  day: 19, hour: 11, gender: "female" },
  { id: "C8",  year: 1974, month: 2,  day: 8,  hour: 11, gender: "female" },
  { id: "T12", year: 1955, month: 8,  day: 8,  hour: 9,  gender: "female" },
];

// 대운/세운 카테고리가 "무엇을 극(剋)하는가" — 용신 엔진의 WARN_KEY와 정확히
// 같은 5개 관계를 반대 방향(공격측 기준)으로 재구성한 것. 새 관계 아님.
const ATTACKS: Record<SipseongCategory, SipseongCategory> = {
  인성: "식상", 비겁: "재성", 식상: "관성", 재성: "인성", 관성: "비겁",
};

function classifyPeriod(
  hasWealth: boolean,
  cat: SipseongCategory | null,
  yongsinCats: SipseongCategory[],
  huisinCats: SipseongCategory[],
  structureFlags: string[],
  supportIntoHuisinCats: SipseongCategory[] = [], // huisin.pairs[].supportIntoHuisin.category(2차 지원, 기존 계산값)
  applyWealthOverlay: boolean = false // true=대운 호출(원국 체질 배경 적용), false=세운 호출(그 해 고유 신호만)
): { label: string; reasons: string[] } {
  if (!cat) return { label: "noSignal", reasons: ["카테고리 불명"] };
  const attacked = ATTACKS[cat];
  const attacksYongsinOrHuisin = [...yongsinCats, ...huisinCats].includes(attacked);
  const matchesYongsin = yongsinCats.includes(cat);
  const matchesHuisin = huisinCats.includes(cat);

  if (attacksYongsinOrHuisin) return { label: "분산/흔들림형(D)", reasons: [`대운·세운 ${cat}이 ${attacked}을(를) 극함(용신·희신 대상)`] };
  if (matchesYongsin || matchesHuisin) {
    if (hasWealth) {
      // wealthExcess는 원국에 고정된 체질값이라 세운마다 재적용하지 않는다.
      // 대운 호출(applyWealthOverlay=true)일 때만, 원래 강화형(A)이었을 결과를
      // "체질상 이 10년은 그 강화가 부담으로 작동한다"는 뜻의 B로 하향한다.
      if (applyWealthOverlay && structureFlags.includes("wealthExcess")) {
        return { label: "부담형(B)", reasons: [`${cat}=용신/희신 일치+재물신호로 본래 강화형이나, 원국 wealthExcess 체질상 이 10년은 그 강화가 부담으로 작동`] };
      }
      return { label: "강화형(A)", reasons: [`${cat}=용신/희신 일치`, "재물신호 동반"] };
    }
    return { label: "기반형(C)", reasons: [`${cat}=용신/희신 일치`, "재물신호는 약함"] };
  }
  // ── E(신호없음) 보정: 억지로 다른 등급에 넣지 않되, "정말 아무 관련 없음"과
  // "희신의 2차 지원축과는 겹침"을 구분해 reasons만 풍부하게 남긴다.
  const supportsHuisinIndirectly = supportIntoHuisinCats.includes(cat);
  if (supportsHuisinIndirectly) {
    return { label: "신호없음형(E)", reasons: ["재물 직접 신호 없음", "용신/희신 자체와도 불일치", `다만 ${cat}은 희신을 뒷받침하는 2차 지원축과 일치 — 간접적으로 기반이 다져지는 시기일 수 있음`] };
  }
  return { label: "신호없음형(E)", reasons: ["재물 직접 신호 없음", "용신/희신 및 그 지원축과도 무관"] };
}

people.forEach((p) => {
  const input = { name: p.id, gender: p.gender, calendarType: "solar" as const, isLeapMonth: false, year: p.year, month: p.month, day: p.day, hour: p.hour, minute: 0, timeUnknown: false };
  const calc = calculateSaju(input);
  const appData = buildAppDataFromCalc(calc, input.name);
  const user = appData.user;
  const dayGan = calc.dayGan;

  const balance = analyzeDayMasterBalance(user);
  const yongsin = analyzeYongsinCandidate(user);
  const huisin = analyzeHuisinCandidate(user);
  const wealth = analyzeWealthCategoryStrength(user);
  const yongsinCats = yongsin.applicable ? yongsin.winners : [];
  const huisinCats = huisin.applicable ? huisin.pairs.map((pr) => pr.category) : [];
  const supportIntoHuisinCats = huisin.applicable ? huisin.pairs.map((pr) => pr.supportIntoHuisin.category) : [];

  console.log("\n========== " + p.id + " ==========");
  console.log("balance:", balance.balanceLabel, "| structureFlags:", balance.structureFlags.join(",") || "없음");
  console.log("용신:", yongsin.outcome, JSON.stringify(yongsinCats), "| 희신:", huisin.applicable ? JSON.stringify(huisinCats) : huisin.notApplicableReason, "| 희신의 2차 지원축:", JSON.stringify(supportIntoHuisinCats));

  // ── 대운 판정 ──
  const periods = analyzeDaYunWealth(dayGan, appData.fortuneTimelineNodes);
  const daYunLabels: { period: DaYunWealthPeriod; c: { label: string; reasons: string[] } }[] = [];
  console.log("\n[대운별 판정]");
  periods.forEach((period: DaYunWealthPeriod) => {
    const c = classifyPeriod(period.hasWealthSignal, period.ganCategory, yongsinCats, huisinCats, balance.structureFlags, supportIntoHuisinCats, true);
    daYunLabels.push({ period, c });
    const mark = period.state === "current" ? "★현재" : period.state === "past" ? "(과거)" : "";
    console.log(` ${period.startAge}-${period.endAge}세 ${period.ganZhi}(${period.ganCategory}) ${mark} -> ${c.label} [${c.reasons.join(" / ")}]`);
  });

  // ── 세운 판정(현재 대운 구간 대표 5개 연도) ──
  const { current, next } = pickPastCurrentNext(periods);
  const target = current ?? next;
  if (!target) { console.log("(대운 시작 전 — 세운 판정 스킵)"); return; }

  const nextLabel = next ? classifyPeriod(next.hasWealthSignal, next.ganCategory, yongsinCats, huisinCats, balance.structureFlags, supportIntoHuisinCats, true) : null;
  console.log("다음 대운:", next ? `${next.startAge}-${next.endAge}세 ${next.ganZhi} -> ${nextLabel!.label}` : "없음");

  const natalBranches: NatalBranchInput[] = [
    { stage: "year", zhi: user.pillars.branches.year.hanja },
    { stage: "month", zhi: user.pillars.branches.month.hanja },
    { stage: "day", zhi: user.pillars.branches.day.hanja },
    ...(user.pillars.branches.hour ? [{ stage: "hour" as const, zhi: user.pillars.branches.hour.hanja }] : []),
  ];
  const natalStems: NatalStemInput[] = [
    { stage: "year", gan: user.pillars.year.hanja },
    { stage: "month", gan: user.pillars.month.hanja },
    { stage: "day", gan: user.pillars.day.hanja },
    ...(user.pillars.hour ? [{ stage: "hour" as const, gan: user.pillars.hour.hanja }] : []),
  ];
  const daYunResult = classifyPeriod(target.hasWealthSignal, target.ganCategory, yongsinCats, huisinCats, balance.structureFlags, supportIntoHuisinCats, true);
  const daYunLabel = daYunResult.label;

  const thisYear = new Date().getFullYear();
  const seunRange = buildSeunRange(dayGan, thisYear, thisYear + 4, natalBranches, { ganZhi: target.ganZhi, ganSipseong: target.ganSipseong }, natalStems);

  console.log("\n[세운별 판정] (현재 대운 =", daYunLabel, JSON.stringify(daYunResult.reasons), ")");
  seunRange.forEach((sk) => {
    const seunHasWealth = sk.seunGanCategory === "재성" || sk.seunJiCategory === "재성" || sk.hiddenStems.some((h) => h.category === "재성");
    const primaryCat = sk.seunGanCategory; // 천간 기준으로 대표 카테고리 판정(대운 판정과 동일 기준)
    const c = classifyPeriod(seunHasWealth, primaryCat, yongsinCats, huisinCats, balance.structureFlags, supportIntoHuisinCats);

    const chongOnWealth = sk.natalRelations.filter((r) => r.type === "충" && wealth.visiblePositions.재성.includes(r.stage as any));
    const heOnWealth = sk.natalRelations.filter((r) => r.type === "합" && wealth.visiblePositions.재성.includes(r.stage as any));
    const anyChong = sk.natalRelations.some((r) => r.type === "충") || sk.dayunRelations.some((r) => r.type === "충");
    const anyHe = sk.natalRelations.some((r) => r.type === "합") || sk.dayunRelations.some((r) => r.type === "합");

    let note = "";
    if (chongOnWealth.length) note = " ⚠재성 자리 직접 충(" + chongOnWealth.map((r) => r.natalZhi).join(",") + ")";
    else if (heOnWealth.length) note = " 🔗재성 자리 직접 합(" + heOnWealth.map((r) => r.natalZhi).join(",") + ")";
    else if (anyChong) note = " (다른 자리 충 있음)";
    else if (anyHe) note = " (다른 자리 합 있음)";

    // ── 보정된 교차 판정: 좁은 "재성직접충" 조건 대신, 이미 계산된 대운·세운
    // 라벨 자체를 직접 비교한다(같은 계산 트리 재사용, 새 개념 없음).
    let crossLabel = "";
    const crossReasons: string[] = [];
    if (c.label === "강화형(A)" && daYunLabel === "강화형(A)") {
      crossLabel = "[누적 강화]";
    } else if (c.label === "강화형(A)" && daYunLabel !== "강화형(A)") {
      crossLabel = "[단발성 기회]";
    } else if (daYunLabel === "강화형(A)" && (c.label === "분산/흔들림형(D)" || c.label === "부담형(B)")) {
      crossLabel = "[좋은 흐름 속 일시적 리스크]";
      crossReasons.push("대운 근거: " + daYunResult.reasons.join(";"), "세운 근거: " + c.reasons.join(";"));
      if (chongOnWealth.length || anyChong) crossReasons.push("합충 동반: " + (chongOnWealth.length ? "재성 자리 직접 충" : "다른 자리 충"));
    } else if (daYunLabel === "부담형(B)" && c.label === "강화형(A)") {
      crossLabel = "[부담 대운 속 도움되는 해]";
      crossReasons.push("대운은 wealthExcess로 부담이 누적된 상태이나, 이 해만 용신/희신 축이 재물과 함께 작동");
    }

    console.log(` ${sk.year}년 ${sk.seunGanHanja}${sk.seunJiHanja}(${sk.seunGanCategory}) -> ${c.label} ${crossLabel}${note}`);
    if (crossReasons.length) console.log("    └ " + crossReasons.join(" | "));
  });
});
