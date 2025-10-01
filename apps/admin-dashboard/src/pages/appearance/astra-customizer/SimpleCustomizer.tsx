import React, { useState, useCallback, useRef, useEffect } from 'react';
import { X, Save, RotateCcw, Monitor, Tablet, Smartphone, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateCSS } from './utils/css-generator';
import { getDefaultSettings } from './utils/default-settings';
import { AstraCustomizerSettings, PreviewDevice, SettingSection } from './types/customizer-types';

// Import Astra sections
import { SiteIdentitySection } from './sections/global/SiteIdentitySection';
import { ColorsSection } from './sections/global/ColorsSection';
import { TypographySection } from './sections/global/TypographySection';
import { ContainerSection } from './sections/layout/ContainerSection';
import { HeaderLayoutSection } from './sections/header/HeaderLayoutSection';
import { FooterSection } from './sections/footer/FooterSection';

import './styles/controls.css';
import './styles/sections.css';

interface SimpleCustomizerProps {
  onClose: () => void;
  onSave?: (settings: AstraCustomizerSettings) => Promise<boolean>;
  previewUrl?: string;
  siteName?: string;
}

export const SimpleCustomizer: React.FC<SimpleCustomizerProps> = ({
  onClose,
  onSave,
  previewUrl = '/',
  siteName = 'Site Preview',
}) => {
  // Enhanced state management for full Astra functionality
  const [settings, setSettings] = useState<AstraCustomizerSettings>(() => getDefaultSettings());
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [activeSection, setActiveSection] = useState<SettingSection | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const cssUpdateTimeoutRef = useRef<NodeJS.Timeout>();

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
        (newSettings as any)[section] = { ...(newSettings as any)[section], ...value };
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

  // Handle save
  const handleSave = async () => {
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

  // Handle reset
  const handleReset = () => {
    if (window.confirm('모든 설정을 기본값으로 되돌리시겠습니까?')) {
      setSettings(getDefaultSettings());
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
  ] as const;

  // Context for sections to use
  const customizerContext = {
    settings,
    updateSetting,
    previewDevice,
  };

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

    // Render appropriate section component with context
    const SectionComponent = (() => {
      switch (activeSection) {
        case 'siteIdentity': return SiteIdentitySection;
        case 'colors': return ColorsSection;
        case 'typography': return TypographySection;
        case 'container': return ContainerSection;
        case 'header': return HeaderLayoutSection;
        case 'footer': return FooterSection;
        default: return null;
      }
    })();

    if (!SectionComponent) {
      return <div className="p-6">섹션을 찾을 수 없습니다.</div>;
    }

    // Create a simple context provider for the section
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
          <SectionComponent {...customizerContext} />
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

  return (
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
          <div className="flex items-center justify-center p-4 border-b border-gray-200">
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
          </div>

          {/* Preview Frame */}
          <div className="flex-1 flex items-center justify-center bg-gray-50 p-4">
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
          </div>
        </div>
      </div>
    </div>
  );
};