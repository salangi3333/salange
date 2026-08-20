import { FortuneNode } from "@/components/FortuneTimeline";
import { computeSipseong } from "./aiLifeReport";
import { SipseongCategory } from "./strengthAnalysis";

/**
 * 4챕터("금전운의 흐름") 전용 — 대운의 천간뿐 아니라 지지(의 지장간)까지
 * 십성으로 풀어내는 새 헬퍼. 기존 calculateSaju/daYun 엔진(sajuEngine.ts)은
 * 전혀 건드리지 않는다 — appData가 이미 갖고 있는 fortuneTimelineNodes
 * (age/label=간지문자열/state)를 입력으로 받아 부가 정보만 계산한다.
 *
 * 지장간표는 실제 명식 4기둥에 쓰이는 것과 동일한 표준표를 그대로 옮긴
 * 것이다(라이브러리 소스와 대조 확인됨) — 대운 간지는 실제 날짜가 아니라
 * 60갑자 순환값이라 lunar-javascript의 EightChar로 조회할 수 없어서 참조용
 * 상수로 별도 둔 것뿐, 새 명리 개념이 아니다.
 */

type HidePosition = "본기" | "중기" | "여기";

const ZHI_HIDE_GAN_STATIC: Record<string, string[]> = {
  子: ["癸"],
  丑: ["己", "癸", "辛"],
  寅: ["甲", "丙", "戊"],
  卯: ["乙"],
  辰: ["戊", "乙", "癸"],
  巳: ["丙", "庚", "戊"],
  午: ["丁", "己"],
  未: ["己", "丁", "乙"],
  申: ["庚", "壬", "戊"],
  酉: ["辛"],
  戌: ["戊", "辛", "丁"],
  亥: ["壬", "甲"],
};

function positionOf(index: number): HidePosition {
  return index === 0 ? "본기" : index === 1 ? "중기" : "여기";
}

const SIPSEONG_TO_CATEGORY: Record<string, SipseongCategory> = {
  비견: "비겁",
  겁재: "비겁",
  식신: "식상",
  상관: "식상",
  편재: "재성",
  정재: "재성",
  편관: "관성",
  정관: "관성",
  편인: "인성",
  정인: "인성",
};

export interface DaYunHiddenSipseong {
  hiddenGan: string;
  position: HidePosition;
  sipseong: string;
  category: SipseongCategory | null;
}

export interface DaYunWealthPeriod {
  startAge: number;
  endAge: number;
  ganZhi: string;
  state: "past" | "current" | "future";
  ganSipseong: string;
  ganCategory: SipseongCategory | null;
  zhiHidden: DaYunHiddenSipseong[];
  /** 천간 또는 지지 지장간 어디에든 재성이 있으면 true */
  hasWealthSignal: boolean;
}

function parseAgeRange(age: string): { startAge: number; endAge: number } {
  const [start, end] = age.split("-").map((n) => parseInt(n, 10));
  return { startAge: start, endAge: end };
}

export function analyzeDaYunWealth(dayGan: string, nodes: FortuneNode[]): DaYunWealthPeriod[] {
  return nodes.map((node) => {
    const { startAge, endAge } = parseAgeRange(node.age);
    const gan = node.label[0];
    const zhi = node.label[1];

    const ganSipseong = computeSipseong(dayGan, gan);
    const ganCategory = SIPSEONG_TO_CATEGORY[ganSipseong] ?? null;

    const hideGan = ZHI_HIDE_GAN_STATIC[zhi] ?? [];
    const zhiHidden: DaYunHiddenSipseong[] = hideGan.map((hg, idx) => {
      const sipseong = computeSipseong(dayGan, hg);
      return { hiddenGan: hg, position: positionOf(idx), sipseong, category: SIPSEONG_TO_CATEGORY[sipseong] ?? null };
    });

    const hasWealthSignal = ganCategory === "재성" || zhiHidden.some((z) => z.category === "재성");

    return { startAge, endAge, ganZhi: node.label, state: node.state, ganSipseong, ganCategory, zhiHidden, hasWealthSignal };
  });
}

/** 현재 대운 바로 앞(=지나온 약 10년)/현재/바로 다음 대운만 골라낸다.
 * "과거 10년"이 정확히 대운 한 구간(10년 단위)과 맞아떨어지므로, 별도
 * 날짜 계산 없이 인접 구간을 그대로 쓴다. 첫 대운이 현재이거나 마지막
 * 대운이 현재인 경우는 past/next가 없을 수 있다(그 경우 undefined). */
export function pickPastCurrentNext(periods: DaYunWealthPeriod[]): {
  past: DaYunWealthPeriod | null;
  current: DaYunWealthPeriod | null;
  next: DaYunWealthPeriod | null;
} {
  const currentIdx = periods.findIndex((p) => p.state === "current");
  if (currentIdx === -1) return { past: null, current: null, next: null };
  return {
    past: periods[currentIdx - 1] ?? null,
    current: periods[currentIdx],
    next: periods[currentIdx + 1] ?? null,
  };
}

export interface WealthSignalSpan {
  startAge: number;
  endAge: number;
}

/** "재물의 기운이 대운에 직접 이어진다"고 할 만큼 뚜렷한 신호 — 천간
 * 십성 자체가 재성인 경우만 인정한다. 지지 지장간에만 재성이 숨어 있는
 * 경우(hasWealthSignal은 true일 수 있음)는 "직접" 이어진다고 하기엔 근거가
 * 약해 제외한다 — describePeriodFunction의 hiddenNote가 그 경우를 따로
 * 다룬다. */
function isDirectWealthPeriod(period: DaYunWealthPeriod): boolean {
  return period.ganCategory === "재성";
}

/** "지나온 10년"(직전 대운)보다 한 단계 더 앞선 구간 중, 재성이 천간에
 * 직접 드러났던 연속 구간을 찾는다(연속된 여러 대운이 전부 해당하면 하나로
 * 합친다 — 예: 19-28세·29-38세가 모두 재성 천간이면 "19-38세"로). 직전
 * 대운 자체에 이미 그런 신호가 있으면(=굳이 더 앞을 볼 필요가 없으면)
 * null을 반환한다. "과거 10년 또는 주요 과거 대운"(승인된 7단계 서사)에서,
 * 직전 10년이 재물과 무관한 시기일 때 그보다 앞서 실제로 재물이 직접
 * 움직였던 시기를 놓치지 않기 위한 보조 조회다 — 새 명리 개념이 아니라
 * 같은 daYunWealthPeriod 배열을 한 단계 더 훑는 것뿐이다. */
export function findPriorWealthSignalSpan(periods: DaYunWealthPeriod[]): WealthSignalSpan | null {
  const currentIdx = periods.findIndex((p) => p.state === "current");
  if (currentIdx <= 0) return null;
  const immediatePast = periods[currentIdx - 1];
  if (immediatePast && isDirectWealthPeriod(immediatePast)) return null;

  let endAge: number | null = null;
  let startAge: number | null = null;
  for (let i = currentIdx - 2; i >= 0; i--) {
    if (isDirectWealthPeriod(periods[i])) {
      if (endAge === null) endAge = periods[i].endAge;
      startAge = periods[i].startAge;
    } else if (endAge !== null) {
      break; // 연속 구간이 끊기면 멈춘다(그보다 더 앞은 별도 시기로 취급하지 않음)
    }
  }
  if (startAge === null || endAge === null) return null;
  return { startAge, endAge };
}
