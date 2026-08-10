"use client";

import { StoryScene } from "@/types/story";
import { groupIntoParagraphs, renderWithHighlights } from "./highlightText";

export default function HeadlineScene({ scene }: { scene: StoryScene }) {
  const paragraphs = groupIntoParagraphs(scene.narrative, 2);

  return (
    <div>
      <h2
        className={`font-serif-kr font-bold text-sceneText ${
          scene.visualType === "hero"
            ? "text-[20px] leading-[1.3] tracking-normal sm:text-[40px] sm:leading-snug"
            : scene.visualType === "quote"
            ? "text-[19px] italic leading-[1.35] tracking-normal sm:text-[30px] sm:leading-relaxed"
            : "text-[19px] leading-[1.3] tracking-normal sm:text-[30px] sm:leading-snug"
        }`}
        style={{ wordBreak: "keep-all" }}
      >
        {renderWithHighlights(scene.headline, { overrides: scene.highlights, max: 1 })}
      </h2>
      <div className="mt-6 flex flex-col gap-6 sm:mt-6 sm:gap-6">
        {paragraphs.map((p, i) => (
          <p
            key={i}
            className="text-[14.5px] leading-[1.85] tracking-[0.005em] text-sceneBody sm:text-[19px] sm:leading-[1.8] sm:tracking-wide"
          >
            {renderWithHighlights(p, { overrides: scene.highlights })}
          </p>
        ))}
      </div>
    </div>
  );
}
