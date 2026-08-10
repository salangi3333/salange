import { Solar } from "lunar-javascript";
import { Element, GAN_ELEMENT, ZHI_ELEMENT, GAN_YINYANG, GAN_HANGUL, ZHI_HANGUL, ELEMENT_LABEL } from "./hanjaTables";

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

const GENERATES: Record<Element, Element> = {
  wood: "fire",
  fire: "earth",
  earth: "metal",
  metal: "water",
  water: "wood",
};

const OVERCOMES: Record<Element, Element> = {
  wood: "earth",
  fire: "metal",
  earth: "water",
  metal: "wood",
  water: "fire",
};

export function computeSipseong(dayGan: string, targetGan: string): string {
  const dayEl = GAN_ELEMENT[dayGan];
  const targetEl = GAN_ELEMENT[targetGan];
  const sameYinYang = GAN_YINYANG[dayGan] === GAN_YINYANG[targetGan];

  if (dayEl === targetEl) return sameYinYang ? "비견" : "겁재";
  if (GENERATES[dayEl] === targetEl) return sameYinYang ? "식신" : "상관";
  if (GENERATES[targetEl] === dayEl) return sameYinYang ? "편인" : "정인";
  if (OVERCOMES[dayEl] === targetEl) return sameYinYang ? "편재" : "정재";
  return sameYinYang ? "편관" : "정관";
}

interface YearTemplate {
  keyword: string;
  overviewVariants: string[];
  wealth: string;
  career: string;
  love: string;
  opportunity: string;
  caution: string;
  action: string;
  baseScore: number;
}

