export interface PillarCell {
  hanja: string;
  hangul: string;
  element: "wood" | "fire" | "earth" | "metal" | "water";
  sipseong: string;
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
