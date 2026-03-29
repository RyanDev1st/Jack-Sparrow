import { useEffect, useRef, type MutableRefObject } from 'react';
import type { ScannerStatus } from './useScanner';

type UseScannerLifecycleOptions = {
  mountedRef: MutableRefObject<boolean>;
  secureTransportBlockedRef: MutableRefObject<boolean>;
  findingTimerRef: MutableRefObject<number | null>;
  startScanner: (quick?: boolean) => Promise<void> | void;
  stopAndClearScanner: () => void;
  setStatusSafe: (status: ScannerStatus) => void;
};

export function useScannerLifecycle({
  mountedRef,
  secureTransportBlockedRef,
  findingTimerRef,
  startScanner,
  stopAndClearScanner,
  setStatusSafe,
}: UseScannerLifecycleOptions) {
  const startScannerRef = useRef(startScanner);
  const stopAndClearScannerRef = useRef(stopAndClearScanner);
  const setStatusSafeRef = useRef(setStatusSafe);

  useEffect(() => {
    startScannerRef.current = startScanner;
  }, [startScanner]);

  useEffect(() => {
    stopAndClearScannerRef.current = stopAndClearScanner;
  }, [stopAndClearScanner]);

  useEffect(() => {
    setStatusSafeRef.current = setStatusSafe;
  }, [setStatusSafe]);

  useEffect(() => {
    mountedRef.current = true;
    secureTransportBlockedRef.current = false;
    void startScannerRef.current(false);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        stopAndClearScannerRef.current();
        setStatusSafeRef.current('idle');
        return;
      }

      if (document.visibilityState === 'visible') {
        secureTransportBlockedRef.current = false;
        void startScannerRef.current(true);
      }
    };

    const onPageHide = () => {
      stopAndClearScannerRef.current();
      setStatusSafeRef.current('idle');
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
      mountedRef.current = false;
      if (findingTimerRef.current !== null) {
        window.clearTimeout(findingTimerRef.current);
        findingTimerRef.current = null;
      }
      stopAndClearScannerRef.current();
    };
  }, [findingTimerRef, mountedRef, secureTransportBlockedRef]);
}
