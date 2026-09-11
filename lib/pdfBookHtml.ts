import React from "react";
import { buildAppData } from "./sajuContent";
import { buildReportResult } from "./reportMapper";
import { IntakeFormData } from "./sajuEngine";
import { formatGeneratedAt, renderHanjiBookHtml } from "./reportPdf";
import ReportPdfBookDocument from "@/components/pdf/ReportPdfBook";
import { BookFairySlots } from "./pdfBookAssets";

/**
 * 평생운명록(book) PDF의 "완성된 HTML 문자열"을 만드는 단 하나의 함수 —
 * scripts/_pdf_book_v1_gen.ts(로컬 puppeteer)와
 * lib/generateBookPdfBuffer.ts(서버 puppeteer-core+chromium)가 **똑같이**
 * 이 함수만 호출한다. 계산(buildAppData/buildReportResult)도, 조립
 * (ReportPdfBookDocument)도, 최종 HTML 포장(renderHanjiBookHtml)도 전부
 * 기존에 이미 승인·검증된 그대로 재사용한다 — 이 함수는 그것들을 순서대로
 * 부르기만 할 뿐 새 렌더링 로직을 전혀 추가하지 않는다.
 *
 * 절대 lib/reportPdf.tsx의 renderReportPdfHtml/generateReportPdfBuffer(구
 * ReportPdfDocument 45p 경로)는 참조하지 않는다 — 지시에 따라 최신
 * 61p(현재 60p 실측) book 경로만 쓴다.
 */
export async function buildBookPdfHtml(intake: IntakeFormData, fairies: BookFairySlots, generatedAt?: string): Promise<string> {
  // [2026-09-11 수정] 정적 `import ... from "react-dom/server"`를 쓰면
  // Next.js App Router 빌드가 "You're importing a component that imports
  // react-dom/server" 에러로 이 파일을 참조하는 모든 route/page의 빌드
  // 자체를 막는다(app/api/pdf-verify-temp/route.ts 실제 빌드에서 확인됨,
  // 추측 아님). 렌더링 로직은 전혀 바꾸지 않고, 같은 renderToStaticMarkup을
  // 함수 실행 시점에 동적 import로만 불러오도록 바꿔 이 정적 분석 제약을
  // 우회한다.
  const { renderToStaticMarkup } = await import("react-dom/server");

  const appData = buildAppData(intake);
  const report = buildReportResult(appData, intake.gender);

  const bodyHtml = renderToStaticMarkup(
    React.createElement(ReportPdfBookDocument, {
      report,
      generatedAt: generatedAt ?? formatGeneratedAt(),
      intake,
      appData,
      fairies,
    })
  );

  return renderHanjiBookHtml(bodyHtml);
}
