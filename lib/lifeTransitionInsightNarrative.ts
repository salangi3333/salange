import { AppData } from "./sajuContent";
import { buildLifeFlowKey, LifeFlowKey, LifePhase, DaYunNatalRelation } from "./lifeFlowInterpretation";
import { buildLifeFlowNarrative } from "./lifeFlowNarrative";
import { SipseongCategory } from "./strengthAnalysis";
import { analyzeYongsinCandidate } from "./yongsinCandidateAnalysis";
import { analyzeDayMasterBalance } from "./dayMasterBalanceAnalysis";
import { ATTACKS } from "./wealthTimingAnalysis";
import { DaYunWealthPeriod } from "./daYunWealthAnalysis";
import { Stage } from "./natalStructure";
import { GAN_ELEMENT, ELEMENT_LABEL, GENERATES, OVERCOMES } from "./hanjaTables";

/**
 * 第六章("인생의 전환점") 프리미엄 확장 — 처음부터 완성형으로 설계(승인된
 * 작업, 2026-09). 第四·五章이 여러 라운드에 걸쳐 보강했던 시행착오(번호
 * 리셋·용어 중복·결론 반복)를 반복하지 않기 위해, 그 라운드들에서 확정된
 * 원칙(단일 연속 소제목 체계·용어는 최초 1회만·같은 결론 두 번 금지·HOW+WHY
 * 결합)을 처음부터 적용한다.
 *
 * 기존 `lifeTransitionNarrative.ts`(4섹션, 688자)는 한 글자도 건드리지
 * 않는다 — `chapterLifeTransition` 필드는 PDF 등 다른 소비자를 위해 그대로
 * 유지되고, 이 파일은 화면 전용 새 필드(`chapterLifeTransitionInsight`)를
 * 만든다(第五章 구조 개편과 동일 패턴: 기존 필드 보존 + 신규 필드 추가).
 *
 * 재사용하는 값(전부 기존 계산, 새 계산 없음):
 *  - buildLifeFlowKey: natalAxis(원국 중심축)·natalAxisTier·secondAxis·
 *    phases(대운을 카테고리로 묶은 국면 배열, 사람마다 개수 다름)·
 *    currentPhaseIndex·periods(병합 전 원본 대운)·daYun{past,current,next}·
 *    relations{past,current,next}(대운 지지 vs 원국 4지지 육합/육충)
 *  - buildLifeFlowNarrative: killpoint(사람마다 다른 오프닝 훅, 이미 5갈래
 *    분기)·bigPictureLocked(국면별 상세 문단, 무료 전환구간에서 안 쓰이는
 *    잠금 전용 자산 — ②의 뼈대로 그대로 재사용)·daYunFlowLocked.current/
 *    next(과거 라운드에서 lockedDetail 전용으로만 쓰이던, 화면에 아직
 *    한 번도 안 나온 상세 문장 — ④⑤의 뼈대로 재사용). 이 두 함수는 import만
 *    하고 전혀 수정하지 않는다.
 *  - analyzeYongsinCandidate: winners(용신 카테고리) — "이 전환이 이
 *    사람에게 유리한 방향인지"를 재물이 아닌 인생 전반의 언어로 재사용
 *    (재물장의 A~E 시기분류를 복제하지 않는다 — winners 포함 여부만 본다).
 *  - analyzeDayMasterBalance: balance(신강/신약) — "지금 이 전환을 감당할
 *    그릇이 있는지"의 근거로만 쓴다.
 *  - ATTACKS(wealthTimingAnalysis.ts, 재물 전용 export를 카테고리 관계
 *    표로만 재사용) — 국면 전환이 "충돌형"인지 "순한 전환"인지 판정한다.
 *
 * 새 계산이 필요해서 구현하지 않고 보고만 하는 것:
 *  - 세운(연도별) 단위 서술 — 第七章의 역할이라 이 장에서는 다루지 않는다.
 *  - 삼합/방합/형/파/해, 원국 내부 천간합 — 여전히 계산 자체가 없다.
 *  - 직업/결혼/이혼 등 구체적 사건 확정 — "경험하기 쉬웠을 수 있다" 수준의
 *    현실적 서술까지만 하고 사건을 창작하지 않는다.
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

// ────────────────────────────────────────────────────────────────
// 공통 헬퍼
// ────────────────────────────────────────────────────────────────

/** 국면이 바뀔 때 "판단의 기준"이 무엇인가 — lifeFlowNarrative.ts의
 * CATEGORY_JUDGMENT_BASIS와 같은 개념이지만, 그 파일을 건드리지 않기 위해
 * 이 파일에 독립적으로 다시 둔다(이미 여러 장에서 반복된 패턴). */
const CATEGORY_JUDGMENT_BASIS: Record<SipseongCategory, string> = {
  비겁: "스스로 옳다고 판단한 것을 따르는 것",
  식상: "생각한 것을 자기 방식대로 표현하고 만들어내는 것",
  재성: "눈에 보이는 현실적 결과를 손에 쥐는 것",
  관성: "정해진 기준과 맡은 책임을 지키는 것",
  인성: "받아들이고 이해한 뒤 납득해서 움직이는 것",
};

