// [2026-09 「평생운명록」 PDF 전면 재설계 — 전체 책 v1 생성기]
// 45p 전체를 새 디자인 시스템(components/pdf/ReportPdfBook.tsx)으로
// 다시 조립해 실제 A4 PDF로 렌더링한다. 기존 상품 경로
// (lib/reportPdf.tsx의 generateReportPdfBuffer/renderReportPdfHtml,
// components/pdf/ReportPdfDocument.tsx)는 전혀 호출하지 않는다 —
// 완전히 분리된 throwaway 검증 스크립트.
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import puppeteer from "puppeteer";
import { buildAppData } from "../lib/sajuContent";
import { buildReportResult } from "../lib/reportMapper";
import { IntakeFormData } from "../lib/sajuEngine";
import { renderHanjiBookHtml } from "../lib/reportPdf";
import { FairyImageSlot } from "../components/pdf/ReportPdfPrototype";
import ReportPdfBookDocument from "../components/pdf/ReportPdfBook";

function loadImageSlot(baseName: string): FairyImageSlot {
  const dir = join(process.cwd(), "public", "pdf-assets");
  const candidates = [`${baseName}.jpg`, `${baseName}.png`, `${baseName}.webp`];
  for (const name of candidates) {
    const p = join(dir, name);
    if (existsSync(p)) {
      const buf = readFileSync(p);
      const ext = name.endsWith(".png") ? "png" : name.endsWith(".webp") ? "webp" : "jpeg";
      return { dataUri: `data:image/${ext};base64,${buf.toString("base64")}`, expectedPath: `public/pdf-assets/${name}` };
    }
  }
  return { dataUri: null, expectedPath: `public/pdf-assets/${baseName}.png (아직 없음)` };
}

async function generateFor(intake: IntakeFormData) {
  const appData = buildAppData(intake);
  const report = buildReportResult(appData, intake.gender);

  const fairies = {
    cover: loadImageSlot("fairy-cover"),
    benjil: loadImageSlot("fairy-destiny-mountain"),
    chapter: loadImageSlot("fairy-writing"),
    wayOfLife: loadImageSlot("fairy-water-reflection"),
    love: loadImageSlot("fairy-love-letter"),
    wealth: loadImageSlot("fairy-scroll"),
    lifeTransition: loadImageSlot("fairy-turning-point"),
    tenYear: loadImageSlot("fairy-future-window"),
    gwiin: loadImageSlot("fairy-lantern"),
    ending: loadImageSlot("fairy-cover"),
    tenYearBg: loadImageSlot("ten-year-flow-background"),
    letterBg: loadImageSlot("paljamun-ink-background-seal"),
  };

  const bodyHtml = renderToStaticMarkup(
    React.createElement(ReportPdfBookDocument, {
      report,
      generatedAt: "2026년 9월 9일",
      intake,
      appData,
      fairies,
    })
  );
  const html = renderHanjiBookHtml(bodyHtml);

  const t0 = Date.now();
  const browser = await puppeteer.launch({ headless: true });
  let buf: Buffer;
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({ format: "A4", printBackground: true });
    buf = Buffer.from(pdf);
  } finally {
    await browser.close();
  }
  const ms = Date.now() - t0;

  const outDir = join(__dirname, "..", ".pdf-proto-out", "book-v1");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, `book_${intake.name}.pdf`);
  writeFileSync(outPath, buf);
  console.log(JSON.stringify({ name: intake.name, outPath, bytes: buf.length, ms }));
  return { report, outPath };
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
