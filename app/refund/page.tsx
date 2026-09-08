import type { Metadata } from "next";
import Footer from "@/components/Footer";

/**
 * 환불·청약철회 정책 — 2026-09 Toss 가맹점 심사 준비 감사 중 확정.
 *
 * 경쟁사 천기문(cheongimun.com)의 "숫자·운영 기준"(제공 개시 후 청약철회
 * 제한, 처리기간 등)만 참고했고 문구는 전부 팔자문 문장으로 새로 썼다 —
 * 천기문 원문을 그대로 옮기지 않았다.
 *
 * 원칙: 「전자상거래 등에서의 소비자보호에 관한 법률」 제17조 제2항에 따라
 * 디지털 콘텐츠는 이용자에게 사전 고지하고 동의를 받으면 제공 개시 후
 * 청약철회를 제한할 수 있다 — 그 사전 고지는 ConfirmInfoScreen.tsx(결제
 * 전 동의 화면)에 반영되어 있다. "제공 개시 후 무조건 환불 불가"가 아니라,
 * 회사 재량에 의한 환불(제4조)까지 함께 두어 과도하게 경직되지 않게 한다.
 *
 * 시행일은 "서비스 정식 오픈일에 시행"으로 표기하고, 구체적 날짜는 그때 확정한다.
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
      <p className="text-sm text-textSub">시행일: 서비스 정식 오픈일에 시행됩니다.</p>
      <h1 className="mt-2 font-serif-kr text-2xl font-bold text-textMain">환불정책</h1>

      <Section title="제1조 (청약철회의 원칙과 제한)">
        <p>
          이용자는 관계 법령이 정하는 바에 따라 청약을 철회할 권리가 있습니다.
          다만 팔자문의 유료 리포트는 이용자가 입력한 생년월일시 등의 정보에
          따라 그 자리에서 개인화되어 생성되는 디지털 콘텐츠이며, 「전자상거래
          등에서의 소비자보호에 관한 법률」 제17조 제2항 등 관계 법령은 이용자에게
          사실을 미리 고지하고 동의를 받은 경우 콘텐츠 제공 개시 이후의
          청약철회를 제한할 수 있도록 하고 있습니다. 팔자문은 결제가 이루어지기
          전, 리포트 생성에 동의하는 화면에서 이 내용을 이용자에게 미리
          안내합니다.
        </p>
      </Section>

      <Section title="제2조 (환불이 가능한 경우)">
        <ul className="list-disc space-y-1 pl-5">
          <li>결제일로부터 7일 이내이며, 아직 리포트가 제공되지 않은 경우</li>
          <li>
            시스템 오류 등 서비스의 하자로 인해 리포트를 정상적으로 받아볼 수
            없는 경우
          </li>
        </ul>
        <p>위 사유가 확인되는 경우 회사는 결제 금액 전액을 환불합니다.</p>
      </Section>

      <Section title="제3조 (청약철회가 제한되는 경우)">
        <p>
          리포트가 정상적으로 생성되어 이용자에게 제공된 이후에는, 제2조에
          해당하는 경우를 제외하고 청약철회 및 환불이 제한됩니다. 이는
          이용자 한 사람만을 위해 즉시 생성되는 디지털 콘텐츠의 특성과 위
          제1조에 따른 것입니다.
        </p>
      </Section>

      <Section title="제4조 (회사의 재량에 의한 환불)">
        <p>
          제2조·제3조에 명시적으로 해당하지 않는 경우라도, 개별 사정을 고려하여
          회사가 필요하다고 판단하는 때에는 결제 금액의 전부 또는 일부를 환불할
          수 있습니다. 이는 이용자의 권리로서 보장되는 환불이 아니라 회사의
          재량에 따른 것이며, 특정 사례에 대한 환불이 이후 동일하거나 유사한
          사례에 대한 환불을 보장하지 않습니다.
        </p>
      </Section>

      <Section title="제5조 (환불 방법 및 처리기간)">
        <ul className="list-disc space-y-1 pl-5">
          <li>환불 요청을 접수한 날로부터 영업일 기준 3일 이내에 검토 결과를 안내합니다.</li>
          <li>환불이 승인되면 영업일 기준 3~5일 이내에 결제하신 수단으로 환불을 처리합니다.</li>
          <li>
            카드사·결제수단에 따라 실제 환불(승인 취소) 내역이 카드 명세서 등에
            반영되는 시점은 위 처리기간과 다를 수 있습니다.
          </li>
        </ul>
      </Section>

      <Section title="제6조 (문의 및 접수방법)">
        <p>
          환불이 필요한 경우 아래 고객센터로 결제 정보와 함께 문의해주시면
          확인 후 안내해드립니다.
        </p>
        <p>전화: 010-8315-3338</p>
        <p>이메일: jrina5632@naver.com</p>
      </Section>

      <Footer />
    </main>
  );
}
