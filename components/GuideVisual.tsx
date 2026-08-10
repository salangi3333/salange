"use client";

import { motion, useReducedMotion } from "framer-motion";
import { HERO_GUIDE_IMAGE, RESULT_GUIDE_IMAGE } from "@/lib/guideImages";

/**
 * Independent visual component for the guide character.
 * Swap `src` for a video/live-photo element later without touching callers.
 */
export default function GuideVisual({
  size = "large",
  className = "",
}: {
  size?: "large" | "small";
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  if (size === "small") {
    return (
      <motion.div
        className={`relative mx-auto h-24 w-24 shrink-0 ${className}`}
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          className="pointer-events-none absolute -inset-3 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(231,192,126,0.5), transparent 70%)",
          }}
          animate={
            reduceMotion
              ? { opacity: 0.5 }
              : { opacity: [0.35, 0.65, 0.35] }
          }
          transition={
            reduceMotion
              ? undefined
              : { duration: 4, repeat: Infinity, ease: "easeInOut" }
          }
        />
        <motion.div
          className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-accentGoldTo/50 bg-cover bg-[position:56%_20%]"
          style={{ backgroundImage: `url(${RESULT_GUIDE_IMAGE})` }}
          animate={reduceMotion ? {} : { scale: [1, 1.02, 1] }}
          transition={
            reduceMotion
              ? undefined
              : { duration: 6, repeat: Infinity, ease: "easeInOut" }
          }
        />
      </motion.div>
    );
  }

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 70% 42%, rgba(231,192,126,0.32), transparent 62%)",
        }}
        animate={reduceMotion ? { opacity: 0.55 } : { opacity: [0.4, 0.8, 0.4] }}
        transition={
          reduceMotion ? undefined : { duration: 6, repeat: Infinity, ease: "easeInOut" }
        }
      />

      <motion.div
        className="absolute inset-0 bg-no-repeat bg-contain bg-right sm:bg-top md:bg-right"
        style={{ backgroundImage: `url(${HERO_GUIDE_IMAGE})` }}
        initial={{ opacity: 0, scale: reduceMotion ? 1 : 1.04 }}
        animate={
          reduceMotion
            ? { opacity: 1, scale: 1 }
            : { opacity: 1, scale: [1, 1.015, 1] }
        }
        transition={
          reduceMotion
            ? { duration: 1.2 }
            : {
                opacity: { duration: 2.4, ease: "easeOut" },
                scale: { duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2.4 },
              }
        }
      />
    </div>
  );
}