const SIPSEONG_YEAR_TEMPLATE: Record<string, YearTemplate> = {
  비견: {
    keyword: "동료운",
    overviewVariants: [
      "나와 같은 기운이 강해지는 해로, 독립적인 시도와 협업이 동시에 두드러집니다.",
      "스스로의 힘을 믿고 새로운 영역에 도전하기 좋은 흐름이 흐릅니다.",
    ],
    wealth: "동업이나 공동 투자보다는 스스로 판단해 움직이는 쪽이 유리한 재물운입니다.",
    career: "혼자 주도하는 프로젝트나 독립적인 업무에서 성과가 두드러지는 시기입니다.",
    love: "기존 관계에서는 주도권 다툼이 생기기 쉽고, 새로운 인연은 비슷한 성향의 사람에게 끌립니다.",
    opportunity: "스스로 방향을 정하고 밀어붙이면 좋은 결과로 이어질 수 있는 해입니다.",
    caution: "고집이 세지는 시기라 주변과의 협의를 소홀히 하면 갈등이 커질 수 있습니다.",
    action: "중요한 결정은 혼자 내리기보다 믿을 만한 사람과 먼저 상의해보세요.",
    baseScore: 66,
  },
  겁재: {
    keyword: "경쟁운",
    overviewVariants: [
      "경쟁과 비교가 잦아지는 해로, 재물과 관계 모두에서 신중함이 필요합니다.",
      "가진 것을 지키는 데 집중해야 하는 흐름이 이어집니다.",
    ],
    wealth: "충동적인 지출이나 보증, 동업 관련 손실을 특히 조심해야 하는 시기입니다.",
    career: "경쟁자가 눈에 띄게 늘어나는 시기로, 성과를 지키려는 노력이 필요합니다.",
    love: "삼각관계나 경쟁 구도가 생기기 쉬워 관계 관리에 세심함이 필요합니다.",
    opportunity: "위기감이 오히려 실력을 끌어올리는 계기가 될 수 있습니다.",
    caution: "돈 문제, 특히 빌려주거나 보증서는 일은 이 시기에는 피하는 것이 좋습니다.",
    action: "큰 금전 거래는 미루고, 이미 가진 것을 지키는 데 집중하세요.",
    baseScore: 54,
  },
  식신: {
    keyword: "여유운",
    overviewVariants: [
      "표현력과 여유가 살아나는 해로, 취미와 창작 활동에서 좋은 성과가 나옵니다.",
      "몸과 마음이 편안해지고 관계도 부드러워지는 흐름입니다.",
    ],
    wealth: "꾸준하고 안정적인 방식으로 재물이 조금씩 쌓이는 시기입니다.",
    career: "창의성과 표현력을 살릴 수 있는 일에서 인정받기 좋은 시기입니다.",
    love: "여유로운 마음이 매력으로 작용해 좋은 인연이 다가올 수 있습니다.",
    opportunity: "새로운 취미나 부업을 시작하기에 좋은 흐름이 흐릅니다.",
    caution: "여유가 지나쳐 나태해지지 않도록 균형을 잡는 것이 중요합니다.",
    action: "미뤄뒀던 자기계발이나 취미를 다시 시작해보세요.",
    baseScore: 80,
  },
  상관: {
    keyword: "변화운",
    overviewVariants: [
      "예리함과 표현욕이 강해지는 해로, 기존 틀을 깨는 시도가 두드러집니다.",
      "말과 행동이 날카로워지기 쉬워 주변과의 마찰에 유의해야 합니다.",
    ],
    wealth: "새로운 아이디어로 수익을 만들 기회가 있지만 즉흥적인 지출도 늘어납니다.",
    career: "기존 방식에 답답함을 느끼고 변화를 시도하려는 마음이 커집니다.",
    love: "직설적인 표현이 매력이 되기도 하지만 다툼의 원인이 되기도 합니다.",
    opportunity: "틀을 깨는 아이디어가 실제 성과로 이어질 수 있는 해입니다.",
    caution: "윗사람이나 조직과의 마찰, 구설수에 오르지 않도록 말을 조심해야 합니다.",
    action: "하고 싶은 말은 감정을 가라앉힌 뒤에 전달하는 습관을 들이세요.",
    baseScore: 58,
  },
  편재: {
    keyword: "확장운",
    overviewVariants: [
      "활동 범위가 넓어지고 크고 작은 재물의 기회가 늘어나는 해입니다.",
      "사람을 통해 돈이 오가는 일이 많아지는 흐름입니다.",
    ],
    wealth: "예상치 못한 수입이나 투자 기회가 생기기 쉬운, 재물운이 활발한 시기입니다.",
    career: "영업, 사업, 대외 활동처럼 넓게 움직이는 일에서 성과가 나기 좋습니다.",
    love: "새로운 사람을 만날 기회가 많아지고 이성 관계도 활발해지는 흐름입니다.",
    opportunity: "투자나 새로운 사업 기회를 살펴보기 좋은 해입니다.",
    caution: "씀씀이가 커지기 쉬워 계획 없는 지출은 재물을 흩어지게 만들 수 있습니다.",
    action: "들어오는 기회는 반기되, 지출 계획은 미리 세워두세요.",
    baseScore: 76,
  },
  정재: {
    keyword: "안정운",
    overviewVariants: [
      "성실함이 결실을 맺는 해로, 꾸준히 쌓아온 것들이 안정적으로 자리 잡습니다.",
      "재물과 관계 모두 착실하게 쌓이는 흐름이 이어집니다.",
    ],
    wealth: "고정 수입이나 저축이 안정적으로 늘어나는, 한 해 중 재물운이 가장 좋은 시기 중 하나입니다.",
    career: "꾸준함과 신뢰가 인정받아 안정적인 위치를 다지기 좋은 시기입니다.",
    love: "결혼이나 정착을 생각하기에 좋은, 안정적인 관계운이 흐르는 시기입니다.",
    opportunity: "그동안 쌓아온 노력이 눈에 보이는 결과로 나타나는 해입니다.",
    caution: "안정에 안주해 새로운 기회를 놓치지 않도록 균형이 필요합니다.",
    action: "저축이나 장기 계획을 세우기에 가장 좋은 시기이니 실행에 옮겨보세요.",
    baseScore: 88,
  },
  편관: {
    keyword: "긴장운",
    overviewVariants: [
      "부담과 책임이 커지는 해로, 시험이나 승부처가 찾아오기 쉽습니다.",
      "압박 속에서 성장하는 흐름이지만 체력 관리가 중요합니다.",
    ],
    wealth: "지출이 늘거나 예상치 못한 비용이 발생하기 쉬운 시기라 여유 자금이 필요합니다.",
    career: "책임이 무거워지는 승진이나 시험, 경쟁이 몰려오기 쉬운 시기입니다.",
    love: "관계에서 갈등이나 시험대에 오르는 상황이 생기기 쉬운 흐름입니다.",
    opportunity: "위기를 잘 넘기면 이후 크게 인정받는 계기가 될 수 있습니다.",
    caution: "무리한 몸 상태나 스트레스가 건강 문제로 이어지지 않도록 조심해야 합니다.",
    action: "체력과 컨디션 관리를 최우선으로 챙기고, 무리한 결정은 미루세요.",
    baseScore: 52,
  },
  정관: {
    keyword: "명예운",
    overviewVariants: [
      "책임과 인정이 함께 따라오는 해로, 사회적 위치가 한 단계 올라가기 좋습니다.",
      "질서 있고 안정적인 흐름 속에서 신뢰를 쌓는 시기입니다.",
    ],
    wealth: "안정적인 직장이나 사업 소득을 중심으로 재물이 꾸준히 들어옵니다.",
    career: "승진, 자격 취득, 조직 내 인정처럼 사회적 성취를 이루기 좋은 시기입니다.",
    love: "책임감 있는 관계, 결혼이나 진지한 만남으로 이어지기 좋은 흐름입니다.",
    opportunity: "그동안의 노력을 공식적으로 인정받을 기회가 찾아오는 해입니다.",
    caution: "책임이 많아지는 만큼 스스로를 너무 몰아붙이지 않도록 주의가 필요합니다.",
    action: "미뤄왔던 자격증, 승진, 공식적인 도전을 지금 시작해보세요.",
    baseScore: 85,
  },
  편인: {
    keyword: "탐구운",
    overviewVariants: [
      "혼자만의 시간과 깊은 사색이 늘어나는 해로, 새로운 분야를 탐구하기 좋습니다.",
      "예민함이 커져 관계보다 자기 내면에 집중하게 되는 흐름입니다.",
    ],
    wealth: "큰 변동보다는 조용히 자산을 지키고 정리하는 데 유리한 시기입니다.",
    career: "전문성을 깊게 파고들거나 새로운 공부를 시작하기 좋은 시기입니다.",
    love: "혼자 있는 시간을 더 원하게 되어 관계에 소홀해지기 쉬운 흐름입니다.",
    opportunity: "남들이 가지 않는 분야를 파고들면 독보적인 강점이 될 수 있습니다.",
    caution: "지나친 예민함과 의심이 관계를 멀어지게 하지 않도록 주의가 필요합니다.",
    action: "관심 있던 분야를 깊이 공부하되, 주변 사람들과의 연락을 놓지 마세요.",
    baseScore: 60,
  },
  정인: {
    keyword: "귀인운",
    overviewVariants: [
      "도움을 주는 사람이 나타나는 해로, 배움과 성장의 기회가 자연스럽게 찾아옵니다.",
      "마음이 편안해지고 주변의 지지를 받기 좋은 흐름입니다.",
    ],
    wealth: "큰 수익보다는 안정적으로 자산을 지키고 불리기 좋은 시기입니다.",
    career: "좋은 스승이나 조력자를 만나 실력을 키우기 좋은 시기입니다.",
    love: "가족이나 주변의 지지를 받는 안정적인 관계로 발전하기 좋은 흐름입니다.",
    opportunity: "귀인의 도움으로 예상보다 쉽게 문제가 풀리는 해입니다.",
    caution: "의존이 지나치면 스스로 결정하는 힘이 약해질 수 있으니 주의하세요.",
    action: "배우고 싶었던 것을 지금 시작하고, 주변의 조언에 귀 기울이세요.",
    baseScore: 78,
  },
};

