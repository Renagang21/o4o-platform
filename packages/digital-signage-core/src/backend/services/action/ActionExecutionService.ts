import { DataSource, Repository, In } from 'typeorm';
import { ActionExecution, ActionExecutionStatus, ExecuteMode } from '../../entities/ActionExecution.entity.js';
import {
  ExecuteActionDto,
  StopActionDto,
  PauseActionDto,
  ResumeActionDto,
  ActionExecutionResult,
} from '../../dto/index.js';
import { DisplaySlot } from '../../entities/DisplaySlot.entity.js';

/**
 * ActionExecutionService
 *
 * Phase 4.5: Action execution management with slot occupancy control.
 *
 * Responsibilities:
 * - Execute actions on display slots
 * - Stop/Pause/Resume actions
 * - Slot occupancy management
 * - Execution logging
 *
 * Does NOT:
 * - Interpret business meaning
 * - Auto-trigger schedules
 * - Control actual player/renderer
 */
export class ActionExecutionService {
  private repo: Repository<ActionExecution>;
  private slotRepo: Repository<DisplaySlot>;

  constructor(private dataSource: DataSource) {
    this.repo = dataSource.getRepository(ActionExecution);
    this.slotRepo = dataSource.getRepository(DisplaySlot);
  }

  /**
   * Execute an action on a display slot
   */
  async execute(dto: ExecuteActionDto): Promise<ActionExecutionResult> {
    const executeMode = dto.executeMode || ExecuteMode.IMMEDIATE;

    // 1. Validate slot exists
    const slot = await this.slotRepo.findOne({
      where: { id: dto.displaySlotId, isActive: true },
    });

    if (!slot) {
      return {
        success: false,
        error: `DisplaySlot "${dto.displaySlotId}" not found or inactive`,
      };
    }

    // 2. Check slot occupancy
    const runningAction = await this.findRunningActionOnSlot(dto.displaySlotId);

    if (runningAction) {
      switch (executeMode) {
        case ExecuteMode.IMMEDIATE:
          return {
            success: false,
            error: `Slot is occupied by execution "${runningAction.id}". Use "replace" mode to override.`,
          };

        case ExecuteMode.REJECT:
          return {
            success: false,
            error: `Slot is occupied. Request rejected per executeMode=reject.`,
          };

        case ExecuteMode.REPLACE:
          // Stop the existing action
          await this.stopInternal(runningAction.id, dto.sourceAppId, 'Replaced by new action');
          break;
      }
    }

    // 3. Create new execution record
    const execution = this.repo.create({
      organizationId: dto.organizationId,
      ownerUserId: dto.ownerUserId || null,
      actionType: 'play',
      displayId: slot.displayId,
      displaySlotId: dto.displaySlotId,
      mediaListId: dto.mediaListId,
      scheduleId: dto.scheduleId || null,
      sourceAppId: dto.sourceAppId,
      status: ActionExecutionStatus.RUNNING,
      executeMode: executeMode,
      duration: dto.duration || null,
      executedAt: new Date(),
      metadata: dto.metadata || {},
    });

    const saved = await this.repo.save(execution);

    return {
      success: true,
      executionId: saved.id,
      status: saved.status,
      message: 'Action execution started',
    };
  }

  /**
   * Stop an action
   */
  async stop(executionId: string, dto: StopActionDto): Promise<ActionExecutionResult> {
    return this.stopInternal(executionId, dto.stoppedBy, dto.reason);
  }

  /**
   * Internal stop implementation
   */
  private async stopInternal(
    executionId: string,
    stoppedBy: string,
    reason?: string
  ): Promise<ActionExecutionResult> {
    const execution = await this.repo.findOne({ where: { id: executionId } });

    if (!execution) {
      return {
        success: false,
        error: `Execution "${executionId}" not found`,
      };
    }

    // Check if can be stopped
    if (
      execution.status === ActionExecutionStatus.STOPPED ||
      execution.status === ActionExecutionStatus.COMPLETED ||
      execution.status === ActionExecutionStatus.FAILED
    ) {
      return {
        success: false,
        error: `Execution is already in terminal state: ${execution.status}`,
      };
    }

    execution.status = ActionExecutionStatus.STOPPED;
    execution.stoppedBy = stoppedBy;
    execution.completedAt = new Date();
    if (reason) {
      execution.metadata = { ...execution.metadata, stopReason: reason };
    }

    await this.repo.save(execution);

    return {
      success: true,
      executionId: execution.id,
      status: execution.status,
      message: 'Action stopped',
    };
  }

