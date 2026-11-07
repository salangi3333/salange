/**
 * 신규 상품 공통 입력 계약 — 풀이 대상자(사람)와 프로필(직업·관계·고민)의 검증과 변환.
 *
 * 기준 규칙: 신년운세 로컬 제작 도구 customer.ts의 validateCustomer와 lib/newyearIntake/spec.ts의 값·한도.
 * 그 규칙에서 유효했던 입력을 불필요하게 거부하지 않는 것이 원칙이다(글자 수는 코드 포인트 기준, 앞뒤 공백은 지운 뒤 검사).
 * 기존 입력 검증·계산 엔진은 수정하지 않는다. 날짜가 실제로 존재하는지만 기존 validateBirthInput을 읽기 전용으로 재사용한다.
 *
 * 인생 종합운세 V2의 Profile과 다른 값은 아래 '변환 규칙' 함수로만 바꾼다(relation: undisclosed → unknown 등).
 * 이 파일은 브라우저(관리자 입력 화면)에서도 쓰므로 Node 전용 모듈(crypto)을 가져오지 않는다. 입력 지문은 intakeFingerprint.ts 에 있다.
 */
import { validateBirthDate } from "../validateBirthInput";

export const INTAKE_LIMITS = {
  nameMax: 20, callNameMax: 10, jobDetailMax: 60, concernTextMax: 300,
  birthYearMin: 1900, birthYearMax: 2026, // 신년운세 로컬 도구와 같은 값. 올릴 때는 로컬 도구·엔진 확인 후 한 곳(여기)에서만 바꾼다.
} as const;

export const CALL_NAME_RE = /^[가-힣A-Za-z]+$/;
export const charLen = (s: string): number => Array.from(s).length;

export const RELATION_VALUES = ["married", "dating", "solo", "divorced", "widowed", "undisclosed"] as const;
export type Relation = (typeof RELATION_VALUES)[number];
/** 웹 선택지 8개 + 로컬 도구가 예전 고객 호환용으로 받는 jobseeker. jobseeker는 받되 새 화면 메뉴에는 넣지 않는다. */
export const JOB_VALUES = ["student", "employee", "business", "freelancer", "preparing", "homemaker", "resting", "other", "jobseeker"] as const;
export type JobType = (typeof JOB_VALUES)[number];
export const JOB_MENU_VALUES: readonly JobType[] = ["student", "employee", "business", "freelancer", "preparing", "homemaker", "resting", "other"];
export const CONCERN_VALUES = ["돈", "직업", "연애", "가정", "기타"] as const;

export interface SubjectPerson {
  name: string; callName: string | null; gender: "male" | "female"; calendarType: "solar" | "lunar"; isLeapMonth: boolean;
  year: number; month: number; day: number; hour: number | null; minute: number; timeUnknown: boolean;
}
export interface ProfileData { relation: Relation; jobType: JobType; jobDetail: string; concernCats: string[]; concernText: string }
/** 주문 안의 한 사람: 역할과 순서(1부터)로 구분한다. */
export interface OrderSubject { role: string; order: number; person: SubjectPerson }

export type ParseOk<T> = { ok: true; value: T; warnings: string[] };
export type ParseFail = { ok: false; errors: string[] };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
// eslint-disable-next-line no-control-regex
const CONTROL_ONE_LINE_RE = /[\u0000-\u001f\u007f]/;
// eslint-disable-next-line no-control-regex
const CONTROL_MULTI_LINE_RE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const CONTACT_RE = /(\d{2,4}[-\s]?\d{3,4}[-\s]?\d{4}|[\w.+-]+@[\w-]+\.[\w.]+)/;