const CATEGORY_DOMAIN: Record<SipseongCategory, string> = {
  비겁: "스스로 결정하고 밀어붙이는 일",
  식상: "표현하고 만들어내는 활동",
  재성: "현실적인 성과와 돈을 다루는 방식",
  관성: "맡은 역할과 책임, 소속된 자리",
  인성: "관계와 신뢰, 배우고 받아들이는 일",
};

const CATEGORY_ATTITUDE: Record<SipseongCategory, string> = {
  비겁: "스스로 결정하고 밀어붙이려는 태도",
  식상: "생각을 적극적으로 꺼내 벌이려는 태도",
  재성: "실질적인 결과부터 확인하려는 태도",
  관성: "맡은 몫을 끝까지 책임지려는 태도",
  인성: "충분히 이해하고 받아들인 뒤에야 움직이려는 태도",
};

/** ③ 전용 "반복 장면" 뱅크 — ⑥의 CATEGORY_MOMENT(다음 국면에서 새롭게
 * 나타날 수 있는 장면)와는 반대로, "지금까지 계속 반복돼 온 장면"을
 * 다른 문장으로 담는다. 같은 카테고리라도 두 뱅크는 문장이 전혀 겹치지
 * 않게 독립적으로 써서, natalAxis와 현재/다음 국면의 카테고리가 우연히
 * 같아도 ③과 ⑥이 같은 문장을 반복하지 않는다. */
const PATTERN_MOMENT: Record<SipseongCategory, string> = {
  비겁: "예를 들어 직장을 옮기거나 환경이 완전히 바뀌어도, 결국 스스로 결정하고 밀어붙이는 방식 자체는 그대로 반복돼 왔을 수 있습니다.",
  식상: "예를 들어 만나는 사람이나 하는 일이 달라져도, 속에 있는 것을 밖으로 꺼내야 직성이 풀리는 방식 자체는 그대로 반복돼 왔을 수 있습니다.",
  재성: "예를 들어 상황이 달라져도, 결정을 내리기 전에 실질적인 손익부터 따져보는 방식 자체는 그대로 반복돼 왔을 수 있습니다.",
  관성: "예를 들어 소속이나 자리가 바뀌어도, 맡은 몫을 끝까지 책임지려는 방식 자체는 그대로 반복돼 왔을 수 있습니다.",
  인성: "예를 들어 배우는 대상이 달라져도, 충분히 이해하고 납득해야 움직이는 방식 자체는 그대로 반복돼 왔을 수 있습니다.",
};

function isPhaseJustStarted(phase: LifePhase, currentPeriod: DaYunWealthPeriod | null): boolean {
  if (!currentPeriod) return false;
  return phase.periods[0] === currentPeriod;
}

const STAGE_LABEL: Record<Stage, string> = {
  year: "초년의 자리", month: "사회로 나가는 자리", day: "자기 자신이 선 자리", hour: "말년의 자리",
};
const STAGE_MEANING: Record<Stage, string> = {
  year: "어릴 때 만들어진 기반",
  month: "사회 안에서의 위치",
  day: "자기 자신의 중심",
  hour: "말년과 이후의 삶",
};

/** 과거·현재·다음 대운이 원국의 같은 자리(육합/육충)를 반복해서 건드리는지
 * 확인한다 — key.relations(이미 계산돼 있는 LifeFlowKey 필드, 새 계산
 * 아님)를 한 단계 더 훑는 것뿐이다. 2회 이상 같은 자리가 걸리면 그 자체가
 * "왜 특정 영역이 계속 흔들렸는가"에 대한 실제 근거가 된다. */
function findRecurringNatalStage(key: LifeFlowKey): Stage | null {
  const all: DaYunNatalRelation[] = [...key.relations.past, ...key.relations.current, ...key.relations.next];
  const counts = new Map<Stage, number>();
  all.forEach((r) => counts.set(r.natalStage, (counts.get(r.natalStage) ?? 0) + 1));
  for (const [stage, count] of counts) {
    if (count >= 2) return stage;
  }
  return null;
}

// ────────────────────────────────────────────────────────────────
// ① 내 인생에는 몇 번의 큰 국면이 있는가
// ────────────────────────────────────────────────────────────────

/** 훅(lifeFlow.killpoint)을 맨 앞으로 — 第六章 몰입도 개선 QA(승인된
 * 작업)에서 "장이 설명문처럼 시작한다"는 지적에 따른 순서 변경. killpoint
 * 자체는 buildLifeFlowNarrative(수정 안 함)가 이미 자연축 위치에 따라
 * 6갈래로 다르게 만드는 문장이라, 이 사람에게만 해당하는 발견으로
 * 章을 열게 된다. 문장 자체는 한 글자도 안 바꾸고 위치만 옮겼다. */
