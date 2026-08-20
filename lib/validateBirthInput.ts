import { Lunar } from "lunar-javascript";
import type { IntakeFormData } from "./sajuEngine";

/**
 * 출시 전 기능 안전성 수정 — 존재하지 않는 날짜(예: 2월 30일, 4/6/9/11월
 * 31일, 평년 2월 29일)와 존재하지 않는 음력 윤달을 계산 전에 걸러낸다.
 * UI(IntakeForm.tsx)와 계산 엔진 진입부(sajuEngine.ts calculateSaju) 양쪽에서
 * 이 함수 하나를 공유해서 이중으로 검증한다 — 로직이 두 곳에 따로
 * 있지 않도록 단일 소스로 둔다.
 *
 * 새 명리 계산/해석 로직 아님 — 순수 입력값 검증만 한다.
 */

function isSolarLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

const SOLAR_DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function daysInSolarMonth(year: number, month: number): number {
  if (month === 2 && isSolarLeapYear(year)) return 29;
  return SOLAR_DAYS_IN_MONTH[month - 1];
}

/**
 * 생년월일(및 윤달) 입력이 실제로 존재하는 날짜인지 검사한다.
 * 문제 없으면 null, 문제가 있으면 한국어 오류 메시지를 반환한다.
 * (시간/이름 등 다른 필드는 검사하지 않는다 — 그건 폼에서 별도로 본다.)
 */
export function validateBirthDate(
  input: Pick<IntakeFormData, "calendarType" | "isLeapMonth" | "year" | "month" | "day">
): string | null {
  const { calendarType, isLeapMonth, year, month, day } = input;

  if (!year || !month || !day) {
    return "생년월일을 정확히 입력해주세요.";
  }
  if (month < 1 || month > 12) {
    return "월을 다시 확인해주세요 (1~12월).";
  }
  if (day < 1) {
    return "일을 다시 확인해주세요.";
  }

  if (calendarType === "solar") {
    const maxDay = daysInSolarMonth(year, month);
    if (day > maxDay) {
      return `${year}년 ${month}월은 ${maxDay}일까지만 있습니다. 날짜를 다시 확인해주세요.`;
    }
    return null;
  }

  // 음력(윤달 포함) — 실제 존재하는 날짜인지는 lunar-javascript가 가장
  // 정확히 알고 있다(달마다 29/30일이 달라 고정 표로 검증할 수 없음).
  // 존재하지 않으면 예외를 던지므로, 그 예외를 사용자용 메시지로 바꾼다.
  try {
    Lunar.fromYmd(year, isLeapMonth ? -month : month, day);
    return null;
  } catch {
    if (isLeapMonth) {
      return `선택하신 연도에는 ${month}월의 윤달이 없습니다. 음력 날짜를 다시 확인해주세요.`;
    }
    return `입력하신 음력 날짜(${year}년 ${month}월 ${day}일)가 존재하지 않습니다. 날짜를 다시 확인해주세요.`;
  }
}
