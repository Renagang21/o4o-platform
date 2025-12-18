/**
 * Yaksa Scheduler Install Lifecycle Hook
 * Phase 19-A / Phase R1: Structural Stabilization
 *
 * Phase R1 변경:
 * - 하드코딩된 DEFAULT_JOB_SEEDS 제거
 * - JobRegistry를 통해 각 앱이 등록한 Job 정의만 seed
 * - Scheduler는 특정 앱을 알지 않는다
 */

import type { EntityManager } from 'typeorm';
import { ScheduledJob } from '../backend/entities/ScheduledJob.js';
import { jobRegistry } from '../registry/JobRegistry.js';

export interface InstallContext {
  entityManager: EntityManager;
  organizationId?: string;
}

/**
 * Install hook
 *
 * Phase R1: Scheduler의 install은 테이블 구조만 보장
 * Job seeding은 각 앱의 install/activate에서 담당
 */
export async function install(context: InstallContext): Promise<void> {
  console.log('[yaksa-scheduler] Installing...');

  const { entityManager, organizationId } = context;

  try {
    // Phase R1: Scheduler의 install은 인프라 준비만 담당
    // 각 앱의 Job seed는 해당 앱의 lifecycle에서 처리
    console.log('[yaksa-scheduler] Phase R1: Scheduler does not seed app-specific jobs');
    console.log('[yaksa-scheduler] Each app should register and seed its own jobs via JobRegistry');

    // 기존 Job 확인 (마이그레이션 지원)
    if (organizationId) {
      const jobRepo = entityManager.getRepository(ScheduledJob);
      const existingJobs = await jobRepo.count({ where: { organizationId } });
      console.log(`[yaksa-scheduler] Organization ${organizationId} has ${existingJobs} existing jobs`);
    }

    console.log('[yaksa-scheduler] Install complete');
  } catch (error) {
    console.error('[yaksa-scheduler] Install failed:', error);
    throw error;
  }
}

/**
 * Seed jobs from JobRegistry for a specific organization
 *
 * 각 앱의 install()에서 호출하여 자신의 Job을 seed
 * 예: membership-yaksa.install() -> seedJobsFromRegistry('membership-yaksa', orgId)
 *
 * @param entityManager TypeORM EntityManager
 * @param targetService 앱의 service ID
 * @param organizationId 조직 ID
 */
export async function seedJobsFromRegistry(
  entityManager: EntityManager,
  targetService: string,
  organizationId: string
): Promise<{ created: number; skipped: number }> {
  console.log(`[yaksa-scheduler] Seeding jobs from registry for: ${targetService}`);

  const jobRepo = entityManager.getRepository(ScheduledJob);
  const jobDefinitions = jobRegistry.getJobDefinitionsForService(targetService);

  let created = 0;
  let skipped = 0;

  for (const def of jobDefinitions) {
    // 중복 체크
    const existing = await jobRepo.findOne({
      where: {
        organizationId,
        targetService: def.targetService,
        actionType: def.actionType,
      },
    });

    if (existing) {
      console.log(`[yaksa-scheduler] Job already exists: ${def.name}`);
      skipped++;
      continue;
    }

    // Job 생성
    const job = jobRepo.create({
      name: def.name,
      description: def.description,
      targetService: def.targetService,
      actionType: def.actionType,
      cronExpression: def.defaultCronExpression,
      timezone: def.timezone || 'Asia/Seoul',
      status: 'active',
      config: def.defaultConfig,
      organizationId,
    });

    await jobRepo.save(job);
    console.log(`[yaksa-scheduler] Created job: ${def.name}`);
    created++;
  }

  return { created, skipped };
}

/**
 * @deprecated Use seedJobsFromRegistry instead
 * Kept for backward compatibility during migration
 */
export async function seedJobsForOrganization(
  entityManager: EntityManager,
  organizationId: string
): Promise<{ created: number; skipped: number }> {
  console.warn('[yaksa-scheduler] seedJobsForOrganization is deprecated. Use seedJobsFromRegistry instead.');

  // Phase R1: 모든 등록된 Job 정의에서 seed
  const allDefinitions = jobRegistry.getAllJobDefinitions();

  if (allDefinitions.length === 0) {
    console.warn('[yaksa-scheduler] No job definitions registered in JobRegistry');
    return { created: 0, skipped: 0 };
  }

  const jobRepo = entityManager.getRepository(ScheduledJob);
  let created = 0;
  let skipped = 0;

  for (const def of allDefinitions) {
    const existing = await jobRepo.findOne({
      where: {
        organizationId,
        targetService: def.targetService,
        actionType: def.actionType,
      },
    });

    if (existing) {
      skipped++;
      continue;
    }

    const job = jobRepo.create({
      name: def.name,
      description: def.description,
      targetService: def.targetService,
      actionType: def.actionType,
      cronExpression: def.defaultCronExpression,
      timezone: def.timezone || 'Asia/Seoul',
      status: 'active',
      config: def.defaultConfig,
      organizationId,
    });

    await jobRepo.save(job);
    created++;
  }

  return { created, skipped };
}

export default install;
