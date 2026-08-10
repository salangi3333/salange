"use client";

import { ElementAnalysis } from "@/lib/aiLifeReport";
import { Element } from "@/lib/hanjaTables";

const ORDER: Element[] = ["wood", "fire", "earth", "metal", "water"];
const LABELS: Record<Element, string> = {
  wood: "목",
  fire: "화",
  earth: "토",
  metal: "금",
  water: "수",
};
const HANJA_LABELS: Record<Element, string> = {
  wood: "목(木)",
  fire: "화(火)",
  earth: "토(土)",
  metal: "금(金)",
  water: "수(水)",
};
const COLORS: Record<Element, string> = {
  wood: "#7FA37A",
  fire: "#D98572",
  earth: "#C9A96E",
  metal: "#B8C4D6",
  water: "#7C93C4",
};
// 초보자도 바로 이해할 수 있도록 오행 각각의 의미를 짧게 정리한 범례.
// 명리학적 계산에는 관여하지 않는 순수 설명용 텍스트다.
const MEANING: Record<Element, string> = {
  wood: "성장 · 배움 · 새로운 시작",
  fire: "열정 · 추진력 · 표현",
  earth: "안정 · 현실 · 책임",
  metal: "결단 · 원칙 · 정리",
  water: "지혜 · 직관 · 유연함",
};
// 가장 강한 기운을 기준으로 한 줄짜리 생활 해석 힌트 — 실제 계산값(strongest)에
// 따라 선택될 뿐, 별도의 새로운 사주 계산은 하지 않는다.
const LIFE_HINT: Record<Element, string> = {
  wood: "일상에서는 새로운 일을 배우거나 시작할 때 유독 힘이 붙는 식으로 나타납니다.",
  fire: "일상에서는 하고 싶은 일 앞에서 망설임 없이 뛰어드는 식으로 나타납니다.",
  earth: "일상에서는 맡은 일을 끝까지 책임지고 지켜내는 식으로 나타납니다.",
  metal: "일상에서는 상황을 정리하고 기준을 세우는 순간에 유독 강해지는 식으로 나타납니다.",
  water: "일상에서는 상황에 맞춰 유연하게 대처하는 식으로 나타납니다.",
};

export default function ElementFlowScene({ analysis }: { analysis: ElementAnalysis }) {
  const size = 220;
  const center = size / 2;
  const radius = 82;
  const maxCount = Math.max(1, ...ORDER.map((e) => analysis.counts[e]));

  return (
    <div className="flex flex-col items-center gap-5 py-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {ORDER.map((el, i) => {
          const angle = (Math.PI * 2 * i) / ORDER.length - Math.PI / 2;
          const nextAngle =
            (Math.PI * 2 * ((i + 1) % ORDER.length)) / ORDER.length - Math.PI / 2;
          const x1 = center + radius * Math.cos(angle);
          const y1 = center + radius * Math.sin(angle);
          const x2 = center + radius * Math.cos(nextAngle);
          const y2 = center + radius * Math.sin(nextAngle);
          return (
            <line
              key={`line-${el}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(205,214,234,0.22)"
              strokeWidth={1}
            />
          );
        })}
        {ORDER.map((el, i) => {
          const angle = (Math.PI * 2 * i) / ORDER.length - Math.PI / 2;
          const x = center + radius * Math.cos(angle);
          const y = center + radius * Math.sin(angle);
          const count = analysis.counts[el];
          const r = 14 + (count / maxCount) * 14;
          return (
            <g key={el}>
              <circle cx={x} cy={y} r={r} fill={COLORS[el]} opacity={count === 0 ? 0.18 : 0.85} />
              <text x={x} y={y + 4} textAnchor="middle" fontSize="12" fill="#171514" fontWeight="700">
                {LABELS[el]}
              </text>
            </g>
          );
        })}
      </svg>

      {/* 오행 범례 — 초보자를 위한 최소한의 의미 설명 */}
      <div className="grid w-full max-w-[320px] grid-cols-1 gap-1.5 rounded-card border border-sceneGold/20 bg-white/[0.04] px-4 py-3">
        {ORDER.map((el) => (
          <div key={el} className="flex items-center gap-2.5 text-[12.5px]">
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: COLORS[el] }}
            />
            <span className="w-14 shrink-0 font-bold text-sceneTextSub">{HANJA_LABELS[el]}</span>
            <span className="text-sceneTextSub/80">{MEANING[el]}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 text-center">
        <p className="text-[14px] leading-[1.85] text-sceneTextSub" style={{ wordBreak: "keep-all" }}>
          현재는 <span className="font-bold text-sceneGold">{MEANING[analysis.strongest]}</span>을 뜻하는{" "}
          <span className="font-bold text-sceneGold">{HANJA_LABELS[analysis.strongest]}</span>의 기운이 강하게
          나타납니다.
          <br />
          반면 <span className="font-bold text-sceneSilver">{MEANING[analysis.weakest]}</span>을 뜻하는{" "}
          <span className="font-bold text-sceneSilver">{HANJA_LABELS[analysis.weakest]}</span>의 기운은 보완이
          필요합니다.
        </p>
        <p className="text-[13px] text-sceneTextSub/70" style={{ wordBreak: "keep-all" }}>
          {LIFE_HINT[analysis.strongest]}
        </p>
      </div>
    </div>
  );
}
