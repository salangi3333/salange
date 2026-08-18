import ResultLandingV2 from "@/components/ResultLandingV2";
import ResultV2Flow from "@/components/ResultV2Flow";
import { IntakeFormData } from "@/lib/sajuEngine";
import { buildAppData } from "@/lib/sajuContent";
import { buildReportResult } from "@/lib/reportMapper";

/**
 * 기존 gate → form → analyzing → result 흐름(app/page.tsx)과 완전히
 * 분리된 새 경로 — 이 파일은 그 흐름을 전혀 건드리지 않는다.
 *
 * 쿼리스트링으로 생년월일시를 넘기면(빠른 확인/테스트용) 그 값으로 바로
 * ResultLandingV2를 렌더링한다.
 * 예: /result-v2?year=1990&month=3&day=14&hour=8&minute=30&gender=male
 *
 * 쿼리가 없으면(=실제 사용자가 이 경로로 처음 들어온 상태) <ResultV2Flow/>가
 * 이름/성별/생년월일/출생시간 입력 → 선녀 전환 화면 → 결과 진입까지의
 * 실제 흐름을 처리한다(components/ResultV2Flow.tsx 참고).
 *
 * calculateSaju/buildAppData/buildReportResult 외 새 계산 로직은 없다.
 */
function readParam(
  searchParams: { [key: string]: string | string[] | undefined },
  key: string
): string | undefined {
  const v = searchParams[key];
  return Array.isArray(v) ? v[0] : v;
}

function parseIntakeFromQuery(searchParams: {
  [key: string]: string | string[] | undefined;
}): IntakeFormData | null {
  const year = readParam(searchParams, "year");
  const month = readParam(searchParams, "month");
  const day = readParam(searchParams, "day");
  if (!year || !month || !day) return null;

  const hourParam = readParam(searchParams, "hour");
  const timeUnknown = !hourParam;

  return {
    name: readParam(searchParams, "name") || "게스트",
    gender: readParam(searchParams, "gender") === "female" ? "female" : "male",
    calendarType: readParam(searchParams, "calendarType") === "lunar" ? "lunar" : "solar",
    isLeapMonth: readParam(searchParams, "leap") === "1",
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: timeUnknown ? null : Number(hourParam),
    minute: Number(readParam(searchParams, "minute") ?? "0"),
    timeUnknown,
  };
}

export default function ResultV2Page({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const intake = parseIntakeFromQuery(searchParams);
  if (intake) {
    return <ResultLandingV2 report={buildReportResult(buildAppData(intake))} />;
  }

  return <ResultV2Flow />;
}