function buildPhaseCountSection(name: string, key: LifeFlowKey, hook: string): LifeTransitionInsightSection {
  const { phases } = key;
  const body: string[] = [hook];

  if (phases.length <= 1) {
    body.push(`${name}님은 지금까지 하나의 흐름 위에서 삶을 이어왔습니다. 아직 뚜렷하게 나뉘는 국면 경계가 나타나지 않은 것도, 이 사람의 명식이 실제로 그렇게 흘러왔기 때문입니다.`);
  } else {
    const spans = phases.map((p) => `${p.startAge}세부터 ${p.endAge}세까지`).join(", ");
    body.push(`대운을 국면으로 묶어보면, 지금까지 확인되는 큰 흐름은 총 ${phases.length}번입니다(${spans}). 모든 사람이 같은 개수의 국면을 지나는 것은 아닙니다 — 이 숫자 자체가 이 사람의 명식에서 실제로 나온 결과입니다.`);
    const map = phases
      .map((p, i) => (p.category ? `${i + 1}번째(${p.startAge}~${p.endAge}세)는 ${CATEGORY_DOMAIN[p.category]}` : `${i + 1}번째(${p.startAge}~${p.endAge}세)는 여러 힘이 섞인`))
      .join(", ");
    body.push(`거칠게 지도를 그리면, ${map} 중심이었던 시기입니다. 이 지도를 따라가면서, 그 국면마다 실제로 무엇이 삶을 이끌었는지를 하나씩 짚어보겠습니다.`);
  }
  return { heading: "① 내 인생에는 몇 번의 큰 국면이 있는가", body };
}

// ────────────────────────────────────────────────────────────────
// ② 지나온 국면 — 그때 나는 무엇을 배우고 있었나
// ────────────────────────────────────────────────────────────────

function buildPastPhasesSection(bigPictureLocked: string[], pastPhaseCount: number): LifeTransitionInsightSection {
  if (bigPictureLocked.length === 0) {
    return {
      heading: "② 지나온 국면 — 그때 나는 무엇을 배우고 있었나",
      body: ["아직 첫 번째 국면을 지나는 중이라, 비교할 만한 지난 국면은 없습니다. 지금 서 있는 자리가 곧 이 사람의 출발점입니다."],
    };
  }
  const body = [...bigPictureLocked];
  if (pastPhaseCount >= 2) {
    body.push(
      `이렇게 국면을 하나씩 늘어놓고 보면, 그때는 서로 다른 사건처럼 느껴졌던 시기들이 사실은 하나의 흐름 위에서 순서대로 이어져 있었다는 것이 보입니다 — "그때 왜 그랬을까"라는 질문에, 사건이 아니라 그 시기를 이끌던 힘으로 답할 수 있는 부분이 있습니다.`
    );
  }
  return { heading: "② 지나온 국면 — 그때 나는 무엇을 배우고 있었나", body };
}

// ────────────────────────────────────────────────────────────────
// ③ 반복되던 삶의 패턴
// ────────────────────────────────────────────────────────────────

const NATAL_TIER_LABEL: Record<"A" | "B" | "C", string> = {
  A: "다른 힘들과 견줘도 뚜렷하게 앞서 있는",
  B: "다른 힘들보다 어느 정도 앞서 있는",
  C: "다른 힘과 크게 차이 나지 않을 만큼 근소하게 앞선",
};

/** 병합 전 원본 대운(key.periods, 새 계산 아님)에서 "지금까지 지난"
 * 대운 중 타고난 중심축과 정확히 같은 카테고리가 몇 번이었는지를 센다 —
 * phases(카테고리별로 묶은 국면) 단위가 아니라 10년 단위 원본 대운
 * 단위로 다시 세는 것이라 natalAxisPhaseCount와는 다른 각도의 근거다. */
function buildHistoricalWeightNote(key: LifeFlowKey): string | null {
  if (!key.natalAxis) return null;
  const past = key.periods.filter((p) => p.state !== "future");
  if (past.length === 0) return null;
  const matching = past.filter((p) => p.ganCategory === key.natalAxis).length;
  const ratio = matching / past.length;
  if (ratio >= 0.5) {
    return `실제로 지금까지 지난 대운을 10년 단위로 세어보면, 그중 ${matching}번이 이 중심축과 같은 힘이었습니다. 살아온 시간의 절반 넘게 이 힘 위에 서 있었던 셈입니다.`;
  }
  if (matching === 0) {
    return `다만 지금까지 지난 대운 중에는 이 중심축과 정확히 같은 힘이 대운 자체로는 한 번도 나타나지 않았습니다 — 그만큼 이 힘은 겉으로 잘 드러나기보다, 원국 안에서 조용히 작동해온 배경에 가깝습니다.`;
  }
  return null;
}

