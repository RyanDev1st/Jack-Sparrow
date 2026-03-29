"use client";
import { useState, useEffect, useRef, useCallback, useMemo, startTransition, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import SplineOrb from "@/components/SplineOrb";
import { Play, MapPin, QrCode, Puzzle, Trophy, ChevronRight } from "lucide-react";
import { FluidTextMorph } from "@/components/ui/fluid-text-morph";
import type { Application as SplineApplication, SplineEvent } from "@splinetool/runtime";
import { JOIN_KEYBOARD_SCENE_URL } from "@/lib/spline-scenes";

// ─── Types ───────────────────────────────────────────────
type Stage = "orbital" | "glass-panel" | "qr-panels";
const NO_HIDDEN_SPLINE_OBJECTS: string[] = [];
const JOIN_TRIGGER_NAMES = new Set(["Key-ACTION", "chatgpt logo"]);
const JOIN_TRIGGER_IDS = new Set([
  "e524661b-8d5a-44ee-9fda-6ee50c565f0d",
  "aed1544f-27b9-4570-9f41-c9af99b2ea93",
]);
const START_TRANSITION_MS = 90;
const JOIN_ANIMATION_HOLD_MS = 340;
const FLASH_DURATION_MS = 980;
const JOIN_AUDIO_FADE_OUT_MS = 2350;
const JOIN_AUDIO_RESTORE_DELAY_MS = 800;
const JOIN_AUDIO_RESTORE_MS = 2200;
const JOIN_STATUS_PAIR: [string, string] = ["NOT JOINED", "JOINED"];
const ORBIT_BASE_ANGLE = 14;
const QRCheckinStage = lazy(() => import("@/components/QRCheckinStage"));
const preloadScanRoute = () => import("@/pages/Scan");
const preloadScanStage = () => import("@/components/QRCheckinStage");

type FlashOrigin = {
  x: number;
  y: number;
};

type HowlerLike = {
  volume: (value?: number) => number;
  fade?: (from: number, to: number, duration: number) => void;
};

function getSplineHowler(): HowlerLike | null {
  if (typeof window === "undefined") return null;

  const maybeHowler = (window as Window & { Howler?: HowlerLike }).Howler;
  if (!maybeHowler || typeof maybeHowler.volume !== "function") {
    return null;
  }

  return maybeHowler;
}

interface OrbitalNode {
  id: number;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  color: string;
  glowColor: string;
}

// ─── Node Data — correct order: Start → Solve → Explore → Scan → Claim
const NODES: OrbitalNode[] = [
  {
    id: 0,
    label: "Start",
    sublabel: "Begin your hunt",
    icon: Play,
    color: "#34d399",
    glowColor: "rgba(52, 211, 153, 0.4)",
  },
  {
    id: 1,
    label: "Solve",
    sublabel: "Decode the riddle",
    icon: Puzzle,
    color: "#a78bfa",
    glowColor: "rgba(167, 139, 250, 0.3)",
  },
  {
    id: 2,
    label: "Explore",
    sublabel: "Find the location",
    icon: MapPin,
    color: "#60a5fa",
    glowColor: "rgba(96, 165, 250, 0.3)",
  },
  {
    id: 3,
    label: "Scan",
    sublabel: "QR verification",
    icon: QrCode,
    color: "#F58220",
    glowColor: "rgba(245, 130, 32, 0.3)",
  },
  {
    id: 4,
    label: "Claim",
    sublabel: "Win the treasure",
    icon: Trophy,
    color: "#fbbf24",
    glowColor: "rgba(251, 191, 36, 0.3)",
  },
];

// ─── Orb Speech Bubble (random messages with curvy yarn string from orb edge) ──
const ORB_MESSAGES = [
  "You are my favorite Human!",
  "Can't wait for Castlevania's next game!",
  "The treasure is closer than you think...",
  "I see everything from up here!",
  "Adventure awaits beyond the stars",
  "Did you know I glow in the dark?",
  "Solve the riddle, claim the prize!",
  "Psst... follow the stars",
];

// Random curvy yarn paths — each one feels organic and different
interface YarnPath {
  side: "left" | "right";
  startX: number;
  startY: number;
  path: string;
  endX: number;
  endY: number;
  anchorInset: number;
}

const YARN_PATHS = [
  // right-side: keep the bubble well outside the orb silhouette
  { side: "right", startX: 118, startY: -52, path: "M 0,0 C 48,-56 104,-14 156,-42 Q 210,-70 278,-66", endX: 278, endY: -66, anchorInset: 30 },
  { side: "right", startX: 102, startY: -12, path: "M 0,0 C 62,-20 126,18 186,-8 Q 234,-28 286,-20", endX: 286, endY: -20, anchorInset: 28 },
  { side: "right", startX: 86, startY: -88, path: "M 0,0 C 18,-54 72,-94 142,-90 S 224,-84 274,-108", endX: 274, endY: -108, anchorInset: 26 },
  // left-side: mirrored safe zone with more clearance
  { side: "left", startX: -120, startY: -44, path: "M 0,0 C -46,-52 -104,-10 -162,-34 Q -214,-58 -282,-62", endX: -282, endY: -62, anchorInset: 30 },
  { side: "left", startX: -110, startY: 6, path: "M 0,0 C -60,-18 -122,18 -186,-6 Q -238,-20 -292,-14", endX: -292, endY: -14, anchorInset: 28 },
  { side: "left", startX: -90, startY: -86, path: "M 0,0 C -24,-60 -82,-94 -144,-94 S -226,-92 -280,-112", endX: -280, endY: -112, anchorInset: 26 },
] satisfies YarnPath[];

function OrbSpeechBubble({ mobile = false, mobileTopOffset = "-4px" }: { mobile?: boolean; mobileTopOffset?: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [yarn, setYarn] = useState(YARN_PATHS[0]);

  useEffect(() => {
    let lastMessageIndex = -1;
    let lastYarnIndex = -1;
    let hideTimer: number | null = null;
    let showTimer: number | null = null;

    const pickRandomIndex = (length: number, previousIndex: number) => {
      if (length <= 1) return 0;
      let nextIndex = Math.floor(Math.random() * length);
      while (nextIndex === previousIndex) {
        nextIndex = Math.floor(Math.random() * length);
      }
      return nextIndex;
    };

    const scheduleNext = (delay: number) => {
      showTimer = window.setTimeout(show, delay);
    };

    const show = () => {
      const messageIndex = pickRandomIndex(ORB_MESSAGES.length, lastMessageIndex);
      const yarnIndex = pickRandomIndex(YARN_PATHS.length, lastYarnIndex);
      const msg = ORB_MESSAGES[messageIndex];
      const y = YARN_PATHS[yarnIndex];
      const visibleDuration = 3000 + Math.random() * 1600 + Math.min(700, msg.length * 14);
      const nextDelay = visibleDuration + 1800 + Math.random() * 5200;

      lastMessageIndex = messageIndex;
      lastYarnIndex = yarnIndex;
      setYarn(y);
      setMessage(msg);

      hideTimer = window.setTimeout(() => {
        setMessage(null);
      }, visibleDuration);

      scheduleNext(nextDelay);
    };

    scheduleNext(1600 + Math.random() * 2200);

    return () => {
      if (hideTimer) window.clearTimeout(hideTimer);
      if (showTimer) window.clearTimeout(showTimer);
    };
  }, []);

  return (
    <AnimatePresence>
      {message && (
        mobile ? (
          <motion.div
            key={`${message}-${yarn.side}`}
            initial={{ opacity: 0, y: -10, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96, transition: { duration: 0.25 } }}
            transition={{ duration: 0.34, ease: "easeOut" }}
            style={{
              position: "absolute",
              top: mobileTopOffset,
              [yarn.side === "right" ? "left" : "right"]: "calc(50% + 18px)",
              maxWidth: "180px",
              pointerEvents: "none",
              zIndex: 10,
            }}
          >
            <div
              style={{
                position: "relative",
                padding: "11px 14px",
                borderRadius: "18px",
                background: "linear-gradient(135deg, rgba(245,130,32,0.14) 0%, rgba(139,92,246,0.12) 100%)",
                border: "1px solid rgba(245,130,32,0.22)",
                backdropFilter: "blur(18px)",
                boxShadow: "0 8px 28px rgba(0,0,0,0.24), 0 0 24px rgba(245,130,32,0.08)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "-6px",
                  [yarn.side === "right" ? "left" : "right"]: "20px",
                  width: "12px",
                  height: "12px",
                  borderRadius: "3px",
                  background: "linear-gradient(135deg, rgba(245,130,32,0.16) 0%, rgba(139,92,246,0.14) 100%)",
                  borderLeft: "1px solid rgba(245,130,32,0.18)",
                  borderTop: "1px solid rgba(245,130,32,0.18)",
                  transform: "rotate(45deg)",
                }}
              />
              <p className="font-display" style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.94)", fontWeight: 600, lineHeight: 1.35 }}>
                {message}
              </p>
            </div>
          </motion.div>
        ) : (
        <motion.div
          key={message + yarn.path}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.4 } }}
          style={{
            position: "absolute",
            top: `calc(50% + ${yarn.startY}px)`,
            left: `calc(50% + ${yarn.startX}px)`,
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          {/* Curvy yarn string — SVG bezier from orb edge to bubble */}
          <svg
            width="500"
            height="200"
            viewBox="-250 -100 500 200"
            style={{ position: "absolute", top: "-100px", left: "-250px", overflow: "visible", pointerEvents: "none" }}
          >
            {/* Glow under the string */}
            <motion.path
              d={yarn.path}
              fill="none"
              stroke="rgba(245,130,32,0.15)"
              strokeWidth="6"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              exit={{ pathLength: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
            {/* Main string */}
            <motion.path
              d={yarn.path}
              fill="none"
              stroke="rgba(245,130,32,0.6)"
              strokeWidth="2"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              exit={{ pathLength: 0, opacity: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            />
            {/* Origin dot at orb edge */}
            <motion.circle
              cx="0" cy="0" r="4"
              fill="rgba(245,130,32,0.7)"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1 }}
            />
          </svg>

          {/* Speech Bubble — larger and more prominent */}
          <motion.div
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, x: yarn.endX, y: yarn.endY }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.3 }}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
            }}
          >
            <motion.div
              initial={{ y: 12 }}
              animate={{ y: 0 }}
              exit={{ y: 10, opacity: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 24, delay: 0.05 }}
              style={{
                position: "absolute",
                left: 0,
                bottom: "22px",
                transform: yarn.side === "right"
                  ? `translateX(-${yarn.anchorInset}px)`
                  : `translateX(calc(-100% + ${yarn.anchorInset}px))`,
              }}
            >
              <div
                style={{
                  position: "relative",
                  padding: "13px 18px",
                  borderRadius: "20px",
                  background: "linear-gradient(135deg, rgba(245,130,32,0.12) 0%, rgba(139,92,246,0.08) 100%)",
                  border: "1.5px solid rgba(245,130,32,0.3)",
                  backdropFilter: "blur(20px)",
                  boxShadow: "0 0 30px rgba(245,130,32,0.1), 0 4px 20px rgba(0,0,0,0.3)",
                  whiteSpace: "normal",
                  maxWidth: "220px",
                }}
              >
                <p className="font-display" style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.92)", fontWeight: 600, lineHeight: 1.35, letterSpacing: "0.01em", textAlign: yarn.side === "right" ? "left" : "right" }}>
                  {message}
                </p>
                <div style={{
                  position: "absolute",
                  bottom: "-20px",
                  [yarn.side === "right" ? "right" : "left"]: `${yarn.anchorInset - 1}px`,
                  width: "2px",
                  height: "18px",
                  borderRadius: "999px",
                  background: "linear-gradient(180deg, rgba(245,130,32,0.55) 0%, rgba(245,130,32,0.22) 100%)",
                  boxShadow: "0 0 8px rgba(245,130,32,0.25)",
                }} />
                <div style={{
                  position: "absolute",
                  bottom: "-24px",
                  [yarn.side === "right" ? "right" : "left"]: `${yarn.anchorInset - 4}px`,
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "rgba(245,130,32,0.78)",
                  boxShadow: "0 0 10px rgba(245,130,32,0.45)",
                }} />
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
        )
      )}
    </AnimatePresence>
  );
}

