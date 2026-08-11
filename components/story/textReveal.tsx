"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

/**
 * Scene 전반(Movie/Reveal/Insight)이 공유하는 두 가지 텍스트 등장 방식.
 * "읽는 느낌"보다 "보는 느낌"을 우선한다는 원칙에 따라, 단어/줄 단위로
 * blur+opacity+y를 순차적으로 걸어 자막처럼 나타나게 한다. 텍스트 내용 자체는
 * 건드리지 않고 등장 연출만 담당한다.
 */

export function WordReveal({
  text,
  className,
  wordClassName = "mr-[0.28em] inline-block",
  delay = 0,
  stagger = 0.1,
  duration = 0.45,
  once = true,
  amount = 0.5,
  staticPosition = false,
  staticEntry = false,
}: {
  text: string;
  className?: string;
  wordClassName?: string;
  delay?: number;
  stagger?: number;
  duration?: number;
  once?: boolean;
  amount?: number;
  staticPosition?: boolean;
  staticEntry?: boolean;
}) {
  const words = text.split(" ");
  return (
    <span className={className}>
      {words.map((w, i) => (
        <motion.span
          key={i}
          initial={staticEntry ? false : { opacity: 0, y: staticPosition ? 0 : 6 }}
          whileInView={staticEntry ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once, amount }}
          transition={{ duration, delay: delay + i * stagger }}
          className={wordClassName}
        >
          {w}
        </motion.span>
      ))}
    </span>
  );
}

export function LineReveal({
  text,
  render,
  className,
  lineClassName,
  delay = 0,
  lineGap = 0.35,
  duration = 0.6,
  once = true,
  amount = 0.4,
  staticPosition = false,
  staticEntry = false,
}: {
  text: string;
  render?: (line: string) => ReactNode;
  className?: string;
  lineClassName?: string;
  delay?: number;
  lineGap?: number;
  duration?: number;
  once?: boolean;
  amount?: number;
  staticPosition?: boolean;
  staticEntry?: boolean;
}) {
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  return (
    <div className={className}>
      {lines.map((line, i) => (
        <motion.p
          key={i}
          initial={staticEntry ? false : { opacity: 0, y: staticPosition ? 0 : 8 }}
          whileInView={staticEntry ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once, amount }}
          transition={{ duration, delay: delay + i * lineGap }}
          className={lineClassName}
        >
          {render ? render(line) : line}
        </motion.p>
      ))}
    </div>
  );
}
