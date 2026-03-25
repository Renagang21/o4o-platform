import type { CgmEventDataProvider } from '../provider/cgm-event.provider.js';
import type { CgmEventAnalysisResult } from './cgm-event.types.js';
import { analyzeCgmEvents } from './cgm-event.engine.js';

/**
 * DefaultCgmEventAnalysisProvider
 *
 * Service layer: fetches data via provider, delegates to pure engine.
 *
 * WO-O4O-CARE-CGM-EVENT-INTEGRATION-V1
 */
export class DefaultCgmEventAnalysisProvider {
  constructor(private dataProvider: CgmEventDataProvider) {}

  async analyzePatientEvents(
    patientId: string,
    days = 14,
  ): Promise<CgmEventAnalysisResult> {
    const to = new Date();
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

    const [readings, events] = await Promise.all([
      this.dataProvider.getGlucoseReadings(patientId, from, to),
      this.dataProvider.getEvents(patientId, from, to),
    ]);

    return analyzeCgmEvents(
      patientId,
      readings,
      events,
      from.toISOString(),
      to.toISOString(),
    );
  }
}
