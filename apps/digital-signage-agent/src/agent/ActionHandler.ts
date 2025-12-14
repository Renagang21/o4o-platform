/**
 * Action Handler
 *
 * Handles ActionExecution requests from Core
 * Phase 7: Device Agent
 */

import { EventEmitter } from 'eventemitter3';
import { AgentLogger } from './AgentLogger';
import { AgentRegistrar } from './AgentRegistrar';
import { LocalPlayer, PlayerStatus } from '../player/LocalPlayer';
import { ActionExecutePayload, ActionStatusPayload } from '../comm/CoreSocketClient';

export type ActionStatus = 'pending' | 'running' | 'paused' | 'completed' | 'stopped' | 'failed';

interface ActionState {
  actionExecutionId: string;
  displaySlotId: string;
  status: ActionStatus;
  startedAt?: Date;
  endedAt?: Date;
  errorMessage?: string;
}

interface ActionHandlerEvents {
  statusUpdate: (payload: ActionStatusPayload) => void;
}

export class ActionHandler extends EventEmitter<ActionHandlerEvents> {
  private logger: AgentLogger;
  private registrar: AgentRegistrar;
  private player: LocalPlayer;
  private activeActions: Map<string, ActionState> = new Map();
  private slotToAction: Map<string, string> = new Map();

  constructor(
    logger: AgentLogger,
    registrar: AgentRegistrar,
    player: LocalPlayer
  ) {
    super();
    this.logger = logger;
    this.registrar = registrar;
    this.player = player;

    // Listen to player events
    this.setupPlayerListeners();
  }

  /**
   * Setup player event listeners
   */
  private setupPlayerListeners(): void {
    this.player.on('statusChange', (status: PlayerStatus) => {
      this.handlePlayerStatusChange(status);
    });

    this.player.on('playbackComplete', () => {
      this.handlePlaybackComplete();
    });

    this.player.on('error', (error: Error) => {
      this.handlePlayerError(error);
    });
  }

  /**
   * Execute an action
   */
  async execute(payload: ActionExecutePayload): Promise<void> {
    const { actionExecutionId, displaySlotId, mediaSource } = payload;

    this.logger.info('Executing action', {
      actionExecutionId,
      displaySlotId,
      mediaId: mediaSource.id,
    });

    // Check if slot already has an active action
    const existingActionId = this.slotToAction.get(displaySlotId);
    if (existingActionId) {
      this.logger.warn('Stopping existing action on slot', {
        existingActionId,
        newActionId: actionExecutionId,
      });
      await this.stop(existingActionId);
    }

    // Create action state
    const actionState: ActionState = {
      actionExecutionId,
      displaySlotId,
      status: 'pending',
      startedAt: new Date(),
    };

    this.activeActions.set(actionExecutionId, actionState);
    this.slotToAction.set(displaySlotId, actionExecutionId);

    // Update slot status
    this.registrar.updateSlotStatus(displaySlotId, 'playing');

    try {
      // Start player
      await this.player.play({
        id: mediaSource.id,
        name: mediaSource.name,
        type: mediaSource.type,
        url: mediaSource.url,
        embedId: mediaSource.embedId,
        playerType: mediaSource.playerType as any,
        duration: mediaSource.duration,
      });

      // Update status to running
      this.updateActionStatus(actionExecutionId, 'running');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.updateActionStatus(actionExecutionId, 'failed', errorMessage);
      this.registrar.updateSlotStatus(displaySlotId, 'error');
    }
  }

  /**
   * Pause an action
   */
  pause(actionExecutionId: string): void {
    const action = this.activeActions.get(actionExecutionId);
    if (!action) {
      this.logger.warn('Cannot pause: action not found', { actionExecutionId });
      return;
    }

    if (action.status !== 'running') {
      this.logger.warn('Cannot pause: action not running', {
        actionExecutionId,
        status: action.status,
      });
      return;
    }

    this.player.pause();
    this.updateActionStatus(actionExecutionId, 'paused');
    this.registrar.updateSlotStatus(action.displaySlotId, 'paused');
  }

