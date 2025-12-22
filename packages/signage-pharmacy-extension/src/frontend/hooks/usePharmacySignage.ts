/**
 * Pharmacy Signage React Hooks
 *
 * Custom hooks for pharmacy signage extension frontend.
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  PharmacyContentDto,
  PharmacyPlaylistDto,
  PharmacyScheduleDto,
  PharmacyDisplayDto,
  PharmacyDashboardDto,
  ContentFilterDto,
  PharmacyQuickActionDto,
  QuickActionResultDto,
} from '../../backend/dto/index.js';

// API base URL - should be configured via context
const API_BASE = '/api/v1/pharmacy-signage';

// Generic fetch helper
async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });
    return await response.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ==================== Dashboard Hook ====================

export function useDashboard() {
  const [dashboard, setDashboard] = useState<PharmacyDashboardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await fetchApi<PharmacyDashboardDto>('/dashboard');
    if (result.success && result.data) {
      setDashboard(result.data);
      setError(null);
    } else {
      setError(result.error || 'Failed to fetch dashboard');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { dashboard, loading, error, refresh };
}

// ==================== Content Hook ====================

export function useContent(initialFilter?: ContentFilterDto) {
  const [content, setContent] = useState<PharmacyContentDto[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<ContentFilterDto>(initialFilter || {});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter.category) params.set('category', filter.category);
    if (filter.provider) params.set('provider', filter.provider);
    if (filter.search) params.set('search', filter.search);
    if (filter.selectedOnly) params.set('selectedOnly', 'true');
    if (filter.page) params.set('page', filter.page.toString());
    if (filter.limit) params.set('limit', filter.limit.toString());

    const result = await fetchApi<{ items: PharmacyContentDto[]; total: number }>(
      `/content?${params.toString()}`
    );

    if (result.success && result.data) {
      setContent(result.data.items);
      setTotal(result.data.total);
      setError(null);
    } else {
      setError(result.error || 'Failed to fetch content');
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const toggleSelection = async (contentId: string, selected: boolean) => {
    const result = await fetchApi(`/content/${contentId}/select`, {
      method: 'POST',
      body: JSON.stringify({ selected }),
    });
    if (result.success) {
      fetchContent();
    }
    return result.success;
  };

  return {
    content,
    total,
    filter,
    setFilter,
    loading,
    error,
    refresh: fetchContent,
    toggleSelection,
  };
}

// ==================== Playlists Hook ====================

export function usePlaylists() {
  const [playlists, setPlaylists] = useState<PharmacyPlaylistDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlaylists = useCallback(async () => {
    setLoading(true);
    const result = await fetchApi<PharmacyPlaylistDto[]>('/playlists');
    if (result.success && result.data) {
      setPlaylists(result.data);
      setError(null);
    } else {
      setError(result.error || 'Failed to fetch playlists');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  const createPlaylist = async (name: string, description?: string, loop?: boolean) => {
    const result = await fetchApi<PharmacyPlaylistDto>('/playlists', {
      method: 'POST',
      body: JSON.stringify({ name, description, loop }),
    });
    if (result.success) {
      fetchPlaylists();
    }
    return result;
  };

  const deletePlaylist = async (playlistId: string) => {
    const result = await fetchApi(`/playlists/${playlistId}`, { method: 'DELETE' });
    if (result.success) {
      fetchPlaylists();
    }
    return result.success;
  };

  const clonePlaylist = async (playlistId: string, newName?: string) => {
    const result = await fetchApi<PharmacyPlaylistDto>(`/playlists/${playlistId}/clone`, {
      method: 'POST',
      body: JSON.stringify({ newName }),
    });
    if (result.success) {
      fetchPlaylists();
    }
    return result;
  };

  return {
    playlists,
    loading,
    error,
    refresh: fetchPlaylists,
    createPlaylist,
    deletePlaylist,
    clonePlaylist,
  };
}

// ==================== Single Playlist Hook ====================

export function usePlaylist(playlistId: string | null) {
  const [playlist, setPlaylist] = useState<PharmacyPlaylistDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlaylist = useCallback(async () => {
    if (!playlistId) return;
    setLoading(true);
    const result = await fetchApi<PharmacyPlaylistDto>(`/playlists/${playlistId}`);
    if (result.success && result.data) {
      setPlaylist(result.data);
      setError(null);
    } else {
      setError(result.error || 'Failed to fetch playlist');
    }
    setLoading(false);
  }, [playlistId]);

  useEffect(() => {
    fetchPlaylist();
  }, [fetchPlaylist]);

  const addItem = async (contentId: string, position?: number, durationSeconds?: number) => {
    if (!playlistId) return false;
    const result = await fetchApi(`/playlists/${playlistId}/items`, {
      method: 'POST',
      body: JSON.stringify({ contentId, position, durationSeconds }),
    });
    if (result.success) {
      fetchPlaylist();
    }
    return result.success;
  };

  const removeItem = async (itemId: string) => {
    if (!playlistId) return false;
    const result = await fetchApi(`/playlists/${playlistId}/items/${itemId}`, {
      method: 'DELETE',
    });
    if (result.success) {
      fetchPlaylist();
    }
    return result.success;
  };

  const reorderItems = async (items: { id: string; position: number }[]) => {
    if (!playlistId) return false;
    const result = await fetchApi(`/playlists/${playlistId}/reorder`, {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
    if (result.success) {
      fetchPlaylist();
    }
    return result.success;
  };

  return {
    playlist,
    loading,
    error,
    refresh: fetchPlaylist,
    addItem,
    removeItem,
    reorderItems,
  };
}

// ==================== Schedules Hook ====================

export function useSchedules() {
  const [schedules, setSchedules] = useState<PharmacyScheduleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    const result = await fetchApi<PharmacyScheduleDto[]>('/schedules');
    if (result.success && result.data) {
      setSchedules(result.data);
      setError(null);
    } else {
      setError(result.error || 'Failed to fetch schedules');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const setSchedule = async (
    timeSlot: 'morning' | 'afternoon' | 'evening',
    playlistId: string,
    startTime?: string,
    endTime?: string
  ) => {
    const result = await fetchApi<PharmacyScheduleDto>('/schedules', {
      method: 'POST',
      body: JSON.stringify({ timeSlot, playlistId, startTime, endTime }),
    });
    if (result.success) {
      fetchSchedules();
    }
    return result;
  };

  const removeSchedule = async (scheduleId: string) => {
    const result = await fetchApi(`/schedules/${scheduleId}`, { method: 'DELETE' });
    if (result.success) {
      fetchSchedules();
    }
    return result.success;
  };

  return {
    schedules,
    loading,
    error,
    refresh: fetchSchedules,
    setSchedule,
    removeSchedule,
  };
}

// ==================== Displays Hook ====================

export function useDisplays() {
  const [displays, setDisplays] = useState<PharmacyDisplayDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDisplays = useCallback(async () => {
    setLoading(true);
    const result = await fetchApi<PharmacyDisplayDto[]>('/displays');
    if (result.success && result.data) {
      setDisplays(result.data);
      setError(null);
    } else {
      setError(result.error || 'Failed to fetch displays');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDisplays();
  }, [fetchDisplays]);

  return { displays, loading, error, refresh: fetchDisplays };
}

// ==================== Quick Action Hook ====================

export function useQuickAction() {
  const [executing, setExecuting] = useState(false);
  const [lastResult, setLastResult] = useState<QuickActionResultDto | null>(null);

  const execute = async (action: PharmacyQuickActionDto): Promise<QuickActionResultDto> => {
    setExecuting(true);
    const result = await fetchApi<QuickActionResultDto>('/quick-action', {
      method: 'POST',
      body: JSON.stringify(action),
    });
    const actionResult = result.success
      ? (result.data || { success: true })
      : { success: false, error: result.error };
    setLastResult(actionResult as QuickActionResultDto);
    setExecuting(false);
    return actionResult as QuickActionResultDto;
  };

  const stop = async (executionId: string, reason?: string): Promise<boolean> => {
    const result = await fetchApi(`/quick-action/${executionId}/stop`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    return result.success;
  };

  return { executing, lastResult, execute, stop };
}
