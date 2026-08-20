import { PillarCell, SajuUser } from "@/types";
import { StoryScene } from "@/types/story";
import { Element, ELEMENT_LABEL, GAN_ELEMENT } from "./hanjaTables";
import { AppData } from "./sajuContent";
import {
  buildFullStoryScenes,
  CH1_STRENGTH,
  CH1_TRUTH_SCENE,
  CH1_ALONE_SCENE,
  CH2_STRENGTH,
  CH2_EXAMPLE2,
} from "./storyScenes";
import { YearFortuneItem, buildElementAnalysis, buildTenYearFortune } from "./aiLifeReport";
import { GAN_PROFILE } from "./ganZhiProfiles";
import {
  buildChapterOneNarrative,
  buildRealLifeConnector,
  buildRelationshipConnector,
  buildCheoneulGwiinOpening,
  buildGwansalHonjapNote,
} from "./chapterOneNarrative";
import { buildInterpretationKey } from "./chapterOneInterpretation";
import { buildChapterThreeKey } from "./chapterThreeInterpretation";
import { buildChapterThreeNarrative } from "./chapterThreeNarrative";
import { buildChapterFourKey } from "./chapterFourInterpretation";
import { buildChapterFourNarrative } from "./chapterFourNarrative";
import { buildLifeFlowKey } from "./lifeFlowInterpretation";
import { buildLifeFlowNarrative, LifeFlowContent } from "./lifeFlowNarrative";

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
  /** 第二章("타고난 기질") 전용 확장 구조 — 있으면 ResultLandingV2가 소제목
   * 2개 + RED 한 줄 + 블러 다리로 된 풍부한 레이아웃을 쓰고, 없으면(챕터
   * 3/4는 계속 없음) 기존 flat body.map 레이아웃을 그대로 쓴다. subheadingA/
   * subheadingB/bodyA/bodyB/redLine 전부 GAN_PROFILE[dayGan].temperament +
   * ZHI_PROFILE[dayZhi].temperamentNote(이미 storyblocks로 조립된 실제
   * 값)에서만 가져온다 — 새 문장 창작 없음. teaser.blurred는 chapters[2]
   * (第三章, 이미 개인화된 실제 재물 문단)의 실제 문장을 인용한다. */
  richBody?: {
    /** 관살혼잡처럼 "이 사람에게 실제로 있을 때만" 붙는 도입 단락.
     * 없으면 undefined — 화면에서도 아예 렌더링하지 않는다. */
    intro?: string;
    subheadingA: string;
    bodyA: string[];
    redLine: string;
    subheadingB: string;
    bodyB: string[];
    teaser?: { lead: string; blurred: string };
  };
  /** 第四章("금전운의 흐름") 전용 — 무료 공개(body에 이미 들어간 것)
   * 이후의 잠금 상세(흔들리는 조건·과거/현재/다음 대운·조언). 전체 원고는
   * chapterFourNarrative.ts가 항상 만들어내지만, 화면에는 아직 아무도
   * 이 필드를 읽지 않는다 — ResultLandingV2.tsx는 body만 렌더링하므로
   * 지금은 이 필드가 있어도 화면엔 body(공개부)만 보인다. 블러 UI를
   * 실제로 붙이는 건 다음 단계. */
  lockedDetail?: string[];
}

/**
 * 01 "타고난 본질" 챕터 전용 — 최종 샘플 품질 구조. 02~04는 아직 이 구조로
 * 옮기지 않았으므로 기존 ReportChapter/buildChapters()를 그대로 쓴다 —
 * 이 타입은 오직 01 챕터 렌더링에만 쓰인다.
 *
 * 전부 이미 존재하는 실제 데이터에서만 가져온다(새 문장 창작 없음):
 * GAN_PROFILE[dayGan]/ZHI_PROFILE[dayZhi](일간·일지별로 이미 써 있는
 * 잠재력/근거 문단, 10간×12지 전량 보유) + storyScenes.ts의 CH1_* 오행별
 * 표(사실/장점/문제/실제사례/행동조언). 사람마다 dayGan·dayZhi·dayElement가
 * 다르므로 아래 필드 전부가 사람마다 달라진다.
 */
