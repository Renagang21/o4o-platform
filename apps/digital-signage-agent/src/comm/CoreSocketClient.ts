/**
 * Core Socket Client
 *
 * WebSocket client for real-time communication with Core server
 * Phase 7: Device Agent
 */

/* eslint-disable @typescript-eslint/no-var-requires */
import { EventEmitter } from 'eventemitter3';
import { AgentConfig } from '../agent/AgentConfig';
import { AgentLogger } from '../agent/AgentLogger';
import { HeartbeatPayload } from '../agent/AgentHeartbeat';

// Use require for CJS compatibility
const { io } = require('socket.io-client');
type SocketType = any;

// WebSocket Events (from Work Order)
export enum AgentEvent {
  CONNECTED = 'agent:connected',
  DISCONNECTED = 'agent:disconnected',
  HEARTBEAT = 'agent:heartbeat',
  ACTION_EXECUTE = 'action:execute',
  ACTION_PAUSE = 'action:pause',
  ACTION_RESUME = 'action:resume',
  ACTION_STOP = 'action:stop',
  ACTION_STATUS = 'action:status',
  ERROR = 'agent:error',
}

export interface ActionExecutePayload {
  actionExecutionId: string;
  displaySlotId: string;
  mediaSourceId: string;
  mediaSource: {
    id: string;
    name: string;
    type: string;
    url?: string;
    embedId?: string;
    playerType: string;
    duration?: number;
  };
  scheduleId?: string;
}

export interface ActionStatusPayload {
  actionExecutionId: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'stopped' | 'failed';
  errorMessage?: string;
}

interface CoreSocketClientEvents {
  connected: () => void;
  disconnected: (reason: string) => void;
  error: (error: Error) => void;
  actionExecute: (payload: ActionExecutePayload) => void;
  actionPause: (actionExecutionId: string) => void;
  actionResume: (actionExecutionId: string) => void;
  actionStop: (actionExecutionId: string) => void;
}

export class CoreSocketClient extends EventEmitter<CoreSocketClientEvents> {
  private config: AgentConfig;
  private logger: AgentLogger;
  private socket: SocketType | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private displayId: string | null = null;

  constructor(config: AgentConfig, logger: AgentLogger) {
    super();
    this.config = config;
    this.logger = logger;
  }

  /**
   * Connect to Core server
   */
  connect(displayId: string): Promise<void> {
    this.displayId = displayId;

    return new Promise((resolve, reject) => {
      this.logger.info('Connecting to Core server', {
        url: this.config.coreServerWsUrl,
        displayId,
      });

      this.socket = io(this.config.coreServerWsUrl, {
        transports: ['websocket', 'polling'],
        timeout: this.config.connectionTimeoutMs,
        reconnection: true,
        reconnectionAttempts: this.config.maxReconnectAttempts,
        reconnectionDelay: this.config.reconnectIntervalMs,
        auth: {
          displayId,
        },
      });

      // Connection event
      this.socket.on('connect', () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.logger.info('Connected to Core server');

        // Emit connected event to server
        this.socket?.emit(AgentEvent.CONNECTED, { displayId });

        this.emit('connected');
        resolve();
      });

      // Disconnection event
      this.socket.on('disconnect', (reason: string) => {
        this.isConnected = false;
        this.logger.warn('Disconnected from Core server', { reason });
        this.emit('disconnected', reason);
      });

      // Connection error
      this.socket.on('connect_error', (error: Error) => {
        this.reconnectAttempts++;
        this.logger.error('Connection error', {
          error: error.message,
          attempt: this.reconnectAttempts,
        });

        if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
          this.emit('error', error);
          reject(error);
        }
      });

      // Action events from Core
      this.socket.on(AgentEvent.ACTION_EXECUTE, (payload: ActionExecutePayload) => {
        this.logger.info('Received action:execute', {
          actionExecutionId: payload.actionExecutionId,
        });
        this.emit('actionExecute', payload);
      });

      this.socket.on(AgentEvent.ACTION_PAUSE, (data: { actionExecutionId: string }) => {
        this.logger.info('Received action:pause', data);
        this.emit('actionPause', data.actionExecutionId);
      });

      this.socket.on(AgentEvent.ACTION_RESUME, (data: { actionExecutionId: string }) => {
        this.logger.info('Received action:resume', data);
        this.emit('actionResume', data.actionExecutionId);
      });

      this.socket.on(AgentEvent.ACTION_STOP, (data: { actionExecutionId: string }) => {
        this.logger.info('Received action:stop', data);
        this.emit('actionStop', data.actionExecutionId);
      });

      // Generic error
      this.socket.on('error', (error: Error | string) => {
        this.logger.error('Socket error', { error: String(error) });
        this.emit('error', error instanceof Error ? error : new Error(String(error)));
      });
    });
  }

  /**
   * Disconnect from Core server
   */
  disconnect(): void {
    if (this.socket) {
      this.logger.info('Disconnecting from Core server');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * Send heartbeat
   */
  sendHeartbeat(payload: HeartbeatPayload): void {
    if (!this.socket || !this.isConnected) {
      this.logger.warn('Cannot send heartbeat: not connected');
      return;
    }

    this.socket.emit(AgentEvent.HEARTBEAT, payload);
  }

  /**
   * Send action status update
   */
  sendActionStatus(payload: ActionStatusPayload): void {
    if (!this.socket || !this.isConnected) {
      this.logger.warn('Cannot send action status: not connected');
      return;
    }

    this.logger.debug('Sending action status', payload);
    this.socket.emit(AgentEvent.ACTION_STATUS, payload);
  }

  /**
   * Check if connected
   */
  connected(): boolean {
    return this.isConnected;
  }
}
