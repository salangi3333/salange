/**
 * 주문별 동의 기록 — 순수 모듈(DB·네트워크·화면 무관).
 * 고객이 신청 화면에서 체크한 동의 항목을 서버가 검증하고, '서버 시각·동의한 문서 버전·항목 목록·문구 해시'를 주문 접수 이력(ORDER_CREATED)에 함께 남긴다.
 * 이력은 DB 트리거로 수정·삭제가 막혀 있어(append-only) 동의 기록이 사후에 바뀌지 않는다. 이름·이메일 같은 개인정보는 넣지 않는다.
 * 동의한 문서가 '초안(법률 확인 전)'이었는지도 함께 남긴다(termsStatus) — 초안 상태에서 받은 동의는 법적 효력이 확정된 동의로 취급하지 않는다.
 */
import { createHash } from "crypto";

export const CONSENT_METHODS = ["WEB_FORM", "ADMIN_PROXY_KAKAO"] as const;
export type ConsentMethod = (typeof CONSENT_METHODS)[number];

export interface ConsentDocItem { id: string; required: boolean; text: string }
/** 고객에게 링크로 보여 주는 문서(약관·개인정보 안내 등)의 버전과 본문 지문. */
export interface ConsentDocRef { id: string; version: string; sha256: string }
export interface ConsentDoc { version: string; status: string; items: readonly ConsentDocItem[]; documents?: readonly ConsentDocRef[] }
/** documents: 동의 당시 고객에게 보여 준 문서 목록(없으면 옛 기록). documentsEchoed: 고객 화면이 보낸 문서 지문이 서버의 현재 문서와 일치해 확인된 경우 true. */
/**
 * 관리자 대리 기록(ADMIN_PROXY_KAKAO) 전용.
 * - 새 방식(PROXY_ADMIN_CONFIRM_METHOD): 관리자가 카카오톡 대화에서 고객의 동의를 확인했다는 표시만 남긴다. 확인 시각은 at(서버 기록 시각)뿐이고,
 *   고객이 동의한 시각(receivedAt)은 기록하지 않는다 — 관리자 확인 시각을 고객 동의 시각처럼 남기지 않기 위해 receivedAt 이 있으면 올바르지 않은 기록이다.
 * - 옛 방식(대화 화면 저장 등): 고객이 동의했다고 관리자가 입력한 시각(receivedAt)과 확인 방법. 이미 저장된 옛 기록을 계속 읽을 수 있게 남겨 둔다.
 */
export const PROXY_ADMIN_CONFIRM_METHOD = "ADMIN_CONFIRMED_IN_CHAT";
export interface ProxyConsentInfo { receivedAt?: string; confirmMethod: string; channel: "KAKAOTALK" }
export interface ConsentRecord { documentVersion: string; termsStatus: string; itemIds: string[]; itemsSha256: string; method: ConsentMethod; at: string; documents?: ConsentDocRef[]; documentsEchoed?: boolean; proxy?: ProxyConsentInfo }

const sha = (v: unknown) => createHash("sha256").update(JSON.stringify(v), "utf8").digest("hex");
const ID_RE = /^[a-z_]{2,30}$/;
const SHA_RE = /^[0-9a-f]{64}$/;
const DOC_ID_RE = /^[a-z]{2,20}$/;
const DOC_KEY_PREFIX = "consentDoc_";
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

/** 고객에게 보여 준 문서 본문의 지문(약관·안내 등 문서 한 건). 문구가 한 글자라도 바뀌면 달라진다. */
export const contentSha256 = (id: string, version: string, content: unknown): string => sha(["ny-doc", 1, id, version, content]);

/** 고객에게 보여 준 문서(버전·항목 문구, 링크 문서가 있으면 그 버전·지문까지)의 지문. 문구가 한 글자라도 바뀌면 달라진다. 링크 문서가 없는 옛 형태는 예전 값 그대로다. */
export const consentDocSha256 = (doc: ConsentDoc): string => doc.documents && doc.documents.length
  ? sha(["ny-consent-doc", 2, doc.version, doc.items.map((i) => [i.id, i.required, i.text]), doc.documents.map((d) => [d.id, d.version, d.sha256])])
  : sha(["ny-consent-doc", 1, doc.version, doc.items.map((i) => [i.id, i.required, i.text])]);

/**
 * 고객이 보낸 동의 값 검사. 형식: { documentVersion: string, accepted: string[] }.
 *  - 문서 버전이 서버가 가진 버전과 정확히 같아야 한다(오래된 화면·다른 문서에 대한 동의는 받지 않는다).
 *  - 필수 항목은 하나도 빠지면 안 되고, 모르는 항목 ID 는 거부한다. 추측해서 채우지 않는다.
 */
