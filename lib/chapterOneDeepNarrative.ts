import { AppData } from "./sajuContent";
import { computeSipseong } from "./aiLifeReport";
import { Stage, analyzeRoot } from "./natalStructure";
import { analyzeCategoryStrength, SipseongCategory, RootHit } from "./strengthAnalysis";
import { analyzeWealthCategoryStrength } from "./wealthStrengthAnalysis";
import { GAN_PROFILE } from "./ganZhiProfiles";

/**
 * 第一章 유료 심화 — "겉으로 보이는 나, 안에서 움직이는 힘".
 *
 * 2026-09 재설계(승인된 구조): ①Opening은 기존 무료 본문(goldHook 등)이
 * 이미 맡고 있어 이 파일은 다루지 않는다. 이 파일은 ②~⑦만 만든다.
 * 기존에 있던 "강점/그림자"(STRENGTH_TEXT/TIRED_TEXT, 카테고리 사전식)와
 * "편안할 때/압박받을 때"(계절 3단계) 섹션은 이번 개정에서 제거했다 —
 * 二章이 앞으로 다룰 "여러 힘의 배치" 주제와 겹치는 자리였다. 대신
 * ⑤(일간×축 교차)·⑥(쉽게 쓰는 힘/에너지가 더 필요한 힘)으로 대체한다.
 *
 * 새 명리 계산은 여전히 하지 않는다. 재사용하는 함수:
 *  - analyzeCategoryStrength(strengthAnalysis.ts, 3장이 이미 쓰는 함수) —
 *    "겉으로 드러난 나"(다른 6/4글자 중 실제로 존재하는 십성, count>0),
 *    그 rootHits, active[](세력 순위).
 *  - analyzeWealthCategoryStrength(wealthStrengthAnalysis.ts, 4장이 이미
 *    쓰는 함수) — 5개 카테고리를 필터 없이 전부 반환하므로, 겉으로는
 *    전혀 안 보이지만(count=0) 지장간에는 있는("완전히 숨은 힘") 또는
 *    "지장간에도 전혀 없는 완전 부재" 카테고리를 찾을 때만 쓴다.
 *  - analyzeRoot(natalStructure.ts) — 일간 자신의 통근. "쉽게 버티는지"의
 *    유일한 근거로 쓴다(3장과 동일 원칙).
 *  - GAN_PROFILE[dayGan](ganZhiProfiles.ts, 기존 무료 1장이 이미 쓰는
 *    정적 표) — coreTrait는 재인용하지 않고, "그 기본 성질 위에 실제
 *    가장 강한 축이 얹힌다"는 새 문장의 근거로만 쓴다.
 *
 * 무료 第一章(chapterOneNarrative.ts)은 한 글자도 건드리지 않는다.
 */

const SIPSEONG_TO_CATEGORY: Record<string, SipseongCategory> = {
  비견: "비겁", 겁재: "비겁", 식신: "식상", 상관: "식상",
  편재: "재성", 정재: "재성", 편관: "관성", 정관: "관성",
  편인: "인성", 정인: "인성",
};

const STAGE_LABEL: Record<Stage, string> = {
  year: "년주", month: "월주", day: "일주", hour: "시주",
};

