/**
 * 신규 상품 공통 주문 장부 — 타입. 기존 orders / reports / report_deliveries 와 독립이다(외래키·공유 컬럼 없음).
 * 입금·제작·승인·발송은 서로 독립된 상태로 둔다. 하나가 바뀌어도 다른 상태를 대신 바꾸지 않는다.
 */
import type { OfferSnapshot } from "./catalog";
import type { OrderSubject, ProfileData } from "./intake";

export const CHANNELS = ["INSTAGRAM", "THREADS", "DIRECT", "OTHER"] as const;
export type Channel = (typeof CHANNELS)[number];

/** 주문 자체의 상태. CANCELLED/REFUNDED 가 되면 이후 제작 진행·발송이 모두 막힌다. */
export type OrderStatus = "ACTIVE" | "CANCELLED" | "REFUNDED";
/** 계좌이체 입금 확인. REVOKED 는 최종 상태(되돌릴 수 없음). */
export type PaymentState = "UNCONFIRMED" | "CONFIRMED" | "REVOKED";
export type ProductionState = "NOT_STARTED" | "IN_PRODUCTION" | "IN_REVIEW" | "APPROVED";
/**
 * NONE 발송 전 · QUEUED 발송 시도 중/결과 불명 · ACCEPTED 메일 제공자 접수(도착 아님) · DELIVERED 도착 확인 · BOUNCED 반송 · FAILED 확정 실패(재시도 가능)
 * · HALTED 취소·환불로 발송 중지(최종).
 */
export type DeliveryState = "NONE" | "QUEUED" | "ACCEPTED" | "DELIVERED" | "BOUNCED" | "FAILED" | "HALTED";

export interface PdfRecord {
  sha256: string; bytes: number;
  /** 주문 당시 판매 조건에 고정된 값(승인 시점의 카탈로그가 아님). */
  templateVersion: string; generatorVersion: string;
  /** PDF 증명이 가리키는 주문번호·입력 지문 — 승인 때 이 주문과 같은지 확인한 값. */
  boundOrderCode: string; boundIntakeSha256: string;
  approvedBy: string; approvedAt: string;
}

export interface ExternalRefs {
  /** 신년운세 등록(newyearRegistration)과 1:1. 한 번만 연결된다. */
  newyearRegistrationId: string | null;
  newyearRegistrationCode: string | null;
}

export interface OrderRecord {
  id: string;
  orderCode: string;
  requestKey: string;
  /** 낙관적 잠금용. 저장할 때마다 1씩 오른다. */
  version: number;
  offer: OfferSnapshot;
  offerSha256: string;
  channel: Channel;
  /** 문의 채널의 상대 식별(예: DM 계정명). 선택 사항이며 변경 이력에는 남기지 않는다. */
  channelRef: string | null;
  buyer: { name: string; email: string };
  recipient: { email: string };
  subjects: OrderSubject[];
  profile: ProfileData;
  intakeSha256: string;
  payloadSha256: string;
  memo: string;

  status: OrderStatus;
  statusReason: string | null; statusBy: string | null; statusAt: string | null;

  payment: {
    state: PaymentState; method: "BANK_TRANSFER";
    confirmedAmountKrw: number | null; confirmedBy: string | null; confirmedAt: string | null;
    revokedBy: string | null; revokedAt: string | null; revokeReason: string | null;
  };
  production: {
    state: ProductionState; rounds: number; startedAt: string | null; reviewedAt: string | null;
  };
  pdf: PdfRecord | null;
  delivery: { state: DeliveryState; key: string | null; ref: string | null; attempts: number; lastAt: string | null };
  externalRefs: ExternalRefs;
  createdAt: string; updatedAt: string;
}

/** 변경 이력 한 줄. detail 에는 상태 이름·식별자·해시·횟수 같은 비민감 값만 담는다(이름·이메일·생년월일·고민 원문 금지). */
export type EventDetail = Record<string, string | number | boolean | null>;
export interface LedgerEvent { orderId: string; seq: number; at: string; actor: string; type: string; detail: EventDetail }
export interface NewEvent { type: string; actor: string; at: string; detail: EventDetail }

export type InsertOutcome = "ok" | "request_key_taken" | "code_taken";
/** rule_violation: 저장소(DB)가 정해진 규칙(상태 전이·고정 값·검사 제약) 위반으로 저장을 막았다는 뜻 — 서비스가 먼저 막아야 할 상황이라 호출한 쪽 오류로 취급한다. */
export type UpdateOutcome = "ok" | "version_conflict" | "pdf_hash_taken" | "ref_taken" | "not_found" | "rule_violation";

/** 저장소 약속. 메모리 구현(시험용)과 SQL 구현(다음 단계)이 같은 약속을 지킨다. */
export interface LedgerRepo {
  findByRequestKey(key: string): Promise<OrderRecord | null>;
  get(id: string): Promise<OrderRecord | null>;
  getByCode(code: string): Promise<OrderRecord | null>;
  list(filter?: { productCode?: string }): Promise<OrderRecord[]>;
  insert(order: OrderRecord, ev: NewEvent): Promise<InsertOutcome>;
  /** expectedVersion 이 현재 저장된 version 과 같을 때만 저장한다. PDF 해시·외부 연결 값은 다른 주문과 겹치면 거부한다. */
  update(next: OrderRecord, expectedVersion: number, ev: NewEvent): Promise<UpdateOutcome>;
  events(orderId: string): Promise<LedgerEvent[]>;
}
