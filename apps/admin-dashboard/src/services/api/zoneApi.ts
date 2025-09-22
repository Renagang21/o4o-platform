/**
 * Zone API - API client for zone-based content management
 */

import { apiClient } from '../../utils/apiClient'
import { 
  ZoneBasedContent, 
  ZoneApiResponse, 
  ThemeCustomization,
  ThemeCustomizationApiResponse,
  ZoneConfig,
  LayoutConfig,
  ZoneTemplate,
  PageZone
} from '@o4o/types'

export interface SaveZoneContentRequest {
  zones: ZoneBasedContent
  layout: string
  customization?: ThemeCustomization
}

export interface ZoneContentResponse {
  zones: ZoneBasedContent
  customization?: ThemeCustomization
  layout: string
  templates?: ZoneTemplate[]
}

class ZoneApiClient {
  private baseUrl = '/api/zones'

  /**
   * Get zone content for a specific page/post
   */
  async getZoneContent(pageId: string): Promise<ZoneContentResponse> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/${pageId}`)
      return response.data as ZoneApiResponse
    } catch (error) {
      throw new Error('Failed to load zone content')
    }
  }

  /**
   * Save zone content for a specific page/post
   */
  async saveZoneContent(pageId: string, data: SaveZoneContentRequest): Promise<void> {
    try {
      await apiClient.put(`${this.baseUrl}/${pageId}`, data)
    } catch (error) {
      throw new Error('Failed to save zone content')
    }
  }

  /**
   * Update specific zone within a page
   */
  async updateZone(pageId: string, zoneId: string, zoneData: any): Promise<void> {
    try {
      await apiClient.put(`${this.baseUrl}/${pageId}/${zoneId}`, zoneData)
    } catch (error) {
      throw new Error('Failed to update zone')
    }
  }

  /**
   * Reorder zones within a page
   */
  async reorderZones(pageId: string, zoneOrder: string[]): Promise<void> {
    try {
      await apiClient.post(`${this.baseUrl}/${pageId}/reorder`, { zoneOrder })
    } catch (error) {
      throw new Error('Failed to reorder zones')
    }
  }

  /**
   * Get zone configuration schema
   */
  async getZoneConfig(themeId?: string): Promise<ZoneConfig> {
    try {
      const url = themeId 
        ? `/api/themes/${themeId}/zones-config`
        : '/api/themes/default/zones-config'
      
      const response = await apiClient.get(url)
      return response.data as ZoneConfig
    } catch (error) {
      throw new Error('Failed to load zone configuration')
    }
  }

  /**
   * Get layout configuration schema
   */
  async getLayoutConfig(themeId?: string): Promise<LayoutConfig> {
    try {
      const url = themeId 
        ? `/api/themes/${themeId}/layout-config`
        : '/api/themes/default/layout-config'
      
      const response = await apiClient.get(url)
      return response.data as LayoutConfig
    } catch (error) {
      throw new Error('Failed to load layout configuration')
    }
  }

  /**
   * Get zone templates
   */
  async getZoneTemplates(zoneId?: string): Promise<ZoneTemplate[]> {
    try {
      const url = zoneId 
        ? `${this.baseUrl}/templates?zoneId=${zoneId}`
        : `${this.baseUrl}/templates`
      
      const response = await apiClient.get(url)
      return response.data as ZoneTemplate[]
    } catch (error) {
      throw new Error('Failed to load zone templates')
    }
  }

  /**
   * Save zone template
   */
  async saveZoneTemplate(template: Omit<ZoneTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<ZoneTemplate> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/templates`, template)
      return response.data as ZoneTemplate
    } catch (error) {
      throw new Error('Failed to save zone template')
    }
  }

  /**
   * Apply zone template to page
   */
  async applyZoneTemplate(pageId: string, templateId: string, zoneId: string): Promise<void> {
    try {
      await apiClient.post(`${this.baseUrl}/${pageId}/apply-template`, {
        templateId,
        zoneId
      })
    } catch (error) {
      throw new Error('Failed to apply zone template')
    }
  }

  /**
   * Get theme customization
   */
  async getThemeCustomization(userId?: string): Promise<ThemeCustomization | null> {
    try {
      const url = userId 
        ? `/api/theme/customization?userId=${userId}`
        : '/api/theme/customization'
      
      const response = await apiClient.get(url)
      return (response.data as ThemeCustomizationApiResponse).customization
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null // No customization found
      }
      throw new Error('Failed to load theme customization')
    }
  }

  /**
   * Save theme customization
   */
  async saveThemeCustomization(customization: ThemeCustomization): Promise<void> {
    try {
      await apiClient.put('/api/theme/customization', customization)
    } catch (error) {
      throw new Error('Failed to save theme customization')
    }
  }

  /**
   * Generate preview for theme customization
   */
  async generatePreview(customization: ThemeCustomization): Promise<{ previewUrl: string }> {
    try {
      const response = await apiClient.post('/api/theme/preview', customization)
      return response.data as { previewUrl: string }
    } catch (error) {
      throw new Error('Failed to generate preview')
    }
  }

  /**
   * Apply theme customization
   */
  async applyThemeCustomization(customization: ThemeCustomization): Promise<void> {
    try {
      await apiClient.post('/api/theme/apply', customization)
    } catch (error) {
      throw new Error('Failed to apply theme customization')
    }
  }

  /**
   * Validate zone content against constraints
   */
  async validateZoneContent(content: ZoneBasedContent): Promise<{
    valid: boolean
    errors?: any[]
    warnings?: any[]
  }> {
    try {
      const response = await apiClient.post('/api/zones/validate', content)
      return response.data as { valid: boolean; errors?: any[]; warnings?: any[] }
    } catch (error) {
      throw new Error('Failed to validate zone content')
    }
  }

  /**
   * Convert legacy content to zone format
   */
  async convertToZoneFormat(legacyContent: any, layoutType: string): Promise<ZoneBasedContent> {
    try {
      const response = await apiClient.post('/api/zones/convert', {
        content: legacyContent,
        layoutType
      })
      return response.data as ZoneBasedContent
    } catch (error) {
      throw new Error('Failed to convert content to zone format')
    }
  }

  /**
   * Export zone content
   */
  async exportZoneContent(pageId: string, format: 'json' | 'html' = 'json'): Promise<Blob> {
    try {
      // Fetch API 기반 클라이언트는 responseType 옵션을 받지 않으므로 별도 다운로드 엔드포인트 사용 필요
      const res = await fetch(`${(window as any).API_BASE_URL || ''}${this.baseUrl}/${pageId}/export?format=${format}`, {
        headers: (apiClient as any).getAuthHeaders?.() || undefined
      })
      if (!res.ok) throw new Error('Failed to export zone content')
      return await res.blob()
    } catch (error) {
      throw new Error('Failed to export zone content')
    }
  }

  /**
   * Import zone content
   */
  async importZoneContent(pageId: string, file: File): Promise<void> {
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      await apiClient.post(`${this.baseUrl}/${pageId}/import`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
    } catch (error) {
      throw new Error('Failed to import zone content')
    }
  }

  /**
   * Get zone analytics/usage stats
   */
  async getZoneAnalytics(pageId: string, timeRange?: string): Promise<{
    totalBlocks: number
    blocksByZone: Record<string, number>
    blocksByType: Record<string, number>
    lastModified: string
  }> {
    try {
      const url = timeRange 
        ? `${this.baseUrl}/${pageId}/analytics?timeRange=${timeRange}`
        : `${this.baseUrl}/${pageId}/analytics`
      
      const response = await apiClient.get(url)
      return response.data
    } catch (error) {
      throw new Error('Failed to load zone analytics')
    }
  }
}

// Export singleton instance
export const zoneApi = new ZoneApiClient()
export default zoneApi
