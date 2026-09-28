// 7장 생성기 공통 어휘/문장 은행 — 결정론(같은 facts → 같은 글). 랜덤 없음. 고객 본문에는 명리 용어를 쓰지 않는다.
import { Cat, Facts, RunF, Stage, Sig, YearF } from "./facts";

export const nm = (f: Facts) => `${f.name}님`;

/** 년 범위 표기 */
export const yr = (ys: number[]) => (ys.length === 1 ? `${ys[0]}년` : `${ys[0]}~${ys[ys.length - 1]}년`);
export const runYr = (r: RunF) => yr(r.ys.map((y) => y.y));
export const lenTxt = (n: number) => (n === 1 ? "한 해" : n === 2 ? "두 해" : n === 3 ? "세 해" : `${n}년`);
export const lenKo = (n: number) => (n === 1 ? "한 해" : n === 2 ? "두 해" : n === 3 ? "세 해" : `${n}년`);
export const NUMKO = ["", "한", "두", "세", "네", "다섯", "여섯", "일곱", "여덟", "아홉", "열"];
export const ORD = ["", "첫 번째", "두 번째", "세 번째", "네 번째", "다섯 번째"];

/** 방식(계열)별 어휘 */
export const M1: Record<Cat, string> = {
  비겁: "무엇을 할지 내가 먼저 정하고 밀고 가는",
  식상: "생각을 밖으로 꺼내 직접 해 보는",
  재성: "결과가 실제로 어떻게 나왔는지 하나씩 확인하는",
  관성: "지켜야 할 기준과 책임을 먼저 챙기는",
  인성: "충분히 이해하고 배운 뒤에 움직이는",
};
export const MS: Record<Cat, string> = {
  비겁: "내가 정하고 밀고 가는", 식상: "생각을 꺼내 바로 해 보는", 재성: "결과를 하나씩 확인하는", 관성: "기준과 책임을 챙기는", 인성: "이해하고 배우는",
};
/** 큰 시기(대운) 배경 표현("…쪽") */
export const DEC: Record<Cat, string> = {
  비겁: "무엇을 할지 내가 먼저 정하는", 식상: "생각을 밖으로 꺼내 직접 해 보는", 재성: "눈에 보이는 결과를 하나씩 확인하는", 관성: "정해진 기준과 책임을 먼저 챙기는", 인성: "충분히 이해하고 배운 뒤에 움직이는",
};
/** 큰 시기 습관(“…는 습관”) */
export const HAB: Record<Cat, string> = {
  비겁: "무엇이든 내가 먼저 정하려는", 식상: "생각나면 바로 해 보는", 재성: "결과부터 확인하려는", 관성: "기준부터 챙기려는", 인성: "충분히 이해한 뒤에 움직이려는",
};
export const PREVFOCUS: Record<Cat, string> = {
  비겁: "무엇을 할지 정하는 데", 식상: "정한 것을 꺼내 해 보는 데", 재성: "결과를 하나씩 확인하는 데", 관성: "정해진 기준과 책임을 챙기는 데", 인성: "이해하고 배우는 데",
};
export const CURFOCUS: Record<Cat, string> = {
  비겁: "이제 다시 무엇을 할지 내가 먼저 정하는 쪽으로 돌아옵니다",
  식상: "이제는 정한 것을 말하고 만들고 직접 해 보게 됩니다",
  재성: "이제는 해 본 것이 실제로 어떻게 나왔는지 들여다보게 됩니다",
  관성: "이제는 정해진 기준과 맡은 책임을 먼저 챙기게 됩니다",
  인성: "이제는 먼저 이해하려는 마음이 앞서고 배우는 시간이 늘어납니다",
};
/** 그 방식의 생활 장면(첫 시기·같은 계열 설명용) */
export const LIFE: Record<Cat, string> = {
  비겁: "새로 맡은 일이 생기면 순서를 정해 달라고 하기보다 방법부터 내가 정해 놓고 시작하고, 막히는 부분만 물어보는 식입니다.",
  식상: "떠오른 생각을 오래 묵히지 않고 말이나 결과물로 먼저 내놓고, 반응을 보면서 고쳐 가는 식입니다.",
  재성: "무엇이 실제로 남았는지를 그때그때 확인하면서 움직이고, 확인이 되면 다음으로 넘어가는 식입니다.",
  관성: "맡은 일의 기준과 기한을 먼저 확인하고 그 안에서 움직이니, 어디까지 해야 하는지 망설일 일이 적은 식입니다.",
  인성: "새로운 일을 만나면 먼저 알아보고 물어본 뒤에 움직이니, 시작은 느려도 흔들림이 적은 식입니다.",
};
/** “잘 됐는지”를 재는 기준 / 마무리 방식 / 시작 방식 / 의견 맞출 때 / 먼저 보는 질문 */
export const JUDGE: Record<Cat, string> = {
  비겁: "내가 정한 대로 됐는가", 식상: "생각한 것이 밖으로 제대로 나왔는가", 재성: "실제로 나온 결과가 무엇인가", 관성: "기준과 약속에 맞게 됐는가", 인성: "충분히 이해하고 했는가",
};
export const END: Record<Cat, string> = {
  비겁: "내가 하려던 대로 했다는 데서 마무리합니다", 식상: "생각한 것을 꺼내 보였다는 데서 마무리합니다", 재성: "결과를 확인한 뒤에 마무리합니다", 관성: "기준과 약속을 점검한 뒤에 마무리합니다", 인성: "충분히 이해했다고 느낄 때 마무리합니다",
};
export const END_NEED: Record<Cat, string> = {
  비겁: "내가 어떻게 할지 다시 정하고 나서야", 식상: "생각한 것을 실제로 한 번 꺼내 해 보고 나서야", 재성: "처음 생각과 실제 결과가 어디서 달랐는지 확인하고 나서야", 관성: "기준과 약속에 맞는지 점검하고 나서야", 인성: "무엇을 이해했고 무엇을 아직 모르는지 되짚어 보고 나서야",
};
export const START: Record<Cat, string> = {
  비겁: "내가 먼저 방법을 정하고 시작합니다", 식상: "일단 해 보면서 고쳐 갑니다", 재성: "무엇이 남을지 가늠해 본 뒤에 시작합니다", 관성: "규칙과 마감, 약속부터 확인하고 시작합니다", 인성: "충분히 알아보고 이해한 뒤에 시작합니다",
};
export const PEOPLE: Record<Cat, string> = {
  비겁: "다들 눈치만 볼 때 먼저 방향을 말하는 쪽", 식상: "떠오른 생각을 먼저 꺼내 놓는 쪽", 재성: "무엇이 실제로 도움이 되는지 따져 보는 쪽", 관성: "이건 누가 정하는 일인지부터 확인하는 쪽", 인성: "충분히 듣고 이해한 뒤에 말하는 쪽",
};
export const FIRSTQ: Record<Cat, string> = {
  비겁: "내가 정할 수 있는 일인지", 식상: "생각을 바로 꺼내 해 봐도 되는 일인지", 재성: "실제로 무엇이 남는 일인지", 관성: "이 일의 기준이 무엇이고 내 책임이 어디까지인지", 인성: "충분히 이해가 된 일인지",
};
/** 그 방식이 막힐 때의 모습 */
export const STALL: Record<Cat, string> = {
  비겁: "내가 정할 수 있는 범위가 좁아져서 하고 싶은 대로 움직이기 어렵습니다",
  식상: "떠오른 생각을 바로 꺼내 해 보지 못하고 기다려야 하는 때가 늘어납니다",
  재성: "결과가 눈에 보이기 전에 먼저 움직여야 하는 일이 늘어납니다",
  관성: "기준과 약속이 분명하지 않은 채로 움직여야 하는 일이 늘어납니다",
  인성: "이해할 시간이 부족한 채로 바로 결정해야 하는 일이 늘어납니다",
};
/** 잘 통하는 상태 */
export const GOOD: Record<Cat, string> = {
  비겁: "무엇을 할지 내가 정하고 밀고 가면, 주변이 따라오거나 적어도 막지는 않습니다. 결정하는 데 오래 망설이지 않아도 되고, 정한 것을 밖으로 꺼내는 일도 어렵지 않습니다.",
  식상: "떠오른 생각을 밖으로 꺼내 해 보면, 반응이 나쁘지 않고 손에 잡히는 모양으로 이어집니다. 머릿속에서만 굴리지 않아도 되고, 일단 해 보면서 고쳐 가는 방식이 잘 맞습니다.",
  재성: "눈에 보이는 결과를 하나씩 확인하면서 움직이면, 일이 헛돌지 않고 착실하게 쌓입니다. 무엇이 됐고 무엇이 남았는지가 분명해서 판단이 빨라집니다.",
  관성: "정해진 기준과 맡은 책임을 먼저 챙기면, 일이 순서대로 굴러가고 주변에서도 믿고 맡깁니다. 어디까지 해야 하는지가 분명해서 망설이는 시간이 줄어듭니다.",
  인성: "충분히 이해한 뒤에 움직이면, 시행착오가 줄고 마음이 흔들리지 않습니다. 물어볼 사람과 배울 곳이 자연스럽게 생겨서 근거를 갖추고 시작할 수 있습니다.",
};
/** 그 방식의 성향을 가진 사람이 가장 편한 일 / 가장 답답한 일 */
export const EASY: Record<Cat, string> = {
  비겁: "방법을 내가 정할 수 있는 일", 식상: "생각을 자유롭게 꺼내 해 볼 수 있는 일", 재성: "눈에 보이는 결과로 확인할 수 있는 일", 관성: "기준과 책임이 분명한 일", 인성: "충분히 이해하고 움직일 수 있는 일",
};
export const HARD: Record<Cat, string> = {
  비겁: "방법까지 이미 정해져 있는 일", 식상: "이해가 다 될 때까지 움직이지 말아야 하는 일", 재성: "결과가 보이기 전에 방향만 밀고 가야 하는 일", 관성: "기준 없이 즉흥으로 해 보라고 하는 일", 인성: "이해할 시간 없이 결과부터 내야 하는 일",
};

