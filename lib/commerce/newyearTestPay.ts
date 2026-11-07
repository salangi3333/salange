import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { CATALOG } from "./catalog";
import { validateConsentInput } from "./consent";
import { parseProfile, parseSubjects } from "./intake";
import { sajuInputSha256 } from "./intakeFingerprint";
import { NEWYEAR_CONSENT_DOC } from "./newyearTermsDraft";

/**
 * 2027 신년운세 토스 '테스트 결제' 구매 동선(신청 → 주문금액 확인 → 토스 테스트 결제창 → 결과) — DB·주문 장부·메일·PDF와 연결되지 않는다.
 *
 * 테스트 주문과 실제 주문의 분리: 이 모듈의 주문은 서버 메모리(서버를 끄면 사라짐)에만 있고 운영 DB·주문 장부(lib/commerce 장부)에는 한 건도 쓰지 않는다.
 * 메모리 주문에는 개인정보 원문을 두지 않는다(입력은 검사만 하고 지문(해시)만 남긴다). 운영 환경(NODE_ENV=production·Vercel)에서는 열리지 않는다.
 * 열림 조건: 스위치(NEWYEAR_TOSS_TEST_PAY=on) + 토스 테스트 키(test_ 로 시작) + 운영 환경이 아님. 실결제 키가 들어 있으면 열리지 않는다.
 *
 * 결제 반영: 결제창에서 돌아오면 서버가 (주문번호 서명 · 메모리 주문 존재 · 서버 금액 일치 · 토스 승인 DONE · 승인 결과의 주문번호/금액 일치)를 모두 확인한 뒤에만
 * 메모리 주문을 PAID_TEST 로 바꾼다. 주문번호는 (발급 시각·난수·서버 금액)의 HMAC 서명을 포함하고, 서명 키는 토스 테스트 시크릿 키 하나뿐이다.
 * 금액은 언제나 서버 카탈로그(CATALOG.NEWYEAR_2027.priceKrw)에서만 읽는다. 클라이언트가 보내는 금액은 읽지 않는다.
 * 이 파일은 환경변수를 직접 읽지 않는다 — 호출하는 쪽(app/…)이 env 를 넘긴다.
 */
export const TEST_PAY_SWITCH_ENV = "NEWYEAR_TOSS_TEST_PAY";
export const TEST_ORDER_PREFIX = "NYTEST_";
export const TEST_ORDER_NAME = "팔자문 2027 신년운세";
export const TEST_ORDER_MAX_AGE_MS = 60 * 60 * 1000; // 신청 후 1시간 안에 결제를 마쳐야 한다
export const TEST_STORE_MAX = 200;

const CLIENT_KEY_RE = /^test_g?ck_[A-Za-z0-9_-]{8,}$/;
const SECRET_KEY_RE = /^test_g?sk_[A-Za-z0-9_-]{8,}$/;
export const isTestClientKey = (k: unknown): k is string => typeof k === "string" && CLIENT_KEY_RE.test(k);
export const isTestSecretKey = (k: unknown): k is string => typeof k === "string" && SECRET_KEY_RE.test(k);

type Env = Readonly<Record<string, string | undefined>>;
export type TestPayConfig =
  | { enabled: true; clientKey: string; secretKey: string; amount: number; orderName: string }
  | { enabled: false; reason: "production_env" | "switch_off" | "client_key_not_test" | "secret_key_not_test" | "price_not_set" };

/** 호출하는 쪽이 넘겨 준 환경 값(env)으로 열림 여부를 판정한다. 운영 환경·실결제 키·가격 없음·스위치 꺼짐이면 닫힌다. */
export function loadTestPayConfig(env: Env): TestPayConfig {
  if (env.NODE_ENV === "production" || env.VERCEL) return { enabled: false, reason: "production_env" };
  if (env[TEST_PAY_SWITCH_ENV] !== "on") return { enabled: false, reason: "switch_off" };
  const clientKey = env.NEXT_PUBLIC_TOSS_CLIENT_KEY, secretKey = env.TOSS_SECRET_KEY;
  if (!isTestClientKey(clientKey)) return { enabled: false, reason: "client_key_not_test" };
  if (!isTestSecretKey(secretKey)) return { enabled: false, reason: "secret_key_not_test" };
  const amount = CATALOG.NEWYEAR_2027.priceKrw;
  if (typeof amount !== "number" || !Number.isInteger(amount) || amount <= 0) return { enabled: false, reason: "price_not_set" };
  return { enabled: true, clientKey, secretKey, amount, orderName: TEST_ORDER_NAME };
}

