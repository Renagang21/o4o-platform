import React from 'react';
import { ModuleConfig } from '../../types/customizer-types';
import { X } from 'lucide-react';
import { CommonSettings } from './CommonSettings';
import { LogoSettings } from './LogoSettings';
import { SiteTitleSettings } from './SiteTitleSettings';
import { MenuSettings } from './MenuSettings';
import { SecondaryMenuSettings } from './SecondaryMenuSettings';
import { SearchSettings } from './SearchSettings';
import { CartSettings } from './CartSettings';
import { RoleSwitcherSettings } from './RoleSwitcherSettings';
import { WidgetSettings } from './WidgetSettings';
import { ButtonSettings } from './ButtonSettings';
import { SocialIconsSettings } from './SocialIconsSettings';
import { HTMLSettings } from './HTMLSettings';

interface ModuleInspectorProps {
  module: ModuleConfig;
  onUpdate: (moduleId: string, settings: any) => void;
  onClose: () => void;
}

export const ModuleInspector: React.FC<ModuleInspectorProps> = ({
  module,
  onUpdate,
  onClose
}) => {
  const handleSettingChange = (key: string, value: any) => {
    const newSettings = {
      ...module.settings,
      [key]: value
    };
    onUpdate(module.id, newSettings);
  };

  const renderModuleSpecificSettings = () => {
    switch (module.type) {
      case 'logo':
        return <LogoSettings settings={module.settings} onChange={handleSettingChange} />;
      case 'site-title':
        return <SiteTitleSettings settings={module.settings} onChange={handleSettingChange} />;
      case 'primary-menu':
        return <MenuSettings settings={module.settings} onChange={handleSettingChange} />;
      case 'secondary-menu':
        return <SecondaryMenuSettings settings={module.settings} onChange={handleSettingChange} />;
      case 'search':
        return <SearchSettings settings={module.settings} onChange={handleSettingChange} />;
      case 'cart':
        return <CartSettings settings={module.settings} onChange={handleSettingChange} />;
      case 'role-switcher':
        return <RoleSwitcherSettings settings={module.settings} onChange={handleSettingChange} />;
      case 'widget':
        return <WidgetSettings settings={module.settings} onChange={handleSettingChange} />;
      case 'button':
        return <ButtonSettings settings={module.settings} onChange={handleSettingChange} />;
      case 'social':
        return <SocialIconsSettings settings={module.settings} onChange={handleSettingChange} />;
      case 'html':
        return <HTMLSettings settings={module.settings} onChange={handleSettingChange} />;
      default:
        return null;
    }
  };

  return (
    <div className="module-inspector">
      <div className="inspector-header">
        <div>
          <h3 className="inspector-title">
            {module.label || module.type} Settings
          </h3>
          <p className="inspector-subtitle">Configure module options</p>
        </div>
        <button className="inspector-close" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      <div className="inspector-content">
        {/* Module-specific settings */}
        {renderModuleSpecificSettings()}

        {/* Common settings - always shown */}
        <CommonSettings
          settings={module.settings}
          onChange={handleSettingChange}
        />
      </div>

      <style>{`
        .module-inspector {
          position: fixed;
          top: 0;
          right: 0;
          width: 360px;
          height: 100vh;
          background: white;
          border-left: 1px solid #e0e0e0;
          display: flex;
          flex-direction: column;
          z-index: 1000;
          box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
        }

        .inspector-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 20px;
          border-bottom: 1px solid #e0e0e0;
          background: #fafafa;
        }

        .inspector-title {
          margin: 0 0 4px 0;
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }

        .inspector-subtitle {
          margin: 0;
          font-size: 12px;
          color: #666;
        }

        .inspector-close {
          background: none;
          border: none;
          color: #666;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: background-color 0.2s;
        }

        .inspector-close:hover {
          background: #e0e0e0;
          color: #333;
        }

        .inspector-content {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }

        .inspector-section {
          margin-bottom: 24px;
          padding-bottom: 24px;
          border-bottom: 1px solid #e0e0e0;
        }

        .inspector-section:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }

        .inspector-section-title {
          margin: 0 0 16px 0;
          font-size: 14px;
          font-weight: 600;
          color: #333;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .inspector-field {
          margin-bottom: 16px;
        }

        .inspector-field:last-child {
          margin-bottom: 0;
        }

        .inspector-label {
          display: block;
          margin-bottom: 6px;
          font-size: 13px;
          font-weight: 500;
          color: #444;
        }

        .inspector-input,
        .inspector-select {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #d0d0d0;
          border-radius: 4px;
          font-size: 13px;
          transition: border-color 0.2s;
        }

        .inspector-input:focus,
        .inspector-select:focus {
          outline: none;
          border-color: #2196F3;
        }

        .inspector-input[type="number"] {
          max-width: 120px;
        }

        .inspector-help {
          margin-top: 4px;
          font-size: 11px;
          color: #888;
        }

        /* Responsive for mobile */
        @media (max-width: 768px) {
          .module-inspector {
            width: 100%;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
          }
        }
      `}</style>
    </div>
  );
};
