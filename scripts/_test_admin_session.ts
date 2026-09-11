// [자동 회귀 테스트, 2026-09-11] lib/adminSession.ts 단위 테스트 — 실제 DB/
// Vercel/브라우저 없이 세션 서명/검증, 비밀번호 비교, Origin 검증만 확인한다.
// process.env를 테스트 안에서 직접 조작해 "env 있음/없음" 양쪽을 재현한다
// (adminSession.ts의 모든 함수가 매 호출마다 process.env를 다시 읽으므로
// 가능 — 모듈 top-level 캐싱 없음).
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import {
  createAdminSessionCookieValue,
  isValidAdminSessionValue,
  isValidAdminUiPassword,
  isTrustedOrigin,
} from "../lib/adminSession";

// adminSession.ts의 모든 함수는 매 호출마다 process.env를 다시 읽으므로
// (모듈 top-level 캐싱 없음), import 순서와 무관하게 아래처럼 실행 시점에
// 설정하면 된다 — 기존 _test_admin_manual_orders_route.ts와 동일 패턴.
process.env.ADMIN_API_SECRET = "test-signing-secret-0123456789";

function makeReqWithOrigin(origin: string | null): NextRequest {
  const headers: Record<string, string> = {};
  if (origin !== null) headers["origin"] = origin;
  return new NextRequest("https://paljamun.com/admin/api/orders", {
    method: "POST",
    headers,
  });
}

function signManually(issuedAt: number, expiresAt: number, secret: string): string {
  const payload = `${issuedAt}.${expiresAt}`;
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

let passCount = 0;
let failCount = 0;
function check(label: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ PASS - ${label}`);
    passCount++;
  } catch (e) {
    console.log(`❌ FAIL - ${label}`);
    console.log("   ", e instanceof Error ? e.message : e);
    failCount++;
  }
}

// ── A. 세션 서명/검증 ──
check("A-1. 정상 서명 직후 verify하면 true", () => {
  const value = createAdminSessionCookieValue();
  assert.ok(value, "서명키가 있으므로 null이면 안 됨");
  assert.equal(isValidAdminSessionValue(value), true);
});

check("A-2. 서명이 위조되면(끝 1글자 변경) false", () => {
  const value = createAdminSessionCookieValue()!;
  const tampered = value.slice(0, -1) + (value.endsWith("0") ? "1" : "0");
  assert.equal(isValidAdminSessionValue(tampered), false);
});

check("A-3. 만료시각이 지난 값(서명은 올바름)은 false", () => {
  const now = Date.now();
  const issuedAt = now - 100000;
  const expiresAt = now - 1000; // 이미 만료
  const value = signManually(issuedAt, expiresAt, "test-signing-secret-0123456789");
  assert.equal(isValidAdminSessionValue(value), false);
});

check("A-4. 형식이 이상한 값(점 개수 다름/빈 문자열/undefined)은 false", () => {
  assert.equal(isValidAdminSessionValue(""), false);
  assert.equal(isValidAdminSessionValue(undefined), false);
  assert.equal(isValidAdminSessionValue("a.b"), false);
  assert.equal(isValidAdminSessionValue("a.b.c.d"), false);
});

check("A-5. ADMIN_API_SECRET이 없으면(fail-closed) 서명 생성 자체가 null, 검증도 항상 false", () => {
  const saved = process.env.ADMIN_API_SECRET;
  delete process.env.ADMIN_API_SECRET;
  try {
    assert.equal(createAdminSessionCookieValue(), null);
    const value = signManually(Date.now(), Date.now() + 100000, "아무-secret");
    assert.equal(isValidAdminSessionValue(value), false);
  } finally {
    process.env.ADMIN_API_SECRET = saved;
  }
});

// ── B. ADMIN_UI_PASSWORD 비교 ──
check("B-1. 정상 비밀번호면 true", () => {
  const saved = process.env.ADMIN_UI_PASSWORD;
  process.env.ADMIN_UI_PASSWORD = "correct-horse-battery-staple";
  try {
    assert.equal(isValidAdminUiPassword("correct-horse-battery-staple"), true);
  } finally {
    if (saved === undefined) delete process.env.ADMIN_UI_PASSWORD;
    else process.env.ADMIN_UI_PASSWORD = saved;
  }
});

check("B-2. 틀린 비밀번호면 false", () => {
  const saved = process.env.ADMIN_UI_PASSWORD;
  process.env.ADMIN_UI_PASSWORD = "correct-horse-battery-staple";
  try {
    assert.equal(isValidAdminUiPassword("wrong-password"), false);
  } finally {
    if (saved === undefined) delete process.env.ADMIN_UI_PASSWORD;
    else process.env.ADMIN_UI_PASSWORD = saved;
  }
});

check("B-3. ADMIN_UI_PASSWORD가 없으면(fail-closed) 어떤 입력이든 항상 false", () => {
  const saved = process.env.ADMIN_UI_PASSWORD;
  delete process.env.ADMIN_UI_PASSWORD;
  try {
    assert.equal(isValidAdminUiPassword("아무거나"), false);
    assert.equal(isValidAdminUiPassword(""), false);
  } finally {
    if (saved === undefined) delete process.env.ADMIN_UI_PASSWORD;
    else process.env.ADMIN_UI_PASSWORD = saved;
  }
});

// ── C. Origin 검증 ──
check("C-1. production에서 https://paljamun.com은 허용", () => {
  const saved = process.env.NODE_ENV;
  (process.env as any).NODE_ENV = "production";
  try {
    assert.equal(isTrustedOrigin(makeReqWithOrigin("https://paljamun.com")), true);
  } finally {
    (process.env as any).NODE_ENV = saved;
  }
});

check("C-2. production에서 http://localhost:3000은 거부", () => {
  const saved = process.env.NODE_ENV;
  (process.env as any).NODE_ENV = "production";
  try {
    assert.equal(isTrustedOrigin(makeReqWithOrigin("http://localhost:3000")), false);
  } finally {
    (process.env as any).NODE_ENV = saved;
  }
});

check("C-3. development에서는 production origin과 localhost:3000 둘 다 허용", () => {
  const saved = process.env.NODE_ENV;
  (process.env as any).NODE_ENV = "development";
  try {
    assert.equal(isTrustedOrigin(makeReqWithOrigin("https://paljamun.com")), true);
    assert.equal(isTrustedOrigin(makeReqWithOrigin("http://localhost:3000")), true);
  } finally {
    (process.env as any).NODE_ENV = saved;
  }
});

check("C-4. Origin 헤더가 아예 없으면 거부(fail-closed, Referer로 대체하지 않음)", () => {
  assert.equal(isTrustedOrigin(makeReqWithOrigin(null)), false);
});

check("C-5. 허용 목록에 없는 임의 origin은 거부", () => {
  const saved = process.env.NODE_ENV;
  (process.env as any).NODE_ENV = "production";
  try {
    assert.equal(isTrustedOrigin(makeReqWithOrigin("https://evil-attacker.example")), false);
  } finally {
    (process.env as any).NODE_ENV = saved;
  }
});

console.log(`\n총 ${passCount + failCount}건 중 PASS ${passCount} / FAIL ${failCount}`);
if (failCount > 0) process.exit(1);