/* ───────── 서명 주문번호 ───────── */
const sign = (secret: string, ts: string, rand: string, amount: number): string =>
  createHmac("sha256", `nytest-order:${secret}`).update(`${ts}.${rand}.${amount}`).digest("hex").slice(0, 20);

/** 토스 orderId 규칙(영문·숫자·-·_ 6~64자)에 맞는 서명 주문번호. */
export function issueTestOrderId(amount: number, secret: string, now: Date = new Date(), rand: string = randomBytes(6).toString("hex")): string {
  const ts = now.getTime().toString(36);
  return `${TEST_ORDER_PREFIX}${ts}_${rand}_${sign(secret, ts, rand, amount)}`;
}

export type VerifyCode = "bad_format" | "bad_signature" | "expired" | "from_future";
export type VerifyResult = { ok: true; issuedAt: Date } | { ok: false; code: VerifyCode };
const ID_RE = /^NYTEST_([0-9a-z]{6,12})_([0-9a-f]{12})_([0-9a-f]{20})$/;

/** 주문번호의 서명이 '서버 금액'과 맞는지 확인한다. 금액이 다르거나 위조·만료된 번호는 통과하지 못한다. */
export function verifyTestOrderId(orderId: unknown, amount: number, secret: string, now: Date = new Date()): VerifyResult {
  if (typeof orderId !== "string") return { ok: false, code: "bad_format" };
  const m = ID_RE.exec(orderId);
  if (!m) return { ok: false, code: "bad_format" };
  const [, ts, rand, sig] = m;
  const a = Buffer.from(sig, "utf8"), b = Buffer.from(sign(secret, ts, rand, amount), "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, code: "bad_signature" };
  const issued = parseInt(ts, 36);
  if (!Number.isFinite(issued)) return { ok: false, code: "bad_format" };
  const age = now.getTime() - issued;
  if (age < -60_000) return { ok: false, code: "from_future" };
  if (age > TEST_ORDER_MAX_AGE_MS) return { ok: false, code: "expired" };
  return { ok: true, issuedAt: new Date(issued) };
}

/* ───────── 테스트 주문 메모리 저장소(운영 DB·장부와 무관) ───────── */
/**
 * 상태: PENDING 결제 전 · CONFIRMING 승인 선점(토스 승인 호출 중 — 한 요청만 가질 수 있다) · PAID_TEST 승인·검증 완료 ·
 * CONFIRM_UNKNOWN 승인 중 오류·응답 불명·검증 불일치(자동 재승인 금지, 사람이 확인해야 함) · FAILED 결제 전에 실패·취소로 정리됨.
 * 승인 호출을 한 번이라도 시작한 주문은 PENDING 으로 돌아가지 않는다 — 결과를 모르는 채 다시 승인하면 중복 결제가 될 수 있기 때문이다.
 */
export type TestOrderStatus = "PENDING" | "CONFIRMING" | "PAID_TEST" | "CONFIRM_UNKNOWN" | "FAILED";
export interface TestOrder {
  orderId: string; requestKey: string; amount: number; status: TestOrderStatus; createdAt: string; paidAt: string | null;
  /** 승인 선점 때 정해진 결제 식별자(이후 이 값과 같은 승인 결과만 반영한다). */
  paymentKey: string | null; confirmingAt: string | null;
  /** 개인정보 원문 대신 풀이 입력의 지문만 둔다. */
  intakeSha256: string; consentVersion: string;
}
export interface TestOrderStore {
  findByOrderId(orderId: string): TestOrder | null;
  findByRequestKey(requestKey: string): TestOrder | null;
  insert(o: TestOrder): "inserted" | "full" | "duplicate";
  /** 승인 선점: PENDING 인 주문만 CONFIRMING 으로 바꾸며 한 번에 한 요청만 성공한다. 같은 결제 식별자가 다른 주문에 쓰였으면 거절한다. */
  claim(orderId: string, paymentKey: string, at: string): "claimed" | "not_pending" | "payment_key_in_use" | "not_found";
  /** 선점한 주문을 PAID_TEST 로 확정(선점한 결제 식별자·선점 시각 claimedAt 이 같고 CONFIRMING 또는 시간 초과로 CONFIRM_UNKNOWN 이 된 주문만). FAILED·PAID_TEST 등은 바꾸지 않는다. */
  markPaid(orderId: string, paymentKey: string, at: string, claimedAt: string): "paid" | "not_confirming" | "not_found";
  /** 선점한 주문을 CONFIRM_UNKNOWN 으로(CONFIRMING 일 때만). */
  markUnknown(orderId: string): boolean;
  /** 결제 전(PENDING) 주문만 FAILED 로. 승인 중·승인 완료·결과 불명 주문은 바꾸지 않는다. */
  markFailed(orderId: string): boolean;
  size(): number;
}
export function createMemoryTestOrderStore(max: number = TEST_STORE_MAX): TestOrderStore {
  const byId = new Map<string, TestOrder>();
  return {
    findByOrderId: (id) => { const o = byId.get(id); return o ? { ...o } : null; },
    findByRequestKey: (k) => { for (const o of byId.values()) if (o.requestKey === k) return { ...o }; return null; },
    insert: (o) => { if (byId.has(o.orderId)) return "duplicate"; if (byId.size >= max) return "full"; byId.set(o.orderId, { ...o }); return "inserted"; },
    claim: (id, key, at) => { // 동기 함수라 확인과 변경 사이에 다른 요청이 끼어들 수 없다
      const o = byId.get(id); if (!o) return "not_found";
      if (o.status !== "PENDING") return "not_pending";
      for (const x of byId.values()) if (x.orderId !== id && x.paymentKey === key) return "payment_key_in_use";
      byId.set(id, { ...o, status: "CONFIRMING", paymentKey: key, confirmingAt: at }); return "claimed";
    },
    markPaid: (id, key, at, claimedAt) => {
      const o = byId.get(id); if (!o) return "not_found";
      // CONFIRMING 이거나, 2분 경과로 CONFIRM_UNKNOWN 이 된 뒤라도 '그 선점을 한 요청'(같은 결제 식별자·같은 선점 시각)의 검증된 응답이면 반영한다.
      if ((o.status !== "CONFIRMING" && o.status !== "CONFIRM_UNKNOWN") || o.paymentKey !== key || o.confirmingAt !== claimedAt) return "not_confirming";
      byId.set(id, { ...o, status: "PAID_TEST", paidAt: at }); return "paid";
    },
    markUnknown: (id) => { const o = byId.get(id); if (!o || o.status !== "CONFIRMING") return false; byId.set(id, { ...o, status: "CONFIRM_UNKNOWN" }); return true; },
    markFailed: (id) => { const o = byId.get(id); if (!o || o.status !== "PENDING") return false; byId.set(id, { ...o, status: "FAILED" }); return true; },
    size: () => byId.size,
  };
}
/** 개발 서버는 화면과 API 를 서로 다른 모듈 묶음으로 만들 수 있어 전역 칸에 하나만 둔다(testRuntime.ts 와 같은 방식). */
const SLOT_KEY = "__paljamunNewYearTestPayOrders";
export function getTestOrderStore(): TestOrderStore {
  const slot = globalThis as unknown as Record<string, TestOrderStore | undefined>;
  return (slot[SLOT_KEY] ??= createMemoryTestOrderStore());
}

/* ───────── 신청 → 테스트 주문 만들기(저장은 메모리 주문 한 줄뿐) ───────── */
export interface TestOrderView { orderId: string; orderName: string; amount: number; status: TestOrderStatus }
export type CreateCode = "DISABLED" | "BAD_REQUEST" | "CONSENT_REQUIRED" | "INVALID_INPUT" | "STORE_FULL";
export type CreateResult = { ok: true; created: boolean; order: TestOrderView } | { ok: false; code: CreateCode; errors?: string[] };
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const KEY_RE = /^[A-Za-z0-9-]{8,80}$/;
const view = (o: TestOrder, name: string): TestOrderView => ({ orderId: o.orderId, orderName: name, amount: o.amount, status: o.status });

/**
 * 신청 입력을 기존 신청 화면과 같은 규칙(lib/commerce/intake·consent)으로 검사하고 테스트 주문을 만든다. 금액·상품은 서버가 정한다(본문 값은 읽지 않는다).
 * 입력 원문은 저장하지 않는다. 같은 requestKey 의 재시도는 같은 주문을 돌려준다(중복 주문 없음).
 */
export function createTestOrder(store: TestOrderStore, cfg: TestPayConfig, body: unknown, now: Date = new Date(), rand?: string): CreateResult {
  if (!cfg.enabled) return { ok: false, code: "DISABLED" };
  if (!isObj(body)) return { ok: false, code: "BAD_REQUEST" };
  if (body.website !== undefined && body.website !== "") return { ok: false, code: "BAD_REQUEST" }; // 숨김 입력칸(봇 걸러내기)
  if (typeof body.requestKey !== "string" || !KEY_RE.test(body.requestKey)) return { ok: false, code: "BAD_REQUEST" };
  const c = validateConsentInput(body.consent, NEWYEAR_CONSENT_DOC);
  if (!c.ok) return { ok: false, code: "CONSENT_REQUIRED", errors: c.errors };
  const errors: string[] = [];
  // 신청자 이름 칸은 없앴다(풀이 대상자 '이름'과 중복). 본문의 buyerName 은 읽지 않으며, 이름은 subjects 검사에서 필수로 확인한다.
  const email = typeof body.buyerEmail === "string" ? body.buyerEmail.trim() : "";
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) errors.push("PDF를 받을 이메일이 올바르지 않습니다.");
  const subjects = parseSubjects(body.subjects, CATALOG.NEWYEAR_2027.subjects); if (!subjects.ok) errors.push(...subjects.errors);
  const profile = parseProfile(body.profile); if (!profile.ok) errors.push(...profile.errors);
  if (errors.length || !subjects.ok || !profile.ok) return { ok: false, code: "INVALID_INPUT", errors: errors.filter((e) => typeof e === "string" && e.length <= 120) };

  const prev = store.findByRequestKey(body.requestKey);
  if (prev) return { ok: true, created: false, order: view(prev, cfg.orderName) };
  const row: TestOrder = {
    orderId: issueTestOrderId(cfg.amount, cfg.secretKey, now, rand), requestKey: body.requestKey, amount: cfg.amount, status: "PENDING",
    createdAt: now.toISOString(), paidAt: null, paymentKey: null, confirmingAt: null, intakeSha256: sajuInputSha256(subjects.value), consentVersion: NEWYEAR_CONSENT_DOC.version,
  };
  const ins = store.insert(row);
  if (ins === "full") return { ok: false, code: "STORE_FULL" };
  if (ins === "duplicate") { const again = store.findByRequestKey(body.requestKey); if (again) return { ok: true, created: false, order: view(again, cfg.orderName) }; return { ok: false, code: "STORE_FULL" }; }
  return { ok: true, created: true, order: view(row, cfg.orderName) };
}

