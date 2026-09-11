import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { calculateSaju } from "@/lib/sajuEngine";
import { parseIntakeInput } from "@/lib/reportStore";
import { getSql } from "@/lib/db";
import { isValidOrderId } from "@/lib/orderStore";
import {
  createManualPaidOrder,
  CreateManualPaidOrderInput,
  findExistingManualPaidOrder,
  IdempotencyKeyConflictError,
} from "@/lib/manualOrderStore";

/**
 * 당근 등 수동 주문 접수 전용 관리자 API의 실제 로직 — createManualPaidOrder
 * (데이터 계층, 이미 승인·동결됨) 하나만 호출한다.
 *
 * [2026-09 빌드 오류 수정] 이 로직을 원래 app/api/admin/manual-orders/route.ts에
 * 직접 뒀더니, Next.js App Router의 typed routes 검사(`next build`의
 * `.next/types/app/.../route.ts` 자동 생성)가 route.ts에서 GET/POST 등
 * 정해진 이름 외의 export(여기서는 createHandler)를 전부 오류로 잡았다
 * (checkFields<Diff<...>> 타입 오류로 빌드 자체가 실패). 그래서 실제 로직은
 * route.ts가 아닌 이 파일(handler.ts, 일반 모듈이라 제약 없음)로 옮기고,
 * route.ts는 POST만 export하는 얇은 wrapper로 남긴다.
 *
 * [2026-09-11 리팩터링 — 관리자 UI 1차 구현] 이 파일의 로직을
 * "HTTP 파싱/x-admin-secret 인증"과 "실제 검증·계산·idempotency·주문생성"
 * 두 층으로 분리했다:
 *   - processManualOrderRequest(rawBody, deps): NextRequest/NextResponse에
 *     전혀 의존하지 않는 순수 함수. 세션 쿠키로 이미 인증된 관리자 UI
 *     라우트(app/admin/api/orders/route.ts)가 가짜 HTTP Request를 만들거나
 *     ADMIN_API_SECRET을 재주입하지 않고 이 함수를 직접 호출한다.
 *   - createHandler(deps): 기존 x-admin-secret 인증 + req.json() 파싱만
 *     담당하고, 실제 처리는 그대로 processManualOrderRequest에 위임하는
 *     얇은 wrapper로 남는다.
 * 이건 순수 리팩터링이다 — 검증 순서, 에러 메시지, HTTP status 규격은
 * 전부 이전과 완전히 동일하다(기존 자동 테스트로 무변경 검증됨). 이동
 * 대상이 아닌 로직(예: manualOrderStore.ts의 Hard Idempotency 핵심)은
 * 한 글자도 건드리지 않았다.
 *
 * 인증: NEXT_PUBLIC_* 아닌 서버 전용 env var(ADMIN_API_SECRET)를
 * `x-admin-secret` 요청 헤더와 상수 시간 비교(timingSafeEqual)한다 —
 * lib/tossPayments.ts의 TOSS_SECRET_KEY와 동일한 패턴(함수 내부에서
 * process.env를 매 요청마다 읽음, 모듈 top-level에서 읽지 않음 — 빌드
 * 타임에 env가 없어도 빌드 자체가 죽지 않게). 이 env var가 아직
 * Vercel/.env.local에 설정돼 있지 않다면 isAuthorized가 항상 false를
 * 반환해 이 엔드포인트는 "설정 전까지는 안전하게 잠겨 있는" 상태다
 * (fail-closed, 의도된 동작). 이 인증은 오직 이 공개 API(x-admin-secret
 * 헤더 기반 호출자)를 위한 것이고, 관리자 UI(세션 쿠키 기반)는 이 인증을
 * 아예 거치지 않고 processManualOrderRequest를 직접 호출한다 — 인증
 * 경계가 처음부터 분리되어 있다.
 *
 * 사주 입력 검증: 새로 만들지 않고 기존 parseIntakeInput(reportStore.ts,
 * app/api/reports/route.ts가 이미 쓰는 것과 동일)을 그대로 재사용한다 —
 * 이 API의 입력 필드명(birthYear/birthMonth/...)만 parseIntakeInput이
 * 기대하는 모양(year/month/...)으로 얇게 매핑한 뒤 넘긴다. 실제 계산
 * 가능한 날짜인지도 app/api/reports/route.ts와 동일하게 calculateSaju를
 * 한 번 더 통과시켜 확인한다.
 *
 * channel: 요청 body에 channel이 와도 전부 무시하고 서버에서 'karrot'으로
 * 고정한다(지시 원칙 — client 입력을 신뢰하지 않음).
 *
 * 중복 제출 방어: 두 단계로 방어한다.
 *   1) hard idempotency(2026-09-11 추가): 관리자 UI가 제출 1회당 고정
 *      idempotencyKey를 만들어 보내면(더블클릭/네트워크 재시도/응답유실
 *      재시도에도 같은 값 재사용), lib/manualOrderStore.ts가 이 값을 그대로
 *      orders.order_id로 저장한다. 기존 orders.order_id UNIQUE 제약
 *      (orders_order_id_key) 덕분에, 같은 key로 온 두 번째 요청은(순차
 *      재시도든 진짜 동시 요청이든) DB 레벨에서 새 주문을 또 만들지 못하고
 *      기존 주문을 그대로 돌려받는다 — 애플리케이션 코드의 타이밍에
 *      의존하지 않는 하드 개런티. 같은 key인데 주문 데이터가 다르면(오용)
 *      409로 거부한다(IdempotencyKeyConflictError). 아래
 *      findExistingManualPaidOrder 사전 조회에서 이미 처리된 주문을
 *      찾으면 200으로 즉시 응답하고, 2)의 2분 체크·트랜잭션 시도 자체를
 *      건너뛴다(정상 재시도를 2분 체크가 오탐 409로 막지 않기 위함).
 *   2) 최근 2분 내 동일 고객정보(이름+생년월일시) SELECT(기존 그대로
 *      유지, 삭제하지 않음): 서로 다른 idempotencyKey로 짧은 시간 내 같은
 *      고객이 또 접수되는 경우를 막는 보조 안전장치 — 1)이 다루지 않는
 *      시나리오(같은 요청 재전송이 아니라 "다른 제출인데 같은 고객으로
 *      보이는 경우")를 담당한다.
 *
 * deps 기반 팩토리로 뺀 이유: 테스트에서 실제 DB(getSql())를 호출하지
 * 않고 createOrder/sql을 가짜로 주입할 수 있게 하기 위함 — route.ts의
 * POST export 자체는 실제 의존성으로 매 요청마다 만들어진다(모듈
 * top-level에서 getSql()을 호출하지 않는다 — app/api/reports/route.ts와
 * 동일하게 빌드 타임 크래시를 피한다). 같은 deps 구조를 관리자 UI
 * 라우트도 그대로 재사용한다.
 */

