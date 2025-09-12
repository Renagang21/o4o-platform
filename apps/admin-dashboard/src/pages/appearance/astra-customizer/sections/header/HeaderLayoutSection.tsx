import React from 'react';
import { useCustomizerState } from '../../hooks/useCustomizerState';
import { AstraSlider } from '../../components/controls/AstraSlider';
import { AstraToggle } from '../../components/controls/AstraToggle';
import { AstraColorPicker } from '../../components/controls/AstraColorPicker';
import { AstraSelect } from '../../components/controls/AstraSelect';
import { Menu, MoreHorizontal, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

export const HeaderLayoutSection: React.FC = () => {
  const { settings, updateSetting } = useCustomizerState();
  const header = settings.header;
  
  const [activeTab, setActiveTab] = React.useState<'general' | 'primary' | 'above' | 'below'>('general');
  
  const layoutOptions = [
    { value: 'header-main-layout-1', label: 'Layout 1 - Logo Left, Menu Right' },
    { value: 'header-main-layout-2', label: 'Layout 2 - Logo Center, Menu Below' },
    { value: 'header-main-layout-3', label: 'Layout 3 - Logo Right, Menu Left' },
  ];
  
  const alignmentOptions = [
    { value: 'left', label: 'Left' },
    { value: 'center', label: 'Center' },
    { value: 'right', label: 'Right' },
  ];
  
  const contentOptions = [
    { value: 'menu', label: 'Navigation Menu' },
    { value: 'search', label: 'Search Box' },
    { value: 'account', label: 'Account' },
    { value: 'cart', label: 'Cart' },
    { value: 'breadcrumb', label: 'Breadcrumb' },
    { value: 'custom-html', label: 'Custom HTML' },
  ];
  
  return (
    <div className="astra-section header-section">
      <div className="astra-section-title">Header</div>
      
      {/* Header Tabs */}
      <div className="astra-tabs">
        <button
          onClick={() => setActiveTab('general')}
          className={`astra-tab ${activeTab === 'general' ? 'active' : ''}`}
        >
          <Menu size={14} />
          General
        </button>
        <button
          onClick={() => setActiveTab('primary')}
          className={`astra-tab ${activeTab === 'primary' ? 'active' : ''}`}
        >
          <AlignCenter size={14} />
          Primary Header
        </button>
        <button
          onClick={() => setActiveTab('above')}
          className={`astra-tab ${activeTab === 'above' ? 'active' : ''}`}
        >
          <MoreHorizontal size={14} />
          Above Header
        </button>
        <button
          onClick={() => setActiveTab('below')}
          className={`astra-tab ${activeTab === 'below' ? 'active' : ''}`}
        >
          <MoreHorizontal size={14} />
          Below Header
        </button>
      </div>
      
      {activeTab === 'general' && (
        <>
          {/* General Settings */}
          <div className="astra-section-group">
            <h4 className="astra-group-title">Header Layout</h4>
            
            <AstraSelect
              label="Header Layout"
              value={header.layout}
              onChange={(value) => updateSetting('header', value, ['layout'])}
              options={layoutOptions}
              description="Choose the header layout structure"
            />
          </div>
          
          <div className="astra-section-group">
            <h4 className="astra-group-title">Header Behavior</h4>
            
            <AstraToggle
              label="Sticky Header"
              value={header.sticky}
              onChange={(value) => updateSetting('header', value, ['sticky'])}
              description="Keep header visible when scrolling"
            />
            
            <AstraToggle
              label="Transparent Header"
              value={header.transparentHeader}
              onChange={(value) => updateSetting('header', value, ['transparentHeader'])}
              description="Make header transparent on homepage"
            />
          </div>
        </>
      )}
      
      {activeTab === 'primary' && (
        <>
          {/* Primary Header Settings */}
          <div className="astra-section-group">
            <h4 className="astra-group-title">Primary Header</h4>
            
            <AstraSlider
              label="Header Height"
              value={header.primary.height}
              onChange={(value) => updateSetting('header', value, ['primary', 'height'])}
              min={30}
              max={200}
              unit="px"
              responsive={true}
              description="Height of the primary header area"
            />
            
            <AstraColorPicker
              label="Background Color"
              value={header.primary.background}
              onChange={(value) => updateSetting('header', value, ['primary', 'background'])}
              description="Primary header background color"
            />
            
            <AstraSelect
              label="Menu Alignment"
              value={header.primary.menuAlignment}
              onChange={(value) => updateSetting('header', value, ['primary', 'menuAlignment'])}
              options={alignmentOptions}
              description="Alignment of the navigation menu"
            />
          </div>
        </>
      )}
      
      {activeTab === 'above' && (
        <>
          {/* Above Header Settings */}
          <div className="astra-section-group">
            <h4 className="astra-group-title">Above Header</h4>
            
            <AstraToggle
              label="Enable Above Header"
              value={header.above.enabled}
              onChange={(value) => updateSetting('header', value, ['above', 'enabled'])}
              description="Add an additional header section above the main header"
            />
            
            {header.above.enabled && (
              <>
                <AstraSlider
                  label="Height"
                  value={header.above.height}
                  onChange={(value) => updateSetting('header', value, ['above', 'height'])}
                  min={20}
                  max={100}
                  unit="px"
                  responsive={true}
                />
                
                <AstraColorPicker
                  label="Background Color"
                  value={header.above.background}
                  onChange={(value) => updateSetting('header', value, ['above', 'background'])}
                />
                
                <div className="astra-control">
                  <label className="astra-control-label">Content Elements</label>
                  <p className="astra-control-description">
                    Select elements to display in the above header section
                  </p>
                  <div className="astra-checkbox-group">
                    {contentOptions.slice(0, 4).map((option) => (
                      <label key={option.value} className="astra-checkbox-label">
                        <input
                          type="checkbox"
                          checked={header.above.content.includes(option.value as any)}
                          onChange={(e) => {
                            const newContent = e.target.checked
                              ? [...header.above.content, option.value]
                              : header.above.content.filter(c => c !== option.value);
                            updateSetting('header', newContent, ['above', 'content']);
                          }}
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
      
      {activeTab === 'below' && (
        <>
          {/* Below Header Settings */}
          <div className="astra-section-group">
            <h4 className="astra-group-title">Below Header</h4>
            
            <AstraToggle
              label="Enable Below Header"
              value={header.below.enabled}
              onChange={(value) => updateSetting('header', value, ['below', 'enabled'])}
              description="Add an additional header section below the main header"
            />
            
            {header.below.enabled && (
              <>
                <AstraSlider
                  label="Height"
                  value={header.below.height}
                  onChange={(value) => updateSetting('header', value, ['below', 'height'])}
                  min={20}
                  max={100}
                  unit="px"
                  responsive={true}
                />
                
                <AstraColorPicker
                  label="Background Color"
                  value={header.below.background}
                  onChange={(value) => updateSetting('header', value, ['below', 'background'])}
                />
                
                <div className="astra-control">
                  <label className="astra-control-label">Content Elements</label>
                  <p className="astra-control-description">
                    Select elements to display in the below header section
                  </p>
                  <div className="astra-checkbox-group">
                    {[contentOptions[0], contentOptions[1], contentOptions[4], contentOptions[5]].map((option) => (
                      <label key={option.value} className="astra-checkbox-label">
                        <input
                          type="checkbox"
                          checked={header.below.content.includes(option.value as any)}
                          onChange={(e) => {
                            const newContent = e.target.checked
                              ? [...header.below.content, option.value]
                              : header.below.content.filter(c => c !== option.value);
                            updateSetting('header', newContent, ['below', 'content']);
                          }}
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
      
      {/* Header Preview */}
      <div className="astra-section-group">
        <h4 className="astra-group-title">Header Preview</h4>
        <div className="astra-header-preview">
          {header.above.enabled && (
            <div 
              className="astra-header-preview-above"
              style={{
                height: `${header.above.height.desktop}px`,
                background: header.above.background,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                color: '#646970',
              }}
            >
              Above Header - {header.above.content.join(', ') || 'No content'}
            </div>
          )}
          
          <div 
            className="astra-header-preview-primary"
            style={{
              height: `${header.primary.height.desktop}px`,
              background: header.primary.background,
              display: 'flex',
              alignItems: 'center',
              padding: '0 20px',
              borderTop: header.above.enabled ? '1px solid #e0e0e0' : 'none',
              borderBottom: header.below.enabled ? '1px solid #e0e0e0' : 'none',
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{
                width: '120px',
                height: '30px',
                background: '#e0e0e0',
                borderRadius: '3px',
              }} />
            </div>
            <div style={{ 
              flex: 2, 
              textAlign: header.primary.menuAlignment as any,
              fontSize: '11px',
              color: '#646970',
            }}>
              Navigation Menu
            </div>
          </div>
          
          {header.below.enabled && (
            <div 
              className="astra-header-preview-below"
              style={{
                height: `${header.below.height.desktop}px`,
                background: header.below.background,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                color: '#646970',
              }}
            >
              Below Header - {header.below.content.join(', ') || 'No content'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};