/** 결제 화면에 보여 줄 주문(서명·만료·메모리 주문 존재·대기 상태를 모두 확인). 그 밖에는 null. */
export function viewPendingTestOrder(store: TestOrderStore, cfg: TestPayConfig, orderId: unknown, now: Date = new Date()): TestOrderView | null {
  if (!cfg.enabled || !verifyTestOrderId(orderId, cfg.amount, cfg.secretKey, now).ok) return null;
  const o = store.findByOrderId(orderId as string);
  return o && o.status === "PENDING" && o.amount === cfg.amount ? view(o, cfg.orderName) : null;
}

/* ───────── 결제 완료 확인 → 검증된 결제만 주문에 반영 ───────── */
export interface TestConfirmation { ok: boolean; status?: string; orderId?: string; paymentKey?: string; totalAmount?: number }
export type TestConfirmer = (p: { paymentKey: string; orderId: string; amount: number }) => Promise<TestConfirmation>;
export type TestPayCode = "DISABLED" | "BAD_INPUT" | "BAD_ORDER" | "NOT_PENDING" | "AMOUNT_MISMATCH" | "IN_PROGRESS" | "CONFIRM_UNKNOWN" | "CONFIRM_FAILED" | "NOT_DONE" | "RESULT_MISMATCH" | "PAYMENT_KEY_REUSED";
export type TestPayResult = { ok: true; orderId: string; amount: number; status: "DONE"; alreadyPaid: boolean } | { ok: false; code: TestPayCode };
const PAYMENT_KEY_RE = /^[A-Za-z0-9_-]{10,200}$/;
/** 승인 선점 뒤 이 시간이 지나도 끝나지 않은 주문은 결과 불명으로 본다(요청이 중간에 끊긴 경우). 자동으로 다시 승인하지 않는다. */
export const CONFIRM_STALE_MS = 2 * 60 * 1000;

