"use client";

import { motion } from "framer-motion";

const COUNT_KOREAN: Record<number, string> = {
  6: "여섯",
  8: "여덟",
};

export default function EightCharPreview({
  name,
  chars,
  description,
  label = "— 八字 —",
}: {
  name: string;
  chars: string[];
  description?: string;
  label?: string;
}) {
  const countLabel = COUNT_KOREAN[chars.length] || `${chars.length}`;

  return (
    <div className="my-8 flex flex-col items-center gap-6">
      <span className="vertical-label text-[11px] text-textSub">{label}</span>

      <div className="text-center">
        <h3 className="font-serif-kr text-xl font-bold leading-snug text-textMain">
          <span className="text-accentRed">{name}</span>님의 타고난 {countLabel} 글자
        </h3>
        <p className="mt-2 text-sm text-textSub">
          {description || `당신의 사주는 이 ${countLabel} 글자로 이루어져 있습니다`}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {chars.map((char, i) => (
          <motion.div
            key={`${char}-${i}`}
            initial={{ opacity: 0.15 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="flex h-14 w-14 items-center justify-center rounded-box bg-white font-serif-kr text-2xl font-bold text-textMain shadow-sm"
          >
            {char}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
