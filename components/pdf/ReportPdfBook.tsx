import React from "react";
import { ReportResult, ChapterTenYearItem } from "@/lib/reportMapper";
import { IntakeFormData } from "@/lib/sajuEngine";
import { AppData } from "@/lib/sajuContent";
import { analyzeWealthTiming } from "@/lib/wealthTimingAnalysis";
import { Paragraphs, ChapterTitle, TenYearTimelineLight } from "./ReportPdfPrimitives";
import {
  FairyImageSlot,
  IntroPage,
  TableOfContents,
  TocEntry,
  EndingPage,
  WealthTimelineSegment,
} from "./ReportPdfPrototype";

/**
 * ["평생운명록" PDF 전면 재설계, 2026-09] — 45p 전체를 새 디자인
 * 시스템(HANJI_BOOK_STYLE)으로 다시 조립하는 책 전용 파일.
 *
 * 원칙(사용자 지시문 §3/§27/§28 그대로):
 *  - 새 사주 계산·새 해석·새 문장을 만들지 않는다. 모든 텍스트는
 *    ReportResult(reportMapper.ts가 이미 계산·조립한 값)를 그대로
 *    옮기거나, 페이지를 나눌 때 순서만 유지한 채 재배치한다.
 *  - 기존 45p 조립(ReportPdfDocument.tsx, 승인 대기 상태) — commit 여부와
 *    무관하게 — 은 이 파일이 전혀 import/수정하지 않는다. 완전히 별도
 *    조립(ReportPdfBookDocument)이며, 실제 상품 경로(generateReportPdfBuffer)
 *    에서는 호출되지 않는다(scripts/_pdf_book_v1_gen.ts 전용).
 *  - 1~8장·명식·오행·사랑·재물·전환점·10년·귀인신살의 모든 실제 문장을
 *    빠짐없이, 중복 없이 포함한다(§28) — 각 챕터 함수의 주석에 원본
 *    필드 출처를 명시해 대조 가능하게 한다.
 */

/* ────────────────────────────────────────────────────────────────
 * 공통 유틸 · 팔레트
 * ──────────────────────────────────────────────────────────────── */

function BookOrnament({ color = "#7A4310" }: { color?: string }) {
  return (
    <svg width="92" height="22" viewBox="0 0 92 22" xmlns="http://www.w3.org/2000/svg" style={{ margin: "0 auto 16pt", display: "block" }}>
      <path d="M4 12 C 20 3, 35 21, 46 12 C 57 3, 72 21, 88 12" stroke={color} strokeWidth="1" fill="none" />
      <circle cx="20" cy="7.4" r="1.8" fill={color} />
      <circle cx="46" cy="12" r="1.8" fill={color} />
      <circle cx="72" cy="7.4" r="1.8" fill={color} />
    </svg>
  );
}

/** 章마다 강조 온도만 다르게(§10) — 팔레트 자체는 하나(잉크·브론즈
 * 계열)를 유지하고 라벨/포인트 색만 바꾼다. 계산값과 무관한 순수
 * 프레젠테이션 상수다. */
const CHAPTER_ACCENT: Record<string, string> = {
  one: "#6B3D14",
  two: "#6B3D14",
  three: "#6B3D14",
  love: "#8C3B4E",
  wealth: "#8A5A12",
  lifeTransition: "#5C4A73",
  tenYear: "#33505E",
  gwiin: "#9C6B22",
};

/** 오행 — 책 전용 색(§18): 서로 뚜렷이 구별되면서도 원색 그대로가
 * 아닌, 채도를 한 단계 낮춘 색. ResultLandingV2.tsx의 ELEMENT_COLORS
 * (웹 화면, 절대 보호)와는 별개의 PDF 전용 상수이며 report.elementBalance
 * 의 계산값(%) 자체는 전혀 건드리지 않는다. */
export const BOOK_ELEMENT_COLORS: Record<string, string> = {
  wood: "#2E6B45",
  fire: "#AE4430",
  earth: "#A9752A",
  metal: "#8A7A52",
  water: "#2E5470",
};

/** 재물 시기(A~E) — 이미 계산된 라벨 문자열에 색만 입힌다(판정 자체는
 * analyzeWealthTiming 그대로). */
const BOOK_TIMING_COLOR: Record<string, string> = {
  "강화형(A)": "#A9752A",
  "부담형(B)": "#9C3B2E",
  "기반형(C)": "#4B6B4E",
  "분산/흔들림형(D)": "#6B5C82",
  "신호없음형(E)": "#8B8070",
};

/* ────────────────────────────────────────────────────────────────
 * 표지 재설계(2026-09) — 기존 PremiumCover(ReportPdfPrototype.tsx,
 * 45p 상품 경로가 그대로 쓰는 승인된 표지)는 전혀 건드리지 않는다.
 * 이 책 전용 새 컴포넌트. 텍스트는 전부 기존 실제 데이터 그대로:
 *  - report.userName(고객명, 동적) · tagline(기존 고정 브랜드 문구,
 *    새로 짓지 않음) · generatedAt(발급일, 동적) — PremiumCover와
 *    100% 같은 데이터 소스, 배치·크기·색만 다시 잡았다.
 *  - "평생운명록"을 별도 줄로 또 반복하지 않는다 — 실제 데이터에
 *    있는 "{이름}님의 평생운명록" 한 줄만 크게 키워 쓴다(같은 뜻
 *    중복 금지 지시 반영).
 * ──────────────────────────────────────────────────────────────── */
