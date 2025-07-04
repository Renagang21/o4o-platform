/**
 * 숏코드용 API 클라이언트
 * 백엔드 API와 완벽 연동
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface MediaFile {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  path: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  sizes?: Record<string, MediaSize>;
  formats?: ImageFormats;
  altText?: string;
  caption?: string;
  description?: string;
  folderId?: string;
  uploadedBy: string;
  metadata?: Record<string, any>;
  downloads: number;
  lastAccessed?: string;
  uploadedAt: string;
  updatedAt: string;
}

export interface MediaSize {
  name: string;
  width: number;
  height: number;
  url: string;
  fileSize: number;
  mimeType: string;
}

export interface ImageFormats {
  webp: Record<string, MediaSize>;
  avif?: Record<string, MediaSize>;
  jpg: Record<string, MediaSize>;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  retailPrice: number;
  wholesalePrice?: number;
  affiliatePrice?: number;
  images: string[];
  category: string;
  featured: boolean;
  inStock: boolean;
  stockQuantity: number;
  sku: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface Page {
  id: string;
  title: string;
  slug: string;
  content: { blocks: any[] };
  excerpt?: string;
  status: 'draft' | 'published' | 'private' | 'archived' | 'scheduled';
  type: string;
  template?: string;
  parentId?: string;
  menuOrder: number;
  showInMenu: boolean;
  isHomepage: boolean;
  seo?: Record<string, any>;
  customFields?: Record<string, any>;
  publishedAt?: string;
  scheduledAt?: string;
  authorId: string;
  author?: { name: string };
  lastModifiedBy?: string;
  views: number;
  createdAt: string;
  updatedAt: string;
}

export class ShortcodeApiClient {
  private api: AxiosInstance;
  private baseURL: string;
  private token?: string;

  constructor(baseURL: string = process.env.REACT_APP_API_URL || 'http://localhost:4000/api') {
    this.baseURL = baseURL;
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Set authentication token
   */
  setToken(token: string) {
    this.token = token;
  }

  /**
   * Generic API request method
   */
  private async request<T>(method: 'get' | 'post' | 'put' | 'delete', url: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<ApiResponse<T>> = await this.api[method](url, data);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * GET request
   */
  async get<T>(url: string): Promise<ApiResponse<T>> {
    return this.request<T>('get', url);
  }

  /**
   * POST request
   */
  async post<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>('post', url, data);
  }

  /**
   * PUT request
   */
  async put<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>('put', url, data);
  }

  /**
   * DELETE request
   */
  async delete<T>(url: string): Promise<ApiResponse<T>> {
    return this.request<T>('delete', url);
  }

  // ============================================================================
  // MEDIA API METHODS
  // ============================================================================

  /**
   * Get media file by ID
   */
  async getMediaFile(id: string): Promise<ApiResponse<MediaFile>> {
    return this.get<MediaFile>(`/admin/media/${id}`);
  }

  /**
   * Get multiple media files
   */
  async getMediaFiles(params?: {
    folder?: string;
    type?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<MediaFile[]>> {
    const queryParams = new URLSearchParams();
    if (params?.folder) queryParams.append('folder', params.folder);
    if (params?.type) queryParams.append('type', params.type);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const url = `/admin/media${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get<MediaFile[]>(url);
  }

  /**
   * Get optimized image URL
   */
  getOptimizedImageUrl(id: string, size: string = 'medium', format: string = 'webp'): string {
    return `${this.baseURL}/media/optimize/${id}?size=${size}&format=${format}`;
  }

  // ============================================================================
  // PRODUCTS API METHODS
  // ============================================================================

  /**
   * Get products
   */
  async getProducts(params?: {
    category?: string;
    featured?: boolean;
    limit?: number;
    offset?: number;
    orderby?: string;
    order?: 'asc' | 'desc';
    search?: string;
  }): Promise<ApiResponse<Product[]>> {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.featured) queryParams.append('featured', 'true');
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.orderby) queryParams.append('orderby', params.orderby);
    if (params?.order) queryParams.append('order', params.order);
    if (params?.search) queryParams.append('search', params.search);

    const url = `/ecommerce/products${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get<Product[]>(url);
  }

  /**
   * Get product by ID
   */
  async getProduct(id: string): Promise<ApiResponse<Product>> {
    return this.get<Product>(`/ecommerce/products/${id}`);
  }

  /**
   * Add product to cart
   */
  async addToCart(productId: string, quantity: number = 1): Promise<ApiResponse<any>> {
    return this.post('/ecommerce/cart/items', { productId, quantity });
  }

  // ============================================================================
  // PAGES/POSTS API METHODS
  // ============================================================================

  /**
   * Get pages/posts
   */
  async getPages(params?: {
    type?: string;
    status?: string;
    category?: string;
    limit?: number;
    offset?: number;
    orderBy?: string;
    order?: 'asc' | 'desc';
    search?: string;
  }): Promise<ApiResponse<Page[]>> {
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.append('type', params.type);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.orderBy) queryParams.append('orderBy', params.orderBy);
    if (params?.order) queryParams.append('order', params.order);
    if (params?.search) queryParams.append('search', params.search);

    const url = `/admin/pages${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get<Page[]>(url);
  }

  /**
   * Get page by ID
   */
  async getPage(id: string): Promise<ApiResponse<Page>> {
    return this.get<Page>(`/admin/pages/${id}`);
  }

  // ============================================================================
  // CONTACT FORM API METHODS
  // ============================================================================

  /**
   * Submit contact form
   */
  async submitContactForm(data: {
    [key: string]: any;
    to_email?: string;
    subject?: string;
    timestamp?: string;
    source?: string;
  }): Promise<ApiResponse<any>> {
    return this.post('/contact/submit', data);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Health check
   */
  async healthCheck(): Promise<ApiResponse<any>> {
    return this.get('/health');
  }

  /**
   * Get API base URL
   */
  getBaseURL(): string {
    return this.baseURL;
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.healthCheck();
      return response.success;
    } catch (error) {
      console.error('API connection test failed:', error);
      return false;
    }
  }
}

// Default instance
export const defaultShortcodeApiClient = new ShortcodeApiClient();

export default ShortcodeApiClient;