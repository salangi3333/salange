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
 * [2026-09-04] 주소를 "독서당로 166"까지만 줄여 표시하자는 요청이 있었으나,
 * 전자상거래법상 통신판매업자 정보 고시는 통상 사업자등록증/통신판매업
 * 신고증 기재 주소와 동일하게 표시해야 안전하다는 점이 확인되지 않아
 * 보류하고 전체 주소로 되돌렸다. 줄여도 되는지는 법률 자문/관할 기관
 * 확인 후 결정할 것 — 임의로 다시 줄이지 말 것.
 *
 * 고객센터 연락처(전화·이메일)는 2026-09-07 확정되어 아래 사업자정보
 * 문단에 표시한다. 통신판매업 신고번호는 2026-09-08 통신판매업신고증
 * 원본(성동구청 발급, 제2022-서울성동-02502호) 확인 후 추가했다 — 사용자가
 * 문서 사진으로 직접 제공한 값 그대로이며, 임의로 만든 값이 아니다.
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

      {/* 사업자 정보 — 확정된 항목만 표시한다. */}
      <p className="mt-4 leading-relaxed">
        상호: 코다온 · 대표자: 홍지영 · 사업자등록번호: 447-33-01278
        <br />
        통신판매업 신고번호: 제2022-서울성동-02502호
        <br />
        사업장 주소: 서울특별시 성동구 독서당로 166, 1동 202호(옥수동)
        <br />
        고객센터: 010-8315-3338 · jrina5632@naver.com
      </p>
    </footer>
  );
}
