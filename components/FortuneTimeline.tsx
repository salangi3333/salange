"use client";

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

export interface FortuneNode {
  age: string;
  label: string;
  state: "past" | "current" | "future";
}

function scrollToCTA() {
  document.getElementById("main-cta")?.scrollIntoView({ behavior: "smooth" });
}

export default function FortuneTimeline({
  nodes,
  lockedList,
}: {
  nodes: FortuneNode[];
  lockedList: string[];
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="mx-auto max-w-content px-6 py-10"
    >
      <div className="rounded-card bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-textMain">나의 대운 흐름</h3>

        <div className="relative mt-10 overflow-x-auto pb-4">
          <div className="relative flex min-w-[560px] items-center justify-between px-2">
            <div className="absolute left-2 right-2 top-1/2 -z-0 border-t-2 border-dashed border-bg" />

            {nodes.map((node, i) => {
              const isPast = node.state === "past";
              return (
                <div
                  key={node.age}
                  className={`relative z-10 flex flex-col items-center gap-2 ${
                    i % 2 === 1 ? "-translate-y-5" : "translate-y-5"
                  }`}
                >
                  <div
                    className={`flex items-center justify-center rounded-full border-2 font-bold ${
                      isPast
                        ? "h-12 w-12 border-bg bg-white text-xs text-textSub opacity-40"
                        : "h-16 w-16 border-dark bg-dark text-sm text-white"
                    }`}
                  >
                    {node.age}
                  </div>
                  <span
                    className={`text-[11px] ${
                      isPast ? "text-textSub opacity-60" : "font-medium text-textMain"
                    }`}
                  >
                    {node.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-textSub">
          10년 단위로 흐르는 대운은 인생의 방향을 크게 좌우합니다. 지금은
          전환기에 접어드는 시점이며, 이후 흐름을 알면 앞으로의 선택이
          훨씬 명확해집니다.
        </p>

        <ul className="mt-5 flex flex-col gap-2.5 border-t border-bg pt-5">
          {lockedList.map((item) => (
            <li
              key={item}
              onClick={scrollToCTA}
              className="flex cursor-pointer items-start gap-2 text-sm text-textSub"
            >
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-gray-300" />
              <span className="blur-[3px] select-none">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </motion.section>
  );
}
