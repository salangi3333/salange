import { AppData } from "./sajuContent";
import { buildLifeFlowKey } from "./lifeFlowInterpretation";
import { DaYunWealthPeriod } from "./daYunWealthAnalysis";
import { buildSeunKey, SeunKey, NatalBranchInput, NatalStemInput, Stage } from "./seunAnalysis";
import { SipseongCategory } from "./strengthAnalysis";

/**
 * 유료 제4장 "앞으로의 10년" 전용 NARRATIVE 레이어.
 *
 * 계산 구조(승인·동결, 재작성 금지 대상)는 그대로다:
 *  - buildLifeFlowKey(lifeFlowInterpretation.ts) → periods(원본 대운 배열)
 *  - buildSeunKey(seunAnalysis.ts) → 연도별 세운 + 원국·"그 시점 대운"과의
 *    육합·육충·천간합·자형
 *  - findCoveringPeriod로 나이→대운을 찾아 매년 올바른 대운을 buildSeunKey에
 *    넘기는 것(대운+세운 결합)
 *  - 세운 카테고리 vs 그 시점 대운 카테고리의 관계(같음/충돌)
 *  - 대운 경계 기준 구간 분할, 신호 강도 점수 기반 하이라이트 선택
 *
 * 이번 개정에서 바뀐 것은 오직 "번역" 레이어다 — 위 계산값을 그대로 두고,
 * 그 결과를 계산 근거 → 현실에서 나타나는 모습 → 마음에서 느껴지는 것 →
 * 선택/행동의 변화 → 활용법이 하나의 자연스러운 문단으로 읽히도록 다시
 * 썼다. 실제 사건(결혼/이직/사고 등)은 여전히 만들지 않는다 — 계산으로
 * 설명 가능한 행동·심리 패턴까지만 표현한다.
 */

export type LifeAreaLabel =
  | "돈과 일"
  | "관계와 인연"
  | "표현과 활동"
  | "책임과 압박"
  | "배움과 준비"
  | "변화와 선택"
  | "안정과 정리";

export interface TenYearItem {
  year: number;
  age: number;
  ganZhiHanja: string;
  ganZhiHangul: string;
  coreSignal: string;
  area: LifeAreaLabel;
  narrative: string;
  isTransitionYear: boolean;
  /** 화면에 노출하지 않는 근거 추적용 — 어떤 세운 십성/관계 신호로 이
   * 문단이 조립됐는지. UI는 이 필드를 읽지 않는다. */
  sourceNote: string;
  /** scoreYear()가 이미 계산해 온 "이 해에 겹치는 명리 신호(합·충·형·
   * 대운전환·대운일치)의 개수" 원값 그대로. 이 값 자체는 좋음/나쁨이
   * 아니라 신호 밀도이고, 계산 로직(scoreYear)은 이 필드를 추가하며
   * 전혀 건드리지 않았다 — 이미 있던 값을 표시 계층(reportMapper.ts)에
   * 전달하기 위해 항목에 실어 보내는 것뿐이다. reportMapper.ts에서
   * "이 사람의 10년 안에서"만 0~100으로 재배율(min-max)해 화면에 쓴다.
   * buildYearItem() 시점에는 아직 값이 없어(scoreYear는 항목 전체가
   * 조립된 뒤에야 호출됨) 선택적 필드로 두고, buildTenYearNarrative()
   * 마지막에 채워 넣는다 — scoreYear/buildSegments/buildHighlights의
   * 기존 시그니처(TenYearItem 그대로)는 전혀 바꾸지 않기 위한 선택이다. */
  rawScore?: number;
}

export interface TenYearSegment {
  startYear: number;
  endYear: number;
  category: SipseongCategory | null;
  ganSipseong: string | null;
  summary: string;
}

export interface TenYearHighlight {
  year: number;
  reason: string;
}

export interface TenYearContent {
  intro: string;
  segments: TenYearSegment[];
  items: TenYearItem[];
  highlights: TenYearHighlight[];
  closing: string;
}

// ────────────────────────────────────────────────────────────────
// 정확한 십성(10종) 기준 신호 뱅크. core는 "계산 근거 → 현실의 모습 →
// 마음에서 느껴지는 것 → 선택의 변화"를 소제목 없이 하나의 흐름으로 쓴
// 3문장, action은 활용법 1문장이다. 10천간 순환상 10년 안에 정확히
// 한 번씩만 등장하므로 이 표만으로도 한 사람의 10개 연도가 겹치지 않는다.
// ────────────────────────────────────────────────────────────────

const SIPSEONG_HANJA: Record<string, string> = {
  비견: "比肩", 겁재: "劫財", 식신: "食神", 상관: "傷官",
  편재: "偏財", 정재: "正財", 편관: "偏官", 정관: "正官",
  편인: "偏印", 정인: "正印",
};

interface YearSignalEntry {
  label: string;
  area: LifeAreaLabel;
  core: string;
  action: string;
}

