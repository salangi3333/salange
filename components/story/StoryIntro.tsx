"use client";

import { motion } from "framer-motion";
import { useTypewriterLines } from "@/components/useTypewriterLines";

export default function StoryIntro({ name }: { name: string }) {
  const lines = [
    `${name}님,\n여덟 글자를 모두 펼쳐봤어요.`,
    "그런데 가장 먼저 보인 건\n강한 성격이 아니었습니다.",
    "강해질 수밖에 없었던 방식이\n먼저 보였어요.",
  ];
  const { completedLines, currentText, isDone } = useTypewriterLines(lines, 42, [700, 550]);

  return (
    <section className="relative flex flex-col items-center gap-6 overflow-hidden bg-sceneBg px-6 py-16 text-center sm:min-h-[85svh] sm:justify-center">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, rgba(200,155,60,0.16), transparent 60%)",
        }}
      />

      <div className="relative flex min-h-[160px] w-full max-w-content flex-col justify-center gap-4">
        {completedLines.map((line, i) => (
          <p
            key={i}
            className="whitespace-pre-line font-serif-kr text-[21px] font-bold leading-[1.3] tracking-normal text-sceneText sm:text-3xl sm:leading-snug"
            style={{ wordBreak: "keep-all" }}
          >
            {line}
          </p>
        ))}
        {!isDone && (
          <p
            className="whitespace-pre-line font-serif-kr text-[21px] font-bold leading-[1.3] tracking-normal text-sceneText sm:text-3xl sm:leading-snug"
            style={{ wordBreak: "keep-all" }}
          >
            {currentText}
            <span className="animate-pulse">▍</span>
          </p>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isDone ? 1 : 0 }}
        transition={{ duration: 0.8 }}
        className="relative flex flex-col items-center gap-2 text-sceneTextSub"
      >
        <span className="text-xs tracking-widest">아래로</span>
        <motion.span
          className="block h-8 w-px origin-top bg-sceneTextSub"
          animate={{ scaleY: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    </section>
  );
}
