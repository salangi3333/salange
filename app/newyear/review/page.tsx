import type { Metadata } from "next";
import Link from "next/link";
import NewYearProductPage from "@/app/newyear/product/page";
import { REVIEW_PATHS } from "@/lib/commerce/newyearReviewPay";
import { reviewGate } from "./_gate";

/**
 * 토스 심사용 구매 경로의 시작 화면. 기존 상품 상세페이지(/newyear/product)를 그대로 다시 보여 주고(문구·디자인·샘플 PDF 링크 변경 없음),
 * 심사 경로에서는 '신청 접수 준비 중'·실제 신청·로컬 테스트 버튼이 헷갈리지 않게 가리고 아래 고정 버튼으로 심사용 신청 단계에 연결한다.
 * 열림 조건(심사용 스위치 + 테스트 클라이언트 키)이 아니면 상품 화면 대신 닫힘 안내만 보인다. 검색에 노출하지 않는다.
 */
export const metadata: Metadata = { title: "2027 신년운세 | 팔자문", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function NewYearReviewProductPage() {
  const g = reviewGate(); // 서버 측 접근 검사: 접속 코드로 인증된 세션이 아니면 코드 입력 화면으로 보낸다(이 아래는 렌더링되지 않는다)
  if (g.state === "closed") return <main className="mx-auto min-h-screen max-w-content px-6 py-16"><p className="rounded-card border border-accentGoldTo/60 bg-accentGoldFrom/20 p-4 text-sm font-bold text-textMain" data-testid="nyrev-closed">이 화면은 열려 있지 않습니다.</p></main>;
  const cfg = g.cfg;
  return (
    // 기존 판매 버튼 가리기는 style 태그 대신 Tailwind 선택자 클래스로 한다(서버·클라이언트가 같은 문자열을 내므로 hydration 불일치가 없다).
    <div data-testid="nyrev-product" className="pb-24 [&_[data-testid=product-closed]]:hidden [&_[data-testid=product-apply]]:hidden [&_[data-testid=product-test-apply]]:hidden">
      <NewYearProductPage />
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-bg bg-white/95 px-6 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-content flex-col gap-1">
          <Link href={REVIEW_PATHS.apply} className="block w-full rounded-pill bg-gradient-to-r from-accentGoldFrom to-accentGoldTo py-3 text-center text-sm font-bold text-dark" data-testid="nyrev-apply-link">신청하러 가기 · {cfg.amount.toLocaleString("ko-KR")}원</Link>
          <p className="text-center text-[11px] text-textSub">토스페이먼츠 심사용 결제 경로입니다(테스트 환경, 실제 청구·주문 접수 없음).</p>
        </div>
      </div>
    </div>
  );
}
