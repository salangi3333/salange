"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 임시 진단 전용 컴포넌트 — URL에 ?scrollDebug=1이 있을 때만 동작한다.
 * 일반 사용자 화면(쿼리 없음)에서는 이 컴포넌트가 아무 것도 렌더하지 않고,
 * 리스너도 하나도 붙이지 않는다 — 즉 존재하지 않는 것과 동일하다.
 *
 * 세로 스와이프(|totalDy|>=20px, 세로 이동이 수평 이동보다 큼)인데
 * scrollY가 시작~종료 사이 1px 미만으로 고정된 경우만 WARN으로 기록한다
 * (문서 맨 아래라 더 스크롤할 게 없어 못 움직이는 경우는 제외). WARN 판정은
 * React state가 아니라 ref 누적으로만 이루어지고, 화면(state) 갱신은
 * 터치가 진행 중이 아닐 때(touchend/touchcancel/idle)만 일어난다 — 패널
 * 리렌더 자체가 실제 제스처 측정에 끼어들 여지를 없앤다.
 *
 * variant는 TimelineScene.tsx가 읽는 것과 동일한 ?scrollAB= 쿼리값을 이
 * 컴포넌트도 직접 읽어 그대로 표시한다 — 패널에 보이는 variant와 실제
 * 적용된 touch-action이 서로 어긋날 수 없다.
 *
 * 패널은 화면 상단 최대 28vh, pointer-events:none — 터치를 절대 가로채지
 * 않는다. preventDefault/stopPropagation은 호출하지 않는다. target(본문/
 * 패널)은 패널의 고정 높이(28vh)와 제스처 시작 Y좌표를 코드에서 직접
 * 비교해 자동으로 판정한다.
 *
 * 확인 끝나면 반드시 제거할 것 — 프로덕션에 영구히 남겨둘 코드가 아니다.
 */

type ScrollABVariant = "control" | "timeline-pan-y";

type GestureEndReason = "touchend" | "touchcancel" | "idle" | "interrupted" | null;

// 제스처(터치 시작~종료) 하나를 요약하는 레코드.
// totalDx/totalDy는 "시작점 대비" 누적 델타.
type GestureRecord = {
  id: number;
  startT: number;
  endT: number | null;
  startX: number;
  startY: number;
  totalDx: number;
  totalDy: number;
  startScrollY: number;
  endScrollY: number | null;
  durationMs: number | null;
  atBottomAtStart: boolean;
  atBottomAtEnd: boolean | null;
  warn: boolean;
  warnIndex: number | null;
};

type ProbeSnapshot = {
  variant: ScrollABVariant;
  warnTotal: number;
  warnedGestures: GestureRecord[];
};

// 패널 자체의 고정 최대 높이(vh) — target(본문/패널) 판정 기준선으로도 그대로 쓴다.
const PANEL_MAX_VH = 28;

function isAtDocumentBottom(): boolean {
  const el = document.scrollingElement || document.documentElement;
  return el.scrollHeight - (el.scrollTop + el.clientHeight) <= 2;
}

function useScrollDebugConfig(): { enabled: boolean; variant: ScrollABVariant } {
  const [config, setConfig] = useState<{ enabled: boolean; variant: ScrollABVariant }>({
    enabled: false,
    variant: "control",
  });
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      setConfig({
        enabled: params.get("scrollDebug") === "1",
        variant: params.get("scrollAB") === "timeline-pan-y" ? "timeline-pan-y" : "control",
      });
    } catch {
      setConfig({ enabled: false, variant: "control" });
    }
  }, []);
  return config;
}

export default function MobileScrollProbe() {
  const { enabled, variant } = useScrollDebugConfig();
  if (!enabled) return null;
  return <MobileScrollProbeInner variant={variant} />;
}

