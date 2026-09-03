import type { Metadata } from "next";
import Link from "next/link";
import Todo from "@/components/legal/Todo";
import Footer from "@/components/Footer";

/**
 * 이용약관 — 출시 전 개인정보·보안·이용약관 통합 작업(2026-09).
 *
 * 천기문(cheongimun.com)의 이용약관 "구조"(조 순서, 누락 방지용 체크리스트)만
 * 참고했고 문장은 새로 썼다. 팔자문에 실제로 존재하지 않는 기능(회원가입,
 * 카카오 로그인, 마이페이지, 구독, 인앱결제, 가상재화 등)은 언급하지 않는다.
 * 아직 TossPayments가 연결되지 않았으므로 결제/환불 관련 세부 조항은 구조만
 * 만들고 확정되지 않은 부분은 <Todo>로 남긴다.
 */

export const metadata: Metadata = {
  title: "이용약관 | 팔자문",
  description: "팔자문 서비스 이용에 관한 약관입니다.",
  alternates: { canonical: "/terms" },
};

function Article({
  no,
  title,
  children,
}: {
  no: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10 first:mt-0">
      <h2 className="font-serif-kr text-lg font-bold text-textMain">
        {no} ({title})
      </h2>
      <div className="mt-3 space-y-3 text-[15px] leading-[1.9] text-textSub">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-content px-6 py-16">
      <p className="text-sm text-textSub">시행일: <Todo>서비스 오픈일 확정 후 기재</Todo></p>
      <h1 className="mt-2 font-serif-kr text-2xl font-bold text-textMain">이용약관</h1>

      <Article no="제1조" title="목적">
        <p>
          이 약관은 코다온(이하 "회사")이 제공하는 팔자문
          서비스(이하 "서비스")의 이용과 관련하여 회사와 이용자 간의 권리·의무 및
          책임사항을 규정함을 목적으로 합니다.
        </p>
      </Article>

      <Article no="제2조" title="정의">
        <ul className="list-disc space-y-1 pl-5">
          <li>"서비스"란 회사가 제공하는 사주 계산 및 팔자문 리포트 관련 일체의 서비스를 의미합니다.</li>
          <li>"이용자"란 이 약관에 따라 서비스를 이용하는 자를 의미합니다. (현재 회원가입 절차는 없습니다.)</li>
          <li>"무료 콘텐츠"란 결제 없이 확인할 수 있는 리포트 구성 부분을 의미합니다.</li>
          <li>"유료 개인화 리포트"란 결제 후 제공되는 리포트의 확장 구성 부분을 의미합니다.</li>
          <li>"디지털 콘텐츠"란 이용자가 입력한 정보를 바탕으로 생성되는, 형체가 없는 형태로 제공되는 리포트 콘텐츠를 의미합니다.</li>
        </ul>
      </Article>

      <Article no="제3조" title="약관의 게시 및 변경">
        <p>회사는 이 약관의 내용을 이용자가 쉽게 확인할 수 있도록 서비스 화면 또는 연결된 화면에 게시합니다.</p>
        <p>회사는 관련 법령을 위반하지 않는 범위에서 약관을 개정할 수 있으며, 개정 시 적용일자와 개정사유를 명시하여 사전에 공지합니다.</p>
      </Article>

      <Article no="제4조" title="서비스의 내용">
        <ul className="list-disc space-y-1 pl-5">
          <li>이용자가 입력한 생년월일시·성별 정보를 이용한 사주(명리) 계산</li>
          <li>계산 결과를 바탕으로 한 개인화된 사주·운세 해석 리포트 제공</li>
          <li>무료로 제공되는 리포트 구성 부분</li>
          <li>결제 후 제공 예정인 유료 전체 인생 리포트 <Todo>(TossPayments 연동 전이므로 현재는 제공되지 않음)</Todo></li>
        </ul>
      </Article>

      <Article no="제5조" title="사주·명리 콘텐츠의 성격 및 한계">
        <ul className="list-disc space-y-1 pl-5">
          <li>본 서비스가 제공하는 콘텐츠는 전통 명리학을 기반으로 제공되는 참고용 정보입니다.</li>
          <li>서비스는 미래의 특정 사건이나 결과를 보장하지 않습니다.</li>
          <li>동일한 명리 정보라도 해석 방법과 관점에 따라 표현에 차이가 있을 수 있습니다.</li>
          <li>서비스가 제공하는 결과는 이용자의 중요한 인생 결정을 대신하지 않습니다.</li>
        </ul>
      </Article>

      <Article no="제6조" title="전문서비스 비대체">
        <p>
          팔자문은 의료·법률·투자·재무·심리치료 등 관계 법령에 따라 자격을 갖춘
          전문가의 상담을 대신하지 않습니다. 이용자는 건강, 법률, 재무 등과 관련한
          중요한 결정을 내리기 전에 반드시 해당 분야의 전문가와 상의해야 합니다.
          다만 이 조항이 관계 법령상 이용자(소비자)에게 인정되는 권리를 배제하지는
          않습니다.
        </p>
      </Article>

      <Article no="제7조" title="이용자 입력정보의 정확성">
        <p>
          이용자가 입력한 생년월일, 출생시간, 성별, 양력/음력 구분, 윤달 여부 등의
          정보가 실제와 다를 경우 계산 및 해석 결과가 달라질 수 있습니다. 회사는
          이용자가 입력한 정보를 사실로 전제하여 서비스를 제공하며, 이용자가 입력한
          정보의 오류로 인해 발생한 결과 차이에 대해서는 합리적인 범위에서 책임을
          제한할 수 있습니다. 다만 회사의 고의 또는 중대한 과실로 인한 손해에는
          이 조항이 적용되지 않습니다.
        </p>
      </Article>

      <Article no="제8조" title="유료 서비스 및 결제">
        <p>현재 확정된 유료 리포트 판매가격은 29,800원입니다.</p>
        <p>
          <Todo>
            결제수단, 결제대행사(PG) 연동 세부사항은 TossPayments 결제 기능
            구현 후 확정하여 반영합니다. 현재는 실제 결제 기능이 제공되지
            않습니다.
          </Todo>
        </p>
      </Article>

      <Article no="제9조" title="디지털 콘텐츠 제공">
        <p>
          유료 리포트는 이용자가 입력한 생년월일시·성별 정보에 따라 개인화되어
          생성·제공되는 디지털 콘텐츠입니다.
        </p>
        <p>
          <Todo>
            실제 제공 개시 시점 및 "결제 완료"로 보는 기준은 TossPayments
            연동 이후 확정합니다.
          </Todo>
        </p>
      </Article>

      <Article no="제10조" title="청약철회·취소·환불">
        <p>
          유료 서비스의 청약철회, 취소, 환불에 관한 사항은{" "}
          <Link href="/refund" className="underline underline-offset-2">
            환불정책(/refund)
          </Link>
          을 따릅니다. 결제 후 어떠한 경우에도 환불이 불가능하다는 취지의 조항은
          두지 않으며, 「전자상거래 등에서의 소비자보호에 관한 법률」 등 관계
          법령에 따른 소비자의 권리를 보장합니다.
        </p>
        <p>
          <Todo>
            디지털 콘텐츠 제공 개시 후 청약철회가 제한되는 구체적 조건과 절차는
            TossPayments 연동 및 법률 자문 이후 최종 확정합니다.
          </Todo>
        </p>
      </Article>

      <Article no="제11조" title="서비스 제공 및 중단">
        <p>
          회사는 서버 점검, 통신장애, 외부 인프라(호스팅·데이터베이스 등) 장애,
          천재지변 등 불가항력적 사유로 서비스 제공을 일시 중단할 수 있으며, 이
          경우 가능한 한 사전에 공지합니다. 다만 회사의 고의 또는 중대한 과실로
          인한 서비스 중단에 대해서는 관계 법령에 따라 책임을 집니다.
        </p>
      </Article>

      <Article no="제12조" title="개인정보 보호">
        <p>
          회사는 이용자의 개인정보를 관계 법령에 따라 보호하며, 자세한 내용은{" "}
          <Link href="/privacy" className="underline underline-offset-2">
            개인정보처리방침(/privacy)
          </Link>
          에서 확인할 수 있습니다.
        </p>
      </Article>

      <Article no="제13조" title="이용자의 의무">
        <p>이용자는 다음 각 호의 행위를 해서는 안 됩니다.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>타인의 개인정보를 본인 동의 없이 무단으로 입력하거나 도용하는 행위</li>
          <li>서비스의 정상적인 운영을 방해하거나 공격하는 행위</li>
          <li>비정상적인 방법으로 서비스에 접근하는 행위</li>
          <li>서비스가 제공하는 콘텐츠를 무단으로 복제·재판매하는 행위</li>
          <li>관계 법령을 위반하는 행위</li>
        </ul>
      </Article>

      <Article no="제14조" title="콘텐츠 및 저작권">
        <p>
          회사가 직접 제작한 해석 문장, 리포트 구성, 디자인, 이미지, 그래프,
          프로그램 등에 대한 권리는 회사에 귀속됩니다. 이용자는 본인이 결제하거나
          발급받은 리포트를 개인적으로 열람·보관할 수 있으나, 회사의 사전 동의
          없이 이를 복제·재판매·상업적으로 이용하거나 대량으로 수집하는 행위는
          제한됩니다.
        </p>
        <p className="text-xs">
          다만 일반적인 명리학 이론이나 법적으로 보호되지 않는 아이디어 자체에
          대한 독점적 권리를 주장하지는 않습니다.
        </p>
      </Article>

      <Article no="제15조" title="책임의 제한">
        <p>
          회사는 사주·운세 콘텐츠가 미래의 결과를 보장하지 않는다는 서비스 성격상의
          한계와, 시스템 장애 등 서비스 운영상의 문제로 인한 책임을 구분하여
          부담합니다. 이 조항은 관계 법령상 소비자에게 인정되는 권리를 전면적으로
          배제하지 않습니다.
        </p>
      </Article>

      <Article no="제16조" title="분쟁 해결">
        <p>
          이 약관과 관련하여 회사와 이용자 간에 분쟁이 발생한 경우, 양 당사자는
          우선 원만한 해결을 위해 성실히 협의합니다. 협의가 이루어지지 않아 소송이
          제기되는 경우 대한민국 관계 법령 및 「민사소송법」에 따른 관할 법원에
          제기합니다.
        </p>
      </Article>

      <Footer />
    </main>
  );
}
