// [5장 재물운 Production 이식] 확정된 scratch(scripts/_scratch_ch5_obstruction_v6.ts)를 로직·문장 변경 없이 그대로 옮긴 파일.
// 이식 시 제거한 것: 데모/검증용 실행 코드(buildAppData·IntakeFormData·require.main 블록)와 그 import뿐이다.
// 제5장 ⑤ "돈이 새거나 흔들리는 조건" v2 — 22명/10,224명 검증 통과 후,
// "속 시원하지 않은 헤지 문장" 문제를 고치는 구조 재설계. 계산 엔진은
// 읽기 전용, 새 계산 없음.
//
// [v1→v2 핵심 변경: 회피성 결론 전면 제거]
// v1은 yongsin이 hold/unresolved일 때와 monthRootConflict caveat에서
// "딱 잘라 말하기 어렵다"/"상황에 따라 다르게 드러날 수 있다"/"무엇이
// 확실하게 잡아주는지 알기 어렵다"/"그때그때 상황을 보며 판단하는 편이
// 정확하다" 같은, 계산의 불확실성을 고객에게 그대로 돌려주는 문장을 썼다.
// 답답해서 사주를 보러 온 고객에게 이런 "저도 모르겠어요"류 결론은 정반대
// 효과를 낸다는 지적에 따라, 이번 v2는 같은 계산값(yongsin 미확정 등)을
// "이 리딩이 불확실하다"가 아니라 "이 사람은 원래 이런 방식이다"라는,
// 그 사람에 대한 확신 있는 서술로 재해석한다. 용신을 억지로 확정하지도,
// 없는 사건을 만들지도 않는다 — "하나의 고정된 힘에 기대는 구조가 아니다"
// 라는 사실 자체를 그 사람의 특징으로 단정적으로 서술할 뿐이다.
//
// [monthRootConflict caveat 제거] 이 값은 "월지 통근 판정이 애매해 대안
// 판정 기준을 썼다"는 내부 계산 신뢰도 메모이지, 고객의 실제 재물 습관에
// 대한 사실이 아니다. 정직하게 번역하면 헤지 문장이 될 수밖에 없어(위
// 금지 원칙과 충돌), 고객 본문에서는 빼기로 했다 — 계산 자체는 건드리지
// 않는다.
//
// [heChong caveat를 원인 유형(type)과 결합] v1은 heChong 문장이 원인
// 유형(과부하/분산/소모/제동/압박)과 무관하게 완전히 동일했다(22명 조사
// 지적: "서로 다른 원인을 하나의 공통 문장으로 뭉갠다"). v2는 구조적
// 방해가 있는 사람(n>=1)에 한해 heChong 신호를 그 사람의 원인 유형에
// 맞는 문장으로 새로 짰다(HE_BY_TYPE/CHONG_BY_TYPE) — 원국에 구조적
// 방해가 없는 사람(n=0)은 원인 유형이 없으므로 기존 범용 문장을 유지한다.
//
// [n0_plain(43자) 보강] "뚜렷한 조건이 확인되지 않는다"에서 끝내지 않고,
// 왜 안 흔들리는지(구조상 어느 힘도 과다하지 않다는, 이미 계산된 사실)와
// 그래도 무엇을 유지하면 좋은지(RESPONSE, 항상 붙임)를 추가했다.
//
// [흐름] 결론(왜 안 흔들리는지 또는 왜 흔들리는지) → 흔들리는 조건(WHEN) →
// 실제 행동(ACTION) → 왜 그런지(WHY) → 생활 모습(SCENE) → 대응 방법
// (RESPONSE, 이제 항상 붙고 항상 확신형).
import { AppData } from "../sajuContent";
import { analyzeWealthObstruction, WealthObstructionResult, StructuralObstruction } from "../wealthObstructionAnalysis";
import { ObstructionType } from "../wealthObstructionAnalysis";
import { ChapterFourKey, buildChapterFourKey } from "../chapterFourInterpretation";

