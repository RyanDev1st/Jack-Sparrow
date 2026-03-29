import { useEffect, useRef, useState } from 'react';

type Frame = { left: number; top: number; width: number; height: number };
type ContainerSize = { width: number; height: number };

const fullFrame: Frame = { left: 0, top: 0, width: 100, height: 100 };
const emptySize: ContainerSize = { width: 0, height: 0 };

export function useContainedMediaFrame() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ratio, setRatio] = useState<number | null>(null);
  const [frame, setFrame] = useState<Frame>(fullFrame);
  const [containerSize, setContainerSize] = useState<ContainerSize>(emptySize);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const update = () => {
      const rect = container.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
      if (!ratio || rect.width <= 0 || rect.height <= 0) {
        setFrame(fullFrame);
        return;
      }

      const containerRatio = rect.width / rect.height;
      if (containerRatio > ratio) {
        const mediaHeight = rect.height;
        const mediaWidth = mediaHeight * ratio;
        const left = ((rect.width - mediaWidth) / 2 / rect.width) * 100;
        const width = (mediaWidth / rect.width) * 100;
        setFrame({ left, top: 0, width, height: 100 });
        return;
      }

      const mediaWidth = rect.width;
      const mediaHeight = mediaWidth / ratio;
      const top = ((rect.height - mediaHeight) / 2 / rect.height) * 100;
      const height = (mediaHeight / rect.height) * 100;
      setFrame({ left: 0, top, width: 100, height });
    };

    const observer = new ResizeObserver(update);
    observer.observe(container);
    update();

    return () => observer.disconnect();
  }, [ratio]);

  const onImageLoad = (img: HTMLImageElement) => {
    if (!img.naturalWidth || !img.naturalHeight) return;
    setRatio(img.naturalWidth / img.naturalHeight);
  };

  return { containerRef, frame, containerSize, onImageLoad };
}
