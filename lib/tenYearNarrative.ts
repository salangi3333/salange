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

const SEUN_SIGNAL: Record<string, YearSignalEntry> = {
  비견: {
    label: "스스로 판단하고 나서는 힘이 강해지는 해",
    area: "변화와 선택",
    core: "이 해에는 나와 같은 성질의 기운이 앞으로 나서면서, 결정의 무게중심이 다른 사람에서 나 자신 쪽으로 옮겨옵니다. 그동안 누군가의 의견을 먼저 구하고 확인받은 뒤에야 움직였다면, 이 시기에는 '일단 내가 정해보자'는 마음이 먼저 올라오기 쉽습니다. 누가 갑자기 나를 바꿔주는 해라기보다, 스스로 내린 판단을 스스로 믿어보기 시작하는 해에 가깝습니다.",
    action: "다만 그 확신이 앞서는 만큼, 중요한 결정 하나 정도는 실행하기 전에 주변에 한 번 말해보는 편이 나중에 후회를 줄여줍니다.",
  },
  겁재: {
    label: "나누고 움직이려는 힘이 커지는 해",
    area: "돈과 일",
    core: "가진 것을 나누거나 다른 곳으로 옮기려는 힘이 강해지는 해라, 돈이든 시간이든 한 곳에 오래 머물러 있지 못하는 느낌을 받기 쉽습니다. 누군가와 함께 무언가를 벌이고 싶은 마음이 커지고, 그 제안을 거절하기가 유독 어렵게 느껴질 수 있습니다. 그런데 정작 나중에 돌아보면 그 나눔이 나에게 무엇을 남겼는지 헷갈리는 경우도 잦아지는 시기입니다.",
    action: "큰돈이 오가는 약속이나 동업 제안일수록, 이 해에는 한 박자 늦게 답해도 늦지 않습니다.",
  },
  식신: {
    label: "차분히 결과를 만들어가는 힘이 강해지는 해",
    area: "표현과 활동",
    core: "서두르지 않고 꾸준히 쌓아가려는 힘이 강해지는 해입니다. 겉으로 눈에 띄는 변화가 없어 스스로 제자리걸음처럼 느껴질 수 있지만, 실제로는 조용히 쌓인 것들이 힘을 갖기 시작하는 시기에 더 가깝습니다. 빨리 결과를 보여줘야 한다는 조급함보다, 지금 하고 있는 것을 계속 이어가고 싶은 마음이 자연스럽게 커집니다.",
    action: "당장 티가 안 난다고 방향을 자주 바꾸기보다, 지금 하던 것을 한 번 더 밀어붙여 보는 편이 이 해와 잘 맞습니다.",
  },
  상관: {
    label: "생각을 적극적으로 표현하려는 힘이 커지는 해",
    area: "표현과 활동",
    core: "안에 담아뒀던 생각이나 감정을 밖으로 꺼내고 싶은 힘이 강해지는 해입니다. 평소라면 넘어갔을 일에도 하고 싶은 말이 더 많아지고, 표현하지 않고 넘어가면 오히려 더 답답하게 느껴질 수 있습니다. 예전 방식이 갑갑하게 느껴지고, 조금 다르게 해보고 싶다는 충동이 자주 올라옵니다.",
    action: "다만 감정이 먼저 튀어나오는 만큼, 하고 싶은 말을 한 박자만 쉬었다 꺼내는 습관이 이 해에는 유독 도움이 됩니다.",
  },
  편재: {
    label: "기회와 자원이 움직이며 커지는 해",
    area: "돈과 일",
    core: "한곳에 머물지 않고 기회와 자원을 움직이며 판을 넓히려는 힘이 강해지는 해입니다. 새로운 제안이나 낯선 기회가 평소보다 자주 눈에 들어오고, 그걸 놓치면 안 될 것 같은 조급함도 함께 따라오기 쉽습니다. 움직이는 만큼 손에 잡히는 것도 늘어나지만, 그만큼 나가는 것도 함께 커지는 흐름입니다.",
    action: "기회가 늘어나는 해일수록 지출 계획을 먼저 세워두는 편이, 나중에 남는 게 없다는 느낌을 줄여줍니다.",
  },
  정재: {
    label: "꾸준히 쌓이는 힘이 강해지는 해",
    area: "돈과 일",
    core: "한 번에 크게보다 꾸준하고 안정적으로 쌓이는 힘이 강해지는 해입니다. 눈에 띄는 한 방보다, 지금까지 해온 방식을 그대로 이어가고 싶은 마음이 커집니다. 큰 결정을 미루고 있었다면, 이 시기에는 무리해서 벌이기보다 다지는 쪽으로 마음이 기울기 쉽습니다.",
    action: "당장 크게 벌리기보다 지금까지 쌓아온 것을 다지는 데 집중하면, 이 해의 흐름을 가장 잘 쓸 수 있습니다.",
  },
  편관: {
    label: "긴장과 책임이 커지는 해",
    area: "책임과 압박",
    core: "상황 앞에서 즉각 움직여야 하는 힘이 강해지는 해라, 부담스러운 자리나 예상치 못한 승부처가 함께 찾아오기 쉽습니다. 마음의 여유보다 긴장이 먼저 앞서고, 몸이 먼저 지치는 느낌을 받을 수 있습니다. 다만 그 압박을 잘 넘기면 실력을 있는 그대로 인정받는 계기가 되기도 하는 시기입니다.",
    action: "무리한 일정을 욕심내기보다 체력과 컨디션 관리를 먼저 챙기는 편이, 이 시기의 압박을 훨씬 수월하게 넘기게 해줍니다.",
  },
  정관: {
    label: "맡은 역할과 책임이 뚜렷해지는 해",
    area: "책임과 압박",
    core: "정해진 기준과 책임을 지키려는 힘이 강해지는 해입니다. 맡은 자리의 무게가 전보다 뚜렷하게 느껴지고, 이제는 제대로 해내야 한다는 마음이 자연스럽게 커집니다. 누군가 시켜서라기보다, 스스로 그 역할을 인정받고 싶은 마음이 앞서는 시기입니다.",
    action: "책임이 커지는 만큼 전부 혼자 떠안기보다, 우선순위를 정해 하나씩 처리하는 편이 이 해를 덜 힘들게 지나가게 해줍니다.",
  },
  편인: {
    label: "남다른 방식으로 정리하려는 힘이 커지는 해",
    area: "배움과 준비",
    core: "남다른 방식으로 받아들이고 정리하려는 힘이 강해지는 해입니다. 사람들과 어울리기보다 혼자 생각을 정리하는 시간이 더 편하게 느껴지고, 새로운 분야를 파고들고 싶은 마음도 자연스럽게 커집니다. 예전 같으면 신경 쓰였을 남의 시선이 이 시기에는 상대적으로 덜 중요하게 느껴질 수 있습니다.",
    action: "혼자만의 시간을 가지는 것은 좋지만, 주변과의 연락까지 완전히 끊지는 않는 편이 균형을 지키는 데 도움이 됩니다.",
  },
  정인: {
    label: "받아들이고 신뢰를 쌓는 힘이 커지는 해",
    area: "배움과 준비",
    core: "안정적으로 받아들이고 신뢰를 쌓으려는 힘이 강해지는 해입니다. 서두르기보다 배우고 이해하는 데 마음이 먼저 가고, 곁에 있는 사람이나 조언에 기대고 싶은 마음도 함께 커집니다. 큰 결정을 서두르기보다 한 번 더 확인하고 싶은 신중함이 자연스럽게 앞서는 시기입니다.",
    action: "서두르기보다 배우고 이해하는 데 시간을 들이면, 이 해의 흐름을 가장 잘 활용할 수 있습니다.",
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

function firstSentence(text: string): string {
  const idx = text.indexOf(".");
  return (idx >= 0 ? text.slice(0, idx + 1) : text).trim();
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

function buildYearItem(
  year: number,
  age: number,
  period: DaYunWealthPeriod,
  prevPeriod: DaYunWealthPeriod | null,
  sk: SeunKey,
  natalAxis: SipseongCategory | null
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

  const parts: string[] = [];

  if (isTransitionYear && prevPeriod) {
    const outgoing = SEGMENT_SUMMARY[prevPeriod.ganSipseong];
    const outgoingGains = outgoing ? outgoing.gains : "지금까지의 방식";
    parts.push(
      `지난 시간 동안은 ${outgoingGains} 위에서 살아왔다면, 이 해부터는 대운 자체가 ${termDisplay(period.ganSipseong)} 쪽으로 넘어가며 삶의 앞자리에 서는 힘 자체가 바뀝니다. 그동안 익숙했던 방식이 이제는 예전만큼 편하게 느껴지지 않을 수 있습니다 — 틀려서가 아니라, 지금부터는 다른 힘이 더 필요해지기 때문입니다.`
    );
  }

  parts.push(entry.core);

  if (dayunTier === "같음") {
    parts.push("지금 지나는 대운 자체도 같은 성질이라, 이 흐름이 한 해로 끝나지 않고 당분간 이어질 가능성이 큽니다.");
  } else if (dayunTier === "충돌") {
    parts.push("다만 지금 지나는 대운은 오히려 이와 부딪히는 성질이라, 마음은 이렇게 움직이고 싶은데 상황이 자꾸 제동을 거는 듯한 답답함을 함께 느낄 수 있습니다.");
  }
  if (dayBranchRelation) {
    parts.push("게다가 이 흐름은 배우자 자리와도 맞물려 있어, 가까운 사람과의 관계에서도 비슷한 결의 신호가 함께 움직일 수 있습니다.");
  }
  if (axisMatch) {
    parts.push("이 힘은 원래도 이 사람을 가장 크게 움직여온 축이라, 다른 해보다 유독 선명하고 낯설지 않게 느껴질 수 있습니다.");
  }
  if (selfPunish) {
    parts.push("같은 자리끼리 부딪히는 결이 겹쳐 있어, 밖으로 벌이는 것보다 안에서 스스로와 부대끼며 정리하는 데 더 마음이 쓰이는 해이기도 합니다.");
  }
  parts.push(entry.action);

  const coreSignal = (isTransitionYear ? "대운이 바뀌는 해 — " : "") + entry.label;

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
    narrative: parts.join(" "),
    isTransitionYear,
    sourceNote: noteBits.join(", "),
  };
}

// ────────────────────────────────────────────────────────────────
// ① 구간 분할 — 10년 사이 실제 대운 경계(있으면)로만 나눈다. 대운
// 한 블록이 10년이고 조회 범위도 10년이라 경계는 최대 1개만 있을 수
// 있다(3/3/4 같은 고정 분할이 아니라 실제로 1~2구간만 나온다).
// ────────────────────────────────────────────────────────────────

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
    if (!seg.ganSipseong || !SEGMENT_SUMMARY[seg.ganSipseong]) {
      return { ...seg, summary: `${yearSpanClause(seg.startYear, seg.endYear)} 특정한 한 힘으로 정리되기보다 여러 힘이 함께 작동하는 구간입니다.` };
    }
    const s = SEGMENT_SUMMARY[seg.ganSipseong];
    return {
      ...seg,
      summary: `${yearSpanClause(seg.startYear, seg.endYear)} ${s.gains}이 삶의 중심에 있는 구간입니다. 큰 방향을 바꾸기보다 ${s.prepare}을 곁에 두면 이 구간을 지나기가 한결 수월해집니다.`,
    };
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
    return [
      `앞으로 10년의 지도를 먼저 펼쳐보면, 이 사람은 하나의 뚜렷한 흐름 위에 서 있습니다. ${segments[0].startYear}년부터 ${segments[0].endYear}년까지 ${gains}이 계속 삶의 앞자리를 지키고 있어, 10년 내내 다른 방향으로 크게 꺾이는 시기는 아닙니다.`,
      `다만 같은 힘이 이어진다고 해서 10년이 똑같이 흘러가지는 않습니다. 해마다 세운이 다르게 들어오면서, 이 힘이 어떤 얼굴로 나타나는지가 매년 달라지기 때문입니다. 앞으로의 내용은 그 해마다 달라지는 얼굴을 하나씩 짚어가는 방식으로 읽으시면 됩니다.`,
    ].join("\n\n");
  }

  const first = segments[0];
  const rest = segments.slice(1);
  const restText = rest.map((seg) => `${seg.startYear}년부터는 ${segmentGains(seg)}이 그 자리를 넘겨받습니다.`).join(" ");

  return [
    `앞으로 10년의 지도를 먼저 펼쳐보면, 이 10년은 한 흐름으로 쭉 이어지지 않습니다. ${yearSpanClause(first.startYear, first.endYear)} ${segmentGains(first)}이 삶의 앞자리에 있고, ${restText} 대운 자체가 바뀌는 경계가 이 10년 안에 들어 있는 셈이라, 앞부분에서 맞았던 방식이 뒷부분에서는 조금 다르게 다가올 수 있습니다.`,
    `이렇게 중심이 옮겨가는 흐름이기 때문에, 앞부분과 뒷부분을 하나로 뭉뚱그려 읽기보다 두 구간으로 나눠 읽는 편이 이 사람의 실제 흐름에 더 가깝습니다. 지금 서 있는 자리와 앞으로 넘어갈 자리, 두 개의 결을 함께 보시면 됩니다.`,
  ].join("\n\n");
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

/** 이 해가 다른 해와 다르게 어떤 "구체적 관계"로 걸리는지를 사실 그대로
 * 나열한다 — 관계 유무만 boolean으로 뭉뚱그리지 않고, 어느 기둥(년/월/일/시)과
 * 합인지 충인지까지 그대로 옮긴다. 두 해가 똑같이 "원국과 관계있음"이어도
 * 그 대상 기둥·합/충 여부가 다르면 문장 자체가 달라지는 구조다. */
function buildEvidenceClauses(sk: SeunKey): string[] {
  const clauses: string[] = [];
  sk.natalRelations.forEach((r) => {
    clauses.push(
      r.type === "합"
        ? `${STAGE_LABEL[r.stage]}와 부드럽게 이어지는 합(合)의 관계`
        : `${STAGE_LABEL[r.stage]}와 정면으로 부딪히는 충(沖)의 관계`
    );
  });
  sk.dayunRelations.forEach((r) => {
    clauses.push(
      r.type === "합"
        ? "지금 지나는 대운과도 같은 결로 이어지는 관계"
        : "지금 지나는 대운과 정면으로 부딪히는 관계"
    );
  });
  sk.ganHeNatal.forEach((r) => {
    clauses.push(`${STAGE_LABEL[r.stage]} 천간과 자연스럽게 손을 잡는 관계`);
  });
  if (sk.ganHeDayun.length > 0) clauses.push("지금 대운의 천간과도 손을 잡는 관계");
  sk.selfPunishNatal.forEach((r) => {
    clauses.push(`${STAGE_LABEL[r.stage]}와 같은 글자가 겹치는 자리`);
  });
  if (sk.selfPunishDayun.length > 0) clauses.push("지금 대운과 같은 글자가 겹치는 자리");
  return clauses;
}

function buildWhyClause(isTransitionYear: boolean, evidence: string[], dayunTier: "같음" | "충돌" | null): string {
  if (isTransitionYear && evidence.length > 0) {
    return `대운 자체가 바뀌는 경계에 있으면서, 동시에 ${evidence.join("와 ")}까지 겹쳐 있는 해`;
  }
  if (isTransitionYear) {
    return "대운 자체가 바뀌는 경계에 있는 해";
  }
  if (evidence.length > 0) {
    return `${evidence.join("와 ")}가 겹쳐 있는 해`;
  }
  if (dayunTier === "같음") {
    return "지금 지나는 대운의 성질과 같은 결이 이어지며 눈에 띄게 두드러지는 해";
  }
  if (dayunTier === "충돌") {
    return "지금 지나는 대운의 성질과 부딪히며 유독 신호가 도드라지는 해";
  }
  return "다른 해보다 흐름이 뚜렷하게 갈리는 해";
}

/** "다른 9개 연도와 비교했을 때 무엇이 두드러지는가"를 실제 점수 분포로
 * 답한다 — 느낌으로 단정하지 않고, 10개 연도 전체의 계산된 score를
 * 서로 비교한 결과만 문장으로 옮긴다. */
function buildRankClause(score: number, allScores: number[]): string {
  const maxScore = Math.max(...allScores);
  const countAtMax = allScores.filter((s) => s === maxScore).length;
  if (score === maxScore && countAtMax === 1) {
    return "10년을 통틀어 이 정도로 여러 신호가 한꺼번에 겹치는 해는 이 한 해뿐입니다.";
  }
  if (score === maxScore) {
    return "10년 중에서도 신호가 가장 짙게 겹치는 해들 가운데 하나입니다.";
  }
  return "10년 중 흐름이 유독 뚜렷하게 갈리는 몇 안 되는 해 중 하나입니다.";
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
    const evidence = buildEvidenceClauses(sk);
    const dayunTier = computeDayunTier(sk);

    const whyClause = buildWhyClause(item.isTransitionYear, evidence, dayunTier);
    const rankClause = buildRankClause(score, scores);
    const realLifeClause = firstSentence(entry.core);
    const transitionClause = item.isTransitionYear
      ? " 이 해를 기점으로 앞서 이어지던 방식과는 결이 달라지므로, 익숙했던 방식을 그대로 끌고 가기보다 새로 맞춰가는 자세가 필요합니다."
      : "";

    const reason = `${item.year}년은 ${whyClause}입니다. ${rankClause} ${realLifeClause}${transitionClause} ${entry.action}`;

    return { year: item.year, reason };
  });
}

