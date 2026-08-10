"use client";

import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { StoryblockSection as StoryblockSectionType } from "@/types";
import EightCharPreview from "./EightCharPreview";

function scrollToCTA() {
  document.getElementById("main-cta")?.scrollIntoView({ behavior: "smooth" });
}

function renderHighlighted(text: string, highlights: string[] = []) {
  if (highlights.length === 0) return text;
  const escaped = highlights.map((h) =>
    h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  );
  const re = new RegExp(`(${escaped.join("|")})`, "g");
  const parts = text.split(re).filter((p) => p.length > 0);

  return parts.map((part, i) =>
    highlights.includes(part) ? (
      <strong key={i} className="text-accentRed">
        {part}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export default function StoryblockSection({
  data,
  userName,
  chars,
}: {
  data: StoryblockSectionType;
  userName: string;
  chars: string[];
}) {
  const totalCharCount = chars.length;
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="mx-auto max-w-content px-6 py-16"
    >
      <span className="vertical-label text-[11px] text-textSub">
        {data.labelHanja}
      </span>

      <h2 className="mt-3 font-serif-kr text-[28px] font-bold text-accentRed">
        {data.title}
      </h2>

      <p className="mt-3 text-base text-textSub">
        당신의 {data.title}은 {totalCharCount}글자 중{" "}
        <strong className="text-textMain">{data.introHighlightCount}글자</strong>가
        큰 영향을 끼칩니다
      </p>

      <EightCharPreview name={userName} chars={chars} />

      <h3 className="text-lg font-bold text-textMain">{data.heading}</h3>

      <div className="mt-4 flex flex-col gap-4">
        {data.paragraphs.map((p, i) => (
          <p key={i} className="text-[16px] leading-relaxed text-textMain">
            {renderHighlighted(p.text, p.highlights)}
          </p>
        ))}
      </div>

      {data.badges && (
        <div className="mt-5 flex flex-wrap gap-2">
          {data.badges.map((badge) => (
            <div
              key={badge.label}
              className="flex items-center gap-2 rounded-box border border-bg bg-white px-3 py-2"
            >
              <span className="text-xs text-textSub">{badge.label}</span>
              <span className="text-sm font-bold text-textMain">
                {badge.score}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="mt-6 text-right text-[15px] italic text-accentRed">
        {data.hookQuestion}
      </p>

      {data.lockedPreview && (
        <button
          onClick={scrollToCTA}
          className="relative mt-4 block w-full overflow-hidden rounded-card bg-white p-5 text-left"
        >
          <p className="text-[15px] leading-relaxed text-textMain blur-[4px] select-none">
            {data.lockedPreview}
          </p>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/40">
            <Lock size={22} className="text-textSub" />
            <span className="text-xs font-medium text-textSub">
              전체 분석에서 확인 가능
            </span>
          </div>
        </button>
      )}

      {data.summaryCard && (
        <div className="mt-6 rounded-card border-2 border-dashed border-accentGoldTo/50 p-6">
          <div className="flex items-center justify-center gap-2">
            {data.summaryCard.elements.map((el, i) => (
              <div key={el.label} className="flex items-center gap-2">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-full border-2 bg-white font-serif-kr text-xl font-bold"
                  style={{ borderColor: el.color, color: el.color }}
                >
                  {el.hanja}
                </div>
                {i < data.summaryCard!.elements.length - 1 && (
                  <span className="text-xs text-textSub">이 합쳐지면</span>
                )}
              </div>
            ))}
          </div>

          <h4 className="mt-5 text-center text-lg font-bold text-textMain">
            {data.summaryCard.resultPhrase}
          </h4>

          <div className="mt-3 text-center">
            <span className="text-4xl font-bold text-accentRed">
              {data.summaryCard.probability}%
            </span>
            <p className="mt-1 text-xs text-textSub">
              이 조합을 타고난 사람은 극히 드뭅니다
            </p>
          </div>
        </div>
      )}
    </motion.section>
  );
}
