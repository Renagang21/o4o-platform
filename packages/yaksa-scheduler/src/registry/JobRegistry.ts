/**
 * Job Registry - Phase R1 Structural Stabilization
 *
 * 제어 역전(IoC) 패턴을 적용한 Job 등록 시스템
 * - Scheduler는 특정 앱을 알지 않는다
 * - 각 앱이 자신의 Job 정의를 registry에 등록
 * - Scheduler는 registry에 등록된 Job만 실행
 */

import type { EntityManager } from 'typeorm';
import type { JobHandler, JobExecutionResult, JobExecutionContext } from '../backend/services/SchedulerService.js';
import type { ScheduledJob } from '../backend/entities/ScheduledJob.js';

/**
 * Job 정의 인터페이스
 * 각 앱이 자신의 Job을 정의할 때 사용
 */
export interface JobDefinition {
  /** 고유 식별자 (앱ID + 액션타입 조합 권장) */
  id: string;
  /** Job 이름 (표시용) */
  name: string;
  /** Job 설명 */
  description: string;
  /** 대상 서비스 ID (manifest.appId와 동일해야 함) */
  targetService: string;
  /** 액션 타입 (앱 내에서 고유해야 함) */
  actionType: string;
  /** Cron 표현식 (기본값) */
  defaultCronExpression: string;
  /** 타임존 (기본값: Asia/Seoul) */
  timezone?: string;
  /** 기본 설정 */
  defaultConfig?: Record<string, any>;
  /** Job 핸들러 함수 */
  handler: JobHandler;
}

/**
 * Job 정의 등록 결과
 */
export interface JobRegistrationResult {
  success: boolean;
  jobDefinitionId: string;
  message?: string;
}

/**
 * Job Registry
 *
 * 앱들이 자신의 Job 정의를 등록하는 중앙 레지스트리
 * Scheduler는 이 registry를 통해서만 Job을 인식
 */
class JobRegistry {
  /** 등록된 Job 정의들 */
  private definitions: Map<string, JobDefinition> = new Map();

  /** targetService:actionType -> JobDefinition 매핑 */
  private handlerMap: Map<string, JobDefinition> = new Map();

  /**
   * Job 정의 등록
   *
   * 각 앱의 activate() lifecycle에서 호출
   */
  registerJobDefinition(definition: JobDefinition): JobRegistrationResult {
    const key = this.getHandlerKey(definition.targetService, definition.actionType);

    // 중복 등록 방지
    if (this.definitions.has(definition.id)) {
      console.log(`[JobRegistry] Job definition already registered: ${definition.id}`);
      return {
        success: false,
        jobDefinitionId: definition.id,
        message: `Job definition already registered: ${definition.id}`,
      };
    }

    // 핸들러 키 중복 체크
    if (this.handlerMap.has(key)) {
      const existing = this.handlerMap.get(key)!;
      console.warn(
        `[JobRegistry] Handler key ${key} already registered by ${existing.id}. ` +
        `Skipping registration of ${definition.id}`
      );
      return {
        success: false,
        jobDefinitionId: definition.id,
        message: `Handler key ${key} already registered`,
      };
    }

    this.definitions.set(definition.id, definition);
    this.handlerMap.set(key, definition);

    console.log(`[JobRegistry] Registered job definition: ${definition.id} (${definition.name})`);

    return {
      success: true,
      jobDefinitionId: definition.id,
    };
  }

  /**
   * Job 정의 등록 해제
   *
   * 앱의 deactivate() lifecycle에서 호출
   */
  unregisterJobDefinition(definitionId: string): boolean {
    const definition = this.definitions.get(definitionId);
    if (!definition) {
      return false;
    }

    const key = this.getHandlerKey(definition.targetService, definition.actionType);
    this.handlerMap.delete(key);
    this.definitions.delete(definitionId);

    console.log(`[JobRegistry] Unregistered job definition: ${definitionId}`);
    return true;
  }

  /**
   * 특정 서비스의 모든 Job 정의 등록 해제
   */
  unregisterAllForService(targetService: string): number {
    let count = 0;
    const toRemove: string[] = [];

    for (const [id, def] of this.definitions) {
      if (def.targetService === targetService) {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      this.unregisterJobDefinition(id);
      count++;
    }

    console.log(`[JobRegistry] Unregistered ${count} job definitions for service: ${targetService}`);
    return count;
  }

  /**
   * Job 핸들러 조회
   */
  getHandler(targetService: string, actionType: string): JobHandler | null {
    const key = this.getHandlerKey(targetService, actionType);
    const definition = this.handlerMap.get(key);
    return definition?.handler ?? null;
  }

  /**
   * Job 정의 조회
   */
  getJobDefinition(definitionId: string): JobDefinition | null {
    return this.definitions.get(definitionId) ?? null;
  }

  /**
   * 특정 서비스의 Job 정의 목록 조회
   */
  getJobDefinitionsForService(targetService: string): JobDefinition[] {
    return Array.from(this.definitions.values())
      .filter(def => def.targetService === targetService);
  }

  /**
   * 모든 Job 정의 목록 조회
   */
  getAllJobDefinitions(): JobDefinition[] {
    return Array.from(this.definitions.values());
  }

  /**
   * 특정 서비스의 기본 Job seed 데이터 생성
   *
   * 앱의 install() lifecycle에서 호출하여 DB에 저장
   */
  getJobSeedDataForService(
    targetService: string,
    organizationId: string
  ): Array<Partial<ScheduledJob>> {
    const definitions = this.getJobDefinitionsForService(targetService);

    return definitions.map(def => ({
      name: def.name,
      description: def.description,
      targetService: def.targetService,
      actionType: def.actionType,
      cronExpression: def.defaultCronExpression,
      timezone: def.timezone || 'Asia/Seoul',
      status: 'active' as const,
      config: def.defaultConfig,
      organizationId,
    }));
  }

  /**
   * Registry 상태 요약
   */
  getStatus(): {
    totalDefinitions: number;
    servicesSummary: Array<{ service: string; jobCount: number }>;
  } {
    const serviceCounts = new Map<string, number>();

    for (const def of this.definitions.values()) {
      const count = serviceCounts.get(def.targetService) || 0;
      serviceCounts.set(def.targetService, count + 1);
    }

    return {
      totalDefinitions: this.definitions.size,
      servicesSummary: Array.from(serviceCounts.entries())
        .map(([service, jobCount]) => ({ service, jobCount }))
        .sort((a, b) => a.service.localeCompare(b.service)),
    };
  }

  /**
   * Registry 초기화 (테스트용)
   */
  clear(): void {
    this.definitions.clear();
    this.handlerMap.clear();
    console.log('[JobRegistry] Cleared all job definitions');
  }

  private getHandlerKey(targetService: string, actionType: string): string {
    return `${targetService}:${actionType}`;
  }
}

// Export singleton
export const jobRegistry = new JobRegistry();

// Export class for testing
export { JobRegistry };
