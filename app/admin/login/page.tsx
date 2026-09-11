import { redirect } from "next/navigation";
import { hasValidAdminSession } from "@/lib/adminSession";
import AdminLoginForm from "@/components/admin/AdminLoginForm";

/**
 * 서버 컴포넌트 — 이미 유효한 관리자 세션이 있으면 로그인 폼을 다시
 * 보여주지 않고 바로 /admin으로 redirect한다(app/admin/page.tsx와 동일한
 * lib/adminSession.ts의 hasValidAdminSession()을 재사용, 검증 로직 복제 없음).
 * 세션이 없거나 잘못됐거나 만료됐으면(=hasValidAdminSession()이 false를
 * 반환하는 모든 경우, fail-closed) 기존 로그인 폼을 그대로 보여준다.
 */
export default async function AdminLoginPage() {
  const authenticated = await hasValidAdminSession();
  if (authenticated) {
    redirect("/admin");
  }
  return <AdminLoginForm />;
}