/** 사람 한 명의 입력 검증. 누락·형식 오류는 모두 모아서 돌려준다. */
export function parsePerson(raw: unknown, opts: { birthYearMax?: number } = {}): ParseOk<SubjectPerson> | ParseFail {
  const errors: string[] = []; const warnings: string[] = [];
  if (!isObj(raw)) return { ok: false, errors: ["입력 형식이 올바르지 않습니다."] };
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  const name = str(raw.name);
  if (!name) errors.push("이름이 비어 있습니다."); else if (charLen(name) > INTAKE_LIMITS.nameMax) errors.push(`이름이 너무 깁니다(${INTAKE_LIMITS.nameMax}자 이내).`);
  else if (CONTROL_ONE_LINE_RE.test(name)) errors.push("이름에 쓸 수 없는 문자가 있습니다.");

  let callName: string | null = null;
  if (raw.callName !== undefined && raw.callName !== null && raw.callName !== "") {
    if (typeof raw.callName !== "string") errors.push("호칭 형식이 올바르지 않습니다.");
    else {
      const cn = raw.callName.trim();
      if (cn) {
        if (charLen(cn) > INTAKE_LIMITS.callNameMax) errors.push(`호칭이 너무 깁니다(${INTAKE_LIMITS.callNameMax}자 이내).`);
        else if (!CALL_NAME_RE.test(cn)) errors.push("호칭은 한글·영문 글자만 쓸 수 있습니다(띄어쓰기·기호·숫자 제외).");
        else callName = cn;
      }
    }
  }

  const gender = raw.gender === "male" || raw.gender === "female" ? raw.gender : null;
  if (!gender) errors.push("성별이 올바르지 않습니다.");
  const calendarType = raw.calendarType === "solar" || raw.calendarType === "lunar" ? raw.calendarType : null;
  if (!calendarType) errors.push("양력·음력 구분이 올바르지 않습니다.");

  const isLeapMonth = raw.isLeapMonth === undefined ? false : raw.isLeapMonth;
  if (typeof isLeapMonth !== "boolean") errors.push("윤달 값이 올바르지 않습니다.");
  else if (isLeapMonth && calendarType !== "lunar") errors.push("윤달은 음력일 때만 선택할 수 있습니다.");

  const yMax = Math.min(opts.birthYearMax ?? INTAKE_LIMITS.birthYearMax, INTAKE_LIMITS.birthYearMax);
  const num = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" && /^\d{1,4}$/.test(v.trim()) ? Number(v.trim()) : NaN);
  const year = num(raw.year), month = num(raw.month), day = num(raw.day);
  if (!Number.isInteger(year) || year < INTAKE_LIMITS.birthYearMin || year > yMax) errors.push(`생년이 올바르지 않습니다(${INTAKE_LIMITS.birthYearMin}~${yMax}).`);
  if (!Number.isInteger(month) || month < 1 || month > 12) errors.push("생월이 올바르지 않습니다(1~12).");
  if (!Number.isInteger(day) || day < 1 || day > 31) errors.push("생일이 올바르지 않습니다(1~31).");

  const timeUnknown = raw.timeUnknown === undefined ? false : raw.timeUnknown;
  let hour: number | null = null; let minute = 0;
  if (typeof timeUnknown !== "boolean") errors.push("시간 모름 값이 올바르지 않습니다.");
  else if (!timeUnknown) {
    const h = raw.hour === null || raw.hour === undefined || raw.hour === "" ? NaN : num(raw.hour);
    const m = raw.minute === undefined || raw.minute === null || raw.minute === "" ? 0 : num(raw.minute);
    if (!Number.isInteger(h) || h < 0 || h > 23) errors.push("출생 시각(시)이 올바르지 않습니다(0~23). 모르면 '시간 모름'으로 입력하세요.");
    else hour = h;
    if (!Number.isInteger(m) || m < 0 || m > 59) errors.push("출생 시각(분)이 올바르지 않습니다(0~59).");
    else minute = m;
  }

  if (!errors.length && gender && calendarType && typeof isLeapMonth === "boolean") {
    const dateErr = validateBirthDate({ calendarType, isLeapMonth, year, month, day });
    if (dateErr) errors.push(dateErr);
  }
  if (errors.length) return { ok: false, errors };
  return {
    ok: true, warnings,
    value: { name, callName, gender: gender as "male" | "female", calendarType: calendarType as "solar" | "lunar", isLeapMonth: isLeapMonth as boolean, year, month, day, hour, minute, timeUnknown: timeUnknown as boolean },
  };
}

