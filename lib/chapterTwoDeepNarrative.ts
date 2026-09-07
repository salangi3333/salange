import { AppData } from "./sajuContent";
import { analyzeCategoryStrength, SipseongCategory, CategoryStrength } from "./strengthAnalysis";
import { analyzeWealthCategoryStrength } from "./wealthStrengthAnalysis";
import { compareCategories } from "./chapterFourInterpretation";

/**
 * 第二章 유료 심화 — "내 안의 여러 힘은 어떤 순서와 조합으로 움직이는가".
 *
 * 2026-09 재설계(승인된 구조): 第一章이 "겉과 속에 어떤 힘이 있는가"를
 * 다뤘다면, 이 파일은 "그 힘들이 상황에 따라 어떤 순서로 나서는가"만
 * 다룬다. "가장 강한 힘은 ○○입니다" 재설명, 강점/그림자 사전식 서술,
 * 평소/압박 대비는 이번 개정에서 전부 제거했다 — 第一章과 겹치는
 * 질문이었다. 대신 top×second의 관계(돕는지/당기는지), 일·돈·관계·
 * 선택 4영역에서 실제로 어느 힘이 먼저 나서는지, 판단의 흐름(순서)을
 * 새 질문으로 삼는다.
 *
 * 새 명리 계산은 하지 않는다. 재사용하는 함수:
 *  - analyzeCategoryStrength(strengthAnalysis.ts) — active[](count>0,
 *    total 내림차순), top, second, tier.
 *  - analyzeWealthCategoryStrength(wealthStrengthAnalysis.ts) — byCategory
 *    (compareCategories 호출에 필요한 형태 그대로 재사용).
 *  - compareCategories(chapterFourInterpretation.ts, export된 기존 함수) —
 *    두 카테고리의 세력 격차(gapTier)만, 새 판정 없음.
 *
 * "일/돈/관계/선택에서 어느 힘이 먼저 나서는가"(④)는 새 계산이 아니라,
 * 이 사람에게 실제로 존재하는 카테고리(active) 중 각 영역과 전통적으로
 * 가장 밀접한 카테고리를 고정 우선순위표(DOMAIN_PRIORITY, 아래 설명)로
 * 고르는 "선택 로직"이다 — gwiinSinsalNarrative.ts의 PRIORITY_ORDER와
 * 같은 패턴(고정 편집 우선순위, 새 점수 아님)이다.
 */

const CATEGORY_HANJA: Record<SipseongCategory, string> = {
  비겁: "比劫", 식상: "食傷", 재성: "財星", 관성: "官星", 인성: "印星",
};

// 상생 순환(비겁→식상→재성→관성→인성→비겁) — 기존 여러 파일과 동일한 관계.
const CATEGORY_HELPS: Record<SipseongCategory, SipseongCategory> = {
  비겁: "식상", 식상: "재성", 재성: "관성", 관성: "인성", 인성: "비겁",
};
// 상극 관계 — wealthTimingAnalysis.ts의 ATTACKS와 동일.
const CATEGORY_ATTACKS: Record<SipseongCategory, SipseongCategory> = {
  비겁: "재성", 식상: "관성", 재성: "인성", 관성: "비겁", 인성: "식상",
};

