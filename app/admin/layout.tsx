import type { Metadata } from "next";

/** /admin, /admin/login 전체에 적용 — 결제 페이지들과 동일한 관례
 * (app/payment/success/page.tsx 참고)로 색인을 막는다. 이 파일은 레이아웃
 * 뼈대만 제공할 뿐 세션 검증은 하지 않는다(그건 app/admin/page.tsx 자체가
 * 서버 컴포넌트로 직접 확인 — middleware.ts를 쓰지 않기로 한 설계 그대로). */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