// [2026-09 7장 서술 2차 개정] 10개 항목 전부 "○○하는 힘이 강해지는
// 해입니다" 오프닝 템플릿을 쓰던 걸, 계산 신호가 실제로 어떤 행동/선택
// 으로 나타나는지부터 말하는 문장으로 바꿨다. 각 항목의 문장 구조(첫
// 문장이 무엇으로 시작하는지)도 서로 다르게 썼다 — 10개가 나란히 와도
// 같은 틀로 안 읽히도록. 카테고리가 가리키는 실제 의미(계산)는 전혀
// 바꾸지 않았다.
const SEUN_SIGNAL: Record<string, YearSignalEntry> = {
  비견: {
    label: "스스로 정해서 움직이는 시기",
    area: "변화와 선택",
    core: "남의 의견을 먼저 구하고 확인받은 뒤에야 움직이던 습관에서 벗어나, 일단 내가 정한 대로 해보자는 마음이 먼저 올라옵니다. 결정을 남에게 미루지 않고 끝까지 내 손으로 끌고 가려는 쪽에 가깝습니다. 그만큼 밀어붙이는 힘은 세지지만, 의견을 구하는 절차를 건너뛰기도 쉬워집니다.",
    action: "다만 그 확신이 앞서는 만큼, 중요한 결정 하나 정도는 실행하기 전에 주변에 한 번 말해보는 편이 나중에 후회를 줄여줍니다.",
  },
  겁재: {
    label: "가진 걸 나누고 벌이는 시기",
    area: "돈과 일",
    core: "돈이든 시간이든 한곳에 붙잡아두기보다, 누군가와 나누거나 함께 벌이는 쪽으로 자꾸 움직이게 됩니다. 같이 하자는 제안이 들어오면 거절하기 유독 어렵게 느껴지고, 일단 함께 해보자는 마음이 먼저 듭니다. 다만 나중에 돌아보면 그 나눔이 실제로 무엇을 남겼는지 헷갈리는 경우가 잦아집니다.",
    action: "큰돈이 오가는 약속이나 동업 제안일수록, 이 해에는 한 박자 늦게 답해도 늦지 않습니다.",
  },
  식신: {
    label: "서두르지 않고 몰입하는 시기",
    area: "표현과 활동",
    core: "빨리 결과를 보여줘야 한다는 조급함보다, 지금 하고 있는 걸 계속 붙들고 있고 싶은 마음이 커집니다. 겉으로 티가 안 나도 크게 신경 쓰지 않고, 조용히 계속 이어가는 쪽을 택하기 쉽습니다. 제자리걸음처럼 느껴질 수 있지만, 실제로는 지금 붙들고 있는 일에 그만큼 깊이 들어가고 있는 중입니다.",
    action: "당장 티가 안 난다고 방향을 자주 바꾸기보다, 지금 하던 것을 한 번 더 밀어붙여 보는 편이 이 해와 잘 맞습니다.",
  },
  상관: {
    label: "마음을 밖으로 꺼내는 시기",
    area: "표현과 활동",
    core: "평소라면 그냥 넘어갔을 일에도 하고 싶은 말이 자꾸 생기고, 담아두면 오히려 더 답답하게 느껴집니다. 예전 방식이 갑갑하게 느껴지면서, 조금 다르게 해보고 싶다는 충동이 자주 올라옵니다. 안에 담아뒀던 생각이나 감정을 실제로 꺼내 보이는 쪽으로 움직이게 됩니다.",
    action: "다만 감정이 먼저 튀어나오는 만큼, 하고 싶은 말을 한 박자만 쉬었다 꺼내는 습관이 이 해에는 유독 도움이 됩니다.",
  },
  편재: {
    label: "새로운 판이 열리는 시기",
    area: "돈과 일",
    core: "새로운 제안이나 낯선 기회가 평소보다 자주 눈에 들어오고, 그냥 지나치기보다 직접 해볼 수 있는지를 따져보게 됩니다. 한곳에 머물기보다 판 자체를 넓히고 싶은 마음이 커지고, 움직이는 만큼 손에 들어오는 것도 늘어납니다. 다만 넓히는 만큼 나가는 것도 함께 커지는 시기입니다.",
    action: "기회가 늘어나는 해일수록 지출 계획을 먼저 세워두는 편이, 나중에 남는 게 없다는 느낌을 줄여줍니다.",
  },
  정재: {
    label: "지금 방식을 착실히 다지는 시기",
    area: "돈과 일",
    core: "한 번에 크게 벌이기보다, 지금까지 해온 방식을 그대로 이어가고 싶은 마음이 커집니다. 눈에 띄는 큰 결정을 미루고, 가진 것을 다지는 쪽으로 마음이 기울기 쉽습니다. 서두르지 않아도 꾸준히 쌓이는 쪽에 가깝습니다.",
    action: "당장 크게 벌리기보다 지금까지 쌓아온 것을 다지는 데 집중하면, 이 해를 가장 든든하게 보낼 수 있습니다.",
  },
  편관: {
    label: "갑작스러운 승부처가 많아지는 시기",
    area: "책임과 압박",
    core: "예상치 못한 자리나 부담스러운 상황이 한꺼번에 찾아오기 쉽고, 마음의 여유보다 긴장이 먼저 앞섭니다. 즉각 움직여야 하는 일이 늘면서 몸이 먼저 지치는 느낌을 받을 수 있습니다. 다만 그 압박을 한 번 넘기고 나면, 실력을 있는 그대로 인정받는 계기가 되기도 합니다.",
    action: "전부 한꺼번에 밀어붙이기보다, 급한 일부터 먼저 쳐내고 나머지는 하나씩 정리해가면 이 시기를 덜 지치게 넘길 수 있습니다.",
  },
  정관: {
    label: "맡은 자리를 제대로 해내야 하는 시기",
    area: "책임과 압박",
    core: "맡은 자리의 무게가 전보다 뚜렷하게 느껴지고, 이제는 제대로 해내야 한다는 마음이 자연스럽게 커집니다. 누가 시켜서라기보다, 스스로 그 역할을 인정받고 싶은 마음이 앞섭니다. 정해진 기준과 약속을 지키려는 쪽으로 움직이게 됩니다.",
    action: "책임이 커지는 만큼 전부 혼자 떠안기보다, 중요한 일부터 순서를 정해 하나씩 풀어가면 한결 든든하게 넘길 수 있습니다.",
  },
  편인: {
    label: "혼자 정리하는 시간이 필요한 시기",
    area: "배움과 준비",
    core: "사람들과 어울리기보다 혼자 생각을 정리하는 시간이 더 편하게 느껴지고, 새로운 분야를 파고들고 싶은 마음도 커집니다. 남다른 방식으로 받아들이고 정리하려는 쪽에 가깝고, 예전 같으면 신경 쓰였을 남의 시선도 상대적으로 덜 중요해집니다.",
    action: "혼자만의 시간을 가지는 것은 좋지만, 주변과의 연락까지 완전히 끊지는 않는 편이 균형을 지키는 데 도움이 됩니다.",
  },
  정인: {
    label: "잘 알아본 뒤 결정하는 시기",
    area: "배움과 준비",
    core: "혼자 판단해서 밀어붙이기보다, 잘 아는 사람의 말을 듣고 충분히 알아본 뒤 결정하는 일이 많아질 수 있습니다. 서두르기보다 배우고 이해하는 데 먼저 마음이 가고, 곁에 있는 사람이나 조언에 기대고 싶은 마음도 커집니다. 큰 결정일수록 한 번 더 확인하고 싶은 신중함이 앞섭니다.",
    action: "급하게 정하기보다 배우고 이해하는 데 시간을 들이면, 뒤늦게 후회할 일이 줄어듭니다.",
  },
};

/** 구간(①)·전환 서술(대운이 바뀔 때 "지난 시간" 쪽)에 쓰는 정확한
 * 십성(10종) 기준 표현 — 십성 뱅크(SEUN_SIGNAL)와 다른 결로, "몇 년에
 * 걸쳐 익숙해진 삶의 방식"을 가리키는 표현이다. */
const SEGMENT_SUMMARY: Record<string, { gains: string; prepare: string }> = {
  비견: { gains: "스스로 판단하며 나서는 힘", prepare: "혼자 결정하기 전에 주변과 확인하는 습관" },
  겁재: { gains: "가진 것을 나누고 움직이는 힘", prepare: "지출과 동업 관계를 신중하게 관리하는 습관" },
  식신: { gains: "차분히 결과를 쌓아가는 힘", prepare: "꾸준함을 유지하는 습관" },
  상관: { gains: "생각을 적극적으로 표현하는 힘", prepare: "표현한 것을 실제 결과로 이어가는 습관" },
  편재: { gains: "기회를 넓혀가며 판을 키우는 힘", prepare: "넓어지는 만큼 지출도 함께 관리하는 습관" },
  정재: { gains: "꾸준히 안정적으로 쌓아가는 힘", prepare: "지금까지 쌓아온 것을 다지는 습관" },
  편관: { gains: "상황에 맞서 즉각 움직이는 힘", prepare: "체력과 컨디션을 먼저 챙기는 습관" },
  정관: { gains: "맡은 역할과 책임을 지키는 힘", prepare: "우선순위를 정해 하나씩 처리하는 습관" },
  편인: { gains: "남다른 방식으로 정리하는 힘", prepare: "혼자만의 시간과 균형을 맞추는 습관" },
  정인: { gains: "받아들이고 신뢰를 쌓는 힘", prepare: "배우고 이해하는 데 시간을 들이는 습관" },
};

/** 카테고리 5축의 상호 극(剋) 관계 — wealthTimingAnalysis.ts의 ATTACKS와
 * 같은 명리 관계를 이 파일에도 독립적으로 둔다(그 파일을 건드리지 않기
 * 위한 선택). "세운이 그 시점 대운과 같은 성질인지/부딪히는 성질인지"를
 * 판정하는 데만 쓴다. */
const CATEGORY_ATTACKS: Record<SipseongCategory, SipseongCategory> = {
  인성: "식상", 비겁: "재성", 식상: "관성", 재성: "인성", 관성: "비겁",
};

