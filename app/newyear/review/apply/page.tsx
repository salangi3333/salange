import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";
import NewYearReviewApply from "@/components/newyear/NewYearReviewApply";
import { REVIEW_PATHS } from "@/lib/commerce/newyearReviewPay";
import { reviewGate } from "../_gate";
import { NEWYEAR_TERMS_DRAFT } from "@/lib/commerce/newyearTermsDraft";

/**
 * 토스 심사용 구매 경로 2단계: 신청 단계. 상품 안내·환불 안내·가상 인물 예시를 보여 주고, 심사 테스트 전용 필수 안내 2개를 확인하면 다음으로 간다.
 * 서버 저장·주문 생성·개인정보 입력이 없다. 실제 신청서(/newyear)·개인정보 동의 문구·약관 문서는 건드리지 않는다(약관 조문은 읽어서 보여 주기만 한다).
 */
export const metadata: Metadata = { title: "2027 신년운세 신청 | 팔자문", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function NewYearReviewApplyPage() {
  const g = reviewGate(); // 서버 측 접근 검사(인증된 세션이 아니면 코드 입력 화면으로 보냄)
  if (g.state === "closed") return <main className="mx-auto min-h-screen max-w-content px-6 py-16"><p className="rounded-card border border-accentGoldTo/60 bg-accentGoldFrom/20 p-4 text-sm font-bold text-textMain" data-testid="nyrev-closed">이 화면은 열려 있지 않습니다.</p></main>;
  const cfg = g.cfg;
  const priceText = `${cfg.amount.toLocaleString("ko-KR")}원`;
  const lines = [
    "상품: 팔자문 2027 신년운세 — 개인 맞춤 신년운세 5장(PDF)",
    `가격: ${priceText}`,
    "제공 방식: 입력하신 이메일로 PDF를 보내 드립니다. 쪽수는 고객별로 달라지며 일정한 쪽수를 보장하지 않습니다(지금까지 제작해 본 시험본은 43~49쪽).",
    "제작 기한: 결제 및 필수 정보 입력 완료 후 최대 48시간 이내에 보내 드립니다. 주말·공휴일도 포함됩니다.",
    "취소·환불: PDF를 보내기 전에는 제작이 시작되었어도 전액 환불됩니다. PDF 제공 후에는 법령이 정한 요건을 갖춘 경우 단순 변심에 의한 청약철회가 제한될 수 있으며(아래 3번 안내), 발송·파일 오류나 계약과 다른 제공은 재발송·재제작·환불을 받으실 수 있습니다.",
    "제작 시작 전에는 입력 정보의 오류를 무료로 정정할 수 있습니다.",
  ];
  return (
    <main className="mx-auto min-h-screen max-w-content px-6 py-16" data-testid="nyrev-apply">
      <h1 className="font-serif-kr text-2xl font-bold text-textMain">2027 신년운세 신청</h1>
      <p className="mt-2 text-sm text-textSub">입력하신 정보로 한 사람만을 위해 제작하는 개인 맞춤 신년운세입니다. <Link className="underline" href={REVIEW_PATHS.product}>상품 안내로 돌아가기</Link></p>
      <p className="mt-4 rounded-box border border-accentRed/40 bg-white p-3 text-xs leading-relaxed text-accentRed" data-testid="nyrev-banner">
        토스페이먼츠 심사용 테스트 경로입니다. 결제창까지 확인하며, 실제 청구·주문 접수·PDF 제작·이메일 발송은 일어나지 않습니다. 개인정보를 입력하지 마세요(예시 값만 표시됩니다).
      </p>
      <div className="mt-8"><NewYearReviewApply priceText={priceText} productLines={lines} sections={NEWYEAR_TERMS_DRAFT.sections.map((s) => ({ title: s.title, body: [...s.body] }))} /></div>
      <Footer scope="newyear" />
    </main>
  );
}
