import type { Metadata } from "next";
import ResultLandingV2 from "@/components/ResultLandingV2";
import { getReportInput } from "@/lib/reportStore";
import { isReportPaid } from "@/lib/orderStore";
import { buildAppData } from "@/lib/sajuContent";
import { buildReportResult } from "@/lib/reportMapper";

/**
 * 개인정보·보안 감사(2026-09)에서 확인된 미비점 보완 — 이 라우트는 이름·
 * 생년월일시가 포함된 개인 리포트를 보여준다. 검색엔진이 이 페이지를
 * 크롤링·색인하면 링크가 어딘가에 한 번이라도 노출됐을 때 영구히 검색결과에
 * 남을 수 있으므로, 모든 reportId 인스턴스에 noindex/nofollow를 적용한다.
 * title/description은 루트 레이아웃의 일반 문구를 그대로 상속하며, 이 파일은
 * 별도의 title/description을 생성하지 않는다 — 이름이나 reportId가 메타데이터
 * (title, description, Open Graph 등)에 노출될 경로 자체를 만들지 않기 위함.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

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

  // 결제 여부는 서버(orders 테이블)가 판정한다 — client가 query string이나
  // localStorage로 이 값을 만들어낼 방법이 없다(TossPayments 1차 구현,
  // 승인된 작업). 조회 자체가 실패해도(DB 일시 오류 등) 결제 안 된 것으로
  // 보수적으로 처리한다 — 실패 시 유료 콘텐츠가 열리는 방향으로는 절대
  // 넘어가지 않는다.
  let paid = false;
  try {
    paid = await isReportPaid(params.reportId);
  } catch (e) {
    console.error(
      "[result-v2/[reportId]] 결제상태 조회 실패:",
      e instanceof Error ? e.message : e
    );
  }

  try {
    const appData = buildAppData(input);
    const report = buildReportResult(appData, input.gender);
    return <ResultLandingV2 report={report} reportId={params.reportId} isPaid={paid} />;
  } catch (e) {
    // calculateSaju의 방어 검증(validateBirthDate)에 걸릴 가능성은 이미
    // POST /api/reports에서 저장 전에 한 번 걸러졌지만, 혹시 모를 경우에도
    // 화면이 깨지지 않도록 동일하게 방어한다.
    const message =
      e instanceof Error ? e.message : "리포트를 불러오는 중 문제가 발생했습니다.";
    return <ErrorScreen message={message} />;
  }
}
