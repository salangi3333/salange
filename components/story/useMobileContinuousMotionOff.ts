"use client";

import { useState } from "react";

export function useMobileContinuousMotionOff(): boolean {
  const [disabled] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(pointer: coarse)").matches;
  });

  return disabled;
}
