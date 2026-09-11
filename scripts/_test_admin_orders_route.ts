// [자동 회귀 테스트, 2026-09-11] app/admin/api/orders 라우트 테스트.
//
// 이 라우트(route.ts)는 승인된 설계대로 실제 getSql()/createManualPaidOrder를
// 직접 참조한다(의존성 주입 없음 — deps를 안 받는 게 이번 설계의 핵심이라,
// 여기서 fake sql을 주입할 수 없다). 그래서 이 테스트는:
//   1) 인증 게이트(Origin/세션)는 DB에 전혀 안 닿으므로 완전히 검증한다.
//   2) 인증을 통과한 뒤에도, "DB에 닿기 전에 끝나는" 입력 오류(400)
//      케이스만으로 실제 processManualOrderRequest까지 정상적으로
//      연결됐는지 확인한다 — getSql()은 호출되지만(연결 생성만, 실제
//      쿼리 전송 없음 — @neondatabase/serverless의 neon()은 호출 시점에
//      네트워크 요청을 하지 않는다) deps.sql/deps.createOrder 자체는 한
//      번도 실행되지 않는다(DB read/write 전부 0건).
//   3) "실제 주문 생성/조회"(200/201/409, 더블클릭 방지) 동작 자체는 이미
//      scripts/_test_admin_manual_orders_route.ts(processManualOrderRequest를
//      createHandler로 감싸 fake deps로 검증)와
//      scripts/_test_manual_order_store.ts(진짜 동시 요청 UNIQUE 충돌
//      경로까지 검증)에서 완전히 커버되어 있다 — 같은 함수(processManualOrderRequest)를
//      이 라우트도 그대로 쓰므로 여기서 다시 반복 검증하지 않는다.
//
// DATABASE_URL이 필요하다(getSql()이 이 값 없이는 예외를 던짐) — 실행:
//   npx tsx --env-file=.env.local scripts/_test_admin_orders_route.ts
// 실제 쿼리는 한 번도 나가지 않으므로 Production DB에 전혀 영향 없다.
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST as ordersPOST } from "../app/admin/api/orders/route";
import { createAdminSessionCookieValue, ADMIN_SESSION_COOKIE_NAME } from "../lib/adminSession";

process.env.ADMIN_API_SECRET = "test-signing-secret-for-orders-route";

const TRUSTED_ORIGIN = "https://paljamun.com";

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
  idempotencyKey: "admin-orders-route-test-key-01",
};

function makeRequest(body: unknown, opts: { origin?: string | null; withSession?: boolean } = {}): NextRequest {
  const { origin = TRUSTED_ORIGIN, withSession = true } = opts;
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (origin !== null) headers["origin"] = origin;
  if (withSession) {
    const session = createAdminSessionCookieValue();
    if (session) headers["cookie"] = `${ADMIN_SESSION_COOKIE_NAME}=${session}`;
  }
  return new NextRequest("https://paljamun.com/admin/api/orders", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
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
  // ── 인증 게이트(DB 전혀 안 닿음) ──
  await check("A. 세션 쿠키 없음 → 401", async () => {
    const res = await ordersPOST(makeRequest(VALID_BODY, { withSession: false }));
    assert.equal(res.status, 401);
  });

  await check("B. 신뢰하지 않는 origin → 403(세션이 있어도)", async () => {
    const res = await ordersPOST(makeRequest(VALID_BODY, { origin: "https://evil-attacker.example" }));
    assert.equal(res.status, 403);
  });

  await check("C. Origin 헤더 없음 → 403", async () => {
    const res = await ordersPOST(makeRequest(VALID_BODY, { origin: null }));
    assert.equal(res.status, 403);
  });

  await check("D. 위조된 세션 쿠키 → 401", async () => {
    const req = makeRequest(VALID_BODY, { withSession: false });
    req.cookies.set(ADMIN_SESSION_COOKIE_NAME, "tampered.value.here");
    const res = await ordersPOST(req);
    assert.equal(res.status, 401);
  });

  // ── 인증 통과 후 실제 로직 연결 확인(DB read/write 없이 400으로 끝나는 케이스만) ──
  await check("E. 인증 통과 + 이름 없는 잘못된 body → 400(processManualOrderRequest까지 정상 연결됨)", async () => {
    const res = await ordersPOST(makeRequest({ ...VALID_BODY, name: "" }));
    assert.equal(res.status, 400);
  });

  await check("F. 인증 통과 + idempotencyKey 형식 오류 → 400", async () => {
    const res = await ordersPOST(makeRequest({ ...VALID_BODY, idempotencyKey: "짧음" }));
    assert.equal(res.status, 400);
  });

  await check("G. 인증 통과 + 이메일 형식 오류 → 400", async () => {
    const res = await ordersPOST(makeRequest({ ...VALID_BODY, email: "not-an-email" }));
    assert.equal(res.status, 400);
  });

  console.log(`\n총 ${passCount + failCount}건 중 PASS ${passCount} / FAIL ${failCount}`);
  if (failCount > 0) process.exit(1);
}

main();
