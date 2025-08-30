/**
 * PreviewPanel - Real-time theme customization preview
 */

import React, { useMemo, useEffect, useState } from 'react'
import { ThemeCustomization } from '@o4o/types'
import { Monitor, Tablet, Smartphone, RefreshCw, ExternalLink } from 'lucide-react'

interface PreviewPanelProps {
  customization: ThemeCustomization
  device?: 'desktop' | 'tablet' | 'mobile'
  className?: string
}

type DeviceConfig = {
  width: string
  height: string
  scale: number
}

const DEVICE_CONFIGS: Record<string, DeviceConfig> = {
  desktop: { width: '100%', height: '100%', scale: 1 },
  tablet: { width: '768px', height: '1024px', scale: 0.6 },
  mobile: { width: '375px', height: '667px', scale: 0.7 }
}

// Sample content for preview
const PREVIEW_CONTENT = {
  header: {
    title: 'Your Business Name',
    tagline: 'Welcome to our amazing service',
    navigation: ['Home', 'About', 'Services', 'Contact']
  },
  hero: {
    title: 'Welcome to Our Site',
    subtitle: 'We provide excellent services for your business needs',
    ctaText: 'Get Started'
  },
  features: [
    {
      title: 'Feature One',
      description: 'This is a great feature that helps your business grow.'
    },
    {
      title: 'Feature Two', 
      description: 'Another amazing feature that customers love.'
    },
    {
      title: 'Feature Three',
      description: 'The third feature completes our offering.'
    }
  ],
  footer: {
    copyright: '© 2024 Your Business. All rights reserved.',
    socialLinks: ['Facebook', 'Twitter', 'Instagram']
  }
}

// Generate CSS custom properties from customization
const generateCSSVariables = (customization: ThemeCustomization): React.CSSProperties => {
  const { colors, branding, businessInfo } = customization

  return {
    '--color-primary': colors.primary,
    '--color-secondary': colors.secondary,
    '--color-accent': colors.accent,
    '--color-background': colors.background,
    '--color-foreground': colors.foreground,
    '--color-muted': colors.muted,
    '--color-muted-foreground': colors.mutedForeground,
    '--color-border': colors.border,
    '--color-input': colors.input,
    '--color-ring': colors.ring,
    '--font-family': 'system-ui, -apple-system, sans-serif',
    '--site-name': `"${branding.siteName || businessInfo.name || 'Your Site'}"`,
    '--site-tagline': `"${branding.tagline || businessInfo.description || 'Your tagline'}"`,
  } as React.CSSProperties
}

