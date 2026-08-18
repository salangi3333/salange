import { Element, ELEMENT_LABEL } from "./hanjaTables";
import { AppData } from "./sajuContent";
import { GAN_PROFILE, ZHI_PROFILE } from "./ganZhiProfiles";
import { buildElementAnalysis } from "./aiLifeReport";

/**
 * 01장(타고난 본질) 전용 — "일간·일지" 및 "사주 안의 다른 글자와 기운"을
 * 사람마다 실제 계산된 십성/오행 값으로부터 조립하는 서술 생성기.
 *
 * 여기서 하는 일은 오직 조합뿐이다: calculateSaju()가 이미 계산해 둔
 * 8글자 각각의 십성(SIPSEONG_KO)과 오행 개수(buildElementAnalysis)를
 * 가져다, 십성 10종 각각에 대해 미리 써 둔 "의미 설명" 문장뱅크
 * (SIPSEONG_TRAIT — 명리학 표준 정의를 서술체로 옮긴 것일 뿐, 이 사람만의
 * 새 사실이 아니다)에 대입한다. 신강/신약 판정, 합·충·형·파, 용신,
 * 대운/세운은 다루지 않는다 — 계산되지 않은 값이기 때문이다.
 */

type SipseongCategory = "비겁" | "식상" | "재성" | "관성" | "인성";

interface SipseongTrait {
  category: SipseongCategory;
  /** 일간·일지 설명(2번)에서 "이 자리는 ~입니다" 형태로 쓰는 정의 */
  seat: string;
  /** 일간·일지 설명에서 정의 다음 문장 — 실생활로 잇는 한 문장 */
  effect: string;
  /** 다른 글자와의 상호작용(3번)에서 쓰는 짧은 수식 어구 */
  clause: string;
}

const SIPSEONG_TRAIT: Record<string, SipseongTrait> = {
  비견: {
    category: "비겁",
    seat: "일간과 힘을 나란히 하는 자리",
    effect: "그래서 누구보다 자기 중심이 뚜렷하고, 남의 속도에 쉽게 휩쓸리지 않습니다.",
    clause: "나란히 힘을 보태는",
  },
  겁재: {
    category: "비겁",
    seat: "일간과 같은 색이지만 한 걸음 더 나아가는 자리",
    effect: "그래서 지지 않으려는 마음이 은근히 강하고, 손에 쥔 것을 쉽게 내주지 않습니다.",
    clause: "같은 색으로 힘을 더하는",
  },
  식신: {
    category: "식상",
    seat: "일간이 여유롭게 풀어내는 자리",
    effect: "그래서 생각과 감정이 서두르지 않고 차분히 흘러나오며, 스스로도 그 흐름을 편안하게 받아들입니다.",
    clause: "여유롭게 풀어내는",
  },
  상관: {
    category: "식상",
    seat: "일간이 스스로 뿜어내는 재능과 표현력의 자리",
    effect: "그래서 관찰하고 판단하는 눈이 안에만 머물지 않고, 말과 행동으로 그대로 새어 나옵니다.",
    clause: "예리하게 드러내는",
  },
  편재: {
    category: "재성",
    seat: "일간이 크게 벌려보는 자리",
    effect: "그래서 기회다 싶으면 몸이 먼저 움직이고, 손에 쥔 것을 불리는 데 거침이 없습니다.",
    clause: "기회를 좇아 크게 불리는",
  },
  정재: {
    category: "재성",
    seat: "일간이 성실하게 챙기는 자리",
    effect: "그래서 눈앞의 것을 꼼꼼히 관리하는 습관이 몸에 배어 있고, 무리한 선택은 잘 하지 않습니다.",
    clause: "성실하게 쌓는",
  },
  편관: {
    category: "관성",
    seat: "일간을 예고 없이 밀어붙이는 자리",
    effect: "그래서 위기 앞에서 오히려 순발력이 살아나고, 압박을 정면으로 받아내는 힘이 있습니다.",
    clause: "예고 없이 밀어붙이는 압박의",
  },
  정관: {
    category: "관성",
    seat: "일간에게 지켜야 할 책임을 지우는 자리",
    effect: "그래서 스스로 정한 규칙을 잘 벗어나지 않고, 맡은 몫은 끝까지 해내려 합니다.",
    clause: "지켜야 할 책임과 질서의",
  },
  편인: {
    category: "인성",
    seat: "일간에게 남다른 직관을 주는 자리",
    effect: "그래서 남들이 보지 못하는 것을 먼저 알아채고, 혼자만의 방식으로 생각을 정리하는 시간이 필요합니다.",
    clause: "남다른 직관을 주는",
  },
  정인: {
    category: "인성",
    seat: "일간을 든든하게 지켜주는 자리",
    effect: "그래서 웬만한 일에는 쉽게 흔들리지 않고, 위태로운 순간에도 돌아갈 자리가 있다는 안정감이 있습니다.",
    clause: "든든하게 지켜주는",
  },
};

