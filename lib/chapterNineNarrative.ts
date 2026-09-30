import { AppData } from "./sajuContent";
import { SajuUser } from "@/types";
import { analyzeDayMasterBalance, BalanceVerdict } from "./dayMasterBalanceAnalysis";
import { analyzeYongsinCandidate } from "./yongsinCandidateAnalysis";
import { analyzeHuisinCandidate } from "./huisinCandidateAnalysis";
import { analyzeCategoryStrength, SipseongCategory } from "./strengthAnalysis";
import { buildLifeFlowKey } from "./lifeFlowInterpretation";
import { analyzeWealthObstruction, ObstructionType } from "./wealthObstructionAnalysis";
import { analyzeWealthTiming } from "./wealthTimingAnalysis";
import { analyzeSpouseStar } from "./spouseStarAnalysis";
import { findSpousePalaceRelations } from "./spousePalaceRelations";
import { analyzeDaYunWealth, pickPastCurrentNext } from "./daYunWealthAnalysis";
import { buildSeunRange, NatalBranchInput, NatalStemInput } from "./seunAnalysis";
import { GwiinSinsalSection } from "./gwiinSinsalNarrative";

/**
 * 第九章 "종합" — CALCULATION+INTERPRETATION 조합 레이어(narrative 생성기).
 *
 * [2026-09 6차 개정] 5차 개정("4축을 전부 보여주는 구조")까지도 여전히
 * "여러 항목을 하나씩 설명하는 장"이었다는 지적을 받아, 구조 자체를
 * 완전히 바꿨다. 계산 엔진·1~8장·PDF/UI는 이번에도 전혀 건드리지 않는다.
 *
 * 이번 개정의 핵심:
 *  - 9장은 이제 "제목 한 줄 + 짧은 본문 하나"가 전부다. 여러 절을 보여주지
 *    않는다(sections는 비워둔다).
 *  - 뒤에서는 1~8장과 동일한 계산 자산을 전부 실행해 4개 축(center=명식
 *    구조/용신, wealth=재물, relation=배우자성·배우자궁, time=현재
 *    대운·전환)의 "강도 점수"를 매기고, 최고점 축 하나만 고른다
 *    (pickLeadAxis). 점수는 고정 우선순위가 아니라, 서로 다른 계산값이
 *    같은 카테고리를 가리킬 때(교차확인) 가산되는 방식이다.
 *  - 고른 축의 내용은 "완성 문장 뱅크"가 아니라 카테고리별 짧은 구
 *    (clause) 단위로 미리 써 둔 뒤, 고정된 7단계 스켈레톤(인정→양상→
 *    장점→부담→허용→구체적 허용→마무리)으로 조립한다. 이렇게 조립해야
 *    "이어붙인 티"가 나지 않고 하나의 글처럼 읽힌다(승인된 5인 샘플로
 *    검증됨).
 *  - 명리 용어(재성/비겁/식상/관성/인성/용신/희신/배우자궁/배우자성/
 *    신강/신약/대운/세운)는 고객 노출 문장에 절대 쓰지 않는다. 전부
 *    "선택"에만 쓰는 내부 근거다.
 *  - 나이·연도·사건 등 계산되지 않은 사실은 만들지 않는다.
 *
 * 계산 자산(전부 기존 함수 재사용, 계산식 무수정): analyzeDayMasterBalance /
 * analyzeCategoryStrength / analyzeYongsinCandidate / analyzeHuisinCandidate /
 * analyzeWealthObstruction / analyzeWealthTiming / analyzeSpouseStar /
 * findSpousePalaceRelations(+ analyzeDaYunWealth/buildSeunRange, 4장
 * loveTimingSignals.ts와 동일 패턴) / buildLifeFlowKey.
 * buildTenYearNarrative/gwiinSinsalSection은 이번 개정에서는 점수 계산의
 * 보조 신호로만 쓰고(하이라이트 연도 겹침 여부), 고객 문장에는 반영하지
 * 않는다(연도·사건을 노출하지 않기 위해).
 */

export interface ChapterNineSection {
  chapterLabel: string;
  title: string;
  intro: string;
  sections: { heading: string; body: string[] }[];
  closing: string;
}

type Bucket = "strong" | "neutral" | "weak" | "hold";
function bucketOf(balance: BalanceVerdict): Bucket {
  if (balance === "clearlyStrong" || balance === "slightlyStrong") return "strong";
  if (balance === "slightlyWeak" || balance === "clearlyWeak") return "weak";
  if (balance === "hold") return "hold";
  return "neutral";
}

const EXCESS_KEY_CATEGORY: Record<string, SipseongCategory> = {
  companion: "비겁", output: "식상", wealth: "재성", officer: "관성", resource: "인성",
};
function categoryFromFlag(flag: string): SipseongCategory | null {
  const key = flag.replace(/Excess$|Extreme$/, "");
  return EXCESS_KEY_CATEGORY[key] ?? null;
}

// ════════════════════════════════════════════════════════════════
// ① 카테고리별 구(clause) 뱅크 — 완성 문장이 아니라 조립 재료.
// 명리 용어를 쓰지 않고, 각 십성 카테고리의 실제 행동 패턴만 담는다.
// ════════════════════════════════════════════════════════════════

