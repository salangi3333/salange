import { AppData } from "./sajuContent";
import { Stage } from "./natalStructure";
import { LifeFlowKey, LifePhase, DaYunNatalRelation } from "./lifeFlowInterpretation";
import { SipseongCategory } from "./strengthAnalysis";
import { DaYunWealthPeriod } from "./daYunWealthAnalysis";
import { ZHI_HANGUL } from "./hanjaTables";

/**
 * 4챕터 이후 전환 구간 전용 NARRATIVE층. 새 5챕터 장문 풀이가 아니라,
 * publicPreview(무료)로 방향을 보여주고 lockedDetail(잠금)에 상세를 남기는
 * "전환 구간" 문장을 조립한다. 문장은 항상
 *   현실에서 먼저 느껴지는 변화 → 정확한 명리 근거 → 쉬운 뜻 →
 *   그 사람에게 나타나는 방식/기준 이동 → 이전과 무엇이 달라졌는지 →
 *   다음 궁금증
 * 순서를 따른다. A/B/C tier(내부 계산값)는 어떤 문장에도 노출하지 않는다.
 * 계산에 없는 관계(삼합/반합/천간합/형파해)나 사건 확정은 만들지 않는다.
 */

const STAGE_LABEL: Record<Stage, string> = {
  year: "초년의 자리", month: "사회로 나가는 자리", day: "자기 자신이 선 자리", hour: "말년의 자리",
};