const CATEGORY_META: Record<SipseongCategory, { intro: string; noun: string; order: number }> = {
  비겁: { intro: "먼저 거들어주는 힘입니다.", noun: "거드는 힘", order: 0 },
  관성: { intro: "동시에, 그 힘을 가만두지 않는 자리도 있습니다.", noun: "짓누르는 힘", order: 1 },
  식상: { intro: "안에 있는 것을 풀어내는 자리도 있습니다.", noun: "풀어내는 힘", order: 2 },
  재성: { intro: "성실하게 쌓아가는 자리도 있습니다.", noun: "쌓는 힘", order: 3 },
  인성: { intro: "그리고 뒤에서 받쳐주는 자리도 있습니다.", noun: "받쳐주는 힘", order: 4 },
};

type Stage = "year" | "month" | "hour";

const STAGE_LABEL: Record<Stage, string> = {
  year: "초년의 자리",
  month: "사회로 나가는 자리",
  hour: "말년의 자리",
};

interface OtherChar {
  stage: Stage;
  sipseong: string;
}

function joinStages(stages: string[]): string {
  const unique = Array.from(new Set(stages));
  if (unique.length === 1) return unique[0];
  if (unique.length === 2) return `${unique[0]}와 ${unique[1]}`;
  return `${unique.slice(0, -1).join(", ")}, 그리고 ${unique[unique.length - 1]}`;
}

function buildCategorySentence(category: SipseongCategory, members: OtherChar[]): string {
  const meta = CATEGORY_META[category];
  const distinctLabels = Array.from(new Set(members.map((m) => m.sipseong)));

  if (distinctLabels.length >= 2) {
    const [labelA, labelB] = distinctLabels;
    const stageA = STAGE_LABEL[members.find((m) => m.sipseong === labelA)!.stage];
    const stageB = STAGE_LABEL[members.find((m) => m.sipseong === labelB)!.stage];
    const clauseA = SIPSEONG_TRAIT[labelA].clause;
    const clauseB = SIPSEONG_TRAIT[labelB].clause;
    return `${meta.intro} ${stageA}에는 ${clauseA} 기운이, ${stageB}에는 ${clauseB} 기운이 나란히 놓여 있습니다(${labelA}·${labelB}).`;
  }

  const label = distinctLabels[0];
  const stages = joinStages(members.map((m) => STAGE_LABEL[m.stage]));
  const clause = SIPSEONG_TRAIT[label].clause;
  return `${meta.intro} ${stages}에 ${clause} 기운이 자리합니다(${label}).`;
}

function buildSynthesis(categories: SipseongCategory[]): string {
  const nouns = categories
    .slice()
    .sort((a, b) => CATEGORY_META[a].order - CATEGORY_META[b].order)
    .map((c) => CATEGORY_META[c].noun);

  if (nouns.length === 1) {
    return `${nouns[0]}이 이 사람 안에 뚜렷하게 자리하고 있다는 뜻입니다.`;
  }
  const joined =
    nouns.length === 2 ? nouns.join("과 ") : `${nouns.slice(0, -1).join(", ")}, ${nouns[nouns.length - 1]}`;
  return `${joined}이 한 사람 안에 동시에 있다는 것 — 이건 스스로도 자신을 다 파악하지 못할 만큼, 여러 결이 겹겹이 쌓여 있다는 뜻입니다.`;
}

const COUNT_WORD: Record<number, string> = { 4: "네", 6: "여섯" };

/** 한글 음절의 받침(종성) 유무에 따라 "이/가" 조사를 고른다.
 * (예: "해" → "가", "술" → "이") 새 명리 사실이 아니라 순수 조사 처리다. */
