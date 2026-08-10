import { ReactNode } from "react";
import { StoryHighlight } from "@/types/story";

/**
 * Presentation-only keyword highlighter. Wraps up to `max` matching
 * phrases per string in a colored <strong>, without altering the
 * underlying text content. Never colors a whole sentence — only the
 * matched phrase. Does not touch StoryScene data.
 *
 * Word/phrase lists are tuned to the vocabulary actually used across
 * lib/storyScenes.ts (CH1~5 FACT/ACTION/LEAK tables) and
 * lib/aiLifeReport.ts (SIPSEONG_YEAR_TEMPLATE, trait notes), so emphasis
 * reliably fires on real content instead of rarely matching.
 */
const GOLD_WORDS = [
  "가장 큰 장점",
  "숨은 기회",
  "분명한 기회",
  "돈을 만드는 힘",
  "먼저 떼어 따로 모아두세요",
  "일정 비율을 먼저",
  "습관을 들이세요",
  "지켜줍니다",
  "연습이 필요합니다",
  "방향 수정",
  "숨은 기질",
  "결단력",
  "재물",
  "기회",
  "재물운",
  "행운",
  "귀인",
  "안정",
  "확장",
  "성장",
  "여유",
  "인정",
  "장점",
  "신뢰",
  "든든함",
  "관계",
  "인연",
  "건강",
  "결정",
  "돈",
  "후반으로 갈수록",
];

const RED_WORDS = [
  "충동적인 지출",
  "동업 관련 손실",
  "보증",
  "조심해야 하는 시기",
  "반복되는 문제",
  "짚고 넘어가야",
  "잘못 쓰면 오히려 독이 됩니다",
  "선택이 문제입니다",
  "재물이 새는",
  "돈을 지키는 힘",
  "소진시킵니다",
  "오해",
  "혼자",
  "위축",
  "전환점",
  "주의",
  "위험",
  "긴장",
  "갈등",
  "조심",
  "부딪",
  "손실",
  "독이 됩니다",
];

type Tone = "gold" | "red" | "emphasis";

const ALL_WORDS = [
  ...GOLD_WORDS.map((w) => ({ word: w, tone: "gold" as Tone })),
  ...RED_WORDS.map((w) => ({ word: w, tone: "red" as Tone })),
].sort((a, b) => b.word.length - a.word.length);

const TONE_MAP: Record<StoryHighlight["tone"], Tone> = {
  gold: "gold",
  danger: "red",
  emphasis: "emphasis",
};

const TONE_CLASS: Record<Tone, string> = {
  gold: "text-sceneGold",
  red: "text-sceneRed",
  emphasis: "text-sceneText font-extrabold",
};

export function renderWithHighlights(
  text: string,
  maxOrOpts: number | { max?: number; overrides?: StoryHighlight[] } = 2
): ReactNode {
  const opts = typeof maxOrOpts === "number" ? { max: maxOrOpts } : maxOrOpts;
  const max = opts.max ?? 2;

  const matches: { index: number; length: number; tone: Tone }[] = [];

  // Explicit scene-level overrides take priority over the generic dictionary.
  for (const { text: word, tone } of opts.overrides ?? []) {
    if (matches.length >= max) break;
    const idx = text.indexOf(word);
    if (idx === -1) continue;
    matches.push({ index: idx, length: word.length, tone: TONE_MAP[tone] });
  }

  for (const { word, tone } of ALL_WORDS) {
    if (matches.length >= max) break;
    const idx = text.indexOf(word);
    if (idx === -1) continue;
    const overlaps = matches.some(
      (m) => idx < m.index + m.length && idx + word.length > m.index
    );
    if (overlaps) continue;
    matches.push({ index: idx, length: word.length, tone });
  }

  if (matches.length === 0) return text;

  matches.sort((a, b) => a.index - b.index);

  const nodes: ReactNode[] = [];
  let cursor = 0;
  matches.forEach((m, i) => {
    if (m.index > cursor) nodes.push(text.slice(cursor, m.index));
    nodes.push(
      <strong key={i} className={TONE_CLASS[m.tone]}>
        {text.slice(m.index, m.index + m.length)}
      </strong>
    );
    cursor = m.index + m.length;
  });
  if (cursor < text.length) nodes.push(text.slice(cursor));

  return nodes;
}

/** Groups an array of narrative sentences/paragraphs into wider blocks
 * of 2–3 sentences each for looser, more readable paragraph spacing. */
export function groupIntoParagraphs(paragraphs: string[], perGroup = 2): string[] {
  const sentences = paragraphs.flatMap((p) =>
    p
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean)
  );

  const groups: string[] = [];
  for (let i = 0; i < sentences.length; i += perGroup) {
    groups.push(sentences.slice(i, i + perGroup).join(" "));
  }
  return groups;
}

/** Bolds the first sentence of a block (e.g. a realLife card), so the
 * headline sentence reads as a stronger lead-in than the rest of the body. */
export function splitLeadSentence(text: string): { lead: string; rest: string } {
  const idx = text.indexOf(".");
  if (idx === -1) return { lead: text, rest: "" };
  return { lead: text.slice(0, idx + 1), rest: text.slice(idx + 1).trim() };
}
