"use client";

import { useState } from "react";
import Link from "next/link";
import { IntakeFormData } from "@/lib/sajuEngine";

/**
 * AnalyzingScreenV2("OOO님의 사주를 분석하고 있습니다")와 ResultLandingV2
 * ("타고난 여덟 글자") 사이에 들어가는 "입력한 기본 정보 확인" 화면.
 *
 * 표시 값은 전부 IntakeFormData(사용자가 입력 화면에서 실제로 제출한 값)
 * 그대로다 — 하드코딩 없음, 새 계산 없음(형식만 한국어로 옮긴다).
 *
 * 개인정보 수집·이용 동의(승인된 작업, 2026-09 개인정보·보안 통합) — 이
 * 화면의 "이대로 사주 풀이 보기" 버튼을 누르면 곧바로 POST /api/reports가
 * 호출되어 이름·생년월일시가 DB에 저장된다(ResultV2Flow.tsx 참고). 그
 * 저장이 실행되기 직전 단계가 바로 이 화면이므로, 동의 체크박스를 여기에
 * 둔다. 기존 "윤달입니다"/"시간 모름" 체크박스(IntakeForm.tsx)와는 목적이
 * 다른 별개의 체크박스다.
 *
 * 방어를 UI(버튼 disabled)와 제출 핸들러(handleConfirm 내부 guard) 양쪽에
 * 둔다 — disabled 속성은 일반적인 클릭을 막지만, 그것만으로는 "방어"라고
 * 부르기엔 약해서(예: 향후 리팩터링 중 실수로 disabled 조건이 빠질 수 있음)
 * 핸들러 내부에도 동일한 조건을 한 번 더 확인한다.
 */

function formatBirthTime(data: IntakeFormData): string {
  if (data.timeUnknown || data.hour === null) return "출생시간 미상";
  const isAM = data.hour < 12;
  const hour12 = data.hour % 12 === 0 ? 12 : data.hour % 12;
  return `${isAM ? "오전" : "오후"} ${hour12}시 ${data.minute}분`;
}

export default function ConfirmInfoScreen({
  data,
  onConfirm,
  submitting = false,
  errorMessage = "",
}: {
  data: IntakeFormData;
  onConfirm: () => void;
  /** DB + reportId 발급 API 호출 중일 때 true — 중복 클릭으로 report가
   * 여러 개 생기는 것을 막기 위해 버튼을 비활성화하고 문구만 바꾼다.
   * 기존 화면 레이아웃/디자인은 그대로 둔다. */
  submitting?: boolean;
  /** report 생성 API가 실패했을 때 버튼 아래에 보여줄 안내 문구.
   * 화면을 error 단계로 통째로 바꾸지 않고 이 화면에서 바로 재시도할 수
   * 있게 한다. */
  errorMessage?: string;
}) {
  const displayName = data.name.trim() || "당신";
  const calendarLabel = data.calendarType === "solar" ? "양력" : "음력";
  const leapLabel = data.calendarType === "lunar" && data.isLeapMonth ? " (윤달)" : "";
  const genderLabel = data.gender === "female" ? "여성" : "남성";

  const [agreed, setAgreed] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  const handleConfirm = () => {
    // 제출 핸들러 레벨의 2차 방어 — 버튼이 disabled라 정상 클릭으로는 여기
    // 도달하지 않지만, 동의 없이 이 함수가 호출되는 경로가 생기더라도 DB
    // 저장 요청(onConfirm → POST /api/reports)이 나가지 않도록 막는다.
    if (!agreed) return;
    onConfirm();
  };

  return (
    <section className="flex min-h-screen flex-col items-center justify-center gap-8 bg-sceneBg px-6 text-center">
      <p className="text-sm tracking-[0.3em] text-sceneGold/80">— 命理四柱 —</p>

      <div className="flex w-full max-w-content flex-col items-center gap-3">
        <h1 className="font-serif-kr text-2xl font-bold text-sceneText">{displayName}님의 사주</h1>

        <div className="mt-2 w-full rounded-card border border-sceneGold/30 bg-sceneCard px-6 py-6">
          <p className="font-serif-kr text-lg font-bold text-sceneCardText">
            {data.year}년 {data.month}월 {data.day}일{leapLabel}
          </p>
          <p className="mt-2 text-[14px] text-sceneCardMuted">
            {calendarLabel} · {formatBirthTime(data)} · {genderLabel}
          </p>
        </div>
      </div>

      {/* 개인정보 수집·이용 동의 — 기존 "윤달입니다"/"시간 모름" 체크박스와
          별개. 375px 모바일에서도 체크박스와 글자가 겹치지 않도록 items-start
          + shrink-0으로 정렬한다. */}
      <div className="w-full max-w-content rounded-card border border-sceneGold/30 bg-sceneCard px-5 py-4 text-left">
        <label className="flex items-start gap-2.5">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-sceneGold"
          />
          <span className="text-[13.5px] leading-relaxed text-sceneCardText">
            <strong>[필수]</strong> 사주 계산 및 리포트 제공을 위한 개인정보
            수집·이용에 동의합니다.{" "}
            <button
              type="button"
              onClick={() => setShowDetail((v) => !v)}
              className="text-sceneCardMuted underline underline-offset-2"
            >
              {showDetail ? "접기" : "자세히"}
            </button>
          </span>
        </label>

        {showDetail && (
          <div className="mt-3 space-y-1 border-t border-sceneGold/20 pt-3 text-[12.5px] leading-relaxed text-sceneCardMuted">
            <p>수집항목: 이름, 성별, 달력구분, 윤달 여부, 생년월일, 출생시간</p>
            <p>이용목적: 사주 계산, 개인화된 리포트 생성·제공, 리포트 재열람</p>
            <p>보유기간: 개인정보처리방침에 따름</p>
            <Link href="/privacy" className="inline-block underline underline-offset-2">
              개인정보처리방침 전문 보기
            </Link>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleConfirm}
        disabled={submitting || !agreed}
        className="mt-2 rounded-pill bg-gradient-to-r from-accentGoldFrom to-accentGoldTo px-8 py-4 text-base font-bold text-dark shadow-[0_0_26px_rgba(231,192,126,0.4)] transition-transform hover:scale-[1.04] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
      >
        {submitting ? "리포트 준비 중..." : "이대로 사주 풀이 보기 →"}
      </button>

      {errorMessage && (
        <p className="text-sm text-sceneRed">{errorMessage}</p>
      )}
    </section>
  );
}