interface CategoryClauses {
  acknowledge: string; // "당신은 {acknowledge} 사람이에요."
  manifest: string; // "{manifest} 편이죠."
  strength: Record<Bucket, string>; // "그래서 {strength}"
  burden: Record<Bucket, string>; // "{burden}"
  closing: Record<Bucket, string>; // 마지막 한 줄
  title: Record<Bucket, string>;
}

const CENTER_BANK: Record<SipseongCategory, CategoryClauses> = {
  비겁: {
    acknowledge: "스스로 판단하고 결정하는",
    manifest: "남이 정해줄 때까지 기다리기보다, 마지막엔 자기 기준으로 결론을 내리는",
    strength: {
      strong: "남들이 망설이는 순간에도 먼저 치고 나갈 수 있어요",
      neutral: "흐름이 막힌 순간에 먼저 방향을 잡아주는 사람이지만",
      weak: "그런 마음이 분명히 있는 사람이지만",
      hold: "누구보다 먼저 방향을 잡고 밀고 나가는 힘이 있지만",
    },
    burden: {
      strong: "누가 강하게 반대해도 쉽게 흔들리지 않아요. 가끔은 고집처럼 보이기도 하고요.",
      neutral: "다만 그 결론이 늘 정답은 아닐 수 있다는 것도 잊지 마세요.",
      weak: "혼자 다 정하려다, 정작 도움이 필요한 순간을 놓치기도 해요.",
      hold: "남의 말이 거의 들어오지 않을 만큼 자기 확신이 강해지기도 해요.",
    },
    closing: {
      strong: "당신의 확신은 결국 제대로 힘을 발휘하게 됩니다.",
      neutral: "결국 당신은 당신다운 방식으로 돌아오게 될 거예요.",
      weak: "곁에서 지지해 줄 사람이 있다면, 그 확신은 더 든든해질 거예요.",
      hold: "그 확신을 어떻게 쓰느냐가, 다른 무엇보다 중요할 수 있어요.",
    },
    title: {
      strong: "당신의 확신은, 결국 제 힘을 냅니다",
      neutral: "당신다운 방식이, 결국 답이 됩니다",
      weak: "혼자가 아니어도, 당신의 판단은 힘이 있어요",
      hold: "그 확신을 어떻게 쓰느냐가 중요해요",
    },
  },
  식상: {
    acknowledge: "생각을 오래 붙들기보다 일단 꺼내 보이는",
    manifest: "말이나 행동으로 먼저 시도해 보고, 반응을 살피며 고쳐가는",
    strength: {
      strong: "막혀 있던 걸 먼저 뚫고 나가는 힘이 있어요",
      neutral: "막힌 순간을 먼저 움직여 풀어내는 사람이지만",
      weak: "그런 마음이 분명히 있는 사람이지만",
      hold: "표현하고 시도하는 힘이 누구보다 강하지만",
    },
    burden: {
      strong: "다만 충분히 다듬기 전에 꺼낸 말이나 행동이, 나중에 다시 손봐야 할 일로 돌아오기도 해요.",
      neutral: "가끔은 먼저 꺼낸 말이 나중에 다시 정리해야 할 일이 되기도 해요.",
      weak: "혼자 계속 밀어붙이기보다, 반응을 살피며 주변과 함께 다듬어 가는 편이에요.",
      hold: "그 힘이 억제되지 않고 계속 밖으로 뻗어 나가려는 편이에요.",
    },
    closing: {
      strong: "그 표현이 결국 당신의 힘이 되어줄 거예요.",
      neutral: "한 박자 쉬었다 꺼내는 습관만 더해도 충분해요.",
      weak: "함께 다듬어 가는 것도, 당신다운 방식이 될 수 있으니까요.",
      hold: "그 힘을 어디에 쓸지 정하는 것이 당신에게 중요해요.",
    },
    title: {
      strong: "그 표현이, 결국 힘이 되어줄 거예요",
      neutral: "먼저 움직이는 힘, 그대로도 괜찮아요",
      weak: "혼자보다 함께, 더 든든해요",
      hold: "그 힘을 어디에 쓸지가 중요해요",
    },
  },
  재성: {
    acknowledge: "실제로 남는 게 무엇인지부터 따지는",
    manifest: "계산이 서야 움직이고, 계산이 서지 않으면 아무리 좋아 보여도 발을 빼는",
    strength: {
      strong: "헛수고를 줄이고 실속을 챙기는 데는 강해요",
      neutral: "실속을 챙기는 데는 강하지만",
      weak: "그런 감각이 분명히 있는 사람이지만",
      hold: "실속을 따지는 판단이 거의 본능처럼 작동하지만",
    },
    burden: {
      strong: "계산이 서지 않으면 좋은 기회 앞에서도 오래 망설이게 돼요.",
      neutral: "가끔은 계산하다가 타이밍을 놓치기도 해요.",
      weak: "판단은 스스로 하되, 실행은 함께할 때 더 매끄러워요.",
      hold: "계산이 서지 않는 일에는 아예 눈길을 주지 않기도 해요.",
    },
    closing: {
      strong: "가끔은 계산이 다 서지 않아도, 한번 움직여보는 것도 괜찮아요.",
      neutral: "그 감각을 믿고 조금 더 움직여봐도 좋아요.",
      weak: "당신의 계산에 누군가의 손을 더하면, 더 멀리 갈 수 있어요.",
      hold: "완벽한 계산보다, 한 번의 결단이 필요한 순간도 있어요.",
    },
    title: {
      strong: "계산이 다 서지 않아도, 움직여도 돼요",
      neutral: "당신의 감각을, 조금 더 믿어보세요",
      weak: "계산은 혼자, 실행은 함께가 좋아요",
      hold: "완벽한 계산보다, 한 번의 결단이 필요해요",
    },
  },
  관성: {
    acknowledge: "맡은 일은 끝까지 책임지는",
    manifest: "기준이 분명하고, 정해진 몫은 반드시 해내려는",
    strength: {
      strong: "믿고 맡길 수 있는 사람이라는 인상을 줘요",
      neutral: "안전하게 지키는 데는 강하지만",
      weak: "그런 마음이 분명히 있는 사람이지만",
      hold: "기준과 책임에 대한 무게를 누구보다 무겁게 느끼지만",
    },
    burden: {
      strong: "다만 그 책임감 때문에 스스로를 너무 몰아붙이기도 해요.",
      neutral: "위험이 조금이라도 보이면 먼저 발을 빼는 편이라, 좋은 기회를 놓치기도 해요.",
      weak: "혼자 다 짊어지기보다, 나눠 질 사람이 있을 때 훨씬 수월해요.",
      hold: "그 무게가 스스로를 끊임없이 몰아붙이는 방식으로 나타나기도 해요.",
    },
    closing: {
      strong: "가끔은 그 책임을 조금 내려놓아도 괜찮아요.",
      neutral: "당신에게 필요한 건 더 큰 책임감이 아니라, 조금 내려놓는 용기일지도 몰라요.",
      weak: "누군가에게 나눠도 되고, 완벽하지 않아도 한번 움직여봐도 됩니다.",
      hold: "그 무게를 나누는 법을 찾는 것이 당신에게 중요해요.",
    },
    title: {
      strong: "가끔은, 조금 내려놓아도 괜찮아요",
      neutral: "그 책임, 조금은 나눠도 괜찮아요",
      weak: "혼자보다, 함께 나눠도 괜찮아요",
      hold: "그 무게를 나누는 법이 중요해요",
    },
  },
  인성: {
    acknowledge: "충분히 알아보고 이해한 뒤에야 움직이는",
    manifest: "누가 아무리 강하게 밀어붙여도, 스스로 납득이 안 되면 쉽게 따라가지 않는",
    strength: {
      strong: "그 덕분에 실수는 적고 신중하다는 인상을 줘요",
      neutral: "그 덕분에 실수는 적고 신중하다는 인상을 주지만",
      weak: "그런 신중함이 분명히 있는 사람이지만",
      hold: "이해와 확인에 대한 신중함이 누구보다 강하지만",
    },
    burden: {
      strong: "다만 이해가 끝날 때까지 기다리다가 좋은 기회를 놓치는 경우가 있어요.",
      neutral: "이해가 끝날 때까지 기다리다가 좋은 기회를 놓치는 경우가 있어요.",
      weak: "혼자 다 이해하려 하기보다, 곁에서 함께 확인해 줄 사람이 있으면 훨씬 빨라요.",
      hold: "좀처럼 움직이지 않으려는 방식으로 나타나기도 해요.",
    },
    closing: {
      strong: "가끔은 직접 해보면서 알게 되는 것도 있으니까요.",
      neutral: "지금 필요한 건 더 많은 확인이 아니라, 어느 정도 알아봤다면 움직여보는 용기예요.",
      weak: "완벽하게 이해되지 않아도 괜찮아요.",
      hold: "생각은 충분해요. 이제 한 걸음만 필요해요.",
    },
    title: {
      strong: "그 신중함이, 결국 빛을 발해요",
      neutral: "충분히 알아봤다면, 이제 움직여도 괜찮아요",
      weak: "혼자 다 이해하지 않아도 괜찮아요",
      hold: "생각이 많아도, 당신다운 거예요",
    },
  },
};

