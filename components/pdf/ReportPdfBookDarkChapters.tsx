import React from "react";
import { ReportResult } from "@/lib/reportMapper";
import { AppData } from "@/lib/sajuContent";
import { analyzeWealthTiming } from "@/lib/wealthTimingAnalysis";
import { BookFairySlots } from "@/lib/pdfBookAssets";
import { FairyImageSlot } from "./ReportPdfPrototype";
import { lifeTransitionLastBasisSentence } from "./ReportPdfBook";
import { DarkLifeTransitionFlow, darkHeading } from "./ReportPdfBookDark";
import { IntakeFormData } from "@/lib/sajuEngine";
// 2장(타고난 기질) — 2026-09-27 FINAL_CH2_LOCKED로 잠긴 scratch 생성기를 그대로 읽어서만 쓴다.
// scripts/_scratch_ch2ki_gen.ts 원본은 수정하지 않는다 — 이 파일은 결과(buildCh2Ki)를 배치만 한다.
import { buildCh2Ki } from "../../scripts/_scratch_ch2ki_gen";
// 1장(타고난 운명) — 2026-09-27 승인·잠금된 scratch 최종본을 그대로 읽어서만 쓴다.
// scripts/_scratch_ch1_v3.ts 원본은 수정하지 않는다 — 이 파일은 결과(buildCh1V3)를 배치만 한다.
import { buildCh1V3 } from "../../scripts/_scratch_ch1_v3";
// 4장(사랑과 인연) — 2026-09-27 승인된 scratch 최종본(12쪽)을 그대로 읽어서만 쓴다.
// scripts/_scratch_ch2_v3.ts 원본은 수정하지 않는다 — 이 파일은 결과(buildCh2)를 배치만 한다.
import { buildCh2 } from "../../scripts/_scratch_ch2_v3";

/**
 * 1~5장(+명식·오행, 6장 장 표지/인용구) 다크 조립 — 각 장의 문장·순서·데이터 참조는 ReportPdfBook.tsx의
 * buildChapter*와 동일하고, 표시(스타일·쪽 구성)만 공통 다크 디자인으로 바꾼다. 상품 PDF 경로에는 아직 연결하지 않는다.
 * 바뀌는 표시: b-card/b-quote(테두리 박스) → 굵은 리드 문장, 색 태그·카드 → 잠긴 목록/항목 스타일,
 * 재물 시기 가로 막대 → 색 막대 띠 + 시기 행 목록(같은 데이터).
 */
const EL_DARK: Record<string, string> = { wood: "#6FAE8B", fire: "#D0624A", earth: "#CDAA55", metal: "#AEB3BC", water: "#6E8FC9" };
const TIMING_DARK: Record<string, string> = {
  "강화형(A)": "#D6B173", "부담형(B)": "#D0624A", "기반형(C)": "#6FAE8B", "분산/흔들림형(D)": "#9A8BC4", "신호없음형(E)": "#8C8168",
};
// 5장 재물 시기 고객용 표시 문구 — analyzeWealthTiming()의 내부 판정값(강화형(A) 등, classifyPeriod()
// 계산 로직)은 전혀 바꾸지 않는다. TIMING_DARK(색상) 조회는 계속 이 원래 key로 하고, 화면에 보이는
// 글자만 이 매핑을 거친다.
const TIMING_DISPLAY_LABEL: Record<string, string> = {
  "강화형(A)": "재물 흐름이 힘을 받는 때",
  "부담형(B)": "재물 움직임이 커지는 때",
  "기반형(C)": "재물의 바탕을 다지는 때",
  "분산/흔들림형(D)": "재물 변화가 두드러지는 때",
  "신호없음형(E)": "재물 흐름을 지켜보는 때",
};
// 2026-10-02 승인된 라벨 바로 아래에 표시하는 한 줄 설명 — classifyPeriod() 계산 로직은
// 전혀 바꾸지 않는다, 순수 표시 문구만 추가.
const TIMING_DISPLAY_DESC: Record<string, string> = {
  "강화형(A)": "필요한 흐름과 재물의 움직임이 함께 나타나, 자연스럽게 힘이 실리는 시기입니다.",
  "부담형(B)": "돈과 관련된 움직임이 커지는 시기이지만, 그만큼 다루는 데 더 마음을 써야 하는 시기입니다.",
  "기반형(C)": "당장 눈에 띄는 재물 변화보다, 지금 이 사람에게 맞는 흐름이 조용히 이어지는 시기입니다.",
  "분산/흔들림형(D)": "지금까지와 다르게, 재물과 관련된 변화가 두드러지게 나타날 수 있는 시기입니다.",
  "신호없음형(E)": "큰 재물 흐름이 뚜렷하게 정해진 때는 아닙니다. 돈복이 없다는 뜻이 아니라, 어떻게 움직이고 선택하느냐에 따라 재물의 흐름이 달라질 수 있는 시기입니다.",
};

