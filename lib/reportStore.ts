import { getSql } from "./db";
import { IntakeFormData } from "./sajuEngine";

/**
 * DB + reportId + 영구 재접속 구조 — 이 파일은 "저장/조회"만 담당한다.
 * 사주 계산/해석 로직은 전혀 두지 않는다(그건 sajuEngine.ts/sajuContent.ts/
 * reportMapper.ts가 이미 검증된 상태로 갖고 있고, 이 파일은 그 파이프라인이
 * 필요로 하는 입력값(IntakeFormData)을 저장했다가 그대로 돌려줄 뿐이다).
 *
 * reports.id는 Postgres의 gen_random_uuid()로 생성되는 UUID v4를 그대로
 * 고객 URL(reportId)로 쓴다 — 내부 PK와 외부 식별자를 굳이 분리하지 않았다.
 * 분리하는 이유는 보통 "내부 PK가 순차 정수라 그걸 그대로 노출하면 안 될
 * 때"인데, 여기 내부 PK 자체가 이미 122비트 무작위 UUID라 분리해도 얻는
 * 보안 이득이 없다 — 불필요한 컬럼을 하나 더 만들지 않는 쪽을 택했다.
 */

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidReportId(id: string): boolean {
  return UUID_V4_RE.test(id);
}

function isFiniteInt(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && Number.isInteger(v);
}

/**
 * `POST /api/reports`로 들어오는 body는 브라우저가 보낸 값이라 신뢰하지
 * 않는다 — 타입/범위를 전부 다시 확인한 뒤에만 IntakeFormData로 반환한다.
 * 하나라도 어긋나면 null(호출부가 400으로 응답).
 *
 * 날짜가 "형식상" 유효한지(범위 안의 숫자인지)만 여기서 보고, "실제
 * 존재하는 날짜인지"(2월 30일 같은)는 기존 validateBirthDate/calculateSaju가
 * 이미 하므로 여기서 다시 만들지 않는다.
 */
export function parseIntakeInput(body: unknown): IntakeFormData | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;

  const name = typeof b.name === "string" ? b.name.trim().slice(0, 40) : "";
  if (!name) return null;

  const gender = b.gender === "female" ? "female" : b.gender === "male" ? "male" : null;
  if (!gender) return null;

  const calendarType =
    b.calendarType === "lunar" ? "lunar" : b.calendarType === "solar" ? "solar" : null;
  if (!calendarType) return null;

  const isLeapMonth = b.isLeapMonth === true;

  if (!isFiniteInt(b.year) || b.year < 1900 || b.year > 2100) return null;
  if (!isFiniteInt(b.month) || b.month < 1 || b.month > 12) return null;
  if (!isFiniteInt(b.day) || b.day < 1 || b.day > 31) return null;

  const timeUnknown = b.timeUnknown === true;
  let hour: number | null = null;
  if (!timeUnknown) {
    if (!isFiniteInt(b.hour) || b.hour < 0 || b.hour > 23) return null;
    hour = b.hour;
  }

  let minute = 0;
  if (b.minute !== undefined) {
    if (!isFiniteInt(b.minute) || b.minute < 0 || b.minute > 59) return null;
    minute = b.minute;
  }

  return {
    name,
    gender,
    calendarType,
    isLeapMonth,
    year: b.year,
    month: b.month,
    day: b.day,
    hour,
    minute,
    timeUnknown,
  };
}

export async function createReport(input: IntakeFormData): Promise<string> {
  const sql = getSql();
  const rows = await sql`
    insert into reports (
      name, gender, calendar_type, is_leap_month,
      birth_year, birth_month, birth_day, birth_hour, birth_minute, time_unknown
    ) values (
      ${input.name}, ${input.gender}, ${input.calendarType}, ${input.isLeapMonth},
      ${input.year}, ${input.month}, ${input.day}, ${input.hour}, ${input.minute}, ${input.timeUnknown}
    )
    returning id
  `;
  return rows[0].id as string;
}

/** reportId가 형식조차 아니면 DB에 물어보지도 않고 null(호출부가 404 취급). */
export async function getReportInput(reportId: string): Promise<IntakeFormData | null> {
  if (!isValidReportId(reportId)) return null;

  const sql = getSql();
  const rows = await sql`
    select name, gender, calendar_type, is_leap_month,
           birth_year, birth_month, birth_day, birth_hour, birth_minute, time_unknown
    from reports
    where id = ${reportId}
    limit 1
  `;
  if (rows.length === 0) return null;

  const r = rows[0] as Record<string, unknown>;
  return {
    name: r.name as string,
    gender: r.gender as "male" | "female",
    calendarType: r.calendar_type as "solar" | "lunar",
    isLeapMonth: r.is_leap_month as boolean,
    year: r.birth_year as number,
    month: r.birth_month as number,
    day: r.birth_day as number,
    hour: r.birth_hour === null ? null : (r.birth_hour as number),
    minute: r.birth_minute as number,
    timeUnknown: r.time_unknown as boolean,
  };
}
