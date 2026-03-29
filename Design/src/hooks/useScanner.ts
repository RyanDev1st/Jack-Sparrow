import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import { buildCenteredScanRegion, SCANNER_CONFIG, SCANNER_PULSE } from '../lib/scannerConfig';
import { scannerHint } from './scannerUtils';
import { useScannerLifecycle } from './useScannerLifecycle';

export type ScannerStatus = 'idle' | 'scanning' | 'success' | 'error';

export type ScannerPayloadOutcome = {
  isCorrect: boolean;
  continueScanning?: boolean;
  message?: string;
  title?: string;
  locationName?: string;
  icon?: string;
};

type UseScannerOptions = {
  onPayload: (rawText: string) => Promise<boolean | void | ScannerPayloadOutcome> | boolean | void | ScannerPayloadOutcome;
  fps?: number;
};

type DecodeSource = 'live' | 'manual-snap';

const LOCK_TIMEOUT_MS = 5000;
const IDLE_MANUAL_SNAP_MS = 3000;
const PAYLOAD_HANDLER_TIMEOUT_MS = 9000;
const DUPLICATE_PAYLOAD_WINDOW_MS = 1400;

const clearTimeoutRef = (ref: { current: number | null }) => {
  if (ref.current !== null) {
    window.clearTimeout(ref.current);
    ref.current = null;
  }
};

const isNoQrError = (error: unknown) => {
  const message = String(error ?? '').toLowerCase();
  return message.includes('no qr code found');
};