export const Head = ({ text }: { text: string }) => (
  <div className="blk head" data-keep="1"><div className="title">{text}</div><div className="rule" /></div>
);
export const Head2 = ({ text }: { text: string }) => (
  <div className="blk head2" data-keep="1"><div className="sub2">{text}</div></div>
);
export const Paras = ({ items }: { items: string[] }) => (
  <>{items.filter(Boolean).map((p, i) => <p className="blk" key={i}>{p}</p>)}</>
);
const Lead = ({ t }: { t: string }) => <p className="blk lead">{t}</p>;
export const Flow = ({ label, children, cont }: { label: string; children: React.ReactNode; cont?: boolean }) => (
  <div className="flow" data-label={label} data-cont={cont ? "1" : undefined}>{children}</div>
);
// 1장 hero.quote(예: "타고난 개척자, 그러나 …해야 한다")를 여는 문장으로 다듬는 서식 변환 —
// scripts/_scratch_ch1_v3_render.ts의 polite()/heroLead()를 그대로 옮긴 것. 단어를 바꾸지 않고
// 어미만 정중체로 맞춘다(그 파일은 scratch 원본이라 export하지 않으므로 여기서 옮겨 쓴다).
function ch1Polite(t: string): string { if (/[한하]다$/.test(t)) return t.replace(/[한하]다$/, "합니다"); if (/있다$/.test(t)) return t.replace(/있다$/, "있습니다"); return t.replace(/다$/, "습니다"); }
function ch1HeroLead(q: string): string { const parts = q.split(","); return `${parts[0].trim()}, ${ch1Polite(parts.slice(1).join(",").trim())}.`; }
// 4장 std 섹션의 하위 라벨 — scripts/_scratch_ch2_v3_render.ts의 SUB_LABEL을 그대로 옮긴 것(단어 변경 없음).
const CH2_SUB_LABEL: Record<string, string> = { 정관: "약속과 신뢰", 편관: "분명한 태도", 정재: "꾸준한 약속", 편재: "유연한 대응" };

/** 4장 "연애 인연 글자와 배우자 자리" 표 — scripts/_scratch_ch2_v3_render.ts(69~76줄)의 승인된 표 구성을
 * 다크 .flow 흐름에 맞게 그대로 옮긴 것(새 디자인·새 계산 없음, 기존 .pgrid/EL_DARK 재사용). v2.chart.notes
 * 본문이 "위 표에서 금색/붉은 테두리가…"라고 이 표가 있다는 전제로 쓰여 있어, 표 없이는 문장이 성립하지 않는다. */