function buildRepeatingPatternSection(key: LifeFlowKey): LifeTransitionInsightSection {
  const { phases, natalAxis, dayBranchCategory } = key;
  const body: string[] = [];

  if (natalAxis && key.natalAxisTier) {
    body.push(`이 사람의 명식에서 타고난 중심축은 ${NATAL_TIER_LABEL[key.natalAxisTier]} 힘입니다.`);
  }

  const natalAxisPhaseCount = phases.filter((p) => p.isNatalAxis).length;
  if (natalAxis && natalAxisPhaseCount >= 2) {
    body.push(
      `여러 국면을 지나오면서도, 타고난 중심축의 힘이 한 번이 아니라 ${natalAxisPhaseCount}번이나 다시 삶의 앞자리로 돌아왔습니다. 환경이 달라져도 비슷한 선택을 반복했다면, 그건 우연이 아니라 이 힘이 이 사람의 원래 판단 기준이기 때문입니다 — 잠시 다른 힘에 자리를 내줘도, 결국 원래의 방식(${CATEGORY_ATTITUDE[natalAxis]})으로 돌아오는 구조입니다.`
    );
  } else {
    const categories = phases.map((p) => p.category).filter((c): c is SipseongCategory => Boolean(c));
    const seen = new Set<SipseongCategory>();
    const repeated = categories.find((c) => (seen.has(c) ? true : (seen.add(c), false)));
    if (repeated) {
      body.push(
        `국면들 사이에 완전히 새로운 힘만 등장한 것은 아닙니다. 같은 성질의 힘이 한 번으로 끝나지 않고 다시 등장했다면, 그때마다 비슷한 태도(${CATEGORY_ATTITUDE[repeated]})가 함께 돌아왔을 가능성이 큽니다. "왜 예전에도 이랬던 것 같지" 싶은 순간이 있다면, 이 반복이 그 답일 수 있습니다.`
      );
    } else if (natalAxis) {
      body.push(
        `국면마다 삶의 앞자리에 서는 힘 자체는 계속 달라졌지만, 그 판단의 뿌리에는 항상 타고난 중심축이 있었습니다. 겉으로 드러나는 태도(무엇을 벌이고, 무엇을 미루는지)는 시기마다 달라 보여도, 정작 마지막 결정을 내리는 기준점(${CATEGORY_JUDGMENT_BASIS[natalAxis]})은 크게 흔들리지 않았을 수 있습니다.`
      );
    } else {
      body.push(
        `이 사람은 어느 한 힘에 오래 머무르기보다, 국면마다 실제로 다른 힘을 앞세워온 쪽에 가깝습니다. "왜 항상 비슷하게 행동했을까"보다 "그때그때 무엇이 필요했는가"로 스스로를 돌아보는 편이 이 명식에는 더 정확합니다.`
      );
    }
  }

  const recurringStage = findRecurringNatalStage(key);
  if (recurringStage) {
    body.push(
      // STAGE_LABEL 4개 값이 전부 "~자리"로 끝나 받침이 없다(모음 종결)
      // — 조사는 항상 "를"로 고정된다.
      `게다가 지나온 대운들이 원국의 ${STAGE_LABEL[recurringStage]}(${STAGE_MEANING[recurringStage]})를 한 번이 아니라 여러 번 건드려 왔습니다. 여러 국면에 걸쳐 유독 이 영역이 반복해서 흔들리거나, 반대로 반복해서 힘을 받았을 수 있습니다 — 시기마다 다른 사건처럼 보여도 실은 같은 자리가 계속 움직이고 있었던 셈입니다.`
    );
  } else if (natalAxis && dayBranchCategory && natalAxis === dayBranchCategory) {
    body.push(
      `여기에 하나 더 — 이 사람이 타고난 중심축은 자기 자신이 선 자리(일지)와도 같은 성질입니다. 삶의 판단 기준과, 스스로 편안하게 느끼는 자리가 원래 같은 곳에서 나온다는 뜻이라, 이 사람에게는 그 방식을 따르는 것 자체가 억지가 아니라 가장 자연스러운 선택이었을 가능성이 큽니다.`
    );
  }

  const historicalWeightNote = buildHistoricalWeightNote(key);
  if (historicalWeightNote) body.push(historicalWeightNote);

  if (natalAxis) body.push(PATTERN_MOMENT[natalAxis]);

  return { heading: "③ 반복되던 삶의 패턴", body };
}

// ────────────────────────────────────────────────────────────────
// ④ 지금 서 있는 지점
// ────────────────────────────────────────────────────────────────