// ════════════════════════════════════════════════════════════════
// ② 재물 방해구조 5종 — 부담·허용 슬롯만 재물 맥락으로 교체한다.
// 인정·양상은 그 구조의 근원 카테고리(EXCESS_KEY_CATEGORY)의 CENTER_BANK를
// 그대로 재사용한다(새 계산 아님, 이미 wealthObstructionAnalysis.ts가
// 계산해 둔 sourceFlag→카테고리 매핑을 그대로 따라간다).
// ════════════════════════════════════════════════════════════════

interface ObstructionClauses {
  burden: string;
  allow: string;
  concreteAllow: string;
  closing: string;
  title: string;
}

const WEALTH_BANK: Record<ObstructionType, ObstructionClauses> = {
  과부하형: {
    burden: "다만 정작 그걸 손에 쥐고 지키는 데는 유난히 손이 많이 가는 편이에요.",
    allow: "버는 순간보다, 번 걸 지키는 순간에 조금 더 마음을 써 보세요.",
    concreteAllow: "무작정 더 벌리려 하기보다, 지금 가진 걸 지키는 습관부터 챙겨도 좋아요.",
    closing: "당신에게 필요한 건 더 큰 기회가 아니라, 지키는 습관일지도 몰라요.",
    title: "버는 것보다, 지키는 게 먼저예요",
  },
  분산형: {
    burden: "다만 가진 걸 나누고 함께 쓰는 데 익숙해서, 정작 내 몫을 따로 떼어 지키는 습관은 잘 안 붙어요.",
    allow: "나누는 마음은 그대로 두되, 그 전에 내 몫부터 먼저 떼어두는 습관을 만들어 보세요.",
    concreteAllow: "다 나눠도 괜찮지만, 그 전에 한 번은 나를 위해 남겨두는 것도 필요해요.",
    closing: "나누는 마음이 나쁜 게 아니라, 순서만 조금 바꾸면 돼요.",
    title: "나누기 전에, 내 몫부터 챙기세요",
  },
  소모형: {
    burden: "다만 새로운 시도에 아낌이 없는 만큼, 남는 걸 따로 모아 두는 습관은 잘 붙지 않아요.",
    allow: "쓰는 속도를 조금만 늦추면, 남는 게 훨씬 커질 수 있어요.",
    concreteAllow: "다 쓰지 말고, 일부는 그대로 남겨두는 연습을 해보세요.",
    closing: "당신에게 필요한 건 아끼는 마음이 아니라, 남겨두는 습관이에요.",
    title: "쌓아두는 연습도, 필요해요",
  },
  제동형: {
    burden: "다만 이해가 끝날 때까지 기다리다가, 결정이 필요한 순간 다른 사람이 먼저 움직이는 걸 보게 되기도 해요.",
    allow: "지금 필요한 건 더 많은 확인이 아니라, 어느 정도 알아봤다면 움직여보는 용기예요.",
    concreteAllow: "완벽하게 이해되지 않아도, 충분히 알아봤다면 한번 움직여봐도 괜찮아요.",
    closing: "생각은 충분해요. 이제 한 걸음만 있으면 됩니다.",
    title: "생각은 충분해요, 이제 한 걸음만",
  },
  압박형: {
    burden: "다만 새로운 기회가 와도, 위험이 조금이라도 보이면 먼저 발을 빼는 편이라 좋은 기회를 놓치기도 해요.",
    allow: "그 책임을 혼자 다 짊어지려 하지 않아도 괜찮은 시기예요.",
    concreteAllow: "누군가에게 나눠도 되고, 완벽하지 않아도 한번 움직여봐도 됩니다.",
    closing: "당신에게 필요한 건 더 큰 책임감이 아니라, 조금 내려놓는 용기일지도 몰라요.",
    title: "다 짊어지지 않아도, 괜찮아요",
  },
};