const ChartPillarsTable = ({ chart, subtypes }: {
  chart: { pillars: { stage: string; stem: string; stemSip: string; stemEl: string; branch: string; branchSip: string; branchEl: string; stemStar: boolean; branchStar: boolean; palace: boolean }[]; hiddenStar: string; noHour: boolean };
  subtypes: [string, string];
}) => (
  <div className="blk">
    <div className="pgrid" style={{ gridTemplateColumns: `repeat(${chart.pillars.length},1fr)`, marginTop: 6 }}>
      {chart.pillars.map((p, i) => <div className="h" key={`h${i}`}>{p.stage}</div>)}
      {chart.pillars.map((p, i) => (
        <div className="c" key={`s${i}`}>
          <span className={`gl${p.stemStar ? " star" : ""}`} style={{ color: EL_DARK[p.stemEl] ?? "var(--ivory)", padding: "0 6px" }}>{p.stem}</span>
          <span className="sp">{p.stemSip}</span>
        </div>
      ))}
      {chart.pillars.map((p, i) => (
        <div className="c" key={`b${i}`}>
          <span className={`gl${p.palace ? " palace" : p.branchStar ? " star" : ""}`} style={{ color: EL_DARK[p.branchEl] ?? "var(--ivory)", padding: "0 6px" }}>{p.branch}</span>
          <span className="sp">{p.branchSip}</span>
        </div>
      ))}
    </div>
    <div className="legend">
      <span><i className="dot" style={{ background: "transparent", outline: "3px solid var(--gold)" }} />연애 인연 글자 ({subtypes[0]}·{subtypes[1]})</span>
      <span><i className="dot" style={{ background: "transparent", outline: "3px solid var(--rose)" }} />배우자 자리 (일지)</span>
      {chart.hiddenStar && <span>{chart.hiddenStar}</span>}
      {chart.noHour && <span>태어난 시간을 몰라 세 기둥으로 풀이했습니다</span>}
    </div>
  </div>
);
const BASIS_TITLES = new Set(["정리 근거", "이 풀이의 명리 근거", "명리 근거"]);
const Sections = ({ items, level }: { items: { heading: string; body: string[] }[]; level: 1 | 2 }) => (
  <>{items.map((s, i) => {
    if (level === 1 && BASIS_TITLES.has(s.heading)) {
      return (
        <React.Fragment key={i}>
          <div className="blk head" data-keep="1"><div className="mini">{darkHeading(s.heading)}</div><div className="hair" /></div>
          {s.body.filter(Boolean).map((p, j) => <p className="blk basisline" key={j}>{p}</p>)}
        </React.Fragment>
      );
    }
    return (
      <React.Fragment key={i}>
        {s.heading ? (level === 1 ? <Head text={darkHeading(s.heading)} /> : <Head2 text={s.heading} />) : null}
        <Paras items={s.body} />
      </React.Fragment>
    );
  })}</>
);

/** 장 표지: 이미지(위) → 먹빛으로 이어지는 그라데이션 → 라벨·제목·밑줄·리드 */
export function DarkHero({ fairy, label, title, lead }: { fairy: FairyImageSlot; label: string; title: string; lead?: string }) {
  return (
    <section className={`page pg-hero${lead ? "" : " tall"}`}>
      <div className="himg">{fairy.dataUri && <img src={fairy.dataUri} alt="" style={{ objectPosition: "50% 20%" }} />}</div>
      <div className="hbody">
        <span className="lab">{label}</span>
        <div className="title first" style={{ marginTop: 10 }}>{title}</div>
        <div className="rule" />
        {lead && <p className="lead">{lead}</p>}
      </div>
    </section>
  );
}
function DarkQuoteImage({ fairy, label, quote, objectPosition = "50% 30%", zoom = 1 }: { fairy: FairyImageSlot; label: string; quote: string; objectPosition?: string; zoom?: number }) {
  return (
    <section className="page pg-quote">
      <div className="qimg">{fairy.dataUri && <img src={fairy.dataUri} alt="" style={{ objectPosition, transform: zoom !== 1 ? `scale(${zoom})` : undefined }} />}</div>
      <div className="qbody">
        <span className="qmark">“</span>
        <span className="lab">{label}</span>
        <p className="qtext">{quote}</p>
      </div>
    </section>
  );
}
function DarkQuotePlain({ label, quote }: { label: string; quote: string }) {
  return (
    <section className="page pg-qplain">
      <span className="qmark">“</span>
      <span className="lab">{label}</span>
      <p className="qtext">{quote}</p>
      <div className="rule" style={{ marginTop: 22 }} />
    </section>
  );
}
/** 1장 전용 — 사진 없이 "OOO님을 나타내는 글자는 / 큰 글자 / 정(丁)입니다" 큰 글자 페이지.
 * 승인된 무사진 디자인(scripts/_scratch_ch1_v3_render.ts의 "1 오프너")을 그대로 옮긴 것 — 이미 있는
 * CSS 클래스(.q/.glyph/.hero/.rule/.lead/.basis, lib/pdfBookDark.ts)만 재사용하고 새 문장·새 계산
 * 없음. hero는 DarkHero와 동일하게 buildCh1V3()가 이미 만들어 둔 v1.hero를 그대로 받는다. */
function DarkGlyphOpener({ name, label, hero }: { name: string; label: string; hero: { ganHangul: string; ganHanja: string; quote: string; typeName: string; dayLabel: string } }) {
  return (
    <section className="page">
      <span className="lab">{label}</span>
      <div className="q">{name}님을 나타내는 글자는</div>
      <div className="glyph">{hero.ganHanja}</div>
      <div className="hero">{hero.ganHangul}({hero.ganHanja})입니다</div>
      <div className="rule" />
      <div className="lead">{ch1HeroLead(hero.quote)}</div>
      <div className="basis"><span className="lab">명리 근거</span><p>{hero.typeName} · {hero.dayLabel}</p></div>
    </section>
  );
}