function buildCurrentPositionSection(key: LifeFlowKey, currentLocked: string, balanceLabel: string): LifeTransitionInsightSection {
  const { phases, currentPhaseIndex, natalAxis, daYun } = key;
  const current = phases[currentPhaseIndex];
  const body: string[] = [];

  if (!currentLocked) {
    body.push("지금은 아직 대운이 뚜렷하게 시작되기 전이거나 이미 대운을 모두 지난 시점이라, 현재 국면을 하나의 흐름으로 특정하기 어렵습니다.");
    return { heading: "④ 지금 서 있는 지점", body };
  }

  body.push(currentLocked);

  if (current?.category) {
    const stillValid = current.category === natalAxis;
    const justStarted = isPhaseJustStarted(current, daYun.current);
    const phaseNote = justStarted
      ? "지금은 이 국면이 막 시작된 초입에 가깝습니다. 아직 이 방식이 완전히 몸에 붙지 않았을 수 있습니다."
      : "지금은 이 국면이 이미 자리를 잡은 중반에 가깝습니다. 이 방식이 이미 상당히 익숙해져 있을 시점입니다.";
    // stillValid===false일 때만 "보통은 이렇게 보이지만" 대비 화법을 쓴다
    // — 실제로 지금 국면(current.category)과 타고난 중심축(natalAxis)이
    // 다른 사람에게만 해당하는, 계산상 정말로 갈리는 지점이기 때문이다
    // (第六章 몰입도 개선 QA #6, 남발 금지 원칙에 따라 이 한 곳에만 쓴다).
    const validNote = stillValid
      ? "지금까지 써온 방식은 타고난 중심축과 같은 결이라, 지금도 그대로 유효한 쪽입니다 — 무리해서 다른 방식을 찾을 필요는 없습니다."
      : "겉으로 보이는 지금 모습만 보면 이게 이 사람의 원래 성향이라고 읽기 쉽습니다. 하지만 이 명식에서는 타고난 중심축이 따로 있어서, 실제로는 이 국면이 요구해서 잠시 앞세운 방식에 더 가깝습니다. 편하게 느껴지지 않아도 이상한 게 아닙니다.";
    body.push(`${phaseNote} ${validNote}`);

    body.push(
      `지금 이 흐름을 감당하는 그릇은 ${balanceLabel} 편이라, ${
        balanceLabel === "여유가 있는"
          ? "지금의 무게를 버거워하지는 않는 쪽입니다. 오히려 여유가 있는 만큼, 지금 무엇을 하고 있는지 스스로 잘 못 느끼고 지나칠 수 있습니다."
          : "지금의 무게를 스스로 조절하며 다루는 것이 특히 중요한 시기입니다. 한 번에 다 감당하려 하기보다, 지금 감당할 수 있는 만큼만 손에 쥐는 편이 이 시기에는 더 맞습니다."
      }`
    );

    if (key.secondAxis && key.secondAxis !== current.category) {
      body.push(
        `여기에 이 사람의 2순위 힘(${key.secondAxis})도 배경에서 함께 작동하고 있습니다. 지금 국면을 이끄는 힘이 이 사람의 전부는 아니라는 뜻이라, 겉으로 보이는 태도 아래에 또 다른 결이 함께 흐르고 있다고 보는 편이 더 정확합니다.`
      );
    }

    const currentRel = key.relations.current[0];
    if (currentRel) {
      body.push(
        // STAGE_LABEL 4개 값이 전부 "~자리"로 끝나 받침이 없다(모음 종결)
        // — 조사는 항상 "와"로 고정된다.
        `여기에 더해, 지금 대운은 원국의 ${STAGE_LABEL[currentRel.natalStage]}(${STAGE_MEANING[currentRel.natalStage]})와 ${currentRel.type === "합" ? "손을 잡는" : "부딪히는"} 관계에 있습니다. ${
          currentRel.type === "합"
            ? "그래서 지금 이 방식은 그 영역과 자연스럽게 이어지며 힘을 받는 쪽에 가깝습니다."
            : "그래서 지금 이 방식을 쓰는 동안, 그 영역이 한 번씩 흔들리는 느낌을 받을 수 있습니다."
        }`
      );
    }
  }

  return { heading: "④ 지금 서 있는 지점", body };
}

// ────────────────────────────────────────────────────────────────
// ⑤ 다음 전환점
// ────────────────────────────────────────────────────────────────

