import type { IChannelConnector } from './IChannelConnector.js';
import logger from '../utils/logger.js';

/**
 * Channel Connector Registry
 * Phase PD-9: Multichannel RPA 1차
 *
 * Central registry for all channel connectors.
 * Manages connector instances and provides lookup by channel code.
 */
export class ChannelConnectorRegistry {
  private connectors: Map<string, IChannelConnector>;
  private static instance: ChannelConnectorRegistry;

  private constructor() {
    this.connectors = new Map();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ChannelConnectorRegistry {
    if (!ChannelConnectorRegistry.instance) {
      ChannelConnectorRegistry.instance = new ChannelConnectorRegistry();
    }
    return ChannelConnectorRegistry.instance;
  }

  /**
   * Register a channel connector
   *
   * @param connector Connector instance to register
   * @throws Error if connector with same code already registered
   */
  public register(connector: IChannelConnector): void {
    const code = connector.channelCode;

    if (this.connectors.has(code)) {
      throw new Error(`Connector for channel '${code}' is already registered`);
    }

    this.connectors.set(code, connector);
    logger.info(`[ChannelConnectorRegistry] Registered connector: ${code}`);
  }

  /**
   * Unregister a channel connector
   *
   * @param channelCode Channel code to unregister
   * @returns True if connector was unregistered, false if not found
   */
  public unregister(channelCode: string): boolean {
    const deleted = this.connectors.delete(channelCode);
    if (deleted) {
      logger.info(`[ChannelConnectorRegistry] Unregistered connector: ${channelCode}`);
    }
    return deleted;
  }

  /**
   * Get connector by channel code
   *
   * @param channelCode Channel code to lookup
   * @returns Connector instance
   * @throws Error if connector not found
   */
  public getConnector(channelCode: string): IChannelConnector {
    const connector = this.connectors.get(channelCode);

    if (!connector) {
      throw new Error(
        `No connector registered for channel '${channelCode}'. ` +
        `Available connectors: ${Array.from(this.connectors.keys()).join(', ')}`
      );
    }

    return connector;
  }

  /**
   * Check if connector exists for channel code
   *
   * @param channelCode Channel code to check
   * @returns True if connector is registered
   */
  public hasConnector(channelCode: string): boolean {
    return this.connectors.has(channelCode);
  }

  /**
   * Get all registered channel codes
   *
   * @returns Array of registered channel codes
   */
  public getRegisteredChannels(): string[] {
    return Array.from(this.connectors.keys());
  }

  /**
   * Get count of registered connectors
   *
   * @returns Number of registered connectors
   */
  public getConnectorCount(): number {
    return this.connectors.size;
  }

  /**
   * Clear all registered connectors (mainly for testing)
   */
  public clearAll(): void {
    this.connectors.clear();
    logger.debug('[ChannelConnectorRegistry] Cleared all connectors');
  }
}

// Export singleton instance
export const channelConnectorRegistry = ChannelConnectorRegistry.getInstance();
