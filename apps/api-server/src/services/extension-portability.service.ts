/**
 * Extension Portability Service
 * Phase 11 - Task 11.4
 *
 * Extension의 서비스 간 이동, 버전 업그레이드, 호환성 검사 및
 * Deprecation replacement 자동 추천을 담당합니다.
 */

import { Injectable, Logger } from '@nestjs/common';

// ============================================================
// Type Definitions
// ============================================================

/**
 * Extension dependency 정보
 */
interface ExtensionDependency {
  extensionId: string;
  version: string;
  type: 'required' | 'optional' | 'peer';
  satisfied?: boolean;
}

/**
 * Extension manifest (확장된 버전)
 */
interface ExtensionManifest {
  id: string;
  name: string;
  version: string;
  type: 'core' | 'extension' | 'service';

  // Service Group 호환성
  compatibleServiceGroups: string[];
  incompatibleServiceGroups?: string[];

  // 의존성
  dependencies: ExtensionDependency[];
  peerDependencies?: ExtensionDependency[];

  // Deprecation 정보
  deprecated?: boolean;
  deprecationInfo?: {
    deprecatedAt: Date;
    sunsetDate?: Date;
    replacementId?: string;
    migrationGuide?: string;
  };

  // 데이터 스키마
  dataEntities?: string[];
  dataSchema?: Record<string, object>;

  // 버전 히스토리
  previousVersions?: string[];
}

/**
 * Dependency Graph 노드
 */
interface DependencyNode {
  extensionId: string;
  version: string;
  dependencies: string[];
  dependents: string[];  // 이 extension에 의존하는 다른 extensions
  depth: number;
}

/**
 * Dependency Graph 분석 결과
 */
interface DependencyGraphAnalysis {
  nodes: Map<string, DependencyNode>;
  roots: string[];           // 의존성 없는 루트 노드들
  leaves: string[];          // 다른 것에 의존하지 않는 말단 노드들
  circularDependencies: string[][];  // 순환 의존성 그룹
  installOrder: string[];    // 설치 순서 (topological sort)
  uninstallOrder: string[];  // 제거 순서
}

/**
 * ServiceGroup 호환성 검사 결과
 */
interface ServiceGroupCompatibility {
  extensionId: string;
  targetServiceGroup: string;
  isCompatible: boolean;

  // 상세 분석
  checks: Array<{
    check: string;
    passed: boolean;
    message: string;
  }>;

  // 호환성 점수 (0-100)
  compatibilityScore: number;

  // 권장사항
  recommendations: string[];

  // 필요한 어댑터
  requiredAdapters?: string[];
}

/**
 * Extension Transfer 요청
 */
interface ExtensionTransferRequest {
  extensionId: string;
  fromTenantId: string;
  toTenantId: string;

  // 옵션
  includeData?: boolean;
  includeConfig?: boolean;
  dataTransformRules?: Record<string, any>;

  // 검증
  validateCompatibility?: boolean;
  dryRun?: boolean;
}

/**
 * Extension Transfer 작업
 */
interface ExtensionTransferJob {
  id: string;
  request: ExtensionTransferRequest;
  status: 'pending' | 'analyzing' | 'transferring' | 'completed' | 'failed' | 'rolled_back';

  // 분석 결과
  compatibilityAnalysis?: ServiceGroupCompatibility;
  dataMigrationPlan?: {
    entities: string[];
    recordCounts: Record<string, number>;
    transformations: number;
  };

  // 진행 상태
  progress: number;
  currentStep?: string;
  steps: Array<{
    name: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    startedAt?: Date;
    completedAt?: Date;
    error?: string;
  }>;

  // 결과
  result?: {
    transferred: boolean;
    dataRecordsMigrated?: number;
    configMigrated?: boolean;
    warnings: string[];
  };

  // 타임스탬프
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;

  // 롤백 정보
  rollbackData?: any;
}

/**
 * Extension 업그레이드 요청
 */
interface ExtensionUpgradeRequest {
  extensionId: string;
  tenantId: string;
  fromVersion: string;
  toVersion: string;

  // 옵션
  autoMigrateData?: boolean;
  backupFirst?: boolean;
  dryRun?: boolean;
}

/**
 * Extension 업그레이드 분석
 */
interface ExtensionUpgradeAnalysis {
  extensionId: string;
  fromVersion: string;
  toVersion: string;

