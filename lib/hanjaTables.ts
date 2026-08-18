export type Element = "wood" | "fire" | "earth" | "metal" | "water";

export const GAN_HANGUL: Record<string, string> = {
  甲: "갑",
  乙: "을",
  丙: "병",
  丁: "정",
  戊: "무",
  己: "기",
  庚: "경",
  辛: "신",
  壬: "임",
  癸: "계",
};

export const ZHI_HANGUL: Record<string, string> = {
  子: "자",
  丑: "축",
  寅: "인",
  卯: "묘",
  辰: "진",
  巳: "사",
  午: "오",
  未: "미",
  申: "신",
  酉: "유",
  戌: "술",
  亥: "해",
};

export const GAN_YINYANG: Record<string, "yang" | "yin"> = {
  甲: "yang",
  乙: "yin",
  丙: "yang",
  丁: "yin",
  戊: "yang",
  己: "yin",
  庚: "yang",
  辛: "yin",
  壬: "yang",
  癸: "yin",
};

export const GAN_ELEMENT: Record<string, Element> = {
  甲: "wood",
  乙: "wood",
  丙: "fire",
  丁: "fire",
  戊: "earth",
  己: "earth",
  庚: "metal",
  辛: "metal",
  壬: "water",
  癸: "water",
};

export const ZHI_ELEMENT: Record<string, Element> = {
  子: "water",
  丑: "earth",
  寅: "wood",
  卯: "wood",
  辰: "earth",
  巳: "fire",
  午: "fire",
  未: "earth",
  申: "metal",
  酉: "metal",
  戌: "earth",
  亥: "water",
};

export const ELEMENT_LABEL: Record<Element, string> = {
  wood: "목(木)",
  fire: "화(火)",
  earth: "토(土)",
  metal: "금(金)",
  water: "수(水)",
};

// lunar-javascript returns 십성 in Chinese (simplified) terms; map to Korean labels.
export const SIPSEONG_KO: Record<string, string> = {
  比肩: "비견",
  劫财: "겁재",
  食神: "식신",
  伤官: "상관",
  偏财: "편재",
  正财: "정재",
  七杀: "편관",
  正官: "정관",
  偏印: "편인",
  正印: "정인",
  日主: "일간",
};

// 12신살 순서 (고정): index 0 = 겁살 ... index 3 = 지살 ... index 9 = 역마살 ... index 11 = 화개살
export const SINSAL_NAMES = [
  "겁살",
  "재살",
  "천살",
  "지살",
  "년살",
  "월살",
  "망신살",
  "장성살",
  "반안살",
  "역마살",
  "육해살",
  "화개살",
] as const;

// 지지 순환 순서 (子=0 ... 亥=11)
export const ZHI_ORDER = [
  "子",
  "丑",
  "寅",
  "卯",
  "辰",
  "巳",
  "午",
  "未",
  "申",
  "酉",
  "戌",
  "亥",
];

// 삼합국 생지(生支) — 년지가 속한 그룹의 기준점
const SAENGJI_BY_ZHI: Record<string, string> = {
  寅: "寅",
  午: "寅",
  戌: "寅", // 火局
  申: "申",
  子: "申",
  辰: "申", // 水局
  巳: "巳",
  酉: "巳",
  丑: "巳", // 金局
  亥: "亥",
  卯: "亥",
  未: "亥", // 木局
};

export function getSinsalName(referenceYearZhi: string, targetZhi: string): string {
  const saengji = SAENGJI_BY_ZHI[referenceYearZhi];
  const saengjiIdx = ZHI_ORDER.indexOf(saengji);
  const targetIdx = ZHI_ORDER.indexOf(targetZhi);
  const diff = ((targetIdx - saengjiIdx + 3) % 12 + 12) % 12;
  return SINSAL_NAMES[diff];
}

// 천을귀인: 일간 기준으로 해당하는 지지 2개
const CHEONEUL_GWIIN: Record<string, string[]> = {
  甲: ["丑", "未"],
  戊: ["丑", "未"],
  庚: ["丑", "未"],
  乙: ["子", "申"],
  己: ["子", "申"],
  丙: ["亥", "酉"],
  丁: ["亥", "酉"],
  壬: ["卯", "巳"],
  癸: ["卯", "巳"],
  辛: ["寅", "午"],
};

export function isCheoneulGwiin(dayGan: string, targetZhi: string): boolean {
  return (CHEONEUL_GWIIN[dayGan] || []).includes(targetZhi);
}

// 오행 상생상극 고정표 — storyScenes.ts(5장)와 natalStructure.ts(득령)가
// 함께 쓰는 공용 유틸이라 여기(hanjaTables.ts)로 옮겨 중복 정의를 막는다.
export const GENERATES: Record<Element, Element> = {
  wood: "fire",
  fire: "earth",
  earth: "metal",
  metal: "water",
  water: "wood",
};

export const OVERCOMES: Record<Element, Element> = {
  wood: "earth",
  fire: "metal",
  earth: "water",
  metal: "wood",
  water: "fire",
};

export function elementThatGenerates(target: Element): Element {
  return (Object.keys(GENERATES) as Element[]).find((e) => GENERATES[e] === target)!;
}

export function elementThatOvercomes(target: Element): Element {
  return (Object.keys(OVERCOMES) as Element[]).find((e) => OVERCOMES[e] === target)!;
}

// lunar-javascript가 중국어(간체)로 반환하는 12운성을 한글로 매핑한다.
export const DI_SHI_KO: Record<string, string> = {
  长生: "장생",
  沐浴: "목욕",
  冠带: "관대",
  临官: "건록",
  帝旺: "제왕",
  衰: "쇠",
  病: "병",
  死: "사",
  墓: "묘",
  绝: "절",
  胎: "태",
  养: "양",
};
