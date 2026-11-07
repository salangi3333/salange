/**
 * 신규 상품 공통 주문 장부 서비스 — 상품이 늘어나도 이 파일은 그대로 쓴다(상품별 차이는 카탈로그·입력 계약에만 있다).
 * 흐름: 주문 접수 → (계좌이체) 입금 확인 → 제작 시작 → 검수 요청 → PDF 승인 → 발송 → 접수/도착 기록. 취소·환불은 언제든 발송을 멈춘다.
 * 이 모듈은 DB·네트워크·메일·결제·계산 엔진을 모른다. 저장소(LedgerRepo)와 시계·ID 생성기를 주입받는다.
 */
import { createHash, randomInt, randomUUID } from "crypto";
import { CATALOG, getProduct, snapshotOffer, type OfferSnapshot, type ProductDefinition } from "./catalog";
import { consentProblems, consentToDetail, type ConsentRecord } from "./consent";
import { parseProfile, parseSubjects } from "./intake";
import { subjectsSha256 } from "./intakeFingerprint";
import { CHANNELS, type Channel, type EventDetail, type LedgerEvent, type LedgerRepo, type NewEvent, type OrderRecord } from "./ledgerTypes";

export const REQUEST_KEY_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const HEX64 = /^[0-9a-f]{64}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const ORDER_CODE_RE = /^PO-[A-Z2-9]{10}$/;
export const MAX_AMOUNT_KRW = 10_000_000;

export type Fail = { ok: false; code: string; message: string; errors?: string[] };
export type Ok<T = object> = { ok: true } & T;
type Res<T = object> = Ok<T> | Fail;
/** 이미 같은 결과가 반영되어 있어 아무것도 바꾸지 않은 재요청(중복 요청 방지). */
type Done = { ok: true; order: OrderRecord; already: true };
/** 저장소 호출이 예외로 끝난 경우. 한 번의 저장은 전부 반영되거나 전혀 반영되지 않으므로, 같은 요청 키·같은 입력으로 다시 시도해도 중복 주문·중복 처리가 생기지 않는다. */
const storeFailed = (): Fail => ({ ok: false, code: "store_failed", message: "저장 중 오류가 발생했습니다. 상태를 확인한 뒤 다시 시도해 주세요." });
const fail = (code: string, message: string, errors?: string[]): Fail => ({ ok: false, code, message, ...(errors ? { errors } : {}) });

export interface LedgerDeps {
  repo: LedgerRepo;
  catalog?: Readonly<Record<string, Readonly<ProductDefinition>>>;
  now?: () => Date;
  newId?: () => string;
  newOrderCode?: () => string;
}

