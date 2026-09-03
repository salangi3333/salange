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
    // [임시 QA용, 검수 끝나면 제거] &paid=1 을 붙이면 유료 화면(제4~8장
    // 포함)을 미리 볼 수 있다. 이 파일은 이미 자체 주석대로 "개발/QA용"
    // 진입 경로이고, 실제 결제 판정(lib/orderStore.ts의 isReportPaid,
    // app/result-v2/[reportId]/page.tsx)은 전혀 건드리지 않는다 — 그쪽은
    // 여전히 DB(orders 테이블)만 보고 결제 여부를 판정한다.
    const previewPaid = readParam(searchParams, "paid") === "1";
    // 쿼리스트링은 폼 검증을 거치지 않고 바로 들어오는 경로라, 여기서도
    // calculateSaju의 방어 검증(validateBirthDate)에 걸릴 수 있다 — 그 경우
    // 화면이 깨지는 대신 안내 문구만 보여준다(개발/테스트용 진입 경로라
    // 별도 재입력 폼은 두지 않는다).
    try {
      return (
        <ResultLandingV2
          report={buildReportResult(buildAppData(intake), intake.gender)}
          isPaid={previewPaid}
        />
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : "입력하신 생년월일을 다시 확인해주세요.";
      return (
        <section className="mx-auto flex min-h-screen max-w-content flex-col items-center justify-center px-6 text-center">
          <p className="font-serif-kr text-lg font-bold text-textMain">{message}</p>
        </section>
      );
    }
  }

  return <ResultV2Flow />;
}
