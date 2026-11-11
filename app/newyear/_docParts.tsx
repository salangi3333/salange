import type { ReactNode } from "react";
import { NEWYEAR_LEGAL_FLAGS } from "@/lib/commerce/newyearPrivacyNotice";

/** 신년운세 약관·개인정보 안내 페이지가 함께 쓰는 작은 조각들(서버 컴포넌트). */

/** 문서 맨 위의 초안 안내 + 버전·본문 지문. 지문은 신청 때 동의 기록에 남는 값과 같은 것의 앞부분이다. */
export function DraftBanner({ version, sha256, reviewed }: { version: string; sha256: string; reviewed: boolean }) {
  return (
    <div className="rounded-card border border-accentGoldTo/60 bg-accentGoldFrom/20 p-4 text-sm text-textMain" data-testid="doc-banner">
      {!reviewed && <p className="font-bold">※ 법률 확인 전 초안입니다. 확정된 약관이 아니며, 시행 전에 문구가 바뀔 수 있습니다.</p>}
      <p className={reviewed ? "" : "mt-1"}>문서 버전 {version} · 본문 지문 {sha256.slice(0, 12)}</p>
      <p className="mt-1 text-xs text-textSub">신청하실 때 동의한 문서의 버전과 본문 지문이 신청 번호와 함께 기록됩니다.</p>
    </div>
  );
}

/**
 * 법률 확인이 필요한 부분 표시(개발자·운영자용 내부 메모). 법률 확인이 끝났다는 뜻이 아니다.
 * 고객에게는 보이지 않게 기본으로 숨기고, 내부에서 볼 때만 NEWYEAR_SHOW_LEGAL_MARKS=on 으로 켠다.
 * 법률 확인 전이라는 사실은 문서 맨 위 DraftBanner 가 고객에게 그대로 알린다.
 */
export function LegalMark({ doc, target }: { doc: "terms" | "privacy" | "consent"; target: string }) {
  if (process.env.NEWYEAR_SHOW_LEGAL_MARKS !== "on") return null;
  const flags = NEWYEAR_LEGAL_FLAGS.filter((f) => f.doc === doc && f.target === target);
  if (flags.length === 0) return null;
  return (
    <div className="mt-2 rounded-box border border-accentRed/40 bg-accentRed/5 p-2 text-xs text-textMain" data-legal-mark={`${doc}:${target}`}>
      <span className="font-bold text-accentRed">법률 확인 필요</span>
      {flags.map((f) => <span key={f.id} className="block text-textSub">{f.reason}</span>)}
    </div>
  );
}

export function DocSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="mt-10 scroll-mt-6 first:mt-0">
      <h2 className="font-serif-kr text-lg font-bold text-textMain">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-[1.9] text-textSub">{children}</div>
    </section>
  );
}
