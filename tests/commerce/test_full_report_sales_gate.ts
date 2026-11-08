// [자동 회귀 테스트, 2026-11] 종합 리포트 신규 유료 결제 차단 — DB·네트워크·결제 접근 없음.
// 실행: npx tsx tests/commerce/test_full_report_sales_gate.ts
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { POST } from "../../app/api/orders/route";

// DB 접속 정보가 있어도 이 테스트는 닫힌 상태에서 DB에 닿지 않아야 한다 — 일부러 비워 둔다.
delete process.env.DATABASE_URL;
delete process.env.FULL_REPORT_SALES;

const req = (body: unknown) =>
  new NextRequest("https://paljamun.com/api/orders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
const VALID = { reportId: "123e4567-e89b-42d3-a456-426614174000", phone: "01012345678" };

async function main() {
  // 서버 진입점 두 곳이 정확히 "on" 비교로 직접 판정한다(별도 commerce 모듈에 의존하지 않음)
  const root = path.join(__dirname, "..", "..");
  const ordersSrc = fs.readFileSync(path.join(root, "app/api/orders/route.ts"), "utf8");
  const pageSrc = fs.readFileSync(path.join(root, "app/result-v2/[reportId]/page.tsx"), "utf8");
  assert.ok(ordersSrc.includes('process.env.FULL_REPORT_SALES !== "on"'));
  assert.ok(pageSrc.includes('salesOpen={process.env.FULL_REPORT_SALES === "on"}'));
  assert.ok(!/lib\/commerce/.test(ordersSrc) && !/lib\/commerce/.test(pageSrc));

  // 서버: 미설정 → 유효한 요청도 403, DB 접속 정보가 없는데도 500이 아니라 403(=DB 이전에 차단)
  let res = await POST(req(VALID));
  assert.equal(res.status, 403);
  assert.match((await res.json()).error, /준비 중/);

  // 잘못된 값들도 모두 403
  for (const v of ["", "1", "true", "ON", "On", " on", "on ", "yes"]) {
    process.env.FULL_REPORT_SALES = v;
    res = await POST(req(VALID));
    assert.equal(res.status, 403, v);
  }
  // 본문이 깨져 있어도·reportId가 없어도 닫혀 있으면 403(입력 오류 400이 아니다)
  delete process.env.FULL_REPORT_SALES;
  res = await POST(new NextRequest("https://paljamun.com/api/orders", { method: "POST", body: "not-json" }));
  assert.equal(res.status, 403);
  res = await POST(req({}));
  assert.equal(res.status, 403);

  // 열면(on) 기존 검증 단계로 넘어간다 — 잘못된 reportId는 400(DB 이전 단계)
  process.env.FULL_REPORT_SALES = "on";
  res = await POST(req({ reportId: "bad", phone: "01012345678" }));
  assert.equal(res.status, 400);
  delete process.env.FULL_REPORT_SALES;

  console.log("full report sales gate: all assertions passed");
}
main().catch((e) => { console.error(e); process.exit(1); });
