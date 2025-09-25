import api from '@/lib/api';

export interface AppInfo {
  id: string;
  name: string;
  version: string;
  category: string;
}

export const appsApi = {
  // Get all app information
  getAppInfo: async (): Promise<AppInfo[]> => {
    const response = await api.get('/v1/apps/info');
    return response.data.data;
  }
};