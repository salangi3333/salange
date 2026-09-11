"use client";

import { useState } from "react";
import IntakeForm from "@/components/IntakeForm";
import { IntakeFormData } from "@/lib/sajuEngine";
import { FULL_REPORT_PRICE } from "@/lib/orderStore";

/**
 * 관리자 수동 주문 등록 폼 — 기존 components/IntakeForm.tsx(사주 입력
 * UI/검증)를 한 글자도 수정하지 않고 그대로 재사용하고, 그 위에 email/
 * amount 입력과 제출/결과 표시만 얹는다. 채널은 화면에 "당근(karrot)"
 * 고정 표시만 하고 입력란으로 만들지 않는다(서버도 항상 강제 고정).
 *
 * idempotencyKey: 이 컴포넌트가 처음 마운트될 때 crypto.randomUUID()로
 * 1개 생성(useState lazy initializer — 리렌더링마다 재생성되지 않음).
 * 재생성 시점은 딱 두 가지: (1) 주문 등록 성공 후 "다음 고객" 클릭,
 * (2) 이 컴포넌트가 처음 마운트될 때뿐. 제출 실패/네트워크 재시도/
 * 더블클릭에서는 절대 재생성하지 않고 같은 값을 그대로 재사용한다 —
 * 이 값이 서버의 Hard Idempotency(orders.order_id UNIQUE) 하드 개런티와
 * 맞물려 중복 주문 생성을 막는다.
 */

type Step = "intake" | "confirm" | "success";

interface OrderResult {
  reportId: string;
  orderId: string;
  deliveryId: string;
}

function genIdempotencyKey(): string {
  return crypto.randomUUID();
}

export default function AdminOrderForm() {
  const [step, setStep] = useState<Step>("intake");
  const [intake, setIntake] = useState<IntakeFormData | null>(null);
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState(String(FULL_REPORT_PRICE));
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => genIdempotencyKey());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<OrderResult | null>(null);

  const handleIntakeSubmit = (data: IntakeFormData) => {
    setIntake(data);
    setStep("confirm");
    setError("");
  };

  const handleSubmitOrder = async () => {
    if (!intake || submitting) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError("유효한 이메일을 입력해주세요.");
      return;
    }
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError("금액을 다시 확인해주세요.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/admin/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: intake.name,
          gender: intake.gender,
          calendarType: intake.calendarType,
          isLeapMonth: intake.isLeapMonth,
          birthYear: intake.year,
          birthMonth: intake.month,
          birthDay: intake.day,
          birthHour: intake.hour,
          birthMinute: intake.minute,
          timeUnknown: intake.timeUnknown,
          email: trimmedEmail,
          amount: amountNum,
          idempotencyKey,
        }),
      });
      const json: Record<string, unknown> = await res.json().catch(() => ({}));

      if (res.status === 401 || res.status === 403) {
        setError("로그인이 만료되었습니다. 새로고침 후 다시 로그인해주세요.");
        setSubmitting(false);
        return;
      }
      if (res.status === 200 || res.status === 201) {
        setResult({
          reportId: String(json.reportId ?? ""),
          orderId: String(json.orderId ?? ""),
          deliveryId: String(json.deliveryId ?? ""),
        });
        setStep("success");
        setSubmitting(false);
        return;
      }
      // 400/409/500 — 서버가 이미 안전한 한국어 메시지만 내려준다(내부
      // secret/stack/DB 오류 원문은 서버가 애초에 클라이언트로 안 보냄).
      setError(
        typeof json.error === "string" ? json.error : "주문 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요."
      );
      setSubmitting(false);
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
      setSubmitting(false);
    }
  };

  const handleNextCustomer = () => {
    setStep("intake");
    setIntake(null);
    setEmail("");
    setAmount(String(FULL_REPORT_PRICE));
    setIdempotencyKey(genIdempotencyKey()); // 명시적으로 "새 주문" 시작 — 여기서만 재생성
    setResult(null);
    setError("");
  };

  if (step === "intake") {
    return <IntakeForm onSubmit={handleIntakeSubmit} />;
  }

  if (step === "success" && result) {
    return (
      <div className="mx-auto flex max-w-content flex-col items-center gap-4 py-16 text-center">
        <p className="text-lg font-bold text-textMain">주문이 등록되었습니다</p>
        <div className="w-full rounded-card border border-bg bg-white p-4 text-left text-sm text-textMain">
          <p>reportId: {result.reportId}</p>
          <p>orderId: {result.orderId}</p>
          <p>deliveryId: {result.deliveryId}</p>
        </div>
        <button
          type="button"
          onClick={handleNextCustomer}
          className="rounded-pill bg-gradient-to-r from-accentGoldFrom to-accentGoldTo px-6 py-3 text-sm font-bold text-dark"
        >
          다음 고객 입력
        </button>
      </div>
    );
  }

  // step === "confirm"
  return (
    <div className="mx-auto flex max-w-content flex-col gap-4 py-6">
      <div className="rounded-card border border-bg bg-white p-4 text-sm text-textMain">
        <p className="font-bold">{intake?.name}</p>
        <p className="text-textSub">
          {intake?.year}년 {intake?.month}월 {intake?.day}일 ·{" "}
          {intake?.calendarType === "solar" ? "양력" : "음력"} ·{" "}
          {intake?.gender === "female" ? "여성" : "남성"}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-textMain">이메일</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="customer@example.com"
          className="rounded-box border border-bg bg-bg/50 px-4 py-3 text-sm text-textMain outline-none focus:border-accentGoldTo"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-textMain">결제금액</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="rounded-box border border-bg bg-bg/50 px-4 py-3 text-sm text-textMain outline-none focus:border-accentGoldTo"
        />
      </div>

      <p className="text-xs text-textSub">채널: 당근(karrot)</p>

      {error && <p className="text-xs text-accentRed">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setStep("intake")}
          disabled={submitting}
          className="flex-1 rounded-pill border border-bg py-3 text-sm font-medium text-textMain disabled:cursor-not-allowed disabled:opacity-50"
        >
          이전으로
        </button>
        <button
          type="button"
          onClick={handleSubmitOrder}
          disabled={submitting}
          className="flex-1 rounded-pill bg-gradient-to-r from-accentGoldFrom to-accentGoldTo py-3 text-sm font-bold text-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "등록 중..." : "주문 등록"}
        </button>
      </div>
    </div>
  );
}
