import ResultLandingV2 from "@/components/ResultLandingV2";
import { IntakeFormData } from "@/lib/sajuEngine";
import { buildAppData } from "@/lib/sajuContent";
import { buildReportResult } from "@/lib/reportMapper";

/**
 * 기존 gate → form → analyzing → result 흐름(app/page.tsx)과 완전히
 * 분리된 새 경로 — 이 파일은 그 흐름을 전혀 건드리지 않는다.
 *
 * 실제 개인화 데이터로 미리보기하려면 쿼리스트링으로 생년월일시를 넘긴다.
 * 예: /result-v2?year=1990&month=3&day=14&hour=8&minute=30&gender=male
 * 쿼리가 없으면(=오늘 기존 사용자가 보는 상태) report를 넘기지 않고,
 * ResultLandingV2는 지금까지와 동일한 자리채움 기본값(DEFAULT_REPORT)을
 * 그대로 보여준다 — 이 페이지가 아직 실제 gate/form 흐름에 연결된 건
 * 아니라는 뜻이다(다음 단계).
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
  const report = intake ? buildReportResult(buildAppData(intake)) : undefined;

  return <ResultLandingV2 report={report} />;
}
