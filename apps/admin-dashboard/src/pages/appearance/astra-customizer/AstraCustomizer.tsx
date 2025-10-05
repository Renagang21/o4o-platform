import React, { useState, useEffect } from 'react';
import { CustomizerProvider } from './context/CustomizerContext';
import { CustomizerHeader } from './components/layout/CustomizerHeader';
import { CustomizerSidebar } from './components/layout/CustomizerSidebar';
import { EnhancedPreview } from './components/layout/EnhancedPreview';
import { SettingSection, AstraCustomizerSettings } from './types/customizer-types';
import '../../../styles/wordpress-customizer.css';
import './styles/controls.css';
import './styles/sections.css';
import './styles/enhanced-preview.css';
import { useCustomizerState } from './hooks/useCustomizerState';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';

// Import section components
import { SiteIdentitySection } from './sections/global/SiteIdentitySection';
import { ColorsSection } from './sections/global/ColorsSection';
import { TypographySection } from './sections/global/TypographySection';
import { ContainerSection } from './sections/layout/ContainerSection';
import { HeaderLayoutSection } from './sections/header/HeaderLayoutSection';
import { FooterSection } from './sections/footer/FooterSection';
import { ImportExport } from './components/ImportExport';

interface AstraCustomizerProps {
  onClose: () => void;
  initialSettings?: Partial<AstraCustomizerSettings>;
  previewUrl?: string;
  siteName?: string;
  onSave?: (settings: AstraCustomizerSettings) => Promise<void>;
}

// Inner component that uses the context
const AstraCustomizerContent: React.FC<{
  onClose: () => void;
  siteName: string;
  previewUrl: string;
  onSaveHandler: (settings: AstraCustomizerSettings) => Promise<void>;
}> = ({ onClose, siteName, previewUrl, onSaveHandler }) => {
  const [activeSection, setActiveSection] = useState<SettingSection | null>(null);
  const { isDirty, undo, redo, settings, resetAll } = useCustomizerState();

  // Initialize keyboard shortcuts
  useKeyboardShortcuts({
    onSave: async () => {
      await onSaveHandler(settings);
    },
    onUndo: undo,
    onRedo: redo,
    onClose,
    onReset: resetAll,
  });

  // Handle escape key to close customizer (unless currently in fullscreen)
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // If any element is in fullscreen, let ESC exit fullscreen first
        if (typeof document !== 'undefined' && (document as any).fullscreenElement) {
          return;
        }
        if (isDirty) {
          const ok = window.confirm('변경사항이 저장되지 않았습니다. 종료하시겠습니까?');
          if (!ok) return;
        }
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose, isDirty]);

  // Warn on page unload if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      // Chrome requires returnValue to be set
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Prevent body scroll when customizer is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const renderSectionContent = () => {
    if (!activeSection) {
      return (
        <div className="wp-customizer-welcome">
          <h2>Welcome to Astra Customizer</h2>
          <p>Select a section from the left panel to start customizing your site.</p>
          <ul>
            <li>🎨 <strong>Colors</strong> - Customize your site's color scheme</li>
            <li>📝 <strong>Typography</strong> - Set fonts and text styles</li>
            <li>📐 <strong>Layout</strong> - Control container widths and spacing</li>
            <li>🔝 <strong>Header</strong> - Design your site header</li>
            <li>🔻 <strong>Footer</strong> - Customize footer widgets and content</li>
            <li>📰 <strong>Blog</strong> - Configure blog layout and post display</li>
          </ul>
        </div>
      );
    }

    // Render appropriate section component based on activeSection
    switch (activeSection) {
      case 'siteIdentity':
        return <SiteIdentitySection />;
      case 'colors':
        return <ColorsSection />;
      case 'typography':
        return <TypographySection />;
      case 'container':
        return <ContainerSection />;
      case 'header':
        return <HeaderLayoutSection />;
      case 'footer':
        return <FooterSection />;
      case 'sidebar':
        return <ContainerSection />;
      case 'blog':
        return <ContainerSection />;
      case 'customCSS':
        return <ImportExport />;
      default:
        return <div>Section not found</div>;
    }
  };

  return (
    <div className="wp-customizer">
      <CustomizerHeader onClose={onClose} siteName={siteName} />

      <div className="wp-customizer-body">
        <CustomizerSidebar
          activePanel={activeSection}
          onPanelSelect={setActiveSection}
        />

        {/* Section Content Area - Hidden for now, will show when section is selected */}
        {activeSection && (
          <div className="wp-customizer-section-panel">
            {renderSectionContent()}
          </div>
        )}

        <EnhancedPreview
          url={previewUrl}
        />
      </div>
    </div>
  );
};