  // 버전 변경 유형
  versionChangeType: 'major' | 'minor' | 'patch';

  // Breaking changes
  breakingChanges: Array<{
    type: 'api' | 'schema' | 'dependency' | 'config';
    description: string;
    migrationRequired: boolean;
  }>;

  // 데이터 마이그레이션
  dataMigrations: Array<{
    entity: string;
    migrationType: 'add_field' | 'remove_field' | 'transform' | 'restructure';
    description: string;
    reversible: boolean;
  }>;

  // 의존성 변경
  dependencyChanges: {
    added: ExtensionDependency[];
    removed: ExtensionDependency[];
    upgraded: Array<{
      extensionId: string;
      fromVersion: string;
      toVersion: string;
    }>;
  };

  // 설정 변경
  configChanges: {
    added: string[];
    removed: string[];
    deprecated: string[];
  };

  // 평가
  isCompatible: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  estimatedDuration: number;  // seconds
  recommendations: string[];
}

/**
 * Deprecation 대체 추천
 */
interface DeprecationReplacement {
  deprecatedExtensionId: string;
  deprecatedVersion: string;
  deprecationInfo: {
    deprecatedAt: Date;
    sunsetDate?: Date;
    reason: string;
  };

  // 대체 추천
  replacements: Array<{
    extensionId: string;
    version: string;
    name: string;
    matchScore: number;      // 0-100, 기능 매칭 점수
    featureCoverage: number; // 0-100, 기능 커버리지
    migrationComplexity: 'low' | 'medium' | 'high';

    // 기능 비교
    featureComparison: {
      retained: string[];    // 유지되는 기능
      lost: string[];        // 손실되는 기능
      gained: string[];      // 추가되는 기능
    };

    // 마이그레이션 가이드
    migrationGuide?: string;
    automatedMigrationAvailable: boolean;
  }>;

  // 권장 대체
  recommendedReplacement?: string;
}

/**
 * Extension 데이터 마이그레이션 규칙
 */
interface ExtensionDataMigrationRule {
  sourceEntity: string;
  targetEntity: string;
  fieldMappings: Array<{
    sourceField: string;
    targetField: string;
    transform?: string;  // transform function name or expression
  }>;
  filterCondition?: string;
  postProcessing?: string;
}

// ============================================================
// Service Implementation
// ============================================================

@Injectable()
export class ExtensionPortabilityService {
  private readonly logger = new Logger(ExtensionPortabilityService.name);

  // In-memory storage (실제로는 DB 사용)
  private extensionRegistry = new Map<string, ExtensionManifest>();
  private transferJobs = new Map<string, ExtensionTransferJob>();
  private deprecationList = new Map<string, DeprecationReplacement>();

  constructor() {
    this.initializeExtensionRegistry();
  }

