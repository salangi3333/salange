// 2027 신년운세 '토스 심사용 구매 경로'(로컬 구현) 공통 값 — 순수 데이터와 열림 조건만 둔다(DB·네트워크·서버 메모리·비밀키 없음).
// 경로: 상품 상세(/newyear/review) → 신청 단계(/newyear/review/apply) → 주문금액 확인(/newyear/review/checkout) → 토스 테스트 카드 결제창 → /done 또는 /fail.
// 기존 로컬 테스트 결제(newyearTestPay.ts, 서버 메모리 주문·승인 호출)와는 별도이며 그 파일의 운영 환경 차단은 그대로다.
// 이 경로는 서버에 아무것도 보내지 않는다: 신청 단계는 가상 인물 예시(읽기 전용)이고, 주문은 만들지 않으며, 결제 승인(confirm) API 도 부르지 않는다.
import { CATALOG } from "./catalog";

export const REVIEW_PAY_SWITCH_ENV = "NEWYEAR_REVIEW_PAY";
export const REVIEW_ORDER_NAME = "팔자문 2027 신년운세";
/** 토스 클라이언트 키 형식(테스트 키만 허용). 시크릿 키는 이 경로가 아예 읽지 않는다. */
const CLIENT_KEY_RE = /^test_g?ck_[A-Za-z0-9_-]{8,}$/;
export const isReviewClientKey = (k: unknown): k is string => typeof k === "string" && CLIENT_KEY_RE.test(k);

type Env = Record<string, string | undefined>;
export type ReviewPayConfig =
  | { enabled: true; clientKey: string; amount: number; orderName: string }
  | { enabled: false; reason: "switch_off" | "client_key_not_test" | "price_not_set" };

/** 심사용 전용 테스트 클라이언트 키 환경변수. 기존 종합운세의 NEXT_PUBLIC_TOSS_CLIENT_KEY·TOSS_SECRET_KEY 와 이름도 값도 공유하지 않으며, 이 경로는 그 둘을 읽지 않는다. */
export const REVIEW_CLIENT_KEY_ENV = "NEWYEAR_REVIEW_TOSS_CLIENT_KEY";

/**
 * 열림 조건: 심사용 스위치(NEWYEAR_REVIEW_PAY=on)가 켜져 있고 심사용 전용 키(NEWYEAR_REVIEW_TOSS_CLIENT_KEY)가 테스트 키(test_)일 때만. 둘 중 하나라도 아니면 닫힌다(기본값은 닫힘).
 * 라이브 키(live_)나 키가 없으면 닫힌다. 금액은 서버 카탈로그 값이며 주소·본문의 값은 읽지 않는다. 접속 코드 확인(newyearReviewAccess)은 따로 이 위에서 한다.
 */
export function loadReviewPayConfig(env: Env): ReviewPayConfig {
  if (env[REVIEW_PAY_SWITCH_ENV] !== "on") return { enabled: false, reason: "switch_off" };
  const clientKey = env[REVIEW_CLIENT_KEY_ENV];
  if (!isReviewClientKey(clientKey)) return { enabled: false, reason: "client_key_not_test" };
  const amount = CATALOG.NEWYEAR_2027.priceKrw;
  if (typeof amount !== "number" || !Number.isInteger(amount) || amount <= 0) return { enabled: false, reason: "price_not_set" };
  return { enabled: true, clientKey, amount, orderName: REVIEW_ORDER_NAME };
}

export const REVIEW_PATHS = {
  product: "/newyear/review", apply: "/newyear/review/apply", checkout: "/newyear/review/checkout", done: "/newyear/review/done", fail: "/newyear/review/fail",
} as const;

/** 신청 단계에 보여 주는 가상 인물 예시(읽기 전용). 실제 사람의 정보가 아니며 입력칸으로 받지 않는다. */
export const REVIEW_PERSONA = Object.freeze({
  name: "한도윤", email: "sample.review@example.test", gender: "남성", calendar: "양력", birth: "1988년 3월 9일", time: "오후 2시 20분",
  relation: "solo", job: "business", concern: "예시) 가게를 넓혀도 될지, 내년 돈의 흐름이 궁금해요.",
});

/** 심사 테스트 전용 필수 안내(2개). 실제 판매용 개인정보 동의 문구·문서와 별개이며, 이 경로의 실제 처리 목적(결제창 확인)만 적는다. */
export const REVIEW_CONSENTS = Object.freeze([
  { id: "product", text: `상품(${REVIEW_ORDER_NAME}), 결제금액, 제공 기한과 취소·환불 안내를 확인했습니다.` },
  { id: "review_test", text: "이 화면은 토스페이먼츠 결제창 확인을 위한 심사 테스트입니다. 입력값은 가상 인물 예시이고, 실제 개인정보를 받거나 저장하지 않으며, 주문 접수·PDF 제작·이메일 발송·AI 서비스 전송이 일어나지 않는다는 점을 확인했습니다." },
] as const);

/** 심사 테스트 주문번호(토스 규칙: 영문·숫자·-·_, 6~64자). 서버에 저장하지 않는 일회용 값이며 결제창을 열 때 브라우저에서 만든다. */
export const newReviewOrderId = (randomHex: string): string => `NYREV-${randomHex.replace(/[^0-9a-f]/gi, "").slice(0, 24)}`;
export const REVIEW_ORDER_ID_RE = /^NYREV-[0-9a-fA-F]{12,24}$/;

/** 결제창 이후 화면의 안내. 주문 접수·결제 완료로 읽히지 않게 '승인 요청을 하지 않았다'를 분명히 적는다. */
export const REVIEW_RESULT_COPY = Object.freeze({
  done: { title: "결제창 확인이 끝났습니다(심사용 테스트)", body: "이 화면은 토스페이먼츠 심사를 위한 테스트 화면입니다. 결제 승인을 요청하지 않았으므로 결제는 완료되지 않았고, 주문은 접수되지 않았으며, 금액이 청구되지 않습니다. PDF 제작과 이메일 발송도 일어나지 않습니다." },
  fail: { title: "결제창이 닫혔거나 진행되지 않았습니다(심사용 테스트)", body: "결제는 진행되지 않았고 주문도 접수되지 않았습니다. 금액이 청구되지 않았습니다. 심사 테스트를 계속하려면 주문금액 확인 화면에서 다시 시작해 주세요." },
});
