import { IntakeFormData } from "./sajuEngine";
import { buildBookPdfHtml } from "./pdfBookHtml";
import { defaultBookImageDir, loadBookFairyImages } from "./pdfBookAssets";
import { PAGINATE_DARK_JS } from "./pdfBookPaginate";

/**
 * 평생운명록(book) PDF를 서버에서 Buffer로 생성한다 —
 * ReportPdfBookDarkDocument → renderDarkFullBookHtml(둘 다
 * lib/pdfBookHtml.ts를 통해서만 호출, 로직 복제 없음) → Chromium → PDF
 * Buffer.
 *
 * [2026-10-02 변경] buildBookPdfHtml()이 다크 PDF를 반환하도록 바뀌면서,
 * 다크 PDF 전용으로 이번 세션에서 이미 검증된 생성 파라미터(390x844 뷰포트,
 * `.flow`를 `.page`로 나누는 PAGINATE_DARK_JS 실행, A4 대신 390x844 용지
 * 크기)를 그대로 가져왔다 — 새 값을 새로 만들지 않고, 10명 시뮬레이션
 * 검수에 실제로 썼던 값(scripts/_scratch_dark_final_pdf_hong.ts 등)을
 * 그대로 재사용한다. 라이트 PDF(A4, 뷰포트/페이지네이션 불필요)와 다크 PDF는
 * 생성 방식 자체가 다르므로, Document/renderer만 바꾸고 이 부분을 안
 * 바꾸면 빈 페이지 1장짜리 PDF가 나온다.
 *
 * [2026-09-11 신규] 이 함수 하나로 로컬/서버 양쪽을 전부 커버한다:
 *   - 로컬(이 프로젝트 개발 환경, Windows 포함): process.env.VERCEL이 없으므로
 *     기존에 이미 정상 동작하던 일반 puppeteer(전체 Chromium 번들)를 그대로
 *     씀 — scripts/_pdf_book_v1_gen.ts가 바로 이 경로로 로컬 검증된다.
 *   - Vercel Production(process.env.VERCEL 존재): puppeteer-core +
 *     @sparticuz/chromium-min(서버리스 전용 경량 Chromium)을 씀. -min
 *     변형은 Chromium 바이너리를 패키지에 안 담고 실행 시점에 외부
 *     URL에서 받아오는 구조라(설치 용량을 250MB 표준 한도 안에 안전하게
 *     맞추기 위함, 2026-09-11 Vercel 서버리스 조사 결과 채택) 그 URL을
 *     CHROMIUM_PACK_URL 환경변수로 받는다. [2026-10-02 정정] 이 변수는
 *     Vercel Production에 이미 설정돼 있음을 `vercel env ls production`으로
 *     직접 확인했다(위 문단은 2026-09-11 작성 당시의 낡은 상태였다) — 값은
 *     여기서도 출력/하드코딩하지 않는다.
 *
 * Node.js 런타임 전용이다(Edge에서 절대 동작 안 함 — Puppeteer/Chromium은
 * Node API를 직접 쓴다). 이 함수를 호출하는 쪽은 `export const runtime =
 * "nodejs";`를 명시해야 한다 — `lib/reportDelivery.ts`의
 * `sendReportPdfEmail()`이 이미 이 함수를 호출하고 있다(관리자 수동 주문
 * 경로, app/api/admin/manual-orders 등).
 */

const REQUIRED_CHROMIUM_MIN_VERSION = "152.0.0"; // package.json에 설치된 실제 버전과 반드시 일치해야 함(문서화용 상수)

async function launchBrowser() {
  if (process.env.VERCEL) {
    const packUrl = process.env.CHROMIUM_PACK_URL;
    if (!packUrl) {
      // 조용히 잘못된 값으로 진행하지 않는다 — 설정 전에는 명확히 실패.
      throw new Error(
        `[generateBookPdfBuffer] CHROMIUM_PACK_URL이 설정되어 있지 않습니다. ` +
          `@sparticuz/chromium-min@${REQUIRED_CHROMIUM_MIN_VERSION}에 맞는 ` +
          `chromium pack(.tar) URL을 확인해 설정해야 합니다(실제 Vercel 검증 전 단계).`
      );
    }
    const { default: chromium } = await import("@sparticuz/chromium-min");
    const puppeteerCore = await import("puppeteer-core");
    const executablePath = await chromium.executablePath(packUrl);
    // [2026-09-11 확인] 설치된 @sparticuz/chromium-min@152.0.0의 실제 타입
    // 정의(node_modules/@sparticuz/chromium-min/build/index.d.ts)에는
    // defaultViewport/headless 정적 속성이 없다(과거 버전 예제와 다름,
    // 추측으로 안 쓰고 실제 타입 확인 후 반영) — args/executablePath만 있음.
    return puppeteerCore.launch({
      args: chromium.args,
      executablePath,
      headless: true,
    });
  }

  // 로컬(Vercel 아님) — 기존에 이미 검증된 일반 puppeteer 그대로.
  const { default: puppeteer } = await import("puppeteer");
  return puppeteer.launch({ headless: true });
}

/**
 * @param intake 리포트 대상 고객의 사주 입력값(기존 IntakeFormData 그대로 재사용)
 * @param imageDir 이미지 소스 폴더(기본값: public/pdf-assets-optimized).
 *   테스트에서만 다른 값을 주입할 수 있게 열어뒀다 — 운영 경로는 항상 기본값.
 * @param generatedAt PDF에 표시할 생성일 문자열(기본: 오늘 날짜 자동 포맷)
 */
export async function generateBookPdfBuffer(
  intake: IntakeFormData,
  imageDir: string = defaultBookImageDir(),
  generatedAt?: string,
  referenceYear?: number
): Promise<Buffer> {
  // 1) 이미지 전부(11개) 있는지 먼저 확인 — 하나라도 없으면 여기서 즉시
  //    실패한다(브라우저를 켜기 전에 끝냄, 불필요한 리소스 낭비 방지 겸
  //    "이미지 빠진 PDF가 조용히 만들어지는 것" 자체를 원천 차단).
  const fairies = loadBookFairyImages(imageDir);

  // 2) HTML 조립 — 계산/조립/포장 전부 기존 검증된 경로 재사용(복제 없음).
  const html = await buildBookPdfHtml(intake, fairies, generatedAt, referenceYear);

  // 3) Chromium 실행 → PDF → Buffer.
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(PAGINATE_DARK_JS);
    const pdf = await page.pdf({ width: "390px", height: "844px", printBackground: true, preferCSSPageSize: false });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
