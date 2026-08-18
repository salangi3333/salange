export interface PillarCell {
  hanja: string;
  hangul: string;
  element: "wood" | "fire" | "earth" | "metal" | "water";
  sipseong: string;
}

/** CALCULATION층 — 한 지지(년/월/일/시)에 딸린 raw 값. lunar-javascript가
 * 반환하는 값을 그대로 옮긴 것으로, 해석은 붙이지 않는다. */
export interface PillarExtra {
  /** 지장간 전체(한자). index 0 = 본기(이미 십성 계산에 쓰는 값과 동일) */
  hideGan: string[];
  /** 12운성(한글): 장생·목욕·관대·건록·제왕·쇠·병·사·묘·절·태·양 */
  diShi: string;
}

/** CALCULATION층 — 01장 화면에 바로 노출하지 않는 raw 명리 계산값 묶음. */
export interface NatalRaw {
  pillars: {
    year: PillarExtra;
    month: PillarExtra;
    day: PillarExtra;
    hour: PillarExtra | null;
  };
  /** 공망 지지 2글자(한자), 예: "寅卯" */
  dayXunKong: string;
  /** 납음오행 원문(한자). 실제 노출 시점에 한글화 여부를 별도 결정한다. */
  dayNaYin: string;
}

export interface SajuUser {
  name: string;
  typeName: string;
  typeLabel: string;
  dayPillar: string;
  oneLiner: string;
  pillars: {
    hour: PillarCell | null;
    day: PillarCell;
    month: PillarCell;
    year: PillarCell;
    branches: { hour: PillarCell | null; day: PillarCell; month: PillarCell; year: PillarCell };
  };
  sinsal: string[];
  stats: { label: string; score: number; percentile?: string; locked?: boolean }[];
  charCount: number;
  natal: NatalRaw;
}

export interface StoryblockSection {
  labelHanja: string;
  title: string;
  introHighlightCount: number;
  heading: string;
  paragraphs: { text: string; highlights?: string[] }[];
  badges?: { label: string; score: number }[];
  hookQuestion: string;
  lockedPreview?: string;
  summaryCard?: {
    elements: { hanja: string; label: string; color: string }[];
    resultPhrase: string;
    probability: number;
  };
}

export interface Testimonial {
  headline: string;
  rating: number;
  authorMasked: string;
  paymentBadge: string;
  daysAgo: string;
  body: { text: string; highlight?: string }[];
  hashtags: string[];
  helpfulCount: number;
}

export interface LiveViewer {
  nameMasked: string;
  typeLabel: string;
  percent: number;
  visitCount: number;
}

export interface ReportPart {
  index: number;
  title: string;
  subtitle: string;
  progress: string;
  items: { text: string; locked: boolean }[];
  expandedByDefault?: boolean;
}

export interface AssetFlowPoint {
  label: string;
  value: number;
}