  /**
   * Extension Registry 초기화 (예시 데이터)
   */
  private initializeExtensionRegistry(): void {
    const sampleExtensions: ExtensionManifest[] = [
      {
        id: 'forum-yaksa',
        name: '약사 포럼',
        version: '1.2.0',
        type: 'extension',
        compatibleServiceGroups: ['yaksa', 'pharmacy'],
        incompatibleServiceGroups: ['cosmetics'],
        dependencies: [
          { extensionId: 'organization-core', version: '>=1.0.0', type: 'required' },
          { extensionId: 'forum-core', version: '>=1.0.0', type: 'required' }
        ],
        dataEntities: ['ForumPost', 'ForumComment', 'ForumCategory'],
        previousVersions: ['1.0.0', '1.1.0']
      },
      {
        id: 'membership-yaksa',
        name: '약사 회원관리',
        version: '1.1.0',
        type: 'extension',
        compatibleServiceGroups: ['yaksa', 'pharmacy'],
        dependencies: [
          { extensionId: 'organization-core', version: '>=1.0.0', type: 'required' }
        ],
        dataEntities: ['MemberProfile', 'MembershipTier']
      },
      {
        id: 'dropshipping-cosmetics',
        name: '화장품 드롭쉬핑',
        version: '2.0.0',
        type: 'extension',
        compatibleServiceGroups: ['cosmetics', 'ecommerce'],
        incompatibleServiceGroups: ['yaksa', 'hospital'],
        dependencies: [
          { extensionId: 'cms-core', version: '>=1.0.0', type: 'required' },
          { extensionId: 'ecommerce-core', version: '>=1.0.0', type: 'required' }
        ],
        dataEntities: ['Product', 'Order', 'Supplier']
      },
      {
        id: 'reporting-core',
        name: '리포팅 Core',
        version: '1.0.0',
        type: 'core',
        compatibleServiceGroups: ['*'],  // 모든 서비스 그룹과 호환
        dependencies: [],
        dataEntities: ['Report', 'ReportSchedule']
      },
      {
        id: 'lms-yaksa',
        name: '약사 LMS',
        version: '1.0.0',
        type: 'extension',
        compatibleServiceGroups: ['yaksa'],
        dependencies: [
          { extensionId: 'organization-core', version: '>=1.0.0', type: 'required' },
          { extensionId: 'lms-core', version: '>=1.0.0', type: 'required' }
        ],
        dataEntities: ['Course', 'Enrollment', 'Progress']
      },
      // Deprecated extension 예시
      {
        id: 'legacy-forum',
        name: '레거시 포럼 (Deprecated)',
        version: '0.9.0',
        type: 'extension',
        compatibleServiceGroups: ['yaksa'],
        dependencies: [],
        deprecated: true,
        deprecationInfo: {
          deprecatedAt: new Date('2025-06-01'),
          sunsetDate: new Date('2025-12-31'),
          replacementId: 'forum-yaksa',
          migrationGuide: '/docs/migration/legacy-forum-to-forum-yaksa.md'
        },
        dataEntities: ['LegacyPost', 'LegacyComment']
      }
    ];

    sampleExtensions.forEach(ext => {
      this.extensionRegistry.set(ext.id, ext);
    });

    // Deprecation replacement 등록
    this.deprecationList.set('legacy-forum', {
      deprecatedExtensionId: 'legacy-forum',
      deprecatedVersion: '0.9.0',
      deprecationInfo: {
        deprecatedAt: new Date('2025-06-01'),
        sunsetDate: new Date('2025-12-31'),
        reason: '새로운 forum-yaksa로 대체됨'
      },
      replacements: [
        {
          extensionId: 'forum-yaksa',
          version: '1.2.0',
          name: '약사 포럼',
          matchScore: 95,
          featureCoverage: 100,
          migrationComplexity: 'low',
          featureComparison: {
            retained: ['게시글 작성', '댓글', '카테고리'],
            lost: [],
            gained: ['멘션', '알림', '검색 개선']
          },
          migrationGuide: '/docs/migration/legacy-forum-to-forum-yaksa.md',
          automatedMigrationAvailable: true
        }
      ],
      recommendedReplacement: 'forum-yaksa'
    });

    this.logger.log(`Extension Registry 초기화 완료: ${this.extensionRegistry.size}개 등록`);
  }

  // ============================================================
  // Dependency Graph 분석
  // ============================================================

  /**
   * Extension dependency graph 분석
   */
  async analyzeDependencyGraph(extensionIds: string[]): Promise<DependencyGraphAnalysis> {
    this.logger.log(`Dependency graph 분석: ${extensionIds.join(', ')}`);

    const nodes = new Map<string, DependencyNode>();
    const visited = new Set<string>();

    // 모든 노드 생성
    const buildNode = (extId: string, depth: number): void => {
      if (visited.has(extId)) return;
      visited.add(extId);

      const manifest = this.extensionRegistry.get(extId);
      if (!manifest) {
        this.logger.warn(`Extension not found: ${extId}`);
        return;
      }

      const dependencies = manifest.dependencies
        .filter(d => d.type === 'required')
        .map(d => d.extensionId);

      nodes.set(extId, {
        extensionId: extId,
        version: manifest.version,
        dependencies,
        dependents: [],
        depth
      });

      // 재귀적으로 의존성 빌드
      dependencies.forEach(depId => buildNode(depId, depth + 1));
    };

    extensionIds.forEach(id => buildNode(id, 0));

    // Dependents 역방향 연결
    nodes.forEach((node, id) => {
      node.dependencies.forEach(depId => {
        const depNode = nodes.get(depId);
        if (depNode) {
          depNode.dependents.push(id);
        }
      });
    });

    // Roots 찾기 (의존성 없는 노드)
    const roots = Array.from(nodes.entries())
      .filter(([_, node]) => node.dependencies.length === 0)
      .map(([id]) => id);

    // Leaves 찾기 (다른 것에 의존하지 않는 노드)
    const leaves = Array.from(nodes.entries())
      .filter(([_, node]) => node.dependents.length === 0)
      .map(([id]) => id);

    // 순환 의존성 탐지
    const circularDependencies = this.detectCircularDependencies(nodes);

    // Topological sort (설치 순서)
    const installOrder = this.topologicalSort(nodes);

    // 제거 순서는 설치 순서의 역순
    const uninstallOrder = [...installOrder].reverse();

    return {
      nodes,
      roots,
      leaves,
      circularDependencies,
      installOrder,
      uninstallOrder
    };
  }

