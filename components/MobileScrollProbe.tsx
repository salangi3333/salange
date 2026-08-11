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
 * jsBlocked — WARN이 확정된 순간, PerformanceObserver({type:"longtask"})로
 * 수집해둔 "50ms 넘게 메인스레드를 막은 작업" 중 그 제스처의 시작~종료
 * 구간(및 시작 100ms 전)과 겹치는 것들의 합계 시간·개수를 보여준다.
 * "이 정지가 자바스크립트 실행이 메인스레드를 막아서 생긴 것인지"를
 * A/B 비교 없이 이 지표 하나로 직접 판정하기 위함이다. 이 API를 지원하지
 * 않는 브라우저에서는 longtask 관련 값이 전부 "-"로만 표시된다(다른 값은
 * 그대로 동작).
 *
 * 확인 끝나면 반드시 제거할 것 — 프로덕션에 영구히 남겨둘 코드가 아니다.
 */

type ScrollABVariant =
  | "control"
  | "timeline-pan-y"
  | "insight-state-off"
  | "result-pan-y"
  | "motion-off"
  | "root-touch-auto";

// scrollAB로 들어올 수 있는 진단용 variant 값 목록 — 여기 없는 값(또는 값 없음)은
// 전부 "control"로 표시한다. 새 A/B variant를 추가할 때는 이 목록에만 추가하면
// 패널의 variant 표시도 함께 인식한다(진단 라벨 판정만 담당, 실제 동작 분기는
// 각 컴포넌트가 scrollAB 쿼리를 직접 읽어 처리).
const KNOWN_AB_VARIANTS: ScrollABVariant[] = [
  "timeline-pan-y",
  "insight-state-off",
  "result-pan-y",
  "motion-off",
  "root-touch-auto",
];

type GestureEndReason = "touchend" | "touchcancel" | "idle" | "interrupted" | null;

type ElementScrollDiagnostics = {
  element: string;
  overflowX: string;
  overflowY: string;
  touchAction: string;
  overscrollBehaviorX: string;
  overscrollBehaviorY: string;
};

type GestureDiagnostics = {
  scene: string;
  sceneId: string;
  documentElementWidth: string;
  bodyWidth: string;
  scrollChain: ElementScrollDiagnostics[];
  transformAncestors: string[];
  positionedAncestors: string[];
  startsInFixedPurchaseBar: boolean;
};

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
  longTaskMs: number | null;
  longTaskCount: number | null;
  diagnostics: GestureDiagnostics;
};

type LongTaskSample = { start: number; end: number; duration: number };

type ProbeSnapshot = {
  variant: ScrollABVariant;
  warnTotal: number;
  warnedGestures: GestureRecord[];
  longTaskApiSupported: boolean;
};

// 패널 자체의 고정 최대 높이(vh) — target(본문/패널) 판정 기준선으로도 그대로 쓴다.
const PANEL_MAX_VH = 28;

function isAtDocumentBottom(): boolean {
  const el = document.scrollingElement || document.documentElement;
  return el.scrollHeight - (el.scrollTop + el.clientHeight) <= 2;
}

function elementLabel(el: Element): string {
  const id = el.id ? `#${el.id}` : "";
  const classes = Array.from(el.classList).slice(0, 2);
  const classLabel = classes.length ? `.${classes.join(".")}` : "";
  return `${el.tagName.toLowerCase()}${id}${classLabel}`;
}

function collectGestureDiagnostics(target: EventTarget | null, x: number, y: number): GestureDiagnostics {
  const targetElement = target instanceof Element ? target : document.documentElement;
  const sceneElement = targetElement.closest<HTMLElement>("[data-probe-scene]");
  const scrollingElement = document.scrollingElement || document.documentElement;
  const scrollChain: ElementScrollDiagnostics[] = [];
  const transformAncestors: string[] = [];
  const positionedAncestors: string[] = [];

  let current: Element | null = targetElement;
  while (current) {
    const style = window.getComputedStyle(current);
    const label = elementLabel(current);

    if (style.transform !== "none") transformAncestors.push(`${label}:${style.transform}`);
    if (style.position === "fixed" || style.position === "sticky") {
      positionedAncestors.push(`${label}:${style.position}`);
    }

    scrollChain.push({
      element: label,
      overflowX: style.overflowX,
      overflowY: style.overflowY,
      touchAction: style.touchAction,
      overscrollBehaviorX: style.overscrollBehaviorX,
      overscrollBehaviorY: style.overscrollBehaviorY,
    });

    if (current === scrollingElement) break;
    current = current.parentElement;
  }

  const purchaseBars = Array.from(
    document.querySelectorAll<HTMLElement>('[data-probe-scene="sticky-bar"]')
  );
  const startsInFixedPurchaseBar = purchaseBars.some((bar) => {
    const style = window.getComputedStyle(bar);
    const rect = bar.getBoundingClientRect();
    return (
      style.position === "fixed" &&
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      style.pointerEvents !== "none" &&
      x >= rect.left &&
      x <= rect.right &&
      y >= rect.top &&
      y <= rect.bottom
    );
  });

  return {
    scene: sceneElement?.dataset.probeScene ?? "-",
    sceneId: sceneElement?.dataset.probeId ?? "-",
    documentElementWidth: `${document.documentElement.scrollWidth}/${document.documentElement.clientWidth}`,
    bodyWidth: `${document.body.scrollWidth}/${document.body.clientWidth}`,
    scrollChain,
    transformAncestors,
    positionedAncestors,
    startsInFixedPurchaseBar,
  };
}

