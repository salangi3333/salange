// [자동 회귀 테스트, 2026-09-10 — POST /api/admin/manual-orders]
// createHandler(deps)로 실제 DB(getSql())를 전혀 호출하지 않고 라우트
// 로직만 검증한다 — production DB에 어떤 쿼리도 나가지 않는다.
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { createHandler, ManualOrderRouteDeps } from "../app/api/admin/manual-orders/handler";
import { CreateManualPaidOrderInput, CreateManualPaidOrderResult } from "../lib/manualOrderStore";

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
};

function makeRequest(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost/api/admin/manual-orders", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

/** 실제 DB에 전혀 닿지 않는 가짜 deps. sql은 중복확인 SELECT용(태그드 템플릿
 * 직접 호출)과 createManualPaidOrder 내부의 .transaction() 둘 다 흉내낼 필요는
 * 없다 — 라우트 자체는 sql을 직접 태그드 템플릿으로만 쓰고, createOrder는
 * 별도로 주입해 완전히 대체하기 때문. */
function makeDeps(opts: {
  dupFound?: boolean;
  dupCheckThrows?: boolean;
  createOrderThrows?: Error;
} = {}): { deps: ManualOrderRouteDeps; createOrderCalls: CreateManualPaidOrderInput[] } {
  const createOrderCalls: CreateManualPaidOrderInput[] = [];

  const fakeSql: any = (_strings: TemplateStringsArray, ..._values: unknown[]) => {
    if (opts.dupCheckThrows) return Promise.reject(new Error("SIMULATED_DB_CONNECTION_STRING_LEAK_TEST xyz-secret-123"));
    return Promise.resolve(opts.dupFound ? [{ id: "existing-order-id" }] : []);
  };
  fakeSql.transaction = async () => {
    throw new Error("이 테스트 경로에서는 transaction()이 호출되면 안 됨(createOrder를 통째로 대체했어야 함)");
  };

  const fakeCreateOrder = async (input: CreateManualPaidOrderInput): Promise<CreateManualPaidOrderResult> => {
    createOrderCalls.push(input);
    if (opts.createOrderThrows) throw opts.createOrderThrows;
    return { reportId: "fake-report-id", orderId: "fake-order-id", deliveryId: "fake-delivery-id" };
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

  // ── C. 정상 인증 + 정상 입력 → createOrder 1회 호출, 201 + 최소 필드만 응답 ──
  await check("C. 정상 요청이면 201과 함께 createOrder가 정확히 1회 호출된다", async () => {
    const { deps, createOrderCalls } = makeDeps({ dupFound: false });
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
    const { deps, createOrderCalls } = makeDeps({ dupFound: false });
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
    const { deps } = makeDeps({ dupCheckThrows: true });
    const handler = createHandler(deps);
    const res = await handler(makeRequest(VALID_BODY, { "x-admin-secret": "test-secret-do-not-use-in-prod" }));
    const text = await res.text();
    assert.equal(res.status, 500);
    assert.ok(!text.includes("xyz-secret-123"), "내부 에러 원문이 응답에 그대로 노출되면 안 됨");
  });

  await check("H-3. createOrder 내부 실패 시 원본 에러 메시지가 클라이언트에 노출되지 않는다", async () => {
    const { deps } = makeDeps({ createOrderThrows: new Error("INTERNAL_DB_CONNSTRING_abc123") });
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

  // ── 중복 제출 방어 동작 확인(최선 노력 범위) ──
  await check("중복확인: 최근 2분 내 동일 고객 주문이 있으면 409, createOrder 미호출", async () => {
    const { deps, createOrderCalls } = makeDeps({ dupFound: true });
    const handler = createHandler(deps);
    const res = await handler(makeRequest(VALID_BODY, { "x-admin-secret": "test-secret-do-not-use-in-prod" }));
    assert.equal(res.status, 409);
    assert.equal(createOrderCalls.length, 0);
  });

  console.log(`\n총 ${passCount + failCount}건 중 PASS ${passCount} / FAIL ${failCount}`);
  if (failCount > 0) process.exit(1);
}

main();
