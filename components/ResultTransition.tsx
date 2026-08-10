"use client";

import { motion } from "framer-motion";
import { SajuUser } from "@/types";

export default function ResultTransition({
  user,
  quote,
}: {
  user: SajuUser;
  quote: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="mx-auto max-w-content px-6 py-20 text-center"
    >
      <span className="inline-block rounded-box border border-accentRed px-3 py-1 text-xs font-medium text-accentRed">
        命局解析
      </span>

      <p className="mt-5 text-sm text-textSub">{user.name}님의 사주 조합</p>

      <p className="mt-4 font-serif-kr text-2xl font-bold leading-snug text-accentRed">
        &ldquo;{quote}&rdquo;
      </p>

      <div className="mt-10 flex flex-col items-center gap-2">
        <span className="text-xs tracking-[0.2em] text-textSub">
          天命解讀
        </span>
        <p className="text-sm text-textSub">
          타고난 팔자의 일부만 풀이했습니다
        </p>
      </div>
    </motion.section>
  );
}
