/**
 * O4O Event Log — minimal write-only utility
 *
 * WO-O4O-GLOBAL-EVENT-LOG-MINIMAL-V1
 *
 * Purpose: append rows to `o4o_event_logs` for cross-service event capture.
 * Read paths, admin UI, and analytics are explicitly out of scope.
 *
 * Contract:
 *   - MUST NOT throw. Event log failure must never affect the caller's API
 *     response. Errors are swallowed and logged at warn level.
 *   - Action format: `<entity>.<action>` (e.g. `course.approved`).
 *   - metadata stores facts only (status transitions, IDs, reasons) — no
 *     human-readable sentences.
 *
 * Initial caller: LMS approval flow (CourseService submit/approve/reject).
 */

import { AppDataSource } from '../database/connection.js';
import logger from '../utils/logger.js';

export interface LogEventInput {
  serviceKey: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId?: string | null;
  actorRole?: string | null;
  metadata?: Record<string, any>;
}

export async function logEvent(input: LogEventInput): Promise<void> {
  const {
    serviceKey,
    entityType,
    entityId,
    action,
    actorId = null,
    actorRole = null,
    metadata = {},
  } = input;

  try {
    await AppDataSource.query(
      `
      INSERT INTO o4o_event_logs
        (service_key, entity_type, entity_id, action, actor_id, actor_role, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [serviceKey, entityType, entityId, action, actorId, actorRole, JSON.stringify(metadata)],
    );
  } catch (err: any) {
    logger.warn('[EventLog] insert failed (swallowed)', {
      serviceKey,
      entityType,
      entityId,
      action,
      message: err?.message,
    });
  }
}
