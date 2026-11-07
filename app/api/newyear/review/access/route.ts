import { NextRequest, NextResponse } from "next/server";
import { REVIEW_ACCESS_PATH, createAttemptLimiter, isSameOriginPost, issueSession, sessionCookie, verifyAccessCode } from "@/lib/commerce/newyearReviewAccess";
import { REVIEW_PATHS, loadReviewPayConfig } from "@/lib/commerce/newyearReviewPay";

/**
 * 토스 심사용 화면의 접속 코드 확인(서버). 접속 코드는 POST 본문으로만 오고 주소·로그·응답에 남지 않는다.
 * 맞으면 서명된 세션 쿠키(HttpOnly·SameSite=Lax)를 주고 상품 화면으로, 틀리면 코드 입력 화면으로 돌려보낸다(어떤 경우에도 입력값을 되돌려 주지 않는다).
 * 순서: 심사 경로가 열려 있는지 → 같은 출처 → 본문 크기 → 시도 제한 → 코드 확인. 운영 관리자 로그인과는 별개다. 로그 출력 없음.
 */
const limiter = createAttemptLimiter();
const MAX_BODY_BYTES = 2 * 1024;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const go = (path: string) => { const u = req.nextUrl.clone(); u.pathname = path.split("?")[0]; u.search = path.includes("?") ? "?" + path.split("?")[1] : ""; return NextResponse.redirect(u, 303); };
  const noStore = (r: NextResponse) => { r.headers.set("Cache-Control", "no-store"); return r; };
  if (!loadReviewPayConfig(process.env).enabled) return noStore(new NextResponse(null, { status: 404 }));
  if (!isSameOriginPost(req.headers.get("origin"), req.headers.get("host"))) return noStore(new NextResponse(null, { status: 403 }));
  const len = Number(req.headers.get("content-length"));
  if (Number.isFinite(len) && len > MAX_BODY_BYTES) return noStore(new NextResponse(null, { status: 413 }));
  const who = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (limiter.blocked(who)) return noStore(go(`${REVIEW_ACCESS_PATH}?e=2`));
  let code: unknown;
  try { code = (await req.formData()).get("code"); } catch { return noStore(go(`${REVIEW_ACCESS_PATH}?e=1`)); }
  if (!verifyAccessCode(process.env, code)) { limiter.fail(who); return noStore(go(`${REVIEW_ACCESS_PATH}?e=1`)); }
  const token = issueSession(process.env);
  if (!token) return noStore(new NextResponse(null, { status: 404 }));
  limiter.reset(who);
  const secure = process.env.NODE_ENV === "production" || req.headers.get("x-forwarded-proto") === "https";
  const res = noStore(go(REVIEW_PATHS.product));
  res.headers.append("Set-Cookie", sessionCookie(token, secure));
  return res;
}
