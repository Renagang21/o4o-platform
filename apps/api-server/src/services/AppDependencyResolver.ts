import { Repository } from 'typeorm';
import { AppDataSource } from '../database/connection.js';
import { AppRegistry } from '../entities/AppRegistry.js';
import { loadLocalManifest, hasManifest } from '../app-manifests/index.js';
import * as semver from 'semver';
import logger from '../utils/logger.js';

/**
 * Dependency Graph Structure
 * Maps appId to its dependencies
 */
interface DependencyGraph {
  [appId: string]: string[]; // appId -> [dependency appIds]
}

/**
 * Dependency Validation Result
 */
export interface DependencyValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  installOrder: string[];
}

/**
 * Custom Errors
 */
export class CyclicDependencyError extends Error {
  constructor(public readonly cycle: string[]) {
    super(`Cyclic dependency detected: ${cycle.join(' → ')}`);
    this.name = 'CyclicDependencyError';
  }
}

export class VersionMismatchError extends Error {
  constructor(
    public readonly appId: string,
    public readonly required: string,
    public readonly installed: string
  ) {
    super(
      `${appId} requires version ${required}, but ${installed} is installed`
    );
    this.name = 'VersionMismatchError';
  }
}

export class DependencyError extends Error {
  constructor(
    message: string,
    public readonly dependents: string[]
  ) {
    super(message);
    this.name = 'DependencyError';
  }
}

/**
 * AppDependencyResolver Service
 *
 * Handles dependency graph construction, topological sorting, and cycle detection
 * for Core/Extension app pattern
 */
export class AppDependencyResolver {
  private repo: Repository<AppRegistry>;

  constructor() {
    this.repo = AppDataSource.getRepository(AppRegistry);
  }

  /**
   * Resolve installation order for an app and its dependencies
   * Uses topological sort to ensure dependencies are installed first
   *
   * @param appId - App to install
   * @returns Array of appIds in installation order (dependencies first)
   */
  async resolveInstallOrder(appId: string): Promise<string[]> {
    // Build dependency tree
    const dependencies = await this.collectDependencies(appId, new Set());

    // Create dependency graph
    const graph = await this.buildDependencyGraph(Array.from(dependencies));

    // Detect cycles
    const cycle = this.detectCycle(graph);
    if (cycle.length > 0) {
      throw new CyclicDependencyError(cycle);
    }

    // Topological sort
    return this.topologicalSort(graph);
  }

  /**
   * Find apps that depend on the given app
   * Used to prevent uninstalling core apps that have extensions
   *
   * @param appId - App to check
   * @returns Array of appIds that depend on this app
   */
  async findDependents(appId: string): Promise<string[]> {
    // Query all installed apps
    const allApps = await this.repo.find();

    // Filter apps that have this appId in their dependencies
    const dependents = allApps.filter(app => {
      if (!app.dependencies) return false;
      return Object.keys(app.dependencies).includes(appId);
    });

    return dependents.map(app => app.appId);
  }

  /**
   * Validate version compatibility between installed app and requirement
   *
   * @param appId - App to check
   * @param requiredVersion - Version range required (e.g., ">=1.0.0")
   * @throws VersionMismatchError if versions don't match
   */
  async validateVersion(appId: string, requiredVersion: string): Promise<void> {
    const app = await this.repo.findOne({ where: { appId } });

    if (!app) {
      // App not installed - will be installed as dependency
      return;
    }

    const installedVersion = app.version;

    // Check if installed version satisfies requirement
    if (!semver.satisfies(installedVersion, requiredVersion)) {
      throw new VersionMismatchError(appId, requiredVersion, installedVersion);
    }
  }