/**
 * 결제창에서 돌아온 값을 검증하고 토스 승인을 부른다. 승인 금액은 항상 서버 금액이며, 돌아온 주소의 amount는 서버 금액과 같을 때만 통과한다.
 * - 주문별 승인 선점: 승인 호출 전에 주문을 PENDING→CONFIRMING 으로 바꾸고, 선점한 요청 하나만 토스를 부른다(같은 주문의 동시 요청은 IN_PROGRESS).
 * - 승인 결과의 DONE·주문번호·금액·결제 식별자(누락 포함)가 모두 요청한 값과 정확히 같을 때만 PAID_TEST 로 반영한다.
 * - 선점 뒤 오류·응답 불명·검증 불일치는 모두 CONFIRM_UNKNOWN 으로 남기고 PENDING 으로 되돌리지 않는다(자동 재승인 없음 → 중복 결제 방지).
 * - 이미 같은 결제로 반영된 주문을 다시 열면 토스를 다시 부르지 않고 성공으로 돌려준다.
 */
export async function completeTestPayment(
  store: TestOrderStore, cfg: TestPayConfig,
  input: { orderId: unknown; paymentKey: unknown; claimedAmount: unknown },
  confirm: TestConfirmer, now: Date = new Date(),
): Promise<TestPayResult> {
  if (!cfg.enabled) return { ok: false, code: "DISABLED" };
  if (typeof input.paymentKey !== "string" || !PAYMENT_KEY_RE.test(input.paymentKey)) return { ok: false, code: "BAD_INPUT" };
  const orderId = input.orderId as string, paymentKey = input.paymentKey;
  const sig = verifyTestOrderId(orderId, cfg.amount, cfg.secretKey, now);
  const sigKnown = sig.ok || sig.code === "expired"; // 서명은 맞고 시간만 지난 경우(이미 시작된 결제의 새로고침)
  const known = typeof orderId === "string" ? store.findByOrderId(orderId) : null;
  const paid = (alreadyPaid: boolean): TestPayResult => ({ ok: true, orderId, amount: cfg.amount, status: "DONE", alreadyPaid });
  // 이미 시작된 주문의 상태별 응답(토스를 다시 부르지 않는다).
  const byState = (o: TestOrder): TestPayResult | null => {
    if (o.status === "PAID_TEST") return o.paymentKey === paymentKey && o.amount === cfg.amount ? paid(true) : { ok: false, code: "NOT_PENDING" };
    if (o.status === "CONFIRMING") {
      const age = o.confirmingAt ? now.getTime() - Date.parse(o.confirmingAt) : 0;
      if (age > CONFIRM_STALE_MS) { store.markUnknown(o.orderId); return { ok: false, code: "CONFIRM_UNKNOWN" }; }
      return { ok: false, code: "IN_PROGRESS" };
    }
    if (o.status === "CONFIRM_UNKNOWN") return { ok: false, code: "CONFIRM_UNKNOWN" };
    if (o.status !== "PENDING") return { ok: false, code: "NOT_PENDING" };
    return null;
  };
  if (!known || !sigKnown) return { ok: false, code: "BAD_ORDER" };
  const early = byState(known);
  if (early) return early;
  if (!sig.ok) return { ok: false, code: "BAD_ORDER" }; // 대기 주문은 만료되면 결제를 시작할 수 없다
  if (known.amount !== cfg.amount || Number(input.claimedAmount) !== cfg.amount) return { ok: false, code: "AMOUNT_MISMATCH" };

  const claimAt = now.toISOString();
  const claim = store.claim(orderId, paymentKey, claimAt);
  if (claim === "payment_key_in_use") return { ok: false, code: "PAYMENT_KEY_REUSED" };
  if (claim !== "claimed") { const o = store.findByOrderId(orderId); return (o && byState(o)) || { ok: false, code: "NOT_PENDING" }; } // 다른 요청이 먼저 선점했다
  // 여기부터는 이 요청만 토스를 부른다. 어떤 실패도 PENDING 으로 되돌리지 않는다.
  const unknown = (code: TestPayCode): TestPayResult => { store.markUnknown(orderId); return { ok: false, code }; };
  let c: TestConfirmation;
  try { c = await confirm({ paymentKey, orderId, amount: cfg.amount }); } catch { return unknown("CONFIRM_FAILED"); }
  if (!c || !c.ok) return unknown("CONFIRM_FAILED");
  if (c.status !== "DONE") return unknown("NOT_DONE");
  // 결제 식별자는 응답에 반드시 있어야 하고 요청한 값과 같아야 한다(누락도 거절).
  if (c.orderId !== orderId || c.totalAmount !== cfg.amount || typeof c.paymentKey !== "string" || c.paymentKey !== paymentKey) return unknown("RESULT_MISMATCH");
  // 2분이 지나 CONFIRM_UNKNOWN 이 된 뒤 도착한 응답이라도, 이 요청이 선점한 주문이고 모든 값이 일치할 때만 반영한다(다른 요청은 반영 못 함).
  if (store.markPaid(orderId, paymentKey, now.toISOString(), claimAt) !== "paid") return { ok: false, code: "CONFIRM_UNKNOWN" };
  return paid(false);
}

