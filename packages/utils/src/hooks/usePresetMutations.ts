import { useQueryClient } from '@tanstack/react-query';
import type { PresetType } from './usePreset.js';

/**
 * Hook for invalidating preset cache
 *
 * Use this after creating, updating, or deleting presets
 * to ensure the cache is refreshed
 */
export function useInvalidatePresetCache() {
  const queryClient = useQueryClient();

  /**
   * Invalidate all preset queries
   */
  const invalidateAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ['preset'] });
    await queryClient.invalidateQueries({ queryKey: ['presets'] });
  };

  /**
   * Invalidate queries for a specific preset type
   */
  const invalidateType = async (type: PresetType) => {
    await queryClient.invalidateQueries({ queryKey: ['preset', type] });
    await queryClient.invalidateQueries({ queryKey: ['presets', type] });
  };

  /**
   * Invalidate a specific preset
   */
  const invalidatePreset = async (type: PresetType, presetId: string) => {
    await queryClient.invalidateQueries({ queryKey: ['preset', type, presetId] });
    // Also invalidate list queries for this type
    await queryClient.invalidateQueries({ queryKey: ['presets', type] });
  };

  /**
   * Invalidate presets for a specific CPT
   */
  const invalidateCpt = async (type: PresetType, cptSlug: string) => {
    await queryClient.invalidateQueries({
      queryKey: ['presets', type],
      predicate: (query): boolean => {
        const options = query.queryKey[2];
        return !!(options && typeof options === 'object' && 'cptSlug' in options && options.cptSlug === cptSlug);
      }
    });
  };

  return {
    invalidateAll,
    invalidateType,
    invalidatePreset,
    invalidateCpt
  };
}

/**
 * Hook for preset-related data invalidation
 *
 * Use this to invalidate CPT data queries when presets change
 */
export function useInvalidatePresetData() {
  const queryClient = useQueryClient();

  /**
   * Invalidate all preset data queries
   */
  const invalidateAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ['preset-data'] });
  };

  /**
   * Invalidate data for a specific CPT
   */
  const invalidateCpt = async (cptSlug: string) => {
    await queryClient.invalidateQueries({ queryKey: ['preset-data', cptSlug] });
  };

  /**
   * Invalidate data for a specific preset
   */
  const invalidatePreset = async (presetId: string) => {
    await queryClient.invalidateQueries({
      queryKey: ['preset-data'],
      predicate: (query): boolean => {
        const id = query.queryKey[1];
        return id === presetId;
      }
    });
  };

  return {
    invalidateAll,
    invalidateCpt,
    invalidatePreset
  };
}

/**
 * Combined hook for invalidating all preset-related caches
 */
export function usePresetMutations() {
  const presetCache = useInvalidatePresetCache();
  const dataCache = useInvalidatePresetData();

  /**
   * Invalidate everything after a preset update
   */
  const invalidateAfterUpdate = async (type: PresetType, presetId: string) => {
    await presetCache.invalidatePreset(type, presetId);
    await dataCache.invalidatePreset(presetId);
  };

  /**
   * Invalidate everything after a preset creation
   */
  const invalidateAfterCreate = async (type: PresetType) => {
    await presetCache.invalidateType(type);
  };

  /**
   * Invalidate everything after a preset deletion
   */
  const invalidateAfterDelete = async (type: PresetType, presetId: string) => {
    await presetCache.invalidatePreset(type, presetId);
    await dataCache.invalidatePreset(presetId);
  };

  /**
   * Invalidate all caches (use sparingly)
   */
  const invalidateEverything = async () => {
    await presetCache.invalidateAll();
    await dataCache.invalidateAll();
  };

  return {
    presetCache,
    dataCache,
    invalidateAfterUpdate,
    invalidateAfterCreate,
    invalidateAfterDelete,
    invalidateEverything
  };
}
