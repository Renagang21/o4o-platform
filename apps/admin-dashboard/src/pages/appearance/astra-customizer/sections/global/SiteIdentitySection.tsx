import React, { useState } from 'react';
import { AstraImageUploader } from '../../components/controls/AstraImageUploader';
import { AstraSlider } from '../../components/controls/AstraSlider';
import { AstraToggle } from '../../components/controls/AstraToggle';
import { AstraColorPicker } from '../../components/controls/AstraColorPicker';
import { Monitor, Tablet, Smartphone } from 'lucide-react';
import { AstraCustomizerSettings, PreviewDevice } from '../../types/customizer-types';

interface SiteIdentitySectionProps {
  settings: AstraCustomizerSettings;
  updateSetting: (section: keyof AstraCustomizerSettings, value: any, path?: string[]) => void;
  previewDevice: PreviewDevice;
}

export const SiteIdentitySection: React.FC<SiteIdentitySectionProps> = ({ settings, updateSetting }) => {
  const siteIdentity = settings.siteIdentity;
  
  const [logoTab, setLogoTab] = useState<'desktop' | 'mobile'>('desktop');
  
  return (
    <div className="astra-section site-identity-section">
      <div className="astra-section-title">Site Identity</div>
      
      {/* Logo Upload */}
      <div className="astra-section-group">
        <h4 className="astra-group-title">Logo</h4>
        
        {/* Logo Tabs */}
        <div className="astra-tabs">
          <button
            onClick={() => setLogoTab('desktop')}
            className={`astra-tab ${logoTab === 'desktop' ? 'active' : ''}`}
          >
            <Monitor size={14} />
            Desktop Logo
          </button>
          <button
            onClick={() => setLogoTab('mobile')}
            className={`astra-tab ${logoTab === 'mobile' ? 'active' : ''}`}
          >
            <Smartphone size={14} />
            Mobile Logo
          </button>
        </div>
        
        {logoTab === 'desktop' ? (
          <AstraImageUploader
            label="Desktop Logo"
            value={siteIdentity.logo.desktop}
            onChange={(value) =>
              updateSetting('siteIdentity', value, ['logo', 'desktop'])
            }
            description="The logo will be displayed in the header on desktop devices"
          />
        ) : (
          <AstraImageUploader
            label="Mobile Logo"
            value={siteIdentity.logo.mobile}
            onChange={(value) =>
              updateSetting('siteIdentity', value, ['logo', 'mobile'])
            }
            description="Optional: Different logo for mobile devices"
          />
        )}
        
        {/* Logo Width */}
        <AstraSlider
          label="Logo Width"
          value={siteIdentity.logo.width}
          onChange={(value) =>
            updateSetting('siteIdentity', value, ['logo', 'width'])
          }
          min={50}
          max={600}
          unit="px"
          responsive={true}
          description="Set the width of your logo"
        />
      </div>
      
      {/* Site Title */}
      <div className="astra-section-group">
        <h4 className="astra-group-title">Site Title</h4>
        
        <AstraToggle
          label="Display Site Title"
          value={siteIdentity.siteTitle.show}
          onChange={(value) =>
            updateSetting('siteIdentity', value, ['siteTitle', 'show'])
          }
          description="Show or hide the site title in the header"
        />
        
        {siteIdentity.siteTitle.show && (
          <>
            <div className="astra-control">
              <label className="astra-control-label">Site Title Text</label>
              <input
                type="text"
                value={siteIdentity.siteTitle.text}
                onChange={(e) =>
                  updateSetting('siteIdentity', e.target.value, ['siteTitle', 'text'])
                }
                className="astra-text-input"
                placeholder="Enter your site title"
              />
            </div>
            
            <AstraColorPicker
              label="Title Color"
              value={siteIdentity.siteTitle.color}
              onChange={(value) =>
                updateSetting('siteIdentity', value, ['siteTitle', 'color'])
              }
              hasHover={true}
              description="Set the color for your site title"
            />
            
            <AstraSlider
              label="Title Font Size"
              value={siteIdentity.siteTitle.typography.fontSize}
              onChange={(value) =>
                updateSetting('siteIdentity', value, ['siteTitle', 'typography', 'fontSize'])
              }
              min={10}
              max={60}
              unit="px"
              responsive={true}
            />
            
            <div className="astra-control">
              <label className="astra-control-label">Font Weight</label>
              <select
                value={siteIdentity.siteTitle.typography.fontWeight}
                onChange={(e) =>
                  updateSetting('siteIdentity', Number(e.target.value), [
                    'siteTitle',
                    'typography',
                    'fontWeight',
                  ])
                }
                className="astra-select-input"
              >
                <option value={300}>Light (300)</option>
                <option value={400}>Normal (400)</option>
                <option value={500}>Medium (500)</option>
                <option value={600}>Semi Bold (600)</option>
                <option value={700}>Bold (700)</option>
                <option value={800}>Extra Bold (800)</option>
                <option value={900}>Black (900)</option>
              </select>
            </div>
          </>
        )}
      </div>
      
      {/* Tagline */}
      <div className="astra-section-group">
        <h4 className="astra-group-title">Tagline</h4>
        
        <AstraToggle
          label="Display Tagline"
          value={siteIdentity.tagline.show}
          onChange={(value) =>
            updateSetting('siteIdentity', value, ['tagline', 'show'])
          }
          description="Show or hide the site tagline"
        />
        
        {siteIdentity.tagline.show && (
          <>
            <div className="astra-control">
              <label className="astra-control-label">Tagline Text</label>
              <input
                type="text"
                value={siteIdentity.tagline.text}
                onChange={(e) =>
                  updateSetting('siteIdentity', e.target.value, ['tagline', 'text'])
                }
                className="astra-text-input"
                placeholder="Enter your tagline"
              />
            </div>
            
            <AstraColorPicker
              label="Tagline Color"
              value={siteIdentity.tagline.color}
              onChange={(value) =>
                updateSetting('siteIdentity', value, ['tagline', 'color'])
              }
              hasHover={true}
              description="Set the color for your tagline"
            />
            
            <AstraSlider
              label="Tagline Font Size"
              value={siteIdentity.tagline.typography.fontSize}
              onChange={(value) =>
                updateSetting('siteIdentity', value, ['tagline', 'typography', 'fontSize'])
              }
              min={8}
              max={30}
              unit="px"
              responsive={true}
            />
          </>
        )}
      </div>
      
      {/* Site Icon (Favicon) */}
      <div className="astra-section-group">
        <h4 className="astra-group-title">Site Icon</h4>
        
        <AstraImageUploader
          label="Favicon"
          value={siteIdentity.favicon}
          onChange={(value) =>
            updateSetting('siteIdentity', value, ['favicon'])
          }
          description="Site icon should be a square image at least 512×512 pixels"
          accept="image/png,image/jpeg,image/x-icon"
        />
        
        <p className="astra-help-text">
          The site icon is used as a browser and app icon for your site. 
          Icons must be square, and at least 512 pixels wide and tall.
        </p>
      </div>
    </div>
  );
};