function termDisplay(term: string): string {
  const hanja = SIPSEONG_HANJA[term];
  return hanja ? `${term}(${hanja})` : term;
}

/** ③ "특히 기억할 시기" 전용 — 세운 지지/천간이 원국·대운의 어느 기둥과
 * 관계를 맺었는지를 사람이 읽는 말로 바꾼다. 새 명리 관계가 아니라
 * SeunKey.natalRelations 등에 이미 있는 stage 값만 문구로 옮긴다. */
const STAGE_LABEL: Record<Stage, string> = {
  year: "태어난 해(년주)",
  month: "태어난 달(월주)",
  day: "태어난 날(일주)",
  hour: "태어난 시(시주)",
};

/** 세운 카테고리 vs "그 시점 대운" 카테고리의 관계. buildYearItem과
 * buildHighlights가 똑같은 판정을 각자 다시 계산하면 두 곳이 어긋날
 * 수 있어 하나로 합쳤다 — 새 계산이 아니라 기존 로직의 재사용이다. */
function computeDayunTier(sk: SeunKey): "같음" | "충돌" | null {
  if (!sk.seunGanCategory || !sk.currentDayunCategory) return null;
  if (sk.seunGanCategory === sk.currentDayunCategory) return "같음";
  if (
    CATEGORY_ATTACKS[sk.seunGanCategory] === sk.currentDayunCategory ||
    CATEGORY_ATTACKS[sk.currentDayunCategory] === sk.seunGanCategory
  ) {
    return "충돌";
  }
  return null;
}

// ────────────────────────────────────────────────────────────────
// 연도 × 대운 매핑 — 10년 사이 대운 경계를 정확히 반영하기 위한 유일한
// "새 조합" 로직(계산 자체는 없음, 이미 있는 periods를 나이로 찾을 뿐).
// ────────────────────────────────────────────────────────────────

function findCoveringPeriod(periods: DaYunWealthPeriod[], age: number): DaYunWealthPeriod | null {
  const exact = periods.find((p) => age >= p.startAge && age <= p.endAge);
  if (exact) return exact;
  if (periods.length === 0) return null;
  // 방어적 fallback — 아직 첫 대운 시작 전이거나(신생아) 이미 마지막
  // 대운을 넘어선 극단 케이스(계산된 대운 8개 범위 밖). 없는 대운을
  // 지어내지 않고, 가장 가까운 실제 대운으로 근사한다.
  if (age < periods[0].startAge) return periods[0];
  return periods[periods.length - 1];
}

// ────────────────────────────────────────────────────────────────
// ② 연도별 항목 조립
// ────────────────────────────────────────────────────────────────

/** [2026-09 7장 서술 개정] 한 해에 이미 계산되어 있는 관계 신호(합/충/
 * 천간합/자형 — natalRelations·dayunRelations·ganHeNatal·ganHeDayun·
 * selfPunishNatal·selfPunishDayun)를 "당겨지는 쪽(합·천간합)"과
 * "부딪히는 쪽(충·자형)"으로 나눠 센다. 새 계산이 아니라 SeunKey에 이미
 * 들어있는 값들의 개수를 세는 것뿐이다. buildHighlights(③)와
 * compoundingClause(②) 양쪽이 같은 기준을 공유한다. */
function countRelSignals(sk: SeunKey): { pulls: number; clashes: number } {
  const pulls =
    sk.natalRelations.filter((r) => r.type === "합").length +
    sk.dayunRelations.filter((r) => r.type === "합").length +
    sk.ganHeNatal.length + sk.ganHeDayun.length;
  const clashes =
    sk.natalRelations.filter((r) => r.type === "충").length +
    sk.dayunRelations.filter((r) => r.type === "충").length +
    sk.selfPunishNatal.length + sk.selfPunishDayun.length;
  return { pulls, clashes };
}

/** [2026-09 7장 서술 개정] 한 해에 관계 신호가 2개 이상 겹치는지를
 * "성격"(mixed/clash/pull)으로 나눈다. countRelSignals 값을 그대로
 * 분류하는 것뿐, 새 계산이 아니다. */
type CompoundCat = "mixed" | "clash" | "pull" | null;
function compoundCategory(sk: SeunKey): CompoundCat {
  const { pulls, clashes } = countRelSignals(sk);
  if (pulls + clashes < 2) return null;
  if (pulls > 0 && clashes > 0) return "mixed";
  if (clashes >= 2) return "clash";
  return "pull";
}

/** [2026-09 7장 서술 개정] 관계 신호가 2개 이상 겹치는 해에 본문 한
 * 문장을 더 붙인다. 이전엔 같은 성격(mixed/clash/pull)이 여러 해
 * 이어지면 완전히 같은 문장이 반복됐다 — 이번엔 "바로 앞 해"·"두 해
 * 전"과 성격이 같은지(prevCat/prevPrevCat, 이미 계산된 compoundCategory를
 * 순서대로 비교만 함)를 봐서, 처음 나타난 해는 "시작", 이어지는 해는
 * "계속", 세 해째부터는 "정리" 느낌으로 문장을 바꾼다. 특정 연도를
 * 고정하지 않고, 실제로 같은 성격이 몇 해 이어지는지에 따라 사람마다
 * 다르게 나온다. hasOccurredBefore는 "이전에 이어지지 않고 따로
 * 나타난 적이 있는지"만 보는 값으로, 연속은 아니지만 같은 성격이 두
 * 번째로 나타날 때 문장이 똑같아지는 것도 막는다(둘 다 이미 계산된
 * compoundCategory 순서를 비교만 하는 것뿐, 새 계산 아님). */
