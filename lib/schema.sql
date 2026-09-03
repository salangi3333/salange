-- DB + reportId + 영구 재접속 구조 — 최소 스키마.
-- 이 파일은 문서/기록용이다. 실제 적용은 scripts/_apply_schema.ts로
-- 한 번 실행했다(Neon 콘솔에서 직접 실행해도 동일).
--
-- reports.id를 그대로 고객 URL(reportId)로 쓴다 — gen_random_uuid()가
-- 만드는 UUID v4는 이미 122비트 무작위값이라 별도 "public_id" 컬럼을
-- 분리할 이유가 없다(분리는 내부 PK가 순차 정수일 때 필요한 패턴).
--
-- 계산/개인화에 실제로 쓰이는 IntakeFormData 필드만 저장한다 — 전화번호/
-- 이메일 등은 이번 단계에서 전혀 받지 않으므로 컬럼도 만들지 않았다.
-- 향후 user → reports → orders 구조로 확장할 때, orders는
-- `report_id uuid references reports(id)`로 이 테이블을 그대로 참조하면
-- 된다(이 테이블 자체를 다시 고칠 필요 없음).

create extension if not exists pgcrypto;

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  gender text not null check (gender in ('male', 'female')),
  calendar_type text not null check (calendar_type in ('solar', 'lunar')),
  is_leap_month boolean not null default false,
  birth_year int not null,
  birth_month int not null,
  birth_day int not null,
  birth_hour int,
  birth_minute int not null default 0,
  time_unknown boolean not null default false,
  created_at timestamptz not null default now()
);

-- TossPayments 테스트 결제 1차 구현(승인된 작업) — reports와 결제정보를
-- 분리한 별도 테이블. 카드번호/계좌번호 등 민감한 결제수단 정보는 여기에도
-- 저장하지 않는다(토스페이먼츠가 자체적으로 보관) — payment_key(토스가 발급하는
-- 식별자)만 저장한다.
--
-- order_id는 우리가 생성해 토스에 전달하는 주문번호로, reports.id와 마찬가지로
-- gen_random_uuid()를 쓴다 — 토스의 orderId 규칙(영문/숫자/-/_로 이루어진
-- 6~64자)에 UUID v4(36자, 하이픈 포함)가 그대로 부합한다.
--
-- report_id에 FK를 걸어 존재하지 않는 report에는 주문을 만들 수 없게 한다.
-- 결제금액(amount)은 서버가 FULL_REPORT_PRICE(lib/orderStore.ts)로 항상
-- 고정해서 넣는다 — 클라이언트가 보낸 금액을 절대 신뢰하지 않는다.
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports(id),
  order_id text not null unique,
  amount int not null,
  status text not null default 'PENDING'
    check (status in ('PENDING', 'PAID', 'FAILED', 'CANCELLED')),
  order_name text not null,
  payment_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists orders_report_id_idx on orders (report_id);
