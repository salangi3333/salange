"use client";

import { useEffect } from "react";

type TraceSample = unknown[];

type ActiveGesture = {
  id: number;
  startT: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  touchId: number;
  totalX: number;
  totalY: number;
  scene: string;
  sceneId: string;
};

const TRACE_MARK_NAME = "scroll-probe-batch";
const TRACE_SAMPLE_LIMIT = 16384;
const TRACE_IDLE_MS = 650;

function statusCode(status: string): number {
  if (status === "loaded") return 1;
  if (status === "loading") return 2;
  if (status === "error") return 3;
  return 0;
}

export default function ScrollTraceRecorder() {
  useEffect(() => {
    try {
      if (new URLSearchParams(window.location.search).get("scrollTrace") !== "1") return;
    } catch {
      return;
    }

    const ring = new Array<TraceSample | undefined>(TRACE_SAMPLE_LIMIT);
    let writeIndex = 0;
    let sampleCount = 0;
    let dropped = 0;
    let sampleSeq = 1;
    let batchSeq = 1;
    let flushTimer = 0;
    let lastActivityT = performance.now();
    let frameId = 0;
    let viewportDirty = true;
    let lastViewportKey = "";
    let gestureSeq = 1;
    let lastGestureId = 0;
    let activeGesture: ActiveGesture | null = null;

    const fontFaceIds = new WeakMap<FontFace, number>();
    const fontFacesById = new Map<number, FontFace>();
    const fontDescriptors = new Map<number, unknown[]>();
    let nextFontFaceId = 1;
    let fontDescriptorsDirty = true;
    let resourceCursor = 0;
    const fontResources: unknown[][] = [];

    const timeOrigin = performance.timeOrigin;
    const initialFontStatus = document.fonts.status;

    function visualViewportTuple(): number[] {
      const vv = window.visualViewport;
      return [
        window.innerWidth,
        window.innerHeight,
        vv?.width ?? -1,
        vv?.height ?? -1,
        vv?.offsetTop ?? -1,
        vv?.pageTop ?? -1,
        vv?.scale ?? -1,
        window.devicePixelRatio,
      ];
    }

    function documentViewportTuple(): number[] {
      const scrollingElement = document.scrollingElement || document.documentElement;
      return [...visualViewportTuple(), scrollingElement.scrollHeight, scrollingElement.clientHeight];
    }

    function getFontFaceId(face: FontFace): number {
      const existing = fontFaceIds.get(face);
      if (existing !== undefined) return existing;
      const id = nextFontFaceId++;
      fontFaceIds.set(face, id);
      fontFacesById.set(id, face);
      return id;
    }

    function armIdleFlush(activityT: number) {
      lastActivityT = activityT;
      if (flushTimer !== 0) return;

      const check = () => {
        if (activeGesture) {
          flushTimer = window.setTimeout(check, TRACE_IDLE_MS);
          return;
        }
        const remaining = TRACE_IDLE_MS - (performance.now() - lastActivityT);
        if (remaining > 0) {
          flushTimer = window.setTimeout(check, remaining);
          return;
        }
        flushTimer = 0;
        flush("idle");
      };
      flushTimer = window.setTimeout(check, TRACE_IDLE_MS);
    }

    function push(sample: TraceSample, handlerT: number) {
      ring[writeIndex] = sample;
      writeIndex = (writeIndex + 1) % TRACE_SAMPLE_LIMIT;
      if (sampleCount === TRACE_SAMPLE_LIMIT) dropped++;
      else sampleCount++;
      armIdleFlush(handlerT);
    }

    function updateDeferredFontData() {
      if (fontDescriptorsDirty) {
        for (const [id, face] of fontFacesById) {
          fontDescriptors.set(id, [
            id,
            face.family,
            face.weight,
            face.style,
            face.stretch,
            face.display,
            face.status,
            face.unicodeRange,
          ]);
        }
        fontDescriptorsDirty = false;
      }

      const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
      for (const entry of resources.slice(resourceCursor)) {
        if (!/\.woff2(?:$|\?)/i.test(entry.name)) continue;
        fontResources.push([
          entry.name,
          entry.startTime,
          entry.responseEnd,
          entry.duration,
          entry.transferSize,
          entry.encodedBodySize,
          entry.decodedBodySize,
        ]);
      }
      resourceCursor = resources.length;
    }

    function flush(reason: string) {
      if (sampleCount === 0) return;
      window.clearTimeout(flushTimer);
      flushTimer = 0;

      const samples: TraceSample[] = [];
      const start = (writeIndex - sampleCount + TRACE_SAMPLE_LIMIT) % TRACE_SAMPLE_LIMIT;
      for (let i = 0; i < sampleCount; i++) {
        const sample = ring[(start + i) % TRACE_SAMPLE_LIMIT];
        if (sample) samples.push(sample);
      }
      sampleCount = 0;

      updateDeferredFontData();
      const firstT = Number(samples[0]?.[2] ?? performance.now());
      const lastT = Number(samples[samples.length - 1]?.[2] ?? firstT);
      const detail = {
        version: 1,
        batch: batchSeq++,
        reason,
        timeOrigin,
        firstT,
        lastT,
        flushT: performance.now(),
        dropped,
        sampleLimit: TRACE_SAMPLE_LIMIT,
        viewportFields: [
          "innerWidth",
          "innerHeight",
          "visualWidth",
          "visualHeight",
          "visualOffsetTop",
          "visualPageTop",
          "visualScale",
          "dpr",
          "scrollHeight",
          "clientHeight",
        ],
        viewport: documentViewportTuple(),
        sampleSchemas: {
          touch: [
            "code",
            "seq",
            "handlerT",
            "eventT",
            "gestureId",
            "scrollY",
            "clientX",
            "clientY",
            "deltaX",
            "deltaY",
            "touchId",
            "touchCount",
            "cancelable",
            "defaultPrevented",
            "scene",
            "sceneId",
          ],
          scroll: ["code", "seq", "handlerT", "eventT", "gestureId", "scrollY"],
          frame: [
            "code",
            "seq",
            "handlerT",
            "rafT",
            "gestureId",
            "scrollY",
            "visualViewportOrNull",
          ],
          gestureEnd: [
            "code",
            "seq",
            "handlerT",
            "gestureId",
            "scrollY",
            "totalX",
            "totalY",
            "duration",
            "reason",
            "scene",
            "sceneId",
          ],
          font: ["code", "seq", "handlerT", "eventT", "fontSetStatus", "faceIds"],
          viewport: ["code", "seq", "handlerT", "eventT", "gestureId", "viewport"],
        },
        samples,
        font: {
          initialStatus: initialFontStatus,
          currentStatus: document.fonts.status,
          baseline: baselineFontStatuses,
          descriptorFields: [
            "id",
            "family",
            "weight",
            "style",
            "stretch",
            "display",
            "status",
            "unicodeRange",
          ],
          descriptors: Array.from(fontDescriptors.values()),
          resourceFields: [
            "url",
            "startTime",
            "responseEnd",
            "duration",
            "transferSize",
            "encodedBodySize",
            "decodedBodySize",
          ],
          resources: fontResources,
        },
      };
      dropped = 0;

      try {
        performance.mark(TRACE_MARK_NAME, { startTime: Math.max(0, firstT), detail });
      } catch {
        performance.mark(TRACE_MARK_NAME);
      }
      // Raw trace 이벤트는 mark 호출 시 동기적으로 방출된다. 큰 detail이 두 번째
      // 통과의 heap/GC 변수가 되지 않도록 Performance Timeline에서는 즉시 제거한다.
      performance.clearMarks(TRACE_MARK_NAME);
    }

    function scheduleFrame() {
      if (frameId !== 0) return;
      frameId = window.requestAnimationFrame((rafT) => {
        frameId = 0;
        const handlerT = performance.now();
        let viewport: number[] | null = null;
        if (viewportDirty) {
          const next = visualViewportTuple();
          const key = next.join(",");
          if (key !== lastViewportKey) {
            viewport = next;
            lastViewportKey = key;
          }
          viewportDirty = false;
        }
        push(
          [
            "f",
            sampleSeq++,
            handlerT,
            rafT,
            activeGesture?.id ?? lastGestureId,
            window.scrollY,
            viewport,
          ],
          handlerT
        );
      });
    }

    function sceneAt(target: EventTarget | null): [string, string] {
      const element = target instanceof Element ? target : document.documentElement;
      const scene = element.closest<HTMLElement>("[data-probe-scene]");
      return [scene?.dataset.probeScene ?? "-", scene?.dataset.probeId ?? "-"];
    }

    function finishGesture(reason: string) {
      const gesture = activeGesture;
      if (!gesture) return;
      const handlerT = performance.now();
      push(
        [
          "ge",
          sampleSeq++,
          handlerT,
          gesture.id,
          window.scrollY,
          gesture.totalX,
          gesture.totalY,
          handlerT - gesture.startT,
          reason,
          gesture.scene,
          gesture.sceneId,
        ],
        handlerT
      );
      activeGesture = null;
    }

    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      if (activeGesture) finishGesture("interrupted");
      const handlerT = performance.now();
      const [scene, sceneId] = sceneAt(event.target);
      activeGesture = {
        id: gestureSeq++,
        startT: handlerT,
        startX: touch.clientX,
        startY: touch.clientY,
        lastX: touch.clientX,
        lastY: touch.clientY,
        touchId: touch.identifier,
        totalX: 0,
        totalY: 0,
        scene,
        sceneId,
      };
      lastGestureId = activeGesture.id;
      push(
        [
          "ts",
          sampleSeq++,
          handlerT,
          event.timeStamp,
          activeGesture.id,
          window.scrollY,
          touch.clientX,
          touch.clientY,
          0,
          0,
          touch.identifier,
          event.touches.length,
          Number(event.cancelable),
          Number(event.defaultPrevented),
          scene,
          sceneId,
        ],
        handlerT
      );
      scheduleFrame();
    };

    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      const gesture = activeGesture;
      if (!touch || !gesture) return;
      const handlerT = performance.now();
      const deltaX = touch.clientX - gesture.lastX;
      const deltaY = touch.clientY - gesture.lastY;
      gesture.lastX = touch.clientX;
      gesture.lastY = touch.clientY;
      gesture.touchId = touch.identifier;
      gesture.totalX = touch.clientX - gesture.startX;
      gesture.totalY = touch.clientY - gesture.startY;
      push(
        [
          "tm",
          sampleSeq++,
          handlerT,
          event.timeStamp,
          gesture.id,
          window.scrollY,
          touch.clientX,
          touch.clientY,
          deltaX,
          deltaY,
          touch.identifier,
          event.touches.length,
          Number(event.cancelable),
          Number(event.defaultPrevented),
          null,
          null,
        ],
        handlerT
      );
      scheduleFrame();
    };

    const onTouchEnd = (event: TouchEvent) => {
      const handlerT = performance.now();
      const touch = event.changedTouches[0];
      push(
        [
          "te",
          sampleSeq++,
          handlerT,
          event.timeStamp,
          activeGesture?.id ?? lastGestureId,
          window.scrollY,
          touch?.clientX ?? null,
          touch?.clientY ?? null,
          null,
          null,
          touch?.identifier ?? null,
          event.touches.length,
          Number(event.cancelable),
          Number(event.defaultPrevented),
          null,
          null,
        ],
        handlerT
      );
      finishGesture("touchend");
      scheduleFrame();
    };

    const onTouchCancel = (event: TouchEvent) => {
      const handlerT = performance.now();
      push(
        [
          "tc",
          sampleSeq++,
          handlerT,
          event.timeStamp,
          activeGesture?.id ?? lastGestureId,
          window.scrollY,
          null,
          null,
          null,
          null,
          null,
          event.touches.length,
          Number(event.cancelable),
          Number(event.defaultPrevented),
          null,
          null,
        ],
        handlerT
      );
      finishGesture("touchcancel");
    };

    const onScroll = (event: Event) => {
      const handlerT = performance.now();
      push(
        [
          "s",
          sampleSeq++,
          handlerT,
          event.timeStamp,
          activeGesture?.id ?? lastGestureId,
          window.scrollY,
        ],
        handlerT
      );
      scheduleFrame();
    };

    const onDocumentScrollEnd = (event: Event) => {
      const handlerT = performance.now();
      push(
        [
          "se",
          sampleSeq++,
          handlerT,
          event.timeStamp,
          activeGesture?.id ?? lastGestureId,
          documentViewportTuple(),
        ],
        handlerT
      );
      scheduleFrame();
    };

    const onViewportChange = () => {
      viewportDirty = true;
      scheduleFrame();
    };

    const onViewportScrollEnd = (event: Event) => {
      const handlerT = performance.now();
      push(
        [
          "ve",
          sampleSeq++,
          handlerT,
          event.timeStamp,
          activeGesture?.id ?? lastGestureId,
          visualViewportTuple(),
        ],
        handlerT
      );
    };

    const recordFontEvent = (code: string) => (event: Event) => {
      const handlerT = performance.now();
      const faces = (event as Event & { fontfaces?: readonly FontFace[] }).fontfaces ?? [];
      const ids: number[] = [];
      for (const face of faces) ids.push(getFontFaceId(face));
      fontDescriptorsDirty = true;
      push(
        [code, sampleSeq++, handlerT, event.timeStamp, statusCode(document.fonts.status), ids],
        handlerT
      );
    };

    const onFontLoading = recordFontEvent("fl");
    const onFontDone = recordFontEvent("fd");
    const onFontError = recordFontEvent("fe");

    // Listener를 먼저 붙인 뒤 당시의 작은 ID/status baseline만 캡처한다.
    document.fonts.addEventListener("loading", onFontLoading);
    document.fonts.addEventListener("loadingdone", onFontDone);
    document.fonts.addEventListener("loadingerror", onFontError);
    const baselineFontStatuses = Array.from(document.fonts, (face) => [
      getFontFaceId(face),
      statusCode(face.status),
    ]);

    let mounted = true;
    void document.fonts.ready.then(() => {
      if (!mounted) return;
      const handlerT = performance.now();
      push(
        ["fr", sampleSeq++, handlerT, null, statusCode(document.fonts.status), []],
        handlerT
      );
      fontDescriptorsDirty = true;
    });

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchCancel, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onViewportChange, { passive: true });
    document.addEventListener("scrollend", onDocumentScrollEnd, { passive: true });
    window.visualViewport?.addEventListener("resize", onViewportChange, { passive: true });
    window.visualViewport?.addEventListener("scroll", onViewportChange, { passive: true });
    window.visualViewport?.addEventListener("scrollend", onViewportScrollEnd, { passive: true });

    const mountedT = performance.now();
    push(["session", sampleSeq++, mountedT, null, 0, window.scrollY], mountedT);

    return () => {
      mounted = false;
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchCancel);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onViewportChange);
      document.removeEventListener("scrollend", onDocumentScrollEnd);
      window.visualViewport?.removeEventListener("resize", onViewportChange);
      window.visualViewport?.removeEventListener("scroll", onViewportChange);
      window.visualViewport?.removeEventListener("scrollend", onViewportScrollEnd);
      document.fonts.removeEventListener("loading", onFontLoading);
      document.fonts.removeEventListener("loadingdone", onFontDone);
      document.fonts.removeEventListener("loadingerror", onFontError);
      window.clearTimeout(flushTimer);
      if (frameId !== 0) window.cancelAnimationFrame(frameId);
      flush("unmount");
    };
  }, []);

  return null;
}