function compoundingClause(cat: CompoundCat, prevCat: CompoundCat, prevPrevCat: CompoundCat, hasOccurredBefore: boolean, streakLen: number): string | null {
  if (!cat) return null;
  const FIRST: Record<"mixed" | "clash" | "pull", string> = {
    mixed: "이런 해에는 한 가지에만 매달리기보다, 성격이 다른 몇 가지 일을 동시에 챙기는 쪽이 더 잘 맞습니다.",
    clash: "생각한 대로 순서가 잘 안 맞을 수 있어, 계획보다 한 박자 여유를 두고 움직이는 편이 낫습니다.",
    pull: "여러 가지가 동시에 맞아떨어지는 만큼, 망설이던 일이 있다면 이 시기에 실제로 진행해봐도 좋습니다.",
  };
  const AGAIN: Record<"mixed" | "clash" | "pull", string> = {
    mixed: "이 해에도 성격이 다른 일들이 겹치기 쉬우니, 순서를 정해두고 하나씩 처리하는 편이 낫습니다.",
    clash: "그 사이 이번에도 뜻대로 잘 안 풀리는 부분이 나타날 수 있어, 서두르지 않는 편이 낫습니다.",
    pull: "이번에도 여러 가지가 순조롭게 맞아떨어질 수 있어, 미뤄둔 일이 있다면 움직여볼 만합니다.",
  };
  // [2026-10-02 22명 회귀검증에서 발견·수정] "작년부터 이어지고 있어서"
  // (진행형 — 앞으로도 계속된다는 인상을 줄 수 있음)를 "작년에 이어
  // 올해도 ~했습니다/나타났습니다"(완료형 — 이미 확정된 두 해의 사실만
  // 말함)로 바꿨다. pull은 지난 라운드에 이미 같은 원칙으로 수정됨.
  const CONTINUE: Record<"mixed" | "clash" | "pull", string> = {
    mixed: "작년에 이어 올해도 여러 가지 일을 함께 챙기는 쪽으로 움직이는 편이 자연스럽습니다.",
    clash: "작년에 이어 올해도 이런 답답함이 나타났습니다. 조급해하지 않고 한 박자씩 늦추는 습관이 이번에도 필요합니다.",
    pull: "작년에 이어 올해도 여러 일이 순조롭게 맞아떨어졌습니다. 미뤄둔 일이 있다면 지금 움직여볼 만합니다.",
  };
  const SETTLE: Record<"mixed" | "clash" | "pull", string> = {
    mixed: "여러 가지를 함께 챙기던 시간도 이쯤에서 한 번 정리해 볼 때입니다.",
    clash: "여러 해 이어진 답답함도 이제 조금씩 가닥이 잡히기 시작할 수 있습니다.",
    pull: "그동안 순조롭게 맞아떨어지던 것들을 이제 눈에 보이는 결과로 확인하게 될 수 있습니다.",
  };
  if (cat === prevCat && cat === prevPrevCat) {
    // [2026-10-02 22명 회귀검증에서 발견·수정] 같은 카테고리가 4년차 이상
    // 연속되면 이 조건이 매년 다시 참이 되어 SETTLE 문장이 그대로 반복됐다.
    // streakLen(compoundCats만으로 결정론적으로 계산, 새 계산 아님)이
    // 정확히 3일 때(SETTLE에 처음 도달하는 해)만 문장을 내고, 4년차
    // 이상(같은 스트릭 안에서 이미 SETTLE을 말한 뒤)은 추가 문장을 내지
    // 않는다 — 대체 반복 문장도 만들지 않는다(승인된 설계).
    return streakLen === 3 ? SETTLE[cat] : null;
  }
  if (cat === prevCat) return CONTINUE[cat];
  if (hasOccurredBefore) return AGAIN[cat];
  return FIRST[cat];
}

