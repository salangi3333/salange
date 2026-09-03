import type { Metadata } from "next";
import Todo from "@/components/legal/Todo";
import Footer from "@/components/Footer";

/**
 * 환불·청약철회 정책 — 출시 전 개인정보·보안·이용약관 통합 작업(2026-09).
 *
 * TossPayments가 아직 연결되지 않았으므로 존재하지 않는 결제 절차(승인/취소
 * API 흐름 등)를 사실처럼 적지 않는다. 이 페이지는 결제 도입 "전"에 이용자가
 * 미리 확인할 수 있는 정책의 뼈대이며, 기간·조건 등 법적으로 최종 확인이
 * 필요한 수치는 <Todo>로 남긴다.
 */

export const metadata: Metadata = {
  title: "환불정책 | 팔자문",
  description: "팔자문 유료 리포트의 청약철회·취소·환불에 관한 안내입니다.",
  alternates: { canonical: "/refund" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 first:mt-0">
      <h2 className="font-serif-kr text-lg font-bold text-textMain">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-[1.9] text-textSub">{children}</div>
    </section>
  );
}

export default function RefundPage() {
  return (
    <main className="mx-auto min-h-screen max-w-content px-6 py-16">
      <p className="text-sm text-textSub">시행일: <Todo>서비스 오픈일 확정 후 기재</Todo></p>
      <h1 className="mt-2 font-serif-kr text-2xl font-bold text-textMain">환불정책</h1>
      <p className="mt-4 text-[15px] leading-[1.9] text-textSub">
        현재 팔자문은 결제 기능(TossPayments)이 아직 연동되지 않았습니다. 이
        페이지는 결제 기능을 열기 전에 이용자가 미리 확인할 수 있도록 정책의
        기본 구조만 정리한 것이며, 실제 결제 절차와 함께 최종 확정됩니다.
      </p>

      <Section title="주문 취소 및 결제 취소">
        <p>
          <Todo>
            결제 완료 전(주문 단계)에는 언제든지 취소할 수 있도록 할 예정입니다.
            결제 승인 이후 취소 가능 시점과 절차는 TossPayments 연동 후
            확정합니다.
          </Todo>
        </p>
      </Section>

      <Section title="콘텐츠 제공 개시 전 청약철회">
        <p>
          유료 리포트가 실제로 생성·제공되기 전(청약철회 가능 기간 내)에는 관계
          법령에 따라 청약을 철회하고 환불받을 수 있습니다.
        </p>
      </Section>

      <Section title="콘텐츠 제공 개시 후 청약철회 제한">
        <p>
          팔자문의 유료 리포트는 이용자가 입력한 정보에 따라 즉시 개인화되어
          생성되는 디지털 콘텐츠의 특성을 가집니다. 「전자상거래 등에서의
          소비자보호에 관한 법률」은 이용자에게 사실을 고지하고 동의를 받은
          경우 등 일정 조건 하에서 디지털 콘텐츠 제공 개시 후의 청약철회를
          제한할 수 있도록 하고 있습니다.
        </p>
        <p>
          <Todo>
            팔자문에 적용할 구체적인 제한 조건·고지 방법·동의 절차는 법률
            자문 및 TossPayments 연동 이후 최종 확정합니다. 확정 전까지는
            "제공 개시 후 무조건 환불 불가" 등 확정되지 않은 내용을 적용하지
            않습니다.
          </Todo>
        </p>
      </Section>

      <Section title="서비스 오류·중복결제·미제공에 따른 환불">
        <ul className="list-disc space-y-1 pl-5">
          <li>서비스 오류로 인해 정상적으로 리포트가 제공되지 않은 경우</li>
          <li>동일 건에 대해 결제가 중복으로 이루어진 경우</li>
          <li>결제가 완료되었으나 콘텐츠가 제공되지 않은 경우</li>
          <li>그 밖에 회사의 귀책사유로 인해 정상적인 서비스 이용이 불가능했던 경우</li>
        </ul>
        <p>위 사유가 확인되는 경우 회사는 결제 금액 전액을 환불합니다.</p>
        <p>
          <Todo>환불 처리 소요기간(영업일 기준)은 결제대행사 연동 후 확정합니다.</Todo>
        </p>
      </Section>

      <Section title="환불 처리 방법 및 고객센터 접수">
        <p>
          환불이 필요한 경우 <Todo>고객센터 이메일/연락처</Todo>로 결제 정보와
          함께 문의해주시면 확인 후 안내해드립니다.
        </p>
      </Section>

      <Footer />
    </main>
  );
}