/** 연도 성격 라벨(“…해”) / 속마음 라벨 */
export const GANLABEL: Record<string, string> = {
  겁재: "비슷한 위치의 사람과 부딪히기 쉬운", 비견: "혼자 정하고 차분히 굳혀 가는", 식신: "차분히 만들고 다듬는", 상관: "하고 싶은 말이 먼저 나오는",
  정재: "하나씩 세밀하게 점검하는", 편재: "여러 가지를 한꺼번에 훑어보는", 정관: "정해진 절차를 그대로 지키는", 편관: "빨리 판단하고 처리해야 하는",
  정인: "배우고 받아들이는", 편인: "나만의 방식으로 파고드는",
};
export const JILABEL: Record<string, string> = {
  비견: "한 번 정한 것을 바꾸고 싶지 않은", 겁재: "다른 사람과 견주어 보게 되는", 식신: "차분히 만들고 말해 보고 싶은", 상관: "표현하고 해 보고 싶은 마음이 남아 있는",
  정재: "무엇이 실제로 손에 남는지 따지는", 편재: "할 수 있는 범위를 조금씩 넓히고 싶은", 정관: "맡은 일을 끝까지 책임지려는", 편관: "책임을 더 무겁게 잡는",
  정인: "서두르지 않고 배우고 싶은", 편인: "남과 다른 각도로 이해하고 싶은",
};