function buildYearItem(
  year: number,
  age: number,
  period: DaYunWealthPeriod,
  prevPeriod: DaYunWealthPeriod | null,
  sk: SeunKey,
  natalAxis: SipseongCategory | null,
  // [7장 조사·최소수정 전용 추가] 직전 해의 dayunTier(이미 계산된 값,
  // computeDayunTier 재계산 아님 — buildTenYearNarrative에서 한 번 계산해
  // 전달만 한다). "같은 대운 관계가 바로 앞 해와 똑같이 이어지는지"만
  // 판단하는 데 쓴다 — 새 명리 판정이 아니라 이미 있는 값들의 순서 비교.
  prevDayunTier: "같음" | "충돌" | null,
  // [2026-09 7장 서술 개정] compoundingClause의 연속 판단용(바로 앞 해·
  // 두 해 전의 compoundCategory). buildTenYearNarrative에서 순서대로
  // 미리 계산해 전달만 한다 — 새 계산 아님.
  prevCompoundCat: CompoundCat,
  prevPrevCompoundCat: CompoundCat,
  // [2026-09 7장 서술 개정] 이 해의 compoundCategory가 연속은 아니어도
  // 이전 어느 해엔가 이미 나온 적 있는지(compoundingClause의 AGAIN
  // 분기용). buildTenYearNarrative에서 순서대로 미리 계산해 전달한다.
  compoundCatSeenBefore: boolean,
  // [2026-09 7장 서술 개정] axisMatch(원국 중심축과 같은 해)는 10년 중
  // 정확히 2번 나온다(10천간 순환 특성). 두 번째로 나올 때 똑같은 문장이
  // 반복되지 않도록 "이전에 이미 나온 적 있는지"만 센다 — 새 판정 아님.
  axisMatchSeenBefore: boolean,
  // [2026-09 7장 서술 개정] selfPunish(자형)도 10년 중 여러 해에 걸쳐
  // 나타날 수 있어(연속이 아닐 수도 있음), 이미 몇 번째로 나타나는지에
  // 따라 문장을 바꾼다(0=처음).
  selfPunishSeenCount: number,
  // [2026-10-02 22명 회귀검증에서 발견·수정] dayBranchRelation(세운 지지가
  // 일지와 관계를 맺는지)도 axisMatch와 똑같이 2년 이상 연속으로 나타날 수
  // 있는데, 그동안 "이미 말했는지" 기억하는 로직이 없어 완전히 같은 문장이
  // 반복됐다. 새 계산이 아니라 axisMatchSeenBefore와 동일한 패턴으로
  // buildTenYearNarrative에서 미리 계산해 전달만 한다.
  dayBranchSeenBefore: boolean,
  // [2026-10-02 22명 회귀검증에서 발견·수정] compoundingClause의 SETTLE이
  // 몇 년째 연속인지(새 계산 아님, compoundCats 배열로부터 결정론적으로
  // 계산해 buildTenYearNarrative에서 전달만 한다). SETTLE 반복 억제에만 쓴다.
  compoundStreakLen: number
): TenYearItem {
  const entry = SEUN_SIGNAL[sk.seunGanSipseong];
  const isTransitionYear = Boolean(prevPeriod && prevPeriod.ganZhi !== period.ganZhi);
  const dayBranchRelation = sk.natalRelations.some((r) => r.stage === "day");
  const selfPunish = sk.selfPunishNatal.length > 0 || sk.selfPunishDayun.length > 0;
  const axisMatch = sk.seunGanCategory !== null && sk.seunGanCategory === natalAxis;
  // 세운 카테고리 vs "그 시점 대운"(currentDayunCategory) 관계 — 같은
  // 일간을 쓰는 두 사람이 같은 연도에 완전히 같은 문장을 받는 문제가
  // QA에서 발견되어 추가됨. 세운 자체(연간지-일간 조합)는 일간이 같으면
  // 동일하지만, "그 세운이 지금 대운과 같은 성질인지"는 사람마다 다른
  // 대운을 지나므로 서로 달라진다.
  const dayunTier = computeDayunTier(sk);

  let area: LifeAreaLabel = entry.area;
  if (isTransitionYear) area = "변화와 선택";
  else if (selfPunish) area = "안정과 정리";

  // [2026-09 7장 서술 개정] 대운이 바뀌는 해는 "지난 시간 → 앞으로"라는
  // 별개의 맥락이 한 해 안에 같이 담기므로, 두 문단으로 나눈다(그 외
  // 연도는 한 문단). transitionPara가 있으면 최종 narrative는
  // `transitionPara + "\n\n" + parts.join(" ")`로 합친다.
  let transitionPara: string | null = null;
  if (isTransitionYear && prevPeriod) {
    const outgoing = SEGMENT_SUMMARY[prevPeriod.ganSipseong];
    const outgoingGains = outgoing ? outgoing.gains : "지금까지 쓰던 방식";
    // [2026-09 7장 서술 개정] termDisplay(십성명+한자, 예: "식신(食神)")를
    // 그대로 노출하던 부분을 SEGMENT_SUMMARY의 생활 언어 표현으로 바꿨다.
    // 계산값(period.ganSipseong)은 그대로 쓰고, 보여주는 말만 바꾼 것이다.
    const incoming = SEGMENT_SUMMARY[period.ganSipseong];
    const incomingGains = incoming ? incoming.gains : "다른 방식";
    transitionPara = `지금까지는 ${outgoingGains}을 주로 써왔다면, 이 해부터는 ${incomingGains}을 더 많이 쓰게 됩니다. 그동안 익숙했던 방식이 예전만큼 편하게 느껴지지 않을 수 있는데, 틀려서가 아니라 지금부터는 다른 방식이 더 필요해지기 때문입니다.`;
  }

  const parts: string[] = [];
  parts.push(entry.core);

  // [7장 조사·최소수정 전용] dayunTier(같음/충돌) 자체는 "그 해의 세운이
  // 지금 대운과 같은/부딪히는 성질인가"라는 매년 새로 계산되는 사실이지만,
  // 같은 대운이 보통 여러 해에 걸쳐 이어지다 보니 이 관계값 자체가 여러
  // 해 연속으로 같은 값이 되는 경우가 실제로 있다(12명 전원 확인, 충돌은
  // 4/10년까지 연속). 그때마다 완전히 같은 문장을 반복하면 "복사된
  // 문장처럼" 읽힌다 — 그래서 "바로 앞 해와 똑같은 관계가 끊기지 않고
  // 이어지는 경우"에만, 이미 설명한 사실을 다시 전체 문장으로 반복하지
  // 않는다. 대운이 바뀌었거나(isTransitionYear) 관계가 달라졌으면 항상
  // 전체 문장을 그대로 쓴다 — 그 해에 꼭 필요한 의미이기 때문이다. 이
  // 조건이 꺼졌을 때 나머지 문장(entry.core/action, axisMatch, selfPunish,
  // dayBranchRelation)은 전혀 건드리지 않으므로, 해마다 실제로 달라지는
  // SEUN_SIGNAL 등 다른 계산값이 그 해의 개인화를 그대로 이어간다.
  const isRepeatDayunTier = dayunTier !== null && dayunTier === prevDayunTier && !isTransitionYear;
  if (dayunTier === "같음" && !isRepeatDayunTier) {
    parts.push("지금 지나는 10년의 전체적인 흐름과도 맞닿아 있어서, 올해 느끼는 이 성향이 유독 뚜렷하게 느껴질 수 있습니다.");
  } else if (dayunTier === "충돌" && !isRepeatDayunTier) {
    parts.push("다만 지금 지나는 대운은 오히려 이와 부딪히는 성질이라, 마음은 이렇게 움직이고 싶은데 상황이 자꾸 제동을 거는 듯한 답답함을 함께 느낄 수 있습니다.");
  }
  if (dayBranchRelation) {
    // [2026-10-02 수정] "이 흐름은"이라는 모호한 지시어와 "배우자 자리"의
    // "자리"(이 함수 안에서 역할/위치/일지 세 가지 뜻으로 혼용되던 단어)를
    // 제거했다. dayBranchRelation은 세운 지지가 일지(日支)와 합/충 중
    // 어느 쪽으로 관계를 맺었는지는 구분하지 않으므로(합/충 모두 true),
    // "거리를 조율해야 한다"처럼 충(갈등)쪽으로 치우친 단정도 하지 않고
    // "평소와는 다른 움직임"이라는 중립적 표현만 쓴다.
    // [2026-10-02 22명 회귀검증에서 발견·수정] axisMatch와 동일하게, 두
    // 번째 이후 등장은 짧게 줄인다(새 의미 추가 없음, 반복만 줄임).
    parts.push(
      dayBranchSeenBefore
        ? "이번에도 비슷한 신호가 배우자와의 관계에서 나타날 수 있습니다."
        : "게다가 지금 이 해에 나타나는 마음의 흐름은 배우자와의 관계에도 함께 영향을 줄 수 있어, 그 관계 안에서도 평소와는 다른 움직임이 느껴질 수 있습니다."
    );
  }
  if (axisMatch) {
    // "다른 해보다 유독 선명하고"(비교급 표현)는 그래프의 flowIntensity(신호
    // 밀도, 이 사람의 10년 안에서만 상대 비교)와 별개 축인데도 "이 해가
    // 다른 해보다 두드러진다"는 인상을 준다 — axisMatch는 scoreYear()
    // 합산에 들어가지 않는 신호라, 실제로 flowIntensity가 이 사람의 10년
    // 중 가장 낮은 해에도 axisMatch만 켜지는 경우가 있다(출시 전 정밀 QA,
    // 그래프↔본문 일관성 점검에서 발견). 판정(axisMatch)과 "낯설지 않다/
    // 익숙하다"는 사실은 그대로 두고, 그래프와 충돌해 보일 수 있는 비교급
    // 표현만 뺐다 — 익숙함은 flowIntensity와 무관하게 항상 성립하는
    // 주관적 느낌이라 그래프 수치와 부딪힐 일이 없다.
    // [2026-10-02 수정] 두 번째(이후) 등장 시 첫 문장을 거의 그대로
    // 반복하던 것을, 같은 계산 근거(axisMatch)를 가리키되 짧은 재확인
    // 형태로 줄였다 — 10년 중 정확히 2번만 나오는 신호라 "다른 뜻을
    // 억지로 만들어내지 말고 줄이라"는 원칙을 그대로 따른 것.
    parts.push(
      axisMatchSeenBefore
        ? "이번에도 손에 익은 쪽이라 크게 낯설지 않을 겁니다."
        : "이 방식은 원래도 이 사람이 가장 많이 써온 쪽이라, 낯설지 않게 느껴질 수 있습니다."
    );
  }
  if (selfPunish) {
    // [2026-10-02 수정] "같은 자리끼리 부딪히는 결" 같은 명리식 표현을
    // 빼고, 그 계산이 실제로 의미하는 결과(바깥일보다 내면 정리에 마음이
    // 쓰임)만 생활 언어로 남겼다. 세 번째 등장(3회차)은 "이런 결은"처럼
    // 선행 문맥 없이도 뜻이 통하도록, 가리키는 내용을 그 자리에서 다시
    // 짧게 풀어 썼다(모호한 지시어 제거).
    const SELF_PUNISH_LINES = [
      "이 시기엔 밖으로 벌이는 일보다, 마음속에서 스스로와 씨름하며 정리하는 데 더 신경이 쓰입니다.",
      "이번에도 바깥일보다는 마음속에서 스스로와 씨름하며 정리하는 쪽에 마음이 쓰일 수 있습니다.",
      "한편 마음속에서 쉽게 정리되지 않는 부분은 다시 살펴보게 될 수 있습니다.",
    ];
    parts.push(SELF_PUNISH_LINES[Math.min(selfPunishSeenCount, SELF_PUNISH_LINES.length - 1)]);
  }
  const compounding = compoundingClause(compoundCategory(sk), prevCompoundCat, prevPrevCompoundCat, compoundCatSeenBefore, compoundStreakLen);
  if (compounding) parts.push(compounding);
  parts.push(entry.action);

  const coreSignal = (isTransitionYear ? "대운이 바뀌는 해 — " : "") + entry.label;
  const narrative = transitionPara ? `${transitionPara}\n\n${parts.join(" ")}` : parts.join(" ");

  const noteBits = [
    `seunGan=${sk.seunGanSipseong}`,
    `seunJi본기=${sk.hiddenStems[0]?.sipseong ?? "?"}`,
    `대운=${period.ganZhi}(${period.ganSipseong})`,
    isTransitionYear ? "대운전환" : "",
    dayunTier ? `대운관계=${dayunTier}` : "",
    dayBranchRelation ? "일지관계" : "",
    selfPunish ? "자형" : "",
    axisMatch ? "중심축일치" : "",
  ].filter(Boolean);

  return {
    year,
    age,
    ganZhiHanja: `${sk.seunGanHanja}${sk.seunJiHanja}`,
    ganZhiHangul: `${sk.seunGanHangul}${sk.seunJiHangul}`,
    coreSignal,
    area,
    narrative,
    isTransitionYear,
    sourceNote: noteBits.join(", "),
  };
}

