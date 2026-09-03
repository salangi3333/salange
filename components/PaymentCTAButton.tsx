"use client";

import { useRef, useState } from "react";
import { loadTossPayments, ANONYMOUS } from "@tosspayments/tosspayments-sdk";

/**
 * TossPayments 테스트 결제 1차 구현 — "나의 전체 인생 리포트 열기 →" 버튼.
 * ResultLandingV2.tsx가 서버 컴포넌트라 이 버튼(비동기 결제 로직 필요)만
 * 별도 client 컴포넌트로 뺐다. 버튼의 텍스트/스타일/배치는 기존 정적
 * 버튼과 완전히 동일하게 유지한다 — 여기서 로직만 추가한다.
 *
 * 결제창형(現 토스 권장 방식, 2026-09 공식 문서 기준) 흐름:
 *   loadTossPayments(clientKey) → widgets({customerKey: ANONYMOUS})
 *   → setAmount() → renderPaymentWindow() → "paymentRequest" 이벤트에서
 *   requestPayment() → successUrl/failUrl로 리다이렉트.
 * "구버전" 카드/간편결제 통합결제창(payment()/requestPayment 직접 호출)은
 * 쓰지 않는다.
 *
 * reportId가 없으면(개발용 쿼리스트링 진입 등 결제 대상이 아닌 화면) 결제를
 * 시도하지 않고 안내 문구만 보여준다 — 버튼 디자인 자체는 그대로 둔다.
 */
export default function PaymentCTAButton({
  reportId,
  className,
}: {
  reportId?: string;
  className?: string;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  // 빠른 연속 클릭 방지 — ResultV2Flow.tsx의 submittingRef와 같은 패턴.
  const lockRef = useRef(false);

  const handleClick = async () => {
    if (lockRef.current) return;

    if (!reportId) {
      setError("이 화면에서는 결제를 진행할 수 없습니다.");
      return;
    }

    lockRef.current = true;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data) {
        setError((data && typeof data.error === "string" && data.error) || "주문 생성에 실패했습니다. 잠시 후 다시 시도해주세요.");
        return;
      }

      if (data.alreadyPaid) {
        window.location.href = `/result-v2/${reportId}`;
        return;
      }

      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
      if (!clientKey) {
        setError("결제 설정이 아직 완료되지 않았습니다. 잠시 후 다시 시도해주세요.");
        return;
      }

      const tossPayments = await loadTossPayments(clientKey);
      const widgets = tossPayments.widgets({ customerKey: ANONYMOUS });

      await widgets.setAmount({ value: data.amount, currency: "KRW" });

      const paymentWindow = await widgets.renderPaymentWindow({
        variantKey: { paymentMethod: "DEFAULT", agreement: "AGREEMENT" },
      });

      paymentWindow.on("paymentRequest", async () => {
        await widgets.requestPayment({
          orderId: data.orderId,
          orderName: data.orderName,
          successUrl: `${window.location.origin}/payment/success`,
          failUrl: `${window.location.origin}/payment/fail`,
        });
      });
    } catch {
      setError("결제 요청 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      lockRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={submitting}
        className={className}
      >
        {submitting ? "결제창을 여는 중..." : "나의 전체 인생 리포트 열기 →"}
      </button>
      {error && <p className="mt-2 text-xs text-sceneRed">{error}</p>}
    </>
  );
}
