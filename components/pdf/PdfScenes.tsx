import React from "react";

/**
 * [2026-09 PDF 리디자인 — AI 일러스트 도구가 크레딧 부족으로 막혀(사용자
 * 승인, "지금 있는 도구만으로 최선을 다해달라") 이 파일이 그 대안이다.
 * PdfMotifs.tsx의 작은 중앙 아이콘(선묘 1色)과 달리, 여기 컴포넌트들은
 * ChapterDivider의 이미지 자리 전체를 채우는 "장면"이다 — 여러 겹의
 * 도형+그라데이션으로 안개/노을/등불빛 같은 분위기를 낸다. 전부 이
 * 파일에서 직접 그린 순수 SVG(외부 이미지 없음, 라이선스 문제 없음).
 *
 * 챕터마다 팔레트 "온도"를 다르게 준다(사용자 지시 §3) — 무지개색이
 * 아니라, 먹/아이보리/금색이라는 하나의 언어 안에서 장마다 미묘하게
 * 다른 톤(새벽 아이보리·서늘한 회청·짙은 갈색금빛 등)을 쓴다.
 */

function Defs({ id, stops }: { id: string; stops: [string, number][] }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        {stops.map(([color, offset], i) => (
          <stop key={i} offset={offset} stopColor={color} />
        ))}
      </linearGradient>
    </defs>
  );
}

/** 第一章 — 타고난 본질: 안개 낀 산, 여명. 겹겹의 산 실루엣 + 옅은
 * 금빛 여명선. 인물 없음. */
export function MistMountainDawnScene() {
  return (
    <svg viewBox="0 0 300 400" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <Defs id="g1" stops={[["#F3E8CE", 0], ["#E3D2A8", 0.45], ["#C9AE79", 1]]} />
      <rect width="300" height="400" fill="url(#g1)" />
      <ellipse cx="150" cy="150" rx="130" ry="46" fill="#F6ECD4" opacity="0.85" />
      <path d="M-10 260 L60 180 L110 230 L170 140 L230 210 L310 260 Z" fill="#8A7452" opacity="0.35" />
      <path d="M-10 300 L80 220 L140 270 L210 190 L310 300 Z" fill="#6B5636" opacity="0.5" />
      <path d="M-10 340 L70 280 L150 330 L230 260 L310 340 Z" fill="#4A3B24" opacity="0.7" />
      <path d="M0 190 C 60 175, 90 205, 150 185 C 200 168, 240 200, 300 182" stroke="#F6ECD4" strokeWidth="3" fill="none" opacity="0.8" />
      <circle cx="230" cy="120" r="20" fill="#EAC97C" opacity="0.65" />
      <rect x="0" y="360" width="300" height="40" fill="#3A2E1C" opacity="0.12" />
    </svg>
  );
}

/** 第二章 — 타고난 기질: 흐르는 구름, 조금 더 서늘한 회청 톤. */
export function DriftingCloudScene() {
  return (
    <svg viewBox="0 0 300 400" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <Defs id="g2" stops={[["#EDE7DA", 0], ["#D8CFBB", 0.5], ["#B9AF95", 1]]} />
      <rect width="300" height="400" fill="url(#g2)" />
      <path d="M20 150 C -10 150 -10 110 20 106 C 16 78 66 70 84 92 C 96 66 152 70 156 100 C 190 96 198 138 162 146 Z" fill="#4A4436" opacity="0.22" />
      <path d="M60 230 C 30 230 30 190 60 186 C 56 158 106 150 124 172 C 136 146 192 150 196 180 C 230 176 238 218 202 226 Z" fill="#3A3428" opacity="0.3" />
      <path d="M-10 320 C 30 302 90 338 140 312 C 190 288 240 320 310 300" stroke="#6B5636" strokeWidth="2" fill="none" opacity="0.4" />
      <circle cx="230" cy="90" r="3" fill="#A9803D" />
      <circle cx="70" cy="270" r="2.4" fill="#A9803D" />
    </svg>
  );
}