// ────────────────────────────────────────────────────────────────
// ① 구간 분할 — 10년 사이 실제 대운 경계(있으면)로만 나눈다. 대운
// 한 블록이 10년이고 조회 범위도 10년이라 경계는 최대 1개만 있을 수
// 있다(3/3/4 같은 고정 분할이 아니라 실제로 1~2구간만 나온다).
// ────────────────────────────────────────────────────────────────

// [2026-10-02 7장 ④·⑤ 중복 결론 수정] "10년을 한 번에 보면"의 역할을
// "연도별 내용 재요약"(gains/prepare, buildClosing과 거의 같은 문장을
// 두 번 말하는 문제가 있었음)에서 "10년 전체에서 실제로 반복되는 계산
// 패턴을 보여주는 것"으로 바꾼다. 새 계산 없음 — items[].area(이미
// buildYearItem이 채워 둔 필드)의 구간 내 빈도만 센다. AREA_PHRASE는
// SEGMENT_SUMMARY.gains와 같은 성격의 "값→생활 언어" 매핑일 뿐, area
// 판정 자체(어떤 area인지)는 전혀 건드리지 않는다. */
const AREA_PHRASE: Record<LifeAreaLabel, string> = {
  "돈과 일": "돈과 일에서 움직임이 잦아지는 흐름",
  "관계와 인연": "사람과의 관계나 인연이 움직이는 흐름",
  "표현과 활동": "생각이나 마음을 적극적으로 표현하는 흐름",
  "책임과 압박": "맡은 책임이나 부담이 커지는 흐름",
  "배움과 준비": "혼자 배우고 준비하는 데 마음이 가는 흐름",
  "변화와 선택": "방향을 다시 정하거나 선택이 많아지는 흐름",
  "안정과 정리": "마음을 다잡고 생활을 정리하는 흐름",
};
const AREA_ORDER: LifeAreaLabel[] = ["돈과 일", "관계와 인연", "표현과 활동", "책임과 압박", "배움과 준비", "변화와 선택", "안정과 정리"];
const COUNT_WORD = ["", "한", "두", "세", "네", "다섯", "여섯", "일곱", "여덟", "아홉", "열"];
function countWord(n: number): string {
  return COUNT_WORD[n] ?? `${n}`;
}

/** 이 구간(세그먼트)에 속한 연도들의 area 분포를 세어, 가장 자주
 * 나타나는 area를 자연스러운 문장으로 옮긴다. 빈도(topCount)가 1뿐이면
 * (반복이라 부를 근거가 부족하면) 억지로 패턴을 만들지 않고 기본
 * 문장으로 떨어진다 — "계산 데이터가 충분하지 않으면 문장을 지어내지
 * 않는다"는 원칙을 그대로 따른 것. */
function describeAreaPattern(segItems: TenYearItem[], startYear: number, endYear: number): string {
  const tally = new Map<LifeAreaLabel, number>();
  segItems.forEach((it) => tally.set(it.area, (tally.get(it.area) ?? 0) + 1));
  let top: LifeAreaLabel = segItems[0].area;
  let topCount = 0;
  AREA_ORDER.forEach((a) => {
    const c = tally.get(a) ?? 0;
    if (c > topCount) { top = a; topCount = c; }
  });
  const span = yearSpanClause(startYear, endYear);
  if (topCount < 2) {
    return `${span} 한 가지 흐름으로 묶이기보다, 여러 흐름이 번갈아 나타나는 시기입니다.`;
  }
  const phrase = AREA_PHRASE[top];
  const transitionCount = segItems.filter((it) => it.isTransitionYear).length;
  const transitionClause = transitionCount > 0 ? " 그 사이 한 번은 대운 자체가 바뀌는 해이기도 합니다." : "";
  if (topCount >= segItems.length) {
    return `${span} ${phrase}이 내내 이어집니다.${transitionClause}`;
  }
  return `${span} ${phrase}이 ${countWord(topCount)} 번 정도 반복해서 찾아옵니다.${transitionClause}`;
}

function buildSegments(items: TenYearItem[], periodsByYear: (DaYunWealthPeriod | null)[]): TenYearSegment[] {
  const segments: { startYear: number; endYear: number; category: SipseongCategory | null; ganSipseong: string | null }[] = [];
  items.forEach((item, i) => {
    const category = periodsByYear[i]?.ganCategory ?? null;
    const ganSipseong = periodsByYear[i]?.ganSipseong ?? null;
    const last = segments[segments.length - 1];
    if (last && !item.isTransitionYear) {
      last.endYear = item.year;
    } else {
      segments.push({ startYear: item.year, endYear: item.year, category, ganSipseong });
    }
  });

  return segments.map((seg) => {
    const segItems = items.filter((it) => it.year >= seg.startYear && it.year <= seg.endYear);
    return { ...seg, summary: describeAreaPattern(segItems, seg.startYear, seg.endYear) };
  });
}

function segmentGains(seg: TenYearSegment): string {
  return seg.ganSipseong && SEGMENT_SUMMARY[seg.ganSipseong] ? SEGMENT_SUMMARY[seg.ganSipseong].gains : "여러 힘이 섞인 흐름";
}

// 구간이 정확히 1년뿐일 때 "OO년부터 OO년까지는"처럼 같은 해가 중복
// 표기되는 걸 막는다. 시작·종료 연도가 다른 정상 범위는 기존 표현을
// 그대로 쓴다 — 연도 계산이나 구간 분할 로직 자체는 건드리지 않는다.
function yearSpanClause(startYear: number, endYear: number): string {
  return startYear === endYear ? `${startYear}년에는` : `${startYear}년부터 ${endYear}년까지는`;
}

// ────────────────────────────────────────────────────────────────
// 여는 글 — 앞으로 10년의 지도를 먼저 보여준다.
// ────────────────────────────────────────────────────────────────

function buildIntro(segments: TenYearSegment[]): string {
  if (segments.length === 1) {
    const gains = segmentGains(segments[0]);
    // [2026-10-02 수정] "어떤 해는 가볍게 지나가고 어떤 해는 유독 마음이
    // 많이 쓰일 수 있습니다" — 누구에게나 적용되는 일반론 문장을 제거.
    // 이 구간의 실제 반복 패턴은 바로 아래 "10년을 한 번에 보면"에서
    // items[].area 기반으로 구체적으로 다루므로, 여는 글에서 같은 내용을
    // 미리 추상적으로 선점하지 않는다.
    return `앞으로 10년은 방향을 자주 바꾸기보다, ${gains}을 꾸준히 이어가면서 자기 방식을 다져가는 쪽에 가깝습니다. 아래에서 2026년부터 2035년까지 한 해씩 짚어드립니다.`;
  }

  const first = segments[0];
  const rest = segments.slice(1);
  const restText = rest.map((seg) => `${seg.startYear}년부터는 ${segmentGains(seg)} 쪽으로 무게가 옮겨갑니다.`).join(" ");

  return `앞으로 10년은 한 가지 방식으로 쭉 흘러가지 않습니다. ${yearSpanClause(first.startYear, first.endYear)} ${segmentGains(first)}을 주로 쓰게 되고, ${restText} 앞서 하던 방식을 한 번에 버릴 필요는 없지만, 뒤로 갈수록 조금씩 다른 방식에 익숙해지게 됩니다. 아래에서 2026년부터 2035년까지 한 해씩 짚어드립니다.`;
}

