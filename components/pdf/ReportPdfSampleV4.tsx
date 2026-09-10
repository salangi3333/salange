import React from "react";
import { ReportResult, ChapterTenYearItem } from "@/lib/reportMapper";
import { FairyImageSlot, WealthTimelineSegment } from "./ReportPdfPrototype";

/**
 * [2026-09 「평생운명록」 PDF 2차 편집 디자인 — STEP 3 대표 샘플 전용]
 *
 * 이 파일은 사용자가 승인한 "2차 편집 디자인 최종 지시" §15 STEP 3에서
 * 요구한 7종 대표 샘플(A~G)만 담는다. 기존에 승인·동결된 표지/속표지/
 * 목차(ReportPdfPrototype.tsx의 pcover-/pintro-/ptoc- 계열)와 현재 45p
 * 실제 문서 조립(ReportPdfDocument.tsx)은 이 파일이 전혀 건드리지 않는다
 * — 별도 파일 + 별도 CSS 블록(lib/reportPdf.tsx의 HANJI_V4_STYLE) +
 * 별도 생성 스크립트(scripts/_pdf_v4_samples_gen.ts)로만 존재하는 순수
 * 샘플이며, 승인 전까지 ReportPdfDocument.tsx의 실제 45p 조립에는
 * 절대 연결하지 않는다(§18 "전체 PDF 확장 금지").
 *
 * 원칙(전부 §2/§4/§7/§8 그대로):
 *  - 새 사주 계산/새 해석/새 문장을 만들지 않는다. 모든 텍스트는
 *    ReportResult(이미 계산된 값)에서 그대로 가져온다.
 *  - 이미지 위 글자는 전부 실제 React/HTML 텍스트다(이미지 파일에
 *    문구를 합성하지 않음) — 고객 이름이 바뀌면 자동으로 바뀐다.
 *  - 참고 스크린샷의 실제 사진/문구를 쓰지 않는다. 레이아웃 기법만
 *    참고해 새로 그린다.
 */

function V4Ornament() {
  return (
    <svg className="hv4-ornament" width="90" height="22" viewBox="0 0 90 22" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 12 C 20 3, 35 21, 45 12 C 55 3, 70 21, 86 12" stroke="#A9803D" strokeWidth="0.9" fill="none" />
      <circle cx="20" cy="7.6" r="1.7" fill="#A9803D" />
      <circle cx="45" cy="12" r="1.7" fill="#A9803D" />
      <circle cx="70" cy="7.6" r="1.7" fill="#A9803D" />
    </svg>
  );
}

/** ── A. 챕터 전환 페이지(통합 "Hero" 디자인) ──────────────────────
 * §9: 기존 3종(Split/Stack/Inset)을 대체할 단일 문법 — 이미지가 페이지
 * 상단 약 70%를 채우고, 아래로 갈수록 한지 톤으로 자연스럽게 녹아든다.
 * 章마다 accent(온도)만 살짝 달라진다(§10) — 팔레트 자체는 하나. */
export function ChapterOpenHero({
  fairy,
  label,
  title,
  lead,
  accent = "#6B4A1F",
}: {
  fairy: FairyImageSlot;
  label: string;
  title: string;
  lead?: string;
  /** §10 — 장마다 강조 온도만 다르게(색 체계 자체는 통일). 지정 안 하면
   * 기본 잉크브라운. */
  accent?: string;
}) {
  return (
    <section className="hhero">
      <div className="hhero-img-wrap">
        {fairy.dataUri ? (
          <img className="hhero-img" src={fairy.dataUri} alt="" />
        ) : (
          <div className="hopen-fallback">
            <span>선녀 이미지 자리</span>
            <span>{fairy.expectedPath}</span>
          </div>
        )}
        <div className="hhero-scrim-top">
          <p className="hhero-eyebrow">PALJAMUN</p>
        </div>
        <div className="hhero-fade" />
      </div>
      <div className="hhero-body">
        <p className="hhero-label" style={{ color: accent }}>{label}</p>
        <h2 className="hhero-title">{title}</h2>
        <V4Ornament />
        {lead && <p className="hhero-lead">{lead}</p>}
      </div>
    </section>
  );
}

/** ── B. 이미지 + 개인화 핵심문장 결합 페이지 ───────────────────────
 * §8: A(Hero)와는 다른 결합 방식 — 이미지는 상단 절반 정도만, 아래는
 * 큰 인용부호 + 실제 기존 핵심 문장 하나만 크게. 새 문장 없음, 반드시
 * report에 이미 있는 문장을 그대로 인용한다. */
export function ImageQuotePage({
  fairy,
  label,
  quote,
}: {
  fairy: FairyImageSlot;
  label: string;
  quote: string;
}) {
  return (
    <section className="hquote-page">
      <div className="hquote-img-wrap">
        {fairy.dataUri ? (
          <img className="hquote-img" src={fairy.dataUri} alt="" />
        ) : (
          <div className="hopen-fallback">
            <span>선녀 이미지 자리</span>
            <span>{fairy.expectedPath}</span>
          </div>
        )}
      </div>
      <div className="hquote-body">
        <p className="hquote-mark">“</p>
        <p className="hquote-label">{label} · 핵심 통찰</p>
        <p className="hquote-text">{quote}</p>
      </div>
    </section>
  );
}

