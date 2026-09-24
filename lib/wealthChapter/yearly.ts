// [5장 재물운 Production 이식] 확정된 scratch(scripts/_scratch_ch9_yearly_v5.ts)를 로직·문장 변경 없이 그대로 옮긴 파일.
// 이식 시 제거한 것: 데모/검증용 실행 코드(buildAppData·IntakeFormData·require.main 블록)와 그 import뿐이다.
// 제5장 ⑨ "앞으로 몇 해의 돈 흐름(연도별)" scratch v5 (Production 무수정, v1~v4와 별개 파일).
// 계산·분기·연도 판정은 v4와 동일(연도 자료는 v4의 collectYears를 그대로 가져다 쓴다). v5는 문장만 다듬는다.
//  - 같은 사람 본문 안에서 같은 문장이 반복되지 않도록, 문장마다 변형을 여러 개 두고 "이 사람 본문에서 아직 안 쓴 첫 변형"을 고른다(결정적, 무작위 없음).
//  - 라벨 없는 해(판정 불가)에서 충·합 문장은 그 해의 재성 신호 성격(반복되는 돈 / 금액이 그때그때 달라지는 돈 / 둘 다 / 은근한 신호)에 맞춰 쓴다.
//  - 재성이 지장간에만 있는 해도 정재/편재 구분을 문장에 반영한다.
//  - D 라벨은 "확인"만 말한다(핵심 문장 = 한 번 더 확인, 충·합 문장 = 확인 범위·기준). "서두르지"는 핵심 문장에서만.
//  - 총평 첫 문장은 그 사람의 5개년 라벨 구성에서 바로 만든다("모두 같은 해가 아닙니다" 삭제).
import { AppData } from "../sajuContent";
import { CrossPattern } from "../wealthTimingAnalysis";
import { collectYears } from "./yearlyData";

export interface NarrativeParagraph { text: string; sourceNote: string }
export interface Result { paragraphs: NarrativeParagraph[]; used: string; trace: string[] }
const b = (s: string) => `**${s}**`;
export const plainOf = (s: string) => s.replace(/\*\*/g, "");
type L = "A" | "B" | "C" | "D" | "E" | null;
type WT = "none" | "정재" | "편재" | "both";

// ── 연도 표기 ──
function groupYears(ys: number[]): number[][] {
  const g: number[][] = [];
  ys.forEach((y) => { const last = g[g.length - 1]; if (last && last[last.length - 1] === y - 1) last.push(y); else g.push([y]); });
  return g;
}
const fmtGroup = (g: number[]) => (g.length === 1 ? `${g[0]}년` : `${g[0]}~${g[g.length - 1]}년`);
function fmtYears(ys: number[]): string {
  const gs = groupYears(ys).map(fmtGroup);
  return gs.length === 1 ? gs[0] : gs.length === 2 ? `${gs[0]}과 ${gs[1]}` : gs.join(", ");
}