  /**
   * 순환 의존성 탐지
   */
  private detectCircularDependencies(nodes: Map<string, DependencyNode>): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const dfs = (nodeId: string): void => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const node = nodes.get(nodeId);
      if (node) {
        for (const depId of node.dependencies) {
          if (!visited.has(depId)) {
            dfs(depId);
          } else if (recursionStack.has(depId)) {
            // 순환 발견
            const cycleStart = path.indexOf(depId);
            const cycle = path.slice(cycleStart);
            cycles.push([...cycle, depId]);
          }
        }
      }

      path.pop();
      recursionStack.delete(nodeId);
    };

    nodes.forEach((_, id) => {
      if (!visited.has(id)) {
        dfs(id);
      }
    });

    return cycles;
  }

  /**
   * Topological sort
   */
  private topologicalSort(nodes: Map<string, DependencyNode>): string[] {
    const result: string[] = [];
    const visited = new Set<string>();
    const temp = new Set<string>();

    const visit = (nodeId: string): boolean => {
      if (temp.has(nodeId)) return false; // 순환 의존성
      if (visited.has(nodeId)) return true;

      temp.add(nodeId);

      const node = nodes.get(nodeId);
      if (node) {
        for (const depId of node.dependencies) {
          if (nodes.has(depId) && !visit(depId)) {
            return false;
          }
        }
      }

      temp.delete(nodeId);
      visited.add(nodeId);
      result.push(nodeId);

      return true;
    };

    nodes.forEach((_, id) => {
      if (!visited.has(id)) {
        visit(id);
      }
    });

    return result;
  }

  // ============================================================
  // ServiceGroup 호환성 검사
  // ============================================================

  /**
   * Extension의 ServiceGroup 호환성 검사
   */
  async checkServiceGroupCompatibility(
    extensionId: string,
    targetServiceGroup: string
  ): Promise<ServiceGroupCompatibility> {
    this.logger.log(`ServiceGroup 호환성 검사: ${extensionId} → ${targetServiceGroup}`);

    const manifest = this.extensionRegistry.get(extensionId);
    if (!manifest) {
      return {
        extensionId,
        targetServiceGroup,
        isCompatible: false,
        checks: [{
          check: 'extension_exists',
          passed: false,
          message: `Extension not found: ${extensionId}`
        }],
        compatibilityScore: 0,
        recommendations: ['존재하지 않는 Extension입니다.']
      };
    }

    const checks: ServiceGroupCompatibility['checks'] = [];
    let score = 0;
    const recommendations: string[] = [];
    const requiredAdapters: string[] = [];

    // 1. 명시적 호환성 체크
    const isExplicitlyCompatible = manifest.compatibleServiceGroups.includes(targetServiceGroup) ||
                                    manifest.compatibleServiceGroups.includes('*');
    checks.push({
      check: 'explicit_compatibility',
      passed: isExplicitlyCompatible,
      message: isExplicitlyCompatible
        ? `${targetServiceGroup}이(가) 호환 목록에 포함됨`
        : `${targetServiceGroup}이(가) 호환 목록에 없음`
    });
    if (isExplicitlyCompatible) score += 40;

    // 2. 비호환 목록 체크
    const isExplicitlyIncompatible = manifest.incompatibleServiceGroups?.includes(targetServiceGroup);
    checks.push({
      check: 'incompatibility_list',
      passed: !isExplicitlyIncompatible,
      message: isExplicitlyIncompatible
        ? `${targetServiceGroup}이(가) 비호환 목록에 명시됨`
        : '비호환 목록에 포함되지 않음'
    });
    if (!isExplicitlyIncompatible) score += 20;

    // 3. 의존성 호환성 체크
    let dependenciesCompatible = true;
    for (const dep of manifest.dependencies.filter(d => d.type === 'required')) {
      const depManifest = this.extensionRegistry.get(dep.extensionId);
      if (depManifest) {
        const depCompatible = depManifest.compatibleServiceGroups.includes(targetServiceGroup) ||
                              depManifest.compatibleServiceGroups.includes('*');
        if (!depCompatible) {
          dependenciesCompatible = false;
          recommendations.push(`의존성 ${dep.extensionId}이(가) ${targetServiceGroup}과(와) 호환되지 않습니다.`);
        }
      }
    }
    checks.push({
      check: 'dependency_compatibility',
      passed: dependenciesCompatible,
      message: dependenciesCompatible
        ? '모든 의존성이 대상 ServiceGroup과 호환됨'
        : '일부 의존성이 호환되지 않음'
    });
    if (dependenciesCompatible) score += 30;

    // 4. Deprecation 체크
    const isDeprecated = manifest.deprecated === true;
    checks.push({
      check: 'deprecation_status',
      passed: !isDeprecated,
      message: isDeprecated
        ? 'Extension이 deprecated됨'
        : 'Active extension'
    });
    if (!isDeprecated) score += 10;
    else {
      recommendations.push('이 Extension은 deprecated 상태입니다. 대체 Extension을 고려하세요.');
      if (manifest.deprecationInfo?.replacementId) {
        recommendations.push(`권장 대체: ${manifest.deprecationInfo.replacementId}`);
      }
    }

    // 호환성 여부 최종 결정
    const isCompatible = isExplicitlyCompatible &&
                         !isExplicitlyIncompatible &&
                         dependenciesCompatible;

    // 비호환 시 어댑터 추천
    if (!isCompatible && !isExplicitlyIncompatible) {
      requiredAdapters.push(`${extensionId}-${targetServiceGroup}-adapter`);
      recommendations.push(`어댑터를 통해 호환성 확보 가능: ${extensionId}-${targetServiceGroup}-adapter`);
    }

    return {
      extensionId,
      targetServiceGroup,
      isCompatible,
      checks,
      compatibilityScore: score,
      recommendations,
      requiredAdapters: requiredAdapters.length > 0 ? requiredAdapters : undefined
    };
  }

  // ============================================================
  // Extension Transfer (서비스 간 이동)
  // ============================================================

  /**
   * Extension Transfer 작업 시작
   */
  async startExtensionTransfer(request: ExtensionTransferRequest): Promise<ExtensionTransferJob> {
    const jobId = `transfer-${request.extensionId}-${Date.now()}`;

    this.logger.log(`Extension Transfer 시작: ${jobId}`);

    const job: ExtensionTransferJob = {
      id: jobId,
      request,
      status: 'pending',
      progress: 0,
      steps: [
        { name: 'compatibility_check', status: 'pending' },
        { name: 'prepare_data_migration', status: 'pending' },
        { name: 'create_backup', status: 'pending' },
        { name: 'transfer_extension', status: 'pending' },
        { name: 'migrate_data', status: 'pending' },
        { name: 'migrate_config', status: 'pending' },
        { name: 'verify_transfer', status: 'pending' }
      ],
      createdAt: new Date()
    };

    this.transferJobs.set(jobId, job);

    // Dry run인 경우 분석만 수행
    if (request.dryRun) {
      await this.analyzeTransfer(job);
      return job;
    }

    // 실제 transfer 실행 (비동기)
    this.executeTransfer(job).catch(err => {
      this.logger.error(`Transfer 실패: ${jobId}`, err);
    });

    return job;
  }

  /**
   * Transfer 분석
   */
  private async analyzeTransfer(job: ExtensionTransferJob): Promise<void> {
    job.status = 'analyzing';

    const { extensionId, toTenantId } = job.request;

    // 1. 호환성 분석 (가상의 target serviceGroup)
    const targetServiceGroup = await this.getServiceGroupForTenant(toTenantId);
    job.compatibilityAnalysis = await this.checkServiceGroupCompatibility(
      extensionId,
      targetServiceGroup
    );

    // 2. 데이터 마이그레이션 계획
    const manifest = this.extensionRegistry.get(extensionId);
    if (manifest && job.request.includeData) {
      job.dataMigrationPlan = {
        entities: manifest.dataEntities || [],
        recordCounts: {},
        transformations: 0
      };

      // 각 엔티티의 레코드 수 (시뮬레이션)
      (manifest.dataEntities || []).forEach(entity => {
        job.dataMigrationPlan!.recordCounts[entity] = Math.floor(Math.random() * 1000);
      });

      if (job.request.dataTransformRules) {
        job.dataMigrationPlan.transformations =
          Object.keys(job.request.dataTransformRules).length;
      }
    }

    job.progress = 100;
    job.status = 'completed';

    this.updateStep(job, 'compatibility_check', 'completed');
    this.updateStep(job, 'prepare_data_migration', 'completed');
  }

  /**
   * Transfer 실행
   */
  private async executeTransfer(job: ExtensionTransferJob): Promise<void> {
    try {
      job.status = 'analyzing';
      job.startedAt = new Date();

      // Step 1: 호환성 검사
      await this.executeStep(job, 'compatibility_check', async () => {
        const targetServiceGroup = await this.getServiceGroupForTenant(job.request.toTenantId);
        job.compatibilityAnalysis = await this.checkServiceGroupCompatibility(
          job.request.extensionId,
          targetServiceGroup
        );

        if (!job.compatibilityAnalysis.isCompatible && !job.request.validateCompatibility) {
          throw new Error('Extension이 대상 ServiceGroup과 호환되지 않습니다.');
        }
      });

      job.status = 'transferring';

      // Step 2: 데이터 마이그레이션 준비
      await this.executeStep(job, 'prepare_data_migration', async () => {
        const manifest = this.extensionRegistry.get(job.request.extensionId);
        if (manifest && job.request.includeData) {
          job.dataMigrationPlan = {
            entities: manifest.dataEntities || [],
            recordCounts: {},
            transformations: job.request.dataTransformRules
              ? Object.keys(job.request.dataTransformRules).length
              : 0
          };
        }
      });

      // Step 3: 백업 생성
      await this.executeStep(job, 'create_backup', async () => {
        job.rollbackData = {
          timestamp: new Date(),
          extensionId: job.request.extensionId,
          fromTenantId: job.request.fromTenantId
        };
        // 실제로는 스냅샷 서비스 호출
        await this.simulateDelay(500);
      });

      // Step 4: Extension transfer
      await this.executeStep(job, 'transfer_extension', async () => {
        // 실제로는 Extension 메타데이터 이전
        await this.simulateDelay(1000);
      });

      // Step 5: 데이터 마이그레이션
      if (job.request.includeData) {
        await this.executeStep(job, 'migrate_data', async () => {
          // 실제로는 Cross-Service Migration 사용
          await this.simulateDelay(2000);
        });
      } else {
        this.updateStep(job, 'migrate_data', 'completed');
      }

      // Step 6: 설정 마이그레이션
      if (job.request.includeConfig) {
        await this.executeStep(job, 'migrate_config', async () => {
          await this.simulateDelay(500);
        });
      } else {
        this.updateStep(job, 'migrate_config', 'completed');
      }

      // Step 7: 검증
      await this.executeStep(job, 'verify_transfer', async () => {
        await this.simulateDelay(500);
      });

      // 완료
      job.status = 'completed';
      job.completedAt = new Date();
      job.progress = 100;
      job.result = {
        transferred: true,
        dataRecordsMigrated: job.dataMigrationPlan
          ? Object.values(job.dataMigrationPlan.recordCounts).reduce((a, b) => a + b, 0)
          : 0,
        configMigrated: job.request.includeConfig ?? false,
        warnings: []
      };

      this.logger.log(`Extension Transfer 완료: ${job.id}`);

    } catch (error: any) {
      job.status = 'failed';
      job.error = error.message;
      job.completedAt = new Date();
      this.logger.error(`Extension Transfer 실패: ${job.id}`, error);
    }
  }

  /**
   * Transfer 롤백
   */
  async rollbackTransfer(jobId: string): Promise<boolean> {
    const job = this.transferJobs.get(jobId);
    if (!job) {
      throw new Error(`Transfer job not found: ${jobId}`);
    }

    if (job.status !== 'failed' && job.status !== 'completed') {
      throw new Error('완료되거나 실패한 작업만 롤백할 수 있습니다.');
    }

    if (!job.rollbackData) {
      throw new Error('롤백 데이터가 없습니다.');
    }

    this.logger.log(`Transfer 롤백 시작: ${jobId}`);

    // 롤백 로직 (실제로는 역방향 transfer 수행)
    job.status = 'rolled_back';

    return true;
  }

  // ============================================================
  // Extension 업그레이드
  // ============================================================

  /**
   * Extension 업그레이드 분석
   */
  async analyzeExtensionUpgrade(request: ExtensionUpgradeRequest): Promise<ExtensionUpgradeAnalysis> {
    this.logger.log(`Extension 업그레이드 분석: ${request.extensionId} ${request.fromVersion} → ${request.toVersion}`);

    const manifest = this.extensionRegistry.get(request.extensionId);
    if (!manifest) {
      throw new Error(`Extension not found: ${request.extensionId}`);
    }

    // 버전 변경 유형 판단
    const versionChangeType = this.getVersionChangeType(request.fromVersion, request.toVersion);

    // Breaking changes 분석 (시뮬레이션)
    const breakingChanges: ExtensionUpgradeAnalysis['breakingChanges'] = [];
    if (versionChangeType === 'major') {
      breakingChanges.push({
        type: 'api',
        description: 'API 엔드포인트 변경',
        migrationRequired: true
      });
      breakingChanges.push({
        type: 'schema',
        description: '데이터 스키마 변경',
        migrationRequired: true
      });
    }

    // 데이터 마이그레이션 분석
    const dataMigrations: ExtensionUpgradeAnalysis['dataMigrations'] = [];
    if (versionChangeType !== 'patch') {
      dataMigrations.push({
        entity: manifest.dataEntities?.[0] || 'Unknown',
        migrationType: 'add_field',
        description: '새 필드 추가',
        reversible: true
      });
    }

    // 의존성 변경 분석
    const dependencyChanges: ExtensionUpgradeAnalysis['dependencyChanges'] = {
      added: [],
      removed: [],
      upgraded: []
    };

    if (versionChangeType === 'minor' || versionChangeType === 'major') {
      dependencyChanges.upgraded.push({
        extensionId: manifest.dependencies[0]?.extensionId || 'unknown',
        fromVersion: '1.0.0',
        toVersion: '1.1.0'
      });
    }

    // 리스크 레벨 결정
    const riskLevel = versionChangeType === 'major' ? 'high' :
                      versionChangeType === 'minor' ? 'medium' : 'low';

    return {
      extensionId: request.extensionId,
      fromVersion: request.fromVersion,
      toVersion: request.toVersion,
      versionChangeType,
      breakingChanges,
      dataMigrations,
      dependencyChanges,
      configChanges: {
        added: versionChangeType !== 'patch' ? ['newFeatureEnabled'] : [],
        removed: [],
        deprecated: []
      },
      isCompatible: breakingChanges.length === 0 || request.autoMigrateData,
      riskLevel,
      estimatedDuration: versionChangeType === 'major' ? 300 :
                         versionChangeType === 'minor' ? 120 : 30,
      recommendations: breakingChanges.length > 0
        ? ['업그레이드 전 백업을 권장합니다.', 'Dry run을 먼저 실행하세요.']
        : ['안전한 업그레이드가 가능합니다.']
    };
  }

  /**
   * 버전 변경 유형 판단
   */
  private getVersionChangeType(from: string, to: string): 'major' | 'minor' | 'patch' {
    const fromParts = from.split('.').map(Number);
    const toParts = to.split('.').map(Number);

    if (toParts[0] > fromParts[0]) return 'major';
    if (toParts[1] > fromParts[1]) return 'minor';
    return 'patch';
  }

  // ============================================================
  // Deprecation Management
  // ============================================================

  /**
   * Deprecated extension의 대체 추천 조회
   */
  async getDeprecationReplacement(extensionId: string): Promise<DeprecationReplacement | null> {
    return this.deprecationList.get(extensionId) || null;
  }

  /**
   * 모든 deprecated extensions 조회
   */
  async getAllDeprecatedExtensions(): Promise<DeprecationReplacement[]> {
    return Array.from(this.deprecationList.values());
  }

  /**
   * Extension deprecation 등록
   */
  async registerDeprecation(
    extensionId: string,
    deprecationInfo: DeprecationReplacement['deprecationInfo'],
    replacements: DeprecationReplacement['replacements']
  ): Promise<void> {
    const manifest = this.extensionRegistry.get(extensionId);
    if (!manifest) {
      throw new Error(`Extension not found: ${extensionId}`);
    }

    // Manifest 업데이트
    manifest.deprecated = true;
    manifest.deprecationInfo = {
      deprecatedAt: deprecationInfo.deprecatedAt,
      sunsetDate: deprecationInfo.sunsetDate,
      replacementId: replacements[0]?.extensionId
    };

    // Deprecation list에 추가
    this.deprecationList.set(extensionId, {
      deprecatedExtensionId: extensionId,
      deprecatedVersion: manifest.version,
      deprecationInfo,
      replacements,
      recommendedReplacement: replacements[0]?.extensionId
    });

    this.logger.log(`Extension deprecated: ${extensionId}`);
  }

  /**
   * Tenant의 deprecated extensions 검사
   */
  async checkTenantDeprecatedExtensions(
    tenantId: string,
    installedExtensions: string[]
  ): Promise<Array<{
    extensionId: string;
    replacement: DeprecationReplacement;
    urgency: 'low' | 'medium' | 'high' | 'critical';
  }>> {
    const results: Array<{
      extensionId: string;
      replacement: DeprecationReplacement;
      urgency: 'low' | 'medium' | 'high' | 'critical';
    }> = [];

    for (const extId of installedExtensions) {
      const deprecation = this.deprecationList.get(extId);
      if (deprecation) {
        // 긴급도 계산
        let urgency: 'low' | 'medium' | 'high' | 'critical' = 'low';

        if (deprecation.deprecationInfo.sunsetDate) {
          const daysUntilSunset = Math.ceil(
            (deprecation.deprecationInfo.sunsetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );

          if (daysUntilSunset <= 0) urgency = 'critical';
          else if (daysUntilSunset <= 30) urgency = 'high';
          else if (daysUntilSunset <= 90) urgency = 'medium';
        }

        results.push({
          extensionId: extId,
          replacement: deprecation,
          urgency
        });
      }
    }

    return results;
  }

  // ============================================================
  // Helper Methods
  // ============================================================

  /**
   * Tenant의 ServiceGroup 조회 (시뮬레이션)
   */
  private async getServiceGroupForTenant(tenantId: string): Promise<string> {
    // 실제로는 tenant 설정에서 조회
    if (tenantId.includes('yaksa')) return 'yaksa';
    if (tenantId.includes('cosmetics')) return 'cosmetics';
    return 'default';
  }

  /**
   * Step 실행 헬퍼
   */
  private async executeStep(
    job: ExtensionTransferJob,
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
    job: ExtensionTransferJob,
    stepName: string,
    status: ExtensionTransferJob['steps'][0]['status'],
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
  private calculateProgress(job: ExtensionTransferJob): number {
    const completed = job.steps.filter(s => s.status === 'completed').length;
    return Math.round((completed / job.steps.length) * 100);
  }

  /**
   * 지연 시뮬레이션
   */
  private async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================================
  // Public API Methods
  // ============================================================

  /**
   * Extension 조회
   */
  getExtension(extensionId: string): ExtensionManifest | undefined {
    return this.extensionRegistry.get(extensionId);
  }

  /**
   * 모든 Extension 조회
   */
  getAllExtensions(): ExtensionManifest[] {
    return Array.from(this.extensionRegistry.values());
  }

  /**
   * Transfer 작업 조회
   */
  getTransferJob(jobId: string): ExtensionTransferJob | undefined {
    return this.transferJobs.get(jobId);
  }

  /**
   * 모든 Transfer 작업 조회
   */
  getAllTransferJobs(): ExtensionTransferJob[] {
    return Array.from(this.transferJobs.values());
  }

  /**
   * ServiceGroup별 호환 Extension 조회
   */
  getCompatibleExtensions(serviceGroupId: string): ExtensionManifest[] {
    return Array.from(this.extensionRegistry.values())
      .filter(ext =>
        ext.compatibleServiceGroups.includes(serviceGroupId) ||
        ext.compatibleServiceGroups.includes('*')
      )
      .filter(ext => !ext.deprecated);
  }
}
