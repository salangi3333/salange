import React from "react";
import { ReportResult } from "@/lib/reportMapper";
import { AppData } from "@/lib/sajuContent";
import { IntakeFormData } from "@/lib/sajuEngine";
import { BookFairySlots } from "@/lib/pdfBookAssets";
import { FairyImageSlot } from "./ReportPdfPrototype";
import { DarkBookChapters1to6, DarkHero, Flow, Head, Head2, Paras } from "./ReportPdfBookDarkChapters";

/**
 * 1~9장 모바일 검수용 다크 PDF 전체 조립(표지 → 속표지 → 프롤로그 → 목차 → 명식·오행 → 1~6장 → 7장 → 8장 → 9장 → 엔딩 → 마지막 편지).
 * [2026-09-29] 8장(귀인·신살)·9장(종합) 추가 — 1~7장 승인 원고는 한 글자도 건드리지 않았다. 8·9장 모두
 * 원고를 새로 쓰지 않고 이미 검증된 값(report.gwiinSinsalSection / report.chapterNineSection)을 그대로
 * 배치만 한다(ReportPdfBook.tsx의 buildChapterGwiin/buildChapterNine과 같은 데이터 소스, 표시만 다크로).
 * 상품 PDF 경로(generateBookPdfBuffer)에는 아직 연결하지 않는다.
 * 앞·뒤 페이지 문구는 밝은 상품 PDF(ReportPdfBook/ReportPdfPrototype)의 문구를 그대로 옮겼고, 표시(색·크기·배치)만 다크로 바꾼 것이다.
 */
const TAGLINE = "여덟 글자에 새겨진 운명, 그 문을 엽니다.";

function DarkCover({ report, fairy }: { report: ReportResult; fairy: FairyImageSlot }) {
  return (
    <section className="page pg-cover">
      <div className="cimg">{fairy.dataUri && <img src={fairy.dataUri} alt="" />}</div>
      <div className="ctop">
        <p className="ceye">PALJAMUN</p>
        <p className="cbrand">八字門</p>
        <p className="ckr">팔 자 문</p>
      </div>
      <div className="cbot">
        <div className="rule" />
        <p className="ctag">{TAGLINE}</p>
        <p className="cname">{report.userName}님의 타고난 운명록</p>
      </div>
    </section>
  );
}

function DarkTitlePage({ report, intake }: { report: ReportResult; intake: IntakeFormData }) {
  const calendarLabel = intake.calendarType === "lunar" ? "음력" : "양력";
  const timeLabel = intake.timeUnknown || intake.hour === null ? "출생시간 미상" : `${String(intake.hour).padStart(2, "0")}시 ${String(intake.minute).padStart(2, "0")}분`;
  const facts: [string, string][] = [
    ["이름", report.userName],
    ["생년월일", `${intake.year}년 ${intake.month}월 ${intake.day}일 (${calendarLabel})`],
    ["태어난 시간", timeLabel],
    ["일간", report.dayMasterLabel],
  ];
  return (
    <section className="page pg-title">
      <p className="tbrand">八字門</p>
      <p className="tkr">팔 자 문 · PALJAMUN</p>
      <div className="rule" style={{ margin: "26px auto" }} />
      <p className="ttag">{TAGLINE}</p>
      <p className="tname">{report.userName}님의 평생운명록</p>
      <div className="tfacts">
        {facts.map(([k, v]) => (
          <div className="tfact" key={k}><span className="lab">{k}</span><span className="tv">{v}</span></div>
        ))}
      </div>
    </section>
  );
}

function DarkPrologue({ report }: { report: ReportResult }) {
  return (
    <section className="page pg-prolog">
      <span className="lab" style={{ textAlign: "center", marginBottom: 26 }}>— 이 책을 열며 —</span>
      <p className="pr">여덟 글자는 태어난 순간 정해지지만, 운명을 알면 앞으로의 삶은 바꿔나갈 수 있습니다.</p>
      <p className="pr">이 책은 {report.userName}님의 사주 여덟 글자를 하나씩 풀어, 타고난 기질부터 사랑, 재물, 인생의 전환점, 그리고 앞으로의 10년까지 — 한 사람의 서사로 엮어 담았습니다.</p>
      <p className="pr pe">가벼운 재미가 아니라, 오래 곁에 두고 다시 펼쳐볼 기록이 되기를 바랍니다.</p>
    </section>
  );
}

function DarkToc({ entries }: { entries: { label: string; title: string }[] }) {
  return (
    <section className="page pg-toc">
      <span className="lab">— 目 次 —</span>
      <div className="title first" style={{ marginTop: 14 }}>목차</div>
      <div className="rule" />
      {entries.map((e, i) => (
        <div className="trow" key={i}><span className="tl">{e.label}</span><span className="tt">{e.title}</span></div>
      ))}
    </section>
  );
}