// ── [v3 재작성] 결론+WHEN+ACTION+WHY를 하나의 흐르는 문단으로 합쳤다.
// v2는 이 네 가지를 각각 독립 문장으로 뽑아 이어붙여서 "계산을 하나씩
// 번역해 나열한 느낌"이 났다(같은 사실을 WHEN/ACTION/SCENE에서 3번
// 반복해 말하는 문제도 있었다). v3는 "평소엔 ~합니다. 그런데 ~한
// 순간에는 얘기가 달라집니다. [구체 행동/장면]. [왜 그런지, 원인]"
// 순서로 한 번에 흐르게 쓰고, "예를 들어"로 따로 떼지 않고 구체 장면을
// 문장 안에 바로 녹였다. 판정 조건(어떤 type인지)은 그대로다. ──
const MAIN_PARAGRAPH_BY_TYPE: Record<ObstructionType, string> = {
  과부하형:
    "이 사람은 평소엔 돈 문제를 잘 챙기는 편입니다. 그런데 챙길 일이 한꺼번에 여러 개로 늘어나는 순간에는 얘기가 달라집니다. 하나하나 다 놓치지 않으려고 애쓰다 보면, 오히려 그중 하나쯤은 깜빡 잊고 넘어가게 됩니다. 원래 책임지고 챙겨야 할 몫 자체가 많은 편이라, 한꺼번에 몰리면 감당하는 힘이 그만큼 빨리 바닥나기 때문입니다.",
  분산형:
    "이 사람은 평소엔 돈 판단이 괜찮은 편입니다. 그런데 여러 사람이 얽힌 일에 손을 대고 있을 때는 얘기가 달라집니다. 지키기보다 오히려 다시 움직이거나 나눠 쓰는 쪽으로 먼저 마음이 기울어서, 목돈이 생겨도 혼자 쥐고 있기보다 누군가와 나누는 쪽을 택하게 됩니다. 원래 함께 움직이거나 나누려는 마음이 유난히 강한 편이라, 여럿이 걸린 일 앞에서는 그 마음이 더 크게 작동하기 때문입니다.",
  소모형:
    "이 사람은 평소엔 돈 판단이 괜찮은 편입니다. 그런데 벌인 일이 연달아 이어질 때는 얘기가 달라집니다. 앞서 벌인 일을 채 정리하기도 전에 벌써 다음 일을 시작하고 있는 경우가 많아서, 정신을 차려보면 손에 남는 게 흐릿해져 있곤 합니다. 원래 표현하고 벌이려는 힘이 유난히 강한 편이라, 하나를 끝내기도 전에 다음 일이 자꾸 눈에 들어오기 때문입니다.",
  제동형:
    "이 사람은 평소엔 돈 판단이 괜찮은 편입니다. 그런데 확신이 딱 서지 않는 상황 앞에서는 얘기가 달라집니다. 이미 여러 번 확인했으면서도 한 번 더 확인하고 싶어져서, 그러다 보면 정작 움직여야 할 타이밍을 놓치곤 합니다. 원래 살피고 신중해지려는 마음이 유난히 강한 편이라, 확신이 안 서는 순간에는 그 마음이 결정을 계속 뒤로 미루게 만들기 때문입니다.",
  압박형:
    "이 사람은 평소엔 돈 판단이 괜찮은 편입니다. 그런데 맡은 일의 책임과 돈 문제가 한꺼번에 겹칠 때는 얘기가 달라집니다. 돈 문제보다 맡은 일부터 해결하려다 보니, 정작 돈 관리는 자꾸 뒷전으로 밀립니다. 원래 책임지고 지켜야 할 몫이 유난히 많은 편이라, 책임질 일이 생기면 돈보다 그 일이 먼저 눈에 들어오기 때문입니다.",
};

