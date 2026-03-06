import type { DataSource } from 'typeorm';
import type { CgmProvider, CgmReading } from '../../domain/provider/cgm.provider.js';
import { HealthReading } from '../../entities/health-reading.entity.js';

/**
 * DatabaseHealthProvider
 *
 * CgmProvider implementation that reads from health_readings table.
 * Replaces MockCgmProvider for real data analysis.
 *
 * WO-O4O-HEALTH-DATA-PIPELINE-V1
 */
export class DatabaseHealthProvider implements CgmProvider {
  constructor(private dataSource: DataSource) {}

  async getReadings(patientId: string, from: Date, to: Date): Promise<CgmReading[]> {
    const repo = this.dataSource.getRepository(HealthReading);

    const readings = await repo
      .createQueryBuilder('r')
      .where('r.patient_id = :patientId', { patientId })
      .andWhere('r.metric_type = :type', { type: 'glucose' })
      .andWhere('r.value_numeric IS NOT NULL')
      .andWhere('r.measured_at >= :from', { from })
      .andWhere('r.measured_at <= :to', { to })
      .orderBy('r.measured_at', 'ASC')
      .getMany();

    return readings.map((r) => ({
      timestamp: r.measuredAt.toISOString(),
      glucose: Number(r.valueNumeric),
    }));
  }
}
