import { NextRequest, NextResponse } from "next/server";
import { getReportInput, isValidReportId } from "@/lib/reportStore";
import { createOrGetPendingOrder } from "@/lib/orderStore";

/**
 * TossPayments 테스트 결제 1차 구현 — 주문 생성 전용 서버 엔드포인트.
 *
 * 클라이언트가 보내는 값은 reportId 하나뿐이다. amount/orderName/status/
 * paymentKey는 클라이언트가 절대 지정할 수 없다 — 서버(lib/orderStore.ts의
 * FULL_REPORT_PRICE)가 전부 결정한다.
 *
 * 순서: reportId 형식 검증 → report 존재 확인 → (이미 PAID/PENDING이면
 * 그 상태를 그대로 반환/재사용, 아니면) 새 PENDING 주문 생성.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const reportId = (body as Record<string, unknown> | null)?.reportId;
  if (typeof reportId !== "string" || !isValidReportId(reportId)) {
    return NextResponse.json({ error: "유효하지 않은 리포트입니다." }, { status: 400 });
  }

  let reportExists: boolean;
  try {
    reportExists = (await getReportInput(reportId)) !== null;
  } catch (e) {
    console.error("[api/orders] report 조회 실패:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "주문 생성에 실패했습니다. 잠시 후 다시 시도해주세요." }, { status: 500 });
  }
  if (!reportExists) {
    return NextResponse.json({ error: "존재하지 않는 리포트입니다." }, { status: 404 });
  }

  try {
    const result = await createOrGetPendingOrder(reportId);
    if (result.alreadyPaid) {
      return NextResponse.json({ alreadyPaid: true });
    }
    return NextResponse.json({
      alreadyPaid: false,
      orderId: result.orderId,
      amount: result.amount,
      orderName: result.orderName,
    });
  } catch (e) {
    console.error("[api/orders] 주문 생성 실패:", e instanceof Error ? e.message : e);
    return NextResponse.json(
      { error: "주문 생성에 실패했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 }
    );
  }
}
