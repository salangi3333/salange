import type { Metadata } from "next";
import Footer from "@/components/Footer";

/**
 * 개인정보처리방침 — 2026-09 출시 전 최종 완결 작업.
 *
 * 이 문서는 실제 코드 감사(사주풀이 프로젝트, 2026-08~09)에서 확인된 사실만
 * 기재한다. 확인되지 않은 보안조치, 임의로 정한 보유기간, 존재하지 않는
 * 회원/앱/구독/가상재화/외부 AI 사용/분석도구/카카오 발송 등은 절대 적지
 * 않는다.
 *
 * 구조·항목 구성·표 사용 방식은 천기문(cheongimun.com)의 개인정보처리방침을
 * 벤치마크했다(고객이 읽기 쉬운 형태, 보유기간 표, 위탁/국외이전 표) —
 * 문장은 전부 새로 썼고, 천기문의 실제 처리 사실(Microsoft Clarity, 카카오
 * 로그인, AI 모델 학습 등)은 팔자문에 존재하지 않으므로 가져오지 않았다.
 *
 * 국외이전 국가(싱가포르)는 실제 DATABASE_URL 호스트명(ap-southeast-1)에서
 * 확인한 사실이다(2026-09-08 재확인). 결제 관련 기록 보유기간(5년/3년)은
 * 「전자상거래 등에서의 소비자보호에 관한 법률 시행령」 제6조에 실제
 * 명시된 법정 기간이다 — 경쟁사가 그렇게 썼기 때문이 아니라 법령 자체를
 * 근거로 반영했다.
 *
 * 국외이전 별도동의 필요 여부(2026-09-08 최종 확인) — law.go.kr(국가법령
 * 정보센터) 「개인정보 보호법」 제28조의8 원문을 직접 확인했다. 팔자문의
 * 구조(이용자가 구매한 리포트를 제공·보관하기 위해 Neon에 DB 보관을
 * 위탁)는 같은 조 제1항제3호 "정보주체와의 계약 체결 및 이행을 위한
 * 처리위탁·보관"에 해당하는 것으로 판단된다 — 이 경우 법은 "별도 동의"가
 * 아니라 같은 조 제2항 각 호 사항(이전 항목/국가·시기·방법/이전받는 자
 * 성명·연락처/이용목적·보유기간/거부 방법·효과)을 개인정보처리방침에
 * 공개하는 것으로 충분하다고 규정한다. 제6조를 이 요건에 맞춰 채웠다.
 * 다만 이는 원문에 근거한 판단이며, 실제 분쟁 발생 시를 대비해 최종적으로는
 * 전문 법률 자문을 받는 것을 권장한다 — "100% 확정"이 아니라 "공식 법령
 * 원문으로 뒷받침된 판단"임을 명확히 한다.
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

/**
 * 좁은 화면(360~430px)용 표 대체 카드 — 가로 표는 열이 3~5개라 375px에서도
 * 가로 스크롤이 생겼다(2026-09-08 검수에서 발견). 내용을 줄이는 대신,
 * `sm`(640px) 미만에서는 표 대신 이 세로형 카드를 보여주고, `sm` 이상(PC 등
 * 넓은 화면)에서는 기존 표를 그대로 보여준다 — 표/카드 둘 다 같은 내용을
 * 담고 있고 화면 크기에 따라 하나만 보인다(내용 중복 표시 아님).
 */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-bg/60 py-2 last:border-b-0">
      <dt className="text-[11px] font-semibold text-textMain">{label}</dt>
      <dd className="mt-0.5 text-xs text-textSub">{children}</dd>
    </div>
  );
}
function Card({ children }: { children: React.ReactNode }) {
  return <dl className="rounded-lg border border-bg/60 px-3 py-1">{children}</dl>;
}

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto min-h-screen max-w-content px-6 py-16">
      <p className="text-sm text-textSub">시행일: 서비스 정식 오픈일에 시행됩니다.</p>
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
          <li>유료 리포트 결제 처리(TossPayments를 통한 결제 진행·승인 및 주문 확인)</li>
          <li>서비스 운영 및 오류 대응에 필요한 최소한의 처리</li>
        </ul>
        <p className="text-xs">
          위 목적 외의 용도(예: 마케팅, 제3자 제공 등)로는 이용하지 않습니다. 현재
          회원가입, 광고 발송 기능이 없으므로 관련 목적은 기재하지 않았습니다.
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
          <li>결제 시 생성되는 주문번호, 결제금액, 결제상태, 결제일시, 결제 식별키</li>
        </ul>
        <p className="text-xs">
          주민등록번호, 주소, 전화번호, 건강정보 등은 수집하지 않습니다. 카드번호·
          계좌번호 등 결제수단 정보는 결제대행사인 TossPayments가 직접 처리하며,
          회사는 이를 전달받거나 저장하지 않습니다.
        </p>
      </Section>

      <Section id="retention" title="제3조 (개인정보의 처리 및 보유기간)">
        <p>회사는 다음과 같이 개인정보를 보유·이용합니다.</p>

        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <Th>구분</Th>
                <Th>보유기간</Th>
                <Th>근거</Th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <Td>리포트 데이터(사주 계산에 사용된 정보, 재열람 서비스 제공용)</Td>
                <Td>
                  리포트 제공 및 재열람 서비스에 필요한 기간 동안 보관하며,
                  이용자가 삭제를 요청하면 지체 없이 파기합니다.
                </Td>
                <Td>회사 운영정책</Td>
              </tr>
              <tr>
                <Td>계약 또는 청약철회 등에 관한 기록</Td>
                <Td>5년</Td>
                <Td>전자상거래 등에서의 소비자보호에 관한 법률</Td>
              </tr>
              <tr>
                <Td>대금결제 및 재화 등의 공급에 관한 기록</Td>
                <Td>5년</Td>
                <Td>전자상거래 등에서의 소비자보호에 관한 법률</Td>
              </tr>
              <tr>
                <Td>소비자의 불만 또는 분쟁처리에 관한 기록</Td>
                <Td>3년</Td>
                <Td>전자상거래 등에서의 소비자보호에 관한 법률</Td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="space-y-2 sm:hidden">
          <Card>
            <Field label="구분">리포트 데이터(사주 계산에 사용된 정보, 재열람 서비스 제공용)</Field>
            <Field label="보유기간">
              리포트 제공 및 재열람 서비스에 필요한 기간 동안 보관하며,
              이용자가 삭제를 요청하면 지체 없이 파기합니다.
            </Field>
            <Field label="근거">회사 운영정책</Field>
          </Card>
          <Card>
            <Field label="구분">계약 또는 청약철회 등에 관한 기록</Field>
            <Field label="보유기간">5년</Field>
            <Field label="근거">전자상거래 등에서의 소비자보호에 관한 법률</Field>
          </Card>
          <Card>
            <Field label="구분">대금결제 및 재화 등의 공급에 관한 기록</Field>
            <Field label="보유기간">5년</Field>
            <Field label="근거">전자상거래 등에서의 소비자보호에 관한 법률</Field>
          </Card>
          <Card>
            <Field label="구분">소비자의 불만 또는 분쟁처리에 관한 기록</Field>
            <Field label="보유기간">3년</Field>
            <Field label="근거">전자상거래 등에서의 소비자보호에 관한 법률</Field>
          </Card>
        </div>

        <p className="text-xs">
          위 보유기간이 지난 개인정보는 제4조에 따라 지체 없이 파기합니다.
        </p>
      </Section>

      <Section id="destruction" title="제4조 (개인정보의 파기)">
        <p>회사는 다음 사유가 발생하면 해당 개인정보를 지체 없이 파기합니다.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>개인정보의 보유목적이 달성된 경우</li>
          <li>이용자가 개인정보의 삭제를 요청한 경우</li>
          <li>제3조의 법정 보존기간이 경과한 경우</li>
        </ul>
        <p>
          전자적 파일 형태로 저장된 개인정보는 복구·재생이 불가능한 방법으로
          삭제합니다.
        </p>
        <p className="text-xs">
          개인정보 삭제를 원하시면 아래 고객센터(전화 010-8315-3338, 이메일
          jrina5632@naver.com)로 문의해 주세요. 본인 확인 후 지체 없이
          처리합니다.
        </p>
      </Section>

      <Section id="outsourcing" title="제5조 (개인정보 처리위탁)">
        <p>회사는 서비스 운영을 위해 다음과 같이 개인정보 처리업무를 위탁하고 있습니다.</p>

        <div className="hidden overflow-x-auto sm:block">
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
              <tr>
                <Td>주식회사 토스페이먼츠</Td>
                <Td>유료 리포트 결제 처리(신용·체크카드 등 전자결제 수단을 통한 결제 진행 및 승인)</Td>
                <Td>서비스 이용 기간</Td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="space-y-2 sm:hidden">
          <Card>
            <Field label="수탁자">Vercel Inc.</Field>
            <Field label="위탁업무 내용">웹사이트 호스팅 및 서버 실행</Field>
            <Field label="위탁기간">서비스 이용 기간</Field>
          </Card>
          <Card>
            <Field label="수탁자">Neon, Inc.</Field>
            <Field label="위탁업무 내용">리포트 데이터베이스(PostgreSQL) 저장 및 관리</Field>
            <Field label="위탁기간">서비스 이용 기간</Field>
          </Card>
          <Card>
            <Field label="수탁자">주식회사 토스페이먼츠</Field>
            <Field label="위탁업무 내용">
              유료 리포트 결제 처리(신용·체크카드 등 전자결제 수단을 통한
              결제 진행 및 승인)
            </Field>
            <Field label="위탁기간">서비스 이용 기간</Field>
          </Card>
        </div>

        <p className="text-xs">
          회사는 위탁계약 체결 시 위탁업무 목적 외 개인정보 처리 금지, 안전성
          확보조치 등 관계 법령에 따른 사항을 명시하고, 수탁자가 개인정보를
          안전하게 처리하는지 관리·감독합니다.
        </p>
      </Section>

      <Section id="transfer" title="제6조 (개인정보의 국외 이전)">
        <p>
          회사는 이용자가 구매한 리포트를 저장·제공하는 계약을 이행하기 위해
          다음과 같이 개인정보를 국외로 이전(처리위탁·보관)합니다.
        </p>

        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <Th>이전받는 자</Th>
                <Th>이전 국가</Th>
                <Th>이전 항목</Th>
                <Th>이전 목적</Th>
                <Th>보유기간</Th>
                <Th>이전 거부 시</Th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <Td>Neon, Inc. (AWS 인프라 이용)</Td>
                <Td>싱가포르</Td>
                <Td>이름, 성별, 생년월일, 출생시간 등 제2조에 명시된 항목</Td>
                <Td>클라우드 데이터베이스를 통한 리포트 데이터 저장</Td>
                <Td>제3조와 동일</Td>
                <Td>
                  이 저장소는 리포트 생성·재열람 기능 자체에 사용되어,
                  이전을 거부하시면 서비스 이용이 불가능합니다.
                </Td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="space-y-2 sm:hidden">
          <Card>
            <Field label="이전받는 자">Neon, Inc. (AWS 인프라 이용)</Field>
            <Field label="이전 국가">싱가포르</Field>
            <Field label="이전 항목">
              이름, 성별, 생년월일, 출생시간 등 제2조에 명시된 항목
            </Field>
            <Field label="이전 목적">클라우드 데이터베이스를 통한 리포트 데이터 저장</Field>
            <Field label="보유기간">제3조와 동일</Field>
            <Field label="이전 거부 시">
              이 저장소는 리포트 생성·재열람 기능 자체에 사용되어, 이전을
              거부하시면 서비스 이용이 불가능합니다.
            </Field>
          </Card>
        </div>

        <p className="text-xs">
          이전 시기 및 방법: 리포트 또는 주문이 생성되는 즉시 암호화된 통신
          (HTTPS)을 통해 실시간으로 전송되어 저장됩니다.
        </p>
        <p className="text-xs">
          위와 같은 국외 이전은 이용자와의 계약(유료 리포트 제공)을 이행하기
          위해 처리위탁·보관이 필요한 경우로서, 「개인정보 보호법」 제28조의8
          제1항제3호에 따라 본 조에 필요한 사항을 공개하는 방법으로 이루어지며,
          이 경우에 해당하지 않는 별도의 국외이전이 필요해지면 그때 별도로
          동의를 받겠습니다.
        </p>
        <p className="text-xs">관련 문의: 전화 010-8315-3338 · 이메일 jrina5632@naver.com</p>
      </Section>

      <Section id="rights" title="제7조 (정보주체의 권리·의무 및 행사방법)">
        <p>정보주체는 회사에 대해 언제든지 다음의 권리를 행사할 수 있습니다.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>개인정보 열람요구권</li>
          <li>개인정보 정정·삭제요구권</li>
          <li>개인정보 처리정지 요구권</li>
        </ul>
        <p>
          현재 별도의 회원가입·마이페이지 기능은 없으므로, 권리 행사는
          아래 고객센터(전화 010-8315-3338, 이메일 jrina5632@naver.com)로
          문의해주시면 본인 확인 후 지체 없이 처리합니다.
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

      <Section id="auto-collected" title="제9조 (자동으로 생성되는 정보)">
        <p>
          회사가 운영하는 서비스는 쿠키(Cookie) 등 이용자의 행태를 추적하는
          도구를 사용하지 않으며, 접속 IP를 회사의 데이터베이스에 저장하지
          않습니다.
        </p>
        <p className="text-xs">
          다만 웹사이트를 운영하는 호스팅 인프라(Vercel)의 특성상 서버 운영을
          위한 표준적인 접속 기록이 자동으로 생성·처리될 수 있으며, 이는 회사가
          별도로 수집·보관하는 것이 아니라 호스팅사의 인프라 운영 과정에서
          발생하는 것입니다.
        </p>
      </Section>

      <Section id="children" title="제10조 (14세 미만 아동의 개인정보 보호)">
        <p>회사는 만 14세 미만 아동의 개인정보를 별도로 수집하지 않으며, 본 서비스는 만 14세 이상만 이용할 수 있습니다.</p>
      </Section>

      <Section id="officer" title="제11조 (개인정보 보호책임자)">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <tbody>
              <tr>
                <Th>성명</Th>
                <Td>홍지영 (대표)</Td>
              </tr>
              <tr>
                <Th>연락처</Th>
                <Td>010-8315-3338 · jrina5632@naver.com</Td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs">
          정보주체께서는 서비스를 이용하며 발생한 개인정보 관련 문의, 불만처리,
          피해구제 등을 위 개인정보 보호책임자에게 문의하실 수 있습니다.
        </p>
      </Section>

      <Section id="disclaimer" title="제12조 (면책조항)">
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
