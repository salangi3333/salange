import { randomUUID } from "crypto";
import { NeonDbError } from "@neondatabase/serverless";
import { getSql } from "./db";
import { IntakeFormData } from "./sajuEngine";
import { FULL_REPORT_ORDER_NAME, isValidOrderId } from "./orderStore";

/**
 * 당근/인스타 등 Toss를 거치지 않는 "수동 결제 완료" 주문 전용 저장 계층
 * (2026-09, 승인된 작업 — 관리자 수동 주문 자동화 1차: 서버측 데이터 계층).
 *
 * 이 파일은 기존 Toss 전용 lib/orderStore.ts(createOrGetPendingOrder/
 * markOrderPaid 등)를 단 한 줄도 import해서 재사용하지 않는다 — Toss
 * 결제 흐름과 완전히 분리된 새 모듈이다(지시 원칙: "억지로 재사용 금지").
 * 재사용하는 건 orderStore.ts가 이미 export해둔 상수/함수 두 개(주문명
 * 문자열, orderId 형식 검증)뿐이다.
 *
 * 재사용한 기존 자산:
 *  - IntakeFormData 타입(sajuEngine.ts) — createReport(reportStore.ts)와
 *    동일한 입력 타입을 그대로 쓴다(새 타입 만들지 않음).
 *  - FULL_REPORT_ORDER_NAME(orderStore.ts) — 같은 상품이므로 주문명 문자열을
 *    새로 짓지 않고 그대로 재사용.
 *  - isValidOrderId(orderStore.ts) — idempotencyKey 형식 검증에 그대로
 *    재사용(Toss orderId와 같은 규칙: 영문/숫자/-/_ 6~64자). 검증 로직을
 *    복제하지 않는다.
 *
 * lib/reportStore.ts의 createReport()는 의도적으로 호출하지 않는다 — 그 함수는
 * 자체적으로 단일 INSERT를 실행해 reports 하나만 만들고 끝나기 때문에, 이걸
 * 그대로 불러 쓰면 report_id를 다시 조회해 orders/report_deliveries INSERT와
 * "하나의 원자적 트랜잭션"으로 묶을 방법이 없다(레포트 생성과 주문 생성 사이에
 * 실패하면 report만 남는 반쪽 데이터가 생김 — 지시된 원자성 요구와 정면 충돌).
 * 그래서 이 함수는 reports INSERT를 자체적으로(같은 컬럼 목록으로) 다시
 * 작성했다 — reportStore.ts 파일 자체는 한 글자도 건드리지 않았다.
 *
 * 트랜잭션: @neondatabase/serverless(neon() HTTP 드라이버, 이미 이 프로젝트가
 * 쓰고 있는 의존성, package.json 변경 없음)가 공식 지원하는
 * `sql.transaction(txn => [...])`를 쓴다 — 세 INSERT가 하나의 non-interactive
 * Postgres 트랜잭션으로 묶여 HTTP 한 번에 전송되고, 하나라도 실패하면 전부
 * 롤백된다(Postgres 트랜잭션 자체의 원자성 보장, 애플리케이션 레벨에서 별도
 * 롤백 로직을 짤 필요 없음). report_id는 DB의 gen_random_uuid() 기본값에
 * 의존하지 않고 이 함수가 미리 randomUUID()로 만들어 세 INSERT 전부에 동일한
 * 값을 명시적으로 넘긴다 — transaction() 배치 안에서는 한 쿼리의 RETURNING
 * 값을 다음 쿼리에 실시간으로 넘길 수 없기 때문(배치 전체가 실행 전에 한
 * 번에 구성됨)이라, 미리 값을 만들어 세 곳에 동일하게 꽂는 방식을 택했다 —
 * reports.id 컬럼은 DEFAULT가 있을 뿐 값을 명시적으로 넣는 것도 정상
 * 동작(제약 위반 아님).
 *
 * [2026-09-11 추가 — hard idempotency] order_id는 더 이상 randomUUID()로
 * 서버가 임의로 만들지 않는다. 관리자 UI가 제출 1회당 고정 idempotencyKey를
 * 만들어 보내고(더블클릭/네트워크 재시도/응답유실 후 재시도에도 같은 값을
 * 재사용), 이 함수는 그 값을 그대로 orders.order_id로 저장한다. 이미 있는
 * `orders_order_id_key` UNIQUE 제약이 DB 엔진 레벨에서 "같은 key로 두 개의
 * 주문이 동시에 존재하는 것"을 물리적으로 막아준다 — 애플리케이션 코드의
 * 타이밍(SELECT 후 INSERT 사이의 race)에 의존하지 않는 하드 개런티. 다만
 * "같은 key인데 실제로는 다른 주문 데이터"인 경우(버그로 key가 잘못
 * 재사용된 경우)까지 조용히 기존 주문을 돌려주면 안 되므로, 항상 기존
 * 주문의 핵심 필드와 현재 요청을 대조한 뒤에만 안전하게 재사용한다(불일치
 * 시 IdempotencyKeyConflictError). 새 테이블/컬럼/migration은 전혀
 * 추가하지 않았다 — 기존 orders.order_id 컬럼과 그 UNIQUE 인덱스만
 * 재사용한다.
 */

