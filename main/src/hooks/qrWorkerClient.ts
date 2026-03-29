type WorkerResponse =
  | { type: 'ready' }
  | { type: 'decoded'; requestId: number; text: string }
  | { type: 'no-result'; requestId: number }
  | { type: 'error'; requestId?: number; message: string };

type DecodeResult = { type: 'decoded'; text: string } | { type: 'no-result' };

type PendingRequest = {
  resolve: (value: DecodeResult) => void;
  reject: (reason?: unknown) => void;
};

export class QrWorkerClient {
  private worker: Worker | null = null;
  private requestId = 1;
  private pending = new Map<number, PendingRequest>();
  private readyPromise: Promise<void> | null = null;
  private initMessageHandler: ((event: MessageEvent<WorkerResponse>) => void) | null = null;
  private initErrorHandler: (() => void) | null = null;
  private decodeMessageHandler: ((event: MessageEvent<WorkerResponse>) => void) | null = null;

  private handleDecodeMessages = (event: MessageEvent<WorkerResponse>) => {
    const data = event.data;
    if (data.type !== 'decoded' && data.type !== 'no-result' && data.type !== 'error') return;
    const pendingRequest = typeof data.requestId === 'number' ? this.pending.get(data.requestId) : undefined;
    if (!pendingRequest) return;
    this.pending.delete(data.requestId as number);

    if (data.type === 'decoded') {
      pendingRequest.resolve({ type: 'decoded', text: data.text });
      return;
    }
    if (data.type === 'no-result') {
      pendingRequest.resolve({ type: 'no-result' });
      return;
    }
    pendingRequest.reject(new Error(data.message));
  };

  private clearInitHandlers() {
    if (!this.worker) return;
    if (this.initMessageHandler) this.worker.removeEventListener('message', this.initMessageHandler as EventListener);
    if (this.initErrorHandler) this.worker.removeEventListener('error', this.initErrorHandler);
    this.initMessageHandler = null;
    this.initErrorHandler = null;
  }

  async init(): Promise<void> {
    if (this.readyPromise) return this.readyPromise;

    this.worker = new Worker(new URL('../workers/qrWorker.ts', import.meta.url), { type: 'module' });
    this.decodeMessageHandler = this.handleDecodeMessages;
    this.worker.addEventListener('message', this.decodeMessageHandler as EventListener);

    this.readyPromise = new Promise<void>((resolve, reject) => {
      const onReadyTimeout = window.setTimeout(() => {
        this.clearInitHandlers();
        reject(new Error('QR worker initialization timed out.'));
      }, 5000);

      const handleMessage = (event: MessageEvent<WorkerResponse>) => {
        const data = event.data;
        if (data.type === 'ready') {
          window.clearTimeout(onReadyTimeout);
          this.clearInitHandlers();
          resolve();
          return;
        }

        if (data.type === 'error' && typeof data.requestId !== 'number') {
          window.clearTimeout(onReadyTimeout);
          this.clearInitHandlers();
          reject(new Error(data.message || 'QR worker failed to initialize.'));
        }
      };

      const handleError = () => {
        window.clearTimeout(onReadyTimeout);
        this.clearInitHandlers();
        reject(new Error('QR worker crashed during initialization.'));
      };

      this.initMessageHandler = handleMessage;
      this.initErrorHandler = handleError;
      this.worker?.addEventListener('message', this.initMessageHandler as EventListener);
      this.worker?.addEventListener('error', this.initErrorHandler);
      this.worker?.postMessage({ type: 'init' });
    });

    this.readyPromise = this.readyPromise.catch((error) => {
      this.clearInitHandlers();
      if (this.worker) this.worker.terminate();
      this.worker = null;
      this.readyPromise = null;
      throw error;
    });

    return this.readyPromise;
  }

  async decodeFrame(bitmap: ImageBitmap): Promise<DecodeResult> {
    await this.init();
    return this.sendDecodeRequest({ type: 'decode-frame', bitmap }, [bitmap], 5000);
  }

  async decodeImage(bytes: ArrayBuffer): Promise<DecodeResult> {
    await this.init();
    return this.sendDecodeRequest({ type: 'decode-image', bytes }, [bytes], 8000);
  }

  async decodePixels(width: number, height: number, pixels: Uint8ClampedArray): Promise<DecodeResult> {
    await this.init();
    const owned = new Uint8ClampedArray(pixels);
    const buffer = owned.buffer;
    return this.sendDecodeRequest({ type: 'decode-pixels', width, height, pixels: buffer }, [buffer], 5000);
  }

  dispose() {
    this.clearInitHandlers();
    if (this.worker) {
      if (this.decodeMessageHandler) this.worker.removeEventListener('message', this.decodeMessageHandler as EventListener);
      try {
        this.worker.postMessage({ type: 'shutdown' });
      } catch {}
      this.worker.terminate();
    }
    this.worker = null;
    this.readyPromise = null;
    this.decodeMessageHandler = null;

    this.pending.forEach(({ reject }) => reject(new Error('QR worker disposed.')));
    this.pending.clear();
  }

  private sendDecodeRequest(
    message:
      | { type: 'decode-frame'; bitmap: ImageBitmap }
      | { type: 'decode-image'; bytes: ArrayBuffer }
      | { type: 'decode-pixels'; width: number; height: number; pixels: ArrayBuffer },
    transfer: Transferable[],
    timeoutMs: number,
  ): Promise<DecodeResult> {
    if (!this.worker) return Promise.reject(new Error('QR worker is not available.'));

    const requestId = this.requestId++;
    return new Promise<DecodeResult>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        this.pending.delete(requestId);
        this.dispose();
        reject(new Error('QR worker decode timed out.'));
      }, timeoutMs);

      this.pending.set(requestId, { resolve, reject });
      const original = this.pending.get(requestId);
      if (original) {
        this.pending.set(requestId, {
          resolve: (value) => {
            window.clearTimeout(timeout);
            original.resolve(value);
          },
          reject: (reason) => {
            window.clearTimeout(timeout);
            original.reject(reason);
          },
        });
      }
      this.worker?.postMessage({ ...message, requestId }, transfer);
    });
  }
}
