import { randomUUID } from "crypto";

/**
 * TossPayments 결제 승인 — server-to-server 전용(브라우저에서 절대 호출하지
 * 않는다). "use client" 파일에서 이 파일을 import하지 않는다 — TOSS_SECRET_KEY
 * 가 클라이언트 번들에 들어가면 안 된다(lib/db.ts의 DATABASE_URL과 동일한
 * 원칙).
 *
 * 공식 문서(2026-09 확인, 결제창형/주문서형 공통 승인 엔드포인트):
 *   POST https://api.tosspayments.com/v1/payments/confirm
 *   Authorization: Basic base64(`${TOSS_SECRET_KEY}:`)
 *   body: { paymentKey, orderId, amount }
 * 성공 시 HTTP 200 + Payment 객체(status, orderId, totalAmount 등 포함).
 * status가 "DONE"이어야 실제로 승인 완료된 것이다 — 그 외(READY/IN_PROGRESS/
 * WAITING_FOR_DEPOSIT/CANCELED/PARTIAL_CANCELED/ABORTED/EXPIRED)는 완료가
 * 아니다.
 *
 * amount는 항상 호출부(app/payment/success/page.tsx)가 DB에 저장된 값
 * (orders.amount)으로 넘긴다 — 리다이렉트 쿼리스트링의 amount를 그대로 쓰지
 * 않는다.
 *
 * Idempotency-Key 헤더(공식 문서, 2026-09 확인: UUID v4 권장, 최대 300자,
 * 최초 요청 후 15일 유효)를 붙여, confirm 요청이 네트워크 재시도 등으로
 * 중복 전송되더라도 토스 쪽에서 같은 응답을 재사용하게 한다 — 클라이언트
 * 변수 하나로 중복을 막는 수준이 아니라 API 레벨에서 막는다.
 */
export interface TossConfirmResult {
  ok: boolean;
  /** Payment 객체의 status 필드. 성공 시 "DONE" */
  status?: string;
  orderId?: string;
  paymentKey?: string;
  /** Payment 객체의 totalAmount 필드 — 우리 DB amount와 반드시 대조한다. */
  totalAmount?: number;
}

export async function confirmTossPayment(params: {
  paymentKey: string;
  orderId: string;
  amount: number;
}): Promise<TossConfirmResult> {
  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) {
    throw new Error("TOSS_SECRET_KEY_MISSING");
  }

  const auth = Buffer.from(`${secretKey}:`).toString("base64");

  const res = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      "Idempotency-Key": randomUUID(),
    },
    body: JSON.stringify({
      paymentKey: params.paymentKey,
      orderId: params.orderId,
      amount: params.amount,
    }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || !data || typeof data !== "object") {
    // Toss 오류 응답에는 code/message가 있지만, 여기서 로그로 남기는 건
    // 호출부 몫이다 — 이 함수는 시크릿 키/Authorization 헤더/응답 원문을
    // 절대 로그로 출력하지 않는다.
    return { ok: false };
  }

  const payment = data as Record<string, unknown>;
  return {
    ok: true,
    status: typeof payment.status === "string" ? payment.status : undefined,
    orderId: typeof payment.orderId === "string" ? payment.orderId : undefined,
    paymentKey: typeof payment.paymentKey === "string" ? payment.paymentKey : undefined,
    totalAmount: typeof payment.totalAmount === "number" ? payment.totalAmount : undefined,
  };
}
