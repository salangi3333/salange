/**
 * 계좌이체 입금 안내와 입금자명 대조(순수 함수, DB·네트워크·메일 없음).
 *
 * 입금 계좌는 코드에 적지 않는다. 서버 환경변수 세 개가 모두 올바르게 설정된 때만 고객에게 보여 주고,
 * 하나라도 비었거나 형식이 이상하거나 예시 값처럼 보이면 '접수 후 별도 안내'로 대신한다(임의의 계좌를 만들어 내지 않는다).
 *   NEWYEAR_BANK_NAME(은행명) · NEWYEAR_BANK_ACCOUNT(계좌번호) · NEWYEAR_BANK_HOLDER(예금주)
 * 이 값은 고객 신청 응답과 신청 완료 화면에만 쓰이며 로그·이벤트·목록에는 남기지 않는다.
 *
 * 입금자명은 고객이 신청할 때 따로 적을 수 있다(없으면 신청자 이름). 저장은 주문의 메모 칸에 '입금자명: ○○' 한 줄로 한다(새 저장 칸 없음).
 * 관리자가 입금 확인 때 은행 내역의 이름을 입력하면 신청자 이름·입금자명·대상자 이름과 대조해 일치 종류만 돌려준다(이름 원문은 응답에 담지 않는다).
 */
export interface PaymentGuide { configured: boolean; bankName: string | null; accountNumber: string | null; accountHolder: string | null }
export const UNCONFIGURED_GUIDE: Readonly<PaymentGuide> = Object.freeze({ configured: false, bankName: null, accountNumber: null, accountHolder: null });

const BANK_RE = /^[가-힣A-Za-z0-9 ()]{2,20}$/;
const ACCOUNT_RE = /^[0-9][0-9-]{6,22}[0-9]$/;
const HOLDER_RE = /^[가-힣A-Za-z0-9 ().·]{2,30}$/;
const PLACEHOLDER_RE = /예시|샘플|임시|테스트|test|sample|example|xxx|todo|입력/i;

/** 주어진 환경 값(env)에서 입금 안내를 만든다. 값이 모두 올바를 때만 configured. 환경변수 읽기는 공개 라우트 옆 guideEnv.ts 한 곳에서만 한다. */
export function getPaymentGuide(env: Readonly<Record<string, string | undefined>>): PaymentGuide {
  const bank = (env.NEWYEAR_BANK_NAME ?? "").trim(), acc = (env.NEWYEAR_BANK_ACCOUNT ?? "").trim(), holder = (env.NEWYEAR_BANK_HOLDER ?? "").trim();
  const digits = acc.replace(/-/g, "");
  const ok = BANK_RE.test(bank) && ACCOUNT_RE.test(acc) && digits.length >= 8 && digits.length <= 20 && !/^(\d)\1+$/.test(digits) && HOLDER_RE.test(holder)
    && ![bank, acc, holder].some((v) => PLACEHOLDER_RE.test(v));
  return ok ? { configured: true, bankName: bank, accountNumber: acc, accountHolder: holder } : { ...UNCONFIGURED_GUIDE };
}

/* ───────── 입금자명 ───────── */
export const PAYER_MEMO_PREFIX = "입금자명: ";
const CONTROL_RE = /[\u0000-\u001f\u007f]/; // eslint-disable-line no-control-regex
const clen = (s: string) => Array.from(s).length;

/** 고객이 적은 입금자명 검사. 비어 있으면 값 없음(신청자 이름으로 입금). */
export function parsePayerName(raw: unknown): { ok: true; value: string | null } | { ok: false } {
  if (raw === undefined || raw === null) return { ok: true, value: null };
  if (typeof raw !== "string") return { ok: false };
  const v = raw.trim();
  if (!v) return { ok: true, value: null };
  if (clen(v) > 20 || CONTROL_RE.test(v) || v.includes("@")) return { ok: false };
  return { ok: true, value: v };
}
export const payerMemo = (name: string): string => PAYER_MEMO_PREFIX + name;
/** 주문 메모에서 고객이 적은 입금자명을 꺼낸다(없으면 null). */
export function payerFromMemo(memo: string): string | null {
  const line = memo.split(/\r?\n/).find((l) => l.startsWith(PAYER_MEMO_PREFIX));
  const v = line ? line.slice(PAYER_MEMO_PREFIX.length).trim() : "";
  return v || null;
}

/** 관리자 화면에 보여 줄 메모: 고객이 적은 입금자명 줄(이름 원문)은 뺀다. */
export const memoWithoutPayer = (memo: string): string => memo.split(/\r?\n/).filter((l) => !l.startsWith(PAYER_MEMO_PREFIX)).join("\n");

/** 이름 비교용 정리: 공백·기호 제거, 영문 소문자. 은행이 이름을 줄여 보여 주는 경우를 위해 2자 이상 앞부분 일치도 같은 이름으로 본다. */
export const normName = (s: string): string => s.normalize("NFC").replace(/[\s.·()\-_]/g, "").toLowerCase();
export type PayerMatch = "applicant" | "declared" | "subject" | "none";
export function comparePayer(typed: string, o: { buyerName: string; declaredPayer: string | null; subjectNames: readonly string[] }): PayerMatch {
  const t = normName(typed); if (!t) return "none";
  const same = (x: string) => { const n = normName(x); return !!n && (n === t || (Math.min(n.length, t.length) >= 2 && (n.startsWith(t) || t.startsWith(n)))); };
  if (same(o.buyerName)) return "applicant";
  if (o.declaredPayer && same(o.declaredPayer)) return "declared";
  if (o.subjectNames.some(same)) return "subject";
  return "none";
}
