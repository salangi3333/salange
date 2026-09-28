// 7장 ① 「앞으로 10년, 한눈에」 결정론 생성기(정식 모듈). 같은 facts → 같은 글. 랜덤 없음.
import { Cat, Facts, RunF, YearF, Rel, GEN, presserOf } from "./facts";
import * as L from "./lex";
import { nm, DEC, HAB, MS, M1, LIFE, PREVFOCUS, CURFOCUS, GANLABEL, JILABEL, GANSCENE, JICLAUSE, SHORTSIG, runYr, yr, lenTxt } from "./lex";

export interface Block { heading: string; lead: string[]; sections: { heading: string; paras: string[] }[]; basis: { claim: string; calc: string }[]; claims: { y: number; sigs: string[] }[] }

const FAST = new Set(["상관", "편재", "편관", "편인", "겁재"]);
const TITLE: Record<Cat, string> = { 비겁: "내가 먼저 정하고 시작하는", 식상: "정한 것을 밖으로 꺼내 해 보는", 재성: "해 본 결과를 하나씩 들여다보는", 관성: "정해진 기준과 책임이 앞서는", 인성: "충분히 이해하고 배운 뒤에 움직이는" };
const HEAD_FIRST: Record<Cat, string> = {
  비겁: "무엇을 할지 내가 먼저 정하고 움직이게 됩니다. 남이 정해 주기를 기다리기보다 일단 결론을 내고 시작하는 모습입니다.",
  식상: "머릿속에 있던 것을 실제로 꺼내 보게 됩니다. 정한 것을 말하고 만들고 직접 해 보는 일이 늘어나고, 계획을 혼자 품고 있기보다 주변에 이야기해 보는 일이 잦아집니다.",
  재성: "해 놓은 것이 실제로 어떻게 나왔는지 들여다보게 됩니다. 처음 생각과 결과가 얼마나 같고 다른지, 무엇이 남고 무엇이 빠졌는지를 하나하나 따져 보게 됩니다.",
  관성: "내가 정한 방식보다 정해진 기준과 맡은 책임이 앞섭니다. 무언가를 시작하기 전에 규칙과 마감, 약속부터 확인하게 됩니다.",
  인성: "밀어붙이기보다 먼저 이해하려는 마음이 앞섭니다. 새로 시작하기 전에 배우고, 아는 사람에게 묻고, 이해가 될 때까지 시간을 씁니다.",
};
const HEADLINE: Record<Cat, string> = {
  비겁: "무엇을 할지 내가 먼저 정하는 쪽이 다시 앞에 나오는 시기입니다.",
  식상: "머릿속에 있던 것을 실제로 꺼내 보는 시기입니다.",
  재성: "말하고 꺼내 보는 시기가 지나고, 해 본 것이 실제로 어떻게 나왔는지 들여다보는 시기가 옵니다.",
  관성: "내가 정한 방식보다 정해진 기준과 맡은 책임이 앞서는 시기입니다.",
  인성: "밀어붙이기보다 먼저 이해하려는 마음이 앞서는 시기입니다.",
};
const DETAIL: Record<Cat, string> = {
  비겁: "충분히 이해한 만큼 내 판단에 확신이 붙어서, 결정이 다시 빨라집니다.",
  식상: "계획을 혼자 품고 있기보다 주변에 이야기해 보고, 완벽하게 정리되기 전에 일단 시안이라도 만들어 보는 일이 늘어납니다.",
  재성: "지금까지 해 온 것을 처음부터 다시 점검하느라 시간이 길어지기도 합니다.",
  관성: "내가 정한 대로 밀고 가려 하면 기준과 약속이 먼저 제동을 거는 느낌이 듭니다. 앞 시기까지 결과를 보고 내가 고칠 수 있었다면, 이제는 고칠 수 없는 기준이 먼저 놓이는 것처럼 느껴집니다.",
  인성: "새로운 일도 서두르지 않고 알아보는 시간이 눈에 띄게 늘어나고, 결정을 내리는 속도는 느려집니다.",
};
const FEEDS_LIFE: Record<Cat, string> = {
  비겁: "내가 정하고 밀고 가는 힘이 큰 사람은 정한 것이 곧바로 밖으로 나오기 쉽습니다",
  식상: "생각을 꺼내 해 보는 힘이 큰 사람은 해 본 것이 곧바로 눈에 보이는 결과로 확인되기 쉽습니다",
  재성: "결과를 확인하는 힘이 큰 사람은 확인한 것이 곧 기준과 책임으로 굳어지기 쉽습니다",
  관성: "기준과 책임을 챙기는 힘이 큰 사람은 그 책임 안에서 배우고 이해하는 일이 자연스럽게 따라옵니다",
  인성: "이해하고 배우는 힘이 큰 사람은 이해한 것을 바탕으로 내가 정하는 일이 자연스럽게 따라옵니다",
};
const PRESSED_LIFE: Record<Cat, string> = {
  비겁: "내가 정하고 밀고 가는 힘이 워낙 강해서, 결과를 있는 그대로 받아들이기보다 내 기준으로 필요한 것만 골라 확인하고 나머지는 넘겨 버리려 합니다. 마음에 들지 않는 결과가 나오면 받아들이기 전에 내 방식대로 다시 고쳐서 밀어붙이고 싶어질 수 있습니다.",
  식상: "생각을 꺼내 해 보는 힘이 워낙 강해서, 정해진 기준을 확인하는 단계를 건너뛰고 싶어집니다. 기준에 맞추는 일이 답답하게 느껴질 수 있습니다.",
  재성: "결과를 확인하는 힘이 워낙 강해서, 이해하는 일에도 곧바로 눈에 보이는 성과를 기대하게 됩니다. 배우는 시간이 결과로 보이지 않으면 조급해질 수 있습니다.",
  관성: "기준과 책임을 챙기는 힘이 워낙 강해서, 내가 먼저 정하고 밀고 가는 일에도 기준부터 찾게 됩니다. 정해진 기준 없이 내 판단으로 결정하는 일이 부담스럽게 느껴질 수 있습니다.",
  인성: "이해하고 배우는 힘이 워낙 강해서, 생각을 꺼내 해 보는 일도 이해가 다 된 뒤로 미루게 됩니다. 덜 준비된 채로 꺼내는 일이 불편하게 느껴질 수 있습니다.",
};
export const PREV_PRESSES: Record<Cat, string> = {
  관성: "앞 시기에는 기준과 책임이 내 방식을 눌렀다면,", 인성: "앞 시기에는 이해가 될 때까지 기다리느라 꺼내는 일이 늦어졌다면,", 식상: "앞 시기에는 떠오르는 대로 해 보는 일이 기준과 어긋났다면,",
  비겁: "앞 시기에는 내 방식을 앞세우느라 결과를 챙기는 일이 뒤로 밀렸다면,", 재성: "앞 시기에는 결과부터 내야 하는 부담이 이해할 시간을 눌렀다면,",
};
const SUP_TAIL: Record<Cat, string> = {
  인성: "이해하고 배운 것이 내가 정하고 밀고 가는 데 확신을 더해 줍니다",
  비겁: "내가 정한 대로 밀고 가는 힘이 생각을 꺼내 해 보는 일에 뒷심이 됩니다",
  식상: "꺼내 해 본 것이 곧 확인할 재료가 되어 결과를 챙기는 일이 수월해집니다",
  재성: "확인한 결과가 기준과 책임을 세우는 근거가 됩니다",
  관성: "맡은 책임을 겪은 경험이 이해하고 배우는 일을 뒷받침합니다",
};
const HANDOFF: Record<Cat, string> = {
  비겁: "다시 내가 먼저 정하는 쪽으로 돌아옵니다",
  식상: "먼저 정하는 힘이 한발 물러나고, 정한 것을 밖으로 꺼내 해 보는 쪽이 앞에 나옵니다",
  재성: "이렇게 꺼내 해 본 것이 실제로 어떻게 나왔는지 하나씩 확인하는 쪽으로 넘어갑니다",
  관성: "확인한 것을 넘어, 정해진 기준과 책임을 먼저 챙기는 쪽으로 넘어갑니다",
  인성: "밀어붙이는 쪽에서 벗어나, 충분히 이해한 뒤에 움직이는 쪽으로 넘어갑니다",
};

