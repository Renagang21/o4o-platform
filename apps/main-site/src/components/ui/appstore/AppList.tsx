/**
 * AppList Component
 *
 * Displays a grid of app cards with filtering and search.
 */

import { useState, useMemo } from 'react';
import type { AppManifest } from '@/appstore/types';
import { AppCard } from './AppCard';

export interface AppListProps {
  apps: AppManifest[];
  installedAppIds?: string[];
  onInstall?: (appId: string) => void;
  onUninstall?: (appId: string) => void;
  onToggleEnable?: (appId: string, enabled: boolean) => void;
}

export function AppList({
  apps,
  installedAppIds = [],
  onInstall,
  onUninstall,
  onToggleEnable,
}: AppListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(apps.map((app) => app.category).filter(Boolean));
    return Array.from(cats);
  }, [apps]);

  // Filter apps
  const filteredApps = useMemo(() => {
    return apps.filter((app) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          app.name.toLowerCase().includes(query) ||
          app.id.toLowerCase().includes(query) ||
          app.description?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Category filter
      if (categoryFilter !== 'all' && app.category !== categoryFilter) {
        return false;
      }

      // Status filter
      const isInstalled = installedAppIds.includes(app.id);
      if (statusFilter === 'installed' && !isInstalled) return false;
      if (statusFilter === 'available' && isInstalled) return false;
      if (statusFilter === 'enabled' && (!isInstalled || !app.enabled)) return false;
      if (statusFilter === 'disabled' && (!isInstalled || app.enabled)) return false;

      return true;
    });
  }, [apps, searchQuery, categoryFilter, statusFilter, installedAppIds]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">App Store</h2>
          <p className="text-sm text-gray-500 mt-1">
            {filteredApps.length} {filteredApps.length === 1 ? 'app' : 'apps'} available
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              id="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search apps..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Category Filter */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              id="category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category ? category.charAt(0).toUpperCase() + category.slice(1) : 'Other'}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Apps</option>
              <option value="installed">Installed</option>
              <option value="available">Available</option>
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
        </div>
      </div>

      {/* App Grid */}
      {filteredApps.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredApps.map((app) => (
            <AppCard
              key={app.id}
              app={app}
              installed={installedAppIds.includes(app.id)}
              onInstall={onInstall}
              onUninstall={onUninstall}
              onToggleEnable={onToggleEnable}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">No apps found matching your criteria.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setCategoryFilter('all');
              setStatusFilter('all');
            }}
            className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