/** 계산 신호 한 줄 요약(①에서 사용) */
export const SHORTSIG: Record<string, string> = {
  "합:year": "오래 알아 온 사람들과 다시 가까워지는 쪽으로 마음이 움직입니다.",
  "합:month": "일하는 자리에 마음이 붙습니다.",
  "합:day": "생활이 가까운 사람과 자연스럽게 맞물립니다.",
  "합:hour": "앞날의 계획에 마음이 쏠립니다.",
  "합:dayun": "지금 큰 시기의 분위기와도 이어져서 부담이 적습니다.",
  "충:year": "오래 알아 온 사람들과 방식이 다르다는 점이 분명해집니다.",
  "충:month": "일하는 자리의 익숙한 방식이 한 번 흔들립니다.",
  "충:day": "생활 방식을 가까운 사람과 다시 맞춰 봐야 합니다.",
  "충:hour": "세워 둔 계획이 결과와 어긋나서 다시 따져 보게 됩니다.",
  "충:dayun": "하던 방식 자체를 다시 손봐야 한다는 느낌이 옵니다.",
  "자형:year": "밖으로 일을 벌이기 전에 혼자 정리부터 끝내려는 마음이 커집니다. 집안이나 오래 알아 온 관계에서 특히 그렇습니다.",
  "자형:month": "일하는 쪽에서는 밖으로 벌이기보다 먼저 안에서 정리하는 데 마음이 쏠립니다.",
  "자형:day": "밖에 보이는 것보다 내 생활 안쪽을 정리하는 데 마음이 쓰입니다.",
  "자형:hour": "앞날의 계획을 두고 같은 생각이 맴돕니다.",
  "자형:dayun": "하던 방식이 이대로 맞는지 스스로 되묻는 일도 함께 늘어납니다.",
  "천간합:year": "오래 알아 온 사람들, 하던 방식과 마음이 이어집니다.",
  "천간합:month": "하는 일과 마음이 이어져서 일 이야기가 술술 나옵니다.",
  "천간합:day": "나 자신에게 직접 걸려서 내 몫으로 돌아보게 됩니다.",
  "천간합:hour": "앞날의 계획과 손을 잡아 지금 하는 일이 계획으로 이어집니다.",
  "천간합:dayun": "지금 큰 시기의 습관과도 손을 잡습니다.",
  "전환:dayun": "큰 시기가 바뀌는 해라서 삶의 배경이 되는 방식 자체가 달라지기 시작합니다.",
};

