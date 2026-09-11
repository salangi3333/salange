import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { createManualPaidOrder } from "@/lib/manualOrderStore";
import { processManualOrderRequest } from "@/app/api/admin/manual-orders/handler";
import { isTrustedOrigin, isRequestAuthenticated } from "@/lib/adminSession";

/**
 * 관리자 UI 전용 주문 생성 — 세션 쿠키로만 인증한다. ADMIN_API_SECRET은
 * 여기서 전혀 읽지 않고, 가짜 HTTP Request도 만들지 않는다 — 검증된
 * 요청이면 lib/manualOrderStore.ts/reportStore.ts/sajuEngine.ts의 실제
 * 로직을 그대로 담고 있는 processManualOrderRequest(handler.ts)를 직접
 * 함수 호출로 재사용한다(로직 복제 없음, Hard Idempotency 무변경).
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "인증에 실패했습니다." }, { status: 403 });
  }
  if (!isRequestAuthenticated(req)) {
    return NextResponse.json({ error: "인증에 실패했습니다." }, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const result = await processManualOrderRequest(rawBody, {
    createOrder: createManualPaidOrder,
    sql: getSql(),
  });
  return NextResponse.json(result.body, { status: result.status });
}
