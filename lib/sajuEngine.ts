import { Lunar, Solar } from "lunar-javascript";
import {
  Element,
  GAN_HANGUL,
  ZHI_HANGUL,
  GAN_ELEMENT,
  ZHI_ELEMENT,
  SIPSEONG_KO,
  DI_SHI_KO,
  getSinsalName,
  isCheoneulGwiin,
} from "./hanjaTables";
import { NatalRaw, PillarExtra } from "@/types";
import { validateBirthDate } from "./validateBirthInput";

export interface IntakeFormData {
  name: string;
  gender: "male" | "female";
  calendarType: "solar" | "lunar";
  isLeapMonth: boolean;
  year: number;
  month: number;
  day: number;
  hour: number | null;
  minute: number;
  timeUnknown: boolean;
}

export interface PillarResult {
  hanja: string;
  hangul: string;
  element: Element;
  sipseong: string;
}

export interface DaYunItem {
  startAge: number;
  endAge: number;
  ganZhi: string;
}

export interface SajuCalculation {
  dayGan: string;
  dayMasterElement: Element;
  pillars: {
    year: PillarResult;
    month: PillarResult;
    day: PillarResult;
    hour: PillarResult | null;
  };
  branches: {
    year: PillarResult;
    month: PillarResult;
    day: PillarResult;
    hour: PillarResult | null;
  };
  sinsal: string[];
  daYun: DaYunItem[];
  solarDateLabel: string;
  lunarDateLabel: string;
  charCount: number;
  chars: string[];
  birthYear: number;
  /** CALCULATION층 raw 값(지장간/12운성/공망/납음). 01장 화면에 바로 쓰지
   * 않는다 — 새 계산이 아니라 lunar-javascript가 이미 반환하는 값을 그대로
   * 옮겨 담을 뿐이다. */
  natal: NatalRaw;
}

function buildPillar(gan: string, sipseongRaw: string): PillarResult {
  return {
    hanja: gan,
    hangul: GAN_HANGUL[gan],
    element: GAN_ELEMENT[gan],
    sipseong: SIPSEONG_KO[sipseongRaw] || sipseongRaw,
  };
}

function buildBranch(zhi: string, sipseongRaw: string): PillarResult {
  return {
    hanja: zhi,
    hangul: ZHI_HANGUL[zhi],
    element: ZHI_ELEMENT[zhi],
    sipseong: SIPSEONG_KO[sipseongRaw] || sipseongRaw,
  };
}

function buildPillarExtra(hideGan: string[], diShiRaw: string): PillarExtra {
  return {
    hideGan,
    diShi: DI_SHI_KO[diShiRaw] || diShiRaw,
  };
}

export function calculateSaju(input: IntakeFormData): SajuCalculation {
  // 방어 검증(2중 적용의 두 번째 층) — 폼(IntakeForm.tsx)이 이미 걸러줬어야
  // 하지만, 쿼리스트링 진입(app/result-v2/page.tsx)처럼 폼을 거치지 않는
  // 경로도 있어 여기서도 반드시 다시 확인한다. 존재하지 않는 날짜/윤달이면
  // 계산을 진행하지 않고 한국어 메시지가 담긴 Error를 던진다 — 호출부가
  // 이걸 잡아서 사용자에게 보여준다.
  const dateError = validateBirthDate(input);
  if (dateError) {
    throw new Error(dateError);
  }

  let y = input.year;
  let m = input.month;
  let d = input.day;

  if (input.calendarType === "lunar") {
    const lunarInput = Lunar.fromYmd(y, input.isLeapMonth ? -m : m, d);
    const solarFromLunar = lunarInput.getSolar();
    y = solarFromLunar.getYear();
    m = solarFromLunar.getMonth();
    d = solarFromLunar.getDay();
  }

  const hh = input.timeUnknown ? 12 : input.hour ?? 12;
  const mm = input.timeUnknown ? 0 : input.minute ?? 0;

  const solar = Solar.fromYmdHms(y, m, d, hh, mm, 0);
  const lunar = solar.getLunar();
  const ec = lunar.getEightChar();

  const yearGan = ec.getYearGan();
  const yearZhi = ec.getYearZhi();
  const monthGan = ec.getMonthGan();
  const monthZhi = ec.getMonthZhi();
  const dayGan = ec.getDayGan();
  const dayZhi = ec.getDayZhi();
  const timeGan = ec.getTimeGan();
  const timeZhi = ec.getTimeZhi();

  const pillars: SajuCalculation["pillars"] = {
    year: buildPillar(yearGan, ec.getYearShiShenGan()),
    month: buildPillar(monthGan, ec.getMonthShiShenGan()),
    day: buildPillar(dayGan, ec.getDayShiShenGan()),
    hour: input.timeUnknown ? null : buildPillar(timeGan, ec.getTimeShiShenGan()),
  };

  const branches: SajuCalculation["branches"] = {
    year: buildBranch(yearZhi, ec.getYearShiShenZhi()[0]),
    month: buildBranch(monthZhi, ec.getMonthShiShenZhi()[0]),
    day: buildBranch(dayZhi, ec.getDayShiShenZhi()[0]),
    hour: input.timeUnknown ? null : buildBranch(timeZhi, ec.getTimeShiShenZhi()[0]),
  };

  const knownBranches = [yearZhi, monthZhi, dayZhi];
  if (!input.timeUnknown) knownBranches.push(timeZhi);

  const sinsalSet = new Set<string>();
  knownBranches.forEach((zhi) => {
    sinsalSet.add(getSinsalName(yearZhi, zhi));
    if (isCheoneulGwiin(dayGan, zhi)) {
      sinsalSet.add("천을귀인");
    }
  });

  const genderCode = input.gender === "male" ? 1 : 0;
  const yun = ec.getYun(genderCode);
  const daYunRaw = yun.getDaYun();
  const daYun: DaYunItem[] = daYunRaw
    .filter((dy: any) => dy.getGanZhi())
    .slice(0, 8)
    .map((dy: any) => ({
      startAge: dy.getStartAge(),
      endAge: dy.getEndAge(),
      ganZhi: dy.getGanZhi(),
    }));

  const chars = input.timeUnknown
    ? [dayGan, monthGan, yearGan, dayZhi, monthZhi, yearZhi]
    : [timeGan, dayGan, monthGan, yearGan, timeZhi, dayZhi, monthZhi, yearZhi];

  const natal: NatalRaw = {
    pillars: {
      year: buildPillarExtra(ec.getYearHideGan(), ec.getYearDiShi()),
      month: buildPillarExtra(ec.getMonthHideGan(), ec.getMonthDiShi()),
      day: buildPillarExtra(ec.getDayHideGan(), ec.getDayDiShi()),
      hour: input.timeUnknown ? null : buildPillarExtra(ec.getTimeHideGan(), ec.getTimeDiShi()),
    },
    dayXunKong: ec.getDayXunKong(),
    dayNaYin: ec.getDayNaYin(),
  };

  return {
    dayGan,
    dayMasterElement: GAN_ELEMENT[dayGan],
    pillars,
    branches,
    sinsal: Array.from(sinsalSet),
    daYun,
    solarDateLabel: solar.toYmd(),
    lunarDateLabel: lunar.toString(),
    charCount: input.timeUnknown ? 6 : 8,
    chars,
    birthYear: y,
    natal,
  };
}
