import type { DataSource, Repository } from 'typeorm';
import { CareCoachingSession } from './entities/care-coaching-session.entity.js';
import { CareKpiSnapshot } from './entities/care-kpi-snapshot.entity.js';

export interface CreateCoachingSessionDto {
  patientId: string;
  pharmacistId: string;
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

  async createSession(dto: CreateCoachingSessionDto): Promise<CareCoachingSession> {
    let { snapshotId } = dto;

    // Auto-link to latest snapshot if not provided
    if (!snapshotId) {
      const latest = await this.snapshotRepo.findOne({
        where: { patientId: dto.patientId },
        order: { createdAt: 'DESC' },
      });
      snapshotId = latest?.id ?? null;
    }

    const session = this.sessionRepo.create({
      patientId: dto.patientId,
      pharmacistId: dto.pharmacistId,
      snapshotId,
      summary: dto.summary,
      actionPlan: dto.actionPlan,
    });

    return this.sessionRepo.save(session);
  }

  async listByPatient(patientId: string): Promise<CareCoachingSession[]> {
    return this.sessionRepo.find({
      where: { patientId },
      order: { createdAt: 'DESC' },
    });
  }

  async getLatestByPatient(patientId: string): Promise<CareCoachingSession | null> {
    return this.sessionRepo.findOne({
      where: { patientId },
      order: { createdAt: 'DESC' },
    });
  }
}
