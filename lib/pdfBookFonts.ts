import { readFileSync } from "fs";
import { join } from "path";

/**
 * [2026-09-11 신규] 평생운명록(book) PDF 전용 한글/한자 폰트 임베딩.
 *
 * 배경: Vercel 서버리스 Chromium(@sparticuz/chromium-min)에는 시스템
 * 폰트가 사실상 없다(Georgia조차 없음, 2026-09-11 실측 확인) — CSS가
 * "Noto Serif KR"/"Batang"/"맑은 고딕"을 선언해도 전부 못 찾고 OpenSans로
 * 대체되며 한글·한자가 전부 렌더링되지 않는 문제를 실제 Preview PDF로
 * 확인했다. 이 파일은 그 문제를 "OS에 어떤 폰트가 설치돼 있는지"에 더 이상
 * 의존하지 않는 방식으로 고친다 — 폰트 파일 자체를 PDF HTML에
 * @font-face(data URI)로 직접 박아 넣는다.
 *
 * font-family 이름을 일부러 기존과 똑같이 "Noto Serif KR"로 유지했다 —
 * PDF_STYLE의 `body { font-family: "Noto Serif KR", ... }` 선언을 전혀
 * 바꾸지 않아도, CSS 우선순위상 @font-face로 실제 등록된 "Noto Serif KR"이
 * 시스템에 설치된 동명 폰트보다 항상 먼저 쓰인다 — 로컬(Windows에도
 * NotoSerifKR-VF.ttf가 실제로 설치돼 있음, 2026-09-11 확인)과 Vercel이
 * 이제 완전히 동일한 폰트 파일로 렌더링된다.
 *
 * weight는 실제 book CSS가 쓰는 400(본문 기본값)/600/700만 포함했다(전체
 * weight 패밀리를 무작정 넣지 않음). 글자(글립) 범위는 축소하지 않았다 —
 * 고객 이름 필드가 자유 입력(string)이라 임의의 한글 음절/한자가 들어올 수
 * 있어, 특정 문자만 서브셋하면 미래의 다른 고객 데이터에서 다시 이 문제가
 * 재발할 위험이 있기 때문이다(2026-09-11, 의도적 설계 판단).
 *
 * 출처/라이선스: public/pdf-assets-fonts/NOTICE.md, OFL.txt 참고
 * (SIL Open Font License 1.1, Google Fonts 공식 저장소).
 */

const WEIGHTS = [400, 600, 700] as const;

export function defaultPdfFontDir(): string {
  return join(process.cwd(), "public", "pdf-assets-fonts");
}

function loadWeightBase64(dir: string, weight: number): string {
  // pdfBookAssets.ts의 loadOne()과 동일하게 fail-loud — 파일이 없으면
  // 조용히 시스템 폰트로 폴백하지 않고 여기서 즉시(readFileSync가 던지는
  // ENOENT 그대로) 실패한다.
  const p = join(dir, `NotoSerifKR-${weight}.woff2`);
  const buf = readFileSync(p);
  return buf.toString("base64");
}

/** book PDF HTML의 <style> 최상단에 그대로 삽입할 @font-face CSS 블록. */
export function buildNotoSerifKrFontFaceCss(dir: string = defaultPdfFontDir()): string {
  return WEIGHTS.map(
    (weight) => `
  @font-face {
    font-family: "Noto Serif KR";
    font-style: normal;
    font-weight: ${weight};
    font-display: block;
    src: url(data:font/woff2;base64,${loadWeightBase64(dir, weight)}) format("woff2");
  }`
  ).join("\n");
}
