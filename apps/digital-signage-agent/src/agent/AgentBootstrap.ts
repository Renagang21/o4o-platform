/**
 * Agent Bootstrap
 *
 * Main orchestrator for the Digital Signage Device Agent
 * Phase 7: Device Agent
 */

import { EventEmitter } from 'eventemitter3';
import { AgentConfig, mergeConfig, loadConfigFromEnv } from './AgentConfig';
import { AgentLogger } from './AgentLogger';
import { AgentRegistrar } from './AgentRegistrar';
import { AgentHeartbeat } from './AgentHeartbeat';
import { ActionHandler } from './ActionHandler';
import { CoreSocketClient } from '../comm/CoreSocketClient';
import { FallbackHttpClient } from '../comm/FallbackHttpClient';
import { LocalPlayer } from '../player/LocalPlayer';

export enum AgentState {
  STOPPED = 'stopped',
  STARTING = 'starting',
  CONNECTING = 'connecting',
  REGISTERING = 'registering',
  RUNNING = 'running',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}

interface AgentBootstrapEvents {
  stateChange: (state: AgentState) => void;
  error: (error: Error) => void;
}

export class AgentBootstrap extends EventEmitter<AgentBootstrapEvents> {
  private config: AgentConfig;
  private logger: AgentLogger;
  private registrar: AgentRegistrar;
  private heartbeat: AgentHeartbeat;
  private actionHandler: ActionHandler;
  private socketClient: CoreSocketClient;
  private httpClient: FallbackHttpClient;
  private player: LocalPlayer;
  private state: AgentState = AgentState.STOPPED;

  constructor(userConfig: Partial<AgentConfig> = {}) {
    super();

    // Initialize configuration
    this.config = mergeConfig(userConfig, loadConfigFromEnv());

    // Initialize logger
    this.logger = new AgentLogger(this.config.logLevel);

    // Initialize components
    this.registrar = new AgentRegistrar(this.config, this.logger);
    this.httpClient = new FallbackHttpClient(this.config, this.logger);
    this.socketClient = new CoreSocketClient(this.config, this.logger);
    this.player = new LocalPlayer(this.logger);
    this.actionHandler = new ActionHandler(this.logger, this.registrar, this.player);
    this.heartbeat = new AgentHeartbeat(this.config, this.logger, this.registrar);

    // Setup event handlers
    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for all components
   */
  private setupEventHandlers(): void {
    // Socket events
    this.socketClient.on('connected', () => {
      this.logger.info('Socket connected');
    });

    this.socketClient.on('disconnected', (reason) => {
      this.logger.warn('Socket disconnected', { reason });
      this.handleDisconnect();
    });

    this.socketClient.on('error', (error) => {
      this.logger.error('Socket error', { error: error.message });
      this.emit('error', error);
    });

    // Action events from Core
    this.socketClient.on('actionExecute', async (payload) => {
      await this.actionHandler.execute(payload);
    });

    this.socketClient.on('actionPause', (actionId) => {
      this.actionHandler.pause(actionId);
    });

    this.socketClient.on('actionResume', (actionId) => {
      this.actionHandler.resume(actionId);
    });

    this.socketClient.on('actionStop', (actionId) => {
      this.actionHandler.stop(actionId);
    });

    // Action status updates to Core
    this.actionHandler.on('statusUpdate', (payload) => {
      this.socketClient.sendActionStatus(payload);
      this.heartbeat.setLastActionExecutionId(payload.actionExecutionId);
    });

    // Player status for heartbeat
    this.player.on('statusChange', () => {
      this.heartbeat.setPlayerAlive(this.player.isAlive());
    });
  }

  /**
   * Start the agent
   */
  async start(): Promise<void> {
    if (this.state !== AgentState.STOPPED) {
      this.logger.warn('Agent already running', { state: this.state });
      return;
    }

    this.setState(AgentState.STARTING);
    this.logger.info('Starting Digital Signage Agent');

    try {
      // Step 1: Register display
      this.setState(AgentState.REGISTERING);
      const registrationResult = await this.registrar.registerDisplay(this.httpClient);

      if (!registrationResult.success || !registrationResult.displayId) {
        throw new Error(registrationResult.error || 'Registration failed');
      }

      // Set display ID for HTTP client
      this.httpClient.setDisplayId(registrationResult.displayId);

      // Step 2: Connect WebSocket
      this.setState(AgentState.CONNECTING);
      await this.socketClient.connect(registrationResult.displayId);

      // Step 3: Start heartbeat
      this.heartbeat.start((payload) => {
        this.socketClient.sendHeartbeat(payload);
      });

      // Agent is now running
      this.setState(AgentState.RUNNING);
      this.logger.info('Agent started successfully', {
        displayId: registrationResult.displayId,
        slots: registrationResult.slots?.length || 0,
      });
    } catch (error) {
      this.setState(AgentState.ERROR);
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Agent start failed', { error: err.message });
      this.emit('error', err);
      throw err;
    }
  }

  /**
   * Stop the agent
   */
  async stop(): Promise<void> {
    if (this.state === AgentState.STOPPED) {
      return;
    }

    this.logger.info('Stopping Digital Signage Agent');

    // Stop all active actions
    this.actionHandler.stopAll();

    // Stop heartbeat
    this.heartbeat.stop();

    // Disconnect socket
    this.socketClient.disconnect();

    // Clear registration
    this.registrar.clearRegistration();

    this.setState(AgentState.STOPPED);
    this.logger.info('Agent stopped');
  }

  /**
   * Handle disconnect from Core
   */
  private handleDisconnect(): void {
    if (this.state === AgentState.STOPPED) {
      return;
    }

    this.logger.warn('Handling disconnect');

    // Stop all actions (as per Work Order - network disconnect stops actions)
    this.actionHandler.stopAll();

    // Stop heartbeat
    this.heartbeat.stop();

    // Set reconnecting state
    this.setState(AgentState.RECONNECTING);

    // Attempt to reconnect
    this.attemptReconnect();
  }

  /**
   * Attempt to reconnect to Core
   */
  private async attemptReconnect(): Promise<void> {
    const displayId = this.registrar.getDisplayId();
    if (!displayId) {
      this.logger.error('Cannot reconnect: no display ID');
      this.setState(AgentState.ERROR);
      return;
    }

    try {
      this.logger.info('Attempting to reconnect');
      await this.socketClient.connect(displayId);

      // Restart heartbeat
      this.heartbeat.start((payload) => {
        this.socketClient.sendHeartbeat(payload);
      });

      this.setState(AgentState.RUNNING);
      this.logger.info('Reconnected successfully');
    } catch (error) {
      this.logger.error('Reconnect failed', {
        error: error instanceof Error ? error.message : String(error),
      });

      // Retry after interval
      setTimeout(() => {
        if (this.state === AgentState.RECONNECTING) {
          this.attemptReconnect();
        }
      }, this.config.reconnectIntervalMs);
    }
  }

  /**
   * Set agent state and emit event
   */
  private setState(state: AgentState): void {
    if (this.state !== state) {
      this.state = state;
      this.emit('stateChange', state);
    }
  }

  /**
   * Get current state
   */
  getState(): AgentState {
    return this.state;
  }

  /**
   * Get display ID
   */
  getDisplayId(): string | null {
    return this.registrar.getDisplayId();
  }

  /**
   * Check if agent is connected
   */
  isConnected(): boolean {
    return this.socketClient.connected();
  }

  /**
   * Destroy agent and cleanup resources
   */
  destroy(): void {
    this.stop();
    this.actionHandler.destroy();
    this.removeAllListeners();
  }
}
