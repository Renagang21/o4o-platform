/**
 * CareActionService — WO-O4O-CARE-ACTION-ENGINE-V2.2
 *
 * Action 생명주기 관리:
 * - 후보 Action → 중복 억제 → 영속화
 * - 상태 전이: suggested → in_progress → completed | dismissed
 * - 조회 (pharmacy-scoped, patient-scoped)
 */

import type { DataSource } from 'typeorm';
import type {
  CareGeneratedAction,
  CarePersistedAction,
  CareActionStatus,
} from '../domain/analysis/cgm-event.types.js';

// ── 중복 억제 정책 ──
const DEDUP_DAYS = 3;          // suggested/in_progress/completed 기준 3일
const DISMISSED_GRACE_HOURS = 24; // dismissed 후 24시간 유예

export class CareActionService {
  constructor(private readonly ds: DataSource) {}

  /**
   * 후보 Action을 중복 체크 후 영속화하고, 기존 active Action과 합쳐 반환한다.
   */
  async persistAndMerge(
    patientId: string,
    pharmacyId: string,
    candidates: CareGeneratedAction[],
  ): Promise<CarePersistedAction[]> {
    const sourceType = 'time_based_analysis';

    // 1. 기존 active actions 조회
    const existing: RawAction[] = await this.ds.query(`
      SELECT * FROM care_actions
      WHERE patient_id = $1
        AND pharmacy_id = $2
        AND source_type = $3
        AND status IN ('suggested', 'in_progress')
      ORDER BY
        CASE priority WHEN 'HIGH' THEN 0 WHEN 'MEDIUM' THEN 1 ELSE 2 END,
        created_at DESC
    `, [patientId, pharmacyId, sourceType]);

    // 2. 중복 체크 + 신규 저장
    const existingKeys = new Set(existing.map(a => `${a.action_type}:${a.source_key}`));
    const newActions: RawAction[] = [];

    for (const c of candidates) {
      const key = c.sourceKey || `${c.type}_unknown`;
      const dedupKey = `${c.type}:${key}`;

      // 이미 active면 스킵
      if (existingKeys.has(dedupKey)) continue;

      // 최근 completed/dismissed 체크
      const isDuplicate = await this.checkRecentDuplicate(
        patientId, c.type, sourceType, key,
      );
      if (isDuplicate) continue;

      // 저장
      const rows: RawAction[] = await this.ds.query(`
        INSERT INTO care_actions (patient_id, pharmacy_id, action_type, source_type, source_key, priority, title, description, payload, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'suggested')
        RETURNING *
      `, [patientId, pharmacyId, c.type, sourceType, key, c.priority, c.label, c.reason, null]);

      if (rows[0]) newActions.push(rows[0]);
    }

    // 3. expired 처리: 7일 이상 지난 suggested
    await this.ds.query(`
      UPDATE care_actions
      SET status = 'expired', updated_at = NOW()
      WHERE patient_id = $1 AND pharmacy_id = $2
        AND status = 'suggested'
        AND created_at < NOW() - INTERVAL '7 days'
    `, [patientId, pharmacyId]);

    // 4. 합쳐서 반환
    const all = [...existing, ...newActions];
    return all.map(toPersistedAction);
  }

  /**
   * 환자의 Action 목록 조회
   */
  async listActions(
    patientId: string,
    pharmacyId: string,
    statusFilter?: CareActionStatus[],
  ): Promise<CarePersistedAction[]> {
    let query = `
      SELECT * FROM care_actions
      WHERE patient_id = $1 AND pharmacy_id = $2
    `;
    const params: unknown[] = [patientId, pharmacyId];

    if (statusFilter && statusFilter.length > 0) {
      query += ` AND status = ANY($3)`;
      params.push(statusFilter);
    }

    query += ` ORDER BY
      CASE priority WHEN 'HIGH' THEN 0 WHEN 'MEDIUM' THEN 1 ELSE 2 END,
      created_at DESC
    `;

    const rows: RawAction[] = await this.ds.query(query, params);
    return rows.map(toPersistedAction);
  }