function DarkMyeongsik({ report, label }: { report: ReportResult; label: string }) {
  const { stems, branches } = report.pillars;
  const glyph = (key?: string) => (key && EL_DARK[key]) || "var(--ivory)";
  const cell = (c: (typeof stems)[number], k: string) => (
    <div className={`c${c.isDay ? " me" : ""}`} key={k}>
      <span className="gl" style={{ color: glyph(c.elementKey) }}>{c.hanja}</span>
      <span className="sp">{c.hangul} · {c.element}</span>
      {c.sipseong && <span className="sp2">{c.sipseong}</span>}
    </div>
  );
  return (
    <section className="page">
      <span className="lab">{label}</span>
      <div className="title first" style={{ fontSize: 32, marginTop: 14 }}>{report.userName}님의 사주 원국</div>
      <div className="rule" />
      <p style={{ fontSize: 16, color: "var(--mute)", marginBottom: 14 }}>— 時 · 日 · 月 · 年 —</p>
      <div className="pgrid" style={{ gridTemplateColumns: `repeat(${stems.length},1fr)` }}>
        {stems.map((c, i) => <div className="h" key={`h${i}`} style={c.isDay ? { color: "var(--gold)" } : undefined}>{c.label}</div>)}
        {stems.map((c, i) => cell(c, `s${i}`))}
        {branches.map((c, i) => cell(c, `b${i}`))}
      </div>
      <p style={{ marginTop: 14 }}>{report.summaryTitle} — {report.dayMasterLabel}.</p>
    </section>
  );
}

function DarkOhang({ report, label }: { report: ReportResult; label: string }) {
  const strongestLabel = report.elementBalance.find((e) => e.key === report.elementStrongest)?.label;
  const weakestLabel = report.elementBalance.find((e) => e.key === report.elementWeakest)?.label;
  const r = 84, circ = 2 * Math.PI * r;
  let cum = 0;
  const arcs = report.elementBalance.map((el) => {
    const dash = (el.value / 100) * circ; const offset = -cum * circ; cum += el.value / 100;
    return { ...el, dash, offset };
  });
  return (
    <section className="page">
      <span className="lab">{label}</span>
      <div className="title first" style={{ fontSize: 32, marginTop: 14 }}>{report.userName}님의 오행 균형</div>
      <div className="rule" />
      <p style={{ fontSize: 16, color: "var(--mute)", marginBottom: 6 }}>사주 여덟 글자 안에 담긴 다섯 기운의 비율입니다 — 계산값은 그대로, 표현만 또렷하게.</p>
      <div style={{ display: "flex", justifyContent: "center", margin: "4px 0 8px" }}>
        <svg viewBox="0 0 216 216" width="190" height="190" xmlns="http://www.w3.org/2000/svg">
          <circle cx="108" cy="108" r="84" fill="none" stroke="rgba(240,231,212,0.10)" strokeWidth="26" />
          {arcs.map((a) => (
            <circle key={a.key} cx="108" cy="108" r={r} fill="none" stroke={EL_DARK[a.key] ?? "#8C8168"} strokeWidth="26"
              strokeDasharray={`${a.dash} ${circ - a.dash}`} strokeDashoffset={a.offset} transform="rotate(-90 108 108)" />
          ))}
          <text x="108" y="103" textAnchor="middle" fill="#F0E7D4" fontSize="21" fontWeight="700">五行</text>
          <text x="108" y="126" textAnchor="middle" fill="#B8925A" fontSize="10.5" fontWeight="700" letterSpacing="1.5">균형</text>
        </svg>
      </div>
      {report.elementBalance.map((el) => (
        <div className={`el${el.key === report.elementStrongest ? " top" : ""}`} key={el.key}>
          <span className="gl"><i className="chip" style={{ background: EL_DARK[el.key] ?? "#8C8168" }} /></span>
          <span className="nm" style={{ flex: "0 0 74px" }}>{el.label}</span>
          <div className="tr"><div className="fl" style={{ width: `${el.value}%`, background: EL_DARK[el.key] ?? "#8C8168" }} /></div>
          <span className="pc">{el.value}%</span>
        </div>
      ))}
      <p style={{ marginTop: 14, marginBottom: 0 }}>가장 강한 기운은 <span className="g">{strongestLabel}</span>, 가장 약한 기운은 <span className="g">{weakestLabel}</span>입니다.</p>
    </section>
  );
}

