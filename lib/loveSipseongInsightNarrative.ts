import { AppData } from "./sajuContent";
import { analyzeSpouseStar, SpouseStarProfile, SpouseStarSubtype, SpouseStarSubtypeBreakdown } from "./spouseStarAnalysis";
import { analyzeDayMasterBalance, BalanceVerdict } from "./dayMasterBalanceAnalysis";
import { analyzeRoot, analyzeBranchRelations } from "./natalStructure";
import { buildChapterThreeKey } from "./chapterThreeInterpretation";

/**
 * 第四章 3차 보강(승인된 작업, 2026-09) — "사랑을 움직이는 나의 십성".
 * 기존 ①~⑨(HOW: 어떻게 나타나는가)와 역할을 분리한다 — 이 파일은
 * WHY(명리적으로 왜 그런 구조가 만들어지는가)만 다룬다. 같은 신호를
 * 다시 쓰더라도 "행동 묘사"를 반복하지 않고 "그 행동이 나오는 명리적
 * 배경"만 새로 쓴다.
 *
 * 새 계산을 하지 않는다 — 전부 이미 동결된 함수 재호출뿐이다.
 *  - analyzeSpouseStar(user, gender): subtypes[].visible/rooted/hidden,
 *    strength.monthScore(카테고리별 월령 점수, 이미 존재), yongsinRelation,
 *    huisinRelation.
 *  - buildChapterThreeKey(appData).gwansal: 편관/정관이 각각 어느
 *    기둥에 있는지(pyeongwan/jeonggwan.stage) 이미 계산됨.
 *  - analyzeDayMasterBalance(user).balance
 *  - analyzeRoot(user).hasRoot(일간 자신의 통근)
 *  - analyzeBranchRelations(user): 일지가 낀 원국 내부 합충(⑥이 이미
 *    쓰는 것과 동일 계산, 여기서는 "왜 그런지"에 재사용)
 *
 * 선정 기준(십성 2~3개, 새 계산 없이 이미 있는 값만으로 결정):
 *  1. 배우자성 우세 subtype(이미 ①③⑤가 쓰는 subtypeFocusOf와 동일 비교) — 항상 포함.
 *  2. 일지(배우자궁) 십성 — 우세 subtype과 같은 글자면(=isDayBranch이고
 *     같은 subtype) 1번에 합쳐서 쓰고 별도 슬롯을 만들지 않는다(같은
 *     힘을 두 번 나열하지 않기 위함).
 *  3. 관살혼잡(편관+정관 둘 다 존재)이 있을 때만 — 배우자성 카테고리가
 *     관성(여성)이면 1번과 사실상 같은 축이라 1번 설명에 합치고, 재성
 *     (남성)이면 완전히 별개 구조라 3번째 슬롯으로 추가한다.
 */

export interface NarrativeParagraph {
  text: string;
  sourceNote: string;
}

export interface LoveSipseongPick {
  heading: string;
  paragraphs: NarrativeParagraph[];
}

export interface LoveSipseongInsightResult {
  intro: string;
  picks: LoveSipseongPick[];
}

const SIPSEONG_HANJA: Record<string, string> = {
  비견: "比肩", 겁재: "劫財", 식신: "食神", 상관: "傷官",
  편재: "偏財", 정재: "正財", 편관: "偏官", 정관: "正官",
  편인: "偏印", 정인: "正印",
};