export const STAGE_NAME: Record<Stage, string> = { year: "집안이나 오래 알아 온 관계", month: "일이나 사회 활동", day: "나 자신이나 가까운 사람과의 생활", hour: "앞으로의 계획" };
export const STAGE_SHORT: Record<Stage, string> = { year: "오래 알아 온 사람들", month: "일하는 자리", day: "나 자신과 가까운 사람과의 생활", hour: "앞으로의 계획" };
export const STAGE_LBL: Record<Stage, string> = { year: "년", month: "월", day: "일", hour: "시" };
export const GAN_STAGE_LBL: Record<Stage, string> = { year: "년간", month: "월간", day: "일간", hour: "시간" };
export const SIG_LABEL = (s: Sig) => {
  const t = s.target === "dayun" ? "대운" : s.kind === "천간합" ? { year: "년간", month: "월간", day: "일간", hour: "시간" }[s.target] : { year: "년지", month: "월지", day: "일지", hour: "시지" }[s.target];
  return `${s.kind} ${s.pair}(${t})`;
};
/** 같은 종류·같은 글자쌍은 하나로 합쳐 표기: 합 未午(년지·대운) */
export function sigLabels(sigs: Sig[]): string[] {
  const out: { kind: string; pair: string; ts: string[] }[] = [];
  sigs.filter((s) => s.kind !== "전환").forEach((s) => {
    const t = s.target === "dayun" ? "대운" : s.kind === "천간합" ? { year: "년간", month: "월간", day: "일간", hour: "시간" }[s.target] : { year: "년지", month: "월지", day: "일지", hour: "시지" }[s.target];
    const g = out.find((o) => o.kind === s.kind && o.pair === s.pair);
    if (g) g.ts.push(t); else out.push({ kind: s.kind, pair: s.pair, ts: [t] });
  });
  return out.map((o) => `${o.kind} ${o.pair}(${o.ts.join("·")})`);
};

/** 5종 관계 → 명리 근거 표현 */
export const REL_BASIS: Record<string, string> = {
  same: "대운과 같은 계열", supported: "시기 힘이 대운 힘을 도움", feeds: "대운이 시기 힘을 낳음", pressed: "대운이 시기 힘을 누름", presses: "시기 힘이 대운 힘을 누름",
};
export const NATAL_REL_BASIS: Record<string, string> = {
  same: "같은 계열", feeds: "타고난 힘이 시기 힘을 낳음", supported: "시기 힘이 타고난 힘을 도움", pressed: "타고난 힘이 시기 힘을 누름", presses: "시기 힘이 타고난 힘을 누름",
};

