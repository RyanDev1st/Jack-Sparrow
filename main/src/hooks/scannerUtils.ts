export type CameraDevice = { id: string; label: string };

export const scannerHint = (reason: unknown): string => {
  const message = String(reason ?? '').toLowerCase();
  if (message.includes('notallowederror') || message.includes('permission')) {
    return 'Camera permission denied. Allow camera access in browser settings, then retry.';
  }
  if (message.includes('notfounderror') || message.includes('no cameras')) {
    return 'No camera device detected on this browser.';
  }
  if (message.includes('notreadableerror') || message.includes('trackstarterror') || message.includes('in use')) {
    return 'Camera is busy in another app/tab. Close other camera apps and retry.';
  }
  if (message.includes('securityerror') || message.includes('insecure')) {
    return 'Camera requires a secure origin (HTTPS or localhost).';
  }
  if (message.includes('worker') || message.includes('zxing') || message.includes('wasm')) {
    return 'Scanner engine failed to start. Tap retry or use Manual Snap.';
  }
  if (message.includes('overconstrainederror')) {
    return 'Camera constraints were not supported. Tap retry to use a fallback camera mode.';
  }
  return 'Camera failed to initialize. Tap to retry.';
};

export const orderedCameras = (cameras: CameraDevice[]): CameraDevice[] => {
  const back = cameras.filter((cam) => /back|rear|environment/i.test(cam.label));
  const other = cameras.filter((cam) => !/back|rear|environment/i.test(cam.label));
  return [...back.slice().reverse(), ...other];
};

const stopStream = (stream: MediaStream | null) => {
  stream?.getTracks().forEach((track) => track.stop());
};

export const warmUpAnyCamera = async (aspectRatio?: number): Promise<void> => {
  if (!navigator.mediaDevices?.getUserMedia) return;
  const stream = await navigator.mediaDevices.getUserMedia({
    video: aspectRatio ? { aspectRatio: { ideal: aspectRatio } } : true,
    audio: false,
  });
  stopStream(stream);
};

export const warmUpCameraById = async (deviceId: string, aspectRatio?: number): Promise<void> => {
  if (!navigator.mediaDevices?.getUserMedia || !deviceId) return;
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      deviceId: { exact: deviceId },
      ...(aspectRatio ? { aspectRatio: { ideal: aspectRatio } } : {}),
    },
    audio: false,
  });
  stopStream(stream);
};
