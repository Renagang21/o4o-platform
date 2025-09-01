/**
 * CustomizerSidebar - WordPress-style customizer sidebar with sections
 */

import React, { useState } from 'react';
import { 
  ChevronRight,
  ChevronLeft,
  Palette,
  Image,
  Menu,
  Code,
  Home,
  Type,
  Settings,
  RotateCcw
} from 'lucide-react';
import { CustomizerSettings } from '../WordPressCustomizer';
import { SiteIdentitySection } from './sections/SiteIdentitySection';
import { ColorsSection } from './sections/ColorsSection';
import { MenusSection } from './sections/MenusSection';
import { BackgroundImageSection } from './sections/BackgroundImageSection';
import { AdditionalCssSection } from './sections/AdditionalCssSection';
import { HomepageSettingsSection } from './sections/HomepageSettingsSection';

interface CustomizerSidebarProps {
  settings: CustomizerSettings;
  onSettingsChange: (section: keyof CustomizerSettings, updates: any) => void;
  onReset: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

type Section = 
  | 'main' 
  | 'site-identity' 
  | 'colors' 
  | 'menus' 
  | 'background-image' 
  | 'homepage-settings'
  | 'additional-css';

interface SectionItem {
  id: Section;
  label: string;
  icon: React.ElementType;
  description?: string;
}

const sections: SectionItem[] = [
  {
    id: 'site-identity',
    label: 'Site Identity',
    icon: Type,
    description: 'Logo, site title, and tagline'
  },
  {
    id: 'colors',
    label: 'Colors',
    icon: Palette,
    description: 'Base colors and dark mode'
  },
  {
    id: 'menus',
    label: 'Menus',
    icon: Menu,
    description: 'Navigation menus'
  },
  {
    id: 'background-image',
    label: 'Background Image',
    icon: Image,
    description: 'Site background image'
  },
  {
    id: 'homepage-settings',
    label: 'Homepage Settings',
    icon: Home,
    description: 'Static page or blog posts'
  },
  {
    id: 'additional-css',
    label: 'Additional CSS',
    icon: Code,
    description: 'Custom CSS code'
  }
];

export const CustomizerSidebar: React.FC<CustomizerSidebarProps> = ({
  settings,
  onSettingsChange,
  onReset,
  isCollapsed,
  onToggleCollapse
}) => {
  const [activeSection, setActiveSection] = useState<Section>('main');
  const [sectionHistory, setSectionHistory] = useState<Section[]>(['main']);

  const navigateToSection = (section: Section) => {
    setSectionHistory(prev => [...prev, section]);
    setActiveSection(section);
  };

  const navigateBack = () => {
    if (sectionHistory.length > 1) {
      const newHistory = [...sectionHistory];
      newHistory.pop();
      setSectionHistory(newHistory);
      setActiveSection(newHistory[newHistory.length - 1]);
    }
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'site-identity':
        return (
          <SiteIdentitySection
            settings={settings.siteIdentity}
            onChange={(updates) => onSettingsChange('siteIdentity', updates)}
          />
        );
      
      case 'colors':
        return (
          <ColorsSection
            settings={settings.colors}
            onChange={(updates) => onSettingsChange('colors', updates)}
          />
        );
      
      case 'menus':
        return (
          <MenusSection
            settings={settings.menus}
            onChange={(updates) => onSettingsChange('menus', updates)}
          />
        );
      
      case 'background-image':
        return (
          <BackgroundImageSection
            settings={settings.backgroundImage}
            onChange={(updates) => onSettingsChange('backgroundImage', updates)}
          />
        );
      
      case 'homepage-settings':
        return (
          <HomepageSettingsSection
            settings={settings.homepage}
            onChange={(updates) => onSettingsChange('homepage', updates)}
          />
        );
      
      case 'additional-css':
        return (
          <AdditionalCssSection
            css={settings.additionalCss}
            onChange={(css) => onSettingsChange('additionalCss', css)}
          />
        );
      
      default:
        return (
          <div className="wp-customizer-sections">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => navigateToSection(section.id)}
                  className="wp-customizer-section-item"
                >
                  <div className="section-item-content">
                    <Icon className="w-5 h-5 text-gray-600" />
                    <div className="section-item-text">
                      <h3 className="section-item-title">{section.label}</h3>
                      {section.description && (
                        <p className="section-item-description">{section.description}</p>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
              );
            })}
          </div>
        );
    }
  };

  if (isCollapsed) {
    return (
      <div className="wp-customizer-sidebar collapsed">
        <button
          onClick={onToggleCollapse}
          className="sidebar-toggle"
          aria-label="Expand sidebar"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="wp-customizer-sidebar">
      {/* Header */}
      <div className="sidebar-header">
        {activeSection !== 'main' && (
          <button
            onClick={navigateBack}
            className="back-button"
            aria-label="Go back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        
        <h2 className="sidebar-title">
          {activeSection === 'main' 
            ? 'Customizing' 
            : sections.find(s => s.id === activeSection)?.label || 'Settings'
          }
        </h2>

        {activeSection === 'main' && (
          <button
            onClick={onReset}
            className="reset-button"
            aria-label="Reset to defaults"
            title="Reset to defaults"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="sidebar-content">
        {renderSectionContent()}
      </div>

      {/* Footer Info */}
      {activeSection === 'main' && (
        <div className="sidebar-footer">
          <p className="text-xs text-gray-500 text-center">
            Customizing: <strong>Active Theme</strong>
          </p>
        </div>
      )}
    </div>
  );
};

export default CustomizerSidebar;