function DarkEnding({ report, fairy }: { report: ReportResult; fairy: FairyImageSlot }) {
  return (
    <section className="page pg-end">
      <div className="eimg">{fairy.dataUri && <img src={fairy.dataUri} alt="" />}</div>
      <div className="ebody">
        <p className="ebrand">八字門</p>
        <div className="rule" style={{ margin: "14px auto 18px" }} />
        <p className="emsg">팔자를 알면</p>
        <p className="emsg" style={{ marginBottom: 0 }}>운명을 바꿀 수 있습니다.</p>
      </div>
    </section>
  );
}

function DarkLetter({ report, bg }: { report: ReportResult; bg: FairyImageSlot }) {
  return (
    <section className="page pg-letter">
      <div className="limg">{bg.dataUri && <img src={bg.dataUri} alt="" />}</div>
      <div className="lbody">
        <div className="ltitle">마지막으로, {report.userName}님에게</div>
        <div className="rule" />
        <p className="lline">여덟 글자는 태어난 순간 정해지지만, 나의 운명을 알면 앞으로의 삶은 바꿔나갈 수 있습니다.</p>
        <p className="lline">명리학은 운명을 읽고, 삶을 바라보는 하나의 수단입니다.</p>
      </div>
    </section>
  );
}

/** 7장 그래프 — report.chapterTenYear.items[].flowIntensity를 그대로 쓴다(새 계산 없음,
 * ReportPdfBook.tsx buildChapterTenYear()의 "ty-map"과 같은 값). 이번 세션에서 이미 검수·승인된
 * 다크 그래프 패턴(막대/연도 라벨/범례)을 그대로 옮긴 것 — 새 그래프 디자인이 아니다. 대운 전환
 * 강조는 넣지 않는다(확정 지시). 기존 다크 공통 클래스(page/lab/title/rule)만 쓰고 새 CSS 없음. */
function DarkTenYearGraph({ c, label }: { c: NonNullable<ReportResult["chapterTenYear"]>; label: string }) {
  const introFirst = c.intro.split("\n\n")[0] ?? c.intro;
  return (
    <section className="page">
      <span className="lab">{label} · 10년의 흐름</span>
      <div className="title first" style={{ marginTop: 10 }}>앞으로 10년의 흐름</div>
      <p style={{ fontSize: 16, lineHeight: 1.7, color: "var(--ivory)", marginBottom: 20 }}>{introFirst}</p>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 150, marginTop: 6 }}>
        {c.items.map((it) => (
          <div key={it.year} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
            <div style={{ width: "68%", borderRadius: "3px 3px 0 0", height: `${Math.max(8, it.flowIntensity)}%`, background: "var(--bronze)" }} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
        {c.items.map((it) => (
          <div key={it.year} style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "var(--gold)", whiteSpace: "nowrap" }}>{it.ganZhiHanja}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ivory)", whiteSpace: "nowrap" }}>{it.year}</div>
            <div style={{ fontSize: 10, color: "var(--mute)", whiteSpace: "nowrap" }}>{it.age}세</div>
          </div>
        ))}
      </div>
      <div className="rule" style={{ margin: "20px 0 12px" }} />
      <p style={{ fontSize: 13, lineHeight: 1.6, color: "#A0957D" }}>막대 높이 = 이 10년 안에서의 상대적 신호 밀도(절대적인 길흉 점수는 아님).</p>
    </section>
  );
}

/** 7장 — [2026-10-01] 구버전 lib/futureYearsChapter 직접 재호출을 제거하고, 오늘 확정된 최신
 * Production 7장(lib/tenYearNarrative.ts → report.chapterTenYear, ReportPdfBook.tsx의
 * buildChapterTenYear()와 동일 소스)을 그대로 렌더링한다. 여기서 새 계산·새 문장을 만들지 않고,
 * 이미 계산된 값(연도별 narrative/coreSignal/highlights/segments/closing)만 배치한다. */
export function DarkChapter7({ report, fairy, label }: { report: ReportResult; fairy: FairyImageSlot; label: string }) {
  const c = report.chapterTenYear;
  if (!c) return null;
  const title = `${report.userName}님의 앞으로의 10년`;
  const short = "제" + label.replace(/^제/, "");
  const lab = `${short} · 앞으로의 10년`;
  return (
    <>
      <DarkHero fairy={fairy} label={lab} title={title} />
      <DarkTenYearGraph c={c} label={lab} />
      <Flow label={lab}>
        <Head text="2026년부터 2035년까지" />
        {c.items.map((it) => (
          <React.Fragment key={it.year}>
            <Head2 text={`${it.year} · ${it.ganZhiHanja}(${it.ganZhiHangul}) · ${it.age}세${it.isTransitionYear ? " · 대운 전환" : ""} — ${it.coreSignal}`} />
            <Paras items={it.narrative.split("\n\n")} />
          </React.Fragment>
        ))}
        <Head text="10년을 한 번에 보면" />
        <Paras items={c.segments.map((seg) => `${seg.range} — ${seg.summary}`)} />
        <Paras items={c.closing.split("\n\n")} />
      </Flow>
    </>
  );
}