/** 묶음 표기 도우미 */
export function joinKo(items: string[], conj = "과 "): string {
  if (items.length <= 1) return items[0] ?? "";
  return items.slice(0, -1).join(", ") + ", " + items[items.length - 1];
}
export function withGwa(w: string): string { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c % 28 !== 0 ? "과" : "와"; }
export function iGa(w: string): string { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c % 28 !== 0 ? "이" : "가"; }
export function eunNeun(w: string): string { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c % 28 !== 0 ? "은" : "는"; }
export function strip(s: string): string { return s.replace(/\s+/g, " ").trim(); }
/** 대운 단독/전환 표기에서 쓰는 “N년” */
export const Y = (n: number) => `${n}년`;
export function yearsOfRuns(rs: RunF[]): string { return rs.map((r) => runYr(r)).join(", "); }
export function firstYear(y: YearF[]): YearF { return y[0]; }

/** 큰 시기가 바뀔 때의 배경 이동 표현(같은 계열이면 방향은 이어지고 결만 달라진다고 쓴다) */
export function dayunShift(pd: Cat, cd: Cat): string {
  return pd === cd ? `삶의 배경이 같은 쪽(${DEC[cd]} 쪽)을 이어 가면서 결이 달라지기 시작해서, 하던 방식을 조금씩 손보게 됩니다.` : `삶의 배경이 ${DEC[pd]} 쪽에서 ${DEC[cd]} 쪽으로 옮겨 가기 시작해서, 앞 시기에 익숙했던 방식이 그대로는 맞지 않는다고 느끼기 쉽습니다.`;
}

/** ① 연도 설명용: 그 해 겉모습의 생활 장면 한 문장(십성별) */
export const GANSCENE: Record<string, string> = {
  겁재: "의견이 갈리면 내 생각부터 꺼내 놓게 됩니다.",
  비견: "겨루기보다 내가 하던 대로 다듬는 일이 편해집니다.",
  식신: "새로 던지기보다 이미 시작한 일을 다듬는 데 시간이 갑니다.",
  상관: "틀에 맞지 않는다 싶으면 참기보다 먼저 말로 꺼내게 됩니다.",
  정재: "끝낸 일을 원래 의도와 대조해 남은 것과 빠진 것을 가려냅니다.",
  편재: "쓸 만한 것부터 가려내고, 필요 없다고 느끼면 미련 없이 넘어갑니다.",
  정관: "순서와 마감, 규칙을 먼저 지키게 됩니다.",
  편관: "기한이 있거나 부담이 큰 일을 빨리 판단해 처리하는 일이 늘어납니다.",
  정인: "새로 시작하기 전에 배우고, 아는 사람에게 묻는 시간이 앞섭니다.",
  편인: "혼자 생각을 정리하는 시간이 길어지고 남의 시선은 덜 신경 쓰입니다.",
};
/** ① 연도 설명용: 속마음 문장(십성별) */
export const JICLAUSE: Record<string, string> = {
  비견: "마음 깊은 곳에서는 한 번 정한 것을 바꾸고 싶지 않은 마음이 굳어집니다.",
  겁재: "마음 깊은 곳에서는 다른 사람과 견주어 보는 마음이 올라옵니다.",
  식신: "마음 깊은 곳에서는 차분히 만들고 싶은 마음이 커서, 결정에서 그치지 않고 말이나 결과물로 보여 주는 일까지 이어집니다.",
  상관: "마음 깊은 곳에서는 표현하고 해 보고 싶은 마음이 남아 있어서, 하던 방식과 다르게 해 보고 싶은 생각이 빠르게 올라옵니다.",
  정재: "마음 깊은 곳에서는 실속을 따지는 마음이 받쳐 주어서, 꺼낸 것이 실제로 손에 잡히는 결과가 되는지를 함께 살핍니다.",
  편재: "마음 깊은 곳에서는 할 수 있는 범위를 조금씩 넓혀 보고 싶은 마음이 있습니다.",
  정관: "마음 깊은 곳에서는 맡은 일을 끝까지 책임지려는 마음이 바닥에 깔려 있습니다.",
  편관: "마음 깊은 곳에서는 책임을 더 무겁게 잡는 마음이 있어서, 대충 넘어가는 것이 마음에 걸립니다.",
  정인: "마음 깊은 곳에서는 서두르지 않고 배우고 싶은 마음이 앞섭니다.",
  편인: "마음 깊은 곳에서는 남과 다른 각도로 이해하고 싶은 마음이 있습니다.",
};

