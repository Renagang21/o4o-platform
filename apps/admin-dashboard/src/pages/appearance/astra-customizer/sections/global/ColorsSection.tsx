import React, { useState } from 'react';
import { useCustomizerState } from '../../hooks/useCustomizerState';
import { AstraColorPicker } from '../../components/controls/AstraColorPicker';
import { Palette, Droplet, Link, Type, Square } from 'lucide-react';

export const ColorsSection: React.FC = () => {
  const { settings, updateSetting } = useCustomizerState();
  const colors = settings.colors;
  
  const [activeTab, setActiveTab] = useState<'theme' | 'palette'>('theme');
  
  return (
    <div className="astra-section colors-section">
      <div className="astra-section-title">Colors</div>
      
      {/* Color Tabs */}
      <div className="astra-tabs">
        <button
          onClick={() => setActiveTab('theme')}
          className={`astra-tab ${activeTab === 'theme' ? 'active' : ''}`}
        >
          <Droplet size={14} />
          Theme Colors
        </button>
        <button
          onClick={() => setActiveTab('palette')}
          className={`astra-tab ${activeTab === 'palette' ? 'active' : ''}`}
        >
          <Palette size={14} />
          Color Palette
        </button>
      </div>
      
      {activeTab === 'theme' ? (
        <>
          {/* Primary Colors */}
          <div className="astra-section-group">
            <h4 className="astra-group-title">Primary Colors</h4>
            
            <AstraColorPicker
              label="Primary Color"
              value={colors.primaryColor}
              onChange={(value) =>
                updateSetting('colors', value, ['primaryColor'])
              }
              description="Main brand color used for buttons, links, and accents"
            />
            
            <AstraColorPicker
              label="Secondary Color"
              value={colors.secondaryColor}
              onChange={(value) =>
                updateSetting('colors', value, ['secondaryColor'])
              }
              description="Secondary brand color for additional accents"
            />
          </div>
          
          {/* Text Colors */}
          <div className="astra-section-group">
            <h4 className="astra-group-title">Text Colors</h4>
            
            <AstraColorPicker
              label="Text Color"
              value={colors.textColor}
              onChange={(value) =>
                updateSetting('colors', value, ['textColor'])
              }
              description="Default text color for body content"
            />
            
            <AstraColorPicker
              label="Link Color"
              value={colors.linkColor}
              onChange={(value) =>
                updateSetting('colors', value, ['linkColor'])
              }
              hasHover={true}
              description="Color for links and hover state"
            />
          </div>
          
          {/* Background Colors */}
          <div className="astra-section-group">
            <h4 className="astra-group-title">Background Colors</h4>
            
            <AstraColorPicker
              label="Body Background"
              value={colors.bodyBackground}
              onChange={(value) =>
                updateSetting('colors', value, ['bodyBackground'])
              }
              description="Main background color of the site"
            />
            
            <AstraColorPicker
              label="Content Background"
              value={colors.contentBackground}
              onChange={(value) =>
                updateSetting('colors', value, ['contentBackground'])
              }
              description="Background color for content areas"
            />
          </div>
          
          {/* Border Color */}
          <div className="astra-section-group">
            <h4 className="astra-group-title">Border & Dividers</h4>
            
            <AstraColorPicker
              label="Border Color"
              value={colors.borderColor}
              onChange={(value) =>
                updateSetting('colors', value, ['borderColor'])
              }
              description="Color for borders and divider lines"
            />
          </div>
        </>
      ) : (
        <>
          {/* Color Palette */}
          <div className="astra-section-group">
            <h4 className="astra-group-title">Global Color Palette</h4>
            <p className="astra-control-description">
              Define a color palette that can be used throughout your site. 
              These colors will be available in all color pickers.
            </p>
            
            <div className="astra-color-palette-grid">
              {Object.entries(colors.palette).map(([key, value], index) => (
                <div key={key} className="astra-color-palette-item">
                  <span className="astra-color-palette-label">Color {index + 1}</span>
                  <AstraColorPicker
                    label=""
                    value={value}
                    onChange={(newValue) => {
                      const newPalette = { ...colors.palette };
                      newPalette[key] = newValue as string;
                      updateSetting('colors', newPalette, ['palette']);
                    }}
                    clearable={false}
                  />
                </div>
              ))}
            </div>
            
            <button
              onClick={() => {
                const newKey = `color${Object.keys(colors.palette).length + 1}`;
                const newPalette = { ...colors.palette, [newKey]: '#000000' };
                updateSetting('colors', newPalette, ['palette']);
              }}
              className="astra-button secondary"
            >
              + Add Color
            </button>
          </div>
          
          {/* Preset Color Schemes */}
          <div className="astra-section-group">
            <h4 className="astra-group-title">Preset Color Schemes</h4>
            
            <div className="astra-layout-options">
              <button
                onClick={() => {
                  updateSetting('colors', {
                    primaryColor: '#0073aa',
                    secondaryColor: '#ff6b6b',
                    textColor: '#333333',
                    linkColor: { normal: '#0073aa', hover: '#005177' },
                    borderColor: '#dddddd',
                    bodyBackground: '#ffffff',
                    contentBackground: '#ffffff',
                  }, []);
                }}
                className="astra-layout-option"
              >
                <div className="astra-layout-option-icon" style={{ background: '#0073aa' }} />
                <span className="astra-layout-option-label">Default</span>
              </button>
              
              <button
                onClick={() => {
                  updateSetting('colors', {
                    primaryColor: '#1e1e1e',
                    secondaryColor: '#646970',
                    textColor: '#e0e0e0',
                    linkColor: { normal: '#4ecdc4', hover: '#45b7aa' },
                    borderColor: '#333333',
                    bodyBackground: '#121212',
                    contentBackground: '#1e1e1e',
                  }, []);
                }}
                className="astra-layout-option"
              >
                <div className="astra-layout-option-icon" style={{ background: '#1e1e1e' }} />
                <span className="astra-layout-option-label">Dark</span>
              </button>
              
              <button
                onClick={() => {
                  updateSetting('colors', {
                    primaryColor: '#ff6b6b',
                    secondaryColor: '#4ecdc4',
                    textColor: '#2c3e50',
                    linkColor: { normal: '#ff6b6b', hover: '#ff5252' },
                    borderColor: '#ecf0f1',
                    bodyBackground: '#f8f9fa',
                    contentBackground: '#ffffff',
                  }, []);
                }}
                className="astra-layout-option"
              >
                <div className="astra-layout-option-icon" style={{ background: '#ff6b6b' }} />
                <span className="astra-layout-option-label">Vibrant</span>
              </button>
              
              <button
                onClick={() => {
                  updateSetting('colors', {
                    primaryColor: '#27ae60',
                    secondaryColor: '#e67e22',
                    textColor: '#34495e',
                    linkColor: { normal: '#27ae60', hover: '#229954' },
                    borderColor: '#bdc3c7',
                    bodyBackground: '#ecf0f1',
                    contentBackground: '#ffffff',
                  }, []);
                }}
                className="astra-layout-option"
              >
                <div className="astra-layout-option-icon" style={{ background: '#27ae60' }} />
                <span className="astra-layout-option-label">Nature</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};