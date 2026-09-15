import { Resend } from "resend";
import { generateBookPdfBuffer } from "./generateBookPdfBuffer";
import { IntakeFormData } from "./sajuEngine";
import { getSql } from "./db";

/**
 * [2026-09-14 신규] "관리자 주문 등록 → PDF 생성 성공 확인 → 고객 이메일로
 * PDF 발송 → report_deliveries 상태 기록" 파이프라인의 마지막 두 단계.
 *
 * 기존 lib/manualOrderStore.ts(`createManualPaidOrder`)의 문서화된 설계를
 * 그대로 따른다 — 그 파일 자체 주석: "PDF 생성·이메일 발송은 이 함수의
 * 책임이 아니다... report_deliveries는 '발송 대기(PENDING)' 상태로만
 * 기록하고, 실제 발송 로직은 이후 별도 단계에서 이 레코드를 읽어
 * 처리한다." — 이 파일이 바로 그 "별도 단계"다. manualOrderStore.ts/
 * handler.ts의 주문 생성 로직은 한 글자도 건드리지 않았다.
 *
 * PDF 생성은 기존 generateBookPdfBuffer()(2026-09-11에 이미 검증·수정된
 * 함수, 로컬/Vercel 자동분기 + Noto Serif KR 임베딩까지 포함)를 그대로
 * 재사용한다 — PDF 렌더링/디자인/폰트 로직을 여기서 복제하거나 새로
 * 만들지 않는다.
 *
 * 이메일 발송은 Resend(2026-09-12~14 조사 후 선정, 공식 SDK) — API Key는
 * 함수 실행 시점에 process.env.RESEND_API_KEY에서만 읽는다(모듈
 * top-level에서 읽지 않음 — TOSS_SECRET_KEY/ADMIN_API_SECRET과 동일한
 * 기존 패턴, env 없는 빌드 환경에서도 빌드 자체는 깨지지 않게 함). 코드에
 * 하드코딩된 값 없음.
 */

const FROM_ADDRESS = "팔자문 <report@paljamun.com>";
const SITE_URL = "https://paljamun.com"; // app/layout.tsx의 SITE_URL과 동일한 값(그 상수 자체가 export 안 돼 있어 값만 그대로 반복)

export interface SendReportEmailInput {
  reportId: string;
  email: string;
  name: string;
  intake: IntakeFormData;
}

export interface SendReportEmailResult {
  success: boolean;
  resendId?: string;
  error?: string;
}

function getResendClient(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("[reportDelivery] RESEND_API_KEY가 설정되어 있지 않습니다.");
  }
  return new Resend(key);
}

function buildEmailHtml(name: string, resultLink: string): string {
  // 기존 PDF/사이트 톤(한지·금색 포인트)과 크게 다르지 않게 최소한의
  // 브랜드 요소만 넣는다 — 이메일 클라이언트 호환성을 위해 인라인 스타일만
  // 쓰고 외부 CSS/폰트는 불러오지 않는다.
  return `<!doctype html>
<html lang="ko">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#F5EDDB;font-family:'Malgun Gothic','맑은 고딕',sans-serif;color:#2B2622;">
  <div style="max-width:520px;margin:0 auto;padding:32px 24px;">
    <p style="font-size:13px;letter-spacing:2px;color:#6B4A1F;font-weight:700;margin:0 0 16px;">PALJAMUN · 팔자문</p>
    <h1 style="font-size:20px;margin:0 0 20px;color:#3A2E1C;">${name}님의 평생운명록이 도착했습니다</h1>
    <p style="font-size:14px;line-height:1.8;margin:0 0 16px;">
      주문하신 팔자문 평생운명록 PDF를 이 메일에 첨부해드렸습니다.<br />
      아래 링크에서 웹으로도 언제든 다시 확인하실 수 있습니다.
    </p>
    <p style="margin:24px 0;">
      <a href="${resultLink}" style="display:inline-block;background:#6B4A1F;color:#F5EFE1;text-decoration:none;padding:12px 24px;border-radius:4px;font-size:14px;">웹에서 다시보기</a>
    </p>
    <p style="font-size:12px;color:#8B7257;margin-top:32px;">본 메일은 팔자문(paljamun.com) 주문에 따라 발송되었습니다.</p>
  </div>
</body>
</html>`;
}

/**
 * PDF를 생성해 첨부한 이메일을 실제로 발송한다. PDF 생성 실패든 Resend API
 * 실패든 예외를 던지지 않고 항상 {success, error?} 형태로 반환한다 —
 * 호출부(아래 createEmailDeliverer)가 이 결과를 그대로
 * report_deliveries.status(SENT/FAILED)에 반영하기 때문에, 여기서 예외가
 * 새면 그 반영 자체가 안 될 수 있다.
 */
export async function sendReportPdfEmail(input: SendReportEmailInput): Promise<SendReportEmailResult> {
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await generateBookPdfBuffer(input.intake);
  } catch (e) {
    return { success: false, error: `PDF 생성 실패: ${e instanceof Error ? e.message : String(e)}` };
  }

  try {
    const resend = getResendClient();
    const resultLink = `${SITE_URL}/result-v2/${input.reportId}`;
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: input.email,
      subject: `[팔자문] ${input.name}님의 평생운명록이 도착했습니다`,
      html: buildEmailHtml(input.name, resultLink),
      attachments: [
        {
          filename: `${input.name}_팔자문_평생운명록.pdf`,
          content: pdfBuffer,
        },
      ],
    });
    if (error) {
      return { success: false, error: `Resend 발송 실패: ${error.message}` };
    }
    return { success: true, resendId: data?.id };
  } catch (e) {
    return { success: false, error: `Resend 호출 실패: ${e instanceof Error ? e.message : String(e)}` };
  }
}

