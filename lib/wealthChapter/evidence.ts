// [5장 재물운 Production 이식] 확정된 scratch(scripts/_scratch_ch10_evidence_v1.ts)를 로직·문장 변경 없이 그대로 옮긴 파일.
// 이식 시 제거한 것: 데모/검증용 실행 코드(buildAppData·IntakeFormData·require.main 블록)와 그 import뿐이다.
/**
 * 5장 ⑩ — "이 풀이의 명리 근거" scratch v1 (read-only, Production 미수정).
 *
 * 역할: 새 생활 서사를 쓰지 않는다. ①~⑨ 풀이가 어떤 계산 값에서 나왔는지만
 * 한 줄씩 모아 보여 준다(명리 용어는 이 영역에서만 허용, 값 옆에 쉬운 뜻을 붙임).
 * 사용 값은 전부 기존 엔진 출력: buildChapterFourKey(재성 위치·다섯 힘·통근·합충·대운),
 * analyzeDayMasterBalance / analyzeYongsinCandidate / analyzeHuisinCandidate /
 * analyzeWealthObstruction. 새 계산·새 규칙 없음. deterministic(랜덤 없음).
 */
import { AppData } from "../sajuContent";
import { buildChapterFourKey } from "../chapterFourInterpretation";
import { analyzeDayMasterBalance } from "../dayMasterBalanceAnalysis";
import { analyzeYongsinCandidate } from "../yongsinCandidateAnalysis";
import { analyzeHuisinCandidate } from "../huisinCandidateAnalysis";
import { analyzeWealthObstruction } from "../wealthObstructionAnalysis";

export interface EvidenceItem { label: string; basis: string; usedFor: string; sourceNote: string }
export interface EvidenceResult { heading: string; intro: string; items: EvidenceItem[]; text: string }

const STAGE: Record<string, string> = { year: "연주", month: "월주", day: "일주", hour: "시주" };
const STAGE_ZHI: Record<string, string> = { year: "년지", month: "월지", day: "일지", hour: "시지" };
const ELEM_KO: Record<string, string> = { wood: "목", fire: "불", earth: "토", metal: "금", water: "물" };
const EXCESS_GLOSS: Record<string, string> = {
  wealthExcess: "재성이 지나치게 많음",
  companionExcess: "비겁이 지나치게 많음",
  outputExcess: "식상이 지나치게 많음",
  resourceExcess: "인성이 지나치게 많음",
  officerExcess: "관성이 지나치게 많음",
};
const CAT_GLOSS: Record<string, string> = {
  비겁: "나와 같은 힘", 식상: "내가 내놓는 힘", 재성: "돈을 뜻하는 힘", 관성: "나를 누르는 힘", 인성: "나를 받치는 힘",
};