// ── 문장 은행(각 항목: 첫 번째 = 자세한 문장, 뒤 = 같은 사람 본문에서 이미 쓴 경우의 다른 표현) ──
export const CORE: Record<string, string[]> = {
  A: ["돈과 관련한 판단을 평소보다 조금 편하게 내려도 되는 {N}입니다.", "{S}도 돈 판단은 비교적 부담 없이 내려도 됩니다.", "{S}도 돈 결정을 크게 망설이지 않아도 되는 편입니다."],
  A누적강화: ["요즘도 큰 무리 없이 가는 시기인데, {S}에는 돈과 관련한 판단을 평소보다 한결 편하게 내려도 됩니다. 미뤄 둔 결정이 있다면 이때 다뤄 보기 좋습니다.", "{S}도 요즘 시기와 잘 맞아 돈 판단을 한결 편하게 내려도 됩니다."],
  A단발성기회: ["다른 해와 견주면 {S}만 돈과 관련한 판단을 평소보다 편하게 내려도 됩니다. 미뤄 둔 결정이 있다면 이때 다뤄 보세요.", "{S}도 다른 해보다 돈 판단이 편한 쪽입니다."],
  A부담대운속도움되는해: ["신경 쓸 일이 많은 시기 안에서도 {S}만큼은 한숨 돌리며 돈 문제를 정리해 볼 만합니다.", "{S}도 한숨 돌리며 돈 문제를 정리해 볼 만합니다."],
  B: ["돈 문제에 마음을 조금 더 써야 하는 {N}입니다."],
  C: ["새로 벌이기보다 지금 가진 것을 차분히 챙기기에 어울리는 {N}입니다.", "{S}도 새로 늘리기보다 있는 것을 챙기는 쪽이 어울립니다.", "{S}에는 가진 것을 정돈해 두는 일이 잘 맞습니다."],
  D: ["큰 결정을 바로 내리기보다 한 번 더 확인하고 정하는 것이 좋은 {N}입니다.", "{S}도 큰 지출이나 계획 변경 전에는 다시 한 번 확인해 보세요.", "{S}도 확인을 한 번 더 거치고 정하면 마음이 편합니다."],
  D좋은흐름속일시적리스크: ["전반적으로 무난한 시기지만 {S}만큼은 큰 결정 전에 한 번 더 확인해 보는 것이 좋겠습니다.", "{S}도 무난한 시기 속의 예외라, 큰 결정 전에 다시 한 번 확인해 보세요.", "{S}에도 큰 결정은 확인을 한 번 더 거쳐 두세요."],
  E: ["크게 바꾸기보다 지금 상태를 지켜보는 것이 마음 편한 {N}입니다.", "{S}도 서둘러 바꾸지 말고 지켜보는 쪽이 어울립니다.", "{S}에도 지금 상태를 그대로 두고 살펴보면 됩니다."],
  Q: ["돈 이야기가 비교적 조용한 {N}입니다.", "{S}도 돈 이야기는 조용한 편입니다.", "{S}에도 돈 움직임은 크지 않습니다."],
};
// 재성 신호의 성격(정재=매달 반복되는 돈 / 편재=금액이 그때그때 달라지는 돈) — 드러난 경우
export const WSENT: Record<string, string[]> = {
  정재: ["매달 반복해서 나가거나 들어오는 돈을 한 번 점검해 보기 좋습니다. 항목이 여러 개라면 하나씩 정리해 보는 편이 좋습니다.", "매달 반복되는 돈 항목을 다시 살펴보면 좋습니다.", "매달 반복되는 돈을 이번에도 차분히 점검해 보세요."],
  편재: ["금액이 그때그때 달라지는 돈이 눈에 띄는 해라, 규모가 큰 지출은 여유를 두고 계획해 보세요.", "금액이 달라지는 돈이 눈에 띄니, 큰 지출은 여유를 두고 계획하는 것이 좋습니다.", "금액이 일정하지 않은 돈이 눈에 띄니 큰 지출에는 여유를 두세요."],
  both: ["매달 반복되는 돈과 금액이 그때그때 달라지는 돈이 함께 눈에 띄는 해라, 반복되는 것과 달라지는 것을 구분해서 살펴보면 좋습니다.", "두 종류의 돈이 함께 눈에 띄니, 구분해서 살펴보세요.", "반복되는 돈과 달라지는 돈을 각각 확인해 보세요."],
  // 지장간에만 있는 경우(겉으로 드러나지 않는 은근한 신호) — 정재/편재 구분 유지
  "은근정재": ["겉으로는 잘 드러나지 않지만 매달 반복되는 돈 쪽에 은근히 움직임이 있는 해라, 놓치는 항목이 없는지 가끔 확인해 보면 좋습니다.", "매달 반복되는 돈 쪽의 움직임이 은근한 해라, 항목을 가끔 확인해 두세요.", "반복되는 항목 중 놓친 것이 없는지 가끔 살펴보세요."],
  "은근편재": ["겉으로는 잘 드러나지 않지만 금액이 그때그때 달라지는 돈 쪽에 은근히 움직임이 있는 해라, 금액이 달라진 내역이 없는지 가끔 짚어 보면 좋습니다.", "금액이 달라지는 돈의 움직임이 은근한 해라, 내역을 가끔 짚어 두세요.", "달라진 금액이 없는지 가끔 살펴보세요."],
  "은근both": ["겉으로는 잘 드러나지 않지만 반복되는 돈과 금액이 달라지는 돈 양쪽에 은근히 움직임이 있는 해라, 두 가지 내역을 가끔 확인해 보면 좋습니다.", "두 종류 돈의 움직임이 은근한 해라, 내역을 가끔 확인해 두세요.", "양쪽 내역을 가끔 살펴보세요."],
};
// 충(X)·합/천간합(T) 문장 — 사건이 아니라 "이 해에 살필 점"만. 라벨(RG)별로 살필 것이 다르다.
type RG = "A" | "C" | "D" | "E" | "N";
const rgOf = (l: L): RG => (l === "A" ? "A" : l === "C" ? "C" : l === "D" || l === "B" ? "D" : l === "E" ? "E" : "N");
export const REL: Record<RG, Record<string, string[]>> = {
  A: {
    X: ["상황이 평소와 달라질 수 있으니, 실행하기 전에 한 번만 다시 살펴보세요.", "실행 전에 한 번만 다시 살펴보면 됩니다.", "실행 직전에 상황이 그대로인지 확인해 두세요."],
    T: ["관련된 사항이 여러 개라면, 결정 전에 함께 봐 두면 좋습니다.", "관련 사항을 함께 봐 두면 좋습니다.", "함께 걸린 사항이 없는지만 확인하면 됩니다."],
    XT: ["상황이 평소와 달라질 수 있고 챙길 사항도 여럿이라, 실행 전에 한 번 더 살펴보세요.", "실행 전에 한 번 더 살펴보세요.", "실행 직전에 사항들을 다시 훑어보세요."],
  },
  C: {
    X: ["챙기는 과정에서 예상과 다른 일이 생길 수 있으니, 정리할 범위를 넉넉하게 잡아 두면 좋습니다.", "정리 범위를 넉넉하게 잡아 두세요.", "여유 있게 범위를 잡아 두면 마음이 편합니다."],
    T: ["챙길 항목이 서로 이어져 있을 수 있으니, 따로따로 보지 말고 묶어서 정리해 보세요.", "관련된 항목은 묶어서 정리해 보세요.", "이어진 항목은 함께 정리해 두면 수월합니다."],
    XT: ["예상과 다른 일이 생길 수 있고 항목도 서로 이어져 있을 수 있으니, 정리 범위를 넉넉히 잡고 묶어서 살펴보세요.", "넉넉히 잡고 묶어서 정리해 보세요.", "범위는 넉넉히, 항목은 묶어서 정리해 두세요."],
  },
  D: {
    X: ["확인할 범위를 평소보다 넓게 잡아 보세요.", "이번에도 확인 범위를 넓게 잡으면 좋습니다.", "확인 범위를 한 단계 넓혀 두세요."],
    T: ["확인할 때 한 가지 기준만 보지 말고 여러 기준을 함께 대조해 보세요.", "여러 기준을 함께 대조해 보세요.", "기준 두세 가지를 견주어 보면 좋습니다."],
    XT: ["확인 범위를 넓게 잡고 여러 기준을 함께 대조해 보세요.", "범위를 넓히고 기준도 견주어 보세요.", "범위와 기준을 함께 넓혀 두세요."],
  },
  E: {
    X: ["지켜보는 중에 예상과 다른 일이 생기면 그때 방향을 다시 살펴보면 됩니다.", "그때그때 방향을 다시 살펴보면 됩니다.", "달라진 점이 생기면 그때 살펴보면 충분합니다."],
    T: ["지켜볼 때는 관련된 사항이 함께 움직이는지도 같이 살펴보세요.", "관련 사항도 같이 살펴보세요.", "함께 움직이는 사항이 없는지도 봐 두세요."],
    XT: ["지켜보는 중에 예상과 다른 일이 생길 수 있고 관련 사항도 함께 움직일 수 있으니, 방향을 그때그때 다시 살펴보세요.", "방향을 그때그때 다시 살펴보세요.", "달라진 점과 함께 움직이는 사항을 그때그때 살펴보세요."],
  },
  N: { // 라벨 없음 + 재성 신호 없는 해
    X: ["예상과 다른 일이 생길 수 있으니, 내역은 평소보다 자주 확인해 두면 좋습니다.", "내역을 평소보다 자주 확인해 두면 좋습니다.", "이번에도 내역을 자주 살펴보세요."],
    T: ["서로 이어진 항목이 있을 수 있으니, 정리할 때 관련된 것끼리 함께 확인해 두면 좋습니다.", "이어진 항목은 함께 확인해 보세요.", "함께 걸린 항목이 없는지 살펴보세요."],
    XT: ["예상과 다른 일이 생길 수 있고 항목도 서로 이어져 있을 수 있으니, 내역은 자주, 관련된 것끼리는 함께 확인해 두면 좋습니다.", "내역은 자주, 관련된 것끼리는 함께 확인해 보세요.", "내역을 자주, 이어진 것은 함께 살펴보세요."],
  },
};
// 라벨 없음 + 재성 신호 있는 해: 그 해의 돈 성격에 맞춰 충·합 문장을 쓴다(정재 해와 편재+정재 해가 같은 문장이 되지 않도록)
export const NW: Record<string, Record<string, string[]>> = {
  T: {
    정재: ["하나씩 정리하다가 서로 이어진 항목이 나오면, 관련된 것끼리 묶어서 확인해 보세요.", "이어진 반복 항목이 있는지도 함께 보세요.", "반복 항목끼리 이어진 것이 있는지 살펴보세요."],
    편재: ["금액이 달라지는 지출이 다른 항목과 이어져 있을 수 있으니, 큰 지출 전에 함께 걸린 항목이 없는지 확인해 보세요.", "큰 지출 전에 함께 걸린 항목이 없는지 살펴보세요.", "큰 지출은 이어진 항목까지 확인하고 정하세요."],
    both: ["두 종류가 서로 이어져 있을 수 있으니, 구분해 본 뒤에 한 번 함께 놓고 확인해 보세요.", "구분해 본 뒤 함께 놓고 살펴보세요.", "두 가지를 나란히 놓고 대조해 두세요."],
    은근: ["드러나지 않은 항목이 다른 항목과 이어져 있을 수 있으니, 내역을 함께 확인해 두세요.", "이어진 항목이 없는지 내역을 함께 살펴보세요.", "내역끼리 이어진 것이 없는지 살펴보세요."],
  },
  X: {
    정재: ["예상과 다른 일이 생길 수 있으니, 반복 항목의 금액이 그대로인지 평소보다 자주 확인해 보세요.", "반복 항목의 금액을 자주 확인해 보세요.", "반복 항목의 금액이 그대로인지 살펴보세요."],
    편재: ["예상과 다른 일이 생길 수 있으니, 금액이 달라지는 지출은 한도를 정해 두고 쓰세요.", "달라지는 지출은 한도를 정해 두세요.", "지출 한도를 미리 정해 두면 좋습니다."],
    both: ["예상과 다른 일이 생길 수 있으니, 반복 항목은 자주 확인하고 달라지는 지출은 한도를 정해 두세요.", "반복 항목은 확인하고, 달라지는 지출은 한도를 정하세요.", "확인할 것과 한도를 정할 것을 나눠 두세요."],
    은근: ["예상과 다른 일이 생길 수 있으니, 잘 보이지 않는 내역도 평소보다 자주 확인해 보세요.", "잘 보이지 않는 내역을 자주 확인하세요.", "숨은 내역이 없는지 자주 살펴보세요."],
  },
};