/** 이번 1차 구현은 당근만 허용한다 — 인스타 등 다른 채널은 DB의
 * orders_channel_check/report_deliveries_channel_check CHECK 제약이
 * 애초에 'site'|'karrot'만 허용해 인스타를 넣으면 DB가 거부한다(2026-09-10
 * 읽기전용 조사에서 확인). 여기 타입 레벨에서도 한 번 더 좁혀서, DB가
 * 거부하기 전에 애플리케이션 레벨에서 먼저 막는다(이중 방어). */
export type ManualOrderChannel = "karrot";
const ALLOWED_MANUAL_CHANNELS: readonly ManualOrderChannel[] = ["karrot"];

export interface CreateManualPaidOrderInput {
  intake: IntakeFormData;
  email: string;
  amount: number;
  channel: ManualOrderChannel;
  /** 관리자 UI가 제출 1회당 만들어 재시도에도 재사용하는 고유값 — 그대로
   * orders.order_id로 저장된다(isValidOrderId와 동일 형식: 영문/숫자/-/_
   * 6~64자). */
  idempotencyKey: string;
}

export interface CreateManualPaidOrderResult {
  reportId: string;
  orderId: string;
  deliveryId: string;
  /** true면 새로 만들지 않고 이미 존재하던(같은 idempotencyKey의) 주문을
   * 그대로 반환한 것 — 호출부(handler.ts)가 200/201 응답을 구분하는 데 쓴다. */
  alreadyExisted: boolean;
}

/** 같은 idempotencyKey로 이미 처리된 주문이 있다고 판단할 때 대조하는
 * "주문 정체성" — 이름 하나만 비교하지 않는다. intake 전체(이름/성별/
 * 양음력/윤달/생년월일시/분/시간모름여부) + email + amount + channel까지
 * 전부 일치해야 "같은 요청의 재시도"로 인정한다. */
export interface ManualOrderIdentity {
  intake: IntakeFormData;
  email: string;
  amount: number;
  channel: ManualOrderChannel;
}

function isSameOrderIdentity(a: ManualOrderIdentity, b: ManualOrderIdentity): boolean {
  return (
    a.intake.name === b.intake.name &&
    a.intake.gender === b.intake.gender &&
    a.intake.calendarType === b.intake.calendarType &&
    a.intake.isLeapMonth === b.intake.isLeapMonth &&
    a.intake.year === b.intake.year &&
    a.intake.month === b.intake.month &&
    a.intake.day === b.intake.day &&
    a.intake.hour === b.intake.hour &&
    a.intake.minute === b.intake.minute &&
    a.intake.timeUnknown === b.intake.timeUnknown &&
    a.email === b.email &&
    a.amount === b.amount &&
    a.channel === b.channel
  );
}

/** 같은 idempotencyKey가 "정상 재시도"가 아니라 다른 주문 데이터에 잘못
 * 재사용된 경우(클라이언트 버그 등) — 조용히 엉뚱한 기존 주문을 돌려주지
 * 않고 명확히 구분되는 에러를 던진다. handler.ts는 이걸 409로 응답한다. */
export class IdempotencyKeyConflictError extends Error {
  constructor(idempotencyKey: string) {
    super(
      `[createManualPaidOrder] idempotencyKey(${idempotencyKey})가 이미 다른 주문 데이터에 사용되었습니다.`
    );
    this.name = "IdempotencyKeyConflictError";
  }
}

/** getSql()이 반환하는 값과 같은 모양(.transaction을 가진 함수)이면 되므로,
 * 실제 타입을 그대로 재사용한다 — 테스트에서 실제 DB 연결 없이 이 자리에
 * mock을 주입할 수 있도록 두 번째 인자로 뺐다(운영 코드 경로는 항상
 * getSql()을 그대로 쓰고, 이 매개변수를 생략한다 — 동작 변화 없음). */
type SqlLike = ReturnType<typeof getSql>;

function assertValidChannel(channel: ManualOrderChannel): void {
  if (!ALLOWED_MANUAL_CHANNELS.includes(channel)) {
    throw new Error(
      `[createManualPaidOrder] 지원하지 않는 channel입니다: "${channel}". 이번 버전은 'karrot'만 허용합니다.`
    );
  }
}

