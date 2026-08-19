"use client";

import { IntakeFormData } from "@/lib/sajuEngine";

/**
 * AnalyzingScreenV2("OOO님의 사주를 분석하고 있습니다")와 ResultLandingV2
 * ("타고난 여덟 글자") 사이에 들어가는 "입력한 기본 정보 확인" 화면.
 *
 * 표시 값은 전부 IntakeFormData(사용자가 입력 화면에서 실제로 제출한 값)
 * 그대로다 — 하드코딩 없음, 새 계산 없음(형식만 한국어로 옮긴다).
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
}: {
  data: IntakeFormData;
  onConfirm: () => void;
}) {
  const displayName = data.name.trim() || "당신";
  const calendarLabel = data.calendarType === "solar" ? "양력" : "음력";
  const leapLabel = data.calendarType === "lunar" && data.isLeapMonth ? " (윤달)" : "";
  const genderLabel = data.gender === "female" ? "여성" : "남성";

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

      <button
        type="button"
        onClick={onConfirm}
        className="mt-2 rounded-pill bg-gradient-to-r from-accentGoldFrom to-accentGoldTo px-8 py-4 text-base font-bold text-dark shadow-[0_0_26px_rgba(231,192,126,0.4)] transition-transform hover:scale-[1.04] active:scale-[0.97]"
      >
        이대로 사주 풀이 보기 →
      </button>
    </section>
  );
}
