import { Lock } from "lucide-react";
import { PhaseSummary } from "@/lib/lifeFlowNarrative";

/**
 * 「내 인생의 큰 흐름」 전용 정적 타임라인. ResultLandingV2.tsx와 같은
 * 제약을 그대로 따른다 — framer-motion/IntersectionObserver/sticky·fixed
 * 없음, JS 애니메이션 없음. 순수 flex 레이아웃 + 인라인 style만 쓴다.
 *
 * 각 국면을 flexGrow(=국면 길이)로 나눠 가로 막대 하나에 이어 붙인다.
 * 폭이 % 기반으로 항상 부모 컨테이너 안에서만 늘어나므로(고정 px 폭이
 * 없음) 국면이 몇 개든, 나이 폭이 얼마든 가로 스크롤이 생기지 않는다.
 * 좁은 국면(10년)에서 글자가 넘치면 `truncate`로 그 칸 안에서만 잘리고,
 * 페이지 자체는 절대 옆으로 넓어지지 않는다.
 *
 * 현재 국면은 배경색을 살짝 다르게 칠하는 것만으로 강조한다("은은하게").
 */
export default function LifePhaseTimeline({ phases }: { phases: PhaseSummary[] }) {
  if (phases.length === 0) return null;

  return (
    <div className="mt-6">
      <div className="flex w-full min-w-0 overflow-hidden rounded-card border border-sceneGold/30">
        {phases.map((ph, i) => {
          const duration = Math.max(1, ph.endAge - ph.startAge + 1);
          return (
            <div
              key={i}
              style={{ flexGrow: duration, flexBasis: 0 }}
              className={`min-w-0 border-r border-sceneGold/15 px-1 py-3 text-center last:border-r-0 ${
                ph.isCurrent ? "bg-sceneGold/15" : "bg-sceneBgAlt"
              }`}
            >
              {ph.locked ? (
                <p className="flex items-center justify-center gap-1 truncate text-[10px] font-bold text-sceneTextSub/80 sm:text-[11px]">
                  <Lock size={11} className="shrink-0" />
                  다음 흐름
                </p>
              ) : (
                <p
                  className={`truncate font-serif-kr text-[11px] font-bold sm:text-[12px] ${
                    ph.isCurrent ? "text-sceneGold" : "text-sceneCardText/70"
                  }`}
                >
                  {ph.categoryLabel}
                  {ph.isNatalAxis ? " ★" : ""}
                </p>
              )}
              <p className="mt-0.5 truncate text-[9px] text-sceneTextSub sm:text-[10px]">
                {ph.startAge}–{ph.endAge}세
              </p>
              {ph.isCurrent && (
                <p className="mt-1 truncate text-[9px] font-bold text-sceneGold sm:text-[10px]">지금</p>
              )}
            </div>
          );
        })}
      </div>
      {/* 대운 나이가 화면에 처음 등장하는 자리라, 여기 한 번만 작게
          안내한다(다른 자리 — 지나온 시간/지금, 다음 변화 티저 등 —
          에는 반복하지 않는다). 계산값·표기 방식(세는나이) 자체는
          바꾸지 않았고, 오해를 막는 안내 문구만 추가했다. */}
      <p className="mt-2 text-center text-[10.5px] text-sceneTextSub/80">
        ※ 대운의 나이는 명리에서 쓰는 세는나이 기준입니다.
      </p>
      {phases.some((p) => p.isNatalAxis) && (
        <p className="mt-1 text-center text-[11px] text-sceneTextSub">
          ★ 표시 — 타고난 중심축과 같은 성질의 국면
        </p>
      )}
    </div>
  );
}
