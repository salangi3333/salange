import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";
import { CATALOG } from "@/lib/commerce/catalog";
import { NEWYEAR_DOCS, NEWYEAR_TERMS_DRAFT, NEWYEAR_TERMS_LEGAL_REVIEWED } from "@/lib/commerce/newyearTermsDraft";
import { DocSection, DraftBanner, LegalMark } from "../_docParts";

/**
 * 2027 신년운세 이용약관·환불 안내(공개, 초안). 인생사주의 이용약관·환불정책(/terms, /refund)은 그대로 두고 이 상품에만 적용되는 안내를 따로 둔다.
 * 판매가 열리기 전에는 검색에 노출하지 않는다. 가격·기한은 카탈로그에서 가져와 신청 화면·약관 본문과 어긋나지 않게 한다.
 * 본문(NEWYEAR_TERMS_DRAFT.sections)은 신청 화면의 '약관 전문'과 같은 데이터이며, 지문은 동의 기록에 남는 값과 같다.
 */
export const metadata: Metadata = { title: "2027 신년운세 이용약관·환불 안내 | 팔자문", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const articleNo = (title: string) => /^제(\d+)조/.exec(title)?.[1] ?? "";

export default function NewYearTermsPage() {
  const p = CATALOG.NEWYEAR_2027, doc = NEWYEAR_DOCS.find((d) => d.id === "terms")!;
  const priceText = p.priceKrw === null ? "미정" : `${p.priceKrw.toLocaleString("ko-KR")}원`;
  return (
    <main className="mx-auto min-h-screen max-w-content px-6 py-16">
      <h1 className="font-serif-kr text-2xl font-bold text-textMain">{NEWYEAR_TERMS_DRAFT.title}</h1>
      <p className="mt-2 text-sm text-textSub">시행일: 서비스 정식 오픈일에 시행됩니다.</p>
      <div className="mt-6"><DraftBanner version={doc.version} sha256={doc.sha256} reviewed={NEWYEAR_TERMS_LEGAL_REVIEWED} /></div>

      <section className="mt-8 rounded-card border border-bg bg-white p-4" aria-label="신청 전 핵심 안내" data-testid="terms-summary">
        <h2 className="text-sm font-bold text-textMain">신청 전에 꼭 확인하세요</h2>
        <dl className="mt-3 grid grid-cols-[6rem_1fr] gap-x-3 gap-y-2 text-sm text-textMain">
          <dt className="text-textSub">상품</dt><dd>{p.name} — {p.offerName ?? "개인 맞춤 신년운세 5장(PDF)"}</dd>
          <dt className="text-textSub">가격</dt><dd data-testid="terms-price">{priceText} (결제수단은 신청 화면에서 안내합니다)</dd>
          <dt className="text-textSub">제공 방식</dt><dd>결제 확인 후 입력하신 이메일로 PDF 전송(쪽수는 고객별로 다르며 보장하지 않습니다)</dd>
          <dt className="text-textSub">제작 기한</dt><dd data-testid="terms-deadline">결제 및 필수 정보 입력 완료 후 최대 48시간 이내(주말·공휴일 포함)</dd>
          <dt className="text-textSub">취소·환불</dt><dd>PDF를 보내기 전에는 제작이 시작되었어도 전액 환불됩니다. PDF가 제공된 뒤에는 법령이 정한 요건을 갖춘 경우 단순 변심에 의한 청약철회가 제한될 수 있으나, 발송·파일 오류나 계약과 다른 제공은 재발송·재제작·전액 환불을 받으실 수 있습니다(<a className="underline" href="#terms-5">제5조</a>~<a className="underline" href="#terms-7">제7조</a>).</dd>
        </dl>
      </section>

      <div className="mt-10">
        {NEWYEAR_TERMS_DRAFT.sections.map((s) => {
          const no = articleNo(s.title);
          return (
            <DocSection key={s.title} id={`terms-${no}`} title={s.title}>
              {s.body.map((b) => <p key={b}>{b}</p>)}
              <LegalMark doc="terms" target={`제${no}조`} />
            </DocSection>
          );
        })}
      </div>

      <section className="mt-10 text-sm text-textSub" aria-label="관련 문서">
        <p>관련 문서: <Link className="underline" href="/newyear/privacy">신년운세 개인정보 수집·이용 안내</Link> · <Link className="underline" href="/terms">종합 리포트 이용약관</Link> · <Link className="underline" href="/refund">종합 리포트 환불정책</Link> · <Link className="underline" href="/privacy">개인정보처리방침</Link></p>
        <p className="mt-1">종합 리포트 이용약관·환불정책은 기존 종합 리포트 상품에 적용되며, 2027 신년운세에는 위 신년운세 약관·환불 안내가 먼저 적용됩니다(제9조).</p>
      </section>
      <Footer scope="newyear" />
    </main>
  );
}
