/**
 * Digital Signage Device Agent
 *
 * Store-side agent for Digital Signage playback
 * Phase 7: Device Agent
 *
 * This agent:
 * - Connects to Digital Signage Core
 * - Registers display and slots
 * - Receives and executes ActionExecution commands
 * - Reports status via heartbeat
 *
 * This agent does NOT:
 * - Make content decisions
 * - Execute scheduling policies
 * - Include business logic
 */

export { AgentBootstrap, AgentState } from './agent/AgentBootstrap';
export { AgentConfig, DEFAULT_CONFIG, loadConfigFromEnv, mergeConfig } from './agent/AgentConfig';
export { AgentLogger, LogLevel } from './agent/AgentLogger';
export { AgentRegistrar, DisplayRegistration, SlotInfo } from './agent/AgentRegistrar';
export { AgentHeartbeat, HeartbeatPayload } from './agent/AgentHeartbeat';
export { ActionHandler, ActionStatus } from './agent/ActionHandler';
export { CoreSocketClient, AgentEvent, ActionExecutePayload, ActionStatusPayload } from './comm/CoreSocketClient';
export { FallbackHttpClient, ApiResponse } from './comm/FallbackHttpClient';
export { LocalPlayer, PlayerType, PlayerStatus, MediaPayload } from './player/LocalPlayer';

/**
 * Main entry point for running the agent
 */
async function main(): Promise<void> {
  const { AgentBootstrap } = await import('./agent/AgentBootstrap');
  const { AgentLogger } = await import('./agent/AgentLogger');

  const logger = new AgentLogger('info', '[Agent]');

  logger.info('========================================');
  logger.info('  Digital Signage Device Agent v0.1.0');
  logger.info('========================================');

  const agent = new AgentBootstrap();

  // Handle state changes
  agent.on('stateChange', (state) => {
    logger.info(`State: ${state}`);
  });

  // Handle errors
  agent.on('error', (error) => {
    logger.error(`Error: ${error.message}`);
  });

  // Handle graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');
    await agent.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  try {
    await agent.start();
    logger.info('Running. Press Ctrl+C to stop.');
  } catch (error) {
    logger.error('Failed to start:', { error: String(error) });
    process.exit(1);
  }
}

// Run if this is the main module
if (require.main === module) {
  const { AgentLogger } = require('./agent/AgentLogger');
  const logger = new AgentLogger('error', '[Agent]');
  main().catch((err) => logger.error('Fatal error', { error: String(err) }));
}
