/**
 * 팔자문 신규 상품 카탈로그 — 순수 설정·판정 모듈(DB·네트워크·결제·계산 엔진 무관).
 *
 * 원칙
 * - 판매 가능 여부는 이 파일의 판정 함수 하나로만 정한다. 화면·관리자·주문 모듈은 같은 함수를 쓴다.
 * - 가격·약관 버전·제공 조건·제작기 버전·PDF 템플릿 버전은 확정되기 전에는 null(미설정)이다. 임의로 채우지 않는다.
 *   필수 설정이 하나라도 비어 있으면 판매 상태가 ON_SALE이어도 주문을 만들 수 없다(fail-closed).
 * - 구형 인생사주(기존 reports/orders/report_deliveries)는 이 카탈로그의 판매 대상이 아니다. LEGACY_PRODUCTS에 '보호 대상 기록'으로만 적는다.
 */

/** 신규 상품 코드. 새 상품은 여기에 코드를 추가하고 CATALOG에 한 항목만 더하면 된다(주문·입력·발송 모듈은 그대로). */
export const PRODUCT_CODES = ["LIFE_V2", "NEWYEAR_2027", "GUNGHAP", "CHILD", "WEALTH", "CAREER"] as const;
export type ProductCode = (typeof PRODUCT_CODES)[number];

/**
 * 판매 상태
 * - PREPARING: 준비 중(개발·검증 전). 판매 불가.
 * - APPROVAL_PENDING: 개발은 끝났고 검증·승인을 기다리는 중. 판매 불가.
 * - ON_SALE: 판매 중. 필수 설정이 모두 있을 때만 주문 가능.
 * - SUSPENDED: 일시 중단. 판매 불가.
 */
export const SALE_STATUSES = ["PREPARING", "APPROVAL_PENDING", "ON_SALE", "SUSPENDED"] as const;
export type SaleStatus = (typeof SALE_STATUSES)[number];

export const PRODUCTION_METHODS = ["LOCAL_TOOL", "SERVER_AI"] as const;
export type ProductionMethod = (typeof PRODUCTION_METHODS)[number];

/** 풀이 대상자 구성 규칙. 주문 하나에 여러 사람이 필요한 상품(궁합 등)을 위해 역할 목록과 인원 범위를 둔다. */
export interface SubjectRule {
  /** 허용하는 역할. 배열 순서가 기본 순서(order 1, 2, …)이다. */
  roles: readonly string[];
  min: number;
  max: number;
  /** 같은 역할을 여러 번 쓸 수 있는지(예: 자녀 여러 명). */
  allowRepeatRoles: boolean;
}

export interface ProductDefinition {
  code: ProductCode;
  name: string;
  status: SaleStatus;
  /** 판매 연도(예: 2027 신년운세). 연도 상품이 아니면 null. 연도 상품인데 null이면 판매 불가. */
  saleYear: number | null;
  yearly: boolean;
  /** 판매안 이름(예: 단품·패키지). 정해지기 전에는 null. */
  offerName: string | null;
  /** 가격(원, 정수). 미확정이면 null → 주문 불가. */
  priceKrw: number | null;
  currency: "KRW";
  /** 약관 버전(고객이 동의한 약관 문서 식별자). 미확정이면 null → 주문 불가. */
  termsVersion: string | null;
  /** 제공 조건(납기·형태·환불 기준 등 주문 당시 고지한 문구의 식별자). 미확정이면 null → 주문 불가. */
  deliveryTerms: string | null;
  /** 입력 양식 버전. 입력 규칙 계약(intake.ts)과 대응한다. */
  intakeFormVersion: string | null;
  production: { method: ProductionMethod; generatorVersion: string | null; /** 참고용 위치 표기(판정에 쓰지 않음) */ sourceRef: string | null };
  pdfTemplateVersion: string | null;
  subjects: SubjectRule;
}

const SOLO: SubjectRule = { roles: ["self"], min: 1, max: 1, allowRepeatRoles: false };

const base = (code: ProductCode, name: string, extra: Partial<ProductDefinition> = {}): ProductDefinition => ({
  code, name, status: "PREPARING", saleYear: null, yearly: false, offerName: null, priceKrw: null, currency: "KRW",
  termsVersion: null, deliveryTerms: null, intakeFormVersion: null,
  production: { method: "LOCAL_TOOL", generatorVersion: null, sourceRef: null }, pdfTemplateVersion: null, subjects: SOLO, ...extra,
});