function useScrollDebugConfig(): { enabled: boolean; variant: ScrollABVariant } {
  const [config, setConfig] = useState<{ enabled: boolean; variant: ScrollABVariant }>({
    enabled: false,
    variant: "control",
  });
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const rawVariant = params.get("scrollAB");
      const matched = KNOWN_AB_VARIANTS.find((v) => v === rawVariant);
      setConfig({
        enabled: params.get("scrollDebug") === "1",
        variant: matched ?? "control",
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
    longTasks: [] as LongTaskSample[],
    longTaskApiSupported: false,
  });

  const [snapshot, setSnapshot] = useState<ProbeSnapshot | null>(null);

  useEffect(() => {
    const c = counters.current;

    function flushSnapshot() {
      setSnapshot({
        variant,
        warnTotal: c.warnTotal,
        warnedGestures: c.gestureLog.filter((g) => g.warn).slice(0, 5),
        longTaskApiSupported: c.longTaskApiSupported,
      });
    }

    // WARN 확정 시, 그 제스처 구간(시작 100ms 전 ~ 종료)과 겹치는 long task
    // (50ms 넘게 메인스레드를 막은 작업) 합계 시간·개수를 계산한다. 시작
    // 100ms 전까지 보는 이유: touchstart가 기록된 시점보다 살짝 앞서 시작된
    // 작업이 그 직후 touchmove 처리를 지연시켰을 가능성까지 포함하기 위함.
    function sumOverlappingLongTasks(startT: number, endT: number): { totalMs: number; count: number } {
      let totalMs = 0;
      let count = 0;
      for (const lt of c.longTasks) {
        if (lt.end >= startT - 100 && lt.start <= endT) {
          totalMs += lt.duration;
          count++;
        }
      }
      return { totalMs, count };
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
        const { totalMs, count } = sumOverlappingLongTasks(g.startT, g.endT);
        g.longTaskMs = totalMs;
        g.longTaskCount = count;
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
        longTaskMs: null,
        longTaskCount: null,
        diagnostics: collectGestureDiagnostics(e.target, t.clientX, t.clientY),
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

    // 메인스레드를 50ms 넘게 막은 작업을 그대로 기록만 한다(관찰만, 아무
    // 것도 취소·차단하지 않음). 미지원 브라우저에서는 조용히 건너뛴다.
    let longTaskObserver: PerformanceObserver | null = null;
    try {
      if (
        typeof PerformanceObserver !== "undefined" &&
        PerformanceObserver.supportedEntryTypes?.includes("longtask")
      ) {
        c.longTaskApiSupported = true;
        longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            c.longTasks.push({
              start: entry.startTime,
              end: entry.startTime + entry.duration,
              duration: entry.duration,
            });
            if (c.longTasks.length > 200) c.longTasks.shift();
          }
        });
        longTaskObserver.observe({ type: "longtask", buffered: true });
      }
    } catch {
      longTaskObserver = null;
      c.longTaskApiSupported = false;
    }

    flushSnapshot();

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchCancel);
      window.clearTimeout(c.idleTimeoutId);
      longTaskObserver?.disconnect();
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
          const jsBlocked = snapshot.longTaskApiSupported
            ? g.longTaskMs !== null
              ? `${g.longTaskMs.toFixed(0)}ms(${g.longTaskCount})`
              : "0ms(0)"
            : "-";
          const d = g.diagnostics;
          const chain = d.scrollChain
            .map(
              (item) =>
                `${item.element}[ov=${item.overflowX}/${item.overflowY} ta=${item.touchAction} ob=${item.overscrollBehaviorX}/${item.overscrollBehaviorY}]`
            )
            .join(" > ");
          return `#${g.warnIndex ?? "?"} dx=${g.totalDx.toFixed(1)} dy=${g.totalDy.toFixed(1)} dur=${dur}ms target=${targetLabel(
            g.startY
          )}\n  scrollY ${g.startScrollY.toFixed(1)}→${endY} jsBlocked=${jsBlocked}\n  scene=${d.scene}/${
            d.sceneId
          } fixedBar=${d.startsInFixedPurchaseBar ? "Y" : "N"}\n  width html=${
            d.documentElementWidth
          } body=${d.bodyWidth} (scroll/client)\n  chain ${chain}\n  transform=${
            d.transformAncestors.join(" > ") || "-"
          }\n  fixed/sticky=${d.positionedAncestors.join(" > ") || "-"}`;
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
      {`[scrollDebug] variant=${snapshot.variant} longtaskAPI=${snapshot.longTaskApiSupported ? "O" : "X"}
WARN 누적=${snapshot.warnTotal}
${warnLines}`}
    </div>
  );
}
