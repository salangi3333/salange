import { PillarCell, SajuUser } from "@/types";
import { StoryScene } from "@/types/story";
import { Element, ELEMENT_LABEL } from "./hanjaTables";
import { AppData } from "./sajuContent";
import { buildFullStoryScenes } from "./storyScenes";
import { YearFortuneItem, buildElementAnalysis, buildTenYearFortune } from "./aiLifeReport";

/**
 * ResultLandingV2 전용 데이터 매핑 레이어.
 *
 * 이 파일은 새로운 명리 계산을 하지 않는다 — calculateSaju/buildAppData/
 * buildFullStoryScenes/buildTenYearFortune/buildElementAnalysis가 이미
 * 만들어낸 결과를 ResultLandingV2가 바로 쓸 수 있는 모양으로 골라 담을
 * 뿐이다. 신강/신약, 합·충·형·파처럼 아직 계산되지 않는 값은 이 파일에서도
 * 다루지 않는다(추측 금지).
 *
 * 오늘 범위: 이 매핑 함수와 ResultLandingV2의 props 연결까지만. 실제
 * app/result-v2/page.tsx를 실사용자 입력(gate/form)에 연결하는 건 다음
 * 단계다 — 지금은 이 파일이 만들어내는 ReportResult 타입이 맞는지만
 * 확인하면 된다.
 */

export interface ReportChapter {
  id: string;
  /** 예: "第一章" — StoryScene(cover scene)의 chapterLabel 그대로 */
  chapterLabel: string;
  /** StoryScene(cover scene)의 chapterTitle 그대로 */
  title: string;
  /** insight scene의 headline 첫 줄 — 원본 문구를 새로 짓지 않고 그대로 자른 것 */
  killpoint: string;
  /** insight scene의 fact/realLife를 문단으로 사용 (있는 것만) */
  body: string[];
  /** insight scene의 action(없으면 nextQuestion) — 짧은 한 문장 */
  highlight: string;
  /** reveal scene의 evidence를 그대로 옮긴 것. 화면에 아직 노출하지 않아도 구조는 준비해 둔다 */
  evidence?: { terms: string[]; summary: string };
}

/**
 * 01 "타고난 본질" 챕터 전용 — 최종 샘플 품질 구조(골드 훅 → 상세 해석 →
 * 레드 핵심 통찰 1개 → 상세 해석 → 아이보리 카드). 02~04는 아직 이 구조로
 * 옮기지 않았으므로 기존 ReportChapter/buildChapters()를 그대로 쓴다 —
 * 이 타입은 오직 01 챕터 렌더링에만 쓰인다.
 */
export interface ChapterOneDetail {
  chapterLabel: string;
  title: string;
  /** ch1-insight.headline 그대로(이름 개인화, 2줄) — GOLD 훅 */
  goldHook: string;
  /** RED 문장 이전 본문 — ch1-reveal.headline(gan.coreTrait)과
   * ch1-reveal.narrative[0]로 구성. 새 문장을 짓지 않고 실제 값만 담는다. */
  bodyBefore: string[];
  /** ch1-insight.fact 그대로 — 챕터 전체에서 유일한 RED 문장 */
  redInsight: string;
  /** RED 문장 이후 본문 — ch1-insight.realLife 그대로 */
  bodyAfter: string[];
  /** ch1-insight.action 그대로 — 아이보리 카드 문장 */
  cardText: string;
}

export interface ReportTenYearItem {
  period: string;
  /** 해당 구간에서 점수가 가장 높은 해의 세운 키워드 — buildTenYearFortune() 결과 그대로 */
  title: string;
  summary?: string;
  locked: boolean;
}

/** 표에 그대로 렌더할 수 있게 이미 문자열로 정리해 둔 한 칸(글자). 시간 미상 등
 * 원본 셀이 null인 경우 "?"/"미상" 자리표시로 대체한다(값을 지어내지 않음). */
