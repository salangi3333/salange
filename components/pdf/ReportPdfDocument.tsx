import React from "react";
import { ReportResult } from "@/lib/reportMapper";
import { IntakeFormData } from "@/lib/sajuEngine";
import { AppData } from "@/lib/sajuContent";
import { analyzeWealthTiming } from "@/lib/wealthTimingAnalysis";
import { Paragraphs, ChapterTitle, PillarTable, ElementList, TenYearTimelineLight } from "./ReportPdfPrimitives";
import {
  FairyImageSlot,
  PremiumCover,
  IntroPage,
  TableOfContents,
  TocEntry,
  MyeongsikPlaque,
  OhangWheel,
  ChapterOpenSplit,
  ChapterOpenStack,
  ChapterOpenInset,
  ChapterOneHanjiBody,
  ChapterFiveHanjiBody,
  ChapterEightHanjiBody,
  EndingPage,
  WealthTimelineLight,
  WealthTimelineSegment,
} from "./ReportPdfPrototype";

/** [2026-09 PDF 디자인 마스터] Paragraphs/ChapterTitle/PillarTable/ElementList는
 * 순환 참조 방지를 위해 ReportPdfPrimitives.tsx로 옮겼다 — 로직은 100%
 * 동일, 위치만 이동. 이 파일에서도 그대로 재-export해 기존에 이 파일에서
 * 이 요소들을 가져다 쓰던 다른 코드가 깨지지 않게 한다. */
export { Paragraphs, ChapterTitle, PillarTable, ElementList };

/**
 * 소장용 PDF 전용 — 화면(ResultLandingV2.tsx)과 완전히 분리된 별도
 * 표현 레이어. 이 파일은 이미 계산·조립된 ReportResult 하나만 입력으로
 * 받아 그리기만 한다 — 새 사주 계산, 새 해석, 새 문장을 이 파일에서
 * 만들지 않는다(기존 계산 엔진/第一章~第八章 원고는 전혀 건드리지
 * 않음, lib/reportMapper.ts가 만든 값을 그대로 옮길 뿐이다).
 *
 * ResultLandingV2.tsx와 다른 점(의도적):
 *   - 화면은 짙은 배경 + 무료/유료 잠금(블러 다리, teaser)이 있지만, PDF는
 *     이미 결제 완료된 고객이 소장하는 문서이므로 잠금/블러/티저 UI를
 *     아예 그리지 않는다(잠긴 문장을 자르는 게 아니라,애초에 전부 공개된
 *     문서라 "잠금 개념" 자체가 없다).
 *   - 第四章(금전운의 흐름) 본문의 lockedDetail(⑤~⑧)은 이번 v1 PDF에
 *     포함하지 않는다 — 현재 유료 웹 화면도 아직 이 필드를 노출하지
 *     않고 있어서(reportMapper.ts 주석 참고), PDF만 웹보다 더 많은 내용을
 *     먼저 공개하지 않기 위한 선택이다. 웹에 붙는 시점에 PDF도 같이 검토.
 *   - 第七章 10년 그래프(SVG 곡선)는 재구현하지 않는다 — 승인된 시각화
 *     컴포넌트(ResultLandingV2.tsx)를 이 파일에서 복제/재사용하지 말라는
 *     지시에 따라, 대신 같은 데이터(연도/간지/flowIntensity/area)를
 *     인쇄에 안전한 단순 표로만 보여준다.
 *   - 오행도 원형 다이어그램 대신 단순 목록(%)으로만 보여준다(같은 이유).
 *
 * 클래스명은 lib/reportPdf.ts가 감싸는 <style> 블록과 1:1로 대응한다 —
 * Tailwind 클래스는 이 문서(Puppeteer가 여는 독립 HTML 문자열)에 전혀
 * 컴파일되어 들어가지 않으므로 여기서는 쓰지 않는다.
 */

export function ChapterOneSection({ c }: { c: ReportResult["chapterOne"] }) {
  return (
    <section className="chapter">
      <ChapterTitle label={c.chapterLabel} title={c.title} />
      {c.cheoneulOpening && <p className="p callout">{c.cheoneulOpening}</p>}
      <p className="p lead">{c.goldHook}</p>
      <Paragraphs items={c.body1} />
      <Paragraphs items={c.body2} />
      <p className="p callout">{c.redInsight}</p>
      <Paragraphs items={c.body3} />
      <Paragraphs items={c.body4} />
      <p className="p ivory-card">{c.cardText}</p>
    </section>
  );
}

