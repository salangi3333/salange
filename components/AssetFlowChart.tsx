"use client";

import { motion } from "framer-motion";
import { Lock, CheckCircle2 } from "lucide-react";
import { AssetFlowPoint } from "@/types";

const WIDTH = 320;
const HEIGHT = 160;
const PAD_X = 24;
const PAD_TOP = 36;
const BASELINE = HEIGHT - 20;

function toCoords(points: AssetFlowPoint[]) {
  const usable = WIDTH - PAD_X * 2;
  return points.map((p, i) => ({
    ...p,
    x: PAD_X + (usable / (points.length - 1)) * i,
    y: BASELINE - (p.value / 100) * (BASELINE - PAD_TOP),
  }));
}

function smoothPath(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const midX = (p0.x + p1.x) / 2;
    d += ` C ${midX} ${p0.y}, ${midX} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  return d;
}

function scrollToCTA() {
  document.getElementById("main-cta")?.scrollIntoView({ behavior: "smooth" });
}

export default function AssetFlowChart({
  name,
  typeLabel,
  points,
  lockedList,
}: {
  name: string;
  typeLabel: string;
  points: AssetFlowPoint[];
  lockedList: string[];
}) {
  const coords = toCoords(points);
  const linePath = smoothPath(coords);
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${BASELINE} L ${coords[0].x} ${BASELINE} Z`;

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="mx-auto max-w-content px-6 py-10"
    >
      <div className="rounded-card bg-white p-6 shadow-sm">
        <p className="text-xs text-textSub">{name}님의 평생 자산규모</p>
        <h3 className="mt-1 text-lg font-bold text-textMain">
          시기별 재산 흐름
        </h3>

        <div className="mt-6 overflow-visible">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="w-full"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E7C07E" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#B8823C" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            <path d={areaPath} fill="url(#goldFill)" />
            <path
              d={linePath}
              fill="none"
              stroke="#B8823C"
              strokeWidth={2.5}
              strokeLinecap="round"
            />

            {coords.map((c) => (
              <circle
                key={c.label}
                cx={c.x}
                cy={c.y}
                r={4}
                fill="#241C18"
              />
            ))}
          </svg>

          <div className="relative -mt-4 flex justify-between px-1">
            {coords.map((c) => (
              <span
                key={c.label}
                className="rounded-pill bg-dark px-2.5 py-1 text-[11px] font-medium text-white"
              >
                {c.label}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-8 border-t border-bg pt-5">
          <div className="mb-3 flex items-center gap-2">
            <Lock size={14} className="text-textSub" />
            <h4 className="text-sm font-bold text-textMain">
              {typeLabel} 전용 풀이
            </h4>
          </div>
          <ul className="flex flex-col gap-2.5">
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
      </div>
    </motion.section>
  );
}
