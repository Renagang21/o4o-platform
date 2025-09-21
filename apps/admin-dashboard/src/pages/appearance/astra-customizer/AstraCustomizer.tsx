import React, { useState, useEffect } from 'react';
import { CustomizerProvider } from './context/CustomizerContext';
import { CustomizerHeader } from './components/layout/CustomizerHeader';
import { CustomizerSidebar } from './components/layout/CustomizerSidebar';
import { CustomizerPreview } from './components/layout/CustomizerPreview';
import { SettingSection, AstraCustomizerSettings } from './types/customizer-types';
import '../../../styles/wordpress-customizer.css';
import './styles/controls.css';
import './styles/sections.css';
import { useCustomizerState } from './hooks/useCustomizerState';

// Import section components
import { SiteIdentitySection } from './sections/global/SiteIdentitySection';
import { ColorsSection } from './sections/global/ColorsSection';
import { TypographySection } from './sections/global/TypographySection';
import { ContainerSection } from './sections/layout/ContainerSection';
import { HeaderLayoutSection } from './sections/header/HeaderLayoutSection';
import { FooterSection } from './sections/footer/FooterSection';
import { ImportExport } from './components/ImportExport';
// import { SidebarSection } from './sections/layout/SidebarSection';
// import { BlogSection } from './sections/content/BlogSection';

interface AstraCustomizerProps {
  onClose: () => void;
  initialSettings?: Partial<AstraCustomizerSettings>;
  previewUrl?: string;
  siteName?: string;
  onSave?: (settings: AstraCustomizerSettings) => Promise<void>;
}

export const AstraCustomizer: React.FC<AstraCustomizerProps> = ({
  onClose,
  initialSettings,
  previewUrl = '/',
  siteName = 'O4O Platform',
  onSave,
}) => {
  const [activeSection, setActiveSection] = useState<SettingSection | null>(null);
  const [isReady, setIsReady] = useState(false);
  const { isDirty } = useCustomizerState();
  
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
  
  const handleSave = async (settings: AstraCustomizerSettings) => {
    if (onSave) {
      await onSave(settings);
    } else {
      // Default save implementation
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In real implementation, this would save to backend
      localStorage.setItem('astra-customizer-settings', JSON.stringify(settings));
    }
  };
  
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
        return <div>Blog Settings (To be implemented)</div>;
      case 'customCSS':
        return <ImportExport />;
      default:
        return <div>Section not found</div>;
    }
  };
  
  return (
    <CustomizerProvider
      initialSettings={initialSettings}
      previewUrl={previewUrl}
      eventHandlers={{
        onSave: handleSave,
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
          
          <CustomizerPreview
            url={previewUrl}
            onLoad={() => setIsReady(true)}
          />
        </div>
      </div>
    </CustomizerProvider>
  );
};

// Export as default for lazy loading
export default AstraCustomizer;
