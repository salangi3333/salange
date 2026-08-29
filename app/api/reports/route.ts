import { NextRequest, NextResponse } from "next/server";
import { calculateSaju } from "@/lib/sajuEngine";
import { createReport, parseIntakeInput } from "@/lib/reportStore";

/**
 * DB + reportId + 영구 재접속 구조 — report 생성 전용 서버 엔드포인트.
 * 브라우저는 DB에 직접 접근하지 않는다. 이 라우트만이 DATABASE_URL을
 * 쓰는 lib/reportStore.ts/lib/db.ts를 부른다.
 *
 * 사주 계산은 여기서 새로 하지 않는다 — 저장 전 입력값이 실제로 계산
 * 가능한 날짜인지 확인하는 용도로만 기존 calculateSaju(이미 검증된
 * validateBirthDate 방어 로직을 내장)를 한 번 호출한다. 계산 결과 자체는
 * 버리고 reportId만 반환한다 — 실제 리포트 계산/렌더링은
 * app/result-v2/[reportId]/page.tsx가 담당한다.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const input = parseIntakeInput(body);
  if (!input) {
    return NextResponse.json({ error: "입력값을 다시 확인해주세요." }, { status: 400 });
  }

  try {
    calculateSaju(input);
  } catch (e) {
    const message = e instanceof Error ? e.message : "입력하신 생년월일을 다시 확인해주세요.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const reportId = await createReport(input);
    return NextResponse.json({ reportId });
  } catch (e) {
    // DB 연결/쿼리 실패의 세부 내용(민감할 수 있는 연결 정보 포함)은 절대
    // 클라이언트로 내보내지 않는다 — 서버 로그에만 원인을 남긴다.
    console.error("[api/reports] report 생성 실패:", e instanceof Error ? e.message : e);
    return NextResponse.json(
      { error: "리포트 생성에 실패했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 }
    );
  }
}
