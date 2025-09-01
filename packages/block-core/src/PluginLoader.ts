import { BlockPlugin, LoadOptions } from './types';
import { BlockManager } from './BlockManager';

/**
 * Plugin Loader - Handles dynamic loading of block plugins
 */
export class PluginLoader {
  private manager: BlockManager;
  private loadQueue: string[] = [];
  private loadingPromises: Map<string, Promise<BlockPlugin>> = new Map();
  private pluginPaths: Map<string, string> = new Map();

  constructor(manager: BlockManager) {
    this.manager = manager;
    this.initializePluginPaths();
  }

  /**
   * Initialize plugin paths mapping
   */
  private initializePluginPaths(): void {
    // Map plugin IDs to their module paths
    this.pluginPaths.set('text-content-blocks', '@o4o/text-content-blocks');
    this.pluginPaths.set('layout-media-blocks', '@o4o/layout-media-blocks');
    this.pluginPaths.set('interactive-blocks', '@o4o/interactive-blocks');
    this.pluginPaths.set('dynamic-blocks', '@o4o/dynamic-blocks');
  }

  /**
   * Load a plugin
   */
  async load(pluginId: string, options?: LoadOptions): Promise<BlockPlugin> {
    // Check if already loading
    if (this.loadingPromises.has(pluginId)) {
      return this.loadingPromises.get(pluginId)!;
    }

    // Start loading
    const loadPromise = this.doLoad(pluginId, options);
    this.loadingPromises.set(pluginId, loadPromise);

    try {
      const plugin = await loadPromise;
      return plugin;
    } finally {
      this.loadingPromises.delete(pluginId);
    }
  }

  /**
   * Actual loading logic
   */
  private async doLoad(pluginId: string, options?: LoadOptions): Promise<BlockPlugin> {
    // Loading plugin

    try {
      // Dynamic import based on plugin ID
      const module = await this.dynamicImport(pluginId, options);
      
      // Extract plugin from module
      const plugin = module.default || module;
      
      // Validate plugin structure
      if (!this.isValidPlugin(plugin)) {
        throw new Error(`Invalid plugin structure for ${pluginId}`);
      }

      return plugin as BlockPlugin;
      
    } catch (error) {
      // Failed to load plugin
      throw error;
    }
  }

  /**
   * Dynamic import with webpack magic comments
   */
  private async dynamicImport(pluginId: string, options?: LoadOptions): Promise<any> {
    const { preload, prefetch, priority } = options || {};

    switch (pluginId) {
      case 'text-content-blocks':
        // Dynamic import will be resolved at runtime
        // @ts-ignore - Plugin modules will be available at runtime
        return import('@o4o/text-content-blocks');

      case 'layout-media-blocks':
        // @ts-ignore - Plugin modules will be available at runtime
        return import('@o4o/layout-media-blocks');

      case 'interactive-blocks':
        // @ts-ignore - Plugin modules will be available at runtime
        return import('@o4o/interactive-blocks');

      case 'dynamic-blocks':
        // @ts-ignore - Plugin modules will be available at runtime
        return import('@o4o/dynamic-blocks');

      default:
        // Try to load from custom path if registered
        const customPath = this.pluginPaths.get(pluginId);
        if (customPath) {
          return import(customPath);
        }
        throw new Error(`Unknown plugin: ${pluginId}`);
    }
  }

  /**
   * Validate plugin structure
   */
  private isValidPlugin(plugin: any): boolean {
    return (
      plugin &&
      typeof plugin === 'object' &&
      'id' in plugin &&
      'name' in plugin &&
      'version' in plugin &&
      'blocks' in plugin &&
      typeof plugin.activate === 'function' &&
      typeof plugin.deactivate === 'function'
    );
  }

  /**
   * Preload essential plugins
   */
  async preloadEssentials(): Promise<void> {
    const essentials = ['text-content-blocks'];
    
    for (const pluginId of essentials) {
      try {
        await this.load(pluginId, { preload: true, priority: 'high' });
      } catch (error) {
        // Failed to preload essential plugin
      }
    }
  }

  /**
   * Prefetch common plugins
   */
  prefetchCommon(): void {
    const common = ['layout-media-blocks', 'interactive-blocks'];
    
    // Use requestIdleCallback for better performance
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        common.forEach(pluginId => {
          this.prefetchPlugin(pluginId);
        });
      });
    } else {
      // Fallback to setTimeout
      setTimeout(() => {
        common.forEach(pluginId => {
          this.prefetchPlugin(pluginId);
        });
      }, 2000);
    }
  }

  /**
   * Prefetch a plugin (load but don't activate)
   */
  private async prefetchPlugin(pluginId: string): Promise<void> {
    try {
      // Just trigger the import to cache the module
      await this.dynamicImport(pluginId, { prefetch: true });
      // Prefetched plugin
    } catch (error) {
      // Failed to prefetch plugin
    }
  }

  /**
   * Load plugin based on user interaction
   */
  async loadOnDemand(pluginId: string): Promise<void> {
    // Check if plugin is needed based on current context
    if (this.isPluginNeeded(pluginId)) {
      await this.manager.loadPlugin(pluginId, { priority: 'normal' });
    }
  }

  /**
   * Check if plugin is needed
   */
  private isPluginNeeded(pluginId: string): boolean {
    // Implement logic to determine if plugin is needed
    // This could be based on:
    // - User permissions
    // - Page type
    // - Editor state
    // - User preferences
    
    // For now, return true for all
    return true;
  }

  /**
   * Schedule plugin loading
   */
  scheduleLoad(pluginId: string, delay: number = 0): void {
    this.loadQueue.push(pluginId);
    
    if (delay > 0) {
      setTimeout(() => this.processQueue(), delay);
    } else {
      requestAnimationFrame(() => this.processQueue());
    }
  }

  /**
   * Process load queue
   */
  private async processQueue(): Promise<void> {
    while (this.loadQueue.length > 0) {
      const pluginId = this.loadQueue.shift()!;
      
      try {
        await this.manager.loadPlugin(pluginId);
      } catch (error) {
        console.error(`Failed to load queued plugin ${pluginId}:`, error);
      }
    }
  }

  /**
   * Load plugins based on usage patterns
   */
  async loadByUsagePattern(): Promise<void> {
    const usage = this.analyzeUsagePattern();
    
    // Load frequently used plugins
    for (const pluginId of usage.frequent) {
      this.scheduleLoad(pluginId, 1000);
    }
    
    // Prefetch occasionally used plugins
    for (const pluginId of usage.occasional) {
      this.scheduleLoad(pluginId, 5000);
    }
  }

  /**
   * Analyze usage patterns (mock implementation)
   */
  private analyzeUsagePattern(): { frequent: string[], occasional: string[], rare: string[] } {
    // In a real implementation, this would analyze:
    // - localStorage/cookies for past usage
    // - User preferences
    // - Content type being edited
    
    return {
      frequent: ['layout-media-blocks'],
      occasional: ['interactive-blocks'],
      rare: ['dynamic-blocks']
    };
  }

  /**
   * Register custom plugin path
   */
  registerPluginPath(pluginId: string, path: string): void {
    this.pluginPaths.set(pluginId, path);
  }

  /**
   * Get registered plugin paths
   */
  getPluginPaths(): Map<string, string> {
    return new Map(this.pluginPaths);
  }
}