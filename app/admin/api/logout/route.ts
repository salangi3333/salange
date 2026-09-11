import { NextRequest, NextResponse } from "next/server";
import { isTrustedOrigin, ADMIN_SESSION_COOKIE_NAME } from "@/lib/adminSession";

/** 관리자 로그아웃 — 세션 쿠키 즉시 만료. GET이 아니라 POST(상태 변경
 * 요청은 POST로 처리, 링크 클릭 등으로 실수 로그아웃되지 않게). */
export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "인증에 실패했습니다." }, { status: 403 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/admin",
    maxAge: 0,
  });
  return res;
}
