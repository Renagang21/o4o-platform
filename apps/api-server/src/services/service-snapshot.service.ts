/**
 * Service Snapshot & Restore Service
 * Phase 11 - Task 11.5
 *
 * 서비스의 완전한 스냅샷 생성 및 복원을 담당합니다.
 * - 전체 데이터 스냅샷
 * - 설정 및 메타데이터 스냅샷
 * - Point-in-time 복원
 * - 선택적 복원 (partial restore)
 */

import { Injectable, Logger } from '@nestjs/common';

// ============================================================
// Type Definitions
// ============================================================

/**
 * 스냅샷 유형
 */
type SnapshotType = 'full' | 'incremental' | 'differential' | 'config_only';

/**
 * 스냅샷 상태
 */
type SnapshotStatus =
  | 'pending'
  | 'creating'
  | 'completed'
  | 'failed'
  | 'expired'
  | 'deleted';

/**
 * 복원 상태
 */
type RestoreStatus =
  | 'pending'
  | 'validating'
  | 'restoring'
  | 'completed'
  | 'failed'
  | 'rolled_back';

/**
 * 스냅샷 컴포넌트
 */
interface SnapshotComponent {
  name: string;
  type: 'database' | 'config' | 'files' | 'metadata';
  size: number;       // bytes
  recordCount?: number;
  checksum: string;
  compressed: boolean;
  encryptionKey?: string;
}

/**
 * 스냅샷 메타데이터
 */
interface SnapshotMetadata {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: SnapshotType;

  // 버전 정보
  platformVersion: string;
  templateId?: string;
  templateVersion?: string;

  // 컴포넌트 정보
  components: SnapshotComponent[];
  totalSize: number;

  // 상태
  status: SnapshotStatus;
  progress: number;

  // 타임스탬프
  createdAt: Date;
  completedAt?: Date;
  expiresAt?: Date;

  // 생성자
  createdBy: string;

  // 저장 위치
  storageLocation: string;
  storageType: 'local' | 's3' | 'gcs' | 'azure';

  // 기준 스냅샷 (incremental/differential용)
  baseSnapshotId?: string;

  // 태그
  tags?: string[];
}

/**
 * 스냅샷 생성 요청
 */
interface CreateSnapshotRequest {
  tenantId: string;
  name: string;
  description?: string;
  type: SnapshotType;

  // 포함할 컴포넌트
  includeComponents?: {
    database?: boolean;
    config?: boolean;
    files?: boolean;
    metadata?: boolean;
  };

  // 특정 엔티티만 포함
  includeEntities?: string[];
  excludeEntities?: string[];

  // 만료 설정
  retentionDays?: number;

  // 압축 및 암호화
  compress?: boolean;
  encrypt?: boolean;
  encryptionKey?: string;

  // 태그
  tags?: string[];
}

/**
 * 복원 요청
 */
interface RestoreRequest {
  snapshotId: string;
  targetTenantId: string;

  // 복원 옵션
  restoreType: 'full' | 'partial' | 'config_only';

  // 부분 복원 설정
  partialRestore?: {
    components?: string[];
    entities?: string[];
  };

  // 충돌 처리
  conflictStrategy: 'overwrite' | 'skip' | 'merge' | 'fail';

  // 데이터 변환
  dataTransformations?: Array<{
    entity: string;
    field: string;
    transform: string;
  }>;

  // 검증
  validateBeforeRestore?: boolean;
  dryRun?: boolean;
}

/**
 * 복원 작업
 */
interface RestoreJob {
  id: string;
  snapshotId: string;
  request: RestoreRequest;
  status: RestoreStatus;

  // 진행 상태
  progress: number;
  currentStep?: string;
  steps: Array<{
    name: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
    recordsProcessed?: number;
    totalRecords?: number;
    startedAt?: Date;
    completedAt?: Date;
    error?: string;
  }>;

  // 검증 결과
  validationResult?: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    checksumVerified: boolean;
  };

  // 결과
  result?: {
    restored: boolean;
    componentsRestored: string[];
    recordsRestored: number;
    conflicts: number;
    skipped: number;
    warnings: string[];
  };

  // 타임스탬프
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;

  // 롤백 정보
  rollbackSnapshotId?: string;
}