/** [2026-09 PDF 디자인 마스터] ChapterTitle을 여기서 그리지 않는다 —
 * 이 섹션 바로 앞에 놓이는 ChapterDivider 페이지(제목 전용)가 이미
 * label/title을 실었다(第一·五·八章의 HanjiBody 계열과 동일한 원칙,
 * 본문·순서·문장은 전혀 바꾸지 않음). */
interface DeepBar { category: string; rank: number; widthPercent: number }
interface DeepDomain { area: string; category: string; lead: string; detail: string }
interface DeepPairLabel { aLabel: string; bLabel: string; aHint: string; bHint: string }

export function GenericChapterSection({
  c,
  deep,
}: {
  c: ReportResult["chapters"][number];
  /** [2026-09 리디자인] chapterTwoDeep/chapterThreeDeep — chapterOneDeep과
   * 같은 성격(결제 고객 전용 심화, ResultLandingV2.tsx에 이미 승인되어
   * 렌더링 중인 실제 콘텐츠)인데 이전 PDF 라운드에서 빠져 있던 것을
   * 이번에 새로 포함한다. 새 문장 없음 — 전부 chapterTwoDeepNarrative.ts/
   * chapterThreeDeepNarrative.ts가 이미 계산해 둔 값을 그대로 옮긴다.
   * bars/domains/comfort/tension은 화면의 SVG 컴포넌트를 복제하지 않고
   * (웹 컴포넌트 복제 금지 원칙과 동일선상) 인쇄에 안전한 막대/카드로
   * 재구성한 것 — 값 자체는 손대지 않았다. */
  deep?: {
    sections: { heading: string; body: string[] }[];
    bars?: DeepBar[];
    domains?: DeepDomain[];
    comfort?: DeepPairLabel[];
    tension?: DeepPairLabel[];
  };
}) {
  return (
    <section className="chapter">
      {c.richBody ? (
        <>
          {c.richBody.intro && <p className="p">{c.richBody.intro}</p>}
          <h3 className="subheading">{c.richBody.subheadingA}</h3>
          <Paragraphs items={c.richBody.bodyA} />
          {c.richBody.redLine && <p className="p callout">{c.richBody.redLine}</p>}
          <h3 className="subheading">{c.richBody.subheadingB}</h3>
          <Paragraphs items={c.richBody.bodyB} />
          {c.highlight && <p className="p ivory-card">{c.highlight}</p>}
        </>
      ) : (
        <>
          <Paragraphs items={c.body} />
          {c.highlight && <p className="p ivory-card">{c.highlight}</p>}
        </>
      )}
      {deep && deep.sections.length > 0 && (
        <>
          <h3 className="subheading">겉과 속 — 심화 통찰</h3>
          {deep.bars && deep.bars.length > 0 && (
            <div className="hdeep-bars">
              {deep.bars.map((b) => (
                <div className="hdeep-bar-row" key={b.category}>
                  <span className="hdeep-bar-name">{b.category}</span>
                  <div className="hdeep-bar-track">
                    <div className="hdeep-bar-fill" style={{ width: `${b.widthPercent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
          {deep.domains && deep.domains.length > 0 && (
            <div className="hdeep-domain-grid">
              {deep.domains.map((d, idx) => (
                <div className="hdeep-domain-card" key={idx}>
                  <span className="hdeep-domain-area">{d.area} · {d.category}</span>
                  <p className="hdeep-domain-lead">{d.lead}</p>
                  <p className="hdeep-domain-detail">{d.detail}</p>
                </div>
              ))}
            </div>
          )}
          {(deep.comfort || deep.tension) && (
            <div className="hdeep-pair-cols">
              {deep.comfort && deep.comfort.length > 0 && (
                <div className="hdeep-pair-col">
                  <p className="hdeep-pair-title">나에게 편한 관계</p>
                  {deep.comfort.map((p, idx) => (
                    <p className="hdeep-pair-item" key={idx}>{p.aLabel}·{p.bLabel} — {p.aHint} / {p.bHint}</p>
                  ))}
                </div>
              )}
              {deep.tension && deep.tension.length > 0 && (
                <div className="hdeep-pair-col">
                  <p className="hdeep-pair-title">긴장이 생기기 쉬운 관계</p>
                  {deep.tension.map((p, idx) => (
                    <p className="hdeep-pair-item" key={idx}>{p.aLabel}·{p.bLabel} — {p.aHint} / {p.bHint}</p>
                  ))}
                </div>
              )}
            </div>
          )}
          {deep.sections.map((s, idx) => (
            <div key={idx}>
              <h4 className="year-heading">{s.heading}</h4>
              <Paragraphs items={s.body} />
            </div>
          ))}
        </>
      )}
    </section>
  );
}

export function LoveSection({ c }: { c: NonNullable<ReportResult["chapterLove"]> }) {
  return (
    <section className="chapter">
      {c.sections.map((s, idx) => (
        <div className="subsection" key={idx}>
          <h3 className="subheading">{s.heading}</h3>
          <Paragraphs items={s.body} />
        </div>
      ))}
    </section>
  );
}

function LifeTransitionSection({
  c,
  insight,
}: {
  c: NonNullable<ReportResult["chapterLifeTransition"]>;
  /** [2026-09 리디자인] chapterLifeTransitionInsight — chapterOneDeep과
   * 같은 패턴의 "추가 심화" 섹션(8개). lifeTransitionInsightNarrative.ts가
   * buildLifeFlowNarrative(별도 소스)를 입력으로 삼아 새로 생성한
   * 문장이라, chapterLifeTransition의 ①~④ 문단과 문자열이 겹치지
   * 않는다(직접 확인 — chapterWealthInsight처럼 기존 문단을 재사용하는
   * 구조가 아님). ①~④ 위에 그대로 이어 붙인다 — 새 문장을 짓지 않고
   * 이미 계산된 sections를 그대로 옮길 뿐이다. */
  insight?: { sections: { heading: string; body: string[] }[] };
}) {
  return (
    <section className="chapter">
      {c.sections.map((s, idx) => (
        <div className="subsection" key={idx}>
          <h3 className="subheading">{s.heading}</h3>
          <p className="p">{s.body}</p>
        </div>
      ))}
      {insight && insight.sections.length > 0 && (
        <>
          <h3 className="subheading">더 깊이 — 전환점을 지나는 법</h3>
          {insight.sections.map((s, idx) => (
            <div className="subsection" key={idx}>
              <h4 className="year-heading">{s.heading}</h4>
              <Paragraphs items={s.body} />
            </div>
          ))}
        </>
      )}
    </section>
  );
}

function WealthSection({
  c,
  timeline,
}: {
  c: NonNullable<ReportResult["chapterFive"]> | NonNullable<ReportResult["chapterSix"]>;
  /** [2026-09 재구성] 第七章(재물이 움직이는 시기)에만 넘긴다 — 이미
   * 계산된 analyzeWealthTiming 결과를 그대로 시각화한 것, 새 판정 없음. */
  timeline?: WealthTimelineSegment[];
}) {
  return (
    <section className="chapter">
      {c.bridgeIntro && <p className="p small">{c.bridgeIntro}</p>}
      {timeline && timeline.length > 0 && <WealthTimelineLight periods={timeline} />}
      <Paragraphs items={c.body} />
    </section>
  );
}

export function TenYearSection({ c }: { c: NonNullable<ReportResult["chapterTenYear"]> }) {
  return (
    <section className="chapter">
      <Paragraphs items={c.intro.split("\n\n")} />

      <TenYearTimelineLight items={c.items} />
      <p className="p small">
        흐름 수치는 절대적인 길흉 점수가 아니라, 이 10년 안에서만 서로 비교한 상대적 신호 밀도입니다.
      </p>

      {c.segments.map((seg, idx) => (
        <p className="p" key={idx}>
          <strong>{seg.range}</strong> — {seg.summary}
        </p>
      ))}

      <h3 className="subheading">연도별 상세</h3>
      {c.items.map((it) => (
        <div className="subsection" key={it.year}>
          <h4 className="year-heading">
            {it.year}년 · {it.age}세 · {it.ganZhiHanja}({it.ganZhiHangul}) — {it.coreSignal}
          </h4>
          <p className="p">{it.narrative}</p>
        </div>
      ))}

      <h3 className="subheading">특히 기억할 시기</h3>
      {c.highlights.map((h, idx) => (
        <p className="p" key={idx}>
          <strong>{h.year}년</strong> — {h.reason}
        </p>
      ))}

      <Paragraphs items={c.closing.split("\n\n")} />
    </section>
  );
}

export function GwiinSinsalSection({ c }: { c: NonNullable<ReportResult["gwiinSinsalSection"]> }) {
  return (
    <section className="chapter">
      <p className="p">{c.intro}</p>
      {c.detail.map((item, idx) => (
        <div className="subsection" key={idx}>
          <h3 className="subheading">{item.name}</h3>
          <p className="p">{item.body}</p>
        </div>
      ))}
      {c.brief.length > 0 && (
        <>
          <h3 className="subheading">함께 들어 있는 기운</h3>
          {c.brief.map((item, idx) => (
            <p className="p" key={idx}>
              <strong>{item.name}</strong> — {item.body}
            </p>
          ))}
        </>
      )}
      {c.closing && <p className="p">{c.closing}</p>}
    </section>
  );
}

/** 표지/장 오프닝용 이미지 자리 4곳(표지·第一·五·八章) — 실제 파일이
 * 없으면(caller가 fairies를 넘기지 않으면) placeholder를 그린다(기존
 * FairyImageSlot 규칙, 인터넷에서 받아오지 않음). 파일 로딩(fs 읽기)은
 * 이 컴포넌트 파일이 아니라 호출부(생성 스크립트/lib/reportPdf.tsx)의
 * 책임으로 둔다 — 기존 _pdf_rep_v3_gen.tsx의 loadImageSlot과 동일한
 * 원칙(React 컴포넌트는 순수하게 props만 그린다). */
function emptySlot(baseName: string): FairyImageSlot {
  return { dataUri: null, expectedPath: `public/pdf-assets/${baseName}.png (미지정)` };
}

/** 2026-09 기존 승인 v3 대표 페이지 검증 스크립트(_pdf_rep_v3_gen.tsx)에
 * 이미 쓰인 문구를 그대로 재사용한다 — 이 파일에서 새로 짓지 않는다. */
const TAGLINE = "여덟 글자에 새겨진 운명, 그 문을 엽니다.";

/** [2026-09 아트디렉션 3차 재구현] "이 책에 대한 짧은 안내/프롤로그" —
 * 속표지와 목차 사이. 명리 해석이 아니라 책의 서문(편집자 말투)일 뿐이라
 * 새 콘텐츠 금지 지시와 무관하다 — 사주 판단/수치를 전혀 담지 않는다.
 * 새 이미지 세트(표지 1+챕터 8, 총 9장)엔 프롤로그 전용 사진이 따로
 * 없다 — 표지 사진을 여기 또 쓰면 표지→속표지→프롤로그 3페이지 연속
 * 같은 얼굴이 나와 버려서(반복 금지 원칙 위반), 텍스트 전용 여백
 * 페이지로 되돌린다. */
function ProloguePage({ report }: { report: ReportResult }) {
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

export default function ReportPdfDocument({
  report,
  generatedAt,
  intake,
  appData,
  fairies,
}: {
  report: ReportResult;
  generatedAt: string;
  intake: IntakeFormData;
  appData: AppData;
  /** [2026-09 아트디렉션 재구현] 사용자가 제공한 13장의 선녀 사진 중
   * 9장을 실제 내용(자세/시선/낮밤/배경) 분석 후 배정한 것 — 표지·
   * 프롤로그·타고난본질·타고난기질·살아가는방식·사랑·재물운·인생전환점·
   * 마지막장, 총 9곳. 10년/귀인신살은 의도적으로 선녀 없이 풍경·문양
   * (PdfScenes.tsx)만 쓴다 — "전 페이지 선녀 도배" 방지(사용자 지시).
   * 안 넘기면 placeholder(생성은 계속 성공). */
  fairies?: {
    cover?: FairyImageSlot;
    benjil?: FairyImageSlot;
    chapter?: FairyImageSlot;
    wayOfLife?: FairyImageSlot;
    love?: FairyImageSlot;
    wealth?: FairyImageSlot;
    lifeTransition?: FairyImageSlot;
    tenYear?: FairyImageSlot;
    gwiin?: FairyImageSlot;
    ending?: FairyImageSlot;
  };
}) {
  const coverFairy = fairies?.cover ?? emptySlot("cover-fairy"); // 낮, 산수+매화 병풍
  const benjilFairy = fairies?.benjil ?? emptySlot("benjil-fairy"); // 차분한 정면, 산수 병풍 — 타고난 본질
  const chapterFairy = fairies?.chapter ?? emptySlot("chapter-fairy"); // 붓으로 쓰는 장면, 족자+촛불 — 타고난 기질
  const wayOfLifeFairy = fairies?.wayOfLife ?? emptySlot("ch1-fairy-v2"); // 창가, 빛+산수 — 살아가는 방식
  const loveFairy = fairies?.love ?? emptySlot("love-fairy"); // 정면, 부드러운 톤 — 사랑과 인연
  const wealthFairy = fairies?.wealth ?? emptySlot("ch5-fairy"); // 장부+동전+촛불 — 재물운
  const lifeTransitionFairy = fairies?.lifeTransition ?? emptySlot("ch1-fairy"); // 차분한 정면 — 인생의 전환점
  const tenYearFairy = fairies?.tenYear ?? emptySlot("tenyear-fairy"); // 밤, 원형창+달+두루마리 — 앞으로의 10년
  const gwiinFairy = fairies?.gwiin ?? emptySlot("ch8-fairy-v2"); // 밤 정원, 보름달+등불+매화 — 귀인과 신살
  const endingFairy = fairies?.ending ?? emptySlot("ch8-fairy"); // 빛나는 두루마리를 펼침 — 마지막 페이지

  // 第五·七章 재물 시기 밴드 — 새 판정이 아니라 이미 존재하는
  // analyzeWealthTiming(appData)을 그대로 호출한 것뿐이다(사주 계산
  // 엔진 자체는 건드리지 않음). 용신이 확정되지 않는 사람은
  // applicable:false라 밴드 없이(빈 배열) 본문만 나간다 — 새 데이터를
  // 지어내지 않는다.
  const wealthTiming = analyzeWealthTiming(appData);
  const wealthTimeline: WealthTimelineSegment[] = wealthTiming.applicable
    ? wealthTiming.daYunPeriods.map((p) => ({
        startAge: p.period.startAge,
        endAge: p.period.endAge,
        ganZhi: p.period.ganZhi,
        state: p.period.state,
        label: p.classification.label,
      }))
    : [];

  // [2026-09 재구성 — §13 조사를 한 번 더 검증한 결과] chapterWealthInsight가
  // chapters[3]/chapterFive의 문단(openingPara/makingPara/growingCorePara/
  // body)을 그대로 재사용하는 건 맞다(wealthInsightNarrative.ts 924-961행) —
  // 하지만 그게 전부가 아니었다. buildWealthSenseSection/buildMoneyMakingSection/
  // buildSipseongInsightSections/buildMakeVsKeepSection/buildOrgStyleSection/
  // buildScaleSection(전부 같은 파일의 별도 함수)이 추가로 만들어내는
  // 새 문단이 훨씬 많다 — reportMapper.ts 주석의 "3차 확장에서 새로 만든
  // 문단"이 바로 이것이다. 즉 chapterWealthInsight는 chapters[3]+chapterFive+
  // chapterSix 3개를 합친 것보다 실제로 더 많은 문장을 담은 "확장판"이다
  // (실측: 3개를 각각 따로 실었을 때 21,675자, chapterWealthInsight
  // 하나로 실었을 때 24,762자 — 직접 생성해 비교 확인함). 그래서 3개를
  // 되살리는 이전 시도는 되돌리고, chapterWealthInsight를 다시 쓴다 —
  // 대신 chapters[3]/chapterFive와 겹치는 문장이 실제로 존재하므로(위 확인)
  // 3개를 "또" 따로 싣지는 않는다(진짜 중복 방지).
  //
  // 라벨 중복 버그(원래 감사에서 찾은 "第四章/第六章 두 번" 문제)는
  // chapterWealthInsight 하나만 쓰는 지금 구조에서도 여전히 남아 있다 —
  // chapterLove도 "第四章", chapterLifeTransition도 "第六章"이기 때문이다
  // (reportMapper.ts 원본 라벨은 그대로, 건드리지 않았다). 그래서 표시용
  // 라벨만 실제 조립 순서대로 다시 매긴다(第一章~第八章, 있는 장만 세어서).
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
      <PremiumCover report={report} tagline={TAGLINE} generatedAt={generatedAt} fairy={coverFairy} />
      <IntroPage report={report} intake={intake} tagline={TAGLINE} fairy={coverFairy} />
      <ProloguePage report={report} />
      <TableOfContents report={report} entries={tocEntries} />

      <MyeongsikPlaque report={report} />
      <OhangWheel report={report} />

      {/* 第一章 — 타고난 본질: 선녀(차분한 정면, 산수 병풍) */}
      <ChapterOpenSplit
        fairy={benjilFairy}
        label={seqLabel.one}
        title={report.chapterOne.title}
        lead={report.chapterOne.goldHook}
      />
      <ChapterOneHanjiBody report={report} />

      {/* 第二章 — 타고난 기질: 선녀가 운명록을 쓰는 장면 */}
      {report.chapters[1] && (
        <>
          <ChapterOpenStack fairy={chapterFairy} label={seqLabel.two} title={report.chapters[1].title} />
          <GenericChapterSection
            c={report.chapters[1]}
            deep={
              report.chapterTwoDeep && {
                sections: report.chapterTwoDeep.sections,
                bars: report.chapterTwoDeep.visual.bars,
                domains: report.chapterTwoDeep.visual.domains,
              }
            }
          />
        </>
      )}

      {/* 第三章 — 살아가는 방식: 선녀, 창가에서 빛을 바라보는 장면 */}
      {report.chapters[2] && (
        <>
          <ChapterOpenInset fairy={wayOfLifeFairy} label={seqLabel.three} title={report.chapters[2].title} />
          <GenericChapterSection
            c={report.chapters[2]}
            deep={
              report.chapterThreeDeep && {
                sections: report.chapterThreeDeep.sections,
                comfort: report.chapterThreeDeep.visual.comfort,
                tension: report.chapterThreeDeep.visual.tension,
              }
            }
          />
        </>
      )}

      {/* 사랑과 인연 — 선녀, 부드러운 정면 */}
      {report.chapterLove && (
        <>
          <ChapterOpenSplit fairy={loveFairy} label={seqLabel.love} title={report.chapterLove.title} />
          <LoveSection c={report.chapterLove} />
        </>
      )}

      {/* 第五章(재물운, 확장 통합본) — 선녀, 장부+동전+촛불. fallback:
          chapterWealthInsight가 없는 레거시 데이터에서만 chapterFive/
          chapterSix를 개별로 그린다(실사용에서 사실상 발생하지 않음). */}
      {report.chapterWealthInsight ? (
        <>
          <ChapterOpenStack fairy={wealthFairy} label={seqLabel.wealth} title={`${report.userName}님의 재물운`} />
          <ChapterFiveHanjiBody report={report} timeline={wealthTimeline} />
        </>
      ) : (
        <>
          {/* [희귀 폴백 경로] chapterWealthInsight가 없는 레거시 데이터
              전용 — 원본 chapterLabel을 그대로 쓴다(라벨 재매김은 위
              seqLabel이 이 경로를 아예 상정하지 않음, 실사용 발생 안 함). */}
          {report.chapterFive && (
            <>
              <ChapterOpenStack fairy={wealthFairy} label={report.chapterFive.chapterLabel} title={report.chapterFive.title} />
              <WealthSection c={report.chapterFive} />
            </>
          )}
          {report.chapterSix && (
            <>
              <ChapterOpenStack scene="duskTide" label={report.chapterSix.chapterLabel} title={report.chapterSix.title} />
              <WealthSection c={report.chapterSix} timeline={wealthTimeline} />
            </>
          )}
        </>
      )}

      {/* 인생의 전환점 — 선녀, 차분한 정면 */}
      {report.chapterLifeTransition && (
        <>
          <ChapterOpenInset fairy={lifeTransitionFairy} label={seqLabel.lifeTransition} title={report.chapterLifeTransition.title} />
          <LifeTransitionSection c={report.chapterLifeTransition} insight={report.chapterLifeTransitionInsight} />
        </>
      )}

      {/* 앞으로의 10년 — 긴 산맥/길/지평선 장면 */}
      {report.chapterTenYear && (
        <>
          <ChapterOpenSplit fairy={tenYearFairy} label={seqLabel.tenYear} title={report.chapterTenYear.title} />
          <TenYearSection c={report.chapterTenYear} />
        </>
      )}

      {/* 귀인과 신살 — 전통 매듭/별빛 장면 */}
      {report.gwiinSinsalSection && (
        <>
          <ChapterOpenStack fairy={gwiinFairy} label={seqLabel.gwiin} title={report.gwiinSinsalSection.title} />
          <ChapterEightHanjiBody c={report.gwiinSinsalSection} />
        </>
      )}

      {/* 마지막 페이지 — 인물(핵심 장), 표지와 짝을 이루는 종장(§14/§19) */}
      <EndingPage report={report} fairy={endingFairy} />
    </div>
  );
}
