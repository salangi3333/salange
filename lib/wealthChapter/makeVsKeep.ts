// [5장 재물운 Production 이식] 확정된 scratch(scripts/_scratch_ch5_makevskeep_v2.ts)를 로직·문장 변경 없이 그대로 옮긴 파일.
// 이식 시 제거한 것: 데모/검증용 실행 코드(buildAppData·IntakeFormData·require.main 블록)와 그 import뿐이다.
// 제5장 ④ "'버는 힘'과 '지키는 힘'" 문장 다듬기(scratch v2, 마지막 1회) —
// 계산은 v1과 100% 동일(makeStrong/keepStrong/bigyeopVsJaeseong/
// gwanseongVsBigyeop/jaeseongVsInseong, 새 계산 없음). 이번엔 B(재성이
// 비겁을 앞서거나 거의 비슷한 경우)도 A처럼 bj 자체(뚜렷/약간/비슷)를 읽어
// 3단계로 나눴다(기존엔 "재성우세" 한 갈래로 뭉쳐 있어 K/J가 완전히 같은
// 문장이 됐었음 — 이미 계산된 값을 더 읽은 것뿐, 새 계산 아님). "장점은
// ~라는 겁니다" 틀도 없애고, "특별히 신경 안 써도 잘 쌓인다"류 결과 단정도
// "들어온 돈을 서둘러 옮기지 않는다"는 관리 행동으로 바꿨다. OPENING과
// RESULT가 "빠르게 움직인다/망설이지 않는다"를 두 번 말하던 것도 정리했다.
import { AppData } from "../sajuContent";
import { ChapterFourKey, buildChapterFourKey, GapTier } from "../chapterFourInterpretation";

function gapTierActive(gapTier: GapTier): boolean {
  return gapTier !== "비슷";
}

type Branch =
  | "A뚜렷" | "A약간"
  | "B재성뚜렷" | "B재성약간" | "B거의비슷"
  | "B책임뚜렷" | "B책임약간"
  | "C" | "D";

function classify(key: ChapterFourKey): Branch {
  const { bigyeopVsJaeseong: bj, gwanseongVsBigyeop: gb, jaeseong, siksangJaeseongLinked } = key;
  const makeStrong = jaeseong.exposure !== "미미" || siksangJaeseongLinked;
  const bigyeopLeads = bj.leadCategory === "비겁" && gapTierActive(bj.gapTier);
  const gwanProtects = gb.leadCategory === "관성" && gapTierActive(gb.gapTier);

  if (makeStrong) {
    if (bigyeopLeads && !gwanProtects) return bj.gapTier === "뚜렷" ? "A뚜렷" : "A약간";
    if (bigyeopLeads && gwanProtects) return gb.gapTier === "뚜렷" ? "B책임뚜렷" : "B책임약간";
    // !bigyeopLeads: bj.leadCategory==="재성"이거나 bj.gapTier==="비슷"
    if (bj.gapTier === "비슷") return "B거의비슷";
    return bj.gapTier === "뚜렷" ? "B재성뚜렷" : "B재성약간";
  }
  if (!bigyeopLeads || gwanProtects) return "C";
  return "D";
}

// ── 결론(한 번만 — makeStrong 여부는 여기서만 말한다) ──
const OPENING: Record<Branch, string> = {
  A뚜렷: "이 사람은 버는 힘은 있지만, 들어온 돈을 오래 손에 두지는 못합니다.",
  A약간: "이 사람은 버는 힘은 있는데, 들어온 돈이 가끔 다시 움직이려 합니다.",
  B재성뚜렷: "이 사람은 버는 힘과 지키는 힘이 같이 있습니다.",
  B재성약간: "이 사람은 버는 힘과 지키는 힘이 같이 있습니다.",
  B거의비슷: "이 사람은 버는 힘과 지키는 힘이 거의 팽팽하게 붙어 있습니다.",
  B책임뚜렷: "이 사람은 벌면 쓰고 싶어지지만, 결국은 손에 남기는 쪽입니다.",
  B책임약간: "이 사람은 벌면 쓰고 싶어지지만, 대체로는 손에 남기는 쪽입니다.",
  C: "이 사람은 화려하게 벌기보다, 있는 걸 잘 지킵니다.",
  D: "이 사람은 아직 버는 힘도 지키는 힘도 뚜렷하지 않습니다.",
};