const sha = (v: unknown): string => createHash("sha256").update(JSON.stringify(v), "utf8").digest("hex");
const defaultOrderCode = () => "PO-" + Array.from({ length: 10 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");

/** 변경 이력에 들어가는 값 점검: 이메일처럼 보이는 문자열은 넣을 수 없다(민감정보 원문 방지). 위반하면 프로그램 오류로 취급한다. */
function safeDetail(d: EventDetail): EventDetail {
  for (const [k, v] of Object.entries(d)) {
    if (typeof v === "string" && (/[^\s@]+@[^\s@]+/.test(v) || v.length > 200)) throw new Error(`변경 이력에 넣을 수 없는 값입니다: ${k}`);
  }
  return d;
}

export const maskName = (n: string): string => { const a = Array.from(n); return a.length <= 1 ? "○" : a[0] + "○".repeat(Math.min(a.length - 1, 4)); };
export const maskEmail = (e: string): string => { const [l, d = ""] = e.split("@"); return `${l.slice(0, 1)}***@${d.slice(0, 1)}***`; };

export function createLedgerService(deps: LedgerDeps) {
  const { repo } = deps;
  const catalog = deps.catalog ?? CATALOG;
  const now = () => (deps.now ? deps.now() : new Date()).toISOString();
  const newId = deps.newId ?? randomUUID;
  const newOrderCode = deps.newOrderCode ?? defaultOrderCode;

  /** 읽기 → 바꾸기 → 저장. 다른 요청이 먼저 저장했으면(version_conflict) 최신 값으로 다시 시도한다. */
  async function mutate(id: string, actor: string, fn: (o: OrderRecord, at: string) => { next: OrderRecord; ev: Omit<NewEvent, "actor" | "at"> } | Fail | Done): Promise<Res<{ order: OrderRecord; already?: boolean }>> {
    if (typeof actor !== "string" || !actor.trim() || Array.from(actor).length > 40) return fail("invalid_actor", "처리자 이름이 올바르지 않습니다.");
    for (let i = 0; i < 4; i++) {
      let cur: OrderRecord | null;
      try { cur = await repo.get(id); } catch { return storeFailed(); }
      if (!cur) return fail("not_found", "주문을 찾을 수 없습니다.");
      const at = now();
      const r = fn(cur, at);
      if ("ok" in r) return r;
      const next = { ...r.next, version: cur.version + 1, updatedAt: at };
      let out: Awaited<ReturnType<LedgerRepo["update"]>>;
      try { out = await repo.update(next, cur.version, { ...r.ev, detail: safeDetail(r.ev.detail), actor: actor.trim(), at }); } catch { return storeFailed(); }
      if (out === "ok") return { ok: true, order: next };
      if (out === "rule_violation") return fail("store_rejected", "저장소가 이 변경을 허용하지 않았습니다(상태 규칙 위반).");
      if (out === "version_conflict") continue;
      if (out === "pdf_hash_taken") return fail("pdf_already_used", "이 PDF는 이미 다른 주문에 연결되어 있습니다.");
      if (out === "ref_taken") return fail("ref_already_linked", "이 외부 등록은 이미 다른 주문에 연결되어 있습니다.");
      return fail("not_found", "주문을 찾을 수 없습니다.");
    }
    return fail("busy", "다른 처리와 겹쳤습니다. 잠시 후 다시 시도해 주세요.");
  }

  /* ───────── 주문 접수 ───────── */
  async function createOrder(input: {
    requestKey: unknown; productCode: unknown; channel: unknown; channelRef?: unknown; actor: string;
    buyerName: unknown; buyerEmail: unknown; recipientEmail?: unknown; subjects: unknown; profile: unknown; memo?: unknown;
    /** 고객 신청 화면에서 서버가 검증해 만든 동의 기록(ConsentRecord). 있으면 접수 이력에 함께 남는다. 관리자 대리 입력은 없음. */
    consent?: unknown;
  }): Promise<Res<{ order: OrderRecord; created: boolean; warnings: string[] }>> {
    if (typeof input.requestKey !== "string" || !REQUEST_KEY_RE.test(input.requestKey)) return fail("invalid_request_key", "요청 키 형식이 올바르지 않습니다.");
    if (typeof input.actor !== "string" || !input.actor.trim()) return fail("invalid_actor", "처리자 이름이 올바르지 않습니다.");
    const product = getProduct(input.productCode, catalog);
    // 구형 인생사주 등 카탈로그에 없는 상품은 입력을 읽기 전에 막는다(snapshotOffer 가 사유를 정한다).
    if (!product) { const s = snapshotOffer(input.productCode, catalog); return fail(s.ok ? "unknown_product" : s.code, s.ok ? "알 수 없는 상품입니다." : s.blockers[0], s.ok ? undefined : s.blockers); }

    const errors: string[] = [];
    const buyerName = typeof input.buyerName === "string" ? input.buyerName.trim() : "";
    if (!buyerName || Array.from(buyerName).length > 40) errors.push("주문자 이름이 올바르지 않습니다(1~40자).");
    const lowerEmail = (v: unknown, label: string) => {
      const e = typeof v === "string" ? v.trim().toLowerCase() : "";
      if (!e || e.length > 254 || !EMAIL_RE.test(e)) { errors.push(`${label} 이메일이 올바르지 않습니다.`); return ""; }
      return e;
    };
    const buyerEmail = lowerEmail(input.buyerEmail, "주문자");
    const recipientEmail = input.recipientEmail === undefined || input.recipientEmail === null || input.recipientEmail === "" ? buyerEmail : lowerEmail(input.recipientEmail, "수신자");
    const channel = (CHANNELS as readonly unknown[]).includes(input.channel) ? (input.channel as Channel) : null;
    if (!channel) errors.push("판매 채널이 올바르지 않습니다.");
    let channelRef: string | null = null;
    if (input.channelRef !== undefined && input.channelRef !== null && input.channelRef !== "") {
      if (typeof input.channelRef !== "string" || Array.from(input.channelRef.trim()).length > 40) errors.push("채널 식별 값이 올바르지 않습니다(40자 이내).");
      else channelRef = input.channelRef.trim() || null;
    }
    let memo = "";
    if (input.memo !== undefined && input.memo !== null) {
      if (typeof input.memo !== "string" || Array.from(input.memo.trim()).length > 200) errors.push("메모가 올바르지 않습니다(200자 이내).");
      else memo = input.memo.trim();
    }
    const subj = parseSubjects(input.subjects, product.subjects);
    if (!subj.ok) errors.push(...subj.errors);
    const prof = parseProfile(input.profile);
    if (!prof.ok) errors.push(...prof.errors);
    if (errors.length || !subj.ok || !prof.ok || !channel) return fail("invalid_input", "입력을 확인해 주세요.", errors);

    const intakeSha256 = subjectsSha256(subj.value, prof.value);
    const payloadSha256 = sha(["commerce-payload", 1, product.code, buyerName, buyerEmail, recipientEmail, channel, channelRef, memo, intakeSha256]);
    const warnings = [...subj.warnings, ...prof.warnings];

    // 같은 요청 키: 같은 내용이면 기존 주문을 돌려주고(판매가 중단된 뒤의 재시도 포함), 다른 내용이면 거부한다.
    let existing: OrderRecord | null;
    try { existing = await repo.findByRequestKey(input.requestKey); } catch { return storeFailed(); }
    if (existing) return existing.payloadSha256 === payloadSha256 ? { ok: true, order: existing, created: false, warnings } : fail("request_key_conflict", "같은 요청 키로 다른 내용이 들어왔습니다.");

    const snap = snapshotOffer(product.code, catalog);
    if (!snap.ok) return fail(snap.code, "지금은 이 상품의 주문을 만들 수 없습니다.", snap.blockers);
    // 동의 기록이 함께 온 경우: 모양을 확인하고, 주문 당시 판매 조건의 약관 버전과 같은 문서에 대한 동의여야 한다.
    let consent: ConsentRecord | null = null;
    if (input.consent !== undefined && input.consent !== null) {
      const cp = consentProblems(input.consent);
      if (cp.length) return fail("invalid_input", "입력을 확인해 주세요.", cp);
      consent = input.consent as ConsentRecord;
      if (consent.documentVersion !== snap.snapshot.termsVersion) return fail("invalid_input", "입력을 확인해 주세요.", ["동의한 약관 버전이 이 상품의 약관 버전과 다릅니다."]);
    }

    const at = now();
    const order: OrderRecord = {
      id: newId(), orderCode: newOrderCode(), requestKey: input.requestKey, version: 1,
      offer: structuredClone(snap.snapshot) as OfferSnapshot, offerSha256: sha(["commerce-offer", 1, snap.snapshot]),
      channel, channelRef, buyer: { name: buyerName, email: buyerEmail }, recipient: { email: recipientEmail },
      subjects: subj.value, profile: prof.value, intakeSha256, payloadSha256, memo,
      status: "ACTIVE", statusReason: null, statusBy: null, statusAt: null,
      payment: { state: "UNCONFIRMED", method: "BANK_TRANSFER", confirmedAmountKrw: null, confirmedBy: null, confirmedAt: null, revokedBy: null, revokedAt: null, revokeReason: null },
      production: { state: "NOT_STARTED", rounds: 0, startedAt: null, reviewedAt: null },
      pdf: null, delivery: { state: "NONE", key: null, ref: null, attempts: 0, lastAt: null },
      externalRefs: { newyearRegistrationId: null, newyearRegistrationCode: null },
      createdAt: at, updatedAt: at,
    };
    const ev: NewEvent = { type: "ORDER_CREATED", actor: input.actor.trim(), at, detail: safeDetail({ productCode: product.code, channel, subjectCount: subj.value.length, offerSha256: order.offerSha256, intakeSha256, ...(consent ? consentToDetail(consent) : {}) }) };
    let out: Awaited<ReturnType<LedgerRepo["insert"]>>;
    try { out = await repo.insert(order, ev); } catch { return storeFailed(); }
    if (out === "ok") return { ok: true, order, created: true, warnings };
    if (out === "request_key_taken") { // 동시에 같은 요청이 들어온 경우: 먼저 저장된 주문을 다시 읽어 판정한다.
      let again: OrderRecord | null;
      try { again = await repo.findByRequestKey(input.requestKey); } catch { return storeFailed(); }
      if (again) return again.payloadSha256 === payloadSha256 ? { ok: true, order: again, created: false, warnings } : fail("request_key_conflict", "같은 요청 키로 다른 내용이 들어왔습니다.");
    }
    return fail("store_failed", "주문을 저장하지 못했습니다. 다시 시도해 주세요.");
  }

  const activeOnly = (o: OrderRecord): Fail | null => (o.status !== "ACTIVE" ? fail("order_not_active", o.status === "REFUNDED" ? "환불된 주문입니다." : "취소된 주문입니다.") : null);

  /* ───────── 입금 확인(계좌이체, 관리자 수동) ───────── */
  const confirmPayment = (id: string, p: { amountKrw: unknown; actor: string }) => mutate(id, p.actor, (o, at) => {
    const na = activeOnly(o); if (na) return na;
    const a = p.amountKrw;
    if (typeof a !== "number" || !Number.isSafeInteger(a) || a <= 0 || a > MAX_AMOUNT_KRW) return fail("invalid_amount", "입금 금액이 올바르지 않습니다.");
    if (o.payment.state === "REVOKED") return fail("payment_revoked_final", "입금 확인이 취소된 주문은 다시 확인할 수 없습니다.");
    if (o.payment.state === "CONFIRMED") return o.payment.confirmedAmountKrw === a ? { ok: true, order: o, already: true } : fail("payment_already_confirmed", "이미 다른 금액으로 입금 확인되었습니다.");
    if (a !== o.offer.priceKrw) return fail("amount_mismatch", "입금 금액이 주문 당시 가격과 다릅니다.");
    return { next: { ...o, payment: { ...o.payment, state: "CONFIRMED", confirmedAmountKrw: a, confirmedBy: p.actor.trim(), confirmedAt: at } }, ev: { type: "PAYMENT_CONFIRMED", detail: { amountKrw: a } } };
  });

  /** 입금 확인 취소: 제작이 시작되기 전, 발송 전에만 가능하다. 최종 상태다. */
  const revokePayment = (id: string, p: { reason: unknown; actor: string }) => mutate(id, p.actor, (o, at) => {
    const na = activeOnly(o); if (na) return na;
    const reason = typeof p.reason === "string" ? p.reason.trim() : "";
    if (!reason || Array.from(reason).length > 100) return fail("invalid_reason", "취소 사유가 올바르지 않습니다(1~100자).");
    if (o.payment.state !== "CONFIRMED") return fail("payment_not_confirmed", "입금 확인된 주문이 아닙니다.");
    if (o.production.state !== "NOT_STARTED" || o.delivery.state !== "NONE") return fail("too_late_to_revoke", "제작이 시작된 주문은 입금 확인을 취소할 수 없습니다. 주문 취소·환불로 처리하세요.");
    return { next: { ...o, payment: { ...o.payment, state: "REVOKED", revokedBy: p.actor.trim(), revokedAt: at, revokeReason: reason } }, ev: { type: "PAYMENT_REVOKED", detail: {} } };
  });

  /* ───────── 제작·검수·승인 ───────── */
  const startProduction = (id: string, p: { actor: string }) => mutate(id, p.actor, (o, at) => {
    const na = activeOnly(o); if (na) return na;
    if (o.payment.state !== "CONFIRMED") return fail("payment_not_confirmed", "입금이 확인되지 않아 제작을 시작할 수 없습니다.");
    if (o.production.state !== "NOT_STARTED") return fail("invalid_transition", "이미 제작이 시작된 주문입니다.");
    return { next: { ...o, production: { ...o.production, state: "IN_PRODUCTION", startedAt: at } }, ev: { type: "PRODUCTION_STARTED", detail: {} } };
  });

  const submitForReview = (id: string, p: { actor: string }) => mutate(id, p.actor, (o, at) => {
    const na = activeOnly(o); if (na) return na;
    if (o.production.state !== "IN_PRODUCTION") return fail("invalid_transition", "제작 중인 주문만 검수를 요청할 수 있습니다.");
    return { next: { ...o, production: { ...o.production, state: "IN_REVIEW", rounds: o.production.rounds + 1, reviewedAt: at } }, ev: { type: "REVIEW_REQUESTED", detail: { round: o.production.rounds + 1 } } };
  });

  const requestChanges = (id: string, p: { actor: string }) => mutate(id, p.actor, (o) => {
    const na = activeOnly(o); if (na) return na;
    if (o.production.state !== "IN_REVIEW") return fail("invalid_transition", "검수 중인 주문만 수정을 요청할 수 있습니다.");
    return { next: { ...o, production: { ...o.production, state: "IN_PRODUCTION" } }, ev: { type: "CHANGES_REQUESTED", detail: { round: o.production.rounds } } };
  });

  /**
   * PDF 승인. 승인하는 PDF 는 이 주문의 것임이 증명되어야 한다: 증명에 적힌 주문번호와 입력 지문이 이 주문과 같아야 하고,
   * 같은 PDF(해시)가 다른 주문에 이미 연결되어 있으면 거부한다(고객 간 PDF 혼동 방지). 서명 검증은 연결 단계의 어댑터가 먼저 한다.
   */
  const approvePdf = (id: string, p: { actor: string; pdfSha256: unknown; pdfBytes: unknown; boundOrderCode: unknown; boundIntakeSha256: unknown }) => mutate(id, p.actor, (o, at) => {
    const na = activeOnly(o); if (na) return na;
    if (o.payment.state !== "CONFIRMED") return fail("payment_not_confirmed", "입금이 확인되지 않은 주문은 승인할 수 없습니다.");
    if (typeof p.pdfSha256 !== "string" || !HEX64.test(p.pdfSha256)) return fail("invalid_pdf", "PDF 해시 형식이 올바르지 않습니다.");
    if (typeof p.pdfBytes !== "number" || !Number.isSafeInteger(p.pdfBytes) || p.pdfBytes <= 0) return fail("invalid_pdf", "PDF 크기가 올바르지 않습니다.");
    if (p.boundOrderCode !== o.orderCode) return fail("pdf_order_mismatch", "PDF가 다른 주문의 것입니다(주문번호 불일치).");
    if (p.boundIntakeSha256 !== o.intakeSha256) return fail("pdf_intake_mismatch", "PDF가 이 주문의 입력과 맞지 않습니다(입력 지문 불일치).");
    if (o.production.state === "APPROVED") return o.pdf?.sha256 === p.pdfSha256 ? { ok: true, order: o, already: true } : fail("already_approved_other_pdf", "이미 다른 PDF로 승인된 주문입니다.");
    if (o.production.state !== "IN_REVIEW") return fail("invalid_transition", "검수 중인 주문만 승인할 수 있습니다.");
    const pdf = { sha256: p.pdfSha256, bytes: p.pdfBytes, templateVersion: o.offer.pdfTemplateVersion, generatorVersion: o.offer.generatorVersion, boundOrderCode: o.orderCode, boundIntakeSha256: o.intakeSha256, approvedBy: p.actor.trim(), approvedAt: at };
    return { next: { ...o, production: { ...o.production, state: "APPROVED" }, pdf }, ev: { type: "PDF_APPROVED", detail: { pdfSha256: p.pdfSha256, pdfBytes: p.pdfBytes } } };
  });

  /* ───────── 발송 ───────── */
  /** 발송 가능 조건을 한 곳에서 판정한다. 화면의 '발송' 버튼과 beginDelivery 가 같은 판정을 쓴다. */
  function deliveryBlockers(o: OrderRecord): string[] {
    const b: string[] = [];
    if (o.status !== "ACTIVE") b.push(o.status === "REFUNDED" ? "환불된 주문입니다." : "취소된 주문입니다.");
    if (o.payment.state !== "CONFIRMED") b.push("입금이 확인되지 않았습니다.");
    if (o.production.state !== "APPROVED" || !o.pdf) b.push("승인된 PDF가 없습니다.");
    if (o.delivery.state === "HALTED") b.push("발송이 중지된 주문입니다.");
    else if (o.delivery.state === "QUEUED") b.push("발송 결과를 확인하는 중입니다(자동으로 다시 보내지 않습니다).");
    else if (["ACCEPTED", "DELIVERED", "BOUNCED"].includes(o.delivery.state)) b.push("이미 발송 처리된 주문입니다.");
    return b;
  }

  const beginDelivery = (id: string, p: { actor: string }) => mutate(id, p.actor, (o, at) => {
    const blockers = deliveryBlockers(o);
    if (blockers.length) return fail("delivery_blocked", "지금은 발송할 수 없습니다.", blockers);
    const attempt = o.delivery.attempts + 1;
    const key = `${o.orderCode}:${(o.pdf as { sha256: string }).sha256.slice(0, 16)}:${attempt}`;
    return { next: { ...o, delivery: { ...o.delivery, state: "QUEUED", key, attempts: attempt, lastAt: at } }, ev: { type: "DELIVERY_QUEUED", detail: { attempt, deliveryKey: key } } };
  });

  /** 발송 시도 결과. ACCEPTED=제공자 접수, FAILED=확정 실패(다시 시도 가능), UNKNOWN=결과 불명(QUEUED 유지, 자동 재발송 없음). */
  const finishDelivery = (id: string, p: { actor: string; outcome: "ACCEPTED" | "FAILED" | "UNKNOWN"; ref?: string | null }) => mutate(id, p.actor, (o, at) => {
    if (o.delivery.state !== "QUEUED") return fail("invalid_transition", "발송 시도 중인 주문이 아닙니다.");
    if (!["ACCEPTED", "FAILED", "UNKNOWN"].includes(p.outcome)) return fail("invalid_outcome", "발송 결과 값이 올바르지 않습니다.");
    if (p.ref != null && (typeof p.ref !== "string" || p.ref.length > 100)) return fail("invalid_ref", "발송 참조 값이 올바르지 않습니다.");
    if (p.outcome === "UNKNOWN") return { next: { ...o, delivery: { ...o.delivery, lastAt: at } }, ev: { type: "DELIVERY_UNKNOWN", detail: { attempt: o.delivery.attempts } } };
    return { next: { ...o, delivery: { ...o.delivery, state: p.outcome, ref: p.outcome === "ACCEPTED" ? (p.ref ?? null) : o.delivery.ref, lastAt: at } }, ev: { type: p.outcome === "ACCEPTED" ? "DELIVERY_ACCEPTED" : "DELIVERY_FAILED", detail: { attempt: o.delivery.attempts } } };
  });

  /** 메일 제공자 이벤트(도착/반송). 접수(ACCEPTED)된 뒤에만 기록한다. */
  const recordDeliveryEvent = (id: string, p: { actor: string; event: "DELIVERED" | "BOUNCED" }) => mutate(id, p.actor, (o, at) => {
    if (o.delivery.state !== "ACCEPTED") return fail("invalid_transition", "접수된 발송만 도착/반송을 기록할 수 있습니다.");
    if (p.event !== "DELIVERED" && p.event !== "BOUNCED") return fail("invalid_outcome", "이벤트 값이 올바르지 않습니다.");
    return { next: { ...o, delivery: { ...o.delivery, state: p.event, lastAt: at } }, ev: { type: `DELIVERY_${p.event}`, detail: {} } };
  });

  /* ───────── 취소·환불 ───────── */
  /** 취소·환불은 발송을 멈춘다. 아직 보내지 않았거나(NONE) 확정 실패(FAILED)면 HALTED(최종). 이미 보낸 메일은 되돌릴 수 없어 상태를 그대로 둔다. */
  const cancelOrder = (id: string, p: { actor: string; kind: "CANCELLED" | "REFUNDED"; reason: unknown }) => mutate(id, p.actor, (o, at) => {
    const reason = typeof p.reason === "string" ? p.reason.trim() : "";
    if (!reason || Array.from(reason).length > 100) return fail("invalid_reason", "사유가 올바르지 않습니다(1~100자).");
    if (p.kind !== "CANCELLED" && p.kind !== "REFUNDED") return fail("invalid_kind", "처리 종류가 올바르지 않습니다.");
    if (o.status === p.kind) return { ok: true, order: o, already: true };
    if (o.status === "REFUNDED") return fail("order_not_active", "이미 환불된 주문입니다.");
    if (o.status === "CANCELLED" && p.kind === "CANCELLED") return fail("order_not_active", "이미 취소된 주문입니다.");
    // 발송 선점(delivery QUEUED 로의 저장)이 취소·환불 확정과 충돌하는 기준 시점이다. 선점이 먼저 저장됐다면 메일이 이미 나갔거나 나가는 중일 수 있으므로
    // 취소·환불을 '완료'로 기록하지 않는다(거짓 안내 방지). 결과 불명(QUEUED 유지)일 때도 같다. 발송 결과를 확인·정리한 뒤 다시 처리한다.
    // 반대로 취소·환불이 먼저 저장되면 beginDelivery 가 막힌다. 두 저장은 같은 주문 행의 version 조건부 변경이라 동시에 둘 다 성공할 수 없다.
    if (o.status === "ACTIVE" && o.delivery.state === "QUEUED") return fail("delivery_in_progress", "발송이 진행 중이거나 발송 결과를 아직 확인하지 못한 주문입니다. 취소·환불을 기록하지 않았습니다. 발송 결과를 먼저 확인·정리한 뒤 다시 처리해 주세요.");
    const halt = o.delivery.state === "NONE" || o.delivery.state === "FAILED";
    return {
      next: { ...o, status: p.kind, statusReason: reason, statusBy: p.actor.trim(), statusAt: at, delivery: halt ? { ...o.delivery, state: "HALTED", lastAt: at } : o.delivery },
      ev: { type: p.kind === "REFUNDED" ? "ORDER_REFUNDED" : "ORDER_CANCELLED", detail: { deliveryBefore: o.delivery.state, deliveryHalted: halt } },
    };
  });

  /* ───────── 외부 등록 연결(신년운세 등록과 1:1) — 검증은 newyearLink 어댑터가 먼저 한다 ───────── */
  const linkNewYearRegistration = (id: string, p: { actor: string; registrationId: string; registrationCode: string }) => mutate(id, p.actor, (o) => {
    if (o.offer.productCode !== "NEWYEAR_2027") return fail("wrong_product", "신년운세 주문만 신년운세 등록과 연결할 수 있습니다.");
    const na = activeOnly(o); if (na) return na;
    if (o.externalRefs.newyearRegistrationId) return o.externalRefs.newyearRegistrationId === p.registrationId && o.externalRefs.newyearRegistrationCode === p.registrationCode ? { ok: true, order: o, already: true } : fail("already_linked", "이미 다른 신년운세 등록과 연결되어 있습니다.");
    return { next: { ...o, externalRefs: { newyearRegistrationId: p.registrationId, newyearRegistrationCode: p.registrationCode } }, ev: { type: "NEWYEAR_REGISTRATION_LINKED", detail: { registrationId: p.registrationId, registrationCode: p.registrationCode } } };
  });

  /* ───────── 조회 ───────── */
  async function getOrder(id: string) { return repo.get(id); }
  /** 주문번호(PO-…)로 조회. 관리자 화면·API 는 내부 ID 대신 이 번호로 주문을 가리킨다. */
  async function getOrderByCode(code: string) { return ORDER_CODE_RE.test(code) ? repo.getByCode(code) : null; }
  /** 주문 목록(상품 필터 선택). 정렬·쪽 나누기는 호출하는 쪽이 한다(작은 규모용 — 주문이 수천 건을 넘으면 저장소 쪽 쪽 나누기로 바꾼다). */
  async function listOrders(filter?: { productCode?: string }) { return repo.list(filter); }
  async function getEvents(id: string): Promise<LedgerEvent[]> { return repo.events(id); }
  /** 관리자 목록·상세용 가림 보기. 이름·이메일은 가리고 생년월일·고민 원문은 포함하지 않는다. */
  function adminView(o: OrderRecord) {
    return {
      id: o.id, orderCode: o.orderCode, productCode: o.offer.productCode, productName: o.offer.productName, priceKrw: o.offer.priceKrw, channel: o.channel,
      buyerMasked: maskName(o.buyer.name), recipientMasked: maskEmail(o.recipient.email), subjectCount: o.subjects.length,
      subjects: o.subjects.map((s) => ({ role: s.role, order: s.order, nameMasked: maskName(s.person.name) })),
      status: o.status, payment: o.payment.state, production: o.production.state, delivery: o.delivery.state, pdfApproved: !!o.pdf,
      sendBlockers: deliveryBlockers(o), createdAt: o.createdAt,
    };
  }

  return { createOrder, confirmPayment, revokePayment, startProduction, submitForReview, requestChanges, approvePdf, beginDelivery, finishDelivery, recordDeliveryEvent, cancelOrder, linkNewYearRegistration, getOrder, getOrderByCode, listOrders, getEvents, deliveryBlockers, adminView };
}
export type LedgerService = ReturnType<typeof createLedgerService>;
