import ResultV2Flow from "@/components/ResultV2Flow";

/**
 * [2026-09] Toss 가맹점 심사 준비 감사에서 발견 — 이 루트(`/`)가 예전
 * 프로토타입(ResultLanding + data/sample.ts, 19,900원/89,000원 취소선/
 * 77% 할인/누적 8,362건/샘플 결제후기/"약 100장" 문구, Footer·사업자정보
 * 없음)을 그대로 서비스하고 있었다 — 실제 판매 가격(29,800원)·Footer·
 * 법정 페이지 링크가 전부 갖춰진 정상 흐름은 `/result-v2`에 있었는데
 * 루트가 거기로 연결되지 않아, 첫 방문자(심사자 포함)가 구버전만 보는
 * 상태였다.
 *
 * 최소 수정: 이 파일 자체의 state machine과 ResultLanding 렌더링을 걷어내고,
 * `/result-v2`가 쿼리 없이 접속됐을 때 쓰는 것과 완전히 동일한 컴포넌트
 * (ResultV2Flow — intro→form→analyzing→confirm까지 자체 처리, 확정 시
 * POST /api/reports로 reportId 발급 후 /result-v2/{reportId}로 이동)를
 * 그대로 재사용한다. 새 로직 없음, 리다이렉트도 아님 — 이미 검증된
 * 컴포넌트를 그대로 옮겨 쓰는 것뿐이다.
 *
 * 지시에 따라 ResultLanding.tsx/data/sample.ts/OnboardingIntro.tsx/
 * AnalyzingScreen.tsx 등은 삭제하지 않는다 — 이 파일에서 참조만 없앤다
 * (production 사용자 흐름에서 분리, 파일 자체는 보존).
 */
export default function Home() {
  return <ResultV2Flow />;
}
