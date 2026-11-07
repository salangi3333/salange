import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";
import { NEWYEAR_DOCS, NEWYEAR_TERMS_LEGAL_REVIEWED } from "@/lib/commerce/newyearTermsDraft";
import { NEWYEAR_PRIVACY_NOTICE } from "@/lib/commerce/newyearPrivacyNotice";
import { DocSection, DraftBanner, LegalMark } from "../_docParts";

/**
 * 2027 신년운세 개인정보 수집·이용 안내(공개, 초안). 기존 개인정보처리방침(/privacy)은 그대로 두고, 신년운세에서 실제로 처리하는 항목·보유·위탁을 보충한다.
 * 본문(NEWYEAR_PRIVACY_NOTICE)은 신청 화면의 개인정보 요약과 같은 데이터이며, 지문은 동의 기록에 남는 값과 같다.
 */
export const metadata: Metadata = { title: "2027 신년운세 개인정보 수집·이용 안내 | 팔자문", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function NewYearPrivacyPage() {
  const N = NEWYEAR_PRIVACY_NOTICE, doc = NEWYEAR_DOCS.find((d) => d.id === "privacy")!;
  return (
    <main className="mx-auto min-h-screen max-w-content px-6 py-16">
      <h1 className="font-serif-kr text-2xl font-bold text-textMain">{N.title}</h1>
      <p className="mt-2 text-sm text-textSub">시행일: 서비스 정식 오픈일에 시행됩니다.</p>
      <div className="mt-6"><DraftBanner version={doc.version} sha256={doc.sha256} reviewed={NEWYEAR_TERMS_LEGAL_REVIEWED} /></div>
      <p className="mt-6 text-[15px] leading-[1.9] text-textSub">{N.intro}</p>
      <div className="mt-10">
        {N.sections.map((s) => (
          <DocSection key={s.id} id={`privacy-${s.id}`} title={s.title}>
            {s.body.map((b) => <p key={b}>{b}</p>)}
            <LegalMark doc="privacy" target={s.id} />
          </DocSection>
        ))}
        <LegalMark doc="privacy" target="version" />
      </div>
      <section className="mt-10 text-sm text-textSub" aria-label="관련 문서">
        <p>관련 문서: <Link className="underline" href="/newyear/terms">신년운세 이용약관·환불 안내</Link> · <Link className="underline" href="/privacy">개인정보처리방침</Link></p>
      </section>
      <Footer />
    </main>
  );
}
