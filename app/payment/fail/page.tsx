import type { Metadata } from "next";
import Link from "next/link";
import { getOrderByOrderId, markOrderTerminal } from "@/lib/orderStore";

/**
 * TossPayments failUrl. 사용자가 결제를 취소했거나, 인증/카드 오류 등으로
 * 결제 요청 자체가 실패한 경우 여기로 온다(공식 문서, 2026-09 확인:
 * confirm API는 호출하지 않는 흐름). raw error stack이나 Toss의 message를
 * 그대로 노출하지 않고, 항상 같은 짧은 안내문만 보여준다.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// 사용자가 스스로 취소/포기한 경우로 볼 수 있는 코드만 CANCELLED로 분류
// 한다(공식 트러블슈팅 문서에 등장하는 코드, 2026-09 확인). 그 외 코드는
// 분류를 억지로 확정하지 않고 FAILED로만 남긴다 — "카드 오류"처럼 세부
// 원인을 임의로 재단하지 않는다.
const CANCEL_CODES = new Set(["PAY_PROCESS_CANCELED", "PAY_PROCESS_ABORTED"]);

export default async function PaymentFailPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const code = typeof searchParams.code === "string" ? searchParams.code : undefined;
  const orderId = typeof searchParams.orderId === "string" ? searchParams.orderId : undefined;

  let reportId: string | null = null;

  if (orderId) {
    try {
      const order = await getOrderByOrderId(orderId);
      if (order) {
        reportId = order.reportId;
        if (order.status === "PENDING") {
          await markOrderTerminal(orderId, code && CANCEL_CODES.has(code) ? "CANCELLED" : "FAILED");
        }
      }
    } catch (e) {
      // 상태 갱신이 실패해도 사용자에게는 동일한 안내만 보여준다 — 내부
      // 오류 내용을 노출하지 않는다. 원인 코드만 서버 로그에 남긴다.
      console.error("[payment/fail] 주문 상태 갱신 실패:", e instanceof Error ? e.message : e);
    }
  }

  return (
    <section className="mx-auto flex min-h-screen max-w-content flex-col items-center justify-center gap-6 bg-sceneBg px-6 text-center">
      <p className="font-serif-kr text-lg font-bold text-sceneText">
        결제가 완료되지 않았습니다.
      </p>
      <div className="flex flex-col items-center gap-3">
        {reportId && (
          <Link
            href={`/result-v2/${reportId}`}
            className="rounded-pill bg-gradient-to-r from-accentGoldFrom to-accentGoldTo px-8 py-4 text-base font-bold text-dark"
          >
            다시 결제하기
          </Link>
        )}
        {reportId && (
          <Link href={`/result-v2/${reportId}`} className="text-sm text-sceneTextSub underline underline-offset-2">
            리포트로 돌아가기
          </Link>
        )}
        {!reportId && (
          <Link href="/" className="text-sm text-sceneTextSub underline underline-offset-2">
            홈으로 돌아가기
          </Link>
        )}
      </div>
    </section>
  );
}
