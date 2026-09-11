import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";

/**
 * 관리자 UI 전용 세션/Origin 검증 헬퍼(2026-09-11, 관리자 UI 1차 구현).
 *
 * 세션 쿠키는 DB 없이(stateless) HMAC 서명 하나로 검증한다 —
 * `${발급시각}.${만료시각}.${서명}` 형태. 서명 키는 새로 안 만들고 기존
 * ADMIN_API_SECRET을 재사용한다(이미 Vercel에 안전하게 설정된 서버 전용
 * 랜덤값 — 새 secret을 늘리지 않는 쪽을 택함). 쿠키에는 실제 비밀번호나
 * ADMIN_API_SECRET 값 자체는 절대 담기지 않는다 — 서명 결과(hex)만 담긴다.
 *
 * ADMIN_UI_PASSWORD/ADMIN_API_SECRET 둘 다 함수 내부에서 매 호출마다
 * process.env로 읽는다(모듈 top-level에서 읽지 않음 — 기존
 * lib/tossPayments.ts/handler.ts의 isAuthorized와 동일 패턴, 빌드 타임에
 * env가 없어도 빌드가 죽지 않게). 이 env var들이 없으면 관련 함수는 전부
 * false/실패를 반환한다(fail-closed) — 이번 단계에서는 ADMIN_UI_PASSWORD를
 * 실제로 만들거나 설정하지 않으므로, 지금 이 코드가 배포돼도 로그인은
 * 항상 실패한다(의도된 동작).
 */

export const ADMIN_SESSION_COOKIE_NAME = "admin_session";

/** 세션 유효기간 — 약 8시간(요청된 8~12시간 범위 내에서 짧은 쪽 채택). */
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
export const ADMIN_SESSION_MAX_AGE_SECONDS = Math.floor(SESSION_TTL_MS / 1000);

const PRODUCTION_ORIGIN = "https://paljamun.com";
const DEV_ORIGIN = "http://localhost:3000";

function getSigningKey(): string | null {
  const key = process.env.ADMIN_API_SECRET;
  return key ? key : null;
}

function hmacHex(payload: string, key: string): string {
  return createHmac("sha256", key).update(payload).digest("hex");
}

/** 로그인 성공 시 호출 — 쿠키에 그대로 넣을 문자열을 만든다. env(서명키)가
 * 없으면 null(호출부가 500 fail-closed 처리). */
export function createAdminSessionCookieValue(): string | null {
  const key = getSigningKey();
  if (!key) return null;
  const issuedAt = Date.now();
  const expiresAt = issuedAt + SESSION_TTL_MS;
  const payload = `${issuedAt}.${expiresAt}`;
  return `${payload}.${hmacHex(payload, key)}`;
}

/** 쿠키 값이 진짜 우리가 서명한 것이고, 아직 만료되지 않았는지 확인한다.
 * 서명키(ADMIN_API_SECRET)가 없거나, 쿠키가 없거나, 형식이 다르거나,
 * 서명이 안 맞거나, 만료됐으면 전부 false(fail-closed) — 어느 경우든
 * 이유를 클라이언트에 구분해서 알려주지 않는다(정보 노출 최소화). */
export function isValidAdminSessionValue(value: string | undefined | null): boolean {
  const key = getSigningKey();
  if (!key || !value) return false;

  const parts = value.split(".");
  if (parts.length !== 3) return false;
  const [issuedAtStr, expiresAtStr, sig] = parts;
  if (!issuedAtStr || !expiresAtStr || !sig) return false;

  const payload = `${issuedAtStr}.${expiresAtStr}`;
  const expectedSig = hmacHex(payload, key);

  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length) return false; // 길이부터 다르면 timingSafeEqual이 예외를 던짐
  if (!timingSafeEqual(a, b)) return false;

  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt)) return false;
  return Date.now() < expiresAt;
}

/** Route Handler(NextRequest를 직접 받는 곳)에서 세션 확인용. */
export function isRequestAuthenticated(req: NextRequest): boolean {
  return isValidAdminSessionValue(req.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value);
}

/** 서버 컴포넌트(app/admin/page.tsx)에서 세션 확인용 — next/headers의
 * cookies()는 Route Handler에는 없는 서버 컴포넌트 전용 읽기 API라 NextRequest
 * 버전과 분리해뒀다. */
export async function hasValidAdminSession(): Promise<boolean> {
  const store = cookies();
  return isValidAdminSessionValue(store.get(ADMIN_SESSION_COOKIE_NAME)?.value);
}

/** ADMIN_UI_PASSWORD와 상수 시간 비교. env가 없으면 항상 false(fail-closed) —
 * handler.ts의 isAuthorized와 완전히 동일한 방어 패턴. */
export function isValidAdminUiPassword(password: string): boolean {
  const expected = process.env.ADMIN_UI_PASSWORD;
  if (!expected) return false;
  if (!password) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * 상태 변경 관리자 요청(login/logout/orders)의 Origin 검증.
 * Host/Referer는 신뢰하지 않는다 — 오직 Origin 헤더만 보고, 명시적
 * allowlist와 정확히 일치하는지 확인한다. Origin이 아예 없으면 무조건
 * 거부(fail-closed) — Referer로 대체 신뢰하지 않는다. 최신 브라우저는
 * same-origin POST/fetch에도 항상 Origin을 보내므로, 정상적인 관리자 UI
 * 사용에서는 이 헤더가 없을 수 없다.
 */
export function isTrustedOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const allowed =
    process.env.NODE_ENV === "production" ? [PRODUCTION_ORIGIN] : [PRODUCTION_ORIGIN, DEV_ORIGIN];
  return allowed.includes(origin);
}