function josaEuiGa(word: string): "이" | "가" {
  const last = word.charCodeAt(word.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return "가";
  return (last - 0xac00) % 28 === 0 ? "가" : "이";
}

export interface ChapterOneNarrative {
  /** 1. 타고난 본질 + 2. 핵심 명리 요소(일간·일지) + 3. 다른 글자와의 상호작용 */
  identity: string[];
  /** 4. 이 조합으로 만들어지는 기질(도입 + GAN_PROFILE 다만 문단 + ZHI_PROFILE 노트) */
  temperament: string[];
}

export function buildChapterOneNarrative(appData: AppData): ChapterOneNarrative {
  const { user, chars } = appData;
  const name = user.name;
  const dayGan = user.pillars.day.hanja;
  const dayZhi = user.pillars.branches.day.hanja;
  const dayElement: Element = user.pillars.day.element;
  const gan = GAN_PROFILE[dayGan];
  const zhi = ZHI_PROFILE[dayZhi];
  const elementAnalysis = buildElementAnalysis(chars);

  // ── 1. 타고난 본질 ──────────────────────────────────────────────
  const identity: string[] = [];
  identity.push(
    `${name}님의 사주를 여는 글자는 ${user.pillars.day.hangul}(${dayGan})입니다. ${gan.image}처럼, ${gan.coreTrait}입니다.`
  );

  const dayLabel = ELEMENT_LABEL[dayElement];
  const weakestLabel = ELEMENT_LABEL[elementAnalysis.weakest];
  const dayCount = elementAnalysis.counts[dayElement];

  if (dayElement === elementAnalysis.strongest) {
    const weakestClause =
      elementAnalysis.counts[elementAnalysis.weakest] === 0
        ? `${weakestLabel} 기운은 한 글자도 없습니다`
        : `${weakestLabel} 기운은 상대적으로 옅게 자리합니다`;
    identity.push(
      `그런데 이 기운은 혼자 놓여 있지 않습니다. 사주 전체에 ${dayLabel} 기운이 유독 짙게 깔려 있고, ${weakestClause}. 그래서 타고난 기운이 옅어지지 않고 오히려 뚜렷하게 드러나는 편입니다.`
    );
  } else if (dayElement === elementAnalysis.weakest) {
    identity.push(
      `그런데 사주 전체를 보면 오히려 ${dayLabel} 기운이 가장 적습니다. 흔치 않은 만큼, 이 기운이 있는 자리마다 존재감이 또렷하게 남는 편입니다.`
    );
  } else {
    identity.push(
      `여덟 글자 중 ${dayLabel} 기운은 ${dayCount}개로, 아주 많지도 적지도 않게 자리하고 있습니다. 그만큼 다른 기운들과 비교적 균형 있게 섞여 있는 구조입니다.`
    );
  }

  // ── 2. 핵심 명리 요소 — 일간·일지 ──────────────────────────────
  const dayZhiSipseong = user.pillars.branches.day.sipseong;
  const dayZhiTrait = SIPSEONG_TRAIT[dayZhiSipseong];
  if (dayZhiTrait) {
    const dayZhiHangul = user.pillars.branches.day.hangul;
    identity.push(
      `이 기운이 실제로 어떻게 쓰이는지는 일지를 보면 드러납니다. 일간이 딛고 선 자리에는 ${dayZhiHangul}(${dayZhi})${josaEuiGa(
        dayZhiHangul
      )} 놓여 있는데, 이 자리는 ${dayZhiTrait.seat}입니다(${dayZhiSipseong}).`
    );
    identity.push(dayZhiTrait.effect);
  }

  // ── 3. 사주 안의 다른 글자와 기운 ──────────────────────────────
  const otherChars: OtherChar[] = [];
  (["year", "month", "hour"] as const).forEach((stage) => {
    const stemCell = user.pillars[stage];
    const branchCell = user.pillars.branches[stage];
    if (stemCell) otherChars.push({ stage, sipseong: stemCell.sipseong });
    if (branchCell) otherChars.push({ stage, sipseong: branchCell.sipseong });
  });

  const grouped = new Map<SipseongCategory, OtherChar[]>();
  otherChars.forEach((c) => {
    const trait = SIPSEONG_TRAIT[c.sipseong];
    if (!trait) return;
    const list = grouped.get(trait.category) ?? [];
    list.push(c);
    grouped.set(trait.category, list);
  });

  const orderedCategories = Array.from(grouped.keys()).sort(
    (a, b) => CATEGORY_META[a].order - CATEGORY_META[b].order
  );

  if (orderedCategories.length > 0) {
    const countWord = COUNT_WORD[otherChars.length] ?? `${otherChars.length}`;
    identity.push(
      `나머지 ${countWord} 글자는 이 ${user.pillars.day.hangul}(${dayGan}) 일간을 둘러싸고 각자의 역할을 맡습니다.`
    );
    orderedCategories.forEach((cat) => {
      identity.push(buildCategorySentence(cat, grouped.get(cat)!));
    });
    identity.push(buildSynthesis(orderedCategories));
  }

  // ── 4. 이 조합으로 만들어지는 기질 ──────────────────────────────
  const temperament: string[] = [
    "이렇게 여러 기운이 겹친 결과, 타고난 기질은 한 가지 색으로만 정리되지 않습니다.",
  ];
  if (gan.potential.paragraphs[1]?.text) temperament.push(gan.potential.paragraphs[1].text);
  if (zhi.potentialNote) temperament.push(`그리고 일지의 기운이 여기에 더해집니다. ${zhi.potentialNote}`);

  return { identity, temperament };
}
