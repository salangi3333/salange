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
  비겁: "친구들과 돈 얽힌 일—더치페이든 투자 권유든—이 생기면, 분위기에 휩쓸려 대충 넘어가지 않고 자기 몫은 정확히 따지는 사람으로 보입니다. 가끔은 그 꼼꼼함 때문에 '너무 깐깐하다'는 말을 듣기도 합니다.",
  식상: "생각이 정리되면 굳이 눈치 보지 않고 먼저 말을 꺼내는 사람으로 보입니다. 하고 싶은 말을 오래 담아두는 쪽은 아닙니다.",
  재성: "말보다 결과로 증명하려는 사람으로 보입니다. '일단 해보고 보여줄게'라는 말이 자연스럽게 나옵니다.",
  관성: "정해진 약속이나 마감을 어기는 걸 유독 못 견디는 사람으로 보입니다. 남들은 대충 넘어가도 본인만은 그러지 못합니다.",
  인성: "누가 급하게 답을 채근해도, 확신이 서기 전까진 '조금만 더 생각해볼게'라는 말이 자연스럽게 나오는 사람으로 보입니다.",
};

const SURFACE_TEXT_REPEATED: Record<SipseongCategory, string> = {
  비겁: "그것도 어쩌다 한 번이 아니라, 자기 몫을 분명히 챙기는 모습이 살아오면서 여러 번 되풀이해서 겉으로 드러났을 가능성이 큽니다.",
  식상: "그것도 어쩌다 한 번이 아니라, 생각을 먼저 꺼내는 모습이 살아오면서 여러 번 되풀이해서 겉으로 드러났을 가능성이 큽니다.",
  재성: "그것도 어쩌다 한 번이 아니라, 결과로 증명하려는 모습이 살아오면서 여러 번 되풀이해서 겉으로 드러났을 가능성이 큽니다.",
  관성: "그것도 어쩌다 한 번이 아니라, 약속과 마감을 지키려는 모습이 살아오면서 여러 번 되풀이해서 겉으로 드러났을 가능성이 큽니다.",
  인성: "그것도 어쩌다 한 번이 아니라, 신중하게 움직이는 모습이 살아오면서 여러 번 되풀이해서 겉으로 드러났을 가능성이 큽니다.",
};

// "구조를 쉬운 말로 설명"(힘/작동/안팎 같은 표현)이 아니라, 실제 행동·
// 선택·반응으로 바로 번역한다 — "안쪽에도 힘이 있다"가 아니라 "이런
// 순간엔 이렇게 한다"로 말한다.
const HIDDEN_TEXT: Record<SipseongCategory, string> = {
  비겁: "남 앞에서는 '너 하고 싶은 대로 해'라고 쿨하게 말해놓고도, 정작 중요한 일 앞에서는 결국 자기 뜻대로 결론을 내리고야 맙니다.",
  식상: "그 자리에선 웃으며 넘어가 놓고도, 나중에 결국 하고 싶었던 말을 꺼내고야 마는 편입니다.",
  재성: "'괜찮아, 신경 안 써'라고 말은 하면서도, 속으로는 이미 손해 본 부분을 다 계산해놓고 있는 경우가 많습니다.",
  관성: "겉으로는 '괜찮아, 나중에 해도 돼'라고 말해도, 맡은 걸 끝내기 전까진 머릿속에서 그 일이 떠나질 않습니다.",
  인성: "겉으로는 '어, 그런가 보다' 하고 넘기는 척해도, 혼자 있을 때 그 일을 몇 번이고 곱씹고 나서야 진짜로 넘어갑니다.",
};

/** "안팎에서 같은 글자가 드러나 있어" 같은 계산 근거 대신, 같은 힘이
 * 더 일관되고 몸에 밴 형태로 나타난다는 걸 행동으로 보여준다 — "본인이
 * 읽으면 찔릴 만큼" 구체적인 순간까지 내려간다. */
const HIDDEN_TEXT_ROOTED: Record<SipseongCategory, string> = {
  비겁: "다른 사람의 이야기를 충분히 듣더라도 중요한 결정은 결국 스스로 내려야 마음이 놓이는 편입니다. 한번 자기 기준이 서고 나면 주변의 말만으로 쉽게 방향을 바꾸지는 않습니다.",
  식상: "속상한 일이 있어도 며칠은 참을 수 있지만, 결국은 말로든 행동으로든 티가 나고야 맙니다. 끝까지 아무 일 없는 척하는 건 본인에게도 잘 안 되는 일입니다.",
  재성: "무언가 손해를 봤다 싶으면, 아무리 아닌 척해도 표정이나 말투에서 티가 나고야 맙니다. 스스로도 숨기고 싶은데 잘 안 되는 부분입니다.",
  관성: "아무도 확인하지 않는 순간에도, 맡은 일을 대충 끝내는 건 스스로 용납이 안 됩니다. 그래서 '어차피 아무도 몰라'라는 말이 본인에게는 잘 통하지 않습니다.",
  인성: "누가 다그쳐도 이해가 안 되면 절대 먼저 움직이지 않지만, 한번 납득하고 나면 누가 뭐라 해도 그 판단을 쉽게 놓지 않습니다.",
};

