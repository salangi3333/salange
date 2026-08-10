"use client";

import { useEffect, useState } from "react";

const DURATION = 3600;
const STORAGE_KEY = "saju-countdown-start";

export function useCountdown() {
  const [remaining, setRemaining] = useState(DURATION);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const now = Date.now();
    let startedAt = stored ? parseInt(stored, 10) : now;

    if (!stored || now - startedAt > DURATION * 1000) {
      startedAt = now;
      window.localStorage.setItem(STORAGE_KEY, String(startedAt));
    }

    const tick = () => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const left = DURATION - elapsed;
      setRemaining(left > 0 ? left : 0);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const m = Math.floor(remaining / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(remaining % 60)
    .toString()
    .padStart(2, "0");

  return `${m}:${s}`;
}
