import React from "react";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { renderToStaticMarkup } from "react-dom/server";
import puppeteer from "puppeteer";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import ReportPdfDocument from "@/components/pdf/ReportPdfDocument";
import { ReportResult } from "./reportMapper";
import { IntakeFormData } from "./sajuEngine";
import { AppData } from "./sajuContent";
import { FairyImageSlot } from "@/components/pdf/ReportPdfPrototype";

/**
 * PDF 생성 — 서버 전용(lib/db.ts, lib/tossPayments.ts와 동일한 원칙: "use
 * client" 파일에서 import하지 않는다). 이 파일은 이미 계산된 ReportResult
 * 하나만 입력으로 받는다 — 사주 계산도, 새 문장 생성도 여기서 하지 않는다.
 *
 * 렌더링 방식: components/pdf/ReportPdfDocument.tsx를 Next.js 페이지가
 * 아니라 순수 문자열(renderToStaticMarkup)로 만든 뒤, 그 HTML 문자열을
 * Puppeteer의 page.setContent()에 직접 넣는다 — 실제 서버 라우트를 띄우고
 * 그 URL에 접속하는 방식이 아니다. 이유:
 *   - 인증/무료-유료 판정을 다시 거칠 필요가 없다(이미 결제 확인된 뒤에만
 *     이 함수가 호출된다는 전제 — 호출부 책임).
 *   - 로컬 개발 환경과 실제 서버 환경에서 완전히 동일한 코드 경로로 동작한다.
 *
 * 지금 쓰는 `puppeteer`(전체 패키지, 로컬 Chromium 포함)는 이 단계(스키마+
 * 인쇄 레이아웃 검증)의 로컬 테스트용이다. 실제 Vercel 배포에 연결할 때는
 * 서버리스 환경에 맞게 `puppeteer-core` + `@sparticuz/chromium` 조합으로
 * 교체가 필요하다 — 이번 단계 범위 밖(Resend/관리자 연동과 함께 다음
 * 단계에서 진행).
 */

const GENERATED_AT_TZ = "Asia/Seoul";

