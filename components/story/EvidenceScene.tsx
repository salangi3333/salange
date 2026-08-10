"use client";

import { StorySceneEvidence } from "@/types/story";

export default function EvidenceScene({ items }: { items: StorySceneEvidence[] }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-3">
      {items.map((e, i) => (
        <div
          key={`${e.label}-${i}`}
          className="rounded-card border border-sceneGold/30 bg-sceneCard px-4 py-3 shadow-[0_10px_28px_rgba(0,0,0,0.35)]"
        >
          <p className="text-[12px] font-extrabold uppercase tracking-wider text-sceneGold/90">
            {e.label}
          </p>
          <p className="mt-1.5 text-[15px] font-bold text-sceneCardText">{e.detail}</p>
        </div>
      ))}
    </div>
  );
}
