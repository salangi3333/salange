import type { Metadata } from "next";
import Todo from "@/components/legal/Todo";
import Footer from "@/components/Footer";

/**
 * 개인정보처리방침 — 2026-09 출시 전 개인정보·보안·이용약관 통합 작업.
 *
 * 이 문서는 실제 코드 감사(사주풀이 프로젝트, 2026-08~09)에서 확인된 사실만
 * 기재한다. 확인되지 않은 보안조치, 임의로 정한 보유기간, 존재하지 않는
 * 회원/앱/구독/가상재화/외부 AI 사용 등은 절대 적지 않는다 — 그런 항목은
 * <Todo>로 남겨 사업자가 직접 확정하게 한다.
 *
 * 참고만 하고 문장을 복사하지 않은 대상: 천기문(cheongimun.com)의 처리방침
 * 구조(제 몇 조 순서, 누락 방지용 체크리스트) — 실제 문장/수치는 새로 썼다.
 */

export const metadata: Metadata = {
  title: "개인정보처리방침 | 팔자문",
  description: "팔자문 서비스의 개인정보 수집·이용·보관에 관한 안내입니다.",
  alternates: { canonical: "/privacy" },
};

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-10 first:mt-0">
      <h2 className="font-serif-kr text-lg font-bold text-textMain">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-[1.9] text-textSub">{children}</div>
    </section>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="border border-bg bg-bg/60 px-3 py-2 text-left text-xs font-semibold text-textMain">
      {children}
    </th>
  );
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="border border-bg px-3 py-2 align-top text-xs text-textSub">{children}</td>;
}

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto min-h-screen max-w-content px-6 py-16">
      <p className="text-sm text-textSub">시행일: <Todo>서비스 오픈일 확정 후 기재</Todo></p>
      <h1 className="mt-2 font-serif-kr text-2xl font-bold text-textMain">개인정보처리방침</h1>
      <p className="mt-4 text-[15px] leading-[1.9] text-textSub">
        코다온(이하 "회사")는 「개인정보 보호법」 제30조에 따라
        정보주체의 개인정보를 보호하고 관련 고충을 신속·원활하게 처리하기 위해
        다음과 같이 개인정보처리방침을 수립·공개합니다.
      </p>

      <Section id="purpose" title="제1조 (개인정보의 처리 목적)">
        <p>회사는 다음 목적을 위해서만 개인정보를 처리하며, 목적이 변경되는 경우
          「개인정보 보호법」 제18조에 따라 별도 동의 등 필요한 조치를 이행합니다.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>이용자가 입력한 생년월일시·성별 정보를 바탕으로 한 사주 계산</li>
          <li>개인화된 팔자문 리포트의 생성 및 제공</li>
          <li>발급된 리포트를 이후에도 동일한 링크로 다시 열람할 수 있도록 하는 재열람 기능</li>
          <li>서비스 운영 및 오류 대응에 필요한 최소한의 처리</li>
        </ul>
        <p className="text-xs">
          위 목적 외의 용도(예: 마케팅, 제3자 제공 등)로는 이용하지 않습니다. 현재
          회원가입, 결제, 광고 발송 기능이 없으므로 관련 목적은 기재하지 않았습니다.
        </p>
      </Section>

      <Section id="items" title="제2조 (처리하는 개인정보의 항목)">
        <p>회사는 사주 계산 및 리포트 생성을 위해 다음 항목을 수집합니다.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>이름</li>
          <li>성별</li>
          <li>달력 구분(양력/음력)</li>
          <li>윤달 여부</li>
          <li>생년월일</li>
          <li>출생시간 (입력하지 않을 수 있으며, 이 경우 "시간 모름"으로 처리)</li>
        </ul>
        <p className="text-xs">
          주민등록번호, 주소, 전화번호, 카드번호, 계좌번호, 건강정보 등은 수집하지
          않습니다. 결제 기능 도입 시 추가로 수집되는 항목은 그 시점에 본 방침을
          개정하여 반영합니다 — 현재는 수집하지 않습니다.
        </p>
      </Section>

      <Section id="retention" title="제3조 (개인정보의 처리 및 보유기간)">
        <p>
          <Todo>
            리포트 데이터 보유기간 미확정 — 재열람 기능을 얼마나 오래 유지할지에
            대한 사업 정책이 아직 정해지지 않았습니다.
          </Todo>
        </p>
        <p>
          <Todo>
            결제 관련 기록의 보유기간 — 현재 결제 기능이 없어 해당 없음. 결제
            기능 도입 시 전자상거래법 등 관계 법령에 따른 기간을 확인해 반영합니다.
          </Todo>
        </p>
        <p className="text-xs">
          위 기간이 확정되는 즉시 항목별 표로 정리하여 갱신하고, 보유기간이 지난
          개인정보는 제4조에 따라 파기합니다.
        </p>
      </Section>

      <Section id="destruction" title="제4조 (개인정보의 파기)">
        <ul className="list-disc space-y-1 pl-5">
          <li>회사는 개인정보 보유기간이 경과하거나 처리목적이 달성된 경우 지체 없이 해당 개인정보를 파기합니다.</li>
          <li>전자적 파일 형태로 저장된 개인정보는 복구·재생이 불가능한 방법으로 삭제합니다.</li>
        </ul>
        <p>
          <Todo>
            보유기간 경과분을 자동으로 삭제하는 절차는 아직 구현되지 않았습니다.
            제3조의 보유기간이 확정되면, 그 기간이 지난 데이터를 실제로 삭제하는
            절차를 마련할 예정입니다.
          </Todo>
        </p>
        <p className="text-xs">
          이용자가 직접 삭제를 요청하는 경우의 처리 방법은 제7조를 참고하세요.
        </p>
      </Section>

      <Section id="outsourcing" title="제5조 (개인정보 처리위탁)">
        <p>회사는 서비스 운영을 위해 다음과 같이 개인정보 처리업무를 위탁하고 있습니다.</p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <Th>수탁자</Th>
                <Th>위탁업무 내용</Th>
                <Th>위탁기간</Th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <Td>Vercel Inc.</Td>
                <Td>웹사이트 호스팅 및 서버 실행</Td>
                <Td>서비스 이용 기간</Td>
              </tr>
              <tr>
                <Td>Neon, Inc.</Td>
                <Td>리포트 데이터베이스(PostgreSQL) 저장 및 관리</Td>
                <Td>서비스 이용 기간</Td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs">
          <Todo>
            위 두 회사와의 정확한 계약상 수탁자 법인명·주소·위탁계약 조항 세부
            내용은 코드만으로 확인할 수 없어, 실제 가입/계약 정보 기준으로
            확인 후 보완이 필요합니다.
          </Todo>
        </p>
      </Section>

      <Section id="transfer" title="제6조 (개인정보의 국외 이전)">
        <p>회사는 서비스 제공을 위해 다음과 같이 개인정보를 국외로 이전합니다.</p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <Th>이전받는 자</Th>
                <Th>이전 국가</Th>
                <Th>이전 항목</Th>
                <Th>이전 목적</Th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <Td>Neon, Inc. (Amazon Web Services 인프라 이용)</Td>
                <Td>싱가포르 (AWS ap-southeast-1 리전)</Td>
                <Td>이름, 성별, 생년월일, 출생시간 등 제2조에 명시된 항목</Td>
                <Td>클라우드 데이터베이스를 통한 리포트 데이터 저장</Td>
              </tr>
            </tbody>
          </table>
        </div>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs">
          <li><Todo>이전 시기 및 방법(예: 실시간 네트워크 전송 여부 등)의 정확한 기술적 서술</Todo></li>
          <li><Todo>이전 항목별 보유·이용기간(제3조 확정 이후 연동)</Todo></li>
          <li><Todo>국외 이전에 대한 법적 근거 및 별도 동의 필요 여부 — 「개인정보 보호법」 제28조의8 요건 충족 여부를 법률 자문을 통해 확인 필요</Todo></li>
          <li><Todo>관련 문의를 받을 연락처</Todo></li>
        </ul>
      </Section>

      <Section id="rights" title="제7조 (정보주체의 권리·의무 및 행사방법)">
        <p>정보주체는 회사에 대해 언제든지 다음의 권리를 행사할 수 있습니다.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>개인정보 열람요구권</li>
          <li>개인정보 정정·삭제요구권</li>
          <li>개인정보 처리정지 요구권</li>
        </ul>
        <p>
          현재 별도의 회원가입·마이페이지 기능은 없으므로, 권리 행사는{" "}
          <Todo>고객센터 이메일/연락처</Todo>로 문의해주시면 본인 확인 후
          지체 없이 처리합니다.
        </p>
      </Section>

      <Section id="safety" title="제8조 (개인정보의 안전성 확보조치)">
        <p>회사는 실제로 적용하고 있는 다음의 조치를 통해 개인정보를 보호합니다.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>모든 통신 구간에 HTTPS(TLS)를 적용합니다.</li>
          <li>개인정보는 서버(데이터베이스)에서만 접근하며, 브라우저(클라이언트) 코드에는 데이터베이스 접속 정보가 포함되지 않습니다.</li>
          <li>데이터베이스 접속 정보 등 민감한 설정값은 서버 전용 환경변수로 관리하며 소스코드 저장소에 포함하지 않습니다.</li>
          <li>리포트 조회 링크는 추측이 불가능한 무작위 식별자(UUID v4)를 사용합니다.</li>
          <li>데이터베이스 조회·저장 시 SQL injection을 방지하는 방식(파라미터 바인딩)을 사용합니다.</li>
          <li>서비스 제공에 필요한 최소한의 개인정보만 수집합니다.</li>
        </ul>
        <p className="text-xs">
          2단계 인증, 침입탐지시스템, 정기 자체감사, 저장 데이터 별도 암호화 등은
          현재 시행하고 있지 않으며, 시행하지 않는 조치를 시행한다고 기재하지
          않습니다.
        </p>
      </Section>

      <Section id="children" title="제9조 (14세 미만 아동의 개인정보 보호)">
        <p>회사는 만 14세 미만 아동의 개인정보를 별도로 수집하지 않으며, 본 서비스는 만 14세 이상만 이용할 수 있습니다.</p>
      </Section>

      <Section id="officer" title="제10조 (개인정보 보호책임자)">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <tbody>
              <tr>
                <Th>성명</Th>
                <Td><Todo>담당자명</Todo></Td>
              </tr>
              <tr>
                <Th>연락처</Th>
                <Td><Todo>이메일 / 전화번호</Todo></Td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="disclaimer" title="제11조 (면책조항)">
        <p>
          본 서비스가 제공하는 사주·운세 콘텐츠는 전통 명리학을 참고한 정보성
          콘텐츠이며, 의료·법률·재정 상담을 대체하지 않습니다. 중요한 결정을
          내리시기 전에는 관련 분야 전문가와 상의하시기 바랍니다.
        </p>
      </Section>

      <Footer />
    </main>
  );
}
