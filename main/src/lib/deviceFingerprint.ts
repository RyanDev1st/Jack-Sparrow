const hashString = async (value: string): Promise<string> => {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((part) => part.toString(16).padStart(2, '0')).join('');
};

const canvasSignature = (): string => {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 90;
  const context = canvas.getContext('2d');
  if (!context) return 'no-canvas';

  context.textBaseline = 'top';
  context.font = "16px 'Segoe UI'";
  context.fillStyle = '#09142a';
  context.fillRect(0, 0, 320, 90);
  context.fillStyle = '#f58220';
  context.fillText('Jack Sparrow Scanner', 14, 10);
  context.fillStyle = '#ffffff';
  context.fillText(navigator.userAgent.slice(0, 42), 14, 34);
  context.strokeStyle = '#005bbb';
  context.beginPath();
  context.arc(260, 45, 22, 0, Math.PI * 2);
  context.stroke();
  return canvas.toDataURL();
};

export async function getDeviceFingerprint(): Promise<string> {
  const material = [
    navigator.userAgent,
    navigator.language,
    String(screen.width),
    String(screen.height),
    String(window.devicePixelRatio || 1),
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
    canvasSignature(),
  ].join('|');

  const hash = await hashString(material);
  return hash.slice(0, 32);
}

export async function getBrowserId(): Promise<string> {
  const material = [
    navigator.userAgent,
    navigator.language,
    navigator.platform,
    String(navigator.hardwareConcurrency ?? 0),
  ].join('|');

  const hash = await hashString(material);
  return hash.slice(0, 24);
}
