import { BlockPlugin, PluginMetadata, LoadOptions } from './types';
import { BlockRegistry } from './BlockRegistry';
import { PluginLoader } from './PluginLoader';

/**
 * Block Manager - Central management system for block plugins
 */
export class BlockManager {
  private static instance: BlockManager;
  private plugins: Map<string, BlockPlugin> = new Map();
  private metadata: Map<string, PluginMetadata> = new Map();
  private registry: BlockRegistry;
  private loader: PluginLoader;
  private loadingPromises: Map<string, Promise<void>> = new Map();

  private constructor() {
    this.registry = new BlockRegistry();
    this.loader = new PluginLoader(this);
  }

  /**
   * Get singleton instance
   */
  static getInstance(): BlockManager {
    if (!BlockManager.instance) {
      BlockManager.instance = new BlockManager();
    }
    return BlockManager.instance;
  }

  /**
   * Load a plugin by ID
   */
  async loadPlugin(pluginId: string, options?: LoadOptions): Promise<void> {
    // Check if already loaded
    if (this.plugins.has(pluginId)) {
      // Plugin is already loaded
      return;
    }

    // Check if currently loading
    if (this.loadingPromises.has(pluginId)) {
      return this.loadingPromises.get(pluginId);
    }

    // Start loading
    const loadPromise = this.doLoadPlugin(pluginId, options);
    this.loadingPromises.set(pluginId, loadPromise);

    try {
      await loadPromise;
    } finally {
      this.loadingPromises.delete(pluginId);
    }
  }

  /**
   * Actual plugin loading logic
   */
  private async doLoadPlugin(pluginId: string, options?: LoadOptions): Promise<void> {
    const startTime = performance.now();
    
    // Update metadata
    this.metadata.set(pluginId, {
      id: pluginId,
      name: pluginId,
      version: '0.0.0',
      status: 'loading'
    });

    try {
      // Load plugin module
      const plugin = await this.loader.load(pluginId, options);
      
      // Validate plugin
      await this.validatePlugin(plugin);
      
      // Check dependencies
      if (plugin.dependencies) {
        await this.loadDependencies(plugin.dependencies);
      }
      
      // Activate plugin
      await plugin.activate();
      
      // Register plugin
      this.plugins.set(pluginId, plugin);
      
      // Register blocks
      this.registerPluginBlocks(plugin);
      
      // Update metadata
      const loadTime = performance.now() - startTime;
      this.metadata.set(pluginId, {
        id: pluginId,
        name: plugin.name,
        version: plugin.version,
        loadTime,
        status: 'loaded'
      });
      
      // Plugin loaded successfully
      
    } catch (error) {
      // Update metadata with error
      this.metadata.set(pluginId, {
        id: pluginId,
        name: pluginId,
        version: '0.0.0',
        status: 'error',
        error: error as Error
      });
      
      // Failed to load plugin
      throw error;
    }
  }

  /**
   * Validate plugin structure
   */
  private async validatePlugin(plugin: BlockPlugin): Promise<void> {
    const required = ['id', 'name', 'version', 'blocks', 'activate', 'deactivate'];
    
    for (const field of required) {
      if (!(field in plugin)) {
        throw new Error(`Plugin missing required field: ${field}`);
      }
    }
    
    if (!Array.isArray(plugin.blocks)) {
      throw new Error('Plugin blocks must be an array');
    }
    
    if (plugin.blocks.length === 0) {
      throw new Error('Plugin must contain at least one block');
    }
  }

  /**
   * Load plugin dependencies
   */
  private async loadDependencies(dependencies: string[]): Promise<void> {
    const promises = dependencies.map(dep => this.loadPlugin(dep));
    await Promise.all(promises);
  }

  /**
   * Register blocks from plugin
   */
  private registerPluginBlocks(plugin: BlockPlugin): void {
    for (const block of plugin.blocks) {
      this.registry.register(block.name, block);
    }
  }

  /**
   * Unload a plugin
   */
  async unloadPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    
    if (!plugin) {
      // Plugin is not loaded
      return;
    }
    
    // Deactivate plugin
    await plugin.deactivate();
    
    // Unregister blocks
    for (const block of plugin.blocks) {
      this.registry.unregister(block.name);
    }
    
    // Remove from collections
    this.plugins.delete(pluginId);
    this.metadata.delete(pluginId);
    
    // Plugin unloaded
  }

  /**
   * Get loaded plugins
   */
  getPlugins(): BlockPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugin by ID
   */
  getPlugin(pluginId: string): BlockPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Get plugin metadata
   */
  getMetadata(pluginId: string): PluginMetadata | undefined {
    return this.metadata.get(pluginId);
  }

  /**
   * Get all metadata
   */
  getAllMetadata(): PluginMetadata[] {
    return Array.from(this.metadata.values());
  }

  /**
   * Check if plugin is loaded
   */
  isLoaded(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  /**
   * Get block registry
   */
  getRegistry(): BlockRegistry {
    return this.registry;
  }

  /**
   * Initialize with essential plugins
   */
  async initialize(): Promise<void> {
    // Initializing Block Manager
    
    // Load essential plugins immediately
    await this.loadPlugin('text-content-blocks', {
      preload: true,
      priority: 'high'
    });
    
    // Prefetch commonly used plugins
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        this.loadPlugin('layout-media-blocks', { prefetch: true });
      });
    }
  }
}