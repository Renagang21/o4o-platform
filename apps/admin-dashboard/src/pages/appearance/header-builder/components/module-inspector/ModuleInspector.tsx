import React from 'react';
import { ModuleConfig } from '../../types/header-types';
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
import { FaviconSettings } from './FaviconSettings';

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
      case 'favicon':
        return <FaviconSettings settings={module.settings} onChange={handleSettingChange} />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed top-0 right-0 w-96 h-full bg-white border-l border-gray-300 shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between p-5 border-b border-gray-200 bg-gray-50">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            {module.label || module.type} Settings
          </h3>
          <p className="text-xs text-gray-500 mt-1">Configure module options</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {/* Module-specific settings */}
        {renderModuleSpecificSettings()}

        {/* Common settings - always shown */}
        <CommonSettings
          settings={module.settings}
          onChange={handleSettingChange}
        />
      </div>
    </div>
  );
};
