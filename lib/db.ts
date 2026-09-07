import { neon, NeonQueryFunction } from "@neondatabase/serverless";

/**
 * Neon(Postgres) 서버 전용 접근 지점 — DB + reportId + 영구 재접속 구조.
 *
 * 이 파일은 Server Component/Route Handler에서만 import한다. 브라우저
 * 번들에 절대 들어가면 안 된다("use client" 컴포넌트에서 이 파일을
 * import하지 않는다) — `DATABASE_URL`은 Vercel↔Neon 연동이 자동으로 넣어준
 * 서버 전용 환경변수이고, 이 값을 로그로 출력하거나 API 응답/클라이언트로
 * 전달하지 않는다.
 *
 * ORM을 새로 들이지 않는다 — 테이블이 reports 하나뿐이라
 * @neondatabase/serverless의 태그드 템플릿 `sql` 함수만으로 충분하다.
 * 이 함수는 값을 파라미터 바인딩으로 처리해 SQL 인젝션에 안전하다(문자열
 * 이어붙이기로 쿼리를 만들지 않는다).
 *
 * 모듈 로드 시점에 바로 연결을 시도하지 않고 첫 호출 때 생성해 캐싱한다
 * (lazy init) — 환경변수가 없는 경로(예: 빌드 타임에 이 파일이 우연히
 * 평가되는 경우)에서 앱 전체가 즉시 죽는 것을 피하기 위해서다.
 */
let cachedSql: NeonQueryFunction<false, false> | null = null;

export function getSql(): NeonQueryFunction<false, false> {
  if (cachedSql) return cachedSql;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL이 설정되어 있지 않습니다. Vercel의 Neon 연동(Storage 탭)을 확인하세요."
    );
  }
  // [버그 수정, 2026-09] Toss 결제 E2E 검증 중 발견 — neon()이 내부적으로
  // 쓰는 fetch() 호출이 Next.js의 기본 fetch 캐시(Data Cache)에 걸려, 결제
  // 전에 조회된 "PAID 아님" 결과가 실제 결제 완료 후에도 계속 재사용되는
  // 문제가 있었다(App Router 라우트 단위 `force-dynamic`만으로는 이 앱의
  // 모든 DB 호출 경로를 다 못 막는 것으로 실측 확인됨 — 서버 프로세스가
  // 살아있는 동안 새 reportId마다 계속 재현됨). fetchOptions는 neon()이
  // fetch()에 전달하는 옵션에 그대로 병합되는 공식 지원 옵션(타입:
  // HTTPTransactionOptions.fetchOptions)이라, 여기서 `cache: "no-store"`를
  // 강제해 이 앱의 모든 DB 쿼리가 항상 최신 상태를 읽도록 한다 — 쿼리
  // 내용/트랜잭션/재시도 로직은 전혀 바뀌지 않는다.
  cachedSql = neon(url, { fetchOptions: { cache: "no-store" } });
  return cachedSql;
}
