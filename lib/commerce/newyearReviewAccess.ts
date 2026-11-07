// 2027 신년운세 '토스 심사용 구매 경로'의 접근 제한 — 심사 담당자에게만 따로 주는 접속 코드를 서버에서 검증하고, 인증된 세션(서명된 쿠키)만 통과시킨다.
// 순수 모듈(crypto 만 사용): 접속 코드·세션 서명·시도 제한·동일 출처 확인·화면 판정. 운영 관리자 로그인(adminSession)과는 코드·쿠키·비밀값을 공유하지 않는다.
// 접속 코드는 서버 환경변수(NEWYEAR_REVIEW_ACCESS_CODE)에만 있고, 주소·클라이언트 코드·로그·쿠키 값에 들어가지 않는다(쿠키에는 코드에서 파생한 서명만 있다).
import { createHash, createHmac, timingSafeEqual } from "crypto";
import { loadReviewPayConfig, type ReviewPayConfig } from "./newyearReviewPay";

type Env = Record<string, string | undefined>;
export const REVIEW_ACCESS_CODE_ENV = "NEWYEAR_REVIEW_ACCESS_CODE";
export const REVIEW_COOKIE = "nyrev_session";
export const REVIEW_COOKIE_PATH = "/newyear/review";
export const REVIEW_ACCESS_PATH = "/newyear/review/access";
export const REVIEW_SESSION_TTL_SEC = 8 * 60 * 60; // 8시간: 심사 담당자가 결제창을 다녀와도 유지된다
export const REVIEW_CODE_MIN = 16, REVIEW_CODE_MAX = 128;

const sha = (s: string) => createHash("sha256").update(s, "utf8").digest();
const sessionKey = (code: string) => sha(`nyrev-session-v1\0${code}`);
const safeEq = (a: Buffer, b: Buffer) => a.length === b.length && timingSafeEqual(a, b);

/** 서버에 설정된 접속 코드(없거나 너무 짧으면 undefined → 심사 경로는 닫힘). 값은 호출한 쪽 밖으로 내보내지 않는다. */
export function reviewAccessCode(env: Env): string | undefined {
  const c = env[REVIEW_ACCESS_CODE_ENV];
  return typeof c === "string" && c.length >= REVIEW_CODE_MIN && c.length <= REVIEW_CODE_MAX ? c : undefined;
}

/** 입력한 코드가 맞는가(해시 비교, 길이·내용이 달라도 같은 시간). */
export function verifyAccessCode(env: Env, input: unknown): boolean {
  const code = reviewAccessCode(env);
  if (!code || typeof input !== "string" || input.length === 0 || input.length > REVIEW_CODE_MAX) return false;
  return safeEq(sha(input), sha(code));
}

/** 세션 토큰: `1.<만료 epoch 초>.<서명>`. 서명은 접속 코드에서 파생한 키의 HMAC 이라 코드를 알 수 없고, 코드를 바꾸면 기존 세션이 모두 무효가 된다. */
export function issueSession(env: Env, now: Date = new Date()): string | null {
  const code = reviewAccessCode(env); if (!code) return null;
  const exp = Math.floor(now.getTime() / 1000) + REVIEW_SESSION_TTL_SEC;
  return `1.${exp}.${createHmac("sha256", sessionKey(code)).update(`1.${exp}`).digest("hex")}`;
}
export function verifySession(env: Env, token: unknown, now: Date = new Date()): boolean {
  const code = reviewAccessCode(env);
  if (!code || typeof token !== "string" || token.length > 120) return false;
  const m = /^1\.(\d{1,12})\.([0-9a-f]{64})$/.exec(token); if (!m) return false;
  const exp = Number(m[1]), nowSec = Math.floor(now.getTime() / 1000);
  if (!(exp > nowSec) || exp > nowSec + REVIEW_SESSION_TTL_SEC + 60) return false; // 만료됐거나 발급할 수 없는 먼 미래 값
  return safeEq(Buffer.from(m[2], "hex"), createHmac("sha256", sessionKey(code)).update(`1.${exp}`).digest());
}

/**
 * 화면 판정(순수): closed = 심사 경로가 열려 있지 않음(스위치·전용 테스트 키·접속 코드 중 하나라도 없음), login = 열려 있으나 인증된 세션이 없음, ok = 통과.
 * 쿠키 값은 서버가 읽어 넘기며 결과에 비밀값은 없다.
 */
export type ReviewGateResult = { state: "closed" } | { state: "login" } | { state: "ok"; cfg: Extract<ReviewPayConfig, { enabled: true }> };
export function reviewGateDecision(env: Env, cookieValue: string | undefined, now: Date = new Date()): ReviewGateResult {
  const cfg = loadReviewPayConfig(env);
  if (!cfg.enabled || !reviewAccessCode(env)) return { state: "closed" };
  return verifySession(env, cookieValue, now) ? { state: "ok", cfg } : { state: "login" };
}

/** 접속 코드 입력 요청의 같은 출처 확인: Origin 의 호스트가 요청 Host 와 같을 때만(없으면 거절). 로그인 화면 밖에서 보낸 요청을 막는다. */
export function isSameOriginPost(origin: string | null, host: string | null): boolean {
  if (!origin || !host) return false;
  try { return new URL(origin).host === host; } catch { return false; }
}

/** 틀린 시도 제한(서버 메모리, 최선 노력 — 서버리스에서는 인스턴스마다 따로 센다). 접속 코드를 16자 이상으로 요구하는 것이 주된 방어다. */
export function createAttemptLimiter(max = 5, windowMs = 10 * 60 * 1000) {
  const m = new Map<string, number[]>();
  const recent = (k: string, now: number) => (m.get(k) ?? []).filter((t) => now - t < windowMs);
  return {
    blocked(k: string, now = Date.now()) { return recent(k, now).length >= max; },
    fail(k: string, now = Date.now()) { const r = recent(k, now); r.push(now); m.set(k, r); if (m.size > 2000) m.clear(); },
    reset(k: string) { m.delete(k); },
  };
}

/** Set-Cookie 값(HttpOnly·SameSite=Lax·경로 제한). Lax 는 결제창(토스)에서 돌아오는 최상위 이동에도 쿠키가 따라가므로 결제창 뒤에도 세션이 유지된다. */
export function sessionCookie(token: string, secure: boolean): string {
  return `${REVIEW_COOKIE}=${token}; Path=${REVIEW_COOKIE_PATH}; Max-Age=${REVIEW_SESSION_TTL_SEC}; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}
