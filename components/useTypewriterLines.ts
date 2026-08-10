"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Reveals an array of short lines one at a time, each typed out character
 * by character. Returns lines that have finished typing plus the
 * in-progress text for the current line.
 */
export function useTypewriterLines(
  lines: string[],
  speed = 45,
  lineGap: number | number[] = 550
) {
  const gapAt = (idx: number) =>
    Array.isArray(lineGap) ? lineGap[idx] ?? lineGap[lineGap.length - 1] ?? 550 : lineGap;
  const gapKey = Array.isArray(lineGap) ? lineGap.join(",") : lineGap;
  const reduceMotion = useReducedMotion();
  const [completedLines, setCompletedLines] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");

  useEffect(() => {
    if (reduceMotion) {
      setCompletedLines(lines);
      setCurrentIndex(lines.length);
      setCurrentText("");
      return;
    }
    setCompletedLines([]);
    setCurrentIndex(0);
    setCurrentText("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines.join("|"), reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return;
    if (currentIndex >= lines.length) return;

    const line = lines[currentIndex];
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      setCurrentText(line.slice(0, i));
      if (i >= line.length) {
        clearInterval(timer);
        setTimeout(() => {
          setCompletedLines((prev) => [...prev, line]);
          setCurrentText("");
          setCurrentIndex((idx) => idx + 1);
        }, gapAt(currentIndex));
      }
    }, speed);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, lines.join("|"), speed, gapKey, reduceMotion]);

  const isDone = currentIndex >= lines.length;
  return { completedLines, currentText, isDone, reduceMotion };
}
