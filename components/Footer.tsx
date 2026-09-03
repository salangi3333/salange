import Link from "next/link";

/**
 * 사이트 공통 Footer — 출시 전 개인정보·보안·이용약관 통합 작업(2026-09).
 *
 * 기존 화면(온보딩/입력/분석/결과) 디자인을 해치지 않도록, 전면 화면형
 * 컴포넌트(OnboardingIntroV2 등)에는 넣지 않고 콘텐츠가 끝나는 지점(결과
 * 페이지 하단, 법적 문서 페이지 하단)에만 작게 붙인다.
 *
 * 사업자정보 노출 범위(2026-09-02 확정) — "팔자문"은 서비스 브랜드,
 * "코다온"은 사업자등록증상의 운영 사업자다. 아래 4개 항목은 2026-09-02
 * 사업자등록증(정정)으로 확정되어 실제로 표시한다: 상호(코다온), 대표자
 * (홍지영), 사업자등록번호(447-33-01278), 사업장 소재지(서울특별시
 * 성동구 독서당로 166, 1동 202호, 옥수동).
 *
 * 통신판매업 신고번호와 고객센터 연락처(이메일/전화번호)는 아직 확정되지
 * 않았다(통신판매업 신고 진행 중) — 확정되지 않은 값을 임의로 만들거나
 * TODO/미정 형태로도 화면에 노출하지 않는다는 방침에 따라, 그 두 항목은
 * 이 컴포넌트에 아예 존재하지 않는다. 나중에 확정되면 아래 사업자정보
 * 문단에 해당 줄을 추가하면 된다.
 *
 * variant — 밝은 배경(법적 문서 페이지 등)과 ResultLandingV2의 어두운
 * "scene" 배경은 색 토큰 체계가 서로 다르다(tailwind.config.js 참고).
 * 배경에 안 맞는 텍스트 색을 쓰면 대비가 낮아져 안 보이므로, 배치되는
 * 화면에 맞는 토큰을 고르게 했다. 새 색상을 추가하지 않고 기존 두
 * 팔레트(textSub/sceneTextSub 등)만 그대로 재사용한다.
 */
export default function Footer({ variant = "light" }: { variant?: "light" | "dark" }) {
  const isDark = variant === "dark";
  return (
    <footer
      className={`mx-auto mt-16 w-full max-w-content border-t px-6 py-8 text-center text-xs sm:text-left ${
        isDark ? "border-white/10 text-sceneTextSub" : "border-bg text-textSub"
      }`}
    >
      <nav className="flex flex-wrap justify-center gap-x-4 gap-y-2 sm:justify-start">
        <Link href="/terms" className="underline-offset-2 hover:underline">
          이용약관
        </Link>
        <Link href="/privacy" className="underline-offset-2 hover:underline">
          개인정보처리방침
        </Link>
        <Link href="/refund" className="underline-offset-2 hover:underline">
          환불정책
        </Link>
      </nav>

      {/* 사업자 정보 — 확정된 4개 항목만 표시한다. 통신판매업 신고번호·
          고객센터 연락처는 확정되는 대로 이 문단에 줄을 추가한다. */}
      <p className="mt-4 leading-relaxed">
        상호: 코다온 · 대표자: 홍지영 · 사업자등록번호: 447-33-01278
        <br />
        사업장 주소: 서울특별시 성동구 독서당로 166, 1동 202호(옥수동)
      </p>
    </footer>
  );
}
