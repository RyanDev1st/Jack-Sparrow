import type { MutableRefObject } from 'react';
import { orderedCameras } from './scannerUtils';

const scannerDebug = (..._args: unknown[]) => {};

type CameraCandidate = { id: string; label: string; constraints: MediaTrackConstraints };

type StartScannerSessionOptions = {
  mountedRef: MutableRefObject<boolean>;
  videoRef: MutableRefObject<HTMLVideoElement | null>;
  activeStreamRef: MutableRefObject<MediaStream | null>;
  activeCameraIdRef: MutableRefObject<string>;
  secureTransportBlockedRef: MutableRefObject<boolean>;
  isStartingRef: MutableRefObject<boolean>;
  firstFrameAtRef: MutableRefObject<number>;
  frameLoopRef: MutableRefObject<number | null>;
  decodeLoop: () => Promise<void>;
  ensureWorker: () => Promise<unknown>;
  stopAndClearScanner: () => void;
  setStatusSafe: (status: 'idle' | 'scanning' | 'success' | 'error') => void;
  setErrorHint: (hint: string) => void;
  setActiveCameraLabel: (label: string) => void;
  setManualSnapVisible: (visible: boolean) => void;
  armScanLockTimer: () => void;
  scannerHint: (reason: unknown) => string;
  firstFrameDelayMs: number;
};

const buildCandidates = async (activeCameraId: string): Promise<CameraCandidate[]> => {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const ordered = orderedCameras(devices.filter((d) => d.kind === 'videoinput').map((d) => ({ id: d.deviceId, label: d.label || 'camera' })));
  const preferred = activeCameraId ? ordered.sort((a, b) => (a.id === activeCameraId ? -1 : b.id === activeCameraId ? 1 : 0)) : ordered;
  const qualityPrefs: MediaTrackConstraints = {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30, max: 30 },
  };
  const byId = preferred.map((c) => ({
    id: c.id,
    label: c.label,
    constraints: { deviceId: { exact: c.id }, ...qualityPrefs },
  }));
  scannerDebug('camera candidates built', { count: byId.length, activeCameraId });
  return [...byId, { id: 'default', label: 'default', constraints: { facingMode: { ideal: 'environment' }, ...qualityPrefs } }];
};

export const startScannerSession = async ({
  mountedRef,
  videoRef,
  activeStreamRef,
  activeCameraIdRef,
  secureTransportBlockedRef,
  isStartingRef,
  firstFrameAtRef,
  frameLoopRef,
  decodeLoop,
  ensureWorker,
  stopAndClearScanner,
  setStatusSafe,
  setErrorHint,
  setActiveCameraLabel,
  setManualSnapVisible,
  armScanLockTimer,
  scannerHint,
  firstFrameDelayMs,
}: StartScannerSessionOptions) => {
  scannerDebug('startScannerSession begin', { isStarting: isStartingRef.current, blocked: secureTransportBlockedRef.current });
  if (isStartingRef.current || secureTransportBlockedRef.current) return;
  const host = window.location.hostname;
  const secureOrigin = window.location.protocol === 'https:' || window.isSecureContext || host === 'localhost' || host === '127.0.0.1' || host === '::1';
  scannerDebug('secure origin check', { secureOrigin, host, protocol: window.location.protocol });
  if (!secureOrigin) return void (setErrorHint('Camera requires HTTPS (or localhost). Open this app on a secure origin, then retry.'), setStatusSafe('error'));
  if (!navigator.mediaDevices?.getUserMedia) return void (setErrorHint('Camera API is not available in this browser.'), setStatusSafe('error'));

  isStartingRef.current = true;
  setErrorHint('Camera failed to initialize. Tap to retry.');
  setManualSnapVisible(false);
  setStatusSafe('idle');

  try {
    let lastError: unknown = null;
    for (const candidate of await buildCandidates(activeCameraIdRef.current)) {
      if (!mountedRef.current) break;
      stopAndClearScanner();
      scannerDebug('attempting camera candidate', { candidateId: candidate.id, candidateLabel: candidate.label });
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: candidate.constraints, audio: false });
        if (!videoRef.current) throw new Error('Scanner video element is not ready.');
        activeStreamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        scannerDebug('video stream started', {
          candidateId: candidate.id,
          width: videoRef.current.videoWidth,
          height: videoRef.current.videoHeight,
        });
        await ensureWorker();
        activeCameraIdRef.current = candidate.id;
        setActiveCameraLabel(candidate.label);
        setStatusSafe('scanning');
        firstFrameAtRef.current = performance.now() + firstFrameDelayMs;
        armScanLockTimer();
        frameLoopRef.current = window.requestAnimationFrame(() => void decodeLoop());
        secureTransportBlockedRef.current = false;
        scannerDebug('scanner session ready', { cameraId: candidate.id, cameraLabel: candidate.label });
        return;
      } catch (error) {
        lastError = error;
        scannerDebug('camera candidate failed', { candidateId: candidate.id, candidateLabel: candidate.label, error });
        stopAndClearScanner();
      }
    }
    throw lastError ?? new Error('Unable to start a live camera stream.');
  } catch (error) {
    if (String(error ?? '').toLowerCase().includes('https')) secureTransportBlockedRef.current = true;
    scannerDebug('startScannerSession failed', { error });
    setErrorHint(scannerHint(error));
    setActiveCameraLabel('none');
    setStatusSafe('error');
    setManualSnapVisible(true);
  } finally {
    isStartingRef.current = false;
  }
};
