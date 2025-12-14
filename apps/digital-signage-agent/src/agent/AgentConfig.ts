/**
 * Agent Configuration
 *
 * Configuration for the Digital Signage Device Agent
 * Phase 7: Device Agent
 */

export interface AgentConfig {
  // Core server connection
  coreServerUrl: string;
  coreServerWsUrl: string;

  // Device identification
  hardwareId: string;
  deviceName?: string;

  // Connection settings
  heartbeatIntervalMs: number;
  reconnectIntervalMs: number;
  maxReconnectAttempts: number;

  // Timeouts
  connectionTimeoutMs: number;
  actionTimeoutMs: number;

  // Logging
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export const DEFAULT_CONFIG: Partial<AgentConfig> = {
  heartbeatIntervalMs: 5000,        // 5 seconds
  reconnectIntervalMs: 3000,        // 3 seconds
  maxReconnectAttempts: 10,
  connectionTimeoutMs: 10000,       // 10 seconds
  actionTimeoutMs: 60000,           // 60 seconds
  logLevel: 'info',
};

/**
 * Load configuration from environment variables
 */
export function loadConfigFromEnv(): Partial<AgentConfig> {
  return {
    coreServerUrl: process.env.CORE_SERVER_URL || 'http://localhost:3001',
    coreServerWsUrl: process.env.CORE_SERVER_WS_URL || 'ws://localhost:3001',
    hardwareId: process.env.HARDWARE_ID,
    deviceName: process.env.DEVICE_NAME,
    heartbeatIntervalMs: parseInt(process.env.HEARTBEAT_INTERVAL_MS || '5000'),
    reconnectIntervalMs: parseInt(process.env.RECONNECT_INTERVAL_MS || '3000'),
    maxReconnectAttempts: parseInt(process.env.MAX_RECONNECT_ATTEMPTS || '10'),
    connectionTimeoutMs: parseInt(process.env.CONNECTION_TIMEOUT_MS || '10000'),
    actionTimeoutMs: parseInt(process.env.ACTION_TIMEOUT_MS || '60000'),
    logLevel: (process.env.LOG_LEVEL as AgentConfig['logLevel']) || 'info',
  };
}

/**
 * Merge configurations with defaults
 */
export function mergeConfig(
  userConfig: Partial<AgentConfig>,
  envConfig: Partial<AgentConfig> = loadConfigFromEnv()
): AgentConfig {
  const merged = {
    ...DEFAULT_CONFIG,
    ...envConfig,
    ...userConfig,
  };

  // Validate required fields
  if (!merged.coreServerUrl) {
    throw new Error('AgentConfig: coreServerUrl is required');
  }
  if (!merged.coreServerWsUrl) {
    throw new Error('AgentConfig: coreServerWsUrl is required');
  }

  return merged as AgentConfig;
}
