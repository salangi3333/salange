import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * lib/schema.sql을 실제 Neon DB에 적용하는 반복 실행 가능한 스크립트.
 * 모든 statement가 `if not exists` 기준이라 여러 번 실행해도 안전하다
 * (새 로컬/스테이징 DB를 만들었을 때 같은 스키마를 다시 적용하는 용도).
 *
 * 실행: npx tsx scripts/apply-schema.ts (프로젝트 루트의 .env.local에
 * DATABASE_URL이 있어야 한다 — `vercel env pull .env.local`로 받는다)
 */

// .env.local을 직접 파싱해 process.env에 채운다(dotenv 패키지를 새로
// 설치하지 않기 위해) — 셸(NODE_OPTIONS/env-file)로 넘기는 방식이 이
// Windows/Git Bash 환경에서 불안정해서 이 스크립트 안에서 직접 로드한다.
// 값 자체는 어디에도 출력하지 않는다.
function loadEnvLocal() {
  const path = join(__dirname, "..", ".env.local");
  const content = readFileSync(path, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

async function main() {
  loadEnvLocal();
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL이 환경변수에 없습니다.");
    process.exit(1);
  }
  const sql = neon(url);
  const schema = readFileSync(join(__dirname, "..", "lib", "schema.sql"), "utf-8");

  // neon() 태그드 템플릿은 한 번에 한 statement만 실행하므로, 세미콜론
  // 기준으로 나눠서 순서대로 실행한다. 주석은 statement "단위"가 아니라
  // 줄 단위로 먼저 제거한다 — 한 statement 앞에 여러 줄 주석이 붙어있으면
  // (이 파일의 schema.sql처럼) 그 statement 전체가 주석으로 오인돼
  // 통째로 스킵되는 문제가 있었다.
  const withoutComments = schema
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  const statements = withoutComments
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    console.log("실행:", stmt.split("\n")[0].slice(0, 60), "...");
    await sql.query(stmt);
  }

  console.log("스키마 적용 완료");
}

main().catch((e) => {
  console.error("스키마 적용 실패:", e);
  process.exit(1);
});
