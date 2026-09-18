import { Element, ELEMENT_LABEL, isCheoneulGwiin } from "./hanjaTables";
import { AppData } from "./sajuContent";
import { GAN_PROFILE, ZHI_PROFILE } from "./ganZhiProfiles";
import { buildElementAnalysis } from "./aiLifeReport";
import { buildInterpretationKey } from "./chapterOneInterpretation";
import { analyzeCategoryStrength, SipseongCategory as StrengthCategory } from "./strengthAnalysis";
import { classifyAxisRelevance, AxisRelevance } from "./axisRelevance";

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
  /** 일간·일지 설명(2번)에서 그대로 쓰는 완성된 장면 — 위치·구조 설명 없이
   * 행동/반응으로 시작해서 용어는 맨 끝 괄호로만 붙인다. */
  scene: string;
  /** 다른 글자와의 상호작용(3번)에서 쓰는 짧은 수식 어구 */
  clause: string;
}

const SIPSEONG_TRAIT: Record<string, SipseongTrait> = {
  비견: {
    category: "비겁",
    scene:
      "자기 기준이 뚜렷해서, 여러 사람의 말을 충분히 들어도 마지막 판단은 결국 스스로 내려야 마음이 놓입니다. 남들이 다 같은 방향으로 갈 때도, 내 생각이 다르면 쉽게 따라가지 않습니다(비견).",
    clause: "나란히 힘을 보태는",
  },
  겁재: {
    category: "비겁",
    scene:
      "지지 않으려는 마음이 은근히 강해서, 한번 손에 쥔 건 쉽게 내주지 않습니다. 남들이 적당히 양보하고 넘어가는 상황에서도, 끝까지 자기 몫을 챙기고 나서야 물러섭니다(겁재).",
    clause: "같은 색으로 힘을 더하는",
  },
  식신: {
    category: "식상",
    scene:
      "생각과 감정을 서두르지 않고 차분히 풀어내는 편입니다. 급한 순간에도 일단 여유를 찾고 나서야 움직이고, 그 흐름을 스스로도 편안하게 받아들입니다(식신).",
    clause: "여유롭게 풀어내는",
  },
  상관: {
    category: "식상",
    scene:
      "속에 있는 걸 오래 담아두지 못하는 편이라, 관찰하고 판단한 걸 결국 말이나 행동으로 드러내고야 맙니다. 남들이 눈치껏 넘어가는 순간에도, 하고 싶은 말은 결국 하고 넘어갑니다(상관).",
    clause: "예리하게 드러내는",
  },
  편재: {
    category: "재성",
    scene:
      "기회가 보이면 오래 재기보다 일단 움직이는 편입니다. 남들이 '조금 더 생각해보자'고 할 때도, 가능성이 있다고 판단하면 먼저 부딪혀봅니다. 돈을 벌 때도 마찬가지입니다. 하나를 오래 붙잡고 기다리는 것보다 새로운 기회를 찾고, 판을 넓히고, 직접 움직일 때 힘이 살아납니다(편재).",
    clause: "기회를 좇아 크게 불리는",
  },
  정재: {
    category: "재성",
    scene:
      "눈앞의 것부터 꼼꼼히 챙기는 습관이 몸에 배어 있습니다. 남들이 한 방을 노리는 선택을 할 때도, 무리한 쪽보다는 확실한 걸 하나씩 쌓아가는 쪽을 택합니다(정재).",
    clause: "성실하게 쌓는",
  },
  편관: {
    category: "관성",
    scene:
      "예고 없이 밀려오는 위기 앞에서 오히려 순발력이 살아나는 편입니다. 남들이 당황해서 얼어붙는 순간에도, 압박을 정면으로 받아내고 몸이 먼저 움직입니다(편관).",
    clause: "예고 없이 밀어붙이는 압박의",
  },
  정관: {
    category: "관성",
    scene:
      "스스로 정한 규칙을 잘 벗어나지 않고, 맡은 몫은 끝까지 해내야 마음이 놓입니다. 남들이 적당히 넘어가는 상황에서도, 책임질 일이라고 판단하면 끝까지 붙들고 있습니다(정관).",
    clause: "지켜야 할 책임과 질서의",
  },
  편인: {
    category: "인성",
    scene:
      "남들이 보지 못하는 걸 먼저 알아채는 편입니다. 다만 그 생각을 바로 꺼내지 않고, 혼자만의 방식으로 정리하는 시간이 꼭 필요합니다(편인).",
    clause: "남다른 직관을 주는",
  },
  정인: {
    category: "인성",
    scene:
      "웬만한 일에는 쉽게 흔들리지 않습니다. 위태로운 순간에도 결국 돌아갈 자리가 있다는 감각이 있어서, 남들보다 덜 불안해하는 편입니다(정인).",
    clause: "든든하게 지켜주는",
  },
};

const CATEGORY_META: Record<SipseongCategory, { intro: string; noun: string; order: number }> = {
  비겁: { intro: "먼저,", noun: "거드는 힘", order: 0 },
  관성: { intro: "동시에,", noun: "짓누르는 힘", order: 1 },
  식상: { intro: "안에서는,", noun: "풀어내는 힘", order: 2 },
  재성: { intro: "여기에,", noun: "쌓는 힘", order: 3 },
  인성: { intro: "그리고,", noun: "받쳐주는 힘", order: 4 },
};