function assertValidEmail(email: string): string {
  const trimmed = email.trim();
  if (!trimmed || !trimmed.includes("@") || trimmed.length > 200) {
    throw new Error("[createManualPaidOrder] 유효한 이메일이 아닙니다.");
  }
  return trimmed;
}

function assertValidAmount(amount: number): void {
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) {
    throw new Error("[createManualPaidOrder] amount는 0보다 큰 정수여야 합니다.");
  }
}

function assertValidIdempotencyKey(key: string): void {
  if (!isValidOrderId(key)) {
    throw new Error("[createManualPaidOrder] idempotencyKey 형식이 올바르지 않습니다.");
  }
}

/**
 * orders.order_id = idempotencyKey로 이미 처리된 주문이 있는지 조회하고,
 * 있으면 현재 요청과 "주문 정체성"(위 ManualOrderIdentity)을 대조한다.
 * handler.ts의 사전 확인(2분 중복체크보다 먼저 실행해 정상 재시도를 오탐
 * 409로 막지 않기 위함)과, createManualPaidOrder 내부의 UNIQUE 충돌 처리
 * 양쪽에서 재사용한다(같은 비교 로직을 두 곳에 복제하지 않기 위해 export).
 *
 * 반환:
 *  - null: 이 idempotencyKey로 처리된 주문이 아직 없음(새 주문으로 진행).
 *  - alreadyExisted:true인 결과: 같은 요청의 정상 재시도 — 새로 만들지
 *    않고 기존 주문 그대로 반환.
 * 예외:
 *  - IdempotencyKeyConflictError: 같은 key인데 주문 데이터가 다름(재사용 오용).
 */
export async function findExistingManualPaidOrder(
  idempotencyKey: string,
  identity: ManualOrderIdentity,
  sql: SqlLike
): Promise<CreateManualPaidOrderResult | null> {
  const rows = await sql`
    select
      r.id as report_id, r.name, r.gender, r.calendar_type, r.is_leap_month,
      r.birth_year, r.birth_month, r.birth_day, r.birth_hour, r.birth_minute, r.time_unknown,
      o.order_id, o.amount, o.channel,
      d.id as delivery_id, d.email
    from orders o
    join reports r on r.id = o.report_id
    join report_deliveries d on d.report_id = r.id
    where o.order_id = ${idempotencyKey}
    limit 1
  `;
  if (rows.length === 0) return null;

  const row = rows[0] as Record<string, unknown>;
  const existingIdentity: ManualOrderIdentity = {
    intake: {
      name: row.name as string,
      gender: row.gender as IntakeFormData["gender"],
      calendarType: row.calendar_type as IntakeFormData["calendarType"],
      isLeapMonth: row.is_leap_month as boolean,
      year: row.birth_year as number,
      month: row.birth_month as number,
      day: row.birth_day as number,
      hour: (row.birth_hour as number | null) ?? null,
      minute: row.birth_minute as number,
      timeUnknown: row.time_unknown as boolean,
    },
    email: row.email as string,
    amount: row.amount as number,
    channel: row.channel as ManualOrderChannel,
  };

  if (!isSameOrderIdentity(existingIdentity, identity)) {
    throw new IdempotencyKeyConflictError(idempotencyKey);
  }

  return {
    reportId: row.report_id as string,
    orderId: row.order_id as string,
    deliveryId: row.delivery_id as string,
    alreadyExisted: true,
  };
}

/**
 * orders.order_id UNIQUE(제약명 orders_order_id_key) 위반(Postgres
 * SQLSTATE 23505)인지 정확히 판별한다 — @neondatabase/serverless가 실제로
 * 던지는 NeonDbError 클래스(패키지 타입정의
 * node_modules/@neondatabase/serverless/index.d.ts:795에서 code/constraint
 * 필드 보유 확인, .mjs 런타임에서도 실제 값으로 export됨을 확인)를 기준으로
 * 판별한다. 다른 종류의 DB 에러(다른 제약 위반, 연결 오류 등)는 여기서
 * true를 반환하지 않는다 — 호출부가 그대로 다시 던진다(기존 동작 유지,
 * 에러를 삼키지 않음).
 */
function isOrderIdUniqueViolation(e: unknown): boolean {
  return e instanceof NeonDbError && e.code === "23505" && e.constraint === "orders_order_id_key";
}

