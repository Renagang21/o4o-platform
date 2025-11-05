import React, { useState, useCallback, useMemo } from 'react';
import {
  HeaderBuilderLayout,
  HeaderModuleType,
  ModuleConfig
} from '../types/customizer-types';
import {
  Menu,
  Search,
  User,
  ShoppingCart,
  Type,
  Code,
  Box,
  Share2,
  Plus,
  X,
  Settings,
  Move
} from 'lucide-react';
import { ModuleInspector } from './module-inspector';

interface HeaderBuilderProps {
  layout: HeaderBuilderLayout;
  onChange: (layout: HeaderBuilderLayout) => void;
  device: 'desktop' | 'tablet' | 'mobile';
}

// 사용 가능한 모듈 정의
const AVAILABLE_MODULES: { type: HeaderModuleType; label: string; icon: React.ReactNode }[] = [
  { type: 'logo', label: 'Logo', icon: <Box size={16} /> },
  { type: 'site-title', label: 'Site Title', icon: <Type size={16} /> },
  { type: 'primary-menu', label: 'Primary Menu', icon: <Menu size={16} /> },
  { type: 'secondary-menu', label: 'Secondary Menu', icon: <Menu size={16} /> },
  { type: 'search', label: 'Search', icon: <Search size={16} /> },
  { type: 'account', label: 'Account', icon: <User size={16} /> },
  { type: 'role-switcher', label: 'Role Switcher', icon: <User size={16} /> },
  { type: 'cart', label: 'Cart', icon: <ShoppingCart size={16} /> },
  { type: 'button', label: 'Button', icon: <Box size={16} /> },
  { type: 'html', label: 'HTML', icon: <Code size={16} /> },
  { type: 'widget', label: 'Widget', icon: <Box size={16} /> },
  { type: 'social', label: 'Social Icons', icon: <Share2 size={16} /> },
];

