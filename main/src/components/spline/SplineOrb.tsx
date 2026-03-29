import { useRef, useState, useEffect } from "react";
import type { SplineEvent } from "@splinetool/runtime";
import { Application as SplineApplication } from "@splinetool/runtime";
import { ORB_SCENE_URL } from "@/lib/spline-scenes";

const DEFAULT_HIDDEN_OBJECT_IDS = [
  "7ba78968-2a55-48f2-b14c-5191da3e075e",
] as string[];
const DEFAULT_HIDDEN_OBJECT_NAMES: string[] = [];
const PRESENTATION_DELAY_MS = 110;

interface SplineOrbProps {
  sceneUrl?: string;
  visible?: boolean;
  hideObjectIds?: string[];
  hideObjects?: string[];
  canvasId?: string;
  enableGlobalEvents?: boolean;
  zIndex?: number;
  fadeDurationMs?: number;
  initialZoom?: number;
  targetZoom?: number;
  zoomTweenDurationMs?: number;
  onLoad?: (app: SplineApplication) => void;
  onPresented?: (app: SplineApplication) => void;
  onMouseDown?: (event: SplineEvent, app: SplineApplication) => void;
}

/**
 * Full-viewport Spline 3D orb.
 * - Canvas covers 100vw x 100vh (required for Spline's internal lookAt tracking)
 * - pointerEvents: auto so the canvas receives native mouse events
 * - Global Spline events stay enabled so scene interactions still fire above UI overlays
 * - Orbital nodes (z-index 3) sit above this canvas (z-index 1) for clicks
 */
export default function SplineOrb({
  sceneUrl = ORB_SCENE_URL,
  visible = true,
  hideObjectIds = DEFAULT_HIDDEN_OBJECT_IDS,
  hideObjects = DEFAULT_HIDDEN_OBJECT_NAMES,
  canvasId,
  enableGlobalEvents = true,
  zIndex = 1,
  fadeDurationMs = 350,
  initialZoom,
  targetZoom = 1,
  zoomTweenDurationMs = 0,
  onLoad,
  onPresented,
  onMouseDown,
}: SplineOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<SplineApplication | null>(null);
  const onLoadRef = useRef(onLoad);
  const onPresentedRef = useRef(onPresented);
  const onMouseDownRef = useRef(onMouseDown);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    onLoadRef.current = onLoad;
  }, [onLoad]);

  useEffect(() => {
    onMouseDownRef.current = onMouseDown;
  }, [onMouseDown]);

  useEffect(() => {
    onPresentedRef.current = onPresented;
  }, [onPresented]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || appRef.current) return;

    const app = new SplineApplication(canvas);
    appRef.current = app;
    const handleMouseDown = (event: SplineEvent) => {
      onMouseDownRef.current?.(event, app);
    };
    let presentationTimer: number | null = null;
    let zoomFrame = 0;

    app.load(sceneUrl).then(() => {
      try {
        app.setBackgroundColor("transparent");
      } catch {
        /* noop */
      }

      app.setGlobalEvents(enableGlobalEvents);

      const fromZoom = typeof initialZoom === "number" ? initialZoom : targetZoom;
      const toZoom = targetZoom;
      try {
        app.setZoom(fromZoom);
      } catch {
        /* noop */
      }

      if (zoomTweenDurationMs > 0 && Math.abs(toZoom - fromZoom) > 0.001) {
        const startedAt = performance.now();
        let lastFrameTime = 0;
        const zoomTweenFrameBudgetMs =
          typeof window !== "undefined" && window.innerWidth <= 820
            ? 1000 / 45
            : 1000 / 60;
        const easeOutQuint = (value: number) => 1 - (1 - value) ** 5;
        const animateZoom = (time: number) => {
          if (lastFrameTime !== 0 && time - lastFrameTime < zoomTweenFrameBudgetMs) {
            zoomFrame = requestAnimationFrame(animateZoom);
            return;
          }
          lastFrameTime = time;
          const progress = Math.min(1, (time - startedAt) / zoomTweenDurationMs);
          const eased = easeOutQuint(progress);
          const nextZoom = fromZoom + (toZoom - fromZoom) * eased;

          try {
            app.setZoom(nextZoom);
          } catch {
            /* noop */
          }

          if (progress < 1) {
            zoomFrame = requestAnimationFrame(animateZoom);
          }
        };
        zoomFrame = requestAnimationFrame(animateZoom);
      }

      for (const id of hideObjectIds) {
        try {
          app.findObjectById(id)?.hide();
        } catch { /* skip */ }
      }

      // Backward-compatible fallback for older callers still using names.
      for (const name of hideObjects) {
        try {
          app.findObjectByName(name)?.hide();
        } catch { /* skip */ }
      }

      app.addEventListener("mouseDown", handleMouseDown);
      setLoaded(true);
      requestAnimationFrame(() => {
        onLoadRef.current?.(app);
      });
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          presentationTimer = window.setTimeout(() => {
            onPresentedRef.current?.(app);
          }, Math.max(PRESENTATION_DELAY_MS, fadeDurationMs, zoomTweenDurationMs));
        });
      });
    }).catch(() => {});

    return () => {
      if (presentationTimer) {
        window.clearTimeout(presentationTimer);
      }
      if (zoomFrame) {
        window.cancelAnimationFrame(zoomFrame);
      }
      app.removeEventListener("mouseDown", handleMouseDown);
      app.dispose();
      appRef.current = null;
    };
  }, [canvasId, enableGlobalEvents, fadeDurationMs, hideObjectIds, hideObjects, initialZoom, sceneUrl, targetZoom, zoomTweenDurationMs]);

  return (
    <canvas
      id={canvasId}
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex,
        background: "transparent",
        // MUST be auto — Spline's lookAt needs native mouse events on canvas
        pointerEvents: "auto",
        opacity: visible && loaded ? 1 : 0,
        transition: `opacity ${fadeDurationMs}ms ease`,
      }}
    />
  );
}
