/**
 * Channel Connectors Module
 * Phase PD-9: Multichannel RPA 1차
 *
 * Exports all channel-related interfaces, registry, and connectors
 */

// Interfaces
export * from './IChannelConnector.js';

// Registry
export * from './ChannelConnectorRegistry.js';

// Connectors
export * from './TestChannelConnector.js';

// Initialization
import { channelConnectorRegistry } from './ChannelConnectorRegistry.js';
import { TestChannelConnector } from './TestChannelConnector.js';

/**
 * Initialize and register all channel connectors
 * Should be called during application startup
 */
export function initializeChannelConnectors(): void {
  console.log('[Channels] Initializing channel connectors...');

  // Register TestChannelConnector
  const testConnector = new TestChannelConnector();
  channelConnectorRegistry.register(testConnector);

  // Future connectors can be registered here:
  // const naverConnector = new NaverSmartStoreConnector();
  // channelConnectorRegistry.register(naverConnector);

  console.log(`[Channels] Initialized ${channelConnectorRegistry.getConnectorCount()} connectors:`,
    channelConnectorRegistry.getRegisteredChannels());
}