/** ── C. 빽빽한 본문을 의미 단위로 나눈 2페이지 ─────────────────────
 * §6: 문장은 100% 기존 그대로(chapterOne.body1/body2/redInsight/
 * cardText) — 삭제·요약·새 해석 없음. 페이지를 어디서 끊을지, 어느
 * 문단을 pull-quote로 키울지만 새로 정한다. */
export function DenseBodySplitPageOne({ report }: { report: ReportResult }) {
  const c = report.chapterOne;
  return (
    <section className="chapter hbody-airy">
      <span className="dsection-label" style={{ color: "#A9803D" }}>{c.chapterLabel} · 심화 1/2</span>
      <h3 className="hbody-airy-heading">타고난 바탕</h3>
      <p className="p lead-big">{c.goldHook}</p>
      <div className="hrule" />
      {c.body1.filter(Boolean).map((p, i) => (
        <p className="p" key={i}>{p}</p>
      ))}
    </section>
  );
}
export function DenseBodySplitPageTwo({ report }: { report: ReportResult }) {
  const c = report.chapterOne;
  return (
    <section className="chapter hbody-airy">
      <span className="dsection-label" style={{ color: "#A9803D" }}>{c.chapterLabel} · 심화 2/2</span>
      <h3 className="hbody-airy-heading">실제로 드러나는 모습</h3>
      {c.body2.filter(Boolean).map((p, i) => (
        <p className="p" key={i}>{p}</p>
      ))}
      <p className="p quote-pull">{c.redInsight}</p>
      {c.body3.filter(Boolean).map((p, i) => (
        <p className="p" key={`b3-${i}`}>{p}</p>
      ))}
      <div className="hrule" />
      <p className="p ivory-card">{c.cardText}</p>
    </section>
  );
}

/** ── D. 고급 웜 아이보리 한지 질감이 적용된 일반 본문 페이지 ───────
 * §5: 본문 페이지는 아주 약한 질감만(가독성 최우선) — SVG fractalNoise를
 * 극저투명도(약 4~5%)로 기존 아이보리 그라데이션 위에 얹는다. 계산/
 * 문장 변경 없음(chapters[2] = 第三章 살아가는 방식, 원문 그대로). */
export function HanjiTexturedBodyPage({ report }: { report: ReportResult }) {
  const c = report.chapters[2];
  if (!c) return null;
  return (
    <section className="chapter hpage-texture">
      <span className="dsection-label" style={{ color: "#A9803D" }}>{c.chapterLabel} · 한지 질감 샘플</span>
      <h3 className="hbody-airy-heading">{c.title}</h3>
      {(c.body ?? []).filter(Boolean).map((p, i) => (
        <p className="p" key={i}>{p}</p>
      ))}
      {c.highlight && <p className="p ivory-card">{c.highlight}</p>}
    </section>
  );
}

/** ── E. 명식/오행 — 생동감 있는 색감 개선(오행) ────────────────────
 * §11: 계산값(report.elementBalance) 절대 불변, 시각적 대비·크기만
 * 개선. 링(시각 인상)과 목록(정확한 수치)을 분리해 장식이 수치를
 * 가리지 않게 하는 기존 원칙은 유지하되, 목록을 색칩+막대+큰 숫자
 * 조합으로 훨씬 또렷하게 바꾼다. */
const V4_ELEMENT_COLORS: Record<string, string> = {
  wood: "#1F6B47",
  fire: "#9C1F13",
  earth: "#8A5D00",
  metal: "#4C4A45",
  water: "#2B6CB0",
};