/** 第三章 — 살아가는 방식: 창살/문양 격자, 정갈하고 반듯한 인상. */
export function LatticePathScene() {
  return (
    <svg viewBox="0 0 300 400" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <Defs id="g3" stops={[["#F1E6CB", 0], ["#E4D6B8", 1]]} />
      <rect width="300" height="400" fill="url(#g3)" />
      <g stroke="#6B5636" strokeWidth="1.2" opacity="0.38">
        {Array.from({ length: 8 }).map((_, i) => (
          <line key={`v${i}`} x1={20 + i * 37} y1="40" x2={20 + i * 37} y2="360" />
        ))}
        {Array.from({ length: 9 }).map((_, i) => (
          <line key={`h${i}`} x1="20" y1={40 + i * 40} x2="280" y2={40 + i * 40} />
        ))}
      </g>
      <rect x="20" y="40" width="260" height="320" fill="none" stroke="#4A3B24" strokeWidth="2" opacity="0.5" />
      <circle cx="150" cy="200" r="34" fill="#EAC97C" opacity="0.4" />
    </svg>
  );
}

/** 第五章 — 재물운: 등불+고서, 짙은 갈색·금빛. 인물 없음. */
export function LanternBookScene() {
  return (
    <svg viewBox="0 0 300 400" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <Defs id="g4" stops={[["#3A2A16", 0], ["#241A0E", 1]]} />
      <rect width="300" height="400" fill="url(#g4)" />
      <ellipse cx="160" cy="180" rx="90" ry="120" fill="#EAC97C" opacity="0.16" />
      <ellipse cx="160" cy="180" rx="46" ry="60" fill="#EAC97C" opacity="0.22" />
      {/* 등불 */}
      <path d="M140 120 Q160 100 180 120 L184 190 Q160 210 136 190 Z" fill="#D9A24A" opacity="0.9" />
      <rect x="156" y="96" width="8" height="18" fill="#8A5D2A" />
      <rect x="140" y="200" width="40" height="6" fill="#8A5D2A" />
      <g stroke="#5C4218" strokeWidth="1" opacity="0.6">
        <line x1="146" y1="130" x2="146" y2="188" />
        <line x1="160" y1="122" x2="160" y2="196" />
        <line x1="174" y1="130" x2="174" y2="188" />
      </g>
      {/* 고서 스택 */}
      <rect x="70" y="300" width="150" height="16" rx="2" fill="#6B4A1F" opacity="0.85" />
      <rect x="80" y="284" width="130" height="16" rx="2" fill="#8A5D2A" opacity="0.85" />
      <rect x="90" y="268" width="110" height="16" rx="2" fill="#A9803D" opacity="0.85" />
      <line x1="230" y1="290" x2="260" y2="260" stroke="#EAC97C" strokeWidth="2" opacity="0.5" />
    </svg>
  );
}

/** 第七章 — 앞으로의 10년: 긴 산맥과 길, 새벽빛 청회색+금빛 지평선. */
export function LongPathHorizonScene() {
  return (
    <svg viewBox="0 0 300 400" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <Defs id="g5" stops={[["#3C4652", 0], ["#5B6672", 0.45], ["#E9C77E", 0.82], ["#F3E3B8", 1]]} />
      <rect width="300" height="400" fill="url(#g5)" />
      <path d="M-10 260 L50 200 L100 240 L160 170 L220 220 L310 250 L310 400 L-10 400 Z" fill="#2A2E36" opacity="0.55" />
      <path d="M-10 300 L70 250 L140 290 L210 240 L310 290 L310 400 L-10 400 Z" fill="#1E2128" opacity="0.75" />
      {/* 길 */}
      <path d="M150 400 C 150 330 130 300 150 250 C 168 210 150 190 150 160" stroke="#F3E3B8" strokeWidth="6" fill="none" opacity="0.55" strokeLinecap="round" />
      <line x1="0" y1="188" x2="300" y2="188" stroke="#F3E3B8" strokeWidth="1.5" opacity="0.5" />
    </svg>
  );
}