export const HeaderBuilder: React.FC<HeaderBuilderProps> = React.memo(({
  layout,
  onChange,
  device
}) => {
  const [selectedModule, setSelectedModule] = useState<ModuleConfig | null>(null);
  const [showModuleSelector, setShowModuleSelector] = useState<{
    section: 'above' | 'primary' | 'below';
    column: 'left' | 'center' | 'right';
  } | null>(null);

  // 모듈 추가
  const addModule = useCallback((
    section: 'above' | 'primary' | 'below',
    column: 'left' | 'center' | 'right',
    moduleType: HeaderModuleType
  ) => {
    const newModule: ModuleConfig = {
      id: `${moduleType}-${Date.now()}`,
      type: moduleType,
      label: AVAILABLE_MODULES.find(m => m.type === moduleType)?.label,
      settings: {
        visibility: { desktop: true, tablet: true, mobile: true }
      }
    };

    const newLayout = { ...layout };
    newLayout[section][column] = [...newLayout[section][column], newModule];
    onChange(newLayout);
    setShowModuleSelector(null);
  }, [layout, onChange]);

  // 모듈 제거
  const removeModule = useCallback((
    section: 'above' | 'primary' | 'below',
    column: 'left' | 'center' | 'right',
    moduleId: string
  ) => {
    const newLayout = { ...layout };
    newLayout[section][column] = newLayout[section][column].filter(m => m.id !== moduleId);
    onChange(newLayout);
  }, [layout, onChange]);

  // 섹션 토글
  const toggleSection = useCallback((section: 'above' | 'below') => {
    const newLayout = { ...layout };
    newLayout[section].settings.enabled = !newLayout[section].settings.enabled;
    onChange(newLayout);
  }, [layout, onChange]);

  // 모듈 설정 업데이트
  const updateModuleSettings = useCallback((moduleId: string, newSettings: any) => {
    const newLayout = { ...layout };

    // 모든 섹션과 컬럼을 순회하여 해당 모듈 찾기
    (['above', 'primary', 'below'] as const).forEach(section => {
      (['left', 'center', 'right'] as const).forEach(column => {
        const moduleIndex = newLayout[section][column].findIndex(m => m.id === moduleId);
        if (moduleIndex !== -1) {
          newLayout[section][column][moduleIndex] = {
            ...newLayout[section][column][moduleIndex],
            settings: newSettings
          };
        }
      });
    });

    onChange(newLayout);
  }, [layout, onChange]);

  // 모듈 선택 핸들러
  const handleModuleClick = useCallback((module: ModuleConfig) => {
    setSelectedModule(module);
  }, []);

  // 현재 선택된 모듈 찾기 (layout에서 최신 데이터 가져오기)
  const currentSelectedModule = useMemo(() => {
    if (!selectedModule) return null;

    let found: ModuleConfig | null = null;
    (['above', 'primary', 'below'] as const).forEach(section => {
      (['left', 'center', 'right'] as const).forEach(column => {
        const module = layout[section][column].find(m => m.id === selectedModule.id);
        if (module) found = module;
      });
    });

    return found;
  }, [selectedModule, layout]);

  // 섹션 렌더링
  const renderSection = (
    sectionName: 'above' | 'primary' | 'below',
    sectionData: typeof layout.above | typeof layout.primary | typeof layout.below
  ) => {
    const isEnabled = sectionName === 'primary' || (sectionData.settings as any).enabled;
    
    return (
      <div className={`header-builder-section ${!isEnabled ? 'disabled' : ''}`}>
        <div className="section-header">
          <div className="section-title">
            {sectionName === 'above' && 'Above Header'}
            {sectionName === 'primary' && 'Primary Header'}
            {sectionName === 'below' && 'Below Header'}
          </div>
          {sectionName !== 'primary' && (
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={(sectionData.settings as any).enabled}
                onChange={() => toggleSection(sectionName as 'above' | 'below')}
              />
              <span className="toggle-slider"></span>
            </label>
          )}
        </div>

        {isEnabled && (
          <div className="section-columns">
            {(['left', 'center', 'right'] as const).map(column => (
              <div key={column} className="column">
                <div className="column-header">{column.charAt(0).toUpperCase() + column.slice(1)}</div>
                <div className="column-content">
                  {sectionData[column].map((module) => (
                    <div
                      key={module.id}
                      className={`module-item ${selectedModule?.id === module.id ? 'selected' : ''}`}
                      onClick={() => handleModuleClick(module)}
                    >
                      <span className="module-icon">
                        {AVAILABLE_MODULES.find(m => m.type === module.type)?.icon}
                      </span>
                      <span className="module-label">{module.label}</span>
                      <button
                        className="module-settings"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleModuleClick(module);
                        }}
                        title="Module settings"
                      >
                        <Settings size={14} />
                      </button>
                      <button
                        className="module-remove"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeModule(sectionName, column, module.id);
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    className="add-module-btn"
                    onClick={() => setShowModuleSelector({ section: sectionName, column })}
                  >
                    <Plus size={14} /> Add Module
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="header-builder">
      <div className="header-builder-container">
        {renderSection('above', layout.above)}
        {renderSection('primary', layout.primary)}
        {renderSection('below', layout.below)}
      </div>

      {/* Module Selector Modal */}
      {showModuleSelector && (
        <div className="module-selector-overlay" onClick={() => setShowModuleSelector(null)}>
          <div className="module-selector-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Select a Module</h3>
              <button onClick={() => setShowModuleSelector(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-content">
              <div className="modules-grid">
                {AVAILABLE_MODULES.map(module => (
                  <button
                    key={module.type}
                    className="module-option"
                    onClick={() => addModule(
                      showModuleSelector.section,
                      showModuleSelector.column,
                      module.type
                    )}
                  >
                    <div className="module-option-icon">{module.icon}</div>
                    <div className="module-option-label">{module.label}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Module Inspector Panel */}
      {currentSelectedModule && (
        <ModuleInspector
          module={currentSelectedModule}
          onUpdate={updateModuleSettings}
          onClose={() => setSelectedModule(null)}
        />
      )}

      <style>{`
        .header-builder {
          padding: 20px;
        }

        .header-builder-container {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          overflow: hidden;
        }

        .header-builder-section {
          border-bottom: 1px solid #e0e0e0;
        }

        .header-builder-section:last-child {
          border-bottom: none;
        }

        .header-builder-section.disabled {
          opacity: 0.5;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #f5f5f5;
        }

        .section-title {
          font-weight: 600;
          font-size: 14px;
        }

        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
        }

        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: .4s;
          border-radius: 24px;
        }

        .toggle-switch input:checked + .toggle-slider {
          background-color: #2196F3;
        }

        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
        }

        .toggle-switch input:checked + .toggle-slider:before {
          transform: translateX(20px);
        }

        .section-columns {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 1px;
          background: #e0e0e0;
        }

        .column {
          background: white;
        }

        .column-header {
          padding: 8px 12px;
          background: #fafafa;
          font-size: 12px;
          font-weight: 500;
          text-transform: uppercase;
          color: #666;
          border-bottom: 1px solid #e0e0e0;
        }

        .column-content {
          min-height: 80px;
          padding: 12px;
        }

        .module-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          margin-bottom: 8px;
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .module-item:hover {
          background: #e9ecef;
          border-color: #adb5bd;
        }

        .module-item.selected {
          background: #e3f2fd;
          border-color: #2196F3;
          box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.1);
        }

        .module-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          color: #666;
        }

        .module-label {
          flex: 1;
          font-size: 13px;
        }

        .module-settings {
          background: none;
          border: none;
          color: #999;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .module-settings:hover {
          background: #dee2e6;
          color: #2196F3;
        }

        .module-remove {
          background: none;
          border: none;
          color: #999;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .module-remove:hover {
          background: #fee;
          color: #e74c3c;
        }

        .add-module-btn {
          width: 100%;
          padding: 8px;
          border: 2px dashed #dee2e6;
          border-radius: 4px;
          background: transparent;
          color: #666;
          font-size: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          transition: all 0.2s;
        }

        .add-module-btn:hover {
          border-color: #2196F3;
          color: #2196F3;
          background: #f0f8ff;
        }

        .module-selector-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .module-selector-modal {
          background: white;
          border-radius: 8px;
          width: 90%;
          max-width: 600px;
          max-height: 80vh;
          overflow: hidden;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #e0e0e0;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 18px;
        }

        .modal-header button {
          background: none;
          border: none;
          color: #666;
          cursor: pointer;
        }

        .modal-content {
          padding: 20px;
          overflow-y: auto;
          max-height: calc(80vh - 60px);
        }

        .modules-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 12px;
        }

        .module-option {
          padding: 16px;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
        }

        .module-option:hover {
          border-color: #2196F3;
          background: #f0f8ff;
        }

        .module-option-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 8px;
          color: #666;
        }

        .module-option-label {
          font-size: 12px;
          color: #333;
        }
      `}</style>
    </div>
  );
});

HeaderBuilder.displayName = 'HeaderBuilder';