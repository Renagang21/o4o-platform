/**
 * Header Builder Page
 * Standalone header builder extracted from Astra Customizer
 */

import React, { useState, useEffect } from 'react';
import { HeaderBuilder } from '../astra-customizer/components/HeaderBuilder';
import { HeaderBuilderLayout, StickyHeaderSettings, MobileHeaderSettings } from './types/header-types';
import { StickyHeaderPanel } from '../astra-customizer/components/panels/StickyHeaderPanel';
import { MobileHeaderPanel } from '../astra-customizer/components/panels/MobileHeaderPanel';
import { Layout, Menu, Smartphone } from 'lucide-react';
import { authClient } from '@o4o/auth-client';

export const HeaderBuilderPage: React.FC = () => {
  const [layout, setLayout] = useState<HeaderBuilderLayout | null>(null);
  const [stickySettings, setStickySettings] = useState<StickyHeaderSettings | null>(null);
  const [mobileSettings, setMobileSettings] = useState<MobileHeaderSettings | null>(null);
  const [activeTab, setActiveTab] = useState<'builder' | 'sticky' | 'mobile'>('builder');
  const [currentDevice, setCurrentDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Load settings from API
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await authClient.api.get('/settings/header-builder');
        if (response.data.success && response.data.data) {
          const data = response.data.data;
          setLayout(data.builder || getDefaultLayout());
          setStickySettings(data.sticky || getDefaultStickySettings());
          setMobileSettings(data.mobile || getDefaultMobileSettings());
        } else {
          // Initialize with defaults
          setLayout(getDefaultLayout());
          setStickySettings(getDefaultStickySettings());
          setMobileSettings(getDefaultMobileSettings());
        }
      } catch (error) {
        console.error('Failed to load header builder settings:', error);
        // Initialize with defaults on error
        setLayout(getDefaultLayout());
        setStickySettings(getDefaultStickySettings());
        setMobileSettings(getDefaultMobileSettings());
      }
    };

    loadSettings();
  }, []);

  // Save settings to API
  const handleSave = async () => {
    if (!layout) return;

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const response = await authClient.api.post('/settings/header-builder', {
        builder: layout,
        sticky: stickySettings,
        mobile: mobileSettings,
      });

      if (response.data.success) {
        setSaveMessage('Settings saved successfully!');
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        throw new Error(response.data.error || 'Failed to save');
      }
    } catch (error) {
      console.error('Failed to save header builder settings:', error);
      setSaveMessage('Error: Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (!layout) {
    return (
      <div className="header-builder-page">
        <div className="loading-state">Loading Header Builder...</div>
      </div>
    );
  }

  return (
    <div className="header-builder-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Header Builder</h1>
          <p className="page-description">
            Build your custom header layout with drag-and-drop modules
          </p>
        </div>
        <div className="page-actions">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="save-button"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div className={`save-message ${saveMessage.startsWith('Error') ? 'error' : 'success'}`}>
          {saveMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="builder-tabs">
        <button
          onClick={() => setActiveTab('builder')}
          className={`tab-button ${activeTab === 'builder' ? 'active' : ''}`}
        >
          <Layout size={16} />
          <span>Builder</span>
        </button>
        <button
          onClick={() => setActiveTab('sticky')}
          className={`tab-button ${activeTab === 'sticky' ? 'active' : ''}`}
        >
          <Menu size={16} />
          <span>Sticky Header</span>
        </button>
        <button
          onClick={() => setActiveTab('mobile')}
          className={`tab-button ${activeTab === 'mobile' ? 'active' : ''}`}
        >
          <Smartphone size={16} />
          <span>Mobile Header</span>
        </button>
      </div>

      {/* Content */}
      <div className="builder-content">
        {activeTab === 'builder' && (
          <HeaderBuilder
            layout={layout}
            onChange={setLayout}
            device={currentDevice}
          />
        )}

        {activeTab === 'sticky' && stickySettings && (
          <StickyHeaderPanel
            settings={stickySettings}
            onChange={setStickySettings}
          />
        )}

        {activeTab === 'mobile' && mobileSettings && (
          <MobileHeaderPanel
            settings={mobileSettings}
            onChange={setMobileSettings}
          />
        )}
      </div>

      <style>{`
        .header-builder-page {
          max-width: 1400px;
          margin: 0 auto;
          padding: 24px;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid #e0e0e0;
        }

        .page-title {
          margin: 0 0 4px 0;
          font-size: 28px;
          font-weight: 600;
          color: #1a1a1a;
        }

        .page-description {
          margin: 0;
          font-size: 14px;
          color: #666;
        }

        .page-actions {
          display: flex;
          gap: 12px;
        }

        .save-button {
          padding: 10px 20px;
          background: #2196F3;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .save-button:hover:not(:disabled) {
          background: #1976D2;
        }

        .save-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .save-message {
          padding: 12px 16px;
          margin-bottom: 16px;
          border-radius: 6px;
          font-size: 14px;
        }

        .save-message.success {
          background: #e8f5e9;
          color: #2e7d32;
          border: 1px solid #a5d6a7;
        }

        .save-message.error {
          background: #ffebee;
          color: #c62828;
          border: 1px solid #ef9a9a;
        }

        .builder-tabs {
          display: flex;
          gap: 4px;
          margin-bottom: 24px;
          border-bottom: 2px solid #e0e0e0;
        }

        .tab-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          margin-bottom: -2px;
          color: #666;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .tab-button:hover {
          color: #2196F3;
          background: #f5f5f5;
        }

        .tab-button.active {
          color: #2196F3;
          border-bottom-color: #2196F3;
        }

        .builder-content {
          background: white;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
          min-height: 600px;
        }

        .loading-state {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 400px;
          font-size: 16px;
          color: #666;
        }
      `}</style>
    </div>
  );
};

// Default layouts
function getDefaultLayout(): HeaderBuilderLayout {
  return {
    above: {
      left: [],
      center: [],
      right: [],
      settings: {
        enabled: false,
        height: { desktop: 40, tablet: 40, mobile: 40 },
        background: '#f8f9fa',
      }
    },
    primary: {
      left: [{ id: 'logo-1', type: 'logo', label: 'Logo', settings: { visibility: { desktop: true, tablet: true, mobile: true } } }],
      center: [],
      right: [{ id: 'menu-1', type: 'primary-menu', label: 'Primary Menu', settings: { visibility: { desktop: true, tablet: true, mobile: true } } }],
      settings: {
        height: { desktop: 70, tablet: 60, mobile: 60 },
        background: '#ffffff',
      }
    },
    below: {
      left: [],
      center: [],
      right: [],
      settings: {
        enabled: false,
        height: { desktop: 40, tablet: 40, mobile: 40 },
        background: '#f8f9fa',
      }
    }
  };
}

function getDefaultStickySettings(): StickyHeaderSettings {
  return {
    enabled: false,
    triggerHeight: 100,
    stickyOn: ['primary'],
    shrinkEffect: false,
    shrinkHeight: { desktop: 60, tablet: 50, mobile: 50 },
    backgroundOpacity: 0.95,
    boxShadow: true,
    shadowIntensity: 'medium',
    animationDuration: 300,
    hideOnScrollDown: false,
    zIndex: 1000,
  };
}

function getDefaultMobileSettings(): MobileHeaderSettings {
  return {
    enabled: true,
    breakpoint: 768,
    hamburgerStyle: 'default',
    menuPosition: 'left',
    menuAnimation: 'slide',
    overlayEnabled: true,
    overlayOpacity: 0.5,
    submenuStyle: 'accordion',
    closeOnItemClick: true,
    swipeToClose: true,
  };
}