/** 第八章 — 귀인과 신살: 전통 매듭 + 별빛, 짙은 먹빛에 금 점점이. */
export function KnotStarsScene() {
  const stars = [
    [40, 60], [220, 90], [80, 140], [250, 200], [50, 240], [200, 320], [120, 70], [270, 320],
  ];
  return (
    <svg viewBox="0 0 300 400" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <Defs id="g6" stops={[["#241C14", 0], ["#171009", 1]]} />
      <rect width="300" height="400" fill="url(#g6)" />
      {stars.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 2.4 : 1.4} fill="#EAC97C" opacity={0.55 + (i % 3) * 0.12} />
      ))}
      {/* 매듭(단순화된 대칭 리본 매듭) */}
      <g transform="translate(150 220)" fill="none" stroke="#D9BA7E" strokeWidth="3.2" strokeLinecap="round">
        <path d="M0 -60 C 40 -60 40 -10 0 -10 C -40 -10 -40 40 0 40 C 40 40 40 90 0 90" opacity="0.85" />
        <path d="M0 -60 C -40 -60 -40 -10 0 -10 C 40 -10 40 40 0 40 C -40 40 -40 90 0 90" opacity="0.5" />
      </g>
      <circle cx="150" cy="220" r="5" fill="#EAC97C" />
    </svg>
  );
}

/** 재물이 "움직이는 방식" — 금빛으로 일렁이는 강물. 돈의 흐름을
 * 상징하는 물결 모티프, 등불(재물이 새는/모이는 이유) 장면과는 톤을
 * 달리해(짙은 남색 밤물 + 금빛 반사) 재물 3부작 안에서도 각 장이
 * 구분되게 한다. */
export function RiverFlowScene() {
  return (
    <svg viewBox="0 0 300 400" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <Defs id="g7" stops={[["#1F2C38", 0], ["#2E4256", 0.5], ["#4A5F6E", 1]]} />
      <rect width="300" height="400" fill="url(#g7)" />
      {[100, 150, 200, 250, 300, 350].map((y, i) => (
        <path
          key={y}
          d={`M-10 ${y} C 60 ${y - 22}, 90 ${y + 22}, 160 ${y} C 220 ${y - 18}, 260 ${y + 18}, 310 ${y}`}
          stroke="#D9BA7E"
          strokeWidth={i % 2 === 0 ? 2 : 1}
          fill="none"
          opacity={0.15 + (i % 3) * 0.12}
        />
      ))}
      <circle cx="90" cy="120" r="2.4" fill="#EAC97C" opacity="0.7" />
      <circle cx="220" cy="260" r="2" fill="#EAC97C" opacity="0.6" />
      <circle cx="60" cy="320" r="1.6" fill="#EAC97C" opacity="0.5" />
    </svg>
  );
}

/** 재물이 "움직이는 시기" — 저물녘 물결과 대운의 마디를 암시하는
 * 가로 밴드. 위 강물 장면과 팔레트를 달리해(황혼의 갈색·주황빛) 같은
 * "재물 3부작" 안에서도 장마다 톤이 다르다는 인상을 준다. */
export function DuskTideScene() {
  return (
    <svg viewBox="0 0 300 400" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <Defs id="g8" stops={[["#4A2F1E", 0], ["#7A4A2A", 0.45], ["#C9924A", 0.8], ["#EAC97C", 1]]} />
      <rect width="300" height="400" fill="url(#g8)" />
      {[260, 290, 320, 350, 380].map((y, i) => (
        <path
          key={y}
          d={`M-10 ${y} C 50 ${y - 12}, 80 ${y + 12}, 150 ${y} C 200 ${y - 10}, 250 ${y + 10}, 310 ${y}`}
          stroke="#3A2412"
          strokeWidth="2"
          fill="none"
          opacity={0.2 + i * 0.08}
        />
      ))}
      <circle cx="150" cy="150" r="30" fill="#FBEBC8" opacity="0.55" />
    </svg>
  );
}

export const PDF_SCENES = {
  mistMountainDawn: MistMountainDawnScene,
  driftingCloud: DriftingCloudScene,
  latticePath: LatticePathScene,
  lanternBook: LanternBookScene,
  longPathHorizon: LongPathHorizonScene,
  knotStars: KnotStarsScene,
  riverFlow: RiverFlowScene,
  duskTide: DuskTideScene,
} as const;

export type PdfSceneKey = keyof typeof PDF_SCENES;