/**
 * 스냅샷 비교 결과
 */
interface SnapshotComparison {
  snapshot1Id: string;
  snapshot2Id: string;

  // 변경 요약
  summary: {
    addedEntities: number;
    removedEntities: number;
    modifiedEntities: number;
    configChanges: number;
  };

  // 상세 변경사항
  changes: Array<{
    component: string;
    entity?: string;
    changeType: 'added' | 'removed' | 'modified';
    details?: string;
    recordCount?: number;
  }>;

  // 크기 변화
  sizeChange: {
    snapshot1Size: number;
    snapshot2Size: number;
    difference: number;
    percentChange: number;
  };
}

/**
 * 스냅샷 정책
 */
interface SnapshotPolicy {
  id: string;
  tenantId: string;
  name: string;
  enabled: boolean;

  // 스케줄
  schedule: {
    type: 'daily' | 'weekly' | 'monthly' | 'custom';
    cronExpression?: string;
    time?: string;        // HH:mm
    dayOfWeek?: number;   // 0-6
    dayOfMonth?: number;  // 1-31
  };

  // 스냅샷 설정
  snapshotConfig: {
    type: SnapshotType;
    name_template: string;  // e.g., "{tenant}_{date}_{type}"
    compress: boolean;
    encrypt: boolean;
  };

  // 보존 정책
  retention: {
    keepLast: number;          // 최근 N개 유지
    keepDaily?: number;        // 일별 N개 유지
    keepWeekly?: number;       // 주별 N개 유지
    keepMonthly?: number;      // 월별 N개 유지
    maxAge?: number;           // 최대 보존 일수
  };

  // 통계
  lastRun?: Date;
  nextRun?: Date;
  totalSnapshots?: number;
}

/**
 * 스냅샷 통계
 */
interface SnapshotStats {
  tenantId: string;
  totalSnapshots: number;
  totalSize: number;

  byType: Record<SnapshotType, {
    count: number;
    totalSize: number;
  }>;

  byStatus: Record<SnapshotStatus, number>;

  // 시간별 추세
  trend: Array<{
    date: string;
    count: number;
    size: number;
  }>;

  // 최근 활동
  lastSnapshot?: Date;
  lastRestore?: Date;
}

// ============================================================
// Service Implementation
// ============================================================

@Injectable()
export class ServiceSnapshotService {
  private readonly logger = new Logger(ServiceSnapshotService.name);

  // In-memory storage (실제로는 DB 사용)
  private snapshots = new Map<string, SnapshotMetadata>();
  private restoreJobs = new Map<string, RestoreJob>();
  private policies = new Map<string, SnapshotPolicy>();

  constructor() {
    this.initializeSampleData();
  }