export function validateConsentInput(raw: unknown, doc: ConsentDoc): { ok: true; itemIds: string[]; docsEchoed: boolean } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, errors: ["동의 정보가 없습니다. 필수 동의 항목에 모두 동의해 주세요."] };
  const r = raw as Record<string, unknown>;
  if (r.documentVersion !== doc.version) errors.push("약관 버전이 올바르지 않습니다. 화면을 새로고침한 뒤 다시 동의해 주세요.");
  if (!Array.isArray(r.accepted) || r.accepted.some((x) => typeof x !== "string")) return { ok: false, errors: [...errors, "동의 항목 형식이 올바르지 않습니다."] };
  const accepted = r.accepted as string[];
  const known = new Set(doc.items.map((i) => i.id));
  if (accepted.some((x) => !known.has(x))) errors.push("알 수 없는 동의 항목이 있습니다.");
  const set = new Set(accepted);
  for (const it of doc.items) if (it.required && !set.has(it.id)) errors.push(`필수 동의가 필요합니다: ${it.text.slice(0, 24)}…`);
  // 동의 문서에 링크 문서(약관·개인정보 안내)가 있으면, 고객 화면이 '내가 본 문서'의 id·버전·본문 지문을 모두 보내야 하고 서버의 현재 문서와 정확히 같아야 한다.
  // 누락·빈 값·일부 누락·중복·오래된 버전·지문 불일치는 모두 거절한다(서버의 현재 값을 고객이 확인한 것처럼 대신 채우지 않는다). 링크 문서가 없는 동의 문서(옛 형태)만 이 검사를 하지 않는다.
  let docsEchoed = false;
  if (doc.documents && doc.documents.length) {
    const echo = Array.isArray(r.documents) ? (r.documents as unknown[]) : null;
    const f = (e: unknown): Record<string, unknown> => (e && typeof e === "object" ? (e as Record<string, unknown>) : {});
    const ids = echo ? echo.map((e) => f(e).id) : [];
    const same = !!echo && echo.length === doc.documents.length && new Set(ids).size === ids.length && doc.documents.every((d) => echo.some((e) => f(e).id === d.id && f(e).version === d.version && f(e).sha256 === d.sha256));
    if (same) docsEchoed = true;
    else errors.push(r.documents === undefined ? "약관·개인정보 안내 문서 확인 정보가 없습니다. 화면을 새로고침한 뒤 다시 동의해 주세요." : "화면에 표시된 약관·안내 문서가 최신이 아닙니다. 화면을 새로고침해 내용을 다시 확인해 주세요.");
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, itemIds: doc.items.filter((i) => set.has(i.id)).map((i) => i.id), docsEchoed }; // 문서 순서로 정렬, 중복 제거
}

/** 검증을 통과한 동의로 기록을 만든다. 시각은 서버가 정한다(클라이언트 값은 받지 않는다). */
export function buildConsentRecord(itemIds: string[], doc: ConsentDoc, at: Date, method: ConsentMethod = "WEB_FORM", docsEchoed = false): ConsentRecord {
  const docs = doc.documents && doc.documents.length ? { documents: doc.documents.map((d) => ({ id: d.id, version: d.version, sha256: d.sha256 })), documentsEchoed: docsEchoed } : {};
  return { documentVersion: doc.version, termsStatus: doc.status, itemIds: [...itemIds], itemsSha256: consentDocSha256(doc), method, at: at.toISOString(), ...docs };
}

/** 기록 모양 점검(원장이 한 번 더 확인). 이상하면 문자열 목록을 돌려준다. */
export function consentProblems(c: unknown): string[] {
  const p: string[] = []; const r = c as Partial<ConsentRecord> | null;
  if (!r || typeof r !== "object") return ["동의 기록이 올바르지 않습니다."];
  if (typeof r.documentVersion !== "string" || !r.documentVersion.trim() || r.documentVersion.length > 60) p.push("동의한 문서 버전이 올바르지 않습니다.");
  if (typeof r.termsStatus !== "string" || !/^[A-Z_]{3,40}$/.test(r.termsStatus)) p.push("약관 상태 값이 올바르지 않습니다.");
  if (!Array.isArray(r.itemIds) || r.itemIds.length < 1 || r.itemIds.length > 12 || r.itemIds.some((x) => typeof x !== "string" || !ID_RE.test(x))) p.push("동의 항목 목록이 올바르지 않습니다.");
  if (typeof r.itemsSha256 !== "string" || !SHA_RE.test(r.itemsSha256)) p.push("동의 문구 지문이 올바르지 않습니다.");
  if (!(CONSENT_METHODS as readonly unknown[]).includes(r.method)) p.push("동의 방식이 올바르지 않습니다.");
  if (typeof r.at !== "string" || !ISO_RE.test(r.at)) p.push("동의 시각이 올바르지 않습니다.");
  if (r.documents !== undefined && (!Array.isArray(r.documents) || r.documents.length > 6 || r.documents.some((d) => !d || typeof d.id !== "string" || !DOC_ID_RE.test(d.id) || typeof d.version !== "string" || !d.version.trim() || d.version.length > 60 || d.version.includes("@") || typeof d.sha256 !== "string" || !SHA_RE.test(d.sha256)))) p.push("동의한 문서 목록이 올바르지 않습니다.");
  if (r.documentsEchoed !== undefined && typeof r.documentsEchoed !== "boolean") p.push("문서 확인 표시가 올바르지 않습니다.");
  if (r.method === "ADMIN_PROXY_KAKAO") {
    const x = r.proxy;
    const adminOnly = !!x && x.confirmMethod === PROXY_ADMIN_CONFIRM_METHOD;
    if (!x || typeof x !== "object" || x.channel !== "KAKAOTALK" || typeof x.confirmMethod !== "string" || !/^[A-Z_]{3,40}$/.test(x.confirmMethod)
      || (adminOnly ? x.receivedAt !== undefined : (typeof x.receivedAt !== "string" || !ISO_RE.test(x.receivedAt)))) p.push("대리 동의 확인 정보가 올바르지 않습니다.");
  }
  else if (r.proxy !== undefined) p.push("대리 동의 정보는 관리자 대리 기록 방식에서만 쓸 수 있습니다.");
  return p;
}