function josaGwaWa(word: string): "과" | "와" {
  const last = word.charCodeAt(word.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return "와";
  return (last - 0xac00) % 28 === 0 ? "와" : "과";
}
function josaEunNeun(word: string): "은" | "는" {
  const last = word.charCodeAt(word.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return "는";
  return (last - 0xac00) % 28 === 0 ? "는" : "은";
}

export interface CategoryBarItem {
  category: SipseongCategory;
  rank: number;
  /** min-max로 정규화한 상대 길이(0~100). 절대 점수 아님. */
  widthPercent: number;
}

export type DomainArea = "일" | "돈" | "관계" | "선택";

export interface DomainCard {
  area: DomainArea;
  category: SipseongCategory;
  lead: string;
  detail: string;
}

export interface ChapterTwoDeepSection {
  heading: string;
  body: string[];
}

export interface ChapterTwoDeepVisual {
  bars: CategoryBarItem[];
  domains: DomainCard[];
}

export interface ChapterTwoDeepResult {
  sections: ChapterTwoDeepSection[];
  visual: ChapterTwoDeepVisual;
}

// ────────────────────────────────────────────────────────────────
// ② 이 힘이 먼저 튀어나오는 "상황"(성격 재설명이 아니라 트리거 장면).
// ────────────────────────────────────────────────────────────────
const TRIGGER_TEXT: Record<SipseongCategory, string> = {
  비겁: "누구도 먼저 결정을 안 내리고 눈치만 보는 상황일수록, 이 힘이 가장 먼저 튀어나와 방향을 정합니다.",
  식상: "생각이나 감정을 계속 담아만 둬야 하는 상황일수록, 이 힘이 가장 먼저 튀어나와 그걸 밖으로 꺼내려 합니다.",
  재성: "결과가 애매하게 흐려지거나 손해를 볼 수도 있는 상황일수록, 이 힘이 가장 먼저 튀어나와 실익부터 따집니다.",
  관성: "누가 책임질지 불분명한 상황일수록, 이 힘이 가장 먼저 튀어나와 그 몫을 떠맡습니다.",
  인성: "정보가 부족하거나 아직 다 이해되지 않은 상황일수록, 이 힘이 가장 먼저 튀어나와 판단을 미룹니다.",
};

// ────────────────────────────────────────────────────────────────
// ③ top × second — 보완하는지 번갈아 나오는지(compareCategories 재사용).
// ────────────────────────────────────────────────────────────────
const SECOND_ROLE_TEXT: Record<SipseongCategory, string> = {
  비겁: "특히 스스로 판단해야 하는 순간에 슬쩍 끼어듭니다.",
  식상: "특히 생각을 표현해야 하는 순간에 슬쩍 끼어듭니다.",
  재성: "특히 결과와 실익이 걸린 순간에 슬쩍 끼어듭니다.",
  관성: "특히 책임 소재가 걸린 순간에 슬쩍 끼어듭니다.",
  인성: "특히 아직 다 이해되지 않은 순간에 슬쩍 끼어듭니다.",
};

// ────────────────────────────────────────────────────────────────
// ④ 일/돈/관계/선택 — 카테고리별 리드 문장(기존 WORK_MONEY_RELATION_CHOICE
// 재배치) + 1문장 추가 설명.
// ────────────────────────────────────────────────────────────────
const DOMAIN_LEAD: Record<SipseongCategory, Record<DomainArea, string>> = {
  비겁: {
    일: "일할 때는 남이 정해준 방식보다 스스로 정한 방식을 고집하는 편입니다.",
    돈: "돈을 다룰 때는 남과 나누기보다 스스로 벌고 스스로 쓰는 쪽을 편해합니다.",
    관계: "관계에서는 먼저 기대기보다, 자기 몫을 스스로 해내는 사람으로 남고 싶어 합니다.",
    선택: "선택할 때는 여러 의견을 듣더라도 결국은 자기 판단으로 마무리를 짓습니다.",
  },
  식상: {
    일: "일할 때는 생각을 눈에 보이는 결과물로 바로바로 만들어내야 직성이 풀립니다.",
    돈: "돈을 다룰 때는 아끼기보다, 하고 싶은 것에 먼저 쓰고 나중에 조정하는 편입니다.",
    관계: "관계에서는 감정과 생각을 숨기지 않고 먼저 표현하는 쪽입니다.",
    선택: "선택할 때는 오래 재기보다, 일단 해보면서 방향을 잡아가는 편입니다.",
  },
  재성: {
    일: "일할 때는 과정보다 결과, 특히 손에 남는 실익을 우선 따집니다.",
    돈: "돈을 다룰 때는 계획적으로 관리하고, 손해 보는 선택은 웬만하면 피합니다.",
    관계: "관계에서는 상대에게 무엇을 줄 수 있고 무엇을 받을 수 있는지를 은연중에 가늠합니다.",
    선택: "선택할 때는 감정보다 실제 이득과 손해를 먼저 계산합니다.",
  },
  관성: {
    일: "일할 때는 정해진 기준과 마감을 스스로 지키려는 마음이 강합니다.",
    돈: "돈을 다룰 때는 무리한 지출보다, 책임질 수 있는 범위 안에서 움직이려 합니다.",
    관계: "관계에서는 맡은 역할을 다하는 것으로 신뢰를 쌓으려 합니다.",
    선택: "선택할 때는 자유로운 쪽보다, 원칙에 맞는 쪽을 우선 고려합니다.",
  },
  인성: {
    일: "일할 때는 충분히 이해하고 준비가 끝난 뒤에야 손을 대는 편입니다.",
    돈: "돈을 다룰 때는 급하게 쓰기보다, 필요성을 충분히 따진 뒤에 움직입니다.",
    관계: "관계에서는 상대를 이해하려는 마음이 앞서, 먼저 들어주는 역할을 자주 맡습니다.",
    선택: "선택할 때는 서두르지 않고, 정보와 이해가 충분히 쌓인 뒤에야 결정합니다.",
  },
};

const DOMAIN_DETAIL: Record<DomainArea, string> = {
  일: "이 결은 원국에 실제로 자리 잡은 힘이라, 애써 꾸미지 않아도 일하는 방식에 자연스럽게 묻어납니다.",
  돈: "이 판단도 별다른 고민 없이 먼저 튀어나오는 편이라, 돈 앞에서 유독 망설임이 적습니다.",
  관계: "그래서 관계 안에서도 이 태도가 다른 모습보다 먼저 눈에 띄는 편입니다.",
  선택: "결국 중요한 선택일수록 이 기준이 가장 먼저 작동합니다.",
};

/** 각 영역과 전통적으로 가장 밀접한 카테고리 우선순위 — 새 계산이 아니라
 * "이 사람에게 실제로 있는(active) 카테고리 중 무엇을 이 영역의 대표로
 * 고를지" 고르는 고정 우선순위표다(편집 우선순위 패턴, PRIORITY_ORDER와
 * 동일 원칙). 사람마다 active 구성이 달라 결과가 달라진다. */
const DOMAIN_PRIORITY: Record<DomainArea, SipseongCategory[]> = {
  일: ["관성", "식상", "재성", "비겁", "인성"],
  돈: ["재성", "식상", "관성", "비겁", "인성"],
  관계: ["식상", "인성", "관성", "재성", "비겁"],
  선택: ["비겁", "인성", "관성", "식상", "재성"],
};

const HELPS_FLAVOR: Record<SipseongCategory, string> = {
  비겁: "스스로 정한 방향이 뚜렷할수록, 그 방향을 실제로 밀고 나가는 힘도 함께 커집니다.",
  식상: "생각과 표현이 쌓일수록, 그것이 실제 결과물이나 실익으로 이어지는 힘도 함께 커집니다.",
  재성: "손에 잡히는 결과가 쌓일수록, 그것을 지키고 관리하는 책임의 힘도 함께 커집니다.",
  관성: "맡은 책임이 뚜렷할수록, 그 책임을 근거로 스스로를 다독이는 힘도 함께 커집니다.",
  인성: "이해와 정리가 충분히 쌓일수록, 그것을 스스로의 판단으로 세우는 힘도 함께 커집니다.",
};

const TENSION_FLAVOR: Record<SipseongCategory, string> = {
  비겁: "자기 중심을 지키려는 마음과, 손에 쥔 것을 나누지 않으려는 마음이 같은 자리에서 부딪힙니다.",
  식상: "표현하고 싶은 마음과, 정해진 기준을 지켜야 한다는 마음이 같은 자리에서 부딪힙니다.",
  재성: "실익을 챙기려는 마음과, 안정을 지키려는 마음이 같은 자리에서 부딪힙니다.",
  관성: "책임을 다하려는 마음과, 자기 방식대로 밀고 나가려는 마음이 같은 자리에서 부딪힙니다.",
  인성: "충분히 이해한 뒤 움직이려는 마음과, 빠르게 표현하고 싶은 마음이 같은 자리에서 부딪힙니다.",
};

// ⑦ 판단 순서 — "가장 먼저/그다음/마지막" 확인하는 것.
const CHECK_CLAUSE: Record<SipseongCategory, string> = {
  비겁: "이게 내가 정할 수 있는 일인지부터 봅니다",
  식상: "이걸 어떻게 표현하고 풀어낼지를 생각합니다",
  재성: "실제로 남는 게 무엇인지를 따집니다",
  관성: "지켜야 할 기준이 무엇인지를 봅니다",
  인성: "충분히 이해가 됐는지를 확인합니다",
};
const RANK_LEAD = ["먼저 ", "그다음으로는 ", "마지막으로는 "];

function buildBars(active: CategoryStrength[]): CategoryBarItem[] {
  if (active.length === 0) return [];
  const totals = active.map((a) => a.total);
  const min = Math.min(...totals);
  const max = Math.max(...totals);
  return active.map((a, idx) => ({
    category: a.category,
    rank: idx + 1,
    widthPercent: max === min ? 60 : Math.round(20 + ((a.total - min) / (max - min)) * 80),
  }));
}

function buildDomains(activeCategories: Set<SipseongCategory>, top: SipseongCategory | null): DomainCard[] {
  if (!top) return [];
  const areas: DomainArea[] = ["일", "돈", "관계", "선택"];
  return areas.map((area) => {
    const picked = DOMAIN_PRIORITY[area].find((c) => activeCategories.has(c)) ?? top;
    return {
      area,
      category: picked,
      lead: DOMAIN_LEAD[picked][area],
      detail: DOMAIN_DETAIL[area],
    };
  });
}

export function buildChapterTwoDeepNarrative(appData: AppData): ChapterTwoDeepResult {
  const user = appData.user;
  const name = user.name;
  const strength = analyzeCategoryStrength(user);
  const wealth = analyzeWealthCategoryStrength(user);

  const active = strength.active; // count>0, total 내림차순
  const activeCategories = new Set(active.map((a) => a.category));
  const top = strength.top?.category ?? null;
  const second = strength.second?.category ?? null;

  const sections: ChapterTwoDeepSection[] = [];

  // ① Opening — "한 가지 힘만 있는 게 아니다" ─────────────────────
  if (active.length > 0) {
    const listClause = active.map((a) => a.category).join("·");
    const shapeClause =
      strength.tier === "A"
        ? `그중 ${top}${top ? josaGwaWa(top) : ""} 확실히 앞서 있어, 이 사람을 이끄는 힘은 비교적 또렷한 편입니다.`
        : `그중 하나가 압도적으로 앞서기보다, 몇 개의 힘이 비슷한 무게로 함께 자리하고 있습니다.`;
    sections.push({
      heading: "당신 안에는 한 가지 힘만 있는 것이 아닙니다",
      body: [
        `${name}님의 명식에는 ${listClause}, 이렇게 ${active.length}개의 힘이 실제로 함께 자리하고 있습니다.`,
        `${shapeClause} 문제는 "무엇이 가장 강한가"가 아니라, 이 여러 힘이 상황에 따라 어떤 순서로 앞에 나서는가입니다.`,
      ],
    });
  } else {
    sections.push({
      heading: "당신 안에는 한 가지 힘만 있는 것이 아닙니다",
      body: [`${name}님은 다섯 가지 힘이 어느 하나 두드러지지 않고 고르게 섞여 있습니다. 그만큼 상황 자체가 어떤 힘을 불러내는지가 더 크게 작동합니다.`],
    });
  }

  // ② 내 안에서 먼저 움직이는 힘 ────────────────────────────────
  if (top) {
    sections.push({
      heading: "내 안에서 먼저 움직이는 힘",
      body: [
        `이 사람 안에서 가장 먼저 앞에 나서는 힘은 ${top}(${CATEGORY_HANJA[top]})입니다. ${TRIGGER_TEXT[top]}`,
      ],
    });
  }

  // ③ 그 다음에 움직이는 힘 ────────────────────────────────────
  if (top && second) {
    const cmp = compareCategories(wealth, top, second);
    const relateClause =
      cmp.gapTier === "비슷"
        ? `두 힘의 크기가 비슷해서, 상황에 따라 어느 쪽이 먼저 나설지가 그때그때 갈립니다.`
        : `다만 ${top}보다는 한 걸음 물러선 자리에서, 필요할 때만 존재감을 드러냅니다.`;
    sections.push({
      heading: "그 다음에 움직이는 힘",
      body: [
        `${top} 다음으로는 ${second}이 자리하고 있습니다. ${SECOND_ROLE_TEXT[second]}`,
        relateClause,
      ],
    });
  } else if (top) {
    sections.push({
      heading: "그 다음에 움직이는 힘",
      body: [`이 사람에게는 ${top}에 견줄 만한 두 번째 축이 뚜렷하지 않습니다. 그만큼 ${top} 하나의 색이 여러 상황에 걸쳐 비교적 일관되게 이어집니다.`],
    });
  }

  // ④ 상황에 따라 달라지는 나 — 4분면 카드 ───────────────────────
  const domains = buildDomains(activeCategories, top);
  if (domains.length > 0) {
    const distinctInDomains = new Set(domains.map((d) => d.category)).size;
    sections.push({
      heading: "상황에 따라 달라지는 나",
      body: [
        distinctInDomains >= 2
          ? `일할 때, 돈을 다룰 때, 사람을 대할 때, 선택할 때 — 네 상황에서 항상 같은 힘만 나서는 건 아닙니다. 아래 네 장면을 보면, 그때그때 앞에 나서는 힘이 조금씩 다릅니다.`
          : `일할 때, 돈을 다룰 때, 사람을 대할 때, 선택할 때 — 네 상황 모두에서 ${top} 하나가 비교적 일관되게 앞장섭니다.`,
      ],
    });
  }

  // ⑤ 두 힘이 잘 맞을 때 ──────────────────────────────────────
  if (top && second) {
    const helps = CATEGORY_HELPS[top] === second || CATEGORY_HELPS[second] === top;
    if (helps) {
      const donor = CATEGORY_HELPS[top] === second ? top : second;
      sections.push({
        heading: "두 힘이 잘 맞을 때",
        body: [
          `${top}${josaGwaWa(top)} ${second}은 원래 서로를 밀어주는 관계입니다. ${HELPS_FLAVOR[donor]}`,
          `이 두 힘이 함께 있다는 것이 꽤 중요합니다 — 한쪽만으로는 멈출 수 있는 흐름이, 다른 쪽 덕분에 계속 이어질 수 있기 때문입니다.`,
        ],
      });
    } else {
      sections.push({
        heading: "두 힘이 잘 맞을 때",
        body: [
          `${top}${josaGwaWa(top)} ${second}은 서로를 직접 밀어주는 관계는 아니지만, 서로의 영역을 침범하지 않고 각자 다른 자리에서 독립적으로 작동합니다 — 그래서 한쪽이 바쁠 때 다른 쪽이 조용히 제 몫을 지킵니다.`,
        ],
      });
    }
  }

  // ⑥ 두 힘이 서로 당길 때 — 실제 충돌 관계일 때만 표시 ────────────
  if (top && second) {
    const attacks = CATEGORY_ATTACKS[top] === second || CATEGORY_ATTACKS[second] === top;
    if (attacks) {
      const attacker = CATEGORY_ATTACKS[top] === second ? top : second;
      sections.push({
        heading: "두 힘이 서로 당길 때",
        body: [
          `${top}${josaGwaWa(top)} ${second}은 원래 서로 부딪히는 관계입니다. 같은 상황에서도 마음이 두 갈래로 갈릴 때가 있습니다.`,
          TENSION_FLAVOR[attacker],
        ],
      });
    }
    // 충돌 관계가 아니면 이 섹션 자체를 만들지 않는다(억지 갈등 금지).
  }

  // ⑦ 내가 결정을 내리는 순서 ──────────────────────────────────
  if (active.length > 0) {
    const order = active.slice(0, 3).map((a) => a.category);
    const flow = order.map((cat, idx) => `${RANK_LEAD[idx]}${CHECK_CLAUSE[cat]}.`).join(" ");
    sections.push({
      heading: "내가 결정을 내리는 순서",
      body: [
        order.length > 1
          ? `${name}님이 무언가를 판단할 때는 대체로 이런 순서를 밟습니다. ${flow}`
          : `${name}님은 판단의 순서를 따로 나눌 필요가 없을 만큼, ${order[0]}이라는 하나의 기준으로 곧장 움직입니다. ${flow}`,
      ],
    });
  }

  // ⑧ 第二章의 발견 ─────────────────────────────────────────────
  if (top) {
    const parts: string[] = [];
    if (second) {
      const helps = CATEGORY_HELPS[top] === second || CATEGORY_HELPS[second] === top;
      const attacks = CATEGORY_ATTACKS[top] === second || CATEGORY_ATTACKS[second] === top;
      if (helps) {
        parts.push(`${top}${josaGwaWa(top)} ${second}이 서로 밀어주는 관계라는 것이, 이 사람이 한 가지 방향을 오래 밀고 나갈 수 있는 이유입니다.`);
      } else if (attacks) {
        parts.push(`${top}${josaGwaWa(top)} ${second}이 서로 부딪히는 관계라는 것이, 이 사람 안에서 마음이 두 갈래로 갈리는 순간이 실제로 있는 이유입니다.`);
      } else {
        parts.push(`${top}${josaEunNeun(top)} 앞장서고 ${second}이 그 뒤를 받치는 구조라, 이 사람은 한 가지 색으로만 설명되지 않습니다.`);
      }
    } else {
      parts.push(`${top} 하나가 거의 모든 상황을 관통한다는 것이, 이 사람이 유독 일관돼 보이는 이유입니다.`);
    }
    const distinctInDomains = new Set(domains.map((d) => d.category)).size;
    if (distinctInDomains >= 2) {
      parts.push(`그리고 일·돈·관계·선택에서 매번 같은 힘만 나서지 않는다는 것도, 겉으로 보이는 모습만으로는 이 사람을 다 설명할 수 없는 이유 중 하나입니다.`);
    }
    sections.push({ heading: "第二章의 발견", body: [parts.join(" ")] });
  }

  return { sections, visual: { bars: buildBars(active), domains } };
}