/** 프로필(관계·직업·고민) 검증. 직업 설명·고민 내용은 비워도 되지만 개인화가 덜 된다는 안내(warnings)를 남긴다. */
export function parseProfile(raw: unknown): ParseOk<ProfileData> | ParseFail {
  const errors: string[] = []; const warnings: string[] = [];
  if (!isObj(raw)) return { ok: false, errors: ["프로필 형식이 올바르지 않습니다."] };
  const relation = (RELATION_VALUES as readonly unknown[]).includes(raw.relation) ? (raw.relation as Relation) : null;
  if (!relation) errors.push("혼인 상태가 올바르지 않습니다(6가지 중 선택).");
  const jobType = (JOB_VALUES as readonly unknown[]).includes(raw.jobType) ? (raw.jobType as JobType) : null;
  if (!jobType) errors.push("직업 유형이 올바르지 않습니다.");

  const optStr = (v: unknown, label: string): string => {
    if (v === undefined || v === null) return "";
    if (typeof v !== "string") { errors.push(`${label} 형식이 올바르지 않습니다.`); return ""; }
    return v.trim();
  };
  const jobDetail = optStr(raw.jobDetail, "직업 설명");
  const concernText = optStr(raw.concernText, "고민 내용");
  if (CONTROL_ONE_LINE_RE.test(jobDetail)) errors.push("직업 설명에 쓸 수 없는 문자가 있습니다.");
  if (CONTROL_MULTI_LINE_RE.test(concernText)) errors.push("고민 내용에 쓸 수 없는 문자가 있습니다.");
  if (charLen(jobDetail) > INTAKE_LIMITS.jobDetailMax) errors.push(`직업 설명이 너무 깁니다(${INTAKE_LIMITS.jobDetailMax}자 이내).`);
  if (charLen(concernText) > INTAKE_LIMITS.concernTextMax) errors.push(`고민 내용이 너무 깁니다(${INTAKE_LIMITS.concernTextMax}자 이내).`);

  let concernCats: string[] = [];
  if (raw.concernCats !== undefined && raw.concernCats !== null) {
    if (!Array.isArray(raw.concernCats) || raw.concernCats.some((x) => typeof x !== "string")) errors.push("고민 분야 형식이 올바르지 않습니다.");
    else if ((raw.concernCats as string[]).some((x) => !(CONCERN_VALUES as readonly string[]).includes(x))) errors.push("고민 분야 값이 올바르지 않습니다.");
    else concernCats = (raw.concernCats as string[]).filter((x, i, a) => a.indexOf(x) === i); // 중복은 하나로(순서 유지)
  }
  if (errors.length) return { ok: false, errors };
  if (!jobDetail) warnings.push("직업 설명이 없습니다. 일·직업운이 덜 개인화될 수 있습니다.");
  if (!concernText) warnings.push("고민 내용이 없습니다. 풀이가 덜 개인화될 수 있습니다.");
  if (CONTACT_RE.test(concernText)) warnings.push("고민 내용에 연락처로 보이는 글이 있습니다. 제작 전에 가려야 합니다.");
  if (CONTACT_RE.test(jobDetail)) warnings.push("직업 설명에 연락처로 보이는 글이 있습니다. 제작 전에 가려야 합니다.");
  return { ok: true, warnings, value: { relation: relation as Relation, jobType: jobType as JobType, jobDetail, concernCats, concernText } };
}

export interface SubjectRuleLike { roles: readonly string[]; min: number; max: number; allowRepeatRoles: boolean }

/**
 * 여러 풀이 대상자 검증. 입력은 [{role, person}] 배열이고 순서는 배열 순서(1부터)로 정한다.
 * order를 함께 보냈다면 배열 위치와 같아야 한다(어긋나면 거부 — 순서 혼동 방지). 역할은 상품 규칙의 목록 안이어야 하고,
 * 반복 허용이 아닌 상품에서는 같은 역할을 두 번 쓸 수 없다. 첫 번째 대상자의 역할은 규칙의 첫 역할이어야 한다.
 */