  /**
   * Action 시작: suggested → in_progress
   */
  async startAction(actionId: string, pharmacyId: string, userId: string): Promise<CarePersistedAction | null> {
    const rows: RawAction[] = await this.ds.query(`
      UPDATE care_actions
      SET status = 'in_progress', acted_by = $3, acted_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND pharmacy_id = $2 AND status = 'suggested'
      RETURNING *
    `, [actionId, pharmacyId, userId]);
    return rows[0] ? toPersistedAction(rows[0]) : null;
  }

  /**
   * Action 완료: suggested|in_progress → completed
   */
  async completeAction(actionId: string, pharmacyId: string, userId: string): Promise<CarePersistedAction | null> {
    const rows: RawAction[] = await this.ds.query(`
      UPDATE care_actions
      SET status = 'completed', acted_by = $3, completed_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND pharmacy_id = $2 AND status IN ('suggested', 'in_progress')
      RETURNING *
    `, [actionId, pharmacyId, userId]);
    return rows[0] ? toPersistedAction(rows[0]) : null;
  }

  /**
   * Action 보류: suggested|in_progress → dismissed
   */
  async dismissAction(actionId: string, pharmacyId: string, userId: string): Promise<CarePersistedAction | null> {
    const rows: RawAction[] = await this.ds.query(`
      UPDATE care_actions
      SET status = 'dismissed', acted_by = $3, dismissed_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND pharmacy_id = $2 AND status IN ('suggested', 'in_progress')
      RETURNING *
    `, [actionId, pharmacyId, userId]);
    return rows[0] ? toPersistedAction(rows[0]) : null;
  }

  // ── Private ──

  private async checkRecentDuplicate(
    patientId: string,
    actionType: string,
    sourceType: string,
    sourceKey: string,
  ): Promise<boolean> {
    const rows = await this.ds.query(`
      SELECT id, status, created_at, dismissed_at FROM care_actions
      WHERE patient_id = $1
        AND action_type = $2
        AND source_type = $3
        AND source_key = $4
        AND status IN ('suggested', 'in_progress', 'completed', 'dismissed')
        AND created_at > NOW() - make_interval(days => $5)
      ORDER BY created_at DESC
      LIMIT 1
    `, [patientId, actionType, sourceType, sourceKey, DEDUP_DAYS]);

    if (rows.length === 0) return false;

    const recent = rows[0];

    // expired는 재생성 가능 (위 쿼리에 포함 안 됨)
    // suggested/in_progress/completed → 3일 이내면 중복
    if (['suggested', 'in_progress', 'completed'].includes(recent.status)) {
      return true;
    }

    // dismissed → 24시간 유예
    if (recent.status === 'dismissed' && recent.dismissed_at) {
      const dismissedAt = new Date(recent.dismissed_at).getTime();
      const graceEnd = dismissedAt + DISMISSED_GRACE_HOURS * 60 * 60 * 1000;
      return Date.now() < graceEnd;
    }

    return false;
  }
}

// ── Raw DB row → PersistedAction ──

interface RawAction {
  id: string;
  patient_id: string;
  pharmacy_id: string;
  action_type: string;
  source_type: string;
  source_key: string;
  priority: string;
  title: string;
  description: string;
  payload: Record<string, unknown> | null;
  status: string;
  created_at: string;
  acted_at: string | null;
  completed_at: string | null;
  dismissed_at: string | null;
}

function toPersistedAction(r: RawAction): CarePersistedAction {
  const status = r.status as CareActionStatus;
  return {
    id: r.id,
    actionType: r.action_type as any,
    title: r.title,
    description: r.description,
    priority: r.priority as any,
    status,
    sourceType: r.source_type,
    sourceKey: r.source_key,
    createdAt: r.created_at,
    actedAt: r.acted_at,
    completedAt: r.completed_at,
    payload: r.payload,
    canStart: status === 'suggested',
    canComplete: status === 'suggested' || status === 'in_progress',
    canDismiss: status === 'suggested' || status === 'in_progress',
  };
}