const DEFINITION: Record<string, string> = {
  정관: "쉽게 말하면, 정관은 정해진 기준과 질서를 지키려는 힘입니다. 관계에서 책임·신뢰·약속을 지키는 태도와 연결해서 읽습니다.",
  편관: "쉽게 말하면, 편관은 상황이 요구하는 대로 즉각 움직이는 힘입니다. 관계에서 긴장·책임·순발력과 연결해서 읽습니다.",
  정재: "쉽게 말하면, 정재는 꾸준하고 안정적으로 쌓아가는 힘입니다. 관계에서 반복되는 약속과 신뢰를 다지는 태도와 연결해서 읽습니다.",
  편재: "쉽게 말하면, 편재는 기회와 자원을 넓게 움직이는 힘입니다. 관계에서 유연함과 상황 대응력과 연결해서 읽습니다.",
  식신: "쉽게 말하면, 식신은 서두르지 않고 차분히 결과를 만드는 힘입니다. 관계에서 일상을 편안하게 나누는 태도와 연결해서 읽습니다.",
  상관: "쉽게 말하면, 상관은 생각과 감정을 적극적으로 표현하는 힘입니다. 관계에서 솔직한 표현과 연결해서 읽습니다.",
  비견: "쉽게 말하면, 비견은 스스로 판단하고 나서는 힘입니다. 관계에서 대등함과 각자의 영역을 지키는 태도와 연결해서 읽습니다.",
  겁재: "쉽게 말하면, 겁재는 가진 것을 나누고 움직이려는 힘입니다. 관계에서 몫을 분명히 하려는 태도와 연결해서 읽습니다.",
  정인: "쉽게 말하면, 정인은 안정적으로 받아들이고 신뢰를 쌓는 힘입니다. 관계에서 곁을 지켜주는 태도와 연결해서 읽습니다.",
  편인: "쉽게 말하면, 편인은 남다른 방식으로 받아들이고 정리하는 힘입니다. 관계에서 자기만의 공간을 지키려는 태도와 연결해서 읽습니다.",
};

type BalanceGroup = "신강계열" | "신약계열" | "중화";
function balanceGroupOf(balance: BalanceVerdict): BalanceGroup {
  if (balance === "clearlyStrong" || balance === "slightlyStrong") return "신강계열";
  if (balance === "clearlyWeak" || balance === "slightlyWeak") return "신약계열";
  return "중화";
}

function termDisplay(term: string): string {
  const hanja = SIPSEONG_HANJA[term];
  return hanja ? `${term}(${hanja})` : term;
}

function subtypeFocusOf(star: SpouseStarProfile): "subA" | "subB" | "balanced" {
  const [a, b] = star.subtypes;
  const countA = a.visible.length + a.rooted.length + a.hidden.length;
  const countB = b.visible.length + b.rooted.length + b.hidden.length;
  if (countA > countB) return "subA";
  if (countB > countA) return "subB";
  return "balanced";
}

function shapeOf(sub: SpouseStarSubtypeBreakdown): "visible" | "rooted" | "hidden" | "none" {
  if (sub.visible.length > sub.rooted.length && sub.visible.length > sub.hidden.length) return "visible";
  if (sub.hidden.length > sub.visible.length && sub.hidden.length > sub.rooted.length) return "hidden";
  if (sub.rooted.length > sub.visible.length && sub.rooted.length > sub.hidden.length) return "rooted";
  return "none";
}

const POSITION_TEXT_BY_SHAPE: Record<"visible" | "rooted" | "hidden" | "none", string> = {
  visible: "이 힘은 천간이나 지지에 그대로 드러나 있습니다. 겉으로 보이는 모습과 실제 속마음이 크게 다르지 않은 구조입니다.",
  rooted: "이 힘은 지지 속(지장간)에 숨어 있지만, 그 뿌리가 실제로 겉으로 드러난 다른 글자와 이어져 있습니다(투간). 평소엔 잘 안 보여도 실제로는 꾸준히 작동하는 힘입니다.",
  hidden: "이 힘은 지지 속(지장간)에만 있고, 겉으로 이어지는 뿌리는 아직 드러나 있지 않습니다. 겉모습만 봐서는 잘 짐작되지 않는, 속에 숨어 있는 힘에 가깝습니다.",
  none: "이 힘은 명식 안에서 특별히 뚜렷한 자리를 차지하고 있지는 않습니다.",
};

const MONTH_SCORE_TEXT = (score: number): string => {
  if (score >= 2) return "이 힘은 태어난 달의 기운과도 잘 맞아떨어져(월령), 원래부터 비교적 힘을 받고 태어난 편입니다.";
  if (score <= -1) return "다만 태어난 달의 기운은 이 힘과 결이 달라(월령), 이 힘이 온전히 힘을 받지 못하고 태어난 편입니다.";
  return "태어난 달의 기운은 이 힘에 특별히 힘을 보태지도 빼지도 않는 편입니다.";
};