function buildNextTransitionSection(key: LifeFlowKey, nextLocked: string, yongsinWinners: SipseongCategory[]): LifeTransitionInsightSection {
  const { phases, currentPhaseIndex, natalAxis, daYun, nextPhaseTransitionAge } = key;
  const current = phases[currentPhaseIndex];
  const body: string[] = [nextLocked];

  const next = daYun.next;
  if (next?.ganCategory && current?.category) {
    const changed = current.category !== next.ganCategory;
    const nextElement = ELEMENT_LABEL[GAN_ELEMENT[next.ganZhi[0]]];
    if (changed) {
      const axisNote = next.ganCategory === natalAxis ? " 흥미롭게도 이 힘은 타고난 중심축과 같아서, 원래 갖고 있던 방식이 다시 전면에 서는 흐름이기도 합니다." : "";
      const yongsinNote = yongsinWinners.includes(next.ganCategory)
        ? " 이 사람에게 원래 필요한 힘과도 같은 방향이라, 이 전환은 감당해야 할 부담이라기보다 오히려 도움이 되는 쪽에 가깝습니다."
        : "";
      // 명리 근거(핵심 십성 변화) → 현실 장면(HOW) → 오행 대비(WHY 심화)
      // 순서로 배치했다 — ④·⑦과 다른 리듬을 주기 위한 순서 변주(第六章
      // 몰입도 개선 QA #5). 정보는 그대로, 문장 순서만 바꿨다.
      body.push(
        // 5개 카테고리(비겁/식상/재성/관성/인성)는 전부 "ㄹ 받침이 아닌
        // 받침"으로 끝나 조사가 항상 "으로"로 고정된다(예외 없음) — 매번
        // 판정하는 대신 고정 조사를 쓴다.
        `핵심은 십성이 바뀐다는 사실 자체입니다 — ${nextPhaseTransitionAge ? `${nextPhaseTransitionAge}세를 기점으로, ` : ""}중심에 서는 힘이 ${current.category}에서 ${next.ganCategory}으로 넘어갑니다. 오행으로 보면 ${nextElement} 기운이 앞자리에 나서는 흐름이기도 합니다.${axisNote}${yongsinNote}`
      );
      body.push(
        // CATEGORY_ATTITUDE는 5개 값 전부 "~하려는 태도"로 끝나 받침이
        // 없다(모음 종결) — 조사는 항상 "가"로 고정된다.
        `예를 들어, 지금까지는 ${CATEGORY_ATTITUDE[current.category]}가 먼저 나왔다면, 이 전환을 지나면서는 같은 상황에서도 ${CATEGORY_ATTITUDE[next.ganCategory]}가 먼저 나오는 쪽으로 자연스럽게 옮겨갈 수 있습니다.`
      );
      if (!yongsinWinners.includes(next.ganCategory) && yongsinWinners.length > 0) {
        body.push(
          `다만 이 힘이 이 사람에게 원래 반드시 필요한 방향은 아닙니다. 그렇다고 나쁜 흐름이라는 뜻은 아니고, 힘을 빌려오기보다 스스로 만들어가야 하는 흐름에 가깝다는 뜻입니다.`
        );
      }
      const currentElement = GAN_ELEMENT[key.daYun.current?.ganZhi[0] ?? next.ganZhi[0]];
      const nextElementRaw = GAN_ELEMENT[next.ganZhi[0]];
      // "보통은 이렇게 읽지만 당신은 다릅니다" 대비 화법 — 오행 상생/상극
      // 관계가 실제로 존재할 때만 쓴다(남발 금지, 第六章 몰입도 개선
      // QA #6). ④에서 이미 한 번 썼으니 여기서는 다른 각도(십성 하나만
      // 보면 vs 오행까지 함께 보면)로 쓴다.
      const elementFlow =
        GENERATES[currentElement] === nextElementRaw
          ? `십성 하나만 보면 그저 힘이 바뀌는 시기로 읽기 쉽지만, 오행까지 함께 보면 지금의 기운(${ELEMENT_LABEL[currentElement]})이 다음 기운(${nextElement})을 자연스럽게 밀어주는 상생 관계입니다. 그래서 이 전환은 억지스럽기보다 흐르듯 이어지는 쪽에 가깝습니다.`
          : OVERCOMES[currentElement] === nextElementRaw || OVERCOMES[nextElementRaw] === currentElement
            ? `십성 하나만 보면 그저 힘이 바뀌는 시기로 읽기 쉽지만, 오행까지 함께 보면 지금의 기운(${ELEMENT_LABEL[currentElement]})과 다음 기운(${nextElement})이 서로 누르고 눌리는 관계입니다. 그래서 이 전환은 자연스럽게 흐르기보다 한 번은 결이 부딪히며 넘어가는 쪽에 가깝습니다.`
            : "";
      if (elementFlow) body.push(elementFlow);
    } else {
      const yongsinNote = yongsinWinners.includes(next.ganCategory)
        ? " 이 힘은 이 사람에게 원래 필요한 방향과도 같아서, 같은 방식을 계속 쓰는 것 자체가 불리하지 않습니다."
        : "";
      body.push(
        `다음 대운에서도 큰 틀의 힘 자체는 이어지지만, 원국과 맞물리는 결이 달라지면서 같은 방향 안에서도 다루는 방식은 조금씩 조정될 수 있습니다. 오행으로는 ${nextElement} 기운이 한 번 더 이어지는 흐름입니다.${yongsinNote}`
      );
      body.push(
        `이렇게 같은 힘이 국면을 넘어 이어질 때는, 완전히 새로운 방식을 찾기보다 지금 쓰는 방식(${CATEGORY_ATTITUDE[current.category]})을 조금 더 정교하게 다듬는 쪽이 이 사람에게는 더 실질적인 전략이 됩니다.`
      );
    }
  }

  return { heading: "⑤ 다음 전환점", body };
}

// ────────────────────────────────────────────────────────────────
// ⑥ 전환기에 나타날 수 있는 현실의 변화
// ────────────────────────────────────────────────────────────────

/** ⑧ 전용 — CATEGORY_MOMENT(변화 체감)·PATTERN_MOMENT(반복 장면)와 겹치지
 * 않도록, "선택의 순간" 자체에 초점을 맞춘 세 번째 독립 뱅크. */
const SELECTION_MOMENT: Record<SipseongCategory, string> = {
  비겁: "예를 들어 여러 사람의 의견이 갈리는 순간, 결국 마지막에는 스스로 판단해서 정하는 쪽을 선택하는 것이 이 사람에게는 더 편안한 길이 됩니다.",
  식상: "예를 들어 마음에 걸리는 게 있을 때, 참고 넘어가기보다 어떤 방식으로든 꺼내서 표현하는 쪽을 선택하는 것이 이 사람에게는 더 편안한 길이 됩니다.",
  재성: "예를 들어 여러 선택지 앞에서, 의미보다 실제로 손에 남는 것이 무엇인지를 먼저 따지는 쪽을 선택하는 것이 이 사람에게는 더 편안한 길이 됩니다.",
  관성: "예를 들어 하고 싶은 일과 맡은 책임이 부딪힐 때, 책임을 먼저 지키는 쪽을 선택하는 것이 이 사람에게는 더 편안한 길이 됩니다.",
  인성: "예를 들어 빠른 결정을 요구받는 순간에도, 충분히 이해할 시간을 스스로에게 먼저 주는 쪽을 선택하는 것이 이 사람에게는 더 편안한 길이 됩니다.",
};

