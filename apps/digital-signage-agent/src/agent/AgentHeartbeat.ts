/**
 * Agent Heartbeat
 *
 * Manages heartbeat reporting to Core server
 * Phase 7: Device Agent
 */

import { AgentConfig } from './AgentConfig';
import { AgentLogger } from './AgentLogger';
import { AgentRegistrar, SlotInfo } from './AgentRegistrar';

export interface HeartbeatPayload {
  displayId: string;
  hardwareId: string;
  timestamp: string;
  slotStatuses: {
    slotId: string;
    status: SlotInfo['status'];
    currentActionId?: string;
  }[];
  playerAlive: boolean;
  lastActionExecutionId?: string;
}

export class AgentHeartbeat {
  private config: AgentConfig;
  private logger: AgentLogger;
  private registrar: AgentRegistrar;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private lastActionExecutionId: string | null = null;
  private playerAlive: boolean = true;
  private sendCallback: ((payload: HeartbeatPayload) => void) | null = null;

  constructor(
    config: AgentConfig,
    logger: AgentLogger,
    registrar: AgentRegistrar
  ) {
    this.config = config;
    this.logger = logger;
    this.registrar = registrar;
  }

  /**
   * Start heartbeat
   */
  start(sendCallback: (payload: HeartbeatPayload) => void): void {
    if (this.isRunning) {
      this.logger.warn('Heartbeat already running');
      return;
    }

    this.sendCallback = sendCallback;
    this.isRunning = true;

    this.logger.info('Starting heartbeat', {
      intervalMs: this.config.heartbeatIntervalMs,
    });

    // Send initial heartbeat
    this.sendHeartbeat();

    // Start interval
    this.intervalId = setInterval(() => {
      this.sendHeartbeat();
    }, this.config.heartbeatIntervalMs);
  }

  /**
   * Stop heartbeat
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.sendCallback = null;
    this.logger.info('Heartbeat stopped');
  }

  /**
   * Send heartbeat
   */
  private sendHeartbeat(): void {
    const registration = this.registrar.getRegistration();
    if (!registration) {
      this.logger.warn('Cannot send heartbeat: not registered');
      return;
    }

    const payload: HeartbeatPayload = {
      displayId: registration.displayId,
      hardwareId: registration.hardwareId,
      timestamp: new Date().toISOString(),
      slotStatuses: registration.slots.map(slot => ({
        slotId: slot.id,
        status: slot.status,
      })),
      playerAlive: this.playerAlive,
      lastActionExecutionId: this.lastActionExecutionId || undefined,
    };

    this.logger.debug('Sending heartbeat', { displayId: payload.displayId });

    if (this.sendCallback) {
      this.sendCallback(payload);
    }
  }

  /**
   * Update last action execution ID
   */
  setLastActionExecutionId(actionId: string | null): void {
    this.lastActionExecutionId = actionId;
  }

  /**
   * Update player status
   */
  setPlayerAlive(alive: boolean): void {
    this.playerAlive = alive;
  }

  /**
   * Check if heartbeat is running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}