  /**
   * 샘플 데이터 초기화
   */
  private initializeSampleData(): void {
    // 샘플 스냅샷
    const sampleSnapshots: SnapshotMetadata[] = [
      {
        id: 'snap-001',
        tenantId: 'tenant-yaksa-001',
        name: 'yaksa-daily-20251210',
        description: '일일 자동 스냅샷',
        type: 'full',
        platformVersion: '1.0.0',
        templateId: 'yaksa-intranet',
        templateVersion: '1.2.0',
        components: [
          { name: 'database', type: 'database', size: 52428800, recordCount: 15000, checksum: 'abc123', compressed: true },
          { name: 'config', type: 'config', size: 1024, checksum: 'def456', compressed: false },
          { name: 'files', type: 'files', size: 10485760, checksum: 'ghi789', compressed: true }
        ],
        totalSize: 62915584,
        status: 'completed',
        progress: 100,
        createdAt: new Date('2025-12-10T02:00:00Z'),
        completedAt: new Date('2025-12-10T02:05:30Z'),
        expiresAt: new Date('2026-01-10T02:00:00Z'),
        createdBy: 'system',
        storageLocation: '/snapshots/tenant-yaksa-001/snap-001',
        storageType: 'local',
        tags: ['daily', 'automated']
      },
      {
        id: 'snap-002',
        tenantId: 'tenant-cosmetics-001',
        name: 'cosmetics-pre-upgrade',
        description: '업그레이드 전 백업',
        type: 'full',
        platformVersion: '1.0.0',
        templateId: 'cosmetics-dropshipping',
        templateVersion: '2.0.0',
        components: [
          { name: 'database', type: 'database', size: 104857600, recordCount: 50000, checksum: 'xyz123', compressed: true },
          { name: 'config', type: 'config', size: 2048, checksum: 'uvw456', compressed: false }
        ],
        totalSize: 104859648,
        status: 'completed',
        progress: 100,
        createdAt: new Date('2025-12-09T10:00:00Z'),
        completedAt: new Date('2025-12-09T10:12:45Z'),
        createdBy: 'admin@example.com',
        storageLocation: '/snapshots/tenant-cosmetics-001/snap-002',
        storageType: 's3',
        tags: ['pre-upgrade', 'manual']
      }
    ];

    sampleSnapshots.forEach(snap => {
      this.snapshots.set(snap.id, snap);
    });

    // 샘플 정책
    const samplePolicy: SnapshotPolicy = {
      id: 'policy-001',
      tenantId: 'tenant-yaksa-001',
      name: 'Daily Full Backup',
      enabled: true,
      schedule: {
        type: 'daily',
        time: '02:00'
      },
      snapshotConfig: {
        type: 'full',
        name_template: '{tenant}_daily_{date}',
        compress: true,
        encrypt: false
      },
      retention: {
        keepLast: 7,
        keepWeekly: 4,
        keepMonthly: 3,
        maxAge: 90
      },
      lastRun: new Date('2025-12-10T02:00:00Z'),
      nextRun: new Date('2025-12-11T02:00:00Z'),
      totalSnapshots: 7
    };

    this.policies.set(samplePolicy.id, samplePolicy);

    this.logger.log(`Snapshot Service 초기화: ${this.snapshots.size}개 스냅샷, ${this.policies.size}개 정책`);
  }

  // ============================================================
  // Snapshot Creation
  // ============================================================

  /**
   * 스냅샷 생성
   */
  async createSnapshot(request: CreateSnapshotRequest): Promise<SnapshotMetadata> {
    const snapshotId = `snap-${Date.now()}`;

    this.logger.log(`스냅샷 생성 시작: ${snapshotId} (tenant: ${request.tenantId})`);

    const includeComponents = request.includeComponents ?? {
      database: true,
      config: true,
      files: true,
      metadata: true
    };

    const snapshot: SnapshotMetadata = {
      id: snapshotId,
      tenantId: request.tenantId,
      name: request.name,
      description: request.description,
      type: request.type,
      platformVersion: '1.0.0',
      components: [],
      totalSize: 0,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
      expiresAt: request.retentionDays
        ? new Date(Date.now() + request.retentionDays * 24 * 60 * 60 * 1000)
        : undefined,
      createdBy: 'system',
      storageLocation: `/snapshots/${request.tenantId}/${snapshotId}`,
      storageType: 'local',
      tags: request.tags
    };

    this.snapshots.set(snapshotId, snapshot);

    // 비동기로 스냅샷 생성 실행
    this.executeSnapshotCreation(snapshot, includeComponents, request).catch(err => {
      this.logger.error(`스냅샷 생성 실패: ${snapshotId}`, err);
    });

    return snapshot;
  }