// ════════════════════════════════════════════════════════════════
// 메인 빌더에서 쓰는 계산 컨텍스트
// ════════════════════════════════════════════════════════════════

interface Ctx {
  name: string;
  balance: ReturnType<typeof analyzeDayMasterBalance>;
  strength: ReturnType<typeof analyzeCategoryStrength>;
  centerCat: SipseongCategory;
  yongsin: ReturnType<typeof analyzeYongsinCandidate>;
  huisin: ReturnType<typeof analyzeHuisinCandidate>;
  obstruction: ReturnType<typeof analyzeWealthObstruction>;
  timing: ReturnType<typeof analyzeWealthTiming>;
  spouse: ReturnType<typeof analyzeSpouseStar>;
  palace: ReturnType<typeof findSpousePalaceRelations>;
  flow: ReturnType<typeof buildLifeFlowKey>;
  currentAge: number;
}

type Axis = "center" | "wealth" | "relation" | "time";

// ════════════════════════════════════════════════════════════════
// ③ 축별 점수 — 고정 우선순위가 아니라, 여러 계산값이 같은 카테고리를
// 가리킬 때(교차확인) 가산되는 점수제.
// ════════════════════════════════════════════════════════════════

function scoreCenter(ctx: Ctx): number {
  const { balance, strength } = ctx;
  let s = 0;
  if (balance.balance === "hold") s += 3;
  else if (balance.balance === "clearlyStrong" || balance.balance === "clearlyWeak") s += 2;
  else if (balance.balance === "slightlyStrong" || balance.balance === "slightlyWeak") s += 1;
  if (balance.structureFlags.some((f) => f.endsWith("Extreme"))) s += 2;
  else if (balance.structureFlags.some((f) => f.endsWith("Excess"))) s += 1;
  if (strength.tier === "A") s += 1;
  else if (strength.tier === "B") s += 0.5;
  return s;
}

function scoreWealth(ctx: Ctx): number {
  const { obstruction, timing } = ctx;
  let s = 0;
  if (obstruction.severityLabel === "복합/중첩 방해축") s += 3;
  else if (obstruction.severityLabel === "단일 방해축") s += 2;
  if (obstruction.structuralObstructions[0]?.blocksSupport) s += 1;
  if (timing.applicable && timing.currentDaYun) {
    const label = timing.currentDaYun.classification.label;
    if (label === "강화형(A)" || label === "부담형(B)") s += 1;
  }
  return s;
}

