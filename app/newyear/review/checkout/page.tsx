import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";
import NewYearReviewCheckout from "@/components/newyear/NewYearReviewCheckout";
import { REVIEW_PATHS } from "@/lib/commerce/newyearReviewPay";
import { reviewGate } from "../_gate";

/**
 * 토스 심사용 구매 경로 3단계: 주문금액 확인 → 토스 테스트 카드 결제창. 주문은 만들지 않는다(서버 저장·메모리 주문 없음): 상품명·금액은 카탈로그 값, 주문번호는 결제창을 열 때 브라우저가 만든다.
 * 서버는 키(테스트 클라이언트 키)와 금액을 내려 줄 뿐이며 결제 승인 API 는 어디에서도 부르지 않는다.
 */
export const metadata: Metadata = { title: "2027 신년운세 결제 | 팔자문", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const Card = ({ title, step, children }: { title: string; step: number; children: React.ReactNode }) => (
  <section className="rounded-card border border-bg bg-white p-5 sm:p-6">
    <h2 className="flex items-center gap-2 font-serif-kr text-lg font-bold text-textMain">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-pill bg-dark text-xs text-accentGoldFrom">{step}</span>{title}
    </h2>
    <div className="mt-3 text-sm leading-relaxed text-textMain">{children}</div>
  </section>
);

export default function NewYearReviewCheckoutPage() {
  const g = reviewGate(); // 서버 측 접근 검사: 주소를 직접 입력해도 인증된 세션이 아니면 결제 화면(키·금액)이 만들어지지 않는다
  if (g.state === "closed") return <main className="mx-auto min-h-screen max-w-content px-6 py-16"><p className="rounded-card border border-accentGoldTo/60 bg-accentGoldFrom/20 p-4 text-sm font-bold text-textMain" data-testid="nyrev-closed">이 화면은 열려 있지 않습니다.</p></main>;
  const cfg = g.cfg;
  return (
    <main className="min-h-screen bg-bg" data-testid="nyrev-checkout">
      <div className="mx-auto flex w-full max-w-content flex-col gap-4 px-6 py-10">
        <h1 className="font-serif-kr text-2xl font-bold text-textMain">팔자문 2027 신년운세 결제</h1>
        <p className="rounded-box border border-accentRed/40 bg-white p-3 text-xs leading-relaxed text-accentRed" data-testid="nyrev-banner">
          토스페이먼츠 심사용 테스트 경로입니다. 결제창까지 확인하며 결제 승인은 요청하지 않으므로 실제 청구·주문 접수·PDF 제작·이메일 발송이 일어나지 않습니다.
        </p>
        <Card step={1} title="주문금액 확인">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1" data-testid="nyrev-order">
            <dt className="text-textSub">상품명</dt><dd>{cfg.orderName}</dd>
            <dt className="text-textSub">수량</dt><dd>1</dd>
            <dt className="text-textSub">결제금액</dt><dd className="font-bold">{cfg.amount.toLocaleString("ko-KR")}원</dd>
          </dl>
          <p className="mt-2 text-xs text-textSub">PDF 제공 기한과 취소·환불은 <Link className="underline" href={`${REVIEW_PATHS.product}#refund`}>상품 안내</Link>에서 다시 확인할 수 있습니다. 신청 단계를 다시 보려면 <Link className="underline" href={REVIEW_PATHS.apply}>신청 화면으로 돌아가기</Link>.</p>
        </Card>
        <Card step={2} title="결제">
          <NewYearReviewCheckout clientKey={cfg.clientKey} orderName={cfg.orderName} amount={cfg.amount} className="mt-4 block w-full rounded-pill bg-gradient-to-r from-accentGoldFrom to-accentGoldTo py-3 text-sm font-bold text-dark disabled:cursor-not-allowed disabled:opacity-50" />
        </Card>
      </div>
      <div className="mx-auto w-full max-w-content px-6"><Footer scope="newyear" /></div>
    </main>
  );
}
