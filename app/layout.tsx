import type { Metadata } from "next";
import { Noto_Serif_KR } from "next/font/google";
import "./globals.css";

const notoSerifKr = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["500", "700", "900"],
  variable: "--font-serif-kr",
  display: "swap",
});

/**
 * SEO 메타데이터 — 경쟁 서비스 비교 조사(2026-09)에서 확인된 공백 보완.
 * canonical/OG/twitter는 실제 파일(og-image로 쓰는 guide-character.png)과
 * 실제 도메인(paljamun.com) 기준으로만 채웠다. naver-site-verification은
 * 네이버 서치어드바이저에 사이트를 등록해야 발급되는 값이라 여기서 임의로
 * 만들어 넣지 않았다 — 등록 후 그 값을 받으면 이 파일에 추가한다.
 */
const SITE_URL = "https://paljamun.com";
const SITE_TITLE = "팔자문 | 나의 타고난 명식 전체 해석";
const SITE_DESCRIPTION = "당신의 사주 원본 분석 결과를 확인하세요.";
const SITE_OG_IMAGE = "/guide-character.png";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  keywords: ["사주", "사주팔자", "무료사주", "팔자문", "사주풀이", "만세력", "명리학"],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: "팔자문",
    locale: "ko_KR",
    type: "website",
    images: [{ url: SITE_OG_IMAGE, width: 1721, height: 914, alt: "팔자문" }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [SITE_OG_IMAGE],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={notoSerifKr.variable}>
      <head>
        {/* Pretendard(본문 sans 폰트)가 늦게 도착하면 fallback → 실제 폰트로
            바뀌면서 줄바꿈이 재계산될 수 있다. preconnect로 연결을 미리 열어
            폰트 CSS가 최대한 빨리 도착하게 해 그 창을 줄인다. */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css"
        />
      </head>
      <body className="bg-bg text-textMain font-sans">{children}</body>
    </html>
  );
}
