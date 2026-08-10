"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 임시 진단 전용 컴포넌트 — URL에 ?scrollDebug=1이 있을 때만 동작한다.
 * 일반 사용자 화면(쿼리 없음)에서는 이 컴포넌트가 아무 것도 렌더하지 않고,
 * 리스너/ResizeObserver도 하나도 붙이지 않는다 — 즉 존재하지 않는 것과 동일하다.
 *
 * 목적: 실제 기기에서 "터치 입력이 막히는 것" / "화면 렌더링이 멈추는 것" /
 * "문서 높이(scrollHeight)가 흔들리는 것"을 구분하기 위한 원시 수치만
 * 보여준다. preventDefault/stopPropagation은 절대 호출하지 않으며(기존
 * 스크롤 동작에 개입하지 않음), 패널 자체는 pointer-events:none이라
 * 터치를 가로채지 않는다. CSS 단위/높이/position/animation은 이 파일에서도
 * 건드리지 않는다 — data-probe-scene 속성만 각 Scene 컴포넌트에 추가되어
 * 있고, 그 속성은 시각적으로 아무 영향이 없다.
 *
 * 48초 구간(touchmove 291→350, scrollEvent=1308, scrollY=4573.176로
 * 약 0.75초 고정) 같은 사례를 재현하기 위해, 제스처(터치 시작~종료) 단위로
 * clientX/clientY, 매 move의 dx/dy, 시작점 대비 totalDx/totalDy, 시작/종료
 * scrollY, 지속시간을 ref 링버퍼에 기록한다. "세로 스와이프인데 scrollY가
 * 안 움직인" 케이스만 경고로 표시한다(문서 맨 아래에서 더 스크롤할 게
 * 없어 못 움직이는 정상 케이스는 제외). 이 판정은 React state를 건드리지
 * 않고 순수 ref 누적으로만 이루어지며, 화면(state) 갱신은 터치가 진행
 * 중이 아닐 때(touchend/touchcancel 직후 또는 500ms 이상 idle)만 일어난다
 * — 진단 패널 자체가 실제 제스처 중 리렌더를 유발해 측정을 오염시키는
 * 일이 없도록 하기 위함이다.
 *
 * 확인 끝나면 반드시 제거할 것 — 프로덕션에 영구히 남겨둘 코드가 아니다.
 */

type ScrollableInfo = {
  tag: string;
  overflowY: string;
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
};

type HeightChangeEntry = {
  t: number;
  tag: string;
  probeScene: string;
  probeId: string;
  cls: string;
  prevHeight: number;
  nextHeight: number;
  diff: number;
  prevWidth: number;
  nextWidth: number;
};

type ScrollHeightChangeEntry = {
  t: number;
  prevHeight: number;
  nextHeight: number;
  diff: number;
};

type OverlapCandidate = {
  a: string;
  b: string;
  aOpacity: string;
  bOpacity: string;
};

// 48.0~48.5초 지점처럼 "touchmove는 오는데 scrollEvent/scrollY가 멈추는"
// 순간을 정밀 진단하기 위한 이벤트 단위 상세 로그.
type TouchEventDetail = {
  t: number;
  type: "touchstart" | "touchmove" | "touchend" | "touchcancel";
  targetTag: string;
  targetCls: string;
  composedPath: string;
  cancelable: boolean;
  defaultPrevented: boolean;
  touchAction: string;
  pointerEvents: string;
  userSelect: string;
  overscrollBehaviorY: string;
  scrollParentTag: string;
  scrollParentOverflowY: string;
  scrollY: number;
};

// 제스처(touchstart~touchend/touchcancel/idle) 안의 개별 move 샘플.
// dx/dy는 "직전 move 대비" 델타, scrollY는 그 순간의 window.scrollY.
type GestureMoveSample = {
  t: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  scrollY: number;
};

type GestureEndReason = "touchend" | "touchcancel" | "idle" | "interrupted" | null;

// 제스처 하나(터치 시작~종료) 전체를 요약하는 레코드.
// totalDx/totalDy는 "시작점 대비" 누적 델타.
type GestureRecord = {
  id: number;
  startT: number;
  endT: number | null;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  totalDx: number;
  totalDy: number;
  moveCount: number;
  startScrollY: number;
  endScrollY: number | null;
  durationMs: number | null;
  atBottomAtStart: boolean;
  atBottomAtEnd: boolean | null;
  warn: boolean;
  endReason: GestureEndReason;
  moves: GestureMoveSample[];
};

