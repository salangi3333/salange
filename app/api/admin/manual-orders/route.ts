import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { createManualPaidOrder } from "@/lib/manualOrderStore";
import { createEmailDeliverer } from "@/lib/reportDelivery";
import { createHandler } from "./handler";

/**
 * Next.js App Router 제약(typed routes 검사)으로 이 파일은 POST 외의
 * export를 가질 수 없다 — 실제 로직/테스트 가능한 팩토리는 ./handler.ts에
 * 있다(자세한 설명은 그 파일 상단 주석 참고). 이 파일은 실제 의존성으로
 * handler를 조립해 내보내는 아주 얇은 wrapper다.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  // getSql()을 모듈 top-level이 아니라 요청 처리 시점에 호출 — DATABASE_URL이
  // 빌드 환경에 없어도 `next build` 자체가 깨지지 않는다(기존 라우트들과 동일 원칙).
  const sql = getSql();
  // [2026-09-14 추가] deliverEmail은 선택적 필드라 안 넘기면 기존과 동일하게
  // 동작하지만, 실제 프로덕션 경로는 여기서 채워 넣어 주문 생성 직후
  // PDF+이메일 발송까지 자동으로 이어지게 한다(lib/reportDelivery.ts).
  return createHandler({ createOrder: createManualPaidOrder, sql, deliverEmail: createEmailDeliverer(sql) })(req);
}
