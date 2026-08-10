"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const STEPS = [
  "생년월일시를 만세력에 대입하는 중...",
  "사주팔자 여덟 글자를 뽑는 중...",
  "오행과 십성의 균형을 분석하는 중...",
  "대운의 흐름을 계산하는 중...",
];

export default function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const stepTimer = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
    }, 600);

    const doneTimer = setTimeout(() => {
      onDone();
    }, 2600);

    return () => {
      clearInterval(stepTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  return (
    <section className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 text-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-accentGoldTo"
      >
        <span className="font-serif-kr text-2xl font-bold text-accentRed">命</span>
      </motion.div>

      <div>
        <h2 className="font-serif-kr text-xl font-bold text-textMain">
          사주를 풀이하고 있습니다
        </h2>
        <motion.p
          key={stepIndex}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 text-sm text-textSub"
        >
          {STEPS[stepIndex]}
        </motion.p>
      </div>
    </section>
  );
}
