import React from "react";
import { ReportResult } from "@/lib/reportMapper";
import { IntakeFormData } from "@/lib/sajuEngine";
import { Paragraphs, ChapterTitle, PillarTable, ElementList, TenYearTimelineLight } from "./ReportPdfPrimitives";
import { PDF_MOTIFS, PdfMotifKey } from "./PdfMotifs";
import { PDF_SCENES, PdfSceneKey } from "./PdfScenes";

/**
 * "팔자문 프리미엄 PDF 디자인 시스템" 확정을 위한 제한된 프로토타입 전용
 * 컴포넌트(2026-09) — 아직 릴리스 대상 아님, ReportPdfDocument.tsx와
 * 별도 파일로 둔다(기존 전체 문서 조립 로직을 건드리지 않기 위함).
 *
 * 이 파일은 표지 / 속표지 / 목차 / 사주 원국 / 第一章만 다룬다. 사주
 * 원국·第一章은 새로 만들지 않고 ReportPdfDocument.tsx의 검증된 컴포넌트
 * (PillarTable/ElementList/ChapterOneSection)를 그대로 import해서 재사용한다
 * — 새 문장/새 수치를 이 파일에서 만들지 않는다.
 *
 * 목차는 report 객체에 실제로 존재하는 챕터만 순서대로 나열한다(하드코딩
 * 금지) — 존재하지 않는 챕터를 상상해서 넣지 않기 위해서다.
 */

/** 표지/챕터 오프닝에 쓸 이미지 자리. 실제 파일이 public/pdf-assets/에
 * 없으면(현재 상태) placeholder 박스를 대신 그린다 — 인터넷에서 이미지를
 * 받아오지 않는다. 파일이 준비되면 scripts 쪽에서 존재 확인 후 dataUri를
 * 채워 넘긴다. */
export interface FairyImageSlot {
  dataUri: string | null;
  /** 사용자가 나중에 채워 넣을 실제 경로(안내용 텍스트로만 표시) */
  expectedPath: string;
}

export function PremiumCover({
  report,
  tagline,
  generatedAt,
  fairy,
}: {
  report: ReportResult;
  tagline: string;
  generatedAt: string;
  fairy: FairyImageSlot;
}) {
  return (
    <section className="pcover">
      <div className="pcover-frame">
        {fairy.dataUri ? (
          <img className="pcover-fairy-img" src={fairy.dataUri} alt="" />
        ) : (
          <div className="pcover-fairy-slot">
            <span>선녀 이미지 자리</span>
            <span className="pcover-fairy-slot-path">{fairy.expectedPath}</span>
          </div>
        )}
        <div className="pcover-top-scrim">
          <p className="pcover-brand">八字門</p>
          <p className="pcover-brand-kr">팔 자 문 · PALJAMUN</p>
          <p className="pcover-tagline">{tagline}</p>
        </div>
        <div className="pcover-bottom-scrim">
          <div className="pcover-divider" />
          <p className="pcover-name">{report.userName}님의 평생운명록</p>
          <p className="pcover-date">발급일 {generatedAt}</p>
        </div>
      </div>
    </section>
  );
}

export function IntroPage({
  report,
  intake,
  tagline,
  fairy,
}: {
  report: ReportResult;
  intake: IntakeFormData;
  tagline: string;
  fairy: FairyImageSlot;
}) {
  const calendarLabel = intake.calendarType === "lunar" ? "음력" : "양력";
  const timeLabel = intake.timeUnknown || intake.hour === null
    ? "출생시간 미상"
    : `${intake.hour.toString().padStart(2, "0")}시 ${intake.minute.toString().padStart(2, "0")}분`;

  return (
    <section className="pintro">
      <p className="pintro-brand">八字門</p>
      <p className="pintro-brand-kr">팔 자 문 · PALJAMUN</p>
      <p className="pintro-tagline-small">{tagline}</p>

      {fairy.dataUri && (
        <div className="pintro-portrait-wrap">
          <img className="pintro-portrait" src={fairy.dataUri} alt="" />
        </div>
      )}

      <div className="pintro-divider" />
      <p className="pintro-nameplate">{report.userName}님의 평생운명록</p>

      <div className="pintro-facts">
        <div className="pintro-fact">
          <span className="pintro-fact-label">이름</span>
          <span className="pintro-fact-value">{report.userName}</span>
        </div>
        <div className="pintro-fact">
          <span className="pintro-fact-label">생년월일</span>
          <span className="pintro-fact-value">
            {intake.year}년 {intake.month}월 {intake.day}일 ({calendarLabel})
          </span>
        </div>
        <div className="pintro-fact">
          <span className="pintro-fact-label">태어난 시간</span>
          <span className="pintro-fact-value">{timeLabel}</span>
        </div>
        <div className="pintro-fact">
          <span className="pintro-fact-label">일간</span>
          <span className="pintro-fact-value">{report.dayMasterLabel}</span>
        </div>
      </div>
    </section>
  );
}

interface TocEntry {
  chapterLabel: string;
  title: string;
}
export type { TocEntry };

/** report 객체에 실제로 존재하는 챕터만, ReportPdfDocument.tsx 본문
 * 조립 순서와 동일한 순서로 뽑아낸다 — 하드코딩된 목록이 아니다. 같은
 * chapterLabel이 두 번 나오면(현재 명리 구조상 第五·第六章이 여러 필드에
 * 걸쳐 있음) 첫 번째 title만 대표로 남긴다. */