function combineWithBalance(group: BalanceGroup, isWinner: boolean, isMatch: boolean): string {
  const need = isWinner
    ? "이 힘은 이 사람에게 원래 필요한 힘(용신)이기도 해서,"
    : isMatch
      ? "이 힘은 이 사람이 원하는 방향을 뒤에서 밀어주는 힘(희신)이기도 해서,"
      : "이 힘 자체가 이 사람에게 결정적으로 필요한 힘은 아니지만,";
  if (group === "신강계열") return `${need} 스스로 감당하는 힘이 큰 이 사람은 이 힘을 비교적 여유 있게 다룰 수 있습니다. 그래서 이 힘이 관계에서 부담보다 자기다움으로 드러나기 쉽습니다.`;
  if (group === "신약계열") return `${need} 감당하는 힘이 상대적으로 여린 이 사람에게는 이 힘이 때로 버겁게 느껴질 수 있습니다. 그래서 이 힘이 관계에서 여유보다 애씀으로 드러나기 쉽습니다.`;
  return `${need} 감당하는 힘이 크게 넘치거나 모자라지 않은 이 사람에게는, 이 힘이 관계에서 균형 잡힌 모습으로 드러나기 쉽습니다.`;
}

type PickRole = "primary" | "secondary" | "gwansal";

/**
 * 강점/어려움 문단 — group(신강/신약/중화) × role(슬롯 역할) 총 9갈래로
 * 분리한다. role을 두는 이유: ⑩(배우자성 우세형)·⑪(배우자궁 일지)·⑫(관살혼잡)는
 * 같은 사람의 report 안에서 group이 우연히 같아지는 경우가 실제로 있는데
 * (예: S05), role별로 문장 자체를 다르게 써서 그 경우에도 "같은 이야기를
 * 두 번" 쓰지 않도록 한다. primary만 favorable(실제 계산값)로 한 번 더
 * 갈라지고, secondary/gwansal은 애초에 신뢰할 만한 favorable 신호가 없어
 * role 고유 문장 하나로 고정한다(추측성 favorable을 만들어 붙이지 않는다).
 */
function strengthAndDifficulty(group: BalanceGroup, role: PickRole, favorable: boolean): { strength: string; difficulty: string } {
  if (group === "신강계열") {
    if (role === "primary") {
      return {
        strength: favorable ? "이 힘을 원래 잘 받쳐줄 수 있는 그릇이라, 관계에서 이 힘이 안정적인 강점으로 작동하기 쉽습니다." : "이 힘을 감당할 여력 자체는 있어서, 부담으로 느껴져도 무너지지는 않는 편입니다.",
        difficulty: "다만 여유가 있는 만큼 스스로 이 힘을 얼마나 쓰고 있는지 잘 못 느낄 수 있어, 상대가 그 무게를 대신 느끼게 될 수 있습니다.",
      };
    }
    if (role === "secondary") {
      return {
        strength: "배우자 자리(일지)에 놓인 이 힘도 무리 없이 받아들일 여력이 있어, 가까운 관계 안에서 이 자리가 부담보다는 안정감으로 작동하기 쉽습니다.",
        difficulty: "다만 그 여유 때문에 상대가 이 자리에서 얼마나 편안함을 느끼는지, 이 사람 스스로는 굳이 확인하지 않고 넘어갈 수 있습니다.",
      };
    }
    return {
      strength: "여러 기준이 동시에 걸려도 감당할 그릇 자체는 있어서, 겉으로 크게 흔들리는 모습은 잘 보이지 않습니다.",
      difficulty: "다만 그 그릇만 믿고 있으면, 각 기준을 얼마나 성실히 조율하고 있는지는 스스로도 놓치기 쉬워 관계 안에서 소홀함으로 비칠 수 있습니다.",
    };
  }
  if (group === "신약계열") {
    if (role === "primary") {
      return {
        strength: "이 힘이 있다는 것 자체가, 겉으로 여려 보여도 마음 안에는 분명한 결이 있다는 뜻입니다.",
        difficulty: favorable ? "다만 원래 필요한 힘인 만큼, 이 힘을 채우는 관계가 아니면 유독 허전함을 느끼기 쉽습니다." : "다만 이 힘을 다룰 여력이 크지 않아, 관계 안에서 이 힘 때문에 지치는 순간이 반복될 수 있습니다.",
      };
    }
    if (role === "secondary") {
      return {
        strength: "배우자 자리(일지)에 이 힘이 놓여 있다는 것은, 편안해지고 싶은 마음의 방향이 뚜렷하다는 뜻이기도 합니다.",
        difficulty: "다만 그 자리를 스스로 감당할 여력은 크지 않아서, 관계가 가까워질수록 이 자리를 지키는 데 자기도 모르게 힘이 부칠 수 있습니다.",
      };
    }
    return {
      strength: "여러 기준이 동시에 걸리는 걸 예민하게 알아차리는 감각 자체는 이 사람의 강점입니다.",
      difficulty: "다만 그걸 다 감당할 여력은 크지 않아, 관계 안에서 여러 기준을 동시에 신경 쓰다 쉽게 지칠 수 있습니다.",
    };
  }
  if (role === "primary") {
    return {
      // 재물(wealthInsightNarrative.ts)의 같은 "중화+main" 분기와 문장이
      // 겹쳤던 지점(통합 독서 QA #2) — 같은 사실(중화라 이 힘을 한쪽으로
      // 몰지 않는다)을 사랑 챕터의 실제 주제인 "관계 안에서 상대에게
      // 맞추는 정도"로 옮겨 쓴다. 결론(균형 때문에 강점이 도드라지지
      // 않음)은 동일하게 보존하되, 그 결론이 적용되는 장면을 관계로
      // 바꿨다.
      strength: "이 힘을 관계 안에서 한쪽으로 몰아쓰지 않고, 상대나 상황에 맞춰 조절하는 편입니다.",
      difficulty: "다만 그렇게 맞추는 데 익숙해서, 정작 이 힘이 이 사람의 확실한 강점이라는 걸 상대가 잘 알아채지 못할 수 있습니다.",
    };
  }
  if (role === "secondary") {
    return {
      strength: "배우자 자리(일지)에서도 한쪽으로 치우치지 않고 균형 있게 반응하는 편이라, 관계 안에서 극단적인 모습을 잘 보이지 않습니다.",
      difficulty: "다만 그 균형 때문에, 이 자리가 이 사람에게 실제로 얼마나 중요한지 상대가 뚜렷하게 느끼기 어려울 수 있습니다.",
    };
  }
  return {
    strength: "여러 기준이 동시에 걸려도 어느 한쪽에 치우치지 않고 그때그때 맞춰가는 유연함이 있습니다.",
    difficulty: "다만 그렇게 맞추는 과정 자체가 잘 드러나지 않아, 얼마나 애쓰고 있는지 상대가 모르고 지나갈 수 있습니다.",
  };
}