function josaGwaWa(word: string): "과" | "와" {
  const last = word.charCodeAt(word.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return "와";
  return (last - 0xac00) % 28 === 0 ? "와" : "과";
}
function josaIGa(word: string): "이" | "가" {
  const last = word.charCodeAt(word.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return "가";
  return (last - 0xac00) % 28 === 0 ? "가" : "이";
}
function josaEunNeun(word: string): "은" | "는" {
  const last = word.charCodeAt(word.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return "는";
  return (last - 0xac00) % 28 === 0 ? "는" : "은";
}
/** 지지 한자(예: 巳/戌)는 유니코드 범위로 받침을 판정할 수 없다(한자는
 * 한글 음절 코드가 아니다) — ZHI_HANGUL로 실제 한글 발음을 구해 그걸로
 * 받침을 판정한다. */
function zhiJosaGwaWa(zhi: string): "과" | "와" {
  return josaGwaWa(ZHI_HANGUL[zhi] ?? zhi);
}
function zhiJosaRo(zhi: string): "로" | "으로" {
  const hangul = ZHI_HANGUL[zhi] ?? zhi;
  const last = hangul.charCodeAt(hangul.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return "로";
  const finalConsonant = (last - 0xac00) % 28;
  return finalConsonant === 0 || finalConsonant === 8 ? "로" : "으로"; // 받침 없음 또는 ㄹ받침 → 로
}

// ── 용어 사전(4챕터와 별도 파일에 독립적으로 유지 — 4챕터 Narrative는
// 건드리지 않는다는 원칙에 따라 의도적으로 중복 정의) ──────────────────
const SIPSEONG_HANJA: Record<string, string> = {
  비견: "比肩", 겁재: "劫財", 식신: "食神", 상관: "傷官",
  편재: "偏財", 정재: "正財", 편관: "偏官", 정관: "正官",
  편인: "偏印", 정인: "正印",
};
const SIPSEONG_GLOSS: Record<string, string> = {
  비견: "나와 같은 힘으로 나란히 서서, 스스로 판단하고 움직이게 하는 기운",
  겁재: "내 것을 나누거나 다시 다른 곳으로 움직이게 만드는 기운",
  식신: "서두르지 않고 차분하게 결과물을 만들어 쌓아가는 기운",
  상관: "생각한 것을 적극적으로 표현하고 벌이게 만드는 기운",
  편재: "기회와 자원을 움직이며 판을 넓히는 힘",
  정재: "그렇게 만든 것을 안정적으로 자리 잡게 하는 힘",
  편관: "상황 앞에서 즉각 움직이게 만드는 기운",
  정관: "정해진 기준과 책임을 지키게 하는 기운",
  편인: "남다른 방식으로 받아들이고 정리하는 기운",
  정인: "안정적으로 받아들이고 신뢰를 쌓아가는 기운",
};
const CATEGORY_HANJA: Record<SipseongCategory, string> = {
  비겁: "比劫", 식상: "食傷", 재성: "財星", 관성: "官星", 인성: "印星",
};
/** "삶의 앞자리에 있는 힘"을 부르는 표현 — 3챕터 coreLabel과는 다른,
 * 시간 흐름 전용 표현이다. */
const CATEGORY_LIFE_MEANING: Record<SipseongCategory, string> = {
  비겁: "스스로 판단하고 결정하려는 힘",
  식상: "안에 있던 생각을 밖으로 꺼내 표현하려는 힘",
  재성: "현실적인 결과를 만들어내는 힘",
  관성: "맡은 역할과 책임을 지키려는 힘",
  인성: "받아들이고 정리하려는 힘",
};
/** 국면이 바뀔 때 "판단의 기준"이 무엇에서 무엇으로 이동하는지 — 25개
 * 조합을 전부 손으로 쓰지 않고, 카테고리 하나당 "이 힘이 곧 판단 기준일 때
 * 무엇을 우선하는가"만 정의해 어느 (이전,다음) 조합에도 자연스럽게
 * 이어지도록 한다. */
const CATEGORY_JUDGMENT_BASIS: Record<SipseongCategory, string> = {
  비겁: "스스로 옳다고 판단한 것을 따르는 것",
  식상: "생각한 것을 자기 방식대로 표현하고 만들어내는 것",
  재성: "눈에 보이는 현실적 결과를 손에 쥐는 것",
  관성: "정해진 기준과 맡은 책임을 지키는 것",
  인성: "받아들이고 이해한 뒤 납득해서 움직이는 것",
};
/** 다음 시기에 무게가 실리는 "선택의 방향"만 열어둔다(결론 아님) —
 * 유료 심층 리포트에서 자세히 다룰 것을 전제로, 무엇과 무엇 사이의
 * 문제인지만 보여준다. */
const SELECTION_DIRECTION_BY_NEXT_AXIS: Record<SipseongCategory, string> = {
  비겁: "무엇을 더 벌이기보다 스스로 무엇을 결정할지",
  식상: "무엇을 지키기보다 무엇을 새로 표현하고 만들어낼지",
  재성: "무엇을 표현하기보다 무엇을 현실적인 결과로 남길지",
  관성: "무엇을 벌이기보다 무엇을 끝까지 책임지고 지킬지",
  인성: "무엇을 서두르기보다 무엇을 먼저 이해하고 받아들일지",
};
/** 잠금 목차 04("앞으로의 10년") 제목 조립용 */
const AXIS_VERB: Record<SipseongCategory, string> = {
  비겁: "스스로 서는 힘", 식상: "표현하던 힘", 재성: "결과를 쥐던 힘",
  관성: "책임지던 힘", 인성: "정리하던 힘",
};
/** 잠금 목차 01("일과 성취") 부제 — 원국 중심축 기준 */
const TOC_WORK_SUBTITLE: Record<SipseongCategory, { title: string; locked: string }> = {
  비겁: { title: "스스로 판단하는 힘이 성과로 이어지는 방식", locked: "스스로 정한 기준으로 밀어붙일 때 결과가 커지는 구조인지, 함께할 때 커지는 구조인지는 원국의 세력 관계에 따라 갈립니다." },
  식상: { title: "표현하고 만들어낸 것이 성과로 자리 잡는 방식", locked: "만든 결과물이 곧바로 성과로 이어지는지, 시간을 두고 쌓여야 이어지는지는 재성과의 연결 구조에 따라 달라집니다." },
  재성: { title: "손에 쥔 결과가 시기마다 다른 얼굴로 시험받는 이유", locked: "같은 재성이라도 정재와 편재 중 어느 쪽이 실제로 강한지에 따라, 성과를 만드는 방식 자체가 달라집니다." },
  관성: { title: "맡은 자리의 무게가 실제로 결과를 만들어내는 이유", locked: "책임이 성과로 이어지는지, 부담으로만 남는지는 비겁·식상과의 세력 관계에 따라 갈립니다." },
  인성: { title: "받아들이고 정리한 것이 성과로 바뀌는 방식", locked: "정리된 것을 실제로 밖으로 꺼내는 힘(식상)이 함께 있는지가, 성과로 이어지는지를 가르는 지점입니다." },
};
/** 잠금 목차 02("사랑과 인연") 부제 — 배우자궁(일지)의 정확한 십성 기준
 * (5개 카테고리가 아니라 10개 정확한 십성으로 구분해, 같은 카테고리라도
 * 편/정에 따라 다른 문장이 나오게 한다). */
const TOC_LOVE_SUBTITLE: Record<string, { title: string; locked: string }> = {
  비견: { title: "가까운 사람 앞에서도 나란히 서려는 마음이 반복되는 이유", locked: "태어난 날의 자리 자체가 스스로 서려는 힘을 띠고 있어, 가까운 관계에서도 그 성질이 반복해서 드러날 수 있습니다." },
  겁재: { title: "가까운 사이에서 주고받는 것의 균형이 자꾸 흔들리는 이유", locked: "태어난 날의 자리 자체가 나누거나 움직이려는 힘을 띠고 있어, 가까운 관계에서도 그 성질이 반복해서 드러날 수 있습니다." },
  식신: { title: "곁을 차분히 지키는 방식이 관계에서 드러나는 이유", locked: "태어난 날의 자리 자체가 차분히 쌓아가는 힘을 띠고 있어, 관계에서도 그 속도가 그대로 나타날 수 있습니다." },
  상관: { title: "마음을 감추지 못하고 그대로 드러내는 순간들", locked: "태어난 날의 자리 자체가 표현하려는 힘을 띠고 있어, 가까운 사이일수록 그 감정이 먼저 드러날 수 있습니다." },
  편재: { title: "태어난 날의 자리에 놓인 재물의 성질이 관계 안에서 나타나는 방식", locked: "일지가 편재라는 것은, 관계에서도 기회와 자원을 움직이려는 태도가 함께 드러날 수 있다는 뜻이 됩니다." },
  정재: { title: "태어난 날의 자리에 놓인 재물의 성질이 꾸준함으로 나타나는 방식", locked: "일지가 정재라는 것은, 관계에서도 안정적으로 자리 잡으려는 태도가 함께 드러날 수 있다는 뜻이 됩니다." },
  편관: { title: "배우자의 자리 자체에 책임의 무게가 자리한 이유", locked: "일지가 편관이라는 것은, 가까운 관계 자체가 즉각적인 판단과 책임의 문제와 맞닿아 있다는 뜻이 될 수 있습니다." },
  정관: { title: "배우자의 자리 자체가 기준과 신뢰의 문제로 이어지는 이유", locked: "일지가 정관이라는 것은, 가까운 관계 자체가 정해진 기준과 신뢰의 문제와 맞닿아 있다는 뜻이 될 수 있습니다." },
  편인: { title: "받아들이는 방식이 남다르게 관계에서 드러나는 이유", locked: "태어난 날의 자리 자체가 남다르게 받아들이려는 힘을 띠고 있어, 관계에서도 그 방식이 그대로 나타날 수 있습니다." },
  정인: { title: "안정적으로 받아들이는 방식이 가까운 관계에서 드러나는 이유", locked: "태어난 날의 자리 자체가 안정적으로 받아들이려는 힘을 띠고 있어, 관계에서도 그 속도가 그대로 나타날 수 있습니다." },
};

function termDisplay(term: string): string {
  const hanja = SIPSEONG_HANJA[term];
  return hanja ? `${term}(${hanja})` : term;
}
function glossOnFirstUse(term: string, usedTerms: Set<string>): string {
  if (usedTerms.has(term)) return "";
  usedTerms.add(term);
  const gloss = SIPSEONG_GLOSS[term];
  return gloss ? ` ${term}${josaEunNeun(term)} ${gloss}입니다.` : "";
}
function categoryFirstMention(category: SipseongCategory, usedTerms: Set<string>): string {
  const key = `cat:${category}`;
  const disp = `${category}(${CATEGORY_HANJA[category]})`;
  if (usedTerms.has(key)) return category;
  usedTerms.add(key);
  return disp;
}

// ────────────────────────────────────────────────────────────────
// ① 내 인생의 큰 흐름
// ────────────────────────────────────────────────────────────────

function buildOpeningSentence(name: string, key: LifeFlowKey): string {
  const { phases, natalAxis, currentPhaseIndex } = key;
  if (!natalAxis) {
    return `${name}님의 삶은 어느 한 힘이 유독 크게 앞서기보다, 여러 힘이 비슷한 크기로 자리를 주고받는 구조에 가깝습니다.`;
  }
  const axisPhaseIndex = phases.findIndex((p) => p.category === natalAxis);
  if (axisPhaseIndex === -1) {
    // 타고난 중심축은 분명하지만(natalAxis 존재), 지금 보이는 대운
    // 구간(약 80~90년)의 국면 중에는 그 축이 직접 등장하지 않는 경우 —
    // "균형 잡힌 사주"와는 다른 사실이라 구분해서 서술한다.
    return `${name}님의 삶은 타고난 가장 강한 힘이 지금 보이는 대운 국면 표면에는 직접 등장하지 않지만, 그 대신 다른 힘들이 번갈아 앞자리에 서며 인생을 이끌어 온 구조입니다.`;
  }
  // currentPhaseIndex 대비 위치로 판단한다 — 배열의 "맨 끝"인지가 아니라
  // "지금 시점을 기준으로 이미 지났는지/아직 안 왔는지"가 실제 서사에서
  // 중요하기 때문이다. 국면이 5~6개로 길게 이어지는 사람도 정확히 분류된다.
  if (axisPhaseIndex === currentPhaseIndex) {
    return `${name}님의 삶은 오랫동안 다른 힘들을 거쳐 오다가, 지금 이 순간에 이르러서야 태어날 때부터 가장 강했던 힘이 대운의 전면에 나서는 흐름입니다.`;
  }
  if (axisPhaseIndex > currentPhaseIndex) {
    return `${name}님의 삶은 하나의 힘이 처음부터 끝까지 이어지는 구조가 아닙니다. 시기마다 삶의 앞자리에 서는 힘이 바뀌고, 그 힘이 몇 차례 자리를 옮긴 뒤에야 비로소 태어날 때부터 갖고 있던 본래의 힘이 대운의 전면으로 올라옵니다.`;
  }
  if (axisPhaseIndex === 0) {
    return `${name}님의 삶은 타고난 힘이 아주 이른 시기부터 앞자리에 서는 구조입니다.`;
  }
  return `${name}님의 삶은 타고난 힘이 이미 한 차례 대운의 앞자리에 섰던 적이 있고, 지금은 다른 힘이 그 자리를 대신하고 있는 구조입니다.`;
}

/** 국면 하나를 상세하게 — lockedDetail 전용(전체 국면 서사). */
function buildPhaseParagraphFull(phase: LifePhase, prevPhase: LifePhase | null, index: number, usedTerms: Set<string>): string {
  if (!phase.category) {
    return `${phase.startAge}세부터 ${phase.endAge}세까지는 여러 힘이 섞여 뚜렷한 하나의 흐름으로 정리되지 않는 시기였습니다.`;
  }
  const years = phase.endAge - phase.startAge + 1;
  const meaning = CATEGORY_LIFE_MEANING[phase.category];
  const parts: string[] = [];

  if (index === 0) {
    parts.push(`인생의 첫 국면, ${phase.startAge}세부터 ${phase.endAge}세까지 ${years}년은 ${meaning}이 삶을 이끌었습니다.`);
  } else if (prevPhase?.category && prevPhase.category !== phase.category) {
    const fromBasis = CATEGORY_JUDGMENT_BASIS[prevPhase.category];
    const toBasis = CATEGORY_JUDGMENT_BASIS[phase.category];
    parts.push(`그러다 ${phase.startAge}세를 지나면서 삶의 기준이 달라집니다. 예전에는 ${fromBasis}이 판단의 중심이었다면, 이제는 ${toBasis}이 더 중요한 기준으로 올라올 수 있습니다.`);
  } else {
    parts.push(`${phase.startAge}세부터 ${phase.endAge}세까지 ${years}년도 이어서, ${meaning}이 삶을 이끕니다.`);
  }

  const distinctTerms = [...new Set(phase.periods.map((p) => p.ganSipseong))];
  const catMention = categoryFirstMention(phase.category, usedTerms);
  if (distinctTerms.length >= 2) {
    const [t1, t2] = distinctTerms;
    parts.push(
      `명리에서는 이 흐름을 ${catMention}—${termDisplay(t1)}${josaGwaWa(t1)} ${termDisplay(t2)}—의 흐름으로 읽습니다. 같은 ${phase.category}이라도 결은 다릅니다. ${t1}${josaEunNeun(t1)} ${SIPSEONG_GLOSS[t1]}에 가깝고, ${t2}${josaEunNeun(t2)} ${SIPSEONG_GLOSS[t2]}에 가깝습니다.`
    );
    usedTerms.add(t1); usedTerms.add(t2);
  } else {
    parts.push(`명리에서는 이 힘을 ${catMention}—${termDisplay(distinctTerms[0])}—의 흐름으로 읽습니다.${glossOnFirstUse(distinctTerms[0], usedTerms)}`);
  }

  if (phase.isNatalAxis) {
    parts.push(`${phase.category}${josaEunNeun(phase.category)} 명식 전체를 통틀어 가장 중심이 되는 축이기도 합니다.`);
  }

  return parts.join(" ");
}

/** 공개용 — 국면 전체를 나열하지 않고, 개요 한 문장 + 현재 국면만 깊게. */
function buildBigPicturePublic(name: string, key: LifeFlowKey, usedTerms: Set<string>): string[] {
  const { phases, currentPhaseIndex } = key;
  const opening = buildOpeningSentence(name, key);
  const spanStart = phases[0]?.startAge;
  const spanNote = phases.length >= 3 ? `지금까지 대운을 따라 이미 ${phases.length}번, 앞자리에 서는 힘이 바뀌어 왔습니다.` : `지금까지 대운을 따라 몇 차례 앞자리에 서는 힘이 바뀌었습니다.`;
  const p1 = `${opening} ${spanNote}`;

  const current = phases[currentPhaseIndex];
  const p2 = current ? buildPhaseParagraphFull(current, phases[currentPhaseIndex - 1] ?? null, currentPhaseIndex, usedTerms) : "";

  return [p1, p2].filter(Boolean);
}

function buildBigPictureLocked(key: LifeFlowKey, usedTerms: Set<string>): string[] {
  const { phases, currentPhaseIndex } = key;
  return phases
    .map((ph, i) => (i === currentPhaseIndex ? null : buildPhaseParagraphFull(ph, phases[i - 1] ?? null, i, usedTerms)))
    .filter((v): v is string => Boolean(v));
}

// ────────────────────────────────────────────────────────────────
// ② 나의 대운 흐름
// ────────────────────────────────────────────────────────────────

function describeRelationClause(rel: DaYunNatalRelation[]): string {
  if (rel.length === 0) return "";
  const r = rel[0];
  return ` 지지가 원국의 ${STAGE_LABEL[r.natalStage]}(${r.natalZhi})${zhiJosaGwaWa(r.natalZhi)} ${r.type === "합" ? "손을 잡는" : "부딪히는"} 관계에 있어, ${r.type === "합" ? "자연스럽게 이어지는" : "쌓아온 것이 한 번 흔들리는"} 국면이기도 합니다.`;
}

function buildPastSentence(past: DaYunWealthPeriod | null, brief: boolean): string {
  if (!past || !past.ganCategory) return "";
  const meaning = CATEGORY_LIFE_MEANING[past.ganCategory];
  if (brief) {
    return `${past.startAge}세부터 ${past.endAge}세까지 지나온 10년은, ${meaning}이 강하게 작용했던 시기입니다.`;
  }
  return `${past.startAge}세부터 ${past.endAge}세까지 지나온 10년은, ${meaning}이 강하게 작용했던 시기입니다. 대운 ${past.ganZhi}의 천간에는 ${termDisplay(past.ganSipseong)}${josaIGa(past.ganSipseong)} 자리했습니다.`;
}

function buildCurrentSentence(current: DaYunWealthPeriod | null, past: DaYunWealthPeriod | null, key: LifeFlowKey, usedTerms: Set<string>, brief: boolean): string {
  if (!current || !current.ganCategory) return "";
  const meaning = CATEGORY_LIFE_MEANING[current.ganCategory];
  const changed = past?.ganCategory && past.ganCategory !== current.ganCategory;

  const lead = changed
    ? `지금 지나고 있는 ${current.startAge}–${current.endAge}세는 결이 바뀝니다. 이전 10년과 달리, 지금은 ${meaning}이 앞자리에 섭니다.`
    : `지금 지나고 있는 ${current.startAge}–${current.endAge}세도 이어서, ${meaning}이 삶의 앞자리에 있습니다.`;

  if (brief) return lead;

  const disp = termDisplay(current.ganSipseong);
  let detail = ` 대운 ${current.ganZhi}의 천간에는 ${disp}${josaIGa(current.ganSipseong)} 자리합니다.${glossOnFirstUse(current.ganSipseong, usedTerms)}`;

  if (current.ganCategory === key.natalAxis) {
    detail += ` ${current.ganCategory}${josaEunNeun(current.ganCategory)} 타고난 중심축과 같은 성질의 힘이라, 원래 강했던 힘이 지금 대운에서 한 번 더 강조되는 흐름이기도 합니다.`;
  } else {
    const hiddenAxis = current.zhiHidden.find((z) => z.category === key.natalAxis);
    if (hiddenAxis) {
      detail += ` 지지 지장간(${hiddenAxis.position})에는 ${termDisplay(hiddenAxis.sipseong)}—타고난 중심축과 같은 성질의 힘—이 함께 있어, 겉으로 드러나는 것과는 별개로 그 힘도 안쪽에서 계속 움직이고 있습니다.`;
    }
  }
  detail += describeRelationClause(key.relations.current);

  return `${lead}${detail}`;
}

function buildNextTease(next: DaYunWealthPeriod | null, current: DaYunWealthPeriod | null, key: LifeFlowKey, reveal: boolean): string {
  if (!next || !next.ganCategory) return "이후 대운 정보가 아직 없어 다음 시기의 변화는 비교할 수 없습니다.";
  const sameCategory = current?.ganCategory === next.ganCategory;

  if (sameCategory) {
    const rel = describeRelationClause(key.relations.next);
    const lead = `앞으로 ${next.startAge}세부터는 지금의 흐름 자체는 이어지지만, 대운이 ${next.ganZhi}${zhiJosaRo(next.ganZhi[1])} 넘어가며 안쪽의 결이 달라집니다.`;
    if (!reveal) {
      return `${lead}${rel} 무엇이 어떻게 달라지는지는 다음 기록에서 이어집니다.`;
    }
    return `${lead}${rel} 지금까지의 방식 위에서 ${SELECTION_DIRECTION_BY_NEXT_AXIS[next.ganCategory]}를 판단하는 일이 중요해질 수 있습니다.`;
  }

  const lead = `앞으로 ${next.startAge}세부터는 지금과는 성질이 다른 힘이 삶의 앞자리에 들어섭니다. 대운이 ${next.ganZhi}${zhiJosaRo(next.ganZhi[1])} 넘어갑니다.`;
  const rel = describeRelationClause(key.relations.next);
  if (!reveal) {
    return `${lead}${rel} 무엇이 어떻게 달라지는지는 다음 기록에서 이어집니다.`;
  }
  return `${lead}${rel} 지금까지의 방식 위에서 ${SELECTION_DIRECTION_BY_NEXT_AXIS[next.ganCategory]}를 판단하는 일이 중요해질 수 있습니다.`;
}

/** 과거/현재/다음 대운 문장을 배열이 아니라 이름표가 붙은 자리로 반환한다.
 * 예전에는 [pastSentence, currentSentence, nextTease].filter(Boolean)로
 * 배열을 만들었는데, past나 current가 없는 사용자(첫 대운을 지나는 중이라
 * 과거가 없는 경우 / 마지막 대운을 이미 지나 현재가 없는 경우)는 그 자리가
 * 통째로 빠지면서 뒤 항목들이 앞으로 밀렸다 — 화면이 배열 인덱스([0]="지나온
 * 시간", [1]="지금")로 값을 꺼내 쓰다 보니 "지금" 카드에 다음 대운 얘기가
 * 뜨는 등 라벨과 내용이 어긋났다. past/current/next 각각 없으면 빈 문자열을
 * 그대로 반환해 자리를 지키고, 화면 쪽에서 각 필드를 이름으로 꺼내 쓰게
 * 한다(빈 문자열이면 그 카드 자체를 렌더링하지 않는다). */
export interface DaYunFlowText {
  past: string;
  current: string;
  next: string;
}

function buildDaYunFlowPublic(key: LifeFlowKey, usedTerms: Set<string>): DaYunFlowText {
  const { past, current, next } = key.daYun;
  return {
    past: buildPastSentence(past, true),
    current: buildCurrentSentence(current, past, key, usedTerms, true),
    next: buildNextTease(next, current, key, false),
  };
}

function buildDaYunFlowLocked(key: LifeFlowKey, usedTerms: Set<string>): DaYunFlowText {
  const { past, current, next } = key.daYun;
  return {
    past: buildPastSentence(past, false),
    current: buildCurrentSentence(current, past, key, usedTerms, false),
    next: buildNextTease(next, current, key, true),
  };
}

// ────────────────────────────────────────────────────────────────
// ③ 아직 펼쳐지지 않은 기록
// ────────────────────────────────────────────────────────────────

export interface TocItem {
  title: string;
  subtitle: string;
  lockedPreview: string;
}

function buildToc(key: LifeFlowKey): TocItem[] {
  const { natalAxis, secondAxis, dayBranchSipseong, nextPhaseTransitionAge, phases, currentPhaseIndex } = key;
  const items: TocItem[] = [];

  const workBase = natalAxis ? TOC_WORK_SUBTITLE[natalAxis] : { title: "여러 힘이 만나 성과로 바뀌는 방식", locked: "어느 한 힘이 아니라 여러 힘의 균형이 성과를 만드는 구조입니다." };
  // 원국 중심축만으로는 5가지뿐이라 2위 축을 함께 반영해 조합 수를 늘린다 —
  // 새 근거가 아니라 이미 계산된 strengthAnalysis 2위 축을 조합에 쓰는 것뿐.
  // 잠금 미리보기 문장도 같은 조합으로 만들어, 같은 중심축이라도 2위 축이
  // 다르면 실제로 다른 문장이 나오게 한다.
  const workSubtitle = natalAxis && secondAxis ? `${workBase.title} — ${AXIS_VERB[secondAxis]}과 맞물리는 지점` : workBase.title;
  // secondAxis까지 같은 사람끼리도(예: 둘 다 식상-재성) 지금 지나는 대운의
  // 정확한 십성은 다르므로, 그 실제 근거를 더해 문장을 마저 갈라놓는다.
  const currentTermNote = key.daYun.current?.ganSipseong
    ? ` 지금 지나는 대운의 ${termDisplay(key.daYun.current.ganSipseong)}이 그 답의 실마리가 됩니다.`
    : "";
  const workLocked = secondAxis
    ? `${workBase.locked} 지금은 ${AXIS_VERB[secondAxis]}과의 관계가 그 답의 절반을 쥐고 있습니다.${currentTermNote}`
    : `${workBase.locked}${currentTermNote}`;
  items.push({ title: "일과 성취", subtitle: workSubtitle, lockedPreview: workLocked });

  const love = TOC_LOVE_SUBTITLE[dayBranchSipseong] ?? { title: "가까운 관계에서 반복되는 방식", locked: "태어난 날의 자리가 품은 성질이 관계에서도 반복될 수 있습니다." };
  // 일지 십성(10종)만으로도 상당수 갈리지만, 원국 중심축·2위 축까지 더해
  // 조합 수를 늘린다(일지 카테고리가 중심축과 같은 사람끼리도 2위 축은
  // 다를 수 있어, 그 경우까지 실제로 다른 문장이 나오게 한다).
  const loveLocked =
    natalAxis && secondAxis
      ? `${love.locked} 여기에 ${natalAxis}${josaGwaWa(natalAxis)} ${secondAxis}의 관계까지 더해지면, 관계를 대하는 방식이 한층 더 뚜렷하게 드러납니다.`
      : love.locked;
  items.push({ title: "사랑과 인연", subtitle: love.title, lockedPreview: loveLocked });

  const current = phases[currentPhaseIndex];
  if (nextPhaseTransitionAge && current?.category) {
    items.push({
      title: "인생의 전환점",
      subtitle: `${nextPhaseTransitionAge}세, 삶의 기준이 달라지는 경계`,
      lockedPreview: `${nextPhaseTransitionAge}세를 지나면 ${CATEGORY_LIFE_MEANING[current.category]}이 이끌던 국면이 끝나고, 새로운 힘이 앞자리에 섭니다. 그 경계에서 실제로 무엇이 바뀌는지는 대운과 원국의 관계로 확인할 수 있습니다.`,
    });
  } else {
    items.push({ title: "인생의 전환점", subtitle: "지금까지 지나온 국면들이 남긴 것", lockedPreview: "지나온 국면들이 지금의 삶에 어떻게 이어지고 있는지를 다룹니다." });
  }

  const nextAxisVerb = current?.category ? AXIS_VERB[current.category] : "지금의 흐름";
  const nextGanZhi = key.daYun.next?.ganZhi;
  items.push({
    title: "앞으로의 10년",
    subtitle: `${nextAxisVerb} 다음, 다가오는 다음 흐름이 열어놓는 선택`,
    lockedPreview: nextGanZhi
      ? `다음 대운 ${nextGanZhi}의 천간·지지·지장간이 원국과 만나 실제로 무엇을 선택할 때인지를 다룹니다.`
      : "다음 대운의 천간·지지·지장간이 원국과 만나 실제로 무엇을 선택할 때인지를 다룹니다.",
  });

  return items;
}

// ────────────────────────────────────────────────────────────────

/** 화면의 국면 타임라인(LifePhaseTimeline)이 그대로 그릴 수 있는 최소
 * 표시용 요약 — tier·raw score 등 내부 판정값은 담지 않는다. 카테고리
 * 라벨은 이미 한글(비겁/식상/재성/관성/인성)이라 그대로 노출해도 된다. */
export interface PhaseSummary {
  startAge: number;
  endAge: number;
  categoryLabel: string;
  isCurrent: boolean;
  isNatalAxis: boolean;
}

export interface LifeFlowContent {
  title: string;
  killpoint: string;
  phases: PhaseSummary[];
  bigPicturePublic: string[];
  bigPictureLocked: string[];
  daYunFlowPublic: DaYunFlowText;
  daYunFlowLocked: DaYunFlowText;
  toc: TocItem[];
}

function buildPhaseSummaries(key: LifeFlowKey): PhaseSummary[] {
  return key.phases.map((ph, i) => ({
    startAge: ph.startAge,
    endAge: ph.endAge,
    categoryLabel: ph.category ?? "혼재",
    isCurrent: i === key.currentPhaseIndex,
    isNatalAxis: ph.isNatalAxis,
  }));
}

export function buildLifeFlowNarrative(appData: AppData, key: LifeFlowKey): LifeFlowContent {
  const name = appData.user.name;
  const title = `${name}님의 인생, 시간의 흐름으로 읽다`;
  const killpoint = buildOpeningSentence(name, key);
  const phases = buildPhaseSummaries(key);

  const usedTermsPublic = new Set<string>();
  const bigPicturePublic = buildBigPicturePublic(name, key, usedTermsPublic);
  const daYunFlowPublic = buildDaYunFlowPublic(key, usedTermsPublic);

  // 잠금부는 공개부와 용어가 겹쳐도 다시 뜻을 달지 않도록 usedTerms를 이어서 쓴다.
  const bigPictureLocked = buildBigPictureLocked(key, usedTermsPublic);
  const daYunFlowLocked = buildDaYunFlowLocked(key, usedTermsPublic);

  const toc = buildToc(key);

  return { title, killpoint, phases, bigPicturePublic, bigPictureLocked, daYunFlowPublic, daYunFlowLocked, toc };
}