function scoreRelation(ctx: Ctx): number {
  const { spouse, palace } = ctx;
  let s = 0;
  if (spouse.isDayBranch) s += 3;
  if (spouse.yongsinRelation.isWinner) s += 1;
  if (palace.daYun.some((d) => d.period.state === "current")) s += 1;
  if (spouse.exposure === "미미") s -= 1;
  return s;
}

function scoreTime(ctx: Ctx): number {
  const { flow, currentAge } = ctx;
  let s = 0;
  const phase = flow.phases[flow.currentPhaseIndex];
  if (phase && !phase.isNatalAxis) s += 1;
  const nextPhase = flow.phases[flow.currentPhaseIndex + 1];
  if (nextPhase?.isNatalAxis) s += 1;
  if (flow.nextPhaseTransitionAge !== null) {
    const yearsLeft = flow.nextPhaseTransitionAge - currentAge;
    if (yearsLeft >= 0 && yearsLeft <= 6) s += 1;
  }
  return s;
}

// 교차확인 보너스 — 서로 다른 계산값이 같은 카테고리를 가리킬 때 가산.
function crossConfirmBonus(ctx: Ctx, scores: Record<Axis, number>) {
  const { balance, obstruction, huisin, spouse, yongsin, centerCat } = ctx;
  const excessFlag = balance.structureFlags.find((f) => f.endsWith("Excess") || f.endsWith("Extreme"));
  const centerExcessCat = excessFlag ? categoryFromFlag(excessFlag) : null;
  const wealthCat = obstruction.structuralObstructions[0] ? categoryFromFlag(obstruction.structuralObstructions[0].sourceFlag) : null;

  if (centerExcessCat && wealthCat && centerExcessCat === wealthCat) {
    scores.wealth += 2;
    scores.center += 1;
  }
  if (huisin.applicable) {
    const blocked = huisin.pairs.find((p) => p.hardBlocked);
    if (blocked && centerExcessCat && blocked.category === centerExcessCat) {
      scores.center += 1;
    }
  }
  if (spouse.targetCategory === centerCat || (yongsin.applicable && yongsin.winners.includes(spouse.targetCategory))) {
    scores.relation += 1;
  }
}

// 주축(lead) + 2차축(second)을 함께 돌려준다. 같은 주축·같은 카테고리·같은
// 버킷을 받은 사람들(예: center×비겁×strong)이 본문 대부분을 그대로 공유하는
// 문제가 있었는데, 2차축은 "주축만큼 강하지는 않지만 이 사람에게 실제로 존재
// 하는 두 번째 신호"이므로 이걸로 본문 분기를 걸면 사람마다 실제 계산값 차이가
// 반영된다. Math.random 등 비결정적 요소는 전혀 쓰지 않는다 — 오직 이미 계산된
// 값들의 점수 비교로만 결정되므로 같은 사람은 항상 같은 결과가 나온다.
function pickAxes(ctx: Ctx): { lead: Axis; second: Axis | null; scores: Record<Axis, number> } {
  const scores: Record<Axis, number> = {
    center: scoreCenter(ctx),
    wealth: scoreWealth(ctx),
    relation: scoreRelation(ctx),
    time: scoreTime(ctx),
  };
  crossConfirmBonus(ctx, scores);

  const max = Math.max(scores.center, scores.wealth, scores.relation, scores.time);
  let lead: Axis;
  if (max < 2) {
    lead = "center"; // fallback: 전부 낮으면 center로 강제(중심축은 항상 존재하는 계산값)
  } else {
    const order: Axis[] = ["wealth", "relation", "center", "time"]; // 동점 타이브레이크 전용
    lead = order.find((a) => scores[a] === max) ?? "center";
  }

  // 2차축: 주축을 제외한 나머지 중 점수가 가장 높은 축. 신호가 거의 없는데도
  // (0점) 억지로 2차축을 붙이면 사실무근한 문장이 나올 수 있으므로 최소 1점
  // 이상일 때만 채택한다.
  const rest: Axis[] = (["center", "wealth", "relation", "time"] as Axis[]).filter((a) => a !== lead);
  const secondOrder: Axis[] = ["wealth", "relation", "time", "center"];
  const secondMax = Math.max(...rest.map((a) => scores[a]));
  const second = secondMax >= 1 ? secondOrder.find((a) => rest.includes(a) && scores[a] === secondMax) ?? null : null;

  return { lead, second: second ?? null, scores };
}

// ════════════════════════════════════════════════════════════════
// ④ 7단계 스켈레톤 조립 — 인정→양상→장점→부담→허용→구체적 허용→마무리
// ════════════════════════════════════════════════════════════════

