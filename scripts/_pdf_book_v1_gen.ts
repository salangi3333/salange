// [2026-09 「평생운명록」 PDF 전면 재설계 — 전체 책 v1 로컬 검증 스크립트]
// 기존 상품 경로(lib/reportPdf.tsx의 generateReportPdfBuffer/renderReportPdfHtml,
// components/pdf/ReportPdfDocument.tsx, 45p 구버전)는 전혀 호출하지 않는다.
//
// [2026-09-11 lib/generateBookPdfBuffer.ts 추가 후 — 완전히 얇은 wrapper로
// 전환] 예전에는 이 파일 자체가 loadImageSlot/HTML 조립/puppeteer 실행을
// 전부 직접 갖고 있었다. 이제는 그 로직 전부가 lib/generateBookPdfBuffer.ts
// (+lib/pdfBookAssets.ts, lib/pdfBookHtml.ts)로 옮겨져, 서버 Buffer 생성
// 함수와 **완전히 동일한 함수**를 이 스크립트도 그대로 호출한다(로컬에서는
// process.env.VERCEL이 없어 자동으로 일반 puppeteer 경로를 탄다 — 코드
// 분기 없이 자연스럽게). 이 파일은 이제 "그 함수를 부르고 결과를 파일로
// 저장"하는 것 말고는 아무 로직도 없다.
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { IntakeFormData } from "../lib/sajuEngine";
import { generateBookPdfBuffer } from "../lib/generateBookPdfBuffer";

async function generateFor(intake: IntakeFormData) {
  const t0 = Date.now();
  const buf = await generateBookPdfBuffer(intake);
  const ms = Date.now() - t0;

  const outDir = join(__dirname, "..", ".pdf-proto-out", "book-v1");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, `book_${intake.name}.pdf`);
  writeFileSync(outPath, buf);
  console.log(JSON.stringify({ name: intake.name, outPath, bytes: buf.length, ms }));
  return { outPath, bytes: buf.length, ms };
}

async function main() {
  await generateFor({
    name: "김철수", gender: "male", calendarType: "solar", isLeapMonth: false,
    year: 1985, month: 6, day: 20, hour: 14, minute: 0, timeUnknown: false,
  });
  await generateFor({
    name: "이서연", gender: "female", calendarType: "solar", isLeapMonth: false,
    year: 1992, month: 11, day: 3, hour: 8, minute: 30, timeUnknown: false,
  });
}

main().catch((e) => {
  console.error("book v1 생성 실패:", e);
  process.exit(1);
});
