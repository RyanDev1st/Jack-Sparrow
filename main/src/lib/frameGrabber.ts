import { buildCenteredScanRegion } from './scannerConfig';

export type FramePacket =
  | { kind: 'bitmap'; bitmap: ImageBitmap }
  | { kind: 'pixels'; width: number; height: number; pixels: Uint8ClampedArray };

export class FrameGrabber {
  private fallbackCanvas: HTMLCanvasElement | null = null;
  private fallbackCtx: CanvasRenderingContext2D | null = null;

  async grab(video: HTMLVideoElement, useFullFrame = false): Promise<FramePacket | null> {
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.videoWidth < 2 || video.videoHeight < 2) {
      return null;
    }

    const region = useFullFrame
      ? { x: 0, y: 0, width: video.videoWidth, height: video.videoHeight }
      : buildCenteredScanRegion(video.videoWidth, video.videoHeight);

    // Pixel path is the most stable cross-browser capture path for QR decoding.
    return this.grabPixels(video, region);
  }

  dispose() {
    this.fallbackCanvas = null;
    this.fallbackCtx = null;
  }

  private grabPixels(video: HTMLVideoElement, region: { x: number; y: number; width: number; height: number }): FramePacket | null {
    const width = Math.max(2, region.width);
    const height = Math.max(2, region.height);
    if (width < 2 || height < 2) return null;

    if (!this.fallbackCanvas || this.fallbackCanvas.width !== width || this.fallbackCanvas.height !== height) {
      this.fallbackCanvas = document.createElement('canvas');
      this.fallbackCanvas.width = width;
      this.fallbackCanvas.height = height;
      this.fallbackCtx = this.fallbackCanvas.getContext('2d', { willReadFrequently: true });
    }

    if (!this.fallbackCtx) return null;
    this.fallbackCtx.drawImage(video, region.x, region.y, region.width, region.height, 0, 0, width, height);
    const imageData = this.fallbackCtx.getImageData(0, 0, width, height);
    return { kind: 'pixels', width, height, pixels: new Uint8ClampedArray(imageData.data) };
  }
}
