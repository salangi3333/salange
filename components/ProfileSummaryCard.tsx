"use client";

import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { SajuUser } from "@/types";

export default function ProfileSummaryCard({ user }: { user: SajuUser }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="mx-auto max-w-content px-6 py-8"
    >
      <div className="overflow-hidden rounded-card bg-white shadow-sm">
        <div className="h-1 bg-gradient-to-r from-accentGoldFrom to-accentGoldTo" />

        <div className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-box bg-dark">
              <span className="font-serif-kr text-3xl font-bold text-accentGoldFrom">
                {user.pillars.day.hanja}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-textMain">
                  {user.name}
                </span>
                <span className="rounded-pill bg-bg px-2.5 py-0.5 text-[11px] font-medium text-textSub">
                  {user.typeLabel}
                </span>
              </div>
              <span className="text-xs text-textSub">
                당신이 타고난 잠재력 · {user.dayPillar}
              </span>
            </div>
          </div>

          <div className="my-6 h-px bg-bg" />

          <div className="grid grid-cols-2 gap-3">
            {user.stats.map((stat) => (
              <div
                key={stat.label}
                className="relative rounded-box bg-bg px-4 py-3"
              >
                <div className={stat.locked ? "blur-sm select-none" : ""}>
                  <p className="text-xs text-textSub">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold text-textMain">
                    {stat.score}
                  </p>
                  {stat.percentile && (
                    <span className="mt-1 inline-block rounded-pill bg-gray-100 px-2 py-0.5 text-[11px] text-textSub">
                      {stat.percentile}
                    </span>
                  )}
                </div>
                {stat.locked && (
                  <div className="absolute bottom-2 right-2 rounded-full bg-white p-1 shadow">
                    <Lock size={12} className="text-textSub" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