export function formatGeneratedAt(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: GENERATED_AT_TZ,
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

/** 인쇄 전용 CSS — 화면(tailwind.config.js의 scene 팔레트)과 의도적으로
 * 분리된 별도 톤이다. 화면은 짙은 배경+금색이지만, 인쇄물은 밝은 종이톤+
 * 진한 잉크색이 실제로 인쇄했을 때 더 실용적이라 판단해 새로 정했다
 * (디자인 판단이지 계산/문구 변경이 아니다). */
const PDF_STYLE = `
  @page { size: A4; margin: 22mm 18mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: "Noto Serif KR", "Batang", "맑은 고딕", serif;
    color: #2B2622;
    background: #FDFBF5;
    font-size: 10.5pt;
    line-height: 1.9;
    word-break: keep-all;
    overflow-wrap: break-word;
    /* 문단이 페이지를 넘어가더라도 첫/마지막 줄이 한 줄만 혼자 남지
       않게 한다(고아줄/과부줄 방지) — 그래도 개별 블록이 짧으면 아래
       break-inside: avoid(레거시 page-break-inside 포함)가 우선 적용된다. */
    orphans: 3;
    widows: 3;
  }
  .doc { width: 100%; }
  .cover {
    break-after: page;
    page-break-after: always;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    min-height: 220mm;
  }
  .brand { font-size: 26pt; font-weight: 700; color: #6B4A1F; margin: 0 0 4pt; letter-spacing: 2pt; }
  .brand-sub { font-size: 9pt; color: #8B7257; margin: 0 0 24pt; letter-spacing: 1pt; }
  .cover-name { font-size: 18pt; margin: 0 0 10pt; }
  .cover-summary { font-size: 11pt; color: #55493B; margin: 0 0 4pt; }
  .cover-daymaster { font-size: 10pt; color: #8B7257; margin: 0 0 40pt; }
  .cover-date { font-size: 9pt; color: #8B7257; }

  .chapter { break-before: page; page-break-before: always; padding-top: 2mm; }
  .chapter-title { margin-bottom: 14pt; }
  .chapter-label { display: block; font-size: 13pt; font-weight: 700; color: #6B4A1F; letter-spacing: 3pt; }
  .chapter-heading { font-size: 16pt; margin: 4pt 0 0; }
  .small-heading { font-size: 14pt; }

  .subheading { font-size: 12pt; font-weight: 700; margin: 18pt 0 6pt; color: #4A3E2F; }
  .subsection { break-inside: avoid; page-break-inside: avoid; margin-bottom: 10pt; }
  .year-heading { font-size: 10.5pt; font-weight: 700; margin: 0 0 4pt; }

  .p { margin: 0 0 10pt; }
  .p.small { font-size: 9pt; color: #6B6153; }
  .p.lead { font-size: 11.5pt; font-weight: 700; color: #4A3E2F; }
  .p.callout {
    border-left: 3pt solid #9C3B2E;
    background: #F7EDEA;
    padding: 8pt 10pt;
    margin: 12pt 0;
    font-weight: 700;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .p.ivory-card {
    border: 1pt solid #D9CBB0;
    background: #F5EFE1;
    padding: 10pt 12pt;
    margin: 12pt 0;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  table { border-collapse: collapse; width: 100%; margin: 10pt 0 16pt; break-inside: avoid; page-break-inside: avoid; }
  th, td { border: 0.75pt solid #D9CBB0; padding: 5pt 6pt; text-align: center; font-size: 9pt; vertical-align: top; }
  th { background: #F0E7D3; font-weight: 700; }
  .pillar-table .hanja { font-size: 13pt; font-weight: 700; }
  .pillar-table .sub { font-size: 7.5pt; color: #6B6153; }
  .pillar-table .day-cell { background: #FBF3E1; }

  .element-block { margin-bottom: 8pt; }
  .element-list { list-style: none; padding: 0; margin: 0 0 8pt; display: flex; gap: 14pt; flex-wrap: wrap; }
  .element-list li { font-size: 9.5pt; }
  .element-name { font-weight: 700; margin-right: 3pt; }

  /* [2026-09 PDF 디자인 마스터, 실물 PDF 육안 검수에서 발견] min-height:220mm는
     @page 인쇄 영역(297mm - 상하 여백 44mm = 253mm)보다 작아서, 이 박스
     아래 남는 여백에는 이 박스 자신의 배경이 아니라 body(문서 전체
     그라데이션) 배경이 그대로 비쳐 보였다 — 문서가 30+ 페이지로 길어
     마지막 페이지 근처에서 그 그라데이션 진행률이 어긋나 눈에 띄는 색
     이음매로 나타났다. .premium-section-page가 이미 겪고 고친 것과 동일한
     원인(짧게 끝난 박스는 인쇄 페이지 전체를 채우지 못한다)이라, 그때와
     똑같이 min-height를 실제 인쇄 영역 높이에 맞춰 250mm로 늘려 박스
     자신의 배경(자신에게 새로 지정)이 페이지 전체를 덮게 한다. */
  .closing-page {
    break-before: page; page-break-before: always; display: flex; align-items: center; justify-content: center;
    min-height: 250mm; text-align: center;
    background: linear-gradient(175deg, #FBF6EA 0%, #F5EDDB 100%);
  }
`;

/** ["팔자문 프리미엄 PDF 디자인 시스템" 프로토타입, 2026-09] — 표지/속표지/
 * 목차 전용 스타일. 기존 PDF_STYLE을 대체하지 않고 추가로 합쳐서 쓴다
 * (renderPrototypeHtml 참고). 화면(ResultLandingV2, scene 팔레트)과는
 * 별개로, 인쇄물다운 아이보리 종이+먹빛+절제된 금빛 톤으로 새로 잡았다.
 *
 * [알려진 한계] Chromium 인쇄 CSS는 페이지마다 다른 @page margin을
 * 안정적으로 주기 어렵다(Paged Media 표준의 잘 알려진 제약) — 그래서
 * 표지 이미지를 종이 가장자리까지 완전히 채우는(full-bleed) 대신, 기존
 * @page 여백 안에서 액자처럼 프레임을 두르는 방식으로 처리했다. 실제
 * edge-to-edge 표지가 꼭 필요하면 표지 페이지만 별도 @page 규칙으로
 * 분리하는 후속 작업이 필요하다(이번 프로토타입 범위 밖).
 */
export const PROTOTYPE_STYLE = `
  .pcover {
    break-after: page; page-break-after: always;
    display: flex; flex-direction: column; align-items: center;
    min-height: 250mm;
  }
  .pcover-frame {
    position: relative;
    width: 100%; height: 245mm;
    border: 0.75pt solid #C9B48A;
    background: linear-gradient(160deg, #EFE6D2 0%, #E4D6B8 100%);
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
  }
  /* 원본 사진 자체가 인물 머리 위 여백이 거의 없는 구도라 object-position
     조정만으로는(세로 크롭 여유가 없어 가로만 잘리는 비율이라) 개선되지
     않았다 — 대신 사진 위쪽에 액자 마운트지처럼 얇은 아이보리 여백을
     남겨 인물 크기는 그대로 유지한 채 머리 위 공간만 확보한다. */
  .pcover-fairy-img { position: absolute; top: 7%; left: 0; right: 0; bottom: 0; width: 100%; height: 93%; object-fit: cover; object-position: 50% 0%; }
  .pcover-fairy-slot {
    display: flex; flex-direction: column; align-items: center; gap: 4pt;
    color: #A08A63; font-size: 9pt; letter-spacing: 1pt;
  }
  .pcover-fairy-slot-path { font-size: 7.5pt; color: #BBA97D; }

  /* 이미지 위 브랜드/이름표는 이미지 톤에 관계없이 항상 읽히도록 아주
     절제된 그라데이션(먹빛, 반투명)만 위/아래 끝에 준다 — 이미지 전체를
     어둡게 덮지 않는다. */
  .pcover-top-scrim {
    position: absolute; top: 0; left: 0; right: 0;
    padding: 16mm 10mm 22mm;
    background: linear-gradient(to bottom, rgba(43,34,22,0.62) 0%, rgba(43,34,22,0.28) 60%, rgba(43,34,22,0) 100%);
    text-align: center;
  }
  .pcover-bottom-scrim {
    position: absolute; bottom: 0; left: 0; right: 0;
    padding: 22mm 10mm 14mm;
    background: linear-gradient(to top, rgba(43,34,22,0.68) 0%, rgba(43,34,22,0.3) 65%, rgba(43,34,22,0) 100%);
    text-align: center;
  }
  .pcover-brand { font-size: 27pt; font-weight: 700; color: #D9BA7E; margin: 0; letter-spacing: 6pt; text-shadow: 0 1pt 3pt rgba(0,0,0,0.35); }
  /* [모바일 375px 실사용성 조정, 2026-09] PC(A4)에서는 문제없던 작은
     보조 텍스트가, 휴대폰에서 페이지 전체를 축소해 볼 때 흐릿해지는
     문제가 실측으로 확인됐다 — 제목/본문 계층은 그대로 두고 이 3개
     보조 텍스트만 확대 + 자간을 살짝 좁혀 축소 시에도 읽히게 한다. */
  .pcover-brand-kr { font-size: 12.5pt; color: #EDE1C8; margin: 6pt 0 0; letter-spacing: 1.2pt; font-weight: 700; }
  .pcover-tagline { font-size: 13pt; color: #F5EFE1; margin: 15pt 0 0; font-weight: 700; }
  .pcover-divider { width: 26mm; height: 0.75pt; background: #D9BA7E; margin: 0 auto 10pt; }
  .pcover-name { font-size: 14pt; font-weight: 700; color: #F5EFE1; margin: 0 0 6pt; }
  .pcover-date { font-size: 11pt; color: #EDE1C8; margin: 0; font-weight: 700; }

  .pintro {
    break-before: page; page-break-before: always;
    display: flex; flex-direction: column; align-items: center;
    min-height: 220mm; justify-content: center;
  }
  /* [속표지 재설계, 2026-09] 표지보다 훨씬 절제된 톤 — 아이보리 여백을
     넉넉히 살리고, 선녀 이미지는 작고 은은하게(장식이 아니라 "운명을
     기록하는 사람"이라는 세계관의 실마리 정도로만) 배치한다. 표지와
     경쟁하지 않도록 이미지 크기를 의도적으로 작게 유지. */
  .pintro-brand { text-align: center; font-size: 15pt; font-weight: 700; color: #6B4A1F; margin: 0; letter-spacing: 3pt; }
  /* 표지에서 확인된 모바일 375px 최소 가독 크기 기준을 속표지의 보조
     텍스트에도 동일하게 적용(일관된 QA 기준). */
  .pintro-brand-kr { text-align: center; font-size: 13.5pt; color: #8B7257; margin: 6pt 0 0; letter-spacing: 1pt; font-weight: 700; }
  .pintro-tagline-small { text-align: center; font-size: 13pt; color: #4A3E2F; margin: 13pt 0 0; font-weight: 600; }
  .pintro-portrait-wrap { display: flex; justify-content: center; margin: 20pt 0; }
  .pintro-portrait {
    width: 34mm; height: 34mm; border-radius: 50%;
    object-fit: cover; object-position: 50% 15%;
    border: 0.75pt solid #C9B48A;
  }
  .pintro-divider { width: 20mm; height: 0.75pt; background: #C9B48A; margin: 0 auto 14pt; }
  .pintro-nameplate { text-align: center; font-size: 15pt; font-weight: 700; color: #2B2622; margin: 0 0 22pt; }
  .pintro-facts { border-top: 0.75pt solid #D9CBB0; border-bottom: 0.75pt solid #D9CBB0; padding: 12pt 0; margin: 0 auto; width: 110mm; }
  .pintro-fact { display: flex; justify-content: space-between; padding: 5pt 0; font-size: 13pt; }
  .pintro-fact-label { color: #8B7257; }
  .pintro-fact-value { color: #2B2622; font-weight: 700; }

  /* [2026-09 아트디렉션 재구현] 프롤로그 — 속표지와 목차 사이. 위쪽
   * 절반은 선녀 사진(밤·원형창·달·등불) 풀블리드+페이드, 아래는 서문
   * 텍스트. ChapterOpenStack과 같은 "이미지+페이드" 문법 재사용. */
  .hprologue {
    break-before: page; page-break-before: always; min-height: 220mm;
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    padding: 0 22mm; text-align: center;
  }
  .hprologue-eyebrow { font-size: 9pt; letter-spacing: 3pt; color: #A9803D; margin: 0 0 20pt; }
  .hprologue-text { font-size: 12pt; line-height: 2; color: #4A3E2F; max-width: 130mm; margin: 0 0 16pt; }
  .hprologue-emph { font-weight: 700; color: #3A2E1C; }

  .ptoc { break-before: page; page-break-before: always; min-height: 220mm; }
  .ptoc-eyebrow { text-align: center; font-size: 9pt; letter-spacing: 3pt; color: #8B7257; margin: 0 0 8pt; }
  .ptoc-title { text-align: center; font-size: 16pt; margin: 0 0 22pt; color: #2B2622; }
  .ptoc-list { list-style: none; margin: 0; padding: 0; }
  .ptoc-item {
    display: flex; align-items: baseline; gap: 10pt;
    padding: 9pt 0; border-bottom: 0.5pt solid #E4D9C4;
  }
  .ptoc-label { font-size: 10pt; font-weight: 700; color: #6B4A1F; white-space: nowrap; }
  .ptoc-item-title { font-size: 10.5pt; color: #2B2622; }
  .ptoc-note { margin-top: 16pt; font-size: 8.5pt; color: #A08A63; text-align: center; }

  .pplate { break-before: page; page-break-before: always; break-after: page; page-break-after: always; }
  .pplate-img {
    display: block; width: 100%; height: 245mm; object-fit: cover;
    border: 0.75pt solid #C9B48A;
  }

  /* ── 대표 페이지 검증 v2(2026-09) — "A안" 다크 럭셔리 동양 운명서
   * 레퍼런스 반영. 기존 표지/속표지/목차/장구분(pcover-*/pintro-*/ptoc-*/
   * pplate-*)은 이미 승인·동결된 화면이라 전혀 건드리지 않는다. 아래
   * "d-" 계열/premium-* 클래스는 지난 라운드(아이보리 톤)에서 사용자가
   * 승인하지 않은, 아직 확정 전인 영역이라 이번에 팔레트 전체를
   * 새로 정의한다 — 지난 라운드와 이름은 같아도 색만 교체하는 게 아니라
   * "이미지+스크림" 문법(표지에서 이미 검증된 패턴)을 장 오프닝에도
   * 그대로 재사용해 "같은 책" 통일감을 준다.
   *
   * 팔레트: 먹빛/딥브라운 바탕(#1E1810~#241C14) + 아이보리 텍스트
   * (#E8DCC5/#F5EFE1) + 절제된 금(#D9BA7E/#C9A46A, 라벨·숫자·테두리에만) +
   * 매화 붉은빛(#C96B54, 강조 1곳) + 오행류 보조색(재물 그래프 카테고리).
   * 화려한 테두리 반복 금지 — 테두리는 0.75pt 한 줄, 카드 배경은 반투명
   * 금빛 저채도 틴트 하나로 통일한다. */

  .chapter-open {
    break-before: page; page-break-before: always;
    break-after: page; page-break-after: always;
  }
  .dchapter-frame {
    position: relative; width: 100%; height: 245mm; overflow: hidden;
    background: #1E1810; border: 0.75pt solid #6B5636;
  }
  .dchapter-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
  .dchapter-fallback {
    position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 4pt; color: #B7A588; font-size: 9pt; letter-spacing: 1pt; text-align: center; padding: 0 10mm;
  }
  .dchapter-scrim-top {
    position: absolute; top: 0; left: 0; right: 0; padding: 16mm 10mm 24mm; text-align: center;
    background: linear-gradient(to bottom, rgba(15,11,7,0.75) 0%, rgba(15,11,7,0.2) 65%, rgba(15,11,7,0) 100%);
  }
  .dchapter-label { font-size: 12pt; letter-spacing: 5pt; color: #D9BA7E; font-weight: 700; margin: 0; }
  .dchapter-scrim-bottom {
    position: absolute; bottom: 0; left: 0; right: 0; padding: 26mm 10mm 16mm; text-align: center;
    background: linear-gradient(to top, rgba(15,11,7,0.86) 0%, rgba(15,11,7,0.25) 65%, rgba(15,11,7,0) 100%);
  }
  .dchapter-title { font-size: 19pt; color: #F5EFE1; margin: 8pt 0 13pt; font-weight: 700; }
  .dchapter-ornament { margin: 0 auto 13pt; display: block; }
  .dchapter-quote { font-size: 12.5pt; color: #EAD9C4; font-style: italic; max-width: 118mm; margin: 0 auto; line-height: 1.85; }

  /* [중요한 발견 — 본문 대표 페이지 배경 처리]
     .premium-section을 "여러 페이지에 걸쳐 흐르는 하나의 긴 div"로
     두면(1차 시도) Chromium 인쇄 엔진이 자연스러운 페이지 나눔(강제
     break-inside:avoid가 아니어도)마다 그 페이지에 실제로 올라간 내용
     높이까지만 배경을 칠하고 나머지는 흰 여백으로 남긴다. body(문서
     canvas) 배경으로 바꿔도(2차 시도, renderDarkPrototypeHtml) 동일하게
     실패했다 — 즉 "내용 길이만큼만 칠해진다"는 것은 개별 블록의 속성이
     아니라 자동 높이 박스가 여러 인쇄 페이지에 걸쳐 흐를 때 생기는
     Chromium 인쇄 엔진 자체의 특성이다.
     반면 min-height를 준 박스가 "한 페이지 안에서 끝나도록"(다음
     페이지로 넘어가지 않도록) 만들면 그 배경은 항상 min-height까지
     완전히 칠해진다 — 이미 승인된 표지/속표지/목차(pcover/pintro/ptoc)가
     모두 이 "단일 페이지 박스" 패턴이라 지금까지 문제가 없었던 것과
     같은 원리다. 그래서 이 페이지들은 내용을 페이지 단위로 미리 측정해
     쪼갠 뒤(스크립트의 실측 기반 페이지네이션, 새 문장/새 데이터 없이
     같은 내용을 어느 페이지에 놓을지만 계산), 조각마다 자신만의
     min-height:253mm 박스(.premium-section-page)로 감싼다 — 조각 하나당
     물리 페이지 하나가 보장되므로 위 문제가 원천적으로 발생하지 않는다.
     body 배경을 먹빛으로 바꾼 renderDarkPrototypeHtml은 만일의 실측
     오차에 대비한 안전망으로 계속 유지한다. */
  /* min-height는 253mm(콘텐츠 박스 전체 높이)가 아니라 250mm로 살짝
     여유를 둔다 — 이 박스를 감싸는 .chapter가 PDF_STYLE에서 이미
     padding-top:2mm을 주고 있어(수정 불가, 보호 영역), 253mm 그대로 두면
     "253mm + 2mm"이 페이지 한 장의 실제 여백을 넘어서 버려 브라우저가
     내용 없는 페이지를 하나 더 만들어낸다(실측으로 확인된 문제). */
  .premium-section-page {
    min-height: 250mm; padding: 10mm 13mm; color: #E8DCC5;
    break-after: page; page-break-after: always;
  }
  .dsection-eyebrow { text-align: center; font-size: 9pt; letter-spacing: 3pt; color: #9C8B6E; margin: 0 0 6pt; }
  .dsection-label { display: block; font-size: 12pt; font-weight: 700; color: #D9BA7E; letter-spacing: 3pt; margin: 0 0 4pt; }
  .dsection-heading { font-size: 16pt; margin: 0 0 14pt; color: #F5EFE1; }
  .dsubheading { font-size: 11.5pt; font-weight: 700; margin: 17pt 0 6pt; color: #D9BA7E; letter-spacing: 0.3pt; }
  .dp { margin: 0 0 10pt; color: #E8DCC5; }
  .dp.dlead { font-size: 11.5pt; font-weight: 700; color: #F5EFE1; }

  .dbadge-row { display: flex; gap: 10pt; flex-wrap: wrap; margin: 0 0 16pt; }
  .dbadge-chip {
    flex: 1 1 auto; min-width: 42mm; text-align: center; border: 0.75pt solid #6B5636;
    background: rgba(217,186,126,0.07); border-radius: 3pt; padding: 7pt 8pt;
  }
  .dbadge-chip-label { display: block; font-size: 8.5pt; color: #B7A588; font-weight: 700; letter-spacing: 0.5pt; }
  .dbadge-chip-score { display: block; font-size: 14pt; color: #D9BA7E; font-weight: 700; margin-top: 2pt; }

  .devidence-box {
    border-left: 3pt solid #C96B54; background: rgba(201,107,84,0.10); padding: 9pt 11pt; margin: 12pt 0;
    font-size: 9.5pt; color: #F5EFE1; break-inside: avoid; page-break-inside: avoid;
  }
  .devidence-label { display: block; font-size: 8pt; letter-spacing: 2pt; color: #E3A392; font-weight: 700; margin-bottom: 5pt; }

  .dcard {
    border: 0.75pt solid #6B5636; background: rgba(217,186,126,0.08); padding: 10pt 12pt; margin: 12pt 0;
    color: #EDE4D3; break-inside: avoid; page-break-inside: avoid;
  }
  .dcard-label { display: block; font-size: 8pt; letter-spacing: 2pt; color: #B7A588; font-weight: 700; margin-bottom: 5pt; }

  .dtag-row { display: flex; gap: 6pt; flex-wrap: wrap; margin: 6pt 0 16pt; }
  .dtag { font-size: 8.5pt; padding: 3pt 9pt; border-radius: 9pt; border: 0.75pt solid; }
  .dtag-easy { color: #B7CBB0; border-color: #5C7355; background: rgba(124,140,116,0.14); }
  .dtag-effort { color: #E3A392; border-color: #8B4A3A; background: rgba(201,107,84,0.14); }

  .wealth-timeline { margin: 4pt 0 18pt; break-inside: avoid; page-break-inside: avoid; }
  .wealth-timeline-title { font-size: 9pt; letter-spacing: 2pt; color: #B7A588; font-weight: 700; margin: 0 0 8pt; }
  .wealth-timeline-track { display: flex; border: 0.75pt solid #6B5636; border-radius: 3pt; overflow: hidden; }
  .wealth-timeline-seg { flex: 1; padding: 7pt 3pt; text-align: center; color: #F5EFE1; }
  .wealth-timeline-seg .seg-age { display: block; font-size: 6.5pt; opacity: 0.9; }
  .wealth-timeline-seg .seg-ganzhi { display: block; font-size: 9.5pt; font-weight: 700; margin: 2pt 0; }
  .wealth-timeline-seg .seg-label { display: block; font-size: 6.5pt; }
  .wealth-timeline-seg.seg-current { box-shadow: inset 0 0 0 1.5pt #D9BA7E; }
  .wealth-timeline-legend { display: flex; gap: 10pt; flex-wrap: wrap; margin-top: 8pt; font-size: 7.5pt; color: #B7A588; }
  .legend-dot { display: inline-block; width: 6pt; height: 6pt; border-radius: 50%; margin-right: 3pt; vertical-align: middle; }

  .gwiin-grid { display: flex; flex-wrap: wrap; gap: 10pt; margin: 4pt 0 16pt; }
  .dgwiin-card {
    flex: 1 1 45%; min-width: 68mm; border: 0.75pt solid #6B5636; background: rgba(217,186,126,0.07);
    border-radius: 4pt; padding: 12pt 13pt; break-inside: avoid; page-break-inside: avoid;
  }
  .dgwiin-card-name { font-size: 12pt; font-weight: 700; color: #D9BA7E; margin: 0 0 6pt; }
  .dgwiin-card-body { font-size: 9pt; color: #E8DCC5; margin: 0; }
  .gwiin-brief-row { margin: 4pt 0 16pt; }
  .dgwiin-brief-item { border-top: 0.75pt solid #4A3E2F; padding: 8pt 0; font-size: 9pt; color: #C9BBA0; }
  .dgwiin-brief-item strong { color: #F5EFE1; font-weight: 700; margin-right: 6pt; }
`;

/** 대표 페이지 v3(2026-09) — "고급 한지 동양 운명서" 팔레트. v2(다크,
 * 위 PROTOTYPE_STYLE 하단)와 공존한다 — 표지처럼 극히 일부(약 10%)
 * 페이지만 먹빛을 쓰고, 나머지 대부분은 이 아이보리/한지 계열을 쓴다는
 * 지시에 따라 두 팔레트를 동시에 남겨둔다. 본문 타이포그래피는 새로
 * 만들지 않고 기존 base PDF_STYLE의 .p/.p.callout/.p.ivory-card/
 * .subheading/.chapter-title(이미 43p 문서에서 검증된, 절대 수정하지
 * 않는 클래스)을 그대로 재사용한다 — 여기서는 "이미지+텍스트 결합
 * 오프닝"과 "명식/오행/재물흐름의 인쇄용 프리미엄 표현"에 필요한
 * 클래스만 추가한다. */
const HANJI_STYLE = `
  .hlink-ink { color: #6B5636; }

  /* ── 장 오프닝 — 이미지+텍스트가 한 페이지 안에서 결합된다.
   * 장마다 성격이 다르므로 3가지 구성을 따로 둔다(모두 똑같이 반복
   * 금지 지시). ── */

  /* 구성 A — 좌우 분할(第一章): 이미지 칼럼 + 텍스트 칼럼. */
  .hopen-split { break-before: page; page-break-before: always; break-after: page; page-break-after: always; display: flex; min-height: 253mm; background: #FBF6EA; }
  .hopen-split-img-col { width: 42%; position: relative; overflow: hidden; flex-shrink: 0; }
  .hopen-split-img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .hopen-fallback {
    position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 4pt; color: #A08A63; font-size: 9pt; letter-spacing: 1pt; text-align: center; background: #EFE6D2; padding: 0 8mm;
  }
  .hopen-split-text-col { width: 58%; padding: 26mm 16mm 20mm; display: flex; flex-direction: column; justify-content: center; }
  .hopen-label { font-size: 11pt; letter-spacing: 5pt; color: #A9803D; font-weight: 700; margin: 0 0 12pt; }
  .hopen-title { font-size: 19pt; color: #3A2E1C; margin: 0 0 14pt; line-height: 1.35; }
  .hopen-ornament { margin: 0 0 14pt; display: block; }
  .hopen-intro { font-size: 11pt; color: #55493B; line-height: 1.9; margin: 0 0 12pt; }
  .hopen-lead { font-size: 12.5pt; font-weight: 700; color: #3A2E1C; line-height: 1.75; margin: 0; }

  /* 구성 B — 상단 이미지가 하단 종이 톤으로 자연스럽게 녹아드는 구성
   * (第五章): 하드 프레임 대신 그라데이션으로 경계를 지운다. */
  .hopen-stack { break-before: page; page-break-before: always; break-after: page; page-break-after: always; min-height: 253mm; background: #FBF6EA; }
  .hopen-stack-img-wrap { position: relative; width: 100%; height: 120mm; overflow: hidden; }
  .hopen-stack-img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .hopen-stack-fade { position: absolute; left: 0; right: 0; bottom: 0; height: 42mm; background: linear-gradient(to bottom, rgba(251,246,234,0) 0%, #FBF6EA 92%); }
  .hopen-stack-body { padding: 6mm 18mm 16mm; text-align: center; }

  /* 구성 C — 소형 인물/오브제 삽입형(第八章): 타이포그래피 중심,
   * 이미지는 절제된 상징으로만. */
  .hopen-inset { break-before: page; page-break-before: always; break-after: page; page-break-after: always; min-height: 253mm; padding: 30mm 20mm; display: flex; flex-direction: column; align-items: center; text-align: center; background: #FBF6EA; }
  .hopen-inset-img { width: 60mm; height: 76mm; object-fit: cover; border-radius: 2pt; box-shadow: 0 2pt 14pt rgba(58,46,28,0.22); margin: 0 0 16pt; }

  /* ── 명식 — 단순 표가 아니라 기록물처럼. ── */
  .hmyeongsik-plaque {
    border: 0.75pt solid #C9B48A; background: linear-gradient(160deg, #FBF6EA 0%, #F1E6CB 100%);
    padding: 14mm 12mm; break-inside: avoid; page-break-inside: avoid; margin: 10pt 0 16pt;
  }
  .hmyeongsik-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6pt; }
  .hmyeongsik-cell { text-align: center; padding: 10pt 3pt 8pt; border: 0.5pt solid rgba(107,74,31,0.3); }
  .hmyeongsik-cell.day-cell { background: rgba(169,128,61,0.09); }
  .hmyeongsik-cell .hlabel-top { display: block; font-size: 8pt; color: #6B4A1F; font-weight: 700; letter-spacing: 1pt; margin-bottom: 4pt; }
  .hmyeongsik-cell .hhanja { font-size: 20pt; font-weight: 700; color: #2B2216; }
  .hmyeongsik-cell .hsub { display: block; font-size: 8.5pt; color: #4A4038; font-weight: 600; margin-top: 4pt; }
  .hmyeongsik-cell .hsipseong { display: block; font-size: 9pt; color: #6B4A1F; font-weight: 700; margin-top: 3pt; }
  .hmyeongsik-caption { text-align: center; font-size: 9pt; color: #6B4A1F; font-weight: 700; letter-spacing: 2pt; margin: 0 0 8pt; }

  /* ── 오행 — 카드가 아니라 데이터 인포그래픽. ── */
  .hohang-page { margin: 6pt 0 16pt; }
  .hohang-row { display: flex; align-items: center; gap: 10pt; margin-bottom: 11pt; }
  .hohang-name { width: 24mm; font-size: 11pt; font-weight: 700; color: #3A2E1C; flex-shrink: 0; }
  .hohang-track { flex: 1; height: 9pt; background: rgba(58,46,28,0.08); border-radius: 5pt; overflow: hidden; }
  .hohang-fill { height: 100%; border-radius: 5pt; }
  .hohang-value { width: 14mm; text-align: right; font-size: 13pt; font-weight: 700; color: #2B2216; flex-shrink: 0; }
  .hohang-note { font-size: 10pt; color: #3A2E1C; font-weight: 600; margin-top: 6pt; }

  /* [2026-09 리디자인] 원형 오행 — 링은 시각적 인상만 주고, 정확한
   * 수치는 링과 분리된 아래 목록에 또렷한 글자로 남긴다(장식이 수치를
   * 가리지 않도록 §9 명시 요구). */
  .hohang-wheel-wrap { display: flex; justify-content: center; margin: 8pt 0 18pt; }
  .hohang-wheel-svg { width: 60mm; height: 60mm; }
  .hohang-wheel-center-label { font-size: 15px; fill: #3A2E1C; font-weight: 700; }
  .hohang-wheel-center-sub { font-size: 9px; fill: #8B7257; letter-spacing: 1px; }
  .hohang-legend { display: flex; flex-wrap: wrap; justify-content: center; gap: 10pt 16pt; margin: 0 0 10pt; }
  .hohang-legend-row { display: flex; align-items: center; gap: 5pt; font-size: 10pt; }
  .hohang-legend-dot { width: 9pt; height: 9pt; border-radius: 50%; display: inline-block; }
  .hohang-legend-name { font-weight: 700; color: #2B2216; }
  .hohang-legend-value { color: #4A4038; font-weight: 600; }

  /* ── 재물 흐름(第五章) — 밝은 바탕에서도 또렷한 시기 밴드. ── */
  .hwealth-timeline { margin: 10pt 0 16pt; break-inside: avoid; page-break-inside: avoid; }
  .hwealth-timeline-title { font-size: 9.5pt; letter-spacing: 2pt; color: #6B4A1F; font-weight: 700; margin: 0 0 8pt; text-align: center; }
  .hwealth-timeline-track { display: flex; border: 0.75pt solid #C9B48A; border-radius: 3pt; overflow: hidden; }
  .hwealth-timeline-seg { flex: 1; padding: 7pt 3pt; text-align: center; color: #FBF6EA; }
  .hwealth-timeline-seg .seg-age { display: block; font-size: 7pt; opacity: 0.95; font-weight: 600; }
  .hwealth-timeline-seg .seg-ganzhi { display: block; font-size: 10pt; font-weight: 700; margin: 2pt 0; }
  .hwealth-timeline-seg .seg-label { display: block; font-size: 7pt; font-weight: 600; }
  .hwealth-timeline-seg.seg-current { box-shadow: inset 0 0 0 1.5pt #3A2E1C; }
  .hwealth-timeline-legend { display: flex; gap: 10pt; flex-wrap: wrap; margin-top: 8pt; font-size: 8pt; color: #4A4038; font-weight: 600; justify-content: center; }

  /* ── 귀인/신살 — 카드 그리드 대신 가는 선 목록 + 절제된 오브제. ── */
  .hgwiin-item { padding: 10pt 0; border-bottom: 0.5pt solid rgba(107,74,31,0.28); break-inside: avoid; page-break-inside: avoid; }
  .hgwiin-item:first-child { border-top: 0.5pt solid rgba(107,74,31,0.28); }
  .hgwiin-name { font-size: 12.5pt; font-weight: 700; color: #4A3423; margin: 0 0 4pt; }
  .hgwiin-body { font-size: 9.5pt; color: #3A342C; margin: 0; }
  .hgwiin-brief-row { margin: 4pt 0 4pt; }
  .hgwiin-brief-item { border-top: 0.5pt solid rgba(107,74,31,0.2); padding: 7pt 0; font-size: 9pt; color: #55493B; }
  .hgwiin-brief-item strong { color: #3A2E1C; font-weight: 700; margin-right: 6pt; }

  /* ── [2026-09 리디자인] 第二·三章 심화(chapterTwoDeep/chapterThreeDeep)
   * 인쇄용 시각화 — 화면의 SipseongStrengthBars/DomainCards SVG를
   * 복제하지 않고, 같은 값(widthPercent 등 이미 계산된 상대값)을 단순
   * 막대/카드로만 옮긴다. ── */
  .hdeep-bars { margin: 10pt 0 14pt; }
  .hdeep-bar-row { display: flex; align-items: center; gap: 8pt; margin-bottom: 6pt; }
  .hdeep-bar-name { width: 28mm; font-size: 9.5pt; font-weight: 700; color: #3A2E1C; flex-shrink: 0; }
  .hdeep-bar-track { flex: 1; height: 7pt; background: rgba(58,46,28,0.08); border-radius: 4pt; overflow: hidden; }
  .hdeep-bar-fill { height: 100%; background: #A9803D; border-radius: 4pt; }
  .hdeep-domain-grid { display: flex; flex-wrap: wrap; gap: 8pt; margin: 4pt 0 14pt; }
  .hdeep-domain-card {
    flex: 1 1 45%; min-width: 68mm; border: 0.5pt solid rgba(107,74,31,0.28); border-radius: 3pt;
    padding: 8pt 10pt; break-inside: avoid; page-break-inside: avoid;
  }
  .hdeep-domain-area { font-size: 8pt; letter-spacing: 1pt; color: #A9803D; font-weight: 700; }
  .hdeep-domain-lead { font-size: 9.5pt; font-weight: 700; color: #3A2E1C; margin: 4pt 0 2pt; }
  .hdeep-domain-detail { font-size: 9pt; color: #55493B; margin: 0; }
  .hdeep-pair-cols { display: flex; gap: 14pt; margin: 4pt 0 14pt; }
  .hdeep-pair-col { flex: 1; }
  .hdeep-pair-title { font-size: 9.5pt; font-weight: 700; color: #6B4A1F; margin: 0 0 6pt; }
  .hdeep-pair-item { font-size: 9pt; color: #55493B; margin: 0 0 5pt; }

  /* ── [2026-09 PDF 디자인 마스터] 선녀 인물 이미지가 없는 장(第一·五·八章
   * 외 나머지)의 오프닝에 쓰는 모티프 패널(PdfMotifs.tsx의 원본 SVG) — 사진
   * 자리(.hopen-split-img-col 등)와 같은 자리에 얹히므로 크기/배경만
   * 새로 정의하고, 바깥 레이아웃(.hopen-split/-stack/-inset)은 전혀
   * 건드리지 않는다. */
  .hopen-motif-panel {
    width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
    background: linear-gradient(160deg, #F1E6CB 0%, #E4D6B8 100%);
  }
  .hopen-motif-panel-stack { height: 120mm; }
  .hopen-motif-panel-inset {
    width: 60mm; height: 76mm; border-radius: 2pt; margin: 0 0 16pt;
    box-shadow: 0 2pt 14pt rgba(58,46,28,0.18);
  }
  .hopen-motif-icon { width: 56%; max-width: 46mm; }

  /* ── [2026-09 리디자인] 전면 삽화 장면(PdfScenes.tsx) — 사진과 같은
   * 자리에 같은 크기로 채운다(작은 중앙 아이콘이던 hopen-motif-panel과
   * 달리, 이미지 슬롯 전체를 덮는 배경 그림). svg 자체가 100%/100% +
   * preserveAspectRatio="slice"라 컨테이너 크기만 맞추면 된다. */
  .hopen-scene-panel { width: 100%; height: 100%; overflow: hidden; display: block; }
  .hopen-scene-panel svg { display: block; width: 100%; height: 100%; }
  .hopen-scene-panel-inset {
    width: 60mm; height: 76mm; border-radius: 2pt; margin: 0 0 16pt; overflow: hidden;
    box-shadow: 0 2pt 14pt rgba(58,46,28,0.22);
  }

  /* ── 10년 흐름(第七章) — 재물 밴드(.hwealth-timeline-*)와 같은 "밴드"
   * 문법을 막대그래프로 바꿔 재사용한다. 막대 높이는 이미 계산된
   * flowIntensity(0~100)를 그대로 옮긴 것뿐, 새 점수 없음. ── */
  .htenyear-timeline { margin: 10pt 0 18pt; break-inside: avoid; page-break-inside: avoid; }
  /* [실물 PDF 육안 검수에서 발견] 이 트랙에 고정 height(46mm)를 주면,
     칸 하나의 실제 내용(막대 36mm + 연도/나이/간지 3줄 텍스트)이 그보다
     커서 align-items:flex-end 때문에 초과분이 트랙 위쪽(=바로 위 제목
     문단)으로 겹쳐 올라갔다 — 막대 높이가 이미 .htenyear-bar-wrap의
     고정 height(36mm)로 칸마다 동일하게 맞춰지므로, 트랙 자체는
     height를 고정하지 않고 내용에 맞게 자연스럽게 늘어나도 막대 정렬은
     그대로 유지된다(칸끼리 비교하는 막대그래프 목적에 영향 없음). */
  .htenyear-track {
    display: flex; align-items: flex-end; gap: 3pt;
    border-bottom: 0.75pt solid #C9B48A; padding: 0 2pt;
  }
  .htenyear-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3pt; }
  .htenyear-bar-wrap { width: 100%; height: 36mm; display: flex; align-items: flex-end; }
  .htenyear-bar { width: 100%; background: #A9803D; border-radius: 1.5pt 1.5pt 0 0; }
  .htenyear-bar.bar-transition { background: #6B4A1F; box-shadow: inset 0 0 0 1pt #3A2E1C; }
  .htenyear-year { font-size: 7.5pt; font-weight: 700; color: #2B2216; }
  .htenyear-age { font-size: 6.5pt; color: #5C4A32; font-weight: 600; }
  .htenyear-ganzhi { font-size: 8.5pt; font-weight: 700; color: #2B2216; }

  /* ── [2026-09 리디자인] 마지막 페이지 — 표지(pcover-frame)와 짝을
   * 이루는 "책을 덮는" 장면. 같은 이미지+스크림 문법 재사용(통일감),
   * 텍스트는 하단 한 곳에만. ── */
  .hending { break-before: page; page-break-before: always; min-height: 250mm; display: flex; }
  .hending-frame {
    position: relative; width: 100%; height: 253mm;
    border: 0.75pt solid #C9B48A; overflow: hidden;
  }
  .hending-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
  .hending-fallback {
    position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 4pt; color: #A08A63; font-size: 9pt; letter-spacing: 1pt; text-align: center; background: #EFE6D2;
  }
  .hending-scrim {
    position: absolute; bottom: 0; left: 0; right: 0; padding: 30mm 14mm 18mm; text-align: center;
    background: linear-gradient(to top, rgba(15,11,7,0.82) 0%, rgba(15,11,7,0.35) 55%, rgba(15,11,7,0) 100%);
  }
  .hending-brand { font-size: 15pt; font-weight: 700; color: #D9BA7E; letter-spacing: 4pt; margin: 0 0 10pt; }
  .hending-message { font-size: 12pt; font-weight: 700; color: #F5EFE1; margin: 10pt 0 8pt; line-height: 1.7; }
  .hending-sub { font-size: 9pt; color: #D9CBB0; margin: 0; letter-spacing: 0.3pt; }
`;

/** ["평생운명록" PDF 2차 편집 디자인, 2026-09] STEP 3 대표 샘플(A~G)
 * 전용 CSS. 기존 HANJI_STYLE(장 오프닝 3종/명식/오행/재물흐름/10년 —
 * 이미 45p 실제 문서에서 쓰는 승인 대기 상태의 클래스)을 대체하지
 * 않고, 완전히 새 클래스 이름(hhero-, hquote-, hbody-airy, hpage-texture,
 * hohang-v2-, htenyear-v2-, hletter- 계열)만 추가한다 — 기존 45p 조립
 * (renderReportPdfHtml/ReportPdfDocument.tsx)은 이 블록을 전혀 쓰지
 * 않으므로 실제 상품 PDF에는 영향이 없다(scripts/_pdf_v4_samples_gen.ts
 * 전용 렌더 함수 renderHanjiV4SampleHtml에서만 결합해서 쓴다). */
const HANJI_V4_STYLE = `
  /* ── A. 챕터 전환(통합 Hero) ── */
  .hhero { break-before: page; page-break-before: always; break-after: page; page-break-after: always; min-height: 253mm; background: #FBF6EA; position: relative; }
  .hhero-img-wrap { position: relative; width: 100%; height: 178mm; overflow: hidden; }
  .hhero-img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .hhero-fade { position: absolute; left: 0; right: 0; bottom: 0; height: 62mm; background: linear-gradient(to bottom, rgba(251,246,234,0) 0%, #FBF6EA 88%); }
  .hhero-scrim-top { position: absolute; top: 0; left: 0; right: 0; padding: 12mm 14mm; background: linear-gradient(to bottom, rgba(20,15,8,0.38) 0%, rgba(20,15,8,0) 100%); }
  .hhero-eyebrow { font-size: 9pt; letter-spacing: 5pt; color: #F5EFE1; font-weight: 700; margin: 0; text-shadow: 0 1pt 3pt rgba(0,0,0,0.4); }
  .hhero-body { padding: 8mm 20mm 18mm; text-align: center; }
  .hhero-label { font-size: 11.5pt; letter-spacing: 6pt; font-weight: 700; margin: 0 0 12pt; }
  .hhero-title { font-size: 22pt; color: #2B2216; margin: 0 0 16pt; line-height: 1.3; }
  .hhero-lead { font-size: 13pt; font-weight: 700; color: #3A2E1C; line-height: 1.85; max-width: 130mm; margin: 0 auto; }

  /* ── B. 이미지 + 개인화 핵심문장 ── */
  .hquote-page { break-before: page; page-break-before: always; break-after: page; page-break-after: always; min-height: 253mm; background: #FBF6EA; }
  .hquote-img-wrap { width: 100%; height: 140mm; overflow: hidden; }
  .hquote-img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .hquote-body { padding: 16mm 24mm 20mm; text-align: center; }
  .hquote-mark { font-size: 40pt; color: #C9B48A; line-height: 1; margin: 0 0 4pt; font-family: Georgia, serif; }
  .hquote-label { font-size: 9.5pt; letter-spacing: 4pt; color: #A9803D; font-weight: 700; margin: 0 0 14pt; }
  .hquote-text { font-size: 17pt; font-weight: 700; color: #2B2216; line-height: 1.75; max-width: 130mm; margin: 0 auto; }

  /* ── C. 여백을 확보한 본문(빽빽한 본문 재분할) ── */
  .hbody-airy-heading { font-size: 15pt; color: #2B2216; margin: 2pt 0 16pt; }
  .hbody-airy .p { line-height: 2.05; margin: 0 0 15pt; }
  .hbody-airy .p.lead-big { font-size: 13.5pt; font-weight: 700; color: #2B2216; line-height: 1.9; margin: 0 0 18pt; }
  .hbody-airy .hrule { width: 24mm; height: 0.75pt; background: #C9B48A; margin: 20pt auto; }
  .hbody-airy .p.quote-pull { font-size: 13pt; font-weight: 700; color: #6B4A1F; text-align: center; padding: 12pt 8mm; margin: 20pt 0; border-top: 0.5pt solid #D9CBB0; border-bottom: 0.5pt solid #D9CBB0; }

  /* ── D. 한지 질감 본문(§5 — 가독성 우선, 아주 옅게) ── */
  .hpage-texture {
    min-height: 253mm; padding: 10mm 13mm;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 0.42 0 0 0 0 0.35 0 0 0 0 0.22 0 0 0 0.05 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    background-repeat: repeat;
    background-color: #FBF6EA;
  }

  /* ── E. 오행 색감 개선(v2) ── */
  .hohang-v2-wheel-svg { width: 66mm; height: 66mm; }
  .hohang-v2-center-label { font-size: 19px; fill: #2B2216; font-weight: 700; }
  .hohang-v2-center-sub { font-size: 10px; fill: #6B4A1F; letter-spacing: 1.5px; font-weight: 700; }
  .hohang-v2-list { margin: 6pt 0 12pt; }
  .hohang-v2-legend-row { display: flex; align-items: center; gap: 9pt; padding: 8pt 10pt; border-radius: 5pt; margin-bottom: 6pt; }
  .hohang-v2-chip { width: 12pt; height: 12pt; border-radius: 50%; flex-shrink: 0; }
  .hohang-v2-name { font-size: 12.5pt; font-weight: 700; color: #2B2216; width: 26mm; flex-shrink: 0; }
  .hohang-v2-bar-track { flex: 1; height: 11pt; background: rgba(58,46,28,0.09); border-radius: 6pt; overflow: hidden; }
  .hohang-v2-bar-fill { height: 100%; border-radius: 6pt; }
  .hohang-v2-value { font-size: 14.5pt; font-weight: 700; color: #2B2216; width: 16mm; text-align: right; flex-shrink: 0; }

  /* ── F. 10년 흐름 위계 개선(v2) ── */
  .htenyear-v2-track { display: flex; align-items: flex-end; gap: 5pt; border-bottom: 1.25pt solid #6B4A1F; padding: 0 3pt; }
  .htenyear-v2-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 5pt; }
  .htenyear-v2-bar-wrap { width: 100%; height: 48mm; display: flex; align-items: flex-end; }
  .htenyear-v2-bar { width: 100%; background: linear-gradient(180deg, #C9A46A 0%, #A9803D 100%); border-radius: 2pt 2pt 0 0; }
  .htenyear-v2-bar.bar-transition { background: linear-gradient(180deg, #6B4A1F 0%, #3A2E1C 100%); box-shadow: inset 0 0 0 1.5pt #D9BA7E; }
  .htenyear-v2-year { font-size: 9.5pt; font-weight: 700; color: #2B2216; }
  .htenyear-v2-age { font-size: 7.5pt; color: #6B4A1F; font-weight: 600; }
  .htenyear-v2-ganzhi { font-size: 10.5pt; font-weight: 700; color: #2B2216; }
  .htenyear-v2-signal { font-size: 6.8pt; color: #8B7257; text-align: center; line-height: 1.3; max-width: 20mm; }

  /* ── G. 마지막 한지 편지 페이지 ── */
  .hletter { break-before: page; page-break-before: always; min-height: 253mm; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 0 26mm; background: #FBF6EA; }
  .hletter-mark { font-size: 13pt; letter-spacing: 6pt; color: #A9803D; font-weight: 700; margin: 0 0 26pt; }
  .hletter-title { font-size: 17pt; color: #2B2216; margin: 0 0 30pt; font-weight: 700; }
  .hletter-line { font-size: 12.5pt; color: #3A2E1C; line-height: 2.15; margin: 0 0 14pt; max-width: 120mm; }
  .hletter-seal { margin-top: 26pt; }
`;

/** STEP 3 대표 샘플 전용 HTML 조립 — 기존 renderHanjiPrototypeHtml과
 * 완전히 동일한 배경/스타일 결합에 HANJI_V4_STYLE만 추가한다. body는
 * scripts/_pdf_v4_samples_gen.ts가 components/pdf/ReportPdfSampleV4.tsx
 * 조각들로 직접 구성해 넘긴다 — 이 함수는 어디서도 renderReportPdfHtml
 * (실제 45p 상품 경로)로부터 호출되지 않는다. */
export function renderHanjiV4SampleHtml(bodyHtml: string): string {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<style>${PDF_STYLE}${PROTOTYPE_STYLE}${HANJI_STYLE}${HANJI_V4_STYLE}
  body {
    background:
      radial-gradient(ellipse 900px 500px at 12% 6%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 60%),
      radial-gradient(ellipse 800px 650px at 90% 96%, rgba(150,118,64,0.05) 0%, rgba(150,118,64,0) 55%),
      linear-gradient(175deg, #FBF6EA 0%, #F5EDDB 100%);
  }
</style>
</head>
<body>${bodyHtml}</body>
</html>`;
}

/** ["평생운명록" PDF 전면 재설계, 2026-09] 전체 책 조립 전용 CSS —
 * HANJI_V4_STYLE(STEP3 대표 샘플 7종)과도 별개의 새 클래스 세트다
 * (b-/bp-/bhero-/bquote-/bdata- 접두사). 이유:
 *  - "작고 흐린 글씨" 반려 피드백을 반영해 라벨/제목 크기·명도를 전면
 *    상향했고, 본문 글자색도 옅은 회갈색(#55493B류)에서 짙은 먹색
 *    (#241B12)으로 바꿔 대비를 크게 높였다 — 기존 PDF_STYLE의 `.p`
 *    (10.5pt, #2B2622)는 이미 45p 상품에서 검증된 값이라 그대로 두고,
 *    이 책 전용 문단 클래스(.bp)만 새로 만든다.
 *  - 오행/재물시기 색상도 이 책 전용 팔레트(BOOK_ELEMENT_COLORS 등,
 *    components/pdf/ReportPdfBook.tsx)로 새로 잡았다 — ResultLandingV2.tsx의
 *    ELEMENT_COLORS(웹 화면, 절대 보호)는 전혀 건드리지 않는다.
 *  - 계산값(오행 %, 재물시기 A~E 판정, flowIntensity 등)은 하나도
 *    바꾸지 않았다 — 색과 크기만 이 파일에서 새로 입힌다. */
const HANJI_BOOK_STYLE = `
  :root {
    --ink: #241B12;
    --ink-strong: #17110A;
    --label: #6B3A0C;
    --rule: #C9B48A;
  }

  .bpage { background: #FBF6EA; }
  .b-chapter { break-before: page; page-break-before: always; padding-top: 4mm; }

  /* ── 표지 재설계(2026-09) — 이 책(ReportPdfBook.tsx) 전용. 기존
     PremiumCover/.pcover-*(ReportPdfPrototype.tsx, PROTOTYPE_STYLE)는
     기존 45p 상품 경로(ReportPdfDocument.tsx)가 그대로 계속 쓰므로
     한 글자도 건드리지 않았다 — 완전히 새 클래스(.bcover-*)로만
     구현해 다른 60페이지·기존 승인 표지에 영향이 전혀 없다. */
  .bcover { break-after: page; page-break-after: always; min-height: 253mm; }
  .bcover-frame { position: relative; width: 100%; height: 253mm; overflow: hidden; background: #1E1810; border: 0.75pt solid #6B5636; }
  /* 인물이 훨씬 크게 느껴지도록 이미지 자체를 확대(scale)한다 — 원본
     비율 왜곡 없이(object-fit:cover 유지) 크롭 범위만 좁힌다. 인물
     얼굴·상체가 프레임 상단~중단에 오도록 object-position을 조정해
     머리/한복이 잘리지 않게 했다(실측 렌더링으로 확인, §9). */
  .bcover-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 62% 18%; transform: scale(1.32); transform-origin: 62% 18%; display: block; }
  .bcover-fallback {
    position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 4pt; color: #B7A588; font-size: 9pt; letter-spacing: 1pt; text-align: center; padding: 0 10mm;
  }
  /* [2026-09 최종 조정] "팔자문"(한글) 히어로 버전은 반려됨 — 원래대로
     "八字門"(한자)이 가장 강한 타이틀, "팔자문"(한글)이 그 아래 브랜드명,
     "PALJAMUN"은 맨 위 작은 eyebrow로 되돌린다. 블록을 위로 당기고(상단
     패딩 축소), 세 요소 크기를 각각 지시된 비율로 키우되 자간·행간은
     "고급 책 표지"답게 여유 있게 유지 — 인물 얼굴은 프레임 중하단에
     있어 이 정도 상향으로는 충돌하지 않음(렌더링으로 확인). */
  .bcover-top-scrim {
    position: absolute; top: 0; left: 0; right: 0; padding: 6mm 12mm 26mm; text-align: center;
    background: linear-gradient(to bottom, rgba(15,11,7,0.80) 0%, rgba(15,11,7,0.32) 68%, rgba(15,11,7,0) 100%);
  }
  .bcover-eyebrow { font-size: 11pt; letter-spacing: 6.5pt; color: #E8DCC5; font-weight: 700; margin: 0; text-shadow: 0 1pt 3pt rgba(0,0,0,0.4); }
  .bcover-brand-cn { font-size: 51pt; font-weight: 700; color: #E8BE7C; margin: 12pt 0 6pt; letter-spacing: 11pt; text-shadow: 0 2pt 8pt rgba(0,0,0,0.45); }
  .bcover-brand-kr { font-size: 17.5pt; color: #F0E6D2; margin: 0; letter-spacing: 4.5pt; font-weight: 700; }
  .bcover-bottom-scrim {
    position: absolute; bottom: 0; left: 0; right: 0; padding: 30mm 14mm 18mm; text-align: center;
    background: linear-gradient(to top, rgba(15,11,7,0.88) 0%, rgba(15,11,7,0.4) 60%, rgba(15,11,7,0) 100%);
  }
  .bcover-divider { width: 30mm; height: 0.75pt; background: #E8BE7C; margin: 0 auto 12pt; }
  .bcover-tagline { font-size: 11.5pt; color: #E8DCC5; margin: 0 0 14pt; font-weight: 600; letter-spacing: 0.3pt; }
  .bcover-name { font-size: 23pt; font-weight: 700; color: #F5EFE1; margin: 0 0 10pt; letter-spacing: 0.5pt; text-shadow: 0 1pt 6pt rgba(0,0,0,0.5); }
  .bcover-date { font-size: 10.5pt; color: #D9CBB0; margin: 0; font-weight: 600; letter-spacing: 0.5pt; }

  /* 라벨/소제목/본문 — 전면 명도·크기 상향 */
  /* [2026-09 가독성 보강] 라벨 13→14pt, 색 소폭 진하게(#7A4310→#6B3A0C —
     톤다운 유지하되 대비만 강화). 소제목 14→17pt로 확대해 본문과
     확실히 구분되도록(챕터 제목 27pt/데이터 제목 20pt보다는 작게 유지
     — "너무 큰 챕터 제목처럼 보이지 않게" 지시 반영). */
  .b-label { display: block; font-size: 14pt; font-weight: 700; letter-spacing: 3pt; color: var(--label, #6B3A0C); margin: 0 0 10pt; }
  .b-subheading { font-size: 17pt; font-weight: 700; color: var(--ink-strong); margin: 22pt 0 10pt; letter-spacing: 0.2pt; line-height: 1.35; }
  /* [2026-09 추가 발견 — 사용자 지적] 1·2·3·6장 "심화/더 깊이" 안의
     번호 매긴 하위 소제목(①②③...)이 예전 클래스(.year-heading, 10.5pt
     — 본문 11.5pt보다도 작음)를 그대로 쓰고 있어 제목처럼 안 보이고
     페이지가 빡빡해 보이던 문제. b-subheading(17pt, 장을 대표하는
     제목)보다는 한 단계 낮은 하위 소제목 전용 클래스를 새로 둔다. */
  .b-subsubheading { font-size: 13.5pt; font-weight: 700; color: var(--ink-strong); margin: 16pt 0 6pt; letter-spacing: 0.1pt; }
  .bp { font-size: 11.5pt; line-height: 2.0; color: var(--ink); margin: 0 0 15pt; }
  .bp.b-lead { font-size: 15pt; font-weight: 700; color: var(--ink-strong); line-height: 1.85; margin: 0 0 18pt; }
  .bp.b-quote {
    font-size: 13pt; font-weight: 700; color: var(--ink-strong); text-align: center;
    padding: 14pt 10mm; margin: 22pt 0; border-top: 0.75pt solid var(--rule); border-bottom: 0.75pt solid var(--rule);
  }
  .bp.b-card {
    border: 0.75pt solid #C9B48A; background: #F4EBD4; color: var(--ink-strong);
    padding: 12pt 14pt; margin: 16pt 0; break-inside: avoid; page-break-inside: avoid; font-weight: 600;
  }
  .b-rule { width: 26mm; height: 0.75pt; background: var(--rule); margin: 18pt auto; }

  /* 아주 옅은 한지 결(본문용) / 조금 더 진한 결(전환·인사이트·편지용) */
  .b-texture-weak, .b-texture-strong {
    background-repeat: repeat; background-color: #FBF6EA;
  }
  .b-texture-weak {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 0.42 0 0 0 0 0.35 0 0 0 0 0.22 0 0 0 0.045 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  }
  .b-texture-strong {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 0.42 0 0 0 0 0.35 0 0 0 0 0.22 0 0 0 0.09 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  }

  /* ── 챕터 전환(Hero, 8장 공통 문법 — 사진 crop/여백/온도만 장마다 다름) ── */
  .bhero { break-before: page; page-break-before: always; break-after: page; page-break-after: always; min-height: 253mm; background: #FBF6EA; position: relative; }
  .bhero-img-wrap { position: relative; width: 100%; height: 172mm; overflow: hidden; }
  .bhero-img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .bhero-fade { position: absolute; left: 0; right: 0; bottom: 0; height: 58mm; background: linear-gradient(to bottom, rgba(251,246,234,0) 0%, #FBF6EA 90%); }
  .bhero-scrim-top { position: absolute; top: 0; left: 0; right: 0; padding: 12mm 14mm; background: linear-gradient(to bottom, rgba(20,15,8,0.4) 0%, rgba(20,15,8,0) 100%); }
  .bhero-eyebrow { font-size: 9.5pt; letter-spacing: 5pt; color: #F5EFE1; font-weight: 700; margin: 0; text-shadow: 0 1pt 3pt rgba(0,0,0,0.4); }
  .bhero-num { position: absolute; top: 12mm; right: 14mm; font-size: 34pt; font-weight: 700; color: rgba(245,239,225,0.88); text-shadow: 0 1pt 4pt rgba(0,0,0,0.45); }
  .bhero-body { padding: 8mm 20mm 16mm; text-align: center; }
  .bhero-title { font-size: 27pt; color: var(--ink-strong); margin: 0 0 16pt; line-height: 1.28; font-weight: 700; }
  .bhero-lead { font-size: 13.5pt; font-weight: 700; color: var(--ink); line-height: 1.85; max-width: 132mm; margin: 0 auto; }

  /* ── 이미지+핵심문장 인사이트 페이지 ── */
  .bquote-page { break-before: page; page-break-before: always; break-after: page; page-break-after: always; min-height: 253mm; background: #FBF6EA; }
  .bquote-img-wrap { width: 100%; height: 138mm; overflow: hidden; }
  .bquote-img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .bquote-body { padding: 16mm 24mm 20mm; text-align: center; }
  .bquote-mark { font-size: 42pt; color: var(--rule); line-height: 1; margin: 0 0 2pt; font-family: Georgia, serif; }
  .bquote-text { font-size: 18pt; font-weight: 700; color: var(--ink-strong); line-height: 1.75; max-width: 132mm; margin: 0 auto; }

  /* 사진 없이 한지 여백만으로 만드는 인사이트 페이지(§8 변주) */
  .bquote-plain { break-before: page; page-break-before: always; min-height: 253mm; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 0 24mm; }

  /* ── 명식/오행/재물/10년 — 큰 데이터 페이지 ── */
  .bdata-title { font-size: 20pt; color: var(--ink-strong); margin: 0 0 6pt; font-weight: 700; }
  .bdata-sub { font-size: 11pt; color: var(--ink); margin: 0 0 20pt; }

  /* [2026-09 사용자 피드백] "너무 밋밋하다" — 테두리를 원래 색(연한
     금색 #B99B5C)보다 진한 브론즈로, 한자는 오행별 색(BOOK_ELEMENT_COLORS,
     오행 페이지와 동일 팔레트, 컴포넌트에서 인라인으로 입힘)으로 바꿨다.
     계산값(오행/십성/간지)은 전혀 손대지 않음 — 이미 있던 elementKey를
     표시에만 처음 사용한 것뿐. */
  .bmyeongsik-plaque { border: 1.25pt solid #8A6A2E; background: linear-gradient(160deg, #FBF6EA 0%, #F1E3C4 100%); padding: 16mm 12mm; margin: 8pt 0 18pt; break-inside: avoid; page-break-inside: avoid; }
  .bmyeongsik-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7pt; }
  .bmyeongsik-cell { text-align: center; padding: 13pt 3pt 10pt; border: 0.75pt solid rgba(107,74,31,0.55); }
  .bmyeongsik-cell.day-cell { background: rgba(169,128,61,0.14); }
  .bmyeongsik-cell .blabel-top { display: block; font-size: 8.5pt; color: var(--label); font-weight: 700; letter-spacing: 1pt; margin-bottom: 5pt; }
  .bmyeongsik-cell .bhanja { font-size: 26pt; font-weight: 700; }
  .bmyeongsik-cell .bsub { display: block; font-size: 9.5pt; color: var(--ink); font-weight: 700; margin-top: 5pt; }
  .bmyeongsik-cell .bsipseong { display: block; font-size: 10pt; color: var(--label); font-weight: 700; margin-top: 4pt; }

  .bohang-wheel-svg { width: 72mm; height: 72mm; }
  .bohang-center-label { font-size: 21px; fill: var(--ink-strong); font-weight: 700; }
  .bohang-center-sub { font-size: 10.5px; fill: var(--label); letter-spacing: 1.5px; font-weight: 700; }
  .bohang-row { display: flex; align-items: center; gap: 9pt; padding: 9pt 11pt; border-radius: 5pt; margin-bottom: 7pt; }
  .bohang-chip { width: 13pt; height: 13pt; border-radius: 50%; flex-shrink: 0; }
  .bohang-name { font-size: 13.5pt; font-weight: 700; color: var(--ink-strong); width: 27mm; flex-shrink: 0; }
  .bohang-track { flex: 1; height: 12pt; background: rgba(36,27,18,0.09); border-radius: 6pt; overflow: hidden; }
  .bohang-fill { height: 100%; border-radius: 6pt; }
  .bohang-value { font-size: 15.5pt; font-weight: 700; color: var(--ink-strong); width: 17mm; text-align: right; flex-shrink: 0; }
  .bohang-note { font-size: 11pt; color: var(--ink); font-weight: 600; margin-top: 12pt; text-align: center; }

  .bwealth-track { display: flex; border: 1pt solid #B99B5C; border-radius: 4pt; overflow: hidden; margin: 6pt 0 14pt; }
  .bwealth-seg { flex: 1; padding: 12pt 4pt; text-align: center; color: #FBF6EA; }
  .bwealth-seg .seg-age { display: block; font-size: 8.5pt; font-weight: 700; opacity: 0.95; }
  .bwealth-seg .seg-ganzhi { display: block; font-size: 14pt; font-weight: 700; margin: 3pt 0; }
  .bwealth-seg .seg-label { display: block; font-size: 8.5pt; font-weight: 700; }
  .bwealth-seg.seg-current { box-shadow: inset 0 0 0 2pt var(--ink-strong); }
  .bwealth-legend { display: flex; gap: 10pt; flex-wrap: wrap; margin: 0 0 14pt; font-size: 9pt; color: var(--ink); font-weight: 600; justify-content: center; }
  .bwealth-legend .legend-dot { display: inline-block; width: 8pt; height: 8pt; border-radius: 50%; margin-right: 4pt; vertical-align: middle; }

  /* ── 앞으로의 10년 — 아트 배경 데이터 페이지 ── */
  .btenyear-art { break-before: page; page-break-before: always; min-height: 253mm; position: relative; background: #FBF6EA; }
  .btenyear-art-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
  .btenyear-art-bg-fallback { background: linear-gradient(160deg, #F1E6CB 0%, #E4D6B8 100%); }
  .btenyear-art-scrim { position: absolute; inset: 0; background: rgba(251,246,234,0.58); }
  .btenyear-art-content { position: relative; padding: 16mm 16mm 14mm; }
  .btenyear-art-title { font-size: 24pt; color: var(--ink-strong); margin: 4pt 0 8pt; font-weight: 700; }
  .btenyear-art-subtitle { font-size: 12.5pt; color: var(--ink); font-weight: 700; margin: 0 0 18pt; max-width: 150mm; line-height: 1.7; }

  .btenyear-track { display: flex; align-items: flex-end; gap: 4pt; border-bottom: 1.5pt solid var(--ink-strong); padding: 0 2pt; }
  .btenyear-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4pt; }
  .btenyear-bar-wrap { width: 100%; height: 52mm; display: flex; align-items: flex-end; }
  .btenyear-bar { width: 100%; background: linear-gradient(180deg, #C9A46A 0%, #93691E 100%); border-radius: 2pt 2pt 0 0; }
  .btenyear-bar.bar-transition { background: linear-gradient(180deg, #33505E 0%, #1E323C 100%); box-shadow: inset 0 0 0 1.75pt #D9BA7E; }
  .btenyear-ganzhi { font-size: 12pt; font-weight: 700; color: var(--ink-strong); }
  .btenyear-year { font-size: 10pt; font-weight: 700; color: var(--ink); }
  .btenyear-age { font-size: 8pt; color: var(--label); font-weight: 600; }
  .btenyear-legend { font-size: 8.5pt; color: var(--ink); font-weight: 600; text-align: center; margin: 10pt 0 0; }

  .btenyear-quote-box {
    margin: 18pt 0 0; padding: 14pt 14mm; text-align: center;
    border: 1pt solid #B99B5C; background: rgba(251,246,234,0.86); border-radius: 3pt;
  }
  .btenyear-quote-text { font-size: 13pt; font-weight: 700; color: var(--ink-strong); line-height: 1.8; margin: 0; }

  /* 주요 연도(전환년) 상세 페이지 — 10년 지도 다음 장 */
  .byear-card { border: 0.75pt solid rgba(36,27,18,0.22); border-radius: 3pt; padding: 12pt 14pt; margin: 0 0 14pt; break-inside: avoid; page-break-inside: avoid; }
  .byear-card-head { display: flex; align-items: baseline; gap: 10pt; margin-bottom: 6pt; }
  .byear-card-year { font-size: 17pt; font-weight: 700; color: var(--ink-strong); }
  .byear-card-ganzhi { font-size: 12pt; font-weight: 700; color: var(--label); }
  .byear-card-age { font-size: 9.5pt; color: var(--ink); }
  .byear-card-signal { font-size: 10.5pt; font-weight: 700; color: var(--label); margin: 0 0 6pt; }

  /* ── 마지막 한지 편지 — paljamun-ink-background-seal.png 배경 +
     붉은 낙관(이미지 안에 이미 있음) 버전. 배경 이미지가 없으면(폴백)
     기존 텍스처+텍스트 마크 조합으로 그대로 렌더링된다. */
  .bletter { break-before: page; page-break-before: always; min-height: 253mm; position: relative; background: #FBF6EA; }
  .bletter-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
  /* 이미지 좌측 중단이 비어 있어(산/호수/낙관은 우측·하단에 몰림) 그
     자리에 편지 글을 얹는다 — 아주 옅은 아이보리 스크림만 더해 글자
     대비를 보강한다(그림 존재감은 유지). */
  .bletter-scrim { position: absolute; inset: 0; background: rgba(251,246,234,0.22); }
  .bletter-content {
    position: relative; min-height: 253mm; display: flex; flex-direction: column;
    justify-content: center; align-items: flex-start; text-align: left; padding: 0 18mm 0 20mm; max-width: 118mm;
  }
  .bletter-mark { font-size: 14pt; letter-spacing: 6pt; color: var(--label); font-weight: 700; margin: 0 0 28pt; }
  .bletter-title { font-size: 19pt; color: var(--ink-strong); margin: 0 0 26pt; font-weight: 700; }
  .bletter-line { font-size: 13.5pt; color: var(--ink); line-height: 2.15; margin: 0 0 15pt; font-weight: 600; }
  .bletter-seal { margin-top: 28pt; }
`;

/** 전체 책(v4 재설계) 전용 HTML 조립 — HANJI_BOOK_STYLE까지 결합한다.
 * renderHanjiV4SampleHtml/renderReportPdfHtml과 완전히 분리된 별도
 * 함수이며, 실제 상품 경로(generateReportPdfBuffer)에서는 절대 호출되지
 * 않는다(scripts/_pdf_book_v1_gen.ts 전용). */
export function renderHanjiBookHtml(bodyHtml: string): string {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<style>${PDF_STYLE}${PROTOTYPE_STYLE}${HANJI_STYLE}${HANJI_V4_STYLE}${HANJI_BOOK_STYLE}
  body {
    background:
      radial-gradient(ellipse 900px 500px at 12% 6%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 60%),
      radial-gradient(ellipse 800px 650px at 90% 96%, rgba(150,118,64,0.05) 0%, rgba(150,118,64,0) 55%),
      linear-gradient(175deg, #FBF6EA 0%, #F5EDDB 100%);
  }
</style>
</head>
<body>${bodyHtml}</body>
</html>`;
}

/** 프로토타입 전용 HTML 조립 — renderReportPdfHtml과 별개 함수로 둔다
 * (기존 전체 리포트 PDF 경로를 건드리지 않기 위함). body는 호출부가
 * components/pdf/ReportPdfPrototype.tsx 조각들로 직접 구성해 넘긴다. */
export function renderPrototypeHtml(bodyHtml: string): string {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<style>${PDF_STYLE}${PROTOTYPE_STYLE}</style>
</head>
<body>${bodyHtml}</body>
</html>`;
}

/** "A안" 다크 럭셔리 대표 페이지 전용 조립 함수(2026-09) — renderPrototypeHtml을
 * 대체하지 않는 별도 함수다(승인·동결된 표지/속표지/목차 경로는 계속
 * renderPrototypeHtml을 그대로 쓴다). body 배경만 먹빛으로 덮어써서, 여러
 * 페이지에 걸쳐 흐르는 .premium-section이 "내용이 짧게 끝난 페이지에서
 * 흰 여백이 드러나는" 인쇄 엔진 특성(위 .premium-section 주석 참고)을
 * 피해간다 — body(캔버스) 배경은 내용 길이와 무관하게 매 페이지 전체를
 * 칠하기 때문이다. */
export function renderDarkPrototypeHtml(bodyHtml: string): string {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<style>${PDF_STYLE}${PROTOTYPE_STYLE}
  body { background: #1D160F; }
</style>
</head>
<body>${bodyHtml}</body>
</html>`;
}

/** "A안" 재해석 v3(2026-09) — "검은 PDF"가 아니라 "고급 한지로 만든
 * 현대적 동양 운명서"로 방향 수정. 본문 기본 배경을 다시 따뜻한
 * 아이보리/한지 톤으로 되돌린다(먹빛은 표지 등 극히 일부에만 남긴다는
 * 지시). 이 톤은 사실 base PDF_STYLE의 body 배경(#FDFBF5, 근백색)과
 * 결이 같은 "밝은 종이" 계열이라 — v2(다크)에서 겪었던 "여러 페이지에
 * 걸쳐 흐르는 박스의 배경이 페이지 끝까지 안 칠해지는" 인쇄 엔진 문제
 * (.premium-section-page 주석 참고, "실측 페이지네이션"으로 해결한 바
 * 있음)가 애초에 발생하지 않는다 — body(캔버스) 배경만 살짝 더 따뜻한
 * 그라데이션으로 바꾸고, 본문은 承認된 43p 문서와 똑같이 그냥 자연스럽게
 * 흐르게 둔다(청크로 억지로 나누지 않음, #16 지시대로 기존에 푼 렌더링
 * 구조를 불필요하게 다시 뜯지 않기 위함). 텍스처는 이미지가 아니라
 * CSS 그라데이션 2~3겹만 아주 옅게 얹어 "티가 나지 않을 정도"로만 종이
 * 느낌을 낸다. */
export function renderHanjiPrototypeHtml(bodyHtml: string): string {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<style>${PDF_STYLE}${PROTOTYPE_STYLE}${HANJI_STYLE}
  body {
    background:
      radial-gradient(ellipse 900px 500px at 12% 6%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 60%),
      radial-gradient(ellipse 800px 650px at 90% 96%, rgba(150,118,64,0.05) 0%, rgba(150,118,64,0) 55%),
      linear-gradient(175deg, #FBF6EA 0%, #F5EDDB 100%);
  }
</style>
</head>
<body>${bodyHtml}</body>
</html>`;
}

/** public/pdf-assets/에서 표지·第一·五·八章용 인물 이미지를 읽어
 * base64 dataUri로 바꾼다 — 기존 검증 스크립트(_pdf_rep_v3_gen.tsx)의
 * loadImageSlot과 100% 동일한 로직(중복이지만, 그 파일은 throwaway
 * scripts/ 산출물이라 production 코드인 이 파일이 자체적으로 다시
 * 가진다). 파일이 없으면 null(placeholder로 렌더링, 생성 자체는 계속
 * 성공) — 인터넷에서 받아오지 않는다. */
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

/** 순수 문자열 조립 함수 — Puppeteer 없이도 단위 검증(섹션 누락 여부 등)이
 * 가능하도록 렌더링(HTML 문자열 생성)과 PDF 변환(브라우저 필요)을 분리했다.
 * [2026-09 PDF 디자인 마스터] intake(생년월일 등 원본 입력값 — ReportResult
 * 에는 없는 필드라 속표지에 필요)와 appData(재물 시기 밴드 계산용, 새 계산
 * 아니고 이미 있는 analyzeWealthTiming을 그대로 호출하기 위한 입력)를
 * 추가로 받는다. 스타일도 기존 PDF_STYLE 단독에서 PDF_STYLE+PROTOTYPE_STYLE+
 * HANJI_STYLE 결합으로 바꿨다 — ReportPdfDocument가 이제 표지/오프닝 등에서
 * 그 클래스들을 실제로 쓰기 때문이다(renderHanjiPrototypeHtml과 동일한
 * 스타일 조합, 별도 함수로 다시 정의하지 않고 그대로 재사용). */
export function renderReportPdfHtml(
  report: ReportResult,
  intake: IntakeFormData,
  appData: AppData,
  generatedAt?: string
): string {
  // [2026-09 아트디렉션 3차 재구현] 사용자가 완전히 새로운 이미지 세트
  // 9장(표지 1 + 챕터 8, 파일명 자체가 역할을 가리킴)을 직접 제작해서
  // 넣었다 — 기존 13장 세트는 더 이상 쓰지 않는다. 프롤로그·엔딩 전용
  // 사진은 이번 세트에 따로 없어서, 표지 사진을 앞뒤로 재사용해
  // "책을 열고 닫는" 북엔드 구성으로 삼는다(의도적 설계, 사진 부족 땜빵
  // 아님 — 같은 사진을 챕터에 두 번 쓰지 않는 원칙은 유지, 표지/엔딩은
  // 챕터가 아니라 예외).
  const fairies = {
    cover: loadImageSlot("fairy-cover"), // 밤, 보름달+매화+등불 정자, 책을 든 모습
    benjil: loadImageSlot("fairy-destiny-mountain"), // 일출, 산수, 뒷모습 — 타고난 운명/본질
    chapter: loadImageSlot("fairy-writing"), // 서재에서 붓으로 쓰는 장면, 족자+등불 — 타고난 기질
    wayOfLife: loadImageSlot("fairy-water-reflection"), // 물가에서 반영을 보는 모습 — 살아가는 방식
    love: loadImageSlot("fairy-love-letter"), // 매화 속에서 편지를 읽는 모습 — 사랑과 인연
    wealth: loadImageSlot("fairy-scroll"), // 두루마리를 펼친 책상, 금빛 — 재물운
    lifeTransition: loadImageSlot("fairy-turning-point"), // 문/입구에서 산을 바라보는 모습 — 인생의 전환점
    tenYear: loadImageSlot("fairy-future-window"), // 창가에서 빛을 바라보는 모습 — 앞으로의 10년
    gwiin: loadImageSlot("fairy-lantern"), // 등불을 드는 모습, 밤 — 귀인과 신살
    ending: loadImageSlot("fairy-cover"), // 표지와 동일 사진 재사용 — 북엔드(책을 닫는 느낌)
  };
  const bodyHtml = renderToStaticMarkup(
    <ReportPdfDocument
      report={report}
      generatedAt={generatedAt ?? formatGeneratedAt()}
      intake={intake}
      appData={appData}
      fairies={fairies}
    />
  );
  return renderHanjiPrototypeHtml(bodyHtml);
}

/** [2026-09 PDF 디자인 마스터] 표지/속표지/목차(앞 3페이지)는 번호를
 * 매기지 않고, 그 다음 페이지부터 "PALJAMUN · N" 형식의 아주 작은
 * footer를 우측 하단에 찍는다. Puppeteer의 footerTemplate은 페이지별로
 * 조건부 스킵이 안 되는(margin-box 전용, 앞부분만 건너뛰기 불가) 알려진
 * 제약이 있어(REFERENCE 문서 참고) — 대신 pdf-lib으로 완성된 PDF buffer
 * 위에 후처리로 그린다. ASCII 텍스트만 쓰므로(브랜드명 PALJAMUN + 숫자)
 * StandardFonts로 충분하다 — 한글 폰트 임베딩 불필요. */
async function stampPageNumbers(pdfBytes: Buffer, skipFirstNPages: number): Promise<Buffer> {
  const doc = await PDFDocument.load(pdfBytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  const ink = rgb(0.42, 0.36, 0.24); // #6B5D3D 근사 — 본문 잉크색 계열, 튀지 않게

  pages.forEach((page, idx) => {
    if (idx < skipFirstNPages) return;
    const pageNo = idx - skipFirstNPages + 1;
    const label = `PALJAMUN · ${pageNo}`;
    const size = 7.5;
    const width = font.widthOfTextAtSize(label, size);
    const { width: pageWidth } = page.getSize();
    page.drawText(label, {
      x: pageWidth - width - 34, // 18mm 우측 여백(@page margin) 안쪽에 살짝 더 들여서
      y: 26,
      size,
      font,
      color: ink,
      opacity: 0.75,
    });
  });

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

export async function generateReportPdfBuffer(
  report: ReportResult,
  intake: IntakeFormData,
  appData: AppData
): Promise<Buffer> {
  const html = renderReportPdfHtml(report, intake, appData);
  const browser = await puppeteer.launch({ headless: true });
  let raw: Buffer;
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
    });
    raw = Buffer.from(pdf);
  } finally {
    await browser.close();
  }
  // 앞 3페이지(표지/속표지/목차)는 번호 없음 — 그 다음(명식 페이지)부터 매김.
  return stampPageNumbers(raw, 3);
}