export interface YearFortuneItem {
  year: number;
  age: number;
  ganZhiHanja: string;
  ganZhiHangul: string;
  sipseong: string;
  element: Element;
  keyword: string;
  overview: string;
  wealth: string;
  career: string;
  love: string;
  opportunity: string;
  caution: string;
  action: string;
  score: number;
}

export function buildTenYearFortune(
  dayGan: string,
  birthYear: number,
  seed: string
): YearFortuneItem[] {
  const startYear = new Date().getFullYear();
  const items: YearFortuneItem[] = [];

  for (let i = 0; i < 10; i++) {
    const year = startYear + i;
    const solar = Solar.fromYmd(year, 6, 15);
    const ec = solar.getLunar().getEightChar();
    const yearGan = ec.getYearGan();
    const yearZhi = ec.getYearZhi();
    const sipseong = computeSipseong(dayGan, yearGan);
    const template = SIPSEONG_YEAR_TEMPLATE[sipseong];
    const h = hashSeed(`${seed}-${year}`);

    items.push({
      year,
      age: year - birthYear + 1,
      ganZhiHanja: `${yearGan}${yearZhi}`,
      ganZhiHangul: `${GAN_HANGUL[yearGan]}${ZHI_HANGUL[yearZhi]}`,
      sipseong,
      element: GAN_ELEMENT[yearGan],
      keyword: template.keyword,
      overview: template.overviewVariants[h % template.overviewVariants.length],
      wealth: template.wealth,
      career: template.career,
      love: template.love,
      opportunity: template.opportunity,
      caution: template.caution,
      action: template.action,
      score: Math.min(97, Math.max(30, template.baseScore + ((h >> 3) % 7) - 3)),
    });
  }

  return items;
}