const SHORT_LABEL_BY_TYPE: Record<ObstructionType, string> = {
  과부하형: "챙길 일이 몰릴 때 흔들리는 결",
  분산형: "여러 사람이 얽힐 때 흔들리는 결",
  소모형: "일이 연달아 이어질 때 흔들리는 결",
  제동형: "확신이 안 설 때 흔들리는 결",
  압박형: "책임과 돈이 겹칠 때 흔들리는 결",
};

// ── [v5 재작성] n=1(구조적 방해 있음) 전용 대응 방법 — v4는 이 부분이
// yongsin 상태(4분기)에 묶여 있어서, 원인 유형이 다른 분산형/소모형이
// yongsin 상태만 같으면 똑같은 결말("가장 급한 것부터")로 수렴했다
// (지적 반영). v5는 결말을 원인 유형(type) 축으로 바꿔서, MAIN_PARAGRAPH_
// BY_TYPE에서 이미 설명한 문제("무엇이 반복되는가")에 각 유형만의 대응
// (순서 정리/몫 분리/하나씩 매듭/확인 횟수 기준/한도 설정)이 직접
// 이어지게 했다. 새 계산 아님 — type은 이미 계산된 primary.type 그대로. ──
const TYPE_RESPONSE: Record<ObstructionType, string> = {
  과부하형: "그러니 챙길 일이 몰리는 시기에는 순서부터 미리 정해두는 편이 좋습니다. 뭐부터 처리할지 정해두면, 급하게 다 챙기려다 하나를 놓치는 일이 줄어듭니다.",
  분산형: "그러니 돈이 생기면 나눌 몫과 지킬 몫을 먼저 갈라두는 편이 좋습니다. 처음부터 나눠두면, 지켜야 할 부분까지 함께 흔들리는 일은 줄어듭니다.",
  소모형: "그러니 지금 벌인 일을 정리하기 전에는 다음 일에 손대지 않는 편이 좋습니다. 하나씩 매듭짓고 넘어가면, 손에 남는 게 흐릿해지는 일이 줄어듭니다.",
  제동형: "그러니 몇 번까지 확인하면 그걸로 정한다는 기준을 미리 정해두는 편이 좋습니다. 확인할 횟수를 미리 정해두면, 타이밍을 놓치는 일이 줄어듭니다.",
  압박형: "그러니 책임질 일이 생기면 거기에 쓸 돈의 한도부터 먼저 정해두는 편이 좋습니다. 한도를 정해두면, 돈 관리가 뒷전으로 밀리는 일이 줄어듭니다.",
};

// ── [v5 신규] n=1일 때 support 상태에 따른 짧은 꼬리 문장 — type 답이
// 주 결론이고, 이건 "이 방법 하나로 충분한지"만 보조적으로 덧붙인다.
// resolved+지원 없음/not-resolved는 type 답만으로 충분해 꼬리 없음. ──
function n1Trailer(result: WealthObstructionResult): string {
  const { supportConstraints } = result;
  if (supportConstraints.some((c) => c.kind === "hardBlocked")) {
    return " 다만 이 방법 하나로 완전히 안심하기는 어려우니, 여유를 조금 더 남겨두는 편이 낫습니다.";
  }
  if (supportConstraints.some((c) => c.kind === "yongsinCandidateWarning" || c.kind === "huisinWarning")) {
    return " 다만 한 번 정했다고 끝내지 말고, 가끔 다시 한번 들여다보는 편이 좋습니다.";
  }
  return "";
}