/** 변경 이력 detail(문자열·숫자·불리언만, 이메일 형태 불가)로 평탄화. */
export function consentToDetail(c: ConsentRecord): Record<string, string> {
  const base: Record<string, string> = { consentVersion: c.documentVersion, consentStatus: c.termsStatus, consentItems: c.itemIds.join(","), consentSha256: c.itemsSha256, consentMethod: c.method, consentAt: c.at };
  if (c.documents) { for (const d of c.documents) base[DOC_KEY_PREFIX + d.id] = `${d.version}#${d.sha256}`; base.consentDocsEchoed = c.documentsEchoed ? "yes" : "no"; }
  if (c.proxy) { if (c.proxy.receivedAt !== undefined) base.consentProxyAt = c.proxy.receivedAt; base.consentProxyConfirm = c.proxy.confirmMethod; base.consentProxyChannel = c.proxy.channel; }
  return base;
}

/** 접수 이력에서 동의 기록을 되읽는다. 없으면 null(관리자가 대신 입력한 옛 주문 등). */
export function consentFromEvents(events: readonly { type: string; detail: Record<string, unknown> }[]): ConsentRecord | null {
  const e = events.find((x) => x.type === "ORDER_CREATED" && typeof x.detail.consentVersion === "string");
  if (!e) return null;
  const d = e.detail;
  const rec: ConsentRecord = { documentVersion: String(d.consentVersion), termsStatus: String(d.consentStatus ?? ""), itemIds: String(d.consentItems ?? "").split(",").filter(Boolean), itemsSha256: String(d.consentSha256 ?? ""), method: d.consentMethod as ConsentMethod, at: String(d.consentAt ?? "") };
  if (rec.method === "ADMIN_PROXY_KAKAO") rec.proxy = { ...(d.consentProxyAt === undefined ? {} : { receivedAt: String(d.consentProxyAt) }), confirmMethod: String(d.consentProxyConfirm ?? ""), channel: "KAKAOTALK" };
  const docKeys = Object.keys(d).filter((k) => k.startsWith(DOC_KEY_PREFIX)).sort();
  if (docKeys.length) {
    rec.documents = docKeys.map((k) => { const [version = "", sha256 = ""] = String(d[k]).split("#"); return { id: k.slice(DOC_KEY_PREFIX.length), version, sha256 }; });
    rec.documentsEchoed = d.consentDocsEchoed === "yes";
  }
  return consentProblems(rec).length ? null : rec;
}

export interface ConsentView { recorded: boolean; documentVersion?: string; termsStatus?: string; items?: { id: string; text: string }[]; at?: string; method?: string; matchesCurrentDocument?: boolean; draftWarning?: boolean; documents?: { id: string; version: string; sha256: string; matchesCurrent: boolean }[]; documentsEchoed?: boolean; proxy?: ProxyConsentInfo }
/** 관리자 화면용 보기. 현재 문서와 문구 지문이 같은지, 초안 상태에서 받은 동의인지 알려 준다. */
export function describeConsent(c: ConsentRecord | null, doc: ConsentDoc): ConsentView {
  if (!c) return { recorded: false };
  const text = new Map(doc.items.map((i) => [i.id, i.text]));
  return { recorded: true, documentVersion: c.documentVersion, termsStatus: c.termsStatus, items: c.itemIds.map((id) => ({ id, text: text.get(id) ?? "(현재 문서에 없는 항목)" })), at: c.at, method: c.method, matchesCurrentDocument: c.documentVersion === doc.version && c.itemsSha256 === consentDocSha256(doc), draftWarning: c.termsStatus !== "FINAL",
    ...(c.documents ? { documents: c.documents.map((d) => ({ ...d, matchesCurrent: !!doc.documents?.some((x) => x.id === d.id && x.version === d.version && x.sha256 === d.sha256) })), documentsEchoed: c.documentsEchoed === true } : {}),
    ...(c.proxy ? { proxy: { ...c.proxy } } : {}) };
}