/** 3번(다른 글자와의 상호작용) 전용 — 카테고리별 행동 서술. "~자리에
 * ~기운이 놓여 있습니다" 같은 위치 설명 없이, 곧바로 행동/반응으로
 * 말한다. 용어는 맨 끝 괄호로만 붙인다(호출부에서 결합). */
const CATEGORY_BEHAVIOR: Record<SipseongCategory, string> = {
  비겁: "연애 초반에도 남들이 다 좋다고 밀어줘도, 내가 아니다 싶으면 마음이 잘 안 갑니다. 반대로 다들 말려도 내 느낌이 오면 일단 만나보는 편이라, 소개해준 사람이 오히려 머쓱해질 때도 있습니다",
  관성: "갑자기 일이 터졌을 때 제일 먼저 나서서 수습하는 쪽도 본인입니다. '누가 좀 해줬으면' 싶은 순간에도 결국 손을 걷어붙이고 마는 편이라, 정작 본인이 힘들 땐 누구한테 기대야 할지 몰라 혼자 끙끙댈 때가 많습니다",
  식상: "속으로만 삭이려 해도 결국 말이나 표정으로 새어 나오고 맙니다. 참으려고 애쓸수록 오히려 더 티가 나는 편입니다",
  재성: "눈앞에 기회가 보이면 계획부터 세우기보다 일단 손에 쥘 수 있는 것부터 챙기는 편입니다",
  인성: "아무리 힘든 일이 있어도 마지막 순간엔 스스로를 다독여 일으켜 세우는 쪽입니다. 완전히 무너지기 전에, 어떻게든 다시 중심을 잡아내는 편입니다",
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
  const labelTag = distinctLabels.length >= 2 ? distinctLabels.join("·") : distinctLabels[0];
  const behavior = CATEGORY_BEHAVIOR[category];
  // 위치(초년/말년 등)를 근거로 대지 않는다 — 같은 힘이 2군데 이상에서
  // 반복되면 "살아오면서 여러 번 되풀이됐을 가능성"이라는 시간 서술로만
  // 언급한다(어느 기둥인지는 말하지 않음).
  const repeated =
    members.length >= 2
      ? " 그것도 어쩌다 한 번이 아니라, 살아오면서 여러 번 되풀이해서 나타났을 가능성이 큽니다."
      : "";
  return `${meta.intro} ${behavior}(${labelTag}).${repeated}`;
}

