import { authClient } from '@o4o/auth-client';

export const vendorApi = {
  async approve(id: string): Promise<{ success: boolean }> {
    try {
      await authClient.api.put(`/vendors/${id}/approve`);
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  },

  async reject(id: string, reason: string): Promise<{ success: boolean }> {
    try {
      await authClient.api.put(`/vendors/${id}/reject`, { reason });
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  },

  async requestDocuments(id: string, documents: string[]): Promise<{ success: boolean }> {
    try {
      await authClient.api.post(`/vendors/${id}/request-documents`, { documents });
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  },

  async update(data: {
    id: string;
    status?: string;
    commissionRate?: number;
    [key: string]: any;
  }): Promise<{ success: boolean }> {
    try {
      await authClient.api.put(`/vendors/${data.id}`, data);
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  },

  async delete(id: string): Promise<{ success: boolean }> {
    try {
      await authClient.api.delete(`/vendors/${id}`);
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }
};