export interface ReportPillarCell {
  label?: string; // 시주/일주/월주/년주 — 천간 칸에만 존재
  hanja: string;
  hangul: string;
  element: string; // 이미 "水(수)" 형태로 변환된 표시용 문자열
  sipseong?: string;
  isDay?: boolean;
}

export interface ReportPillars {
  stems: ReportPillarCell[]; // [시주, 일주, 월주, 년주] 순서
  branches: ReportPillarCell[]; // 위와 같은 순서의 지지
}

export interface ReportResult {
  /** user.typeLabel 그대로 (예: "OO 속 OO형") */
  summaryTitle: string;
  /** user.dayPillar 그대로 (예: "무술(戊戌) 일주") */
  dayMasterLabel: string;
  /** user.pillars/branches 그대로 — 표시용 문자열로만 변환 */
  pillars: ReportPillars;
  /** user.sinsal 그대로 — 계산된 12신살(+천을귀인) 배열 */
  sinsal: string[];
  /** buildElementAnalysis(chars)의 오행 개수를 백분율로 환산 */
  elementBalance: { key: Element; label: string; value: number }[];
  /** buildElementAnalysis(chars)의 strongest/weakest 그대로 — 가장 강한/약한 오행 */
  elementStrongest: Element;
  elementWeakest: Element;
  /** ch1~ch4의 cover/reveal/insight scene을 조합해 만든 4개 챕터 */
  chapters: ReportChapter[];
  /** 01 챕터만 최종 샘플 구조로 확장한 것 — ResultLandingV2는 01 렌더링에
   * chapters[0] 대신 이 필드를 쓴다. 02~04는 여전히 chapters[1..3]을 쓴다. */
  chapterOne: ChapterOneDetail;
  /** buildTenYearFortune()의 10개 연도를 3구간으로 묶은 것 */
  tenYearPreview: ReportTenYearItem[];
}

function firstLine(text: string): string {
  return text.split("\n")[0]?.trim() ?? text;
}

function buildElementBalance(
  counts: Record<Element, number>
): ReportResult["elementBalance"] {
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0) || 1;
  return (Object.keys(counts) as Element[]).map((key) => ({
    key,
    label: ELEMENT_LABEL[key],
    value: Math.round((counts[key] / total) * 100),
  }));
}

function groupTenYear(items: YearFortuneItem[]): ReportTenYearItem[] {
  // 10개 연도를 3/3/4로 묶는다 — "첫 구간 / 다음 구간 / 마지막 구간"이라는
  // 자리채움 예시와 같은 형태를 유지하되, 값은 실제 계산 결과다.
  const groups = [items.slice(0, 3), items.slice(3, 6), items.slice(6, 10)].filter(
    (g) => g.length > 0
  );

  return groups.map((g) => {
    const strongest = g.reduce((a, b) => (b.score > a.score ? b : a));
    return {
      period: g.length > 1 ? `${g[0].year} – ${g[g.length - 1].year}` : `${g[0].year}`,
      title: strongest.keyword,
      summary: strongest.overview,
      locked: true,
    };
  });
}

const STEM_KEYS: { key: "hour" | "day" | "month" | "year"; label: string }[] = [
  { key: "hour", label: "시주" },
  { key: "day", label: "일주" },
  { key: "month", label: "월주" },
  { key: "year", label: "년주" },
];

function cellToDisplay(cell: PillarCell | null): Omit<ReportPillarCell, "label" | "isDay"> {
  if (!cell) return { hanja: "?", hangul: "미상", element: "", sipseong: "" };
  return { hanja: cell.hanja, hangul: cell.hangul, element: ELEMENT_LABEL[cell.element], sipseong: cell.sipseong };
}

function buildPillars(user: SajuUser): ReportPillars {
  const stems = STEM_KEYS.map(({ key, label }) => ({
    label,
    isDay: key === "day",
    ...cellToDisplay(user.pillars[key]),
  }));
  const branches = STEM_KEYS.map(({ key }) => cellToDisplay(user.pillars.branches[key]));
  return { stems, branches };
}

