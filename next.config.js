/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // [2026-09-11 추가] lib/generateBookPdfBuffer.ts(이미지)와
  // lib/pdfBookFonts.ts(임베딩 폰트)가 런타임에 public/pdf-assets-optimized,
  // public/pdf-assets-fonts를 동적 파일명으로 읽는다(fs 경로가 변수로
  // 조합돼 Next.js의 자동 정적 분석(@vercel/nft)이 못 찾을 수 있음 —
  // 2026-09-11 Vercel 서버리스 조사 + Preview 실측 검증에서 확인된 제약).
  //
  // [2026-09-11] Preview 검증 때는 이 키를 실제 API route 경로
  // (`/api/pdf-verify-temp`)로 좁혀서 tracing이 정상 동작하는지 확인했다
  // (정상 동작 확인됨). 그 임시 route는 검증 후 삭제했고, 아직 PDF를
  // 생성하는 정식 API route가 없어서 좁힐 대상 경로 자체가 없다 — 그래서
  // 전역 키('/*')로 되돌려 둔다. **향후 실제 PDF 생성 API route(예:
  // /admin/api/orders 등)가 만들어지면, 이 키를 그 route의 실제 경로로
  // 좁히는 것을 권장한다** — 지금의 '/*'는 route가 없는 동안의 안전한
  // 기본값이지 최종본이 아니다.
  experimental: {
    outputFileTracingIncludes: {
      "/*": [
        "./public/pdf-assets-optimized/**/*",
        "./public/pdf-assets-fonts/**/*",
      ],
    },
  },
};

module.exports = nextConfig;