// ────────────────────────────────────────────────────────────────
// ③ 특히 기억해둘 시기 — 신호 강도 점수로 상위 2~4개만 선택, 이유는
// 명리 용어가 아니라 삶의 언어로 번역한다.
// ────────────────────────────────────────────────────────────────

function scoreYear(item: TenYearItem, sk: SeunKey): number {
  let score = 0;
  if (item.isTransitionYear) score += 3;
  score += sk.natalRelations.length;
  score += sk.dayunRelations.length;
  score += sk.ganHeNatal.length;
  score += sk.ganHeDayun.length;
  score += sk.selfPunishNatal.length;
  score += sk.selfPunishDayun.length;
  if (sk.seunGanCategory && sk.seunGanCategory === sk.currentDayunCategory) score += 1;
  return score;
}

/** [2026-09 7장 서술 개정] 기존엔 "OO와 정면으로 부딪히는 충(沖)의
 * 관계가 겹쳐 있는 해입니다"처럼 명리 용어(합/충/천간/대운)를 고객
 * 문장에 그대로 노출했다. 계산 자체(관계가 몇 개, 어느 성질로 겹치는지)는
 * 그대로 두고, countRelSignals로 이미 센 pulls/clashes 개수만으로 그
 * 해가 실제로 어떻게 체감되는지를 생활 언어로 옮긴다. */
function buildSituationClause(isTransitionYear: boolean, pulls: number, clashes: number, dayunTier: "같음" | "충돌" | null): string {
  if (isTransitionYear) {
    return "지금까지 지나온 시기 자체가 한 매듭을 짓고 다음 시기로 넘어가는 해입니다.";
  }
  if (pulls > 0 && clashes > 0) {
    return "순조롭게 풀리는 부분과 뜻대로 잘 안 풀리는 부분이 함께 나타나는 해입니다.";
  }
  if (clashes >= 2) {
    return "여러 곳에서 동시에 제동이 걸리는 느낌을 받기 쉬운 해입니다.";
  }
  if (clashes === 1) {
    return "마음먹은 대로 잘 안 풀리는 부분이 뚜렷하게 나타나는 해입니다.";
  }
  if (pulls >= 2) {
    return "여러 가지가 한꺼번에 순조롭게 맞아떨어지는 해입니다.";
  }
  if (pulls === 1) {
    return "순조롭게 풀리는 부분이 뚜렷하게 나타나는 해입니다.";
  }
  if (dayunTier === "같음") {
    return "지금 지나는 시기와 같은 결로 이어지며 눈에 띄게 두드러지는 해입니다.";
  }
  if (dayunTier === "충돌") {
    return "지금 지나는 시기와는 다른 결이라 유독 도드라지는 해입니다.";
  }
  return "다른 해보다 흐름이 뚜렷하게 갈리는 해입니다.";
}

/** "다른 9개 연도와 비교했을 때 무엇이 두드러지는가"를 실제 점수 분포로
 * 답한다 — 느낌으로 단정하지 않고, 10개 연도 전체의 계산된 score를
 * 서로 비교한 결과만 문장으로 옮긴다. */
function buildRankClause(score: number, allScores: number[]): string {
  const maxScore = Math.max(...allScores);
  const countAtMax = allScores.filter((s) => s === maxScore).length;
  if (score === maxScore && countAtMax === 1) {
    return "10년을 통틀어 이 정도로 여러 가지가 한꺼번에 겹치는 해는 이 한 해뿐입니다.";
  }
  if (score === maxScore) {
    return "10년 중에서도 유독 여러 가지가 겹치는 해들 가운데 하나입니다.";
  }
  return "10년 중 흐름이 뚜렷하게 갈리는 몇 안 되는 해 중 하나입니다.";
}

function buildHighlights(items: TenYearItem[], scores: number[], sks: SeunKey[]): TenYearHighlight[] {
  const indexed = items.map((item, i) => ({ item, score: scores[i], sk: sks[i] }));
  const sorted = [...indexed].sort((a, b) => b.score - a.score);
  const cutoffScore = sorted[Math.min(3, sorted.length - 1)].score;
  let picked = sorted.filter((x) => x.score >= cutoffScore);
  if (picked.length < 2) picked = sorted.slice(0, 2);
  if (picked.length > 4) picked = picked.slice(0, 4);
  picked.sort((a, b) => a.item.year - b.item.year);

  return picked.map(({ item, score, sk }) => {
    // exact 십성(10종) 뱅크 — 10년 사이 정확히 한 번씩만 등장하므로, 이
    // 해에 선택된 항목의 core/action은 같은 회차에 뽑힌 다른 하이라이트와
    // 절대 겹치지 않는다(SEUN_SIGNAL 자체가 이미 exact 십성 키).
    const entry = SEUN_SIGNAL[sk.seunGanSipseong];
    const { pulls, clashes } = countRelSignals(sk);
    const dayunTier = computeDayunTier(sk);

    const situationClause = buildSituationClause(item.isTransitionYear, pulls, clashes, dayunTier);
    const rankClause = buildRankClause(score, scores);
    // realLifeClause(entry.core의 첫 문장)는 삭제됨(2026-09 출시 전 정밀
    // QA에서 발견) — 이 문장이 바로 위 ②(연도별 흐름)에서 같은 해의
    // 서술로 이미 토씨 하나 안 틀리고 나온 뒤라, 여기서 다시 그대로
    // 인용하면 "방금 읽은 문장을 또 읽는" 순수 복붙이 된다. ③의 역할은
    // "이 해가 왜 유독 눈에 띄는가"(whyClause·rankClause, ②에는 없는
    // 새 정보)이지 그 해의 장면을 재서술하는 것이 아니므로, 그 부분만
    // 지웠다. entry.action(실전 팁)은 ②에도 나오지만 "그래서 이 해엔
    // 이렇게" 하는 실용적 마무리로 남겨둔다(첫 문장 재서술과 달리 새로운
    // 정보 없이도 요약 시점에 다시 언급할 가치가 있는 조언이라 판단).
    const transitionClause = item.isTransitionYear
      ? " 이 해를 기점으로 앞서 이어지던 방식과는 결이 달라지므로, 익숙했던 방식을 그대로 끌고 가기보다 새로 맞춰가는 자세가 필요합니다."
      : "";

    const reason = `${item.year}년은 ${situationClause} ${rankClause}${transitionClause} ${entry.action}`;

    return { year: item.year, reason };
  });
}

// ────────────────────────────────────────────────────────────────
// ④ 이 10년을 지나가는 방법
// ────────────────────────────────────────────────────────────────

/** [2026-09 7장 서술 개정] "관통하는 흐름/무게 중심/변화의 폭" 같은
 * 보고서식 표현을 빼고, 앞으로 10년 동안 무엇이 이어지고 무엇이
 * 달라지는지만 2~3문장으로 짧게 정리한다. highlights 연도를 다시
 * 나열하지 않는다 — 이제 10개 연도 본문을 전부 보여주므로, 그 안에서
 * 이미 각자의 비중이 드러난다(아래 ⑤ 참고).
 */
