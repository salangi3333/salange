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