  /**
   * Collect all dependencies recursively
   *
   * @param appId - Starting app
   * @param visited - Set to track visited apps (prevent infinite loops)
   * @returns Set of all dependencies including the starting app
   */
  private async collectDependencies(
    appId: string,
    visited: Set<string>
  ): Promise<Set<string>> {
    if (visited.has(appId)) {
      return visited;
    }

    visited.add(appId);

    // Load manifest
    if (!hasManifest(appId)) {
      throw new Error(`No manifest found for app: ${appId}`);
    }

    const manifest = loadLocalManifest(appId);
    const manifestDeps = manifest.dependencies || {};

    // Handle both dependency formats
    let dependencies: Record<string, string> = {};
    if (typeof manifestDeps === 'object' && !Array.isArray(manifestDeps)) {
      // Check if it's the legacy format or new format
      if ('apps' in manifestDeps || 'services' in manifestDeps) {
        // Legacy format - not used for Core/Extension pattern
        dependencies = {};
      } else {
        // New format: { "app-id": "version-range" }
        dependencies = manifestDeps as Record<string, string>;
      }
    }

    // Recursively collect dependencies
    for (const [depAppId, versionRange] of Object.entries(dependencies)) {
      // Skip non-string version ranges
      if (typeof versionRange !== 'string') continue;

      // Validate version if already installed
      await this.validateVersion(depAppId, versionRange);

      // Recursively collect
      await this.collectDependencies(depAppId, visited);
    }

    return visited;
  }

  /**
   * Build dependency graph from app manifests
   *
   * @param appIds - Apps to include in graph
   * @returns Dependency graph
   */
  private async buildDependencyGraph(appIds: string[]): Promise<DependencyGraph> {
    const graph: DependencyGraph = {};

    for (const appId of appIds) {
      if (!hasManifest(appId)) {
        throw new Error(`No manifest found for app: ${appId}`);
      }

      const manifest = loadLocalManifest(appId);
      const manifestDeps = manifest.dependencies || {};

      // Handle both dependency formats
      let dependencies: Record<string, string> = {};
      if (typeof manifestDeps === 'object' && !Array.isArray(manifestDeps)) {
        if ('apps' in manifestDeps || 'services' in manifestDeps) {
          dependencies = {};
        } else {
          dependencies = manifestDeps as Record<string, string>;
        }
      }

      graph[appId] = Object.keys(dependencies);
    }

    return graph;
  }

  /**
   * Detect cyclic dependencies using DFS
   *
   * @param graph - Dependency graph
   * @returns Array of appIds forming a cycle, or empty array if no cycle
   */
  private detectCycle(graph: DependencyGraph): string[] {
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const path: string[] = [];

    const hasCycle = (node: string): boolean => {
      visited.add(node);
      recStack.add(node);
      path.push(node);

      const deps = graph[node] || [];
      for (const dep of deps) {
        if (!visited.has(dep)) {
          if (hasCycle(dep)) return true;
        } else if (recStack.has(dep)) {
          // Cycle detected - add the dep to complete the cycle
          path.push(dep);
          return true;
        }
      }

      recStack.delete(node);
      path.pop();
      return false;
    };

    for (const node of Object.keys(graph)) {
      if (!visited.has(node)) {
        if (hasCycle(node)) {
          return path;
        }
      }
    }

    return [];
  }

  /**
   * Topological sort using Kahn's algorithm (improved)
   * Returns apps in dependency order (dependencies first)
   *
   * Improvements:
   * - Handles orphan nodes (nodes not in any dependency chain)
   * - Better logging for debugging
   * - Handles undefined graph entries
   *
   * @param graph - Dependency graph
   * @returns Array of appIds in installation order
   */
  private topologicalSort(graph: DependencyGraph): string[] {
    logger.info(`[DependencyResolver] Starting topological sort for ${Object.keys(graph).length} apps`);

    // Collect all nodes (including those only appearing as dependencies)
    const allNodes = new Set<string>();

    // Add all nodes from graph keys
    for (const node of Object.keys(graph)) {
      allNodes.add(node);
      // Also add dependencies as nodes (orphan node prevention)
      for (const dep of graph[node] || []) {
        allNodes.add(dep);
      }
    }

    // Ensure all nodes exist in graph (orphan node handling)
    for (const node of allNodes) {
      if (!graph[node]) {
        graph[node] = [];
      }
    }

    // Calculate in-degree for each node
    const inDegree = new Map<string, number>();
    const nodes = Array.from(allNodes);

    // Initialize in-degrees to 0
    for (const node of nodes) {
      inDegree.set(node, 0);
    }

    // Calculate actual in-degrees
    for (const node of nodes) {
      for (const dep of graph[node] || []) {
        inDegree.set(dep, (inDegree.get(dep) || 0) + 1);
      }
    }

    // Queue for nodes with in-degree 0 (no dependencies)
    const queue: string[] = [];
    for (const [node, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(node);
      }
    }

    logger.info(`[DependencyResolver] Starting with ${queue.length} root nodes: ${queue.join(', ')}`);

    const result: string[] = [];

    while (queue.length > 0) {
      const node = queue.shift()!;
      result.push(node);

      // Reduce in-degree for dependent nodes
      const deps = graph[node] || [];
      for (const dep of deps) {
        const newDegree = (inDegree.get(dep) || 0) - 1;
        inDegree.set(dep, newDegree);

        if (newDegree === 0) {
          queue.push(dep);
        }
      }
    }

    // Check for orphan nodes (not processed)
    const orphans = nodes.filter(n => !result.includes(n));
    if (orphans.length > 0) {
      logger.warn(`[DependencyResolver] Found orphan nodes (adding to end): ${orphans.join(', ')}`);
      result.push(...orphans);
    }

    // Reverse to get installation order (dependencies first)
    const installOrder = result.reverse();

    logger.info(`[DependencyResolver] ✓ Install order: ${installOrder.join(' → ')}`);

    return installOrder;
  }