// ④ "겉과 속이 다르다"의 실제 생활 장면 — 두 힘이 부딪히는 구체적 순간.
const GAP_SCENE_TEXT: Record<SipseongCategory, string> = {
  비겁: "겉으론 이미 정리된 것처럼 말하다가도, 정작 혼자 남으면 그 판단을 처음부터 다시 짚어보는 순간이 있습니다.",
  식상: "겉으론 담담하게 넘기고도, 집에 돌아와서야 하고 싶었던 말이 뒤늦게 올라오는 순간이 있습니다.",
  재성: "겉으론 신경 안 쓰는 척 넘어가도, 속으로는 이미 손익 계산을 몇 번이나 끝낸 뒤였을 수 있습니다.",
  관성: "겉으론 여유로워 보여도, 맡은 몫을 다 끝내기 전까진 마음 한구석이 계속 불편했을 수 있습니다.",
  인성: "겉으론 바로 받아들인 것처럼 보여도, 실제로 납득이 되기까지는 시간이 훨씬 더 걸렸을 수 있습니다.",
};

// ④ "겉과 속이 같다"일 때의 실제 생활 장면 — "본인이 읽으면 찔릴 만큼"
// 구체적인 순간까지 내려간다.
const MATCH_SCENE_TEXT: Record<SipseongCategory, string> = {
  비겁: "싫은데 좋은 척하거나, 마음에도 없는 말을 오래 하는 데는 익숙하지 않습니다. 겉으로는 맞춰주는 것처럼 보여도 중요한 문제에서는 결국 자기 마음과 다른 선택을 오래 끌고 가지 못합니다.",
  식상: "괜찮은 척 애써 참아보려 해도, 오래가지 못하고 결국 티가 나 버립니다. 마음에 없는 말을 태연하게 오래 하는 건 본인에게 더 힘든 일입니다.",
  재성: "이해득실을 따지지 않는 척해도, 결국 표정이나 행동에서 계산이 다 드러나고 맙니다. 완전히 손해를 본 척 웃어넘기는 건 오래 못 갑니다.",
  관성: "책임질 일 앞에서 '괜찮아, 별거 아니야'라고 말해도, 실제로 느끼는 부담은 말한 것보다 훨씬 무겁습니다.",
  인성: "급한 척 서두르는 모습을 보여도, 결국 확신이 서지 않으면 몸이 먼저 멈춰 섭니다. 서두르는 연기는 오래가지 못하는 편입니다.",
};

// ⑤ 일간의 기본 성질 위에 top 축이 얹힐 때 실제로 달라지는 결.
const AXIS_OVERLAY_TEXT: Record<SipseongCategory, string> = {
  비겁: "자기 힘으로 서려는 성향까지 강하게 더해져서, 큰 선택 앞에서는 남들 의견은 참고해도 마지막 서명은 결국 혼자 하고 나서야 마음이 놓이는, '내 방식대로 해내야 직성이 풀리는' 사람이 됩니다.",
  식상: "생각을 밖으로 풀어내려는 성향까지 강하게 더해져서, '표현하지 않고는 못 배기는' 사람이 됩니다.",
  재성: "실익을 따지는 성향까지 강하게 더해져서, '결과로 확인해야 안심이 되는' 사람이 됩니다.",
  관성: "책임을 지키려는 성향까지 강하게 더해져서, '맡은 것은 반드시 끝을 봐야 하는' 사람이 됩니다.",
  인성: "이해하고 받아들이려는 성향까지 강하게 더해져서, '충분히 납득해야만 움직이는' 사람이 됩니다.",
};

