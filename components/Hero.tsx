"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { SajuUser } from "@/types";

export default function Hero({ user }: { user: SajuUser }) {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 py-24">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, rotate: -6 }}
        animate={{ opacity: 1, scale: 1, rotate: -6 }}
        transition={{ duration: 0.6 }}
        className="mb-6 flex h-[60px] w-[60px] items-center justify-center border-2 border-accentRed"
      >
        <Image
          src="/logo-stamp.svg"
          alt="사주풀이 로고"
          width={44}
          height={44}
        />
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-sm text-textSub mb-3"
      >
        {user.name}님의 사주 원본 분석
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 16, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.35, duration: 0.6 }}
        className="font-serif-kr text-[36px] font-bold leading-tight text-textMain mb-4"
      >
        {user.typeLabel}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="text-base text-textSub mb-6 max-w-content px-4"
      >
        {user.oneLiner}
      </motion.p>

      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.65, duration: 0.5 }}
        className="rounded-pill bg-dark px-4 py-1.5 text-sm font-medium text-accentGoldFrom"
      >
        • {user.dayPillar}
      </motion.span>

      <div className="absolute bottom-10 flex flex-col items-center gap-2 text-textSub">
        <span className="text-xs tracking-widest">아래로</span>
        <motion.span
          className="block h-10 w-px bg-textSub origin-top"
          animate={{ scaleY: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </section>
  );
}
