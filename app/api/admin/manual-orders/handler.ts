import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { calculateSaju } from "@/lib/sajuEngine";
import { parseIntakeInput } from "@/lib/reportStore";
import { getSql } from "@/lib/db";
import { createManualPaidOrder, CreateManualPaidOrderInput } from "@/lib/manualOrderStore";

/**
 * 당근 등 수동 주문 접수 전용 관리자 API의 실제 로직 — createManualPaidOrder
 * (데이터 계층, 이미 승인·동결됨) 하나만 호출한다. 이 단계에서는 관리자
 * UI/PDF 생성/이메일 실제 발송을 전혀 만들지 않는다(다음 단계 범위).
 *
 * [2026-09 빌드 오류 수정] 이 로직을 원래 app/api/admin/manual-orders/route.ts에
 * 직접 뒀더니, Next.js App Router의 typed routes 검사(`next build`의
 * `.next/types/app/.../route.ts` 자동 생성)가 route.ts에서 GET/POST 등
 * 정해진 이름 외의 export(여기서는 createHandler)를 전부 오류로 잡았다
 * (checkFields<Diff<...>> 타입 오류로 빌드 자체가 실패). 그래서 실제 로직은
 * route.ts가 아닌 이 파일(handler.ts, 일반 모듈이라 제약 없음)로 옮기고,
 * route.ts는 POST만 export하는 얇은 wrapper로 남긴다. 로직 자체는 한 글자도
 * 바뀌지 않았다 — 파일 위치만 옮김.
 *
 * 인증: NEXT_PUBLIC_* 아닌 서버 전용 env var(ADMIN_API_SECRET)를
 * `x-admin-secret` 요청 헤더와 상수 시간 비교(timingSafeEqual)한다 —
 * lib/tossPayments.ts의 TOSS_SECRET_KEY와 동일한 패턴(함수 내부에서
 * process.env를 매 요청마다 읽음, 모듈 top-level에서 읽지 않음 — 빌드
 * 타임에 env가 없어도 빌드 자체가 죽지 않게). 이 env var가 아직
 * Vercel/.env.local에 설정돼 있지 않다면 isAuthorized가 항상 false를
 * 반환해 이 엔드포인트는 "설정 전까지는 안전하게 잠겨 있는" 상태다
 * (fail-closed, 의도된 동작).
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
 * 중복 제출 방어: DB schema 변경 없이, "같은 고객 정보(이름+생년월일시)로
 * 최근 2분 이내 karrot 채널 주문이 이미 있는지" SELECT로 확인 후 있으면
 * 409로 거부한다. 이건 관리자가 버튼을 실수로 두 번 누르는 흔한 케이스는
 * 막아주지만, "정확히 동시에 두 요청이 도착하는" 진짜 경쟁 상태(race
 * condition)까지 완전히 막는 하드 개런티는 아니다 — 진짜 개런티를 주려면
 * order_id를 고객 정보로부터 결정론적으로 만들어 orders.order_id의 기존
 * UNIQUE 제약에 기대는 방법이 있지만, 그러려면 createManualPaidOrder가
 * 외부에서 order_id를 주입받을 수 있어야 한다(현재 함수는 항상 내부에서
 * randomUUID() — 이번 단계에서 "유지"하기로 확정된 파일이라 여기서 고치지
 * 않았다). 이 잔여 리스크는 완료 보고에 그대로 남겨 보고한다.
 *
 * deps 기반 팩토리로 뺀 이유: 테스트에서 실제 DB(getSql())를 호출하지
 * 않고 createOrder/sql을 가짜로 주입할 수 있게 하기 위함 — route.ts의
 * POST export 자체는 실제 의존성으로 매 요청마다 만들어진다(모듈
 * top-level에서 getSql()을 호출하지 않는다 — app/api/reports/route.ts와
 * 동일하게 빌드 타임 크래시를 피한다).
 */

export interface ManualOrderRouteDeps {
  createOrder: typeof createManualPaidOrder;
  sql: ReturnType<typeof getSql>;
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
    if (!rawBody || typeof rawBody !== "object") {
      return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
    }
    const b = rawBody as Record<string, unknown>;

    // ── 사주 입력 검증(기존 로직 재사용, 복제하지 않음) ──
    const intake = parseIntakeInput(mapToParseIntakeShape(b));
    if (!intake) {
      return NextResponse.json({ error: "입력값을 다시 확인해주세요." }, { status: 400 });
    }
    try {
      calculateSaju(intake);
    } catch (e) {
      const message = e instanceof Error ? e.message : "입력하신 생년월일을 다시 확인해주세요.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    // ── 이메일/금액 검증(이 API 자체 입력이라 여기서 얇게 확인 —
    //     createManualPaidOrder도 내부적으로 한 번 더 검증한다, 이중 방어) ──
    const email = typeof b.email === "string" ? b.email.trim() : "";
    if (!email || !email.includes("@") || email.length > 200) {
      return NextResponse.json({ error: "유효한 이메일을 입력해주세요." }, { status: 400 });
    }
    const amount = typeof b.amount === "number" ? b.amount : NaN;
    if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) {
      return NextResponse.json({ error: "금액이 올바르지 않습니다." }, { status: 400 });
    }

    // ── channel은 client 입력 무시, 서버 고정 ──
    const channel = "karrot" as const;

    // ── 중복 제출 방어(최선 노력, 완전한 개런티 아님 — 위 주석 참고) ──
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
        return NextResponse.json(
          { error: "최근 2분 이내 동일한 고객 정보로 접수된 주문이 이미 있습니다. 중복 제출 여부를 확인해주세요." },
          { status: 409 }
        );
      }
    } catch (e) {
      console.error("[api/admin/manual-orders] 중복 확인 조회 실패:", e instanceof Error ? e.message : e);
      return NextResponse.json(
        { error: "주문 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요." },
        { status: 500 }
      );
    }

    // ── 실제 생성 ──
    const input: CreateManualPaidOrderInput = { intake, email, amount, channel };
    try {
      const result = await deps.createOrder(input);
      return NextResponse.json(
        { reportId: result.reportId, orderId: result.orderId, deliveryId: result.deliveryId, status: "PAID" },
        { status: 201 }
      );
    } catch (e) {
      // DB 연결/쿼리 실패 세부 내용, secret, stack trace는 절대 클라이언트로
      // 내보내지 않는다(app/api/reports/route.ts와 동일 원칙) — 서버 로그에만.
      console.error("[api/admin/manual-orders] 주문 생성 실패:", e instanceof Error ? e.message : e);
      return NextResponse.json(
        { error: "주문 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요." },
        { status: 500 }
      );
    }
  };
}
