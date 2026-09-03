import { SajuUser } from "@/types";

/**
 * 귀인 확장 — 판정 엔진 전용 독립 모듈.
 *
 * 기존 12신살/천을귀인 계산(lib/sajuEngine.ts, lib/hanjaTables.ts의
 * CHEONEUL_GWIIN/isCheoneulGwiin)은 전혀 건드리지 않는다 — 이 파일은
 * 그쪽을 import조차 하지 않고, 이미 계산이 끝난 SajuUser.pillars(간)/
 * pillars.branches(지)만 읽어 새 판정만 별도로 만든다.
 *
 * 아직 어디서도 이 파일을 import하지 않는다 — 리포트 문장·UI 뱃지 연결은
 * 다음 단계(승인 대기)다. 이번 단계는 판정 엔진만 정확하게 완성하는 것.
 *
 * 1차(문창귀인·학당귀인) 조견표: 사용자가 그 작업 지시에서 직접 확정해
 * 전달한 표를 그대로 옮겼다.
 *
 * 2차(태극귀인·월덕귀인·암록) 조견표: 별도의 "2차 귀인 판정기준 조사"
 * (여러 명리 자료 교차검증)에서 확정된 표를 그대로 옮겼다 — 이 파일을
 * 작성하면서 다시 새로 찾거나 기억으로 바꾸지 않았다.
 *
 * 이번 2차 작업에서 제외된 것(보류): 천덕귀인(자료 간 卯월 판정 불일치
 * 발견), 문곡귀인(우선순위상 보류), 홍염(판정 기준 차이) — 전부 3차
 * 작업 대상으로 남겨둔다.
 */

export type PillarKey = "year" | "month" | "day" | "hour";

const PILLAR_KEYS: PillarKey[] = ["year", "month", "day", "hour"];

// 일간(日干) 기준 문창귀인 지지 1개.
const MUNCHANG_GWIIN: Record<string, string> = {
  甲: "巳",
  乙: "午",
  丙: "申",
  丁: "酉",
  戊: "申",
  己: "酉",
  庚: "亥",
  辛: "子",
  壬: "寅",
  癸: "卯",
};

// 일간(日干)의 장생(長生) 자리 기준 학당귀인 지지 1개.
const HAKDANG_GWIIN: Record<string, string> = {
  甲: "亥",
  乙: "午",
  丙: "寅",
  丁: "酉",
  戊: "寅",
  己: "酉",
  庚: "巳",
  辛: "子",
  壬: "申",
  癸: "卯",
};

// 일간(日干) 기준 태극귀인 지지 1~4개(무·기만 4개, 나머지는 2개).
// 2차 판정기준 조사에서 2개 독립 자료가 완전히 일치해 확정한 표.
const TAEGEUK_GWIIN: Record<string, string[]> = {
  甲: ["子", "午"],
  乙: ["子", "午"],
  丙: ["卯", "酉"],
  丁: ["卯", "酉"],
  戊: ["辰", "戌", "丑", "未"],
  己: ["辰", "戌", "丑", "未"],
  庚: ["寅", "亥"],
  辛: ["寅", "亥"],
  壬: ["巳", "申"],
  癸: ["巳", "申"],
};

// 일간(日干)의 건록과 육합하는 지지 = 암록. 2차 판정기준 조사에서 2개
// 독립 자료가 일치했고, "건록+육합" 규칙으로 자체 재검산까지 통과한 표.
// (참고용 — 이 파일에서 직접 쓰이진 않음) 건록: 甲寅 乙卯 丙戊巳 丁己午
// 庚申 辛酉 壬亥 癸子.
const AMROK: Record<string, string> = {
  甲: "亥",
  乙: "戌",
  丙: "申",
  丁: "未",
  戊: "申",
  己: "未",
  庚: "巳",
  辛: "辰",
  壬: "寅",
  癸: "丑",
};

// 월지(月支) 12개 전부 → 그 달이 속한 삼합국의 양간(陽干) = 월덕귀인.
// 인오술(화국)=丙, 신자진(수국)=壬, 사유축(금국)=庚, 해묘미(목국)=甲.
// 2차 판정기준 조사에서 3개 독립 자료가 완전히 일치해 확정한 표.
const WOLDEOK_GWIIN_BY_MONTH_ZHI: Record<string, string> = {
  寅: "丙",
  午: "丙",
  戌: "丙",
  申: "壬",
  子: "壬",
  辰: "壬",
  巳: "庚",
  酉: "庚",
  丑: "庚",
  亥: "甲",
  卯: "甲",
  未: "甲",
};

