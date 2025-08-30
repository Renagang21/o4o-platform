/**
 * EnhancedPreviewPanel - Real-time theme customization preview with WebSocket updates
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { ThemeCustomization } from '@o4o/types'
import { usePreviewWebSocket, PreviewUpdate } from '@/services/previewWebSocket'
import { 
  Monitor, 
  Tablet, 
  Smartphone, 
  RefreshCw, 
  ExternalLink, 
  Wifi, 
  WifiOff,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Settings,
  Eye
} from 'lucide-react'

interface EnhancedPreviewPanelProps {
  customization: ThemeCustomization
  device?: 'desktop' | 'tablet' | 'mobile'
  userId: string
  pageId?: string
  className?: string
  onCustomizationChange?: (customization: ThemeCustomization) => void
}

type DeviceConfig = {
  width: number
  height: number
  scale: number
  name: string
}

const DEVICE_CONFIGS: Record<string, DeviceConfig> = {
  desktop: { width: 1200, height: 800, scale: 1, name: 'Desktop' },
  tablet: { width: 768, height: 1024, scale: 0.6, name: 'Tablet' },
  mobile: { width: 375, height: 667, scale: 0.7, name: 'Mobile' }
}

// Preview toolbar component
const PreviewToolbar: React.FC<{
  device: string
  isConnected: boolean
  isLoading: boolean
  scale: number
  onScaleChange: (scale: number) => void
  onRefresh: () => void
  onOpenExternal: () => void
  onDeviceChange: (device: string) => void
}> = ({ 
  device, 
  isConnected, 
  isLoading, 
  scale, 
  onScaleChange, 
  onRefresh, 
  onOpenExternal,
  onDeviceChange 
}) => {
  const devices = [
    { id: 'desktop', icon: Monitor, label: 'Desktop' },
    { id: 'tablet', icon: Tablet, label: 'Tablet' },
    { id: 'mobile', icon: Smartphone, label: 'Mobile' }
  ]

  return (
    <div className="preview-toolbar flex items-center justify-between p-4 bg-white border-b border-gray-200">
      {/* Left side - Connection status and device info */}
      <div className="toolbar-left flex items-center space-x-3">
        {/* Connection status */}
        <div className={`connection-status flex items-center space-x-1 text-xs ${
          isConnected ? 'text-green-600' : 'text-red-600'
        }`}>
          {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
          <span>{isConnected ? 'Live' : 'Offline'}</span>
        </div>

        {/* Device selector */}
        <div className="device-selector flex bg-gray-100 rounded-md p-1">
          {devices.map(deviceOption => {
            const IconComponent = deviceOption.icon
            const isActive = device === deviceOption.id
            
            return (
              <button
                key={deviceOption.id}
                onClick={() => onDeviceChange(deviceOption.id)}
                className={`device-button p-2 rounded transition-colors ${
                  isActive
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title={deviceOption.label}
              >
                <IconComponent size={16} />
              </button>
            )
          })}
        </div>

        {/* Loading indicator */}
        {isLoading && (
          <div className="loading-indicator flex items-center space-x-1 text-blue-600">
            <RefreshCw size={14} className="animate-spin" />
            <span className="text-xs">Updating...</span>
          </div>
        )}
      </div>

      {/* Right side - Controls */}
      <div className="toolbar-right flex items-center space-x-2">
        {/* Scale controls */}
        <div className="scale-controls flex items-center space-x-1 text-sm">
          <button
            onClick={() => onScaleChange(Math.max(0.25, scale - 0.25))}
            className="p-1 hover:bg-gray-100 rounded"
            title="Zoom out"
          >
            <ZoomOut size={14} />
          </button>
          <span className="text-gray-600 w-10 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => onScaleChange(Math.min(2, scale + 0.25))}
            className="p-1 hover:bg-gray-100 rounded"
            title="Zoom in"
          >
            <ZoomIn size={14} />
          </button>
          <button
            onClick={() => onScaleChange(1)}
            className="p-1 hover:bg-gray-100 rounded"
            title="Reset zoom"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-gray-300" />

        {/* Action buttons */}
        <button
          onClick={onRefresh}
          className="p-2 hover:bg-gray-100 rounded"
          title="Refresh preview"
        >
          <RefreshCw size={16} />
        </button>
        
        <button
          onClick={onOpenExternal}
          className="p-2 hover:bg-gray-100 rounded"
          title="Open in new window"
        >
          <ExternalLink size={16} />
        </button>
      </div>
    </div>
  )
}

// Main enhanced preview panel
export const EnhancedPreviewPanel: React.FC<EnhancedPreviewPanelProps> = ({
  customization,
  device = 'desktop',
  userId,
  pageId,
  className = '',
  onCustomizationChange
}) => {
  const [currentDevice, setCurrentDevice] = useState(device)
  const [customScale, setCustomScale] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<string>('')
  
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const deviceConfig = DEVICE_CONFIGS[currentDevice]
  const effectiveScale = customScale ?? deviceConfig.scale

  // WebSocket connection for real-time updates
  const {
    isConnected,
    error: wsError,
    sendCustomizationUpdate,
    onUpdate
  } = usePreviewWebSocket(userId, pageId)

  // Handle WebSocket updates from other sessions
  useEffect(() => {
    const unsubscribe = onUpdate((update: PreviewUpdate) => {
      // Received preview update
      
      switch (update.type) {
        case 'customization':
          if (onCustomizationChange && update.data) {
            onCustomizationChange(update.data)
          }
          setLastUpdate(update.timestamp)
          break
          
        case 'layout':
          // Handle layout changes
          setLastUpdate(update.timestamp)
          break
          
        case 'content':
          // Handle content updates
          setLastUpdate(update.timestamp)
          break
          
        case 'full-refresh':
          handleRefresh()
          break
      }
    })

    return unsubscribe
  }, [onUpdate, onCustomizationChange])

  // Send customization updates via WebSocket
  useEffect(() => {
    if (isConnected) {
      sendCustomizationUpdate(customization)
    }
  }, [customization, isConnected, sendCustomizationUpdate])

  // Generate preview URL
  useEffect(() => {
    const generatePreviewUrl = () => {
      const params = new URLSearchParams({
        userId,
        theme: 'twenty-four',
        device: currentDevice,
        ...(pageId && { pageId })
      })
      
      return `/api/theme/preview?${params.toString()}`
    }

    setPreviewUrl(generatePreviewUrl())
  }, [userId, pageId, currentDevice])

  // Handle refresh
  const handleRefresh = useCallback(() => {
    if (iframeRef.current) {
      setIsLoading(true)
      iframeRef.current.src = iframeRef.current.src
    }
  }, [])

  // Handle iframe load
  const handleIframeLoad = useCallback(() => {
    setIsLoading(false)
    
    // Inject customization CSS into iframe
    if (iframeRef.current?.contentWindow) {
      try {
        const iframe = iframeRef.current
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document
        
        // Generate CSS from customization
        const css = generateCustomizationCSS(customization)
        
        // Inject CSS
        let styleElement = iframeDoc.getElementById('theme-customization-css')
        if (!styleElement) {
          styleElement = iframeDoc.createElement('style')
          styleElement.id = 'theme-customization-css'
          iframeDoc.head.appendChild(styleElement)
        }
        styleElement.textContent = css
        
      } catch (error) {
        console.error('Failed to inject customization CSS:', error)
      }
    }
  }, [customization])

  // Handle external open
  const handleOpenExternal = useCallback(() => {
    if (previewUrl) {
      window.open(previewUrl, '_blank', 'width=1200,height=800')
    }
  }, [previewUrl])

  // Generate CSS from theme customization
  const generateCustomizationCSS = (customization: ThemeCustomization): string => {
    const { colors, branding } = customization
    
    return `
      :root {
        --wp--preset--color--primary: ${colors.primary};
        --wp--preset--color--secondary: ${colors.secondary};
        --wp--preset--color--accent: ${colors.accent};
        --wp--preset--color--background: ${colors.background};
        --wp--preset--color--foreground: ${colors.foreground};
        --wp--preset--color--muted: ${colors.muted};
        --wp--preset--color--muted-foreground: ${colors.mutedForeground};
        --wp--preset--color--border: ${colors.border};
      }
      
      .wp-block-site-title::before {
        content: "${branding.siteName || 'Site Title'}";
      }
      
      .wp-block-site-tagline::before {
        content: "${branding.tagline || ''}";
      }
      
      ${branding.logo ? `
        .wp-block-site-logo img {
          content: url("${branding.logo}");
        }
      ` : ''}
      
      .zone-header {
        background-color: ${colors.background};
        color: ${colors.foreground};
        border-color: ${colors.border};
      }
      
      .zone-hero {
        background-color: ${colors.muted};
        color: ${colors.foreground};
      }
      
      .zone-footer {
        background-color: ${colors.foreground};
        color: ${colors.background};
      }
      
      .wp-block-button .wp-block-button__link {
        background-color: ${colors.primary};
        color: ${colors.foreground};
      }
      
      .wp-block-button .wp-block-button__link:hover {
        background-color: ${colors.accent};
      }
    `
  }

  return (
    <div className={`enhanced-preview-panel h-full flex flex-col bg-gray-100 ${className}`}>
      {/* Toolbar */}
      <PreviewToolbar
        device={currentDevice}
        isConnected={isConnected}
        isLoading={isLoading}
        scale={effectiveScale}
        onScaleChange={setCustomScale}
        onRefresh={handleRefresh}
        onOpenExternal={handleOpenExternal}
        onDeviceChange={setCurrentDevice}
      />

      {/* Preview content */}
      <div className="preview-content flex-1 p-4 overflow-hidden">
        <div 
          className="preview-frame mx-auto bg-white shadow-lg rounded-lg overflow-hidden border-2 border-gray-200"
          style={{
            width: deviceConfig.width * effectiveScale,
            height: deviceConfig.height * effectiveScale,
            transform: `scale(${effectiveScale})`,
            transformOrigin: 'top center',
            maxWidth: '100%',
            maxHeight: '100%'
          }}
        >
          {previewUrl ? (
            <iframe
              ref={iframeRef}
              src={previewUrl}
              width={deviceConfig.width}
              height={deviceConfig.height}
              onLoad={handleIframeLoad}
              className="w-full h-full border-0"
              title={`Preview - ${deviceConfig.name}`}
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <Eye size={48} className="mx-auto mb-4 opacity-50" />
                <p>Loading preview...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="preview-status p-4 bg-white border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="status-left flex items-center space-x-4">
            <span>Device: {deviceConfig.name}</span>
            <span>Scale: {Math.round(effectiveScale * 100)}%</span>
            <span>Size: {deviceConfig.width} × {deviceConfig.height}</span>
            {lastUpdate && (
              <span>Last update: {new Date(lastUpdate).toLocaleTimeString()}</span>
            )}
          </div>
          
          <div className="status-right flex items-center space-x-2">
            {wsError && (
              <span className="text-red-600">Connection error</span>
            )}
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EnhancedPreviewPanel