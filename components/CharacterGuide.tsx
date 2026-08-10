"use client";

import { motion } from "framer-motion";
import { Heart, Coins, Users, Sparkles, LucideIcon } from "lucide-react";
import GuideVisual from "./GuideVisual";

export type FortuneTopic = "love" | "wealth" | "compatibility" | "all";

export const TOPIC_LABELS: Record<FortuneTopic, string> = {
  love: "연애운",
  wealth: "재물운",
  compatibility: "궁합",
  all: "전체 사주풀이",
};

const TOPIC_ICONS: Record<FortuneTopic, LucideIcon> = {
  love: Heart,
  wealth: Coins,
  compatibility: Users,
  all: Sparkles,
};

const topics: FortuneTopic[] = ["love", "wealth", "compatibility", "all"];

export default function CharacterGuide({
  onProceed,
}: {
  onProceed: (topic: FortuneTopic) => void;
}) {
  return (
    <section className="flex min-h-screen flex-col items-center justify-center bg-dark px-6 text-center">
      <GuideVisual size="small" />

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="mt-6 text-[16px] leading-relaxed text-white"
      >
        오늘은 무엇이 가장 궁금한가요?
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="mt-8 grid w-full max-w-content grid-cols-2 gap-3"
      >
        {topics.map((t, i) => {
          const Icon = TOPIC_ICONS[t];
          return (
            <motion.button
              key={t}
              onClick={() => onProceed(t)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.6 + i * 0.08 }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="group relative overflow-hidden rounded-box border border-accentGoldTo/40 bg-white/5 px-4 py-5 text-sm font-bold text-white transition-colors duration-300 hover:border-accentGoldTo hover:bg-white/10"
            >
              <span
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                  background:
                    "radial-gradient(circle at 50% 20%, rgba(231,192,126,0.25), transparent 65%)",
                }}
              />
              <span
                className="pointer-events-none absolute inset-0 opacity-[0.05]"
                style={{
                  backgroundImage:
                    "radial-gradient(circle, rgba(231,192,126,0.8) 1px, transparent 1px)",
                  backgroundSize: "14px 14px",
                }}
              />
              <span className="relative flex flex-col items-center gap-2">
                <Icon size={22} className="text-accentGoldTo" />
                {TOPIC_LABELS[t]}
              </span>
            </motion.button>
          );
        })}
      </motion.div>
    </section>
  );
}
