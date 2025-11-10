import React, { useState, useCallback, useEffect } from 'react';
import { X, Save, RotateCcw, Monitor, Tablet, Smartphone, ChevronRight, ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDefaultSettings } from './utils/default-settings';
import { normalizeCustomizerSettings } from './utils/normalize-settings';
import { AstraCustomizerSettings, PreviewDevice, SettingSection } from './types/customizer-types';
// Removed: convertSettingsToHeaderTemplatePart (now handled by backend)
import toast from 'react-hot-toast';

// Import Astra sections and context
import { SiteIdentitySection } from './sections/global/SiteIdentitySection';
import { ColorsSection } from './sections/global/ColorsSection';
import { TypographySection } from './sections/global/TypographySection';
import { ContainerSection } from './sections/layout/ContainerSection';
import { HeaderLayoutSection } from './sections/header/HeaderLayoutSection';
import { FooterSection } from './sections/footer/FooterSection';
import { GeneralSection } from './sections/general/GeneralSection';
import { BlogSection } from './sections/blog/BlogSection';
import { CustomCSSSection } from './sections/advanced/CustomCSSSection';
import { CustomizerProvider } from './context/CustomizerContext';
import { HeaderBuilder } from './components/HeaderBuilder';
import { FooterBuilder } from './components/FooterBuilder';
import { PresetManager } from './components/PresetManager';

import './styles/controls.css';
import './styles/sections.css';

interface SimpleCustomizerProps {
  onClose: () => void;
  onSave?: (settings: AstraCustomizerSettings) => Promise<boolean>;
  onReloadSettings?: () => Promise<void>;  // Function to reload settings without page refresh
  previewUrl?: string;
  siteName?: string;
  initialSettings?: AstraCustomizerSettings;
}

