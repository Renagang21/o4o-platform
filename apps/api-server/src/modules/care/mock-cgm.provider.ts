import type { CgmProvider, CgmReading } from './cgm.provider.js';

/**
 * MockCgmProvider
 *
 * Deterministic CGM data generator — no Math.random(), no DB access.
 * Uses patientId hash + sine waves for realistic glucose patterns.
 *
 * Generates 15-min interval readings for the requested period.
 * Patterns: fasting baseline + meal spikes + nighttime dip + patient bias.
 */
export class MockCgmProvider implements CgmProvider {
  async getReadings(patientId: string, from: Date, to: Date): Promise<CgmReading[]> {
    const seed = hashString(patientId);
    const readings: CgmReading[] = [];

    // Patient-specific bias: some patients trend higher/lower
    const baseBias = (seed % 40) - 10;           // -10 to +29 mg/dL offset
    const variabilityFactor = 0.8 + (seed % 5) / 10; // 0.8 to 1.2

    const intervalMs = 15 * 60 * 1000; // 15 minutes
    let t = from.getTime();
    const end = to.getTime();
    let index = 0;

    while (t <= end) {
      const date = new Date(t);
      const hourFrac = date.getUTCHours() + date.getUTCMinutes() / 60;
      const dayOfYear = getDayOfYear(date);

      // Base fasting glucose
      const base = 105 + baseBias;

      // Meal spikes (breakfast ~7-9, lunch ~12-14, dinner ~18-20)
      const mealEffect =
        mealSpike(hourFrac, 7.5, 35) +
        mealSpike(hourFrac, 12.5, 30) +
        mealSpike(hourFrac, 18.5, 40);

      // Nighttime dip (2-5 AM)
      const nightDip = hourFrac >= 2 && hourFrac <= 5 ? -10 : 0;

      // Deterministic "noise" via sine combination (no randomness)
      const noise = deterministicNoise(seed, index, dayOfYear) * 15 * variabilityFactor;

      const glucose = Math.round(
        Math.max(40, Math.min(350, base + mealEffect + nightDip + noise)),
      );

      readings.push({
        timestamp: date.toISOString(),
        glucose,
      });

      t += intervalMs;
      index++;
    }

    return readings;
  }
}

/** Meal spike: Gaussian-like bump centered at `center` hour, height `peak` mg/dL */
function mealSpike(hour: number, center: number, peak: number): number {
  const d = hour - center;
  return peak * Math.exp(-0.5 * d * d);
}

/** Deterministic noise using sine waves with incommensurate frequencies */
function deterministicNoise(seed: number, index: number, day: number): number {
  const a = Math.sin(seed * 0.1 + index * 0.37) * 0.5;
  const b = Math.sin(seed * 0.03 + index * 0.73 + day * 0.17) * 0.3;
  const c = Math.sin(seed * 0.07 + index * 1.13) * 0.2;
  return a + b + c; // range roughly -1 to +1
}

/** Simple deterministic hash: string → positive integer */
function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Day of year (1-366) */
function getDayOfYear(date: Date): number {
  const start = new Date(date.getUTCFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