  /**
   * 스냅샷 생성 실행
   */
  private async executeSnapshotCreation(
    snapshot: SnapshotMetadata,
    includeComponents: CreateSnapshotRequest['includeComponents'],
    request: CreateSnapshotRequest
  ): Promise<void> {
    try {
      snapshot.status = 'creating';
      let totalSize = 0;
      const components: SnapshotComponent[] = [];

      // 1. 데이터베이스 스냅샷
      if (includeComponents?.database) {
        snapshot.progress = 10;
        this.logger.debug(`${snapshot.id}: 데이터베이스 스냅샷 생성 중...`);

        const dbSnapshot = await this.createDatabaseSnapshot(
          snapshot.tenantId,
          request.includeEntities,
          request.excludeEntities,
          request.compress ?? true
        );

        components.push(dbSnapshot);
        totalSize += dbSnapshot.size;
        snapshot.progress = 40;
      }

      // 2. 설정 스냅샷
      if (includeComponents?.config) {
        this.logger.debug(`${snapshot.id}: 설정 스냅샷 생성 중...`);

        const configSnapshot = await this.createConfigSnapshot(snapshot.tenantId);
        components.push(configSnapshot);
        totalSize += configSnapshot.size;
        snapshot.progress = 60;
      }

      // 3. 파일 스냅샷
      if (includeComponents?.files) {
        this.logger.debug(`${snapshot.id}: 파일 스냅샷 생성 중...`);

        const fileSnapshot = await this.createFileSnapshot(
          snapshot.tenantId,
          request.compress ?? true
        );

        components.push(fileSnapshot);
        totalSize += fileSnapshot.size;
        snapshot.progress = 80;
      }

      // 4. 메타데이터 스냅샷
      if (includeComponents?.metadata) {
        this.logger.debug(`${snapshot.id}: 메타데이터 스냅샷 생성 중...`);

        const metadataSnapshot = await this.createMetadataSnapshot(snapshot.tenantId);
        components.push(metadataSnapshot);
        totalSize += metadataSnapshot.size;
        snapshot.progress = 95;
      }

      // 5. 완료
      snapshot.components = components;
      snapshot.totalSize = totalSize;
      snapshot.status = 'completed';
      snapshot.progress = 100;
      snapshot.completedAt = new Date();

      this.logger.log(`스냅샷 생성 완료: ${snapshot.id} (${this.formatSize(totalSize)})`);

    } catch (error: any) {
      snapshot.status = 'failed';
      this.logger.error(`스냅샷 생성 실패: ${snapshot.id}`, error);
    }
  }

  /**
   * 데이터베이스 스냅샷 생성
   */
  private async createDatabaseSnapshot(
    tenantId: string,
    includeEntities?: string[],
    excludeEntities?: string[],
    compress?: boolean
  ): Promise<SnapshotComponent> {
    await this.simulateDelay(2000);

    // 시뮬레이션된 데이터
    const recordCount = Math.floor(Math.random() * 50000) + 10000;
    const baseSize = recordCount * 1024;  // 레코드당 ~1KB
    const size = compress ? Math.floor(baseSize * 0.3) : baseSize;

    return {
      name: 'database',
      type: 'database',
      size,
      recordCount,
      checksum: this.generateChecksum(),
      compressed: compress ?? true
    };
  }

  /**
   * 설정 스냅샷 생성
   */
  private async createConfigSnapshot(tenantId: string): Promise<SnapshotComponent> {
    await this.simulateDelay(500);

    return {
      name: 'config',
      type: 'config',
      size: 2048 + Math.floor(Math.random() * 1024),
      checksum: this.generateChecksum(),
      compressed: false
    };
  }

  /**
   * 파일 스냅샷 생성
   */
  private async createFileSnapshot(
    tenantId: string,
    compress?: boolean
  ): Promise<SnapshotComponent> {
    await this.simulateDelay(1500);

    const baseSize = Math.floor(Math.random() * 50 * 1024 * 1024);  // 0-50MB
    const size = compress ? Math.floor(baseSize * 0.5) : baseSize;

    return {
      name: 'files',
      type: 'files',
      size,
      checksum: this.generateChecksum(),
      compressed: compress ?? true
    };
  }

  /**
   * 메타데이터 스냅샷 생성
   */
  private async createMetadataSnapshot(tenantId: string): Promise<SnapshotComponent> {
    await this.simulateDelay(300);

    return {
      name: 'metadata',
      type: 'metadata',
      size: 512 + Math.floor(Math.random() * 512),
      checksum: this.generateChecksum(),
      compressed: false
    };
  }

  // ============================================================
  // Snapshot Restore
  // ============================================================

  /**
   * 스냅샷 복원 시작
   */
  async startRestore(request: RestoreRequest): Promise<RestoreJob> {
    const jobId = `restore-${Date.now()}`;

    this.logger.log(`스냅샷 복원 시작: ${jobId} (snapshot: ${request.snapshotId})`);

    const snapshot = this.snapshots.get(request.snapshotId);
    if (!snapshot) {
      throw new Error(`Snapshot not found: ${request.snapshotId}`);
    }

    if (snapshot.status !== 'completed') {
      throw new Error('완료된 스냅샷만 복원할 수 있습니다.');
    }

    const steps = this.buildRestoreSteps(request, snapshot);

    const job: RestoreJob = {
      id: jobId,
      snapshotId: request.snapshotId,
      request,
      status: 'pending',
      progress: 0,
      steps,
      createdAt: new Date()
    };

    this.restoreJobs.set(jobId, job);

    // Dry run인 경우 검증만 수행
    if (request.dryRun) {
      await this.validateRestore(job, snapshot);
      return job;
    }

    // 실제 복원 실행 (비동기)
    this.executeRestore(job, snapshot).catch(err => {
      this.logger.error(`복원 실패: ${jobId}`, err);
    });

    return job;
  }