export function buildTocEntries(report: ReportResult): TocEntry[] {
  const raw: TocEntry[] = [
    { chapterLabel: report.chapterOne.chapterLabel, title: report.chapterOne.title },
    ...(report.chapters ?? []).map((c) => ({ chapterLabel: c.chapterLabel, title: c.title })),
    ...(report.chapterLove ? [{ chapterLabel: report.chapterLove.chapterLabel, title: report.chapterLove.title }] : []),
    ...(report.chapterFive ? [{ chapterLabel: report.chapterFive.chapterLabel, title: report.chapterFive.title }] : []),
    ...(report.chapterSix ? [{ chapterLabel: report.chapterSix.chapterLabel, title: report.chapterSix.title }] : []),
    ...(report.chapterLifeTransition
      ? [{ chapterLabel: report.chapterLifeTransition.chapterLabel, title: report.chapterLifeTransition.title }]
      : []),
    ...(report.chapterTenYear ? [{ chapterLabel: report.chapterTenYear.chapterLabel, title: report.chapterTenYear.title }] : []),
    ...(report.gwiinSinsalSection
      ? [{ chapterLabel: report.gwiinSinsalSection.chapterLabel, title: report.gwiinSinsalSection.title }]
      : []),
  ];
  const seen = new Set<string>();
  const dedup: TocEntry[] = [];
  for (const entry of raw) {
    if (seen.has(entry.chapterLabel)) continue;
    seen.add(entry.chapterLabel);
    dedup.push(entry);
  }
  return dedup;
}