// [2026-10-02 수정] 마감 문단의 역할을 "요약 재반복"(firstGains/lastGains로
// "10년을 한 번에 보면"과 거의 같은 문장을 다시 말하던 문제)에서 "이 10년을
// 지나는 동안 기억해둘 현실적인 포인트 하나"로 바꾼다. gains(그 기간에
// 주로 쓰는 힘)는 이제 "10년을 한 번에 보면"의 몫이라 여기서 다시 쓰지
// 않고, prepare(이미 SEGMENT_SUMMARY에 있던 생활 습관 조언)만 짧게 남긴다
// — 새 계산 없음, 기존 값을 어디서 한 번만 쓰느냐만 바꿨다.
function buildClosing(segments: TenYearSegment[]): string {
  const first = segments[0];
  const last = segments[segments.length - 1];
  // 카테고리(5종) 동일 여부가 아니라 "실제 대운이 바뀌었는가"(segments가
  // 2개 이상이면 이미 그런 뜻)로 판단한다 — 편재→정재처럼 카테고리는 같아도
  // 실제 대운이 바뀌는 경우를 "변화 없음"으로 잘못 읽지 않기 위함.
  const changed = segments.length > 1;
  const lastPrepare = last.ganSipseong && SEGMENT_SUMMARY[last.ganSipseong] ? SEGMENT_SUMMARY[last.ganSipseong].prepare : "달라지는 방식에 맞춰 조정하는 습관";
  const firstPrepare = first.ganSipseong && SEGMENT_SUMMARY[first.ganSipseong] ? SEGMENT_SUMMARY[first.ganSipseong].prepare : "지금의 방식을 꾸준히 이어가는 습관";

  if (changed) {
    return `이 10년을 지나는 동안 하나만 기억해 둔다면, 뒤로 갈수록 ${lastPrepare}을 조금씩 늘려가는 것입니다. 앞서 하던 방식을 한 번에 버릴 필요는 없습니다.`;
  }
  return `이 10년을 지나는 동안 하나만 기억해 둔다면, ${firstPrepare}입니다.`;
}

// ────────────────────────────────────────────────────────────────

export function buildTenYearNarrative(appData: AppData): TenYearContent {
  const key = buildLifeFlowKey(appData);
  const user = appData.user;
  const dayGan = user.pillars.day.hanja;
  const birthYear = appData.birthYear;

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

  // 기존 buildTenYearFortune과 동일한 "현재 연도부터 10년" 규칙을 그대로
  // 따른다(하드코딩된 특정 연도 없음, 조회 시점 기준).
  const startYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => startYear + i);

  const periodsByYear = years.map((y) => findCoveringPeriod(key.periods, y - birthYear + 1));
  const sks = years.map((y, i) => {
    const period = periodsByYear[i]!;
    return buildSeunKey(dayGan, y, natalBranches, { ganZhi: period.ganZhi, ganSipseong: period.ganSipseong }, natalStems);
  });

  // [7장 조사·최소수정 전용] scoreYear()/dayunTier 판정 자체는 그대로
  // buildYearItem 안에서 다시 계산한다(값 변경 없음) — 여기서는 "바로 앞
  // 해의 dayunTier가 무엇이었는지"만 순서대로 미리 뽑아 각 항목에 넘겨
  // 준다. computeDayunTier는 이미 있는 순수함수를 그대로 재호출하는
  // 것뿐이다.
  const dayunTiers = sks.map((sk) => computeDayunTier(sk));
  // [2026-09 7장 서술 개정] compoundingClause/axisMatch 문장이 연도마다
  // 반복되지 않도록, 순서대로 한 번만 미리 계산해 둔다 — 전부 이미 있는
  // 함수(compoundCategory/sk.seunGanCategory)를 재호출하는 것뿐, 새 판정
  // 없음.
  const compoundCats = sks.map((sk) => compoundCategory(sk));
  let axisMatchCount = 0;
  const axisMatchSeenBeforeFlags = sks.map((sk) => {
    const isMatch = sk.seunGanCategory !== null && sk.seunGanCategory === key.natalAxis;
    const seenBefore = isMatch && axisMatchCount > 0;
    if (isMatch) axisMatchCount++;
    return seenBefore;
  });
  const compoundCatSeenCounts: Partial<Record<"mixed" | "clash" | "pull", number>> = {};
  const compoundCatSeenBeforeFlags = compoundCats.map((cat) => {
    if (!cat) return false;
    const seenBefore = (compoundCatSeenCounts[cat] ?? 0) > 0;
    compoundCatSeenCounts[cat] = (compoundCatSeenCounts[cat] ?? 0) + 1;
    return seenBefore;
  });
  let selfPunishCount = 0;
  const selfPunishSeenCounts = sks.map((sk) => {
    const isMatch = sk.selfPunishNatal.length > 0 || sk.selfPunishDayun.length > 0;
    const countSoFar = selfPunishCount;
    if (isMatch) selfPunishCount++;
    return countSoFar;
  });
  // [2026-10-02 22명 회귀검증에서 발견·수정] dayBranchRelation도 axisMatch와
  // 동일한 패턴(seenBefore)으로 반복을 줄인다 — 새 계산 아님, 기존
  // sk.natalRelations.some(r=>r.stage==="day")의 과거 등장 여부만 기억한다.
  let dayBranchCount = 0;
  const dayBranchSeenBeforeFlags = sks.map((sk) => {
    const isMatch = sk.natalRelations.some((r) => r.stage === "day");
    const seenBefore = isMatch && dayBranchCount > 0;
    if (isMatch) dayBranchCount++;
    return seenBefore;
  });
  // [2026-10-02 22명 회귀검증에서 발견·수정] compoundingClause의 SETTLE이
  // 4년차 이상 연속될 때도 그대로 반복되는 문제 — 새 계산 없이 이미 있는
  // compoundCats 배열만으로 "같은 카테고리가 몇 년째 연속인지"를 센다.
  let streakLen = 0;
  let prevCatForStreak: CompoundCat = null;
  const compoundStreakLengths = compoundCats.map((cat) => {
    streakLen = cat && cat === prevCatForStreak ? streakLen + 1 : cat ? 1 : 0;
    prevCatForStreak = cat;
    return streakLen;
  });

  const items = years.map((y, i) => {
    const age = y - birthYear + 1;
    const period = periodsByYear[i]!;
    const prevPeriod = i > 0 ? periodsByYear[i - 1] : null;
    const prevDayunTier = i > 0 ? dayunTiers[i - 1] : null;
    const prevCompoundCat = i > 0 ? compoundCats[i - 1] : null;
    const prevPrevCompoundCat = i > 1 ? compoundCats[i - 2] : null;
    return buildYearItem(y, age, period, prevPeriod, sks[i], key.natalAxis, prevDayunTier, prevCompoundCat, prevPrevCompoundCat, compoundCatSeenBeforeFlags[i], axisMatchSeenBeforeFlags[i], selfPunishSeenCounts[i], dayBranchSeenBeforeFlags[i], compoundStreakLengths[i]);
  });

  const scores = items.map((item, i) => scoreYear(item, sks[i]));
  const segments = buildSegments(items, periodsByYear);
  const highlights = buildHighlights(items, scores, sks);

  // scoreYear()가 이미 계산해 둔 원값을 각 항목에 실어 보낸다 — scoreYear
  // 자체의 계산식은 위 한 줄(scores = items.map(...))에서 이미 끝났고,
  // 여기서는 그 결과를 항목에 붙이기만 한다(새 계산 없음).
  const itemsWithScore: TenYearItem[] = items.map((item, i) => ({ ...item, rawScore: scores[i] }));

  return {
    intro: buildIntro(segments),
    segments,
    items: itemsWithScore,
    highlights,
    closing: buildClosing(segments),
  };
}