export interface ElementAnalysis {
  counts: Record<Element, number>;
  strongest: Element;
  weakest: Element;
  summary: string;
}

export function buildElementAnalysis(chars: string[]): ElementAnalysis {
  const counts: Record<Element, number> = {
    wood: 0,
    fire: 0,
    earth: 0,
    metal: 0,
    water: 0,
  };

  chars.forEach((c) => {
    const el = GAN_ELEMENT[c] || ZHI_ELEMENT[c];
    if (el) counts[el] += 1;
  });

  const elements = Object.keys(counts) as Element[];
  let strongest = elements[0];
  let weakest = elements[0];
  elements.forEach((el) => {
    if (counts[el] > counts[strongest]) strongest = el;
    if (counts[el] < counts[weakest]) weakest = el;
  });

  const summary = `당신의 사주는 ${ELEMENT_LABEL[strongest]} 기운이 ${counts[strongest]}개로 가장 강하고, ${ELEMENT_LABEL[weakest]} 기운이 ${counts[weakest]}개로 가장 약합니다. ${ELEMENT_LABEL[strongest]}이 강한 만큼 그 기운의 장점이 두드러지지만, ${ELEMENT_LABEL[weakest]}이 부족한 부분은 의식적으로 보완하면 삶의 균형을 맞추는 데 도움이 됩니다.`;

  return { counts, strongest, weakest, summary };
}

const ELEMENT_HEALTH: Record<Element, { organ: string; note: string }> = {
  wood: {
    organ: "간·담",
    note: "스트레스가 쌓이면 간과 눈의 피로로 먼저 나타나기 쉬우니, 정기적인 휴식과 스트레칭이 도움이 됩니다.",
  },
  fire: {
    organ: "심장·소장",
    note: "감정 기복이 클 때 심장과 혈액순환에 부담이 갈 수 있어, 충분한 수면과 마음의 안정이 중요합니다.",
  },
  earth: {
    organ: "비장·위",
    note: "생각이 많아지고 불규칙한 식사가 이어지면 소화기에 탈이 나기 쉬우니, 규칙적인 식습관이 중요합니다.",
  },
  metal: {
    organ: "폐·대장",
    note: "긴장과 슬픔을 오래 억누르면 호흡기와 장 건강에 영향을 줄 수 있어, 깊은 호흡과 운동이 도움이 됩니다.",
  },
  water: {
    organ: "신장·방광",
    note: "피로가 누적되면 신장과 허리, 체력 저하로 먼저 드러나기 쉬우니, 무리한 스케줄은 피하는 것이 좋습니다.",
  },
};

export function buildHealthNote(strongest: Element, weakest: Element): string {
  const weak = ELEMENT_HEALTH[weakest];
  const strong = ELEMENT_HEALTH[strongest];
  return `사주에 ${ELEMENT_LABEL[weakest]} 기운이 부족해 ${weak.organ} 건강에 특히 신경 쓰는 것이 좋습니다. ${weak.note} 반대로 ${ELEMENT_LABEL[strongest]} 기운이 강한 만큼 ${strong.organ} 쪽은 타고난 편이지만, 그 기운을 과하게 쓰면 오히려 부담이 될 수 있습니다.`;
}

const ELEMENT_MONEY_TRAIT: Record<Element, string> = {
  wood: "목(木) 기운은 계속 자라나는 나무처럼, 한 번 시작한 일을 꾸준히 키워나가며 재물을 불리는 성향입니다. 단기 수익보다는 장기적으로 성장하는 분야에서 재물운이 트입니다.",
  fire: "화(火) 기운은 타오르는 불처럼, 짧고 강하게 터지는 재물운을 타고났습니다. 트렌드에 민감하고 화제성 있는 분야에서 큰 수익을 만들지만, 열기가 식듯 지출도 빠르게 늘 수 있습니다.",
  earth: "토(土) 기운은 땅처럼, 꾸준히 쌓아 큰 자산을 만드는 재물 성향입니다. 부동산이나 실물 자산처럼 눈에 보이고 안정적인 곳에 재물이 잘 붙습니다.",
  metal: "금(金) 기운은 제련된 쇠처럼, 원칙과 계획에 따라 재물을 관리하는 성향입니다. 충동적인 투자보다는 분석하고 판단한 뒤 움직일 때 재물이 단단하게 쌓입니다.",
  water: "수(水) 기운은 흐르는 물처럼, 여러 경로를 통해 재물이 들고 나는 유연한 성향입니다. 정보와 사람을 통해 기회를 포착하는 재주가 있어 다양한 수입원을 만드는 데 강합니다.",
};