export interface ManualOrderRouteDeps {
  createOrder: typeof createManualPaidOrder;
  sql: ReturnType<typeof getSql>;
}

/** processManualOrderRequest의 반환 형태 — NextResponse가 아니라 평범한
 * 객체다(HTTP 계층에 의존하지 않음). 호출부(createHandler든 관리자 UI
 * 라우트든)가 각자 원하는 방식으로 응답을 만든다. */
export interface ManualOrderProcessResult {
  status: number;
  body: Record<string, unknown>;
}

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret) return false; // 설정 전에는 항상 거부(fail-closed)
  const provided = req.headers.get("x-admin-secret");
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false; // 길이부터 다르면 timingSafeEqual 자체가 예외를 던짐
  return timingSafeEqual(a, b);
}

/** 이 API의 입력 필드명(birthYear 등)을 parseIntakeInput이 기대하는
 * IntakeFormData 원본 필드명(year 등)으로만 바꿔치기한다 — 값 자체의
 * 검증(범위/타입)은 전혀 하지 않고 그대로 parseIntakeInput에 위임한다
 * (검증 로직 복제 금지 원칙). */
function mapToParseIntakeShape(body: Record<string, unknown>): unknown {
  return {
    name: body.name,
    gender: body.gender,
    calendarType: body.calendarType,
    isLeapMonth: body.isLeapMonth,
    year: body.birthYear,
    month: body.birthMonth,
    day: body.birthDay,
    hour: body.birthHour,
    minute: body.birthMinute,
    timeUnknown: body.timeUnknown,
  };
}

/**
 * 실제 검증·계산·idempotency·주문생성 핵심 로직. NextRequest/NextResponse에
 * 의존하지 않으므로, 이미 인증된(x-admin-secret이든 관리자 세션이든) 어떤
 * 호출부에서도 직접 함수 호출로 재사용할 수 있다. 이 함수 자체는 "누가
 * 호출했는지"를 모른다 — 호출부가 자기 인증 방식으로 먼저 걸러낸 뒤에만
 * 불러야 한다(관리자 UI 라우트는 세션 검증 후 호출, createHandler는
 * x-admin-secret 검증 후 호출).
 */
