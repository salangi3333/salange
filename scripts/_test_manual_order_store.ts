// [자동 회귀 테스트, 2026-09-10 최초 작성 / 2026-09-11 hard idempotency 추가]
// 이 프로젝트에는 별도 test DB가 없고(로컬 .env.local의 DATABASE_URL이
// production과 동일한 DB를 가리킴을 직전 조사에서 확인함), jest/vitest 등
// 테스트 프레임워크도 설치돼 있지 않다(이번 단계에서 새 패키지 설치 금지
// 지시에 따라 새로 깔지 않았다). 그래서:
//   1) 이 프로젝트가 세션 내내 써온 기존 관례(scripts/_*.ts, 평문 assert +
//      exit code)를 그대로 따르고,
//   2) createManualPaidOrder에 두 번째 인자(sqlOverride)로 fake sql을
//      주입해, 실제 Postgres에 단 한 줄도 쓰지 않고 트랜잭션 구성 로직만
//      검증한다.
// → production DB에 어떤 INSERT도 실행하지 않는다.
//
// [2026-09-11 추가] fake sql을 상태를 가진(stateful) 인메모리 가짜 DB로
// 확장했다 — orders.order_id를 key로 하는 Map 하나로 reports/orders/
// report_deliveries "세 테이블"을 흉내낸다. 같은 order_id로 두 번째
// transaction()이 시도되면 실제 @neondatabase/serverless가 던지는 것과
// 동일한 클래스(NeonDbError, code=23505, constraint=orders_order_id_key —
// node_modules/@neondatabase/serverless/index.d.ts:795 확인)를 던지도록
// 만들어, "단순 순차 mock 두 번 호출"이 아니라 실제 UNIQUE 충돌 처리
// 코드 경로(lib/manualOrderStore.ts의 catch (e) { if (isOrderIdUniqueViolation(e)) ... })가
// 정말로 타는지 검증한다.
import assert from "node:assert/strict";
import { NeonDbError } from "@neondatabase/serverless";
import {
  createManualPaidOrder,
  CreateManualPaidOrderInput,
  IdempotencyKeyConflictError,
} from "../lib/manualOrderStore";
import { FULL_REPORT_ORDER_NAME } from "../lib/orderStore";
import { IntakeFormData } from "../lib/sajuEngine";

type CapturedQuery = { text: string; values: unknown[] };

type FakeRow = {
  reportId: string;
  orderId: string;
  deliveryId: string;
  name: string;
  gender: string;
  calendarType: string;
  isLeapMonth: boolean;
  year: number;
  month: number;
  day: number;
  hour: number | null;
  minute: number;
  timeUnknown: boolean;
  email: string;
  amount: number;
  channel: string;
};

/** 실제 getSql()과 같은 모양(태그드 템플릿 직접 호출 + .transaction)의
 * fake. 진짜 Postgres에 전혀 연결하지 않는다 — orders.order_id를 key로 하는
 * Map 하나로 reports/orders/report_deliveries 세 테이블을 흉내낸다. 같은
 * 인스턴스를 여러 createManualPaidOrder 호출에 재사용하면(순차 재시도,
 * 동시 요청, 서로 다른 key 등) 실제 DB 상태 변화를 그대로 시뮬레이션한다. */
