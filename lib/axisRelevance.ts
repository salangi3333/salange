/**
 * 재사용 가능한 최소 구조 — "존재 여부 → 중요도 판단 → 중심(center)/보조
 * (supporting)/제외(none) → 현실 표현" 원칙을 챕터마다 새로 만들지 않도록
 * 딱 하나의 순수 함수로 뽑아둔 것. 2장(chapterOneNarrative.ts의
 * buildChapterTwoOpening)에서 관성(관살혼잡)을 이 기준으로 판정하며 처음
 * 만들었고, 이후 3·4장이나 유료 리포트에서 "특정 구조가 존재는 하지만
 * 중심축은 아닐 수 있다"를 판정할 때 그대로 재사용할 수 있다.
 *
 * 이 파일은 계산 엔진이 아니다 — strengthAnalysis.ts 등이 이미 계산해 둔
 * top/second/tier 값을 어떻게 "이야기의 비중"으로 옮길지만 정한다. 새로운
 * 명리 판정이나 점수를 만들지 않는다.
 */

export type AxisRelevance = "center" | "supporting" | "none";

export interface AxisRelevanceInput {
  /** 이 사람의 실제 최상위 축(analyzeCategoryStrength 등, 이미 계산된 값) */
  topCategory: string;
  /** 실제 2위 축. 없으면 null. */
  secondCategory: string | null;
  /** top과 second의 격차 등급(A=단독 우세·B=근소 우세·C=공동 우세). 없으면 null. */
  tier: "A" | "B" | "C" | null;
  /** 지금 비중을 판정하려는 후보 축(예: "관성"). */
  candidateCategory: string;
  /** 후보 축이 "중심으로 못 올라가도 최소한 언급할 가치는 있는 구조"로
   * 실존하는지 — 예: 관살혼잡이면 편관·정관이 둘 다 있는지. 단일 존재만
   * 확인하면 되는 구조라면 그 값을 그대로 넣는다. */
  candidateHasNotableStructure: boolean;
}

/**
 * ① 후보 자체가 top이면 → "center"(candidateHasNotableStructure와 무관 —
 *    top/second는 이미 count>0인 카테고리에서만 나오므로 존재는 보장된다).
 * ② 후보가 second인데 tier가 "C"(공동 우세)면 → "center"
 *    (근소 우세 B·단독 우세 A에서는 진짜 중심이 따로 있다고 보고 승격하지
 *    않는다 — 특정 인물에 맞추기 위한 예외가 아니라 모두에게 같은 기준).
 * ③ center가 아니면서 "특별히 언급할 가치가 있는 구조"(candidateHasNotableStructure,
 *    예: 관살혼잡=편관·정관이 둘 다 있음)까지 있으면 → "supporting".
 * ④ 그 외(중심도 아니고 특별한 구조도 없음) → "none".
 *
 * 순서가 중요하다 — ①②를 ③보다 먼저 판정해야, "관성이 편관 하나만으로도
 * top/근소 second인 경우"(관살혼잡의 '짝'은 없어도 그 카테고리 자체는
 * 중심인 경우, 예: 편관만 3개인 사람)가 candidateHasNotableStructure=false
 * 때문에 부당하게 "none"으로 떨어지지 않는다.
 */
export function classifyAxisRelevance(input: AxisRelevanceInput): AxisRelevance {
  const { topCategory, secondCategory, tier, candidateCategory, candidateHasNotableStructure } = input;
  if (topCategory === candidateCategory) return "center";
  if (secondCategory === candidateCategory && tier === "C") return "center";
  if (candidateHasNotableStructure) return "supporting";
  return "none";
}
