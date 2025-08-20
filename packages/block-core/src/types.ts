import { ComponentType, ReactElement } from 'react';

/**
 * Block Plugin Interface
 */
export interface BlockPlugin {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  license?: string;
  dependencies?: string[];
  blocks: BlockDefinition[];
  settings?: PluginSettings;
  
  activate(): Promise<void>;
  deactivate(): Promise<void>;
  
  // Optional hooks
  onLoad?(): void;
  onUnload?(): void;
  getSettings?(): PluginSettings;
  updateSettings?(settings: Partial<PluginSettings>): void;
}

/**
 * Block Definition
 */
export interface BlockDefinition {
  name: string;
  title: string;
  category: string;
  icon: ComponentType | string;
  description?: string;
  keywords?: string[];
  attributes?: Record<string, BlockAttribute>;
  supports?: BlockSupports;
  
  edit: ComponentType<any>;
  save: ComponentType<any>;
  
  // Optional components
  deprecated?: any[];
  transforms?: any;
  variations?: any[];
  example?: any;
}

/**
 * Block Attribute
 */
export interface BlockAttribute {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  source?: 'text' | 'html' | 'attribute' | 'query' | 'meta';
  selector?: string;
  attribute?: string;
  default?: any;
}

/**
 * Block Supports
 */
export interface BlockSupports {
  align?: boolean | string[];
  anchor?: boolean;
  className?: boolean;
  color?: {
    background?: boolean;
    gradients?: boolean;
    text?: boolean;
    link?: boolean;
  };
  spacing?: {
    margin?: boolean | string[];
    padding?: boolean | string[];
    blockGap?: boolean;
  };
  typography?: {
    fontSize?: boolean;
    lineHeight?: boolean;
  };
  html?: boolean;
  inserter?: boolean;
  multiple?: boolean;
  reusable?: boolean;
}

/**
 * Plugin Settings
 */
export interface PluginSettings {
  enabled: boolean;
  autoLoad?: boolean;
  priority?: number;
  loadStrategy?: 'immediate' | 'lazy' | 'on-demand';
  config?: Record<string, any>;
}

/**
 * Plugin Load Options
 */
export interface LoadOptions {
  preload?: boolean;
  prefetch?: boolean;
  priority?: 'high' | 'normal' | 'low';
}

/**
 * Plugin Metadata
 */
export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  size?: number;
  loadTime?: number;
  status: 'loaded' | 'loading' | 'error' | 'unloaded';
  error?: Error;
}