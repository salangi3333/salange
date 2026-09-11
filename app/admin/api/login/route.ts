import { NextRequest, NextResponse } from "next/server";
import {
  isTrustedOrigin,
  isValidAdminUiPassword,
  createAdminSessionCookieValue,
  ADMIN_SESSION_COOKIE_NAME,
  ADMIN_SESSION_MAX_AGE_SECONDS,
} from "@/lib/adminSession";

/**
 * 관리자 로그인 — ADMIN_UI_PASSWORD 대조 후 세션 쿠키 발급.
 * ADMIN_API_SECRET과는 완전히 별개의 새 env var(ADMIN_UI_PASSWORD)를 쓴다 —
 * 이번 단계에서는 이 env var의 실제 값을 만들거나 설정하지 않으므로,
 * isValidAdminUiPassword가 항상 false를 반환해 로그인은 항상 실패한다
 * (fail-closed, 의도된 동작 — 다음 단계에서 값 생성/설정 후에만 동작).
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "인증에 실패했습니다." }, { status: 403 });
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const password =
    rawBody && typeof rawBody === "object" && typeof (rawBody as Record<string, unknown>).password === "string"
      ? (rawBody as Record<string, unknown>).password as string
      : "";

  if (!isValidAdminUiPassword(password)) {
    // 비밀번호가 틀렸는지/env가 없는지 구분해서 알려주지 않는다(정보 노출 최소화).
    return NextResponse.json({ error: "인증에 실패했습니다." }, { status: 401 });
  }

  const sessionValue = createAdminSessionCookieValue();
  if (!sessionValue) {
    // ADMIN_UI_PASSWORD는 있는데 서명키(ADMIN_API_SECRET)가 없는 극단적
    // 설정 오류 — 조용히 넘어가지 않고 서버 오류로 명확히 응답한다.
    console.error("[admin/api/login] 세션 서명키(ADMIN_API_SECRET) 없음");
    return NextResponse.json(
      { error: "관리자 로그인이 아직 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_SESSION_COOKIE_NAME, sessionValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/admin",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });
  return res;
}
