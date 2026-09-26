import { AppData } from "./sajuContent";
import { generateLife7V6 } from "./lifeTransitionChapter/life";
import { generateBasisV2 } from "./lifeTransitionChapter/basis";

/**
 * 第六章("인생의 전환점") — [2026-09 최종 이식] 확정된 scratch(scripts/_scratch_ch6_*.ts)를
 * lib/lifeTransitionChapter/{life,basis}.ts로 그대로 옮겨 조립한다. 계산 조건·분기·문장은 scratch와
 * 동일하며 여기서 새로 짓거나 바꾸지 않는다(5장 wealthInsightNarrative.ts 이식과 같은 방식).
 *
 *  - ①~⑦: life.ts(generateLife7V6). ⑤⑥은 실제 다음 대운이 있을 때만, ⑦은 타고난 중심축이 있을 때만 생성된다.
 *  - ⑧ 정리 근거: basis.ts(generateBasisV2). 소제목 없이 평평한 줄로 옮긴다 —
 *    "안내 문장 → (항목 제목 → 본문 → [명리 근거]) 반복"(5장 ⑩ 명리 근거와 같은 방식).
 *  - 번호: 고객에게 보이는 소제목 앞 번호는 표시하지 않는다(소제목 문구만 사용).
 *  - 기존 `lifeTransitionNarrative.ts`(옛 ①~④, chapterLifeTransition)는 제목·장 번호 등을 위해 그대로 둔다.
 */

export interface NarrativeParagraph {
  text: string;
  sourceNote: string;
}

export interface LifeTransitionInsightSection {
  heading: string;
  body: string[];
}

export interface LifeTransitionInsightResult {
  sections: LifeTransitionInsightSection[];
}

const stripNumber = (h: string) => h.replace(/^[①-⑩]\s*/, "");

export function generateLifeTransitionInsightNarrative(appData: AppData): LifeTransitionInsightResult {
  const life = generateLife7V6(appData);
  const basis = generateBasisV2(appData);

  const raw: { heading: string; body: string[] }[] = life.sections.map((s) => ({
    heading: stripNumber(s.heading),
    body: s.paras.map((p) => p.text),
  }));

  const basisBody: string[] = [basis.intro];
  for (const it of basis.items) {
    basisBody.push(it.title, it.body);
    if (it.basis) basisBody.push(`[명리 근거] ${it.basis}`);
  }
  raw.push({ heading: stripNumber(basis.heading), body: basisBody });

  // 번호는 고객에게 보이지 않는다(소제목 문구만 사용).
  const sections = raw.map((s) => ({ heading: s.heading, body: s.body }));
  return { sections };
}
