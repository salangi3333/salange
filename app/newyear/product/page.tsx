import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";
import { HERO_GUIDE_IMAGE } from "@/lib/guideImages";
import { CATALOG } from "@/lib/commerce/catalog";
import { applyOpenState } from "@/lib/commerce/publicApply";
import { loadTestPayConfig } from "@/lib/commerce/newyearTestPay";

/**
 * 2027 신년운세 상품 상세페이지(공개). 판매가 열리기 전에는 검색에 노출하지 않는다(noindex) — 신청 버튼도 서버 판정(applyOpenState)이 닫혀 있으면 막힌다.
 * 가격은 상품 카탈로그에서 가져온다. 제공 기한·환불 안내는 2026-11 확정 운영 정책(결제 및 필수 정보 입력 완료 후 최대 48시간·PDF 발송 전 전액 환불)이며, 이 파일 안의 상수로 둔다 —
 * /newyear 신청 화면·신년운세 약관 초안(newyear-2027-terms/2026-11-r2)·신년운세 환불 안내(/newyear/terms)와 같은 문구다. 문구를 바꾸면 이 네 곳을 함께 바꾼다.
 * 분량·구성은 실제 제작·승인된 시험 PDF(5장, 43~49쪽)에서 확인한 값만 쓰며, 고객별 쪽수는 보장하지 않는다. 샘플은 가상 인물로 만든 시험 보고서 5쪽(/sample/newyear-2027-preview.pdf)이다.
 */
