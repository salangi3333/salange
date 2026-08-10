import type { Metadata } from "next";
import { Noto_Serif_KR } from "next/font/google";
import "./globals.css";

const notoSerifKr = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["500", "700", "900"],
  variable: "--font-serif-kr",
  display: "swap",
});

export const metadata: Metadata = {
  title: "사주풀이 | 나의 타고난 명식 전체 해석",
  description: "당신의 사주 원본 분석 결과를 확인하세요.",
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
