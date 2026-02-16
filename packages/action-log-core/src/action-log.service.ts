/**
 * ActionLog Service
 *
 * WO-PLATFORM-ACTION-LOG-CORE-V1
 *
 * Hub Trigger 실행 이력을 DB에 기록하는 서비스.
 * DataSource 주입으로 동작한다.
 */

import type { DataSource, Repository } from 'typeorm';
import { ActionLog } from './action-log.entity.js';
import type { ActionLogEntry } from './types.js';

export class ActionLogService {
  private repo: Repository<ActionLog>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(ActionLog);
  }

  /**
   * 액션 실행 결과를 기록한다.
   */
  async logAction(entry: ActionLogEntry): Promise<void> {
    await this.repo.insert({
      service_key: entry.serviceKey,
      user_id: entry.userId,
      organization_id: entry.organizationId ?? null,
      action_key: entry.actionKey,
      source: entry.source,
      status: entry.status,
      duration_ms: entry.durationMs ?? null,
      error_message: entry.errorMessage ?? null,
      meta: entry.meta ?? null,
    });
  }

  /**
   * 성공 기록 — 간편 헬퍼
   */
  async logSuccess(
    serviceKey: string,
    userId: string,
    actionKey: string,
    opts?: { organizationId?: string; source?: ActionLogEntry['source']; durationMs?: number; meta?: Record<string, any> },
  ): Promise<void> {
    await this.logAction({
      serviceKey,
      userId,
      organizationId: opts?.organizationId,
      actionKey,
      source: opts?.source ?? 'manual',
      status: 'success',
      durationMs: opts?.durationMs,
      meta: opts?.meta,
    });
  }

  /**
   * 실패 기록 — 간편 헬퍼
   */
  async logFailure(
    serviceKey: string,
    userId: string,
    actionKey: string,
    errorMessage: string,
    opts?: { organizationId?: string; source?: ActionLogEntry['source']; durationMs?: number; meta?: Record<string, any> },
  ): Promise<void> {
    await this.logAction({
      serviceKey,
      userId,
      organizationId: opts?.organizationId,
      actionKey,
      source: opts?.source ?? 'manual',
      status: 'failed',
      durationMs: opts?.durationMs,
      errorMessage,
      meta: opts?.meta,
    });
  }
}