export type DeliverEmailFn = (args: {
  deliveryId: string;
  reportId: string;
  email: string;
  name: string;
  intake: IntakeFormData;
}) => Promise<{ status: "SENT" | "FAILED" | "SKIPPED"; error?: string }>;

type SqlLike = ReturnType<typeof getSql>;

/**
 * ManualOrderRouteDeps.deliverEmail에 그대로 꽂아 넣을 함수를 만든다(팩토리
 * 패턴 — 기존 코드베이스의 deps 주입 스타일과 동일). sql을 클로저로
 * 캡처해서, 실제 route.ts는 이미 가지고 있는 getSql() 결과를 그대로
 * 넘기기만 하면 된다.
 *
 * [2026-09-15 race condition 수정] 이전 버전은 "① SELECT status 조회 →
 * ② 이메일 발송 → ③ status='PENDING' 조건 UPDATE"의 3단계가 원자적으로
 * 묶여 있지 않았다 — 같은 deliveryId로 거의 동시에 두 번 호출되면 둘 다
 * ①에서 PENDING을 보고 둘 다 ②(Resend 실제 발송)까지 실행할 수 있었다.
 * ③의 WHERE 가드는 DB 레코드가 두 번 SENT로 덮이는 것만 막았지, 이미 나간
 * 이메일 자체(Resend 호출)가 중복되는 것은 막지 못했다.
 *
 * 새 설계 — DB migration 없이, 기존 스키마(lib/schema.sql의
 * report_deliveries.status CHECK 제약은 'PENDING'/'SENT'/'FAILED' 3개뿐 —
 * 새 상태값을 추가하려면 그 제약을 ALTER해야 해서 이번엔 넣지 않는다)와
 * 기존 필드만으로 원자적 claim을 구현한다:
 *   1) 단 하나의 UPDATE 문으로 "PENDING이고 아직 아무도 진행 중이 아닌"
 *      행만 잡아 sent_at을 지금 시각으로 미리 찍어둔다(RETURNING으로 실제
 *      갱신된 행이 있는지 확인). Postgres는 단일 UPDATE 문 실행 중 대상
 *      행에 배타적 잠금을 걸므로, 완전히 동시에 들어온 두 호출 중 정확히
 *      하나만 이 UPDATE의 WHERE 조건에 매치되어 행을 가져간다(먼저 커밋된
 *      쪽이 sent_at을 이미 바꿔놔서, 늦은 쪽은 자기 WHERE 조건에 안 걸림)
 *      — SELECT-then-UPDATE와 달리 이 자체가 하나의 원자적 연산이라
 *      두 프로세스가 동시에 "성공"을 볼 수 없다.
 *   2) claim에 성공한 요청만 실제 PDF 생성+Resend 발송을 진행한다. claim에
 *      실패(0행)하면 즉시 SKIPPED — Resend를 아예 호출하지 않는다.
 *   3) 성공하면 sent_at을 진짜 완료 시각으로 다시 덮어쓰고 status='SENT'로.
 *      실패하면 status='FAILED'로 두고 sent_at은 다시 null로 되돌린다 —
 *      "SENT가 아니면 sent_at은 항상 null"이라는 기존 의미를 최종 상태
 *      기준으로는 그대로 유지한다(claim 중인 아주 짧은 순간에만 PENDING
 *      상태에서 sent_at이 채워져 있는 과도기가 생기지만, 두 분기 모두
 *      끝나면 원래 의미로 복원된다).
 *   4) claim 조건에 `sent_at is null or sent_at < now() - interval
 *      '2 minutes'`를 넣어, 서버가 claim 직후 죽어버린 것처럼 비정상
 *      종료된 행도 2분 뒤엔 다시 claim 가능하게 한다(영구 stuck 방지) —
 *      PDF 생성+Resend 호출은 보통 수 초 안에 끝나므로 2분은 실제 진행
 *      중인 시도를 잘못 가로챌 위험 없이 충분히 넉넉한 여유값이다(이
 *      "2분" 값은 이 handler.ts가 이미 쓰는 중복 제출 방어 윈도우와 같은
 *      관례를 그대로 재사용한 것— 새 임의 threshold 신설 아님).
 */
export function createEmailDeliverer(sql: SqlLike): DeliverEmailFn {
  return async ({ deliveryId, reportId, email, name, intake }) => {
    const claimRows = await sql`
      update report_deliveries
      set sent_at = now()
      where id = ${deliveryId}
        and status = 'PENDING'
        and (sent_at is null or sent_at < now() - interval '2 minutes')
      returning id
    `;
    if (!Array.isArray(claimRows) || claimRows.length === 0) {
      return { status: "SKIPPED" };
    }

    const result = await sendReportPdfEmail({ reportId, email, name, intake });

    if (result.success) {
      await sql`
        update report_deliveries set status = 'SENT', sent_at = now()
        where id = ${deliveryId}
      `;
      return { status: "SENT" };
    }

    // PDF 생성 실패든 Resend 실패든, 원본 에러 메시지는 서버 로그에만
    // 남기고 여기서는 짧은 메시지만 돌려준다(app/api/admin/manual-orders의
    // 기존 원칙 — DB/secret 내부 정보를 클라이언트로 흘리지 않음).
    console.error(`[reportDelivery] 발송 실패 (deliveryId=${deliveryId}):`, result.error);
    await sql`
      update report_deliveries set status = 'FAILED', sent_at = null
      where id = ${deliveryId}
    `;
    return { status: "FAILED", error: result.error };
  };
}
