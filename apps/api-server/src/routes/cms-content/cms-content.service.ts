/**
 * CMS Content Service
 *
 * WO-O4O-CMS-TRANSITION-CENTRALIZATION-V1:
 * Centralized status transition logic for CMS content.
 * Matches Signage pattern (signage.service.ts transitionHq* methods).
 */

import type { DataSource, Repository } from 'typeorm';
import { CmsContent } from '@o4o-apps/cms-core';
import type { ContentStatus } from '@o4o-apps/cms-core';

/**
 * Allowed CMS content status transitions.
 *
 * WO-O4O-CMS-PENDING-STATE-IMPLEMENTATION-V1: 4-stage model
 *   draft     → pending | archived
 *   pending   → published | draft   (approve or reject)
 *   published → archived
 *   archived  → (terminal — no transitions)
 */
const CMS_ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ['pending', 'archived'],
  pending: ['published', 'draft'],
  published: ['archived'],
  archived: [],
};

const VALID_STATUSES: ContentStatus[] = ['draft', 'pending', 'published', 'archived'];

export class CmsContentService {
  private contentRepo: Repository<CmsContent>;

  constructor(private dataSource: DataSource) {
    this.contentRepo = dataSource.getRepository(CmsContent);
  }

  /**
   * Transition content status with guard validation.
   *
   * Validates:
   * 1. Content exists
   * 2. Target status is a valid ContentStatus
   * 3. Transition from current → target is allowed
   *
   * Side effects:
   * - Sets publishedAt when transitioning to 'published' (first time only)
   *
   * @returns Updated content or null if not found
   * @throws Error if status value invalid or transition not allowed
   */
  async transitionContentStatus(
    id: string,
    newStatus: string,
  ): Promise<CmsContent | null> {
    // 1. Validate target status
    if (!newStatus || !VALID_STATUSES.includes(newStatus as ContentStatus)) {
      throw new StatusValidationError(
        `Valid status required: ${VALID_STATUSES.join(', ')}`,
      );
    }

    // 2. Find content
    const content = await this.contentRepo.findOne({ where: { id } });
    if (!content) return null;

    // 3. Validate transition
    const currentStatus = content.status;
    const allowed = CMS_ALLOWED_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(newStatus)) {
      throw new StatusTransitionError(currentStatus, newStatus);
    }

    // 4. Apply status change
    content.status = newStatus as ContentStatus;

    // 5. Set publishedAt on first publish
    if (newStatus === 'published' && !content.publishedAt) {
      content.publishedAt = new Date();
    }

    // TODO: wrap in transaction when revenue hook is introduced
    const updated = await this.contentRepo.save(content);
    return updated;
  }
}

/**
 * Error thrown when an invalid status value is provided.
 */
export class StatusValidationError extends Error {
  code = 'VALIDATION_ERROR' as const;
  constructor(message: string) {
    super(message);
    this.name = 'StatusValidationError';
  }
}

/**
 * Error thrown when a status transition is not allowed.
 */
export class StatusTransitionError extends Error {
  code = 'INVALID_TRANSITION' as const;
  constructor(from: string, to: string) {
    super(`Cannot transition from ${from} to ${to}`);
    this.name = 'StatusTransitionError';
  }
}
