import { createHmac, randomBytes } from "crypto";
import { getSql } from "./db";

/**
 * 결제 후 카카오 알림톡(SOLAPI) 발송 장치 — "부가 전달 수단"이다.
 *
 * 핵심 원칙(2026-10-03 설계 확정):
 *  1) 알림톡 실패/미설정/지연이 결제 완료 화면과 /result-v2/[reportId] 이동을 절대
 *     막지 않는다(notifyKakaoAfterPaid는 어떤 경우에도 throw하지 않는다).
 *  2) 한 주문당 최초 발송은 DB atomic UPDATE(claim)를 따낸 요청 하나만 진입한다.
 *  3) SOLAPI 그룹 ID를 발송 *전에* DB(orders.kakao_group_id)에 저장한다 — 응답이
 *     유실돼도 그 groupId로 나중에 상태를 조회할 수 있다.
 *  4) `sent`는 SOLAPI 개별 메시지 상태코드 4000이 확인됐을 때만 쓴다. API 요청이
 *     성공했다는 사실만으로 sent로 바꾸지 않는다(2000/3000은 처리 중).
 *  5) 자동 재발송은 없다. timeout·응답 유실·sending 장기 지속에서도 새 groupId를
 *     만들어 다시 보내지 않는다. 재발송은 `failed`로 확인된 주문에 한해, SOLAPI
 *     상태를 먼저 조회한 뒤 관리자가 명시적으로 호출한다(resendKakaoForOrder).
 *  6) SOLAPI 설정(환경변수)이 하나라도 없으면 외부 호출도, DB 접근도 하지 않는다.
 *
 * 이 파일은 서버 전용이다("use client" 파일에서 import 금지). API Secret 등
 * 비밀값은 함수 실행 시점에 process.env에서만 읽고, 로그·DB·응답에 남기지 않는다.
 * 휴대전화번호·이름도 로그에 남기지 않는다(주문번호와 단계/코드만 기록).
 */

type Sql = ReturnType<typeof getSql>;

// ───────────────────────── 설정 ─────────────────────────

export interface SolapiConfig {
  apiKey: string;
  apiSecret: string;
  /** 카카오 비즈니스 채널 ID(pfId) — SOLAPI에 채널을 연동한 뒤 콘솔에 표시되는 값. */
  pfId: string;
  /** 승인된 알림톡 템플릿 ID. */
  templateId: string;
  /** SOLAPI에 등록한 발신번호(알림톡 요청의 from). */
  sender: string;
}

const SOLAPI_BASE_URL = "https://api.solapi.com";

/**
 * 알림톡 템플릿 변수 이름 — 템플릿 등록 문안(#{고객명}, 버튼 URL의 #{리포트ID})과
 * 반드시 같아야 한다. 템플릿 등록 때 이름이 달라지면 여기만 고친다.
 */
export const TEMPLATE_VAR_NAME = "#{고객명}";
export const TEMPLATE_VAR_REPORT_ID = "#{리포트ID}";

/** 필요한 값 5개가 모두 있을 때만 설정 객체를 돌려준다. 하나라도 비면 null(= 기능 꺼짐). */
export function loadSolapiConfig(
  env: Record<string, string | undefined> = process.env
): SolapiConfig | null {
  const apiKey = env.SOLAPI_API_KEY?.trim();
  const apiSecret = env.SOLAPI_API_SECRET?.trim();
  const pfId = env.SOLAPI_PF_ID?.trim();
  const templateId = env.SOLAPI_TEMPLATE_ID?.trim();
  const sender = env.SOLAPI_SENDER?.trim();
  if (!apiKey || !apiSecret || !pfId || !templateId || !sender) return null;
  return { apiKey, apiSecret, pfId, templateId, sender };
}

// ───────────────────────── 상태 판정 ─────────────────────────

export type MessageOutcome = "sent" | "failed" | "pending" | "unknown";

/**
 * SOLAPI 개별 메시지 statusCode 해석(공식 상태코드 안내 기준).
 *  4000 = 발송 성공 → sent
 *  2000 = 접수/발송 대기, 3000 = 이통사 접수(리포트 대기) → pending(sent 금지)
 *  1XXX = 입력 오류 접수 실패, 2XXX(2000 제외) = 검증 실패·잔액 부족 등,
 *  3XXX(3000 제외) = 발송 실패 → failed
 *  그 밖(비어 있음, 알 수 없는 코드) → unknown(상태를 바꾸지 않는다)
 */