// 보조 성향 문장 — lead axis·centerCat·bucket이 모두 같은 사람끼리도(예:
// center×비겁×strong) "두 번째로 강한 기질이 무엇인지"(strength.second)와
// "그 격차가 얼마나 큰지"(strength.tier: A=압도·B=우세·C=균형)는 사람마다
// 실제로 다르다. 이미 계산되어 있는 이 두 값으로 진짜 개인차를 반영하는
// 문장을 만든다 — 새 명리 계산은 전혀 추가하지 않는다.
function secondaryTraitLine(ctx: Ctx): string | null {
  const { second, tier } = ctx.strength;
  if (!second || !tier) return null;
  const secondBank = CENTER_BANK[second.category];
  if (tier === "A") {
    return `${secondBank.acknowledge} 면도 없지 않지만, 지금 말한 성향이 워낙 압도적이라 웬만해서는 잘 흔들리지 않는 편이에요.`;
  }
  if (tier === "B") {
    return `그러면서 ${secondBank.acknowledge} 면도 함께 있어서, 상황에 따라 두 가지 모습이 같이 드러나요.`;
  }
  return `사실 ${secondBank.acknowledge} 면도 거의 비슷한 무게로 자리잡고 있어서, 그때그때 다른 모습이 나올 수 있어요.`;
}

// 마무리 문장 보강 — 같은 축·같은 카테고리·같은 버킷이어도(예: F/O 둘 다
// relation×인성×strong) 마무리 문장이 완전히 같은 문자열이 되는 경우가
// 있었다. strength.tier(격차 크기)로 마무리 끝에 한 소절을 덧붙여, 그
// 사람의 실제 계산값 차이가 마지막 문장까지 반영되게 한다.
function tierClosingSuffix(tier: "A" | "B" | "C" | null): string {
  if (tier === "A") return " 그런 확고함은 쉽게 흔들리지 않을 거예요.";
  if (tier === "C") return " 여러 면이 함께 있는 것, 그 자체가 당신다운 거예요.";
  return " 다만 상황에 따라 다른 면이 함께 드러날 수 있어요.";
}

function assembleCenter(ctx: Ctx, second: Axis | null): { title: string; sentences: string[] } {
  const bank = CENTER_BANK[ctx.centerCat];
  const bucket = bucketOf(ctx.balance.balance);
  const sentences = [
    `당신은 ${bank.acknowledge} 사람이에요.`,
    `${bank.manifest} 편이죠.`,
    `그래서 ${bank.strength[bucket]}.`,
    bank.burden[bucket],
  ];
  const trait = secondaryTraitLine(ctx);
  if (trait) sentences.push(trait);

  // 마무리 분기 — 같은 centerCat×bucket이어도 이 사람에게 실제로 존재하는
  // 2차 신호(2차축)에 따라 뒷부분을 다르게 채운다. 2차축이 없으면 기존처럼
  // centerCat 자체의 기본 마무리를 쓴다.
  const phase = ctx.flow.phases[ctx.flow.currentPhaseIndex];
  const hasPhaseShift = Boolean(phase && !phase.isNatalAxis && phase.category && phase.category !== ctx.centerCat);

  if (second === "time" && hasPhaseShift) {
    const nowCat = CENTER_BANK[phase!.category!];
    sentences.push(`그런데 요즘은 그 방식이 예전만큼 편하지 않고, 지금은 ${nowCat.acknowledge} 쪽이 더 필요한 시기거든요.`);
    sentences.push(`낯설게 느껴져도 이상한 게 아니에요. 원래 당신의 방식과 결이 다르기 때문이에요.`);
    const yearsLeft = ctx.flow.nextPhaseTransitionAge !== null ? ctx.flow.nextPhaseTransitionAge - ctx.currentAge : null;
    const urgencyLine =
      yearsLeft !== null && yearsLeft <= 3
        ? `이 시기는 생각보다 금방 지나갑니다. 다시 ${bank.acknowledge} 쪽이 편해지는 때가 머지않아요.`
        : `이 시기가 지나면, 다시 ${bank.acknowledge} 쪽이 편해지는 때가 옵니다. 그때까지는 ${nowCat.acknowledge} 감각도 함께 지니고 가게 될 거예요.`;
    sentences.push(urgencyLine + tierClosingSuffix(ctx.strength.tier));
  } else if (second === "wealth" && ctx.obstruction.structuralObstructions[0]) {
    const w = WEALTH_BANK[ctx.obstruction.structuralObstructions[0].type];
    sentences.push(w.burden);
    sentences.push(w.closing + tierClosingSuffix(ctx.strength.tier));
  } else if (second === "relation") {
    const rel = RELATION_BANK[ctx.centerCat];
    sentences.push(rel.mid);
    sentences.push(rel.closing + tierClosingSuffix(ctx.strength.tier));
  } else {
    sentences.push(bank.closing[bucket] + tierClosingSuffix(ctx.strength.tier));
  }

  return { title: bank.title[bucket], sentences };
}

function assembleWealth(ctx: Ctx): { title: string; sentences: string[] } {
  const first = ctx.obstruction.structuralObstructions[0];
  const cat = categoryFromFlag(first.sourceFlag) ?? ctx.centerCat;
  const centerBank = CENTER_BANK[cat];
  const wealthBank = WEALTH_BANK[first.type];
  const bucket = bucketOf(ctx.balance.balance);

  const sentences = [
    `당신은 ${centerBank.acknowledge} 사람이에요.`,
    `${centerBank.manifest} 편이죠.`,
    `그래서 ${centerBank.strength[bucket]}.`,
  ];
  const trait = secondaryTraitLine(ctx);
  if (trait) sentences.push(trait);
  sentences.push(wealthBank.burden, wealthBank.allow, wealthBank.concreteAllow);
  sentences.push(wealthBank.closing + tierClosingSuffix(ctx.strength.tier));

  return { title: wealthBank.title, sentences };
}