/** 8장 — 귀인과 신살(report.gwiinSinsalSection). 원고 그대로(content/paid-report/05-gwiin-sinsal-draft.md
 * 승인본, ReportPdfBook.tsx의 buildChapterGwiin과 동일 소스), 표시만 다크 컴포넌트(Head2/Paras)로 배치. */
export function DarkChapter8({ report, fairy, label }: { report: ReportResult; fairy: FairyImageSlot; label: string }) {
  const c = report.gwiinSinsalSection;
  if (!c) return null;
  const lab = `${label} · 귀인과 신살`;
  return (
    <>
      <DarkHero fairy={fairy} label={lab} title={c.title} />
      <Flow label={lab}>
        <Paras items={[c.intro]} />
        {c.detail.map((item, idx) => (
          <React.Fragment key={idx}>
            <Head2 text={item.name} />
            <Paras items={[item.body]} />
          </React.Fragment>
        ))}
        {c.brief.length > 0 && (
          <>
            <Head2 text="함께 들어 있는 기운" />
            {c.brief.map((item, idx) => (
              <p className="blk" key={idx}><strong>{item.name}</strong> — {item.body}</p>
            ))}
          </>
        )}
        {c.closing && <Paras items={[c.closing]} />}
      </Flow>
    </>
  );
}

/** 9장 — 종합(report.chapterNineSection). lib/chapterNineNarrative.ts가 1~8장의 이미 검증된 계산
 * 결과만 재조합해 만든 짧은 제목+본문 하나. 여기서 새 문장을 짓지 않는다(ReportPdfBook.tsx의
 * buildChapterNine과 동일 소스). 9장 전용 이미지가 아직 없어 엔딩 이미지를 재사용한다(새 이미지 자산 추가 없음). */
export function DarkChapter9({ report, fairy, label }: { report: ReportResult; fairy: FairyImageSlot; label: string }) {
  const c = report.chapterNineSection;
  if (!c) return null;
  const lab = `${label} · 종합`;
  return (
    <>
      <DarkHero fairy={fairy} label={lab} title={c.title} />
      <Flow label={lab}>
        <Paras items={[c.intro]} />
        {c.closing && <Paras items={[c.closing]} />}
      </Flow>
    </>
  );
}

export interface DarkFullProps { report: ReportResult; appData: AppData; intake: IntakeFormData; fairies: BookFairySlots }

export default function ReportPdfBookDarkDocument({ report, appData, intake, fairies }: DarkFullProps) {
  const name = report.userName;
  // 장 순번은 DarkBookChapters1to6과 같은 규칙(실제 존재하는 장만 순서대로).
  const order: { present: boolean; title: string }[] = [
    { present: true, title: report.chapterOne.title },
    { present: !!report.chapters[1], title: report.chapters[1]?.title ?? "" },
    { present: !!report.chapters[2], title: report.chapters[2]?.title ?? "" },
    { present: !!report.chapterLove, title: report.chapterLove?.title ?? "" },
    { present: !!report.chapterWealthInsight, title: `${name}님의 재물운` },
    { present: !!report.chapterLifeTransition, title: report.chapterLifeTransition?.title ?? "" },
  ];
  // 목차 표시용 제목만 "{이름}님의 " 접두어를 제거한다(실제 각 장 본문 제목인 o.title/report.*.title 자체는 건드리지 않음).
  const tocTitle = (t: string) => t.replace(`${name}님의 `, "");

  const toc: { label: string; title: string }[] = [];
  let n = 0;
  order.forEach((o) => { if (o.present) { n += 1; toc.push({ label: `제${n}장`, title: tocTitle(o.title) }); } });
  n += 1;
  const ch7Label = `제${n}장`;
  toc.push({ label: ch7Label, title: "앞으로의 10년" });

  let ch8Label = "";
  if (report.gwiinSinsalSection) {
    n += 1;
    ch8Label = `제${n}장`;
    toc.push({ label: ch8Label, title: tocTitle(report.gwiinSinsalSection.title) });
  }
  let ch9Label = "";
  if (report.chapterNineSection) {
    n += 1;
    ch9Label = `제${n}장`;
    toc.push({ label: ch9Label, title: "종합" });
  }

  return (
    <div className="doc">
      <DarkCover report={report} fairy={fairies.cover} />
      <DarkTitlePage report={report} intake={intake} />
      <DarkPrologue report={report} />
      <DarkToc entries={toc} />
      <DarkBookChapters1to6 report={report} appData={appData} intake={intake} fairies={fairies} />
      <DarkChapter7 report={report} fairy={fairies.tenYear} label={ch7Label} />
      {report.gwiinSinsalSection && <DarkChapter8 report={report} fairy={fairies.gwiin} label={ch8Label} />}
      {report.chapterNineSection && <DarkChapter9 report={report} fairy={fairies.ending} label={ch9Label} />}
      <DarkEnding report={report} fairy={fairies.ending} />
      <DarkLetter report={report} bg={fairies.letterBg} />
    </div>
  );
}