// ── [v5 신규] n=0(구조적 방해 없음) 전용 대응 방법 — v4는 yongsin
// hold/unresolved만으로 "치우치지 않는 유연한 성향"이라는, 계산 근거보다
// 강한 성격 서술을 만들어냈다(지적 반영: hold/unresolved는 성향을 새로
// 만드는 값이 아니다). v5는 n=0의 결론을 오직 실제 존재하는 신호(합/충)
// 로만 구성하고, 그 신호조차 없는 사람에게는 "특별한 사건 없음"이 아니라
// "그래서 평소의 작은 판단이 더 중요하다"는, 계산이 실제로 말해주는
// 범위까지만 서술한다. yongsin 상태는 n=0 문장에서 아예 쓰지 않는다. ──
const N0_HE_RESPONSE = "그러니 다른 사람 일과 얽히는 순간에는, 원래 내가 쓰려던 돈과 그 일에 들어가는 돈을 나눠서 보는 편이 좋습니다. 처음부터 나눠두면 계획이 슬쩍 바뀌는 일이 줄어듭니다.";
const N0_CHONG_RESPONSE = "그러니 예상 밖의 일이 생기면, 원래 세워둔 계획은 그대로 두고 새로 생긴 지출만 따로 떼어서 판단하는 편이 좋습니다. 나눠서 보면 계획 전체가 갑자기 틀어지는 일이 줄어듭니다.";
// [v6 수정] "외부 변수가 따로 확인되지 않습니다"가 계산 결과 보고처럼
// 들리고 99자로 다른 분기보다 지나치게 짧다는 지적 반영. structuralObstructions
// =[]이라는 같은 계산 사실("한 가지 힘이 압도적으로 몰려 있지 않다" →
// "한 가지 큰 사건 하나로 크게 흔들리는 일은 드물다")을 유지하되, 거기서
// 자연스럽게 따라오는 결론("그렇다면 무엇이 차이를 만드는가 = 평소
// 반복되는 작은 판단들")까지 풀어서 180~250자 분량으로 채웠다. "자주
// 쓴다/많이 쓴다" 같은 새 성향은 만들지 않았다 — "무엇이 흔든다"가
// 아니라 "무엇이 차이를 만드는가"로 질문 자체를 옮겼을 뿐이다.
const N0_NO_SIGNAL_RESPONSE =
  "이 사람은 어느 한 가지 사건 때문에 돈 문제가 크게 흔들리는 경우는 드문 편입니다. 그보다는 평소에 반복하는 자잘한 판단들이 쌓여서 차이를 만드는 쪽에 가깝습니다. 그러니 특별한 일을 미리 대비하려 애쓰기보다, 한 달 정도 돈이 어디로 나가는지 한 번씩 돌아보는 정도로 충분합니다. 큰 위험을 경계하기보다 평소의 흐름을 놓치지 않는 편이 이 사람에게는 더 잘 맞습니다.";

// ── [v1 유지] 구조적 방해가 없는 사람(n=0)용 범용 heChong 문장 — 원인
// 유형이 없으므로 그대로 둔다. 헤지 표현 아님, 기존 그대로. ──
function heChongClauseGeneric(ch4Key: ChapterFourKey): string {
  const { he, chong } = ch4Key.heChongOnWealth;
  const hasHe = he.length > 0;
  const hasChong = chong.length > 0;
  if (hasHe && hasChong) {
    return "다만 원래 하려던 일이 주변 사람 일과 자꾸 엮이는 편이라 계획이 슬쩍 다른 쪽으로 바뀌기도 하고, 어느 날 갑자기 예상 못 한 일이 끼어들어 계획이 통째로 틀어지는 때도 있습니다.";
  }
  if (hasHe) {
    return "다만 원래 하려던 일이 주변 사람 일과 자꾸 엮이는 편이라, 그럴 때는 세워둔 계획이 슬쩍 다른 쪽으로 바뀌기도 합니다.";
  }
  return "다만 어느 날 갑자기 예상 못 한 일이 끼어드는 때가 있어서, 그럴 때는 세워둔 계획이 갑자기 틀어지기도 합니다.";
}