/**
 * 신규 상품 목록(2026-11 기준). 2027 신년운세만 판매 조건이 확정됐고(아래 항목), 나머지 상품은 가격·약관·제공 조건이 미설정이다.
 * 2027 신년운세는 첫 번째 통합 대상이지만 실제 판매는 검증·승인 후에 ON_SALE과 필수 설정을 함께 넣어야 열린다.
 */
export const CATALOG: Readonly<Record<ProductCode, Readonly<ProductDefinition>>> = Object.freeze({
  LIFE_V2: base("LIFE_V2", "인생 종합운세 V2"),
  // 판매 조건 확정(2026-11-02, 사용자 결정; 가격은 2026-11-06 34,800원으로 변경): 34,800원·결제 및 필수 정보 입력 완료 후 최대 48시간 이내 이메일 PDF(2026-11-06 24시간→48시간 변경)·개인 맞춤 5장(쪽수는 고객별로 달라지며 보장하지 않음; 시험본 43~49쪽). 계좌이체 → 관리자 입금 확인 → 로컬 제작 → 관리자 승인 → 관리자 수동 발송. PDF 발송 전에는 제작 시작 여부와 관계없이 전액 환불.
  // 판매 상태는 일부러 APPROVAL_PENDING 으로 둔다: 약관·환불 고지(newyear-2027-terms/2026-11-r3 초안)의 법률 확인과 최종 출시 승인 뒤에 ON_SALE 로 바꾼다(그 전에는 주문을 만들 수 없다).
  NEWYEAR_2027: base("NEWYEAR_2027", "2027 신년운세", {
    status: "APPROVAL_PENDING", yearly: true, saleYear: 2027,
    offerName: "개인 맞춤 신년운세 5장(PDF)", priceKrw: 34800,
    termsVersion: "newyear-2027-terms/2026-11-r3",
    deliveryTerms: "결제 및 필수 정보 입력 완료 후 최대 48시간 이내 이메일로 PDF 전달(newyear-2027-delivery/2026-11-r2)",
    intakeFormVersion: "newyear-intake/1",
    production: { method: "LOCAL_TOOL", generatorVersion: "newyear-gen/v5", sourceRef: "v2/gen/live/chapter_gen_v5_newyear.ts" },
    pdfTemplateVersion: "newyear-pdf/v3",
  }),
  GUNGHAP: base("GUNGHAP", "궁합", { subjects: { roles: ["self", "partner"], min: 2, max: 2, allowRepeatRoles: false } }),
  CHILD: base("CHILD", "자녀운", { subjects: { roles: ["self", "child"], min: 1, max: 4, allowRepeatRoles: true } }),
  WEALTH: base("WEALTH", "재물운"),
  CAREER: base("CAREER", "직업운"),
});

/** 구형 인생사주. 신규 판매 대상이 아니며, 기존 주문·고객 기록만 보호한다(이 모듈은 그 테이블을 읽지도 쓰지도 않는다). */
export const LEGACY_PRODUCTS = Object.freeze([
  Object.freeze({
    code: "LEGACY_LIFE_SAJU", name: "팔자문 전체 리포트(구형 인생사주)", sellable: false as const,
    protectedTables: Object.freeze(["reports", "orders", "report_deliveries"]),
  }),
]);

export const isProductCode = (v: unknown): v is ProductCode => typeof v === "string" && (PRODUCT_CODES as readonly string[]).includes(v);
export const isLegacyProductCode = (v: unknown): boolean => LEGACY_PRODUCTS.some((p) => p.code === v);

export function getProduct(code: unknown, catalog: Readonly<Record<string, Readonly<ProductDefinition>>> = CATALOG): Readonly<ProductDefinition> | null {
  return typeof code === "string" && Object.prototype.hasOwnProperty.call(catalog, code) ? catalog[code] : null;
}

export type Readiness = { sellable: true } | { sellable: false; blockers: string[] };

