import React, { useState, useCallback, useRef, useEffect } from 'react';
import { X, Save, RotateCcw, Monitor, Tablet, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateCSS } from './utils/css-generator';
import { getDefaultSettings } from './utils/default-settings';
import { AstraCustomizerSettings, PreviewDevice } from './types/customizer-types';
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
  // Simple state management
  const [settings, setSettings] = useState<AstraCustomizerSettings>(() => getDefaultSettings());
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  
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
  }, [settings, injectCSS]);

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
    injectCSS();
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
        </div>

        <div className="flex items-center gap-2">
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
        {/* Settings Panel */}
        <div className="w-80 border-r border-gray-200 overflow-y-auto p-4">
          <div className="space-y-6">
            {/* Site Title */}
            <div className="space-y-3">
              <h3 className="font-medium">사이트 제목</h3>
              <div>
                <label className="block text-sm text-gray-600 mb-1">제목</label>
                <input
                  type="text"
                  value={settings.siteIdentity.siteTitle.text}
                  onChange={(e) => updateSetting('siteIdentity', e.target.value, ['siteTitle', 'text'])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">색상</label>
                <input
                  type="color"
                  value={settings.siteIdentity.siteTitle.color.normal}
                  onChange={(e) => updateSetting('siteIdentity', { normal: e.target.value }, ['siteTitle', 'color'])}
                  className="w-full h-10 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            {/* Colors */}
            <div className="space-y-3">
              <h3 className="font-medium">색상</h3>
              <div>
                <label className="block text-sm text-gray-600 mb-1">기본 색상</label>
                <input
                  type="color"
                  value={settings.colors.primaryColor}
                  onChange={(e) => updateSetting('colors', { primaryColor: e.target.value })}
                  className="w-full h-10 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">보조 색상</label>
                <input
                  type="color"
                  value={settings.colors.secondaryColor}
                  onChange={(e) => updateSetting('colors', { secondaryColor: e.target.value })}
                  className="w-full h-10 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">텍스트 색상</label>
                <input
                  type="color"
                  value={settings.colors.textColor}
                  onChange={(e) => updateSetting('colors', { textColor: e.target.value })}
                  className="w-full h-10 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            {/* Container Width */}
            <div className="space-y-3">
              <h3 className="font-medium">레이아웃</h3>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  컨테이너 너비: {settings.container.width.desktop}px
                </label>
                <input
                  type="range"
                  min="800"
                  max="1400"
                  step="50"
                  value={settings.container.width.desktop}
                  onChange={(e) => updateSetting('container', { 
                    desktop: parseInt(e.target.value),
                    tablet: Math.min(992, parseInt(e.target.value)),
                    mobile: 544
                  }, ['width'])}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>

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