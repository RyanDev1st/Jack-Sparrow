const WINDOW_SIZE = 5;

export type PaceState = {
  frameIntervalMs: number;
  lowPowerMode: boolean;
  optimizing: boolean;
  averageRttMs: number;
};

const average = (values: number[]): number => {
  if (values.length === 0) return 0;
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
};

export class PacingEngine {
  private rtts: number[] = [];

  recordRtt(rttMs: number): PaceState {
    this.rtts.push(rttMs);
    if (this.rtts.length > WINDOW_SIZE) this.rtts.shift();

    const avg = average(this.rtts);
    if (avg > 150) {
      return { frameIntervalMs: 200, lowPowerMode: true, optimizing: true, averageRttMs: avg };
    }
    if (avg > 100) {
      return { frameIntervalMs: 150, lowPowerMode: false, optimizing: true, averageRttMs: avg };
    }
    if (avg < 50) {
      return { frameIntervalMs: 66, lowPowerMode: false, optimizing: false, averageRttMs: avg };
    }
    return { frameIntervalMs: 100, lowPowerMode: false, optimizing: false, averageRttMs: avg };
  }

  reset(): PaceState {
    this.rtts = [];
    return { frameIntervalMs: 66, lowPowerMode: false, optimizing: false, averageRttMs: 0 };
  }
}