export function generateEvidenceV1(appData: AppData): EvidenceResult {
  const k = buildChapterFourKey(appData);
  const user = appData.user;
  const bal = analyzeDayMasterBalance(user);
  const yong = analyzeYongsinCandidate(user);
  const hui = analyzeHuisinCandidate(user);
  const ob = analyzeWealthObstruction(appData);
  const items: EvidenceItem[] = [];

  // 1. 일간과 힘의 세기
  const dayGan = user.pillars.day;
  items.push({
    label: "나의 힘(일간)",
    basis: `일간 ${dayGan.hanja}(${ELEM_KO[dayGan.element]}) · 판정: ${bal.balanceLabel}`,
    usedFor: "돈을 스스로 감당하는 힘이 강한지 약한지 가늠할 때",
    sourceNote: "analyzeDayMasterBalance.balanceLabel",
  });

  // 2. 다섯 힘의 비중
  items.push({
    label: "다섯 힘의 비중",
    basis: k.wealth.all.map((c) => `${c.category} ${c.total}`).join(" · ")
      + " (점수 = 글자 수 + 태어난 달·뿌리·드러남 가감)"
      + (() => { const w = k.wealth.byCategory["재성"]; const sg = (n: number) => (n > 0 ? `+${n}` : `${n}`); return ` / 재성 세부: 글자 ${w.count}개, 태어난 달 ${sg(w.monthScore)}, 뿌리 ${sg(w.rootScore)}, 드러남 ${sg(w.touScore)}`; })(),
    usedFor: "돈을 버는 방식과 지키는 방식이 어느 쪽으로 기우는지 볼 때",
    sourceNote: "wealth.all[].total",
  });

  // 3. 재성 위치
  const ev = k.jaeseong.evidence;
  const posText = ev.length === 0
    ? "태어난 해·달·날·시의 글자와 지장간 어디에도 재성이 드러나지 않음"
    : ev.map((e) => {
        const hide = e.slot === "지장간" ? ` 지장간${e.hidePosition ? `(${e.hidePosition})` : ""}` : ` ${e.slot}`;
        return `${STAGE[e.stage]}${hide} ${e.sipseong}`;
      }).join(", ") + ` → 재성은 ${k.jaeseong.exposure === "뚜렷" ? "겉으로 뚜렷함" : k.jaeseong.exposure === "숨음" ? "안쪽에 숨어 있음" : "거의 드러나지 않음"}`;
  items.push({
    label: "돈의 자리(재성)",
    basis: posText,
    usedFor: "타고난 돈의 감각과, 돈이 어떤 모양으로 들어오는지 볼 때",
    sourceNote: "jaeseong.evidence/exposure",
  });

  // 4. 일간의 뿌리(통근)
  const root = k.dayMasterRoot;
  items.push({
    label: "일간의 뿌리",
    basis: root.hasRoot
      ? root.matches.map((m) => `${STAGE_ZHI[m.stage]} ${m.zhi} 속 ${m.hiddenGan}`).join(", ") + " 에 같은 오행이 있어 뿌리가 있음"
      : "지지 속에 같은 오행이 없어 뿌리가 없음",
    usedFor: "큰 돈이 오갈 때 내가 중심을 잡고 버틸 수 있는지 볼 때",
    sourceNote: "dayMasterRoot",
  });

  // 5. 재성 관련 합·충
  const pairs = [...k.heChongOnWealth.he, ...k.heChongOnWealth.chong];
  items.push({
    label: "돈의 자리에 걸린 합·충",
    basis: pairs.length === 0
      ? "돈의 자리나 뿌리에 걸린 지지의 합·충 없음"
      : pairs.map((p) => `${STAGE_ZHI[p.a.stage]} ${p.a.zhi} ↔ ${STAGE_ZHI[p.b.stage]} ${p.b.zhi} ${p.type}`).join(", "),
    usedFor: "돈의 자리가 흔들리거나 묶이는 조건을 볼 때",
    sourceNote: "heChongOnWealth",
  });

  // 6. 방해 구조
  items.push({
    label: "돈이 새는 구조",
    basis: ob.structuralObstructions.length === 0
      ? "원국 자체에 뚜렷한 방해 구조 없음"
      : ob.structuralObstructions.map((o) => `${o.type}(${EXCESS_GLOSS[o.sourceFlag] ?? o.sourceFlag})`).join(" + "),
    usedFor: "돈이 들어와도 남지 않는 조건을 짚을 때",
    sourceNote: "structuralObstructions",
  });

  // 7. 기준 오행(용신·희신)
  let yongBasis: string;
  if (!yong.applicable || yong.outcome === "hold") {
    yongBasis = "이 사주는 기준이 되는 힘을 하나로 정하지 않음 (연도별 흐름은 해마다의 신호로만 봄)";
  } else if (yong.outcome === "unresolved") {
    yongBasis = `기준 후보를 하나로 좁히지 못함: ${yong.winners.join("·")}`;
  } else {
    const helper = new Map<string, string>();
    if (hui.applicable) hui.pairs.filter((p) => !p.hardBlocked).forEach((p) => helper.set(p.forYongsin, p.category));
    yongBasis = yong.winners.map((w) => (helper.has(w) ? `${w}(보조: ${helper.get(w)})` : w)).join(" · ")
      + (yong.outcome === "multiple" ? " — 기준이 둘 이상" : "");
  }
  items.push({
    label: "기준이 되는 힘(용신·희신)",
    basis: yongBasis,
    usedFor: "앞으로 몇 해 중 비교적 순한 해와 신경 쓸 해를 가를 때",
    sourceNote: "analyzeYongsinCandidate / analyzeHuisinCandidate",
  });

  // 8. 대운
  const fmt = (p: any) => {
    const hid = p.zhiHidden.map((h: any) => h.sipseong).join("·");
    return `${p.ganZhi}(${p.startAge}–${p.endAge}세): 천간 ${p.ganSipseong}, 지지 속 ${hid}`;
  };
  const cur = k.daYun.current, nxt = k.daYun.next;
  if (cur || nxt) {
    items.push({
      label: "10년 단위 운(대운)",
      basis: [cur ? `지금 ${fmt(cur)}` : null, nxt ? `다음 ${fmt(nxt)}` : null].filter(Boolean).join(" / "),
      usedFor: "돈의 흐름이 어느 시기에 바뀌는지 볼 때",
      sourceNote: "daYun.current/next",
    });
  }

  items.push({
    label: "용어 뜻",
    basis: Object.entries(CAT_GLOSS).map(([c, g]) => `${c}=${g}`).join(" · "),
    usedFor: "위 근거에 나오는 다섯 힘의 이름",
    sourceNote: "고정 용어표",
  });

  const intro = "위 풀이를 다시 설명하는 자리가 아니라, 어떤 계산 값에서 나온 풀이인지 근거만 모아 둔 자리입니다. 전문 용어가 나오는 곳은 여기뿐입니다.";
  const text = [intro, ...items.map((i) => `· ${i.label}: ${i.basis}  ← ${i.usedFor}`)].join(String.fromCharCode(10));
  return { heading: "이 풀이의 명리 근거", intro, items, text };
}
