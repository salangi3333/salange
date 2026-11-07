"use client";

import { useEffect, useRef, useState } from "react";
import { loadTossPayments, ANONYMOUS } from "@tosspayments/tosspayments-sdk";
import type { TossPaymentsWidgets, WidgetPaymentMethodWidget, WidgetAgreementWidget } from "@tosspayments/tosspayments-sdk";
import { newReviewOrderId, REVIEW_PATHS } from "@/lib/commerce/newyearReviewPay";

/**
 * 토스 '심사용' 결제창 영역. 토스 위젯만 연다: 서버로 보내는 요청도, 주문 저장도, 결제 승인(confirm) 호출도 없다.
 * 주문번호는 결제창을 열 때 브라우저에서 만드는 일회용 값이고, 결제창을 닫거나 인증이 끝나면 /done 또는 /fail(안내만 있는 화면)로 돌아온다.
 * 클라이언트 키(테스트 키)·상품명·금액은 서버 화면이 내려 준 값이다.
 */
export default function NewYearReviewCheckout({ clientKey, orderName, amount, className }: { clientKey: string; orderName: string; amount: number; className?: string }) {
  const [ready, setReady] = useState(false);
  const [agreed, setAgreed] = useState<boolean | null>(null); // 위젯이 처음엔 상태를 보내지 않아 null=아직 모름. 동의 검증은 토스 위젯이 한다.
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [initError, setInitError] = useState("");
  const widgetsRef = useRef<TossPaymentsWidgets | null>(null);
  const lockRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let methodWidget: WidgetPaymentMethodWidget | null = null;
    let agreementWidget: WidgetAgreementWidget | null = null;
    (async () => {
      try {
        const toss = await loadTossPayments(clientKey);
        if (cancelled) return;
        const widgets = toss.widgets({ customerKey: ANONYMOUS });
        widgetsRef.current = widgets;
        await widgets.setAmount({ value: amount, currency: "KRW" });
        if (cancelled) return;
        methodWidget = await widgets.renderPaymentMethods({ selector: "#nyrev-payment-methods" });
        if (cancelled) { methodWidget.destroy(); return; }
        agreementWidget = await widgets.renderAgreement({ selector: "#nyrev-agreement" });
        if (cancelled) { agreementWidget.destroy(); return; }
        agreementWidget.on("agreementStatusChange", (s) => setAgreed(s.agreedRequiredTerms));
        setReady(true);
      } catch {
        if (!cancelled) setInitError("결제 수단을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
      }
    })();
    return () => { cancelled = true; methodWidget?.destroy(); agreementWidget?.destroy(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientKey]);

  const handlePay = async () => {
    if (lockRef.current || submitting || agreed === false) return;
    const widgets = widgetsRef.current;
    if (!widgets) return;
    lockRef.current = true;
    setSubmitting(true);
    setError("");
    try {
      const bytes = new Uint8Array(12); window.crypto.getRandomValues(bytes);
      const orderId = newReviewOrderId(Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(""));
      await widgets.requestPayment({
        orderId,
        orderName,
        successUrl: `${window.location.origin}${REVIEW_PATHS.done}`,
        failUrl: `${window.location.origin}${REVIEW_PATHS.fail}`,
      });
    } catch (e) {
      const code = e && typeof e === "object" && "code" in e ? String((e as { code: unknown }).code) : "";
      if (code === "NEED_AGREEMENT_WITH_REQUIRED_TERMS") { setAgreed(false); setError("필수 약관에 동의해 주세요."); }
      else if (code === "USER_CANCEL") setError("");
      else setError("결제를 진행하지 못했습니다. 필수 약관 동의와 결제 수단 선택을 확인한 뒤 다시 시도해주세요.");
    } finally {
      lockRef.current = false;
      setSubmitting(false);
    }
  };

  if (initError) return <p className="text-xs text-accentRed">{initError}</p>;

  return (
    <div className="w-full">
      <div className="overflow-hidden rounded-card"><div id="nyrev-payment-methods" /></div>
      {!ready && <p className="py-6 text-center text-xs text-textSub">결제 수단을 불러오는 중...</p>}
      <div className="mt-3 overflow-hidden rounded-card"><div id="nyrev-agreement" /></div>
      <p className="mt-4 text-center font-serif-kr text-3xl font-bold text-textMain" data-testid="nyrev-amount">{amount.toLocaleString("ko-KR")}원</p>
      <button type="button" onClick={handlePay} disabled={!ready || agreed === false || submitting} className={className} data-testid="nyrev-pay-button">
        {submitting ? "결제창 여는 중..." : `${amount.toLocaleString("ko-KR")}원 결제하기`}
      </button>
      <p className="mt-2 text-center text-[11px] text-textSub">안전한 결제 · 토스페이먼츠 (테스트 환경)</p>
      {error && <p className="mt-2 text-center text-xs text-accentRed" data-testid="nyrev-error">{error}</p>}
    </div>
  );
}
