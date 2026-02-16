import type { DataSource, Repository, FindOptionsWhere } from 'typeorm';
import { CareKpiSnapshot } from './entities/care-kpi-snapshot.entity.js';
import type { CareInsightDto } from './dto.js';

export interface KpiComparisonDto {
  latestTir: number | null;
  previousTir: number | null;
  tirChange: number | null;
  latestCv: number | null;
  previousCv: number | null;
  cvChange: number | null;
  riskTrend: 'improving' | 'stable' | 'worsening' | null;
}

export class CareKpiSnapshotService {
  private repo: Repository<CareKpiSnapshot>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(CareKpiSnapshot);
  }

  /** Record a snapshot after analysis (pharmacy-scoped) */
  async recordSnapshot(
    patientId: string,
    analysis: CareInsightDto,
    pharmacyId: string
  ): Promise<CareKpiSnapshot> {
    const snapshot = this.repo.create({
      pharmacyId,
      patientId,
      tir: analysis.tir,
      cv: analysis.cv,
      riskLevel: analysis.riskLevel,
    });
    return this.repo.save(snapshot);
  }

  /**
   * Compare latest 2 snapshots for KPI trend (pharmacy-scoped)
   * pharmacyId = null/undefined means admin (no filter)
   */
  async getKpiComparison(
    patientId: string,
    pharmacyId?: string | null
  ): Promise<KpiComparisonDto> {
    const where: FindOptionsWhere<CareKpiSnapshot> = { patientId };
    if (pharmacyId) {
      where.pharmacyId = pharmacyId;
    }

    const snapshots = await this.repo.find({
      where,
      order: { createdAt: 'DESC' },
      take: 2,
    });

    if (snapshots.length === 0) {
      return {
        latestTir: null, previousTir: null, tirChange: null,
        latestCv: null, previousCv: null, cvChange: null,
        riskTrend: null,
      };
    }

    const latest = snapshots[0];

    if (snapshots.length === 1) {
      return {
        latestTir: latest.tir, previousTir: null, tirChange: null,
        latestCv: latest.cv, previousCv: null, cvChange: null,
        riskTrend: null,
      };
    }

    const previous = snapshots[1];
    const tirChange = latest.tir - previous.tir;
    const cvChange = latest.cv - previous.cv;

    const riskTrend = this.calculateRiskTrend(latest.riskLevel, previous.riskLevel);

    return {
      latestTir: latest.tir,
      previousTir: previous.tir,
      tirChange,
      latestCv: latest.cv,
      previousCv: previous.cv,
      cvChange,
      riskTrend,
    };
  }

  private calculateRiskTrend(
    latest: string,
    previous: string,
  ): 'improving' | 'stable' | 'worsening' {
    const levels: Record<string, number> = { low: 0, moderate: 1, high: 2 };
    const latestScore = levels[latest] ?? 1;
    const previousScore = levels[previous] ?? 1;

    if (latestScore < previousScore) return 'improving';
    if (latestScore > previousScore) return 'worsening';
    return 'stable';
  }
}