// ── 실제 행동(구체적 관리 행동 — "쌓인다/모인다" 대신 "옮기는지/두는지") ──
const ACTION: Record<Branch, string> = {
  A뚜렷: "돈이 생기면 빠르게 움직여서 만들어내지만, 손에 쥔 지 얼마 안 돼서 다시 다른 데로 옮기고 싶은 마음이 꽤 강하게 올라옵니다. 그래서 들어온 돈을 그대로 두기보다, 어느새 나눠 쓰거나 새로운 데 옮겨 쓰고 있는 경우가 많습니다.",
  A약간: "돈이 생기면 빠르게 움직여서 만들어내고, 들어온 돈도 가끔은 오래 안 두고 다시 움직이고 싶어질 때가 있습니다. 다만 아주 강하지는 않아서, 마음만 먹으면 손대지 않고 둘 수 있는 정도입니다.",
  B재성뚜렷: "돈이 생기면 빠르게 움직여서 만들어내고, 일단 들어온 돈은 굳이 다른 데로 옮길 이유를 잘 찾지 않습니다. 손에 쥔 채로 오래 두는 쪽이 자연스럽습니다.",
  B재성약간: "돈이 생기면 빠르게 움직여서 만들어내고, 들어온 돈도 서둘러 옮기지 않고 일단은 손에 쥔 채로 둡니다.",
  B거의비슷: "돈이 생기면 빠르게 움직여서 만들어내지만, 그 돈을 계속 쥐고 있을지 다시 움직일지는 그때그때 다릅니다. 어떤 때는 오래 두고, 어떤 때는 금방 다시 씁니다.",
  B책임뚜렷: "돈이 생기면 빠르게 움직여서 만들어냅니다. 벌면 나눠 쓰고 싶은 마음도 분명 드는데, 맡은 일에 대한 책임감 때문에 결국 손대지 않고 두게 됩니다.",
  B책임약간: "돈이 생기면 빠르게 움직여서 만들어냅니다. 벌면 나눠 쓰고 싶은 마음과 맡은 일에 대한 책임감이 둘 다 있어서, 그 사이에서 왔다 갔다 합니다.",
  C: "새로운 기회를 먼저 만들어내기보다, 이미 자리 잡은 방식을 반복하는 쪽을 택합니다. 그 대신 들어온 돈은 굳이 다른 데로 옮기지 않고 그대로 둡니다.",
  D: "돈을 적극적으로 만들어내는 쪽도, 의식적으로 지키는 쪽도 아직 뚜렷하지 않습니다. 생기면 생기는 대로, 나가면 나가는 대로 상황에 맡기는 편입니다.",
};

// ── 왜 그런지(ACTION과 다른 각도 — "성격 전반"으로) ──
const WHY: Record<Branch, string> = {
  A뚜렷: "벌어들인 걸 나누고 다시 움직이려는 마음이 원래 강한 성격이기 때문입니다.",
  A약간: "벌어들인 걸 나누고 다시 움직이려는 마음이 어느 정도 있는 성격이기 때문입니다.",
  B재성뚜렷: "새로운 자극이나 변화보다, 익숙하고 안정적인 상태를 편하게 여기는 성격이기 때문입니다.",
  B재성약간: "새로운 자극이나 변화보다, 익숙하고 안정적인 상태를 조금 더 편하게 여기는 성격이기 때문입니다.",
  B거의비슷: "그날그날 마음이 끌리는 쪽으로 자연스럽게 움직이는 성격이기 때문입니다.",
  B책임뚜렷: "나누고 싶은 마음보다, 맡은 일은 끝까지 책임지려는 마음이 훨씬 강한 성격이기 때문입니다.",
  B책임약간: "나누고 싶은 마음과 책임지려는 마음이 둘 다 있어서, 그때그때 어느 쪽이 이기는지가 갈리는 성격이기 때문입니다.",
  C: "새로 벌이기보다 이미 있는 걸 다루는 데 더 마음이 편한 성격이기 때문입니다.",
  D: "아직은 돈을 직접 만들거나 지키는 쪽보다, 다른 일에 마음이 가 있는 시기이기 때문입니다.",
};

const SCENE: Record<Branch, string> = {
  A뚜렷: "예를 들어 목돈이 생겨도, 며칠 안에 다른 곳에 쓰거나 옮기는 경우가 많습니다.",
  A약간: "예를 들어 목돈이 생기면 한동안은 그대로 두다가도, 어느 순간 다른 데 쓰고 싶어지는 때가 옵니다.",
  B재성뚜렷: "예를 들어 목돈이 생기면 별다른 계획 없이도 당분간 손대지 않고 그대로 둡니다.",
  B재성약간: "예를 들어 목돈이 생기면 특별한 이유가 생기기 전까지는 그대로 두는 편입니다.",
  B거의비슷: "예를 들어 같은 액수의 목돈이라도, 그 주에 다른 일이 있었는지에 따라 그대로 두기도 하고 금방 쓰기도 합니다.",
  B책임뚜렷: "예를 들어 쓰고 싶은 마음이 들다가도, 맡은 일이나 책임 때문에 다시 마음을 다잡는 경우가 많습니다.",
  B책임약간: "예를 들어 쓰고 싶은 마음이 들면 대부분은 다시 마음을 다잡지만, 가끔은 그냥 쓰고 마는 때도 있습니다.",
  C: "예를 들어 크게 벌이는 일은 적어도, 들어온 돈에는 딱히 손을 대지 않습니다.",
  D: "예를 들어 돈을 어떻게 쓰고 남길지, 아직 스스로도 뚜렷한 기준을 정하지 못한 경우가 많습니다.",
};

