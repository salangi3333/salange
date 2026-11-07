/**
 * 2027 신년운세 고객 신청 API 의 요청 처리(순수 함수). Origin·본문 크기 검사는 라우트가 먼저 한다.
 * 규칙
 *  - 상품은 2027 신년운세 하나로 고정한다(본문의 상품·채널·처리자·입금 상태 값은 무시). 채널은 'DIRECT'(웹 신청), 처리자는 '고객 신청'.
 *  - 판매가 열려 있지 않으면(판매 상태가 ON_SALE 이 아니거나 필수 설정이 비었거나, 약관 법률 확인이 끝나지 않았으면) 어떤 주문도 만들지 않는다.
 *  - 필수 동의가 하나라도 빠지거나 약관 버전이 다르면 주문을 만들지 않는다. 동의 시각은 서버가 정한다.
 *  - 주문은 항상 '입금 미확인'으로 시작한다. 입금 확인·제작·승인·발송은 기존 관리자 흐름이 그대로 한다.
 *  - 응답에는 이름·이메일·생년월일 같은 개인정보를 담지 않는다(주문번호·가격·안내만).
 */
import { CATALOG, getSaleReadiness, type ProductDefinition } from "./catalog";
import { createApplyLock, DEFAULT_THROTTLE, evaluateThrottle, type ThrottleConfig, type ThrottleOrder } from "./applyThrottle";
import { buildConsentRecord, validateConsentInput, type ConsentDoc } from "./consent";
import { parseProfile, parseSubjects } from "./intake";
import { sajuInputSha256 } from "./intakeFingerprint";
import type { LedgerService } from "./ledgerService";
import { parsePayerName, payerMemo, UNCONFIGURED_GUIDE, type PaymentGuide } from "./paymentGuide";
import { NEWYEAR_CONSENT_DOC, NEWYEAR_TERMS_LEGAL_REVIEWED } from "./newyearTermsDraft";

export interface PublicOut { status: number; body: Record<string, unknown>; headers?: Record<string, string> }
export interface PublicApplyDeps {
  catalog?: Readonly<Record<string, Readonly<ProductDefinition>>>;
  doc?: ConsentDoc;
  /** 약관 법률 확인 완료 여부. 기본은 코드의 NEWYEAR_TERMS_LEGAL_REVIEWED(현재 false). */
  termsReviewed?: boolean;
  now?: () => Date;
  /** 신청 횟수 제한 설정(시험용으로 바꿀 수 있다). 기본은 DEFAULT_THROTTLE. 공개 라우트는 이 값을 넘기지 않아 항상 기본 제한이 적용된다. */
  throttle?: ThrottleConfig;
  /** 같은 인스턴스 안의 '확인 → 저장' 순차 처리 잠금(시험에서 인스턴스를 흉내 내기 위해 바꿀 수 있다). */
  lock?: <T>(fn: () => Promise<T>) => Promise<T>;
  /** 입금 계좌 안내를 돌려주는 함수. 공개 라우트가 서버 환경변수에서 읽은 값을 넘기고, 없으면 '계좌 미설정'으로 안내한다. */
  paymentGuide?: () => PaymentGuide;
}
/** 이 서버 인스턴스의 기본 잠금. */
const DEFAULT_LOCK = createApplyLock();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RATE_LIMITED = (retryAfterSec: number): PublicOut => ({ status: 429, headers: { "Retry-After": String(retryAfterSec) }, body: { ok: false, saved: false, code: "rate_limited", message: "신청이 짧은 시간에 너무 많이 들어와 잠시 제한되었습니다. 잠시 후 다시 시도해 주세요.", retryAfterSec } });

/** 고객에게 보여 줄 입금 안내. 계좌가 설정되지 않았으면 값 없이 configured:false 만 보낸다. */
const guideOf = (deps: PublicApplyDeps): PaymentGuide => { try { return deps.paymentGuide ? deps.paymentGuide() : { ...UNCONFIGURED_GUIDE }; } catch { return { ...UNCONFIGURED_GUIDE }; } };

export const PUBLIC_ACTOR = "고객 신청";
export const PUBLIC_CHANNEL = "DIRECT";
export const PUBLIC_CHANNEL_REF = "web-form";
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const won = (n: number | null) => (n === null ? "" : `${n.toLocaleString("ko-KR")}원`);

/** 신청을 열어도 되는지(화면과 서버가 같은 판정을 쓴다). */
export function applyOpenState(deps: PublicApplyDeps = {}): { open: boolean; reasons: string[] } {
  const catalog = deps.catalog ?? CATALOG;
  const reasons: string[] = [];
  const p = catalog.NEWYEAR_2027;
  if (!p) reasons.push("상품 설정이 없습니다.");
  else { const r = getSaleReadiness(p); if (!r.sellable) reasons.push(...r.blockers); }
  if (!(deps.termsReviewed ?? NEWYEAR_TERMS_LEGAL_REVIEWED)) reasons.push("약관의 법률 확인이 끝나지 않았습니다.");
  return { open: reasons.length === 0, reasons };
}

const NOT_OPEN: PublicOut = { status: 409, body: { ok: false, saved: false, code: "not_open", message: "지금은 신청을 받고 있지 않습니다. 준비가 끝나면 안내해 드리겠습니다." } };
const UNAVAILABLE: PublicOut = { status: 503, body: { ok: false, saved: false, code: "storage_unavailable", message: "지금은 신청을 저장할 수 없습니다. 잠시 후 다시 시도해 주세요." } };
const BAD: PublicOut = { status: 400, body: { ok: false, saved: false, code: "bad_request", message: "요청이 올바르지 않습니다." } };

