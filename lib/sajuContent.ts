import { Element, ZHI_ELEMENT, GAN_ELEMENT, GAN_HANGUL, ZHI_HANGUL } from "./hanjaTables";
import { SajuUser, StoryblockSection, AssetFlowPoint } from "@/types";
import { DaYunItem, SajuCalculation, calculateSaju, IntakeFormData } from "./sajuEngine";
import { FortuneNode } from "@/components/FortuneTimeline";
import { GAN_PROFILE, ZHI_PROFILE } from "./ganZhiProfiles";

const ELEMENT_COLOR: Record<Element, string> = {
  wood: "#4C7A4A",
  fire: "#C0392B",
  earth: "#8A6D3B",
  metal: "#8C8C88",
  water: "#3B6EA5",
};

export function getTypeInfo(dayGan: string, dayZhi: string) {
  const gan = GAN_PROFILE[dayGan];
  const zhi = ZHI_PROFILE[dayZhi];
  return {
    typeName: `${dayGan}${dayZhi}-type`,
    typeLabel: `${zhi.scene} 속 ${gan.image}형`,
    oneLiner: `${zhi.scene}처럼 ${gan.coreTrait}`,
  };
}

export function getResultQuote(dayGan: string) {
  return GAN_PROFILE[dayGan].resultQuoteFragment;
}

// simple deterministic hash for reproducible pseudo-scores from a birth-derived seed
function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function hasBatchim(word: string): boolean {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return false;
  return code % 28 !== 0;
}

function countSipseongNote(sipseongList: string[]): { text: string; highlights?: string[] } | null {
  const counts = new Map<string, number>();
  for (const s of sipseongList) {
    if (!s || s === "일간") continue;
    counts.set(s, (counts.get(s) || 0) + 1);
  }
  let topLabel = "";
  let topCount = 0;
  for (const [label, count] of counts) {
    if (count > topCount) {
      topLabel = label;
      topCount = count;
    }
  }
  if (topCount >= 2) {
    const particle = hasBatchim(topLabel) ? "이" : "가";
    const phrase = `${topLabel}${particle} ${topCount}개`;
    return {
      text: `실제로 당신의 명식에는 ${phrase}나 자리하고 있어, 이 기운이 유난히 두드러지게 나타납니다.`,
      highlights: [phrase],
    };
  }
  if (counts.size >= 3) {
    return {
      text: "당신의 명식에는 서로 다른 기운이 고르게 섞여 있어, 한쪽으로 치우치지 않는 균형 잡힌 인상을 줍니다.",
    };
  }
  return null;
}

export function buildStoryblocks(
  dayGan: string,
  dayZhi: string,
  monthGan: string,
  sipseongList: string[] = []
): StoryblockSection[] {
  const gan = GAN_PROFILE[dayGan];
  const zhi = ZHI_PROFILE[dayZhi];
  const h = hashSeed(dayGan + dayZhi + monthGan);
  const sipseongNote = countSipseongNote(sipseongList);

  return [
    {
      labelHanja: "— 性氣質 —",
      title: "타고난 잠재력",
      introHighlightCount: 3,
      heading: gan.potential.heading,
      paragraphs: sipseongNote
        ? [...gan.potential.paragraphs, sipseongNote, { text: zhi.potentialNote }]
        : [...gan.potential.paragraphs, { text: zhi.potentialNote }],
      badges: gan.potential.badges,
      hookQuestion: "그렇다면 이 잠재력은 어떤 기질로 발현될까요?",
    },
    {
      labelHanja: "— 氣質 —",
      title: "타고난 기질",
      introHighlightCount: 2,
      heading: gan.temperament.heading,
      paragraphs: [...gan.temperament.paragraphs, { text: zhi.temperamentNote }],
      hookQuestion: "이 기질은 실제 삶 속에서 어떤 방식으로 드러날까요?",
      lockedPreview: gan.temperament.lockedPreview,
    },
    {
      labelHanja: "— 處世 —",
      title: "살아가는 방식",
      introHighlightCount: 4,
      heading: gan.lifestyle.heading,
      paragraphs: [...gan.lifestyle.paragraphs, { text: zhi.lifestyleNote }],
      badges: gan.lifestyle.badges,
      hookQuestion: "그렇다면 이 삶의 방식은 재물의 흐름과 어떻게 연결될까요?",
    },
    {
      labelHanja: "— 財流 —",
      title: "부의 흐름",
      introHighlightCount: 3,
      heading: gan.wealth.heading,
      paragraphs: [...gan.wealth.paragraphs, { text: zhi.wealthNote }],
      hookQuestion: "이제 이 조합이 만드는 실제 결과를 확인할 시간입니다.",
      summaryCard: {
        elements: [
          { hanja: dayGan, label: "일간", color: ELEMENT_COLOR[gan.element] },
          { hanja: dayZhi, label: "일지", color: ELEMENT_COLOR[ZHI_ELEMENT[dayZhi]] },
          { hanja: monthGan, label: "월간", color: ELEMENT_COLOR[GAN_ELEMENT[monthGan]] },
        ],
        resultPhrase: gan.wealth.resultPhrase,
        probability: Number((1.2 + (h % 40) / 10).toFixed(1)),
      },
    },
  ];
}

