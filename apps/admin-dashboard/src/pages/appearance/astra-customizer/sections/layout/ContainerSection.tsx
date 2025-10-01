import React, { useState } from 'react';
import { AstraSlider } from '../../components/controls/AstraSlider';
import { AstraSelect } from '../../components/controls/AstraSelect';
import { Layout, Maximize, Square, Sidebar as SidebarIcon } from 'lucide-react';
import { AstraCustomizerSettings, PreviewDevice } from '../../types/customizer-types';

interface ContainerSectionProps {
  settings: AstraCustomizerSettings;
  updateSetting: (section: keyof AstraCustomizerSettings, value: any, path?: string[]) => void;
  previewDevice: PreviewDevice;
}

export const ContainerSection: React.FC<ContainerSectionProps> = ({ settings, updateSetting }) => {
  const container = settings.container;
  const sidebar = settings.sidebar;
  
  const [activeTab, setActiveTab] = useState<'container' | 'sidebar'>('container');
  
  const layoutOptions = [
    { value: 'boxed', label: 'Boxed' },
    { value: 'full-width', label: 'Full Width' },
    { value: 'fluid', label: 'Fluid' },
  ];
  
  const sidebarLayoutOptions = [
    { value: 'no-sidebar', label: 'No Sidebar' },
    { value: 'left-sidebar', label: 'Left Sidebar' },
    { value: 'right-sidebar', label: 'Right Sidebar' },
    { value: 'both-sidebars', label: 'Both Sidebars' },
  ];
  
  return (
    <div className="astra-section container-section">
      <div className="astra-section-title">Layout</div>
      
      {/* Layout Tabs */}
      <div className="astra-tabs">
        <button
          onClick={() => setActiveTab('container')}
          className={`astra-tab ${activeTab === 'container' ? 'active' : ''}`}
        >
          <Layout size={14} />
          Container
        </button>
        <button
          onClick={() => setActiveTab('sidebar')}
          className={`astra-tab ${activeTab === 'sidebar' ? 'active' : ''}`}
        >
          <SidebarIcon size={14} />
          Sidebar
        </button>
      </div>
      
      {activeTab === 'container' ? (
        <>
          {/* Container Layout */}
          <div className="astra-section-group">
            <h4 className="astra-group-title">Container Layout</h4>
            
            <div className="astra-control">
              <label className="astra-control-label">Layout Style</label>
              <div className="astra-layout-options">
                <button
                  onClick={() => updateSetting('container', 'boxed', ['layout'])}
                  className={`astra-layout-option ${container.layout === 'boxed' ? 'selected' : ''}`}
                >
                  <div className="astra-layout-option-icon">
                    <Square size={20} />
                  </div>
                  <span className="astra-layout-option-label">Boxed</span>
                </button>
                
                <button
                  onClick={() => updateSetting('container', 'full-width', ['layout'])}
                  className={`astra-layout-option ${container.layout === 'full-width' ? 'selected' : ''}`}
                >
                  <div className="astra-layout-option-icon">
                    <Maximize size={20} />
                  </div>
                  <span className="astra-layout-option-label">Full Width</span>
                </button>
                
                <button
                  onClick={() => updateSetting('container', 'fluid', ['layout'])}
                  className={`astra-layout-option ${container.layout === 'fluid' ? 'selected' : ''}`}
                >
                  <div className="astra-layout-option-icon">
                    <Layout size={20} />
                  </div>
                  <span className="astra-layout-option-label">Fluid</span>
                </button>
              </div>
              <p className="astra-control-description">
                Choose how your content will be contained within the browser window
              </p>
            </div>
            
            {container.layout !== 'full-width' && (
              <AstraSlider
                label="Container Width"
                value={container.width}
                onChange={(value) => updateSetting('container', value, ['width'])}
                min={768}
                max={1920}
                unit="px"
                responsive={true}
                description="Maximum width of the content container"
              />
            )}
          </div>
          
          {/* Container Spacing */}
          <div className="astra-section-group">
            <h4 className="astra-group-title">Container Spacing</h4>
            
            <div className="astra-responsive-controls">
              <div className="astra-responsive-header">
                <span className="astra-responsive-label">Padding</span>
              </div>
              
              <div className="astra-typography-group">
                <AstraSlider
                  label="Top"
                  value={{
                    desktop: container.padding.desktop.top,
                    tablet: container.padding.tablet.top,
                    mobile: container.padding.mobile.top,
                  }}
                  onChange={(value) => {
                    const val = typeof value === 'number' ? value : value.desktop;
                    updateSetting('container', val, ['padding', 'desktop', 'top']);
                    if (typeof value !== 'number') {
                      updateSetting('container', value.tablet, ['padding', 'tablet', 'top']);
                      updateSetting('container', value.mobile, ['padding', 'mobile', 'top']);
                    }
                  }}
                  min={0}
                  max={100}
                  unit="px"
                  responsive={true}
                />
                
                <AstraSlider
                  label="Bottom"
                  value={{
                    desktop: container.padding.desktop.bottom,
                    tablet: container.padding.tablet.bottom,
                    mobile: container.padding.mobile.bottom,
                  }}
                  onChange={(value) => {
                    const val = typeof value === 'number' ? value : value.desktop;
                    updateSetting('container', val, ['padding', 'desktop', 'bottom']);
                    if (typeof value !== 'number') {
                      updateSetting('container', value.tablet, ['padding', 'tablet', 'bottom']);
                      updateSetting('container', value.mobile, ['padding', 'mobile', 'bottom']);
                    }
                  }}
                  min={0}
                  max={100}
                  unit="px"
                  responsive={true}
                />
              </div>
              
              <div className="astra-typography-group">
                <AstraSlider
                  label="Left"
                  value={{
                    desktop: container.padding.desktop.left,
                    tablet: container.padding.tablet.left,
                    mobile: container.padding.mobile.left,
                  }}
                  onChange={(value) => {
                    const val = typeof value === 'number' ? value : value.desktop;
                    updateSetting('container', val, ['padding', 'desktop', 'left']);
                    if (typeof value !== 'number') {
                      updateSetting('container', value.tablet, ['padding', 'tablet', 'left']);
                      updateSetting('container', value.mobile, ['padding', 'mobile', 'left']);
                    }
                  }}
                  min={0}
                  max={100}
                  unit="px"
                  responsive={true}
                />
                
                <AstraSlider
                  label="Right"
                  value={{
                    desktop: container.padding.desktop.right,
                    tablet: container.padding.tablet.right,
                    mobile: container.padding.mobile.right,
                  }}
                  onChange={(value) => {
                    const val = typeof value === 'number' ? value : value.desktop;
                    updateSetting('container', val, ['padding', 'desktop', 'right']);
                    if (typeof value !== 'number') {
                      updateSetting('container', value.tablet, ['padding', 'tablet', 'right']);
                      updateSetting('container', value.mobile, ['padding', 'mobile', 'right']);
                    }
                  }}
                  min={0}
                  max={100}
                  unit="px"
                  responsive={true}
                />
              </div>
            </div>
            
            <div className="astra-responsive-controls">
              <div className="astra-responsive-header">
                <span className="astra-responsive-label">Margin</span>
              </div>
              
              <div className="astra-typography-group">
                <AstraSlider
                  label="Top"
                  value={{
                    desktop: container.margin.desktop.top,
                    tablet: container.margin.tablet.top,
                    mobile: container.margin.mobile.top,
                  }}
                  onChange={(value) => {
                    const val = typeof value === 'number' ? value : value.desktop;
                    updateSetting('container', val, ['margin', 'desktop', 'top']);
                    if (typeof value !== 'number') {
                      updateSetting('container', value.tablet, ['margin', 'tablet', 'top']);
                      updateSetting('container', value.mobile, ['margin', 'mobile', 'top']);
                    }
                  }}
                  min={0}
                  max={200}
                  unit="px"
                  responsive={true}
                />
                
                <AstraSlider
                  label="Bottom"
                  value={{
                    desktop: container.margin.desktop.bottom,
                    tablet: container.margin.tablet.bottom,
                    mobile: container.margin.mobile.bottom,
                  }}
                  onChange={(value) => {
                    const val = typeof value === 'number' ? value : value.desktop;
                    updateSetting('container', val, ['margin', 'desktop', 'bottom']);
                    if (typeof value !== 'number') {
                      updateSetting('container', value.tablet, ['margin', 'tablet', 'bottom']);
                      updateSetting('container', value.mobile, ['margin', 'mobile', 'bottom']);
                    }
                  }}
                  min={0}
                  max={200}
                  unit="px"
                  responsive={true}
                />
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Sidebar Layout */}
          <div className="astra-section-group">
            <h4 className="astra-group-title">Sidebar Layout</h4>
            
            <AstraSelect
              label="Sidebar Position"
              value={sidebar.layout}
              onChange={(value) => updateSetting('sidebar', value, ['layout'])}
              options={sidebarLayoutOptions}
              description="Choose where to display the sidebar"
            />
            
            {sidebar.layout !== 'no-sidebar' && (
              <>
                <AstraSlider
                  label="Sidebar Width"
                  value={sidebar.width}
                  onChange={(value) => updateSetting('sidebar', value, ['width'])}
                  min={15}
                  max={50}
                  unit="%"
                  responsive={true}
                  description="Width of the sidebar relative to the container"
                />
                
                <AstraSlider
                  label="Content Gap"
                  value={sidebar.gap}
                  onChange={(value) => updateSetting('sidebar', value, ['gap'])}
                  min={0}
                  max={100}
                  unit="px"
                  responsive={true}
                  description="Space between content and sidebar"
                />
              </>
            )}
          </div>
          
          {/* Sidebar Behavior */}
          {sidebar.layout !== 'no-sidebar' && (
            <div className="astra-section-group">
              <h4 className="astra-group-title">Responsive Behavior</h4>
              
              <p className="astra-control-description">
                On mobile devices, the sidebar will automatically move below the main content 
                for better readability.
              </p>
              
              <div className="astra-help-text">
                💡 Tip: You can set different sidebar widths for tablet and mobile devices 
                using the responsive controls above.
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Layout Preview */}
      <div className="astra-section-group">
        <h4 className="astra-group-title">Layout Preview</h4>
        <div className="astra-layout-preview">
          <div className="astra-layout-preview-container" style={{
            maxWidth: container.layout === 'full-width' ? '100%' : `${container.width.desktop}px`,
            margin: '0 auto',
            padding: `${container.padding.desktop.top}px ${container.padding.desktop.right}px ${container.padding.desktop.bottom}px ${container.padding.desktop.left}px`,
          }}>
            <div className="astra-layout-preview-content" style={{
              display: 'flex',
              gap: sidebar.layout !== 'no-sidebar' ? `${sidebar.gap.desktop}px` : 0,
              flexDirection: sidebar.layout === 'left-sidebar' ? 'row-reverse' : 'row',
            }}>
              <div className="astra-layout-preview-main" style={{
                flex: sidebar.layout !== 'no-sidebar' ? `1 1 ${100 - sidebar.width.desktop}%` : '1 1 100%',
                background: '#e0e0e0',
                padding: '20px',
                borderRadius: '4px',
                minHeight: '100px',
              }}>
                Main Content
              </div>
              {sidebar.layout !== 'no-sidebar' && (
                <div className="astra-layout-preview-sidebar" style={{
                  flex: `0 0 ${sidebar.width.desktop}%`,
                  background: '#f0f0f0',
                  padding: '20px',
                  borderRadius: '4px',
                  minHeight: '100px',
                }}>
                  Sidebar
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};