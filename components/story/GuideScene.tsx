"use client";

import { motion } from "framer-motion";
import { RESULT_GUIDE_IMAGE } from "@/lib/guideImages";

export default function GuideScene({ text }: { text: string | string[] }) {
  const lines = Array.isArray(text) ? text : [text];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ duration: 0.5 }}
      className="flex items-start gap-3"
    >
      <div
        className="mt-1 h-10 w-10 shrink-0 rounded-full border border-sceneGold/50 bg-cover bg-[position:56%_20%] shadow-[0_0_18px_rgba(212,163,74,0.4)]"
        style={{ backgroundImage: `url(${RESULT_GUIDE_IMAGE})` }}
      />
      <div className="flex flex-col gap-2.5 border-l-2 border-sceneGold/70 pl-3">
        {lines.map((line, i) => (
          <motion.p
            key={i}
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.45, delay: i * 0.4 }}
            className="text-[17px] italic leading-relaxed text-sceneText/95"
          >
            {line}
          </motion.p>
        ))}
      </div>
    </motion.div>
  );
}
