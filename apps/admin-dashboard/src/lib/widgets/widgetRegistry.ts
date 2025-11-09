/**
 * P1 Phase C: Widget Registry
 *
 * Central registry for all dashboard widgets with capability-based access control.
 */

import { lazy } from 'react';
import type { DashboardWidgetRegistryEntry, DashboardWidgetConfig } from '@o4o/types';

/**
 * Widget Registry Storage
 */
class WidgetRegistry {
  private widgets: Map<string, DashboardWidgetRegistryEntry> = new Map();

  /**
   * Register a widget
   */
  register(entry: DashboardWidgetRegistryEntry): void {
    if (this.widgets.has(entry.config.id)) {
      console.warn(`Widget ${entry.config.id} is already registered. Overwriting.`);
    }
    this.widgets.set(entry.config.id, entry);
  }

  /**
   * Get a widget by ID
   */
  get(id: string): DashboardWidgetRegistryEntry | undefined {
    return this.widgets.get(id);
  }

  /**
   * Get all widgets
   */
  getAll(): DashboardWidgetRegistryEntry[] {
    return Array.from(this.widgets.values());
  }

  /**
   * Get widgets filtered by capability
   */
  getByCapabilities(capabilities: string[]): DashboardWidgetRegistryEntry[] {
    return this.getAll().filter((entry) => {
      const required = entry.config.requiredCapabilities || [];
      if (required.length === 0) return true; // No requirements
      return required.some((cap) => capabilities.includes(cap));
    });
  }

  /**
   * Get widgets for a specific role
   */
  getByRole(role: 'supplier' | 'seller' | 'partner' | 'admin'): DashboardWidgetRegistryEntry[] {
    return this.getAll().filter((entry) => {
      const roleFilter = entry.config.metadata?.roles as string[] | undefined;
      if (!roleFilter) return true; // No role restriction
      return roleFilter.includes(role);
    });
  }

  /**
   * Check if user has access to a widget
   */
  hasAccess(widgetId: string, capabilities: string[]): boolean {
    const widget = this.get(widgetId);
    if (!widget) return false;

    const required = widget.config.requiredCapabilities || [];
    if (required.length === 0) return true;

    return required.some((cap) => capabilities.includes(cap));
  }

  /**
   * Clear all widgets (for testing)
   */
  clear(): void {
    this.widgets.clear();
  }
}

/**
 * Global widget registry instance
 */
export const widgetRegistry = new WidgetRegistry();

/**
 * Helper to create a widget config
 */
export function createDashboardWidgetConfig(config: DashboardWidgetConfig): DashboardWidgetConfig {
  return {
    size: 'medium',
    priority: 'normal',
    refreshInterval: 0,
    userConfigurable: true,
    defaultVisible: true,
    ...config,
  };
}

/**
 * Helper to register a widget
 */
export function registerWidget(
  config: DashboardWidgetConfig,
  component: React.LazyExoticComponent<React.ComponentType<any>>,
  dataLoader?: () => Promise<any>
): void {
  widgetRegistry.register({
    config: createDashboardWidgetConfig(config),
    component,
    dataLoader,
  });
}

/**
 * Lazy load helper for widgets
 */
export function lazyWidget(importFn: () => Promise<{ default: React.ComponentType<any> }>) {
  return lazy(importFn);
}
