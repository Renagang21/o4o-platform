/**
 * ActionService
 *
 * diabetes-core의 PatternAnalysis를 조회하여 Action으로 변환
 *
 * @package @o4o/diabetes-pharmacy
 */

import type {
  ActionDto,
  ActionType,
  ActionStatus,
  ActionListResponseDto,
  ActionExecuteRequestDto,
  ActionExecuteResponseDto,
} from '../dto/index.js';
import {
  PATTERN_TO_ACTION_MAP,
  ACTION_TARGET_MAP,
  ACTION_LABELS,
} from '../dto/index.js';

/**
 * Pattern Analysis (diabetes-core에서 가져옴)
 */
interface PatternAnalysis {
  id: string;
  userId: string;
  patternType: string;
  confidence: string;
  confidenceScore: number;
  occurrenceCount: number;
  description?: string;
  detectedAt: Date;
}

/**
 * ActionService
 *
 * 핵심 역할:
 * 1. diabetes-core의 PatternAnalysis 조회
 * 2. Pattern → Action 매핑
 * 3. Action 목록 생성 (실행은 하지 않음)
 */
export class ActionService {
  /**
   * 약국의 모든 Action 목록 조회
   */
  async getActions(pharmacyId: string): Promise<ActionListResponseDto> {
    // 1. diabetes-core에서 Pattern 조회
    const patterns = await this.fetchPatternsFromCore(pharmacyId);

    // 2. Pattern → Action 변환
    const actions = this.convertPatternsToActions(patterns);

    // 3. Action 통계 계산
    const byType = this.countByType(actions);
    const available = actions.filter((a) => a.status === 'available').length;

    return {
      items: actions,
      total: actions.length,
      available,
      byType,
    };
  }

  /**
   * 특정 Action 조회
   */
  async getAction(pharmacyId: string, actionId: string): Promise<ActionDto | null> {
    const { items } = await this.getActions(pharmacyId);
    return items.find((a) => a.id === actionId) || null;
  }

  /**
   * Action 실행 (Target App으로 이동)
   */
  async executeAction(request: ActionExecuteRequestDto): Promise<ActionExecuteResponseDto> {
    const { actionId, pharmacyId } = request;

    // 1. Action 조회
    const action = await this.getAction(pharmacyId, actionId);
    if (!action) {
      return {
        success: false,
        actionId,
        error: 'Action을 찾을 수 없습니다.',
      };
    }

    // 2. Action 유형별 Target 확인
    const target = ACTION_TARGET_MAP[action.type];
    if (!target) {
      return {
        success: false,
        actionId,
        message: '준비 중인 기능입니다.',
      };
    }

    // 3. 실행 성공 (실제로는 클라이언트에서 이동)
    return {
      success: true,
      actionId,
      targetApp: target.app,
      targetPath: target.path,
      message: `${ACTION_LABELS[action.type]}(으)로 이동합니다.`,
    };
  }

  /**
   * diabetes-core에서 Pattern 조회
   * Phase 2: Mock 데이터 반환 (실제 연동 시 diabetes-core API 호출)
   */
  private async fetchPatternsFromCore(pharmacyId: string): Promise<PatternAnalysis[]> {
    // Phase 2: Mock 데이터
    // 실제 구현 시 diabetes-core의 PatternDetectorService 호출
    return [
      {
        id: 'pattern-1',
        userId: 'user-1',
        patternType: 'recurring_hypo',
        confidence: 'high',
        confidenceScore: 85,
        occurrenceCount: 5,
        description: '오후 3-5시 반복 저혈당 패턴',
        detectedAt: new Date(),
      },
      {
        id: 'pattern-2',
        userId: 'user-1',
        patternType: 'post_meal_spike',
        confidence: 'medium',
        confidenceScore: 72,
        occurrenceCount: 3,
        description: '점심 후 혈당 스파이크',
        detectedAt: new Date(),
      },
      {
        id: 'pattern-3',
        userId: 'user-2',
        patternType: 'dawn_phenomenon',
        confidence: 'high',
        confidenceScore: 90,
        occurrenceCount: 7,
        description: '새벽 현상 감지',
        detectedAt: new Date(),
      },
      {
        id: 'pattern-4',
        userId: 'user-3',
        patternType: 'weekend_pattern',
        confidence: 'medium',
        confidenceScore: 65,
        occurrenceCount: 2,
        description: '주말 식사 패턴 변화',
        detectedAt: new Date(),
      },
    ];
  }

  /**
   * Pattern → Action 변환
   */
  private convertPatternsToActions(patterns: PatternAnalysis[]): ActionDto[] {
    const now = new Date().toISOString();

    return patterns.map((pattern): ActionDto => {
      const actionType = PATTERN_TO_ACTION_MAP[pattern.patternType] || 'DISPLAY';
      const target = ACTION_TARGET_MAP[actionType];

      return {
        id: `action-${pattern.id}`,
        type: actionType,
        status: this.determineStatus(actionType),
        title: this.generateTitle(actionType, pattern),
        description: pattern.description || this.generateDescription(actionType, pattern),
        patternId: pattern.id,
        patternType: pattern.patternType,
        targetApp: target?.app,
        targetPath: target?.path,
        metadata: {
          userId: pattern.userId,
          confidence: pattern.confidence,
          confidenceScore: pattern.confidenceScore,
          occurrenceCount: pattern.occurrenceCount,
        },
        createdAt: pattern.detectedAt.toISOString(),
        updatedAt: now,
      };
    });

    // NONE Action은 항상 포함 (Work Order 요구사항)
  }

  /**
   * Action 상태 결정
   */
  private determineStatus(actionType: ActionType): ActionStatus {
    const target = ACTION_TARGET_MAP[actionType];
    if (!target) {
      return 'unavailable';
    }
    return 'available';
  }

  /**
   * Action 제목 생성
   */
  private generateTitle(actionType: ActionType, pattern: PatternAnalysis): string {
    const labels: Record<ActionType, string> = {
      'COACHING': '코칭 세션 시작',
      'DISPLAY': '패턴 분석 결과 보기',
      'SURVEY': '생활 습관 설문',
      'COMMERCE': '관련 상품 보기',
      'NONE': '추가 조치 없음',
    };
    return labels[actionType];
  }

  /**
   * Action 설명 생성
   */
  private generateDescription(actionType: ActionType, pattern: PatternAnalysis): string {
    switch (actionType) {
      case 'COACHING':
        return `${pattern.patternType} 패턴이 감지되었습니다. 코칭 세션을 통해 개선 방안을 상담하세요.`;
      case 'DISPLAY':
        return `${pattern.patternType} 패턴에 대한 상세 분석 결과를 확인하세요.`;
      case 'SURVEY':
        return `생활 습관 설문을 통해 더 정확한 분석을 받아보세요.`;
      case 'COMMERCE':
        return `혈당 관리에 도움이 되는 관련 상품을 확인하세요.`;
      case 'NONE':
        return `현재 추가 조치가 필요하지 않습니다.`;
      default:
        return '';
    }
  }

  /**
   * Action Type별 개수 계산
   */
  private countByType(actions: ActionDto[]): Record<ActionType, number> {
    const result: Record<ActionType, number> = {
      'COACHING': 0,
      'DISPLAY': 0,
      'SURVEY': 0,
      'COMMERCE': 0,
      'NONE': 0,
    };

    for (const action of actions) {
      result[action.type]++;
    }

    return result;
  }
}

export default ActionService;