function buildPick(
  heading: string,
  sipseong: string,
  positionText: string,
  originText: string,
  comboText: string,
  group: BalanceGroup,
  role: PickRole,
  favorable: boolean
): LoveSipseongPick {
  const sd = strengthAndDifficulty(group, role, favorable);
  return {
    heading,
    paragraphs: [
      { text: DEFINITION[sipseong] ?? "", sourceNote: `정의(${sipseong})` },
      { text: positionText, sourceNote: `위치/상태(${sipseong})` },
      { text: originText, sourceNote: `사랑에서의 마음-기원(${sipseong})` },
      { text: comboText, sourceNote: `조합해석(${sipseong})` },
      { text: `${sd.strength} ${sd.difficulty}`, sourceNote: `강점/어려움(${sipseong})` },
    ],
  };
}

// 통합 독서 QA #3 — "이 힘이 X를 향해 작동할 때는.../왜 이 사람이
// Y하는지는 이 힘이 원래 Z이기 때문입니다" 골격이 10개 전부 동일해
// 반복으로 느껴진다는 지적을 반영해, 문장 진입 방식만 다양화했다.
// 각 문장이 담은 3가지(따옴표 속 관계 태도/WHY 명리 근거/결론)는
// 전부 그대로 보존했다 — 순서와 접속만 바꿨다.
const ORIGIN_TEXT: Record<string, string> = {
  정관: "관계에서 이 사람이 먼저 확인하는 건 감정이 아니라 '정해진 기준'입니다. 정관은 원래 질서와 약속을 지키려는 힘이라, 신뢰가 꾸준히 이어지는지부터 보게 됩니다.",
  편관: "흐릿한 관계를 유독 못 견딥니다. 상황 앞에서 분명한 태도를 요구하는 편관의 성질 때문에, 관계에서도 '즉각적인 확신'부터 찾으려는 마음이 먼저 나섭니다.",
  정재: "한 번의 큰 이벤트보다 매일의 작은 약속이 이 사람에게는 더 크게 다가옵니다. 꾸준함으로 쌓이는 정재의 성질이 관계에서는 '반복되는 확인'으로 안심하려는 마음으로 나타나기 때문입니다.",
  편재: "한 가지 방식에 얽매이는 걸 답답해하는 사람입니다. 기회와 자원을 움직이며 넓혀가는 편재의 힘이 관계에서도 '유연하게 넓히려는' 마음으로 그대로 옮겨옵니다.",
  식신: "특별한 이벤트보다 일상의 대화를 소중히 여깁니다. 서두르지 않고 쌓아가는 식신다운 성질이 관계에서는 '차분한 반복'을 편안해하는 마음으로 나타납니다.",
  상관: "참는 관계를 유독 힘들어합니다. 생각과 감정을 밖으로 꺼내려는 상관의 힘이 그대로 이어져, 관계에서도 '숨기지 않고 꺼내려는' 마음이 먼저 움직이기 때문입니다.",
  비견: "일방적으로 맞추거나 맞춰지는 관계를 불편해합니다. 스스로 판단하고 나서려는 비견의 성질 때문에, 관계에서도 먼저 '대등함'부터 확인하려 합니다.",
  겁재: "애매하게 넘어가는 관계를 못 견디는 편입니다. 가진 것을 나누고 움직이려는 겁재의 힘이 관계에서는 '몫의 확인'을 먼저 하려는 마음으로 드러나기 때문입니다.",
  정인: "힘들 때 먼저 다가와 주는 사람에게 유독 마음을 엽니다. 안정적으로 받아들이고 신뢰를 쌓는 정인의 성질이 관계에서는 '곁을 지켜주는지'부터 확인하려는 마음으로 이어집니다.",
  편인: "캐묻는 관심을 유독 부담스러워합니다. 남다른 방식으로 받아들이고 정리하는 편인의 힘 때문에, 관계에서도 '자기만의 방식'을 지키려는 마음이 먼저 섭니다.",
};