/** 판매 가능 판정. 막는 이유를 모두 모아서 돌려준다(관리자에게 '무엇이 비었는지' 보여 주기 위함). */
export function getSaleReadiness(p: Readonly<ProductDefinition>): Readiness {
  const b: string[] = [];
  if (p.status !== "ON_SALE") b.push(`판매 상태가 '${p.status}'입니다(판매 중이 아님).`);
  if (!Number.isSafeInteger(p.priceKrw) || (p.priceKrw as number) <= 0) b.push("가격이 설정되지 않았습니다.");
  if (p.currency !== "KRW") b.push("통화가 올바르지 않습니다.");
  if (!p.termsVersion || !p.termsVersion.trim()) b.push("약관 버전이 설정되지 않았습니다.");
  if (!p.deliveryTerms || !p.deliveryTerms.trim()) b.push("제공 조건이 설정되지 않았습니다.");
  if (!p.intakeFormVersion || !p.intakeFormVersion.trim()) b.push("입력 양식 버전이 설정되지 않았습니다.");
  if (!p.production.generatorVersion || !p.production.generatorVersion.trim()) b.push("제작기 버전이 설정되지 않았습니다.");
  if (!p.pdfTemplateVersion || !p.pdfTemplateVersion.trim()) b.push("PDF 템플릿 버전이 설정되지 않았습니다.");
  if (p.yearly && !Number.isInteger(p.saleYear)) b.push("판매 연도가 설정되지 않았습니다.");
  if (!(p.subjects.min >= 1 && p.subjects.max >= p.subjects.min && p.subjects.roles.length >= 1)) b.push("풀이 대상자 구성 규칙이 올바르지 않습니다.");
  return b.length ? { sellable: false, blockers: b } : { sellable: true };
}

/** 주문 당시 판매 조건의 고정본. 주문에 그대로 복사해 두므로, 나중에 카탈로그가 바뀌어도 이미 받은 주문의 조건은 변하지 않는다. */
export interface OfferSnapshot {
  productCode: ProductCode;
  productName: string;
  saleYear: number | null;
  offerName: string | null;
  priceKrw: number;
  currency: "KRW";
  termsVersion: string;
  deliveryTerms: string;
  intakeFormVersion: string;
  generatorVersion: string;
  productionMethod: ProductionMethod;
  pdfTemplateVersion: string;
  subjectRule: SubjectRule;
}

export type SnapshotResult = { ok: true; snapshot: Readonly<OfferSnapshot> } | { ok: false; code: "unknown_product" | "legacy_product" | "not_sellable"; blockers: string[] };

export function snapshotOffer(code: unknown, catalog: Readonly<Record<string, Readonly<ProductDefinition>>> = CATALOG): SnapshotResult {
  if (isLegacyProductCode(code)) return { ok: false, code: "legacy_product", blockers: ["구형 인생사주는 신규 판매 대상이 아닙니다."] };
  const p = getProduct(code, catalog);
  if (!p) return { ok: false, code: "unknown_product", blockers: ["알 수 없는 상품입니다."] };
  const r = getSaleReadiness(p);
  if (!r.sellable) return { ok: false, code: "not_sellable", blockers: r.blockers };
  const snap: OfferSnapshot = {
    productCode: p.code, productName: p.name, saleYear: p.saleYear, offerName: p.offerName, priceKrw: p.priceKrw as number, currency: "KRW",
    termsVersion: (p.termsVersion as string).trim(), deliveryTerms: (p.deliveryTerms as string).trim(), intakeFormVersion: (p.intakeFormVersion as string).trim(),
    generatorVersion: (p.production.generatorVersion as string).trim(), productionMethod: p.production.method,
    pdfTemplateVersion: (p.pdfTemplateVersion as string).trim(),
    subjectRule: { roles: [...p.subjects.roles], min: p.subjects.min, max: p.subjects.max, allowRepeatRoles: p.subjects.allowRepeatRoles },
  };
  return { ok: true, snapshot: Object.freeze(snap) };
}

/** 관리자 화면용 요약: 상품별 상태와 막힌 이유. */
export function describeCatalog(catalog: Readonly<Record<string, Readonly<ProductDefinition>>> = CATALOG) {
  return Object.values(catalog).map((p) => ({ code: p.code, name: p.name, status: p.status, readiness: getSaleReadiness(p) }));
}