function buildV4OhangArcs(report: ReportResult) {
  const r = 82;
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

export function OhangWheelV2({ report }: { report: ReportResult }) {
  const strongestLabel = report.elementBalance.find((e) => e.key === report.elementStrongest)?.label;
  const weakestLabel = report.elementBalance.find((e) => e.key === report.elementWeakest)?.label;
  const arcs = buildV4OhangArcs(report);
  return (
    <section className="chapter">
      <span className="dsection-label" style={{ color: "#A9803D" }}>五 行 · 색감 개선 샘플</span>
      <h3 className="hbody-airy-heading">{report.userName}님의 오행 균형</h3>
      <div className="hohang-wheel-wrap">
        <svg viewBox="0 0 210 210" className="hohang-v2-wheel-svg" xmlns="http://www.w3.org/2000/svg">
          <circle cx="105" cy="105" r="82" fill="none" stroke="#E4D6B8" strokeWidth="24" />
          {arcs.map((a) => (
            <circle
              key={a.key} cx="105" cy="105" r={a.r} fill="none"
              stroke={V4_ELEMENT_COLORS[a.key] ?? "#8B7257"} strokeWidth="24"
              strokeDasharray={`${a.dash} ${a.circumference - a.dash}`}
              strokeDashoffset={a.offset} transform="rotate(-90 105 105)"
            />
          ))}
          <text x="105" y="100" textAnchor="middle" className="hohang-v2-center-label">五行</text>
          <text x="105" y="122" textAnchor="middle" className="hohang-v2-center-sub">균형</text>
        </svg>
      </div>
      <div className="hohang-v2-list">
        {report.elementBalance.map((el) => (
          <div className="hohang-v2-legend-row" key={el.key} style={{ background: `${V4_ELEMENT_COLORS[el.key]}14` }}>
            <span className="hohang-v2-chip" style={{ background: V4_ELEMENT_COLORS[el.key] ?? "#8B7257" }} />
            <span className="hohang-v2-name">{el.label}</span>
            <div className="hohang-v2-bar-track">
              <div className="hohang-v2-bar-fill" style={{ width: `${el.value}%`, background: V4_ELEMENT_COLORS[el.key] ?? "#8B7257" }} />
            </div>
            <span className="hohang-v2-value">{el.value}%</span>
          </div>
        ))}
      </div>
      <p className="hohang-note">
        가장 강한 기운은 <strong>{strongestLabel}</strong>, 가장 약한 기운은 <strong>{weakestLabel}</strong>입니다.
      </p>
    </section>
  );
}

/** ── F. 앞으로의 10년 — 시각적 위계 개선 ───────────────────────────
 * §11: flowIntensity/coreSignal 등 이미 계산된 값만 쓴다. 막대를
 * 그라데이션으로 키우고, 대운 전환 해는 금테로 강조하며, 각 칸 아래
 * coreSignal(이미 존재하는 데이터, 기존엔 이 그래프에 표시되지 않고
 * 뒤쪽 연도별 상세에서만 쓰였다)을 작은 3단계 캡션으로 추가해 정보
 * 위계(§12)를 준다 — 새 판정 아님, 이미 있는 문자열을 한 곳 더
 * 보여줄 뿐이다. */
export function TenYearTimelineV2({ items }: { items: ChapterTenYearItem[] }) {
  if (!items || items.length === 0) return null;
  return (
    <section className="chapter">
      <span className="dsection-label" style={{ color: "#4A5568" }}>10년의 흐름 · 위계 개선 샘플</span>
      <h3 className="hbody-airy-heading">앞으로 10년의 지도</h3>
      <div className="htenyear-v2-track">
        {items.map((it, idx) => (
          <div className="htenyear-v2-col" key={idx}>
            <div className="htenyear-v2-bar-wrap">
              <div
                className={`htenyear-v2-bar${it.isTransitionYear ? " bar-transition" : ""}`}
                style={{ height: `${Math.max(8, it.flowIntensity)}%` }}
              />
            </div>
            <span className="htenyear-v2-year">{it.year}</span>
            <span className="htenyear-v2-age">{it.age}세</span>
            <span className="htenyear-v2-ganzhi">{it.ganZhiHanja}</span>
            <span className="htenyear-v2-signal">{it.coreSignal}</span>
          </div>
        ))}
      </div>
      <p className="hwealth-timeline-legend" style={{ justifyContent: "center", marginTop: "10pt" }}>
        <span>막대 높이 = 이 10년 안에서의 상대적 신호 밀도(절대 길흉 점수 아님)</span>
        <span>· 금테 = 대운이 바뀌는 해</span>
      </p>
    </section>
  );
}

/** ── G. 「마지막으로, 당신에게」 한지 편지 페이지 ──────────────────
 * §13: EndingPage(선녀 사진 엔딩)는 그대로 유지, 이 페이지는 그 뒤에
 * 추가되는 진짜 마지막 페이지다. 새 개인화 사실을 짓지 않고, 이미
 * 존재하는 마무리 문장 두 곳만 그대로 인용한다 —
 *  1) 프롤로그 서문의 문장(책의 시작에서 이미 쓴 문장, 끝에서 그대로
 *     되짚어 "북엔드" 구성) — ReportPdfDocument.tsx의 ProloguePage와
 *     완전히 동일한 문자열, 새로 쓰지 않았다.
 *  2) gwiinSinsalSection.closing(원고 승인 완료 문장, 이 챕터 담당자가
 *     이미 쓴 문장 그대로).
 * 이 페이지 자체(당부의 배열/타이포그래피)만 새로 만든 것이고, 문장
 * 내용은 전부 기존 값이다. */
export function ClosingLetterPage({ report }: { report: ReportResult }) {
  return (
    <section className="hletter">
      <p className="hletter-mark">八字門</p>
      <h2 className="hletter-title">마지막으로, {report.userName}님에게</h2>
      <p className="hletter-line">
        여덟 글자는 태어난 순간 정해지지만, 그것을 어떻게 읽고 살아가는지는 늘 당신의 몫이었습니다.
      </p>
      {report.gwiinSinsalSection?.closing && (
        <p className="hletter-line">{report.gwiinSinsalSection.closing}</p>
      )}
      <div className="hletter-seal">
        <V4Ornament />
      </div>
    </section>
  );
}
