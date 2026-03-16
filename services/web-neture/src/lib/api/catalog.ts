/**
 * Catalog Import API
 *
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient.api 기반 자동 갱신
 */
import { api } from './client.js';

export const catalogImportApi = {
  async uploadFile(file: File, extensionKey: string, supplierId: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('extension_key', extensionKey);
    formData.append('supplier_id', supplierId);

    const response = await api.post('/catalog-import/jobs', formData, {
      timeout: 30000,
    });
    return response.data;
  },

  async listJobs(supplierId?: string): Promise<any> {
    const qs = supplierId ? `?supplier_id=${supplierId}` : '';
    const response = await api.get(`/catalog-import/jobs${qs}`);
    return response.data;
  },

  async getJob(jobId: string): Promise<any> {
    const response = await api.get(`/catalog-import/jobs/${jobId}`);
    return response.data;
  },

  async validateJob(jobId: string): Promise<any> {
    const response = await api.post(`/catalog-import/jobs/${jobId}/validate`);
    return response.data;
  },

  async applyJob(jobId: string, supplierId: string): Promise<any> {
    const response = await api.post(`/catalog-import/jobs/${jobId}/apply`, {
      supplier_id: supplierId,
    });
    return response.data;
  },
};