  /**
   * Pause an action
   */
  async pause(executionId: string, dto: PauseActionDto): Promise<ActionExecutionResult> {
    const execution = await this.repo.findOne({ where: { id: executionId } });

    if (!execution) {
      return {
        success: false,
        error: `Execution "${executionId}" not found`,
      };
    }

    // Only running actions can be paused
    if (execution.status !== ActionExecutionStatus.RUNNING) {
      return {
        success: false,
        error: `Cannot pause execution in state: ${execution.status}`,
      };
    }

    execution.status = ActionExecutionStatus.PAUSED;
    execution.pausedAt = new Date();
    if (dto.pausedBy) {
      execution.metadata = { ...execution.metadata, pausedBy: dto.pausedBy };
    }
    if (dto.reason) {
      execution.metadata = { ...execution.metadata, pauseReason: dto.reason };
    }

    await this.repo.save(execution);

    return {
      success: true,
      executionId: execution.id,
      status: execution.status,
      message: 'Action paused',
    };
  }

  /**
   * Resume a paused action
   */
  async resume(executionId: string, dto: ResumeActionDto): Promise<ActionExecutionResult> {
    const execution = await this.repo.findOne({ where: { id: executionId } });

    if (!execution) {
      return {
        success: false,
        error: `Execution "${executionId}" not found`,
      };
    }

    // Only paused actions can be resumed
    if (execution.status !== ActionExecutionStatus.PAUSED) {
      return {
        success: false,
        error: `Cannot resume execution in state: ${execution.status}`,
      };
    }

    // Check if slot is still available
    const runningAction = await this.findRunningActionOnSlot(execution.displaySlotId!);
    if (runningAction && runningAction.id !== execution.id) {
      return {
        success: false,
        error: `Slot is now occupied by another action: ${runningAction.id}`,
      };
    }

    execution.status = ActionExecutionStatus.RUNNING;
    execution.pausedAt = null;
    if (dto.resumedBy) {
      execution.metadata = { ...execution.metadata, resumedBy: dto.resumedBy };
    }

    await this.repo.save(execution);

    return {
      success: true,
      executionId: execution.id,
      status: execution.status,
      message: 'Action resumed',
    };
  }

  /**
   * Find running action on a slot
   */
  async findRunningActionOnSlot(displaySlotId: string): Promise<ActionExecution | null> {
    return this.repo.findOne({
      where: {
        displaySlotId,
        status: In([ActionExecutionStatus.RUNNING, ActionExecutionStatus.PAUSED]),
      },
      order: { executedAt: 'DESC' },
    });
  }

  /**
   * Get current slot status
   */
  async getSlotStatus(displaySlotId: string): Promise<{
    isOccupied: boolean;
    currentExecution: ActionExecution | null;
  }> {
    const execution = await this.findRunningActionOnSlot(displaySlotId);
    return {
      isOccupied: execution !== null,
      currentExecution: execution,
    };
  }

  /**
   * ID로 조회
   */
  async findById(id: string): Promise<ActionExecution | null> {
    return await this.repo.findOne({ where: { id } });
  }

  /**
   * 목록 조회
   */
  async findList(options?: {
    organizationId?: string;
    displayId?: string;
    displaySlotId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: ActionExecution[]; total: number }> {
    const qb = this.repo.createQueryBuilder('ae');

    if (options?.organizationId) {
      qb.andWhere('ae.organizationId = :organizationId', {
        organizationId: options.organizationId,
      });
    }

    if (options?.displayId) {
      qb.andWhere('ae.displayId = :displayId', {
        displayId: options.displayId,
      });
    }

    if (options?.displaySlotId) {
      qb.andWhere('ae.displaySlotId = :displaySlotId', {
        displaySlotId: options.displaySlotId,
      });
    }

    if (options?.status) {
      qb.andWhere('ae.status = :status', { status: options.status });
    }

    qb.orderBy('ae.createdAt', 'DESC');

    if (options?.limit) {
      qb.take(options.limit);
    }
    if (options?.offset) {
      qb.skip(options.offset);
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  /**
   * 디스플레이별 최근 실행 조회
   */
  async findRecentByDisplayId(
    displayId: string,
    limit: number = 10
  ): Promise<ActionExecution[]> {
    return await this.repo.find({
      where: { displayId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * 슬롯별 최근 실행 조회
   */
  async findRecentBySlotId(
    displaySlotId: string,
    limit: number = 10
  ): Promise<ActionExecution[]> {
    return await this.repo.find({
      where: { displaySlotId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
