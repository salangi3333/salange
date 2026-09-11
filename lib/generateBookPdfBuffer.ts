import { IntakeFormData } from "./sajuEngine";
import { buildBookPdfHtml } from "./pdfBookHtml";
import { defaultBookImageDir, loadBookFairyImages } from "./pdfBookAssets";

/**
 * 평생운명록(book) PDF를 서버에서 Buffer로 생성한다 —
 * ReportPdfBookDocument → renderHanjiBookHtml(둘 다 lib/pdfBookHtml.ts를
 * 통해서만 호출, 로직 복제 없음) → Chromium → PDF Buffer.
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
 *     CHROMIUM_PACK_URL 환경변수로 받는다 — **이 env var는 아직 어디에도
 *     설정돼 있지 않다.** 정확한 URL은 실제 설치된 @sparticuz/chromium-min
 *     버전(현재 152.0.0)에 맞는 릴리스 자산이어야 하므로, 코드에 임의로
 *     하드코딩하지 않고 설정 안 됐으면 명확히 실패하게 뒀다(추측 금지 —
 *     실제 Vercel 배포/검증 단계에서 정확한 값을 확인해 설정해야 함).
 *     이 분기는 이번 단계에서 Vercel에 실제로 배포해 검증한 적이
 *     없다(로컬 Windows에서는애초에 실행 자체가 불가능 — Chromium
 *     바이너리가 리눅스 서버리스 전용) — "된다"고 단정하지 않는다.
 *
 * Node.js 런타임 전용이다(Edge에서 절대 동작 안 함 — Puppeteer/Chromium은
 * Node API를 직접 쓴다). 이 함수를 호출하는 쪽(향후 API route)은 반드시
 * `export const runtime = "nodejs";`를 명시해야 한다 — 이 함수 자체는 아직
 * 어떤 라우트에도 연결돼 있지 않다(이번 단계 범위 밖, 지시에 따름).
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
  generatedAt?: string
): Promise<Buffer> {
  // 1) 이미지 전부(11개) 있는지 먼저 확인 — 하나라도 없으면 여기서 즉시
  //    실패한다(브라우저를 켜기 전에 끝냄, 불필요한 리소스 낭비 방지 겸
  //    "이미지 빠진 PDF가 조용히 만들어지는 것" 자체를 원천 차단).
  const fairies = loadBookFairyImages(imageDir);

  // 2) HTML 조립 — 계산/조립/포장 전부 기존 검증된 경로 재사용(복제 없음).
  const html = await buildBookPdfHtml(intake, fairies, generatedAt);

  // 3) Chromium 실행 → PDF → Buffer.
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({ format: "A4", printBackground: true });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
