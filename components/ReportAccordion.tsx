"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Check, Lock } from "lucide-react";
import { ReportPart } from "@/types";

export default function ReportAccordion({
  parts,
  unlockedCount,
  totalCount,
}: {
  parts: ReportPart[];
  unlockedCount: number;
  totalCount: number;
}) {
  const defaultOpen = parts.findIndex((p) => p.expandedByDefault);
  const [openIndex, setOpenIndex] = useState<number | null>(
    defaultOpen >= 0 ? defaultOpen : 0
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="mx-auto max-w-content bg-sceneBg px-6 py-16"
    >
      <h2 className="text-center font-serif-kr text-2xl font-bold text-sceneText">
        당신만을 위한 전체 리포트
      </h2>
      <p className="mt-3 text-center text-sm">
        <strong className="text-sceneGold">
          이 사주 조합은 전체의 0.8%만 해당합니다
        </strong>
      </p>
      <p className="mt-1 text-center text-xs text-sceneTextSub">
        {totalCount}개 항목 · {parts.length}개 파트
      </p>

      <div className="mt-8 flex flex-col gap-3">
        {parts.map((part, i) => {
          const isOpen = openIndex === i;
          return (
            <div
              key={part.index}
              className="overflow-hidden rounded-card bg-white shadow-sm"
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold text-textMain">
                    {part.title}
                  </span>
                  <span className="text-xs text-textSub">
                    {part.subtitle} · {part.progress}
                  </span>
                </div>
                <motion.span
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.25 }}
                  className="shrink-0 text-textSub"
                >
                  <ChevronDown size={18} />
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <ul className="flex flex-col gap-2.5 border-t border-bg px-5 py-4">
                      {part.items.map((item) => (
                        <li
                          key={item.text}
                          className="flex items-center gap-2 text-sm"
                        >
                          {item.locked ? (
                            <>
                              <Lock size={14} className="shrink-0 text-gray-300" />
                              <span className="text-textSub">{item.text}</span>
                            </>
                          ) : (
                            <>
                              <Check size={14} className="shrink-0 text-green-600" />
                              <span className="text-textMain">{item.text}</span>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <div className="mt-8">
        <div className="h-2 w-full overflow-hidden rounded-pill bg-white/10">
          <div
            className="h-full rounded-pill bg-gradient-to-r from-accentGoldFrom to-accentGoldTo"
            style={{ width: `${(unlockedCount / totalCount) * 100}%` }}
          />
        </div>
        <p className="mt-2 text-center text-xs text-sceneTextSub">
          리포트 해금 {unlockedCount}/{totalCount} 항목
        </p>
        <p className="mt-1 text-center text-xs text-sceneTextSub">
          프리미엄 구매 시 전체 해금
        </p>
      </div>
    </motion.section>
  );
}
