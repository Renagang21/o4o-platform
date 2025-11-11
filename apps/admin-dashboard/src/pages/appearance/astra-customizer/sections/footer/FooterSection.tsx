import React, { useState, useEffect } from 'react';
import { useCustomizerState } from '../../hooks/useCustomizerState';
import { AstraColorPicker } from '../../components/controls/AstraColorPicker';
import { AstraToggle } from '../../components/controls/AstraToggle';
import { AstraSlider } from '../../components/controls/AstraSlider';
import { AstraSelect } from '../../components/controls/AstraSelect';
import { FooterBuilder } from '../../components/FooterBuilder';
import { FooterBuilderLayout } from '../../types/customizer-types';
import { Grid, Type, Layout, Columns3 } from 'lucide-react';

export const FooterSection: React.FC = () => {
  const { settings, updateSetting } = useCustomizerState();
  const footer = settings.footer;
  
  const [activeTab, setActiveTab] = useState<'builder' | 'widgets' | 'bottom'>('builder');
  const [currentDevice, setCurrentDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  
  // Initialize footer builder layout if not exists
  useEffect(() => {
    if (!footer.builder) {
      const initialLayout: FooterBuilderLayout = {
        widgets: {
          enabled: true,
          columns: 3,
          layout: [
            [{ id: 'text-1', type: 'text', label: 'About Us', settings: { title: 'About Us', content: 'Your company description here.' } }],
            [{ id: 'menu-1', type: 'menu', label: 'Quick Links', settings: { title: 'Quick Links', menuId: 'footer-menu' } }],
            [{ id: 'contact-1', type: 'contact', label: 'Contact', settings: { title: 'Contact Us', email: 'info@example.com' } }]
          ],
          settings: {
            background: '#333333',
            textColor: '#ffffff',
            linkColor: { normal: '#cccccc', hover: '#ffffff' },
            padding: { desktop: { top: 40, bottom: 40 }, tablet: { top: 30, bottom: 30 }, mobile: { top: 20, bottom: 20 } },
            gap: 30
          }
        },
        bar: {
          enabled: true,
          left: [{ id: 'copyright-1', type: 'copyright', label: 'Copyright', settings: { copyrightText: '© 2025 Your Company. All rights reserved.', showYear: true } }],
          right: [{ id: 'social-1', type: 'social', label: 'Social Icons', settings: {} }],
          settings: {
            background: '#222222',
            textColor: '#999999',
            linkColor: { normal: '#999999', hover: '#ffffff' },
            padding: { desktop: { top: 20, bottom: 20 }, tablet: { top: 15, bottom: 15 }, mobile: { top: 10, bottom: 10 } },
            alignment: 'space-between'
          }
        }
      };
      updateSetting('footer', initialLayout, ['builder']);
    }
  }, [footer.builder]);
  
  const footerLayoutOptions = [
    { value: 'footer-layout-1', label: 'Layout 1 - Equal Columns' },
    { value: 'footer-layout-2', label: 'Layout 2 - Wide First Column' },
    { value: 'footer-layout-3', label: 'Layout 3 - Wide Last Column' },
  ];
  
  const bottomBarLayoutOptions = [
    { value: 'layout-1', label: 'Layout 1 - Text Left, Menu Right' },
    { value: 'layout-2', label: 'Layout 2 - Centered Text' },
  ];
  
  return (
    <div className="astra-section footer-section">
      <div className="astra-section-title">Footer</div>
      
      {/* Footer Tabs */}
      <div className="astra-tabs">
        <button
          onClick={() => setActiveTab('builder')}
          className={`astra-tab ${activeTab === 'builder' ? 'active' : ''}`}
        >
          <Columns3 size={14} />
          Builder
        </button>
        <button
          onClick={() => setActiveTab('widgets')}
          className={`astra-tab ${activeTab === 'widgets' ? 'active' : ''}`}
        >
          <Grid size={14} />
          Footer Widgets
        </button>
        <button
          onClick={() => setActiveTab('bottom')}
          className={`astra-tab ${activeTab === 'bottom' ? 'active' : ''}`}
        >
          <Type size={14} />
          Bottom Bar
        </button>
      </div>
      
      {activeTab === 'builder' && footer.builder && (
        <>
          {/* Footer Builder */}
          <div className="astra-section-group">
            <h4 className="astra-group-title">Footer Layout Builder</h4>
            <p className="astra-control-description">
              Build your custom footer layout with widgets and modules
            </p>
            
            <FooterBuilder
              layout={footer.builder}
              onChange={(newLayout) => updateSetting('footer', newLayout, ['builder'])}
              device={currentDevice}
            />
          </div>
        </>
      )}
      
      {activeTab === 'widgets' ? (
        <>
          {/* Footer Widgets Settings */}
          <div className="astra-section-group">
            <h4 className="astra-group-title">Footer Widgets</h4>
            
            <AstraToggle
              label="Enable Footer Widgets"
              value={footer.widgets.enabled}
              onChange={(value) => updateSetting('footer', value, ['widgets', 'enabled'])}
              description="Display widget areas in the footer"
            />
            
            {footer.widgets.enabled && (
              <>
                <AstraSelect
                  label="Footer Layout"
                  value={footer.layout}
                  onChange={(value) => updateSetting('footer', value, ['layout'])}
                  options={footerLayoutOptions}
                  description="Choose footer widget layout"
                />
                
                <AstraSlider
                  label="Number of Columns"
                  value={{
                    desktop: footer.widgets.columns.desktop,
                    tablet: footer.widgets.columns.tablet,
                    mobile: footer.widgets.columns.mobile,
                  }}
                  onChange={(value) => {
                    if (typeof value === 'number') {
                      updateSetting('footer', value, ['widgets', 'columns', 'desktop']);
                    } else {
                      updateSetting('footer', value.desktop, ['widgets', 'columns', 'desktop']);
                      updateSetting('footer', value.tablet, ['widgets', 'columns', 'tablet']);
                      updateSetting('footer', value.mobile, ['widgets', 'columns', 'mobile']);
                    }
                  }}
                  min={1}
                  max={6}
                  step={1}
                  responsive={true}
                  description="Number of widget columns"
                />
                
                <AstraColorPicker
                  label="Background Color"
                  value={footer.widgets.background}
                  onChange={(value) => updateSetting('footer', value, ['widgets', 'background'])}
                  description="Footer widgets background color"
                />
                
                <AstraColorPicker
                  label="Text Color"
                  value={footer.widgets.textColor}
                  onChange={(value) => updateSetting('footer', value, ['widgets', 'textColor'])}
                  description="Footer widgets text color"
                />
                
                <AstraColorPicker
                  label="Link Color"
                  value={footer.widgets.linkColor}
                  onChange={(value) => updateSetting('footer', value, ['widgets', 'linkColor'])}
                  hasHover={true}
                  description="Footer widgets link color"
                />
              </>
            )}
          </div>
          
          {footer.widgets.enabled && (
            <div className="astra-section-group">
              <h4 className="astra-group-title">Widget Area Spacing</h4>
              
              <div className="astra-typography-group">
                <AstraSlider
                  label="Padding Top"
                  value={{
                    desktop: footer.widgets.padding.desktop.top,
                    tablet: footer.widgets.padding.tablet.top,
                    mobile: footer.widgets.padding.mobile.top,
                  }}
                  onChange={(value) => {
                    const val = typeof value === 'number' ? value : value.desktop;
                    updateSetting('footer', val, ['widgets', 'padding', 'desktop', 'top']);
                    if (typeof value !== 'number') {
                      updateSetting('footer', value.tablet, ['widgets', 'padding', 'tablet', 'top']);
                      updateSetting('footer', value.mobile, ['widgets', 'padding', 'mobile', 'top']);
                    }
                  }}
                  min={0}
                  max={200}
                  unit="px"
                  responsive={true}
                />
                
                <AstraSlider
                  label="Padding Bottom"
                  value={{
                    desktop: footer.widgets.padding.desktop.bottom,
                    tablet: footer.widgets.padding.tablet.bottom,
                    mobile: footer.widgets.padding.mobile.bottom,
                  }}
                  onChange={(value) => {
                    const val = typeof value === 'number' ? value : value.desktop;
                    updateSetting('footer', val, ['widgets', 'padding', 'desktop', 'bottom']);
                    if (typeof value !== 'number') {
                      updateSetting('footer', value.tablet, ['widgets', 'padding', 'tablet', 'bottom']);
                      updateSetting('footer', value.mobile, ['widgets', 'padding', 'mobile', 'bottom']);
                    }
                  }}
                  min={0}
                  max={200}
                  unit="px"
                  responsive={true}
                />
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Bottom Bar Settings */}
          <div className="astra-section-group">
            <h4 className="astra-group-title">Bottom Bar</h4>
            
            <AstraToggle
              label="Enable Bottom Bar"
              value={footer.bottomBar.enabled}
              onChange={(value) => updateSetting('footer', value, ['bottomBar', 'enabled'])}
              description="Display copyright/bottom bar section"
            />
            
            {footer.bottomBar.enabled && (
              <>
                <AstraSelect
                  label="Bottom Bar Layout"
                  value={footer.bottomBar.layout}
                  onChange={(value) => updateSetting('footer', value, ['bottomBar', 'layout'])}
                  options={bottomBarLayoutOptions}
                  description="Choose bottom bar layout"
                />
                
                <div className="astra-control">
                  <label className="astra-control-label">Copyright Text</label>
                  <textarea
                    value={footer.bottomBar.section1}
                    onChange={(e) => updateSetting('footer', e.target.value, ['bottomBar', 'section1'])}
                    className="astra-textarea"
                    placeholder="© 2024 Your Company. All rights reserved."
                    rows={3}
                  />
                  <span className="astra-control-description">
                    You can use HTML and shortcodes here
                  </span>
                </div>
                
                {footer.bottomBar.layout === 'layout-1' && (
                  <div className="astra-control">
                    <label className="astra-control-label">Right Section Content</label>
                    <input
                      type="text"
                      value={footer.bottomBar.section2}
                      onChange={(e) => updateSetting('footer', e.target.value, ['bottomBar', 'section2'])}
                      className="astra-text-input"
                      placeholder="Privacy Policy | Terms of Service"
                    />
                    <span className="astra-control-description">
                      Additional content for the right section
                    </span>
                  </div>
                )}
                
                <AstraColorPicker
                  label="Background Color"
                  value={footer.bottomBar.background}
                  onChange={(value) => updateSetting('footer', value, ['bottomBar', 'background'])}
                  description="Bottom bar background color"
                />
                
                <AstraColorPicker
                  label="Text Color"
                  value={footer.bottomBar.textColor}
                  onChange={(value) => updateSetting('footer', value, ['bottomBar', 'textColor'])}
                  description="Bottom bar text color"
                />
                
                <AstraColorPicker
                  label="Link Color"
                  value={footer.bottomBar.linkColor}
                  onChange={(value) => updateSetting('footer', value, ['bottomBar', 'linkColor'])}
                  hasHover={true}
                  description="Bottom bar link color"
                />
              </>
            )}
          </div>
          
          {footer.bottomBar.enabled && (
            <div className="astra-section-group">
              <h4 className="astra-group-title">Bottom Bar Spacing</h4>
              
              <div className="astra-typography-group">
                <AstraSlider
                  label="Padding Top"
                  value={{
                    desktop: footer.bottomBar.padding.desktop.top,
                    tablet: footer.bottomBar.padding.tablet.top,
                    mobile: footer.bottomBar.padding.mobile.top,
                  }}
                  onChange={(value) => {
                    const val = typeof value === 'number' ? value : value.desktop;
                    updateSetting('footer', val, ['bottomBar', 'padding', 'desktop', 'top']);
                    if (typeof value !== 'number') {
                      updateSetting('footer', value.tablet, ['bottomBar', 'padding', 'tablet', 'top']);
                      updateSetting('footer', value.mobile, ['bottomBar', 'padding', 'mobile', 'top']);
                    }
                  }}
                  min={0}
                  max={100}
                  unit="px"
                  responsive={true}
                />
                
                <AstraSlider
                  label="Padding Bottom"
                  value={{
                    desktop: footer.bottomBar.padding.desktop.bottom,
                    tablet: footer.bottomBar.padding.tablet.bottom,
                    mobile: footer.bottomBar.padding.mobile.bottom,
                  }}
                  onChange={(value) => {
                    const val = typeof value === 'number' ? value : value.desktop;
                    updateSetting('footer', val, ['bottomBar', 'padding', 'desktop', 'bottom']);
                    if (typeof value !== 'number') {
                      updateSetting('footer', value.tablet, ['bottomBar', 'padding', 'tablet', 'bottom']);
                      updateSetting('footer', value.mobile, ['bottomBar', 'padding', 'mobile', 'bottom']);
                    }
                  }}
                  min={0}
                  max={100}
                  unit="px"
                  responsive={true}
                />
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Footer Preview */}
      <div className="astra-section-group">
        <h4 className="astra-group-title">Footer Preview</h4>
        <div className="astra-footer-preview">
          {footer.widgets.enabled && (
            <div
              className="astra-footer-preview-widgets"
              style={{
                background: footer.widgets.background,
                color: footer.widgets.textColor,
                padding: `${footer.widgets.padding.desktop.top}px 20px ${footer.widgets.padding.desktop.bottom}px`,
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${footer.widgets.columns.desktop}, 1fr)`,
                  gap: '30px',
                }}
              >
                {Array.from({ length: footer.widgets.columns.desktop }, (_, i) => (
                  <div
                    key={i}
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      padding: '15px',
                      borderRadius: '3px',
                      minHeight: '80px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      opacity: 0.7,
                    }}
                  >
                    Widget {i + 1}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {footer.bottomBar.enabled && (
            <div
              className="astra-footer-preview-bottom"
              style={{
                background: footer.bottomBar.background,
                color: footer.bottomBar.textColor,
                padding: `${footer.bottomBar.padding.desktop.top}px 20px ${footer.bottomBar.padding.desktop.bottom}px`,
                borderTop: footer.widgets.enabled ? '1px solid rgba(255,255,255,0.1)' : 'none',
              }}
            >
              {footer.bottomBar.layout === 'layout-1' ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '12px' }}>
                    {footer.bottomBar.section1 || '© 2024 Your Company'}
                  </div>
                  <div style={{ fontSize: '12px' }}>
                    {footer.bottomBar.section2 || 'Privacy | Terms'}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', fontSize: '12px' }}>
                  {footer.bottomBar.section1 || '© 2024 Your Company'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};