import React, { useState, useEffect } from 'react';
import { X, Save, RotateCcw, ChevronRight, ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDefaultSettings } from './utils/default-settings';
import { normalizeCustomizerSettings } from './utils/normalize-settings';
import { AstraCustomizerSettings, PreviewDevice, SettingSection } from './types/customizer-types';
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
import { CustomizerProvider, useCustomizer } from './context/CustomizerContext';
import { HeaderBuilder } from './components/HeaderBuilder';
import { FooterBuilder } from './components/FooterBuilder';
import { PresetManager } from './components/PresetManager';

import './styles/controls.css';
import './styles/sections.css';

interface SimpleCustomizerProps {
  onClose: () => void;
  onSave?: (settings: AstraCustomizerSettings) => Promise<boolean>;
  onReloadSettings?: () => Promise<void>;
  previewUrl?: string;
  siteName?: string;
  initialSettings?: AstraCustomizerSettings;
}

/**
 * Inner component that uses CustomizerContext
 * This component has access to the context state and functions
 */
const SimpleCustomizerInner: React.FC<SimpleCustomizerProps> = ({
  onClose,
  onSave,
  onReloadSettings,
  previewUrl = '/',
  siteName = 'Site Preview',
}) => {
  // Get state and functions from CustomizerContext
  const { state, updateSetting } = useCustomizer();
  const settings = state.settings;
  const isDirty = state.isDirty;

  const [isSaving, setIsSaving] = useState(false);
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

  // Handle save - uses Context state
  const handleSave = async () => {
    if (!onSave) {
      toast.error('저장 함수가 정의되지 않았습니다.');
      return;
    }

    setIsSaving(true);
    try {
      // Save the Context state (single source of truth)
      const success = await onSave(settings);
      if (success) {
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

  // Handle reset
  const handleReset = () => {
    if (window.confirm('모든 설정을 기본값으로 되돌리시겠습니까?')) {
      const defaults = getDefaultSettings();
      const normalized = normalizeCustomizerSettings(defaults);

      // Update each section in Context
      Object.keys(normalized).forEach((key) => {
        updateSetting(key as SettingSection, (normalized as any)[key]);
      });

      toast.success('설정이 초기화되었습니다');
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
  ];

  // Render section content
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
      default: return <div>Section not found</div>;
    }
  };

  const renderSectionContent = () => {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <button
            onClick={() => setActiveSection(null)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <ChevronLeft size={16} />
            뒤로
          </button>
          <h3 className="font-medium">
            {sections.find(s => s.key === activeSection)?.label}
          </h3>
          <div className="w-16" />
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {renderSection()}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-4">
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
          {/* Top Bar with Builder Toggles */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="text-sm text-gray-600">
              사용자 정의 설정을 변경하세요
            </div>

            {/* Header Builder Toggle */}
            {activeSection === 'header' && (
              <button
                onClick={() => setShowHeaderBuilderOverlay(!showHeaderBuilderOverlay)}
                className={`px-3 py-1.5 text-sm rounded-md ${
                  showHeaderBuilderOverlay
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {showHeaderBuilderOverlay ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                {' '}헤더 빌더 {showHeaderBuilderOverlay ? '숨기기' : '열기'}
              </button>
            )}

            {/* Footer Builder Toggle */}
            {activeSection === 'footer' && (
              <button
                onClick={() => setShowFooterBuilderOverlay(!showFooterBuilderOverlay)}
                className={`px-3 py-1.5 text-sm rounded-md ${
                  showFooterBuilderOverlay
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {showFooterBuilderOverlay ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                {' '}푸터 빌더 {showFooterBuilderOverlay ? '숨기기' : '열기'}
              </button>
            )}
          </div>

          {/* Preview Area */}
          <div className="flex-1 bg-gray-100 relative overflow-hidden">
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8 max-w-md">
                <div className="mb-6">
                  <svg className="mx-auto h-24 w-24 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">실시간 미리보기</h3>
                <p className="text-gray-600 mb-6">
                  변경사항을 저장한 후 새 탭에서 미리보기를 확인하세요
                </p>
                <Button
                  onClick={handleOpenPreview}
                  size="lg"
                  className="w-full"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  새 탭에서 미리보기
                </Button>
                <p className="text-xs text-gray-500 mt-4">
                  💡 팁: 저장 후 미리보기를 새로고침하면 변경사항을 확인할 수 있습니다
                </p>
              </div>
            </div>

            {/* Header Builder Overlay */}
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
                    device="desktop"
                  />
                </div>
              </div>
            )}

            {/* Footer Builder Overlay */}
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
                        columns: settings.footer.widgets?.columns?.desktop ?? 4,
                        areas: [], // TODO: Parse from footer.widgets
                        settings: {
                          background: settings.footer.widgets?.background ?? '#1a1a1a',
                          textColor: settings.footer.widgets?.textColor ?? '#cccccc',
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
                        left: [],
                        right: [],
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
                    device="desktop"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Wrapper component that provides CustomizerContext
 * This is the main export
 */
export const SimpleCustomizer: React.FC<SimpleCustomizerProps> = (props) => {
  const { initialSettings } = props;

  // Prepare initial settings for Context
  const preparedSettings = React.useMemo(() => {
    if (!initialSettings) {
      return getDefaultSettings();
    }
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
  }, [initialSettings]);

  return (
    <CustomizerProvider
      initialSettings={preparedSettings}
      previewUrl={props.previewUrl}
      eventHandlers={{
        onSave: props.onSave,
      }}
    >
      <SimpleCustomizerInner {...props} />
    </CustomizerProvider>
  );
};