// ─── Shader Burst (one-shot) ─────────────────────────────
function ShaderBurst({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 1200);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: "absolute", inset: "-50%", zIndex: 5, pointerEvents: "none" }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "120px",
            height: "120px",
            borderRadius: "50%",
            background: `radial-gradient(circle, rgba(245,130,32,${0.3 - i * 0.08}) 0%, rgba(139,92,246,${0.2 - i * 0.06}) 40%, transparent 70%)`,
            animation: `shaderBurst 1.2s ease-out ${i * 0.15}s forwards`,
          }}
        />
      ))}
    </motion.div>
  );
}

// ─── Blinding Flash Overlay ──────────────────────────────
function BlindingFlash({ onComplete, origin }: { onComplete: () => void; origin: FlashOrigin }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, FLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.12, 0.2, 0.14, 0] }}
        transition={{ duration: FLASH_DURATION_MS / 1000, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, rgba(176,255,240,0.05) 0%, rgba(232,255,250,0.18) 42%, rgba(255,246,232,0.08) 100%)",
        }}
      />
      <motion.div
        initial={{ scale: 0.08, opacity: 0.88 }}
        animate={{ scale: 15, opacity: 0 }}
        transition={{ duration: FLASH_DURATION_MS / 1000, ease: [0.2, 0.96, 0.22, 1] }}
        style={{
          position: "absolute",
          width: "28vmax",
          height: "28vmax",
          top: `${origin.y}px`,
          left: `${origin.x}px`,
          translate: "-50% -50%",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.96) 0%, rgba(226,255,244,0.94) 18%, rgba(168,255,214,0.78) 34%, rgba(88,240,172,0.42) 56%, rgba(88,240,172,0) 82%)",
          filter: "blur(4px)",
        }}
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.3, 0.46, 0.14, 0] }}
        transition={{ duration: FLASH_DURATION_MS / 1000, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(240,255,247,0.92)",
          mixBlendMode: "screen",
        }}
      />
      <motion.div
        initial={{ scaleX: 0, opacity: 0.18 }}
        animate={{ scaleX: [0, 0.76, 1, 1.08], opacity: [0.14, 0.24, 0.34, 0] }}
        transition={{ duration: FLASH_DURATION_MS / 1000, times: [0, 0.38, 0.72, 1], ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "absolute",
          inset: 0,
          transformOrigin: "50% 50%",
          background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(180,255,225,0.28) 30%, rgba(255,255,255,0.5) 50%, rgba(152,255,208,0.3) 70%, rgba(255,255,255,0) 100%)",
          filter: "blur(18px)",
        }}
      />
    </motion.div>
  );
}