  /**
   * 복원 단계 빌드
   */
  private buildRestoreSteps(
    request: RestoreRequest,
    snapshot: SnapshotMetadata
  ): RestoreJob['steps'] {
    const steps: RestoreJob['steps'] = [
      { name: 'validate_snapshot', status: 'pending' },
      { name: 'verify_checksum', status: 'pending' },
      { name: 'create_rollback_point', status: 'pending' }
    ];

    // 컴포넌트별 복원 단계 추가
    if (request.restoreType === 'full') {
      snapshot.components.forEach(comp => {
        steps.push({
          name: `restore_${comp.name}`,
          status: 'pending',
          totalRecords: comp.recordCount
        });
      });
    } else if (request.restoreType === 'partial' && request.partialRestore?.components) {
      request.partialRestore.components.forEach(compName => {
        const comp = snapshot.components.find(c => c.name === compName);
        if (comp) {
          steps.push({
            name: `restore_${comp.name}`,
            status: 'pending',
            totalRecords: comp.recordCount
          });
        }
      });
    } else if (request.restoreType === 'config_only') {
      steps.push({ name: 'restore_config', status: 'pending' });
    }

    steps.push({ name: 'verify_restore', status: 'pending' });

    return steps;
  }

  /**
   * 복원 검증
   */
  private async validateRestore(
    job: RestoreJob,
    snapshot: SnapshotMetadata
  ): Promise<void> {
    job.status = 'validating';

    const errors: string[] = [];
    const warnings: string[] = [];
    let checksumVerified = true;

    // 스냅샷 상태 검증
    if (snapshot.status !== 'completed') {
      errors.push('스냅샷이 완료 상태가 아닙니다.');
    }

    // 만료 검증
    if (snapshot.expiresAt && new Date() > snapshot.expiresAt) {
      warnings.push('스냅샷이 만료되었습니다.');
    }

    // 체크섬 검증 (시뮬레이션)
    for (const comp of snapshot.components) {
      const isValid = Math.random() > 0.05;  // 95% 확률로 유효
      if (!isValid) {
        errors.push(`${comp.name} 컴포넌트 체크섬 검증 실패`);
        checksumVerified = false;
      }
    }

    // 타겟 tenant 검증
    if (job.request.targetTenantId !== snapshot.tenantId) {
      warnings.push('다른 tenant로 복원합니다. 데이터 충돌이 발생할 수 있습니다.');
    }

    job.validationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
      checksumVerified
    };

