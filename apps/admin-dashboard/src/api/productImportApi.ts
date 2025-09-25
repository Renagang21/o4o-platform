import api from '@/lib/api';
import { Product } from '@/types/ecommerce';

export interface ImportResult {
  success: boolean;
  total: number;
  created: number;
  updated: number;
  failed: number;
  errors: Array<{
    row: number;
    message: string;
  }>;
}

export interface FieldMapping {
  csvField: string;
  medusaField: string;
  defaultValue?: string;
}

export interface ImportOptions {
  duplicateHandling: 'skip' | 'update' | 'duplicate';
  createCategories: boolean;
  downloadImages: boolean;
  resizeImages: boolean;
  generateThumbnails: boolean;
}

class ProductImportApi {
  // Upload CSV file
  async uploadCSV(file: File): Promise<{
    fileId: string;
    headers: string[];
    preview: any[];
    totalRows: number;
  }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/v1/products/import/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  // Validate CSV data
  async validateCSV(
    fileId: string,
    mappings: FieldMapping[]
  ): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const response = await api.post('/v1/products/import/validate', {
      fileId,
      mappings,
    });

    return response.data;
  }

  // Execute import
  async executeImport(
    fileId: string,
    mappings: FieldMapping[],
    options: ImportOptions
  ): Promise<ImportResult> {
    const response = await api.post('/v1/products/import/execute', {
      fileId,
      mappings,
      options,
    });

    return response.data;
  }

  // Get import status
  async getImportStatus(importId: string): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    processed: number;
    total: number;
    success: number;
    failed: number;
    logs: Array<{
      type: string;
      message: string;
      timestamp: string;
    }>;
  }> {
    const response = await api.get(`/v1/products/import/status/${importId}`);
    return response.data;
  }

  // Parse CSV and create products directly (client-side processing)
  async importProductsBatch(products: any[]): Promise<ImportResult> {
    const results: ImportResult = {
      success: true,
      total: products.length,
      created: 0,
      updated: 0,
      failed: 0,
      errors: []
    };

    // Process in batches of 10
    const batchSize = 10;
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      
      try {
        const promises = batch.map(async (product, index) => {
          try {
            // Transform CSV data to Product format
            const productData: Partial<Product> = {
              title: product['이름'] || product['name'] || '',
              subtitle: product['간단한 설명'] || product['subtitle'] || '',
              description: product['설명'] || product['description'] || '',
              handle: this.generateSlug(product['이름'] || product['name'] || ''),
              status: 'published',
              thumbnail: product['이미지'] || product['images'] || '',
              variants: [{
                title: 'Default',
                sku: product['SKU'] || product['sku'] || `SKU-${Date.now()}-${i + index}`,
                barcode: product['바코드'] || product['barcode'] || '',
                inventory_quantity: parseInt(product['재고'] || product['inventory'] || '0'),
                prices: [{
                  amount: parseFloat(product['정상 가격'] || product['price'] || '0'),
                  currency_code: 'KRW'
                }],
                options: []
              }],
              categories: this.parseCategories(product['카테고리'] || product['categories'] || ''),
              tags: this.parseTags(product['태그'] || product['tags'] || ''),
              metadata: {}
            };

            // Call API to create product
            const response = await api.post('/v1/products', productData);
            if (response.data) {
              results.created++;
            }
          } catch (error: any) {
            results.failed++;
            results.errors.push({
              row: i + index + 2, // +2 for header row and 0-index
              message: error.response?.data?.message || error.message || 'Unknown error'
            });
          }
        });

        await Promise.all(promises);
      } catch (error) {
        console.error('Batch import error:', error);
      }
    }

    results.success = results.failed === 0;
    return results;
  }

  // Helper functions
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private parseCategories(categoryString: string): any[] {
    if (!categoryString) return [];
    
    const categories = categoryString.split('>').map(c => c.trim());
    return categories.map((name, index) => ({
      id: `cat-${index}`,
      name,
      handle: this.generateSlug(name)
    }));
  }

  private parseTags(tagString: string): any[] {
    if (!tagString) return [];
    
    return tagString.split(',').map(tag => ({
      value: tag.trim()
    }));
  }

  // Simplified import for testing - creates products directly
  async quickImport(csvData: any[]): Promise<ImportResult> {
    return this.importProductsBatch(csvData);
  }
}

export const productImportApi = new ProductImportApi();