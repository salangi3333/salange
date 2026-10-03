/**
 * 한국 휴대전화번호(010) 정규화·검증·표시 — 브라우저(입력칸)와 서버(/api/orders)가
 * 같은 함수를 쓴다. 저장 형식은 숫자만(예: 01012345678)이다.
 */

export type PhoneCheck = { ok: true; phone: string } | { ok: false; message: string };

const MSG_EMPTY = "휴대번호를 입력해 주세요";
const MSG_NOT_010 = "010으로 시작하는 번호만 가능해요";
const MSG_INVALID = "휴대번호를 정확히 입력해 주세요";

/** 입력값 → 숫자만 남긴 국내 형식. +82/82 국가번호는 0으로 바꾼다. 허용 문자 외가 섞이면 null. */
function toLocalDigits(input: string): string | null {
  const s = input.trim();
  if (!/^\+?[0-9\s\-().]+$/.test(s)) return null;
  const hasPlus = s.startsWith("+");
  let digits = s.replace(/[^0-9]/g, "");
  if (hasPlus || digits.startsWith("82")) {
    if (!digits.startsWith("82")) return null;
    digits = "0" + digits.slice(2).replace(/^0/, "");
  }
  return digits;
}

export function validateKoreanMobile(input: unknown): PhoneCheck {
  if (typeof input !== "string" || input.trim() === "") return { ok: false, message: MSG_EMPTY };
  if (input.length > 30) return { ok: false, message: MSG_INVALID };
  const digits = toLocalDigits(input);
  if (digits === null || digits.length < 3) return { ok: false, message: MSG_INVALID };
  if (!digits.startsWith("010")) return { ok: false, message: MSG_NOT_010 };
  if (!/^010[0-9]{7,8}$/.test(digits)) return { ok: false, message: MSG_INVALID };
  if (/^(\d)\1+$/.test(digits.slice(3))) return { ok: false, message: MSG_INVALID };
  return { ok: true, phone: digits };
}

/** 저장·발송용 정규화(숫자만). 유효하지 않으면 null. */
export function normalizeKoreanMobile(input: unknown): string | null {
  const r = validateKoreanMobile(input);
  return r.ok ? r.phone : null;
}

/** 입력칸 표시용 — 타이핑 중에도 010-1234-5678 모양으로 보여준다(최대 11자리). */
export function formatKoreanMobileInput(raw: string): string {
  let digits = raw.trim().startsWith("+82")
    ? "0" + raw.replace(/[^0-9]/g, "").slice(2).replace(/^0/, "")
    : raw.replace(/[^0-9]/g, "");
  digits = digits.slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}