function rankOrd(f: Facts, c: Cat): string { return ["", "가장 큰", "두 번째로 큰", "세 번째로 큰"][f.rank[c]] ?? "작은"; }
function unfamReason(r: RunF): string {
  return r.cls === "dayOnly" ? `‘${MS[r.c]} 힘’이 사주 안에서 겉으로 드러나지 않고 안쪽에 조금만 있기 때문입니다.`
    : r.cls === "absent" ? `‘${MS[r.c]} 힘’이 사주에 거의 자리 잡고 있지 않기 때문입니다.`
    : `‘${MS[r.c]} 힘’이 사주 안에서 작은 편이기 때문입니다.`;
}

/**
 * 큰 시기와의 관계 문장 — 한 리포트(=하나의 Facts 인스턴스) 안에서는 설명을 한 번만 풀어 쓰고
 * 그다음부터는 줄여 쓴다. 이전에는 이 "한 번만" 상태를 모듈 전역 변수(habState)로 들고 있어서,
 * 같은 프로세스에서 리포트를 연달아 생성하면(예: 다음 고객, 또는 dayunRelSentences를 직접 호출하는
 * b1_merged.ts 같은 다른 생성기) 두 번째 리포트부터 이 설명이 사라지는 문제가 있었다(고객 간 상태 누수).
 * WeakSet<Facts>로 바꿔서, "한 번만" 상태의 범위를 그 리포트가 쓰는 Facts 인스턴스 하나로 한정한다.
 * buildFacts()는 리포트 생성마다 새 Facts 객체를 만들기 때문에, 이 범위가 정확히 "리포트 1회 생성 단위"와
 * 일치한다. generateB1() 쪽에서 하던 "호출 시작 시 리셋"은 이제 필요 없다(리셋을 잊어도 새지 않는다).
 */
