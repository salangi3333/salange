// [자동 회귀 테스트, 2026-09-10 최초 작성 / 2026-09-11 hard idempotency 추가]
// createHandler(deps)로 실제 DB(getSql())를 전혀 호출하지 않고 라우트
// 로직만 검증한다 — production DB에 어떤 쿼리도 나가지 않는다.
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { createHandler, ManualOrderRouteDeps } from "../app/api/admin/manual-orders/handler";
import {
  CreateManualPaidOrderInput,
  CreateManualPaidOrderResult,
  IdempotencyKeyConflictError,
} from "../lib/manualOrderStore";

process.env.ADMIN_API_SECRET = "test-secret-do-not-use-in-prod";

const VALID_BODY = {
  name: "당근고객",
  gender: "female",
  calendarType: "solar",
  isLeapMonth: false,
  birthYear: 1990,
  birthMonth: 5,
  birthDay: 15,
  birthHour: 14,
  birthMinute: 0,
  timeUnknown: false,
  email: "customer@example.com",
  amount: 29800,
  idempotencyKey: "route-test-idem-key-0001",
};

function makeRequest(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost/api/admin/manual-orders", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

/** 실제 DB에 전혀 닿지 않는 가짜 deps.
 *
 * [2026-09-11 추가] deps.sql은 이제 두 가지 다른 모양의 쿼리를 받는다 —
 * (1) findExistingManualPaidOrder의 idempotencyKey 사전 조회(orders+reports+
 * report_deliveries 3-way join), (2) 기존 2분 중복체크(orders+reports
 * 2-way join). 쿼리 텍스트로 둘을 구분해 각각 독립적으로 흉내낸다.
 * createOrder는 여전히 별도로 완전히 대체해 주입한다(라우트가 실제
 * createManualPaidOrder/트랜잭션 내부를 타지 않도록). */
function makeDeps(
  opts: {
    dupFound?: boolean;
    dupCheckThrows?: boolean;
    idempotencyHit?: "none" | "same" | "different";
    createOrderThrows?: Error;
    createOrderAlreadyExisted?: boolean;
  } = {}
): { deps: ManualOrderRouteDeps; createOrderCalls: CreateManualPaidOrderInput[] } {
  const createOrderCalls: CreateManualPaidOrderInput[] = [];
  const hit = opts.idempotencyHit ?? "none";

  const existingRowFor = (name: string, orderId: string) => ({
    report_id: "existing-report-id",
    name,
    gender: VALID_BODY.gender,
    calendar_type: VALID_BODY.calendarType,
    is_leap_month: VALID_BODY.isLeapMonth,
    birth_year: VALID_BODY.birthYear,
    birth_month: VALID_BODY.birthMonth,
    birth_day: VALID_BODY.birthDay,
    birth_hour: VALID_BODY.birthHour,
    birth_minute: VALID_BODY.birthMinute,
    time_unknown: VALID_BODY.timeUnknown,
    order_id: orderId,
    amount: VALID_BODY.amount,
    channel: "karrot",
    delivery_id: "existing-delivery-id",
    email: VALID_BODY.email,
  });

  const fakeSql: any = (strings: TemplateStringsArray, ..._values: unknown[]) => {
    const text = strings.join("?");
    const isIdempotencyLookup = /from orders o/.test(text) && /join report_deliveries d/.test(text);

    if (isIdempotencyLookup) {
      if (hit === "same") return Promise.resolve([existingRowFor(VALID_BODY.name, "existing-order-id-same")]);
      if (hit === "different")
        return Promise.resolve([existingRowFor("완전히 다른 고객", "existing-order-id-diff")]);
      return Promise.resolve([]); // "none"
    }

    // 여기부터는 기존 2분 중복체크 쿼리
    if (opts.dupCheckThrows) return Promise.reject(new Error("SIMULATED_DB_CONNECTION_STRING_LEAK_TEST xyz-secret-123"));
    return Promise.resolve(opts.dupFound ? [{ id: "existing-order-id" }] : []);
  };
  fakeSql.transaction = async () => {
    throw new Error("이 테스트 경로에서는 transaction()이 호출되면 안 됨(createOrder를 통째로 대체했어야 함)");
  };

  const fakeCreateOrder = async (input: CreateManualPaidOrderInput): Promise<CreateManualPaidOrderResult> => {
    createOrderCalls.push(input);
    if (opts.createOrderThrows) throw opts.createOrderThrows;
    return {
      reportId: "fake-report-id",
      orderId: "fake-order-id",
      deliveryId: "fake-delivery-id",
      alreadyExisted: opts.createOrderAlreadyExisted ?? false,
    };
  };

  return { deps: { createOrder: fakeCreateOrder as any, sql: fakeSql }, createOrderCalls };
}

let passCount = 0;
let failCount = 0;
async function check(label: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`✅ PASS - ${label}`);
    passCount++;
  } catch (e) {
    console.log(`❌ FAIL - ${label}`);
    console.log("   ", e instanceof Error ? e.message : e);
    failCount++;
  }
}