function buildSynthesis(categories: SipseongCategory[]): string {
  const nouns = categories
    .slice()
    .sort((a, b) => CATEGORY_META[a].order - CATEGORY_META[b].order)
    .map((c) => CATEGORY_META[c].noun);

  if (nouns.length === 1) {
    return `이 힘 하나가 유독 또렷하게 남아 있다는 뜻입니다.`;
  }
  return `그래서 정작 본인도 '방금 내가 왜 이렇게 반응했지' 싶을 때가 있습니다. 상황에 따라 이 모습, 저 모습이 번갈아 나오다 보니, 주변 사람들도 은근히 종잡을 수 없다고 느끼기 쉽습니다.`;
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

/** "목" / "목과 화" / "목·화·수" 식으로 오행 라벨 여러 개를 자연스럽게
 * 묶는다 — 동률(공동 최고/공동 최저) 오행이 2개 이상일 때만 쓰인다.
 * 새 명리 판단이 아니라 이미 정해진 라벨을 나열 규칙대로 잇는 것뿐이다. */
function joinElementLabels(labels: string[]): string {
  if (labels.length <= 1) return labels[0] ?? "";
  if (labels.length === 2) return `${labels[0]}과 ${labels[1]}`;
  return `${labels.slice(0, -1).join("·")}과 ${labels[labels.length - 1]}`;
}

// 오프닝 확장 은유 — 일간의 오행을 기준으로, 그 사람의 가장 강한 힘(관성/
// 인성/식상/재성)이 어떤 이미지로 나타나는지. 비겁(같은 오행)은 이미지가
// 아니라 "자기 자신과 같은 결"로 별도 처리한다. 계산(오행·카테고리 존재
// 여부)은 그대로 두고, 그 결과를 하나의 은유로 엮는 문장만 새로 만든다.
const RELATION_IMAGE: Record<Element, Partial<Record<SipseongCategory, string>>> = {
  fire: {
    관성: "그 불을 억누르려는 물줄기",
    인성: "불씨를 꺼지지 않게 지펴주는 장작",
    식상: "이 불이 만들어낸 따뜻한 재",
    재성: "이 불로 녹여내려는 쇳덩이",
  },
  wood: {
    관성: "뿌리를 잘라내려는 도끼날",
    인성: "뿌리를 적셔주는 빗물",
    식상: "가지 끝까지 태우며 뻗어나가는 불꽃",
    재성: "뿌리내려 차지하려는 땅",
  },
  earth: {
    관성: "속을 파고드는 나무뿌리",
    인성: "차가운 흙을 데워주는 불",
    식상: "흙 속에서 빚어져 나오는 광물",
    재성: "가두고 다스리려는 물길",
  },
  metal: {
    관성: "쇠를 녹이려는 불꽃",
    인성: "쇠를 품어 키워낸 광맥",
    식상: "쇠끝에 맺혀 흘러내리는 이슬",
    재성: "베어 다듬으려는 나무",
  },
  water: {
    관성: "물줄기를 막아서는 둑",
    인성: "맺혀서 물을 흘려보내는 바위",
    식상: "물을 머금고 자라나는 물풀",
    재성: "물을 끓여 다스리려는 불",
  },
};

export function buildChapterOneNarrative(appData: AppData): ChapterOneNarrative {
  const { user, chars } = appData;
  const name = user.name;
  const dayGan = user.pillars.day.hanja;
  const dayZhi = user.pillars.branches.day.hanja;
  const dayElement: Element = user.pillars.day.element;
  const gan = GAN_PROFILE[dayGan];
  const zhi = ZHI_PROFILE[dayZhi];
  const elementAnalysis = buildElementAnalysis(chars);

  // 오프닝 확장 은유(아래)에서 "가장 앞서는 카테고리"가 필요해서, 다른
  // 글자 그룹핑(원래 3번 섹션)을 여기로 앞당겨 계산만 먼저 한다 — 계산
  // 로직 자체는 한 글자도 바꾸지 않았다.
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

  // ── 1. 타고난 본질 ──────────────────────────────────────────────
  const identity: string[] = [];
  const dayElementReading = ELEMENT_LABEL[dayElement].split("(")[0];
  identity.push(
    `${name}님의 사주를 나타내는 글자는 ${user.pillars.day.hangul}(${dayGan})입니다. ${user.pillars.day.hangul}${dayElementReading}는 흔히 ${gan.image}에 비유합니다. ${gan.coreTrait}입니다.`
  );

  const dayLabel = ELEMENT_LABEL[dayElement];
  const dayCount = elementAnalysis.counts[dayElement];

  // 오행 최고/최저 동률 판정 — buildElementAnalysis()가 이미 계산해 둔
  // counts(계산 엔진 결과, 손대지 않음)만 읽는다. strongest/weakest
  // 필드는 동률일 때 그중 하나만 임의로 골라 담기 때문에(단일값), 그
  // 필드로 dayElement를 비교하면 동률인데도 "가장 적다/많다"고 단정하는
  // 문장이 나오거나, dayElement가 실제로는 동률의 일원인데도 엉뚱하게
  // "적당히 자리한다" 문장으로 빠지는 경우가 생긴다. 그래서 여기서는
  // counts의 최댓값/최솟값과 그 값을 가진 오행 전부를 직접 구해 판정한다.
  const elementOrder = Object.keys(elementAnalysis.counts) as Element[]; // 목화토금수 고정 순서
  const countValues = elementOrder.map((el) => elementAnalysis.counts[el]);
  const maxCount = Math.max(...countValues);
  const minCount = Math.min(...countValues);
  // 5개 오행 개수가 전부 같은 극단 케이스 — 이때는 "가장 많다/적다" 자체가
  // 성립하지 않으므로 강/약 판정을 하지 않고 아래 else(균형) 문장으로 둔다.
  const isFullyEven = maxCount === minCount;
  const strongestElements = elementOrder.filter((el) => elementAnalysis.counts[el] === maxCount);
  const weakestElements = elementOrder.filter((el) => elementAnalysis.counts[el] === minCount);
  const dayIsStrongest = !isFullyEven && dayCount === maxCount;
  const dayIsWeakest = !isFullyEven && dayCount === minCount;

  // 오행 개수·비율을 그대로 보고하지 않고("화 기운이 몇 개"), 그 결과가
  // 실제로 어떻게 드러나는지(일관됨/희소해서 눈에 띔/여러 결이 번갈아
  // 나옴)만 말한다. 판정 조건(dayIsStrongest/dayIsWeakest/minCount===0
  // 등)은 그대로 두고 문장만 바꿨다.
  if (dayIsStrongest) {
    const intensity =
      minCount === 0
        ? `다른 모습이 거의 안 보일 만큼, 어디서든 이 색 하나로 뚜렷하게 나옵니다.`
        : `사는 환경이나 상황이 달라져도, 이 사람의 색깔만큼은 잘 안 바뀝니다.`;
    identity.push(
      `오랜만에 만난 사람도 '너 하나도 안 변했다'는 말을 자연스럽게 하게 되는 편입니다. ${intensity} 오히려 흔들릴 법한 순간에도, 원래 하던 방식 그대로 움직이는 쪽입니다.`
    );
  } else if (dayIsWeakest) {
    identity.push(
      `그런데 사주 전체를 보면 오히려 이 성질이 가장 드뭅니다. 흔한 색이 아니다 보니, 이 모습이 나올 때마다 오히려 더 도드라져 보이는 편입니다.`
    );
  } else {
    identity.push(
      `그런데 이 성질만 유독 튀지는 않습니다. 다른 모습들과 비교적 고르게 섞여 있어서, 상황에 따라 여러 결이 번갈아 나오는 사람입니다.`
    );
  }

  // 짧은 전환 — 은유(1번)에서 곧장 구체적 행동 언어로 내려간다. 특정
  // 형용사("부드러운" 등)에 기대지 않는 범용 문장이라 어떤 일간·오행
  // 조합이 와도 어색하지 않다.
  identity.push(`${name}님에게는 이 모습만 있는 게 아닙니다.`);

  // ── 2. 핵심 명리 요소 — 일간·일지 ──────────────────────────────
  const dayZhiSipseong = user.pillars.branches.day.sipseong;
  const dayZhiTrait = SIPSEONG_TRAIT[dayZhiSipseong];
  if (dayZhiTrait) {
    // "일지를 보면 드러납니다... 자리는 ~입니다" 같은 위치 설명 없이,
    // 완성된 장면(scene)을 그대로 붙인다 — 용어는 scene 안 괄호로 이미
    // 붙어 있다.
    identity.push(dayZhiTrait.scene);
  }

  // ── 3. 사주 안의 다른 글자와 기운 ──────────────────────────────
  if (orderedCategories.length > 0) {
    identity.push(`그리고 이런 모습들도 있습니다.`);
    orderedCategories.forEach((cat) => {
      identity.push(buildCategorySentence(cat, grouped.get(cat)!));
    });
    identity.push(buildSynthesis(orderedCategories));
  }

  // ── 4. 이 조합으로 만들어지는 기질 ──────────────────────────────
  const temperament: string[] = [
    `${gan.image} 같은 이 기질에는, 이런 면도 있습니다.`,
  ];
  if (gan.potential.paragraphs[1]?.text) temperament.push(gan.potential.paragraphs[1].text);
  if (zhi.potentialNote) temperament.push(`여기에 하나 더 있다면, ${zhi.potentialNote}`);

  return { identity, temperament };
}

// ────────────────────────────────────────────────────────────────
// 5번(실제 삶에서 나타나는 모습) / 8번(관계·현실에서 나타나는 모습) 전용
// 연결 문장 — INTERPRETATION층(chapterOneInterpretation.ts)이 만든 key를
// 보조 근거로 삼아, 오행 5종 테이블(CH1_INNER_EXAMPLE/CH1_TRUTH_SCENE)만으로는
// 같은 오행끼리 겹치던 문장 뒤에 사람마다 다른 문장을 한 줄 더한다.
// 새 계산 없음 — 이미 계산된 categoryCounts/hasRoot/seasonStatus/합충
// 개수/일지 십성을 고르기만 한다. "합/충" 같은 판정 용어나 자리 이름,
// 시기 단정은 문장에 노출하지 않는다.
// ────────────────────────────────────────────────────────────────

/** 5번 — 일지 십성 10종 각각에 대해, "자책/자기인식이 겉으로 어떻게
 * 드러나는가"를 담은 문장뱅크. SIPSEONG_TRAIT(2번에서 쓰는 일반 성격
 * 설명)와는 다른 문장이다 — 같은 화면에 같은 문장이 두 번 나오지 않도록. */
const SIPSEONG_INNER_PATTERN: Record<string, string> = {
  비견: "묵묵히 혼자 정리하고 넘어가는 편이라, 자책도 남에게 잘 보이지 않게 삭이곤 합니다.",
  겁재: "지지 않으려는 마음이 강해서, 자책도 오래 담아두기보다 다음에는 다르게 해내는 쪽으로 곧장 옮겨가곤 합니다.",
  식신: "여유를 찾는 게 먼저라, 자책도 한 박자 늦게 차분히 가라앉은 뒤에야 찾아오는 편입니다.",
  상관: "그 마음을 안에만 담아두지 못하는 편이라, 자책도 결국은 말이나 행동으로 새어 나오곤 합니다.",
  편재: "몸을 움직이는 쪽으로 마음을 돌리는 편이라, 자책도 가만히 있기보다 뭔가를 벌이며 잊어버리곤 합니다.",
  정재: "눈앞의 것부터 다시 정리하는 편이라, 자책도 결국 하나씩 바로잡는 일로 조용히 이어집니다.",
  편관: "스스로를 더 몰아붙이는 쪽으로 반응하는 편이라, 자책이 오히려 다음을 대비하는 힘으로 바뀌곤 합니다.",
  정관: "맡은 몫을 지키는 게 우선이라, 자책도 겉으로 흔들리지 않은 채 조용히 스스로를 다잡는 방식으로 지나갑니다.",
  편인: "혼자 생각을 정리하는 시간이 필요한 편이라, 자책도 남들 모르게 한참을 곱씹고 나서야 정리됩니다.",
  정인: "기댈 곳을 찾는 게 먼저라, 자책도 결국은 믿을 만한 사람이나 익숙한 자리로 돌아가서야 누그러집니다.",
};

/** 5번 — 다른 6(또는 4)글자 중 한 십성군이 동률 없이 뚜렷하게(3개 이상)
 * 우세할 때 쓰는 문장. 동률이면 이 표를 쓰지 않는다(임의로 우열을 만들지
 * 않는다는 원칙 유지). */
const CATEGORY_DOMINANT_PATTERN: Record<SipseongCategory, string> = {
  비겁: "같은 색의 기운이 유독 많아서, 자책도 남과 비교하는 마음과 함께 오래 남는 편입니다.",
  식상: "표현하고 싶은 마음이 유독 많아서, 자책도 결국 어떤 식으로든 겉으로 드러나고서야 풀리는 편입니다.",
  재성: "쌓고 지키려는 마음이 유독 많아서, 자책도 결국 무언가를 다시 채우는 일로 이어지는 편입니다.",
  관성: "스스로를 다잡으려는 기운이 유독 많아서, 자책이 규칙을 다시 세우는 일로 곧장 이어지는 편입니다.",
  인성: "기댈 자리는 여럿인데 정작 그중 하나조차 스스로에게는 잘 내주지 않는 편이라, 이 자책은 유독 길게 갑니다.",
};

/** 5번 — 통근이 없을 때, 왕상휴수사를 3단계(강/중/약)로 묶어 쓰는 문장.
 * 통근이 있으면 이 표를 쓰지 않는다. */
const ROOTLESS_SEASON_PATTERN: Record<"강" | "중" | "약", string> = {
  강: "뿌리내릴 자리는 마땅치 않아도 기운 자체는 강하게 밀어붙이는 편이라, 자책도 오래 붙잡고 있기보다 금방 다음으로 넘어가는 편입니다.",
  중: "뿌리내릴 자리가 마땅치 않아 아직 무르익지 않은 채로 맞춰온 시간이 길다 보니, 정작 자신이 무엇을 원했는지는 한 박자 늦게 알아차리는 편입니다.",
  약: "뿌리내릴 자리 없이 계절의 기운에도 눌린 채로 맞춰온 시간이 길다 보니, 정작 자신이 무엇을 원했는지는 나중에야 스스로 깨닫는 편입니다.",
};

function seasonTier(status: "왕" | "상" | "휴" | "수" | "사"): "강" | "중" | "약" {
  if (status === "왕" || status === "상") return "강";
  if (status === "휴") return "중";
  return "약"; // 수·사
}

/**
 * 5번(실제 삶) 전용 연결 문장. 우선순위:
 * ① 십성군이 동률 없이 뚜렷하게(3개 이상) 우세하면 → 그 카테고리
 * ② 통근이 없으면 → 계절 상태(3단계)
 * ③ 그 외(동률이거나 통근이 있음) → 일지 십성 그대로
 * insight.realLife 뒤에 이어 붙여 한 문단으로 쓴다(별도 문단 아님).
 */
export function buildRealLifeConnector(appData: AppData): string {
  const key = buildInterpretationKey(appData);
  const dayZhiSipseong = appData.user.pillars.branches.day.sipseong;

  if (!key.isTopTie && key.topCategoryCount >= 3 && key.topCategories[0]) {
    return CATEGORY_DOMINANT_PATTERN[key.topCategories[0]];
  }
  if (!key.hasRoot) {
    return ROOTLESS_SEASON_PATTERN[seasonTier(key.seasonStatus)];
  }
  return SIPSEONG_INNER_PATTERN[dayZhiSipseong] ?? "";
}

/**
 * 관살혼잡(편관+정관이 다른 6글자 중에 둘 다 있는 배치) 실제 여부와 위치를
 * 확인한다. 둘 다 없으면 null — 없는 사람에게 있다고 지어내지 않는다.
 * 있으면 두 자리(년/월/시 중 어디인지)를 실제 값 그대로 문장에 넣는다 —
 * "딱 한 자리에 모여있다" 같은 위치 단정은 하지 않고, 실제 자리 이름만
 * 말한다(같은 자리면 자연히 같은 말이 두 번 나와 독자가 알아챈다).
 */
export function buildGwansalHonjapNote(appData: AppData): string | null {
  const user = appData.user;
  const others: { stage: Stage; sipseong: string }[] = [];
  (["year", "month", "hour"] as const).forEach((stage) => {
    const g = user.pillars[stage];
    const z = user.pillars.branches[stage];
    if (g) others.push({ stage, sipseong: g.sipseong });
    if (z) others.push({ stage, sipseong: z.sipseong });
  });
  const pyeongwan = others.find((o) => o.sipseong === "편관");
  const jeonggwan = others.find((o) => o.sipseong === "정관");
  if (!pyeongwan || !jeonggwan) return null;

  return `이 사람의 사주에는 명리학에서 "관살혼잡"이라 부르는 배치가 있습니다. 쉽게 말하면 머릿속에 시키는 사람이 두 명 있는 느낌입니다. 한 명은 "지금 안 하면 큰일 나"라며 몰아치고(편관, ${STAGE_LABEL[pyeongwan.stage]}), 다른 한 명은 "이건 원래 네가 해야 하는 일이야"라며 차분히 눌러앉습니다(정관, ${STAGE_LABEL[jeonggwan.stage]}).`;
}

// ────────────────────────────────────────────────────────────────
// 2장(타고난 기질) 오프닝 — 아래 원칙으로 조립한다(1차 구현 이후
// 지적받은 2개 오류 수정, 승인·반영 완료):
//
//  ① "가장 많습니다"처럼 개수를 단정하는 표현 금지 — analyzeCategoryStrength의
//     top은 개수가 아니라 개수+월령+통근+투간을 합친 총점으로 정해지므로,
//     실제 개수가 top보다 많은 다른 카테고리가 있을 수 있다(식상 count=1인데
//     top인 경우 등). tier로만 어조를 정한다: A=단독 우세, B=근소 우세,
//     C(또는 tier 정보 부족)=공동 우세 — tier C에서는 두 카테고리를 함께
//     명시하고 "가장"류 단정 표현을 쓰지 않는다.
//  ② 관성(편관·정관)은 "관살혼잡 여부"가 아니라 "실제 세력(top 또는 second)"
//     기준으로 반영 여부를 정한다 — 존재만으로 무조건 넣지 않고, 존재하지
//     않으면 당연히 넣지 않는다. 반영할 때는 편관·정관 각각의 실제 자리를
//     전부(첫 매치만이 아니라) 모아 정확히 서술한다.
//
// 새 명리 계산은 없다 — analyzeCategoryStrength(3장이 이미 쓰는 값)와
// 8글자의 실제 sipseong/stage만 읽는다.
// ────────────────────────────────────────────────────────────────

const GWANSAL_CLAUSE: Record<"편관" | "정관", string> = {
  편관: '"지금 안 하면 큰일 나"며 몰아붙이는',
  정관: '"원래 네가 해야 할 일"이라며 차분히 다잡는',
};

/** 편관·정관 각각의 실제 위치를 전부(첫 매치만이 아니라) 모은다. */
function findAllGwansalPositions(appData: AppData): { pyeongwanStages: Stage[]; jeonggwanStages: Stage[] } {
  const user = appData.user;
  const pyeongwanStages: Stage[] = [];
  const jeonggwanStages: Stage[] = [];
  (["year", "month", "hour"] as const).forEach((stage) => {
    const g = user.pillars[stage];
    const z = user.pillars.branches[stage];
    [g, z].forEach((cell) => {
      if (cell?.sipseong === "편관") pyeongwanStages.push(stage);
      if (cell?.sipseong === "정관") jeonggwanStages.push(stage);
    });
  });
  return { pyeongwanStages, jeonggwanStages };
}

/** [문장만 수정] "~에 자리해, ~힘으로 계속/따로 작동합니다" → 결과 중심 서술. */
function buildGwansalPositionDetail(pyeongwanStages: Stage[], jeonggwanStages: Stage[]): string | null {
  const hasPyeon = pyeongwanStages.length > 0;
  const hasJeong = jeonggwanStages.length > 0;
  if (!hasPyeon && !hasJeong) return null;

  if (hasPyeon && !hasJeong) {
    return `"지금 안 하면 큰일 나"는 압박을 늘 느끼며 살아왔습니다 — ${joinStages(pyeongwanStages.map((s) => STAGE_LABEL[s]))}부터 계속 그래왔습니다.`;
  }
  if (!hasPyeon && hasJeong) {
    return `"원래 네가 해야 할 일"이라는 기준을 늘 마음에 두고 살아왔습니다 — ${joinStages(jeonggwanStages.map((s) => STAGE_LABEL[s]))}부터 계속 그래왔습니다.`;
  }
  if (pyeongwanStages.length === 1 && jeonggwanStages.length === 1 && pyeongwanStages[0] === jeonggwanStages[0]) {
    return `"지금 안 하면 큰일 나"는 압박과 "원래 네가 해야 할 일"이라는 기준을 동시에 느끼며 살아왔습니다 — ${STAGE_LABEL[pyeongwanStages[0]]}부터 그래왔습니다.`;
  }
  return `정관 쪽 기준은 ${joinStages(jeonggwanStages.map((s) => STAGE_LABEL[s]))}부터, 편관 쪽 압박은 ${joinStages(pyeongwanStages.map((s) => STAGE_LABEL[s]))}부터 — 시기마다 다른 얼굴로 따라붙습니다.`;
}

/** 카테고리별 소제목 — 개수를 단정하지 않는 문구로만 구성.
 * 식상·인성은 "표현/행동으로 만들어내는 힘", "관찰·흡수해서 판단하는 힘" 방향으로
 * 더 또렷하게 다듬었다(승인된 설계 반영). 비겁·재성·관성은 이전 검증 통과 문구 유지. */
const AXIS_TITLE: Record<StrengthCategory, string> = {
  비겁: "누구보다 자기 기준이 뚜렷한 사람입니다.",
  식상: "생각을 결국 행동이나 결과물로 만들어내는 사람입니다.",
  재성: "눈에 보이는 결과를 가장 중요하게 여기는 사람입니다.",
  관성: "맡은 일은 끝까지 해내야 마음이 놓이는 사람입니다.",
  인성: "서두르지 않고, 관찰하고 흡수한 뒤에 판단하는 사람입니다.",
};
// [기존 유지] 이미 구체적 행동 문장이라 1장 기준을 그대로 통과함.
const AXIS_REAL_LIFE: Record<StrengthCategory, string> = {
  비겁: "그래서 남의 말이나 분위기에 잘 흔들리지 않고, 한번 정한 방향은 끝까지 밀고 나가는 편입니다.",
  식상: "그래서 생각에 머물지 않고, 말이나 행동·결과물로 직접 만들어내야 직성이 풀리는 편입니다.",
  재성: "그래서 막연한 계획보다, 실제로 손에 쥘 수 있는 것부터 챙기는 편입니다.",
  관성: "그래서 맡은 몫을 끝까지 해내지 않으면 마음 한구석이 불편한 편입니다.",
  인성: "그래서 판단을 서두르기보다, 충분히 관찰하고 흡수한 뒤에야 움직이는 편입니다.",
};

/** [문장만 수정] "기운이 앞서 있다/자리잡고 있다" → 결과(그래서 실제로 어떻게
 * 행동하는지)로 바로 잇는다. AXIS_MEANING("기운이 강하다는 뜻입니다")은
 * 삭제하고 AXIS_REAL_LIFE로 곧장 연결한다. tier 판정 로직은 그대로. */
function buildAxisStrengthClause(
  name: string,
  topCat: StrengthCategory,
  tier: "A" | "B" | "C" | null,
  secondCat: StrengthCategory | null
): string {
  const intro =
    tier === "A" || !secondCat
      ? `${name}님에게는 상황이 달라져도 좀처럼 안 변하는 결 하나가 유독 뚜렷합니다.`
      : tier === "B"
      ? `${name}님에게는 유난히 강하게 작용하는 기준 하나에, 그에 못지않은 결 하나가 함께 있습니다.`
      : `${name}님에게는 어느 한쪽이 아니라, 비슷한 무게로 나란히 선 두 가지 결이 있습니다.`;
  return `${intro} ${AXIS_REAL_LIFE[topCat]}`;
}

const STAGE_ORDER_LIST: Stage[] = ["year", "month", "hour"];

/**
 * 관성(편관·정관)이 2장에서 차지할 위상을 3단계로 정한다 — 존재 여부와
 * 중요도를 분리한다:
 *  - "center": 관성 자체가 top이거나, second이면서 tier가 C(근소한 공동
 *    우세)일 때. 이때는 관살혼잡을 2장의 핵심 구조로 쓴다.
 *  - "supporting": 편관·정관이 실제로 둘 다 있지만(관살혼잡 실존) center
 *    조건에는 못 미칠 때 — 중심축 이야기를 밀어내지 않되, 존재 자체를
 *    지우지도 않고 보조 근거 한 문장으로만 반영한다.
 *  - "none": 편관·정관이 하나도 없거나(관살혼잡 자체가 없음), 하나만
 *    있는데(관살혼잡 아님) top/second 근처도 아닐 때 — 아무것도 넣지 않는다.
 */
function gwansalRelevance(
  topCat: StrengthCategory,
  secondCat: StrengthCategory | null,
  tier: "A" | "B" | "C" | null,
  pyeongwanStages: Stage[],
  jeonggwanStages: Stage[]
): AxisRelevance {
  const hasBoth = pyeongwanStages.length > 0 && jeonggwanStages.length > 0;
  return classifyAxisRelevance({
    topCategory: topCat,
    secondCategory: secondCat,
    tier,
    candidateCategory: "관성",
    candidateHasNotableStructure: hasBoth,
  });
}

/** [문장만 수정] "~걸쳐 있어, 책임감이 한 겹 더 얹히는" — 이미 구체적 느낌이라
 * 큰 틀은 유지하고, 앞부분만 결과 중심으로 다듬었다. */
function buildGwansalSupportingNote(pyeongwanStages: Stage[], jeonggwanStages: Stage[]): string {
  const stages = STAGE_ORDER_LIST.filter((s) => pyeongwanStages.includes(s) || jeonggwanStages.includes(s));
  return `여기에 더해, 약속이나 부탁받은 일을 어기는 걸 유독 못 견디는 마음도 있습니다 — ${joinStages(stages.map((s) => STAGE_LABEL[s]))}부터 계속 그래왔습니다. 사소한 약속도 못 지키면 상대가 서운해할까 봐, 먼저 나서서 챙기는 편입니다.`;
}

/**
 * 2장 오프닝 전체 진입점. 순서: 실제 최상위 축 확인(①) →
 * tier에 맞는 어조로 세력 서술(②) → 관성의 위상을 center/supporting/none
 * 3단으로 판정해 그만큼만 반영(③).
 * "특수 구조 하나로 사람 전체를 설명"하지 않도록, 관살혼잡이 실존해도
 * 중심축보다 명확히 약하면 2장 전체를 관성 이야기로 바꾸지 않는다 —
 * 그렇다고 존재 자체를 지우지도 않는다(supporting 단계).
 */
export function buildChapterTwoOpening(appData: AppData): { title: string; body: string } | null {
  const strength = analyzeCategoryStrength(appData.user);
  if (!strength.top) return null;

  const topCat = strength.top.category;
  const secondCat = strength.second?.category ?? null;
  const tier = strength.tier;
  const { pyeongwanStages, jeonggwanStages } = findAllGwansalPositions(appData);
  const relevance = gwansalRelevance(topCat, secondCat, tier, pyeongwanStages, jeonggwanStages);

  const bodyParts = [buildAxisStrengthClause(appData.user.name, topCat, tier, secondCat)];
  let title = AXIS_TITLE[topCat];

  if (relevance === "center") {
    const gwansalDetail = buildGwansalPositionDetail(pyeongwanStages, jeonggwanStages);
    if (gwansalDetail) bodyParts.push(gwansalDetail);
    // 이 축이 "실제 삶에서 어떻게 나타나는지"는 3장(chapterThreeNarrative.ts의
    // AXIS_PROFILE.pressureVerb/relationalConsequence)이 같은 축을 훨씬
    // 구체적으로 다룬다 — 2장은 "이 축이 무엇인지"까지만 소개한다(중복 방지).
    // 편관·정관이 실제로 둘 다 있을 때만 "두 기준" 이원구도 제목을 쓴다 —
    // 하나만 있으면(관살혼잡 아님) 위에서 이미 정한 일반 관성 제목(title)을
    // 그대로 둔다.
    const hasBothForTitle = pyeongwanStages.length > 0 && jeonggwanStages.length > 0;
    if (topCat === "관성" && hasBothForTitle) {
      const sameStage =
        pyeongwanStages.length === 1 && jeonggwanStages.length === 1 && pyeongwanStages[0] === jeonggwanStages[0];
      title = sameStage
        ? "누구보다 자신에게 엄격한 사람입니다."
        : "시기마다 다른 기준으로 자신을 다잡는 사람입니다.";
    }
  } else if (relevance === "supporting") {
    bodyParts.push(buildGwansalSupportingNote(pyeongwanStages, jeonggwanStages));
  }

  return { title, body: bodyParts.join(" ") };
}

/**
 * 04번(기질) 오프닝 보정 — 일지가 그 사람의 일간 기준 천을귀인에 해당할
 * 때만 붙이는 실제 사실 문장. 새 명리 계산이 아니라 이미 있는
 * isCheoneulGwiin(hanjaTables.ts)을 그대로 쓴다. 해당하지 않는 사람에게는
 * null을 반환하고, 화면에서는 이 경우 아무 문장도 추가하지 않는다 — 기존
 * temperament 문단이 그대로 오프닝 역할을 하므로, 없는 사실을 지어내
 * 채우지 않는다.
 */
export function buildCheoneulGwiinOpening(appData: AppData): string | null {
  const { user } = appData;
  const dayGan = user.pillars.day.hanja;
  const dayZhi = user.pillars.branches.day.hanja;
  if (!isCheoneulGwiin(dayGan, dayZhi)) return null;

  const dayGanHangul = user.pillars.day.hangul;
  const dayZhiHangul = user.pillars.branches.day.hangul;
  return `${dayGanHangul}${dayZhiHangul}(${dayGan}${dayZhi}) 일주는 사주 명리학에서 흔히 "일지에 천을귀인을 깔고 앉은 귀한 팔자"로 불립니다. 실제로 이 사람의 사주에도 그 귀인의 기운이 또렷이 새겨져 있습니다.`;
}

/** 8번(관계·현실) 전용 — CH1_TRUTH_SCENE[dayElement]가 말하는 "오해받는
 * 자질"의 이름(오행별로 다름 — 새 사실 아니라 그 문장 안에 이미 있는
 * 단어를 그대로 재사용). */
const TRUTH_QUALITY_NOUN: Record<Element, string> = {
  wood: "이끄는 힘",
  fire: "속마음",
  earth: "답답함",
  metal: "냉정함",
  water: "진심",
};

/**
 * 8번(관계·현실) 전용 연결 문장. 합/충 "개수"의 조합만 보고 고른다 —
 * 어느 자리인지(년지/일지 등)나 "합/충"이라는 용어, 시기는 문장에
 * 노출하지 않는다. CH1_TRUTH_SCENE[dayElement] 뒤에 별도 문단으로 붙인다.
 */
export function buildRelationshipConnector(appData: AppData): string {
  const key = buildInterpretationKey(appData);
  const { branchHeCount: he, branchChongCount: chong } = key;
  const noun = TRUTH_QUALITY_NOUN[key.dayElement];

  if (he > 0 && chong > 0) {
    return `이 ${noun}은 모든 관계에서 똑같은 무게로 나타나지는 않습니다. 유독 부딪히는 상대가 있는가 하면, 이상하게 손발이 잘 맞는 상대도 있습니다 — 사람에 따라 관계의 온도가 크게 달라지는 편입니다.`;
  }
  if (he >= 2 && chong === 0) {
    return `이 ${noun}은 여러 관계에 골고루 나뉘기보다, 유독 한 사람 앞에서 몰아서 드러나는 경향이 있습니다. 마음이 여기저기 흩어지기보다 한쪽으로 쏠려 있는 구조이기 때문입니다.`;
  }
  if (he === 1 && chong === 0) {
    return `다만 이 ${noun}은 크게 부딪히는 형태로 터지기보다, 겉으로 잘 드러나지 않은 채 조용히 쌓이는 쪽에 가깝습니다. 정면으로 맞서기보다, 알게 모르게 얽혀 있는 관계 속에서 이 온도차를 오래 품고 가는 편입니다.`;
  }
  if (he === 0 && chong > 0) {
    return `이 ${noun}은 편안하게 스며들기보다, 부딪히고 나서야 서로를 제대로 알아가는 쪽에 가깝습니다.`;
  }
  return "";
}