const habSeen = new WeakSet<Facts>();
const habTxt = (f: Facts, c: Cat): string => {
  if (habSeen.has(f)) return "지금 큰 시기의 습관";
  habSeen.add(f);
  return `지금 큰 시기의 습관, 곧 ${HAB[c]} 쪽`;
};
export function dayunRelSentences(f: Facts, r: RunF): string[] {
  const groups: { rel: Rel; H: Cat; ys: YearF[] }[] = [];
  r.ys.forEach((y) => { const l = groups[groups.length - 1]; if (l && l.rel === y.relD && l.H === y.dayun.cat) l.ys.push(y); else groups.push({ rel: y.relD, H: y.dayun.cat, ys: [y] }); });
  return groups.map((g, i) => {
    const pre = groups.length > 1 ? `${g.ys[0].y}년${i === 0 ? "까지는" : "부터는"} ` : "";
    switch (g.rel) {
      case "same": return `${pre}지금 큰 시기도 같은 쪽이라, 그 모습이 한 번 더 겹칩니다.`;
      case "supported": return `${pre}이 시기의 힘은 ${habTxt(f, g.H)}을 뒤에서 밀어 줘서 그 습관이 한결 쉽게 나옵니다.`;
      case "feeds": return `${pre}${habTxt(f, g.H)}이 이 시기로 자연스럽게 이어져서, 하던 일의 다음 단계를 보는 느낌에 가깝습니다.`;
      case "pressed": return `${pre}${habTxt(f, g.H)}은 이 시기의 요구와 맞서는 쪽에 서 있어서, 무겁게 느껴져도 완전히 막히지는 않습니다.`;
      default: return `${pre}이 시기의 힘이 ${habTxt(f, g.H)}을 눌러서, 그 습관을 쓰기가 어려워집니다.`;
    }
  });
}

