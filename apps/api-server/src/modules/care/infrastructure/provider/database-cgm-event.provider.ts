import type { DataSource } from 'typeorm';
import type { CgmEventDataProvider } from '../../domain/provider/cgm-event.provider.js';
import type { TimestampedGlucose, CgmEvent, CgmEventType } from '../../domain/analysis/cgm-event.types.js';
import { HealthReading } from '../../entities/health-reading.entity.js';

/**
 * DatabaseCgmEventProvider
 *
 * Reads glucose data + extracts events from health_readings JSONB metadata.
 *
 * WO-O4O-CARE-CGM-EVENT-INTEGRATION-V1
 */
export class DatabaseCgmEventProvider implements CgmEventDataProvider {
  constructor(private dataSource: DataSource) {}

  async getGlucoseReadings(patientId: string, from: Date, to: Date): Promise<TimestampedGlucose[]> {
    const repo = this.dataSource.getRepository(HealthReading);
    const rows = await repo
      .createQueryBuilder('r')
      .where('r.patient_id = :patientId', { patientId })
      .andWhere('r.metric_type = :type', { type: 'glucose' })
      .andWhere('r.value_numeric IS NOT NULL')
      .andWhere('r.measured_at >= :from', { from })
      .andWhere('r.measured_at <= :to', { to })
      .orderBy('r.measured_at', 'ASC')
      .getMany();

    return rows.map((r) => ({
      timestamp: r.measuredAt.toISOString(),
      glucose: Number(r.valueNumeric),
    }));
  }

  async getEvents(patientId: string, from: Date, to: Date): Promise<CgmEvent[]> {
    const repo = this.dataSource.getRepository(HealthReading);
    const rows = await repo
      .createQueryBuilder('r')
      .where('r.patient_id = :patientId', { patientId })
      .andWhere('r.metric_type = :type', { type: 'glucose' })
      .andWhere('r.measured_at >= :from', { from })
      .andWhere('r.measured_at <= :to', { to })
      .andWhere(
        `(r.metadata->>'meal' IS NOT NULL OR r.metadata->>'exercise' IS NOT NULL OR r.metadata->>'medication' IS NOT NULL OR r.metadata->>'symptoms' IS NOT NULL)`,
      )
      .orderBy('r.measured_at', 'ASC')
      .getMany();

    const events: CgmEvent[] = [];
    for (const row of rows) {
      const meta = row.metadata as Record<string, unknown>;
      const ts = row.measuredAt.toISOString();
      const id = row.id;

      if (meta.meal && typeof meta.meal === 'object') {
        events.push({
          eventType: 'meal',
          eventTime: ts,
          readingId: id,
          detail: meta.meal as Record<string, unknown>,
        });
      }
      if (meta.exercise && typeof meta.exercise === 'object') {
        events.push({
          eventType: 'exercise',
          eventTime: ts,
          readingId: id,
          detail: meta.exercise as Record<string, unknown>,
        });
      }
      if (meta.medication && typeof meta.medication === 'object') {
        events.push({
          eventType: 'medication',
          eventTime: ts,
          readingId: id,
          detail: meta.medication as Record<string, unknown>,
        });
      }
      if (meta.symptoms && typeof meta.symptoms === 'object') {
        events.push({
          eventType: 'symptom',
          eventTime: ts,
          readingId: id,
          detail: meta.symptoms as Record<string, unknown>,
        });
      }
    }

    return events;
  }
}