// ═════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════
interface OnboardingFlowProps {
  stage: Stage;
}

export default function OnboardingFlow({ stage }: OnboardingFlowProps) {
  const navigate = useNavigate();
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);
  const [showBurst, setShowBurst] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [flashOrigin, setFlashOrigin] = useState<FlashOrigin>({
    x: typeof window === "undefined" ? 720 : window.innerWidth / 2,
    y: typeof window === "undefined" ? 450 : window.innerHeight / 2,
  });
  const [isJoined, setIsJoined] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isJoinScenePresented, setIsJoinScenePresented] = useState(false);
  const [isOrbReady, setIsOrbReady] = useState(false);
  const [viewport] = useState(() => ({
    width: typeof window === "undefined" ? 1440 : window.innerWidth,
    height: typeof window === "undefined" ? 900 : window.innerHeight,
  }));

  // Use ref + RAF for smooth orbital rotation (no re-render per frame)
  const angleRef = useRef(0);
  const orbitalRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const mobileAutoLookRafRef = useRef<number>(0);
  const lastTimeRef = useRef(0);
  const cursorPosRef = useRef({ x: 0, y: 0 });
  const lastInteractionPosRef = useRef({
    x: typeof window === "undefined" ? 720 : window.innerWidth / 2,
    y: typeof window === "undefined" ? 450 : window.innerHeight / 2,
  });
  const autoLookPausedUntilRef = useRef(0);
  const autoLookLastDispatchRef = useRef(0);
  const audioFadeFrameRef = useRef<number>(0);
  const audioFadeLastFrameRef = useRef(0);
  const joinFlashTimerRef = useRef<number | null>(null);
  const stageTimerRef = useRef<number | null>(null);
  const audioRestoreTimerRef = useRef<number | null>(null);
  const startPressLockRef = useRef(false);
  const isMobile = viewport.width <= 820;
  const isPhone = viewport.width <= 640;
  const isShortViewport = viewport.height <= 760;
  const orbitalFrameBudgetMs = isMobile ? 1000 / 42 : 1000 / 60;
  const idleLookFrameBudgetMs = isMobile ? 1000 / 32 : 1000 / 50;
  const audioFadeFrameBudgetMs = isMobile ? 1000 / 40 : 1000 / 60;
  const heroLayout = useMemo(() => {
    if (isMobile) {
      const aspectRatio = viewport.width / Math.max(viewport.height, 1);
      const aspectBias = Math.max(0.84, Math.min(1.02, aspectRatio / 0.6));
      const frameSize = Math.min(Math.max(viewport.width * 1.08, 360), 520);
      const orbitRadius = Math.min(Math.max(viewport.width * 0.36, 148), isPhone ? 176 : 194);
      const outerRing = Math.min(Math.max(viewport.width * 0.84, 296), 390);
      const middleRing = outerRing + (isPhone ? 28 : 40);
      const innerRing = outerRing - (isPhone ? 34 : 46);

      return {
        frameSize,
        orbitRadius,
        linkRadius: orbitRadius * 0.78,
        ambientGlowSize: Math.min(Math.max(viewport.width * 0.62, 220), 300),
        outerRing,
        middleRing,
        innerRing,
        highlightRing: outerRing + 14,
        orbitDotRadius: outerRing / 2,
        containerOffsetY: isShortViewport ? -70 : -54,
        startNodeSize: 56,
        otherNodeSize: 46,
        startHitboxSize: 196,
        otherHitboxSize: 54,
        bubbleMode: "floating" as const,
        rotationSpeed: 0.0105,
        gravityAmplitude: 5,
        footerBottom: "18px",
        tapHintVisible: false,
        splineZoom: Math.max(0.52, Math.min(0.62, (viewport.width / 420) * aspectBias)),
      };
    }

    return {
      frameSize: 800,
      orbitRadius: 300,
      linkRadius: 200,
      ambientGlowSize: 320,
      outerRing: 600,
      middleRing: 650,
      innerRing: 550,
      highlightRing: 612,
      orbitDotRadius: 300,
      containerOffsetY: -20,
      startNodeSize: 52,
      otherNodeSize: 44,
      startHitboxSize: 180,
      otherHitboxSize: 48,
      bubbleMode: "yarn" as const,
      rotationSpeed: 0.018,
      gravityAmplitude: 8,
      footerBottom: "32px",
      tapHintVisible: true,
      splineZoom: 1,
    };
  }, [isMobile, isPhone, isShortViewport, viewport.width]);
  const joinLayout = useMemo(() => {
    if (isMobile) {
      const aspectRatio = viewport.width / Math.max(viewport.height, 1);
      const aspectBias = Math.max(0.82, Math.min(1.02, aspectRatio / 0.6));
      return {
        overlayPosition: "top" as const,
        width: "min(94vw, 380px)",
        top: isShortViewport ? "max(18px, env(safe-area-inset-top))" : "max(24px, env(safe-area-inset-top))",
        targetZoom: Math.max(0.38, Math.min(0.48, (viewport.width / 520) * aspectBias)),
        entryZoom: 0.02,
      };
    }

    return {
      overlayPosition: "bottom" as const,
      width: "min(92vw, 540px)",
      bottom: "42px",
      targetZoom: 0.86,
      entryZoom: 0.03,
    };
  }, [isMobile, isShortViewport, viewport.width]);

  // Global cursor tracking for Spline + shining link
  useEffect(() => {
    const updatePointer = (x: number, y: number, shouldPauseAutoLook: boolean) => {
      cursorPosRef.current = { x, y };
      lastInteractionPosRef.current = { x, y };
      if (shouldPauseAutoLook) {
        autoLookPausedUntilRef.current = performance.now() + 2200;
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      updatePointer(e.clientX, e.clientY, isMobile && e.pointerType !== "mouse");
    };

    const handlePointerDown = (e: PointerEvent) => {
      updatePointer(e.clientX, e.clientY, isMobile);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerdown", handlePointerDown, { passive: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isMobile]);

  useEffect(() => {
    startPressLockRef.current = false;
    setHoveredNode(null);
    setShowBurst(false);
    setShowFlash(false);

    if (stage !== "glass-panel") {
      setIsJoinScenePresented(false);
      setIsJoined(false);
      setIsJoining(false);
    }
  }, [stage]);

  useEffect(() => {
    return () => {
      if (joinFlashTimerRef.current) window.clearTimeout(joinFlashTimerRef.current);
      if (stageTimerRef.current) window.clearTimeout(stageTimerRef.current);
      if (audioRestoreTimerRef.current) window.clearTimeout(audioRestoreTimerRef.current);
      if (mobileAutoLookRafRef.current) window.cancelAnimationFrame(mobileAutoLookRafRef.current);
      if (audioFadeFrameRef.current) window.cancelAnimationFrame(audioFadeFrameRef.current);
      audioFadeLastFrameRef.current = 0;
    };
  }, []);

  useEffect(() => {
    if (!isMobile || stage !== "orbital" || !isOrbReady) return;

    const animateIdleLook = (time: number) => {
      mobileAutoLookRafRef.current = window.requestAnimationFrame(animateIdleLook);

      if (document.visibilityState === "hidden") {
        return;
      }
      if (performance.now() < autoLookPausedUntilRef.current) {
        return;
      }
      if (time - autoLookLastDispatchRef.current < idleLookFrameBudgetMs) {
        return;
      }
      autoLookLastDispatchRef.current = time;

      const container = orbitalRef.current;
      const canvas = document.getElementById("hero-orb-canvas");
      if (!(canvas instanceof HTMLCanvasElement) || !container) {
        return;
      }

      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const horizontalTravel = rect.width * 0.2;
      const verticalTravel = rect.height * 0.045;
      const phase = time * 0.00118;
      const horizontalSwing = (Math.sin(phase) + Math.sin(phase * 2.35 + 0.72) * 0.32 + Math.sin(phase * 0.53 + 1.6) * 0.12) / 1.44;
      const verticalSwing = (Math.sin(phase * 0.9 + 0.4) * 0.7 + Math.sin(phase * 1.92 + 1.2) * 0.3) / 1.15;
      const clientX = centerX + horizontalSwing * horizontalTravel;
      const clientY = centerY - rect.height * 0.055 + verticalSwing * verticalTravel;

      cursorPosRef.current = { x: clientX, y: clientY };

      const pointerEventInit: PointerEventInit = {
        bubbles: true,
        cancelable: true,
        clientX,
        clientY,
        pointerId: 1,
        pointerType: "mouse",
      };

      canvas.dispatchEvent(new PointerEvent("pointermove", pointerEventInit));
      canvas.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, cancelable: true, clientX, clientY }));
    };

    mobileAutoLookRafRef.current = window.requestAnimationFrame(animateIdleLook);

    return () => {
      const canvas = document.getElementById("hero-orb-canvas");
      if (mobileAutoLookRafRef.current) {
        window.cancelAnimationFrame(mobileAutoLookRafRef.current);
        mobileAutoLookRafRef.current = 0;
      }
      autoLookLastDispatchRef.current = 0;
      autoLookPausedUntilRef.current = 0;
      if (canvas instanceof HTMLCanvasElement) {
        canvas.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true, pointerId: 1, pointerType: "mouse" }));
        canvas.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true, cancelable: true, pointerId: 1, pointerType: "mouse" }));
        canvas.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }));
        canvas.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true, cancelable: true }));
      }
    };
  }, [idleLookFrameBudgetMs, isMobile, isOrbReady, stage]);

  // Smooth orbital rotation via requestAnimationFrame
  useEffect(() => {
    if (stage !== "orbital") return;

    const container = orbitalRef.current;
    if (!container) return;

    const nodeEls = Array.from(container.querySelectorAll<HTMLElement>("[data-orbital-node]"));
    const linkEl = container.querySelector<HTMLElement>("[data-shining-link]");

      const animate = (time: number) => {
      if (document.visibilityState === "hidden") {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }
      if (lastTimeRef.current === 0) lastTimeRef.current = time;
      const delta = time - lastTimeRef.current;
      if (delta < orbitalFrameBudgetMs) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }
      lastTimeRef.current = time;

      angleRef.current = (angleRef.current + delta * heroLayout.rotationSpeed) % 360;

      // Directly update DOM positions — no React re-render needed
      if (container) {
        nodeEls.forEach((el) => {
          const index = parseInt(el.dataset.orbitalNode || "0", 10);
          const baseAngle = (index / NODES.length) * 360 + ORBIT_BASE_ANGLE;
          const angle = (baseAngle + angleRef.current) % 360;
          const radian = (angle * Math.PI) / 180;
          const radius = heroLayout.orbitRadius;
          const gravityOffset = Math.sin(time * 0.0016 + index * 0.85) * heroLayout.gravityAmplitude;

          const x = radius * Math.cos(radian);
          const y = radius * Math.sin(radian) + gravityOffset;
          const scale = 0.8 + 0.2 * ((1 + Math.sin(radian)) / 2);
          const opacity = 0.5 + 0.5 * ((1 + Math.sin(radian)) / 2);
          const z = Math.round(50 + 50 * Math.cos(radian));

          el.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
          el.style.opacity = String(opacity);
          el.style.zIndex = String(z);
        });

        // Update shining link — raycast from center through mouse, detect proximity to Start
        if (linkEl) {
          // Start node position (index 0)
          const startBaseAngle = (0 / NODES.length) * 360 + ORBIT_BASE_ANGLE + angleRef.current;
          const startRad = (startBaseAngle * Math.PI) / 180;
          const startX = heroLayout.linkRadius * Math.cos(startRad);
          const startY = heroLayout.linkRadius * Math.sin(startRad);

          // Mouse position relative to orbital center
          const rect = container.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const mx = cursorPosRef.current.x - cx;
          const my = cursorPosRef.current.y - cy;
          const mouseLen = Math.sqrt(mx * mx + my * my);

          if (mouseLen > 1) {
            // Normalized mouse ray direction
            const rdx = mx / mouseLen;
            const rdy = my / mouseLen;

            // Project Start node onto mouse ray (closest point on ray to Start)
            const dot = startX * rdx + startY * rdy;
            const projX = dot * rdx;
            const projY = dot * rdy;
            const perpDist = Math.sqrt((startX - projX) ** 2 + (startY - projY) ** 2);

            // Proximity: 0 when far (>80px), 1 when ray touches Start node
            const threshold = 80;
            const proximity = Math.max(0, 1 - perpDist / threshold);
            // Only show when ray is pointing TOWARD the Start (dot > 0)
            const brightness = dot > 0 ? proximity : 0;

            const linkDist = Math.sqrt(startX * startX + startY * startY);
            const linkAngle = Math.atan2(startY, startX) * (180 / Math.PI);

            linkEl.style.width = `${linkDist}px`;
            linkEl.style.transform = `rotate(${linkAngle}deg)`;
            linkEl.style.opacity = String(brightness * 0.9);
            linkEl.style.background = `linear-gradient(90deg, rgba(52,211,153,${brightness * 0.15}) 0%, rgba(52,211,153,${brightness * 0.5}) 40%, rgba(52,211,153,${brightness * 0.9}) 100%)`;
            linkEl.style.boxShadow = brightness > 0.3
              ? `0 0 ${6 + brightness * 20}px rgba(52,211,153,${brightness * 0.5}), 0 0 ${brightness * 40}px rgba(52,211,153,${brightness * 0.25})`
              : "none";
          } else {
            linkEl.style.opacity = "0";
          }
        }
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = 0;
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [heroLayout.linkRadius, heroLayout.orbitRadius, heroLayout.rotationSpeed, orbitalFrameBudgetMs, stage]);

  // Static initial position calculator (used for first render only)
  const getNodePosition = useCallback(
    (index: number) => {
      const baseAngle = (index / NODES.length) * 360 + ORBIT_BASE_ANGLE;
      const radian = (baseAngle * Math.PI) / 180;
      const radius = heroLayout.orbitRadius;

      return {
        x: radius * Math.cos(radian),
        y: radius * Math.sin(radian),
        scale: 0.82 + 0.18 * ((1 + Math.sin(radian)) / 2),
        opacity: 0.52 + 0.48 * ((1 + Math.sin(radian)) / 2),
        z: Math.round(50 + 50 * Math.cos(radian)),
      };
    },
    [heroLayout.orbitRadius]
  );

  const fadeSplineAudioTo = useCallback((targetVolume: number, durationMs: number) => {
    const howler = getSplineHowler();
    if (!howler) return;

    const currentVolume = Math.max(0, Math.min(1, Number(howler.volume()) || 1));
    const nextVolume = Math.max(0, Math.min(1, targetVolume));
    if (audioFadeFrameRef.current) {
      window.cancelAnimationFrame(audioFadeFrameRef.current);
      audioFadeFrameRef.current = 0;
    }
    audioFadeLastFrameRef.current = 0;

    if (durationMs <= 0 || Math.abs(nextVolume - currentVolume) < 0.001) {
      howler.volume(nextVolume);
      return;
    }

    const easeInOutSine = (value: number) => -(Math.cos(Math.PI * value) - 1) / 2;
    const startedAt = performance.now();

    const animateVolume = (time: number) => {
      if (audioFadeLastFrameRef.current !== 0 && time - audioFadeLastFrameRef.current < audioFadeFrameBudgetMs) {
        audioFadeFrameRef.current = window.requestAnimationFrame(animateVolume);
        return;
      }
      audioFadeLastFrameRef.current = time;
      const progress = Math.min(1, (time - startedAt) / durationMs);
      const eased = easeInOutSine(progress);
      const volume = currentVolume + (nextVolume - currentVolume) * eased;
      howler.volume(volume);

      if (progress < 1) {
        audioFadeFrameRef.current = window.requestAnimationFrame(animateVolume);
      } else {
        audioFadeFrameRef.current = 0;
        audioFadeLastFrameRef.current = 0;
      }
    };

    audioFadeFrameRef.current = window.requestAnimationFrame(animateVolume);
  }, [audioFadeFrameBudgetMs]);

  useEffect(() => {
    if (stage !== "qr-panels") return;

    audioRestoreTimerRef.current = window.setTimeout(() => {
      fadeSplineAudioTo(1, JOIN_AUDIO_RESTORE_MS);
    }, JOIN_AUDIO_RESTORE_DELAY_MS);

    return () => {
      if (audioRestoreTimerRef.current) {
        window.clearTimeout(audioRestoreTimerRef.current);
        audioRestoreTimerRef.current = null;
      }
    };
  }, [fadeSplineAudioTo, stage]);

  const handleStartClick = () => {
    if (startPressLockRef.current) return;
    startPressLockRef.current = true;
    autoLookPausedUntilRef.current = Number.MAX_SAFE_INTEGER;
    const heroCanvas = document.getElementById("hero-orb-canvas");
    if (mobileAutoLookRafRef.current) {
      window.cancelAnimationFrame(mobileAutoLookRafRef.current);
      mobileAutoLookRafRef.current = 0;
    }
    if (heroCanvas instanceof HTMLCanvasElement) {
      heroCanvas.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true, pointerId: 1, pointerType: "mouse" }));
      heroCanvas.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true, cancelable: true, pointerId: 1, pointerType: "mouse" }));
      heroCanvas.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }));
      heroCanvas.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true, cancelable: true }));
    }
    setIsJoined(false);
    setIsJoining(false);
    setIsJoinScenePresented(false);
    setShowFlash(false);
    setShowBurst(true);
    if (stageTimerRef.current) window.clearTimeout(stageTimerRef.current);
    stageTimerRef.current = window.setTimeout(() => {
      startTransition(() => navigate("/join"));
    }, START_TRANSITION_MS);
  };

  const handleJoinAction = (origin?: FlashOrigin) => {
    if (isJoining) return;
    setIsJoining(true);
    setIsJoined(true);
    const nextOrigin = origin ?? lastInteractionPosRef.current;
    setFlashOrigin(nextOrigin);
    if (joinFlashTimerRef.current) window.clearTimeout(joinFlashTimerRef.current);
    joinFlashTimerRef.current = window.setTimeout(() => {
      void preloadScanRoute().catch(() => {});
      void preloadScanStage().catch(() => {});
      fadeSplineAudioTo(0.04, JOIN_AUDIO_FADE_OUT_MS);
      setShowFlash(true);
    }, JOIN_ANIMATION_HOLD_MS);
  };

  const handleOrbPresented = useCallback(() => {
    setIsOrbReady(true);
  }, []);

  const handleJoinScenePresented = useCallback((_app: SplineApplication) => {
    setIsJoinScenePresented(true);
  }, []);

  const handleJoinSceneMouseDown = useCallback((event: SplineEvent) => {
    if (isJoining) return;

    const targetName = event.target?.name ?? "";
    const targetId = event.target?.id ?? "";

    if (JOIN_TRIGGER_NAMES.has(targetName) || JOIN_TRIGGER_IDS.has(targetId)) {
      handleJoinAction(lastInteractionPosRef.current);
    }
  }, [isJoining]);

  const handleFlashComplete = useCallback(() => {
    setShowFlash(false);
    startTransition(() => navigate("/scan"));
  }, [navigate]);

  return (
    <div style={{ position: "relative", zIndex: 1, width: "100%", height: "100svh", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", pointerEvents: "none" }}>
      {stage === "orbital" && <div className="hero-plasma-border-screen" />}
      {/* Spline 3D orb — full viewport, transparent bg, global cursor tracking */}
      {stage === "orbital" && (
        <SplineOrb
          canvasId="hero-orb-canvas"
          enableGlobalEvents
          visible
          fadeDurationMs={220}
          zIndex={0}
          targetZoom={heroLayout.splineZoom}
          onLoad={handleOrbPresented}
        />
      )}
      {stage === "glass-panel" && (
        <SplineOrb
          canvasId="join-keyboard-canvas"
          sceneUrl={JOIN_KEYBOARD_SCENE_URL}
          visible
          enableGlobalEvents={false}
          hideObjectIds={NO_HIDDEN_SPLINE_OBJECTS}
          hideObjects={NO_HIDDEN_SPLINE_OBJECTS}
          zIndex={1}
          fadeDurationMs={120}
          initialZoom={joinLayout.entryZoom}
          targetZoom={joinLayout.targetZoom}
          zoomTweenDurationMs={360}
          onPresented={handleJoinScenePresented}
          onMouseDown={handleJoinSceneMouseDown}
        />
      )}

      {showFlash && <BlindingFlash onComplete={handleFlashComplete} origin={flashOrigin} />}

      <AnimatePresence mode="wait">
        {/* ─── STAGE: ORBITAL ─── */}
        {stage === "orbital" && (
          <motion.div
            key={isMobile ? "orbital-mobile" : "orbital-desktop"}
            ref={orbitalRef}
            initial={isMobile ? { opacity: 0, y: 18, scale: 0.92 } : { opacity: 0, scale: 0.8 }}
            animate={isMobile ? { opacity: isOrbReady ? 1 : 0, y: isOrbReady ? 0 : 18, scale: isOrbReady ? 1 : 0.92 } : { opacity: isOrbReady ? 1 : 0, scale: isOrbReady ? 1 : 0.8 }}
            exit={isMobile ? { opacity: 0, y: 18, scale: 0.95, filter: "blur(18px)", transition: { duration: 0.45, ease: "easeInOut" } } : { opacity: 0, scale: 0.3, filter: "blur(20px)", transition: { duration: 0.6, ease: "easeInOut" } }}
            transition={{ duration: isMobile ? 0.65 : 0.8, ease: "easeOut" }}
            style={{
              position: "relative",
              width: isMobile ? "100%" : `${heroLayout.frameSize}px`,
              height: isMobile ? "100%" : `${heroLayout.frameSize}px`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
              zIndex: 3,
              marginTop: isMobile ? 0 : `${heroLayout.containerOffsetY}px`,
            }}
          >
            {isMobile && (
              <div
                style={{
                  position: "absolute",
                  top: "max(26px, env(safe-area-inset-top))",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "min(88vw, 340px)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "8px",
                  textAlign: "center",
                  pointerEvents: "none",
                  zIndex: 4,
                }}
              >
                <div style={{ fontSize: "0.66rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 700 }}>
                  Treasure Hunt
                </div>
                <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.66)", lineHeight: 1.55 }}>
                  Tap the glowing start node to enter the hunt.
                </p>
              </div>
            )}
            {/* Ambient glow behind the orb */}
            <div style={{
              position: "absolute",
              width: `${heroLayout.ambientGlowSize}px`,
              height: `${heroLayout.ambientGlowSize}px`,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(245,130,32,0.12) 0%, rgba(139,92,246,0.06) 40%, transparent 70%)",
              animation: "orbGlow 5s ease-in-out infinite",
              pointerEvents: "none",
              zIndex: 0,
            }} />

            <div style={{ position: "absolute", width: `${heroLayout.outerRing}px`, height: `${heroLayout.outerRing}px`, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.14)", animation: "ringPulse 4s ease-in-out infinite", boxShadow: "0 0 28px rgba(245,130,32,0.06), inset 0 0 24px rgba(245,130,32,0.03)" }} />
            <div style={{ position: "absolute", width: `${heroLayout.middleRing}px`, height: `${heroLayout.middleRing}px`, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.08)", animation: "ringPulse 4s ease-in-out infinite 2s", boxShadow: "0 0 24px rgba(96,165,250,0.03)" }} />
            <div style={{ position: "absolute", width: `${heroLayout.innerRing}px`, height: `${heroLayout.innerRing}px`, borderRadius: "50%", border: "1px dashed rgba(255,255,255,0.08)" }} />
            <div
              style={{
                position: "absolute",
                width: `${heroLayout.highlightRing}px`,
                height: `${heroLayout.highlightRing}px`,
                borderRadius: "50%",
                background: "conic-gradient(from 0deg, rgba(245,130,32,0) 0deg, rgba(245,130,32,0.26) 44deg, rgba(245,130,32,0) 88deg, rgba(96,165,250,0) 180deg, rgba(96,165,250,0.18) 228deg, rgba(96,165,250,0) 272deg, rgba(245,130,32,0) 360deg)",
                filter: "blur(10px)",
                opacity: 0.55,
                pointerEvents: "none",
                animation: "ringSweep 18s linear infinite",
                WebkitMask: `radial-gradient(circle, transparent 0 ${Math.round(heroLayout.highlightRing / 2 - 18)}px, black ${Math.round(heroLayout.highlightRing / 2 - 8)}px ${Math.round(heroLayout.highlightRing / 2 - 2)}px, transparent ${Math.round(heroLayout.highlightRing / 2 + 6)}px)`,
                mask: `radial-gradient(circle, transparent 0 ${Math.round(heroLayout.highlightRing / 2 - 18)}px, black ${Math.round(heroLayout.highlightRing / 2 - 8)}px ${Math.round(heroLayout.highlightRing / 2 - 2)}px, transparent ${Math.round(heroLayout.highlightRing / 2 + 6)}px)`,
              }}
            />

            {/* Animated orbit dots — tiny particles orbiting on the ring track */}
            {Array.from({ length: isMobile ? 2 : 3 }, (_, i) => i).map((i) => (
              <div
                key={`orbit-dot-${i}`}
                style={{
                  position: "absolute",
                  width: "3px",
                  height: "3px",
                  borderRadius: "50%",
                  background: i % 2 === 0 ? "rgba(245,130,32,0.5)" : "rgba(139,92,246,0.4)",
                  boxShadow: `0 0 6px ${i % 2 === 0 ? "rgba(245,130,32,0.3)" : "rgba(139,92,246,0.3)"}`,
                  animation: `orbitDot ${16 + i * 3}s linear infinite`,
                  animationDelay: `${i * -2}s`,
                  transformOrigin: `${heroLayout.orbitDotRadius}px 0`,
                  top: "50%",
                  left: "50%",
                  marginLeft: "-1.5px",
                  marginTop: "-1.5px",
                }}
              />
            ))}

            <OrbSpeechBubble
              mobile={heroLayout.bubbleMode === "floating"}
              mobileTopOffset={`calc(50% + ${Math.round(heroLayout.frameSize * 0.22)}px)`}
            />

            {/* Shining link — from center to Start node, updated by RAF */}
            <div
              data-shining-link
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: "200px",
                height: "2px",
                transformOrigin: "0 50%",
                transform: "rotate(0deg)",
                background: "linear-gradient(90deg, rgba(52,211,153,0.3) 0%, rgba(52,211,153,0.6) 60%, rgba(52,211,153,0.8) 100%)",
                boxShadow: "0 0 12px rgba(52,211,153,0.3)",
                pointerEvents: "none",
                opacity: 0.5,
                zIndex: 1,
              }}
            />

            {/* Orbital nodes — positioned by RAF, initial positions from getNodePosition */}
            {NODES.map((node, index) => {
              const pos = getNodePosition(index);
              const isStart = index === 0;
              const isHovered = hoveredNode === node.id;
              const Icon = node.icon;
              return (
                <div
                  key={node.id}
                  data-orbital-node={index}
                  onPointerEnter={() => setHoveredNode(node.id)}
                  onPointerLeave={() => setHoveredNode(null)}
                    style={{
                      position: "absolute",
                      transform: `translate(${pos.x}px, ${pos.y}px) scale(${pos.scale})`,
                    opacity: pos.opacity,
                    zIndex: isHovered ? 100 : pos.z,
                    cursor: isStart ? "pointer" : "default",
                    pointerEvents: "auto",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: isMobile ? "6px" : "8px",
                    }}
                >
                  <div
                    style={{
                      position: "relative",
                      width: `${isStart ? heroLayout.startNodeSize : heroLayout.otherNodeSize}px`,
                      height: `${isStart ? heroLayout.startNodeSize : heroLayout.otherNodeSize}px`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {isStart && (
                      <div style={{ position: "absolute", width: isMobile ? "78px" : "72px", height: isMobile ? "78px" : "72px", borderRadius: "50%", background: `radial-gradient(circle, ${node.glowColor} 0%, transparent 70%)`, animation: "greenBreath 3s ease-in-out infinite", top: "50%", left: "50%", transform: "translate(-50%, -50%)", pointerEvents: "none" }} />
                    )}
                    {!isStart && (
                      <div
                        style={{
                          position: "absolute",
                          width: isMobile ? "54px" : "60px",
                          height: isMobile ? "54px" : "60px",
                          borderRadius: "50%",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                          background: `radial-gradient(circle, ${isHovered ? node.glowColor : "rgba(255,255,255,0.06)"} 0%, transparent 72%)`,
                          opacity: isHovered ? 0.58 : 0.22,
                          transition: "opacity 0.24s ease, background 0.24s ease",
                          pointerEvents: "none",
                        }}
                      />
                    )}

                    {isStart && (
                      <button
                        type="button"
                        aria-label="Start treasure hunt"
                        onPointerDown={(event) => {
                          if (event.pointerType !== "mouse") {
                            event.preventDefault();
                            handleStartClick();
                          }
                        }}
                        onClick={handleStartClick}
                        onPointerEnter={() => setHoveredNode(node.id)}
                        onPointerLeave={() => setHoveredNode(null)}
                        onFocus={() => setHoveredNode(node.id)}
                        onBlur={() => setHoveredNode(null)}
                        style={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          width: `${heroLayout.startHitboxSize}px`,
                          height: `${heroLayout.startHitboxSize}px`,
                          transform: "translate(-50%, -50%)",
                          borderRadius: "50%",
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          opacity: 0,
                          pointerEvents: "auto",
                          touchAction: "manipulation",
                          WebkitTapHighlightColor: "transparent",
                          zIndex: 4,
                        }}
                      />
                    )}

                    <div
                      style={{
                        width: `${isStart ? heroLayout.startNodeSize : heroLayout.otherNodeSize}px`,
                        height: `${isStart ? heroLayout.startNodeSize : heroLayout.otherNodeSize}px`,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: isStart
                          ? "linear-gradient(145deg, rgba(52,211,153,0.24) 0%, rgba(52,211,153,0.07) 100%)"
                          : `linear-gradient(145deg, rgba(255,255,255,0.1) 0%, rgba(15,22,40,0.88) 100%), radial-gradient(circle at 30% 25%, ${node.glowColor} 0%, rgba(255,255,255,0) 65%)`,
                        border: `1.5px solid ${isStart ? "rgba(52,211,153,0.56)" : isHovered ? "rgba(255,255,255,0.32)" : "rgba(255,255,255,0.16)"}`,
                        backdropFilter: "blur(10px)",
                        boxShadow: isStart
                          ? "0 0 28px rgba(52,211,153,0.22), inset 0 1px 2px rgba(255,255,255,0.1)"
                          : isHovered
                            ? `0 0 24px ${node.glowColor}, inset 0 1px 4px rgba(255,255,255,0.12)`
                            : `0 0 16px rgba(255,255,255,0.04), inset 0 1px 2px rgba(255,255,255,0.08)`,
                        animation: isStart ? "greenBreath 3s ease-in-out infinite" : undefined,
                        transition: "border-color 0.24s ease, box-shadow 0.24s ease, transform 0.24s ease",
                        transform: isHovered ? "translateY(-2px) scale(1.04)" : "translateY(0) scale(1)",
                      }}
                    >
                      <Icon size={isStart ? (isMobile ? 20 : 22) : (isMobile ? 16 : 18)} color={node.color} strokeWidth={1.6} />
                    </div>
                  </div>

                  {/* Label */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", maxWidth: isMobile ? "76px" : undefined }}>
                    <span className="font-display" style={{ fontSize: isStart ? (isMobile ? "0.68rem" : "0.78rem") : (isMobile ? "0.62rem" : "0.7rem"), fontWeight: 600, color: isStart ? "rgba(52,211,153,0.95)" : isHovered ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.62)", letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap", textShadow: isStart ? "0 0 12px rgba(52,211,153,0.3)" : isHovered ? `0 0 14px ${node.glowColor}` : "none" }}>
                      {node.label}
                    </span>
                    {(isHovered || isStart) && !isMobile && (
                      <motion.span initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} style={{ fontSize: "0.62rem", color: "var(--text-muted)", whiteSpace: "nowrap", letterSpacing: "0.02em" }}>
                        {node.sublabel}
                      </motion.span>
                    )}
                  </div>

                  {/* TAP hint for Start */}
                  {isStart && heroLayout.tapHintVisible && (
                    <motion.div
                      animate={{ opacity: [0.4, 0.9, 0.4] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                      style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "4px", padding: "4px 10px", borderRadius: "var(--radius-full)", background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.15)" }}
                    >
                      <span style={{ fontSize: "0.58rem", color: "rgba(52,211,153,0.8)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>TAP</span>
                      <ChevronRight size={10} color="rgba(52,211,153,0.7)" />
                    </motion.div>
                  )}
                </div>
              );
            })}

            {showBurst && <ShaderBurst onComplete={() => setShowBurst(false)} />}
          </motion.div>
        )}

        {/* ─── STAGE: JOIN SCREEN ─── */}
        {stage === "glass-panel" && (
          <motion.div
            key={isMobile ? "glass-panel-mobile" : "glass-panel-desktop"}
            initial={isMobile ? { opacity: 0, y: 18 } : { opacity: 0, scale: 0.96 }}
            animate={isMobile ? { opacity: 1, y: 0 } : { opacity: 1, scale: 1 }}
            exit={isMobile ? { opacity: 0, y: 18, transition: { duration: 0.35, ease: "easeInOut" } } : { opacity: 0, scale: 1.04, transition: { duration: 0.45, ease: "easeInOut" } }}
            transition={{ duration: isMobile ? 0.55 : 0.7, ease: "easeOut" }}
            style={{ position: "relative", width: "100%", height: "100svh", minHeight: "100vh", overflow: "hidden", pointerEvents: "none" }}
          >
            <AnimatePresence>
              {!isJoinScenePresented && (
                <motion.div
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.18, ease: "easeOut" } }}
                  style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 5,
                    pointerEvents: "none",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "radial-gradient(circle at 50% 38%, rgba(84,255,224,0.05) 0%, rgba(6,10,20,0) 26%), linear-gradient(180deg, rgba(2,4,9,0.68) 0%, rgba(6,11,21,0.88) 100%)",
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.7, ease: "easeOut" }}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: joinLayout.overlayPosition === "top" ? joinLayout.top : undefined,
                bottom: joinLayout.overlayPosition === "bottom" ? joinLayout.bottom : undefined,
                display: "flex",
                justifyContent: "center",
                pointerEvents: "none",
                zIndex: 3,
                padding: isMobile ? "0 14px" : undefined,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: isMobile ? "10px" : "14px",
                  width: joinLayout.width,
                  pointerEvents: "none",
                  textAlign: "center",
                  opacity: isJoinScenePresented ? 1 : 0,
                  transition: "opacity 0.24s ease",
                  padding: isMobile ? "14px 16px" : undefined,
                  borderRadius: isMobile ? "24px" : undefined,
                  background: isMobile ? "linear-gradient(180deg, rgba(8,12,24,0.7) 0%, rgba(8,12,24,0.4) 100%)" : undefined,
                  backdropFilter: isMobile ? "blur(12px)" : undefined,
                  border: isMobile ? "1px solid rgba(255,255,255,0.08)" : undefined,
                }}
              >
                <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.42)", letterSpacing: "0.28em", textTransform: "uppercase", fontWeight: 700 }}>
                  Crest Link
                </div>
                <FluidTextMorph
                  wordPairs={[JOIN_STATUS_PAIR]}
                  active={isJoined}
                  className={`font-pixel pointer-events-none cursor-default select-none ${isMobile ? "text-[clamp(1.8rem,10vw,2.8rem)]" : "text-[clamp(2.2rem,5vw,4.4rem)]"} leading-none tracking-[0.18em]`}
                  animationProps={{
                    initialColor: "rgba(255,255,255,0.25)",
                    animateColor: isJoined ? "rgba(52,211,153,0.96)" : "rgba(255,255,255,0.92)",
                    exitColor: "rgba(245,130,32,0.58)",
                    enterDelayStep: 0.024,
                    exitDelayStep: 0.018,
                    stiffness: 240,
                    damping: 18,
                  }}
                />
                <p style={{ fontSize: isMobile ? "0.73rem" : "0.78rem", color: isJoined ? "rgba(52,211,153,0.78)" : "rgba(255,255,255,0.54)", lineHeight: 1.6, maxWidth: isMobile ? "280px" : "340px", textShadow: "0 0 20px rgba(0,0,0,0.25)" }}>
                  {isJoined
                    ? "Joined. Opening the scanner gate."
                    : "Press the crest key on the keyboard to join and open the scanner gate."}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ─── STAGE: QR PANELS ─── */}
        {stage === "qr-panels" && (
          <Suspense fallback={null}>
            <QRCheckinStage isMobile={isMobile} />
          </Suspense>
        )}
      </AnimatePresence>

      {/* Orbital loading state — shown while SplineOrb loads */}
      <AnimatePresence>
        {stage === "orbital" && !isOrbReady && (
          <motion.div
            key="orb-loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.5 } }}
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "16px",
              pointerEvents: "none",
              zIndex: 5,
            }}
          >
            <motion.div
              animate={{ scale: [0.9, 1.05, 0.9], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                border: "1.5px solid rgba(245,130,32,0.2)",
                boxShadow: "0 0 40px rgba(245,130,32,0.06)",
              }}
            />
            <p style={{ fontSize: "0.7rem", color: "var(--text-ghost)", letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 600 }}>
              Summoning the Orb...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom hint text */}
      <AnimatePresence>
        {stage === "orbital" && (
          <motion.footer
            initial={{ opacity: 0 }}
            animate={{ opacity: isOrbReady ? 1 : 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: isOrbReady ? 0.5 : 0 }}
            style={{ position: "fixed", bottom: heroLayout.footerBottom, left: 0, right: 0, textAlign: "center", pointerEvents: "none", zIndex: 5, padding: isMobile ? "0 18px" : undefined }}
          >
            <p style={{ fontSize: isMobile ? "0.68rem" : "0.72rem", color: "var(--text-ghost)", fontWeight: 400, letterSpacing: "0.06em" }}>
              Tap the <span style={{ color: "rgba(52,211,153,0.7)", fontWeight: 600 }}>Start</span> node to begin
            </p>
          </motion.footer>
        )}
      </AnimatePresence>
    </div>
  );
}