function makeFakeDb(opts: { throwGenericInsideTransaction?: boolean } = {}) {
  const store = new Map<string, FakeRow>(); // key: order_id
  const captured: CapturedQuery[] = [];
  let transactionCallCount = 0;
  let deliveryCounter = 0;

  const fakeTx = (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values });

  // findExistingManualPaidOrder가 실행하는 단일 SELECT(태그드 템플릿 직접
  // 호출)만 흉내내면 된다 — manualOrderStore.ts는 2분 중복체크(handler.ts
  // 전용)를 전혀 실행하지 않는다.
  const fakeSql: any = (strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.join("?");
    if (!/from orders o/.test(text) || !/join report_deliveries d/.test(text)) {
      throw new Error("makeFakeDb: 예상치 못한 SELECT 쿼리 — " + text);
    }
    const orderId = values[0] as string;
    const row = store.get(orderId);
    if (!row) return Promise.resolve([]);
    return Promise.resolve([
      {
        report_id: row.reportId,
        name: row.name,
        gender: row.gender,
        calendar_type: row.calendarType,
        is_leap_month: row.isLeapMonth,
        birth_year: row.year,
        birth_month: row.month,
        birth_day: row.day,
        birth_hour: row.hour,
        birth_minute: row.minute,
        time_unknown: row.timeUnknown,
        order_id: row.orderId,
        amount: row.amount,
        channel: row.channel,
        delivery_id: row.deliveryId,
        email: row.email,
      },
    ]);
  };

  fakeSql.transaction = async (
    fn: (tx: typeof fakeTx) => { strings: TemplateStringsArray; values: unknown[] }[]
  ) => {
    transactionCallCount++;
    const queries = fn(fakeTx);
    for (const q of queries) captured.push({ text: q.strings.join("?"), values: q.values });

    if (opts.throwGenericInsideTransaction) {
      // 실제 DB 장애 등 UNIQUE 위반과 무관한 실패 — store에 아무것도 남기지
      // 않고(=고아 레코드 없이) 그대로 던진다.
      throw new Error("SIMULATED_MID_TRANSACTION_FAILURE");
    }

    // queries[0]=reports insert, [1]=orders insert, [2]=report_deliveries insert
    // (lib/manualOrderStore.ts의 실제 컬럼 순서와 정확히 일치, 위치로 추출)
    const reportsVals = queries[0].values;
    const ordersVals = queries[1].values;
    const deliveryVals = queries[2].values;
    const reportId = reportsVals[0] as string;
    const orderId = ordersVals[1] as string; // idempotencyKey

    if (store.has(orderId)) {
      // 실제 orders_order_id_key UNIQUE 위반 시 @neondatabase/serverless가
      // 던지는 것과 동일한 클래스/필드로 재현한다.
      const err = new NeonDbError('duplicate key value violates unique constraint "orders_order_id_key"');
      err.code = "23505";
      err.constraint = "orders_order_id_key";
      throw err;
    }

    deliveryCounter++;
    const deliveryId = `fake-delivery-id-${String(deliveryCounter).padStart(4, "0")}`;
    store.set(orderId, {
      reportId,
      orderId,
      deliveryId,
      name: reportsVals[1] as string,
      gender: reportsVals[2] as string,
      calendarType: reportsVals[3] as string,
      isLeapMonth: reportsVals[4] as boolean,
      year: reportsVals[5] as number,
      month: reportsVals[6] as number,
      day: reportsVals[7] as number,
      hour: reportsVals[8] as number | null,
      minute: reportsVals[9] as number,
      timeUnknown: reportsVals[10] as boolean,
      email: deliveryVals[1] as string,
      amount: ordersVals[2] as number,
      channel: ordersVals[4] as string,
    });

    return [[], [], [{ id: deliveryId }]];
  };

  return {
    fakeSql: fakeSql as any,
    captured,
    store,
    getTransactionCallCount: () => transactionCallCount,
  };
}

function makeIntake(overrides: Partial<IntakeFormData> = {}): IntakeFormData {
  return {
    name: "당근고객",
    gender: "female",
    calendarType: "solar",
    isLeapMonth: false,
    year: 1990,
    month: 5,
    day: 15,
    hour: 14,
    minute: 0,
    timeUnknown: false,
    ...overrides,
  };
}

function makeInput(overrides: Partial<CreateManualPaidOrderInput> = {}): CreateManualPaidOrderInput {
  return {
    intake: makeIntake(),
    email: "customer@example.com",
    amount: 29800,
    channel: "karrot",
    idempotencyKey: "idem-key-aaaa1111",
    ...overrides,
  };
}

const VALID_INPUT = makeInput();

let passCount = 0;
let failCount = 0;
function check(label: string, fn: () => void | Promise<void>) {
  return (async () => {
    try {
      await fn();
      console.log(`✅ PASS - ${label}`);
      passCount++;
    } catch (e) {
      console.log(`❌ FAIL - ${label}`);
      console.log("   ", e instanceof Error ? e.message : e);
      failCount++;
    }
  })();
}

