import React from "react";

/**
 * 챕터 전환(ChapterDivider) 페이지에서 "선녀 인물 이미지"를 대체하는
 * 동양적 장식 모티프 — 전부 이 파일에서 직접 그린 순수 SVG 선화(線畵)다
 * (외부 이미지/폰트/URL 의존 없음, 라이선스 문제 없음). 인물 이미지는
 * 第一·五·八章(이미 배정된 ch1/ch5/ch8-fairy 자산)에만 제한적으로 쓰고,
 * 나머지 장은 아래 모티프로 시각적 다양성을 준다(2026-09, PDF 디자인
 * 마스터 1차 구현 — 감사에서 "인물만 반복 금지" 지시에 따른 조치).
 *
 * 색은 호출부(ChapterOpenSplit/Stack/Inset)가 감싸는 아이보리/한지 패널
 * 위에서 또렷하도록 잉크색(#5C4A2E)과 금색(#A9803D) 두 톤만 쓴다 —
 * PROTOTYPE_STYLE/HANJI_STYLE의 기존 팔레트와 동일한 톤이다.
 */

const INK = "#5C4A2E";
const GOLD = "#A9803D";

export function MoonMotif() {
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="58" fill="none" stroke={GOLD} strokeWidth="1.6" />
      <path
        d="M118 46 A62 62 0 1 0 118 154 A48 48 0 1 1 118 46 Z"
        fill={INK}
        opacity="0.16"
      />
      <circle cx="100" cy="100" r="58" fill="none" stroke={INK} strokeWidth="0.6" opacity="0.4" />
    </svg>
  );
}

export function MountainWaterMotif() {
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M20 140 L62 84 L92 118 L128 58 L180 140 Z"
        fill="none"
        stroke={INK}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M20 156 C 60 148, 80 164, 120 152 C 150 144, 165 158, 182 150" fill="none" stroke={GOLD} strokeWidth="1.4" />
      <path d="M20 170 C 60 162, 80 178, 120 166 C 150 158, 165 172, 182 164" fill="none" stroke={GOLD} strokeWidth="1" opacity="0.6" />
    </svg>
  );
}

export function CloudMotif() {
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M60 120 C40 120 40 96 60 94 C58 74 88 68 98 84 C106 66 138 68 140 90 C160 88 164 116 144 120 Z"
        fill="none"
        stroke={INK}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M70 138 C 84 130, 100 146, 114 138 C 128 130, 142 146, 156 138"
        fill="none"
        stroke={GOLD}
        strokeWidth="1.2"
      />
    </svg>
  );
}

export function BlossomMotif() {
  const petals = [0, 72, 144, 216, 288];
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <path d="M40 172 C 70 140, 90 120, 96 96" fill="none" stroke={INK} strokeWidth="1.6" />
      <path d="M64 148 L80 138" stroke={INK} strokeWidth="1.2" />
      <g transform="translate(112 78)">
        {petals.map((deg) => (
          <ellipse
            key={deg}
            cx="0"
            cy="-13"
            rx="7"
            ry="13"
            fill="none"
            stroke={GOLD}
            strokeWidth="1.3"
            transform={`rotate(${deg})`}
          />
        ))}
        <circle r="3.2" fill={GOLD} />
      </g>
      <g transform="translate(70 118)">
        {petals.map((deg) => (
          <ellipse
            key={deg}
            cx="0"
            cy="-8"
            rx="4.5"
            ry="8"
            fill="none"
            stroke={INK}
            strokeWidth="1"
            opacity="0.7"
            transform={`rotate(${deg})`}
          />
        ))}
        <circle r="2" fill={INK} opacity="0.7" />
      </g>
    </svg>
  );
}

export function LatticeMotif() {
  const lines = [-60, -30, 0, 30, 60];
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect x="30" y="30" width="140" height="140" fill="none" stroke={INK} strokeWidth="1.8" />
      <g transform="translate(100 100)">
        {lines.map((v) => (
          <line key={`v${v}`} x1={v} y1="-70" x2={v} y2="70" stroke={GOLD} strokeWidth="0.9" />
        ))}
        {lines.map((h) => (
          <line key={`h${h}`} x1="-70" y1={h} x2="70" y2={h} stroke={GOLD} strokeWidth="0.9" />
        ))}
      </g>
      <rect x="30" y="30" width="140" height="140" fill="none" stroke={INK} strokeWidth="0.6" opacity="0.4" />
    </svg>
  );
}

export function WaveMotif() {
  const rows = [60, 90, 120, 150];
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      {rows.map((y, i) => (
        <path
          key={y}
          d={`M20 ${y} C 45 ${y - 16}, 55 ${y + 16}, 80 ${y} C 105 ${y - 16}, 115 ${y + 16}, 140 ${y} C 155 ${y - 8}, 165 ${y + 8}, 180 ${y}`}
          fill="none"
          stroke={i % 2 === 0 ? GOLD : INK}
          strokeWidth="1.3"
          opacity={i % 2 === 0 ? 1 : 0.6}
        />
      ))}
    </svg>
  );
}

export function PathMotif() {
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M96 30 C 70 70, 130 90, 100 130 C 78 160, 110 175, 96 190"
        fill="none"
        stroke={INK}
        strokeWidth="1.8"
      />
      {[38, 70, 104, 138, 168].map((y, i) => (
        <ellipse key={y} cx={96 + (i % 2 === 0 ? -14 : 14)} cy={y} rx="9" ry="5" fill="none" stroke={GOLD} strokeWidth="1.2" />
      ))}
    </svg>
  );
}

/** label 문자열(예: "산수"/"구름"/"매화" 등)로 위 7개 모티프 중 하나를
 * 고른다 — ChapterDivider 조립부(ReportPdfDocument.tsx)가 장마다 어떤
 * 모티프를 쓸지 이 키 하나로만 선택하게 해 오타로 다른 모티프가 섞이는
 * 것을 방지한다. */
export const PDF_MOTIFS = {
  moon: MoonMotif,
  mountainWater: MountainWaterMotif,
  cloud: CloudMotif,
  blossom: BlossomMotif,
  lattice: LatticeMotif,
  wave: WaveMotif,
  path: PathMotif,
} as const;

export type PdfMotifKey = keyof typeof PDF_MOTIFS;
