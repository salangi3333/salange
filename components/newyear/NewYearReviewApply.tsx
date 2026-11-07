"use client";

import { useState } from "react";
import Link from "next/link";
import { JOB_CHOICES, RELATION_CHOICES } from "@/lib/newyearIntake/spec";
import { REVIEW_CONSENTS, REVIEW_PATHS, REVIEW_PERSONA } from "@/lib/commerce/newyearReviewPay";

/**
 * 토스 심사용 '신청 단계' 화면. 실제 신청서와 같은 항목을 보여 주되, 값은 가상 인물 예시로 고정된 읽기 전용이며 입력받지 않는다.
 * 서버로 보내는 요청이 없다: 두 가지 필수 안내를 체크하면 주문금액 확인 화면으로 이동할 뿐이다.
 */
export interface ReviewApplyProps { priceText: string; productLines: string[]; sections: { title: string; body: string[] }[] }
const CARD = "rounded-card border border-bg bg-white p-4 sm:p-5";
const CHIP = (on: boolean) => `rounded-box border px-3 py-2.5 text-sm font-medium ${on ? "border-accentRed bg-accentRed/10 text-accentRed" : "border-bg bg-bg/50 text-textSub"}`;
const GOLD_BTN = "block w-full rounded-pill bg-gradient-to-r from-accentGoldFrom to-accentGoldTo py-3 text-center text-sm font-bold text-dark";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-textMain">{label}</span>
      <input className="w-full cursor-not-allowed rounded-box border bg-bg/50 px-4 py-3 text-sm text-textSub" value={value} readOnly disabled aria-label={label} />
    </div>
  );
}

export default function NewYearReviewApply(p: ReviewApplyProps) {
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const all = REVIEW_CONSENTS.every((c) => accepted[c.id]);
  const P = REVIEW_PERSONA;
  return (
    <div className="flex flex-col gap-5">
      <section className={`${CARD} flex flex-col gap-3`} data-section="1">
        <h2 className="text-sm font-bold text-textMain">1. 상품 안내</h2>
        <ul className="list-disc pl-5 text-sm text-textMain">{p.productLines.map((l) => <li key={l}>{l}</li>)}</ul>
        <p className="text-xs text-textSub">전체 안내: <Link href="/newyear/terms" target="_blank" rel="noopener noreferrer" className="underline">이용약관·환불 안내</Link></p>
      </section>

      <section className={`${CARD} flex flex-col gap-3`} data-section="2">
        <h2 className="text-sm font-bold text-textMain">2. 신청 정보(가상 인물 예시)</h2>
        <p className="text-xs text-textSub" data-testid="review-persona-note">심사 확인용 예시입니다. 아래 값은 가상 인물이며 입력하거나 수정할 수 없고, 어디에도 저장되지 않습니다.</p>
        <div className="grid gap-4 sm:grid-cols-2"><Row label="이름" value={P.name} /><Row label="PDF를 받을 이메일" value={P.email} /></div>
        <div className="grid gap-4 sm:grid-cols-2"><Row label="성별" value={P.gender} /><Row label="양력·음력" value={P.calendar} /></div>
        <div className="grid gap-4 sm:grid-cols-2"><Row label="생년월일" value={P.birth} /><Row label="태어난 시간" value={P.time} /></div>
        <div className="flex flex-wrap gap-2" aria-label="관계 상태(예시)">{RELATION_CHOICES.map((x) => <span key={x.value} className={CHIP(x.value === P.relation)}>{x.label}</span>)}</div>
        <div className="flex flex-wrap gap-2" aria-label="직업 형태(예시)">{JOB_CHOICES.map((x) => <span key={x.value} className={CHIP(x.value === P.job)}>{x.label}</span>)}</div>
        <div className="flex flex-col gap-1.5"><span className="text-sm font-medium text-textMain">2027년에 꼭 물어보고 싶은 고민이 있어? (선택)</span><textarea className="min-h-20 w-full cursor-not-allowed rounded-box border bg-bg/50 px-4 py-3 text-sm text-textSub" value={P.concern} readOnly disabled aria-label="고민(예시)" /></div>
      </section>

      <section className={`${CARD} flex flex-col gap-3`} data-section="3">
        <h2 className="text-sm font-bold text-textMain">3. 취소·환불과 청약철회 안내</h2>
        {p.sections.filter((s) => /^제(5|6|7)조/.test(s.title)).map((s) => <div key={s.title}><p className="text-sm font-bold text-textMain">{s.title}</p>{s.body.map((b) => <p key={b} className="mt-1 text-sm leading-relaxed text-textSub">{b}</p>)}</div>)}
      </section>

      <section className={`${CARD} flex flex-col gap-3`} data-section="4">
        <h2 className="text-sm font-bold text-textMain">4. 필수 안내 확인</h2>
        {REVIEW_CONSENTS.map((c) => (
          <label key={c.id} className="flex items-start gap-2 rounded-box border border-bg bg-bg/40 p-3 text-sm text-textMain">
            <input type="checkbox" className="mt-1" data-consent={c.id} checked={!!accepted[c.id]} onChange={(e) => setAccepted((a) => ({ ...a, [c.id]: e.target.checked }))} />
            <span><span className="mr-1 font-bold text-accentRed">[필수]</span>{c.text}</span>
          </label>
        ))}
      </section>

      {all
        ? <Link href={REVIEW_PATHS.checkout} className={GOLD_BTN} data-testid="review-apply-next">주문금액 확인하기 ({p.priceText})</Link>
        : <button type="button" className={`${GOLD_BTN} cursor-not-allowed opacity-50`} disabled data-testid="review-apply-next">주문금액 확인하기 ({p.priceText})</button>}
      {!all && <p className="text-center text-xs text-textSub">필수 안내를 모두 확인하면 다음 단계로 이동할 수 있습니다.</p>}
    </div>
  );
}