/**
 * 관리자 수동 주문(당근 등)을 reports/orders/report_deliveries 세 테이블에
 * 원자적으로 기록한다. 실패하면(검증 실패 포함) 예외를 그대로 던진다 —
 * 호출부가 실패를 숨기지 않고 그대로 받도록(요청된 동작) 이 함수 내부에서
 * try/catch로 에러를 삼키지 않는다(단, 아래 hard idempotency의 UNIQUE
 * 충돌 catch는 예외지만 이것도 "삼키는" 게 아니라 "같은 요청의 정상
 * 결과"로 판정된 경우에만 정상 반환하고, 그 외엔 그대로 다시 던진다).
 *
 * PDF 생성·이메일 발송은 이 함수의 책임이 아니다(이번 단계 범위 밖) —
 * report_deliveries는 "발송 대기(PENDING)" 상태로만 기록하고, 실제 발송
 * 로직은 이후 별도 단계에서 이 레코드를 읽어 처리한다.
 *
 * [2026-09-11 추가] hard idempotency 2단 방어:
 *   1) 트랜잭션 시도 전에 findExistingManualPaidOrder로 먼저 조회 —
 *      순차 재시도/응답유실 후 재시도는 INSERT 시도 없이 여기서 끝난다
 *      (저비용, 빠름).
 *   2) 그래도 두 요청이 정확히 동시에 여기를 통과하면(1단계에서 둘 다
 *      "없음"으로 봄), 3-INSERT 트랜잭션에서 orders_order_id_key UNIQUE가
 *      최종 방어선이 된다 — 진 쪽은 23505를 받고, 세 INSERT 전부 트랜잭션
 *      원자성에 의해 롤백된 뒤(고아 레코드 없음) 이긴 쪽의 결과를 재조회해
 *      그대로 반환한다.
 */
export async function createManualPaidOrder(
  input: CreateManualPaidOrderInput,
  sqlOverride?: SqlLike
): Promise<CreateManualPaidOrderResult> {
  assertValidChannel(input.channel);
  const email = assertValidEmail(input.email);
  assertValidAmount(input.amount);
  assertValidIdempotencyKey(input.idempotencyKey);

  const sql = sqlOverride ?? getSql();
  const { intake, idempotencyKey } = input;
  const identity: ManualOrderIdentity = {
    intake,
    email,
    amount: input.amount,
    channel: input.channel,
  };

  // 1단계: 이미 처리된 주문인지 먼저 조회(저비용, 트랜잭션 시도 안 함).
  const existing = await findExistingManualPaidOrder(idempotencyKey, identity, sql);
  if (existing) return existing;

  const reportId = randomUUID();

  let results;
  try {
    results = await sql.transaction((tx) => [
      tx`
        insert into reports (
          id, name, gender, calendar_type, is_leap_month,
          birth_year, birth_month, birth_day, birth_hour, birth_minute, time_unknown
        ) values (
          ${reportId}, ${intake.name}, ${intake.gender}, ${intake.calendarType}, ${intake.isLeapMonth},
          ${intake.year}, ${intake.month}, ${intake.day}, ${intake.hour}, ${intake.minute}, ${intake.timeUnknown}
        )
      `,
      tx`
        insert into orders (
          report_id, order_id, amount, status, order_name, channel, paid_at
        ) values (
          ${reportId}, ${idempotencyKey}, ${input.amount}, 'PAID', ${FULL_REPORT_ORDER_NAME}, ${input.channel}, now()
        )
      `,
      tx`
        insert into report_deliveries (
          report_id, email, channel, status
        ) values (
          ${reportId}, ${email}, ${input.channel}, 'PENDING'
        )
        returning id
      `,
    ]);
  } catch (e) {
    if (!isOrderIdUniqueViolation(e)) throw e; // 다른 종류의 DB 에러는 그대로 던짐(기존 동작 유지)

    // 2단계: 동시에 다른 요청이 먼저 커밋한 경우 — 방금 커밋된 결과를
    // 재조회해서 반환한다(이번 시도의 3-INSERT는 트랜잭션 원자성에 의해
    // 전부 롤백되어 고아 레코드가 남지 않는다).
    const winner = await findExistingManualPaidOrder(idempotencyKey, identity, sql);
    if (!winner) {
      // unique_violation이 났다면 winner가 반드시 존재해야 한다 — 방어적으로
      // 명확한 에러(조용히 넘어가지 않음).
      throw new Error(
        "[createManualPaidOrder] order_id 충돌이 감지됐지만 기존 주문을 찾지 못했습니다."
      );
    }
    return winner;
  }

  const deliveryRows = results[2] as unknown as Array<{ id: string }>;
  const deliveryId = deliveryRows?.[0]?.id;
  if (!deliveryId) {
    // transaction()이 예외 없이 끝났는데 id를 못 받는 경우는 이론상
    // 발생하면 안 되지만(트랜잭션 성공 = 세 INSERT 전부 성공), 방어적으로
    // 명확한 에러를 던진다 — 조용히 undefined를 반환하지 않는다.
    throw new Error("[createManualPaidOrder] report_deliveries insert 결과에서 id를 받지 못했습니다.");
  }

  return { reportId, orderId: idempotencyKey, deliveryId, alreadyExisted: false };
}