export function classifyStatusCode(code: unknown): MessageOutcome {
  const c = typeof code === "number" ? String(code) : typeof code === "string" ? code.trim() : "";
  if (!/^\d{4}$/.test(c)) return "unknown";
  if (c === "4000") return "sent";
  if (c === "2000" || c === "3000") return "pending";
  if (c[0] === "1" || c[0] === "2" || c[0] === "3") return "failed";
  return "unknown";
}

/** kakao_error에 저장할 짧은 코드. 번호·이름 등 개인정보가 섞이지 않게 허용 문자만 남긴다. */
function safeErrorText(raw: string): string {
  return raw.replace(/[^A-Za-z0-9_:.\- ]/g, "").slice(0, 80);
}

// ───────────────────────── SOLAPI REST 클라이언트 ─────────────────────────

export class SolapiError extends Error {
  kind: "http" | "network" | "timeout" | "parse";
  status?: number;
  code?: string;
  constructor(kind: SolapiError["kind"], status?: number, code?: string) {
    super(`solapi ${kind}${status ? ` ${status}` : ""}${code ? ` ${code}` : ""}`);
    this.kind = kind;
    this.status = status;
    this.code = code;
  }
}

/** SOLAPI 인증 헤더(HMAC-SHA256: date+salt를 API Secret으로 서명). 값은 로그에 남기지 않는다. */
export function buildSolapiAuthHeader(
  cfg: Pick<SolapiConfig, "apiKey" | "apiSecret">,
  now: Date = new Date(),
  salt: string = randomBytes(16).toString("hex")
): string {
  const date = now.toISOString();
  const signature = createHmac("sha256", cfg.apiSecret).update(date + salt).digest("hex");
  return `HMAC-SHA256 apiKey=${cfg.apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

export interface SolapiClient {
  createGroup(orderId: string): Promise<string>;
  addMessage(groupId: string, msg: AlimtalkMessage): Promise<{ errorCount: number; statusCode: string }>;
  sendGroup(groupId: string): Promise<void>;
  getGroupMessageStatus(groupId: string): Promise<{ outcome: MessageOutcome; statusCode: string }>;
}

export interface AlimtalkMessage {
  to: string;
  from: string;
  type: "ATA";
  kakaoOptions: { pfId: string; templateId: string; variables: Record<string, string> };
}

export function createSolapiClient(
  cfg: SolapiConfig,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 2500
): SolapiClient {
  async function request(method: string, path: string, body?: unknown): Promise<unknown> {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      let res: Response;
      let text: string;
      try {
        res = await fetchImpl(`${SOLAPI_BASE_URL}${path}`, {
          method,
          headers: {
            Authorization: buildSolapiAuthHeader(cfg),
            "Content-Type": "application/json",
          },
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: ctl.signal,
          cache: "no-store",
        });
        text = await res.text();
      } catch (e) {
        const aborted = ctl.signal.aborted || (e instanceof Error && e.name === "AbortError");
        throw new SolapiError(aborted ? "timeout" : "network");
      }
      let json: unknown = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        if (res.ok) throw new SolapiError("parse");
      }
      if (!res.ok) {
        const code =
          json && typeof json === "object" && typeof (json as Record<string, unknown>).errorCode === "string"
            ? safeErrorText((json as Record<string, string>).errorCode)
            : undefined;
        throw new SolapiError("http", res.status, code);
      }
      return json;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    /** 발송 전에 그룹만 먼저 만든다(이 시점엔 고객에게 아무것도 가지 않는다). */
    async createGroup(orderId) {
      const data = (await request("POST", "/messages/v4/groups", {
        customFields: { orderId },
      })) as Record<string, unknown> | null;
      const groupId = data && typeof data.groupId === "string" ? data.groupId : "";
      if (!groupId) throw new SolapiError("parse");
      return groupId;
    },

    /** PENDING 그룹에 메시지 1개를 넣는다(아직 발송 아님). 접수 결과(statusCode 2000=정상)를 돌려준다. */
    async addMessage(groupId, msg) {
      const data = (await request("PUT", `/messages/v4/groups/${encodeURIComponent(groupId)}/messages`, {
        messages: [msg],
      })) as Record<string, unknown> | null;
      const errorCount = Number(data?.errorCount ?? 0);
      const list = Array.isArray(data?.resultList) ? (data!.resultList as Record<string, unknown>[]) : [];
      const statusCode = typeof list[0]?.statusCode === "string" ? (list[0].statusCode as string) : "";
      return { errorCount: Number.isFinite(errorCount) ? errorCount : 0, statusCode };
    },

    /** 그룹 발송 요청. 성공(HTTP 2xx)은 "접수됐다"일 뿐 sent가 아니다. */
    async sendGroup(groupId) {
      await request("POST", `/messages/v4/groups/${encodeURIComponent(groupId)}/send`, {});
    },

    /** 그룹의 개별 메시지 최종 상태 조회. 메시지가 없거나 형식이 다르면 unknown. */
    async getGroupMessageStatus(groupId) {
      const data = (await request(
        "GET",
        `/messages/v4/groups/${encodeURIComponent(groupId)}/messages`
      )) as Record<string, unknown> | null;
      const ml = (data?.messageList ?? data?.messages ?? data) as unknown;
      let msgs: Record<string, unknown>[] = [];
      if (Array.isArray(ml)) msgs = ml as Record<string, unknown>[];
      else if (ml && typeof ml === "object")
        msgs = Object.values(ml as Record<string, unknown>).filter(
          (v): v is Record<string, unknown> => !!v && typeof v === "object" && "statusCode" in v
        );
      const first = msgs[0];
      if (!first) return { outcome: "unknown", statusCode: "" };
      const statusCode = typeof first.statusCode === "string" ? first.statusCode : "";
      return { outcome: classifyStatusCode(statusCode), statusCode };
    },
  };
}

// ───────────────────────── DB 단계(각각 1문장) ─────────────────────────

/**
 * 최초 발송 권한 획득 — 이 UPDATE가 행을 돌려준 요청 하나만 발송 절차에 들어간다.
 * 조건: PAID + 번호 있음 + kakao_status가 아직 NULL. 새로고침·중복 요청·재진입은 0행이다.
 */
export async function claimKakaoSend(
  sql: Sql,
  orderId: string
): Promise<{ reportId: string; phone: string } | null> {
  const rows = await sql`
    update orders
    set kakao_status = 'sending', kakao_updated_at = now(), kakao_error = null
    where order_id = ${orderId}
      and status = 'PAID'
      and buyer_phone is not null
      and kakao_status is null
    returning report_id, buyer_phone
  `;
  if (rows.length === 0) return null;
  return { reportId: rows[0].report_id as string, phone: rows[0].buyer_phone as string };
}

/** failed 주문의 수동 재발송 권한 획득. 이전 groupId는 비우고 새 그룹으로 추적을 시작한다. */
async function claimKakaoResend(
  sql: Sql,
  orderId: string
): Promise<{ reportId: string; phone: string } | null> {
  const rows = await sql`
    update orders
    set kakao_status = 'sending', kakao_group_id = null, kakao_updated_at = now(), kakao_error = null
    where order_id = ${orderId}
      and status = 'PAID'
      and buyer_phone is not null
      and kakao_status = 'failed'
    returning report_id, buyer_phone
  `;
  if (rows.length === 0) return null;
  return { reportId: rows[0].report_id as string, phone: rows[0].buyer_phone as string };
}

async function saveGroupId(sql: Sql, orderId: string, groupId: string): Promise<boolean> {
  const rows = await sql`
    update orders
    set kakao_group_id = ${groupId}, kakao_updated_at = now()
    where order_id = ${orderId} and kakao_status = 'sending' and kakao_group_id is null
    returning order_id
  `;
  return rows.length > 0;
}

async function markFailed(sql: Sql, orderId: string, error: string): Promise<void> {
  await sql`
    update orders
    set kakao_status = 'failed', kakao_updated_at = now(), kakao_error = ${safeErrorText(error)}
    where order_id = ${orderId} and kakao_status = 'sending'
  `;
}

async function markSent(sql: Sql, orderId: string): Promise<void> {
  await sql`
    update orders
    set kakao_status = 'sent', kakao_updated_at = now(), kakao_error = null
    where order_id = ${orderId} and kakao_status in ('sending', 'failed')
  `;
}

async function markSendingFromFailed(sql: Sql, orderId: string): Promise<void> {
  await sql`
    update orders
    set kakao_status = 'sending', kakao_updated_at = now()
    where order_id = ${orderId} and kakao_status = 'failed'
  `;
}

// ───────────────────────── 발송 절차 ─────────────────────────

export interface KakaoDeps {
  sql: Sql;
  config: SolapiConfig | null;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export type KakaoSendResult =
  | { result: "not_configured" }
  | { result: "not_claimed" }
  /** SOLAPI가 발송 요청을 접수함. 최종 성공(4000)은 아직 모름 — kakao_status는 sending 유지. */
  | { result: "requested"; groupId: string }
  | { result: "failed"; stage: string; error: string }
  /** 결과 불명(응답 유실 등). sending 유지, 자동 재발송 없음. */
  | { result: "unknown"; stage: string; groupId?: string };

let warnedNotConfigured = false;

function warnNotConfiguredOnce() {
  if (warnedNotConfigured) return;
  warnedNotConfigured = true;
  console.warn("[kakaoNotify] SOLAPI 설정이 없어 알림톡 발송을 건너뜁니다(결제/리포트 흐름에는 영향 없음).");
}

function log(level: "warn" | "error", orderId: string, stage: string, detail: string) {
  // 번호·이름은 절대 로그에 남기지 않는다(주문번호·단계·코드만).
  console[level](`[kakaoNotify] ${stage} order=${orderId} ${detail}`.trim());
}

/** 발송 요청 이후에도 "아직 발송 안 됨"이 확실한 오류인지(= failed로 보고 재발송 허용해도 되는지). */
function isDefiniteReject(e: unknown): boolean {
  if (!(e instanceof SolapiError) || e.kind !== "http") return false;
  if (e.status === undefined || e.status < 400 || e.status >= 500) return false;
  // 이미 발송됐거나 처리 중이라는 뜻의 응답은 실패가 아니다 → 결과 불명으로 둔다.
  return !["AlreadySent", "GroupInProcessing", "InvalidGroupStatus"].includes(e.code ?? "");
}

function errText(e: unknown): string {
  if (e instanceof SolapiError) {
    return safeErrorText(e.kind === "http" ? `http${e.status}${e.code ? `_${e.code}` : ""}` : e.kind);
  }
  return "internal";
}

/** claim을 이미 따낸 뒤의 공통 절차: 그룹 생성 → groupId 저장 → 메시지 추가 → 발송 요청. */
async function runSendFlow(
  deps: KakaoDeps,
  orderId: string,
  claimed: { reportId: string; phone: string }
): Promise<KakaoSendResult> {
  const { sql, config } = deps;
  const client = createSolapiClient(config!, deps.fetchImpl ?? fetch, deps.timeoutMs ?? 2500);

  // ① 발송 전 단계들 — 여기서 실패해도 고객에게는 아무것도 가지 않았으므로 failed로 둔다.
  let name = "";
  try {
    const r = await sql`select name from reports where id = ${claimed.reportId} limit 1`;
    name = r.length > 0 ? String(r[0].name ?? "").trim().slice(0, 30) : "";
    if (!name) throw new Error("no name");
  } catch {
    await markFailed(sql, orderId, "internal_report_lookup");
    log("error", orderId, "prepare", "report lookup failed");
    return { result: "failed", stage: "prepare", error: "internal_report_lookup" };
  }

  let groupId: string;
  try {
    groupId = await client.createGroup(orderId);
  } catch (e) {
    const error = `create_${errText(e)}`;
    await markFailed(sql, orderId, error);
    log("error", orderId, "createGroup", error);
    return { result: "failed", stage: "createGroup", error };
  }

  // ② groupId를 발송 전에 저장한다. 저장하지 못하면 발송하지 않는다(추적 불가 발송 금지).
  let saved = false;
  try {
    saved = await saveGroupId(sql, orderId, groupId);
  } catch {
    saved = false;
  }
  if (!saved) {
    try {
      await markFailed(sql, orderId, "internal_groupid_save");
    } catch {
      /* DB가 불안정하면 sending으로 남는다 — 아직 아무것도 발송되지 않았다 */
    }
    log("error", orderId, "saveGroupId", "not saved; send aborted");
    return { result: "failed", stage: "saveGroupId", error: "internal_groupid_save" };
  }

  // ③ 메시지 추가(아직 발송 아님). 실패해도 발송된 것이 없으므로 failed.
  try {
    const added = await client.addMessage(groupId, {
      to: claimed.phone,
      from: config!.sender,
      type: "ATA",
      kakaoOptions: {
        pfId: config!.pfId,
        templateId: config!.templateId,
        variables: {
          [TEMPLATE_VAR_NAME]: name,
          [TEMPLATE_VAR_REPORT_ID]: claimed.reportId,
        },
      },
    });
    if (added.errorCount > 0 || added.statusCode !== "2000") {
      const error = safeErrorText(`add_${added.statusCode || "no_status"}`);
      await markFailed(sql, orderId, error);
      log("error", orderId, "addMessage", error);
      return { result: "failed", stage: "addMessage", error };
    }
  } catch (e) {
    const error = `add_${errText(e)}`;
    await markFailed(sql, orderId, error);
    log("error", orderId, "addMessage", error);
    return { result: "failed", stage: "addMessage", error };
  }

  // ④ 발송 요청 — 여기서부터는 응답이 유실돼도 실제 발송됐을 수 있다.
  try {
    await client.sendGroup(groupId);
    return { result: "requested", groupId };
  } catch (e) {
    if (isDefiniteReject(e)) {
      const error = `send_${errText(e)}`;
      await markFailed(sql, orderId, error);
      log("error", orderId, "sendGroup", error);
      return { result: "failed", stage: "sendGroup", error };
    }
    // timeout/네트워크/5xx/알 수 없음 → 발송됐을 수 있다: sending 유지, 재발송 없음.
    log("warn", orderId, "sendGroup", `result unknown (${errText(e)}); status stays sending`);
    return { result: "unknown", stage: "sendGroup", groupId };
  }
}

/**
 * 결제 직후 최초 발송. 설정이 없으면 DB도 외부 API도 건드리지 않고 돌아간다.
 * (설정 확인이 claim보다 먼저다 → 설정 전에는 주문이 NULL로 남아 나중에 발송할 수 있다.)
 */
export async function sendKakaoForOrder(deps: KakaoDeps, orderId: string): Promise<KakaoSendResult> {
  if (!deps.config) {
    warnNotConfiguredOnce();
    return { result: "not_configured" };
  }
  const claimed = await claimKakaoSend(deps.sql, orderId);
  if (!claimed) return { result: "not_claimed" };
  return runSendFlow(deps, orderId, claimed);
}

// ───────────────────────── 상태 조회·갱신 ─────────────────────────

export type RefreshResult =
  | { result: "not_configured" }
  | { result: "no_group" }
  | { result: "sent" | "failed" | "pending" | "unknown"; statusCode: string };

/**
 * 저장된 groupId로 SOLAPI 최종 상태를 조회해 DB에 반영한다(웹훅/관리자 "상태 확인"이 호출할 함수).
 *  4000 → sent. 명확한 실패 → failed(+코드). 2000/3000/조회 실패/알 수 없음 → 상태 변경 없음.
 */
export async function refreshKakaoStatus(deps: KakaoDeps, orderId: string): Promise<RefreshResult> {
  if (!deps.config) return { result: "not_configured" };
  const rows = await deps.sql`
    select kakao_group_id from orders where order_id = ${orderId} limit 1
  `;
  const groupId = rows.length > 0 ? (rows[0].kakao_group_id as string | null) : null;
  if (!groupId) return { result: "no_group" };

  const client = createSolapiClient(deps.config, deps.fetchImpl ?? fetch, deps.timeoutMs ?? 2500);
  let status: { outcome: MessageOutcome; statusCode: string };
  try {
    status = await client.getGroupMessageStatus(groupId);
  } catch (e) {
    log("warn", orderId, "refresh", `lookup failed (${errText(e)}); status unchanged`);
    return { result: "unknown", statusCode: "" };
  }
  if (status.outcome === "sent") await markSent(deps.sql, orderId);
  else if (status.outcome === "failed") await markFailed(deps.sql, orderId, status.statusCode);
  return { result: status.outcome, statusCode: status.statusCode };
}

// ───────────────────────── 관리자 재발송(함수만; UI 없음) ─────────────────────────

export type ResendResult =
  | { result: "not_configured" }
  | { result: "not_failed" }
  | { result: "already_sent" }
  | { result: "still_processing" }
  | { result: "resent"; send: KakaoSendResult };

/**
 * failed 주문에 한해, 기존 groupId가 있으면 SOLAPI 상태를 먼저 조회한 뒤에만 재발송한다.
 *  - 이미 4000 → sent로 고치고 재발송 안 함
 *  - 처리 중(2000/3000)이거나 조회 실패/불명확 → sending으로 되돌려 두고 재발송 안 함
 *  - 명확한 실패(또는 groupId 자체가 없음) → 새 그룹으로 재발송
 */
export async function resendKakaoForOrder(deps: KakaoDeps, orderId: string): Promise<ResendResult> {
  if (!deps.config) return { result: "not_configured" };
  const rows = await deps.sql`
    select kakao_status, kakao_group_id from orders where order_id = ${orderId} limit 1
  `;
  if (rows.length === 0 || rows[0].kakao_status !== "failed") return { result: "not_failed" };

  if (rows[0].kakao_group_id) {
    const client = createSolapiClient(deps.config, deps.fetchImpl ?? fetch, deps.timeoutMs ?? 2500);
    let outcome: MessageOutcome = "unknown";
    try {
      outcome = (await client.getGroupMessageStatus(rows[0].kakao_group_id as string)).outcome;
    } catch {
      outcome = "unknown";
    }
    if (outcome === "sent") {
      await markSent(deps.sql, orderId);
      return { result: "already_sent" };
    }
    if (outcome !== "failed") {
      await markSendingFromFailed(deps.sql, orderId);
      return { result: "still_processing" };
    }
  }

  const claimed = await claimKakaoResend(deps.sql, orderId);
  if (!claimed) return { result: "not_failed" };
  return { result: "resent", send: await runSendFlow(deps, orderId, claimed) };
}

/** 관리자가 확인해야 할 주문 목록(번호·이름은 돌려주지 않는다). */
export async function listKakaoAttention(sql: Sql, limit = 100) {
  const rows = await sql`
    select order_id, kakao_status, kakao_updated_at, kakao_error, (kakao_group_id is not null) as has_group
    from orders
    where status = 'PAID'
      and buyer_phone is not null
      and (
        (kakao_status is null and paid_at < now() - interval '2 minutes')
        or kakao_status = 'failed'
        or (kakao_status = 'sending' and kakao_updated_at < now() - interval '10 minutes')
      )
    order by paid_at
    limit ${limit}
  `;
  return rows;
}

// ───────────────────────── 결제 성공 페이지용 안전 래퍼 ─────────────────────────

/** 결제 성공 페이지가 리다이렉트 전에 기다려 주는 최대 시간. 넘어가도 상태는 sending으로 남는다. */
const NOTIFY_BUDGET_MS = 5000;

/**
 * app/payment/success/page.tsx가 markOrderPaid 성공 직후 호출한다.
 * 어떤 오류·지연·미설정에서도 throw하지 않고, 최대 NOTIFY_BUDGET_MS 안에 돌아온다.
 * 설정이 없으면 getSql()도 부르지 않는다(DB 접근 0).
 */
export async function notifyKakaoAfterPaid(orderId: string): Promise<KakaoSendResult | { result: "error" | "timeout" }> {
  try {
    const config = loadSolapiConfig();
    if (!config) {
      warnNotConfiguredOnce();
      return { result: "not_configured" };
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<{ result: "timeout" }>((resolve) => {
      timer = setTimeout(() => resolve({ result: "timeout" }), NOTIFY_BUDGET_MS);
    });
    try {
      const work = sendKakaoForOrder({ sql: getSql(), config }, orderId).catch((e): { result: "error" } => {
        log("error", orderId, "notify", `unexpected (${errText(e)})`);
        return { result: "error" };
      });
      return await Promise.race([work, timeout]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  } catch (e) {
    log("error", orderId, "notify", `unexpected (${errText(e)})`);
    return { result: "error" };
  }
}
