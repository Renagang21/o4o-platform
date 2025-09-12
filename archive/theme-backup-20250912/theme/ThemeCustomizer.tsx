/**
 * ThemeCustomizer - Main theme customization interface
 * Provides user-friendly interface for limited theme customizations
 */

import React, { useState, useCallback, useEffect } from 'react'
import { ThemeCustomization, ColorPreset } from '@o4o/types'
import { LogoUploader } from './LogoUploader'
import { ColorPalettePicker } from './ColorPalettePicker'
import { BusinessInfoForm } from './BusinessInfoForm'
import { NavigationEditor } from './NavigationEditor'
import { PreviewPanel } from './PreviewPanel'
import { useThemeCustomization } from '../hooks/useThemeCustomization'
import { 
  Save, 
  RotateCcw, 
  Eye, 
  EyeOff, 
  Palette, 
  Building, 
  Navigation,
  Image,
  Monitor,
  Tablet,
  Smartphone,
  CheckCircle,
  Clock,
  AlertCircle,
  Send
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface ThemeCustomizerProps {
  initialCustomization?: ThemeCustomization
  userId?: string
  isAdmin?: boolean
  onSave?: (customization: ThemeCustomization) => void
  onRequestApproval?: (customization: ThemeCustomization) => void
  className?: string
}

type CustomizationTab = 'branding' | 'colors' | 'business' | 'navigation'
type PreviewDevice = 'desktop' | 'tablet' | 'mobile'

export const ThemeCustomizer: React.FC<ThemeCustomizerProps> = ({
  initialCustomization,
  userId,
  isAdmin = false,
  onSave,
  onRequestApproval,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<CustomizationTab>('branding')
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop')
  const [showPreview, setShowPreview] = useState(true)
  const [pendingChanges, setPendingChanges] = useState(false)

  const {
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
    generatePreview
  } = useThemeCustomization(initialCustomization, userId)

  // Handle customization updates
  const handleUpdate = useCallback((updates: Partial<ThemeCustomization>) => {
    setPendingChanges(true)
  }, [])

  // Handle save action
  const handleSave = useCallback(async () => {
    if (!customization) return

    try {
      if (isAdmin) {
        await saveCustomization()
        onSave?.(customization)
        toast.success('Theme customization saved successfully')
      } else {
        await requestApproval()
        onRequestApproval?.(customization)
        toast.success('Customization request sent for admin approval')
      }
      setPendingChanges(false)
    } catch (error) {
      toast.error('Failed to save customization')
      // console.error('Save error:', error)
    }
  }, [customization, isAdmin, saveCustomization, requestApproval, onSave, onRequestApproval])

  // Handle reset
  const handleReset = useCallback(async () => {
    try {
      await resetToDefaults()
      setPendingChanges(false)
      toast.success('Theme reset to defaults')
    } catch (error) {
      toast.error('Failed to reset theme')
    }
  }, [resetToDefaults])

  // Tabs configuration
  const tabs = [
    {
      id: 'branding' as const,
      name: 'Branding',
      icon: Image,
      description: 'Logo and site identity'
    },
    {
      id: 'colors' as const,
      name: 'Colors',
      icon: Palette,
      description: 'Color scheme selection'
    },
    {
      id: 'business' as const,
      name: 'Business Info',
      icon: Building,
      description: 'Contact information'
    },
    {
      id: 'navigation' as const,
      name: 'Navigation',
      icon: Navigation,
      description: 'Menu and links'
    }
  ]

  // Preview device buttons
  const previewDevices = [
    { id: 'desktop' as const, icon: Monitor, label: 'Desktop' },
    { id: 'tablet' as const, icon: Tablet, label: 'Tablet' },
    { id: 'mobile' as const, icon: Smartphone, label: 'Mobile' }
  ]

  if (error) {
    return (
      <div className="theme-customizer-error p-8 text-center">
        <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Error Loading Theme Customizer
        </h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Reload
        </button>
      </div>
    )
  }

  if (isLoading || !customization) {
    return (
      <div className="theme-customizer-loading flex items-center justify-center h-96">
        <div className="text-center">
          <div className="loading-spinner animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading theme customizer...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`theme-customizer flex h-full bg-gray-50 ${className}`}>
      {/* Left Panel - Customization Controls */}
      <div className="customization-panel flex-shrink-0 w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="panel-header p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Theme Customization
          </h2>
          <p className="text-sm text-gray-600">
            {isAdmin ? 'Customize theme settings' : 'Request theme changes'}
          </p>
          
          {/* Status Indicator */}
          {!isAdmin && (
            <div className="status-indicator mt-2 flex items-center text-xs">
              {pendingChanges ? (
                <>
                  <Clock size={12} className="text-yellow-500 mr-1" />
                  <span className="text-yellow-700">Changes pending approval</span>
                </>
              ) : (
                <>
                  <CheckCircle size={12} className="text-green-500 mr-1" />
                  <span className="text-green-700">Up to date</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="tab-navigation px-4 py-2 border-b border-gray-200">
          <div className="grid grid-cols-2 gap-1">
            {tabs.map(tab => {
              const IconComponent = tab.icon
              const isActive = activeTab === tab.id
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`tab-button p-3 rounded-md text-left transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center mb-1">
                    <IconComponent size={16} className="mr-2" />
                    <span className="text-sm font-medium">{tab.name}</span>
                  </div>
                  <p className="text-xs opacity-75">{tab.description}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="tab-content flex-1 overflow-y-auto">
          {activeTab === 'branding' && (
            <div className="p-4 space-y-6">
              <LogoUploader
                logo={customization.branding.logo}
                siteName={customization.branding.siteName}
                tagline={customization.branding.tagline}
                onUpdate={(updates) => {
                  updateBranding(updates)
                  handleUpdate({})
                }}
              />
            </div>
          )}

          {activeTab === 'colors' && (
            <div className="p-4">
              <ColorPalettePicker
                colors={customization.colors}
                onUpdate={(updates) => {
                  updateColors(updates)
                  handleUpdate({})
                }}
              />
            </div>
          )}

          {activeTab === 'business' && (
            <div className="p-4">
              <BusinessInfoForm
                businessInfo={customization.businessInfo}
                onUpdate={(updates) => {
                  updateBusinessInfo(updates)
                  handleUpdate({})
                }}
              />
            </div>
          )}

          {activeTab === 'navigation' && (
            <div className="p-4">
              <NavigationEditor
                navigation={customization.navigation}
                onUpdate={(updates) => {
                  updateNavigation(updates)
                  handleUpdate({})
                }}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="panel-actions p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-col space-y-2">
            <button
              onClick={handleSave}
              disabled={!isDirty || isLoading}
              className="save-button flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isAdmin ? <Save size={16} className="mr-2" /> : <Send size={16} className="mr-2" />}
              {isAdmin ? 'Save Changes' : 'Request Approval'}
            </button>

            <button
              onClick={handleReset}
              disabled={isLoading}
              className="reset-button flex items-center justify-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:bg-gray-100 transition-colors"
            >
              <RotateCcw size={16} className="mr-2" />
              Reset to Default
            </button>
          </div>

          {isDirty && (
            <p className="text-xs text-orange-600 mt-2 text-center">
              You have unsaved changes
            </p>
          )}
        </div>
      </div>

      {/* Right Panel - Preview */}
      <div className="preview-container flex-1 flex flex-col">
        {/* Preview Header */}
        <div className="preview-header flex items-center justify-between p-4 bg-white border-b border-gray-200">
          <div className="preview-title">
            <h3 className="text-lg font-medium text-gray-900">Live Preview</h3>
            <p className="text-sm text-gray-600">See your changes in real-time</p>
          </div>

          <div className="preview-controls flex items-center space-x-3">
            {/* Device Selector */}
            <div className="device-selector flex bg-gray-100 rounded-md p-1">
              {previewDevices.map(device => {
                const IconComponent = device.icon
                const isActive = previewDevice === device.id
                
                return (
                  <button
                    key={device.id}
                    onClick={() => setPreviewDevice(device.id)}
                    className={`device-button p-2 rounded transition-colors ${
                      isActive
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    title={device.label}
                  >
                    <IconComponent size={16} />
                  </button>
                )
              })}
            </div>

            {/* Preview Toggle */}
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="preview-toggle p-2 text-gray-600 hover:text-gray-900 transition-colors"
              title={showPreview ? 'Hide Preview' : 'Show Preview'}
            >
              {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="preview-content flex-1 overflow-hidden">
          {showPreview ? (
            <PreviewPanel
              customization={customization}
              device={previewDevice}
              className="h-full"
            />
          ) : (
            <div className="preview-hidden h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <EyeOff size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg">Preview Hidden</p>
                <p className="text-sm">Click the eye icon to show preview</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ThemeCustomizer