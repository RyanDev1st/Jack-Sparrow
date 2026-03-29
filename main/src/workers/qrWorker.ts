import { prepareZXingModule, readBarcodes } from 'zxing-wasm/reader';

type InitRequest = { type: 'init' };
type DecodeFrameRequest = {
  type: 'decode-frame';
  requestId: number;
  bitmap: ImageBitmap;
};
type DecodePixelsRequest = {
  type: 'decode-pixels';
  requestId: number;
  width: number;
  height: number;
  pixels: ArrayBuffer;
};
type DecodeImageRequest = {
  type: 'decode-image';
  requestId: number;
  bytes: ArrayBuffer;
};
type ShutdownRequest = { type: 'shutdown' };
type WorkerRequest = InitRequest | DecodeFrameRequest | DecodePixelsRequest | DecodeImageRequest | ShutdownRequest;

type WorkerResponse =
  | { type: 'ready' }
  | { type: 'decoded'; requestId: number; text: string }
  | { type: 'no-result'; requestId: number }
  | { type: 'error'; requestId?: number; message: string };

let initialized = false;
let frameCanvas: OffscreenCanvas | null = null;
let frameCtx: OffscreenCanvasRenderingContext2D | null = null;
let healthLogged = false;

const mirrorImageDataX = (source: ImageData): ImageData => {
  const { width, height, data } = source;
  const mirrored = new Uint8ClampedArray(data.length);
  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * width * 4;
    for (let x = 0; x < width; x += 1) {
      const srcIndex = rowOffset + x * 4;
      const dstIndex = rowOffset + (width - 1 - x) * 4;
      mirrored[dstIndex] = data[srcIndex];
      mirrored[dstIndex + 1] = data[srcIndex + 1];
      mirrored[dstIndex + 2] = data[srcIndex + 2];
      mirrored[dstIndex + 3] = data[srcIndex + 3];
    }
  }
  return new ImageData(mirrored, width, height);
};

const boostContrast = (source: ImageData): ImageData => {
  const { width, height, data } = source;
  let min = 255;
  let max = 0;

  for (let i = 0; i < data.length; i += 4) {
    const lum = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    if (lum < min) min = lum;
    if (lum > max) max = lum;
  }

  if (max - min < 12) return source;

  const stretched = new Uint8ClampedArray(data.length);
  const scale = 255 / (max - min);
  for (let i = 0; i < data.length; i += 4) {
    const lum = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    const normalized = Math.max(0, Math.min(255, Math.round((lum - min) * scale)));
    stretched[i] = normalized;
    stretched[i + 1] = normalized;
    stretched[i + 2] = normalized;
    stretched[i + 3] = 255;
  }

  return new ImageData(stretched, width, height);
};

const decodeWithVariants = async (imageData: ImageData): Promise<string | null> => {
  const direct = await decodeFromImageData(imageData);
  if (direct) return direct;

  // Some camera feeds are horizontally mirrored. Try one mirrored pass first.
  const mirrored = mirrorImageDataX(imageData);
  const mirroredDecoded = await decodeFromImageData(mirrored);
  if (mirroredDecoded) return mirroredDecoded;

  // Screen-captured QR can be low-contrast or washed out. Retry on contrast-boosted luminance.
  const contrasted = boostContrast(imageData);
  const contrastedDecoded = await decodeFromImageData(contrasted);
  if (contrastedDecoded) return contrastedDecoded;

  const contrastedMirrored = mirrorImageDataX(contrasted);
  return decodeFromImageData(contrastedMirrored);
};

const respond = (message: WorkerResponse) => {
  self.postMessage(message);
};

const decodeFromImageData = async (imageData: ImageData): Promise<string | null> => {
  const results = await readBarcodes(imageData, {
    formats: ['QRCode'],
    tryHarder: true,
    tryRotate: true,
    tryInvert: true,
    maxNumberOfSymbols: 1,
  });
  const first = results[0];
  return first?.text?.trim() ? first.text.trim() : null;
};

const logPixelsHealthOnce = (byteLength: number) => {
  if (healthLogged || byteLength <= 0) return;
  healthLogged = true;
};

const decodeFromBitmap = async (bitmap: ImageBitmap): Promise<string | null> => {
  if (!frameCanvas || frameCanvas.width !== bitmap.width || frameCanvas.height !== bitmap.height) {
    frameCanvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    frameCtx = frameCanvas.getContext('2d', { willReadFrequently: true });
  }

  if (!frameCtx || !frameCanvas) return null;

  frameCtx.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height);
  const imageData = frameCtx.getImageData(0, 0, bitmap.width, bitmap.height);
  return decodeWithVariants(imageData);
};

const initialize = async () => {
  if (initialized) return;
  await prepareZXingModule({ fireImmediately: true });
  initialized = true;
};

const handleMessage = async (event: MessageEvent<WorkerRequest>) => {
  const data = event.data;
  try {
    if (data.type === 'init') {
      await initialize();
      respond({ type: 'ready' });
      return;
    }

    if (data.type === 'shutdown') {
      self.close();
      return;
    }

    await initialize();

    if (data.type === 'decode-frame') {
      const decoded = await decodeFromBitmap(data.bitmap);
      data.bitmap.close();
      if (decoded) {
        respond({ type: 'decoded', requestId: data.requestId, text: decoded });
      } else {
        respond({ type: 'no-result', requestId: data.requestId });
      }
      return;
    }

    if (data.type === 'decode-pixels') {
      logPixelsHealthOnce(data.pixels.byteLength);
      const pixels = new Uint8ClampedArray(data.pixels);
      const imageData = new ImageData(pixels, data.width, data.height);
      const decoded = await decodeWithVariants(imageData);
      if (decoded) {
        respond({ type: 'decoded', requestId: data.requestId, text: decoded });
      } else {
        respond({ type: 'no-result', requestId: data.requestId });
      }
      return;
    }

    if (data.type === 'decode-image') {
      const decoded = await readBarcodes(new Uint8Array(data.bytes), {
        formats: ['QRCode'],
        tryHarder: true,
        tryRotate: true,
        tryInvert: true,
        maxNumberOfSymbols: 1,
      });
      const text = decoded[0]?.text?.trim() ?? '';
      if (text) {
        respond({ type: 'decoded', requestId: data.requestId, text });
      } else {
        respond({ type: 'no-result', requestId: data.requestId });
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Worker decode failure';
    respond({ type: 'error', requestId: 'requestId' in data ? data.requestId : undefined, message });
  }
};

self.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  void handleMessage(event);
});
