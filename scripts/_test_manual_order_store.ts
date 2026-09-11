// [자동 회귀 테스트, 2026-09-10 — createManualPaidOrder 첫 번째 안전장치]
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
import assert from "node:assert/strict";
import { createManualPaidOrder, CreateManualPaidOrderInput } from "../lib/manualOrderStore";
import { FULL_REPORT_ORDER_NAME } from "../lib/orderStore";
import { IntakeFormData } from "../lib/sajuEngine";

type CapturedQuery = { text: string; values: unknown[] };

/** 실제 getSql()과 같은 모양(.transaction만 있으면 됨)의 fake. 진짜 Postgres에
 * 전혀 연결하지 않는다 — 콜백이 만든 쿼리들을 그대로 기록만 한다. */
function makeFakeSql(opts: { throwInsideTransaction?: boolean } = {}) {
  const captured: CapturedQuery[] = [];
  let transactionCallCount = 0;

  const fakeTx = (strings: TemplateStringsArray, ...values: unknown[]) => {
    return { strings, values };
  };

  const fakeSql = {
    transaction: async (fn: (tx: typeof fakeTx) => { strings: TemplateStringsArray; values: unknown[] }[]) => {
      transactionCallCount++;
      const queries = fn(fakeTx);
      for (const q of queries) {
        captured.push({ text: q.strings.join("?"), values: q.values });
      }
      if (opts.throwInsideTransaction) {
        throw new Error("SIMULATED_MID_TRANSACTION_FAILURE");
      }
      // 순서 고정: [reports insert 결과(사용 안 함), orders insert 결과(사용 안 함), report_deliveries insert 결과]
      return [[], [], [{ id: "fake-delivery-id-0001" }]];
    },
  };

  return { fakeSql: fakeSql as any, captured, getTransactionCallCount: () => transactionCallCount };
}

const SAMPLE_INTAKE: IntakeFormData = {
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
};

const VALID_INPUT: CreateManualPaidOrderInput = {
  intake: SAMPLE_INTAKE,
  email: "customer@example.com",
  amount: 29800,
  channel: "karrot",
};

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
    const { fakeSql } = makeFakeSql();
    const result = await createManualPaidOrder(VALID_INPUT, fakeSql);
    assert.ok(result.reportId, "reportId 있어야 함");
    assert.ok(result.orderId, "orderId 있어야 함");
    assert.equal(result.deliveryId, "fake-delivery-id-0001");
  });

  await check("A-2. transaction()이 정확히 1번 호출되고 쿼리 3개가 구성된다", async () => {
    const { fakeSql, captured, getTransactionCallCount } = makeFakeSql();
    await createManualPaidOrder(VALID_INPUT, fakeSql);
    assert.equal(getTransactionCallCount(), 1);
    assert.equal(captured.length, 3);
  });

  await check("A-3. reports/orders/report_deliveries 세 INSERT의 report_id가 전부 동일하다", async () => {
    const { fakeSql, captured } = makeFakeSql();
    await createManualPaidOrder(VALID_INPUT, fakeSql);
    const reportIdInReports = captured[0].values[0];
    const reportIdInOrders = captured[1].values[0];
    const reportIdInDeliveries = captured[2].values[0];
    assert.equal(reportIdInReports, reportIdInOrders);
    assert.equal(reportIdInReports, reportIdInDeliveries);
  });

  await check("A-4. orders INSERT: status='PAID' 리터럴, channel='karrot', payment_key 컬럼 자체가 없다(=NULL)", async () => {
    const { fakeSql, captured } = makeFakeSql();
    await createManualPaidOrder(VALID_INPUT, fakeSql);
    const ordersQuery = captured[1];
    assert.match(ordersQuery.text, /insert into orders/);
    assert.match(ordersQuery.text, /'PAID'/);
    assert.ok(ordersQuery.values.includes("karrot"), "channel=karrot 값이 파라미터에 있어야 함");
    assert.ok(!/payment_key/.test(ordersQuery.text), "payment_key 컬럼을 명시하지 않아야 NULL로 남는다");
    assert.ok(ordersQuery.values.includes(FULL_REPORT_ORDER_NAME), "order_name은 기존 상수를 재사용해야 함");
    assert.ok(ordersQuery.values.includes(29800), "amount가 그대로 전달돼야 함");
  });

  await check("A-5. orders INSERT: paid_at은 now()로 즉시 기록된다(리터럴)", async () => {
    const { fakeSql, captured } = makeFakeSql();
    await createManualPaidOrder(VALID_INPUT, fakeSql);
    assert.match(captured[1].text, /paid_at/);
    assert.match(captured[1].text, /now\(\)/);
  });

  await check("A-6. report_deliveries INSERT: status='PENDING' 리터럴, channel='karrot', email 정상 연결, sent_at 컬럼 없음(=NULL)", async () => {
    const { fakeSql, captured } = makeFakeSql();
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
    const { fakeSql, getTransactionCallCount } = makeFakeSql();
    await assert.rejects(
      () => createManualPaidOrder({ ...VALID_INPUT, channel: "instagram" as any }, fakeSql),
      /지원하지 않는 channel/
    );
    assert.equal(getTransactionCallCount(), 0, "검증 실패 시 transaction()이 호출되면 안 됨");
  });

  await check("C-2. 이메일이 비정상이면 DB 호출 전에 즉시 예외를 던진다", async () => {
    const { fakeSql, getTransactionCallCount } = makeFakeSql();
    await assert.rejects(() => createManualPaidOrder({ ...VALID_INPUT, email: "not-an-email" }, fakeSql));
    assert.equal(getTransactionCallCount(), 0);
  });

  await check("C-3. amount가 0 이하이면 DB 호출 전에 즉시 예외를 던진다", async () => {
    const { fakeSql, getTransactionCallCount } = makeFakeSql();
    await assert.rejects(() => createManualPaidOrder({ ...VALID_INPUT, amount: 0 }, fakeSql));
    assert.equal(getTransactionCallCount(), 0);
  });

  // ── D. 트랜잭션 중간 실패 시 예외가 그대로 호출자에게 전달되는지 ──
  await check("D-1. transaction() 도중 실패하면 예외를 삼키지 않고 그대로 던진다(부분 성공 객체를 반환하지 않음)", async () => {
    const { fakeSql } = makeFakeSql({ throwInsideTransaction: true });
    await assert.rejects(
      () => createManualPaidOrder(VALID_INPUT, fakeSql),
      /SIMULATED_MID_TRANSACTION_FAILURE/
    );
  });

  console.log(`\n총 ${passCount + failCount}건 중 PASS ${passCount} / FAIL ${failCount}`);
  if (failCount > 0) process.exit(1);
}

main();