const CATEGORY_MOMENT: Record<SipseongCategory, string> = {
  비겁: "예를 들어 예전 같으면 남의 의견을 먼저 물었을 상황에서도, 스스로 결정하고 밀어붙이는 쪽으로 마음이 먼저 움직이는 순간이 늘어날 수 있습니다. 함께하던 일도 내 몫과 남의 몫을 더 분명히 나누고 싶어질 수 있습니다.",
  식상: "예를 들어 속으로만 담아두던 생각을 밖으로 꺼내 표현하거나 벌여보는 쪽으로 마음이 먼저 움직이는 순간이 늘어날 수 있습니다. 가만히 있는 시간이 예전보다 답답하게 느껴질 수 있습니다.",
  재성: "예를 들어 의미나 명분보다 지금 손에 쥘 수 있는 실질적인 결과를 먼저 따지는 순간이 늘어날 수 있습니다. 돈과 관련된 결정을 내릴 때 이전보다 훨씬 신중해지거나, 반대로 훨씬 과감해질 수 있습니다.",
  관성: "예를 들어 하고 싶은 것보다 맡은 역할과 책임을 먼저 챙기는 쪽으로 마음이 움직이는 순간이 늘어날 수 있습니다. 소속이나 직함, 정해진 규칙이 예전보다 더 중요하게 느껴질 수 있습니다.",
  인성: "예를 들어 바로 움직이기보다 충분히 이해하고 납득한 뒤에야 마음이 놓이는 순간이 늘어날 수 있습니다. 배우거나 정리하는 데 쓰는 시간이 예전보다 자연스럽게 늘어날 수 있습니다.",
};

function buildRealWorldChangeSection(key: LifeFlowKey, balanceLabel: string): LifeTransitionInsightSection {
  const { phases, currentPhaseIndex, daYun } = key;
  const current = phases[currentPhaseIndex]?.category ?? null;
  const next = daYun.next?.ganCategory ?? null;

  if (!current || !next) {
    return {
      heading: "⑥ 전환기에 나타날 수 있는 현실의 변화",
      body: ["다음 대운 정보가 아직 없어, 어느 영역에서 변화 체감이 커질지는 지금 시점에서 특정하기 어렵습니다."],
    };
  }

  if (current === next) {
    return {
      heading: "⑥ 전환기에 나타날 수 있는 현실의 변화",
      body: [
        `다음 국면에서도 중심은 크게 바뀌지 않아, 새로운 영역이 갑자기 열리기보다 ${CATEGORY_DOMAIN[current]} 쪽이 지금보다 한 번 더 깊어지는 흐름에 가깝습니다.`,
        CATEGORY_MOMENT[current],
      ],
    };
  }

  const rising = CATEGORY_DOMAIN[next];
  const fading = CATEGORY_DOMAIN[current];
  const isConflict = ATTACKS[next] === current;

  const body = [`다음 국면에서는 ${rising} 쪽에서 변화 체감이 커지기 쉽습니다. 반대로 ${fading} 쪽은 지금까지보다 상대적으로 뒤로 물러날 수 있습니다.`];
  body.push(
    isConflict
      ? "다만 두 힘이 서로 다른 방향을 가리키는 관계라, 이 변화는 부드럽게 이어지기보다 한 번씩 결이 부딪히는 느낌으로 다가올 수 있습니다."
      : "두 힘이 서로 크게 부딪히는 관계는 아니라, 이 변화는 급격한 단절보다 자연스러운 무게 이동에 가깝게 느껴질 수 있습니다."
  );
  if (isConflict) {
    body.push(
      balanceLabel === "여유가 있는"
        ? "다만 이 사람은 감당하는 그릇 자체에 여유가 있는 편이라, 결이 부딪히는 순간에도 완전히 흔들리기보다 그때그때 조절하며 넘어갈 여지가 있습니다."
        : "게다가 지금 이 그릇은 다소 빠듯한 편이라, 이 부딪히는 순간을 혼자 다 감당하려 하기보다 주변에 미리 상황을 나눠두는 것이 실질적인 도움이 됩니다."
    );
  }
  body.push(CATEGORY_MOMENT[next]);
  return { heading: "⑥ 전환기에 나타날 수 있는 현실의 변화", body };
}

// ────────────────────────────────────────────────────────────────
// ⑦ 놓아야 하는 방식 / 가져가야 하는 힘
// ────────────────────────────────────────────────────────────────

