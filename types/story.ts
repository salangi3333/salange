export type ReportTopic = "all" | "love" | "wealth" | "compatibility";

export interface StorySceneEvidence {
  label: string;
  detail: string;
}

/** An exact substring to emphasize within one of this scene's text fields,
 * used when the generic keyword dictionary (see highlightText.tsx) isn't
 * specific enough. Rendering never colors a whole sentence — only the
 * matched phrase. */
export interface StoryHighlight {
  text: string;
  tone: "gold" | "danger" | "emphasis";
}

export interface StoryScene {
  id: string;
  topic: ReportTopic;
  /** e.g. "第一章" — shown as a small badge above the headline when present. */
  chapterLabel?: string;
  chapterTitle?: string;
  /** 선녀(여성 명리사)의 대사. 문자열 하나는 한 줄, 배열은 여러 줄을
   * 순차적으로(짧은 pause를 두고) 보여주어 실제 대화하는 느낌을 만든다. */
  guideLine?: string | string[];
  headline: string;
  narrative: string[];
  evidence?: StorySceneEvidence[];
  realLife?: string;
  /** A blunt, direct statement — rendered with red emphasis. */
  fact?: string;
  /** Concrete action advice — rendered with gold emphasis. */
  action?: string;
  nextQuestion?: string;
  /** Explicit phrase-level highlight overrides, checked before the generic
   * keyword dictionary. Applied wherever the phrase appears (narrative,
   * realLife, fact, action). */
  highlights?: StoryHighlight[];
  /** Marks the last scene of a chapter — only these scenes show the
   * "다음 기록" label; other scenes show a quieter, unlabeled transition
   * line so the tag doesn't repeat on every screen. */
  chapterEnd?: boolean;
  visualType:
    | "hero"
    | "quote"
    | "pillars"
    | "elements"
    | "timeline"
    | "relationship"
    | "cover"
    | "locked"
    | "yearflow"
    | "movie"
    | "reveal"
    | "insight";
  isLocked: boolean;
}
