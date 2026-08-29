import ResultLandingV2 from "@/components/ResultLandingV2";
import { getReportInput } from "@/lib/reportStore";
import { buildAppData } from "@/lib/sajuContent";
import { buildReportResult } from "@/lib/reportMapper";

/**
 * DB + reportId + 영구 재접속 구조의 핵심 route.
 *
 * 여기서 사주 계산 로직을 새로 만들지 않는다 — DB에서 저장된 입력값을
 * 그대로 복원해 기존 검증된 파이프라인(buildAppData → buildReportResult,
 * 그 안에서 calculateSaju 호출)에 그대로 넘긴다. 화면(ResultLandingV2)도
 * 기존 client-state 경로(components/ResultV2Flow.tsx)와 완전히 같은
 * 컴포넌트를 그대로 재사용한다 — 새 렌더링 로직 없음.
 *
 * app/result-v2/page.tsx(쿼리스트링 진입, 개발/QA용)는 이 파일과 별개로
 * 그대로 둔다 — 이 파일은 실제 고객이 결제 전/후로 다시 접속할 "영구
 * URL"만 새로 담당한다.
 */

function ErrorScreen({ message }: { message: string }) {
  return (
    <section className="mx-auto flex min-h-screen max-w-content flex-col items-center justify-center px-6 text-center">
      <p className="font-serif-kr text-lg font-bold text-textMain">{message}</p>
    </section>
  );
}

export default async function ResultV2ReportPage({
  params,
}: {
  params: { reportId: string };
}) {
  // DB 조회 실패(연결 문제 등)와 "존재하지 않는 reportId"를 구분해서
  // 다른 안내 문구를 보여준다 — undefined=조회 자체가 실패, null=형식은
  // 맞거나 조회는 됐지만 그 reportId의 리포트가 없음(또는 형식이 아예
  // UUID가 아님, getReportInput 내부에서 같이 처리).
  let input;
  try {
    input = await getReportInput(params.reportId);
  } catch (e) {
    console.error(
      "[result-v2/[reportId]] report 조회 실패:",
      e instanceof Error ? e.message : e
    );
    return <ErrorScreen message="리포트를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요." />;
  }

  if (!input) {
    return <ErrorScreen message="유효하지 않거나 존재하지 않는 리포트입니다." />;
  }

  try {
    const appData = buildAppData(input);
    const report = buildReportResult(appData, input.gender);
    return <ResultLandingV2 report={report} />;
  } catch (e) {
    // calculateSaju의 방어 검증(validateBirthDate)에 걸릴 가능성은 이미
    // POST /api/reports에서 저장 전에 한 번 걸러졌지만, 혹시 모를 경우에도
    // 화면이 깨지지 않도록 동일하게 방어한다.
    const message =
      e instanceof Error ? e.message : "리포트를 불러오는 중 문제가 발생했습니다.";
    return <ErrorScreen message={message} />;
  }
}
