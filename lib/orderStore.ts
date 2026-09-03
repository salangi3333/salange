import { randomUUID } from "crypto";
import { getSql } from "./db";

/**
 * TossPayments 테스트 결제 1차 구현 — 주문(orders) 저장/조회 전용. 결제
 * 승인 API 호출(server-to-server)은 lib/tossPayments.ts가 담당하고, 이
 * 파일은 DB 읽기/쓰기만 한다(lib/reportStore.ts와 같은 역할 분리 원칙).
 *
 * 가격은 여기 하나에서만 고정한다 — 클라이언트가 보내는 금액은 절대 쓰지
 * 않는다. 이 상수를 바꾸면 신규 주문 금액만 바뀌고, 이미 만들어진(과거)
 * PENDING/PAID 주문의 DB에 저장된 amount는 그대로 유지된다(의도된 동작).
 */
export const FULL_REPORT_PRICE = 29800;
export const FULL_REPORT_ORDER_NAME = "팔자문 전체 리포트";

export type OrderStatus = "PENDING" | "PAID" | "FAILED" | "CANCELLED";

export interface OrderRow {
  id: string;
  reportId: string;
  orderId: string;
  amount: number;
  status: OrderStatus;
  orderName: string;
  paymentKey: string | null;
  paidAt: string | null;
}

// 토스 공식 orderId 규칙(영문 대소문자/숫자/-/_로 이루어진 6~64자)과 동일한
// 정규식 — 우리가 생성한 값이든, 리다이렉트로 돌아온 값이든 이 형식이 아니면
// 애초에 DB에 물어보지 않는다(reportStore.ts의 isValidReportId와 같은 패턴).
const ORDER_ID_RE = /^[A-Za-z0-9\-_]{6,64}$/;
export function isValidOrderId(id: string): boolean {
  return ORDER_ID_RE.test(id);
}

function mapRow(r: Record<string, unknown>): OrderRow {
  return {
    id: r.id as string,
    reportId: r.report_id as string,
    orderId: r.order_id as string,
    amount: r.amount as number,
    status: r.status as OrderStatus,
    orderName: r.order_name as string,
    paymentKey: (r.payment_key as string) ?? null,
    paidAt: r.paid_at ? new Date(r.paid_at as string).toISOString() : null,
  };
}

/** 이 report에 결제 완료(PAID)된 주문이 하나라도 있는지 — /result-v2/[reportId]
 * 서버 판정에 쓰인다. */
export async function isReportPaid(reportId: string): Promise<boolean> {
  const sql = getSql();
  const rows = await sql`
    select 1 from orders where report_id = ${reportId} and status = 'PAID' limit 1
  `;
  return rows.length > 0;
}

export type CreateOrderResult =
  | { alreadyPaid: true }
  | { alreadyPaid: false; orderId: string; amount: number; orderName: string };

/**
 * 주문 생성 — 중복 클릭/재시도로 PENDING이 무한 생성되지 않도록, 같은
 * report에 가장 최근 주문이 있으면 그 상태를 먼저 본다.
 *   - PAID면 새로 만들지 않고 "이미 결제됨"만 알린다.
 *   - PENDING이면 그 주문(orderId/amount/orderName)을 그대로 재사용한다
 *     (idempotent) — 새 주문을 또 만들지 않는다.
 *   - FAILED/CANCELLED거나 주문이 아예 없으면 새 PENDING을 만든다.
 *
 * 호출부(app/api/orders/route.ts)에서 report_id가 실제 reports에 존재하는지
 * 이미 확인한 뒤 이 함수를 부른다 — 여기서는 다시 확인하지 않는다.
 */
export async function createOrGetPendingOrder(reportId: string): Promise<CreateOrderResult> {
  const sql = getSql();

  const existing = await sql`
    select order_id, amount, order_name, status
    from orders
    where report_id = ${reportId}
    order by created_at desc
    limit 1
  `;

  if (existing.length > 0) {
    const row = existing[0] as Record<string, unknown>;
    if (row.status === "PAID") {
      return { alreadyPaid: true };
    }
    if (row.status === "PENDING") {
      return {
        alreadyPaid: false,
        orderId: row.order_id as string,
        amount: row.amount as number,
        orderName: row.order_name as string,
      };
    }
    // FAILED/CANCELLED — 새 주문을 만든다(아래로 진행).
  }

  const orderId = randomUUID();
  await sql`
    insert into orders (report_id, order_id, amount, order_name, status)
    values (${reportId}, ${orderId}, ${FULL_REPORT_PRICE}, ${FULL_REPORT_ORDER_NAME}, 'PENDING')
  `;

  return { alreadyPaid: false, orderId, amount: FULL_REPORT_PRICE, orderName: FULL_REPORT_ORDER_NAME };
}

export async function getOrderByOrderId(orderId: string): Promise<OrderRow | null> {
  if (!isValidOrderId(orderId)) return null;
  const sql = getSql();
  const rows = await sql`
    select id, report_id, order_id, amount, status, order_name, payment_key, paid_at
    from orders
    where order_id = ${orderId}
    limit 1
  `;
  return rows.length > 0 ? mapRow(rows[0] as Record<string, unknown>) : null;
}

/**
 * PENDING → PAID 전환. `where status = 'PENDING'` 조건이 있는 단일 UPDATE라
 * Postgres 행 잠금 안에서 원자적으로 처리된다 — 동시에 두 번 호출돼도(새로고침
 * 중복, confirm 재시도 등) 한쪽만 실제로 상태를 바꾸고, 나머지는 0 rows를
 * 받는다. 호출부는 0 rows(=null)를 받으면 이미 PAID인지 다시 조회해서
 * 판단한다(같은 결제를 두 번 승인 처리하지 않기 위함).
 */
export async function markOrderPaid(orderId: string, paymentKey: string): Promise<OrderRow | null> {
  const sql = getSql();
  const rows = await sql`
    update orders
    set status = 'PAID', payment_key = ${paymentKey}, paid_at = now(), updated_at = now()
    where order_id = ${orderId} and status = 'PENDING'
    returning id, report_id, order_id, amount, status, order_name, payment_key, paid_at
  `;
  return rows.length > 0 ? mapRow(rows[0] as Record<string, unknown>) : null;
}

/** 결제 실패/취소 시 PENDING → FAILED|CANCELLED. 이미 PENDING이 아니면(예:
 * 드물게도 이미 PAID로 바뀐 뒤 실패 콜백이 늦게 도착한 경우) 손대지 않는다. */
export async function markOrderTerminal(
  orderId: string,
  status: "FAILED" | "CANCELLED"
): Promise<void> {
  const sql = getSql();
  await sql`
    update orders
    set status = ${status}, updated_at = now()
    where order_id = ${orderId} and status = 'PENDING'
  `;
}