// ⑥ "쉽게 쓰는 힘" — 애써 꺼내지 않아도 먼저 나온다는 설명.
const EASY_TEXT: Record<SipseongCategory, string> = {
  비겁: "다투고 나서도 남들처럼 대충 화해하는 척 얼버무리지 못합니다. 내가 납득이 안 되면 그 얘기를 다시 꺼내서라도 끝을 보려는 편이라, 상대는 가끔 '왜 그 얘기를 또 해'라며 지쳐하기도 합니다.",
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

// 완전 부재(겉에도 지장간에도 없음) 카테고리용 — "겉에도 안에도 나타나지
// 않습니다" 같은 계산 결과 서술 대신, 그 카테고리가 없을 때 실제로 어떻게
// 다르게 행동하는지를 구체적으로 말한다.
const ABSENT_SCENE: Record<SipseongCategory, string> = {
  비겁: "남들과 경쟁하듯 내 몫부터 챙기는 건 이 사람에게는 낯선 방식입니다. 굳이 앞장서서 내 의견부터 내세우지 않아도 크게 불편하지 않은 편입니다.",
  식상: "속에 있는 생각을 먼저 나서서 꺼내는 건 이 사람에게는 낯선 방식입니다. 하고 싶은 말이 있어도 굳이 먼저 꺼내지 않고 넘어가는 경우가 많습니다.",
  재성: "눈에 보이는 결과로 서둘러 증명하려는 건 이 사람에게는 낯선 방식입니다. 손에 잡히는 걸 급하게 좇기보다, 그 자리에 그냥 머무는 쪽이 더 편합니다.",
  관성: "규칙과 책임을 앞세워 스스로를 몰아붙이는 건 이 사람에게는 낯선 방식입니다. 정해진 틀에 맞추기보다, 상황에 따라 유연하게 움직이는 쪽에 가깝습니다.",
  인성: "일단 멈춰서 충분히 이해한 뒤에야 움직이는 건 이 사람에게는 낯선 방식입니다. 재고 따지기보다, 몸이 먼저 반응하는 쪽에 가깝습니다.",
};

function buildCompareInsight(
  name: string,
  topVisible: SipseongCategory | null,
  topHidden: SipseongCategory | null,
  hiddenCount: number,
  visibleCount: number
): string {
  if (topVisible && topHidden && topVisible !== topHidden) {
    return `처음 만난 사람은 겉에 보이는 모습만 보고 판단하기 쉽지만, 정작 위기의 순간에 진짜 힘을 발휘하는 건 안에 있는 ${topHidden} 쪽입니다.`;
  }
  if (topVisible && topHidden && topVisible === topHidden) {
    // 바로 위 "겉과 속이 같은 이유" 섹션이 MATCH_SCENE_TEXT로 이미 구체적인
    // 장면을 보여줬으므로, 여기서는 같은 문장을 반복하지 않고 짧게
    // 마무리만 한다.
    return `그래서 오래 지켜봐도 '어? 이런 면도 있었네' 싶은 반전이 잘 없습니다. 처음 본 모습 그대로, 시간이 지날수록 오히려 더 확실해지는 쪽입니다.`;
  }
  if (topVisible && !topHidden) {
    return `겉으로 보이는 모습이 거의 전부인 사람입니다. 따로 숨겨둔 속내를 캐내려 해도, 사실 더 나올 게 별로 없는 편입니다.`;
  }
  if (!topVisible && topHidden) {
    return `처음엔 특별히 이렇다 할 인상을 주지 않지만, 정작 결정적인 순간에 이 사람을 움직이는 건 겉으로 잘 안 보였던 ${topHidden} 쪽입니다.`;
  }
  return `${name}님은 '한마디로 이런 사람이다'라고 딱 잘라 말하기 어려운, 상황에 따라 여러 모습이 고르게 섞여 나오는 사람입니다.`;
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
    const distinctVisibleLabels = new Set(visible.filter((v) => v.category === topVisible).map((v) => v.sipseong));
    sections.push({
      heading: "",
      body: [
        `${name}님을 처음 보는 사람이 가장 먼저 느끼는 결은 ${topVisible}입니다. ${
          distinctVisibleLabels.size >= 2 ? SURFACE_TEXT_REPEATED[topVisible] : SURFACE_TEXT[topVisible]
        }`,
        `이건 숨겨진 성향이 아니라 처음 만난 사람도 어느 정도는 짐작할 수 있는, 겉으로 그대로 드러나는 모습입니다.`,
      ],
    });
  } else {
    sections.push({
      heading: "",
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
    // 연결 문장 — 겉(②)에서 안(③)으로 넘어가는 지점, 발견이 있을 때만.
    // 지장간·투간 같은 계산 근거 용어는 메커니즘으로 설명하지 않고,
    // 결과(겉과 속 어느 쪽이 실제로 이 사람을 움직이는가)만 번역한다.
    const bridge = isPurelyHidden
      ? `겉으로 드러난 모습만 보면 여기까지입니다. 그런데 이 사람에게는 조금 다른 면이 하나 더 있습니다.`
      : `그런데 여기서 끝이 아닙니다.`;
    // touCount>0("뿌리내림")일 땐 HIDDEN_TEXT_ROOTED 자체가 이미 2문장
    // 분량의 구체적 행동 묘사라 별도 요약 문장을 덧붙이지 않는다 —
    // "뿌리가 겉까지 이어져 있으면 힘이라고 볼 수 있습니다" 같은 구조
    // 재설명을 반복하지 않기 위함.
    sections.push({
      heading: "",
      body:
        touCount > 0
          ? [bridge, HIDDEN_TEXT_ROOTED[cat]]
          : [
              bridge,
              HIDDEN_TEXT[cat],
              `다만 본인도 이걸 스스로 자각하기 전까지는, 왜 그렇게 느끼는지 잘 설명하지 못하는 편입니다.`,
            ],
    });
  } else {
    sections.push({
      heading: "",
      body: [
        `안에서도 특별히 두드러지는 기운은 없습니다. 겉과 속이 비슷한 무게로 섞여 있어, 안에서 따로 작동하는 힘보다는 겉으로 보이는 모습 자체가 비교적 이 사람의 실제 모습에 가깝습니다.`,
      ],
    });
  }

  // ④ 겉과 속이 같은가 다른가 — 실제 생활 장면까지 ─────────────────
  if (topVisible && topHidden) {
    if (topVisible === topHidden) {
      sections.push({
        heading: "",
        body: [
          `겉으로 보이는 모습과 실제 속마음 사이에 거리가 크지 않은 사람입니다. 겉과 속이 이 정도로 그대로 이어지는 경우는 흔치 않습니다 — 보이는 모습과 실제 속마음의 간극이 크지 않다는 뜻입니다.`,
          MATCH_SCENE_TEXT[topVisible],
        ],
      });
    } else {
      sections.push({
        heading: "",
        body: [
          `겉에서 보이는 모습과 실제 속마음이 다르면, 살면서 어떤 식으로 드러날까요? 겉으로는 ${topVisible}${josaEunNeun(topVisible)} 먼저 보이지만, 정작 마음을 움직이는 건 ${topHidden}일 때가 많습니다.`,
          `아마 이런 순간이 있었을 겁니다. ${GAP_SCENE_TEXT[topHidden]}`,
          `겉모습이 거짓이라서가 아니라, 정작 그 순간엔 ${topHidden} 쪽 마음이 더 크게 움직였기 때문입니다 — 그래서 오래 지켜본 사람일수록 "처음 봤을 때랑 좀 다르다"는 인상을 받기 쉽습니다.`,
        ],
      });
    }
  }

  // ⑤ 같은 일간이어도 이 사람이 다른 이유 ─────────────────────────
  if (topVisible) {
    const gan = GAN_PROFILE[dayGan];
    sections.push({
      heading: "",
      body: [
        `여기서 한 가지 더 짚어볼 부분이 있습니다. "${gan.image}" 같은 면 위에, ${AXIS_OVERLAY_TEXT[topVisible]}`,
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
      body.push(`그렇다면 어디서는 힘이 덜 들고, 어디서는 더 힘이 들까요? ${EASY_TEXT[mainEasy]} 굳이 의식하지 않아도 몸에 밴 것처럼 나옵니다.`);
    }
    if (weakestActive) {
      body.push(`반면 이 부분은 아예 못 하는 건 아니지만, 남들보다 덜 자연스럽습니다. ${EFFORTFUL_TEXT[weakestActive]}`);
    }
    if (purelyAbsentCategories.length > 0) {
      const scenes = purelyAbsentCategories.map((c) => ABSENT_SCENE[c]).join(" ");
      body.push(`그리고 여기서 한 가지가 더 보입니다. ${scenes} "없다/부족하다"보다는, 이 사람에게는 애초에 그 방식이 낯설다는 뜻에 가깝습니다.`);
    }
    body.push(
      dayMasterRoot.hasRoot
        ? `다만 일간 자신의 뿌리가 지지에 실제로 내려 있어서, 이 힘이 부족한 영역에서도 완전히 무너지지는 않습니다 — 시간이 걸리더라도 결국 자기 자리로 돌아오는 힘이 있습니다.`
        : `게다가 일간 자신의 뿌리도 지지 어디에도 내려 있지 않아서, 이런 영역에서는 평소보다 의식적으로 더 애를 써야 버틸 수 있습니다.`
    );
    sections.push({ heading: "", body });
  }

  // ⑦ 第一章의 발견 — 앞의 근거들을 연결한 종합, 사람마다 달라짐 ──────
  const compareInsight = buildCompareInsight(name, topVisible, topHidden, topHiddenCount, visible.length);
  const discoveryParts: string[] = [`정리하면, ${compareInsight}`];
  if (weakestActive || purelyAbsentCategories.length > 0) {
    const gapNote = purelyAbsentCategories.length > 0
      ? `다만 이 방식 자체는 원래 낯설어서, 그 영역에서만큼은 유독 서툴게 느껴질 때가 있습니다.`
      : `다만 이 부분만큼은 남들처럼 자연스럽게 나오지 않아서, 의식적으로 한 번 더 마음을 써야 겨우 되는 편입니다.`;
    discoveryParts.push(gapNote);
  }
  sections.push({ heading: "", body: [discoveryParts.join(" ")] });

  return {
    sections,
    visual: { visible, hidden, compareInsight, easy, effortful },
  };
}