type ProbeSnapshot = {
  touchStartCount: number;
  touchMoveCount: number;
  touchEndCount: number;
  lastTouchMoveAt: number;
  scrollEventCount: number;
  scrollY: number;
  scrollingElementTag: string;
  scrollingElementScrollTop: number;
  scrollingElementScrollHeight: number;
  scrollingElementClientHeight: number;
  touchPointTag: string;
  touchPointCls: string;
  nearestScrollParent: ScrollableInfo | null;
  defaultPrevented: boolean;
  rafInterval: number;
  rafMaxInterval: number;
  visualViewportHeight: number;
  innerHeight: number;
  htmlOverflow: string;
  htmlOverscrollBehavior: string;
  bodyOverflow: string;
  bodyOverscrollBehavior: string;
  windowResizeCount: number;
  visualViewportResizeCount: number;
  lastResizeBefore: ResizeSample | null;
  lastResizeAfter: ResizeSample | null;
  lastScrollHeightChange: ScrollHeightChangeEntry | null;
  recentHeightChanges: HeightChangeEntry[];
  overlapCandidates: OverlapCandidate[];
  lastScrollYChangeAt: number;
  innerWidth: number;
  clientWidth: number;
  visualViewportWidth: number;
  widthMinusClientWidth: number;
  bodyWidth: number;
  resultLandingRootWidth: number;
  touchCancelCount: number;
  pointerCaptureEvents: string[];
  recentTouchEvents: TouchEventDetail[];
  gestureLog: GestureRecord[];
  gestureWarnTotal: number;
};

type ResizeSample = {
  innerHeight: number;
  vvHeight: number;
  clientHeight: number;
  innerWidth: number;
  clientWidth: number;
  vvWidth: number;
};

function findNearestScrollableParent(el: Element | null): Element | null {
  let node: Element | null = el ? el.parentElement : null;
  while (node && node !== document.body && node !== document.documentElement) {
    const cs = getComputedStyle(node);
    const canScrollY = cs.overflowY === "auto" || cs.overflowY === "scroll";
    if (canScrollY && node.scrollHeight > node.clientHeight) return node;
    node = node.parentElement;
  }
  return null;
}

// 문서(scrollingElement)가 이미 맨 아래에 도달했는지(더 내려갈 데이터가
// 없는지) — 세로 스와이프 경고에서 이 케이스는 정상이므로 제외해야 한다.
function isAtDocumentBottom(): boolean {
  const el = document.scrollingElement || document.documentElement;
  return el.scrollHeight - (el.scrollTop + el.clientHeight) <= 2;
}

function useScrollDebugEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      setEnabled(params.get("scrollDebug") === "1");
    } catch {
      setEnabled(false);
    }
  }, []);
  return enabled;
}

export default function MobileScrollProbe() {
  const enabled = useScrollDebugEnabled();
  if (!enabled) return null;
  return <MobileScrollProbeInner />;
}

