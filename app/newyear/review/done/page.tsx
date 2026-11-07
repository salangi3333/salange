import type { Metadata } from "next";
import Link from "next/link";
import { REVIEW_PATHS, REVIEW_RESULT_COPY } from "@/lib/commerce/newyearReviewPay";
import { reviewGate } from "../_gate";

/**
 * 토스 결제창 인증이 끝난 뒤 돌아오는 심사용 안내 화면(successUrl). 안내만 있다: 토스가 붙여 보내는 값(paymentKey·주문번호·금액)은 읽지도 저장하지도 않고,
 * 결제 승인 API 도 부르지 않는다. '결제 완료'·'주문 접수'로 읽히는 문구를 쓰지 않는다.
 */
export const metadata: Metadata = { title: "결제창 확인 | 팔자문", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function NewYearReviewDonePage() {
  const open = reviewGate().state === "ok"; // 서버 측 접근 검사(결제창에서 돌아와도 세션 쿠키가 따라온다. 없으면 코드 입력 화면으로 보냄)
  const c = REVIEW_RESULT_COPY.done;
  return (
    <section className="mx-auto flex min-h-screen max-w-content flex-col items-center justify-center gap-4 bg-bg px-6 text-center" data-testid="nyrev-done">
      <p className="font-serif-kr text-xl font-bold text-textMain" data-testid="nyrev-done-title">{open ? c.title : "이 화면은 열려 있지 않습니다."}</p>
      {open && <p className="text-sm leading-relaxed text-textSub" data-testid="nyrev-done-body">{c.body}</p>}
      {open && <Link href={REVIEW_PATHS.product} className="text-sm underline">상품 안내로 돌아가기</Link>}
    </section>
  );
}