// Preview website component
const PreviewWebsite: React.FC<{ 
  customization: ThemeCustomization 
  onLoading?: (loading: boolean) => void 
}> = ({ customization, onLoading }) => {
  const [isLoading, setIsLoading] = useState(true)
  const cssVariables = useMemo(() => generateCSSVariables(customization), [customization])

  const { branding, businessInfo, colors } = customization

  // Simulate loading time
  useEffect(() => {
    setIsLoading(true)
    onLoading?.(true)
    
    const timer = setTimeout(() => {
      setIsLoading(false)
      onLoading?.(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [customization, onLoading])

  if (isLoading) {
    return (
      <div className="preview-loading flex items-center justify-center h-full bg-gray-100">
        <div className="text-center">
          <RefreshCw className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" />
          <p className="text-sm text-gray-600">Updating preview...</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="preview-website h-full overflow-auto bg-white"
      style={cssVariables}
    >
      {/* Header */}
      <header 
        className="preview-header px-6 py-4 border-b"
        style={{ 
          backgroundColor: colors.background,
          borderColor: colors.border,
          color: colors.foreground
        }}
      >
        <div className="flex items-center justify-between">
          {/* Logo and branding */}
          <div className="branding flex items-center space-x-3">
            {branding.logo ? (
              <img 
                src={branding.logo} 
                alt="Logo" 
                className="h-8 w-auto object-contain"
              />
            ) : (
              <div 
                className="logo-placeholder w-8 h-8 rounded flex items-center justify-center text-sm font-bold"
                style={{ 
                  backgroundColor: colors.primary,
                  color: colors.background
                }}
              >
                {(branding.siteName || businessInfo.name || 'S')[0]}
              </div>
            )}
            <div>
              <h1 className="font-semibold text-lg">
                {branding.siteName || businessInfo.name || PREVIEW_CONTENT.header.title}
              </h1>
              {branding.tagline && (
                <p className="text-sm opacity-75">{branding.tagline}</p>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="navigation hidden md:block">
            <ul className="flex items-center space-x-6 text-sm">
              {(customization.navigation.items.length > 0 
                ? customization.navigation.items.slice(0, 4)
                : PREVIEW_CONTENT.header.navigation
              ).map((item: any, index: number) => (
                <li key={index}>
                  <span 
                    className="hover:opacity-75 cursor-pointer transition-opacity"
                    style={{ color: colors.foreground }}
                  >
                    {typeof item === 'string' ? item : item.label}
                  </span>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section 
        className="preview-hero px-6 py-16 text-center"
        style={{ 
          backgroundColor: colors.muted,
          color: colors.foreground
        }}
      >
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">
            {PREVIEW_CONTENT.hero.title}
          </h2>
          <p 
            className="text-lg mb-8"
            style={{ color: colors.mutedForeground }}
          >
            {businessInfo.description || PREVIEW_CONTENT.hero.subtitle}
          </p>
          <button 
            className="px-8 py-3 rounded-lg font-medium text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: colors.primary }}
          >
            {PREVIEW_CONTENT.hero.ctaText}
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section className="preview-features px-6 py-16" style={{ color: colors.foreground }}>
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-center mb-12">Our Features</h3>
          <div className="grid md:grid-cols-3 gap-8">
            {PREVIEW_CONTENT.features.map((feature, index) => (
              <div 
                key={index}
                className="feature-card p-6 rounded-lg text-center"
                style={{ 
                  backgroundColor: colors.muted,
                  border: `1px solid ${colors.border}`
                }}
              >
                <div 
                  className="feature-icon w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
                  style={{ backgroundColor: colors.accent }}
                >
                  <span className="text-white font-bold">{index + 1}</span>
                </div>
                <h4 className="font-semibold mb-2">{feature.title}</h4>
                <p 
                  className="text-sm"
                  style={{ color: colors.mutedForeground }}
                >
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      {businessInfo.phone || businessInfo.email || businessInfo.address ? (
        <section 
          className="preview-contact px-6 py-16"
          style={{ 
            backgroundColor: colors.muted,
            color: colors.foreground
          }}
        >
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-2xl font-bold mb-8">Contact Us</h3>
            <div className="space-y-4">
              {businessInfo.phone && (
                <p>
                  <strong>Phone:</strong> {businessInfo.phone}
                </p>
              )}
              {businessInfo.email && (
                <p>
                  <strong>Email:</strong> {businessInfo.email}
                </p>
              )}
              {businessInfo.address && (
                <p>
                  <strong>Address:</strong> {businessInfo.address}
                </p>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {/* Footer */}
      <footer 
        className="preview-footer px-6 py-8 text-center text-sm"
        style={{ 
          backgroundColor: colors.foreground,
          color: colors.background
        }}
      >
        <p>
          {PREVIEW_CONTENT.footer.copyright.replace('Your Business', 
            businessInfo.name || 'Your Business'
          )}
        </p>
        
        {/* Social media links */}
        {businessInfo.socialMedia && Object.keys(businessInfo.socialMedia).length > 0 && (
          <div className="social-links mt-4 flex justify-center space-x-4">
            {Object.entries(businessInfo.socialMedia)
              .filter(([, url]) => url)
              .map(([platform, url]) => (
                <span key={platform} className="capitalize opacity-75 hover:opacity-100 cursor-pointer">
                  {platform}
                </span>
              ))
            }
          </div>
        )}
      </footer>
    </div>
  )
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({
  customization,
  device = 'desktop',
  className = ''
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const deviceConfig = DEVICE_CONFIGS[device]

  return (
    <div className={`preview-panel h-full flex flex-col bg-gray-100 ${className}`}>
      {/* Preview toolbar */}
      <div className="preview-toolbar flex items-center justify-between p-4 bg-white border-b border-gray-200">
        <div className="toolbar-info flex items-center space-x-2">
          {device === 'desktop' && <Monitor size={16} className="text-gray-500" />}
          {device === 'tablet' && <Tablet size={16} className="text-gray-500" />}
          {device === 'mobile' && <Smartphone size={16} className="text-gray-500" />}
          <span className="text-sm text-gray-600 capitalize">{device} Preview</span>
          {isLoading && (
            <RefreshCw size={14} className="animate-spin text-blue-600" />
          )}
        </div>

        <button 
          className="preview-external flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded hover:bg-gray-50"
          title="Open in new window"
        >
          <ExternalLink size={14} className="mr-1" />
          Open
        </button>
      </div>

      {/* Preview content */}
      <div className="preview-content flex-1 p-4 overflow-hidden">
        <div 
          className="preview-frame mx-auto bg-white shadow-lg rounded-lg overflow-hidden"
          style={{
            width: deviceConfig.width,
            height: deviceConfig.height,
            transform: `scale(${deviceConfig.scale})`,
            transformOrigin: 'top center',
            maxWidth: '100%',
            maxHeight: '100%'
          }}
        >
          <PreviewWebsite 
            customization={customization} 
            onLoading={setIsLoading}
          />
        </div>
      </div>

      {/* Preview info */}
      <div className="preview-info p-4 bg-white border-t border-gray-200">
        <div className="text-xs text-gray-500 space-y-1">
          <div>
            Preview updates automatically as you make changes
          </div>
          <div className="flex items-center space-x-4">
            <span>Device: {device}</span>
            <span>Scale: {Math.round(deviceConfig.scale * 100)}%</span>
            {device !== 'desktop' && (
              <span>Size: {deviceConfig.width} × {deviceConfig.height}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PreviewPanel