export const SimpleCustomizer: React.FC<SimpleCustomizerProps> = ({
  onClose,
  onSave,
  onReloadSettings,
  previewUrl = '/',
  siteName = 'Site Preview',
  initialSettings,
}) => {
  // Enhanced state management for full Astra functionality
  const [settings, setSettings] = useState<AstraCustomizerSettings>(() => {
    if (!initialSettings) {
      return getDefaultSettings();
    }
    // Ensure header.builder and footer.widgets exist by merging with defaults
    const defaults = getDefaultSettings();
    return {
      ...defaults,
      ...initialSettings,
      header: {
        ...defaults.header,
        ...initialSettings.header,
        builder: initialSettings.header?.builder || defaults.header.builder
      },
      footer: {
        ...defaults.footer,
        ...initialSettings.footer,
        widgets: {
          ...defaults.footer.widgets,
          ...initialSettings.footer?.widgets
        },
        bottomBar: {
          ...defaults.footer.bottomBar,
          ...initialSettings.footer?.bottomBar
        }
      }
    };
  });
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [activeSection, setActiveSection] = useState<SettingSection | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showHeaderBuilderOverlay, setShowHeaderBuilderOverlay] = useState(false);
  const [showFooterBuilderOverlay, setShowFooterBuilderOverlay] = useState(false);

  // Auto-show builder overlays when header/footer sections are active
  useEffect(() => {
    if (activeSection === 'header') {
      setShowHeaderBuilderOverlay(true);
      setShowFooterBuilderOverlay(false);
    } else if (activeSection === 'footer') {
      setShowFooterBuilderOverlay(true);
      setShowHeaderBuilderOverlay(false);
    } else {
      setShowHeaderBuilderOverlay(false);
      setShowFooterBuilderOverlay(false);
    }
  }, [activeSection]);

  // Simple setting update with deep cloning for all updates
  const updateSetting = useCallback((section: keyof AstraCustomizerSettings, value: any, path?: string[]) => {
    setSettings(prev => {
      const newSettings = { ...prev };

      if (path && path.length > 0) {
        // Deep clone the section to avoid mutating the previous state
        const sectionClone = JSON.parse(JSON.stringify(newSettings[section]));

        let target: any = sectionClone;
        for (let i = 0; i < path.length - 1; i++) {
          target = target[path[i]];
        }
        target[path[path.length - 1]] = value;

        (newSettings as any)[section] = sectionClone;
      } else {
        // For path-less updates (e.g., HeaderBuilder, FooterBuilder)
        // Simply deep clone and assign the value directly
        // DO NOT use spread operator as it can create numeric keys from strings
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          // Deep clone the value to avoid mutations
          (newSettings as any)[section] = JSON.parse(JSON.stringify(value));
        } else {
          // For non-objects (string, number, array, etc.), directly assign
          (newSettings as any)[section] = value;
        }
      }

      return newSettings;
    });
    setIsDirty(true);
  }, []);

  // Handle save (stores settings in customizer settings table)
  // Backend automatically syncs to template parts via settingsService
  const handleSave = async () => {
    if (!onSave) {
      toast.error('저장 함수가 정의되지 않았습니다.');
      return;
    }

    setIsSaving(true);
    try {
      const success = await onSave(settings);
      if (success) {
        setIsDirty(false);
        toast.success('설정이 저장되었습니다');
      } else {
        toast.error('설정 저장에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.response?.data?.error || error?.message || '저장에 실패했습니다';
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // Note: publishToTemplateParts and handlePublish removed
  // Backend automatically syncs customizer settings to template parts
  // via settingsService.syncTemplatePartsFromCustomizer()

  // Handle reset
  const handleReset = () => {
    if (window.confirm('모든 설정을 기본값으로 되돌리시겠습니까?')) {
      // Always normalize default settings to ensure type safety
      // This prevents TypeError when accessing nested properties like 'desktop'
      const defaults = getDefaultSettings();
      const normalized = normalizeCustomizerSettings(defaults);
      setSettings(normalized);
      setIsDirty(true);
    }
  };

  // Open preview in new tab
  const handleOpenPreview = () => {
    window.open(previewUrl, '_blank');
  };

  // Define sections with icons and labels
  const sections = [
    { key: 'siteIdentity', label: '사이트 정보', icon: '🏠' },
    { key: 'colors', label: '색상', icon: '🎨' },
    { key: 'typography', label: '글꼴', icon: '📝' },
    { key: 'container', label: '레이아웃', icon: '📐' },
    { key: 'header', label: '헤더', icon: '🔝' },
    { key: 'footer', label: '푸터', icon: '🔻' },
    { key: 'blog', label: '블로그', icon: '📰' },
    { key: 'customCSS', label: 'Custom CSS', icon: '💅' },
    { key: 'general', label: '일반 설정', icon: '⚙️' },
  ] as const;

  // Render section content
  const renderSectionContent = () => {
    if (!activeSection) {
      return (
        <div className="p-6 text-center">
          <h2 className="text-xl font-medium mb-4">Astra 사용자 정의하기</h2>
          <p className="text-gray-600 mb-6">
            왼쪽 메뉴에서 섹션을 선택하여 사이트를 사용자 정의하세요.
          </p>
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
            {sections.map((section) => (
              <button
                key={section.key}
                onClick={() => setActiveSection(section.key as SettingSection)}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
              >
                <div className="text-2xl mb-2">{section.icon}</div>
                <div className="text-sm font-medium">{section.label}</div>
              </button>
            ))}
          </div>
        </div>
      );
    }

    // Render appropriate section component without complex context dependencies
    const renderSection = () => {
      switch (activeSection) {
        case 'siteIdentity': return <SiteIdentitySection />;
        case 'colors': return <ColorsSection />;
        case 'typography': return <TypographySection />;
        case 'container': return <ContainerSection />;
        case 'header': return <HeaderLayoutSection />;
        case 'footer': return <FooterSection />;
        case 'blog': return <BlogSection />;
        case 'customCSS': return <CustomCSSSection />;
        case 'general': return <GeneralSection />;
        default: return <div className="p-6">섹션을 찾을 수 없습니다.</div>;
      }
    };

    return (
      <div className="h-full overflow-y-auto">
        <div className="p-4 border-b border-gray-200 flex items-center gap-3">
          <button
            onClick={() => setActiveSection(null)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <ChevronLeft size={16} />
          </button>
          <h2 className="font-medium">
            {sections.find(s => s.key === activeSection)?.label}
          </h2>
        </div>
        <div className="p-4">
          {renderSection()}
        </div>
      </div>
    );
  };


  const handleSaveWrapper = async () => {
    if (!onSave) return;
    
    setIsSaving(true);
    try {
      const success = await onSave(settings);
      if (success) {
        setIsDirty(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <CustomizerProvider
      initialSettings={settings as any}
      previewUrl={previewUrl}
      eventHandlers={{
        onSave: handleSaveWrapper,
        onSettingChange: (section, value) => {
          // Update local state when context changes
          updateSetting(section as keyof AstraCustomizerSettings, value);
          // CRITICAL FIX: Mark as dirty when settings change
          setIsDirty(true);
        }
      }}
    >
      <div className="fixed inset-0 bg-white z-50">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-md"
            >
              <X size={20} />
            </button>
            <h1 className="text-lg font-medium">사용자 정의하기</h1>
            {activeSection && (
              <span className="text-sm text-gray-500">
                › {sections.find(s => s.key === activeSection)?.label}
              </span>
            )}
          </div>

          {/* Preset Manager */}
          <PresetManager
            currentSettings={settings}
            onPresetApplied={async () => {
              // Reload settings without page refresh
              if (onReloadSettings) {
                await onReloadSettings();
                toast.success('프리셋이 적용되었습니다.');
              }
            }}
          />

          <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-2 hover:bg-gray-100 rounded-md md:hidden"
          >
            {showSidebar ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={isSaving}
          >
            <RotateCcw size={16} />
            초기화
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            size="sm"
          >
            <Save size={16} />
            {isSaving ? '저장 중...' : '저장'}
          </Button>
          </div>
        </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Sidebar */}
        {showSidebar && (
          <div className="w-80 border-r border-gray-200 bg-gray-50">
            {activeSection ? (
              renderSectionContent()
            ) : (
              <div className="p-4">
                <h3 className="font-medium mb-4">사용자 정의 옵션</h3>
                <div className="space-y-1">
                  {sections.map((section) => (
                    <button
                      key={section.key}
                      onClick={() => setActiveSection(section.key as SettingSection)}
                      className="w-full flex items-center gap-3 p-3 text-left hover:bg-white rounded-lg transition-colors"
                    >
                      <span className="text-lg">{section.icon}</span>
                      <span className="font-medium">{section.label}</span>
                      <ChevronRight size={16} className="ml-auto text-gray-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Preview Panel */}
        <div className="flex-1 flex flex-col">
          {/* Device Controls */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              {(['desktop', 'tablet', 'mobile'] as const).map((device) => (
                <button
                  key={device}
                  onClick={() => setPreviewDevice(device)}
                  className={`p-2 rounded-md ${
                    previewDevice === device
                      ? 'bg-blue-100 text-blue-600'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  {device === 'desktop' && <Monitor size={20} />}
                  {device === 'tablet' && <Tablet size={20} />}
                  {device === 'mobile' && <Smartphone size={20} />}
                </button>
              ))}
            </div>

            {/* Header Builder Toggle - Only show when header section is active */}
            {activeSection === 'header' && (
              <button
                onClick={() => setShowHeaderBuilderOverlay(!showHeaderBuilderOverlay)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  showHeaderBuilderOverlay
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>🔝</span>
                <span>헤더 빌더</span>
                {showHeaderBuilderOverlay ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronUp size={16} />
                )}
              </button>
            )}

            {/* Footer Builder Toggle - Only show when footer section is active */}
            {activeSection === 'footer' && (
              <button
                onClick={() => setShowFooterBuilderOverlay(!showFooterBuilderOverlay)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  showFooterBuilderOverlay
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>🔻</span>
                <span>푸터 빌더</span>
                {showFooterBuilderOverlay ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronUp size={16} />
                )}
              </button>
            )}
          </div>

          {/* Preview Frame */}
          <div className="flex-1 flex items-center justify-center bg-gray-50 p-4 relative">
            <div className="flex flex-col items-center justify-center gap-6 max-w-md text-center">
              <div className="text-6xl">👁️</div>
              <div>
                <h3 className="text-xl font-semibold mb-2">미리보기</h3>
                <p className="text-gray-600 mb-4">
                  변경사항을 저장한 후 프론트엔드 사이트에서 확인하세요.
                </p>
              </div>
              <Button
                onClick={handleOpenPreview}
                size="lg"
                className="gap-2"
              >
                <Monitor size={20} />
                새 탭에서 사이트 열기
              </Button>
              <p className="text-sm text-gray-500">
                설정 변경은 "저장" 버튼을 누른 후 자동으로 반영됩니다.
              </p>
            </div>

            {/* Header Builder Overlay - Astra Style */}
            {showHeaderBuilderOverlay && (
              <div className="absolute bottom-0 left-0 right-0 bg-white border-t-2 border-gray-300 shadow-2xl"
                style={{
                  maxHeight: '500px',
                  height: '450px',
                  transition: 'transform 0.3s ease-out',
                  transform: showHeaderBuilderOverlay ? 'translateY(0)' : 'translateY(100%)'
                }}
              >
                <div className="flex items-center justify-between px-4 py-2 bg-gray-100 border-b">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <span>🔝</span>
                    헤더 빌더 - 모듈을 추가하거나 제거하세요
                  </h3>
                  <button
                    onClick={() => setShowHeaderBuilderOverlay(false)}
                    className="p-1 hover:bg-gray-200 rounded"
                    title="빌더 닫기"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
                <div className="h-[calc(100%-44px)] overflow-y-auto">
                  <HeaderBuilder
                    layout={settings.header.builder}
                    onChange={(newLayout) => {
                      updateSetting('header', { ...settings.header, builder: newLayout });
                    }}
                    device={previewDevice}
                  />
                </div>
              </div>
            )}

            {/* Footer Builder Overlay - Astra Style */}
            {showFooterBuilderOverlay && (
              <div className="absolute bottom-0 left-0 right-0 bg-white border-t-2 border-gray-300 shadow-2xl"
                style={{
                  maxHeight: '500px',
                  height: '450px',
                  transition: 'transform 0.3s ease-out',
                  transform: showFooterBuilderOverlay ? 'translateY(0)' : 'translateY(100%)'
                }}
              >
                <div className="flex items-center justify-between px-4 py-2 bg-gray-100 border-b">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <span>🔻</span>
                    푸터 빌더 - HTML 위젯으로 커스텀 콘텐츠를 추가하세요
                  </h3>
                  <button
                    onClick={() => setShowFooterBuilderOverlay(false)}
                    className="p-1 hover:bg-gray-200 rounded"
                    title="빌더 닫기"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
                <div className="h-[calc(100%-44px)] overflow-y-auto">
                  <FooterBuilder
                    layout={{
                      widgets: {
                        enabled: settings.footer.widgets?.enabled ?? true,
                        columns: (() => {
                          const columns = settings.footer.widgets?.columns;
                          if (typeof columns === 'object' && columns !== null && 'desktop' in columns) {
                            return (columns.desktop ?? 4) as 1 | 2 | 3 | 4 | 5;
                          }
                          return (columns ?? 4) as 1 | 2 | 3 | 4 | 5;
                        })(),
                        layout: [], // TODO: Map from settings.footer.widgets
                        settings: {
                          background: settings.footer.widgets?.background ?? '#333333',
                          textColor: settings.footer.widgets?.textColor ?? '#ffffff',
                          linkColor: settings.footer.widgets?.linkColor ?? { normal: '#ffffff', hover: '#0073aa' },
                          padding: settings.footer.widgets?.padding ?? {
                            desktop: { top: 60, bottom: 60 },
                            tablet: { top: 50, bottom: 50 },
                            mobile: { top: 40, bottom: 40 }
                          }
                        }
                      },
                      bar: {
                        enabled: settings.footer.bottomBar?.enabled ?? true,
                        left: [], // TODO: Parse from bottomBar.section1
                        right: [], // TODO: Parse from bottomBar.section2
                        settings: {
                          background: settings.footer.bottomBar?.background ?? '#1a1a1a',
                          textColor: settings.footer.bottomBar?.textColor ?? '#999999',
                          linkColor: settings.footer.bottomBar?.linkColor ?? { normal: '#999999', hover: '#ffffff' },
                          padding: settings.footer.bottomBar?.padding ?? {
                            desktop: { top: 20, bottom: 20 },
                            tablet: { top: 20, bottom: 20 },
                            mobile: { top: 15, bottom: 15 }
                          }
                        }
                      }
                    }}
                    onChange={(newLayout) => {
                      // Map FooterBuilderLayout back to footer settings structure
                      updateSetting('footer', {
                        ...settings.footer,
                        widgets: {
                          ...settings.footer.widgets,
                          enabled: newLayout.widgets.enabled,
                          columns: {
                            desktop: newLayout.widgets.columns,
                            tablet: Math.min(newLayout.widgets.columns, 2),
                            mobile: 1
                          },
                          background: newLayout.widgets.settings.background,
                          textColor: newLayout.widgets.settings.textColor,
                          linkColor: newLayout.widgets.settings.linkColor,
                          padding: newLayout.widgets.settings.padding
                        },
                        bottomBar: {
                          ...settings.footer.bottomBar,
                          enabled: newLayout.bar.enabled,
                          background: newLayout.bar.settings.background,
                          textColor: newLayout.bar.settings.textColor,
                          linkColor: newLayout.bar.settings.linkColor,
                          padding: newLayout.bar.settings.padding
                        }
                      });
                    }}
                    device={previewDevice}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </CustomizerProvider>
  );
};