  /**
   * Get reverse topological sort for uninstallation
   * Returns apps in reverse dependency order (dependents first)
   *
   * @param appIds - Apps to uninstall
   * @returns Array of appIds in uninstallation order
   */
  async resolveUninstallOrder(appIds: string[]): Promise<string[]> {
    const graph = await this.buildDependencyGraph(appIds);
    const installOrder = this.topologicalSort(graph);

    // Reverse for uninstall order (dependents first, then dependencies)
    return installOrder.reverse();
  }

  /**
   * Validate all dependencies for an app before installation
   * Checks for missing manifests, invalid dependencies, cyclic dependencies
   *
   * @param appId - App to validate
   * @returns Validation result with errors, warnings, and install order
   */
  async validateDependencies(appId: string): Promise<DependencyValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    logger.info(`[DependencyResolver] Validating dependencies for ${appId}`);

    // Check if manifest exists
    if (!hasManifest(appId)) {
      return {
        valid: false,
        errors: [`No manifest found for app: ${appId}`],
        warnings: [],
        installOrder: [],
      };
    }

    try {
      // Collect dependencies
      const dependencies = await this.collectDependencies(appId, new Set());

      // Check each dependency has a manifest
      for (const depId of dependencies) {
        if (!hasManifest(depId)) {
          errors.push(`Missing manifest for dependency: ${depId}`);
        }
      }

      // Build dependency graph
      const graph = await this.buildDependencyGraph(Array.from(dependencies));

      // Check for cycles
      const cycle = this.detectCycle(graph);
      if (cycle.length > 0) {
        errors.push(`Cyclic dependency detected: ${cycle.join(' → ')}`);
      }

      // Check version compatibility for installed apps
      for (const depId of dependencies) {
        const manifest = loadLocalManifest(depId);
        const deps = this.extractDependencies(manifest.dependencies || {});

        for (const [reqAppId, versionRange] of Object.entries(deps)) {
          const installedApp = await this.repo.findOne({ where: { appId: reqAppId } });

          if (installedApp) {
            if (!semver.satisfies(installedApp.version, versionRange)) {
              warnings.push(
                `${depId} requires ${reqAppId}@${versionRange}, but ${installedApp.version} is installed`
              );
            }
          }
        }
      }

      // Get install order
      const installOrder = errors.length === 0
        ? this.topologicalSort(graph)
        : [];

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        installOrder,
      };
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings,
        installOrder: [],
      };
    }
  }

  /**
   * Helper to extract dependencies from manifest dependencies field
   */
  private extractDependencies(manifestDeps: unknown): Record<string, string> {
    if (!manifestDeps || typeof manifestDeps !== 'object' || Array.isArray(manifestDeps)) {
      return {};
    }

    if ('apps' in manifestDeps || 'services' in manifestDeps) {
      return {};
    }

    return manifestDeps as Record<string, string>;
  }
}