// 관계축 보조 뱅크 — centerCat 없이는 title/closing이 전원 동일 문자열이
// 되는 문제가 발견되어(22명 중 6명이 isDayBranch=true, 그 6명이 title·
// closing 100% 동일) 추가했다. 중심축 카테고리로 "가까운 사람과 있을 때
// 구체적으로 무엇이 달라지는지"까지 다르게 쓴다.
const RELATION_BANK: Record<SipseongCategory, { mid: string; title: string; closing: string }> = {
  비겁: {
    mid: "곁에 있는 사람은 당신의 확신을 가장 먼저 믿어주는 사람이기도 해요.",
    title: "결국, 당신을 알아보는 건 가까운 사람이에요",
    closing: "그 사람과 함께라면, 당신의 판단은 더 단단해질 거예요.",
  },
  식상: {
    mid: "곁에 있는 사람 앞에서는 표현도 훨씬 편하게 흘러나오는 편이고요.",
    title: "가까운 사람 앞에서, 가장 당신다워져요",
    closing: "그 사람과 나누는 대화가, 결국 당신에게 힘이 될 거예요.",
  },
  재성: {
    mid: "곁에 있는 사람과는 계산 없이도 마음이 놓이는 편이고요.",
    title: "결국, 함께 가는 사람이 답이에요",
    closing: "그 사람과 함께라면, 계산하지 않아도 괜찮은 순간이 늘어날 거예요.",
  },
  관성: {
    mid: "곁에 있는 사람에게는 혼자 짊어지던 것도 조금 내려놓게 되는 편이고요.",
    title: "곁에 있는 사람과, 함께 나눠도 괜찮아요",
    closing: "그 사람과 나누면, 짊어진 것도 한결 가벼워질 거예요.",
  },
  인성: {
    mid: "곁에 있는 사람 앞에서는 설명하지 않아도 이해받는 편안함을 느끼는 편이고요.",
    title: "결국, 이해해주는 사람이 힘이 돼요",
    closing: "그 사람과 함께라면, 확인 없이도 마음 놓을 수 있을 거예요.",
  },
};

function assembleRelation(ctx: Ctx): { title: string; sentences: string[] } {
  const bank = CENTER_BANK[ctx.centerCat];
  const rel = RELATION_BANK[ctx.centerCat];
  const exposureLine =
    ctx.spouse.exposure === "숨음"
      ? "평소엔 잘 안 보이다가, 가까워질수록 서서히 드러나는 편이고요."
      : "겉으로 보이는 모습과, 정말 가까운 사이에서 보이는 모습이 크게 다르지 않은 편이고요.";

  const sentences = [
    `당신은 평소엔 ${bank.acknowledge} 모습을 보이지만,`,
    `정말 당신다운 모습은 가까운 사람 앞에서 가장 선명하게 드러나요.`,
    exposureLine,
    rel.mid,
  ];
  const trait = secondaryTraitLine(ctx);
  if (trait) sentences.push(trait);
  if (ctx.spouse.yongsinRelation.isWinner) {
    sentences.push(`좋은 사람을 곁에 두면, 그 사람이 당신에게 꼭 필요한 힘을 채워주기도 해요.`);
  }
  sentences.push(rel.closing + tierClosingSuffix(ctx.strength.tier));

  return { title: rel.title, sentences };
}

// 시간축 제목 — 원래 고정 문자열 하나였으나, 원국 축이 같아도(같은 natalAxis)
// 대운상 지금 강해진 기질(nowCat)이나 원래 기질의 압도 정도(tier)는 사람마다
// 다르므로 그 조합으로 제목을 가른다.
const TIME_TITLE_BY_TIER: Record<"A" | "B" | "C", string> = {
  A: "지금은 낯설어도, 원래의 나는 그대로예요",
  B: "지금은 낯설어도, 곧 익숙해질 거예요",
  C: "지금 이 낯섦도, 결국 당신의 일부예요",
};

