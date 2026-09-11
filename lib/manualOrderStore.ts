import { randomUUID } from "crypto";
import { getSql } from "./db";
import { IntakeFormData } from "./sajuEngine";
import { FULL_REPORT_ORDER_NAME } from "./orderStore";

/**
 * 당근/인스타 등 Toss를 거치지 않는 "수동 결제 완료" 주문 전용 저장 계층
 * (2026-09, 승인된 작업 — 관리자 수동 주문 자동화 1차: 서버측 데이터 계층).
 *
 * 이 파일은 기존 Toss 전용 lib/orderStore.ts(createOrGetPendingOrder/
 * markOrderPaid 등)를 단 한 줄도 import해서 재사용하지 않는다 — Toss
 * 결제 흐름과 완전히 분리된 새 모듈이다(지시 원칙: "억지로 재사용 금지").
 * 재사용하는 건 orderStore.ts가 이미 export해둔 상수 하나(주문명 문자열)뿐이다.
 *
 * 재사용한 기존 자산:
 *  - IntakeFormData 타입(sajuEngine.ts) — createReport(reportStore.ts)와
 *    동일한 입력 타입을 그대로 쓴다(새 타입 만들지 않음).
 *  - FULL_REPORT_ORDER_NAME(orderStore.ts) — 같은 상품이므로 주문명 문자열을
 *    새로 짓지 않고 그대로 재사용.
 *  - order_id 생성 방식(randomUUID()) — orderStore.ts의 createOrGetPendingOrder가
 *    쓰는 것과 동일한 방식(Toss orderId 규칙과도 호환)을 그대로 따른다.
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
 * 롤백 로직을 짤 필요 없음). report_id/order_id는 DB의 gen_random_uuid()
 * 기본값에 의존하지 않고 이 함수가 미리 randomUUID()로 만들어 세 INSERT
 * 전부에 동일한 값을 명시적으로 넘긴다 — transaction() 배치 안에서는 한
 * 쿼리의 RETURNING 값을 다음 쿼리에 실시간으로 넘길 수 없기 때문
 * (배치 전체가 실행 전에 한 번에 구성됨)이라, 미리 값을 만들어 세 곳에
 * 동일하게 꽂는 방식을 택했다 — reports.id 컬럼은 DEFAULT가 있을 뿐 값을
 * 명시적으로 넣는 것도 정상 동작(제약 위반 아님).
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
}

export interface CreateManualPaidOrderResult {
  reportId: string;
  orderId: string;
  deliveryId: string;
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

/**
 * 관리자 수동 주문(당근 등)을 reports/orders/report_deliveries 세 테이블에
 * 원자적으로 기록한다. 실패하면(검증 실패 포함) 예외를 그대로 던진다 —
 * 호출부가 실패를 숨기지 않고 그대로 받도록(요청된 동작) 이 함수 내부에서
 * try/catch로 에러를 삼키지 않는다.
 *
 * PDF 생성·이메일 발송은 이 함수의 책임이 아니다(이번 단계 범위 밖) —
 * report_deliveries는 "발송 대기(PENDING)" 상태로만 기록하고, 실제 발송
 * 로직은 이후 별도 단계에서 이 레코드를 읽어 처리한다.
 */
export async function createManualPaidOrder(
  input: CreateManualPaidOrderInput,
  sqlOverride?: SqlLike
): Promise<CreateManualPaidOrderResult> {
  assertValidChannel(input.channel);
  const email = assertValidEmail(input.email);
  assertValidAmount(input.amount);

  const reportId = randomUUID();
  const orderId = randomUUID();
  const sql = sqlOverride ?? getSql();
  const { intake } = input;

  const results = await sql.transaction((tx) => [
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
        ${reportId}, ${orderId}, ${input.amount}, 'PAID', ${FULL_REPORT_ORDER_NAME}, ${input.channel}, now()
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

  const deliveryRows = results[2] as unknown as Array<{ id: string }>;
  const deliveryId = deliveryRows?.[0]?.id;
  if (!deliveryId) {
    // transaction()이 예외 없이 끝났는데 id를 못 받는 경우는 이론상
    // 발생하면 안 되지만(트랜잭션 성공 = 세 INSERT 전부 성공), 방어적으로
    // 명확한 에러를 던진다 — 조용히 undefined를 반환하지 않는다.
    throw new Error("[createManualPaidOrder] report_deliveries insert 결과에서 id를 받지 못했습니다.");
  }

  return { reportId, orderId, deliveryId };
}