export function generateLoveSipseongInsightNarrative(appData: AppData, gender: "male" | "female"): LoveSipseongInsightResult {
  const star = analyzeSpouseStar(appData.user, gender);
  const balanceResult = analyzeDayMasterBalance(appData.user);
  const root = analyzeRoot(appData.user);
  const gwansal = buildChapterThreeKey(appData).gwansal;
  const group = balanceGroupOf(balanceResult.balance);

  const focus = subtypeFocusOf(star);
  const [subA, subB] = star.subtypes;
  const primarySub: SpouseStarSubtypeBreakdown = focus === "subB" ? subB : subA;
  const primaryShape = shapeOf(primarySub);
  const favorable = star.strength.monthScore >= 2 || star.strength.touScore > 0;

  const picks: LoveSipseongPick[] = [];

  // ── 1번 슬롯: 배우자성 우세형(항상 포함) ──────────────────────────
  const rootClause = root.hasRoot
    ? " 이 사람 자신의 기반(일간)도 뿌리가 있는 편이라, 이 힘을 받아들일 그릇 자체는 마련되어 있습니다."
    : " 다만 이 사람 자신의 기반(일간)은 상대적으로 여린 편이라, 이 힘을 받아들이는 게 때때로 스스로를 흔드는 일이 될 수 있습니다.";
  picks.push(
    buildPick(
      `⑩ 사랑을 움직이는 힘 — ${termDisplay(primarySub.subtype)}`,
      primarySub.subtype,
      `${POSITION_TEXT_BY_SHAPE[primaryShape]} ${MONTH_SCORE_TEXT(star.strength.monthScore)}`,
      ORIGIN_TEXT[primarySub.subtype] ?? "",
      `${combineWithBalance(group, star.yongsinRelation.isWinner, star.huisinRelation.isMatch)}${rootClause}`,
      group,
      "primary",
      favorable
    )
  );

  // ── 2번 슬롯: 일지(배우자궁) 십성 — 1번과 다른 글자일 때만 ──────────
  const daySipseong = appData.user.pillars.branches.day.sipseong;
  const sameAsPrimary = daySipseong === primarySub.subtype;
  if (!sameAsPrimary && DEFINITION[daySipseong]) {
    const rel = analyzeBranchRelations(appData.user);
    const heCount = rel.he.filter((p) => p.a.stage === "day" || p.b.stage === "day").length;
    const chongCount = rel.chong.filter((p) => p.a.stage === "day" || p.b.stage === "day").length;
    const relText =
      heCount > 0 || chongCount > 0
        ? " 원국 안에서 이 자리는 다른 자리와 합 또는 충으로 이어져 있어, 이 힘이 혼자 고립돼 있지 않고 원국의 다른 부분과도 영향을 주고받습니다."
        : " 원국 안에서 이 자리는 다른 자리와 직접 합·충으로 얽혀 있지는 않아, 비교적 독립적으로 작동하는 힘입니다.";
    const matchText = star.isDayBranch
      ? "흥미로운 점은, 배우자를 상징하는 자리(일지) 자체가 배우자성이 뚜렷하게 드러나는 자리이기도 하다는 것입니다. 마음이 끌리는 힘과 편안해지는 자리가 원래 같은 곳에서 나옵니다."
      : "배우자를 상징하는 자리(일지)와, 마음이 끌리는 배우자성이 서로 다른 글자라는 점이 중요합니다. 명리에서 일지는 '내가 편안해지는 자리', 배우자성은 '내가 끌리는 힘'으로 서로 다른 원리로 정해지기 때문에, 끌리는 유형과 편안해지는 관계가 다르게 나타날 수 있습니다.";
    picks.push(
      buildPick(
        `⑪ 배우자 자리에 놓인 힘 — ${termDisplay(daySipseong)}`,
        daySipseong,
        `이 힘은 배우자를 상징하는 자리(일지)에 직접 놓여 있습니다.${relText}`,
        ORIGIN_TEXT[daySipseong] ?? "",
        matchText,
        group,
        "secondary",
        true
      )
    );
  }

  // ── 3번 슬롯: 관살혼잡 — 배우자성 카테고리가 관성(여성)이면 이미
  // 1번 설명에 녹아 있으므로 재성(남성)일 때만 별도 슬롯을 추가한다. ──
  if (gwansal.present && star.targetCategory !== "관성" && gwansal.pyeongwan && gwansal.jeonggwan) {
    const stageLabel: Record<string, string> = { year: "태어난 해", month: "태어난 달", day: "태어난 날", hour: "태어난 시" };
    picks.push({
      heading: `⑫ 함께 작동하는 또 다른 힘 — 관살혼잡`,
      paragraphs: [
        { text: "쉽게 말하면, 정관과 편관이 함께 있으면 서로 다른 두 기준(정해진 질서 vs 즉각적인 대응)이 동시에 작동한다는 뜻입니다.", sourceNote: "정의(관살혼잡)" },
        { text: `이 사람은 ${stageLabel[gwansal.pyeongwan.stage]} 자리에 편관, ${stageLabel[gwansal.jeonggwan.stage]} 자리에 정관을 함께 갖고 있습니다.`, sourceNote: "위치(관살혼잡)" },
        { text: "이 두 힘은 배우자성(재성)과는 다른 축이지만, 이 사람이 사랑에서 '어떤 기준으로 판단할지' 저울질하는 배경이 됩니다. 정관은 이미 정해진 신뢰를, 편관은 지금 상황이 요구하는 확신을 먼저 보려 해서, 이 둘이 동시에 있으면 관계를 판단하는 기준 자체가 하나로 정리되지 않을 수 있습니다.", sourceNote: "사랑에서의 마음-기원(관살혼잡)" },
        { text: combineWithBalance(group, false, false), sourceNote: "조합해석(관살혼잡)" },
        { text: `${strengthAndDifficulty(group, "gwansal", false).strength} ${strengthAndDifficulty(group, "gwansal", false).difficulty}`, sourceNote: "강점/어려움(관살혼잡)" },
      ],
    });
  }

  const intro =
    "지금까지의 이야기가 이 사람이 사랑에서 '어떻게' 움직이는지를 보여줬다면, 여기서는 그 모습이 '왜' 만들어지는지를 명식 안의 힘으로 짚어봅니다. 사주 여덟 글자 중 실제로 사랑과 관계에 의미 있게 작동하는 힘만 골라, 그 힘이 어디에 있고 어떤 상태인지부터 설명합니다.";

  return { intro, picks };
}
