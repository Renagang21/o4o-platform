/**
 * useThemeCustomization - Hook for managing theme customization state and operations
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { ThemeCustomization, ColorScheme, BrandingConfig, BusinessInfo, NavigationConfig } from '@o4o/types'
import { zoneApi } from '@/services/api/zoneApi'

export interface UseThemeCustomizationReturn {
  customization: ThemeCustomization | null
  isLoading: boolean
  error: string | null
  isDirty: boolean

  // Update operations
  updateBranding: (updates: Partial<BrandingConfig>) => void
  updateColors: (updates: Partial<ColorScheme>) => void
  updateBusinessInfo: (updates: Partial<BusinessInfo>) => void
  updateNavigation: (updates: Partial<NavigationConfig>) => void

  // Save operations
  saveCustomization: () => Promise<void>
  requestApproval: () => Promise<void>
  resetToDefaults: () => Promise<void>
  generatePreview: () => Promise<{ previewUrl: string }>

  // Auto-save
  enableAutoSave: (interval?: number) => void
  disableAutoSave: () => void
}

// Default theme customization
const DEFAULT_CUSTOMIZATION: ThemeCustomization = {
  id: 'default',
  userId: '',
  name: 'Default Theme',
  colors: {
    primary: '#3B82F6',
    secondary: '#64748B',
    accent: '#10B981',
    background: '#FFFFFF',
    foreground: '#1F2937',
    muted: '#F8FAFC',
    mutedForeground: '#64748B',
    border: '#E5E7EB',
    input: '#FFFFFF',
    ring: '#3B82F6'
  },
  branding: {
    siteName: 'Your Site',
    tagline: '',
    logo: null,
    favicon: null
  },
  businessInfo: {
    name: '',
    description: '',
    phone: '',
    email: '',
    address: '',
    website: '',
    socialMedia: {},
    businessHours: {}
  },
  navigation: {
    menuItems: [],
    footerLinks: [],
    items: [],
    showHome: true,
    sticky: false
  },
  isActive: false,
  isApproved: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}

export const useThemeCustomization = (
  initialCustomization?: ThemeCustomization,
  userId?: string,
  autoSaveInterval = 30000 // 30 seconds
): UseThemeCustomizationReturn => {
  const [customization, setCustomization] = useState<ThemeCustomization | null>(
    initialCustomization || null
  )
  const [originalCustomization, setOriginalCustomization] = useState<ThemeCustomization | null>(
    initialCustomization || null
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  const autoSaveTimerRef = useRef<NodeJS.Timeout>(undefined)
  const isAutoSaveEnabled = useRef(false)

  // Track changes for dirty state
  useEffect(() => {
    if (!originalCustomization || !customization) {
      setIsDirty(false)
      return
    }

    const isEqual = JSON.stringify(customization) === JSON.stringify(originalCustomization)
    setIsDirty(!isEqual)
  }, [customization, originalCustomization])

  // Load initial customization if userId is provided but no initial data
  useEffect(() => {
    if (userId && !initialCustomization) {
      loadCustomization(userId)
    } else if (!customization) {
      // Set default customization
      const defaultCustomization = {
        ...DEFAULT_CUSTOMIZATION,
        userId: userId || '',
        id: `custom-${userId || 'default'}-${Date.now()}`
      }
      setCustomization(defaultCustomization)
      setOriginalCustomization(defaultCustomization)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, initialCustomization])

  // Auto-save effect
  useEffect(() => {
    if (isAutoSaveEnabled.current && isDirty && !isLoading) {
      const timer = setTimeout(async () => {
        try {
          await saveCustomization()
        } catch (error) {
          // Auto-save failed silently
        }
      }, autoSaveInterval)

      autoSaveTimerRef.current = timer
      return () => clearTimeout(timer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty, isLoading, autoSaveInterval])

  // Load customization from API
  const loadCustomization = async (id: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await zoneApi.getThemeCustomization(id)
      if (result) {
        setCustomization(result)
        setOriginalCustomization(result)
      } else {
        // No customization found, use default
        const defaultCustomization = {
          ...DEFAULT_CUSTOMIZATION,
          userId: id,
          id: `custom-${id}-${Date.now()}`
        }
        setCustomization(defaultCustomization)
        setOriginalCustomization(defaultCustomization)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customization')
    } finally {
      setIsLoading(false)
    }
  }

  // Update branding
  const updateBranding = useCallback((updates: Partial<BrandingConfig>) => {
    setCustomization(prev => {
      if (!prev) return null
      return {
        ...prev,
        branding: { ...prev.branding, ...updates },
        updatedAt: new Date().toISOString()
      }
    })
  }, [])

  // Update colors
  const updateColors = useCallback((updates: Partial<ColorScheme>) => {
    setCustomization(prev => {
      if (!prev) return null
      return {
        ...prev,
        colors: { ...prev.colors, ...updates },
        updatedAt: new Date().toISOString()
      }
    })
  }, [])

  // Update business info
  const updateBusinessInfo = useCallback((updates: Partial<BusinessInfo>) => {
    setCustomization(prev => {
      if (!prev) return null
      return {
        ...prev,
        businessInfo: { ...prev.businessInfo, ...updates },
        updatedAt: new Date().toISOString()
      }
    })
  }, [])

  // Update navigation
  const updateNavigation = useCallback((updates: Partial<NavigationConfig>) => {
    setCustomization(prev => {
      if (!prev) return null
      return {
        ...prev,
        navigation: { ...prev.navigation, ...updates },
        updatedAt: new Date().toISOString()
      }
    })
  }, [])

  // Save customization
  const saveCustomization = useCallback(async () => {
    if (!customization) return

    setIsLoading(true)
    setError(null)

    try {
      await zoneApi.saveThemeCustomization(customization)
      setOriginalCustomization({ ...customization })
      setIsDirty(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save customization')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [customization])

  // Request approval (for non-admin users)
  const requestApproval = useCallback(async () => {
    if (!customization) return

    setIsLoading(true)
    setError(null)

    try {
      // Mark as pending approval
      const pendingCustomization = {
        ...customization,
        isApproved: false,
        updatedAt: new Date().toISOString()
      }

      await zoneApi.saveThemeCustomization(pendingCustomization)
      setCustomization(pendingCustomization)
      setOriginalCustomization(pendingCustomization)
      setIsDirty(false)

      // TODO: Send approval request notification to admins
      // Approval request sent for customization: pendingCustomization.id
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request approval')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [customization])

  // Reset to defaults
  const resetToDefaults = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const defaultCustomization = {
        ...DEFAULT_CUSTOMIZATION,
        userId: customization?.userId || userId || '',
        id: customization?.id || `custom-${userId || 'default'}-${Date.now()}`,
        updatedAt: new Date().toISOString()
      }

      setCustomization(defaultCustomization)
      setOriginalCustomization(defaultCustomization)
      setIsDirty(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset to defaults')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [customization, userId])

  // Generate preview
  const generatePreview = useCallback(async (): Promise<{ previewUrl: string }> => {
    if (!customization) {
      throw new Error('No customization available for preview')
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await zoneApi.generatePreview(customization)
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate preview')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [customization])

  // Enable auto-save
  const enableAutoSave = useCallback((interval?: number) => {
    isAutoSaveEnabled.current = true
    if (interval && interval !== autoSaveInterval) {
      // Update auto-save interval if needed (would require state update)
      // Auto-save interval updated: interval
    }
  }, [autoSaveInterval])

  // Disable auto-save
  const disableAutoSave = useCallback(() => {
    isAutoSaveEnabled.current = false
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [])

  return {
    customization,
    isLoading,
    error,
    isDirty,

    updateBranding,
    updateColors,
    updateBusinessInfo,
    updateNavigation,

    saveCustomization,
    requestApproval,
    resetToDefaults,
    generatePreview,

    enableAutoSave,
    disableAutoSave
  }
}