export interface DarkBookProps { report: ReportResult; appData: AppData; intake: IntakeFormData; fairies: BookFairySlots }

/** 1~6장 검수용 조립(명식·오행 → 1장 … 6장). */
export function DarkBookChapters1to6({ report, appData, intake, fairies }: DarkBookProps) {
  const name = report.userName;
  const short = (t: string) => (t.startsWith(`${name}님의 `) ? t.slice(`${name}님의 `.length) : t);
  const order: { key: string; present: boolean }[] = [
    { key: "one", present: true }, { key: "two", present: !!report.chapters[1] }, { key: "three", present: !!report.chapters[2] },
    { key: "love", present: !!report.chapterLove }, { key: "wealth", present: !!report.chapterWealthInsight }, { key: "lt", present: !!report.chapterLifeTransition },
  ];
  const num: Record<string, number> = {};
  let n = 0;
  order.forEach((o) => { if (o.present) num[o.key] = ++n; });
  const chLabel = (key: string) => `제${num[key]}장`;
  const L = (key: string, title: string) => `${chLabel(key)} · ${short(title)}`;
  const parts: React.ReactNode[] = [];

  parts.push(<DarkMyeongsik key="ms" report={report} label="命 式" />, <DarkOhang key="oh" report={report} label="五 行" />);

  // ── 1장(타고난 운명) — 2026-09-27: 옛 chapterOne/chapterOneDeep 참조를 없애고, 승인·잠금된
  // scripts/_scratch_ch1_v3.ts(buildCh1V3)의 6개 블록(hero/gan/outer/inner/habits/strength)만
  // 소제목·명리 근거와 함께 그대로 배치한다. 문장은 한 글자도 새로 쓰지 않는다. hero.quote를 여는
  // 문장으로 다듬는 두 함수(ch1Polite/ch1HeroLead)는 승인된 렌더러(_scratch_ch1_v3_render.ts)의
  // 서식 변환을 그대로 옮긴 것뿐 — 단어를 바꾸지 않는다. chart(명식·오행)는 이 책 앞쪽의 공통
  // 페이지(DarkMyeongsik/DarkOhang)와 내용이 같아 중복을 피해 옮기지 않는다. 옛 심화통찰
  // (chapterOneDeepNarrative)·천을귀인 서술·다음 장 예고문은 가져오지 않는다.
  {
    const v1 = buildCh1V3(name, intake, intake.gender);
    const title = `${name}님의 타고난 운명`;
    const lab = L("one", title);
    parts.push(
      <DarkHero key="h1" fairy={fairies.benjil} label={lab} title={title} lead={ch1HeroLead(v1.hero.quote)} />,
      <DarkGlyphOpener key="h1b" name={name} label={lab} hero={v1.hero} />,
      <Flow key="f1" label={lab}>
        <Head text="일간" />
        <Paras items={v1.gan.lines.map((l) => l.text)} />
        <div className="blk head" data-keep="1"><div className="mini">명리 근거</div><div className="hair" /></div>
        <div className="blk grp"><p className="basisline">{v1.gan.basis}</p></div>

        <Head text="겉으로 보이는 나" />
        <Lead t={v1.outer.lead.text} />
        <Paras items={v1.outer.lines.map((l) => l.text)} />
        <div className="blk head" data-keep="1"><div className="mini">명리 근거</div><div className="hair" /></div>
        <div className="blk grp"><p className="basisline">{v1.outer.basis}</p></div>

        <Head text="겉으로 잘 안 보이는 나" />
        <Lead t={v1.inner.lead.text} />
        <Paras items={v1.inner.lines.map((l) => l.text)} />
        <div className="blk head" data-keep="1"><div className="mini">명리 근거</div><div className="hair" /></div>
        <div className="blk grp"><p className="basisline">{v1.inner.basis}</p></div>

        {v1.habits.lines.length > 0 && (
          <>
            <Head text="이럴 때, 이렇게 움직입니다" />
            {v1.habits.lines.map((h, i) => (
              <React.Fragment key={i}>
                <Head2 text={h.label} />
                <Paras items={[h.t.text]} />
              </React.Fragment>
            ))}
            <div className="blk head" data-keep="1"><div className="mini">명리 근거</div><div className="hair" /></div>
            <div className="blk grp"><p className="basisline">{v1.habits.basis}</p></div>
          </>
        )}

        <Head text="나의 강점과 조심할 점" />
        <div className="blk grp2">{v1.strength.lines.map((l, i) => <span className="pill" key={`s${i}`}>{l.text}</span>)}</div>
        <div className="blk grp2">{v1.strength.care.map((l, i) => <span className="pill warn" key={`c${i}`}>{l.text}</span>)}</div>
        <div className="blk head" data-keep="1"><div className="mini">명리 근거</div><div className="hair" /></div>
        <div className="blk grp"><p className="basisline">{v1.strength.basis}</p></div>
      </Flow>
    );
  }
  // ── 2장(타고난 기질) — 2026-09-27 FINAL_CH2_LOCKED 최종본(buildCh2Ki)에 연결.
  // 옛 richBody/chapterTwoDeep(승인 안 된 옛 소스)은 더 이상 쓰지 않는다. 문장은 한 글자도
  // 새로 쓰지 않고 buildCh2Ki(appData)의 sections를 heading/본문/명리 근거 그대로 배치만 한다.
  {
    const c = report.chapters[1];
    if (c) {
      const lab = L("two", c.title);
      const ch2ki = buildCh2Ki(appData);
      parts.push(<DarkHero key="h2" fairy={fairies.chapter} label={lab} title={c.title} />);
      parts.push(
        <Flow key="f2" label={lab}>
          {ch2ki.sections.map((s, si) => (
            <React.Fragment key={si}>
              <Head text={s.heading} />
              <Paras items={s.paras.map((p) => p.map((t) => t.text).join(" "))} />
              <div className="blk head" data-keep="1"><div className="mini">명리 근거</div><div className="hair" /></div>
              <div className="blk grp"><p className="basisline">{s.basis}</p></div>
            </React.Fragment>
          ))}
        </Flow>
      );
    }
  }
  // ── 3장(살아가는 방식) — 2026-09-27: 옛 무료 엔진(report.chapters[2]) 본문 참조를 없애고,
  // 승인된 chapterThreeDeepNarrative.ts(B1~B8+마무리)만 3장의 유일한 본문으로 쓴다. 문장은 한 글자도
  // 새로 쓰지 않는다 — 제목은 기존 그대로 유지하고, 인용 카드는 승인 본문 첫 문장을 그대로 인용한다
  // (4장과 같은 방식). report.chapters[2]는 장이 뜨는 조건(존재 여부)만 그대로 확인하고 내용은 읽지 않는다.
  // 옛 highlight(오행별 조언 한 줄)는 승인본에 대응 문장이 없어 대체 없이 제거한다.
  {
    const c = report.chapters[2];
    const deep = report.chapterThreeDeep;
    if (c && deep) {
      const title = `${name}님의 살아가는 방식`;
      const lab = L("three", title);
      const quote = deep.sections[0]?.body?.[0] ?? title;
      parts.push(
        <DarkHero key="h3" fairy={fairies.wayOfLife} label={lab} title={title} />,
        <DarkQuotePlain key="q3" label={`${chLabel("three")} · 핵심 통찰`} quote={quote} />,
        <Flow key="d3" label={lab}>
          <div className="blk kick" data-keep="1">{chLabel("three")} · 심화 통찰</div>
          {deep.visual.comfort.length > 0 && (
            <div className="blk grp2"><div className="ghead"><span className="gt">나에게 편한 관계</span></div>
              {deep.visual.comfort.map((p, i) => <span className="pill" key={i}>{p.aLabel}·{p.bLabel} — {p.aHint} / {p.bHint}</span>)}</div>
          )}
          {deep.visual.tension.length > 0 && (
            <div className="blk grp2"><div className="ghead warn"><span className="gt">긴장이 생기기 쉬운 관계</span></div>
              {deep.visual.tension.map((p, i) => <span className="pill warn" key={i}>{p.aLabel}·{p.bLabel} — {p.aHint} / {p.bHint}</span>)}</div>
          )}
          <Sections items={deep.sections} level={2} />
        </Flow>
      );
    }
  }
  // ── 4장(사랑과 인연) — 2026-09-27: 옛 chapterLove(buildChapterLove, 긴 Production 버전) 참조를 없애고,
  // 승인·잠금된 scripts/_scratch_ch2_v3.ts(buildCh2, 12쪽)의 8개 본문 블록(open/std/deepen/hurt/partner/
  // stab/timing/fwd)+chart를 소제목·명리 근거와 함께 그대로 배치한다. 소제목은 승인된 렌더러
  // (_scratch_ch2_v3_render.ts)에 고정된 질문 문구를 그대로 옮겼다. 문장은 한 글자도 새로 쓰지 않는다.
  // chart의 인연 글자·배우자 자리를 금색/장미색 테두리로 강조하는 표 디자인은 현재 다크 디자인 시스템에
  // 없는 CSS라 이번에는 새로 만들지 않고, chart의 문장(notes)과 명리 근거만 그대로 담는다 — 문장은 하나도
  // 빠뜨리지 않는다. report.chapterLove는 이 장이 뜨는 조건(존재 여부)만 그대로 확인하고 내용은 읽지 않는다.
  {
    const c = report.chapterLove;
    if (c) {
      const v2 = buildCh2(name, intake, intake.gender);
      const title = `${name}님의 사랑과 인연`;
      const lab = L("love", title);
      const basisBlock = (basis: string) => (
        <>
          <div className="blk head" data-keep="1"><div className="mini">명리 근거</div><div className="hair" /></div>
          <div className="blk grp"><p className="basisline">{basis}</p></div>
        </>
      );
      parts.push(
        <DarkHero key="h4" fairy={fairies.love} label={lab} title={title} />,
        <Flow key="f4" label={lab}>
          <Head text={`${v2.open.title[0]} ${v2.open.title[1]}`} />
          <Paras items={v2.open.lines.map((l) => l.text)} />
          {v2.open.need && (
            <div className="blk grp2"><div className="ghead"><span className="gt">이런 사람 곁에서 편해집니다</span></div><span className="pill">{v2.open.need.text}</span></div>
          )}
          {basisBlock(v2.open.basis)}

          {v2.std && (
            <>
              <Head text="어떤 사람에게 마음이 갈까?" />
              <Lead t={v2.std.lead.text} />
              {v2.std.lines.map((l, i) => {
                const sub = l.rule.startsWith("std:sub:") ? l.rule.split(":")[2] : "";
                return (
                  <React.Fragment key={i}>
                    {sub && <Head2 text={CH2_SUB_LABEL[sub] ?? sub} />}
                    <Paras items={[l.text]} />
                  </React.Fragment>
                );
              })}
              {basisBlock(v2.std.basis)}
            </>
          )}

          {v2.deepen && (
            <>
              <Head text="관계가 깊어지면" />
              <Lead t={v2.deepen.lead.text} />
              <Paras items={v2.deepen.lines.map((l) => l.text)} />
              <div className="blk grp2"><div className="ghead"><span className="gt">이런 사람과 잘 맞습니다</span></div><span className="pill">{v2.deepen.need.text}</span></div>
              {basisBlock(v2.deepen.basis)}
            </>
          )}

          {v2.hurt && (
            <>
              <Head text="서운함이 남는 순간" />
              <Lead t={v2.hurt.lead.text} />
              <Paras items={v2.hurt.lines.map((l) => l.text)} />
              <div className="blk grp2"><div className="ghead"><span className="gt">이런 사람과 오래갑니다</span></div><span className="pill">{v2.hurt.need.text}</span></div>
              {basisBlock(v2.hurt.basis)}
            </>
          )}

          <Head text="끌리는 사람, 편안한 사람" />
          <Lead t={v2.partner.lead.text} />
          <Paras items={[v2.partner.body.text, ...(v2.partner.hedge ? [v2.partner.hedge.text] : [])]} />
          {basisBlock(v2.partner.basis)}

          <Head text="힘들어지는 관계" />
          <Lead t={v2.stab.avoid.text} />
          {v2.stab.rel && (<><Head2 text="가까워지는 과정" /><Paras items={[v2.stab.rel.text]} /></>)}
          {v2.stab.shin && (<><Head2 text="관계 속의 나" /><Paras items={[v2.stab.shin.text]} /></>)}
          {basisBlock(v2.stab.basis)}

          {v2.timing && (
            <>
              <Head text="인연의 흐름은 언제 움직일까?" />
              <Paras items={v2.timing.lines.map((l) => l.text)} />
              {basisBlock(v2.timing.basis)}
            </>
          )}

          {v2.fwd.lead && (
            <>
              <Head text="사랑에서 지켜야 할 것" />
              <Lead t={v2.fwd.lead.text} />
              {basisBlock(v2.fwd.basis)}
            </>
          )}

          <Head text="연애 인연 글자와 배우자 자리" />
          <ChartPillarsTable chart={v2.chart} subtypes={v2.facts.subtypes} />
          <Paras items={v2.chart.notes.map((n) => n.text)} />
          {basisBlock(v2.chart.basis)}
        </Flow>
      );
    }
  }
  // ── 5장(재물운) — 2026-09-27: 승인된 ①~⑩ 본문(w.sections, lib/wealthChapter/*)은 한 글자도 건드리지
  // 않는다. 이 장에만 별도로 섞여 있던 옛 3줄(w.hook/w.killpoint/w.highlight — 재구성 전 第四章 "금전운의
  // 흐름"의 잔재, wealthInsightNarrative.ts 주석 참고)만 제거한다. 대운 시기 막대/범례 시각화는 hook 등과
  // 무관한 별도 계산(analyzeWealthTiming)이라 그대로 둔다.
  {
    const w = report.chapterWealthInsight;
    if (w) {
      const title = `${name}님의 재물운`, lab = L("wealth", title);
      const t = analyzeWealthTiming(appData);
      const timeline = t.applicable
        ? t.daYunPeriods.map((p) => ({ startAge: p.period.startAge, endAge: p.period.endAge, ganZhi: p.period.ganZhi, state: p.period.state, label: p.classification.label }))
        : [];
      const used = Array.from(new Set(timeline.map((p) => p.label)));
      parts.push(<DarkHero key="h5" fairy={fairies.wealth} label={lab} title={title} />);
      if (timeline.length > 0) {
        parts.push(
          <Flow key="t5" label={lab}>
            <Head text="대운으로 보는 재물의 흐름" />
            <div className="blk wstrip">{timeline.map((p, i) => <i key={i} className={p.state === "current" ? "cur" : ""} style={{ background: TIMING_DARK[p.label] ?? "#8C8168" }} />)}</div>
            {timeline.map((p, i) => (
              <div className={`blk ph${p.state === "current" ? " now" : ""}`} key={`p${i}`}>
                <div className="a">{p.startAge}~{p.endAge}세<small>{p.ganZhi}</small></div>
                <div className="t"><i className="dot" style={{ background: TIMING_DARK[p.label] ?? "#8C8168" }} />{TIMING_DISPLAY_LABEL[p.label] ?? p.label}</div>
              </div>
            ))}
            <div className="blk desclist">
              {used.map((l) => (
                <div className="dsc" key={l}>
                  <div className="tlabel"><i className="dot" style={{ background: TIMING_DARK[l] ?? "#8C8168" }} />{TIMING_DISPLAY_LABEL[l] ?? l}</div>
                  <div className="desc">{TIMING_DISPLAY_DESC[l] ?? ""}</div>
                </div>
              ))}
              <div className="note">· 금색 표시 = 현재 대운</div>
            </div>
          </Flow>
        );
      }
      parts.push(<Flow key="f5" label={lab} cont><Sections items={w.sections} level={1} /></Flow>);
    }
  }
  // ── 6장 (장 표지·인용구는 상품 PDF와 같은 문장 규칙)
  {
    const c = report.chapterLifeTransition;
    if (c) {
      const lab = L("lt", c.title);
      const ins = report.chapterLifeTransitionInsight?.sections ?? [];
      const keep = ins.find((x) => x.heading === "가져갈 것과 내려놓을 것")?.body.find(Boolean);
      const first = (t: string) => (t.includes(". ") ? t.split(". ")[0] + "." : t);
      const quote = [keep ? first(keep) : "", lifeTransitionLastBasisSentence(ins)].filter(Boolean).join(" ");
      parts.push(<DarkHero key="h6" fairy={fairies.lifeTransition} label={lab} title={c.title} />);
      if (quote) parts.push(<DarkQuotePlain key="q6" label={`${chLabel("lt")} · 핵심 통찰`} quote={quote} />);
      parts.push(<DarkLifeTransitionFlow key="f6" report={report} chapterLabel={lab} />);
    }
  }
  return <>{parts}</>;
}