export function generateStats(dayGan: string, seed: string) {
  const gan = GAN_PROFILE[dayGan];
  const h = hashSeed(seed);

  const realStats = [...gan.potential.badges, ...gan.lifestyle.badges].map((badge) => ({
    label: badge.label,
    score: badge.score,
    percentile: `상위 ${Math.max(1, 100 - badge.score)}%`,
    locked: false,
  }));

  const scoreAt = (offset: number) => 55 + ((h >> offset) % 40);
  const lockedStats = [
    { label: "재물운", score: scoreAt(2) },
    { label: "인연운", score: scoreAt(10) },
  ].map((s) => ({
    ...s,
    percentile: `상위 ${Math.max(2, 100 - s.score - (h % 10))}%`,
    locked: true,
  }));

  return [...realStats, ...lockedStats];
}

export function buildAssetFlow(seed: string) {
  const h = hashSeed(seed);
  const base = [
    20 + (h % 20),
    35 + ((h >> 4) % 25),
    30 + ((h >> 8) % 30),
    70 + ((h >> 12) % 25),
  ];
  return [
    { label: "현재", value: base[0] },
    { label: "10년 뒤", value: base[1] },
    { label: "20년 뒤", value: base[2] },
    { label: "30년 뒤", value: base[3] },
  ];
}

export function buildFortuneTimeline(daYun: DaYunItem[], birthYear: number): FortuneNode[] {
  const currentYear = new Date().getFullYear();
  const currentAge = currentYear - birthYear + 1;

  return daYun.map((dy) => {
    let state: FortuneNode["state"] = "future";
    if (dy.endAge < currentAge) state = "past";
    else if (dy.startAge <= currentAge && currentAge <= dy.endAge) state = "current";
    return {
      age: `${dy.startAge}-${dy.endAge}`,
      label: dy.ganZhi,
      state,
    };
  });
}

export interface AppData {
  user: SajuUser;
  chars: string[];
  storyblocks: StoryblockSection[];
  resultQuote: string;
  assetFlowPoints: AssetFlowPoint[];
  fortuneTimelineNodes: FortuneNode[];
  birthYear: number;
}

export function buildAppDataFromCalc(calc: SajuCalculation, name: string): AppData {
  const dayZhi = calc.branches.day.hanja;
  const typeInfo = getTypeInfo(calc.dayGan, dayZhi);
  const dayPillar = `${GAN_HANGUL[calc.dayGan]}${ZHI_HANGUL[dayZhi]}(${calc.dayGan}${dayZhi}) 일주`;
  const seed = calc.chars.join("");

  const user: SajuUser = {
    name,
    typeName: typeInfo.typeName,
    typeLabel: typeInfo.typeLabel,
    dayPillar,
    oneLiner: typeInfo.oneLiner,
    pillars: {
      hour: calc.pillars.hour,
      day: calc.pillars.day,
      month: calc.pillars.month,
      year: calc.pillars.year,
      branches: calc.branches,
    },
    sinsal: calc.sinsal,
    stats: generateStats(calc.dayGan, seed),
    charCount: calc.charCount,
    natal: calc.natal,
  };

  return {
    user,
    chars: calc.chars,
    storyblocks: buildStoryblocks(calc.dayGan, dayZhi, calc.pillars.month.hanja, [
      calc.pillars.year.sipseong,
      calc.pillars.month.sipseong,
      calc.pillars.hour?.sipseong || "",
    ]),
    resultQuote: getResultQuote(calc.dayGan),
    assetFlowPoints: buildAssetFlow(seed),
    fortuneTimelineNodes: buildFortuneTimeline(calc.daYun, calc.birthYear),
    birthYear: calc.birthYear,
  };
}

export function buildAppData(formData: IntakeFormData): AppData {
  const calc = calculateSaju(formData);
  return buildAppDataFromCalc(calc, formData.name);
}