  /**
   * Resume an action
   */
  resume(actionExecutionId: string): void {
    const action = this.activeActions.get(actionExecutionId);
    if (!action) {
      this.logger.warn('Cannot resume: action not found', { actionExecutionId });
      return;
    }

    if (action.status !== 'paused') {
      this.logger.warn('Cannot resume: action not paused', {
        actionExecutionId,
        status: action.status,
      });
      return;
    }

    this.player.resume();
    this.updateActionStatus(actionExecutionId, 'running');
    this.registrar.updateSlotStatus(action.displaySlotId, 'playing');
  }

  /**
   * Stop an action
   */
  async stop(actionExecutionId: string): Promise<void> {
    const action = this.activeActions.get(actionExecutionId);
    if (!action) {
      this.logger.warn('Cannot stop: action not found', { actionExecutionId });
      return;
    }

    this.player.stop();
    this.updateActionStatus(actionExecutionId, 'stopped');
    this.cleanupAction(actionExecutionId);
  }

  /**
   * Stop all actions (for disconnect/cleanup)
   */
  stopAll(): void {
    this.logger.info('Stopping all actions');
    this.player.stop();

    for (const [actionId, action] of this.activeActions) {
      if (action.status === 'running' || action.status === 'paused') {
        this.updateActionStatus(actionId, 'stopped');
      }
    }

    this.activeActions.clear();
    this.slotToAction.clear();
  }

  /**
   * Handle player status change
   */
  private handlePlayerStatusChange(status: PlayerStatus): void {
    // Find the active action
    for (const [actionId, action] of this.activeActions) {
      if (action.status === 'running' || action.status === 'paused') {
        // Map player status to action status
        if (status === 'playing' && action.status !== 'running') {
          this.updateActionStatus(actionId, 'running');
        } else if (status === 'paused' && action.status !== 'paused') {
          this.updateActionStatus(actionId, 'paused');
        }
        break;
      }
    }
  }

  /**
   * Handle playback complete
   */
  private handlePlaybackComplete(): void {
    // Find the active action
    for (const [actionId, action] of this.activeActions) {
      if (action.status === 'running') {
        this.updateActionStatus(actionId, 'completed');
        this.cleanupAction(actionId);
        break;
      }
    }
  }

  /**
   * Handle player error
   */
  private handlePlayerError(error: Error): void {
    // Find the active action
    for (const [actionId, action] of this.activeActions) {
      if (action.status === 'running' || action.status === 'paused') {
        this.updateActionStatus(actionId, 'failed', error.message);
        this.cleanupAction(actionId);
        break;
      }
    }
  }

  /**
   * Update action status and emit event
   */
  private updateActionStatus(
    actionExecutionId: string,
    status: ActionStatus,
    errorMessage?: string
  ): void {
    const action = this.activeActions.get(actionExecutionId);
    if (!action) return;

    action.status = status;
    if (errorMessage) {
      action.errorMessage = errorMessage;
    }
    if (status === 'completed' || status === 'stopped' || status === 'failed') {
      action.endedAt = new Date();
    }

    this.logger.info('Action status updated', {
      actionExecutionId,
      status,
      errorMessage,
    });

    // Emit status update for Core
    const payload: ActionStatusPayload = {
      actionExecutionId,
      status,
      errorMessage,
    };
    this.emit('statusUpdate', payload);
  }

  /**
   * Cleanup action after completion/stop/fail
   */
  private cleanupAction(actionExecutionId: string): void {
    const action = this.activeActions.get(actionExecutionId);
    if (!action) return;

    this.slotToAction.delete(action.displaySlotId);
    this.registrar.updateSlotStatus(action.displaySlotId, 'idle');

    // Keep action in map for a while for status queries
    // In production, could remove after a delay
  }

  /**
   * Get active action IDs
   */
  getActiveActionIds(): string[] {
    return Array.from(this.activeActions.entries())
      .filter(([_, action]) => action.status === 'running' || action.status === 'paused')
      .map(([id]) => id);
  }

  /**
   * Get action by ID
   */
  getAction(actionExecutionId: string): ActionState | undefined {
    return this.activeActions.get(actionExecutionId);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopAll();
    this.player.destroy();
    this.removeAllListeners();
  }
}