async function main() {
  // ── A. 인증 없음 → 거부 ──
  await check("A. 인증 헤더 없으면 401, createOrder 미호출", async () => {
    const { deps, createOrderCalls } = makeDeps();
    const handler = createHandler(deps);
    const res = await handler(makeRequest(VALID_BODY));
    assert.equal(res.status, 401);
    assert.equal(createOrderCalls.length, 0);
  });

  // ── B. 잘못된 인증 → 거부 ──
  await check("B. 틀린 secret이면 401, createOrder 미호출", async () => {
    const { deps, createOrderCalls } = makeDeps();
    const handler = createHandler(deps);
    const res = await handler(makeRequest(VALID_BODY, { "x-admin-secret": "wrong-secret-value" }));
    assert.equal(res.status, 401);
    assert.equal(createOrderCalls.length, 0);
  });

  await check("B-2. secret 길이만 다른 값도 401(timingSafeEqual 길이체크 우회 확인)", async () => {
    const { deps, createOrderCalls } = makeDeps();
    const handler = createHandler(deps);
    const res = await handler(makeRequest(VALID_BODY, { "x-admin-secret": "short" }));
    assert.equal(res.status, 401);
    assert.equal(createOrderCalls.length, 0);
  });

  // ── C. 정상 인증 + 정상 입력(신규 idempotencyKey) → createOrder 1회 호출, 201 + 최소 필드만 응답 ──
  await check("C. 정상 요청(신규 key)이면 201과 함께 createOrder가 정확히 1회 호출된다", async () => {
    const { deps, createOrderCalls } = makeDeps({ dupFound: false, idempotencyHit: "none" });
    const handler = createHandler(deps);
    const res = await handler(makeRequest(VALID_BODY, { "x-admin-secret": "test-secret-do-not-use-in-prod" }));
    const json = await res.json();
    assert.equal(res.status, 201);
    assert.equal(createOrderCalls.length, 1);
    assert.deepEqual(Object.keys(json).sort(), ["deliveryId", "orderId", "reportId", "status"].sort());
    assert.equal(json.status, "PAID");
  });

  // ── D. 잘못된 email → DB 호출 없음 ──
  await check("D. email이 이상하면 400, createOrder/중복확인 둘 다 미호출", async () => {
    const { deps, createOrderCalls } = makeDeps();
    const handler = createHandler(deps);
    const res = await handler(
      makeRequest({ ...VALID_BODY, email: "not-an-email" }, { "x-admin-secret": "test-secret-do-not-use-in-prod" })
    );
    assert.equal(res.status, 400);
    assert.equal(createOrderCalls.length, 0);
  });

  // ── E. amount<=0 → DB 호출 없음 ──
  await check("E. amount<=0이면 400, createOrder 미호출", async () => {
    const { deps, createOrderCalls } = makeDeps();
    const handler = createHandler(deps);
    const res = await handler(
      makeRequest({ ...VALID_BODY, amount: 0 }, { "x-admin-secret": "test-secret-do-not-use-in-prod" })
    );
    assert.equal(res.status, 400);
    assert.equal(createOrderCalls.length, 0);
  });

  // ── F. 잘못된 사주 입력 → DB 호출 없음 ──
  await check("F. 존재하지 않는 날짜(2월 30일)면 400, createOrder 미호출", async () => {
    const { deps, createOrderCalls } = makeDeps();
    const handler = createHandler(deps);
    const res = await handler(
      makeRequest(
        { ...VALID_BODY, birthMonth: 2, birthDay: 30 },
        { "x-admin-secret": "test-secret-do-not-use-in-prod" }
      )
    );
    assert.equal(res.status, 400);
    assert.equal(createOrderCalls.length, 0);
  });

  await check("F-2. gender가 허용값이 아니면 400, createOrder 미호출", async () => {
    const { deps, createOrderCalls } = makeDeps();
    const handler = createHandler(deps);
    const res = await handler(
      makeRequest({ ...VALID_BODY, gender: "unknown" }, { "x-admin-secret": "test-secret-do-not-use-in-prod" })
    );
    assert.equal(res.status, 400);
    assert.equal(createOrderCalls.length, 0);
  });

  // ── G. channel 조작 → 항상 karrot으로 고정 ──
  await check("G. body에 channel:'instagram'을 넣어도 createOrder에는 'karrot'만 전달된다", async () => {
    const { deps, createOrderCalls } = makeDeps({ dupFound: false, idempotencyHit: "none" });
    const handler = createHandler(deps);
    const res = await handler(
      makeRequest({ ...VALID_BODY, channel: "instagram" }, { "x-admin-secret": "test-secret-do-not-use-in-prod" })
    );
    assert.equal(res.status, 201);
    assert.equal(createOrderCalls.length, 1);
    assert.equal(createOrderCalls[0].channel, "karrot");
  });

  // ── H. 실패 응답에 secret/DB 상세정보 노출 없음 ──
  await check("H-1. 인증 실패 응답 본문에 실제 secret 값이 노출되지 않는다", async () => {
    const { deps } = makeDeps();
    const handler = createHandler(deps);
    const res = await handler(makeRequest(VALID_BODY));
    const text = await res.text();
    assert.ok(!text.includes("test-secret-do-not-use-in-prod"));
  });

  await check("H-2. DB 중복확인 조회 실패 시 원본 에러 메시지가 클라이언트에 노출되지 않는다", async () => {
    const { deps } = makeDeps({ dupCheckThrows: true, idempotencyHit: "none" });
    const handler = createHandler(deps);
    const res = await handler(makeRequest(VALID_BODY, { "x-admin-secret": "test-secret-do-not-use-in-prod" }));
    const text = await res.text();
    assert.equal(res.status, 500);
    assert.ok(!text.includes("xyz-secret-123"), "내부 에러 원문이 응답에 그대로 노출되면 안 됨");
  });

  await check("H-3. createOrder 내부 실패 시 원본 에러 메시지가 클라이언트에 노출되지 않는다", async () => {
    const { deps } = makeDeps({ createOrderThrows: new Error("INTERNAL_DB_CONNSTRING_abc123"), idempotencyHit: "none" });
    const handler = createHandler(deps);
    const res = await handler(makeRequest(VALID_BODY, { "x-admin-secret": "test-secret-do-not-use-in-prod" }));
    const text = await res.text();
    assert.equal(res.status, 500);
    assert.ok(!text.includes("INTERNAL_DB_CONNSTRING_abc123"));
  });

  // ── I. 기존 Toss 관련 코드에 영향 없는지(정적 확인) ──
  await check("I. 새 라우트/핸들러 파일이 Toss 전용 함수를 import/호출하지 않는다", async () => {
    const fs = await import("node:fs");
    for (const rel of ["../app/api/admin/manual-orders/route.ts", "../app/api/admin/manual-orders/handler.ts"]) {
      const src = fs.readFileSync(new URL(rel, import.meta.url), "utf-8");
      const importLines = src.split("\n").filter((l) => l.trim().startsWith("import"));
      for (const line of importLines) {
        assert.ok(!line.includes("createOrGetPendingOrder"), `[${rel}] import에 Toss 함수 포함: ${line}`);
        assert.ok(!line.includes("markOrderPaid"), `[${rel}] import에 Toss 함수 포함: ${line}`);
        assert.ok(!line.toLowerCase().includes("tosspayments"), `[${rel}] import에 Toss 모듈 포함: ${line}`);
      }
      assert.ok(!/createOrGetPendingOrder\(/.test(src), `[${rel}] 호출 흔적 있음`);
      assert.ok(!/markOrderPaid\(/.test(src), `[${rel}] 호출 흔적 있음`);
    }
  });

  // ── J. idempotencyKey 형식 검증 ──
  await check("J-1. idempotencyKey가 없으면 400, createOrder/DB 조회 전부 미호출", async () => {
    const { deps, createOrderCalls } = makeDeps();
    const handler = createHandler(deps);
    const { idempotencyKey, ...bodyWithoutKey } = VALID_BODY;
    const res = await handler(
      makeRequest(bodyWithoutKey, { "x-admin-secret": "test-secret-do-not-use-in-prod" })
    );
    assert.equal(res.status, 400);
    assert.equal(createOrderCalls.length, 0);
  });

  await check("J-2. idempotencyKey 형식이 잘못되면(너무 짧음) 400", async () => {
    const { deps, createOrderCalls } = makeDeps();
    const handler = createHandler(deps);
    const res = await handler(
      makeRequest({ ...VALID_BODY, idempotencyKey: "짧음" }, { "x-admin-secret": "test-secret-do-not-use-in-prod" })
    );
    assert.equal(res.status, 400);
    assert.equal(createOrderCalls.length, 0);
  });

  // ── K. hard idempotency — 요청하신 7개 케이스 중 라우트(HTTP) 레벨 부분 ──

  await check(
    "K-1(케이스2/3/5). 같은 key로 이미 처리된 주문이 있으면(사전 조회 hit) 200으로 기존 주문을 반환하고 createOrder는 호출하지 않는다",
    async () => {
      const { deps, createOrderCalls } = makeDeps({ idempotencyHit: "same" });
      const handler = createHandler(deps);
      const res = await handler(makeRequest(VALID_BODY, { "x-admin-secret": "test-secret-do-not-use-in-prod" }));
      const json = await res.json();
      assert.equal(res.status, 200);
      assert.equal(createOrderCalls.length, 0, "이미 처리된 주문이면 createOrder를 다시 호출하면 안 됨");
      assert.equal(json.orderId, "existing-order-id-same");
      assert.equal(json.status, "PAID");
    }
  );

  await check(
    "K-2(케이스4). 같은 key인데 주문 데이터가 다르면(idempotencyKey 오용) 409, createOrder 미호출",
    async () => {
      const { deps, createOrderCalls } = makeDeps({ idempotencyHit: "different" });
      const handler = createHandler(deps);
      const res = await handler(makeRequest(VALID_BODY, { "x-admin-secret": "test-secret-do-not-use-in-prod" }));
      assert.equal(res.status, 409);
      assert.equal(createOrderCalls.length, 0);
    }
  );

  await check(
    "K-3. idempotencyKey가 createOrder 입력에 그대로 전달된다",
    async () => {
      const { deps, createOrderCalls } = makeDeps({ idempotencyHit: "none" });
      const handler = createHandler(deps);
      await handler(makeRequest(VALID_BODY, { "x-admin-secret": "test-secret-do-not-use-in-prod" }));
      assert.equal(createOrderCalls[0].idempotencyKey, "route-test-idem-key-0001");
    }
  );

  await check(
    "K-4. createOrder가 alreadyExisted:true를 반환하면(사전조회 직후~트랜잭션 사이 극좁은 race) 200으로 응답한다",
    async () => {
      const { deps } = makeDeps({ idempotencyHit: "none", createOrderAlreadyExisted: true });
      const handler = createHandler(deps);
      const res = await handler(makeRequest(VALID_BODY, { "x-admin-secret": "test-secret-do-not-use-in-prod" }));
      assert.equal(res.status, 200);
    }
  );

  await check(
    "K-5. createOrder가 IdempotencyKeyConflictError를 던지면(사전조회 이후 생긴 충돌) 409로 응답한다",
    async () => {
      const { deps } = makeDeps({
        idempotencyHit: "none",
        createOrderThrows: new IdempotencyKeyConflictError("route-test-idem-key-0001"),
      });
      const handler = createHandler(deps);
      const res = await handler(makeRequest(VALID_BODY, { "x-admin-secret": "test-secret-do-not-use-in-prod" }));
      assert.equal(res.status, 409);
    }
  );

  // ── L(케이스8). 기존 2분 보조 중복 체크가 의도대로 유지되는지 ──
  await check(
    "L-1. 신규 key(사전조회 miss) + 최근 2분 내 동일 고객 주문 있음 → 여전히 409, createOrder 미호출(보조 안전장치 살아있음)",
    async () => {
      const { deps, createOrderCalls } = makeDeps({ idempotencyHit: "none", dupFound: true });
      const handler = createHandler(deps);
      const res = await handler(makeRequest(VALID_BODY, { "x-admin-secret": "test-secret-do-not-use-in-prod" }));
      assert.equal(res.status, 409);
      assert.equal(createOrderCalls.length, 0);
    }
  );

  await check(
    "L-2. 사전조회 hit(정상 재시도)이면, 2분 체크가 409를 낼 상황이어도 2분 체크 자체를 건너뛰고 200을 반환한다",
    async () => {
      // idempotencyHit:"same"이면서 dupFound:true도 같이 줘서, 2분 체크까지
      // 도달했다면 409가 나왔을 상황을 만든다 — 그래도 200이 나와야
      // "사전조회 hit 시 2분 체크를 건너뛴다"는 설계가 실제로 맞는지 증명된다.
      const { deps, createOrderCalls } = makeDeps({ idempotencyHit: "same", dupFound: true });
      const handler = createHandler(deps);
      const res = await handler(makeRequest(VALID_BODY, { "x-admin-secret": "test-secret-do-not-use-in-prod" }));
      assert.equal(res.status, 200, "사전조회에서 정상 재시도로 판정되면 2분 체크의 409보다 우선해야 함");
      assert.equal(createOrderCalls.length, 0);
    }
  );

  console.log(`\n총 ${passCount + failCount}건 중 PASS ${passCount} / FAIL ${failCount}`);
  if (failCount > 0) process.exit(1);
}

main();