/** 결제 실패 화면용: 저장된 실제 주문 상태. 서명이 틀리거나 주문이 없으면 UNKNOWN_ORDER(상태를 알려 주지 않는다). 주문을 바꾸지 않는다. */
export type FailScreenState = TestOrderStatus | "UNKNOWN_ORDER";
/** 상태별 실패 화면 안내. 승인 중·결과 불명·승인 완료 주문에는 다시 결제하도록 유도하지 않는다(retry=false). */
export const FAIL_SCREEN_COPY: Record<FailScreenState, { title: string; body: string; retry: boolean }> = {
  PENDING: { title: "결제가 진행되지 않았습니다", body: "결제가 아직 시작되지 않았거나 결제창에서 중단되었습니다. 테스트 환경이라 어떤 금액도 청구되지 않았습니다.", retry: true },
  FAILED: { title: "결제가 완료되지 않았습니다", body: "결제를 취소했거나 결제 과정에서 문제가 있었습니다. 테스트 환경이라 어떤 금액도 청구되지 않았습니다.", retry: true },
  CONFIRMING: { title: "결제 승인을 확인하는 중입니다", body: "이 주문은 승인 확인이 진행 중입니다. 다시 결제하지 말고 잠시 뒤 결과 화면을 새로고침해 주세요.", retry: false },
  CONFIRM_UNKNOWN: { title: "결제 승인 결과를 확인하지 못했습니다", body: "중복 결제를 막기 위해 자동으로 다시 승인하지 않습니다. 다시 결제하지 말고 담당자에게 확인을 요청해 주세요.", retry: false },
  PAID_TEST: { title: "이 주문은 이미 결제가 확인되었습니다", body: "테스트 결제가 정상 반영된 주문입니다. 다시 결제할 필요가 없습니다.", retry: false },
  UNKNOWN_ORDER: { title: "주문 정보를 확인할 수 없습니다", body: "유효하지 않거나 만료된 주문입니다. 결제 여부는 이 화면에서 알 수 없으니, 필요하면 신청서에서 새로 시작해 주세요.", retry: true },
};
export function getTestOrderStatusForScreen(store: TestOrderStore, cfg: TestPayConfig, orderId: unknown, now: Date = new Date()): FailScreenState {
  if (!cfg.enabled || typeof orderId !== "string") return "UNKNOWN_ORDER";
  const sig = verifyTestOrderId(orderId, cfg.amount, cfg.secretKey, now);
  if (!sig.ok && sig.code !== "expired") return "UNKNOWN_ORDER";
  return store.findByOrderId(orderId)?.status ?? "UNKNOWN_ORDER";
}

/** 결제창에서 실패·취소로 돌아온 주문을 정리한다(서명이 맞고 결제 전 PENDING 일 때만). 승인 중·승인 완료·결과 불명 주문은 바꾸지 않는다. */
export function closeTestOrder(store: TestOrderStore, cfg: TestPayConfig, orderId: unknown, now: Date = new Date()): boolean {
  if (!cfg.enabled || !verifyTestOrderId(orderId, cfg.amount, cfg.secretKey, now).ok) return false;
  return store.markFailed(orderId as string);
}
