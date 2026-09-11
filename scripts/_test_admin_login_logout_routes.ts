// [자동 회귀 테스트, 2026-09-11] app/admin/api/login, app/admin/api/logout
// 라우트 테스트 — 실제 Vercel/브라우저 없이 NextRequest를 직접 만들어
// 호출한다(기존 scripts/_test_admin_manual_orders_route.ts와 동일 패턴).
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST as loginPOST } from "../app/admin/api/login/route";
import { POST as logoutPOST } from "../app/admin/api/logout/route";
import { ADMIN_SESSION_COOKIE_NAME } from "../lib/adminSession";

const TRUSTED_ORIGIN = "https://paljamun.com";

function makeRequest(url: string, body: unknown, origin: string | null): NextRequest {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (origin !== null) headers["origin"] = origin;
  return new NextRequest(url, {
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
  // ── 로그인 ──
  await check("로그인 A. ADMIN_UI_PASSWORD 없음(fail-closed) → 정상 비밀번호를 보내도 401", async () => {
    delete process.env.ADMIN_UI_PASSWORD;
    process.env.ADMIN_API_SECRET = "test-signing-secret-0123456789";
    const res = await loginPOST(
      makeRequest("https://paljamun.com/admin/api/login", { password: "아무거나" }, TRUSTED_ORIGIN)
    );
    assert.equal(res.status, 401);
  });

  await check("로그인 B. 올바른 비밀번호 + 신뢰 origin → 200, Set-Cookie에 세션 값 포함", async () => {
    process.env.ADMIN_UI_PASSWORD = "test-ui-password-0001";
    process.env.ADMIN_API_SECRET = "test-signing-secret-0123456789";
    const res = await loginPOST(
      makeRequest("https://paljamun.com/admin/api/login", { password: "test-ui-password-0001" }, TRUSTED_ORIGIN)
    );
    assert.equal(res.status, 200);
    const setCookie = res.headers.get("set-cookie") ?? "";
    assert.ok(setCookie.includes(ADMIN_SESSION_COOKIE_NAME), "세션 쿠키가 설정돼야 함");
    assert.ok(setCookie.toLowerCase().includes("httponly"), "HttpOnly 속성이 있어야 함");
    assert.ok(setCookie.toLowerCase().includes("samesite=strict"), "SameSite=Strict 속성이 있어야 함");
  });

  await check("로그인 C. 틀린 비밀번호 → 401, 쿠키 없음", async () => {
    process.env.ADMIN_UI_PASSWORD = "test-ui-password-0001";
    const res = await loginPOST(
      makeRequest("https://paljamun.com/admin/api/login", { password: "wrong" }, TRUSTED_ORIGIN)
    );
    assert.equal(res.status, 401);
    assert.equal(res.headers.get("set-cookie"), null);
  });

  await check("로그인 D. 신뢰하지 않는 origin → 403(비밀번호가 맞아도)", async () => {
    process.env.ADMIN_UI_PASSWORD = "test-ui-password-0001";
    const res = await loginPOST(
      makeRequest(
        "https://paljamun.com/admin/api/login",
        { password: "test-ui-password-0001" },
        "https://evil-attacker.example"
      )
    );
    assert.equal(res.status, 403);
  });

  await check("로그인 E. Origin 헤더 없음 → 403", async () => {
    process.env.ADMIN_UI_PASSWORD = "test-ui-password-0001";
    const res = await loginPOST(
      makeRequest("https://paljamun.com/admin/api/login", { password: "test-ui-password-0001" }, null)
    );
    assert.equal(res.status, 403);
  });

  await check("로그인 F. 응답 본문에 실제 비밀번호/secret 값이 노출되지 않는다", async () => {
    process.env.ADMIN_UI_PASSWORD = "test-ui-password-0001";
    const res = await loginPOST(
      makeRequest("https://paljamun.com/admin/api/login", { password: "wrong" }, TRUSTED_ORIGIN)
    );
    const text = await res.text();
    assert.ok(!text.includes("test-ui-password-0001"));
    assert.ok(!text.includes("test-signing-secret-0123456789"));
  });

  // ── 로그아웃 ──
  await check("로그아웃 A. 신뢰 origin → 200, 쿠키 즉시 만료(maxAge=0)", async () => {
    const res = await logoutPOST(makeRequest("https://paljamun.com/admin/api/logout", {}, TRUSTED_ORIGIN));
    assert.equal(res.status, 200);
    const setCookie = res.headers.get("set-cookie") ?? "";
    assert.ok(setCookie.includes(ADMIN_SESSION_COOKIE_NAME));
    assert.ok(/max-age=0/i.test(setCookie), "즉시 만료(max-age=0)여야 함");
  });

  await check("로그아웃 B. 신뢰하지 않는 origin → 403", async () => {
    const res = await logoutPOST(
      makeRequest("https://paljamun.com/admin/api/logout", {}, "https://evil-attacker.example")
    );
    assert.equal(res.status, 403);
  });

  console.log(`\n총 ${passCount + failCount}건 중 PASS ${passCount} / FAIL ${failCount}`);
  if (failCount > 0) process.exit(1);
}

main();