// ── [v2 신규] 구조적 방해가 있는 사람(n=1) 전용 — heChong 신호를 그
// 사람의 원인 유형(과부하/분산/소모/제동/압박)에 맞춰 다르게 번역한다.
// "서로 다른 원인을 하나의 공통 문장으로 뭉개지 말라"는 지적 반영.
// 새 계산 아님 — 기존 type과 기존 he/chong 존재 여부만 조합. ──
const HE_BY_TYPE: Record<ObstructionType, string> = {
  과부하형: "거기에 원래 내 일이 아니었던 것까지 슬쩍 떠맡게 되는 때도 있어서, 그럴 때는 챙길 목록이 한 번 더 길어집니다.",
  분산형: "거기에 하려던 일이 다른 사람 일과 자꾸 엮이는 때도 있어서, 그럴 때는 나누려는 마음이 한 번 더 커집니다.",
  소모형: "거기에 하던 일이 다른 일과 자꾸 얽히는 때도 있어서, 그럴 때는 벌이려는 마음이 한 번 더 커집니다.",
  제동형: "거기에 확인할 일이 다른 사람 일과 자꾸 얽히는 때도 있어서, 그럴 때는 확인할 게 한 번 더 늘어납니다.",
  압박형: "거기에 책임질 일이 다른 사람 일과 자꾸 얽히는 때도 있어서, 그럴 때는 책임질 범위가 한 번 더 넓어집니다.",
};
const CHONG_BY_TYPE: Record<ObstructionType, string> = {
  과부하형: "거기에 어느 날 갑자기 처리할 일이 하나 더 얹히는 때도 있어서, 그럴 때는 감당해야 할 게 순식간에 늘어납니다.",
  분산형: "거기에 함께하던 사람이나 일이 갑자기 틀어지는 때도 있어서, 그럴 때는 나누려는 마음이 오히려 더 커집니다.",
  소모형: "거기에 벌여둔 일 중 하나가 갑자기 어긋나는 때도 있어서, 그럴 때는 다음 일로 넘어가려는 마음이 더 급해집니다.",
  제동형: "거기에 확인하던 것이 갑자기 틀어지는 때도 있어서, 그럴 때는 결정을 미루는 마음이 더 커집니다.",
  압박형: "거기에 책임질 일이 갑자기 하나 더 생기는 때도 있어서, 그럴 때는 돈 관리가 더 뒤로 밀립니다.",
};
function heChongClauseByType(ch4Key: ChapterFourKey, type: ObstructionType): string | null {
  const { he, chong } = ch4Key.heChongOnWealth;
  const hasHe = he.length > 0;
  const hasChong = chong.length > 0;
  if (hasHe && hasChong) return `${HE_BY_TYPE[type]} ${CHONG_BY_TYPE[type]}`;
  if (hasHe) return HE_BY_TYPE[type];
  if (hasChong) return CHONG_BY_TYPE[type];
  return null;
}

// ── caveats(⑤ 전용 — heChongSummary만. monthRootConflict는 [v2] 고객
// 본문에서 제외: 내부 계산 신뢰도 메모일 뿐 고객의 실제 재물 습관에 대한
// 사실이 아니라서, 정직하게 번역하면 헤지 문장이 될 수밖에 없다. 계산
// 자체(caveats 배열)는 그대로 두고, 이 caveat 종류만 본문에서 안 쓴다.
// jaeseongVsInseong은 기존과 동일하게 ④와 겹쳐 계속 뺀다) ──
function buildCaveatParagraphs(result: WealthObstructionResult, ch4Key: ChapterFourKey): { text: string; sourceNote: string }[] {
  const out: { text: string; sourceNote: string }[] = [];
  if (result.caveats.some((c) => c.kind === "heChongSummary")) {
    const { he, chong } = ch4Key.heChongOnWealth;
    out.push({
      text: heChongClauseGeneric(ch4Key),
      sourceNote: `caveats=[heChongSummary](n=0 범용), he=${he.length}, chong=${chong.length}`,
    });
  }
  return out;
}

// ── [v2 신규] n=0(구조적 방해 없음)일 때 "왜 안 흔들리는지"를 확신형으로
// 설명한다. n=0은 계산상 "5개 카테고리 중 어느 하나도 절대적으로 과다하지
// 않다"는 뜻이므로(analyzeDayMasterBalance의 structureFlags가 비어있다는
// 이미 계산된 사실), 그 사실 자체를 긍정 서술로 바꿨을 뿐 새 계산은 없다. ──
export interface NarrativeParagraph { text: string; sourceNote: string }
export interface Result { paragraphs: NarrativeParagraph[] }

