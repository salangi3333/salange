import React from "react";
import { ReportResult } from "@/lib/reportMapper";

/**
 * [공통 다크 PDF — 6장 검수용 조립] 현재 Production의 6장 데이터(report.chapterLifeTransitionInsight)를
 * 문장 변경 없이 .flow 블록으로만 옮긴다. 실제 .page 나누기는 lib/pdfBookPaginate.ts가 한다.
 * 근거 영역 표기는 PDF에서 모두 "명리 근거"로 통일한다(표시 이름만 — 데이터·화면은 그대로).
 */
const BASIS_NAMES = new Set(["정리 근거", "이 풀이의 명리 근거", "명리 근거"]);
export const darkHeading = (h: string) => (BASIS_NAMES.has(h) ? "명리 근거" : h);

interface BasisItem { title: string; body: string; basis?: string }
function parseBasisLines(lines: string[]): { intro: string; items: BasisItem[] } {
  const [intro, ...rest] = lines;
  const items: BasisItem[] = [];
  for (let i = 0; i < rest.length; ) {
    const title = rest[i], body = rest[i + 1] ?? "";
    const b = rest[i + 2]?.startsWith("[명리 근거]") ? rest[i + 2].replace(/^\[명리 근거\]\s*/, "") : undefined;
    items.push({ title, body, basis: b });
    i += b !== undefined ? 3 : 2;
  }
  return { intro: intro ?? "", items };
}

export function DarkLifeTransitionFlow({ report, chapterLabel }: { report: ReportResult; chapterLabel: string }) {
  const sections = report.chapterLifeTransitionInsight?.sections ?? [];
  const blocks: React.ReactElement[] = [];
  sections.forEach((s, si) => {
    const heading = darkHeading(s.heading);
    const isBasis = BASIS_NAMES.has(s.heading);
    blocks.push(
      <div className="blk head" data-keep="1" key={`h${si}`}>
        {isBasis ? (
          <>
            <div className="mini">{heading}</div>
            <div className="hair" />
          </>
        ) : (
          <>
            <div className="title">{heading}</div>
            <div className="rule" />
          </>
        )}
      </div>
    );
    if (BASIS_NAMES.has(s.heading)) {
      const { intro, items } = parseBasisLines(s.body);
      if (intro) blocks.push(<p className="blk intro" key={`i${si}`}>{intro}</p>);
      items.forEach((it, ii) =>
        blocks.push(
          <div className="blk grp" key={`g${si}-${ii}`}>
            <div className="sub">{it.title}</div>
            <p>{it.body}</p>
            {it.basis !== undefined && (
              <div className="basis"><span className="lab">명리 근거</span><p>{it.basis}</p></div>
            )}
          </div>
        )
      );
    } else {
      s.body.filter(Boolean).forEach((p, pi) => blocks.push(<p className="blk" key={`p${si}-${pi}`}>{p}</p>));
    }
  });
  return <div className="flow" data-label={chapterLabel}>{blocks}</div>;
}
