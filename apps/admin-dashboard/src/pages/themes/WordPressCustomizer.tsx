/**
 * WordPressCustomizer - WordPress-style theme customizer
 * Implements real-time preview with iframe communication
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Monitor, 
  Tablet, 
  Smartphone,
  X,
  Check,
  Loader2,
  RotateCcw,
  Eye,
  EyeOff
} from 'lucide-react';
import { CustomizerSidebar } from './components/CustomizerSidebar';
import { CustomizerPreview } from './components/CustomizerPreview';
import { useCustomizerState } from './hooks/useCustomizerState';
import { usePostMessage } from './hooks/usePostMessage';
import { useAutoSave } from './hooks/useAutoSave';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import './wordpressCustomizer.css';

export interface CustomizerSettings {
  siteIdentity: {
    logo?: string;
    siteTitle: string;
    tagline: string;
    favicon?: string;
  };
  colors: {
    backgroundColor: string;
    textColor: string;
    linkColor: string;
    accentColor: string;
    headerBackgroundColor: string;
    headerTextColor: string;
    darkMode: boolean;
  };
  menus: {
    primaryMenu?: string;
    footerMenu?: string;
    socialMenu?: string;
  };
  backgroundImage: {
    url?: string;
    preset: 'default' | 'fill' | 'fit' | 'repeat' | 'custom';
    position: string;
    size: string;
    repeat: string;
    attachment: string;
  };
  additionalCss: string;
  homepage: {
    showOnFront: 'posts' | 'page';
    pageOnFront?: string;
    pageForPosts?: string;
  };
}

type DevicePreview = 'desktop' | 'tablet' | 'mobile';
type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

export const WordPressCustomizer: React.FC = () => {
  const navigate = useNavigate();
  const previewRef = useRef<HTMLIFrameElement>(null);
  
  // State management
  const [devicePreview, setDevicePreview] = useState<DevicePreview>('desktop');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [showPreview, setShowPreview] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Custom hooks
  const {
    settings,
    updateSettings,
    resetSettings,
    loadSettings,
    hasChanges
  } = useCustomizerState();

  const { sendMessage, onMessage } = usePostMessage(previewRef);
  
  const { autoSave, cancelAutoSave } = useAutoSave(
    settings,
    hasChanges,
    (status) => setSaveStatus(status)
  );

  // Handle settings change
  const handleSettingsChange = useCallback((
    section: keyof CustomizerSettings,
    updates: any
  ) => {
    updateSettings(section, updates);
    
    // Send update to preview
    sendMessage({
      type: 'updateSettings',
      section,
      data: updates
    });

    setSaveStatus('unsaved');
  }, [updateSettings, sendMessage]);

  // Handle publish
  const handlePublish = async () => {
    setIsPublishing(true);
    setSaveStatus('saving');
    
    try {
      // API call to save settings
      const response = await fetch('/api/v1/themes/customizer/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (!response.ok) throw new Error('Failed to publish');

      setSaveStatus('saved');
      toast.success('Changes published successfully!');
    } catch (error) {
      setSaveStatus('error');
      toast.error('Failed to publish changes');
      console.error('Publish error:', error);
    } finally {
      setIsPublishing(false);
    }
  };

  // Handle close
  const handleClose = () => {
    if (hasChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to leave?'
      );
      if (!confirmed) return;
    }
    
    cancelAutoSave();
    navigate('/themes');
  };

  // Device preview classes
  const getDeviceClasses = () => {
    switch (devicePreview) {
      case 'tablet':
        return 'max-w-[768px] mx-auto';
      case 'mobile':
        return 'max-w-[375px] mx-auto';
      default:
        return 'w-full';
    }
  };

  // Initialize
  useEffect(() => {
    loadSettings();
    
    // Setup message listener
    const cleanup = onMessage((event) => {
      if (event.data.type === 'previewReady') {
        // Send initial settings to preview
        sendMessage({
          type: 'initSettings',
          data: settings
        });
      }
    });

    return cleanup;
  }, []);

  return (
    <div className="wp-customizer">
      {/* Header */}
      <div className="wp-customizer-header">
        <button
          onClick={handleClose}
          className="wp-customizer-close"
          aria-label="Close customizer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="wp-customizer-actions">
          {/* Device Preview Switcher */}
          <div className="device-switcher">
            <button
              onClick={() => setDevicePreview('desktop')}
              className={`device-btn ${devicePreview === 'desktop' ? 'active' : ''}`}
              aria-label="Desktop preview"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDevicePreview('tablet')}
              className={`device-btn ${devicePreview === 'tablet' ? 'active' : ''}`}
              aria-label="Tablet preview"
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDevicePreview('mobile')}
              className={`device-btn ${devicePreview === 'mobile' ? 'active' : ''}`}
              aria-label="Mobile preview"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>

          {/* Preview Toggle */}
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="preview-toggle"
            aria-label={showPreview ? 'Hide preview' : 'Show preview'}
          >
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>

          {/* Save Status */}
          <div className="save-status">
            {saveStatus === 'saving' && (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <Check className="w-4 h-4 text-green-600" />
                <span>Saved</span>
              </>
            )}
            {saveStatus === 'unsaved' && (
              <span className="text-orange-600">Unsaved changes</span>
            )}
          </div>

          {/* Publish Button */}
          <Button
            onClick={handlePublish}
            disabled={!hasChanges || isPublishing}
            className="wp-btn-primary"
          >
            {isPublishing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Publishing...
              </>
            ) : (
              'Publish'
            )}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="wp-customizer-body">
        {/* Sidebar */}
        <CustomizerSidebar
          settings={settings}
          onSettingsChange={handleSettingsChange}
          onReset={resetSettings}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        />

        {/* Preview */}
        {showPreview && (
          <div className={`wp-customizer-preview ${devicePreview}`}>
            <div className={getDeviceClasses()}>
              <CustomizerPreview
                ref={previewRef}
                settings={settings}
                devicePreview={devicePreview}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WordPressCustomizer;