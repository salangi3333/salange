/**
 * 고객 신청(공개 API) 남용 방지 — 순수 판정 모듈(DB·네트워크 없음).
 * 방식: 별도의 제한 기록을 만들지 않고, 이미 저장된 주문 장부(여러 서버 인스턴스가 함께 쓰는 DB)에서 '최근 웹 신청 주문'을 세어 판정한다.
 *  → 서버 인스턴스가 여러 개여도 같은 장부를 보므로 제한이 공유되고, 새 테이블·새 서비스·IP 저장이 필요 없다(개인정보를 새로 남기지 않음).
 * 제한은 '새 요청 키로 반복해서 주문을 만드는 것'을 막는다. 같은 요청 키의 재시도(중복 클릭·네트워크 재시도)는 제한과 무관하게 항상 통과한다(핸들러가 먼저 판정).
 * 한계(정직하게): 확인 후 저장까지 사이에 여러 인스턴스가 동시에 들어오면 인스턴스 수만큼 한도를 넘길 수 있다(한 인스턴스 안에서는 순서대로 처리해 정확히 지킨다).
 *   완전한 원자적 제한이 필요하면 작은 전용 테이블이 필요하다(별도 승인 사항).
 * 접속 IP 는 쓰지 않는다. 대신 ①전체 ②같은 이메일 ③같은 입력 내용(풀이 정보 지문) 기준으로 센다.
 */
export interface ThrottleRule { max: number; windowMs: number }
export interface ThrottleConfig { global: ThrottleRule; perEmail: ThrottleRule; perIntake: ThrottleRule }
/** 기본값(정상 고객은 거의 닿지 않는 수준). 값은 운영 규모에 맞춰 조정한다. */
export const DEFAULT_THROTTLE: Readonly<ThrottleConfig> = Object.freeze({
  global: Object.freeze({ max: 30, windowMs: 60 * 60 * 1000 }),       // 웹 신청 전체: 1시간에 30건
  perEmail: Object.freeze({ max: 3, windowMs: 24 * 60 * 60 * 1000 }),  // 같은 이메일: 하루 3건
  perIntake: Object.freeze({ max: 2, windowMs: 24 * 60 * 60 * 1000 }), // 같은 풀이 정보: 하루 2건
});

/** 판정에 필요한 최소 정보(주문 한 건). 개인정보 원문은 비교에만 쓰고 결과에는 담지 않는다. */
export interface ThrottleOrder { createdAt: string; channelRef: string | null; buyerEmail: string; intakeSha256: string; requestKey: string }
export type ThrottleVerdict = { allowed: true } | { allowed: false; scope: "global" | "email" | "intake"; retryAfterSec: number };

export const WEB_CHANNEL_REF = "web-form";

/**
 * 새 신청(candidate)을 받아도 되는지 판정한다.
 * @param orders 장부의 신년운세 주문(전체 또는 최근 것). 웹 신청 주문만 센다(관리자 대리 입력 주문은 세지 않는다).
 */
export function evaluateThrottle(orders: readonly ThrottleOrder[], candidate: { emailLower: string; intakeSha256: string }, now: Date, cfg: ThrottleConfig = DEFAULT_THROTTLE): ThrottleVerdict {
  const t = now.getTime();
  const web = orders.filter((o) => o.channelRef === WEB_CHANNEL_REF).map((o) => ({ ...o, at: Date.parse(o.createdAt) })).filter((o) => Number.isFinite(o.at));
  const check = (scope: "global" | "email" | "intake", rule: ThrottleRule, match: (o: (typeof web)[number]) => boolean): ThrottleVerdict | null => {
    const inWindow = web.filter((o) => match(o) && t - o.at < rule.windowMs && o.at <= t + 60_000).sort((a, b) => a.at - b.at);
    if (inWindow.length < rule.max) return null;
    // 한도를 채운 것 중 가장 오래된 것이 창 밖으로 나가면 자리가 난다.
    const free = inWindow[inWindow.length - rule.max].at + rule.windowMs;
    return { allowed: false, scope, retryAfterSec: Math.max(1, Math.ceil((free - t) / 1000)) };
  };
  return check("email", cfg.perEmail, (o) => o.buyerEmail === candidate.emailLower)
    ?? check("intake", cfg.perIntake, (o) => o.intakeSha256 === candidate.intakeSha256)
    ?? check("global", cfg.global, () => true)
    ?? { allowed: true };
}

/** 한 서버 인스턴스 안에서 '확인 → 저장'을 순서대로 처리하는 잠금(같은 인스턴스의 동시 요청이 한도를 넘기지 않게 한다). */
export function createApplyLock(): <T>(fn: () => Promise<T>) => Promise<T> {
  let tail: Promise<unknown> = Promise.resolve();
  return <T>(fn: () => Promise<T>): Promise<T> => {
    const run = tail.then(fn, fn);
    tail = run.then(() => undefined, () => undefined);
    return run;
  };
}