// Main component that provides the context
export const AstraCustomizer: React.FC<AstraCustomizerProps> = ({
  onClose,
  initialSettings,
  previewUrl = '/',
  siteName = 'O4O Platform',
  onSave,
}) => {
  const handleSave = async (settings: AstraCustomizerSettings) => {
    if (onSave) {
      await onSave(settings);
    } else {
      // Default save implementation using API
      try {
        const response = await authClient.api.post('/api/v1/themes/customizer/settings', {
          themeId: 'default',
          settings: settings
        });

        if (response.data?.success) {
          toast.success('Settings saved successfully');
        }
      } catch (error: any) {
        toast.error(error?.response?.data?.message || 'Failed to save settings');
        throw error;
      }
    }
  };

  const handlePublish = async (settings: AstraCustomizerSettings) => {
    try {
      // 🔍 DEBUG: Check logo URL before conversion
      console.log('🔍 Publishing with logo:', settings.siteIdentity.logo.desktop);
      console.log('🔍 Full siteIdentity:', JSON.stringify(settings.siteIdentity, null, 2));

      // Convert customizer settings to template parts format
      const headerTemplatePart = convertSettingsToHeaderTemplatePart(settings);

      // 🔍 DEBUG: Check converted template part
      console.log('📦 Template Part:', JSON.stringify(headerTemplatePart, null, 2));
      console.log('📦 Logo URL in template:', headerTemplatePart.content[0].innerBlocks[0].data.logoUrl);

      // Check if default header exists and update it
      const existingResponse = await authClient.api.get('/api/public/template-parts');
      const existingParts = existingResponse.data?.data || [];
      const defaultHeader = existingParts.find((part: any) =>
        part.area === 'header' && part.isDefault === true
      );

      if (defaultHeader) {
        console.log('📝 Updating existing header:', defaultHeader.id);
        // Update existing default header
        const response = await authClient.api.put(`/api/template-parts/${defaultHeader.id}`, headerTemplatePart);
        console.log('✅ Update response:', response.data);
        toast.success('Header template updated successfully');
      } else {
        console.log('📝 Creating new header template');
        // Create new header template part
        const response = await authClient.api.post('/api/template-parts', {
          ...headerTemplatePart,
          isDefault: true,
          isActive: true
        });
        console.log('✅ Create response:', response.data);
        toast.success('Header template created successfully');
      }

    } catch (error: any) {
      console.error('❌ Publish error:', error);
      toast.error(error?.response?.data?.message || 'Failed to publish settings');
      throw error;
    }
  };

  const convertSettingsToHeaderTemplatePart = (settings: AstraCustomizerSettings) => {
    return {
      name: 'Default Header',
      slug: 'default-header',
      description: 'Default site header with logo, navigation menu, and search',
      area: 'header',
      content: [
        {
          id: 'header-container',
          type: 'o4o/group',
          data: {
            layout: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            className: 'site-header',
            padding: {
              top: '16px',
              bottom: '16px',
              left: '24px',
              right: '24px'
            }
          },
          innerBlocks: [
            {
              id: 'site-logo',
              type: 'core/site-logo',
              data: {
                width: settings.siteIdentity.logo.width.desktop || 120,
                isLink: true,
                linkTarget: '_self',
                logoUrl: settings.siteIdentity.logo.desktop
              }
            },
            {
              id: 'navigation-container',
              type: 'o4o/group',
              data: {
                layout: 'flex',
                flexDirection: 'row',
                gap: '32px',
                alignItems: 'center'
              },
              innerBlocks: [
                {
                  id: 'primary-menu',
                  type: 'core/navigation',
                  data: {
                    menuRef: 'primary-menu',
                    orientation: 'horizontal',
                    showSubmenuIcon: true
                  }
                },
                {
                  id: 'header-search',
                  type: 'core/search',
                  data: {
                    label: 'Search',
                    showLabel: false,
                    placeholder: 'Search...',
                    buttonPosition: 'button-inside'
                  }
                }
              ]
            }
          ]
        }
      ],
      settings: {
        containerWidth: 'wide',
        backgroundColor: settings.header.primary.background || '#ffffff',
        textColor: settings.colors.textColor || '#333333',
        padding: {
          top: '0',
          bottom: '0'
        }
      }
    };
  };

  return (
    <CustomizerProvider
      initialSettings={initialSettings}
      previewUrl={previewUrl}
      eventHandlers={{
        onSave: handleSave,
        onPublish: handlePublish,
        onSettingChange: (section, value) => {
          // Handle setting change
        },
        onDeviceChange: (device) => {
          // Handle device change
        },
        onReset: () => {
          // Handle reset
        },
      }}
    >
      <AstraCustomizerContent
        onClose={onClose}
        siteName={siteName}
        previewUrl={previewUrl}
        onSaveHandler={handleSave}
      />
    </CustomizerProvider>
  );
};

// Export as default for lazy loading
export default AstraCustomizer;