// 이 사람 본문에서 아직 쓰지 않은 첫 변형을 고른다(모두 썼으면 마지막 변형).
function pick(variants: string[], used: Set<string>, sub: (s: string) => string): string {
  const cand = variants.map(sub);
  const f = cand.find((c) => !used.has(c)) ?? cand[cand.length - 1];
  used.add(f);
  return f;
}

export function generateYearlyV5(appData: AppData): Result {
  const data = collectYears(appData);
  if (!data) return { paragraphs: [], used: "현재 대운 값 없음 → 5개년 세운 없음 → ⑨ 생략", trace: [] };
  const { years, baseline, applicable } = data;
  const first = years[0].year, last = years[years.length - 1].year;
  const xN = years.filter((y) => y.X).length, tN = years.filter((y) => y.T).length;
  const xUniv = xN >= 4, tUniv = tN >= 4; // 거의 매년 있는 신호는 해별 차이가 아니므로 다루지 않는다
  const flags = years.map((y) => ({ ...y, Xm: y.X && !xUniv, Tm: y.T && !tUniv }));
  type F = (typeof flags)[number];
  const wTag = (f: F) => (!f.W ? "none" : f.clear ? f.wt : `은근${f.wt}`);
  const primaryOf = (f: F) => `${f.label ?? "-"}|${f.cross ?? ""}|${wTag(f)}`;
  const secOf = (f: F) => `${f.Xm ? "X" : ""}${f.Tm ? "T" : ""}`;

  // ── 총평: 첫 문장부터 이 사람의 실제 5개년 라벨 구성에서 만든다 ──
  const kinds = new Set(flags.map((f) => primaryOf(f) + "|" + secOf(f))).size;
  const sum: string[] = [];
  const range5 = `앞으로 5년(${first}~${last}년)`;
  if (kinds > 1) {
    const groups: string[] = [];
    if (applicable) {
      if (years.some((y) => y.label === "A")) groups.push("돈 판단을 비교적 편하게 내려도 되는 해");
      if (years.some((y) => y.label === "D")) groups.push("한 번 더 확인하고 정하는 것이 좋은 해");
      if (years.some((y) => y.label === "C")) groups.push("새로 벌이기보다 있는 것을 챙기기 좋은 해");
      if (years.some((y) => y.label === "E")) groups.push("서두르지 않고 지켜보기 좋은 해");
    } else {
      const wN = years.filter((y) => y.W).length;
      if (wN > 0 && wN < years.length) groups.push("돈이 들어오고 나가는 일이 눈에 띄는 해", "조용한 해");
    }
    if (groups.length > 1) sum.push(`${range5}에는 ${groups.join(", ")}가 섞여 있습니다.`);
    else if (groups.length === 1) sum.push(`${range5}에는 ${groups[0]}가 이어지되, 해마다 살필 내용이 조금씩 다릅니다.`);
    else sum.push(`${range5}은 돈 이야기의 크기는 비슷하고, 해마다 살필 점만 조금씩 다릅니다.`);
    const wts = new Set(years.filter((y) => y.W).map((y) => y.wt));
    if (wts.size >= 2) sum.push("해마다 눈에 띄는 돈의 종류도 다릅니다. 매달 반복되는 돈이 중심인 해도 있고, 금액이 그때그때 달라지는 돈이 중심인 해도 있습니다.");
    if (!xUniv && xN > 0) sum.push(`예상과 다른 일이 생길 수 있는 해는 ${fmtYears(years.filter((y) => y.X).map((y) => y.year))}입니다.`);
  } else {
    sum.push(`${range5}은 해마다 큰 차이 없이 비슷하게 이어집니다.`);
  }
  const paras: NarrativeParagraph[] = [{ text: sum.join(" "), sourceNote: "총평" }];
  const trace: string[] = ["총평 ← 5개년 라벨 구성·재성 신호 종류·충 연도"];

  // ── 연도별 ──
  const ranges: F[][] = [];
  flags.forEach((f) => { const lr = ranges[ranges.length - 1]; if (lr && primaryOf(lr[0]) === primaryOf(f) && lr[lr.length - 1].year === f.year - 1) lr.push(f); else ranges.push([f]); });
  const used = new Set<string>();
  ranges.forEach((r) => {
    const f = r[0], plural = r.length > 1;
    const head = plural ? `${r[0].year}~${r[r.length - 1].year}년` : `${f.year}년`;
    const sub = (s: string) => s.replace(/\{N\}/g, plural ? "시기" : "해").replace(/\{S\}/g, plural ? "이 몇 해" : "이 해");
    const parts: string[] = [], tr: string[] = [];
    if (f.label) {
      const crossKey = f.cross ? `${f.label}${f.cross}` : "";
      // 교차 패턴 전용 문장은 이 사람 본문에서 처음일 때만 쓰고, 이미 썼거나 없으면 라벨 기본 문장을 쓴다
      const crossBank = crossKey && CORE[crossKey] && !CORE[crossKey].map(sub).every((c) => used.has(c)) ? CORE[crossKey] : null;
      parts.push(pick(crossBank ?? CORE[f.label], used, sub));
      tr.push(`라벨 ${f.label}${f.cross ? "·" + f.cross : ""} → ${f.label === "A" ? "돈 판단 편하게" : f.label === "D" ? "한 번 더 확인" : f.label === "C" ? "있는 것 챙기기" : f.label === "E" ? "지켜보기" : "마음 더 쓰기"} 문장`);
    } else if (!f.W) { parts.push(pick(CORE.Q, used, sub)); tr.push("재성 신호 없음 → 조용한 해 문장"); }
    if (f.W) {
      parts.push(pick(WSENT[wTag(f)], used, sub));
      tr.push(`재성 신호(${r.map((y) => y.where).filter((v, i, a) => a.indexOf(v) === i).join(" / ")}) → ${f.clear ? (f.wt === "정재" ? "매달 반복되는 돈" : f.wt === "편재" ? "금액이 달라지는 돈" : "두 종류 돈") : "은근한 신호(" + (f.wt === "정재" ? "반복되는 돈" : f.wt === "편재" ? "달라지는 돈" : "두 종류") + ")"} 문장`);
    }
    const groups: { key: string; ys: F[] }[] = [];
    r.forEach((y) => { const k = secOf(y); if (!k) return; const g = groups.find((x) => x.key === k); if (g) g.ys.push(y); else groups.push({ key: k, ys: [y] }); });
    groups.forEach((g, gi) => {
      let clause: string;
      if (!f.label && f.W) {
        const tag = f.clear ? f.wt : "은근";
        if (g.key === "XT") clause = `${pick(NW.X[tag], used, sub)} ${pick(NW.T[tag], used, sub)}`;
        else clause = pick(NW[g.key][tag], used, sub);
      } else clause = pick(REL[rgOf(f.label)][g.key], used, sub);
      parts.push(g.ys.length === r.length ? clause : `${gi === 0 ? "그중 " : ""}${fmtYears(g.ys.map((y) => y.year))}은 ${clause}`);
      tr.push(`${g.key.includes("X") ? "충" : ""}${g.key.includes("T") ? (g.key.includes("X") ? "+" : "") + "합·천간합" : ""}(${fmtYears(g.ys.map((y) => y.year))}) → ${!f.label && f.W ? "돈 성격에 맞춘" : "라벨별"} 살필 점 문장`);
    });
    paras.push({ text: `${b(head)} ${parts.join(" ")}`, sourceNote: head });
    trace.push(`${head} ← ${tr.join(" ; ")}`);
  });
  const usedStr = `${applicable ? `판정 가능(현재 대운 라벨 ${baseline})` : "판정 불가(라벨 없음, 세운 신호만)"} | ` + years.map((y) => `${y.year}:${y.label ?? "-"}/재성${y.W ? y.where : "×"}/충${y.X ? "O" : "×"}/합${y.T ? "O" : "×"}${y.cross ? "/" + y.cross : ""}${y.inCurrent ? "" : "/대운경계밖"}`).join(", ");
  return { paragraphs: paras, used: usedStr, trace };
}