async function main() {
  // ── A. 정상 karrot 수동 주문 — fake sql로 트랜잭션 구성만 검증 ──
  await check("A-1. 정상 입력이면 예외 없이 결과를 반환한다", async () => {
    const { fakeSql } = makeFakeDb();
    const result = await createManualPaidOrder(VALID_INPUT, fakeSql);
    assert.ok(result.reportId, "reportId 있어야 함");
    assert.equal(result.orderId, "idem-key-aaaa1111", "orderId는 idempotencyKey 그대로여야 함");
    assert.equal(result.deliveryId, "fake-delivery-id-0001");
    assert.equal(result.alreadyExisted, false);
  });

  await check("A-2. transaction()이 정확히 1번 호출되고 쿼리 3개가 구성된다", async () => {
    const { fakeSql, captured, getTransactionCallCount } = makeFakeDb();
    await createManualPaidOrder(VALID_INPUT, fakeSql);
    assert.equal(getTransactionCallCount(), 1);
    assert.equal(captured.length, 3);
  });

  await check("A-3. reports/orders/report_deliveries 세 INSERT의 report_id가 전부 동일하다", async () => {
    const { fakeSql, captured } = makeFakeDb();
    await createManualPaidOrder(VALID_INPUT, fakeSql);
    const reportIdInReports = captured[0].values[0];
    const reportIdInOrders = captured[1].values[0];
    const reportIdInDeliveries = captured[2].values[0];
    assert.equal(reportIdInReports, reportIdInOrders);
    assert.equal(reportIdInReports, reportIdInDeliveries);
  });

  await check("A-4. orders INSERT: status='PAID' 리터럴, channel='karrot', order_id=idempotencyKey, payment_key 컬럼 자체가 없다(=NULL)", async () => {
    const { fakeSql, captured } = makeFakeDb();
    await createManualPaidOrder(VALID_INPUT, fakeSql);
    const ordersQuery = captured[1];
    assert.match(ordersQuery.text, /insert into orders/);
    assert.match(ordersQuery.text, /'PAID'/);
    assert.ok(ordersQuery.values.includes("karrot"), "channel=karrot 값이 파라미터에 있어야 함");
    assert.ok(ordersQuery.values.includes("idem-key-aaaa1111"), "order_id에 idempotencyKey가 그대로 들어가야 함");
    assert.ok(!/payment_key/.test(ordersQuery.text), "payment_key 컬럼을 명시하지 않아야 NULL로 남는다");
    assert.ok(ordersQuery.values.includes(FULL_REPORT_ORDER_NAME), "order_name은 기존 상수를 재사용해야 함");
    assert.ok(ordersQuery.values.includes(29800), "amount가 그대로 전달돼야 함");
  });

  await check("A-5. orders INSERT: paid_at은 now()로 즉시 기록된다(리터럴)", async () => {
    const { fakeSql, captured } = makeFakeDb();
    await createManualPaidOrder(VALID_INPUT, fakeSql);
    assert.match(captured[1].text, /paid_at/);
    assert.match(captured[1].text, /now\(\)/);
  });

  await check("A-6. report_deliveries INSERT: status='PENDING' 리터럴, channel='karrot', email 정상 연결, sent_at 컬럼 없음(=NULL)", async () => {
    const { fakeSql, captured } = makeFakeDb();
    await createManualPaidOrder(VALID_INPUT, fakeSql);
    const delivQuery = captured[2];
    assert.match(delivQuery.text, /insert into report_deliveries/);
    assert.match(delivQuery.text, /'PENDING'/);
    assert.ok(delivQuery.values.includes("karrot"));
    assert.ok(delivQuery.values.includes("customer@example.com"));
    assert.ok(!/sent_at/.test(delivQuery.text), "sent_at 컬럼을 명시하지 않아야 NULL로 남는다");
  });

  // ── B. 기존 Toss 흐름 정적 보호 확인 ──
  await check("B-1. 새 파일이 Toss 전용 함수(createOrGetPendingOrder/markOrderPaid)를 import/호출하지 않는다", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync(new URL("../lib/manualOrderStore.ts", import.meta.url), "utf-8");
    // 주석에서 "이걸 안 쓴다"고 설명하며 이름을 언급하는 것 자체는 허용 —
    // 실제 import 구문/함수 호출(괄호 동반) 패턴만 금지 대상으로 정밀하게 검사.
    const importLines = src.split("\n").filter((l) => l.trim().startsWith("import"));
    for (const line of importLines) {
      assert.ok(!line.includes("createOrGetPendingOrder"), `import 구문에 createOrGetPendingOrder 포함됨: ${line}`);
      assert.ok(!line.includes("markOrderPaid"), `import 구문에 markOrderPaid 포함됨: ${line}`);
    }
    assert.ok(!/createOrGetPendingOrder\(/.test(src), "createOrGetPendingOrder(...) 호출 흔적이 있으면 안 됨");
    assert.ok(!/markOrderPaid\(/.test(src), "markOrderPaid(...) 호출 흔적이 있으면 안 됨");
  });

  // ── C. 잘못된 channel/입력값 방어 — DB(transaction)에 절대 안 닿아야 함 ──
  await check("C-1. channel='instagram'이면 DB 호출 전에 즉시 예외를 던진다", async () => {
    const { fakeSql, getTransactionCallCount } = makeFakeDb();
    await assert.rejects(
      () => createManualPaidOrder({ ...VALID_INPUT, channel: "instagram" as any }, fakeSql),
      /지원하지 않는 channel/
    );
    assert.equal(getTransactionCallCount(), 0, "검증 실패 시 transaction()이 호출되면 안 됨");
  });

  await check("C-2. 이메일이 비정상이면 DB 호출 전에 즉시 예외를 던진다", async () => {
    const { fakeSql, getTransactionCallCount } = makeFakeDb();
    await assert.rejects(() => createManualPaidOrder({ ...VALID_INPUT, email: "not-an-email" }, fakeSql));
    assert.equal(getTransactionCallCount(), 0);
  });

  await check("C-3. amount가 0 이하이면 DB 호출 전에 즉시 예외를 던진다", async () => {
    const { fakeSql, getTransactionCallCount } = makeFakeDb();
    await assert.rejects(() => createManualPaidOrder({ ...VALID_INPUT, amount: 0 }, fakeSql));
    assert.equal(getTransactionCallCount(), 0);
  });

  await check("C-4. idempotencyKey 형식이 잘못되면 DB 호출 전에 즉시 예외를 던진다", async () => {
    const { fakeSql, getTransactionCallCount } = makeFakeDb();
    await assert.rejects(
      () => createManualPaidOrder({ ...VALID_INPUT, idempotencyKey: "짧음" }, fakeSql),
      /idempotencyKey 형식/
    );
    assert.equal(getTransactionCallCount(), 0);
  });

  // ── D. 트랜잭션 중간 실패 시 예외가 그대로 호출자에게 전달되고, 고아 레코드가 남지 않는지 ──
  await check(
    "D-1. transaction() 도중(UNIQUE 위반과 무관한) 실패하면 예외를 삼키지 않고 그대로 던지며, 고아 레코드가 남지 않는다",
    async () => {
      const { fakeSql, store } = makeFakeDb({ throwGenericInsideTransaction: true });
      await assert.rejects(() => createManualPaidOrder(VALID_INPUT, fakeSql), /SIMULATED_MID_TRANSACTION_FAILURE/);
      assert.equal(store.size, 0, "실패한 트랜잭션은 reports/orders/report_deliveries 중 아무것도 남기면 안 됨");
    }
  );

  // ── E. hard idempotency(요청하신 7개 검증 케이스, 전부 실제 createManualPaidOrder + 실제 UNIQUE 충돌 처리 경로로 검증) ──

  await check("E-1(케이스1). 정상 신규 주문 → 1건 생성", async () => {
    const { fakeSql, store, getTransactionCallCount } = makeFakeDb();
    const result = await createManualPaidOrder(makeInput({ idempotencyKey: "idem-case1-0001" }), fakeSql);
    assert.equal(result.alreadyExisted, false);
    assert.equal(getTransactionCallCount(), 1);
    assert.equal(store.size, 1);
  });

  await check("E-2(케이스2/3/5 대표). 동일 key 순차 재시도(=응답유실 후 재시도와 서버 입장에서 동일) → 기존 주문 반환, 추가 생성 0", async () => {
    const { fakeSql, store, getTransactionCallCount } = makeFakeDb();
    const input = makeInput({ idempotencyKey: "idem-case2-0001" });
    const first = await createManualPaidOrder(input, fakeSql);
    const second = await createManualPaidOrder(input, fakeSql); // 순차 재시도(응답유실 재시도와 서버에서 구분 불가)
    assert.equal(first.alreadyExisted, false);
    assert.equal(second.alreadyExisted, true, "재시도는 기존 주문을 반환해야 함");
    assert.equal(second.reportId, first.reportId);
    assert.equal(second.orderId, first.orderId);
    assert.equal(second.deliveryId, first.deliveryId);
    assert.equal(getTransactionCallCount(), 1, "재시도는 transaction()을 다시 시도하면 안 됨(사전 조회에서 끝나야 함)");
    assert.equal(store.size, 1, "주문이 추가로 생성되면 안 됨");
  });

  await check(
    "E-3(케이스3/4 핵심). 동일 key 동시 요청 → 진짜 UNIQUE 충돌(23505/orders_order_id_key) 경로를 통해 최종 주문 1건",
    async () => {
      const { fakeSql, store, getTransactionCallCount } = makeFakeDb();
      const input = makeInput({ idempotencyKey: "idem-case3-0001" });
      // Promise.all로 두 요청을 동시에 발사 — 둘 다 사전 조회(findExistingManualPaidOrder)에서
      // "없음"을 본 뒤 둘 다 transaction()을 시도해야, 실제 구현의 catch(23505) 경로가 타게 된다.
      const [a, b] = await Promise.all([
        createManualPaidOrder(input, fakeSql),
        createManualPaidOrder(input, fakeSql),
      ]);
      assert.equal(getTransactionCallCount(), 2, "두 요청 모두 transaction()을 시도했어야 함(진짜 경쟁 상태 재현)");
      assert.equal(store.size, 1, "실제로 저장된 주문은 1건이어야 함");
      // 둘 다 같은 최종 주문 정보를 반환해야 함(하나는 새로 만들고, 하나는 23505를 잡아 재조회)
      assert.equal(a.reportId, b.reportId);
      assert.equal(a.orderId, b.orderId);
      assert.equal(a.deliveryId, b.deliveryId);
      assert.equal(a.orderId, "idem-case3-0001");
      // 정확히 하나는 alreadyExisted=false(먼저 커밋), 하나는 true(23505를 잡고 재조회)여야 함
      const flags = [a.alreadyExisted, b.alreadyExisted].sort();
      assert.deepEqual(flags, [false, true]);
    }
  );

  await check("E-4(케이스4). 동일 key + 다른 고객/주문 데이터 → IdempotencyKeyConflictError(핸들러에서 409로 매핑)", async () => {
    const { fakeSql, store } = makeFakeDb();
    const key = "idem-case4-0001";
    await createManualPaidOrder(makeInput({ idempotencyKey: key, intake: makeIntake({ name: "고객A" }) }), fakeSql);
    await assert.rejects(
      () =>
        createManualPaidOrder(
          makeInput({ idempotencyKey: key, intake: makeIntake({ name: "고객B(다른 사람)" }) }),
          fakeSql
        ),
      IdempotencyKeyConflictError
    );
    assert.equal(store.size, 1, "충돌한 두 번째 요청 때문에 잘못된 데이터가 저장되면 안 됨");
  });

  await check("E-5(케이스6). 서로 다른 고객 + 서로 다른 key → 각각 정상 생성, 서로 간섭 없음", async () => {
    const { fakeSql, store, getTransactionCallCount } = makeFakeDb();
    const r1 = await createManualPaidOrder(
      makeInput({ idempotencyKey: "idem-case6-a", intake: makeIntake({ name: "고객A" }) }),
      fakeSql
    );
    const r2 = await createManualPaidOrder(
      makeInput({ idempotencyKey: "idem-case6-b", intake: makeIntake({ name: "고객B" }) }),
      fakeSql
    );
    assert.equal(getTransactionCallCount(), 2);
    assert.equal(store.size, 2);
    assert.notEqual(r1.reportId, r2.reportId);
    assert.notEqual(r1.orderId, r2.orderId);
  });

  await check(
    "E-6(케이스7). 같은 고객의 정상 재구매(새 key) → store 레벨에서는 고객정보만으로 영구 차단하지 않고 정상 신규 생성(2분 창구 소프트체크는 handler.ts 레벨 — 아래 route 테스트에서 별도 검증)",
    async () => {
      const { fakeSql, store, getTransactionCallCount } = makeFakeDb();
      const sameCustomer = makeIntake({ name: "재구매고객" });
      const first = await createManualPaidOrder(makeInput({ idempotencyKey: "idem-case7-first", intake: sameCustomer }), fakeSql);
      const second = await createManualPaidOrder(makeInput({ idempotencyKey: "idem-case7-second", intake: sameCustomer }), fakeSql);
      assert.equal(getTransactionCallCount(), 2);
      assert.equal(store.size, 2);
      assert.notEqual(first.reportId, second.reportId, "서로 다른 key면 서로 다른 새 주문이어야 함(영구 차단 없음)");
    }
  );

  await check("E-7(보너스, 정밀도 확인). 23505이지만 다른 제약(orders_order_id_key가 아님)이면 idempotency 경로를 타지 않고 그대로 던진다", async () => {
    const { fakeSql } = makeFakeDb();
    const originalTransaction = fakeSql.transaction;
    fakeSql.transaction = async () => {
      const err = new NeonDbError('duplicate key value violates unique constraint "orders_payment_key_key"');
      err.code = "23505";
      err.constraint = "orders_payment_key_key"; // 다른 제약
      throw err;
    };
    await assert.rejects(
      () => createManualPaidOrder(makeInput({ idempotencyKey: "idem-case-other-constraint" }), fakeSql),
      (e: unknown) => e instanceof NeonDbError && (e as any).constraint === "orders_payment_key_key"
    );
    fakeSql.transaction = originalTransaction;
  });

  console.log(`\n총 ${passCount + failCount}건 중 PASS ${passCount} / FAIL ${failCount}`);
  if (failCount > 0) process.exit(1);
}

main();