/** 원래 방식과의 관계 설명(핵심 문단) */
function fitPara(f: Facts, r: RunF, ri: number): string {
  const n = nm(f), c = r.c, N = f.N;
  const prev = ri > 0 ? f.runs[ri - 1] : null;
  switch (r.relN) {
    case "same":
      return `이 방식은 ${n}이 원래 가장 편하게 쓰는 방식입니다. 사주 안에서 ‘${MS[c]} 힘’이 제일 크기 때문에, 이 시기에는 바깥에서 오는 일까지 같은 쪽이라 애쓰지 않아도 저절로 그렇게 됩니다. ${LIFE[c]}`;
    case "feeds":
      return `이 모습은 ${n}의 원래 방식에서 그대로 이어지기 때문에 낯설지 않습니다. ${FEEDS_LIFE[N]}.`;
    case "pressed":
      return r.fam
        ? `이 방식은 ${n}에게 낯설지는 않지만, 이 시기에는 내 방식으로 다스려야 하는 쪽으로 다가옵니다. ${PRESSED_LIFE[N]}`
        : `이 방식은 ${n}이 평소 잘 쓰지 않던 방식이라 처음에는 손에 잘 안 익습니다. ${unfamReason(r)} 게다가 ${PRESSED_LIFE[N]}`;
    case "presses":
      return r.fam
        ? `이 방식이 ${n}에게 낯선 것은 아닙니다. 사주 안에서 ${rankOrd(f, c)} 힘이 바로 ‘${MS[c]} 힘’이기 때문입니다. 문제는 그 힘이 앞으로 나오면서 가장 큰 힘인 ‘${MS[N]} 힘’과 정면으로 부딪힌다는 점입니다.`
        : `이 방식은 ${n}에게 낯선 데다, 가장 큰 힘인 ‘${MS[N]} 힘’과도 정면으로 부딪힙니다. ${unfamReason(r)} 그래서 내 방식으로 밀고 가려 할 때마다 이 방식이 먼저 제동을 거는 느낌이 듭니다.`;
    default: {
      const head = prev && prev.relN === "presses" ? `${PREV_PRESSES[prev.c]} 이 시기에는 ${SUP_TAIL[c]}.` : `이 시기에는 ${SUP_TAIL[c]}.`;
      return `이 방식은 ${n}의 원래 방식과 부딪히지 않고 오히려 받쳐 줍니다. ${head}${prev && prev.relN === "presses" ? " 그래서 앞 시기에 무겁던 느낌이 조금 가라앉을 수 있습니다." : ""}`;
    }
  }
}

/** 연도 한 해의 짧은 설명(① 안에서만 쓰는 압축본) — 그 해의 실제 신호가 있을 때만 생활 장면을 붙인다 */
function yearShort(f: Facts, y: YearF, prevY: YearF | null, claims: Block["claims"], firstOfRun: boolean): string {
  const bits: string[] = [];
  const pv = f.years.find((v) => v.y === y.y - 1) ?? null;
  if (firstOfRun || !prevY) {
    bits.push(y.cat === y.jiCat
      ? `${y.y}년에는 이 모습이 두 겹으로 나타납니다. 겉으로도 마음 깊은 곳에서도 ‘${MS[y.cat]} 힘’이 함께 움직여서, ${GANLABEL[y.ganSs]} 모습이 뚜렷합니다. ${GANSCENE[y.ganSs]}`
      : `${y.y}년은 겉과 속이 조금 다릅니다. 겉으로는 ${GANLABEL[y.ganSs]} 모습입니다. ${GANSCENE[y.ganSs]} ${JICLAUSE[y.jiSs]}`);
  } else {
    bits.push(`${y.y}년은 결이 달라집니다. 바로 앞의 ${prevY.y}년은 ${GANLABEL[prevY.ganSs]} 해, ${y.y}년은 ${GANLABEL[y.ganSs]} 해입니다. ${GANSCENE[y.ganSs]}${y.cat === y.jiCat ? "" : ` ${JICLAUSE[y.jiSs]}`}`);
  }
  // 큰 시기와 부딪히는 신호는 관계가 긍정일 때 ①에서 뺀다(③에서 함께 풀어 설명)
  const sigs = y.sigs.filter((s) => s.kind !== "전환" && !(s.kind === "충" && s.target === "dayun" && (y.relD === "same" || y.relD === "supported" || y.relD === "feeds")));
  const pick = sigs.slice(0, 2);
  pick.forEach((s) => { bits.push(SHORTSIG[`${s.kind}:${s.target}`]); });
  if (pick.length) claims.push({ y: y.y, sigs: pick.map((s) => s.id) });
  // 앞 해가 정면으로 부딪히는 해였고 이 해에는 없다면, 그 차이를 한 줄로 말한다
  if (pv && pv.sigs.some((s) => s.kind === "충") && !y.sigs.some((s) => s.kind === "충")) {
    bits.push(`${pv.y}년만큼 부딪히는 느낌은 아닙니다.`);
    if (y.sigs.some((s) => s.kind === "천간합" && (s.target === "dayun" || s.target === "year"))) bits.push("쫓기는 일이 있어도 하던 것을 한꺼번에 뒤엎지는 않습니다.");
  }
  if (y.isTransition) { bits.push(SHORTSIG["전환:dayun"]); claims.push({ y: y.y, sigs: ["전환"] }); }
  if (!pick.length && !y.isTransition) bits.push("사주나 큰 시기와 따로 걸리는 관계는 없어서, 겉과 속의 모습이 그대로 드러나는 해입니다.");
  return bits.join(" ");
}