function josaEunNeun(word: string): "은" | "는" {
  const last = word.charCodeAt(word.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return "는";
  return (last - 0xac00) % 28 === 0 ? "는" : "은";
}
function josaGwaWa(word: string): "과" | "와" {
  const last = word.charCodeAt(word.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return "와";
  return (last - 0xac00) % 28 === 0 ? "와" : "과";
}

export interface VisibleForceItem {
  category: SipseongCategory;
  sipseong: string;
  stage: Stage;
}

export interface HiddenForceItem {
  category: SipseongCategory;
  hiddenGan: string;
  sipseong: string;
  stage: Stage;
  zhi: string;
  position: "본기" | "중기" | "여기";
  tou: boolean;
}

/** 화면 시각화 전용 — 순수 데이터/문장만, 새 점수·등급 없음. */
export interface ChapterOneDeepVisual {
  visible: VisibleForceItem[];
  hidden: HiddenForceItem[];
  /** 겉/속 비교카드 아래에 붙는 1줄 동적 통찰 — visible/rootHits 비교
   * 결과로만 결정된다(지어낸 문장 아님). */
  compareInsight: string;
  /** "쉽게 쓰는 힘" — active에서 가장 약한 1개를 뺀 나머지(한글 라벨만). */
  easy: SipseongCategory[];
  /** "에너지가 더 필요한 힘" — active 중 가장 약한 1개(있으면) + 완전
   * 부재 카테고리. "결핍/문제"로 단정하지 않고 이 배열은 태그로만 쓴다. */
  effortful: SipseongCategory[];
}

export interface ChapterOneDeepSection {
  heading: string;
  body: string[];
}

export interface ChapterOneDeepResult {
  sections: ChapterOneDeepSection[];
  visual: ChapterOneDeepVisual;
}

// ────────────────────────────────────────────────────────────────
// 카테고리별 문장뱅크 — 전부 이번 장 전용으로 새로 썼다.
// ────────────────────────────────────────────────────────────────

const SURFACE_TEXT: Record<SipseongCategory, string> = {
  비겁: "남에게 먼저 묻기보다 스스로 판단부터 하는 모습이 겉으로 자주 보입니다.",
  식상: "생각한 것을 말이나 행동으로 먼저 꺼내는 모습이 겉으로 자주 보입니다.",
  재성: "상황을 손에 잡히는 결과 중심으로 정리하는 모습이 겉으로 자주 보입니다.",
  관성: "맡은 자리와 규칙을 스스로 지키려는 모습이 겉으로 자주 보입니다.",
  인성: "바로 답하기보다 한 번 더 생각한 뒤 움직이는 모습이 겉으로 자주 보입니다.",
};

const SURFACE_TEXT_REPEATED: Record<SipseongCategory, string> = {
  비겁: "한 자리가 아니라 여러 자리에 걸쳐 있어서, 스스로 판단부터 하는 모습이 한 번으로 끝나지 않고 겉으로 반복해서 드러납니다.",
  식상: "한 자리가 아니라 여러 자리에 걸쳐 있어서, 생각을 먼저 꺼내는 모습이 한 번으로 끝나지 않고 겉으로 반복해서 드러납니다.",
  재성: "한 자리가 아니라 여러 자리에 걸쳐 있어서, 결과 중심으로 정리하는 모습이 한 번으로 끝나지 않고 겉으로 반복해서 드러납니다.",
  관성: "한 자리가 아니라 여러 자리에 걸쳐 있어서, 규칙을 지키려는 모습이 한 번으로 끝나지 않고 겉으로 반복해서 드러납니다.",
  인성: "한 자리가 아니라 여러 자리에 걸쳐 있어서, 신중하게 움직이는 모습이 한 번으로 끝나지 않고 겉으로 반복해서 드러납니다.",
};

const HIDDEN_TEXT: Record<SipseongCategory, string> = {
  비겁: "겉으로 다 드러내지 않아도, 정작 중요한 순간에는 결국 자기 기준으로 결정을 내리는 힘이 안에서 작동합니다.",
  식상: "평소엔 조용해 보여도, 안에서는 하고 싶은 말과 만들고 싶은 것이 계속 쌓여가고 있습니다.",
  재성: "겉으로 태연해 보여도, 속으로는 손해와 이득을 끊임없이 가늠하고 있는 편입니다.",
  관성: "겉으로 여유로워 보여도, 안에서는 맡은 몫에 대한 책임감이 계속 스스로를 다잡고 있습니다.",
  인성: "겉으로 무심해 보여도, 안에서는 상황을 이해하고 받아들이려는 마음이 끊임없이 움직이고 있습니다.",
};

const HIDDEN_TEXT_ROOTED: Record<SipseongCategory, string> = {
  비겁: "안에만 머물지 않습니다 — 겉으로도 같은 글자가 드러나 있어, 자기 기준으로 결정을 내리는 힘이 안팎에서 함께 작동합니다.",
  식상: "안에만 머물지 않습니다 — 겉으로도 같은 글자가 드러나 있어, 표현하고 싶은 마음이 안팎에서 함께 힘을 받습니다.",
  재성: "안에만 머물지 않습니다 — 겉으로도 같은 글자가 드러나 있어, 손익을 가늠하는 힘이 안팎에서 함께 작동합니다.",
  관성: "안에만 머물지 않습니다 — 겉으로도 같은 글자가 드러나 있어, 책임감이 안팎에서 함께 작동합니다.",
  인성: "안에만 머물지 않습니다 — 겉으로도 같은 글자가 드러나 있어, 이해하고 받아들이려는 마음이 안팎에서 함께 작동합니다.",
};

// ④ "겉과 속이 다르다"의 실제 생활 장면 — 두 힘이 부딪히는 구체적 순간.
const GAP_SCENE_TEXT: Record<SipseongCategory, string> = {
  비겁: "겉으론 이미 정리된 것처럼 말하다가도, 정작 혼자 남으면 그 판단을 처음부터 다시 짚어보는 순간이 있습니다.",
  식상: "겉으론 담담하게 넘기고도, 집에 돌아와서야 하고 싶었던 말이 뒤늦게 올라오는 순간이 있습니다.",
  재성: "겉으론 신경 안 쓰는 척 넘어가도, 속으로는 이미 손익 계산을 몇 번이나 끝낸 뒤였을 수 있습니다.",
  관성: "겉으론 여유로워 보여도, 맡은 몫을 다 끝내기 전까진 마음 한구석이 계속 불편했을 수 있습니다.",
  인성: "겉으론 바로 받아들인 것처럼 보여도, 실제로 납득이 되기까지는 시간이 훨씬 더 걸렸을 수 있습니다.",
};

// ④ "겉과 속이 같다"일 때의 실제 생활 장면.
const MATCH_SCENE_TEXT: Record<SipseongCategory, string> = {
  비겁: "그래서 겉으로 보이는 결단과 실제 속마음이 거의 어긋나지 않습니다 — 말한 대로 움직이는 사람이라는 인상을 자연스럽게 줍니다.",
  식상: "그래서 겉으로 하는 말과 속마음 사이에 시차가 거의 없습니다 — 담아두는 게 오히려 더 어려운 쪽에 가깝습니다.",
  재성: "그래서 계산하는 티가 겉으로도 자연스럽게 드러납니다 — 숨기려 해도 잘 숨겨지지 않는 편입니다.",
  관성: "그래서 겉으로 보이는 책임감과 실제로 느끼는 부담이 거의 같은 무게로 움직입니다.",
  인성: "그래서 신중해 보이는 겉모습이 실제 속도와 거의 일치합니다 — 서두르는 척도 잘 하지 못하는 편입니다.",
};

// ⑤ 일간의 기본 성질 위에 top 축이 얹힐 때 실제로 달라지는 결.
const AXIS_OVERLAY_TEXT: Record<SipseongCategory, string> = {
  비겁: "그 위에 자기 힘으로 서려는 축이 겹치면서, 기본 성질이 '내 방식대로 해내야 직성이 풀리는' 쪽으로 한층 더 뚜렷해집니다.",
  식상: "그 위에 생각을 밖으로 풀어내려는 축이 겹치면서, 기본 성질이 '표현하지 않고는 못 배기는' 쪽으로 한층 더 뚜렷해집니다.",
  재성: "그 위에 실익을 따지는 축이 겹치면서, 기본 성질이 '결과로 확인해야 안심이 되는' 쪽으로 한층 더 뚜렷해집니다.",
  관성: "그 위에 책임을 지키려는 축이 겹치면서, 기본 성질이 '맡은 것은 반드시 끝을 봐야 하는' 쪽으로 한층 더 뚜렷해집니다.",
  인성: "그 위에 이해하고 받아들이려는 축이 겹치면서, 기본 성질이 '충분히 납득해야만 움직이는' 쪽으로 한층 더 뚜렷해집니다.",
};

// ⑥ "쉽게 쓰는 힘" — 애써 꺼내지 않아도 먼저 나온다는 설명.
const EASY_TEXT: Record<SipseongCategory, string> = {
  비겁: "스스로 판단하고 결정하는 일은 따로 애쓰지 않아도 자연스럽게 됩니다.",
  식상: "생각한 것을 말이나 행동으로 옮기는 일은 따로 애쓰지 않아도 자연스럽게 됩니다.",
  재성: "결과와 실익을 챙기는 일은 따로 애쓰지 않아도 자연스럽게 됩니다.",
  관성: "맡은 몫과 기준을 지키는 일은 따로 애쓰지 않아도 자연스럽게 됩니다.",
  인성: "상황을 이해하고 받아들이는 일은 따로 애쓰지 않아도 자연스럽게 됩니다.",
};

// ⑥ "에너지가 더 필요한 영역" — 결핍/문제로 단정하지 않는 표현만 사용.
const EFFORTFUL_TEXT: Record<SipseongCategory, string> = {
  비겁: "반대로 스스로 결정하고 밀어붙이는 방식은, 이 사람이 자동으로 먼저 꺼내는 방식은 아닙니다. 필요할 땐 의식적으로 선택해야 하는 쪽에 가깝습니다.",
  식상: "반대로 생각을 밖으로 꺼내 표현하는 방식은, 이 사람이 자동으로 먼저 꺼내는 방식은 아닙니다. 필요할 땐 의식적으로 선택해야 하는 쪽에 가깝습니다.",
  재성: "반대로 결과와 실익부터 따지는 방식은, 이 사람이 자동으로 먼저 꺼내는 방식은 아닙니다. 필요할 땐 의식적으로 선택해야 하는 쪽에 가깝습니다.",
  관성: "반대로 기준과 책임을 앞세우는 방식은, 이 사람이 자동으로 먼저 꺼내는 방식은 아닙니다. 필요할 땐 의식적으로 선택해야 하는 쪽에 가깝습니다.",
  인성: "반대로 충분히 이해한 뒤에야 움직이는 방식은, 이 사람이 자동으로 먼저 꺼내는 방식은 아닙니다. 필요할 땐 의식적으로 선택해야 하는 쪽에 가깝습니다.",
};

function buildCompareInsight(
  name: string,
  topVisible: SipseongCategory | null,
  topHidden: SipseongCategory | null,
  hiddenCount: number,
  visibleCount: number
): string {
  if (topVisible && topHidden && topVisible !== topHidden) {
    return `겉에서는 ${topVisible}이 먼저 보이지만, 실제로 오래 버티게 만드는 힘은 ${topHidden} 쪽에 더 깊게 뿌리내려 있습니다.`;
  }
  if (topVisible && topHidden && topVisible === topHidden) {
    return `겉에서 보이는 ${topVisible}과 안에서 뿌리내린 힘이 같은 결이라, 겉과 속이 따로 놀지 않는 사람입니다.`;
  }
  if (topVisible && !topHidden) {
    return `겉으로 드러난 ${topVisible} 외에, 지장간 속에서 별도로 힘을 키우고 있는 카테고리는 뚜렷하지 않습니다.`;
  }
  if (!topVisible && topHidden) {
    return `겉으로는 두드러지는 힘이 없지만, 안에서는 ${topHidden}이 조용히 가장 깊게 뿌리내려 있습니다.`;
  }
  return `${name}님은 겉과 속 어느 쪽에서도 하나의 힘이 유독 두드러지지 않는, 비교적 고르게 섞인 구조입니다.`;
}

export function buildChapterOneDeepNarrative(appData: AppData): ChapterOneDeepResult {
  const user = appData.user;
  const name = user.name;
  const dayGan = user.pillars.day.hanja;

  const strength = analyzeCategoryStrength(user);
  const wealthAll = analyzeWealthCategoryStrength(user).all;
  const dayMasterRoot = analyzeRoot(user);

  // ── 시각화·문장 공용 원재료 ──────────────────────────────────
  const visible: VisibleForceItem[] = [];
  (["year", "month", "hour"] as const).forEach((stage) => {
    const stem = user.pillars[stage];
    const branch = user.pillars.branches[stage];
    if (stem && SIPSEONG_TO_CATEGORY[stem.sipseong]) {
      visible.push({ category: SIPSEONG_TO_CATEGORY[stem.sipseong], sipseong: stem.sipseong, stage });
    }
    if (branch && SIPSEONG_TO_CATEGORY[branch.sipseong]) {
      visible.push({ category: SIPSEONG_TO_CATEGORY[branch.sipseong], sipseong: branch.sipseong, stage });
    }
  });

  const hidden: HiddenForceItem[] = [];
  wealthAll.forEach((cat) => {
    cat.rootHits.forEach((hit: RootHit) => {
      const sipseong = computeSipseong(dayGan, hit.hiddenGan);
      hidden.push({
        category: cat.category,
        hiddenGan: hit.hiddenGan,
        sipseong,
        stage: hit.stage,
        zhi: hit.zhi,
        position: hit.position,
        tou: hit.tou,
      });
    });
  });

  const visibleCategories = new Set(visible.map((v) => v.category));
  const hiddenCategories = new Set(hidden.map((h) => h.category));

  // 완전 부재 — 겉에도 없고(count=0) 지장간에도 없는 카테고리.
  const purelyAbsentCategories = (["비겁", "식상", "재성", "관성", "인성"] as SipseongCategory[]).filter(
    (c) => !visibleCategories.has(c) && !hiddenCategories.has(c)
  );
  // 완전히 숨은 힘 — 겉엔 없지만 지장간엔 있는 카테고리(기존 ②에서 사용).
  const purelyHiddenCategories = (["비겁", "식상", "재성", "관성", "인성"] as SipseongCategory[]).filter(
    (c) => !visibleCategories.has(c) && hiddenCategories.has(c)
  );

  const topVisible = strength.top?.category ?? null;
  const hiddenCountByCategory = new Map<SipseongCategory, number>();
  hidden.forEach((h) => hiddenCountByCategory.set(h.category, (hiddenCountByCategory.get(h.category) ?? 0) + 1));
  let topHidden: SipseongCategory | null = null;
  let topHiddenCount = 0;
  hiddenCountByCategory.forEach((count, cat) => {
    if (count > topHiddenCount) {
      topHidden = cat;
      topHiddenCount = count;
    }
  });

  const sections: ChapterOneDeepSection[] = [];

  // ② 겉으로 드러난 나 ──────────────────────────────────────────
  if (topVisible) {
    const stages = Array.from(new Set(visible.filter((v) => v.category === topVisible).map((v) => STAGE_LABEL[v.stage])));
    const stageClause = stages.length === 1 ? stages[0] : stages.join("·");
    const distinctVisibleLabels = new Set(visible.filter((v) => v.category === topVisible).map((v) => v.sipseong));
    sections.push({
      heading: "겉으로 드러난 나",
      body: [
        `${name}님을 처음 보는 사람이 가장 먼저 느끼는 결은 ${topVisible}입니다. 사주 여덟 글자 중 ${stageClause}에서 이 기운이 겉으로 드러나 있기 때문입니다. ${
          distinctVisibleLabels.size >= 2 ? SURFACE_TEXT_REPEATED[topVisible] : SURFACE_TEXT[topVisible]
        }`,
        `이건 숨겨진 성향이 아니라, 실제로 명식 표면(천간·지지)에 그대로 새겨진 기운입니다 — 그래서 처음 만난 사람도 어느 정도는 짐작할 수 있는 부분입니다.`,
      ],
    });
  } else {
    sections.push({
      heading: "겉으로 드러난 나",
      body: [
        `${name}님은 다른 여섯(또는 넷) 글자 어디에서도 하나의 기운이 유독 두드러지지 않습니다. 겉으로는 특정한 색으로 규정되기보다, 상황에 따라 여러 결이 번갈아 나타나는 쪽에 가깝습니다.`,
      ],
    });
  }

  // ③ 안에서 뿌리내린 힘 ──────────────────────────────────────────
  if (topHidden) {
    const cat = topHidden as SipseongCategory;
    const hits = hidden.filter((h) => h.category === cat);
    const touCount = hits.filter((h) => h.tou).length;
    const isPurelyHidden = purelyHiddenCategories.includes(cat);
    const stageList = Array.from(new Set(hits.map((h) => STAGE_LABEL[h.stage])));
    // 연결 문장 — 겉(②)에서 안(③)으로 넘어가는 지점, 발견이 있을 때만.
    const bridge = isPurelyHidden
      ? `겉으로 드러난 모습만 보면 여기까지입니다. 하지만 지장간(地藏干) — 지지 속에 숨어 있는 천간 — 까지 내려가면 이야기가 조금 달라집니다. 그런데 이 명식에는 조금 다른 면이 하나 보입니다.`
      : `겉으로 드러난 기운과는 별개로, 지장간(地藏干) 안에도 ${cat}${josaGwaWa(cat)} 관련된 힘이 자리하고 있습니다.`;
    sections.push({
      heading: "안에서 뿌리내린 힘",
      body: [
        bridge,
        `${touCount > 0 ? HIDDEN_TEXT_ROOTED[cat] : HIDDEN_TEXT[cat]} ${stageList.join("·")}의 지지 속에 이 힘이 ${hits.length}군데 자리하고 있${
          touCount > 0
            ? `고, 그중 ${touCount}군데는 실제로 천간에도 같은 글자가 드러나 있어(투간·透干) 안에만 머물지 않고 겉으로도 힘을 발휘합니다.`
            : `습니다.`
        }`,
        // [2026-09 표현 혼동 수정] "겉으로 드러난 나"(원국 표면 십성)와
        // "안에서 뿌리내린 힘"(지장간 속 세력) 둘 다에 "겉으로 드러나(다)"
        // 라는 표현을 쓴 뒤, 이 문장에서 그 표현을 세 번째로(이번엔
        // "투간 여부"라는 또 다른 뜻으로) 재사용하면 독자에게 앞
        // 문장들과 모순처럼 읽힐 수 있다는 지적을 받았다. touCount(계산)
        // 자체는 그대로 두고, 이 문장만 "천간까지 이어져 나오다"로 바꿔
        // 투간이라는 세 번째 의미를 구분한다 — 뜻은 바뀌지 않았다.
        touCount === 0
          ? `다만 이 힘은 아직 지장간 속에만 머물러 있고 천간까지 이어져 나오지는 않아서, 스스로도 자각하기 전까지는 잘 보이지 않는 편입니다.`
          : `이렇게 뿌리가 실제로 겉까지 이어져 있으면, 순간의 기분이 아니라 삶 전반에서 꾸준히 작동하는 힘이라고 볼 수 있습니다.`,
      ],
    });
  } else {
    sections.push({
      heading: "안에서 뿌리내린 힘",
      body: [
        `지장간(地藏干) 안에서도 특별히 두드러지는 기운은 없습니다. 겉과 속이 비슷한 무게로 섞여 있어, 안에서 따로 작동하는 힘보다는 겉으로 보이는 모습 자체가 비교적 이 사람의 실제 모습에 가깝습니다.`,
      ],
    });
  }

  // ④ 겉과 속이 같은가 다른가 — 실제 생활 장면까지 ─────────────────
  if (topVisible && topHidden) {
    if (topVisible === topHidden) {
      sections.push({
        heading: "겉과 속이 같은 이유",
        body: [
          `겉으로 드러난 ${topVisible}${josaGwaWa(topVisible)} 안에서 작동하는 힘이 같은 결이라는 점이 이 명식의 특징입니다. 겉과 속이 이 정도로 그대로 이어지는 경우는 흔치 않습니다 — 보이는 모습과 실제 속마음의 간극이 크지 않다는 뜻입니다.`,
          MATCH_SCENE_TEXT[topVisible],
        ],
      });
    } else {
      sections.push({
        heading: "겉과 속이 다른 이유",
        body: [
          `그렇다면 이 두 힘이 실제 생활에서는 어떻게 함께 움직일까요? 겉으로는 ${topVisible}${josaEunNeun(topVisible)} 자리를 잡고 있지만, 안에서 실제로 가장 많이 움직이는 힘은 ${topHidden}입니다.`,
          `아마 이런 순간이 있었을 겁니다. ${GAP_SCENE_TEXT[topHidden]}`,
          `겉모습이 거짓이라서가 아니라, 안쪽에 또 다른 힘이 함께 자리하고 있기 때문입니다 — 그래서 오래 지켜본 사람일수록 "처음 봤을 때랑 좀 다르다"는 인상을 받기 쉽습니다.`,
        ],
      });
    }
  }

  // ⑤ 같은 일간이어도 이 사람이 다른 이유 ─────────────────────────
  if (topVisible) {
    const gan = GAN_PROFILE[dayGan];
    sections.push({
      heading: "같은 일간이어도 이 사람이 다른 이유",
      body: [
        `${user.pillars.day.hangul}(${dayGan}) 일간은 누구에게나 똑같이 "${gan.image}" 같은 기본 성질을 줍니다. ${AXIS_OVERLAY_TEXT[topVisible]}`,
        `그래서 같은 ${user.pillars.day.hangul}(${dayGan}) 일간이라도, 이 명식에서는 ${topVisible}이라는 실제 세력 때문에 다른 사람과는 다른 결로 나타납니다 — 이건 일간 하나만으로는 설명되지 않는, 이 사람만의 조합입니다.`,
      ],
    });
  }

  // ⑥ 쉽게 버티는 상황 / 힘이 빠지는 상황 ──────────────────────────
  const activeSorted = strength.active;
  const weakestActive = activeSorted.length >= 2 ? activeSorted[activeSorted.length - 1].category : null;
  const easy = activeSorted.filter((a) => a.category !== weakestActive).map((a) => a.category);
  const effortful: SipseongCategory[] = [...(weakestActive ? [weakestActive] : []), ...purelyAbsentCategories];

  if (easy.length > 0 || effortful.length > 0) {
    const body: string[] = [];
    if (easy.length > 0) {
      const mainEasy = easy[0];
      body.push(`${EASY_TEXT[mainEasy]} 이 힘은 원국에 실제로 자리를 잡고 있어서, 굳이 의식하지 않아도 몸에 밴 것처럼 나옵니다.`);
    }
    if (weakestActive) {
      body.push(
        `반면 ${weakestActive}은 이 사람에게 아예 없는 힘은 아니지만, 다른 힘들보다 상대적으로 약하게 자리 잡고 있습니다. ${EFFORTFUL_TEXT[weakestActive]}`
      );
    }
    if (purelyAbsentCategories.length > 0) {
      const absentList = purelyAbsentCategories.join("·");
      body.push(
        `그리고 여기서 한 가지가 더 보입니다 — ${absentList}${josaEunNeun(purelyAbsentCategories[purelyAbsentCategories.length - 1])} 원국 어디에도(겉으로도, 지장간 안에도) 자리하지 않습니다. "없다/부족하다"보다는, 이 영역에서는 이 사람이 자동으로 먼저 쓰는 방식이 애초에 다르다는 뜻에 가깝습니다.`
      );
    }
    body.push(
      dayMasterRoot.hasRoot
        ? `다만 일간 자신의 뿌리가 지지에 실제로 내려 있어서, 이 힘이 부족한 영역에서도 완전히 무너지지는 않습니다 — 시간이 걸리더라도 결국 자기 자리로 돌아오는 힘이 있습니다.`
        : `게다가 일간 자신의 뿌리도 지지 어디에도 내려 있지 않아서, 이런 영역에서는 평소보다 의식적으로 더 애를 써야 버틸 수 있습니다.`
    );
    sections.push({ heading: "쉽게 버티는 상황, 힘이 빠지는 상황", body });
  }

  // ⑦ 第一章의 발견 — 앞의 근거들을 연결한 종합, 사람마다 달라짐 ──────
  const compareInsight = buildCompareInsight(name, topVisible, topHidden, topHiddenCount, visible.length);
  const discoveryParts: string[] = [compareInsight];
  if (weakestActive || purelyAbsentCategories.length > 0) {
    const gapNote = purelyAbsentCategories.length > 0
      ? `게다가 ${purelyAbsentCategories.join("·")} 쪽은 아예 원국에 없어, 유독 그 방식에서만 유난히 낯설게 느껴지는 이유도 여기서 함께 설명됩니다.`
      : `게다가 ${weakestActive}이 상대적으로 약하게 자리 잡고 있어, 왜 유독 그 영역에서만 힘이 더 드는지도 여기서 함께 설명됩니다.`;
    discoveryParts.push(gapNote);
  }
  sections.push({ heading: "第一章의 발견", body: [discoveryParts.join(" ")] });

  return {
    sections,
    visual: { visible, hidden, compareInsight, easy, effortful },
  };
}
