import type { Metadata } from "next";
import Link from "next/link";
import { REVIEW_PATHS, REVIEW_RESULT_COPY } from "@/lib/commerce/newyearReviewPay";
import { reviewGate } from "../_gate";

/**
 * 토스 결제창에서 닫기·실패로 돌아오는 심사용 안내 화면(failUrl). 안내만 있다: 쿼리의 코드·메시지는 읽지도 보여 주지도 않고, 저장·승인 호출도 없다.
 */
export const metadata: Metadata = { title: "결제창 확인 | 팔자문", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function NewYearReviewFailPage() {
  const open = reviewGate().state === "ok"; // 서버 측 접근 검사(세션이 없으면 코드 입력 화면으로 보냄)
  const c = REVIEW_RESULT_COPY.fail;
  return (
    <section className="mx-auto flex min-h-screen max-w-content flex-col items-center justify-center gap-4 bg-bg px-6 text-center" data-testid="nyrev-fail">
      <p className="font-serif-kr text-xl font-bold text-textMain" data-testid="nyrev-fail-title">{open ? c.title : "이 화면은 열려 있지 않습니다."}</p>
      {open && <p className="text-sm leading-relaxed text-textSub" data-testid="nyrev-fail-body">{c.body}</p>}
      {open && <Link href={REVIEW_PATHS.checkout} className="text-sm underline">주문금액 확인 화면에서 다시 시작하기</Link>}
      {open && <Link href={REVIEW_PATHS.product} className="text-sm underline">상품 안내로 돌아가기</Link>}
    </section>
  );
}