// ── 장점/주의(결과 단정 없이 관리 팁으로 — "장점은 ~겁니다" 틀 제거) ──
const RESULT_BASE: Record<Branch, string> = {
  A뚜렷: "이런 흐름을 감안하면, 들어온 돈 중 일부는 처음부터 따로 떼어 두는 편이 도움이 됩니다. 그렇게 정해 두지 않으면 손에 남는 돈이 거의 없을 수 있습니다.",
  A약간: "이런 흐름을 감안하면, 그 마음이 올라오는 순간을 스스로 알아채는 정도로도 충분합니다. 가끔은 그냥 손대지 않고 두는 연습이 도움이 됩니다.",
  B재성뚜렷: "이런 성향 덕분에 따로 애쓰지 않아도 관리가 되는 편이지만, 그만큼 돈을 굴려보려는 시도 자체를 잘 안 하게 될 수 있습니다.",
  B재성약간: "이런 성향 덕분에 크게 신경 쓸 일은 적지만, 가끔은 의식적으로 다른 곳에 써 보거나 움직여 보는 것도 필요할 수 있습니다.",
  B거의비슷: "이런 성향 덕분에 상황에 따라 유연하게 대응할 수 있지만, 미리 정해둔 기준이 없으면 그때그때 판단이 오락가락할 수 있습니다.",
  B책임뚜렷: "이런 성향 덕분에 쓰고 싶은 마음이 들어도 대부분 자제가 됩니다. 다만 그 자제가 부담으로 쌓이지 않는지는 가끔 돌아볼 필요가 있습니다.",
  B책임약간: "이런 성향 덕분에 대체로는 자제가 되지만, 가끔 그 줄다리기에서 지는 순간이 있다는 것도 알아두면 도움이 됩니다.",
  C: "이런 성향 덕분에 지키는 데는 크게 품이 안 들지만, 새로운 기회를 붙잡는 데는 의식적인 노력이 필요할 수 있습니다.",
  D: "아직 방식이 뚜렷하지 않은 만큼, 돈을 어떻게 쓰고 남길지 스스로 기준을 만들어가는 시기로 보면 됩니다.",
};

function stabilityClauseReworded(key: ChapterFourKey): string | null {
  const ji = key.jaeseongVsInseong;
  if (ji.leadCategory === "재성" && gapTierActive(ji.gapTier)) {
    return ji.gapTier === "뚜렷"
      ? "다만 있는 걸 가만히 두기보다 계속 뭔가 시도해 보려는 마음이 상당히 강해서, 손에 쥔 걸 그대로 두는 연습이 특히 필요할 수 있습니다."
      : "다만 있는 걸 가만히 두기보다 가끔은 뭔가 시도해 보고 싶은 마음이 슬쩍 올라올 수 있습니다.";
  }
  if (ji.leadCategory === "인성" && gapTierActive(ji.gapTier)) {
    return ji.gapTier === "뚜렷"
      ? "다만 안전을 먼저 살피는 마음이 상당히 강해서, 기회다 싶을 때도 한 박자 늦게 움직일 수 있습니다."
      : "다만 안전을 살피는 쪽에 마음이 조금 더 기울어서, 기회 앞에서 살짝 망설이는 순간이 있을 수 있습니다.";
  }
  return null;
}

function resultReworded(branch: Branch, key: ChapterFourKey): string {
  const stability = stabilityClauseReworded(key);
  return stability ? `${RESULT_BASE[branch]} ${stability}` : RESULT_BASE[branch];
}

export interface NarrativeParagraph { text: string; sourceNote: string }
export interface Result { paragraphs: NarrativeParagraph[] }

export function generateMakeVsKeepV2(key: ChapterFourKey): Result {
  const branch = classify(key);
  const paragraphs: NarrativeParagraph[] = [
    { text: OPENING[branch], sourceNote: `결론(${branch})` },
    { text: ACTION[branch], sourceNote: `실제행동(${branch})` },
    { text: WHY[branch], sourceNote: `왜(${branch})` },
    { text: SCENE[branch], sourceNote: `생활모습(${branch})` },
    { text: resultReworded(branch, key), sourceNote: `장점/주의(${branch}, jaeseongVsInseong=${key.jaeseongVsInseong.leadCategory}:${key.jaeseongVsInseong.gapTier})` },
  ];
  return { paragraphs };
}