export function TableOfContents({
  report,
  entries: entriesProp,
}: {
  report: ReportResult;
  /** [2026-09 재구성] 넘기면 이 목록을 그대로 쓰고 report에서 다시
   * 뽑지 않는다 — ReportPdfDocument.tsx가 실제 조립 순서대로 순번을
   * 새로 매긴(第一章~第十章) 목록을 넘길 때 쓴다(라벨 중복 회피, §13).
   * 안 넘기면 기존처럼 report의 원본 chapterLabel을 그대로 쓴다
   * (하위 호환). */
  entries?: TocEntry[];
}) {
  const entries = entriesProp ?? buildTocEntries(report);
  return (
    <section className="ptoc">
      <p className="ptoc-eyebrow">— 目 次 —</p>
      <h2 className="ptoc-title">목차</h2>
      <ul className="ptoc-list">
        {entries.map((e, idx) => (
          <li key={idx} className="ptoc-item">
            <span className="ptoc-label">{e.chapterLabel}</span>
            <span className="ptoc-item-title">{e.title}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** 각 장이 시작되기 직전에 놓는 여백 페이지(book의 "장 도입 삽화"
 * 관례) — 章 라벨/제목은 여기서 반복하지 않는다(바로 다음 페이지의
 * ChapterOneSection이 이미 그린다) — 새 텍스트를 만들지 않기 위해서다.
 * 이미지가 없으면(placeholder) 이 페이지 자체를 그리지 않는다. */
export function ChapterOpeningPlate({ fairy }: { fairy: FairyImageSlot }) {
  if (!fairy.dataUri) return null;
  return (
    <section className="pplate">
      <img className="pplate-img" src={fairy.dataUri} alt="" />
    </section>
  );
}

export function PillarChapter({ report }: { report: ReportResult }) {
  return (
    <section className="chapter">
      <p className="pintro-eyebrow">— 命 式 —</p>
      <h2 className="chapter-heading small-heading">타고난 여덟 글자</h2>
      <PillarTable pillars={report.pillars} />
      <ElementList report={report} />
    </section>
  );
}

/** [2026-09] ChapterOneSection 재-export는 제거했다 — 순환 참조 방지
 * (ReportPdfDocument.tsx가 이 파일의 ChapterOneHanjiBody 등을 가져다
 * 쓰게 되면서, 이 파일이 거꾸로 Document를 import하면 순환이 생긴다).
 * 第一章 본문은 아래 ChapterOneHanjiBody(이 파일 자체 정의, chapterOne
 * 필드를 그대로 옮김 — 새 문장 없음)를 쓴다. ChapterOneSection 자체가
 * 필요하면 ReportPdfDocument.tsx에서 직접 import한다. */
export { ChapterTitle, Paragraphs };

/* ────────────────────────────────────────────────────────────────
 * 대표 페이지 디자인 검증 v2(2026-09) — "A안"(다크 럭셔리 동양 운명서)
 * 레퍼런스 반영. 第一/五/八章 샘플 전용. 아래 컴포넌트들은 전부 이미
 * 계산·조립된 report(ReportResult) 필드를 그대로 옮겨 그릴 뿐, 새
 * 문장/새 점수/새 판정을 이 파일에서 만들지 않는다. 유일한 예외는
 * Ornament(순수 장식 SVG, 텍스트 없음)와 WealthTimeline의 라벨→색상
 * 매핑(이미 계산된 A~E 카테고리 문자열에 색만 입히는 것, 새 판정 아님).
 *
 * v1(아이보리 톤)은 사용자가 승인하지 않아 팔레트를 전면 교체했다 —
 * 승인·동결된 표지(pcover-*)의 "이미지+상하 스크림 오버레이" 문법을
 * 장 오프닝에도 그대로 재사용해 통일감을 준다(문법 재사용, 복제 아님 —
 * 이미지·텍스트는 장마다 다르다).
 * ──────────────────────────────────────────────────────────────── */

/** 장 오프닝 삽화 위에 놓는 절제된 장식선(매화 가지 모티프) — 순수
 * 장식용 SVG, 텍스트/데이터 없음. 4개 대표 페이지가 동일하게 재사용해
 * "같은 책"이라는 통일감을 준다. 금빛 라인 — 어두운 스크림 위에서도
 * 또렷하게 보이도록 표지보다 한 톤 밝은 골드를 쓴다. */
function Ornament() {
  return (
    <svg className="dchapter-ornament" width="90" height="22" viewBox="0 0 90 22" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 12 C 20 3, 35 21, 45 12 C 55 3, 70 21, 86 12" stroke="#D9BA7E" strokeWidth="0.9" fill="none" />
      <circle cx="20" cy="7.6" r="1.7" fill="#D9BA7E" />
      <circle cx="45" cy="12" r="1.7" fill="#D9BA7E" />
      <circle cx="70" cy="7.6" r="1.7" fill="#D9BA7E" />
    </svg>
  );
}

/** 표지(pcover-frame)와 동일한 "이미지 + 상/하 스크림" 문법을 쓰는 장
 * 오프닝 — 이미지(선녀/모티프)가 페이지 전체를 채우고, 라벨/제목/인용구는
 * 위·아래 먹빛 그라데이션 위에 얹힌다. 기존 ChapterOpeningPlate(텍스트
 * 없는 순수 삽화 페이지)와는 별도 컴포넌트다. 여기 텍스트는 항상
 * 호출부가 report에서 그대로 가져온 문장(예: chapterOne.goldHook)이며
 * 이 파일에서 새로 쓰지 않는다. */
export function ChapterOpenEditorial({
  fairy,
  label,
  title,
  quote,
}: {
  fairy: FairyImageSlot;
  label: string;
  title: string;
  quote: string;
}) {
  return (
    <section className="chapter-open">
      <div className="dchapter-frame">
        {fairy.dataUri ? (
          <img className="dchapter-img" src={fairy.dataUri} alt="" />
        ) : (
          <div className="dchapter-fallback">
            <span>선녀 이미지 자리</span>
            <span>{fairy.expectedPath}</span>
          </div>
        )}
        <div className="dchapter-scrim-top">
          <p className="dchapter-label">{label}</p>
        </div>
        <div className="dchapter-scrim-bottom">
          <h2 className="dchapter-title">{title}</h2>
          <Ornament />
          <p className="dchapter-quote">“{quote}”</p>
        </div>
      </div>
    </section>
  );
}

/** heading + 첫 문단을 한 블록으로 묶어("고아 제목" 방지), 나머지
 * 문단은 각각 독립 블록으로 반환한다 — 실측 기반 페이지네이션(스크립트
 * 쪽)이 블록 단위로만 페이지를 나누므로, 제목이 문단과 떨어져 페이지
 * 맨 아래 혼자 남는 일을 이 단위에서부터 막는다. 텍스트는 그대로,
 * 새로 쓰지 않는다. */
function headedParagraphBlocks(heading: string, paragraphs: string[], keyPrefix: string): React.ReactElement[] {
  const items = paragraphs.filter(Boolean);
  if (items.length === 0) return [];
  const blocks: React.ReactElement[] = [
    <div key={`${keyPrefix}-0`}>
      <h3 className="dsubheading">{heading}</h3>
      <p className="dp">{items[0]}</p>
    </div>,
  ];
  for (let i = 1; i < items.length; i++) {
    blocks.push(<p className="dp" key={`${keyPrefix}-${i}`}>{items[i]}</p>);
  }
  return blocks;
}

/** 第一章 본문 대표 페이지의 내용을 "실측 페이지네이션 가능한 블록
 * 배열"로 반환한다 — 기존 ChapterOneSection(무료 웹과 동일한 평문
 * 나열)을 대체하지 않고, 먹빛 바탕 위에 시각 계층을 새로 입힌 별도
 * 조립이다. chapterOne의 문장은 전부 그대로, 순서와 문구도 바꾸지
 * 않는다. 추가로 chapterOneDeep(결제 고객 전용 심화, 기존에 PDF에서
 * 아예 렌더링되지 않던 필드)을 처음으로 포함한다 — sections/visual
 * 모두 report 값을 그대로 옮긴 것뿐, 새 해석 없음.
 *
 * 배열로 반환하는 이유: 이 페이지는 실제 개인화 콘텐츠 길이에 따라
 * 여러 인쇄 페이지에 걸쳐 흐른다. 하나의 긴 <div>로 두면 Chromium
 * 인쇄 엔진이 "내용이 짧게 끝난 페이지"에서 배경을 실제 내용 높이까지만
 * 칠하는 특성이 있어(lib/reportPdf.tsx의 .premium-section-page 주석
 * 참고) 흰 여백이 드러난다 — 그래서 호출부(생성 스크립트)가 각 블록의
 * 실제 렌더링 높이를 먼저 측정해 페이지 단위로 미리 나누고, 조각마다
 * 자신만의 min-height 박스로 감싼다. 이 함수는 "무엇을 어떤 순서로
 * 보여줄지"만 정의하고, 페이지를 어디서 끊을지는 전혀 알지 못한다. */
export function chapterOneBlocks(report: ReportResult): React.ReactElement[] {
  const c = report.chapterOne;
  const deep = report.chapterOneDeep;
  const blocks: React.ReactElement[] = [];

  blocks.push(
    <div key="header">
      <span className="dsection-label">{c.chapterLabel}</span>
      <h2 className="dsection-heading">{c.title}</h2>
    </div>
  );

  if (c.badges.length > 0) {
    blocks.push(
      <div className="dbadge-row" key="badges">
        {c.badges.map((b) => (
          <div className="dbadge-chip" key={b.label}>
            <span className="dbadge-chip-label">{b.label}</span>
            <span className="dbadge-chip-score">{b.score}</span>
          </div>
        ))}
      </div>
    );
  }

  if (c.cheoneulOpening) {
    blocks.push(
      <div className="devidence-box" key="cheoneul">
        <span className="devidence-label">천을귀인</span>
        {c.cheoneulOpening}
      </div>
    );
  }
  blocks.push(<p className="dp dlead" key="goldhook">{c.goldHook}</p>);

  blocks.push(...headedParagraphBlocks("타고난 본질", c.body1, "body1"));
  blocks.push(...headedParagraphBlocks("기질과 실제 삶의 모습", c.body2, "body2"));

  blocks.push(
    <div className="devidence-box" key="redinsight">
      <span className="devidence-label">핵심 통찰</span>
      {c.redInsight}
    </div>
  );

  blocks.push(...headedParagraphBlocks("강점이 그림자가 될 때", c.body3, "body3"));
  c.body4.filter(Boolean).forEach((p, i) => blocks.push(<p className="dp" key={`body4-${i}`}>{p}</p>));

  blocks.push(<div className="dcard" key="cardtext">{c.cardText}</div>);

  if (deep) {
    blocks.push(<h3 className="dsubheading" key="deep-heading">겉과 속 — 심화 통찰</h3>);
    blocks.push(
      <div className="dcard" key="deep-compare">
        <span className="dcard-label">명리 근거</span>
        {deep.visual.compareInsight}
      </div>
    );
    if (deep.visual.easy.length > 0 || deep.visual.effortful.length > 0) {
      blocks.push(
        <div className="dtag-row" key="deep-tags">
          {deep.visual.easy.map((t) => (
            <span className="dtag dtag-easy" key={`easy-${t}`}>쉽게 쓰는 힘 · {t}</span>
          ))}
          {deep.visual.effortful.map((t) => (
            <span className="dtag dtag-effort" key={`effort-${t}`}>에너지가 더 필요한 힘 · {t}</span>
          ))}
        </div>
      );
    }
    deep.sections.forEach((s, idx) => {
      blocks.push(...headedParagraphBlocks(s.heading, s.body, `deep-sec${idx}`));
    });
  }

  return blocks;
}

/** 第五章(재물운) 시각화 전용 — daYun 시기 판정(analyzeWealthTiming)을
 * 그대로 색상 밴드로 보여준다. 새 점수를 만들지 않고, 이미 계산된 A~E
 * 카테고리 문자열에만 색을 입힌다(라벨→색 매핑, 판정 자체는 그대로).
 * 먹빛 배경 위에서도 각 밴드가 또렷이 구분되도록 채도/명도를 살짝
 * 높였다(라벨 자체는 동일). */
export interface WealthTimelineSegment {
  startAge: number;
  endAge: number;
  ganZhi: string;
  state: "past" | "current" | "future";
  label: string;
}

const TIMING_COLOR: Record<string, string> = {
  "강화형(A)": "#C9A46A",
  "부담형(B)": "#B5453A",
  "기반형(C)": "#7C8C74",
  "분산/흔들림형(D)": "#8F7FA3",
  "신호없음형(E)": "#6B6153",
};

export function WealthTimeline({ periods }: { periods: WealthTimelineSegment[] }) {
  if (periods.length === 0) return null;
  const usedLabels = Array.from(new Set(periods.map((p) => p.label)));
  return (
    <div className="wealth-timeline">
      <p className="wealth-timeline-title">— 대운으로 보는 재물의 흐름 —</p>
      <div className="wealth-timeline-track">
        {periods.map((p, idx) => (
          <div
            key={idx}
            className={`wealth-timeline-seg${p.state === "current" ? " seg-current" : ""}`}
            style={{ background: TIMING_COLOR[p.label] ?? "#B7AC98" }}
          >
            <span className="seg-age">{p.startAge}-{p.endAge}세</span>
            <span className="seg-ganzhi">{p.ganZhi}</span>
            <span className="seg-label">{p.label.replace(/형.*/, "")}</span>
          </div>
        ))}
      </div>
      <div className="wealth-timeline-legend">
        {usedLabels.map((l) => (
          <span key={l}>
            <span className="legend-dot" style={{ background: TIMING_COLOR[l] ?? "#B7AC98" }} />
            {l}
          </span>
        ))}
        <span>· 굵은 테두리 = 현재 대운</span>
      </div>
    </div>
  );
}

/** 第五章 본문 대표 페이지의 블록 배열 — chapterWealthInsight(hook/
 * killpoint/highlight/sections)를 그대로 옮기고, WealthTimeline만
 * 추가로 얹는다. 章 라벨/제목 문구는 ResultLandingV2.tsx 화면판이 쓰는
 * 것과 동일한 관례("第五章" · "{이름}님의 재물운")를 그대로 재사용한다
 * — 여기서 새로 짓지 않는다. WealthTimeline은 통째로 한 블록(내부에서
 * 쪼개지지 않음)이다. */
export function chapterFiveBlocks(
  report: ReportResult,
  timeline: WealthTimelineSegment[]
): React.ReactElement[] {
  const w = report.chapterWealthInsight;
  if (!w) return [];
  const blocks: React.ReactElement[] = [
    <div key="header">
      <span className="dsection-label">第五章</span>
      <h2 className="dsection-heading">{report.userName}님의 재물운</h2>
    </div>,
    <div className="devidence-box" key="killpoint">
      <span className="devidence-label">핵심 통찰</span>
      {w.killpoint}
    </div>,
    <p className="dp dlead" key="hook">{w.hook}</p>,
    <div className="dcard" key="highlight">{w.highlight}</div>,
    <WealthTimeline periods={timeline} key="timeline" />,
  ];
  w.sections.forEach((s, idx) => {
    blocks.push(...headedParagraphBlocks(s.heading, s.body, `wealth-sec${idx}`));
  });
  return blocks;
}

/** 第八章(귀인과 신살) 대표 페이지의 블록 배열 — 긴 문단 나열 대신
 * 카드/목록으로 재구성한다. gwiinSinsalSection의 intro/detail/brief/
 * closing 문장은 전혀 바꾸지 않는다(원고 승인 완료 —
 * content/paid-report/05-gwiin-sinsal-draft.md). 카드 그리드/보조 목록은
 * 각각 통째로 한 블록이다(그리드 중간이 페이지 경계에서 잘리는 것을
 * 막기 위함). */
export function chapterEightBlocks(
  c: NonNullable<ReportResult["gwiinSinsalSection"]>
): React.ReactElement[] {
  const blocks: React.ReactElement[] = [
    <div key="header">
      <span className="dsection-label">{c.chapterLabel}</span>
      <h2 className="dsection-heading">{c.title}</h2>
    </div>,
    <p className="dp" key="intro">{c.intro}</p>,
  ];

  if (c.detail.length > 0) {
    blocks.push(
      <div className="gwiin-grid" key="detail-grid">
        {c.detail.map((item, idx) => (
          <div className="dgwiin-card" key={idx}>
            <p className="dgwiin-card-name">{item.name}</p>
            <p className="dgwiin-card-body">{item.body}</p>
          </div>
        ))}
      </div>
    );
  }

  if (c.brief.length > 0) {
    blocks.push(<h3 className="dsubheading" key="brief-heading">함께 들어 있는 기운</h3>);
    blocks.push(
      <div className="gwiin-brief-row" key="brief-list">
        {c.brief.map((item, idx) => (
          <p className="dgwiin-brief-item" key={idx}>
            <strong>{item.name}</strong>
            {item.body}
          </p>
        ))}
      </div>
    );
  }

  if (c.closing) {
    blocks.push(<div className="dcard" key="closing">{c.closing}</div>);
  }

  return blocks;
}

/* ────────────────────────────────────────────────────────────────
 * 대표 페이지 v3(2026-09) — "고급 한지 동양 운명서" 재해석. 사용자가
 * v2(다크 전체)를 반려하고 A안의 실제 핵심(표지만 먹빛, 본문은 따뜻한
 * 한지+이미지·텍스트 결합 편집)을 다시 지정했다. 본문 타이포그래피는
 * ReportPdfDocument.tsx의 검증된 클래스(.p/.p.callout/.p.ivory-card/
 * .subheading/ChapterTitle/Paragraphs)를 그대로 재사용한다 — 새로 만든
 * 클래스는 "이미지+텍스트 결합 오프닝"과 "명식/오행/재물흐름의 인쇄용
 * 프리미엄 표현"에만 한정된다. 새 문장/새 점수 없음(WealthTimelineLight의
 * 라벨→색 매핑 제외 — 이미 계산된 A~E 문자열에 색만 입히는 것, v2와
 * 동일한 원칙).
 * ──────────────────────────────────────────────────────────────── */

/** 한지 배경용 절제된 장식선 — v2 Ornament와 동일한 매화가지 모티프를
 * 잉크/금빛 톤으로만 바꿔 재사용한다(디자인 언어의 통일감). */
function HanjiOrnament() {
  return (
    <svg className="hopen-ornament" width="90" height="22" viewBox="0 0 90 22" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 12 C 20 3, 35 21, 45 12 C 55 3, 70 21, 86 12" stroke="#A9803D" strokeWidth="0.9" fill="none" />
      <circle cx="20" cy="7.6" r="1.7" fill="#A9803D" />
      <circle cx="45" cy="12" r="1.7" fill="#A9803D" />
      <circle cx="70" cy="7.6" r="1.7" fill="#A9803D" />
    </svg>
  );
}

/** 구성 A(좌우 분할) — 第一章. 이미지 칼럼과 텍스트 칼럼이 한 페이지
 * 안에 함께 있다 — "이미지 한 페이지 + 텍스트 한 페이지" 구조를 쓰지
 * 않는다. lead(예: chapterOne.goldHook)까지 이 페이지에 함께 실어,
 * 오프닝 자체가 이미 본문의 시작이 되게 한다(장식 문구 한 줄이 아니라
 * 진짜 내용). */
export function ChapterOpenSplit({
  fairy,
  scene,
  motif,
  label,
  title,
  lead,
}: {
  /** 사진(선녀 이미지) — 표지/사랑과 인연/인생의 전환점/마지막 장처럼
   * 인물 몰입이 필요한 "핵심 장"에만 넘긴다(2026-09 재지시: 인물 배정
   * 장이 바뀌었다 — 더 이상 第一·五·八章이 아니다). */
  fairy?: FairyImageSlot;
  /** PdfScenes.tsx의 전면 삽화 장면 — fairy가 없을 때, 이미지 칼럼
   * 전체를 채우는 배경으로 쓴다(AI 이미지 생성 도구가 크레딧 부족으로
   * 막혀 있어, 사용자 승인하에 이 SVG 장면을 대안으로 쓴다). */
  scene?: PdfSceneKey;
  /** 레거시 — 작은 중앙 아이콘. scene이 없을 때만 폴백으로 쓴다. */
  motif?: PdfMotifKey;
  label: string;
  title: string;
  /** 없으면 텍스트 칼럼에 label/title/장식선만 싣는다(도입문 없이도
   * 구성 자체는 완결된다) — 본문에 이미 나오는 문장을 여기 또 넣어
   * 중복시키지 않기 위한 선택. */
  lead?: string;
}) {
  const SceneComp = scene ? PDF_SCENES[scene] : null;
  const MotifComp = motif ? PDF_MOTIFS[motif] : null;
  return (
    <section className="hopen-split">
      <div className="hopen-split-img-col">
        {fairy?.dataUri ? (
          <img className="hopen-split-img" src={fairy.dataUri} alt="" />
        ) : SceneComp ? (
          <div className="hopen-scene-panel"><SceneComp /></div>
        ) : MotifComp ? (
          <div className="hopen-motif-panel">
            <div className="hopen-motif-icon"><MotifComp /></div>
          </div>
        ) : (
          <div className="hopen-fallback">
            <span>선녀 이미지 자리</span>
            <span>{fairy?.expectedPath}</span>
          </div>
        )}
      </div>
      <div className="hopen-split-text-col">
        <p className="hopen-label">{label}</p>
        <h2 className="hopen-title">{title}</h2>
        <HanjiOrnament />
        {/* lead(goldHook)만 여기서 크게 보여준다 — 본문(ChapterOneHanjiBody가
            재사용하는 ChapterOneSection)이 같은 문장을 자체적으로 다시
            렌더링하므로, chapterOne의 다른 필드(cheoneulOpening/redInsight
            등)를 "도입문"으로 여기 또 넣으면 body에서 한 번 더 나와
            중복된다 — 그래서 이 페이지는 label/title/lead까지만 싣는다. */}
        {lead && <p className="hopen-lead">{lead}</p>}
      </div>
    </section>
  );
}

/** 구성 B(상단 이미지 → 그라데이션으로 자연스럽게 종이 톤에 녹아듦) —
 * 第五章. 하드 프레임 대신 페이드로 경계를 지워 "삽화를 붙였다"가
 * 아니라 "이미지에서 이야기가 이어진다"는 느낌을 준다. */
export function ChapterOpenStack({
  fairy,
  scene,
  motif,
  label,
  title,
}: {
  fairy?: FairyImageSlot;
  scene?: PdfSceneKey;
  motif?: PdfMotifKey;
  label: string;
  title: string;
}) {
  const SceneComp = scene ? PDF_SCENES[scene] : null;
  const MotifComp = motif ? PDF_MOTIFS[motif] : null;
  return (
    <section className="hopen-stack">
      <div className="hopen-stack-img-wrap">
        {fairy?.dataUri ? (
          <img className="hopen-stack-img" src={fairy.dataUri} alt="" />
        ) : SceneComp ? (
          <div className="hopen-scene-panel"><SceneComp /></div>
        ) : MotifComp ? (
          <div className="hopen-motif-panel hopen-motif-panel-stack">
            <div className="hopen-motif-icon"><MotifComp /></div>
          </div>
        ) : (
          <div className="hopen-fallback">
            <span>선녀 이미지 자리</span>
            <span>{fairy?.expectedPath}</span>
          </div>
        )}
        <div className="hopen-stack-fade" />
      </div>
      <div className="hopen-stack-body">
        <p className="hopen-label">{label}</p>
        <h2 className="hopen-title">{title}</h2>
        <HanjiOrnament />
        {/* 도입 문장은 여기 넣지 않는다 — 본문(ChapterFiveHanjiBody)이
            killpoint/hook을 곧바로 이어받아 중복을 피한다. */}
      </div>
    </section>
  );
}

/** 구성 C(소형 인물/오브제 삽입, 타이포그래피 중심) — 第八章. 이미지가
 * 페이지를 지배하지 않고 절제된 상징으로만 존재한다. */
export function ChapterOpenInset({
  fairy,
  scene,
  motif,
  label,
  title,
}: {
  fairy?: FairyImageSlot;
  scene?: PdfSceneKey;
  motif?: PdfMotifKey;
  label: string;
  title: string;
}) {
  const SceneComp = scene ? PDF_SCENES[scene] : null;
  const MotifComp = motif ? PDF_MOTIFS[motif] : null;
  return (
    <section className="hopen-inset">
      {fairy?.dataUri ? (
        <img className="hopen-inset-img" src={fairy.dataUri} alt="" />
      ) : SceneComp ? (
        <div className="hopen-scene-panel hopen-scene-panel-inset"><SceneComp /></div>
      ) : MotifComp ? (
        <div className="hopen-motif-panel hopen-motif-panel-inset">
          <div className="hopen-motif-icon"><MotifComp /></div>
        </div>
      ) : (
        <div className="hopen-fallback" style={{ position: "static", width: "60mm", height: "76mm" }}>
          <span>선녀 이미지 자리</span>
          <span>{fairy?.expectedPath}</span>
        </div>
      )}
      <p className="hopen-label">{label}</p>
      <h2 className="hopen-title">{title}</h2>
      <HanjiOrnament />
      {/* 도입 문장은 여기 넣지 않는다 — 본문(ChapterEightHanjiBody)이
          intro를 곧바로 이어받아 중복을 피한다. */}
    </section>
  );
}

/** 명식 — 단순 표가 아니라 "기록물" 플라크. PillarTable과 같은
 * report.pillars 데이터를 그대로 쓰되(새 계산 없음), 인쇄용으로 더
 * 격식 있는 카드 배열로 재구성한다. */
export function MyeongsikPlaque({ report }: { report: ReportResult }) {
  const { stems, branches } = report.pillars;
  return (
    <section className="chapter">
      <ChapterTitle label="命 式" title={`${report.userName}님의 사주 원국`} />
      <p className="hmyeongsik-caption">— 時 日 月 年 —</p>
      <div className="hmyeongsik-plaque">
        <div className="hmyeongsik-grid">
          {stems.map((c, i) => (
            <div className={`hmyeongsik-cell${c.isDay ? " day-cell" : ""}`} key={`s${i}`}>
              {c.label && <span className="hlabel-top">{c.label}</span>}
              <span className="hhanja">{c.hanja}</span>
              <span className="hsub">{c.hangul} · {c.element}</span>
              {c.sipseong && <span className="hsipseong">{c.sipseong}</span>}
            </div>
          ))}
          {branches.map((c, i) => (
            <div className={`hmyeongsik-cell${c.isDay ? " day-cell" : ""}`} key={`b${i}`}>
              <span className="hhanja">{c.hanja}</span>
              <span className="hsub">{c.hangul} · {c.element}</span>
              {c.sipseong && <span className="hsipseong">{c.sipseong}</span>}
            </div>
          ))}
        </div>
      </div>
      <p className="p">{report.summaryTitle} — {report.dayMasterLabel}.</p>
    </section>
  );
}

/** 오행 — 화면(FiveElementDiagram)과 동일한 오방색 의미를 그대로 쓰는
 * PDF 전용 막대 인포그래픽. 계산은 report.elementBalance(이미 확정된
 * 값)를 그대로 옮길 뿐, 이 파일에서 새로 만들지 않는다. 색상은
 * ResultLandingV2.tsx의 ELEMENT_COLORS 상수와 정확히 동일한 값을
 * 쓴다(그 상수 자체가 export되어 있지 않아 값만 그대로 복제 — 의미는
 * 물론 값도 절대 임의로 바꾸지 않았다). */
const HANJI_ELEMENT_COLORS: Record<string, string> = {
  wood: "#1F6B47",
  fire: "#9C1F13",
  earth: "#8A5D00",
  metal: "#4C4A45",
  water: "#2B6CB0",
};

/** [2026-09 리디자인] 단순 막대 목록 대신 "원형 오행" 시각화(§9 지시) —
 * 화면의 FiveElementDiagram(SVG 애니메이션 컴포넌트)을 그대로 복제하지
 * 않고, 인쇄에 안전한 정적 도넛 링을 이 파일에서 새로 그린다. 각도
 * 계산(stroke-dasharray 방식)은 순수 렌더링 수학일 뿐 — 실제 비율 값은
 * report.elementBalance(이미 계산된 %) 그대로 쓰고, 이 파일에서 임의
 * 점수를 만들지 않는다. 글자(오행명·%)가 링에 가려지지 않도록 링은
 * 위쪽에 독립적으로 두고, 정확한 수치는 바로 아래 목록에 또렷하게
 * 남겨 둔다(장식 때문에 수치가 안 읽히는 일을 막기 위해 §9에서 명시적
 * 요구). */
function buildOhangArcs(report: ReportResult) {
  const r = 78;
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

export function OhangWheel({ report }: { report: ReportResult }) {
  const strongestLabel = report.elementBalance.find((e) => e.key === report.elementStrongest)?.label;
  const weakestLabel = report.elementBalance.find((e) => e.key === report.elementWeakest)?.label;
  const arcs = buildOhangArcs(report);
  return (
    <section className="chapter">
      <ChapterTitle label="五 行" title={`${report.userName}님의 오행 균형`} />
      <div className="hohang-wheel-wrap">
        <svg viewBox="0 0 200 200" className="hohang-wheel-svg" xmlns="http://www.w3.org/2000/svg">
          <circle cx="100" cy="100" r="78" fill="none" stroke="#E4D6B8" strokeWidth="22" />
          {arcs.map((a) => (
            <circle
              key={a.key}
              cx="100" cy="100" r={a.r}
              fill="none"
              stroke={HANJI_ELEMENT_COLORS[a.key] ?? "#8B7257"}
              strokeWidth="22"
              strokeDasharray={`${a.dash} ${a.circumference - a.dash}`}
              strokeDashoffset={a.offset}
              transform="rotate(-90 100 100)"
            />
          ))}
          <text x="100" y="96" textAnchor="middle" className="hohang-wheel-center-label">五行</text>
          <text x="100" y="116" textAnchor="middle" className="hohang-wheel-center-sub">균형</text>
        </svg>
      </div>
      <div className="hohang-legend">
        {report.elementBalance.map((el) => (
          <div className="hohang-legend-row" key={el.key}>
            <span className="hohang-legend-dot" style={{ background: HANJI_ELEMENT_COLORS[el.key] ?? "#8B7257" }} />
            <span className="hohang-legend-name">{el.label}</span>
            <span className="hohang-legend-value">{el.value}%</span>
          </div>
        ))}
      </div>
      <p className="hohang-note">
        가장 강한 기운은 <strong>{strongestLabel}</strong>, 가장 약한 기운은 <strong>{weakestLabel}</strong>입니다.
      </p>
    </section>
  );
}

/** 第五章 재물운 시각화 — 한지 배경에서도 또렷하도록 v2와 다른(하지만
 * 동일한 라벨→카테고리) 색 톤을 쓴다. 판정 자체(analyzeWealthTiming의
 * A~E 문자열)는 그대로다. */
const HANJI_TIMING_COLOR: Record<string, string> = {
  "강화형(A)": "#8B6F3E",
  "부담형(B)": "#9C3B2E",
  "기반형(C)": "#5C6E5C",
  "분산/흔들림형(D)": "#6B5C82",
  "신호없음형(E)": "#8B8070",
};

export function WealthTimelineLight({ periods }: { periods: WealthTimelineSegment[] }) {
  if (periods.length === 0) return null;
  const usedLabels = Array.from(new Set(periods.map((p) => p.label)));
  return (
    <div className="hwealth-timeline">
      <p className="hwealth-timeline-title">— 대운으로 보는 재물의 흐름 —</p>
      <div className="hwealth-timeline-track">
        {periods.map((p, idx) => (
          <div
            key={idx}
            className={`hwealth-timeline-seg${p.state === "current" ? " seg-current" : ""}`}
            style={{ background: HANJI_TIMING_COLOR[p.label] ?? "#8B8070" }}
          >
            <span className="seg-age">{p.startAge}-{p.endAge}세</span>
            <span className="seg-ganzhi">{p.ganZhi}</span>
            <span className="seg-label">{p.label.replace(/형.*/, "")}</span>
          </div>
        ))}
      </div>
      <div className="hwealth-timeline-legend">
        {usedLabels.map((l) => (
          <span key={l}>
            <span className="legend-dot" style={{ background: HANJI_TIMING_COLOR[l] ?? "#8B8070" }} />
            {l}
          </span>
        ))}
        <span>· 굵은 테두리 = 현재 대운</span>
      </div>
    </div>
  );
}

/** TenYearTimelineLight는 순환 참조 방지를 위해 ReportPdfPrimitives.tsx로
 * 옮겼다(위 import 참고) — 로직/마크업은 100% 동일, 위치만 이동. */

/** 第一章 본문(한지) — chapterOne의 문장/순서는 기존 ChapterOneSection
 * (ReportPdfDocument.tsx, 그대로 export 유지)과 완전히 동일하게
 * 옮기되, ChapterTitle과 goldHook(lead)만 여기서 다시 그리지 않는다 —
 * 둘 다 바로 앞 페이지(ChapterOpenSplit)에 이미 실려 있어서, 그대로
 * 재사용하면 같은 문장이 페이지 1장 건너 반복돼 오타처럼 보인다(실제
 * 생성 후 발견). 나머지 필드(cheoneulOpening/body1~4/redInsight/
 * cardText)는 ChapterOneSection과 100% 동일한 순서·클래스로 그대로
 * 옮긴다 — 새 문장 없음. 그 뒤 chapterOneDeep(결제 전용 심화)을 같은
 * 톤의 소제목+문단으로 이어 붙인다. */
export function ChapterOneHanjiBody({ report }: { report: ReportResult }) {
  const c = report.chapterOne;
  const deep = report.chapterOneDeep;
  return (
    <>
      <section className="chapter">
        {c.cheoneulOpening && <p className="p callout">{c.cheoneulOpening}</p>}
        <Paragraphs items={c.body1} />
        <Paragraphs items={c.body2} />
        <p className="p callout">{c.redInsight}</p>
        <Paragraphs items={c.body3} />
        <Paragraphs items={c.body4} />
        <p className="p ivory-card">{c.cardText}</p>
      </section>
      {deep && (
        <section className="chapter">
          <ChapterTitle label={c.chapterLabel} title="겉과 속 — 심화 통찰" />
          <p className="p callout">{deep.visual.compareInsight}</p>
          {deep.sections.map((s, idx) => (
            <div key={idx}>
              <h3 className="subheading">{s.heading}</h3>
              <Paragraphs items={s.body} />
            </div>
          ))}
        </section>
      )}
    </>
  );
}

/** 第五章 본문(한지) — hook/killpoint/highlight/sections은 기존
 * .p.callout/.p.lead/.p.ivory-card/.subheading 클래스를 그대로 쓴다.
 * WealthTimelineLight만 새로 얹는다. */
export function ChapterFiveHanjiBody({
  report,
  timeline,
}: {
  report: ReportResult;
  timeline: WealthTimelineSegment[];
}) {
  const w = report.chapterWealthInsight;
  if (!w) return null;
  return (
    // ChapterTitle을 여기서 다시 그리지 않는다 — 바로 앞
    // ChapterOpenStack 페이지에 "第五章 / {이름}님의 재물운"이 이미
    // 실려 있다(중복 방지, 第一章과 동일한 이유).
    <section className="chapter">
      <p className="p callout">{w.killpoint}</p>
      <p className="p lead">{w.hook}</p>
      <p className="p ivory-card">{w.highlight}</p>
      <WealthTimelineLight periods={timeline} />
      {w.sections.map((s, idx) => (
        <div key={idx}>
          <h3 className="subheading">{s.heading}</h3>
          <Paragraphs items={s.body} />
        </div>
      ))}
    </section>
  );
}

/** 第八章 본문(한지) — 카드 그리드 대신 가는 선 목록. 문장은 전혀
 * 바꾸지 않는다. */
export function ChapterEightHanjiBody({
  c,
}: {
  c: NonNullable<ReportResult["gwiinSinsalSection"]>;
}) {
  return (
    // ChapterTitle 미출력 — 바로 앞 ChapterOpenInset 페이지에 이미
    // "{c.chapterLabel} / {c.title}"이 실려 있다(중복 방지).
    <section className="chapter">
      <p className="p">{c.intro}</p>
      {c.detail.map((item, idx) => (
        <div className="hgwiin-item" key={idx}>
          <p className="hgwiin-name">{item.name}</p>
          <p className="hgwiin-body">{item.body}</p>
        </div>
      ))}
      {c.brief.length > 0 && (
        <>
          <h3 className="subheading">함께 들어 있는 기운</h3>
          <div className="hgwiin-brief-row">
            {c.brief.map((item, idx) => (
              <p className="hgwiin-brief-item" key={idx}>
                <strong>{item.name}</strong>
                {item.body}
              </p>
            ))}
          </div>
        </>
      )}
      {c.closing && <p className="p ivory-card">{c.closing}</p>}
    </section>
  );
}

/** [2026-09 리디자인] 마지막 페이지 — 이전엔 텍스트 한 줄뿐인 빈 페이지
 * 였다(§14/§19 지시: "표지 없는 표지를 최종본으로 인정 안 함"과 같은
 * 원칙을 마지막 페이지에도 적용). 표지와 짝을 이루는 "책을 덮는" 장면 —
 * 인물(마지막 장, 승인된 인물 배정 4곳 중 하나)이 뒤돌아 걸어가는
 * 이미지 위에 짧은 마무리 문구만 얹는다. 문구는 기존에 이미 doc 전체
 * 하단에 쓰던 "八字門 · 이 운명록은 OOO님만을 위해 계산되었습니다"
 * 문장을 그대로 유지하고, 그 앞에 짧은 감성 한 줄만 더한다(명리
 * 해석이 아니라 책의 마지막 인사말 — 실제 콘텐츠/판단 아님). */
export function EndingPage({ report, fairy }: { report: ReportResult; fairy: FairyImageSlot }) {
  return (
    <section className="hending">
      <div className="hending-frame">
        {fairy.dataUri ? (
          <img className="hending-img" src={fairy.dataUri} alt="" />
        ) : (
          <div className="hending-fallback">
            <span>선녀 이미지 자리</span>
            <span>{fairy.expectedPath}</span>
          </div>
        )}
        <div className="hending-scrim">
          <p className="hending-brand">八字門</p>
          <HanjiOrnament />
          <p className="hending-message">이 책은 여기서 끝나지만, {report.userName}님의 이야기는 계속됩니다.</p>
          <p className="hending-sub">이 운명록은 {report.userName}님만을 위해 계산되었습니다.</p>
        </div>
      </div>
    </section>
  );
}
