import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  getOrderByOrderId,
  markOrderPaid,
  FULL_REPORT_PRICE,
} from "@/lib/orderStore";
import { confirmTossPayment } from "@/lib/tossPayments";

/**
 * TossPayments successUrl. 여기 도착했다고 결제가 끝난 게 아니다 — 인증만
 * 끝난 상태다(공식 문서, 2026-09 확인). 반드시 서버에서:
 *   1) DB PENDING 주문을 orderId로 찾고
 *   2) query amount가 DB amount(=FULL_REPORT_PRICE)와 같은지 확인하고
 *   3) 승인 API는 query amount가 아니라 DB amount로 호출하고
 *   4) 승인 응답(status===DONE, orderId/totalAmount 일치)까지 확인한 뒤에만
 * PENDING → PAID로 바꾼다.
 *
 * 개인 리포트 페이지와 마찬가지로 결제 정보가 담긴 화면이라 색인을 막는다.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

function Message({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="mx-auto flex min-h-screen max-w-content flex-col items-center justify-center gap-4 bg-sceneBg px-6 text-center">
      <p className="font-serif-kr text-lg font-bold text-sceneText">{title}</p>
      {children}
    </section>
  );
}

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const orderId = typeof searchParams.orderId === "string" ? searchParams.orderId : undefined;
  const paymentKey = typeof searchParams.paymentKey === "string" ? searchParams.paymentKey : undefined;
  const amountParam = typeof searchParams.amount === "string" ? searchParams.amount : undefined;

  if (!orderId || !paymentKey || !amountParam) {
    return <Message title="결제 정보가 올바르지 않습니다." />;
  }

  const order = await getOrderByOrderId(orderId);
  if (!order) {
    return <Message title="유효하지 않은 주문입니다." />;
  }

  // 이미 PAID인 주문이 새로고침/뒤로가기로 다시 들어온 경우 — 재승인을
  // 시도하지 않고 곧바로 리포트로 보낸다(무한 confirm 반복 방지).
  if (order.status === "PAID") {
    redirect(`/result-v2/${order.reportId}`);
  }

  if (order.status !== "PENDING") {
    return <Message title="이미 처리되었거나 취소된 주문입니다." />;
  }

  // successUrl 쿼리의 amount는 "참고"만 한다 — 실제 승인 기준 금액은 항상
  // DB에 저장된 order.amount(=결제 생성 시점의 FULL_REPORT_PRICE)다.
  const queryAmount = Number(amountParam);
  if (
    !Number.isFinite(queryAmount) ||
    queryAmount !== order.amount ||
    order.amount !== FULL_REPORT_PRICE
  ) {
    console.error("[payment/success] 금액 불일치 감지, orderId:", orderId);
    return <Message title="결제 금액 정보가 일치하지 않습니다." >
      <p className="text-sm text-sceneTextSub">고객센터로 문의해주세요.</p>
    </Message>;
  }

  let confirmResult;
  try {
    confirmResult = await confirmTossPayment({
      paymentKey,
      orderId: order.orderId,
      amount: order.amount, // DB 고정값만 사용 — query/client 값 사용 안 함
    });
  } catch (e) {
    if (e instanceof Error && e.message === "TOSS_SECRET_KEY_MISSING") {
      console.error("[payment/success] TOSS_SECRET_KEY 미설정");
      return (
        <Message title="결제 설정이 완료되지 않았습니다.">
          <p className="text-sm text-sceneTextSub">
            잠시 후 다시 시도해주세요. (관리자: TOSS_SECRET_KEY 환경변수 확인 필요)
          </p>
        </Message>
      );
    }
    console.error("[payment/success] 승인 API 호출 실패:", e instanceof Error ? e.message : e);
    return <Message title="결제 승인 중 문제가 발생했습니다." />;
  }

  const confirmed =
    confirmResult.ok &&
    confirmResult.status === "DONE" &&
    confirmResult.orderId === order.orderId &&
    confirmResult.totalAmount === order.amount;

  if (!confirmed) {
    console.error(
      "[payment/success] 승인 실패 또는 불일치, orderId:",
      orderId,
      "status:",
      confirmResult.status
    );
    return <Message title="결제 승인에 실패했습니다." >
      <p className="text-sm text-sceneTextSub">다시 시도해주세요.</p>
    </Message>;
  }

  const updated = await markOrderPaid(order.orderId, paymentKey);
  if (!updated) {
    // where status='PENDING' 조건에 걸려 0 rows인 경우 — 동시성 경쟁으로
    // 이미 다른 요청이 먼저 PAID로 바꿨을 가능성이 가장 크다. 다시 조회해서
    // 실제로 PAID면 정상 처리로 본다(같은 결제를 두 번 실패 취급하지 않음).
    const recheck = await getOrderByOrderId(order.orderId);
    if (recheck?.status === "PAID") {
      redirect(`/result-v2/${recheck.reportId}`);
    }
    console.error("[payment/success] PAID 갱신 실패, orderId:", orderId);
    return <Message title="결제 처리 중 문제가 발생했습니다.">
      <p className="text-sm text-sceneTextSub">고객센터로 문의해주세요.</p>
    </Message>;
  }

  redirect(`/result-v2/${updated.reportId}`);
}
