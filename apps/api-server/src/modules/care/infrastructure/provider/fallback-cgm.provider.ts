import type { CgmProvider, CgmReading } from '../../domain/provider/cgm.provider.js';

/**
 * FallbackCgmProvider
 *
 * WO-O4O-CARE-DATABASE-PROVIDER-ACTIVATION-V1
 *
 * Tries the primary provider (database) first.
 * If fewer than MIN_READINGS are returned, falls back to the secondary (mock).
 * This ensures analysis always has sufficient data for meaningful results.
 */
const MIN_READINGS = 10;

export class FallbackCgmProvider implements CgmProvider {
  constructor(
    private primary: CgmProvider,
    private fallback: CgmProvider,
  ) {}

  async getReadings(patientId: string, from: Date, to: Date): Promise<CgmReading[]> {
    const readings = await this.primary.getReadings(patientId, from, to);

    if (readings.length >= MIN_READINGS) {
      return readings;
    }

    // Insufficient real data — fallback to mock
    return this.fallback.getReadings(patientId, from, to);
  }
}
