"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { loadTossPayments, ANONYMOUS } from "@tosspayments/tosspayments-sdk";
import type {
  TossPaymentsWidgets,
  WidgetPaymentMethodWidget,
  WidgetAgreementWidget,
} from "@tosspayments/tosspayments-sdk";

/**
 * 팔자문 공용 인라인 결제 영역 — 2026-09 "천기문/타이트사주 계열 인라인
 * 결제 UX" 승인 작업.
 *
 * 기존 PaymentCTAButton.tsx(결제창/모달, `renderPaymentWindow`)를 대체해
 * 결제수단 선택(`renderPaymentMethods`) → Toss 약관 동의(`renderAgreement`)
 * → 팔자문 자체 정책 링크 → 금액 → 결제 버튼이 한 화면 안에서 이어지는
 * 구조로 만든다. 두 메서드 모두 SDK(2.8.1)에 이미 공식·비-deprecated로
 * 존재함을 사전 조사로 확인했다(재조사 없이 바로 구현).
 *
 * 재사용 전제 — 평생운명록 외 재물운/애정운/궁합/올해운 등 향후 상품에서도
 * `reportId`/`amount`만 바꿔 그대로 쓸 수 있도록, 주문 정보(orderName 포함)는
 * 이 컴포넌트가 만들어내지 않고 항상 POST /api/orders 응답을 그대로 쓴다.
 *
 * 결제 파이프라인 보존 — 아래는 기존 PaymentCTAButton.tsx와 완전히 동일하게
 * 유지한다(바뀌는 건 "결제수단 선택 UI가 모달이냐 인라인이냐"뿐):
 *   POST /api/orders(reportId만 전송, amount/orderName은 서버가 결정)
 *   → alreadyPaid면 즉시 리다이렉트
 *   → widgets.requestPayment({orderId, orderName, successUrl, failUrl})
 *   → successUrl(app/payment/success/page.tsx)이 서버에서 confirm/PAID 처리
 * 주문 생성·승인·PAID 판정 로직은 이 파일에서 전혀 새로 만들지 않는다.
 *
 * reportId가 없으면(개발용 쿼리스트링 진입 등) 기존과 동일하게 위젯을
 * 렌더링하지 않고 안내 문구만 보여준다.
 */
export default function TossInlineCheckout({
  reportId,
  amount,
  className,
}: {
  reportId?: string;
  amount: number;
  className?: string;
}) {
  const [ready, setReady] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [initError, setInitError] = useState("");

  const widgetsRef = useRef<TossPaymentsWidgets | null>(null);
  const lockRef = useRef(false);

  useEffect(() => {
    if (!reportId) return;

    // React 18 StrictMode(reactStrictMode: true, next.config.js)의 개발모드
    // 이중 mount 대응 — 매 effect 실행마다 로컬 변수로 위젯을 들고 있다가,
    // 이 effect가 정리(cancel)된 뒤에는 아직 진행 중인 await 다음 단계에서
    // 즉시 멈추거나 만들어진 위젯을 바로 destroy한다. 두 인스턴스가 동시에
    // 같은 selector에 렌더링을 시도하는 상황 자체를 만들지 않는다.
    let cancelled = false;
    let paymentMethodWidget: WidgetPaymentMethodWidget | null = null;
    let agreementWidget: WidgetAgreementWidget | null = null;

    (async () => {
      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
      if (!clientKey) {
        if (!cancelled) setInitError("결제 설정이 아직 완료되지 않았습니다. 잠시 후 다시 시도해주세요.");
        return;
      }

      try {
        const tossPayments = await loadTossPayments(clientKey);
        if (cancelled) return;

        const widgets = tossPayments.widgets({ customerKey: ANONYMOUS });
        widgetsRef.current = widgets;

        await widgets.setAmount({ value: amount, currency: "KRW" });
        if (cancelled) return;

        paymentMethodWidget = await widgets.renderPaymentMethods({
          selector: "#toss-payment-methods",
        });
        if (cancelled) {
          paymentMethodWidget.destroy();
          return;
        }

        agreementWidget = await widgets.renderAgreement({
          selector: "#toss-agreement",
        });
        if (cancelled) {
          agreementWidget.destroy();
          return;
        }

        agreementWidget.on("agreementStatusChange", (status) => {
          setAgreed(status.agreedRequiredTerms);
        });

        setReady(true);
      } catch {
        if (!cancelled) {
          setInitError("결제 수단을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
        }
      }
    })();

    return () => {
      cancelled = true;
      paymentMethodWidget?.destroy();
      agreementWidget?.destroy();
    };
    // amount는 화면 하나에서 바뀌지 않는 값(상품별 고정가) — reportId 변경
    // 시에만 다시 초기화한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  const handlePay = async () => {
    if (lockRef.current || submitting || !agreed || !reportId) return;
    const widgets = widgetsRef.current;
    if (!widgets) return;

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

      await widgets.requestPayment({
        orderId: data.orderId,
        orderName: data.orderName,
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
      });
    } catch {
      setError("결제 요청 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      lockRef.current = false;
      setSubmitting(false);
    }
  };

  if (!reportId) {
    return <p className="text-xs text-sceneRed">이 화면에서는 결제를 진행할 수 없습니다.</p>;
  }

  if (initError) {
    return <p className="text-xs text-sceneRed">{initError}</p>;
  }

  return (
    <div className="w-full">
      {/* 1. Toss 공식 결제수단 선택 UI — 실제 가맹점에서 쓸 수 있는 수단만
          토스가 그려준다. 카카오페이/네이버페이 등을 직접 버튼으로 흉내내지
          않는다. */}
      <div className="overflow-hidden rounded-card">
        <div id="toss-payment-methods" />
      </div>
      {!ready && (
        <p className="py-6 text-center text-[12px] text-sceneTextSub">결제 수단을 불러오는 중...</p>
      )}

      {/* 2. Toss 공식 약관 동의 UI(결제서비스 자체 약관) — 팔자문 자체
          약관/개인정보처리방침/환불정책과는 별개다. */}
      <div className="mt-3 overflow-hidden rounded-card">
        <div id="toss-agreement" />
      </div>

      {/* 3. 팔자문 자체 정책 링크 — Toss 약관 동의와 별개로 항상 노출.
          결제 중 진행 상태가 날아가지 않도록 새 탭으로 연다. */}
      <p className="mt-4 text-center text-[12px] leading-relaxed text-sceneTextSub">
        결제 진행 전{" "}
        <Link href="/terms" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
          이용약관
        </Link>
        ,{" "}
        <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
          개인정보처리방침
        </Link>
        ,{" "}
        <Link href="/refund" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
          환불정책
        </Link>
        을 확인해주세요.
      </p>

      {/* 4. 실제 결제금액 — amount prop 하나만 표시에 쓴다(별도 하드코딩 없음). */}
      <p className="mt-4 text-center font-serif-kr text-[30px] font-bold text-sceneGold">
        {amount.toLocaleString()}원
      </p>

      {/* 5. 결제 버튼 */}
      <button
        type="button"
        onClick={handlePay}
        disabled={!ready || !agreed || submitting}
        className={className}
      >
        {submitting ? "결제 진행 중..." : `${amount.toLocaleString()}원 결제하기`}
      </button>

      {/* 6. 안전결제 표시 */}
      <p className="mt-2 text-center text-[11px] text-sceneTextSub">안전한 결제 · 토스페이먼츠</p>

      {error && <p className="mt-2 text-center text-xs text-sceneRed">{error}</p>}
    </div>
  );
}
