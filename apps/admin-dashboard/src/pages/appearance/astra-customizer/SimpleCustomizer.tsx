import React, { useState, useCallback, useRef, useEffect } from 'react';
import { X, Save, RotateCcw, Monitor, Tablet, Smartphone, ChevronRight, ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateCSS } from './utils/css-generator';
import { getDefaultSettings } from './utils/default-settings';
import { normalizeCustomizerSettings } from './utils/normalize-settings';
import { AstraCustomizerSettings, PreviewDevice, SettingSection } from './types/customizer-types';
import { convertSettingsToHeaderTemplatePart } from './utils/template-parts-converter';
import { authClient } from '@o4o/auth-client';
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

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const cssUpdateTimeoutRef = useRef<NodeJS.Timeout>();

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

  // Simple setting update
  const updateSetting = useCallback((section: keyof AstraCustomizerSettings, value: any, path?: string[]) => {
    setSettings(prev => {
      const newSettings = { ...prev };

      if (path && path.length > 0) {
        let target: any = newSettings[section];
        for (let i = 0; i < path.length - 1; i++) {
          target = target[path[i]];
        }
        target[path[path.length - 1]] = value;
      } else {
        // Only spread if value is a plain object (not string/array/null)
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          (newSettings as any)[section] = { ...(newSettings as any)[section], ...value };
        } else {
          // For non-objects (string, number, array, etc.), directly assign
          (newSettings as any)[section] = value;
        }
      }

      return newSettings;
    });
    setIsDirty(true);
  }, []);

  // Simple CSS injection
  const injectCSS = useCallback(() => {
    if (!iframeRef.current?.contentWindow) return;

    try {
      const css = generateCSS(settings);
      
      // Try direct DOM access
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        let styleEl = doc.getElementById('customizer-css');
        if (!styleEl) {
          styleEl = doc.createElement('style');
          styleEl.id = 'customizer-css';
          doc.head?.appendChild(styleEl);
        }
        styleEl.textContent = css;
      }
    } catch (error) {
      // Fallback: send via postMessage
      const css = generateCSS(settings);
      iframeRef.current?.contentWindow?.postMessage({
        type: 'customizer-css',
        css
      }, '*');
    }
  }, [settings]);

  // Debounced CSS update
  useEffect(() => {
    if (cssUpdateTimeoutRef.current) {
      clearTimeout(cssUpdateTimeoutRef.current);
    }
    
    cssUpdateTimeoutRef.current = setTimeout(() => {
      injectCSS();
    }, 200);

    return () => {
      if (cssUpdateTimeoutRef.current) {
        clearTimeout(cssUpdateTimeoutRef.current);
      }
    };
  }, [settings]);

  // Handle save (stores settings in customizer settings table AND publishes to template parts)
  const handleSave = async () => {
    if (!onSave) return;

    setIsSaving(true);
    try {
      // First save the customizer settings
      const success = await onSave(settings);
      if (success) {
        // Then automatically publish to template parts for frontend
        await publishToTemplateParts();
        setIsDirty(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Extract publish logic to reusable function
  const publishToTemplateParts = async () => {
    try {
      // Convert customizer settings to template parts format
      const headerTemplatePart = convertSettingsToHeaderTemplatePart(settings);

      // Check if default header exists and update it
      const existingResponse = await authClient.api.get('/public/template-parts');
      const existingParts = existingResponse.data?.data || [];
      const defaultHeader = existingParts.find((part: any) =>
        part.area === 'header' && part.isDefault === true
      );

      // Check if defaultHeader has valid UUID (not placeholder UUID)
      const isValidUUID = defaultHeader?.id &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(defaultHeader.id) &&
        defaultHeader.id !== 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

      if (defaultHeader && isValidUUID) {
        // Update existing default header
        const updateData = {
          ...headerTemplatePart,
          slug: defaultHeader.slug // Keep existing slug
        };
        await authClient.api.put(`/template-parts/${defaultHeader.id}`, updateData);
      } else {
        // Create new header template part
        await authClient.api.post('/template-parts', {
          ...headerTemplatePart,
          isDefault: true,
          isActive: true
        });
      }
    } catch (error: any) {
      console.error('[Customizer - Publish] Template part sync error:', error);
      // Don't throw - allow save to succeed even if template part sync fails
    }
  };

  // Handle publish (creates/updates template parts for live site)
  const handlePublish = async () => {
    setIsSaving(true);
    try {
      // Publish to template parts
      await publishToTemplateParts();

      // Also save to customizer settings
      if (onSave) {
        await onSave(settings);
      }

      setIsDirty(false);
      toast.success('헤더가 프론트엔드에 게시되었습니다');
    } catch (error: any) {
      console.error('[Customizer - Publish] 에러 발생:', error);
      console.error('[Customizer - Publish] 에러 응답:', error?.response?.data);
      const errorMessage = error?.response?.data?.message || error?.response?.data?.error || '템플릿 업데이트에 실패했습니다';
      const errorDetails = error?.response?.data?.details;
      if (errorDetails) {
        console.error('[Customizer - Publish] 에러 상세:', errorDetails);
      }
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

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

  // Handle iframe load
  const handleIframeLoad = () => {
    // Debounce iframe load injection to prevent potential loops
    if (cssUpdateTimeoutRef.current) {
      clearTimeout(cssUpdateTimeoutRef.current);
    }
    
    cssUpdateTimeoutRef.current = setTimeout(() => {
      injectCSS();
    }, 100);
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

  // Device sizes for responsive preview
  const deviceSizes = {
    desktop: { width: '100%', height: '100%' },
    tablet: { width: '768px', height: '1024px' },
    mobile: { width: '375px', height: '667px' },
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
            variant="outline"
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            size="sm"
          >
            <Save size={16} />
            임시 저장
          </Button>
          <Button
            onClick={handlePublish}
            disabled={isSaving}
            size="sm"
          >
            {isSaving ? '게시 중...' : '게시'}
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
            <div
              className="bg-white shadow-lg"
              style={{
                width: deviceSizes[previewDevice].width,
                height: deviceSizes[previewDevice].height,
                maxWidth: '100%',
                maxHeight: '100%',
              }}
            >
              <iframe
                ref={iframeRef}
                src={previewUrl}
                onLoad={handleIframeLoad}
                className="w-full h-full border-0"
                title={`${siteName} Preview`}
              />
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