const FEEDS_LINK: Record<Cat, string> = {
  비겁: "내가 정한 것이 밖으로 나오는 쪽으로", 식상: "그 결과를 살피는 쪽으로", 재성: "확인한 것이 기준과 책임으로 굳어지는 쪽으로", 관성: "그 책임 안에서 배우고 이해하는 쪽으로", 인성: "이해한 것을 바탕으로 내가 정하는 쪽으로",
};

function dayunIntro(f: Facts): string {
  const segs = f.segs;
  const a = segs[0];
  if (segs.length === 1) {
    const started = f.years[0].dayunStarts;
    const when = started ? `${a.startYear}년에 막 시작되었고,` : `${a.startYear}년에 시작되어 ${a.endYear}년까지 이어지고,`;
    return `이 10년은 지금 지나고 있는 큰 시기(10년 단위로 바뀌는 삶의 배경) 안에 있습니다. 이 큰 시기는 ${when} ${DEC[a.cat]} 쪽입니다.`;
  }
  const b = segs[1];
  const sameCat = a.cat === b.cat;
  return sameCat
    ? `이 10년 안에서 큰 시기(10년 단위로 바뀌는 삶의 배경)가 ${b.ys[0]}년에 한 번 바뀝니다. 앞뒤 큰 시기 모두 ${DEC[a.cat]} 쪽이라 방향은 이어지고 결만 달라집니다.`
    : `이 10년 안에서 큰 시기(10년 단위로 바뀌는 삶의 배경)가 한 번 바뀝니다. ${b.ys[0] - 1}년까지는 ${DEC[a.cat]} 쪽이고, ${b.ys[0]}년부터는 ${DEC[b.cat]} 쪽입니다.`;
}

function bigShape(f: Facts): string {
  type G = { key: string; text: string; rs: RunF[] };
  const desc = (r: RunF): { key: string; text: string } => {
    if (r.relN === "presses") return { key: "presses", text: "가장 큰 힘과 정면으로 맞부딪히는 시기로 옵니다" };
    if (r.relN === "same" || r.relN === "feeds") return { key: "home", text: "원래 쓰던 방식과 자연스럽게 이어져서 편합니다" };
    if (r.relN === "pressed") return r.fam ? { key: "pressedF", text: "내 방식으로 다스려야 하는 일이 앞에 나옵니다" } : { key: "pressedU", text: "평소 잘 쓰지 않던 방식이 앞에 나옵니다" };
    return { key: "sup", text: r.ys[0].y === f.years[0].y ? "내 방식을 받쳐 주는 쪽으로 시작합니다" : "다시 내 방식을 받쳐 주는 쪽으로 돌아옵니다" };
  };
  const gs: G[] = [];
  f.runs.forEach((r) => { const d = desc(r); const l = gs[gs.length - 1]; if (l && l.key === d.key) l.rs.push(r); else gs.push({ key: d.key, text: d.text, rs: [r] }); });
  const parts = gs.map((g) => {
    const ys = g.rs.flatMap((r) => r.ys.map((y) => y.y)); const label = yr([ys[0], ys[ys.length - 1]]);
    const cs = g.rs.map((r) => MS[r.c]); const cat = cs.length === 1 ? `${cs[0]} 방식` : `${cs[0]} 방식에서 ${cs[cs.length - 1]} 방식으로 이어지는 구간`;
    return g.key === "presses" ? `${label}에는 ${cat}이 ${g.text}` : g.key === "home" || g.key === "sup" ? `${label}은 ${cat}이라 ${g.text}` : `${label}에는 ${cat}이라 ${g.text}`;
  });
  return `큰 모양을 먼저 말씀드리면 이렇습니다. ${parts.map((p, i) => (i === parts.length - 1 && parts.length > 1 ? `그리고 ${p}` : p)).join(". ")}.`;
}

