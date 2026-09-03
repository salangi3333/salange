/**
 * 법적 문서(개인정보처리방침/이용약관/환불정책) 초안에서 아직 사업자가
 * 확정하지 않은 값을 표시하는 마커. 실제 서비스에 이 페이지를 그대로
 * 올려도 눈에 띄게 "확정 필요"임을 알 수 있도록 시각적으로 구분한다.
 *
 * 절대 임의의 값(추측한 보유기간, 존재하지 않는 보안조치 등)을 채워 넣지
 * 않는다 — 이 컴포넌트로 감싸서 TODO 상태 그대로 남겨둔다.
 */
export default function Todo({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-accentGoldFrom/20 px-1.5 py-0.5 font-semibold text-accentRed">
      [TODO: {children}]
    </span>
  );
}