const ELEMENT_CAREER_TRAIT: Record<Element, string> = {
  wood: "목(木) 기운은 새로운 것을 개척하고 성장시키는 힘이 강해, 기획·교육·창업처럼 무언가를 키워나가는 일에서 능력을 발휘합니다.",
  fire: "화(火) 기운은 표현력과 열정이 강해, 홍보·방송·영업처럼 사람들 앞에 나서고 주목받는 일에서 두각을 나타냅니다.",
  earth: "토(土) 기운은 안정감과 신뢰를 주는 성향이라, 관리·행정·부동산처럼 중심을 잡고 조율하는 역할에서 인정받습니다.",
  metal: "금(金) 기운은 정확하고 원칙적인 성향이라, 법률·금융·기술처럼 기준과 분석이 중요한 분야에서 강점을 발휘합니다.",
  water: "수(水) 기운은 유연하고 정보에 밝은 성향이라, 유통·무역·연구처럼 흐름을 읽고 활용하는 일에서 두각을 나타냅니다.",
};

const ELEMENT_LOVE_TRAIT: Record<Element, string> = {
  wood: "목(木) 기운은 연애에서도 관계를 함께 성장시키려는 성향이 강해, 상대와 같은 방향을 바라볼 때 가장 편안함을 느낍니다.",
  fire: "화(火) 기운은 감정 표현이 솔직하고 뜨거워, 연애 초반의 강렬한 끌림은 크지만 그 온도를 오래 유지하는 노력이 필요합니다.",
  earth: "토(土) 기운은 안정적이고 믿음직한 연애 스타일로, 오래 지켜보고 신뢰를 쌓은 뒤 진지한 관계로 발전시키는 편입니다.",
  metal: "금(金) 기운은 분명한 기준을 가진 연애 스타일로, 원칙에 맞는 상대에게는 한없이 다정하지만 그렇지 않으면 마음을 잘 열지 않습니다.",
  water: "수(水) 기운은 감정이 유연하고 눈치가 빨라, 상대의 마음을 잘 읽지만 그만큼 마음이 자주 흔들리기도 하는 연애 스타일입니다.",
};

const ELEMENT_RELATIONSHIP_TRAIT: Record<Element, string> = {
  wood: "목(木) 기운은 사람을 이끌고 성장시키는 데 능해, 주변에서 자연스럽게 리더 역할을 맡게 되는 경우가 많습니다.",
  fire: "화(火) 기운은 밝고 사교적인 매력으로 사람을 빠르게 끌어모으지만, 깊은 관계로 이어가려면 꾸준한 관심이 필요합니다.",
  earth: "토(土) 기운은 든든한 존재감으로 주변 사람들이 편하게 기대는 역할을 맡는 경우가 많습니다.",
  metal: "금(金) 기운은 신뢰와 원칙을 중요하게 여겨, 소수와 깊게 사귀는 관계 방식을 선호합니다.",
  water: "수(水) 기운은 다양한 사람들과 두루 잘 지내는 사교성을 갖고 있지만, 얕은 관계에 머무르지 않도록 의식적인 노력이 필요합니다.",
};

export function buildPersonalTraitNotes(element: Element) {
  return {
    money: ELEMENT_MONEY_TRAIT[element],
    career: ELEMENT_CAREER_TRAIT[element],
    love: ELEMENT_LOVE_TRAIT[element],
    relationship: ELEMENT_RELATIONSHIP_TRAIT[element],
  };
}

export function buildLifeFlowSummary(
  typeLabel: string,
  resultQuote: string,
  strongestElement: Element
): string {
  return `${typeLabel}인 당신의 인생은 크게 세 흐름으로 나뉩니다. 초년에는 자신의 색깔을 찾아가는 시기를, 중년에는 ${ELEMENT_LABEL[strongestElement]} 기운을 바탕으로 가장 크게 뻗어나가는 시기를 지나며, 말년에는 그동안 쌓아온 것을 다듬고 완성하는 흐름으로 이어집니다. "${resultQuote}"라는 말처럼, 당신의 인생 전체를 관통하는 주제는 이 한 문장 안에 담겨 있습니다.`;
}