export interface ChapterOneDetail {
  chapterLabel: string;
  title: string;
  /** GAN_PROFILE[dayGan].resultQuoteFragment 그대로 — GOLD 훅, 이름 없이 1문장 */
  goldHook: string;
  /** 1.타고난 본질 + 2.핵심 명리 요소(일간·일지) + 3.사주 안의 다른 여섯(넷)
   * 글자와 기운 — chapterOneNarrative.ts가 사람마다 실제 계산된 십성/오행
   * 값(SajuUser.pillars, buildElementAnalysis)으로 조립한다. 새 명리 계산
   * 없음 — 십성 10종의 표준 의미를 담은 문장뱅크에 실제 값을 대입할 뿐이다. */
  body1: string[];
  /** 4.기질(GAN_PROFILE 다만 문단 + ZHI_PROFILE 노트) + 5.실제 삶에서
   * 나타나는 모습(gan.potential.paragraphs[2] + ch1-insight.realLife) */
  body2: string[];
  /** ch1-insight.fact 그대로 — 챕터 전체에서 유일한 RED 문장(가장 중요한 맹점) */
  redInsight: string;
  /** 7.강점이 지나칠 때 생기는 그림자 — 장점(CH1_STRENGTH) + 그 힘이
   * 스스로를 향할 때(CH1_ALONE_SCENE), 오행별 */
  body3: string[];
  /** 8.관계에서 나타나는 구체적 모습(CH1_TRUTH_SCENE), 오행별 */
  body4: string[];
  /** ch1-insight.action 그대로 — 아이보리 카드(행동 조언) */
  cardText: string;
  /** 일지가 일간 기준 천을귀인에 해당할 때만 붙는 보정 오프닝 한 문장
   * (buildCheoneulGwiinOpening). 해당 없으면 undefined — 화면에서도
   * 아예 렌더링하지 않는다(지어내지 않음). */
  cheoneulOpening?: string;
  /** GAN_PROFILE[dayGan].potential.badges 그대로 — 일간 10종 전량 보유,
   * 새 수치 창작 없음. 사람마다 dayGan이 다르므로 자동으로 달라진다. */
  badges: { label: string; score: number }[];
  /** 다음 장(관계에서 반복되는 장면)으로 넘어가는 블러 다리. blurred는
   * ch2-insight.realLife(이미 개인화된 실제 문장)의 첫 문장을 그대로
   * 인용한 것 — lead만 고정 문구이고 blurred는 사람마다 다르다. */
  teaser?: { lead: string; blurred: string };
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
  /** 오행 원본 키 — 칸 배경색을 오행별로 칠할 때 쓴다. 시간 미상 등 셀이
   * 없으면 undefined(회색/무채색으로 표시, 값을 지어내지 않음). */
  elementKey?: Element;
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
  /** 4챕터 이후 "무료→유료 전환 구간"(내 인생의 큰 흐름/나의 대운 흐름/
   * 아직 펼쳐지지 않은 기록). 새 5챕터가 아니라 chapters[] 배열과는 별도
   * 필드다 — lifeFlowInterpretation.ts/lifeFlowNarrative.ts가 만든 결과를
   * 그대로 옮긴 것뿐, 이 파일에서 새 문장을 짓지 않는다. 선택적 필드로
   * 두어(?) 기존 ResultLandingV2.tsx의 DEFAULT_REPORT 등 정적 fallback을
   * 건드리지 않는다 — 화면은 아직 이 필드를 읽지 않는다. */
  lifeFlow?: LifeFlowContent;
}

function firstLine(text: string): string {
  return text.split("\n")[0]?.trim() ?? text;
}


/** 블러 다리(teaser)용 — 마침표 기준 첫 문장만 잘라 쓴다. 문장 전체가 아니라
 * 일부만 인용해야 "궁금증"이 남기 때문. 새 문장 창작 없음, 자르기만 한다. */