export async function processManualOrderRequest(
  rawBody: unknown,
  deps: ManualOrderRouteDeps
): Promise<ManualOrderProcessResult> {
  if (!rawBody || typeof rawBody !== "object") {
    return { status: 400, body: { error: "잘못된 요청입니다." } };
  }
  const b = rawBody as Record<string, unknown>;

  // ── 사주 입력 검증(기존 로직 재사용, 복제하지 않음) ──
  const intake = parseIntakeInput(mapToParseIntakeShape(b));
  if (!intake) {
    return { status: 400, body: { error: "입력값을 다시 확인해주세요." } };
  }
  try {
    calculateSaju(intake);
  } catch (e) {
    const message = e instanceof Error ? e.message : "입력하신 생년월일을 다시 확인해주세요.";
    return { status: 400, body: { error: message } };
  }

  // ── 이메일/금액 검증(이 API 자체 입력이라 여기서 얇게 확인 —
  //     createManualPaidOrder도 내부적으로 한 번 더 검증한다, 이중 방어) ──
  const email = typeof b.email === "string" ? b.email.trim() : "";
  if (!email || !email.includes("@") || email.length > 200) {
    return { status: 400, body: { error: "유효한 이메일을 입력해주세요." } };
  }
  const amount = typeof b.amount === "number" ? b.amount : NaN;
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) {
    return { status: 400, body: { error: "금액이 올바르지 않습니다." } };
  }

  // ── channel은 client 입력 무시, 서버 고정 ──
  const channel = "karrot" as const;

  // ── idempotencyKey 검증(형식은 lib/orderStore.ts의 isValidOrderId
  //     그대로 재사용, 복제하지 않음) ──
  const idempotencyKey = typeof b.idempotencyKey === "string" ? b.idempotencyKey : "";
  if (!idempotencyKey || !isValidOrderId(idempotencyKey)) {
    return { status: 400, body: { error: "idempotencyKey가 올바르지 않습니다." } };
  }

  // ── hard idempotency 사전 조회: 이미 이 key로 처리된 주문이 있으면
  //     2분 중복체크·트랜잭션 시도 없이 바로 그 결과를 반환한다(정상
  //     재시도/응답유실 후 재시도를 여기서 끝낸다) ──
  try {
    const existing = await findExistingManualPaidOrder(
      idempotencyKey,
      { intake, email, amount, channel },
      deps.sql
    );
    if (existing) {
      return {
        status: 200,
        body: {
          reportId: existing.reportId,
          orderId: existing.orderId,
          deliveryId: existing.deliveryId,
          status: "PAID",
        },
      };
    }
  } catch (e) {
    if (e instanceof IdempotencyKeyConflictError) {
      return {
        status: 409,
        body: { error: "이 idempotencyKey는 이미 다른 주문 정보로 사용되었습니다. 새로 시도해주세요." },
      };
    }
    console.error(
      "[api/admin/manual-orders] idempotencyKey 사전 조회 실패:",
      e instanceof Error ? e.message : e
    );
    return {
      status: 500,
      body: { error: "주문 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요." },
    };
  }

  // ── 중복 제출 방어(보조 안전장치, 위 주석 참고) ──
  try {
    const dup = await deps.sql`
      select o.id from orders o
      join reports r on r.id = o.report_id
      where r.name = ${intake.name}
        and r.birth_year = ${intake.year}
        and r.birth_month = ${intake.month}
        and r.birth_day = ${intake.day}
        and r.birth_hour is not distinct from ${intake.hour}
        and o.channel = ${channel}
        and o.created_at > now() - interval '2 minutes'
      limit 1
    `;
    if (Array.isArray(dup) && dup.length > 0) {
      return {
        status: 409,
        body: { error: "최근 2분 이내 동일한 고객 정보로 접수된 주문이 이미 있습니다. 중복 제출 여부를 확인해주세요." },
      };
    }
  } catch (e) {
    console.error("[api/admin/manual-orders] 중복 확인 조회 실패:", e instanceof Error ? e.message : e);
    return {
      status: 500,
      body: { error: "주문 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요." },
    };
  }

  // ── 실제 생성 ──
  const input: CreateManualPaidOrderInput = { intake, email, amount, channel, idempotencyKey };
  try {
    const result = await deps.createOrder(input);
    return {
      status: result.alreadyExisted ? 200 : 201,
      body: { reportId: result.reportId, orderId: result.orderId, deliveryId: result.deliveryId, status: "PAID" },
    };
  } catch (e) {
    if (e instanceof IdempotencyKeyConflictError) {
      // 위 사전 조회 직후~트랜잭션 사이의 극히 좁은 창구에서 동시에 다른
      // 요청이 같은 key를 다른 주문 데이터로 먼저 커밋한 경우 — 조용히
      // 넘어가지 않고 명확히 409로 알린다.
      return {
        status: 409,
        body: { error: "이 idempotencyKey는 이미 다른 주문 정보로 사용되었습니다. 새로 시도해주세요." },
      };
    }
    // DB 연결/쿼리 실패 세부 내용, secret, stack trace는 절대 클라이언트로
    // 내보내지 않는다(app/api/reports/route.ts와 동일 원칙) — 서버 로그에만.
    console.error("[api/admin/manual-orders] 주문 생성 실패:", e instanceof Error ? e.message : e);
    return {
      status: 500,
      body: { error: "주문 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요." },
    };
  }
}

export function createHandler(deps: ManualOrderRouteDeps) {
  return async function handlePOST(req: NextRequest): Promise<NextResponse> {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: "인증에 실패했습니다." }, { status: 401 });
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
    }

    const result = await processManualOrderRequest(rawBody, deps);
    return NextResponse.json(result.body, { status: result.status });
  };
}