/** 앞뒤 해와 왜 다른지 — 앞 해와 이 해의 실제 신호 차이에서만 만든다(최대 2문장, 결정론) */
export function deltaSentences(prev: YearF | null, y: YearF): string[] {
  if (!prev) return [];
  const nat = (v: YearF) => v.sigs.filter((s) => s.kind !== "전환");
  const P = nat(prev), C = nat(y);
  const pClash = P.some((s) => s.kind === "충"), cClash = C.some((s) => s.kind === "충"), cSelf = C.some((s) => s.kind === "자형");
  const conn = C.filter((s) => s.kind === "합" || s.kind === "천간합");
  const out: string[] = [];
  const RELIEF: Record<string, string> = {
    year: "앞 해에는 혼자 정리하느라 거리가 있었다면, 이 해에는 먼저 연락하고 이야기를 나누는 일이 어렵지 않습니다.",
    month: "앞 해에는 일에 대해 혼자 안에서 따져 보던 마음이, 이 해에는 일 이야기를 밖으로 꺼내는 쪽으로 바뀝니다.",
    day: "앞 해에는 내 생활을 혼자 되짚던 마음이, 이 해에는 가까운 사람과 맞춰 가는 쪽으로 바뀝니다.",
    hour: "앞 해에는 계획을 두고 같은 생각을 되풀이하던 마음이, 이 해에는 계획이 하나로 이어지는 쪽으로 바뀝니다.",
  };
  if (pClash && !cClash) out.push(`${prev.y}년처럼 정면으로 부딪히는 느낌은 누그러집니다.${!cSelf && conn.length ? " 이 해에는 부딪히는 관계 없이 이어지는 관계만 걸려 있기 때문입니다." : ""}`);
  else if (!pClash && cClash) out.push(`${prev.y}년에는 부딪히는 신호가 걸리지 않았지만, 이 해에는 부딪히는 관계가 걸려 있어서 체감이 달라집니다.`);
  for (const tgt of ["year", "month", "day", "hour"]) {
    if (out.length >= 2) break;
    if (P.some((s) => s.kind === "자형" && s.target === tgt) && conn.some((s) => s.target === tgt)) out.push(RELIEF[tgt]);
  }
  // 앞 해에 부딪힘·되풀이가 있었고 이 해에는 이어지는 관계만 걸릴 때만 '이어지는 관계만'이라고 말한다
  const pHard = P.some((s) => s.kind === "충" || s.kind === "자형");
  if (out.length < 2 && C.length > 0 && !cClash && !cSelf && conn.length === C.length && pHard && !(pClash && !cClash)) out.push("이 해에는 부딪히는 관계가 없고, 이어지는 관계만 걸립니다.");
  if (out.length < 2 && pClash && !cClash && conn.some((s) => s.target === "dayun" || s.target === "year")) out.push(y.ganSs === "편관" ? "쫓기는 와중에도 하던 방식이 버팀목이 되어, 하던 것을 통째로 뒤엎지 않고 이어 갑니다." : "하던 방식이 버팀목이 되어, 흔들림이 덜한 채로 이어 갑니다.");
  if (out.length < 2 && C.length === 0 && P.length >= 2) out.push(`${prev.y}년에 여러 관계가 걸려 있던 것과 달리, 이 해에는 따로 걸리는 관계가 없어서 조용히 지나갑니다.`);
  else if (out.length < 2 && C.length + (y.sameAsDayun ? 1 : 0) >= 3 && P.length + (prev.sameAsDayun ? 1 : 0) <= 1) out.push(`${prev.y}년보다 걸리는 것이 훨씬 많아져서 체감이 커집니다.`);
  return out.slice(0, 2);
}

/** 사주에 시주가 없으면 영역은 셋이다 */
export const domainWord = (hasHour: boolean): string => (hasHour ? "네" : "세");
