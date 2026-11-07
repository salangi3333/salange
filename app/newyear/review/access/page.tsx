import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { REVIEW_COOKIE, reviewGateDecision } from "@/lib/commerce/newyearReviewAccess";
import { REVIEW_PATHS } from "@/lib/commerce/newyearReviewPay";

/**
 * 토스 심사용 화면의 접속 코드 입력 화면. 심사 담당자에게 따로 전달한 코드를 입력받아 서버(/api/newyear/review/access)로 POST 한다.
 * 코드는 주소(쿼리)에 실리지 않는다(method=post). 열려 있지 않으면 닫힘 안내만, 이미 인증된 세션이면 상품 화면으로 보낸다. 서버가 판정하며 검색에 노출하지 않는다.
 */
export const metadata: Metadata = { title: "접속 확인 | 팔자문", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function NewYearReviewAccessPage({ searchParams }: { searchParams: { [k: string]: string | string[] | undefined } }) {
  const g = reviewGateDecision(process.env, cookies().get(REVIEW_COOKIE)?.value);
  if (g.state === "ok") redirect(REVIEW_PATHS.product);
  if (g.state === "closed") return <main className="mx-auto min-h-screen max-w-content px-6 py-16"><p className="rounded-card border border-accentGoldTo/60 bg-accentGoldFrom/20 p-4 text-sm font-bold text-textMain" data-testid="nyrev-closed">이 화면은 열려 있지 않습니다.</p></main>;
  const e = typeof searchParams.e === "string" ? searchParams.e : "";
  return (
    <main className="mx-auto flex min-h-screen max-w-content flex-col justify-center gap-4 px-6 py-16" data-testid="nyrev-access">
      <h1 className="font-serif-kr text-2xl font-bold text-textMain">접속 확인</h1>
      <p className="text-sm text-textSub">토스페이먼츠 심사 담당자께 따로 전달드린 접속 코드를 입력해 주세요.</p>
      {e === "1" && <p className="rounded-box border border-accentRed/40 bg-white p-3 text-xs text-accentRed" role="alert" data-testid="nyrev-access-error">접속 코드가 올바르지 않습니다.</p>}
      {e === "2" && <p className="rounded-box border border-accentRed/40 bg-white p-3 text-xs text-accentRed" role="alert" data-testid="nyrev-access-error">시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.</p>}
      <form method="post" action="/api/newyear/review/access" className="flex flex-col gap-3">
        <label htmlFor="nyrev-code" className="text-sm font-medium text-textMain">접속 코드</label>
        <input id="nyrev-code" name="code" type="password" autoComplete="off" required maxLength={128} className="w-full rounded-box border bg-bg/50 px-4 py-3 text-sm text-textMain outline-none focus:border-accentGoldTo" />
        <button type="submit" className="w-full rounded-pill bg-gradient-to-r from-accentGoldFrom to-accentGoldTo py-3 text-sm font-bold text-dark" data-testid="nyrev-access-submit">확인</button>
      </form>
    </main>
  );
}
