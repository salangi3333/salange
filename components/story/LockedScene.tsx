"use client";

import { Lock } from "lucide-react";
import { StoryScene } from "@/types/story";
import { YearFortuneItem } from "@/lib/aiLifeReport";
import TimelineScene from "./TimelineScene";
import { renderWithHighlights } from "./highlightText";

export default function LockedScene({
  scene,
  tenYear,
  onUnlock,
}: {
  scene: StoryScene;
  tenYear?: YearFortuneItem[];
  onUnlock?: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <h2
        className="font-serif-kr text-[21px] font-bold leading-[1.3] tracking-normal text-sceneText sm:text-3xl sm:leading-snug"
        style={{ wordBreak: "keep-all" }}
      >
        {scene.headline}
      </h2>

      <div className="flex flex-col gap-6">
        {scene.narrative.map((p, i) => (
          <p key={i} className="text-[14.5px] leading-[1.85] tracking-[0.005em] text-sceneBody sm:text-[19px] sm:leading-[1.8]">
            {renderWithHighlights(p)}
          </p>
        ))}
      </div>

      {tenYear && <TimelineScene tenYear={tenYear} />}

      <button
        onClick={onUnlock}
        className="relative mt-2 overflow-hidden rounded-card border border-sceneGold/30 bg-sceneCard px-5 py-6 text-left shadow-[0_10px_28px_rgba(0,0,0,0.35)]"
      >
        <div className="flex flex-col gap-2 opacity-80 blur-[3px] select-none">
          <p className="text-sm font-medium text-sceneCardText">여기서부터는 시기가 등장합니다.</p>
          <p className="text-sm font-medium text-sceneCardText">돈이 움직이는 정확한 구간</p>
          <p className="text-sm font-medium text-sceneCardText">관계가 결정되는 해</p>
          <p className="text-sm font-medium text-sceneCardText">앞으로 가장 큰 전환점</p>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-sceneCard/70">
          <Lock size={20} className="text-sceneGold" />
          <span className="text-xs font-bold text-sceneGold">
            다음 장면은 아직 열리지 않았습니다
          </span>
        </div>
      </button>
    </div>
  );
}