export function parseSubjects(raw: unknown, rule: SubjectRuleLike, opts: { birthYearMax?: number } = {}): ParseOk<OrderSubject[]> | ParseFail {
  if (!Array.isArray(raw)) return { ok: false, errors: ["풀이 대상자 목록 형식이 올바르지 않습니다."] };
  const errors: string[] = []; const warnings: string[] = []; const out: OrderSubject[] = [];
  if (raw.length < rule.min || raw.length > rule.max) errors.push(`풀이 대상자는 ${rule.min === rule.max ? rule.min : `${rule.min}~${rule.max}`}명이어야 합니다(현재 ${raw.length}명).`);
  const seen = new Set<string>();
  raw.forEach((item, i) => {
    const tag = `대상자 ${i + 1}`;
    if (!isObj(item)) { errors.push(`${tag}: 형식이 올바르지 않습니다.`); return; }
    const role = item.role;
    if (typeof role !== "string" || !rule.roles.includes(role)) errors.push(`${tag}: 역할이 올바르지 않습니다(허용: ${rule.roles.join(", ")}).`);
    else {
      if (i === 0 && role !== rule.roles[0]) errors.push(`${tag}: 첫 번째 대상자의 역할은 '${rule.roles[0]}'이어야 합니다.`);
      if (!rule.allowRepeatRoles) { if (seen.has(role)) errors.push(`${tag}: 같은 역할('${role}')을 두 번 쓸 수 없습니다.`); seen.add(role); }
    }
    if (item.order !== undefined && item.order !== i + 1) errors.push(`${tag}: 순서 값이 배열 위치와 다릅니다.`);
    const p = parsePerson(item.person, opts);
    if (!p.ok) p.errors.forEach((e) => errors.push(`${tag}: ${e}`));
    else { warnings.push(...p.warnings.map((w) => `${tag}: ${w}`)); if (typeof role === "string") out.push({ role, order: i + 1, person: p.value }); }
  });
  return errors.length ? { ok: false, errors } : { ok: true, value: out, warnings };
}

/* ───────── 변환 규칙(명시적) ───────── */

/** 신년운세 로컬 제작 도구(NewYearCustomer)에 넣는 입력 모양. relation·jobType은 그대로 둔다. */
export function toLocalNewYearInput(person: SubjectPerson, profile: ProfileData) {
  return {
    name: person.name, callName: person.callName ?? undefined, gender: person.gender, calendarType: person.calendarType, isLeapMonth: person.isLeapMonth,
    year: person.year, month: person.month, day: person.day, hour: person.timeUnknown ? null : person.hour, minute: person.timeUnknown ? 0 : person.minute, timeUnknown: person.timeUnknown,
    relation: profile.relation, jobType: profile.jobType, jobDetail: profile.jobDetail, concernCats: [...profile.concernCats], concernText: profile.concernText,
  };
}

/** 인생 종합운세 V2 코어의 IntakeInput(계산 입력). */
export function toV2Intake(person: SubjectPerson) {
  return {
    name: person.name, gender: person.gender, calendarType: person.calendarType, isLeapMonth: person.isLeapMonth,
    year: person.year, month: person.month, day: person.day, hour: person.timeUnknown ? null : person.hour, minute: person.timeUnknown ? 0 : person.minute, timeUnknown: person.timeUnknown,
  };
}

/**
 * 인생 종합운세 V2의 Profile. 신년운세 도구가 재료 생성기에 넣을 때 쓰는 변환(registerCustomer)과 같은 규칙이다.
 * - relation: 'undisclosed'(말하지 않음)는 V2에서 'unknown'이다. 나머지는 그대로.
 * - jobDetail·concernText·callName: 비어 있으면 undefined.
 * - jobType: 값 그대로(V2는 문자열 타입). 새 직업 값이 생기면 V2 쪽 소재 규칙을 확인해야 한다.
 */
export function toV2Profile(person: SubjectPerson, profile: ProfileData) {
  return {
    callName: person.callName ?? undefined, jobType: profile.jobType as string, jobDetail: profile.jobDetail || undefined,
    relation: profile.relation === "undisclosed" ? "unknown" : (profile.relation as string),
    concernCats: [...profile.concernCats], concernText: profile.concernText || undefined,
  };
}