export function generateB1(f: Facts): Block {
  // habSeen은 이제 Facts 인스턴스별로 스스로 범위가 잡히므로(WeakSet<Facts>) 여기서 리셋할 필요가 없다.
  const n = nm(f); const claims: Block["claims"] = [];
  const runs = f.runs; const allTwo = runs.every((r) => r.ys.length === 2);
  const times = allTwo ? `2년씩 ${L.NUMKO[runs.length]} 번` : `${L.NUMKO[runs.length]} 번`;
  const lead = [
    `앞으로 10년은 ${times}, 내가 어떻게 생각하고 어떻게 움직이는지가 조금씩 바뀝니다. 그 ${L.NUMKO[runs.length]} 번의 모습을 ${n}의 사주에서 차례로 풀어 봅니다. ${dayunIntro(f)}`,
    bigShape(f),
  ];
  const sections: Block["sections"] = [];
  runs.forEach((r, ri) => {
    const prev = ri > 0 ? runs[ri - 1] : null; const next = ri < runs.length - 1 ? runs[ri + 1] : null;
    const y0 = r.ys[0];
    const mod = r.relN === "presses" ? ", 가장 부딪히는" : r.relN === "pressed" && !r.fam ? ", 손에 덜 익은" : "";
    const heading = `${runYr(r)} · ${TITLE[r.c]}${mod} ${lenTxt(r.ys.length)}`;
    const paras: string[] = [];
    // 1) 시작 문단
    const open: string[] = [];
    if (!prev) {
      open.push(`${y0.y}년부터 ${r.ys.length}년 동안 ${n}은 ${HEAD_FIRST[r.c]}`);
    } else {
      open.push(`${y0.y}년부터는 ${HEADLINE[r.c]} 앞의 ${lenTxt(prev.ys.length)}${L.iGa(lenTxt(prev.ys.length))} ${PREVFOCUS[prev.c]} 마음이 쓰였다면, ${CURFOCUS[r.c]}.`);
      open.push(DETAIL[r.c]);
    }
    if (y0.dayunStarts && f.prevDayun && f.segs.length >= 1) {
      const pd = f.prevDayun, cd = y0.dayun;
      let s = `${y0.y}년은 10년 단위의 큰 시기가 새로 시작되는 첫 해이기도 합니다. `;
      if (pd.cat !== cd.cat) s += `바로 앞 10년의 배경이 ${DEC[pd.cat]} 쪽이었다면, 이제부터는 ${DEC[cd.cat]} 쪽으로 바뀝니다.`;
      else { const pf = FAST.has(pd.ss), cf = FAST.has(cd.ss); s += pf === cf ? `바로 앞 10년과 같은 쪽이라 방향은 이어지고 결만 조금 달라집니다.` : pf ? `바로 앞 10년이 속도가 붙는 쪽이었다면, 이제는 차분히 굳혀 가는 쪽으로 바뀝니다.` : `바로 앞 10년이 하나씩 차분히 쌓아 가는 시간이었다면, 이제는 결정이 빨라지고 내가 정한 방식이 겉으로 더 분명하게 드러납니다.`; }
      open.push(s);
    }
    paras.push(open.join(" "));
    // 2) 원래 방식과의 관계 + 큰 시기 관계
    const dr = dayunRelSentences(f, r);
    const softFeeds = r.relN === "pressed" && !r.fam && r.ys[0].relD === "feeds";
    const conflictRuns = runs.filter((x) => (x.relN === "presses" || x.relN === "pressed") && x.ys.some((y) => y.relD === "presses" || y.relD === "pressed"));
    const uniqueConflict = conflictRuns.length === 1 && conflictRuns[0] === r && r.relN === "presses" ? ` 내 방식과 큰 시기의 습관이 둘 다 이 시기의 요구와 맞서는 때는 ${f.years.length}년 중 이 시기뿐이라, 이 시기가 가장 무겁게 느껴질 수 있습니다.` : "";
    if (softFeeds) {
      paras.push(fitPara(f, r, ri));
      paras.push(`다만 이 시기가 낯설기만 한 것은 아닙니다. 지금 큰 시기가 ${DEC[r.ys[0].dayun.cat]} 쪽이라면, 이 시기는 ${FEEDS_LINK[r.ys[0].dayun.cat]} 자연스럽게 이어집니다.`);
    } else paras.push(`${fitPara(f, r, ri)} ${dr[0]}${uniqueConflict}`);
    if (dr.length > 1) paras.push(dr.slice(1).join(" "));
    // 3) 연도별 짧은 설명
    r.ys.forEach((y, i) => paras.push(yearShort(f, y, i > 0 ? r.ys[i - 1] : null, claims, i === 0)));
    // 4) 다음 시기로
    if (next) paras.push(`다음 시기인 ${runYr(next)}에는 ${HANDOFF[next.c]}.`);
    else if (runs[0].c === f.N && r.relN === "supported") paras.push(`${f.years.length}년을 이어 보면, 처음에는 ${M1[runs[0].c]} 방식을 그대로 쓰고 끝에서는 그 방식을 받쳐 주는 ${M1[r.c]} 방식으로 마무리되는 모양입니다.`);
    else paras.push(`${f.years.length}년을 이어 보면, 처음에는 ${M1[runs[0].c]} 방식이 앞에 서고 끝에서는 ${M1[r.c]} 방식으로 마무리되는 모양입니다.`);
    sections.push({ heading, paras });
  });

  // 명리 근거(고객용, 압축)
  const basis: Block["basis"] = [];
  basis.push({ claim: "10년이 나뉘는 이유", calc: `세운 십성 ${f.years.map((y) => `${y.y} ${y.gan}${y.ji} ${y.ganSs}`).join(" → ")} · 같은 계열 묶음 ${runs.map((r) => `${runYr(r)} ${r.c}`).join(" · ")}` });
  const segTxt = f.segs.map((s) => `${s.ganZhi} ${s.ss}(${s.startYear}~${s.endYear}년)`).join(" → ");
  basis.push({ claim: "큰 시기", calc: `현재 대운 ${segTxt}${f.prevDayun ? ` · 직전 대운 ${f.prevDayun.ganZhi} ${f.prevDayun.ss}` : ""}` });
  basis.push({ claim: "내 원래 방식과 각 시기의 관계", calc: `타고난 중심 ${f.N}${f.S ? ` · 보조 ${f.S}` : ""} · ${runs.map((r) => `${runYr(r)} ${L.NATAL_REL_BASIS[r.relN]}`).join(" · ")}` });
  basis.push({ claim: "큰 시기와 각 시기의 관계", calc: runs.map((r) => `${runYr(r)} ${r.ys.map((y) => L.REL_BASIS[y.relD]).filter((v, i, a) => a.indexOf(v) === i).join("→")}`).join(" · ") });
  const pos = (c: Cat) => (f.presence[c] === "active" ? `${f.where[c].join("·")}` : f.presence[c] === "dayOnly" ? `${f.where[c].join("·")}(일지에만)` : "없음");
  basis.push({ claim: "다섯 방식이 사주 안에 있는 위치", calc: f.order.map((c) => `${c}: ${pos(c)}`).join(" · ") + " (지지는 본기 기준, 일간은 제외)" });
  basis.push({ claim: "해마다 걸리는 관계", calc: f.years.map((y) => `${y.y} ${y.sigs.length ? y.sigs.map((s) => (s.kind === "전환" ? "대운 전환" : L.SIG_LABEL(s))).join("+") : "걸린 관계 없음"}`).join(" · ") });
  return { heading: "앞으로 10년, 한눈에", lead, sections, basis, claims };
}
