import ResultLandingV2 from "@/components/ResultLandingV2";

/**
 * 기존 gate → form → analyzing → result 흐름과 완전히 분리된 새 경로.
 * 오늘 범위(스켈레톤)는 실제 입력값/계산 결과를 받지 않고 더미 콘텐츠로
 * 페이지 높이와 스크롤 성능만 확인한다. app/page.tsx 등 기존 라우트는
 * 이 파일 추가로 인해 전혀 변경되지 않는다.
 */
export default function ResultV2Page() {
  return <ResultLandingV2 />;
}
