import type { DataSource, Repository, FindOptionsWhere } from 'typeorm';
import { CareCoachingSession } from './entities/care-coaching-session.entity.js';
import { CareKpiSnapshot } from './entities/care-kpi-snapshot.entity.js';

export interface CreateCoachingSessionDto {
  patientId: string;
  pharmacistId: string;
  pharmacyId: string;
  snapshotId?: string;
  summary: string;
  actionPlan: string;
}

export class CareCoachingSessionService {
  private sessionRepo: Repository<CareCoachingSession>;
  private snapshotRepo: Repository<CareKpiSnapshot>;

  constructor(dataSource: DataSource) {
    this.sessionRepo = dataSource.getRepository(CareCoachingSession);
    this.snapshotRepo = dataSource.getRepository(CareKpiSnapshot);
  }

  /** Create coaching session (pharmacy-scoped, pharmacistId from server) */
  async createSession(dto: CreateCoachingSessionDto): Promise<CareCoachingSession> {
    let { snapshotId } = dto;

    // Auto-link to latest snapshot (pharmacy-scoped)
    if (!snapshotId) {
      const latest = await this.snapshotRepo.findOne({
        where: { patientId: dto.patientId, pharmacyId: dto.pharmacyId },
        order: { createdAt: 'DESC' },
      });
      snapshotId = latest?.id ?? null;
    }

    const session = this.sessionRepo.create({
      pharmacyId: dto.pharmacyId,
      patientId: dto.patientId,
      pharmacistId: dto.pharmacistId,
      snapshotId,
      summary: dto.summary,
      actionPlan: dto.actionPlan,
    });

    return this.sessionRepo.save(session);
  }

  /**
   * List coaching sessions by patient (pharmacy-scoped)
   * pharmacyId = null/undefined means admin (no filter)
   */
  async listByPatient(
    patientId: string,
    pharmacyId?: string | null
  ): Promise<CareCoachingSession[]> {
    const where: FindOptionsWhere<CareCoachingSession> = { patientId };
    if (pharmacyId) {
      where.pharmacyId = pharmacyId;
    }

    return this.sessionRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  /** Get latest coaching session by patient (pharmacy-scoped) */
  async getLatestByPatient(
    patientId: string,
    pharmacyId?: string | null
  ): Promise<CareCoachingSession | null> {
    const where: FindOptionsWhere<CareCoachingSession> = { patientId };
    if (pharmacyId) {
      where.pharmacyId = pharmacyId;
    }

    return this.sessionRepo.findOne({
      where,
      order: { createdAt: 'DESC' },
    });
  }
}