function firstSentence(text: string): string {
  const idx = text.indexOf(".");
  return (idx >= 0 ? text.slice(0, idx + 1) : text).trim();
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
  return {
    hanja: cell.hanja,
    hangul: cell.hangul,
    element: ELEMENT_LABEL[cell.element],
    elementKey: cell.element,
    sipseong: cell.sipseong,
  };
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

function buildChapterOneDetail(appData: AppData, scenes: StoryScene[]): ChapterOneDetail {
  const cover = scenes.find((s) => s.id === "ch1-cover");
  const insight = scenes.find((s) => s.id === "ch1-insight");

  const dayGan = appData.user.pillars.day.hanja;
  const dayElement = GAN_ELEMENT[dayGan];
  const gan = GAN_PROFILE[dayGan];

  const narrative = buildChapterOneNarrative(appData);

  // 5번(실제 삶) — insight.realLife 뒤에 같은 문단으로 이어 붙인다(별도
  // 문단 아님). 8번(관계·현실) — CH1_TRUTH_SCENE 뒤에 별도 문단으로 붙인다.
  // 둘 다 INTERPRETATION층(chapterOneInterpretation.ts)의 key를 보조
  // 근거로만 쓴다 — 새 계산 없음, 오행 5종 테이블 자체는 그대로 유지.
  const realLifeConnector = buildRealLifeConnector(appData);
  const realLife = [insight?.realLife, realLifeConnector].filter(Boolean).join(" ");
  const relationshipConnector = buildRelationshipConnector(appData);

  const cheoneulOpening = buildCheoneulGwiinOpening(appData) ?? undefined;

  // 다른 6글자 중 "비겁"과 "관성"이 동률로 최다일 때만(=실제로 팽팽한
  // 균형) 이 다리를 쓴다. buildInterpretationKey는 이미 있는 값이고 새
  // 계산이 아니다 — 없는 사람에게 "균형"이 있다고 지어내지 않기 위한
  // 조건이다. 해당하지 않으면 기존(다음 장=관계, ch2-insight 인용) 다리로
  // 대체한다.
  const key = buildInterpretationKey(appData);
  const hasBalanceTie =
    key.isTopTie && key.topCategories.includes("비겁") && key.topCategories.includes("관성");

  // 다음 장(관계에서 반복되는 장면 — ch2-insight)이 이미 만들어낸 실제
  // 개인화 문장을 그대로 인용한다. 새 문장 창작 없음, blurred 부분만
  // 화면에서 블러 처리한다(BlurBridge, ResultLandingV2.tsx).
  const relationshipHint = scenes.find((s) => s.id === "ch2-insight")?.realLife;
  const teaser = hasBalanceTie
    ? {
        lead: "이 팽팽한 균형이 실제로 무너지는 자리는 따로 있습니다 —",
        blurred: "사회에서 짊어진 규율이 결국 자기 자신을 가두는 쪽으로 흐르기 쉽습니다.",
      }
    : relationshipHint
    ? {
        lead: "이 기질이 관계 안에서 반복되는 방식도 이미 드러나 있습니다 —",
        blurred: firstSentence(relationshipHint),
      }
    : undefined;

  return {
    chapterLabel: cover?.chapterLabel ?? "第一章",
    // 챕터 제목 자체를 이름 기반으로 바꾼다 — "남들이 보는 나, 그리고
    // 실제의 나"라는 고정 제목 대신, 맨 위에서부터 바로 "OOO님의 타고난
    // 운명"으로 시작하게 한다(사용자 요청: 챕터 시작이 이름+운명이어야
    // 함). 기존 goldHook 줄에 이름을 또 넣으면 중복이라 goldHook은
    // 원래의 resultQuoteFragment 그대로 둔다.
    title: `${appData.user.name}님의 타고난 운명`,
    goldHook: gan.resultQuoteFragment,
    body1: narrative.identity,
    body2: [...narrative.temperament, gan.potential.paragraphs[2]?.text, realLife || undefined].filter(
      (v): v is string => Boolean(v)
    ),
    redInsight: insight?.fact ?? "",
    body3: [
      CH1_STRENGTH[dayElement],
      [
        "그런데 같은 힘이 스스로를 향하면 다른 얼굴이 됩니다.",
        CH1_ALONE_SCENE[dayElement],
      ].join("\n"),
    ].filter((v): v is string => Boolean(v)),
    body4: [CH1_TRUTH_SCENE[dayElement], relationshipConnector].filter(
      (v): v is string => Boolean(v)
    ),
    cardText: insight?.action ?? "",
    cheoneulOpening,
    badges: gan.potential.badges,
    teaser,
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

  const chapters = buildChapters(scenes);
  // 第二章을 "타고난 기질" 에세이로 교체한다. 새 문장 창작이 아니라
  // GAN_PROFILE[dayGan].temperament(10간 전량 보유, 지금까지는 어디서도
  // 쓰이지 않던 필드)를 그대로 쓴다 — buildStoryblocks()가 이미
  // heading/paragraphs(gan 3개+zhi 노트 1개)/lockedPreview로 조립해 둔
  // appData.storyblocks의 "타고난 기질" 블록을 그대로 가져온다.
  // 챕터1은 gan.potential(잠재력)을, 여기는 gan.temperament(기질)를
  // 쓰므로 문장이 겹치지 않는다 — 단 하나, temperamentBlock의 세 번째
  // 문단("이 뜨거운 심지는...")은 챕터1 끝의 블러 다리(teaser)가 이미
  // 인용한 문장과 같다. 이건 의도된 것이다 — 그 다리가 "실제로 다음
  // 장에 있는 문장"을 인용하는 설계이기 때문.
  const temperamentBlock = appData.storyblocks.find((b) => b.title === "타고난 기질");
  if (chapters[1] && temperamentBlock) {
    const paras = temperamentBlock.paragraphs.map((p) => p.text).filter(Boolean);
    // paras 순서: [0]gan.temperament[0], [1]gan.temperament[1],
    // [2]gan.temperament[2], [3]zhi.temperamentNote — buildStoryblocks()가
    // 조립한 그대로다(sajuContent.ts). 소제목 2개로 나눠 구조에 무게를
    // 싣는다 — 새 문장 없이 배치만 바꾼 것.
    // CH2_STRENGTH/CH2_EXAMPLE2(storyScenes.ts, 오행 5종 전량 보유, 예전
    // ch2-insight.realLife 조립에만 쓰이고 화면엔 한 번도 안 나갔던 문장)를
    // 더해 "겉으로는 ~하지만" 식 추상 서술 옆에 "예를 들어 ~한 경우가
    // 있습니다" 식 구체적 생활 장면을 한 단씩 붙인다 — 역시 새 창작 없음.
    const dayElement = GAN_ELEMENT[dayGan];
    // 주의: chapters[2](第三章)를 이번에 "돈과 일이 움직이는 방식"에서
    // "살아가는 방식과 관계운"으로 교체했다(아래 참고). 이 블러 다리는
    // 원래 chapters[2].body를 그대로 인용했는데, 그 내용이 바뀌면 여기
    // 리드 문구("재물 앞에서는...")와 인용 내용이 어긋나게 된다. 그래서
    // chapters[2]를 거치지 않고 ch3-insight 씬 값을 직접 인용하도록
    // 고쳤다 — 결과 문자열은 이전과 완전히 동일하다(둘 다 같은
    // realLife 값을 가리킴). 2챕터가 화면에 보여주는 내용은 바뀌지 않는다.
    const wealthPara = scenes.find((s) => s.id === "ch3-insight")?.realLife;
    // 편관+정관이 실제로 둘 다 있는 사람에게만 뜨는 도입 단락(없으면
    // undefined, 화면에 아무것도 안 뜸) — buildGwansalHonjapNote 참고.
    const gwansalNote = buildGwansalHonjapNote(appData) ?? undefined;
    chapters[1] = {
      ...chapters[1],
      title: `${user.name}님의 타고난 기질`,
      killpoint: temperamentBlock.heading,
      body: paras,
      richBody: {
        intro: gwansalNote,
        subheadingA: "겉과 속이 다른 온도",
        bodyA: [...paras.slice(0, 2), CH2_STRENGTH[dayElement]].filter(Boolean),
        redLine: paras[2] ?? "",
        subheadingB: "진짜 모습이 드러나는 순간",
        bodyB: [CH2_EXAMPLE2[dayElement], ...paras.slice(3)].filter(Boolean),
        // lead가 "재물이 새는 지점"이라는 실제 인용 내용과 맞도록 고쳤다
        // (이전 버전은 "돈이 되는 방식"이라 해놓고 "돈이 새는 지점"을
        // 인용해 리드와 내용이 어긋났었다).
        teaser: wealthPara
          ? {
              lead: "이 기질, 재물 앞에서는 다르게 나타납니다 —",
              blurred: firstSentence(wealthPara),
            }
          : undefined,
      },
    };
  }

  // 第三章을 "살아가는 방식과 관계운"으로 교체한다. 기존에 이 자리에
  // 있던 "돈과 일이 움직이는 방식"(재물, 5원소 공통 문장 다수 포함)은
  // 확정된 4챕터 구조상 원래 4챕터("금전운의 흐름") 자리였고, 4챕터는
  // 아직 별도 승인 전이라 이번 범위가 아니다 — 그래서 여기서는 第三章
  // "본문(body/killpoint/highlight/title)"만 교체하고, chapterLabel(第三章)
  // 은 그대로 둔다. chapterThreeInterpretation.ts(세력·통근·합충·관살혼잡
  // 판단) + chapterThreeNarrative.ts(그 판단을 실제 문장으로 조립)가
  // 승인된 설계와 홍지영·한소민·윤태호 3편의 구조/문체를 코드로 옮긴
  // 것이다 — GAN_PROFILE.lifestyle/CH3_FACT 등 기존 오행·일간 공통
  // 문장뱅크는 쓰지 않는다.
  if (chapters[2]) {
    const chapterThreeKey = buildChapterThreeKey(appData);
    const chapterThreeContent = buildChapterThreeNarrative(appData, chapterThreeKey);
    chapters[2] = {
      ...chapters[2],
      title: chapterThreeContent.title,
      killpoint: chapterThreeContent.killpoint,
      body: chapterThreeContent.body,
      highlight: chapterThreeContent.highlight,
    };
  }

  // 第四章을 "금전운의 흐름"으로 교체한다. chapterFourInterpretation.ts
  // (일지 포함 재물 세력·정재/편재 구분·일간 통근·비겁/식상/관성/인성의
  // 상대관계·대운 재물 신호) + chapterFourNarrative.ts(그 판단을 실제 명리
  // 근거→쉬운 뜻→재물 풀이 순서의 문장으로 조립)가 승인된 설계를 코드로
  // 옮긴 것이다. chapterLabel(第四章)은 그대로 두고 본문만 교체한다.
  //
  // 무료/잠금 분리: body에는 publicPreview(①구조 ②만드는 방식 ③커지는
  // 핵심 조건 한 가지, 약 450~700자)만 넣는다 — ResultLandingV2.tsx는
  // body를 그대로 map해서 보여주므로, 이것만으로 이미 "앞부분만 무료
  // 공개"가 데이터 차원에서 성립한다(UI 변경 없음). lockedDetail(④흔들리는
  // 조건 ⑤과거 ⑥현재 ⑦다음 대운 ⑧조언)은 전체 원고를 항상 만들어 별도
  // 필드에 담아 두되, 화면 어디서도 아직 읽지 않는다 — 블러 UI를 실제로
  // 붙이는 건 다음 단계(이번 범위 아님).
  if (chapters[3]) {
    const chapterFourKey = buildChapterFourKey(appData);
    const chapterFourContent = buildChapterFourNarrative(appData, chapterFourKey);
    chapters[3] = {
      ...chapters[3],
      title: chapterFourContent.title,
      killpoint: chapterFourContent.killpoint,
      body: chapterFourContent.publicPreview,
      highlight: chapterFourContent.highlight,
      lockedDetail: chapterFourContent.lockedDetail,
    };
  }

  // 4챕터 이후 전환 구간. chapters[]와 별도 필드 — 새 5챕터가 아니라
  // "무료→유료 전환 구간"이며, publicPreview/lockedDetail 원칙은
  // lifeFlowNarrative.ts 내부에서 이미 분리해 반환한다.
  const lifeFlowKey = buildLifeFlowKey(appData);
  const lifeFlow = buildLifeFlowNarrative(appData, lifeFlowKey);

  return {
    summaryTitle: user.typeLabel,
    dayMasterLabel: user.dayPillar,
    pillars: buildPillars(user),
    sinsal: user.sinsal,
    elementBalance: buildElementBalance(elementAnalysis.counts),
    elementStrongest: elementAnalysis.strongest,
    elementWeakest: elementAnalysis.weakest,
    chapters,
    chapterOne: buildChapterOneDetail(appData, scenes),
    tenYearPreview: groupTenYear(tenYear),
    lifeFlow,
  };
}
