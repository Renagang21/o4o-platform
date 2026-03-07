import type { DataSource } from 'typeorm';
import type {
  HealthMetricProvider,
  BpReading,
  WeightReading,
} from '../../domain/provider/health-metric.provider.js';
import { HealthReading } from '../../entities/health-reading.entity.js';

/**
 * DatabaseHealthMetricProvider
 *
 * WO-O4O-CARE-MULTI-METRIC-ANALYSIS-V1
 *
 * Reads blood_pressure and weight from health_readings table.
 *
 * BP dual-format normalisation:
 *   Format A: metric_type = 'blood_pressure', value_text = '130/80'
 *   Format B: metric_type = 'blood_pressure_systolic' / 'blood_pressure_diastolic' (separate rows)
 *
 * Both formats are merged into BpReading[].
 */
export class DatabaseHealthMetricProvider implements HealthMetricProvider {
  constructor(private dataSource: DataSource) {}

  async getBpReadings(patientId: string, from: Date, to: Date): Promise<BpReading[]> {
    const repo = this.dataSource.getRepository(HealthReading);

    // Fetch all BP-related rows in one query
    const rows = await repo
      .createQueryBuilder('r')
      .where('r.patient_id = :patientId', { patientId })
      .andWhere('r.metric_type IN (:...types)', {
        types: ['blood_pressure', 'blood_pressure_systolic', 'blood_pressure_diastolic'],
      })
      .andWhere('r.measured_at >= :from', { from })
      .andWhere('r.measured_at <= :to', { to })
      .orderBy('r.measured_at', 'ASC')
      .getMany();

    const results: BpReading[] = [];

    // Format A: combined "130/80" in value_text
    for (const row of rows) {
      if (row.metricType === 'blood_pressure' && row.valueText) {
        const parts = row.valueText.split('/');
        if (parts.length === 2) {
          const sys = Number(parts[0].trim());
          const dia = Number(parts[1].trim());
          if (!isNaN(sys) && !isNaN(dia) && sys > 0 && dia > 0) {
            results.push({
              timestamp: row.measuredAt.toISOString(),
              systolic: sys,
              diastolic: dia,
            });
          }
        }
      }
    }

    // Format B: separate systolic/diastolic rows — match by timestamp
    const systolicMap = new Map<string, number>();
    const diastolicMap = new Map<string, number>();

    for (const row of rows) {
      if (row.metricType === 'blood_pressure_systolic' && row.valueNumeric != null) {
        systolicMap.set(row.measuredAt.toISOString(), Number(row.valueNumeric));
      } else if (row.metricType === 'blood_pressure_diastolic' && row.valueNumeric != null) {
        diastolicMap.set(row.measuredAt.toISOString(), Number(row.valueNumeric));
      }
    }

    for (const [ts, sys] of systolicMap) {
      const dia = diastolicMap.get(ts);
      if (dia != null) {
        results.push({ timestamp: ts, systolic: sys, diastolic: dia });
      }
    }

    // Sort by timestamp
    results.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    return results;
  }

  async getWeightReadings(patientId: string, from: Date, to: Date): Promise<WeightReading[]> {
    const repo = this.dataSource.getRepository(HealthReading);

    const rows = await repo
      .createQueryBuilder('r')
      .where('r.patient_id = :patientId', { patientId })
      .andWhere('r.metric_type = :type', { type: 'weight' })
      .andWhere('r.value_numeric IS NOT NULL')
      .andWhere('r.measured_at >= :from', { from })
      .andWhere('r.measured_at <= :to', { to })
      .orderBy('r.measured_at', 'ASC')
      .getMany();

    return rows.map((r) => ({
      timestamp: r.measuredAt.toISOString(),
      weight: Number(r.valueNumeric),
    }));
  }
}