export function BookCover({
  report, tagline, generatedAt, fairy,
}: {
  report: ReportResult; tagline: string; generatedAt: string; fairy: FairyImageSlot;
}) {
  return (
    <section className="bcover">
      <div className="bcover-frame">
        {fairy.dataUri ? (
          <img className="bcover-img" src={fairy.dataUri} alt="" />
        ) : (
          <div className="bcover-fallback">
            <span>선녀 이미지 자리</span>
            <span>{fairy.expectedPath}</span>
          </div>
        )}
        <div className="bcover-top-scrim">
          <p className="bcover-eyebrow">PALJAMUN</p>
          <p className="bcover-brand-cn">八字門</p>
          <p className="bcover-brand-kr">팔 자 문</p>
        </div>
        <div className="bcover-bottom-scrim">
          <div className="bcover-divider" />
          <p className="bcover-tagline">{tagline}</p>
          <p className="bcover-name">{report.userName}님의 평생운명록</p>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
 * 프롤로그 — ReportPdfDocument.tsx의 ProloguePage와 완전히 동일한
 * 문자열(속표지·목차 사이 서문, 명리 해석 아님). 순환 참조 방지를 위해
 * 이 파일에서 동일하게 다시 선언한다(원본은 export되어 있지 않다).
 * ──────────────────────────────────────────────────────────────── */
function BookProloguePage({ report }: { report: ReportResult }) {
  return (
    <section className="hprologue">
      <p className="hprologue-eyebrow">— 이 책을 열며 —</p>
      <p className="hprologue-text">
        여덟 글자는 태어난 순간 정해지지만, 그것을 어떻게 읽고 살아가는지는 늘 당신의 몫이었습니다.
      </p>
      <p className="hprologue-text">
        이 책은 {report.userName}님의 사주 여덟 글자를 하나씩 풀어, 타고난 기질부터 사랑, 재물,
        인생의 전환점, 그리고 앞으로의 10년까지 — 한 사람의 서사로 엮어 담았습니다.
      </p>
      <p className="hprologue-text hprologue-emph">가벼운 재미가 아니라, 오래 곁에 두고 다시 펼쳐볼 기록이 되기를 바랍니다.</p>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
 * 명식 / 오행 — 큰 데이터 페이지(§17/§18)
 * ──────────────────────────────────────────────────────────────── */

/** [2026-09 사용자 피드백] "너무 밋밋하다" — 한자를 오행별 색으로
 * 구분한다. `elementKey`는 reportMapper.ts에 이미 있던 필드(그 자체의
 * 주석이 "칸 배경색을 오행별로 칠할 때 쓴다"였다)를 이번에 처음 실제로
 * 쓰는 것뿐 — 새 계산 없음. 시간 미상 등으로 칸이 비어 elementKey가
 * 없으면(현재 구조상 발생 안 하지만 방어적으로) 무채색 잉크로 폴백한다.
 * 색은 오행 페이지(BOOK_ELEMENT_COLORS)와 완전히 동일한 팔레트를 재사용
 * — 책 전체에서 "이 색 = 이 오행"이라는 규칙이 일관되게 유지된다. */
function elementHanjaColor(key?: string): string {
  return (key && BOOK_ELEMENT_COLORS[key]) || "#17110A";
}

export function BookMyeongsikPage({ report }: { report: ReportResult }) {
  const { stems, branches } = report.pillars;
  return (
    <section className="b-chapter bpage b-texture-weak">
      <span className="b-label" style={{ color: "#8A5A12" }}>命 式</span>
      <h2 className="bdata-title">{report.userName}님의 사주 원국</h2>
      <p className="bdata-sub">— 時 · 日 · 月 · 年 —</p>
      <div className="bmyeongsik-plaque">
        <div className="bmyeongsik-grid">
          {stems.map((c, i) => (
            <div className={`bmyeongsik-cell${c.isDay ? " day-cell" : ""}`} key={`s${i}`}>
              {c.label && <span className="blabel-top">{c.label}</span>}
              <span className="bhanja" style={{ color: elementHanjaColor(c.elementKey) }}>{c.hanja}</span>
              <span className="bsub">{c.hangul} · {c.element}</span>
              {c.sipseong && <span className="bsipseong">{c.sipseong}</span>}
            </div>
          ))}
          {branches.map((c, i) => (
            <div className={`bmyeongsik-cell${c.isDay ? " day-cell" : ""}`} key={`b${i}`}>
              <span className="bhanja" style={{ color: elementHanjaColor(c.elementKey) }}>{c.hanja}</span>
              <span className="bsub">{c.hangul} · {c.element}</span>
              {c.sipseong && <span className="bsipseong">{c.sipseong}</span>}
            </div>
          ))}
        </div>
      </div>
      <p className="bp" style={{ textAlign: "center" }}>{report.summaryTitle} — {report.dayMasterLabel}.</p>
    </section>
  );
}

function buildBookOhangArcs(report: ReportResult) {
  const r = 84;
  const circumference = 2 * Math.PI * r;
  let cumulative = 0;
  return report.elementBalance.map((el) => {
    const frac = el.value / 100;
    const dash = frac * circumference;
    const offset = -cumulative * circumference;
    cumulative += frac;
    return { ...el, dash, offset, circumference, r };
  });
}

export function BookOhangPage({ report }: { report: ReportResult }) {
  const strongestLabel = report.elementBalance.find((e) => e.key === report.elementStrongest)?.label;
  const weakestLabel = report.elementBalance.find((e) => e.key === report.elementWeakest)?.label;
  const arcs = buildBookOhangArcs(report);
  return (
    <section className="b-chapter bpage b-texture-weak">
      <span className="b-label">五 行</span>
      <h2 className="bdata-title">{report.userName}님의 오행 균형</h2>
      <p className="bdata-sub">사주 여덟 글자 안에 담긴 다섯 기운의 비율입니다 — 계산값은 그대로, 표현만 또렷하게.</p>
      <div style={{ display: "flex", justifyContent: "center", margin: "6pt 0 20pt" }}>
        <svg viewBox="0 0 216 216" className="bohang-wheel-svg" xmlns="http://www.w3.org/2000/svg">
          <circle cx="108" cy="108" r="84" fill="none" stroke="#E4D6B8" strokeWidth="26" />
          {arcs.map((a) => (
            <circle
              key={a.key} cx="108" cy="108" r={a.r} fill="none"
              stroke={BOOK_ELEMENT_COLORS[a.key] ?? "#8B7257"} strokeWidth="26"
              strokeDasharray={`${a.dash} ${a.circumference - a.dash}`}
              strokeDashoffset={a.offset} transform="rotate(-90 108 108)"
            />
          ))}
          <text x="108" y="103" textAnchor="middle" className="bohang-center-label">五行</text>
          <text x="108" y="126" textAnchor="middle" className="bohang-center-sub">균형</text>
        </svg>
      </div>
      <div>
        {report.elementBalance.map((el) => (
          <div className="bohang-row" key={el.key} style={{ background: `${BOOK_ELEMENT_COLORS[el.key]}16` }}>
            <span className="bohang-chip" style={{ background: BOOK_ELEMENT_COLORS[el.key] ?? "#8B7257" }} />
            <span className="bohang-name">{el.label}</span>
            <div className="bohang-track">
              <div className="bohang-fill" style={{ width: `${el.value}%`, background: BOOK_ELEMENT_COLORS[el.key] ?? "#8B7257" }} />
            </div>
            <span className="bohang-value">{el.value}%</span>
          </div>
        ))}
      </div>
      <p className="bohang-note">
        가장 강한 기운은 <strong>{strongestLabel}</strong>, 가장 약한 기운은 <strong>{weakestLabel}</strong>입니다.
      </p>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
 * 챕터 전환(Hero) / 인사이트 페이지 — 8장 공통 문법(§13/§9)
 * ──────────────────────────────────────────────────────────────── */

export function BookChapterHero({
  fairy, label, title, lead, accent,
}: {
  fairy: FairyImageSlot; label: string; title: string; lead?: string; accent: string;
}) {
  return (
    <section className="bhero">
      <div className="bhero-img-wrap">
        {fairy.dataUri ? (
          <img className="bhero-img" src={fairy.dataUri} alt="" />
        ) : (
          <div className="hopen-fallback">
            <span>선녀 이미지 자리</span>
            <span>{fairy.expectedPath}</span>
          </div>
        )}
        <div className="bhero-scrim-top">
          <p className="bhero-eyebrow">PALJAMUN</p>
        </div>
        <div className="bhero-fade" />
      </div>
      <div className="bhero-body">
        <p className="b-label" style={{ color: accent, textAlign: "center" }}>{label}</p>
        <h2 className="bhero-title">{title}</h2>
        <BookOrnament color={accent} />
        {lead && <p className="bhero-lead">{lead}</p>}
      </div>
    </section>
  );
}

/** 사진 재사용 인사이트(§11 — crop/확대/위치/밝기를 달리해 다른 장면처럼
 * 보이게 한다): objectPosition/scale로 같은 파일을 다른 인상으로 쓴다. */
export function BookQuoteImage({
  fairy, label, quote, accent, objectPosition = "50% 30%", zoom = 1,
}: {
  fairy: FairyImageSlot; label: string; quote: string; accent: string; objectPosition?: string; zoom?: number;
}) {
  return (
    <section className="bquote-page">
      <div className="bquote-img-wrap">
        {fairy.dataUri ? (
          <img
            className="bquote-img"
            src={fairy.dataUri}
            alt=""
            style={{ objectPosition, transform: zoom !== 1 ? `scale(${zoom})` : undefined }}
          />
        ) : (
          <div className="hopen-fallback">
            <span>선녀 이미지 자리</span>
            <span>{fairy.expectedPath}</span>
          </div>
        )}
      </div>
      <div className="bquote-body">
        <p className="bquote-mark" style={{ color: accent }}>“</p>
        <p className="b-label" style={{ color: accent, textAlign: "center" }}>{label}</p>
        <p className="bquote-text">{quote}</p>
      </div>
    </section>
  );
}

/** 사진 없이 한지 여백만으로 만드는 인사이트(§8 변주, §25 리듬). */
export function BookQuotePlain({ label, quote, accent }: { label: string; quote: string; accent: string }) {
  return (
    <section className="bquote-plain bpage b-texture-strong">
      <p className="bquote-mark" style={{ color: accent }}>“</p>
      <p className="b-label" style={{ color: accent }}>{label}</p>
      <p className="bquote-text" style={{ maxWidth: "128mm" }}>{quote}</p>
      <BookOrnament color={accent} />
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
 * 一 타고난 본질(chapterOne) — 출처: report.chapterOne(cheoneulOpening/
 * goldHook/body1~4/redInsight/cardText), report.chapterOneDeep(sections/
 * visual). 문장 순서·내용 100% 동일, 페이지만 재배치:
 *   Hero(lead=goldHook) → 인사이트(cardText) → 본문1(cheoneul+body1+body2)
 *   → 본문2(redInsight+body3+body4) → 심화(compareInsight+태그+sections)
 * ──────────────────────────────────────────────────────────────── */
export function buildChapterOne(report: ReportResult, fairy: FairyImageSlot, seqLabel: string): React.ReactElement[] {
  const c = report.chapterOne;
  const deep = report.chapterOneDeep;
  const accent = CHAPTER_ACCENT.one;
  const out: React.ReactElement[] = [
    <BookChapterHero key="one-hero" fairy={fairy} label={seqLabel} title={c.title} lead={c.goldHook} accent={accent} />,
    <BookQuoteImage key="one-quote" fairy={fairy} label={`${seqLabel} · 핵심 통찰`} quote={c.cardText} accent={accent} objectPosition="60% 15%" zoom={1.12} />,
    <section className="b-chapter bpage b-texture-weak" key="one-body1">
      <h3 className="b-subheading">타고난 바탕</h3>
      {c.cheoneulOpening && <p className="bp b-card">{c.cheoneulOpening}</p>}
      {c.body1.filter(Boolean).map((p, i) => <p className="bp" key={`b1-${i}`}>{p}</p>)}
      {c.body2.filter(Boolean).map((p, i) => <p className="bp" key={`b2-${i}`}>{p}</p>)}
    </section>,
    <section className="b-chapter bpage b-texture-weak" key="one-body2">
      <h3 className="b-subheading">겉과 속</h3>
      <p className="bp b-quote">{c.redInsight}</p>
      {c.body3.filter(Boolean).map((p, i) => <p className="bp" key={`b3-${i}`}>{p}</p>)}
      {c.body4.filter(Boolean).map((p, i) => <p className="bp" key={`b4-${i}`}>{p}</p>)}
    </section>,
  ];
  if (deep) {
    out.push(
      <section className="b-chapter bpage b-texture-weak" key="one-deep">
        <span className="b-label">{seqLabel} · 심화 통찰</span>
        <h3 className="b-subheading" style={{ marginTop: 0 }}>겉으로 보이는 나, 안에서 움직이는 힘</h3>
        <p className="bp b-card">{deep.visual.compareInsight}</p>
        {(deep.visual.easy.length > 0 || deep.visual.effortful.length > 0) && (
          <div className="dtag-row" style={{ margin: "4pt 0 16pt" }}>
            {deep.visual.easy.map((t) => <span className="dtag dtag-easy" key={`e-${t}`} style={{ color: "#3E5A3B", borderColor: "#5C7355" }}>쉽게 쓰는 힘 · {t}</span>)}
            {deep.visual.effortful.map((t) => <span className="dtag dtag-effort" key={`f-${t}`} style={{ color: "#8B4A3A", borderColor: "#8B4A3A" }}>에너지가 더 필요한 힘 · {t}</span>)}
          </div>
        )}
        {deep.sections.map((s, idx) => (
          <div key={idx} style={{ marginBottom: "10pt" }}>
            <h4 className="b-subsubheading">{s.heading}</h4>
            {s.body.filter(Boolean).map((p, i) => <p className="bp" key={i}>{p}</p>)}
          </div>
        ))}
      </section>
    );
  }
  return out;
}

/* ────────────────────────────────────────────────────────────────
 * 二 타고난 기질(chapters[1], richBody) — 출처: killpoint(hero lead),
 * richBody.intro/subheadingA/bodyA/redLine/subheadingB/bodyB,
 * chapterTwoDeep(sections/visual.bars/domains). ──────────────────
 * ──────────────────────────────────────────────────────────────── */
export function buildChapterTwo(report: ReportResult, fairy: FairyImageSlot, seqLabel: string): React.ReactElement[] {
  const c = report.chapters[1];
  if (!c) return [];
  const rb = c.richBody;
  const deep = report.chapterTwoDeep;
  const accent = CHAPTER_ACCENT.two;
  const out: React.ReactElement[] = [
    <BookChapterHero key="two-hero" fairy={fairy} label={seqLabel} title={c.title} lead={c.killpoint} accent={accent} />,
  ];
  if (rb) {
    out.push(
      <BookQuotePlain key="two-quote" label={`${seqLabel} · 핵심 통찰`} quote={rb.redLine} accent={accent} />,
      <section className="b-chapter bpage b-texture-weak" key="two-body1">
        <h3 className="b-subheading">{rb.subheadingA}</h3>
        {rb.intro && <p className="bp b-card">{rb.intro}</p>}
        {rb.bodyA.filter(Boolean).map((p, i) => <p className="bp" key={i}>{p}</p>)}
      </section>,
      <section className="b-chapter bpage b-texture-weak" key="two-body2">
        <h3 className="b-subheading">{rb.subheadingB}</h3>
        {rb.bodyB.filter(Boolean).map((p, i) => <p className="bp" key={i}>{p}</p>)}
      </section>
    );
  } else {
    out.push(
      <section className="b-chapter bpage b-texture-weak" key="two-body">
        {c.body.filter(Boolean).map((p, i) => <p className="bp" key={i}>{p}</p>)}
        {c.highlight && <p className="bp b-card">{c.highlight}</p>}
      </section>
    );
  }
  if (deep) {
    out.push(
      <section className="b-chapter bpage b-texture-weak" key="two-deep">
        <span className="b-label">{seqLabel} · 심화 통찰</span>
        {deep.visual.bars.length > 0 && (
          <div className="hdeep-bars" style={{ marginTop: "4pt" }}>
            {deep.visual.bars.map((b) => (
              <div className="hdeep-bar-row" key={b.category}>
                <span className="hdeep-bar-name">{b.category}</span>
                <div className="hdeep-bar-track"><div className="hdeep-bar-fill" style={{ width: `${b.widthPercent}%` }} /></div>
              </div>
            ))}
          </div>
        )}
        {deep.visual.domains.length > 0 && (
          <div className="hdeep-domain-grid">
            {deep.visual.domains.map((d, idx) => (
              <div className="hdeep-domain-card" key={idx}>
                <span className="hdeep-domain-area">{d.area} · {d.category}</span>
                <p className="hdeep-domain-lead">{d.lead}</p>
                <p className="hdeep-domain-detail">{d.detail}</p>
              </div>
            ))}
          </div>
        )}
        {deep.sections.map((s, idx) => (
          <div key={idx} style={{ marginBottom: "10pt" }}>
            <h4 className="b-subsubheading">{s.heading}</h4>
            {s.body.filter(Boolean).map((p, i) => <p className="bp" key={i}>{p}</p>)}
          </div>
        ))}
      </section>
    );
  }
  return out;
}

/* ────────────────────────────────────────────────────────────────
 * 三 살아가는 방식(chapters[2], flat body) — 출처: killpoint/body/
 * highlight, chapterThreeDeep(sections/visual.comfort/tension).
 * ──────────────────────────────────────────────────────────────── */
export function buildChapterThree(report: ReportResult, fairy: FairyImageSlot, seqLabel: string): React.ReactElement[] {
  const c = report.chapters[2];
  if (!c) return [];
  const deep = report.chapterThreeDeep;
  const accent = CHAPTER_ACCENT.three;
  const body = c.body.filter(Boolean);
  const mid = Math.ceil(body.length / 2);
  const out: React.ReactElement[] = [
    <BookChapterHero key="three-hero" fairy={fairy} label={seqLabel} title={c.title} lead={c.killpoint} accent={accent} />,
    <BookQuoteImage key="three-quote" fairy={fairy} label={`${seqLabel} · 핵심 통찰`} quote={c.highlight} accent={accent} objectPosition="40% 20%" zoom={1.15} />,
    <section className="b-chapter bpage b-texture-weak" key="three-body1">
      {body.slice(0, mid).map((p, i) => <p className="bp" key={i}>{p}</p>)}
    </section>,
    <section className="b-chapter bpage b-texture-weak" key="three-body2">
      {body.slice(mid).map((p, i) => <p className="bp" key={i}>{p}</p>)}
    </section>,
  ];
  if (deep) {
    out.push(
      <section className="b-chapter bpage b-texture-weak" key="three-deep">
        <span className="b-label">{seqLabel} · 심화 통찰</span>
        {(deep.visual.comfort.length > 0 || deep.visual.tension.length > 0) && (
          <div className="hdeep-pair-cols" style={{ marginTop: "4pt" }}>
            {deep.visual.comfort.length > 0 && (
              <div className="hdeep-pair-col">
                <p className="hdeep-pair-title">나에게 편한 관계</p>
                {deep.visual.comfort.map((p, i) => <p className="hdeep-pair-item" key={i}>{p.aLabel}·{p.bLabel} — {p.aHint} / {p.bHint}</p>)}
              </div>
            )}
            {deep.visual.tension.length > 0 && (
              <div className="hdeep-pair-col">
                <p className="hdeep-pair-title">긴장이 생기기 쉬운 관계</p>
                {deep.visual.tension.map((p, i) => <p className="hdeep-pair-item" key={i}>{p.aLabel}·{p.bLabel} — {p.aHint} / {p.bHint}</p>)}
              </div>
            )}
          </div>
        )}
        {deep.sections.map((s, idx) => (
          <div key={idx} style={{ marginBottom: "10pt" }}>
            <h4 className="b-subsubheading">{s.heading}</h4>
            {s.body.filter(Boolean).map((p, i) => <p className="bp" key={i}>{p}</p>)}
          </div>
        ))}
      </section>
    );
  }
  return out;
}

/* ────────────────────────────────────────────────────────────────
 * 四 사랑과 인연(chapterLove) — 출처: report.chapterLove.sections[]
 * (heading/body[]), 전부 순서 유지. ──────────────────────────────
 * ──────────────────────────────────────────────────────────────── */
export function buildChapterLove(report: ReportResult, fairy: FairyImageSlot, seqLabel: string): React.ReactElement[] {
  const c = report.chapterLove;
  if (!c) return [];
  const accent = CHAPTER_ACCENT.love;
  const sections = c.sections;
  const mid = Math.ceil(sections.length / 2);
  // 인사이트 인용구는 첫 섹션의 첫 문장(도입 통찰)을 그대로 쓴다 —
  // 새 문장 없음, 본문에서도 그대로 다시 나오므로 겹치지 않도록
  // 인사이트 페이지 이후 본문1은 두 번째 문장부터 잇는다.
  const firstSection = sections[0];
  const quote = firstSection?.body?.[0] ?? c.title;
  return [
    <BookChapterHero key="love-hero" fairy={fairy} label={seqLabel} title={c.title} accent={accent} />,
    <BookQuotePlain key="love-quote" label={`${seqLabel} · 핵심 통찰`} quote={quote} accent={accent} />,
    <section className="b-chapter bpage b-texture-weak" key="love-body1">
      {sections.slice(0, mid).map((s, idx) => (
        <div key={idx} style={{ marginBottom: "14pt" }}>
          <h3 className="b-subheading">{s.heading}</h3>
          {s.body.filter(Boolean).map((p, i) => <p className="bp" key={i}>{p}</p>)}
        </div>
      ))}
    </section>,
    <section className="b-chapter bpage b-texture-weak" key="love-body2">
      {sections.slice(mid).map((s, idx) => (
        <div key={idx} style={{ marginBottom: "14pt" }}>
          <h3 className="b-subheading">{s.heading}</h3>
          {s.body.filter(Boolean).map((p, i) => <p className="bp" key={i}>{p}</p>)}
        </div>
      ))}
    </section>,
  ];
}

/* ────────────────────────────────────────────────────────────────
 * 五 재물운(chapterWealthInsight) — 출처: hook/killpoint/highlight/
 * sections[], + analyzeWealthTiming(appData) 밴드(계산 그대로, 색만
 * 새로 입힘). 큰 데이터 페이지를 별도로 추가한다(§24). ─────────────
 * ──────────────────────────────────────────────────────────────── */
export function buildChapterWealth(
  report: ReportResult, fairy: FairyImageSlot, seqLabel: string, timeline: WealthTimelineSegment[]
): React.ReactElement[] {
  const w = report.chapterWealthInsight;
  if (!w) return [];
  const accent = CHAPTER_ACCENT.wealth;
  const title = `${report.userName}님의 재물운`;
  const usedLabels = Array.from(new Set(timeline.map((p) => p.label)));
  const sections = w.sections;
  const mid = Math.ceil(sections.length / 2);
  const out: React.ReactElement[] = [
    <BookChapterHero key="wealth-hero" fairy={fairy} label={seqLabel} title={title} lead={w.hook} accent={accent} />,
  ];
  if (timeline.length > 0) {
    out.push(
      <section className="b-chapter bpage b-texture-strong" key="wealth-data">
        <span className="b-label" style={{ color: accent }}>{seqLabel} · 재물의 흐름</span>
        <h2 className="bdata-title">대운으로 보는 재물의 흐름</h2>
        <p className="bp b-quote" style={{ marginTop: 0 }}>{w.killpoint}</p>
        <div className="bwealth-track">
          {timeline.map((p, idx) => (
            <div key={idx} className={`bwealth-seg${p.state === "current" ? " seg-current" : ""}`} style={{ background: BOOK_TIMING_COLOR[p.label] ?? "#8B8070" }}>
              <span className="seg-age">{p.startAge}-{p.endAge}세</span>
              <span className="seg-ganzhi">{p.ganZhi}</span>
              <span className="seg-label">{p.label.replace(/형.*/, "")}</span>
            </div>
          ))}
        </div>
        <div className="bwealth-legend">
          {usedLabels.map((l) => (
            <span key={l}><span className="legend-dot" style={{ background: BOOK_TIMING_COLOR[l] ?? "#8B8070" }} />{l}</span>
          ))}
          <span>· 굵은 테두리 = 현재 대운</span>
        </div>
        <p className="bp b-card">{w.highlight}</p>
      </section>
    );
  }
  out.push(
    <section className="b-chapter bpage b-texture-weak" key="wealth-body1">
      {sections.slice(0, mid).map((s, idx) => (
        <div key={idx} style={{ marginBottom: "14pt" }}>
          <h3 className="b-subheading">{s.heading}</h3>
          {s.body.filter(Boolean).map((p, i) => <p className="bp" key={i}>{p}</p>)}
        </div>
      ))}
    </section>,
    <section className="b-chapter bpage b-texture-weak" key="wealth-body2">
      {sections.slice(mid).map((s, idx) => (
        <div key={idx} style={{ marginBottom: "14pt" }}>
          <h3 className="b-subheading">{s.heading}</h3>
          {s.body.filter(Boolean).map((p, i) => <p className="bp" key={i}>{p}</p>)}
        </div>
      ))}
    </section>
  );
  return out;
}

/* ────────────────────────────────────────────────────────────────
 * 六 인생의 전환점(chapterLifeTransition + Insight) — 출처:
 * sections[](①~④, body는 문자열) + chapterLifeTransitionInsight.sections[]
 * (더 깊이, body는 배열). ──────────────────────────────────────────
 * ──────────────────────────────────────────────────────────────── */
/** 배열을 size개씩 묶는다 — 순서·내용 무변경, 페이지를 어디서 끊을지만
 * 정한다(§6 "정상적인 문단 분할"과 같은 원칙, 새 문장 없음). */
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function buildChapterLifeTransition(report: ReportResult, fairy: FairyImageSlot, seqLabel: string): React.ReactElement[] {
  const c = report.chapterLifeTransition;
  if (!c) return [];
  const insight = report.chapterLifeTransitionInsight;
  const accent = CHAPTER_ACCENT.lifeTransition;
  const fullQuote = c.sections[c.sections.length - 1]?.body ?? c.title;
  // [2026-09 사용자 피드백 — 여백 재조정] ④ 문단 전체(2문장)를 그대로
  // 큰 인용구(18pt)로 얹었더니 페이지가 넘쳐 텅 빈 2페이지가 됐다.
  // 새 문장을 짓지 않고, 실제 존재하는 첫 문장만 그대로 잘라 쓴다(문장
  // 자체를 고치거나 요약하지 않음 — 마침표 기준으로 끊었을 뿐).
  const quote = fullQuote.includes(". ") ? fullQuote.split(". ")[0] + "." : fullQuote;
  const out: React.ReactElement[] = [
    <BookChapterHero key="lt-hero" fairy={fairy} label={seqLabel} title={c.title} accent={accent} />,
    <BookQuoteImage key="lt-quote" fairy={fairy} label={`${seqLabel} · 핵심 통찰`} quote={quote} accent={accent} objectPosition="55% 25%" zoom={1.1} />,
  ];
  // [2026-09 사용자 피드백 — 재조정] 섹션당 1페이지(3페이지)는 반대로
  // 너무 헐렁해졌다는 지적 — ①은 단독, ②③은 한 페이지로 묶어 2페이지로
  // 조정한다(문장·순서 그대로, 페이지 구성만 변경).
  const bodySections = c.sections.slice(0, -1);
  const bodyGroups = [bodySections].filter((g) => g.length > 0);
  bodyGroups.forEach((group, gi) => {
    out.push(
      <section className="b-chapter bpage b-texture-weak" key={`lt-body-${gi}`}>
        {group.map((s, idx) => (
          <div key={idx} style={{ marginBottom: idx < group.length - 1 ? "16pt" : 0 }}>
            <h3 className="b-subheading" style={{ marginTop: idx === 0 ? 0 : undefined }}>{s.heading}</h3>
            <p className="bp">{s.body}</p>
          </div>
        ))}
      </section>
    );
  });
  if (insight && insight.sections.length > 0) {
    // 기존 4+4(한 페이지에 4섹션)에서 2섹션씩으로 더 잘게 나눠 여백을
    // 확보한다 — 내용·순서 동일, 페이지 수만 늘어난다.
    const groups = chunk(insight.sections, 2);
    groups.forEach((group, gi) => {
      out.push(
        <section className="b-chapter bpage b-texture-weak" key={`lt-deep-${gi}`}>
          {gi === 0 && <span className="b-label" style={{ color: accent }}>{seqLabel} · 더 깊이 — 전환점을 지나는 법</span>}
          {group.map((s, idx) => (
            <div key={idx} style={{ marginBottom: "12pt" }}>
              <h4 className="b-subsubheading" style={{ marginTop: gi === 0 && idx === 0 ? 0 : undefined }}>{s.heading}</h4>
              {s.body.filter(Boolean).map((p, i) => <p className="bp" key={i}>{p}</p>)}
            </div>
          ))}
        </section>
      );
    });
  }
  return out;
}

/* ────────────────────────────────────────────────────────────────
 * 七 앞으로의 10년(chapterTenYear) — 출처: intro/segments/items/
 * highlights/closing, 전부 그대로. 3페이지로 확장(§22): 지도 →
 * 주요 연도 → 핵심 메시지. ten-year-flow-background.png는 배경
 * 장식일 뿐, 이미지 속 문구/연도는 데이터로 쓰지 않는다(§21).
 * ──────────────────────────────────────────────────────────────── */
export function buildChapterTenYear(
  report: ReportResult, fairy: FairyImageSlot, seqLabel: string, bg: FairyImageSlot
): React.ReactElement[] {
  const c = report.chapterTenYear;
  if (!c) return [];
  const accent = CHAPTER_ACCENT.tenYear;
  const introFirst = c.intro.split("\n\n")[0] ?? c.intro;
  const highlightYears = new Set(c.highlights.map((h) => h.year));
  const keyItems = c.items.filter((it) => it.isTransitionYear || highlightYears.has(it.year));

  const out: React.ReactElement[] = [
    <BookChapterHero key="ty-hero" fairy={fairy} label={seqLabel} title={c.title} accent={accent} />,
    // 1/3 — 10년 전체 지도(배경 아트 + 막대)
    <section className="btenyear-art" key="ty-map">
      {bg.dataUri ? (
        <img className="btenyear-art-bg" src={bg.dataUri} alt="" />
      ) : (
        <div className="btenyear-art-bg btenyear-art-bg-fallback" />
      )}
      <div className="btenyear-art-scrim" />
      <div className="btenyear-art-content">
        <p className="b-label" style={{ color: accent }}>{seqLabel} · 10년의 지도</p>
        <h2 className="btenyear-art-title">앞으로 10년의 지도</h2>
        <p className="btenyear-art-subtitle">{introFirst}</p>
        <div className="btenyear-track">
          {c.items.map((it, idx) => (
            <div className="btenyear-col" key={idx}>
              <div className="btenyear-bar-wrap">
                <div className={`btenyear-bar${it.isTransitionYear ? " bar-transition" : ""}`} style={{ height: `${Math.max(8, it.flowIntensity)}%` }} />
              </div>
              <span className="btenyear-ganzhi">{it.ganZhiHanja}</span>
              <span className="btenyear-year">{it.year}</span>
              <span className="btenyear-age">{it.age}세</span>
            </div>
          ))}
        </div>
        <p className="btenyear-legend">막대 높이 = 이 10년 안에서의 상대적 신호 밀도(절대 길흉 점수 아님) · 진한 막대 = 대운이 바뀌는 해</p>
      </div>
    </section>,
    // 2/3 — 주요 연도 상세(전환년 + 하이라이트로 지정된 실제 연도만, 새 연도 창작 없음)
    <section className="b-chapter bpage b-texture-weak" key="ty-years">
      <span className="b-label" style={{ color: accent }}>{seqLabel} · 특히 기억할 시기</span>
      <h3 className="b-subheading" style={{ marginTop: 0 }}>주요 연도</h3>
      {keyItems.map((it) => {
        const h = c.highlights.find((hi) => hi.year === it.year);
        return (
          <div className="byear-card" key={it.year}>
            <div className="byear-card-head">
              <span className="byear-card-year">{it.year}</span>
              <span className="byear-card-ganzhi">{it.ganZhiHanja}({it.ganZhiHangul})</span>
              <span className="byear-card-age">{it.age}세{it.isTransitionYear ? " · 대운 전환" : ""}</span>
            </div>
            <p className="byear-card-signal">{it.coreSignal}</p>
            <p className="bp" style={{ margin: 0 }}>{h ? h.reason : it.narrative}</p>
          </div>
        );
      })}
    </section>,
    // 3/3 — 10년 핵심 메시지(구간 요약 + closing 전문)
    <section className="b-chapter bpage b-texture-strong" key="ty-message">
      <span className="b-label" style={{ color: accent }}>{seqLabel} · 10년을 관통하는 메시지</span>
      {c.segments.map((seg, idx) => (
        <p className="bp" key={idx}><strong>{seg.range}</strong> — {seg.summary}</p>
      ))}
      <div className="b-rule" />
      <Paragraphs items={c.closing.split("\n\n")} />
    </section>,
  ];
  return out;
}

/* ────────────────────────────────────────────────────────────────
 * 八 귀인과 신살(gwiinSinsalSection) — 출처: intro/detail[]/brief[]/
 * closing, 원고 그대로(content/paid-report/05-gwiin-sinsal-draft.md
 * 승인본). ──────────────────────────────────────────────────────
 * ──────────────────────────────────────────────────────────────── */
export function buildChapterGwiin(report: ReportResult, fairy: FairyImageSlot, seqLabel: string): React.ReactElement[] {
  const c = report.gwiinSinsalSection;
  if (!c) return [];
  const accent = CHAPTER_ACCENT.gwiin;
  return [
    <BookChapterHero key="gwiin-hero" fairy={fairy} label={seqLabel} title={c.title} accent={accent} />,
    <BookQuotePlain key="gwiin-quote" label={`${seqLabel} · 들어가며`} quote={c.intro} accent={accent} />,
    <section className="b-chapter bpage b-texture-weak" key="gwiin-body">
      {c.detail.map((item, idx) => (
        <div key={idx} style={{ marginBottom: "16pt" }}>
          <h3 className="b-subheading">{item.name}</h3>
          <p className="bp">{item.body}</p>
        </div>
      ))}
      {c.brief.length > 0 && (
        <>
          <h3 className="b-subheading">함께 들어 있는 기운</h3>
          {c.brief.map((item, idx) => (
            <p className="bp" key={idx}><strong>{item.name}</strong> — {item.body}</p>
          ))}
        </>
      )}
      {c.closing && <p className="bp b-card">{c.closing}</p>}
    </section>,
  ];
}

/** [2026-09 편지 3인칭 문제 수정] chapterLifeTransition 원문은 리포트
 * 전체와 똑같이 "이 사람은/이 사람에게는" 3인칭 서술이 정상이다(버그
 * 아님) — 이 함수는 그 문장을 "당신에게 보내는 편지" 문맥에 재사용할
 * 때만, 이 페이지 전용 지역 변수에서 2인칭으로 바꿔 쓴다. 원본
 * chapterLifeTransition 데이터·reportMapper·웹 리포트는 전혀 건드리지
 * 않는다 — 이 파일(PDF 전용) 안에서만 일어나는 표시상의 치환이다. */
function toSecondPersonForLetter(text: string): string {
  return text
    .replace(/이 사람에게는/g, "당신에게는")
    .replace(/이 사람에게/g, "당신에게")
    .replace(/이 사람은/g, "당신은")
    .replace(/이 사람이/g, "당신이")
    .replace(/이 사람의/g, "당신의")
    .replace(/이 사람을/g, "당신을")
    .replace(/이 사람과/g, "당신과")
    .replace(/이 사람/g, "당신");
}

/* ────────────────────────────────────────────────────────────────
 * 마지막 한지 편지(§26) — 귀인/신살 마무리 문장을 그대로 쓰지 않는다는
 * 지시에 따라, 프롤로그 서문(북엔드) + chapterLifeTransition의 마지막
 * 섹션("④ 전환점에서 기억해야 할 것", 삶 전반을 향한 실제 조언 문장)을
 * 인용한다 — 둘 다 이미 존재하는 문장, 새 개인화 사실 없음. 배경은
 * 사용자가 제공한 paljamun-ink-background-seal.png(한지+"팔자문"
 * 워드마크+붉은 낙관, 브랜드 고정요소라 개인화 텍스트 아님) — 이 이미지
 * 안에 이미 브랜드 마크가 있으므로, 이 컴포넌트 자체의 "八字門" 텍스트
 * 마크는 배경이 있을 때만 생략해 중복을 없앤다(이미지가 없으면 기존처럼
 * 텍스트 마크로 폴백). */
export function BookClosingLetterPage({ report, bg }: { report: ReportResult; bg?: FairyImageSlot }) {
  const lastLtRaw = report.chapterLifeTransition?.sections.slice(-1)[0]?.body;
  const lastLt = lastLtRaw ? toSecondPersonForLetter(lastLtRaw) : undefined;
  const hasBg = !!bg?.dataUri;
  return (
    <section className="bletter">
      {hasBg && <img className="bletter-bg" src={bg!.dataUri!} alt="" />}
      {hasBg && <div className="bletter-scrim" />}
      <div className={`bletter-content${hasBg ? "" : " b-texture-strong"}`}>
        {!hasBg && <p className="bletter-mark">八字門</p>}
        <h2 className="bletter-title">마지막으로, {report.userName}님에게</h2>
        <p className="bletter-line">
          여덟 글자는 태어난 순간 정해지지만, 그것을 어떻게 읽고 살아가는지는 늘 당신의 몫이었습니다.
        </p>
        {lastLt && <p className="bletter-line">{lastLt}</p>}
        {!hasBg && <div className="bletter-seal"><BookOrnament color="#6B3A0C" /></div>}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
 * 전체 책 조립
 * ──────────────────────────────────────────────────────────────── */
function emptySlot(baseName: string): FairyImageSlot {
  return { dataUri: null, expectedPath: `public/pdf-assets/${baseName}.png (미지정)` };
}

const TAGLINE = "여덟 글자에 새겨진 운명, 그 문을 엽니다.";

export default function ReportPdfBookDocument({
  report, generatedAt, intake, appData, fairies,
}: {
  report: ReportResult;
  generatedAt: string;
  intake: IntakeFormData;
  appData: AppData;
  fairies?: {
    cover?: FairyImageSlot; benjil?: FairyImageSlot; chapter?: FairyImageSlot; wayOfLife?: FairyImageSlot;
    love?: FairyImageSlot; wealth?: FairyImageSlot; lifeTransition?: FairyImageSlot; tenYear?: FairyImageSlot;
    gwiin?: FairyImageSlot; ending?: FairyImageSlot; tenYearBg?: FairyImageSlot; letterBg?: FairyImageSlot;
  };
}) {
  const coverFairy = fairies?.cover ?? emptySlot("fairy-cover");
  const benjilFairy = fairies?.benjil ?? emptySlot("fairy-destiny-mountain");
  const chapterFairy = fairies?.chapter ?? emptySlot("fairy-writing");
  const wayOfLifeFairy = fairies?.wayOfLife ?? emptySlot("fairy-water-reflection");
  const loveFairy = fairies?.love ?? emptySlot("fairy-love-letter");
  const wealthFairy = fairies?.wealth ?? emptySlot("fairy-scroll");
  const lifeTransitionFairy = fairies?.lifeTransition ?? emptySlot("fairy-turning-point");
  const tenYearFairy = fairies?.tenYear ?? emptySlot("fairy-future-window");
  const gwiinFairy = fairies?.gwiin ?? emptySlot("fairy-lantern");
  const endingFairy = fairies?.ending ?? emptySlot("fairy-cover");
  const tenYearBg = fairies?.tenYearBg ?? emptySlot("ten-year-flow-background");
  const letterBg = fairies?.letterBg ?? emptySlot("paljamun-ink-background-seal");

  const wealthTiming = analyzeWealthTiming(appData);
  const wealthTimeline: WealthTimelineSegment[] = wealthTiming.applicable
    ? wealthTiming.daYunPeriods.map((p) => ({
        startAge: p.period.startAge, endAge: p.period.endAge, ganZhi: p.period.ganZhi,
        state: p.period.state, label: p.classification.label,
      }))
    : [];

  // 라벨 순번 — ReportPdfDocument.tsx와 동일한 원칙(실제 조립 순서대로
  // 第一~八章을 다시 매겨, chapterLove/chapterWealthInsight/
  // chapterLifeTransition의 원본 chapterLabel 중복(第四章/第六章 등)을
  // 표시상으로만 해소한다 — reportMapper.ts 원본 라벨은 무수정).
  const HANJA_NUM = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
  const order: { key: string; present: boolean; title: string }[] = [
    { key: "one", present: true, title: report.chapterOne.title },
    { key: "two", present: !!report.chapters[1], title: report.chapters[1]?.title ?? "" },
    { key: "three", present: !!report.chapters[2], title: report.chapters[2]?.title ?? "" },
    { key: "love", present: !!report.chapterLove, title: report.chapterLove?.title ?? "" },
    { key: "wealth", present: !!report.chapterWealthInsight, title: `${report.userName}님의 재물운` },
    { key: "lifeTransition", present: !!report.chapterLifeTransition, title: report.chapterLifeTransition?.title ?? "" },
    { key: "tenYear", present: !!report.chapterTenYear, title: report.chapterTenYear?.title ?? "" },
    { key: "gwiin", present: !!report.gwiinSinsalSection, title: report.gwiinSinsalSection?.title ?? "" },
  ];
  const seqLabel: Record<string, string> = {};
  const tocEntries: TocEntry[] = [];
  let n = 0;
  for (const item of order) {
    if (!item.present) continue;
    n += 1;
    const label = `第${HANJA_NUM[n - 1] ?? n}章`;
    seqLabel[item.key] = label;
    tocEntries.push({ chapterLabel: label, title: item.title });
  }

  return (
    <div className="doc">
      <BookCover report={report} tagline={TAGLINE} generatedAt={generatedAt} fairy={coverFairy} />
      <IntroPage report={report} intake={intake} tagline={TAGLINE} fairy={coverFairy} />
      <BookProloguePage report={report} />
      <TableOfContents report={report} entries={tocEntries} />

      <BookMyeongsikPage report={report} />
      <BookOhangPage report={report} />

      {buildChapterOne(report, benjilFairy, seqLabel.one)}
      {report.chapters[1] && buildChapterTwo(report, chapterFairy, seqLabel.two)}
      {report.chapters[2] && buildChapterThree(report, wayOfLifeFairy, seqLabel.three)}
      {report.chapterLove && buildChapterLove(report, loveFairy, seqLabel.love)}
      {report.chapterWealthInsight && buildChapterWealth(report, wealthFairy, seqLabel.wealth, wealthTimeline)}
      {report.chapterLifeTransition && buildChapterLifeTransition(report, lifeTransitionFairy, seqLabel.lifeTransition)}
      {report.chapterTenYear && buildChapterTenYear(report, tenYearFairy, seqLabel.tenYear, tenYearBg)}
      {report.gwiinSinsalSection && buildChapterGwiin(report, gwiinFairy, seqLabel.gwiin)}

      <EndingPage report={report} fairy={endingFairy} />
      <BookClosingLetterPage report={report} bg={letterBg} />
    </div>
  );
}
