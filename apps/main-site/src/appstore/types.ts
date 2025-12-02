/**
 * AppStore Type Definitions
 *
 * Defines the structure for NextGen AppStore integration.
 * Apps are modular packages that can be installed, enabled, and disabled.
 */

export interface AppManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  enabled: boolean;
  entrypoint?: string;

  // Component mappings (function components)
  components?: Record<string, string>;
  functions?: Record<string, string>; // Alternative name for components

  // View definitions (can be array or object)
  views?: string[] | Record<string, string>;

  // UI components
  ui?: Record<string, string>;

  // Dependencies
  dependencies?: string[];

  // Permissions required
  permissions?: string[];

  // Database migrations
  migrations?: string[];

  // App category
  category?: 'commerce' | 'content' | 'utility' | 'integration' | 'custom';

  // Icon/thumbnail
  icon?: string;
  thumbnail?: string;

  // App metadata
  metadata?: {
    homepage?: string;
    repository?: string;
    license?: string;
    tags?: string[];
  };
}

export interface AppRegistryEntry {
  id: string;
  label: string;
  enabled: boolean;
  manifestPath: string;
  packageName?: string;
}

export interface LoadedApp {
  manifest: AppManifest;
  views: Map<string, any>;
  components: Map<string, React.ComponentType<any>>;
  uiComponents: Map<string, React.ComponentType<any>>;
}

export interface AppStoreState {
  apps: Map<string, LoadedApp>;
  registry: AppRegistryEntry[];
  loading: boolean;
  error: Error | null;
}

export interface AppInstallRequest {
  appId: string;
  version?: string;
  autoEnable?: boolean;
}

export interface AppActionResponse {
  success: boolean;
  message?: string;
  error?: string;
  app?: AppManifest;
}