function MobileScrollProbeInner({ variant }: { variant: ScrollABVariant }) {
  const counters = useRef({
    currentGesture: null as GestureRecord | null,
    gestureLog: [] as GestureRecord[],
    gestureIdSeq: 1,
    warnTotal: 0,
    idleTimeoutId: 0,
  });

  const [snapshot, setSnapshot] = useState<ProbeSnapshot | null>(null);

  useEffect(() => {
    const c = counters.current;

    function flushSnapshot() {
      setSnapshot({
        variant,
        warnTotal: c.warnTotal,
        warnedGestures: c.gestureLog.filter((g) => g.warn).slice(0, 5),
      });
    }

    // abs(totalDy)>=20px 이고 세로 이동이 수평 이동보다 큰데(시작~종료)
    // scrollY 변화가 1px 미만이면 WARN. 문서 맨 아래(시작 또는 종료)에서는
    // 더 스크롤할 게 없어 못 움직이는 게 정상이므로 제외.
    function finalizeGesture(reason: Exclude<GestureEndReason, null>) {
      const g = c.currentGesture;
      if (!g || g.endT !== null) return;
      g.endT = performance.now();
      g.endScrollY = window.scrollY;
      g.durationMs = g.endT - g.startT;
      const atBottomAtEnd = isAtDocumentBottom();

      const absDx = Math.abs(g.totalDx);
      const absDy = Math.abs(g.totalDy);
      const scrollYDelta = Math.abs((g.endScrollY as number) - g.startScrollY);
      const verticalDominant = absDy > absDx;
      const atBottom = g.atBottomAtStart || atBottomAtEnd;
      g.atBottomAtEnd = atBottomAtEnd;
      g.warn = absDy >= 20 && verticalDominant && scrollYDelta < 1 && !atBottom;
      if (g.warn) {
        c.warnTotal++;
        g.warnIndex = c.warnTotal;
      }

      c.currentGesture = null;
      // 터치가 끝났으니(또는 idle) 지금이 패널을 갱신할 시점 — 진행 중에는
      // 절대 setSnapshot을 부르지 않는다.
      flushSnapshot();
    }

    function scheduleIdleWatchdog() {
      window.clearTimeout(c.idleTimeoutId);
      // 500ms 동안 다음 touch 이벤트가 없으면(touchend를 못 받는 비정상
      // 케이스 대비) idle로 간주하고 제스처를 마무리한다.
      c.idleTimeoutId = window.setTimeout(() => {
        if (c.currentGesture && c.currentGesture.endT === null) {
          finalizeGesture("idle");
        }
      }, 500);
    }

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      // 이전 제스처가 어떤 이유로든 아직 열려 있으면 새 터치 전에 마무리.
      if (c.currentGesture && c.currentGesture.endT === null) {
        finalizeGesture("interrupted");
      }
      const g: GestureRecord = {
        id: c.gestureIdSeq++,
        startT: performance.now(),
        endT: null,
        startX: t.clientX,
        startY: t.clientY,
        totalDx: 0,
        totalDy: 0,
        startScrollY: window.scrollY,
        endScrollY: null,
        durationMs: null,
        atBottomAtStart: isAtDocumentBottom(),
        atBottomAtEnd: null,
        warn: false,
        warnIndex: null,
      };
      c.currentGesture = g;
      c.gestureLog.unshift(g);
      if (c.gestureLog.length > 20) c.gestureLog.length = 20;
      scheduleIdleWatchdog();
    };

    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      const g = c.currentGesture;
      if (t && g && g.endT === null) {
        g.totalDx = t.clientX - g.startX;
        g.totalDy = t.clientY - g.startY;
      }
      scheduleIdleWatchdog();
    };

    const onTouchEnd = () => {
      window.clearTimeout(c.idleTimeoutId);
      finalizeGesture("touchend");
    };
    const onTouchCancel = () => {
      window.clearTimeout(c.idleTimeoutId);
      finalizeGesture("touchcancel");
    };

    // 전부 passive, preventDefault/stopPropagation 없음 — 기존 스크롤
    // 동작에 절대 개입하지 않는다.
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchCancel, { passive: true });

    flushSnapshot();

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchCancel);
      window.clearTimeout(c.idleTimeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!snapshot) return null;

  // 패널이 항상 고정 높이(PANEL_MAX_VH)라, 그 높이를 그대로 "패널이 화면을
  // 덮은 하단 경계"로 써서 제스처 시작 좌표가 그 안쪽인지 비교한다.
  function targetLabel(startY: number): string {
    const boundary = (window.innerHeight * PANEL_MAX_VH) / 100;
    return startY <= boundary ? "패널" : "본문";
  }

  const warnLines = snapshot.warnedGestures.length
    ? snapshot.warnedGestures
        .map((g) => {
          const endY = g.endScrollY !== null ? g.endScrollY.toFixed(1) : "-";
          const dur = g.durationMs !== null ? g.durationMs.toFixed(0) : "-";
          return `#${g.warnIndex ?? "?"} dx=${g.totalDx.toFixed(1)} dy=${g.totalDy.toFixed(1)} dur=${dur}ms target=${targetLabel(
            g.startY
          )}\n  scrollY ${g.startScrollY.toFixed(1)}→${endY}`;
        })
        .join("\n")
    : "(아직 WARN 없음)";

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 999999,
        pointerEvents: "none",
        background: "rgba(0,0,0,0.85)",
        color: "#0f0",
        fontFamily: "monospace",
        fontSize: "9px",
        lineHeight: 1.4,
        padding: "6px 8px",
        maxWidth: "100vw",
        maxHeight: `${PANEL_MAX_VH}vh`,
        overflow: "hidden",
        whiteSpace: "pre",
      }}
    >
      {`[scrollDebug] variant=${snapshot.variant}
WARN 누적=${snapshot.warnTotal}
${warnLines}`}
    </div>
  );
}