function buildLetGoAndKeepSection(key: LifeFlowKey): LifeTransitionInsightSection {
  const { phases, currentPhaseIndex, natalAxis, daYun } = key;
  const current = phases[currentPhaseIndex]?.category ?? null;
  const next = daYun.next?.ganCategory ?? null;
  const body: string[] = [];

  // "짧은 결론 → 이유 → 가져갈 힘" 순서로 이 섹션만 다르게 연다(第六章
  // 몰입도 개선 QA #5, ④⑤와 다른 리듬) — natalAxis와 current가 실제로
  // 다른 사람에게만, 결론부터 압축한 한 문장을 얹는다.
  if (natalAxis && current && current !== natalAxis) {
    body.push(`짧게 말하면 — ${CATEGORY_ATTITUDE[natalAxis]}는 계속 가져가고, ${CATEGORY_ATTITUDE[current]}는 이제 서서히 내려놓을 때에 가깝습니다. 왜 그런지 하나씩 짚어보겠습니다.`);
  }

  if (natalAxis) {
    body.push(
      `타고난 중심축(${CATEGORY_JUDGMENT_BASIS[natalAxis]}을 기준으로 삼는 힘)만은 국면이 몇 번을 바뀌어도 그대로 가져가도 됩니다. 이건 특정 시기가 만들어준 방식이 아니라, 이 사람의 명식 전체가 기대는 뿌리이기 때문입니다.`
    );
  } else {
    body.push("이 사람은 어느 한 힘에 뿌리를 깊게 내리기보다, 여러 힘을 상황에 맞게 옮겨 쓰는 유연함 자체가 가져가야 할 자산에 가깝습니다.");
  }

  if (current && current !== natalAxis) {
    const conflictWithNext = next ? ATTACKS[next] === current : false;
    body.push(
      `그동안은 ${CATEGORY_JUDGMENT_BASIS[current]}을 기준으로 삼는 방식에 많이 기대왔습니다. 다만 이 방식은 타고난 중심축이 아니라 지금 국면이 요구했던 방식이었을 수 있습니다. ${
        conflictWithNext
          ? "다음 국면은 이 방식과 결이 부딪히는 쪽이라, 붙잡고 있을수록 오히려 무거워질 수 있습니다."
          : "다음 국면에서도 완전히 버릴 필요는 없지만, 이 방식만 붙잡고 있으면 새로운 흐름에 무게를 싣기 어려워질 수 있습니다."
      }`
    );
    body.push(
      `예를 들어 ${CATEGORY_ATTITUDE[current]}가 지금까지는 이 사람을 지켜준 힘이었다면, 다음 국면에서는 그 힘을 어디까지 쓰고 어디서부터 내려놓을지 스스로 가늠해보는 것이 실제로 도움이 됩니다.`
    );
  } else if (current === natalAxis) {
    body.push("지금 쓰고 있는 방식은 원래 이 사람의 중심축이라, 억지로 놓을 필요는 없습니다. 다만 다음 국면의 다른 힘과 어떻게 함께 쓸지를 새로 맞춰가는 것이 이번 전환의 실제 과제에 가깝습니다.");
  }

  return { heading: "⑦ 놓아야 하는 방식 / 가져가야 하는 힘", body };
}

// ────────────────────────────────────────────────────────────────
// ⑧ 앞으로의 나
// ────────────────────────────────────────────────────────────────

function buildForwardSelfSection(key: LifeFlowKey, yongsinWinners: SipseongCategory[]): LifeTransitionInsightSection {
  const { daYun, natalAxis } = key;
  const next = daYun.next?.ganCategory ?? null;
  const body: string[] = [];

  if (!next) {
    body.push("다음 대운 정보가 아직 없어, 이후 국면에서 무엇이 중요해질지는 지금 시점에서 단정하기 어렵습니다. 지금 흐름을 있는 그대로 이어가는 것이 가장 현실적입니다.");
    return { heading: "⑧ 앞으로의 나", body };
  }

  const attitude = CATEGORY_ATTITUDE[next];
  const axisNote = next === natalAxis ? " 이 힘이 원래 이 사람의 중심축과 같다는 것도, 그 선택이 낯설지 않게 느껴질 이유입니다." : "";
  const yongsinNote = yongsinWinners.includes(next) ? " 게다가 이 힘은 이 사람에게 원래 필요한 방향과도 같아서, 억지로 애쓰지 않아도 자연스럽게 몸에 붙을 가능성이 큽니다." : "";

  body.push(
    `다음 국면에서는 무엇을 더 많이 하느냐보다, ${attitude}로 선택하는 것 자체가 중요해집니다.${axisNote}${yongsinNote}`
  );
  body.push(SELECTION_MOMENT[next]);
  body.push("지금까지 다르게 살아왔다고 해서 이 방식이 이 사람과 안 맞는 것은 아닙니다 — 오히려 국면이 이렇게 자연스럽게 넘어가는 것 자체가, 이 사람의 명식이 이미 다음 결을 준비하고 있었다는 뜻에 가깝습니다.");
  body.push("앞서 살펴본 반복되던 패턴과, 지금 이 흐름을 감당하는 그릇의 여유까지 함께 고려하면 — 이 변화는 억지로 밀어붙일 일이 아니라, 이 사람 자신의 속도에 맞게 천천히 받아들이는 쪽이 훨씬 잘 맞습니다.");

  return { heading: "⑧ 앞으로의 나", body };
}

// ────────────────────────────────────────────────────────────────
// 조립
// ────────────────────────────────────────────────────────────────

export function generateLifeTransitionInsightNarrative(appData: AppData): LifeTransitionInsightResult {
  const name = appData.user.name;
  const key = buildLifeFlowKey(appData);
  const lifeFlow = buildLifeFlowNarrative(appData, key);
  const yongsin = analyzeYongsinCandidate(appData.user);
  const yongsinWinners = yongsin.applicable ? yongsin.winners : [];
  const balanceResult = analyzeDayMasterBalance(appData.user);
  const balanceLabel =
    balanceResult.balance === "clearlyStrong" || balanceResult.balance === "slightlyStrong" ? "여유가 있는" : "다소 빠듯한";

  const sections: LifeTransitionInsightSection[] = [
    buildPhaseCountSection(name, key, lifeFlow.killpoint),
    buildPastPhasesSection(lifeFlow.bigPictureLocked, key.currentPhaseIndex),
    buildRepeatingPatternSection(key),
    buildCurrentPositionSection(key, lifeFlow.daYunFlowLocked.current, balanceLabel),
    buildNextTransitionSection(key, lifeFlow.daYunFlowLocked.next, yongsinWinners),
    buildRealWorldChangeSection(key, balanceLabel),
    buildLetGoAndKeepSection(key),
    buildForwardSelfSection(key, yongsinWinners),
  ];

  return { sections };
}