    this.updateStep(job, 'validate_snapshot', errors.length === 0 ? 'completed' : 'failed');
    job.progress = 100;
    job.status = 'completed';
  }

  /**
   * 복원 실행
   */
  private async executeRestore(
    job: RestoreJob,
    snapshot: SnapshotMetadata
  ): Promise<void> {
    try {
      job.status = 'validating';
      job.startedAt = new Date();

      // Step 1: 스냅샷 검증
      await this.executeStep(job, 'validate_snapshot', async () => {
        await this.validateRestore(job, snapshot);
        if (!job.validationResult?.isValid && job.request.validateBeforeRestore) {
          throw new Error('스냅샷 검증 실패: ' + job.validationResult?.errors.join(', '));
        }
      });

      // Step 2: 체크섬 검증
      await this.executeStep(job, 'verify_checksum', async () => {
        await this.simulateDelay(1000);
      });

      job.status = 'restoring';

      // Step 3: 롤백 포인트 생성
      await this.executeStep(job, 'create_rollback_point', async () => {
        const rollbackSnapshot = await this.createSnapshot({
          tenantId: job.request.targetTenantId,
          name: `rollback-before-${job.id}`,
          description: `복원 전 자동 백업 (${job.id})`,
          type: 'full',
          retentionDays: 7,
          tags: ['rollback', 'auto']
        });
        job.rollbackSnapshotId = rollbackSnapshot.id;
        await this.simulateDelay(2000);
      });

      // Step 4+: 컴포넌트별 복원
      let recordsRestored = 0;
      const componentsRestored: string[] = [];
      let conflicts = 0;
      let skipped = 0;

      const restoreSteps = job.steps.filter(s => s.name.startsWith('restore_'));

      for (const step of restoreSteps) {
        const compName = step.name.replace('restore_', '');

        await this.executeStep(job, step.name, async () => {
          const comp = snapshot.components.find(c => c.name === compName);

          if (comp) {
            // 복원 시뮬레이션
            const totalRecords = comp.recordCount ?? 100;
            step.totalRecords = totalRecords;

            for (let i = 0; i < 10; i++) {
              await this.simulateDelay(200);
              step.recordsProcessed = Math.floor(totalRecords * (i + 1) / 10);
            }

            recordsRestored += totalRecords;
            componentsRestored.push(compName);

            // 충돌 시뮬레이션
            if (job.request.conflictStrategy !== 'overwrite') {
              conflicts += Math.floor(Math.random() * 10);
            }
          }
        });
      }

      // 마지막 단계: 복원 검증
      await this.executeStep(job, 'verify_restore', async () => {
        await this.simulateDelay(1000);
      });

      // 완료
      job.status = 'completed';
      job.progress = 100;
      job.completedAt = new Date();
      job.result = {
        restored: true,
        componentsRestored,
        recordsRestored,
        conflicts,
        skipped,
        warnings: job.validationResult?.warnings ?? []
      };

      this.logger.log(`스냅샷 복원 완료: ${job.id}`);

    } catch (error: any) {
      job.status = 'failed';
      job.error = error.message;
      job.completedAt = new Date();
      this.logger.error(`스냅샷 복원 실패: ${job.id}`, error);
    }
  }

  /**
   * 복원 롤백
   */
  async rollbackRestore(jobId: string): Promise<RestoreJob> {
    const job = this.restoreJobs.get(jobId);
    if (!job) {
      throw new Error(`Restore job not found: ${jobId}`);
    }

    if (!job.rollbackSnapshotId) {
      throw new Error('롤백 스냅샷이 없습니다.');
    }

    this.logger.log(`복원 롤백 시작: ${jobId}`);

    // 롤백 스냅샷으로 복원
    const rollbackJob = await this.startRestore({
      snapshotId: job.rollbackSnapshotId,
      targetTenantId: job.request.targetTenantId,
      restoreType: 'full',
      conflictStrategy: 'overwrite'
    });

    job.status = 'rolled_back';

    return rollbackJob;
  }

  // ============================================================
  // Snapshot Management
  // ============================================================

  /**
   * 스냅샷 조회
   */
  getSnapshot(snapshotId: string): SnapshotMetadata | undefined {
    return this.snapshots.get(snapshotId);
  }

  /**
   * Tenant의 모든 스냅샷 조회
   */
  getSnapshotsByTenant(tenantId: string): SnapshotMetadata[] {
    return Array.from(this.snapshots.values())
      .filter(snap => snap.tenantId === tenantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * 스냅샷 삭제
   */
  async deleteSnapshot(snapshotId: string): Promise<boolean> {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) {
      return false;
    }

    // 실제로는 스토리지에서 파일 삭제
    this.logger.log(`스냅샷 삭제: ${snapshotId}`);

    snapshot.status = 'deleted';
    this.snapshots.delete(snapshotId);

    return true;
  }

  /**
   * 만료된 스냅샷 정리
   */
  async cleanupExpiredSnapshots(): Promise<number> {
    const now = new Date();
    let cleaned = 0;

    for (const [id, snapshot] of this.snapshots) {
      if (snapshot.expiresAt && snapshot.expiresAt < now) {
        await this.deleteSnapshot(id);
        cleaned++;
      }
    }

    this.logger.log(`만료 스냅샷 정리 완료: ${cleaned}개 삭제`);
    return cleaned;
  }

  /**
   * 스냅샷 비교
   */
  async compareSnapshots(snapshot1Id: string, snapshot2Id: string): Promise<SnapshotComparison> {
    const snap1 = this.snapshots.get(snapshot1Id);
    const snap2 = this.snapshots.get(snapshot2Id);

    if (!snap1 || !snap2) {
      throw new Error('스냅샷을 찾을 수 없습니다.');
    }

    // 시뮬레이션된 비교 결과
    const changes: SnapshotComparison['changes'] = [];

    // 컴포넌트 비교
    const comp1Names = new Set(snap1.components.map(c => c.name));
    const comp2Names = new Set(snap2.components.map(c => c.name));

    // 추가된 컴포넌트
    comp2Names.forEach(name => {
      if (!comp1Names.has(name)) {
        changes.push({
          component: name,
          changeType: 'added',
          details: '새 컴포넌트'
        });
      }
    });

    // 제거된 컴포넌트
    comp1Names.forEach(name => {
      if (!comp2Names.has(name)) {
        changes.push({
          component: name,
          changeType: 'removed',
          details: '제거된 컴포넌트'
        });
      }
    });

    // 수정된 컴포넌트
    snap1.components.forEach(c1 => {
      const c2 = snap2.components.find(c => c.name === c1.name);
      if (c2 && c1.checksum !== c2.checksum) {
        changes.push({
          component: c1.name,
          changeType: 'modified',
          recordCount: (c2.recordCount ?? 0) - (c1.recordCount ?? 0)
        });
      }
    });

    return {
      snapshot1Id,
      snapshot2Id,
      summary: {
        addedEntities: changes.filter(c => c.changeType === 'added').length,
        removedEntities: changes.filter(c => c.changeType === 'removed').length,
        modifiedEntities: changes.filter(c => c.changeType === 'modified').length,
        configChanges: 0
      },
      changes,
      sizeChange: {
        snapshot1Size: snap1.totalSize,
        snapshot2Size: snap2.totalSize,
        difference: snap2.totalSize - snap1.totalSize,
        percentChange: ((snap2.totalSize - snap1.totalSize) / snap1.totalSize) * 100
      }
    };
  }

  // ============================================================
  // Snapshot Policy Management
  // ============================================================

  /**
   * 스냅샷 정책 생성
   */
  async createPolicy(policy: Omit<SnapshotPolicy, 'id' | 'lastRun' | 'nextRun' | 'totalSnapshots'>): Promise<SnapshotPolicy> {
    const policyId = `policy-${Date.now()}`;

    const newPolicy: SnapshotPolicy = {
      ...policy,
      id: policyId,
      nextRun: this.calculateNextRun(policy.schedule),
      totalSnapshots: 0
    };

    this.policies.set(policyId, newPolicy);
    this.logger.log(`스냅샷 정책 생성: ${policyId}`);

    return newPolicy;
  }

  /**
   * 정책 조회
   */
  getPolicy(policyId: string): SnapshotPolicy | undefined {
    return this.policies.get(policyId);
  }

  /**
   * Tenant의 정책 조회
   */
  getPoliciesByTenant(tenantId: string): SnapshotPolicy[] {
    return Array.from(this.policies.values())
      .filter(p => p.tenantId === tenantId);
  }

  /**
   * 정책 업데이트
   */
  async updatePolicy(policyId: string, updates: Partial<SnapshotPolicy>): Promise<SnapshotPolicy> {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    Object.assign(policy, updates);

    if (updates.schedule) {
      policy.nextRun = this.calculateNextRun(policy.schedule);
    }

    return policy;
  }

  /**
   * 정책 삭제
   */
  async deletePolicy(policyId: string): Promise<boolean> {
    return this.policies.delete(policyId);
  }

  /**
   * 다음 실행 시간 계산
   */
  private calculateNextRun(schedule: SnapshotPolicy['schedule']): Date {
    const now = new Date();
    const next = new Date(now);

    switch (schedule.type) {
      case 'daily':
        if (schedule.time) {
          const [hours, minutes] = schedule.time.split(':').map(Number);
          next.setHours(hours, minutes, 0, 0);
          if (next <= now) {
            next.setDate(next.getDate() + 1);
          }
        } else {
          next.setDate(next.getDate() + 1);
        }
        break;

      case 'weekly':
        const dayOfWeek = schedule.dayOfWeek ?? 0;
        const daysUntil = (dayOfWeek - now.getDay() + 7) % 7 || 7;
        next.setDate(now.getDate() + daysUntil);
        break;

      case 'monthly':
        const dayOfMonth = schedule.dayOfMonth ?? 1;
        next.setMonth(now.getMonth() + 1, dayOfMonth);
        break;

      default:
        next.setDate(next.getDate() + 1);
    }

    return next;
  }

  // ============================================================
  // Statistics
  // ============================================================

  /**
   * 스냅샷 통계 조회
   */
  async getStats(tenantId: string): Promise<SnapshotStats> {
    const tenantSnapshots = this.getSnapshotsByTenant(tenantId);

    const byType: SnapshotStats['byType'] = {
      full: { count: 0, totalSize: 0 },
      incremental: { count: 0, totalSize: 0 },
      differential: { count: 0, totalSize: 0 },
      config_only: { count: 0, totalSize: 0 }
    };

    const byStatus: SnapshotStats['byStatus'] = {
      pending: 0,
      creating: 0,
      completed: 0,
      failed: 0,
      expired: 0,
      deleted: 0
    };

    let totalSize = 0;

    tenantSnapshots.forEach(snap => {
      byType[snap.type].count++;
      byType[snap.type].totalSize += snap.totalSize;
      byStatus[snap.status]++;
      totalSize += snap.totalSize;
    });

    // 최근 7일 추세
    const trend: SnapshotStats['trend'] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const daySnapshots = tenantSnapshots.filter(snap => {
        const snapDate = snap.createdAt.toISOString().split('T')[0];
        return snapDate === dateStr;
      });

      trend.push({
        date: dateStr,
        count: daySnapshots.length,
        size: daySnapshots.reduce((sum, s) => sum + s.totalSize, 0)
      });
    }

    // 최근 활동
    const sortedByDate = [...tenantSnapshots].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );

    const restoreJobs = Array.from(this.restoreJobs.values())
      .filter(j => j.request.targetTenantId === tenantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return {
      tenantId,
      totalSnapshots: tenantSnapshots.length,
      totalSize,
      byType,
      byStatus,
      trend,
      lastSnapshot: sortedByDate[0]?.createdAt,
      lastRestore: restoreJobs[0]?.createdAt
    };
  }

  // ============================================================
  // Helper Methods
  // ============================================================

  /**
   * 복원 작업 조회
   */
  getRestoreJob(jobId: string): RestoreJob | undefined {
    return this.restoreJobs.get(jobId);
  }

  /**
   * Tenant의 복원 작업 이력
   */
  getRestoreHistory(tenantId: string): RestoreJob[] {
    return Array.from(this.restoreJobs.values())
      .filter(j => j.request.targetTenantId === tenantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Step 실행 헬퍼
   */
  private async executeStep(
    job: RestoreJob,
    stepName: string,
    action: () => Promise<void>
  ): Promise<void> {
    this.updateStep(job, stepName, 'in_progress');
    job.currentStep = stepName;

    try {
      await action();
      this.updateStep(job, stepName, 'completed');
      job.progress = this.calculateProgress(job);
    } catch (error: any) {
      this.updateStep(job, stepName, 'failed', error.message);
      throw error;
    }
  }

  /**
   * Step 상태 업데이트
   */
  private updateStep(
    job: RestoreJob,
    stepName: string,
    status: RestoreJob['steps'][0]['status'],
    error?: string
  ): void {
    const step = job.steps.find(s => s.name === stepName);
    if (step) {
      step.status = status;
      if (status === 'in_progress') {
        step.startedAt = new Date();
      } else if (status === 'completed' || status === 'failed') {
        step.completedAt = new Date();
      }
      if (error) {
        step.error = error;
      }
    }
  }

  /**
   * 진행률 계산
   */
  private calculateProgress(job: RestoreJob): number {
    const completed = job.steps.filter(s => s.status === 'completed').length;
    return Math.round((completed / job.steps.length) * 100);
  }

  /**
   * 체크섬 생성 (시뮬레이션)
   */
  private generateChecksum(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  /**
   * 파일 크기 포맷
   */
  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  /**
   * 지연 시뮬레이션
   */
  private async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
