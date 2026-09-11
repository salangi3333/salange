import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { FairyImageSlot } from "@/components/pdf/ReportPdfPrototype";

/**
 * 평생운명록 PDF(book) 전용 이미지 로딩 — 로컬 검증 스크립트
 * (scripts/_pdf_book_v1_gen.ts)와 서버 Buffer 생성 함수
 * (lib/generateBookPdfBuffer.ts)가 **동일하게** 이 파일 하나만 쓴다(로직
 * 복제 금지 원칙). 이미지 소스는 항상 public/pdf-assets-optimized(고품질
 * JPEG, 2026-09-11 압축 실험에서 46.5MB→10.8MB·육안 손상 없음 검증됨)이고,
 * public/pdf-assets(PNG 마스터 원본)는 이 파일에서 전혀 읽지 않는다.
 *
 * [2026-09-11 이전 동작과의 차이 — 의도된 변경] 예전 scripts/_pdf_book_v1_gen.ts의
 * loadImageSlot()은 이미지가 없으면 { dataUri: null }을 조용히 반환했다
 * (ReportPdfBookDocument가 emptySlot으로 대체 렌더링하는 프로토타입 단계
 * 편의 기능). 지금은 "이미지 없는 PDF가 고객에게 그대로 나가면 안 된다"는
 * 요구에 따라 **하나라도 없으면 즉시 예외를 던진다**(fail-loud) — 조용히
 * 넘어가지 않는다.
 */

const REQUIRED_BASE_NAMES = [
  "fairy-cover",
  "fairy-destiny-mountain",
  "fairy-writing",
  "fairy-water-reflection",
  "fairy-love-letter",
  "fairy-scroll",
  "fairy-turning-point",
  "fairy-future-window",
  "fairy-lantern",
  "ten-year-flow-background",
  "paljamun-ink-background-seal",
] as const;

export interface BookFairySlots {
  cover: FairyImageSlot;
  benjil: FairyImageSlot;
  chapter: FairyImageSlot;
  wayOfLife: FairyImageSlot;
  love: FairyImageSlot;
  wealth: FairyImageSlot;
  lifeTransition: FairyImageSlot;
  tenYear: FairyImageSlot;
  gwiin: FairyImageSlot;
  ending: FairyImageSlot;
  tenYearBg: FairyImageSlot;
  letterBg: FairyImageSlot;
}

/** 프로젝트 기준 기본 이미지 폴더 — public/pdf-assets-optimized만 가리킨다
 * (public/pdf-assets 원본 폴더가 아님). */
export function defaultBookImageDir(): string {
  return join(process.cwd(), "public", "pdf-assets-optimized");
}

function loadOne(dir: string, baseName: string): FairyImageSlot {
  const candidates = [`${baseName}.jpg`, `${baseName}.png`, `${baseName}.webp`];
  for (const name of candidates) {
    const p = join(dir, name);
    if (existsSync(p)) {
      const buf = readFileSync(p);
      const ext = name.endsWith(".png") ? "png" : name.endsWith(".webp") ? "webp" : "jpeg";
      return {
        dataUri: `data:image/${ext};base64,${buf.toString("base64")}`,
        expectedPath: join(dir, name),
      };
    }
  }
  // 조용히 dataUri:null을 반환하지 않는다 — 고객에게 이미지 빠진 PDF가
  // 나가는 상황을 막기 위해 이 함수 자체가 명확하게 실패한다.
  throw new Error(
    `[pdfBookAssets] 필수 이미지가 없습니다: ${join(dir, baseName)}.(jpg|png|webp) — PDF 생성을 중단합니다.`
  );
}

/**
 * 11개 필수 이미지를 전부(누락 없이) 로드해 ReportPdfBookDocument가
 * 기대하는 fairies 형태로 반환한다. 폴더 자체가 없거나, 11개 중 하나라도
 * 없으면 예외를 던진다(호출부가 그대로 실패를 전파 — 여기서 삼키지 않음).
 */
export function loadBookFairyImages(dir: string = defaultBookImageDir()): BookFairySlots {
  if (!existsSync(dir)) {
    throw new Error(`[pdfBookAssets] 이미지 폴더 자체가 없습니다: ${dir}`);
  }
  const loaded = Object.fromEntries(REQUIRED_BASE_NAMES.map((n) => [n, loadOne(dir, n)])) as Record<
    (typeof REQUIRED_BASE_NAMES)[number],
    FairyImageSlot
  >;

  return {
    cover: loaded["fairy-cover"],
    benjil: loaded["fairy-destiny-mountain"],
    chapter: loaded["fairy-writing"],
    wayOfLife: loaded["fairy-water-reflection"],
    love: loaded["fairy-love-letter"],
    wealth: loaded["fairy-scroll"],
    lifeTransition: loaded["fairy-turning-point"],
    tenYear: loaded["fairy-future-window"],
    gwiin: loaded["fairy-lantern"],
    ending: loaded["fairy-cover"], // 표지와 동일 이미지 재사용(북엔드 구성, 기존 설계 그대로)
    tenYearBg: loaded["ten-year-flow-background"],
    letterBg: loaded["paljamun-ink-background-seal"],
  };
}