const CHAPTER_SCENE_IDS = [
  { cover: "ch1-cover", reveal: "ch1-reveal", insight: "ch1-insight" },
  { cover: "ch2-cover", reveal: "ch2-reveal", insight: "ch2-insight" },
  { cover: "ch3-cover", reveal: "ch3-reveal", insight: "ch3-insight" },
  { cover: "ch4-cover", reveal: "ch4-reveal", insight: "ch4-insight" },
];

function buildChapters(scenes: StoryScene[]): ReportChapter[] {
  return CHAPTER_SCENE_IDS.map(({ cover, reveal, insight }, idx) => {
    const coverScene = scenes.find((s) => s.id === cover);
    const revealScene = scenes.find((s) => s.id === reveal);
    const insightScene = scenes.find((s) => s.id === insight);

    const killpoint = insightScene ? firstLine(insightScene.headline) : "";
    const highlight = insightScene?.action || insightScene?.nextQuestion || "";
    const body = [insightScene?.fact, insightScene?.realLife].filter(
      (v): v is string => Boolean(v)
    );

    const evidence =
      revealScene?.evidence && revealScene.evidence.length > 0
        ? { terms: revealScene.evidence.map((e) => e.detail), summary: revealScene.headline }
        : undefined;

    return {
      id: `chapter-0${idx + 1}`,
      chapterLabel: coverScene?.chapterLabel ?? `第${idx + 1}章`,
      title: coverScene?.chapterTitle ?? "",
      killpoint,
      body,
      highlight,
      evidence,
    };
  });
}

function buildChapterOneDetail(scenes: StoryScene[]): ChapterOneDetail {
  const cover = scenes.find((s) => s.id === "ch1-cover");
  const reveal = scenes.find((s) => s.id === "ch1-reveal");
  const insight = scenes.find((s) => s.id === "ch1-insight");

  // gan.coreTrait — 일간별 고정 문구가 아니라 reveal scene의 headline에
  // 이미 담겨 있는 실제 계산 결과를 최소한의 연결 문장으로만 감쌌다.
  const coreTrait = reveal?.headline;
  const firstImpression = reveal?.narrative[0];

  return {
    chapterLabel: cover?.chapterLabel ?? "第一章",
    title: cover?.chapterTitle ?? "",
    goldHook: insight?.headline ?? "",
    bodyBefore: [
      coreTrait ? `타고난 기질은 "${coreTrait}"에 가깝습니다.` : "",
      firstImpression ?? "",
    ].filter((v): v is string => Boolean(v)),
    redInsight: insight?.fact ?? "",
    bodyAfter: [insight?.realLife].filter((v): v is string => Boolean(v)),
    cardText: insight?.action ?? "",
  };
}

/**
 * AppData(=이미 계산+개인화된 결과) → ResultLandingV2가 바로 쓸 수 있는
 * ReportResult로 변환한다. 새 계산 없음 — 기존 함수 호출과 필드 선택만.
 */
export function buildReportResult(appData: AppData): ReportResult {
  const { user, chars, birthYear } = appData;
  const dayGan = user.pillars.day.hanja;
  const seed = chars.join("");

  const scenes = buildFullStoryScenes(appData);
  const tenYear = buildTenYearFortune(dayGan, birthYear, seed);
  const elementAnalysis = buildElementAnalysis(chars);

  return {
    summaryTitle: user.typeLabel,
    dayMasterLabel: user.dayPillar,
    pillars: buildPillars(user),
    sinsal: user.sinsal,
    elementBalance: buildElementBalance(elementAnalysis.counts),
    elementStrongest: elementAnalysis.strongest,
    elementWeakest: elementAnalysis.weakest,
    chapters: buildChapters(scenes),
    chapterOne: buildChapterOneDetail(scenes),
    tenYearPreview: groupTenYear(tenYear),
  };
}
