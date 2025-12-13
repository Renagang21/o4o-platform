/**
 * Yaksa Scheduler Install Lifecycle Hook
 * Phase 19-A / Phase 19-E
 *
 * Registers default job seeds for Yaksa service automation
 */

import type { EntityManager } from 'typeorm';
import { ScheduledJob } from '../backend/entities/ScheduledJob.js';

export interface InstallContext {
  entityManager: EntityManager;
  organizationId?: string;
}

/**
 * Default job seeds for Yaksa services
 * Phase 19-E: 6 core automation jobs
 */
const DEFAULT_JOB_SEEDS: Array<Partial<ScheduledJob>> = [
  // ===== Annualfee-Yaksa Jobs =====
  {
    name: '미납 청구서 연체 체크',
    description: '매일 01:00에 납부기한이 지난 청구서를 연체 상태로 마킹',
    targetService: 'annualfee-yaksa',
    actionType: 'invoice_overdue_check',
    cronExpression: '0 1 * * *', // Every day at 01:00
    timezone: 'Asia/Seoul',
    status: 'active',
    config: {
      overdueThresholdDays: 0,
      notifyOnFailure: true,
    },
  },
  {
    name: '연회비 납부 알림',
    description: '매일 09:00에 미납 회원에게 납부 리마인더 발송',
    targetService: 'annualfee-yaksa',
    actionType: 'settlement_reminder',
    cronExpression: '0 9 * * *', // Every day at 09:00
    timezone: 'Asia/Seoul',
    status: 'active',
    config: {
      notifyOnSuccess: false,
      notifyOnFailure: true,
    },
  },

  // ===== Membership-Yaksa Jobs =====
  {
    name: '면허 검증 만료 체크',
    description: '매일 02:00에 만료된 면허 검증을 만료 상태로 마킹',
    targetService: 'membership-yaksa',
    actionType: 'verification_expiry_check',
    cronExpression: '0 2 * * *', // Every day at 02:00
    timezone: 'Asia/Seoul',
    status: 'active',
    config: {
      expiryWarningDays: 30,
      notifyOnFailure: true,
    },
  },
  {
    name: '면허 갱신 리마인더',
    description: '매일 09:30에 갱신 기한 임박 회원에게 알림 발송',
    targetService: 'membership-yaksa',
    actionType: 'license_renewal_reminder',
    cronExpression: '30 9 * * *', // Every day at 09:30
    timezone: 'Asia/Seoul',
    status: 'active',
    config: {
      expiryWarningDays: 30,
      notifyOnSuccess: false,
      notifyOnFailure: true,
    },
  },

  // ===== LMS-Yaksa Jobs =====
  {
    name: '교육 배정 만료 체크',
    description: '매일 03:00에 기한이 지난 교육 배정을 만료 상태로 마킹',
    targetService: 'lms-yaksa',
    actionType: 'assignment_expiry_check',
    cronExpression: '0 3 * * *', // Every day at 03:00
    timezone: 'Asia/Seoul',
    status: 'active',
    config: {
      notifyOnFailure: true,
    },
  },

  // ===== Reporting-Yaksa Jobs =====
  {
    name: '실패 제출 재시도',
    description: '매일 04:00에 외부 제출 실패 건 자동 재시도',
    targetService: 'reporting-yaksa',
    actionType: 'failed_submission_retry',
    cronExpression: '0 4 * * *', // Every day at 04:00
    timezone: 'Asia/Seoul',
    status: 'active',
    config: {
      maxRetries: 3,
      retryDelayMinutes: 30,
      notifyOnFailure: true,
    },
  },
];

export async function install(context: InstallContext): Promise<void> {
  console.log('[yaksa-scheduler] Installing...');

  const { entityManager, organizationId } = context;

  try {
    // Seed default jobs if this is an organization install
    if (organizationId) {
      await seedDefaultJobs(entityManager, organizationId);
    } else {
      console.log('[yaksa-scheduler] Skipping job seeding (no organizationId)');
    }

    console.log('[yaksa-scheduler] Install complete');
  } catch (error) {
    console.error('[yaksa-scheduler] Install failed:', error);
    throw error;
  }
}

/**
 * Seed default jobs for an organization
 */
async function seedDefaultJobs(
  entityManager: EntityManager,
  organizationId: string
): Promise<void> {
  console.log(`[yaksa-scheduler] Seeding default jobs for org: ${organizationId}`);

  const jobRepo = entityManager.getRepository(ScheduledJob);

  for (const seed of DEFAULT_JOB_SEEDS) {
    // Check if job already exists
    const existing = await jobRepo.findOne({
      where: {
        organizationId,
        targetService: seed.targetService,
        actionType: seed.actionType,
      },
    });

    if (existing) {
      console.log(`[yaksa-scheduler] Job already exists: ${seed.name}`);
      continue;
    }

    // Create new job
    const job = jobRepo.create({
      ...seed,
      organizationId,
    });

    await jobRepo.save(job);
    console.log(`[yaksa-scheduler] Created job: ${seed.name}`);
  }

  console.log('[yaksa-scheduler] Job seeding complete');
}

/**
 * Seed jobs for a specific organization (callable from admin API)
 */
export async function seedJobsForOrganization(
  entityManager: EntityManager,
  organizationId: string
): Promise<{ created: number; skipped: number }> {
  const jobRepo = entityManager.getRepository(ScheduledJob);
  let created = 0;
  let skipped = 0;

  for (const seed of DEFAULT_JOB_SEEDS) {
    const existing = await jobRepo.findOne({
      where: {
        organizationId,
        targetService: seed.targetService,
        actionType: seed.actionType,
      },
    });

    if (existing) {
      skipped++;
      continue;
    }

    const job = jobRepo.create({
      ...seed,
      organizationId,
    });

    await jobRepo.save(job);
    created++;
  }

  return { created, skipped };
}

export default install;