export async function processPublicApply(body: unknown, svc: LedgerService | null, deps: PublicApplyDeps = {}): Promise<PublicOut> {
  if (!svc) return UNAVAILABLE;
  if (!isObj(body)) return BAD;
  if (body.website !== undefined && body.website !== "") return BAD; // 숨김 입력칸(봇 걸러내기): 사람은 채우지 않는다
  const catalog = deps.catalog ?? CATALOG, doc = deps.doc ?? NEWYEAR_CONSENT_DOC, now = deps.now ?? (() => new Date());
  if (!applyOpenState(deps).open) return NOT_OPEN; // 주문도 동의 기록도 만들지 않는다

  const c = validateConsentInput(body.consent, doc);
  if (!c.ok) return { status: 400, body: { ok: false, saved: false, code: "consent_required", errors: c.errors } };
  const consent = buildConsentRecord(c.itemIds, doc, now(), "WEB_FORM", c.docsEchoed);
  const payer = parsePayerName(body.payerName); // 입금자명(선택): 신청자 이름과 다를 때 고객이 적는다. 주문 메모에 한 줄로 남는다.
  if (!payer.ok) return { status: 400, body: { ok: false, saved: false, code: "invalid_input", errors: ["입금자명이 올바르지 않습니다(20자 이내, 이메일 형식 불가)."] } };

  const create = async (): Promise<PublicOut> => {
  try {
    const r = await svc.createOrder({
      requestKey: body.requestKey, productCode: "NEWYEAR_2027", channel: PUBLIC_CHANNEL, channelRef: PUBLIC_CHANNEL_REF, actor: PUBLIC_ACTOR,
      buyerName: body.buyerName, buyerEmail: body.buyerEmail, subjects: body.subjects, profile: body.profile, consent, ...(payer.value ? { memo: payerMemo(payer.value) } : {}),
    });
    if (r.ok) {
      const p = catalog.NEWYEAR_2027;
      return { status: r.created ? 201 : 200, body: { ok: true, saved: true, created: r.created, orderCode: r.order.orderCode, priceKrw: p?.priceKrw ?? null, priceText: won(p?.priceKrw ?? null), deliveryNotice: "결제(입금 확인) 및 필수 정보 입력 완료 후 최대 48시간 이내에 입력하신 이메일로 PDF를 보내 드립니다.", paymentNotice: "신청만으로는 결제가 완료되지 않았습니다. 입금 안내를 확인하시고 계좌이체로 입금해 주세요.", consentRecorded: true, paymentGuide: guideOf(deps) } };
    }
    switch (r.code) {
      case "invalid_request_key": return { status: 400, body: { ok: false, saved: false, code: r.code, message: "요청 번호가 올바르지 않습니다. 화면을 새로고침해 주세요." } };
      case "invalid_input": return { status: 400, body: { ok: false, saved: false, code: r.code, errors: (r.errors ?? []).filter((e) => typeof e === "string" && e.length <= 120) } };
      case "request_key_conflict": return { status: 409, body: { ok: false, saved: false, code: r.code, message: "같은 요청 번호로 다른 내용이 이미 접수되어 있습니다. 화면을 새로고침한 뒤 다시 신청해 주세요." } };
      case "legacy_product": case "not_sellable": case "unknown_product": return NOT_OPEN;
      default: return UNAVAILABLE;
    }
  } catch { return UNAVAILABLE; }
  };

  // 대량 신청 방지: 저장된 주문 장부(모든 서버 인스턴스가 공유)에서 최근 웹 신청을 세어 판정한다. 한 인스턴스 안에서는 확인과 저장을 순서대로 처리한다.
  // 제한에 걸리면 429 를 돌려주고 주문·동의 기록을 만들지 않는다. 장부를 읽지 못하면 안전하게 막는다(503). 개인정보는 기록·응답에 남기지 않는다.
  return (deps.lock ?? DEFAULT_LOCK)(async () => {
    // 입력이 올바르지 않은 요청은 저장될 일이 없으므로 제한을 건드리지 않고 그대로 검증 결과(400)를 받게 한다(장부 조회 비용도 쓰지 않는다).
    const emailLower = typeof body.buyerEmail === "string" ? body.buyerEmail.trim().toLowerCase() : "";
    const product = catalog.NEWYEAR_2027;
    const subjects = product ? parseSubjects(body.subjects, product.subjects) : null, profile = parseProfile(body.profile);
    if (!product || !subjects || !subjects.ok || !profile.ok || !emailLower || emailLower.length > 254 || !EMAIL_RE.test(emailLower)) return create();
    let orders: ThrottleOrder[];
    try {
      orders = (await svc.listOrders({ productCode: "NEWYEAR_2027" })).map((o) => ({ createdAt: o.createdAt, channelRef: o.channelRef, buyerEmail: o.buyer.email, intakeSha256: sajuInputSha256(o.subjects), requestKey: o.requestKey }));
    } catch { return UNAVAILABLE; }
    if (typeof body.requestKey === "string" && orders.some((o) => o.requestKey === body.requestKey)) return create(); // 같은 요청 번호의 재시도는 제한 없이 통과(기존 주문을 돌려준다)
    const v = evaluateThrottle(orders, { emailLower, intakeSha256: sajuInputSha256(subjects.value) }, now(), deps.throttle ?? DEFAULT_THROTTLE);
    return v.allowed ? create() : RATE_LIMITED(v.retryAfterSec);
  });
}
