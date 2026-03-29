export const SCANNER_CONFIG = {
  fps: 20,
  disableFlip: true,
  aspectRatio: 1.0,
  qrBoxSize: 250,
} as const;

export const SCANNER_PULSE = {
  idle: 2.35,
  finding: 1.25,
  success: 1.0,
} as const;

export const buildCenteredScanRegion = (videoWidth: number, videoHeight: number) => {
  // Matches qr-scanner recommended approach: centered square region with downscaled decode target.
  const edge = Math.floor(Math.min(videoWidth, videoHeight) * (2 / 3));
  const x = Math.floor((videoWidth - edge) / 2);
  const y = Math.floor((videoHeight - edge) / 2);
  return {
    x,
    y,
    width: edge,
    height: edge,
    downScaledWidth: 400,
    downScaledHeight: 400,
  };
};
