import { redirect } from "next/navigation";
import { hasValidAdminSession } from "@/lib/adminSession";
import AdminOrderForm from "@/components/admin/AdminOrderForm";

/**
 * 관리자 수동 주문 등록 화면 — middleware.ts 없이, 이 서버 컴포넌트
 * 자신이 세션을 확인한다(승인된 설계 그대로: 각 진입점이 각자 검증).
 * 세션이 없거나 만료됐으면 /admin/login으로 redirect.
 */
export default async function AdminPage() {
  const authenticated = await hasValidAdminSession();
  if (!authenticated) {
    redirect("/admin/login");
  }

  return (
    <section className="mx-auto min-h-screen max-w-content px-6 py-10">
      <h1 className="mb-6 text-xl font-bold text-textMain">관리자 수동 주문 등록</h1>
      <AdminOrderForm />
    </section>
  );
}
