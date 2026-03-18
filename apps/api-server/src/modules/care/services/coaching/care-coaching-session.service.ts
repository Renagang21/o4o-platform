import type { DataSource, Repository, FindOptionsWhere } from 'typeorm';
import { CareCoachingSession } from '../../entities/care-coaching-session.entity.js';
import { CareKpiSnapshot } from '../../entities/care-kpi-snapshot.entity.js';

export interface CreateCoachingSessionDto {
  patientId: string;
  pharmacistId: string;
  pharmacyId: string;
  snapshotId?: string;
  summary: string;
  actionPlan: string;
}

export class CareCoachingSessionService {
  private dataSource: DataSource;
  private sessionRepo: Repository<CareCoachingSession>;
  private snapshotRepo: Repository<CareKpiSnapshot>;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
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

  /**
   * List all coaching sessions for a pharmacy (cross-patient)
   * WO-O4O-GLYCOPHARM-CARE-COACHING-PAGE-V1
   */
  async listByPharmacy(
    pharmacyId: string,
    limit = 50
  ): Promise<Array<CareCoachingSession & { patientName: string }>> {
    const rows = await this.dataSource.query(
      `SELECT s.id, s.patient_id AS "patientId", s.pharmacist_id AS "pharmacistId",
              s.pharmacy_id AS "pharmacyId", s.snapshot_id AS "snapshotId",
              s.summary, s.action_plan AS "actionPlan", s.created_at AS "createdAt",
              COALESCE(gc.name, u.name, u.email) AS "patientName"
       FROM care_coaching_sessions s
       LEFT JOIN users u ON u.id = s.patient_id
       LEFT JOIN glucoseview_customers gc
         ON gc.email = u.email AND gc.organization_id = s.pharmacy_id
       WHERE s.pharmacy_id = $1
       ORDER BY s.created_at DESC
       LIMIT $2`,
      [pharmacyId, limit],
    );
    return rows;
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