export function generateObstructionV6(result: WealthObstructionResult, ch4Key: ChapterFourKey): Result {
  const paragraphs: NarrativeParagraph[] = [];
  const n = result.structuralObstructions.length;

  if (n === 0) {
    // [v5] n=0은 이제 오직 he/chong(실제 존재하는 신호)만으로 구성한다.
    // yongsin 상태는 성향을 새로 만드는 값이 아니므로 n=0 문장에서 아예
    // 쓰지 않는다(사용자 지적 1번 반영).
    const { he, chong } = ch4Key.heChongOnWealth;
    const hasHe = he.length > 0;
    const hasChong = chong.length > 0;
    if (hasHe || hasChong) {
      paragraphs.push({ text: heChongClauseGeneric(ch4Key), sourceNote: `heChongOnWealth he=${he.length}, chong=${chong.length}` });
      if (hasHe && hasChong) {
        paragraphs.push({ text: `${N0_HE_RESPONSE} ${N0_CHONG_RESPONSE}`, sourceNote: "he+chong 응답 결합" });
      } else if (hasHe) {
        paragraphs.push({ text: N0_HE_RESPONSE, sourceNote: "he 응답" });
      } else {
        paragraphs.push({ text: N0_CHONG_RESPONSE, sourceNote: "chong 응답" });
      }
    } else {
      // 신호가 전혀 없는 사람 — 없는 위험을 만들지 않고, 계산이 실제로
      // 말해주는 범위(외부 변수 신호 없음)까지만 서술한다.
      paragraphs.push({ text: N0_NO_SIGNAL_RESPONSE, sourceNote: "heChong 신호 없음(structuralObstructions=[])" });
    }
    return { paragraphs };
  }

  const primary = result.structuralObstructions[0];
  // [v3] 결론+WHEN+ACTION+WHY를 한 문단으로 합쳐서, 같은 사실을 여러
  // 문장에서 다른 말로 반복하지 않는다(예를 들어도 이 안에 녹임).
  paragraphs.push({ text: MAIN_PARAGRAPH_BY_TYPE[primary.type], sourceNote: `primary=${primary.sourceFlag}→${primary.type}` });

  if (n >= 2) {
    const rest = result.structuralObstructions.slice(1);
    const labels = rest.map((o) => SHORT_LABEL_BY_TYPE[o.type]);
    const joined = labels.length === 1 ? labels[0] : labels.slice(0, -1).join(", ") + ", " + labels[labels.length - 1];
    paragraphs.push({
      text: `그리고 ${joined}까지 함께 겹쳐 있어서, 이 흔들림은 한 가지 결이 아니라 여러 결이 동시에 작동한다고 보는 편이 정확합니다.`,
      sourceNote: `structuralObstructions[1..]=${rest.map((o) => o.sourceFlag).join(",")}`,
    });
  }

  // [v2 유지, v3 문구만] heChong 신호를 원인 유형(primary.type)에 맞춰
  // 번역 — n=0의 범용 문장과 다른, 유형별 전용 문장을 쓴다.
  const heChongText = heChongClauseByType(ch4Key, primary.type);
  if (heChongText) {
    const { he, chong } = ch4Key.heChongOnWealth;
    paragraphs.push({ text: heChongText, sourceNote: `heChong(type=${primary.type}), he=${he.length}, chong=${chong.length}` });
  }

  // [v5] 결말을 원인 유형(type) 축으로 — 지적 3번 반영. support 상태는
  // 짧은 꼬리로만 보조.
  paragraphs.push({
    text: TYPE_RESPONSE[primary.type] + n1Trailer(result),
    sourceNote: `TYPE_RESPONSE(${primary.type}) + trailer(support=${result.supportConstraints.map((s) => s.kind).join(",") || "없음"})`,
  });

  return { paragraphs };
}