// ────────────────────────────────────────────────────────────────
// ④ 이 10년을 지나가는 방법
// ────────────────────────────────────────────────────────────────

function buildClosing(segments: TenYearSegment[], highlights: TenYearHighlight[]): string {
  const first = segments[0];
  const last = segments[segments.length - 1];
  // 카테고리(5종) 동일 여부가 아니라 "실제 대운이 바뀌었는가"(segments가
  // 2개 이상이면 이미 그런 뜻)로 판단한다 — 편재→정재처럼 카테고리는 같아도
  // 실제 대운이 바뀌는 경우를 "변화 없음"으로 잘못 읽지 않기 위함.
  const changed = segments.length > 1;
  const highlightYears = highlights.map((h) => `${h.year}년`).join(", ");
  const firstGains = segmentGains(first);
  const lastGains = segmentGains(last);
  const lastPrepare = last.ganSipseong && SEGMENT_SUMMARY[last.ganSipseong] ? SEGMENT_SUMMARY[last.ganSipseong].prepare : "달라지는 흐름에 맞춰 조정하는 습관";
  const firstPrepare = first.ganSipseong && SEGMENT_SUMMARY[first.ganSipseong] ? SEGMENT_SUMMARY[first.ganSipseong].prepare : "지금의 방식을 꾸준히 이어가는 습관";

  const p1 = changed
    ? `이 10년을 관통하는 흐름 하나만 꼽는다면, ${firstGains}에서 ${lastGains}으로 무게 중심이 넘어간다는 점입니다. 앞부분에서 몸에 밴 방식을 한순간에 버릴 필요는 없습니다. 다만 뒷부분으로 갈수록 ${lastPrepare}을 조금씩 늘려가는 쪽이, 바뀐 흐름 위에서 덜 부딪히며 걸어가는 방법입니다.`
    : `이 10년은 ${firstGains}이 처음부터 끝까지 삶의 중심에 있는 구간입니다. 방식을 바꾸기보다, ${firstPrepare}을 꾸준히 이어가는 쪽이 이 흐름 위에서 가장 멀리 갈 수 있는 방법입니다.`;

  const p2 = `특히 ${highlightYears}은 앞뒤 해보다 변화의 폭이 크게 느껴질 수 있는 시기입니다. 이 해들을 미리 알고 있는 것만으로도, 막상 그 흐름이 왔을 때 당황하기보다 "아, 지금이 그때구나" 하고 받아들일 수 있는 여유가 생깁니다.`;

  const p3 = "10년 전체를 관통하는 원칙은 결국 하나입니다 — 같은 사람 안에서도 해마다 오는 결이 다르므로, 그 해에 실제로 두드러지는 것에 힘을 쓰고 나머지는 무리하게 끌고 가지 않는 것입니다. 10년을 한 번에 다 잘하려 하지 않아도 됩니다.";

  return [p1, p2, p3].join("\n\n");
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

  const items = years.map((y, i) => {
    const age = y - birthYear + 1;
    const period = periodsByYear[i]!;
    const prevPeriod = i > 0 ? periodsByYear[i - 1] : null;
    return buildYearItem(y, age, period, prevPeriod, sks[i], key.natalAxis);
  });

  const scores = items.map((item, i) => scoreYear(item, sks[i]));
  const segments = buildSegments(items, periodsByYear);
  const highlights = buildHighlights(items, scores, sks);

  return {
    intro: buildIntro(segments),
    segments,
    items,
    highlights,
    closing: buildClosing(segments, highlights),
  };
}