export interface GwiinCheck {
  /** 년·월·일·시지(또는 월덕귀인의 경우 년·월·일·시간) 중 해당 글자가
   * 하나라도 있으면 true */
  present: boolean;
  /** 실제로 어느 자리(들)에서 발견됐는지 — 시간 미상이면 hour는 애초에
   * 후보에서 빠진다(PillarCell이 null인 자리는 대조하지 않음, 값을
   * 지어내지 않는다는 기존 원칙과 동일하게 적용). */
  foundAt: PillarKey[];
  /** foundAt에 담긴 자리를 지지(地支)로 읽어야 하는지 천간(天干)으로
   * 읽어야 하는지 — 월덕귀인만 "gan"이고 나머지 4개는 전부 "zhi"다.
   * 두 기준이 같은 PillarKey 문자열("year"/"month"/...)을 쓰기 때문에,
   * 나중에 이 결과만 보고 지지/천간을 혼동하지 않도록 명시해 둔다. */
  basis: "zhi" | "gan";
}

function collectZhiMatches(targets: string[], user: SajuUser): PillarKey[] {
  const foundAt: PillarKey[] = [];
  PILLAR_KEYS.forEach((key) => {
    const cell = user.pillars.branches[key];
    if (cell && targets.includes(cell.hanja)) foundAt.push(key);
  });
  return foundAt;
}

// 기존 1차(문창·학당) 로직 — 동작은 이전과 완전히 동일하다(대상 지지 1개,
// 결과 present/foundAt 값도 전과 동일). basis 필드만 추가됐다.
function checkGwiin(table: Record<string, string>, dayGan: string, user: SajuUser): GwiinCheck {
  const targetZhi = table[dayGan];
  const foundAt = targetZhi ? collectZhiMatches([targetZhi], user) : [];
  return { present: foundAt.length > 0, foundAt, basis: "zhi" };
}

// 태극귀인 전용 — 대상 지지가 여러 개(무·기는 4개)일 수 있어 배열로 받는다.
function checkMultiZhiGwiin(table: Record<string, string[]>, dayGan: string, user: SajuUser): GwiinCheck {
  const targets = table[dayGan] ?? [];
  const foundAt = collectZhiMatches(targets, user);
  return { present: foundAt.length > 0, foundAt, basis: "zhi" };
}

// 월덕귀인 전용 — 지지가 아니라 천간(년간/월간/일간/시간) 4자리를 대조한다.
function checkGanGwiin(table: Record<string, string>, monthZhi: string, user: SajuUser): GwiinCheck {
  const targetGan = table[monthZhi];
  const foundAt: PillarKey[] = [];
  if (targetGan) {
    PILLAR_KEYS.forEach((key) => {
      const cell = user.pillars[key];
      if (cell && cell.hanja === targetGan) foundAt.push(key);
    });
  }
  return { present: foundAt.length > 0, foundAt, basis: "gan" };
}

export interface ExtraGwiinResult {
  munchang: GwiinCheck;
  hakdang: GwiinCheck;
  taeguk: GwiinCheck;
  woldeok: GwiinCheck;
  amrok: GwiinCheck;
}

/**
 * 문창귀인·학당귀인·태극귀인·월덕귀인·암록을 함께 판정한다. 같은 지지에서
 * 여러 귀인이 동시에 성립할 수 있는데(예: 음간의 문창·학당), 이건 오류가
 * 아니라 조견표가 원래 겹치기 때문이다 — 한쪽을 지우지 않고 각각
 * 독립적으로 그대로 반환한다.
 */
export function analyzeExtraGwiin(user: SajuUser): ExtraGwiinResult {
  const dayGan = user.pillars.day.hanja;
  const monthZhi = user.pillars.branches.month.hanja;
  return {
    munchang: checkGwiin(MUNCHANG_GWIIN, dayGan, user),
    hakdang: checkGwiin(HAKDANG_GWIIN, dayGan, user),
    taeguk: checkMultiZhiGwiin(TAEGEUK_GWIIN, dayGan, user),
    woldeok: checkGanGwiin(WOLDEOK_GWIIN_BY_MONTH_ZHI, monthZhi, user),
    amrok: checkGwiin(AMROK, dayGan, user),
  };
}
