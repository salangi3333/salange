// [2026-09 사랑 장 웹 회귀 확인 — 코드 수정 없이 순수 조회용]
// 실제 production 컴포넌트(components/ResultLandingV2.tsx)를 그대로
// 가져와 isPaid=true로 렌더링한다. app/result-v2/*.tsx 등 실제 라우트
// 파일은 전혀 건드리지 않고(isPaid=false 보안 고정 그대로 유지), DB에도
// 아무것도 쓰지 않는다 — 순수하게 화면 확인용 throwaway 스크립트.
import { writeFileSync } from "fs";
import { join } from "path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildAppData } from "../lib/sajuContent";
import { buildReportResult } from "../lib/reportMapper";
import { IntakeFormData } from "../lib/sajuEngine";
import ResultLandingV2 from "../components/ResultLandingV2";

function genFor(intake: IntakeFormData, cssHrefs: string[]) {
  const appData = buildAppData(intake);
  const report = buildReportResult(appData, intake.gender);
  const bodyHtml = renderToStaticMarkup(
    React.createElement(ResultLandingV2, { report, isPaid: true })
  );
  const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
${cssHrefs.map((h) => `<link rel="stylesheet" href="${h}">`).join("\n")}
</head>
<body>${bodyHtml}</body>
</html>`;
  const outPath = join(__dirname, "..", ".pdf-proto-out", "web-qa", `love_${intake.name}.html`);
  writeFileSync(outPath, html);
  console.log(JSON.stringify({ name: intake.name, outPath }));
}

const cssHrefs = [
  "http://localhost:3000/_next/static/css/app/layout.css?v=1789014635985",
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css",
];

genFor({ name: "김철수", gender: "male", calendarType: "solar", isLeapMonth: false, year: 1985, month: 6, day: 20, hour: 14, minute: 0, timeUnknown: false }, cssHrefs);
genFor({ name: "이서연", gender: "female", calendarType: "solar", isLeapMonth: false, year: 1992, month: 11, day: 3, hour: 8, minute: 30, timeUnknown: false }, cssHrefs);