export function useScanner({ onPayload, fps = SCANNER_CONFIG.fps }: UseScannerOptions) {
  const regionId = useMemo(() => `qr-region-${Math.random().toString(36).slice(2, 10)}`, []);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mountedRef = useRef(true);
  const secureTransportBlockedRef = useRef(false);
  const isStartingRef = useRef(false);
  const statusRef = useRef<ScannerStatus>('idle');

  const streamRef = useRef<MediaStream | null>(null);
  const liveScannerRef = useRef<QrScanner | null>(null);
  const decodeTimerRef = useRef<number | null>(null);
  const decodeBusyRef = useRef(false);
  const findingTimerRef = useRef<number | null>(null);
  const lockTimerRef = useRef<number | null>(null);
  const idleSnapTimerRef = useRef<number | null>(null);

  const captureTickRef = useRef(0);
  const decodeTickRef = useRef(0);
  const videoFrameCallbackIdRef = useRef<number | null>(null);
  const videoFrameRafIdRef = useRef<number | null>(null);

  const onPayloadRef = useRef(onPayload);
  const payloadInFlightRef = useRef(false);
  const scannerPausedRef = useRef(false);
  const scanFeedbackVisibleRef = useRef(false);

  const lastPayloadRef = useRef('');
  const lastPayloadAtRef = useRef(0);

  const [status, setStatus] = useState<ScannerStatus>('idle');
  const [errorHint, setErrorHint] = useState('Camera failed to initialize. Tap to retry.');
  const [activeCameraLabel, setActiveCameraLabel] = useState('none');
  const [manualSnapVisible, setManualSnapVisible] = useState(false);
  const [isFinding, setIsFinding] = useState(false);
  const [captureFps, setCaptureFps] = useState(0);
  const [decodeFps, setDecodeFps] = useState(0);
  const [decodeRttMs, setDecodeRttMs] = useState(0);
  const [scanFeedback, setScanFeedback] = useState<{
    visible: boolean;
    isCorrect: boolean;
    title: string;
    locationName: string;
    message: string;
    continueScanning: boolean;
    icon?: string;
  } | null>(null);

  useEffect(() => {
    onPayloadRef.current = onPayload;
  }, [onPayload]);

  useEffect(() => {
    scanFeedbackVisibleRef.current = Boolean(scanFeedback?.visible);
  }, [scanFeedback?.visible]);

  const setStatusSafe = useCallback((next: ScannerStatus) => {
    if (!mountedRef.current) return;
    statusRef.current = next;
    setStatus(next);
  }, []);

  const stopVideoHeartbeat = useCallback(() => {
    const video = videoRef.current as (HTMLVideoElement & { cancelVideoFrameCallback?: (handle: number) => void }) | null;
    if (video && typeof video.cancelVideoFrameCallback === 'function' && videoFrameCallbackIdRef.current !== null) {
      try { video.cancelVideoFrameCallback(videoFrameCallbackIdRef.current); } catch {}
    }
    if (videoFrameRafIdRef.current !== null) {
      window.cancelAnimationFrame(videoFrameRafIdRef.current);
      videoFrameRafIdRef.current = null;
    }
    videoFrameCallbackIdRef.current = null;
  }, []);

  const startVideoHeartbeat = useCallback((video: HTMLVideoElement) => {
    stopVideoHeartbeat();
    const withCb = video as HTMLVideoElement & {
      requestVideoFrameCallback?: (callback: () => void) => number;
    };

    if (typeof withCb.requestVideoFrameCallback === 'function') {
      const tick = () => {
        if (!mountedRef.current) return;
        if (statusRef.current === 'scanning') captureTickRef.current += 1;
        videoFrameCallbackIdRef.current = withCb.requestVideoFrameCallback!(tick);
      };
      videoFrameCallbackIdRef.current = withCb.requestVideoFrameCallback(tick);
      return;
    }

    const loop = () => {
      if (!mountedRef.current) return;
      if (statusRef.current === 'scanning') captureTickRef.current += 1;
      videoFrameRafIdRef.current = window.requestAnimationFrame(loop);
    };
    videoFrameRafIdRef.current = window.requestAnimationFrame(loop);
  }, [stopVideoHeartbeat]);

  const armScanLockTimer = useCallback(() => {
    clearTimeoutRef(lockTimerRef);
    lockTimerRef.current = window.setTimeout(() => {
      if (mountedRef.current && statusRef.current === 'scanning') setManualSnapVisible(true);
    }, LOCK_TIMEOUT_MS);
  }, []);

  const markFindingPulse = useCallback(() => {
    if (!mountedRef.current || statusRef.current !== 'scanning') return;
    setIsFinding(true);
    clearTimeoutRef(findingTimerRef);
    findingTimerRef.current = window.setTimeout(() => {
      if (mountedRef.current) setIsFinding(false);
    }, 120);
  }, []);

  const clearDecodeEngines = useCallback(() => {
    if (liveScannerRef.current) {
      try {
        liveScannerRef.current.stop();
        liveScannerRef.current.destroy();
      } catch {}
      liveScannerRef.current = null;
    }

    if (decodeTimerRef.current !== null) {
      window.clearInterval(decodeTimerRef.current);
      decodeTimerRef.current = null;
    }

    decodeBusyRef.current = false;
  }, []);

  const stopAndClearScanner = useCallback(() => {
    clearDecodeEngines();

    stopVideoHeartbeat();
    clearTimeoutRef(lockTimerRef);
    clearTimeoutRef(idleSnapTimerRef);
    clearTimeoutRef(findingTimerRef);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      try { videoRef.current.pause(); } catch {}
      videoRef.current.srcObject = null;
    }

    payloadInFlightRef.current = false;
    scannerPausedRef.current = false;
    setIsFinding(false);
    captureTickRef.current = 0;
    decodeTickRef.current = 0;
    setCaptureFps(0);
    setDecodeFps(0);
    setDecodeRttMs(0);
    setScanFeedback(null);
  }, [clearDecodeEngines, stopVideoHeartbeat]);

  const handleDecoded = useCallback(async (decodedText: string, source: DecodeSource) => {
    const now = performance.now();
    const payload = decodedText.trim();

    if (!payload || payload.length > 512) return;
    if (scanFeedbackVisibleRef.current) return;
    if (payloadInFlightRef.current) return;
    if (payload === lastPayloadRef.current && now - lastPayloadAtRef.current < DUPLICATE_PAYLOAD_WINDOW_MS) return;

    payloadInFlightRef.current = true;
    lastPayloadRef.current = payload;
    lastPayloadAtRef.current = now;

    scannerPausedRef.current = true;
    clearDecodeEngines();
    clearTimeoutRef(lockTimerRef);
    setManualSnapVisible(false);
    setIsFinding(false);
    setStatusSafe('success');

    const payloadResult = async () => Promise.resolve(onPayloadRef.current(payload));
    const timedPayloadResult = async () => {
      let timeoutId: number | null = null;
      const timeout = new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(() => reject(new Error('Payload processing timeout.')), PAYLOAD_HANDLER_TIMEOUT_MS);
      });

      try {
        return await Promise.race([payloadResult(), timeout]);
      } finally {
        if (timeoutId !== null) window.clearTimeout(timeoutId);
      }
    };

    try {
      const handlerOutcome = await timedPayloadResult();

      let isCorrect = true;
      let continueScanning = true;
      let title = source === 'manual-snap' ? 'Manual Scan Processed' : 'Location Scan Processed';
      let locationName = 'Unknown Location';
      let message = source === 'manual-snap' ? 'Manual snap processed.' : 'Scan processed.';
      let icon = '✓';

      if (typeof handlerOutcome === 'object' && handlerOutcome !== null) {
        isCorrect = Boolean(handlerOutcome.isCorrect);
        continueScanning = handlerOutcome.continueScanning !== false;
        if (handlerOutcome.message) message = handlerOutcome.message;
        if (handlerOutcome.title) title = handlerOutcome.title;
        if (handlerOutcome.locationName) locationName = handlerOutcome.locationName;
        if (handlerOutcome.icon) icon = handlerOutcome.icon;
      } else if (handlerOutcome === false) {
        continueScanning = false;
      }

      if (!isCorrect && !icon) icon = '!';

      if (!mountedRef.current) return;

      setScanFeedback({
        visible: true,
        isCorrect,
        title,
        locationName,
        message,
        continueScanning,
        icon,
      });
    } catch {
      if (!mountedRef.current) return;
      setScanFeedback({
        visible: true,
        isCorrect: false,
        title: 'Validation Delayed',
        locationName: 'Unknown Location',
        message: 'Network validation delayed. Tap Okay to resume scanner and retry.',
        continueScanning: true,
        icon: '!',
      });
    } finally {
      payloadInFlightRef.current = false;
    }
  }, [clearDecodeEngines, setStatusSafe]);

  const startDecodeRuntime = useCallback(async (video: HTMLVideoElement, host: string) => {
    clearDecodeEngines();

    const startFallbackDecodeLoop = () => {
      const decodeIntervalMs = Math.max(90, Math.round(1000 / Math.max(4, Math.min(16, fps))));
      decodeTimerRef.current = window.setInterval(() => {
        void (async () => {
          if (!mountedRef.current || statusRef.current !== 'scanning' || scannerPausedRef.current) return;
          if (decodeBusyRef.current || payloadInFlightRef.current) return;
          if (!videoRef.current || videoRef.current.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;

          decodeBusyRef.current = true;
          decodeTickRef.current += 1;
          const startedAt = performance.now();
          try {
            const result = await QrScanner.scanImage(videoRef.current, {
              returnDetailedScanResult: true,
              alsoTryWithoutScanRegion: true,
            });
            const text = result?.data?.trim() ?? '';
            if (text) {
              setDecodeRttMs(Math.round(performance.now() - startedAt));
              await handleDecoded(text, 'live');
            } else {
              markFindingPulse();
            }
          } catch (error) {
            if (!isNoQrError(error)) {
              setErrorHint('Scanner decode failed. Try better lighting or move closer to the code.');
            }
            markFindingPulse();
          } finally {
            decodeBusyRef.current = false;
          }
        })();
      }, decodeIntervalMs);
    };

    const isLocalHttp =
      window.location.protocol === 'http:' &&
      (host === 'localhost' || host === '127.0.0.1' || host === '::1');

    if (isLocalHttp) {
      startFallbackDecodeLoop();
      return;
    }

    const decodeStartedAtRef = { current: 0 };
    const scanner = new QrScanner(
      video,
      (result) => {
        void (async () => {
          if (scannerPausedRef.current) return;

          const startedAt = decodeStartedAtRef.current;
          decodeTickRef.current += 1;
          decodeStartedAtRef.current = 0;

          const text = result?.data?.trim() ?? '';
          if (!text) {
            markFindingPulse();
            return;
          }

          if (startedAt > 0) setDecodeRttMs(Math.round(performance.now() - startedAt));
          await handleDecoded(text, 'live');
        })();
      },
      {
        preferredCamera: 'environment',
        maxScansPerSecond: Math.max(8, Math.min(25, fps)),
        returnDetailedScanResult: true,
        highlightCodeOutline: false,
        highlightScanRegion: false,
        onDecodeError: (error) => {
          if (scannerPausedRef.current) return;

          decodeTickRef.current += 1;
          if (!isNoQrError(error)) {
            setErrorHint('Scanner decode failed. Try better lighting or move closer to the code.');
          }
          markFindingPulse();
        },
        calculateScanRegion: (videoElement) => {
          decodeStartedAtRef.current = performance.now();
          return buildCenteredScanRegion(videoElement.videoWidth, videoElement.videoHeight);
        },
      },
    );

    liveScannerRef.current = scanner;
    await scanner.start();
  }, [clearDecodeEngines, fps, handleDecoded, markFindingPulse]);

  const startScanner = useCallback(async () => {

    if (streamRef.current || decodeTimerRef.current !== null || statusRef.current === 'scanning') {
      return;
    }
    if (isStartingRef.current || secureTransportBlockedRef.current) return;

    const video = videoRef.current;
    if (!video) {
      setErrorHint('Scanner video element is not ready.');
      setStatusSafe('error');
      return;
    }

    const host = window.location.hostname;
    const secureOrigin =
      window.location.protocol === 'https:' ||
      window.isSecureContext ||
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1';

    if (!secureOrigin) {
      setErrorHint('Camera requires HTTPS (or localhost). Open this app on a secure origin, then retry.');
      setStatusSafe('error');
      return;
    }

    isStartingRef.current = true;

    try {
      stopAndClearScanner();
      setManualSnapVisible(false);
      setErrorHint('Camera failed to initialize. Tap to retry.');

      const constraints: MediaTrackConstraints = {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30, max: 30 },
        facingMode: { ideal: 'environment' },
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: constraints, audio: false });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;
      video.srcObject = stream;
      await video.play();

      const firstTrack = stream.getVideoTracks()[0];
      const label = firstTrack?.label?.trim() || 'camera';
      setActiveCameraLabel(label);
      setStatusSafe('scanning');
      startVideoHeartbeat(video);
      armScanLockTimer();
      await startDecodeRuntime(video, host);
    } catch (error) {
      setErrorHint(scannerHint(error));
      setStatusSafe('error');
      setManualSnapVisible(true);
      stopAndClearScanner();
    } finally {
      isStartingRef.current = false;
    }
  }, [armScanLockTimer, setStatusSafe, startDecodeRuntime, startVideoHeartbeat, stopAndClearScanner]);

  const pauseScanner = useCallback(() => {
    scannerPausedRef.current = true;
    clearDecodeEngines();
  }, [clearDecodeEngines]);

  const resumeScanner = useCallback(async () => {
    if (!mountedRef.current) return;

    // eslint-disable-next-line no-console
    console.debug('[scanner] resume requested', {
      status: statusRef.current,
      paused: scannerPausedRef.current,
      hasStream: Boolean(streamRef.current),
      hasLiveScanner: Boolean(liveScannerRef.current),
      hasDecodeTimer: Boolean(decodeTimerRef.current),
    });

    scannerPausedRef.current = false;
    const video = videoRef.current;
    const host = window.location.hostname;

    if (!video || !streamRef.current) {
      void startScanner();
      return;
    }

    if (video.paused) {
      try {
        await video.play();
      } catch {
        // eslint-disable-next-line no-console
        console.debug('[scanner] resume video.play() failed, falling back to scanner restart path if needed');
      }
    }

    setStatusSafe('scanning');
    armScanLockTimer();

    try {
      await startDecodeRuntime(video, host);
      // eslint-disable-next-line no-console
      console.debug('[scanner] resume started decode runtime');
    } catch {
      setErrorHint('Unable to resume scanner. Tap retry to continue.');
      setStatusSafe('error');
      setManualSnapVisible(true);
      // eslint-disable-next-line no-console
      console.debug('[scanner] resume failed, moved to error state');
    }
  }, [armScanLockTimer, setStatusSafe, startDecodeRuntime, startScanner]);

  const restartScanner = useCallback(() => {
    secureTransportBlockedRef.current = false;
    setScanFeedback(null);
    scannerPausedRef.current = false;
    stopAndClearScanner();
    void startScanner();
  }, [startScanner, stopAndClearScanner]);

  const dismissScanFeedback = useCallback(() => {
    setScanFeedback(null);

    // Always resume capture when feedback closes to avoid stale paused state.
    void (async () => {
      // eslint-disable-next-line no-console
      console.debug('[scanner] dismiss feedback -> resume');
      await resumeScanner();

      window.setTimeout(() => {
        const decodeActive = Boolean(liveScannerRef.current) || Boolean(decodeTimerRef.current);
        if (!decodeActive) {
          // eslint-disable-next-line no-console
          console.debug('[scanner] decode runtime not active after dismiss, forcing restart');
          restartScanner();
        }
      }, 450);
    })();
  }, [restartScanner, resumeScanner]);

  const processManualSnapFile = useCallback(async (file: File | null) => {
    if (!file) return;
    try {
      const qrScannerResult = await QrScanner.scanImage(file, {
        returnDetailedScanResult: true,
        alsoTryWithoutScanRegion: true,
      });
      const text = qrScannerResult?.data?.trim() ?? '';
      if (text) {
        await handleDecoded(text, 'manual-snap');
        return;
      }
      setErrorHint('No QR code found in this photo. Retake with the QR centered and well lit.');
      setStatusSafe('error');
    } catch (error) {
      setErrorHint('No QR code found in this photo. Retake with the QR centered and well lit.');
      setStatusSafe('error');
    }
  }, [handleDecoded, setStatusSafe]);

  useEffect(() => {
    clearTimeoutRef(idleSnapTimerRef);
    if (status === 'idle') {
      idleSnapTimerRef.current = window.setTimeout(() => {
        if (mountedRef.current && statusRef.current === 'idle') setManualSnapVisible(true);
      }, IDLE_MANUAL_SNAP_MS);
    }
  }, [status]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCaptureFps(captureTickRef.current);
      setDecodeFps(decodeTickRef.current);

      captureTickRef.current = 0;
      decodeTickRef.current = 0;
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scanFeedback?.visible) return;
    if (!scannerPausedRef.current) return;
    // eslint-disable-next-line no-console
    console.debug('[scanner] feedback hidden while paused -> auto resume');
    void resumeScanner();
  }, [resumeScanner, scanFeedback?.visible]);

  useScannerLifecycle({
    mountedRef,
    secureTransportBlockedRef,
    findingTimerRef,
    startScanner,
    stopAndClearScanner,
    setStatusSafe,
  });

  return {
    videoRef,
    regionId,
    status,
    errorHint,
    activeCameraLabel,
    manualSnapVisible,
    isFinding,
    isOptimizing: false,
    isLowPowerMode: false,
    captureFps,
    decodeFps,
    decodeRttMs,
    scanFeedback,
    pauseScanner,
    resumeScanner,
    dismissScanFeedback,
    processManualSnapFile,
    pulseDuration: status === 'success' ? SCANNER_PULSE.success : isFinding ? SCANNER_PULSE.finding : SCANNER_PULSE.idle,
    restartScanner,
  };
}
