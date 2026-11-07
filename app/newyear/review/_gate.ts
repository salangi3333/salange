import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { REVIEW_ACCESS_PATH, REVIEW_COOKIE, reviewGateDecision, type ReviewGateResult } from "@/lib/commerce/newyearReviewAccess";

/**
 * 심사용 화면의 서버 측 접근 검사. 심사용 5개 화면(상품·신청·주문금액 확인·완료·실패)이 렌더링 맨 처음에 부른다.
 *  - closed: 스위치·전용 테스트 키·접속 코드 중 하나라도 없음 → 호출한 화면이 닫힘 안내만 보여 준다.
 *  - 세션 없음/만료/위조: 접속 코드 입력 화면으로 보낸다(redirect). 화면 내용은 렌더링되지 않는다.
 *  - ok: 설정(공개 가능한 값만)을 돌려준다.
 * 브라우저 쪽 검사에 의존하지 않는다: 쿠키는 HttpOnly 이고 서명은 서버만 검증한다.
 */
export function reviewGate(): Exclude<ReviewGateResult, { state: "login" }> {
  const g = reviewGateDecision(process.env, cookies().get(REVIEW_COOKIE)?.value);
  if (g.state === "login") redirect(REVIEW_ACCESS_PATH);
  return g as Exclude<ReviewGateResult, { state: "login" }>;
}
