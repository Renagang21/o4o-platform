import api from '@/lib/api';

export interface AppState {
  appId: string;
  isActive: boolean;
}

export interface AppStates {
  [key: string]: boolean;
}

export const appsApi = {
  // Get all app states
  getStates: async (): Promise<AppStates> => {
    const response = await api.get('/v1/apps/states');
    return response.data.data;
  },

  // Get single app state
  getState: async (appId: string): Promise<AppState> => {
    const response = await api.get(`/v1/apps/states/${appId}`);
    return response.data.data;
  },

  // Update app state
  updateState: async (appId: string, isActive: boolean): Promise<AppState> => {
    const response = await api.put(`/v1/apps/states/${appId}`, { isActive });
    return response.data.data;
  },

  // Batch update app states
  batchUpdateStates: async (updates: AppState[]): Promise<any> => {
    const response = await api.post('/v1/apps/states/batch', { updates });
    return response.data.data;
  }
};