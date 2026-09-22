import { AppData } from "./sajuContent";
import { Stage } from "./natalStructure";
import { buildChapterThreeKey, ChapterThreeKey } from "./chapterThreeInterpretation";
import { buildChapterThreeSentenceBankSections } from "./chapterThreeSentenceBank";

/**
 * 第三章 유료 심화 — 2026-09 이식(B1~B8 + 정리 문장뱅크).
 *
 * scratch(scripts/_scratch_ch3_b1.ts ~ _scratch_ch3_b8.ts,
 * _scratch_ch3_closing.ts)에서 22명 전수검증(+주요 블록 10,224건 스트레스
 * 테스트)까지 마친 계산 조건·문장을 lib/chapterThreeSentenceBank.ts로 그대로
 * 옮기고, 이 파일은 그 결과를 sections로 받아오기만 한다 — 여기서 새 문장을
 * 짓지 않는다.
 *
 * visual(comfort/tension, 원국 내부 합·충 카드용)은 이전 시스템과 동일하게
 * buildChapterThreeKey(appData).heChong에서 그대로 뽑는다 — B6과 같은 계산
 * 값을 쓰지만, 화면 카드는 문장과 별개로 계속 필요해서 이 자리에 남긴다.
 *
 * 이전 버전(12운성×축 렌즈, tier/axis 기반 6섹션 고정 구조)은 이번 교체로
 * 완전히 대체됐다 — 그 코드는 삭제했다(git 이력에 남아 있음).
 */

const STAGE_LABEL: Record<Stage, string> = {
  year: "초년의 자리", month: "사회로 나가는 자리", day: "자기 자신이 선 자리", hour: "말년의 자리",
};

const STAGE_HINT: Record<Stage, string> = {
  year: "어린 시절과 뿌리", month: "사회생활과 일", day: "나 자신의 중심", hour: "노후와 마무리",
};

export interface ChapterThreeDeepSection {
  heading: string;
  body: string[];
}

export interface RelationPairLabel {
  aLabel: string;
  bLabel: string;
  aHint: string;
  bHint: string;
}

export interface ChapterThreeDeepVisual {
  comfort: RelationPairLabel[];
  tension: RelationPairLabel[];
}

export interface ChapterThreeDeepResult {
  sections: ChapterThreeDeepSection[];
  visual: ChapterThreeDeepVisual;
}

export function buildChapterThreeDeepNarrative(appData: AppData): ChapterThreeDeepResult {
  const key: ChapterThreeKey = buildChapterThreeKey(appData);
  const { heChong } = key;

  const comfort: RelationPairLabel[] = heChong.he.map((p) => ({
    aLabel: `${STAGE_LABEL[p.a.stage]}(${p.a.zhi})`,
    bLabel: `${STAGE_LABEL[p.b.stage]}(${p.b.zhi})`,
    aHint: STAGE_HINT[p.a.stage],
    bHint: STAGE_HINT[p.b.stage],
  }));
  const tension: RelationPairLabel[] = heChong.chong.map((p) => ({
    aLabel: `${STAGE_LABEL[p.a.stage]}(${p.a.zhi})`,
    bLabel: `${STAGE_LABEL[p.b.stage]}(${p.b.zhi})`,
    aHint: STAGE_HINT[p.a.stage],
    bHint: STAGE_HINT[p.b.stage],
  }));

  const sections = buildChapterThreeSentenceBankSections(appData);

  return { sections, visual: { comfort, tension } };
}
