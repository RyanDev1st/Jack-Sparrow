import QRCode from 'qrcode';

const DEFAULT_QR_WIDTH = 220;
const QR_RETRY_DELAY_MS = 250;

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const normalizeDomain = (domain: string): string => domain.replace(/^https?:\/\//i, '').trim().replace(/\/$/, '');

export const buildClaimGatePayload = (sessionId: string, explicitDomain?: string): string => {
  const domain = normalizeDomain(explicitDomain || import.meta.env.VITE_PUBLIC_DOMAIN || window.location.host);
  return `https://${domain}/api/claim/gate?sid=${encodeURIComponent(sessionId.trim())}`;
};

export const generateClaimQrDataUrl = async (payload: string, retries = 1): Promise<string> => {
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await QRCode.toDataURL(payload, {
        margin: 1,
        width: DEFAULT_QR_WIDTH,
        errorCorrectionLevel: 'M',
        color: { dark: '#f58220', light: '#020611' },
      });
    } catch (error) {
      lastError = error;
      if (attempt < retries) await sleep(QR_RETRY_DELAY_MS * (attempt + 1));
    }
  }

  throw lastError ?? new Error('Failed to generate claim QR code.');
};