function MobileScrollProbeInner() {
  const counters = useRef({
    touchStartCount: 0,
    touchMoveCount: 0,
    touchEndCount: 0,
    scrollEventCount: 0,
    windowResizeCount: 0,
    visualViewportResizeCount: 0,
    lastTouchMoveAt: 0,
    defaultPrevented: false,
    touchPointTag: "-",
    touchPointCls: "-",
    nearestScrollParentEl: null as Element | null,
    lastScrollY: window.scrollY,
    lastScrollYChangeAt: performance.now(),
    lastInnerScrollTop: 0,
    lastInnerScrollChangeAt: performance.now(),
    lastRafTime: performance.now(),
    rafInterval: 0,
    rafMaxInterval: 0,
    lastResizeBefore: null as ResizeSample | null,
    lastResizeAfter: null as ResizeSample | null,
    lastScrollHeight: document.scrollingElement?.scrollHeight ?? 0,
    lastScrollHeightChange: null as ScrollHeightChangeEntry | null,
    heightChanges: [] as HeightChangeEntry[],
    heightMap: new Map<Element, number>(),
    widthMap: new Map<Element, number>(),
    overlapCandidates: [] as OverlapCandidate[],
    touchCancelCount: 0,
    pointerCaptureEvents: [] as string[],
    recentTouchEvents: [] as TouchEventDetail[],
    // ── 제스처 추적 (state 아님, 순수 ref) ──
    activeTouchActive: false,
    currentGesture: null as GestureRecord | null,
    gestureLog: [] as GestureRecord[],
    gestureIdSeq: 1,
    gestureWarnTotal: 0,
    idleTimeoutId: 0,
  });

  const [snapshot, setSnapshot] = useState<ProbeSnapshot | null>(null);

  useEffect(() => {
    const c = counters.current;

    // ── 제스처(터치 시작~종료) 마무리: 경고 판정 + state 갱신 트리거 ──
    // abs(totalDy)>=20px 이고 세로 이동이 수평 이동보다 큰데
    // (시작~종료) scrollY 변화가 1px 미만이면 경고. 문서 맨 아래(시작 또는
    // 종료 시점)에서는 더 스크롤할 게 없어 못 움직이는 게 정상이므로 제외.
    function finalizeGesture(reason: Exclude<GestureEndReason, null>) {
      const g = c.currentGesture;
      if (!g || g.endT !== null) return;
      g.endT = performance.now();
      g.endScrollY = window.scrollY;
      g.durationMs = g.endT - g.startT;
      g.atBottomAtEnd = isAtDocumentBottom();
      g.endReason = reason;

      const absDx = Math.abs(g.totalDx);
      const absDy = Math.abs(g.totalDy);
      const scrollYDelta = Math.abs((g.endScrollY as number) - g.startScrollY);
      const verticalDominant = absDy > absDx;
      const atBottom = g.atBottomAtStart || g.atBottomAtEnd;
      g.warn = absDy >= 20 && verticalDominant && scrollYDelta < 1 && !atBottom;
      if (g.warn) c.gestureWarnTotal++;

      c.activeTouchActive = false;
      c.currentGesture = null;
      // 터치가 끝났으니(또는 idle) 지금이 패널을 갱신할 시점 — 진행 중에는
      // 절대 setSnapshot을 부르지 않는다(아래 displayIntervalId도 동일 가드).
      flushSnapshot();
    }

    function scheduleIdleWatchdog() {
      window.clearTimeout(c.idleTimeoutId);
      // 500ms 동안 다음 touch 이벤트가 전혀 없으면(touchend/touchcancel도
      // 못 받는 비정상 케이스 대비) idle로 간주하고 제스처를 마무리한다.
      c.idleTimeoutId = window.setTimeout(() => {
        if (c.currentGesture && c.currentGesture.endT === null) {
          finalizeGesture("idle");
        }
      }, 500);
    }

    // ── 터치/스크롤 리스너 — 전부 passive, preventDefault/stopPropagation 없음 ──
    // 이벤트마다 target/composedPath/cancelable/defaultPrevented와 그 순간의
    // touch-action/pointer-events/user-select/overscroll-behavior,
    // 가장 가까운 스크롤 부모의 overflow, scrollY를 함께 남긴다 — 48.0~48.5초처럼
    // touchmove는 오는데 scrollEvent/scrollY가 멈추는 순간을 재구성하기 위함.
    // (이 함수는 ref에만 push하며 React state는 절대 건드리지 않는다.)
    function recordTouchDetail(e: TouchEvent, type: TouchEventDetail["type"]) {
      const touch = e.touches[0] || e.changedTouches[0];
      const el = touch
        ? (document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null)
        : (e.target as HTMLElement | null);
      const path = typeof e.composedPath === "function" ? e.composedPath() : [];
      const pathSummary = path
        .slice(0, 6)
        .map((n) => (n instanceof Element ? n.tagName : String(n).slice(0, 10)))
        .join(">");
      const scrollParent = el ? findNearestScrollableParent(el) : null;
      const targetCs = el ? getComputedStyle(el) : null;
      c.recentTouchEvents.push({
        t: performance.now(),
        type,
        targetTag: el ? el.tagName : "null",
        targetCls: el ? (el.className || "").toString().slice(0, 30) : "-",
        composedPath: pathSummary,
        cancelable: e.cancelable,
        defaultPrevented: e.defaultPrevented,
        touchAction: targetCs ? targetCs.touchAction : "-",
        pointerEvents: targetCs ? targetCs.pointerEvents : "-",
        userSelect: targetCs ? targetCs.userSelect : "-",
        overscrollBehaviorY: targetCs
          ? targetCs.overscrollBehaviorY || targetCs.overscrollBehavior
          : "-",
        scrollParentTag: scrollParent ? scrollParent.tagName : "none(window)",
        scrollParentOverflowY: scrollParent ? getComputedStyle(scrollParent).overflowY : "-",
        scrollY: window.scrollY,
      });
      if (c.recentTouchEvents.length > 12) c.recentTouchEvents.shift();
    }
    const onTouchStart = (e: TouchEvent) => {
      c.touchStartCount++;
      const t = e.touches[0];
      if (t) {
        const el = document.elementFromPoint(t.clientX, t.clientY);
        c.touchPointTag = el ? el.tagName : "null";
        c.touchPointCls = el ? (el.className || "").toString().slice(0, 40) : "-";
        c.nearestScrollParentEl = findNearestScrollableParent(el);

        // 이전 제스처가 어떤 이유로든(touchend를 못 받은 채) 아직 열려
        // 있다면 새 터치가 시작하기 전에 안전하게 마무리한다.
        if (c.currentGesture && c.currentGesture.endT === null) {
          finalizeGesture("interrupted");
        }
        const g: GestureRecord = {
          id: c.gestureIdSeq++,
          startT: performance.now(),
          endT: null,
          startX: t.clientX,
          startY: t.clientY,
          lastX: t.clientX,
          lastY: t.clientY,
          totalDx: 0,
          totalDy: 0,
          moveCount: 0,
          startScrollY: window.scrollY,
          endScrollY: null,
          durationMs: null,
          atBottomAtStart: isAtDocumentBottom(),
          atBottomAtEnd: null,
          warn: false,
          endReason: null,
          moves: [],
        };
        c.currentGesture = g;
        c.gestureLog.unshift(g);
        if (c.gestureLog.length > 20) c.gestureLog.length = 20;
        c.activeTouchActive = true;
      }
      c.defaultPrevented = e.defaultPrevented;
      recordTouchDetail(e, "touchstart");
      scheduleIdleWatchdog();
    };
    const onTouchMove = (e: TouchEvent) => {
      c.touchMoveCount++;
      c.lastTouchMoveAt = performance.now();
      c.defaultPrevented = e.defaultPrevented;

      const t = e.touches[0];
      const g = c.currentGesture;
      if (t && g && g.endT === null) {
        const dx = t.clientX - g.lastX;
        const dy = t.clientY - g.lastY;
        g.lastX = t.clientX;
        g.lastY = t.clientY;
        g.totalDx = t.clientX - g.startX;
        g.totalDy = t.clientY - g.startY;
        g.moveCount++;
        if (g.moves.length < 300) {
          g.moves.push({ t: performance.now(), x: t.clientX, y: t.clientY, dx, dy, scrollY: window.scrollY });
        }
      }
      recordTouchDetail(e, "touchmove");
      scheduleIdleWatchdog();
    };
    const onTouchEnd = (e: TouchEvent) => {
      c.touchEndCount++;
      c.defaultPrevented = e.defaultPrevented;
      recordTouchDetail(e, "touchend");
      window.clearTimeout(c.idleTimeoutId);
      finalizeGesture("touchend");
    };
    const onTouchCancel = (e: TouchEvent) => {
      c.touchCancelCount++;
      c.defaultPrevented = e.defaultPrevented;
      recordTouchDetail(e, "touchcancel");
      window.clearTimeout(c.idleTimeoutId);
      finalizeGesture("touchcancel");
    };
    // Pointer capture 발생 여부만 관찰(호출은 절대 하지 않음, 순수 리스닝) —
    // 이 기기가 touch 이벤트와 별도로 pointer 이벤트도 쏘는지, 그 과정에서
    // 어떤 요소가 capture를 가져가는지 확인용.
    function recordPointerEvent(label: string) {
      c.pointerCaptureEvents.push(`${label}@${performance.now().toFixed(0)}`);
      if (c.pointerCaptureEvents.length > 8) c.pointerCaptureEvents.shift();
    }
    const onPointerDown = () => recordPointerEvent("pointerdown");
    const onPointerCancel = () => recordPointerEvent("pointercancel");
    const onGotPointerCapture = () => recordPointerEvent("gotCapture");
    const onLostPointerCapture = () => recordPointerEvent("lostCapture");
    const onScroll = () => {
      c.scrollEventCount++;
    };
    function sampleResize(): ResizeSample {
      return {
        innerHeight: window.innerHeight,
        vvHeight: window.visualViewport?.height ?? -1,
        clientHeight: document.documentElement.clientHeight,
        innerWidth: window.innerWidth,
        clientWidth: document.documentElement.clientWidth,
        vvWidth: window.visualViewport?.width ?? -1,
      };
    }
    const onWindowResize = () => {
      c.windowResizeCount++;
      c.lastResizeBefore = c.lastResizeAfter;
      c.lastResizeAfter = sampleResize();
    };
    const onVisualViewportResize = () => {
      c.visualViewportResizeCount++;
      c.lastResizeBefore = c.lastResizeAfter;
      c.lastResizeAfter = sampleResize();
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchCancel, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointercancel", onPointerCancel, { passive: true });
    window.addEventListener("gotpointercapture", onGotPointerCapture, { passive: true });
    window.addEventListener("lostpointercapture", onLostPointerCapture, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onWindowResize, { passive: true });
    window.visualViewport?.addEventListener("resize", onVisualViewportResize);

    // ── rAF 루프 — 프레임 간격 측정 (ref만 갱신, state 아님) ──
    let rafId = 0;
    function rafTick() {
      const now = performance.now();
      const interval = now - c.lastRafTime;
      c.lastRafTime = now;
      c.rafInterval = interval;
      if (interval > c.rafMaxInterval) c.rafMaxInterval = interval;
      rafId = requestAnimationFrame(rafTick);
    }
    rafId = requestAnimationFrame(rafTick);

    // ── ResizeObserver — body와 모든 data-probe-scene 요소의 높이 변화 기록 (ref만) ──
    function labelFor(el: Element) {
      return {
        tag: el.tagName,
        probeScene: el.getAttribute("data-probe-scene") || (el === document.body ? "body" : "-"),
        probeId: el.getAttribute("data-probe-id") || "-",
        cls: (el.className || "").toString().slice(0, 50),
      };
    }
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const el = entry.target;
        const nextHeight = Math.round(entry.contentRect.height);
        const nextWidth = Math.round(entry.contentRect.width);
        const prev = c.heightMap.get(el);
        const prevWidth = c.widthMap.get(el);
        c.heightMap.set(el, nextHeight);
        c.widthMap.set(el, nextWidth);
        if (prev !== undefined && prev !== nextHeight) {
          const { tag, probeScene, probeId, cls } = labelFor(el);
          c.heightChanges.unshift({
            t: performance.now(),
            tag,
            probeScene,
            probeId,
            cls,
            prevHeight: prev,
            nextHeight,
            diff: nextHeight - prev,
            // 이 Scene의 높이가 바뀐 "그 순간" 폭이 얼마였는지(이전 관찰값) 함께 남긴다 —
            // 폭이 줄어들며 줄바꿈이 바뀐 게 원인인지 확인하기 위함.
            prevWidth: prevWidth ?? nextWidth,
            nextWidth,
          });
          if (c.heightChanges.length > 30) c.heightChanges.length = 30;
        }
      }
    });
    ro.observe(document.body);
    const probeEls = Array.from(document.querySelectorAll("[data-probe-scene]"));
    probeEls.forEach((el) => ro.observe(el));
    // 새로 마운트되는 Scene도 잡을 수 있도록 주기적으로 재스캔
    const rescanId = window.setInterval(() => {
      const all = document.querySelectorAll("[data-probe-scene]");
      all.forEach((el) => {
        if (!c.heightMap.has(el)) ro.observe(el);
      });
    }, 1000);

    // ── document.scrollingElement.scrollHeight 폴링 (100ms, ref만 갱신) ──
    // 겹침(overlap) 후보도 scrollHeight가 바뀐 바로 그 순간, 화면 중앙에
    // 가장 가까운 Scene 안의 텍스트 요소들끼리 사각형이 겹치고 둘 다
    // opacity>0.2인 경우를 잡아 함께 기록한다.
    function checkOverlap() {
      const found: OverlapCandidate[] = [];
      const centerY = window.innerHeight / 2;
      const scenes = Array.from(document.querySelectorAll("[data-probe-scene]")) as HTMLElement[];
      const current = scenes.find((s) => {
        const r = s.getBoundingClientRect();
        return r.top <= centerY && r.bottom >= centerY;
      });
      if (!current) return found;
      const textEls = Array.from(
        current.querySelectorAll("p,span,h1,h2,h3,strong")
      ) as HTMLElement[];
      const visible = textEls
        .filter((el) => el.textContent && el.textContent.trim().length > 0)
        .map((el) => ({ el, rect: el.getBoundingClientRect(), opacity: getComputedStyle(el).opacity }))
        .filter((x) => parseFloat(x.opacity) > 0.2 && x.rect.width > 0 && x.rect.height > 0);
      for (let i = 0; i < visible.length; i++) {
        for (let j = i + 1; j < visible.length; j++) {
          const a = visible[i];
          const b = visible[j];
          const overlapX = a.rect.left < b.rect.right && a.rect.right > b.rect.left;
          const overlapY = a.rect.top < b.rect.bottom && a.rect.bottom > b.rect.top;
          if (overlapX && overlapY) {
            found.push({
              a: (a.el.textContent || "").slice(0, 15),
              b: (b.el.textContent || "").slice(0, 15),
              aOpacity: a.opacity,
              bOpacity: b.opacity,
            });
          }
        }
      }
      return found;
    }

    const scrollHeightPollId = window.setInterval(() => {
      const scrollingEl = document.scrollingElement || document.documentElement;
      const nextHeight = scrollingEl.scrollHeight;
      if (nextHeight !== c.lastScrollHeight) {
        c.lastScrollHeightChange = {
          t: performance.now(),
          prevHeight: c.lastScrollHeight,
          nextHeight,
          diff: nextHeight - c.lastScrollHeight,
        };
        c.lastScrollHeight = nextHeight;
        c.overlapCandidates = checkOverlap();
      }
    }, 100);

    // ── 화면 표시용 스냅샷 — 실제 React state 갱신은 이 함수 하나로만 일어난다 ──
    function flushSnapshot() {
      const scrollingEl = document.scrollingElement || document.documentElement;
      const nowScrollY = window.scrollY;
      if (nowScrollY !== c.lastScrollY) {
        c.lastScrollY = nowScrollY;
        c.lastScrollYChangeAt = performance.now();
      }
      const innerParent = c.nearestScrollParentEl;
      let nearestScrollParent: ScrollableInfo | null = null;
      if (innerParent) {
        if (innerParent.scrollTop !== c.lastInnerScrollTop) {
          c.lastInnerScrollTop = innerParent.scrollTop;
          c.lastInnerScrollChangeAt = performance.now();
        }
        const cs = getComputedStyle(innerParent);
        nearestScrollParent = {
          tag: innerParent.tagName,
          overflowY: cs.overflowY,
          scrollTop: innerParent.scrollTop,
          scrollHeight: innerParent.scrollHeight,
          clientHeight: innerParent.clientHeight,
        };
      }
      const htmlCs = getComputedStyle(document.documentElement);
      const bodyCs = getComputedStyle(document.body);
      const resultRoot = document.querySelector("main");
      setSnapshot({
        touchStartCount: c.touchStartCount,
        touchMoveCount: c.touchMoveCount,
        touchEndCount: c.touchEndCount,
        lastTouchMoveAt: c.lastTouchMoveAt,
        scrollEventCount: c.scrollEventCount,
        scrollY: nowScrollY,
        scrollingElementTag: scrollingEl.tagName,
        scrollingElementScrollTop: scrollingEl.scrollTop,
        scrollingElementScrollHeight: scrollingEl.scrollHeight,
        scrollingElementClientHeight: scrollingEl.clientHeight,
        touchPointTag: c.touchPointTag,
        touchPointCls: c.touchPointCls,
        nearestScrollParent,
        defaultPrevented: c.defaultPrevented,
        rafInterval: c.rafInterval,
        rafMaxInterval: c.rafMaxInterval,
        visualViewportHeight: window.visualViewport?.height ?? -1,
        innerHeight: window.innerHeight,
        htmlOverflow: htmlCs.overflowY,
        htmlOverscrollBehavior: htmlCs.overscrollBehaviorY || htmlCs.overscrollBehavior,
        bodyOverflow: bodyCs.overflowY,
        bodyOverscrollBehavior: bodyCs.overscrollBehaviorY || bodyCs.overscrollBehavior,
        windowResizeCount: c.windowResizeCount,
        visualViewportResizeCount: c.visualViewportResizeCount,
        lastResizeBefore: c.lastResizeBefore,
        lastResizeAfter: c.lastResizeAfter,
        lastScrollHeightChange: c.lastScrollHeightChange,
        recentHeightChanges: c.heightChanges.slice(0, 5),
        overlapCandidates: c.overlapCandidates,
        lastScrollYChangeAt: c.lastScrollYChangeAt,
        innerWidth: window.innerWidth,
        clientWidth: document.documentElement.clientWidth,
        visualViewportWidth: window.visualViewport?.width ?? -1,
        widthMinusClientWidth: window.innerWidth - document.documentElement.clientWidth,
        bodyWidth: Math.round(document.body.getBoundingClientRect().width),
        resultLandingRootWidth: resultRoot ? Math.round(resultRoot.getBoundingClientRect().width) : -1,
        touchCancelCount: c.touchCancelCount,
        pointerCaptureEvents: [...c.pointerCaptureEvents],
        recentTouchEvents: [...c.recentTouchEvents],
        gestureLog: c.gestureLog.slice(0, 20),
        gestureWarnTotal: c.gestureWarnTotal,
      });
    }

    // 200ms마다 갱신 시도하되, 터치가 진행 중이면(activeTouchActive) 건너뛴다.
    // 즉 "패널이 리렌더되는 것" 자체가 실제 제스처 측정에 끼어들 여지를
    // 없앤다 — touchend/touchcancel/idle에서 finalizeGesture가 직접
    // flushSnapshot()을 부르므로, 터치가 끝나는 즉시(최대 200ms 지연 없이)
    // 갱신된다.
    const displayIntervalId = window.setInterval(() => {
      if (c.activeTouchActive) return;
      flushSnapshot();
    }, 200);

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchCancel);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointercancel", onPointerCancel);
      window.removeEventListener("gotpointercapture", onGotPointerCapture);
      window.removeEventListener("lostpointercapture", onLostPointerCapture);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onWindowResize);
      window.visualViewport?.removeEventListener("resize", onVisualViewportResize);
      cancelAnimationFrame(rafId);
      ro.disconnect();
      window.clearInterval(rescanId);
      window.clearInterval(scrollHeightPollId);
      window.clearInterval(displayIntervalId);
      window.clearTimeout(c.idleTimeoutId);
    };
  }, []);

  if (!snapshot) return null;

  const now = performance.now();
  const msSinceTouchMove = snapshot.lastTouchMoveAt ? now - snapshot.lastTouchMoveAt : Infinity;
  const msSinceScrollYChange = now - snapshot.lastScrollYChangeAt;
  const touchActiveButScrollStalled = msSinceTouchMove < 300 && msSinceScrollYChange > 300;
  const rafSpiking = snapshot.rafInterval > 100;

  const heightChangesText = snapshot.recentHeightChanges.length
    ? snapshot.recentHeightChanges
        .map(
          (h) =>
            `  [${h.probeScene}:${h.probeId}] <${h.tag}> h:${h.prevHeight}→${h.nextHeight}(${
              h.diff > 0 ? "+" : ""
            }${h.diff}px) w:${h.prevWidth}→${h.nextWidth}(${h.nextWidth - h.prevWidth > 0 ? "+" : ""}${
              h.nextWidth - h.prevWidth
            }px)`
        )
        .join("\n")
    : "  (아직 없음)";

  const overlapText = snapshot.overlapCandidates.length
    ? snapshot.overlapCandidates
        .map((o) => `  "${o.a}"(${o.aOpacity}) ↔ "${o.b}"(${o.bOpacity})`)
        .join("\n")
    : "  없음";

  const touchEventsText = snapshot.recentTouchEvents.length
    ? snapshot.recentTouchEvents
        .slice(-6)
        .map((ev) => {
          const ago = (now - ev.t).toFixed(0);
          return `  [${ev.type}] -${ago}ms <${ev.targetTag}.${ev.targetCls}> path=${ev.composedPath}
    cancelable=${ev.cancelable} defPrev=${ev.defaultPrevented} scrollY=${ev.scrollY.toFixed(0)}
    touch-action=${ev.touchAction} pointer-events=${ev.pointerEvents} user-select=${ev.userSelect} overscroll-y=${ev.overscrollBehaviorY}
    scrollParent=<${ev.scrollParentTag}> overflowY=${ev.scrollParentOverflowY}`;
        })
        .join("\n")
    : "  (아직 없음)";

  const pointerCaptureText = snapshot.pointerCaptureEvents.length
    ? snapshot.pointerCaptureEvents.join(", ")
    : "없음";

  // ── 제스처(세로 스와이프 vs scrollY 고정) 진단 텍스트 ──
  const gestureLinesText = snapshot.gestureLog.length
    ? snapshot.gestureLog
        .slice(0, 8)
        .map((g) => {
          const flag = g.warn ? " ⚠WARN" : "";
          const dur = g.durationMs !== null ? g.durationMs.toFixed(0) : "-";
          const endY = g.endScrollY !== null ? g.endScrollY.toFixed(1) : "진행중";
          const scrollDelta =
            g.endScrollY !== null ? (g.endScrollY - g.startScrollY).toFixed(1) : "-";
          return `  #${g.id}${flag} start(${g.startX.toFixed(0)},${g.startY.toFixed(0)}) total(dx=${g.totalDx},dy=${g.totalDy}) moves=${g.moveCount} dur=${dur}ms scrollY ${g.startScrollY.toFixed(1)}→${endY}(Δ${scrollDelta}) atBottom(시작/종료)=${g.atBottomAtStart}/${g.atBottomAtEnd ?? "-"} end=${g.endReason ?? "-"}`;
        })
        .join("\n")
    : "  (아직 없음)";

  const warnedGesture = snapshot.gestureLog.find((g) => g.warn);
  const warnedDetailText = warnedGesture
    ? warnedGesture.moves
        .slice(-15)
        .map(
          (m) =>
            `    +${(m.t - warnedGesture.startT).toFixed(0)}ms x=${m.x.toFixed(0)} y=${m.y.toFixed(0)} dx=${m.dx} dy=${m.dy} scrollY=${m.scrollY.toFixed(1)}`
        )
        .join("\n")
    : "  (경고된 gesture 없음)";

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
        maxHeight: "85vh",
        overflow: "hidden",
        whiteSpace: "pre",
      }}
    >
      {`[scrollDebug]
=== 세로 스와이프 vs scrollY 고정 진단 (경고 누적=${snapshot.gestureWarnTotal}) ===
조건: |totalDy|>=20px AND |totalDy|>|totalDx| AND |endScrollY-startScrollY|<1px AND 문서 맨아래 아님
최근 제스처(최대8개):
${gestureLinesText}
가장 최근 경고 제스처의 move 상세(최근15개):
${warnedDetailText}
=== document 높이 ===
scrollHeight 최근 변화: ${
        snapshot.lastScrollHeightChange
          ? `${snapshot.lastScrollHeightChange.prevHeight} → ${snapshot.lastScrollHeightChange.nextHeight} (${
              snapshot.lastScrollHeightChange.diff > 0 ? "+" : ""
            }${snapshot.lastScrollHeightChange.diff}px), ${(now - snapshot.lastScrollHeightChange.t).toFixed(0)}ms 전`
          : "(변화 없음)"
      }
최근 높이 변한 요소 top5:
${heightChangesText}
같은 순간 텍스트 겹침 후보:
${overlapText}
=== 폭(width) ===
innerWidth=${snapshot.innerWidth} clientWidth=${snapshot.clientWidth} visualViewport.width=${snapshot.visualViewportWidth}
innerWidth-clientWidth(스크롤바 폭 추정)=${snapshot.widthMinusClientWidth}
body width=${snapshot.bodyWidth} ResultLanding root(main) width=${snapshot.resultLandingRootWidth}
=== resize ===
window resize=${snapshot.windowResizeCount} visualViewport resize=${snapshot.visualViewportResizeCount}
resize 직전: innerH=${snapshot.lastResizeBefore?.innerHeight ?? "-"} vvH=${snapshot.lastResizeBefore?.vvHeight ?? "-"} clientH=${snapshot.lastResizeBefore?.clientHeight ?? "-"} | innerW=${snapshot.lastResizeBefore?.innerWidth ?? "-"} clientW=${snapshot.lastResizeBefore?.clientWidth ?? "-"} vvW=${snapshot.lastResizeBefore?.vvWidth ?? "-"}
resize 직후: innerH=${snapshot.lastResizeAfter?.innerHeight ?? "-"} vvH=${snapshot.lastResizeAfter?.vvHeight ?? "-"} clientH=${snapshot.lastResizeAfter?.clientHeight ?? "-"} | innerW=${snapshot.lastResizeAfter?.innerWidth ?? "-"} clientW=${snapshot.lastResizeAfter?.clientWidth ?? "-"} vvW=${snapshot.lastResizeAfter?.vvWidth ?? "-"}
=== touch/scroll ===
touchstart=${snapshot.touchStartCount} touchmove=${snapshot.touchMoveCount} touchend=${snapshot.touchEndCount}
lastTouchMove: ${snapshot.lastTouchMoveAt ? msSinceTouchMove.toFixed(0) + "ms ago" : "-"}
scrollEvent=${snapshot.scrollEventCount} scrollY=${snapshot.scrollY}
scrollingElement=<${snapshot.scrollingElementTag}> top=${snapshot.scrollingElementScrollTop} h=${snapshot.scrollingElementScrollHeight} clientH=${snapshot.scrollingElementClientHeight}
touchPoint=<${snapshot.touchPointTag}> ${snapshot.touchPointCls}
nearestScrollParent=${
        snapshot.nearestScrollParent
          ? `<${snapshot.nearestScrollParent.tag}> overflowY=${snapshot.nearestScrollParent.overflowY}`
          : "none(=window)"
      }
defaultPrevented=${snapshot.defaultPrevented}
rAF interval=${snapshot.rafInterval.toFixed(1)}ms max=${snapshot.rafMaxInterval.toFixed(1)}ms
visualViewport.height=${snapshot.visualViewportHeight} innerHeight=${snapshot.innerHeight}
html overflow=${snapshot.htmlOverflow} overscroll=${snapshot.htmlOverscrollBehavior}
body overflow=${snapshot.bodyOverflow} overscroll=${snapshot.bodyOverscrollBehavior}
---
A) touch는 오는데 scrollY 정지: ${touchActiveButScrollStalled ? "TRUE ⚠" : "false"}
B) 같은 순간 rAF 간격 급증(>100ms): ${rafSpiking ? "TRUE ⚠" : "false"}
=== touchcancel / pointer capture ===
touchcancel 발생 횟수=${snapshot.touchCancelCount}
pointer capture 이벤트 로그: ${pointerCaptureText}
=== 최근 터치 이벤트 상세(최근 6개) ===
${touchEventsText}`}
    </div>
  );
}
