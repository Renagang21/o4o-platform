/**
 * Catalog Import API
 */
import { API_BASE_URL, fetchWithTimeout } from './client.js';

export const catalogImportApi = {
  async uploadFile(file: File, extensionKey: string, supplierId: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('extension_key', extensionKey);
    formData.append('supplier_id', supplierId);

    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/v1/catalog-import/jobs`,
      { method: 'POST', credentials: 'include', body: formData },
      30000,
    );
    return response.json();
  },

  async listJobs(supplierId?: string): Promise<any> {
    const qs = supplierId ? `?supplier_id=${supplierId}` : '';
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/v1/catalog-import/jobs${qs}`,
      { credentials: 'include' },
    );
    return response.json();
  },

  async getJob(jobId: string): Promise<any> {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/v1/catalog-import/jobs/${jobId}`,
      { credentials: 'include' },
    );
    return response.json();
  },

  async validateJob(jobId: string): Promise<any> {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/v1/catalog-import/jobs/${jobId}/validate`,
      { method: 'POST', credentials: 'include' },
    );
    return response.json();
  },

  async applyJob(jobId: string, supplierId: string): Promise<any> {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/v1/catalog-import/jobs/${jobId}/apply`,
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplier_id: supplierId }),
      },
    );
    return response.json();
  },
};
