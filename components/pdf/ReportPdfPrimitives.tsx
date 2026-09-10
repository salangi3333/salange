import React from "react";
import { ReportResult, ChapterTenYearItem } from "@/lib/reportMapper";

/**
 * [2026-09 PDF 디자인 마스터] ReportPdfDocument.tsx(Track A, 실데이터
 * 조립)와 ReportPdfPrototype.tsx(Track B, 디자인/장식) 양쪽이 함께 쓰는
 * 최소 공통 요소만 이 파일에 둔다 — Document가 TenYearTimelineLight
 * 같은 Prototype 쪽 요소를, Prototype이 Paragraphs/ChapterTitle 같은
 * Document 쪽 요소를 서로 import하면서 생기는 순환 참조(circular
 * import)를 피하기 위한 제3의 파일이다. 이 파일 자체는 다른 pdf 파일을
 * 전혀 import하지 않는다(순환 참조의 근본 원인 제거).
 *
 * 여기 있는 함수들은 전부 기존 ReportPdfDocument.tsx / ReportPdfPrototype.tsx
 * 에 있던 것을 그대로 옮긴 것이며, 문장·로직·계산은 전혀 바꾸지 않았다.
 */

export function Paragraphs({ items }: { items: string[] }) {
  return (
    <>
      {items.filter(Boolean).map((p, idx) => (
        <p className="p" key={idx}>
          {p}
        </p>
      ))}
    </>
  );
}

export function ChapterTitle({ label, title }: { label: string; title: string }) {
  return (
    <div className="chapter-title">
      <span className="chapter-label">{label}</span>
      <h2 className="chapter-heading">{title}</h2>
    </div>
  );
}

export function PillarTable({ pillars }: { pillars: ReportResult["pillars"] }) {
  return (
    <table className="pillar-table">
      <thead>
        <tr>
          {pillars.stems.map((c, i) => (
            <th key={i}>{c.label ?? ""}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          {pillars.stems.map((c, i) => (
            <td key={i} className={c.isDay ? "day-cell" : ""}>
              <div className="hanja">{c.hanja}</div>
              <div className="sub">{c.hangul} · {c.element}</div>
              {c.sipseong && <div className="sub">{c.sipseong}</div>}
            </td>
          ))}
        </tr>
        <tr>
          {pillars.branches.map((c, i) => (
            <td key={i} className={c.isDay ? "day-cell" : ""}>
              <div className="hanja">{c.hanja}</div>
              <div className="sub">{c.hangul} · {c.element}</div>
              {c.sipseong && <div className="sub">{c.sipseong}</div>}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}

export function ElementList({ report }: { report: ReportResult }) {
  return (
    <div className="element-block">
      <ul className="element-list">
        {report.elementBalance.map((el) => (
          <li key={el.key}>
            <span className="element-name">{el.label}</span>
            <span className="element-value">{el.value}%</span>
          </li>
        ))}
      </ul>
      <p className="p small">
        가장 강한 기운은 <strong>{report.elementBalance.find((e) => e.key === report.elementStrongest)?.label}</strong>,
        가장 약한 기운은 <strong>{report.elementBalance.find((e) => e.key === report.elementWeakest)?.label}</strong>입니다.
      </p>
    </div>
  );
}

/** 10년 흐름(第七章) — 화면(TenYearFlowChart)의 SVG 곡선을 그대로
 * 캡처해 넣지 않는다(인쇄 안정성 원칙, 감사에서 확인된 기존 방식과
 * 동일). report.chapterTenYear.items[].flowIntensity(이미 0~100으로
 * 계산된 실측값, buildFlowIntensity() 결과 — 새 점수 아님)를 막대
 * 높이로만 옮긴다. 재물 흐름(WealthTimelineLight, ReportPdfPrototype.tsx)과
 * 동일한 "밴드" 문법을 재사용해 같은 책이라는 통일감을 준다(클래스명만
 * 공유, 로직 의존은 없음 — 순환 참조 없이 독립적으로 이 파일에 둔다).
 * 대운 전환 해(isTransitionYear)는 굵은 테두리로만 구분(재물 밴드의
 * "현재 대운" 표시와 동일한 언어). */
export function TenYearTimelineLight({ items }: { items: ChapterTenYearItem[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="htenyear-timeline">
      <p className="hwealth-timeline-title">— 10년의 흐름 —</p>
      <div className="htenyear-track">
        {items.map((it, idx) => (
          <div className="htenyear-col" key={idx}>
            <div className="htenyear-bar-wrap">
              <div
                className={`htenyear-bar${it.isTransitionYear ? " bar-transition" : ""}`}
                style={{ height: `${Math.max(6, it.flowIntensity)}%` }}
              />
            </div>
            <span className="htenyear-year">{it.year}</span>
            <span className="htenyear-age">{it.age}세</span>
            <span className="htenyear-ganzhi">{it.ganZhiHanja}</span>
          </div>
        ))}
      </div>
      <p className="hwealth-timeline-legend" style={{ justifyContent: "center" }}>
        <span>막대 높이 = 이 10년 안에서의 상대적 신호 밀도(절대 길흉 점수 아님)</span>
        <span>· 굵은 테두리 = 대운이 바뀌는 해</span>
      </p>
    </div>
  );
}
