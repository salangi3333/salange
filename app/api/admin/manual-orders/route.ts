import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { createManualPaidOrder } from "@/lib/manualOrderStore";
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
  return createHandler({ createOrder: createManualPaidOrder, sql: getSql() })(req);
}

/**
 * [임시 진단, 2026-09-11 — 승인된 1회성 조사, 확인 끝나면 제거 예정]
 * Production에 ADMIN_API_SECRET이 실제로 주입됐는지, 길이가 64자인지만
 * boolean 두 개로 확인한다. 실제 값/일부 문자열/해시는 절대 반환하지
 * 않는다. DB를 전혀 호출하지 않는다(getSql/createManualPaidOrder 미사용).
 * POST 핸들러·인증 로직·handler.ts는 이 함수와 완전히 분리돼 있어 전혀
 * 영향받지 않는다.
 */
export async function GET(): Promise<NextResponse> {
  const secret = process.env.ADMIN_API_SECRET;
  return NextResponse.json({
    secretConfigured: !!secret,
    secretLengthIs64: secret ? secret.length === 64 : false,
  });
}