export const metadata: Metadata = { title: "2027 신년운세 | 팔자문", description: "입력하신 사주 정보로 한 분만을 위해 제작하는 맞춤 신년운세 PDF", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const DELIVERY_HOURS = 48;
const CHAPTERS = [
  { no: "제1장", title: "총운", desc: "2027년 한 해의 큰 흐름과 중심이 되는 기운" },
  { no: "제2장", title: "재물운", desc: "돈이 들어오고 나가는 흐름" },
  { no: "제3장", title: "일·직업운", desc: "일과 직업에서 기회와 주의할 점" },
  { no: "제4장", title: "인연·관계운", desc: "사람과 인연의 흐름" },
  { no: "제5장", title: "좋은 달 · 조심할 달", desc: "월별로 보는 한 해의 리듬" },
];
const INPUTS = ["이름", "성별", "생년월일(양력·음력, 윤달 여부)", "태어난 시간(모르면 모른다고 선택)", "결혼·연애 상태, 직업, 궁금한 점", "PDF를 받을 이메일"];
const STEPS = [
  { t: "상품 확인", d: "이 페이지에서 구성과 안내를 확인합니다." },
  { t: "정보 입력과 동의", d: "신청 화면에서 정보를 입력하고 필수 안내에 동의합니다." },
  { t: "결제", d: "결제 방법과 절차는 신청 단계에서 안내해 드립니다." },
  { t: "PDF 받기", d: `결제와 필수 정보 입력이 끝난 뒤 최대 ${DELIVERY_HOURS}시간 이내에 이메일로 보내 드립니다.` },
];

const Card = ({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) => (
  <section id={id} className="rounded-card border border-bg bg-white p-5 sm:p-6">
    <h2 className="font-serif-kr text-lg font-bold text-textMain">{title}</h2>
    <div className="mt-3 text-sm leading-relaxed text-textMain">{children}</div>
  </section>
);

export default function NewYearProductPage() {
  const p = CATALOG.NEWYEAR_2027;
  const price = p.priceKrw === null ? "가격 미정" : `${p.priceKrw.toLocaleString("ko-KR")}원`;
  const open = applyOpenState().open;
  const testPayOpen = loadTestPayConfig(process.env).enabled; // 로컬 테스트 환경(테스트 키+스위치+운영 아님)에서만 true — 운영·일반 환경에서는 버튼이 보이지 않는다
  return (
    <main className="min-h-screen bg-bg" data-testid="newyear-product">
      <section className="relative overflow-hidden bg-dark px-6 py-8 md:py-14" data-testid="product-hero">
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse at 72% 40%, rgba(231,192,126,0.38), transparent 62%)" }} aria-hidden="true" />
        <div className="relative mx-auto flex w-full max-w-[920px] flex-col items-center gap-6 md:flex-row md:items-center md:gap-10">
          <div className="relative order-1 w-full max-w-[340px] shrink-0 md:order-2 md:max-w-[400px]" data-testid="product-hero-image">
            <div className="aspect-[4/5] w-full bg-cover bg-top bg-no-repeat" style={{ backgroundImage: `url(${HERO_GUIDE_IMAGE})` }} role="img" aria-label="팔자문 선녀" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-dark to-transparent" aria-hidden="true" />
            <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-1/5 bg-gradient-to-r from-dark to-transparent md:block" aria-hidden="true" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-1/6 bg-gradient-to-l from-dark to-transparent" aria-hidden="true" />
          </div>
          <div className="relative -mt-14 flex w-full flex-col items-center gap-3 text-center md:order-1 md:mt-0 md:items-start md:text-left">
            <p className="text-sm tracking-[0.3em] text-accentGoldFrom">— 命理四柱 · 사주 —</p>
            <h1 className="font-serif-kr text-3xl font-bold leading-snug text-white sm:text-4xl" data-testid="product-title">팔자문 2027 신년운세</h1>
            <p className="font-serif-kr text-base leading-relaxed text-white/90">입력하신 사주 정보로<br />한 분만을 위해 제작하는 맞춤 PDF</p>
            <p className="mt-1 font-serif-kr text-3xl font-bold text-accentGoldFrom" data-testid="product-price">{price}</p>
            <p className="text-xs text-white/70">개인별 맞춤 신년운세 PDF · 이메일로 전달</p>
            {open
              ? <Link href="/newyear" className="mt-2 block w-full max-w-xs rounded-pill bg-gradient-to-r from-accentGoldFrom to-accentGoldTo py-3 text-center text-sm font-bold text-dark" data-testid="product-apply">신청하러 가기</Link>
              : <div className="mt-2 w-full max-w-xs" data-testid="product-closed"><span className="block cursor-not-allowed rounded-pill bg-white/15 py-3 text-center text-sm font-bold text-white/70" aria-disabled="true">신청 접수 준비 중</span><p className="mt-2 text-xs text-white/70">지금은 신청을 받고 있지 않습니다. 준비가 끝나면 안내해 드립니다.</p></div>}
            {testPayOpen && <Link href="/newyear/test-pay" className="block w-full max-w-xs rounded-pill border border-accentGoldFrom py-3 text-center text-sm font-bold text-accentGoldFrom" data-testid="product-test-apply">테스트 결제로 신청해 보기 (로컬 전용)</Link>}
          </div>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-content flex-col gap-4 px-6 py-10">
        <Card title="이런 상품입니다">
          <p>생년월일시를 바탕으로 2027 정미년 한 해의 흐름을 다섯 장으로 풀어 쓴 개인 맞춤 PDF입니다. 한 해의 기준은 입춘으로, 2027년 2월 4일 입춘부터 2028년 2월 4일 입춘 전까지를 봅니다.</p>
          <p className="mt-2 text-textSub">풀이는 한 해의 흐름을 읽는 참고이며, 어떤 일이 반드시 일어난다는 예언이 아닙니다. 의료·법률·투자 등 전문 상담을 대신하지 않습니다.</p>
        </Card>

        <Card title="보고서 구성" id="chapters">
          <ol className="flex flex-col gap-2" data-testid="product-chapters">
            {CHAPTERS.map((c) => (
              <li key={c.no} className="rounded-box border border-bg bg-bg/40 p-3"><p className="text-xs text-accentRed">{c.no}</p><p className="font-bold">{c.title}</p><p className="text-xs text-textSub">{c.desc}</p></li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-textSub" data-testid="product-length">쪽수는 고객이 입력한 내용에 따라 달라지며 일정한 쪽수를 보장하지 않습니다. 지금까지 제작해 본 시험본은 43~49쪽이었습니다.</p>
        </Card>

        <Card title="샘플">
          <p data-testid="product-sample">가상 인물로 만든 시험 보고서의 일부(5쪽)를 결제 전에 미리 보실 수 있습니다. 실제 고객 정보가 아닙니다.</p>
          <a href="/sample/newyear-2027-preview.pdf" target="_blank" rel="noopener noreferrer" className="mt-3 block rounded-pill bg-gradient-to-r from-accentGoldFrom to-accentGoldTo py-3 text-center text-sm font-bold text-dark" data-testid="product-sample-link">신년운세 샘플 미리보기</a>
          <p className="mt-2 text-xs text-textSub">PDF 파일이 새 창에서 열립니다. 열리지 않으면 <a className="underline" href="/sample/newyear-2027-preview.pdf" download="팔자문_2027_신년운세_미리보기용샘플.pdf">내려받아</a> 보세요.</p>
        </Card>

        <Card title="어떤 정보로 만드나요">
          <ul className="list-disc pl-5">{INPUTS.map((x) => <li key={x}>{x}</li>)}</ul>
          <p className="mt-2 text-xs text-textSub">입력하신 정보는 이 상품의 제작과 전달에만 쓰입니다. 자세한 내용은 개인정보 수집·이용 안내를 확인해 주세요.</p>
        </Card>

        <Card title="PDF 제공 안내" id="delivery">
          <p><strong>결제와 필수 정보 입력이 끝난 뒤 최대 {DELIVERY_HOURS}시간 이내</strong>에 입력하신 이메일로 PDF를 보내 드립니다. 주말과 공휴일도 시간에 포함됩니다.</p>
          <p className="mt-2">제작에 꼭 필요한 정보를 확인해야 하면 이메일로 문의드립니다. 문의를 보낸 때부터 답해 주실 때까지는 시간이 멈추고, 답해 주시면 남은 시간부터 이어집니다. 문의와 답변 시각은 회사가 직접 기록해 관리합니다.</p>
          <p className="mt-2">{DELIVERY_HOURS}시간 안에 보내기 어려우면 기한이 지나기 전에 사유와 새 예정 시각을 알려 드립니다. 기한이 지났다면 계속 기다리시거나 전액 환불을 선택하실 수 있습니다.</p>
        </Card>

        <Card title="취소·환불 안내" id="refund">
          <ul className="list-disc pl-5" data-testid="product-refund">
            <li><strong>PDF를 보내기 전</strong>에는 제작이 시작되었어도 위약금이나 제작비 공제 없이 전액 환불됩니다. 환불은 취소 요청을 확인한 날부터 3영업일 이내에 결제하신 방법으로 진행합니다.</li>
            <li>PDF가 지정하신 이메일로 전달되어 열람할 수 있게 된 뒤에는 단순 변심에 의한 청약철회가 제한될 수 있습니다. 이 제한은 법에서 정한 요건과 조치를 갖춘 경우에만 적용되며, 맞춤 제작이라는 이유만으로 환불을 거절하지 않습니다. 다만 풀이가 기대나 실제 상황과 다르다는 주관적인 사유만으로는 환불이 보장되지 않습니다.</li>
            <li>PDF 파일이 손상되었거나 열리지 않는 경우, 신청하신 정보와 다르게 제작된 경우, 안내한 5개 장 중 일부가 빠진 경우, 표시·광고나 계약 내용과 다르게 제공된 경우에는 사안과 법령에 따라 재발송·재제작·환불 등 적절한 조치를 해 드립니다. 약속한 제공 기한(최대 48시간)을 지키지 못한 경우에는 계속 기다리시거나 취소하고 전액 환불받으실 수 있습니다.</li>
            <li>제작을 시작하기 전에는 입력 정보를 무료로 정정할 수 있고, 제작이 시작된 뒤의 정정은 사안별로 안내해 드립니다.</li>
          </ul>
          <p className="mt-3 text-xs text-textSub">자세한 규정은 <Link className="underline" href="/newyear/terms#terms-5">신년운세 이용약관·환불 안내</Link>에서 확인하실 수 있습니다.</p>
        </Card>

        <Card title="신청부터 받기까지" id="steps">
          <ol className="flex flex-col gap-2" data-testid="product-steps">
            {STEPS.map((s, i) => (
              <li key={s.t} className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-pill bg-dark text-xs font-bold text-accentGoldFrom">{i + 1}</span><span><span className="font-bold">{s.t}</span><br /><span className="text-xs text-textSub">{s.d}</span></span></li>
            ))}
          </ol>
        </Card>

        <p className="text-center text-xs text-textSub"><Link className="underline" href="/newyear/terms">이용약관·환불 안내</Link> · <Link className="underline" href="/newyear/privacy">개인정보 수집·이용 안내</Link></p>
      </div>
      <div className="mx-auto w-full max-w-content px-6"><Footer scope="newyear" /></div>
    </main>
  );
}