function assembleTime(ctx: Ctx): { title: string; sentences: string[] } {
  const phase = ctx.flow.phases[ctx.flow.currentPhaseIndex];
  const nowCat = phase?.category ? CENTER_BANK[phase.category] : null;
  const natalCat = ctx.centerCat ? CENTER_BANK[ctx.centerCat] : null;
  const bucket = bucketOf(ctx.balance.balance);

  const sentences: string[] = [];
  if (nowCat && natalCat) {
    sentences.push(`요즘 당신은 평소와 다르게, ${nowCat.acknowledge} 태도가 강해졌을 수 있어요.`);
    sentences.push(`원래는 ${natalCat.acknowledge} 쪽이 더 편했을 텐데, 그래서 평소엔 ${natalCat.strength[bucket]}.`);
    sentences.push(`지금은 다른 방식이 필요한 시기라 그래요.`);
  } else {
    sentences.push(`요즘 당신은 평소와는 조금 다른 방식으로 움직이고 있을 수 있어요.`);
  }
  const trait = secondaryTraitLine(ctx);
  if (trait) sentences.push(trait);
  sentences.push(`낯설게 느껴져도 이상한 게 아니에요.`);
  const yearsLeft = ctx.flow.nextPhaseTransitionAge !== null ? ctx.flow.nextPhaseTransitionAge - ctx.currentAge : null;
  sentences.push(
    yearsLeft !== null && yearsLeft <= 3
      ? `이 시기는 생각보다 금방 지나가고, 다시 원래 편한 방식으로 돌아오는 때가 머지않아요.`
      : `이 시기가 지나면, 다시 원래 편한 방식으로 돌아오는 때가 옵니다.`
  );
  sentences.push(`그러니 지금은 억지로 다 맞추려 하지 말고, 낯선 방식도 한번 받아들여보세요.`);
  sentences.push(`결국 당신은 당신다운 방식으로 돌아오게 될 거예요.` + tierClosingSuffix(ctx.strength.tier));

  const title = ctx.strength.tier ? TIME_TITLE_BY_TIER[ctx.strength.tier] : TIME_TITLE_BY_TIER.B;
  return { title, sentences };
}

// ════════════════════════════════════════════════════════════════
// 메인 빌더
// ════════════════════════════════════════════════════════════════

export function buildChapterNineSection(
  appData: AppData,
  gender: "male" | "female",
  _gwiin: GwiinSinsalSection | undefined
): ChapterNineSection {
  const ctx = buildCtx(appData, gender);

  const { lead, second } = pickAxes(ctx);
  const assembled =
    lead === "wealth" ? assembleWealth(ctx) :
    lead === "relation" ? assembleRelation(ctx) :
    lead === "time" ? assembleTime(ctx) :
    assembleCenter(ctx, second);

  const body = assembled.sentences.filter(Boolean);
  const intro = body.slice(0, -1).join(" ");
  const closing = body[body.length - 1] ?? "";

  return {
    chapterLabel: "第九章",
    title: assembled.title,
    intro,
    sections: [],
    closing,
  };
}

// 계산 컨텍스트 구성 — buildChapterNineSection과 디버그/검증용 exportedhelper가
// 함께 쓴다(1~8장 계산 함수는 전혀 건드리지 않고 그대로 호출만 한다).
function buildCtx(appData: AppData, gender: "male" | "female"): Ctx {
  const user: SajuUser = appData.user;
  const name = user.name;
  const dayGan = user.pillars.day.hanja;

  const balance = analyzeDayMasterBalance(user);
  const strength = analyzeCategoryStrength(user);
  const yongsin = analyzeYongsinCandidate(user);
  const huisin = analyzeHuisinCandidate(user);
  const flow = buildLifeFlowKey(appData);
  const obstruction = analyzeWealthObstruction(appData);
  const timing = analyzeWealthTiming(appData);
  const spouse = analyzeSpouseStar(user, gender);

  const rawPeriods = analyzeDaYunWealth(dayGan, appData.fortuneTimelineNodes);
  const { current, next } = pickPastCurrentNext(rawPeriods);
  const targetPeriod = current ?? next;
  const natalBranches: NatalBranchInput[] = [
    { stage: "year", zhi: user.pillars.branches.year.hanja },
    { stage: "month", zhi: user.pillars.branches.month.hanja },
    { stage: "day", zhi: user.pillars.branches.day.hanja },
    ...(user.pillars.branches.hour ? [{ stage: "hour" as const, zhi: user.pillars.branches.hour.hanja }] : []),
  ];
  const natalStems: NatalStemInput[] = [
    { stage: "year", gan: user.pillars.year.hanja },
    { stage: "month", gan: user.pillars.month.hanja },
    { stage: "day", gan: user.pillars.day.hanja },
    ...(user.pillars.hour ? [{ stage: "hour" as const, gan: user.pillars.hour.hanja }] : []),
  ];
  const seunKeysForPalace = targetPeriod
    ? buildSeunRange(dayGan, new Date().getFullYear(), new Date().getFullYear() + 4, natalBranches, { ganZhi: targetPeriod.ganZhi, ganSipseong: targetPeriod.ganSipseong }, natalStems)
    : [];
  const palace = findSpousePalaceRelations(user.pillars.branches.day.hanja, rawPeriods, seunKeysForPalace);

  const centerCat: SipseongCategory = strength.top?.category ?? flow.natalAxis ?? "관성";
  const currentAge = new Date().getFullYear() - appData.birthYear + 1;

  return {
    name, balance, strength, centerCat, yongsin, huisin, obstruction, timing,
    spouse, palace, flow, currentAge,
  };
}

// 검증/디버그 전용 — 운영 코드(buildChapterNineSection)는 쓰지 않는다.
// 22명 회귀검증 스크립트가 lead/second axis, centerCat, bucket을 직접
// 확인할 수 있도록 내부 선택 결과를 노출한다.
export function debugChapterNineAxes(appData: AppData, gender: "male" | "female") {
  const ctx = buildCtx(appData, gender);
  const { lead, second, scores } = pickAxes(ctx);
  return {
    lead,
    second,
    scores,
    centerCat: ctx.centerCat,
    bucket: bucketOf(ctx.balance.balance),
  };
}
