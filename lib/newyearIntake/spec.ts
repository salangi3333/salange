/**
 * 2027 신년운세 고객 입력 규칙 — 관리자 입력 화면, 향후 고객용 신청 화면, 주문 검증이 모두 이 파일 하나를 기준으로 쓴다.
 * 기준 원본은 로컬 제작 도구(팔자문_V2_샌드박스/project/v2/newyear_tool/customer.ts)의 validateCustomer이며,
 * 두 곳의 값이 어긋나면 tests/newyearIntake/test_spec_matches_local.ts가 실패한다. 이 파일은 의존성이 없다(DB·결제·Next.js 무관).
 */

export const LIMITS = {
  nameMax: 20, // 풀이 대상자 이름(표지·속표지 '○○○님'에 쓰임)
  callNameMax: 10, // 본문 호칭
  jobDetailMax: 60,
  concernTextMax: 300,
  birthYearMin: 1900,
  birthYearMax: 2026, // 로컬 도구가 2026으로 고정해 둔 값. 웹도 같게 둔다(올해로 늘리면 로컬이 거부해 가져오기가 막힌다)
} as const;

/** 호칭은 한글·영문 글자만(띄어쓰기·기호·숫자 제외). */
export const CALL_NAME_RE = /^[가-힣A-Za-z]+$/;

/** 글자 수는 사용자가 보는 글자(코드 포인트) 기준으로 센다. 로컬 도구의 Array.from(...).length와 같다. */
export const charLen = (s: string): number => Array.from(s).length;

export const RELATION_CHOICES = [
  { value: "married", label: "기혼" },
  { value: "dating", label: "연애 중" },
  { value: "solo", label: "만나는 사람 없음" },
  { value: "divorced", label: "이혼" },
  { value: "widowed", label: "사별" },
  { value: "undisclosed", label: "말하지 않음" },
] as const;
export type RelationCode = (typeof RELATION_CHOICES)[number]["value"];

/** 고민 분야. 건강은 이번 상품이 다루지 않는다. */
export const CONCERN_CHOICES = ["돈", "직업", "연애", "가정", "기타"] as const;

/** 로컬 제작 도구가 아는 직업 유형 9개(customer.ts의 JobType). jobseeker는 예전 고객 호환용으로만 남아 있고 웹 선택지에는 없다. */
export const LOCAL_JOB_VALUES = ["employee", "freelancer", "jobseeker", "student", "other", "business", "preparing", "homemaker", "resting"] as const;
export type LocalJobType = (typeof LOCAL_JOB_VALUES)[number];
/** 로컬에만 있고 웹에서는 고르지 않는 값(예전 고객 호환). */
export const LEGACY_LOCAL_ONLY: readonly LocalJobType[] = ["jobseeker"];

/**
 * 직업 선택지 8개(한 질문에서 하나 선택). 값·이름·순서는 로컬 제작 도구의 JOB_MENU와 같다(2026-10-28 로컬에 4개 값 추가로 전부 1:1 대응).
 * fit: exact=뜻이 같아 그대로 넘김 · approx=가깝지만 뜻이 일부 다름 · none=대응 값 없음. 지금은 8개 모두 exact이며,
 * 앞으로 뜻이 다른 선택지가 생기면 exact가 아닌 값으로 두어 가져오기 전에 막는다(toLocalJobType).
 */
export const JOB_CHOICES = [
  { value: "student", label: "학생", local: "student", fit: "exact", note: "" },
  { value: "employee", label: "직장인", local: "employee", fit: "exact", note: "" },
  { value: "business", label: "사업·자영업", local: "business", fit: "exact", note: "" },
  { value: "freelancer", label: "프리랜서", local: "freelancer", fit: "exact", note: "" },
  { value: "preparing", label: "취업·이직 준비 중", local: "preparing", fit: "exact", note: "" },
  { value: "homemaker", label: "전업주부·가사", local: "homemaker", fit: "exact", note: "" },
  { value: "resting", label: "현재 일하지 않음·휴식 중", local: "resting", fit: "exact", note: "" },
  { value: "other", label: "기타", local: "other", fit: "exact", note: "" },
] as const;
export type JobCode = (typeof JOB_CHOICES)[number]["value"];
export const JOB_CODES: readonly JobCode[] = JOB_CHOICES.map((x) => x.value);

export type JobFit = "exact" | "approx" | "none";
interface JobEntry { value: string; local: LocalJobType | null; fit: JobFit; note: string }
export type LocalJobResult = { ok: true; value: LocalJobType } | { ok: false; fit: "approx" | "none" | "unknown"; nearest: LocalJobType | null; reason: string };

/** 선택한 직업을 로컬 제작 도구 값으로 바꾼다. 뜻이 같은 경우(exact)만 값을 돌려주고, 나머지는 이유와 함께 거부한다. */
export function toLocalJobType(code: string): LocalJobResult {
  const c = (JOB_CHOICES as readonly JobEntry[]).find((x) => x.value === code);
  if (!c) return { ok: false, fit: "unknown", nearest: null, reason: "알 수 없는 직업 선택값입니다." };
  if (c.fit === "exact" && c.local) return { ok: true, value: c.local };
  return { ok: false, fit: c.fit === "exact" ? "none" : c.fit, nearest: c.local, reason: c.note };
}

/**
 * 형식 검사(이 파일의 규칙)와 계산 단계 검사의 구분.
 * 형식 검사: 글자 수, 선택값, 숫자 범위, boolean 형식, 윤달은 음력만, 시간 모름과 시각의 모순.
 * 계산 단계 검사(실제 사주 계산이 해야 확정되는 것): 존재하지 않는 날짜(2월 30일·평년 2월 29일·31일 없는 달),
 *   존재하지 않는 음력 윤달, 절입 경계 시각이라 시주를 쓸 수 없는 경우(가져온 뒤 로컬 확인 단계에서 안내).
 * 웹은 날짜 존재 여부를 lib/validateBirthInput로 미리 거르지만, 최종 판정은 로컬 도구의 calculateSaju가 한다.
 */
export const CALC_STAGE_CHECKS = ["존재하지 않는 양력 날짜", "존재하지 않는 음력 날짜·윤달", "절입 경계 시각(시주 사용 가능 여부)"] as const;
