import React from 'react';
import { useCustomizerState } from '../../hooks/useCustomizerState';
import { GoogleFontSelector } from '../../components/controls/GoogleFontSelector';
import { AstraSlider } from '../../components/controls/AstraSlider';
import { AstraSelect } from '../../components/controls/AstraSelect';
import { Type, Heading, MousePointer } from 'lucide-react';
import { TextTransform, FontWeight } from '../../types/customizer-types';

export const TypographySection: React.FC = () => {
  const { settings, updateSetting } = useCustomizerState();
  const typography = settings.typography;
  
  const [activeTab, setActiveTab] = React.useState<'body' | 'headings' | 'buttons'>('body');
  const [expandedHeading, setExpandedHeading] = React.useState<string | null>(null);
  
  const fontWeightOptions = [
    { value: '100', label: 'Thin (100)' },
    { value: '200', label: 'Extra Light (200)' },
    { value: '300', label: 'Light (300)' },
    { value: '400', label: 'Normal (400)' },
    { value: '500', label: 'Medium (500)' },
    { value: '600', label: 'Semi Bold (600)' },
    { value: '700', label: 'Bold (700)' },
    { value: '800', label: 'Extra Bold (800)' },
    { value: '900', label: 'Black (900)' },
  ];
  
  const textTransformOptions = [
    { value: 'none', label: 'None' },
    { value: 'capitalize', label: 'Capitalize' },
    { value: 'uppercase', label: 'UPPERCASE' },
    { value: 'lowercase', label: 'lowercase' },
  ];
  
  return (
    <div className="astra-section typography-section">
      <div className="astra-section-title">Typography</div>
      
      {/* Typography Tabs */}
      <div className="astra-tabs">
        <button
          onClick={() => setActiveTab('body')}
          className={`astra-tab ${activeTab === 'body' ? 'active' : ''}`}
        >
          <Type size={14} />
          Body
        </button>
        <button
          onClick={() => setActiveTab('headings')}
          className={`astra-tab ${activeTab === 'headings' ? 'active' : ''}`}
        >
          <Heading size={14} />
          Headings
        </button>
        <button
          onClick={() => setActiveTab('buttons')}
          className={`astra-tab ${activeTab === 'buttons' ? 'active' : ''}`}
        >
          <MousePointer size={14} />
          Buttons
        </button>
      </div>
      
      {activeTab === 'body' && (
        <div className="astra-section-group">
          <h4 className="astra-group-title">Body Typography</h4>
          
          <GoogleFontSelector
            label="Font Family"
            value={typography.bodyFont.fontFamily}
            onChange={(value) =>
              updateSetting('typography', value, ['bodyFont', 'fontFamily'])
            }
            description="Choose the main font for your site's body text"
          />
          
          <AstraSlider
            label="Font Size"
            value={typography.bodyFont.fontSize}
            onChange={(value) =>
              updateSetting('typography', value, ['bodyFont', 'fontSize'])
            }
            min={10}
            max={30}
            unit="px"
            responsive={true}
            description="Base font size for body text"
          />
          
          <AstraSelect
            label="Font Weight"
            value={String(typography.bodyFont.fontWeight)}
            onChange={(value) =>
              updateSetting('typography', Number(value) as FontWeight, ['bodyFont', 'fontWeight'])
            }
            options={fontWeightOptions}
            description="Weight of the body font"
          />
          
          <AstraSlider
            label="Line Height"
            value={typography.bodyFont.lineHeight}
            onChange={(value) =>
              updateSetting('typography', value, ['bodyFont', 'lineHeight'])
            }
            min={1}
            max={3}
            step={0.1}
            unit="em"
            responsive={true}
            description="Space between lines of text"
          />
          
          <AstraSlider
            label="Letter Spacing"
            value={typography.bodyFont.letterSpacing}
            onChange={(value) =>
              updateSetting('typography', value, ['bodyFont', 'letterSpacing'])
            }
            min={-2}
            max={5}
            step={0.1}
            unit="px"
            responsive={true}
            description="Space between individual letters"
          />
          
          <AstraSelect
            label="Text Transform"
            value={typography.bodyFont.textTransform}
            onChange={(value) =>
              updateSetting('typography', value as TextTransform, ['bodyFont', 'textTransform'])
            }
            options={textTransformOptions}
            description="Transform text case"
          />
        </div>
      )}
      
      {activeTab === 'headings' && (
        <div className="astra-section-group">
          <h4 className="astra-group-title">Heading Typography</h4>
          
          {(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const).map((heading) => {
            const headingSettings = typography.headings[heading];
            const isExpanded = expandedHeading === heading;
            
            return (
              <div key={heading} className="astra-accordion">
                <button
                  onClick={() => setExpandedHeading(isExpanded ? null : heading)}
                  className={`astra-accordion-header ${isExpanded ? 'active' : ''}`}
                >
                  <span>{heading.toUpperCase()} - Heading</span>
                  <span className="astra-accordion-icon">▼</span>
                </button>
                
                {isExpanded && (
                  <div className="astra-accordion-content">
                    <GoogleFontSelector
                      label="Font Family"
                      value={headingSettings.fontFamily}
                      onChange={(value) =>
                        updateSetting('typography', value, ['headings', heading, 'fontFamily'])
                      }
                      showPreview={false}
                    />
                    
                    <div className="astra-typography-group">
                      <AstraSlider
                        label="Font Size"
                        value={headingSettings.fontSize}
                        onChange={(value) =>
                          updateSetting('typography', value, ['headings', heading, 'fontSize'])
                        }
                        min={10}
                        max={80}
                        unit="px"
                        responsive={true}
                      />
                      
                      <AstraSelect
                        label="Font Weight"
                        value={String(headingSettings.fontWeight)}
                        onChange={(value) =>
                          updateSetting('typography', Number(value) as FontWeight, [
                            'headings',
                            heading,
                            'fontWeight',
                          ])
                        }
                        options={fontWeightOptions}
                      />
                    </div>
                    
                    <div className="astra-typography-group">
                      <AstraSlider
                        label="Line Height"
                        value={headingSettings.lineHeight}
                        onChange={(value) =>
                          updateSetting('typography', value, ['headings', heading, 'lineHeight'])
                        }
                        min={0.5}
                        max={3}
                        step={0.1}
                        unit="em"
                        responsive={true}
                      />
                      
                      <AstraSlider
                        label="Letter Spacing"
                        value={headingSettings.letterSpacing}
                        onChange={(value) =>
                          updateSetting('typography', value, ['headings', heading, 'letterSpacing'])
                        }
                        min={-5}
                        max={10}
                        step={0.1}
                        unit="px"
                        responsive={true}
                      />
                    </div>
                    
                    <AstraSelect
                      label="Text Transform"
                      value={headingSettings.textTransform}
                      onChange={(value) =>
                        updateSetting('typography', value as TextTransform, [
                          'headings',
                          heading,
                          'textTransform',
                        ])
                      }
                      options={textTransformOptions}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      {activeTab === 'buttons' && (
        <div className="astra-section-group">
          <h4 className="astra-group-title">Button Typography</h4>
          
          <GoogleFontSelector
            label="Font Family"
            value={typography.button.fontFamily}
            onChange={(value) =>
              updateSetting('typography', value, ['button', 'fontFamily'])
            }
            description="Font for buttons and call-to-action elements"
          />
          
          <AstraSlider
            label="Font Size"
            value={typography.button.fontSize}
            onChange={(value) =>
              updateSetting('typography', value, ['button', 'fontSize'])
            }
            min={10}
            max={24}
            unit="px"
            responsive={true}
            description="Button text size"
          />
          
          <AstraSelect
            label="Font Weight"
            value={String(typography.button.fontWeight)}
            onChange={(value) =>
              updateSetting('typography', Number(value) as FontWeight, ['button', 'fontWeight'])
            }
            options={fontWeightOptions}
            description="Button font weight"
          />
          
          <AstraSlider
            label="Letter Spacing"
            value={typography.button.letterSpacing}
            onChange={(value) =>
              updateSetting('typography', value, ['button', 'letterSpacing'])
            }
            min={0}
            max={5}
            step={0.1}
            unit="px"
            responsive={true}
            description="Space between button text letters"
          />
          
          <AstraSelect
            label="Text Transform"
            value={typography.button.textTransform}
            onChange={(value) =>
              updateSetting('typography', value as TextTransform, ['button', 'textTransform'])
            }
            options={textTransformOptions}
            description="Button text transformation"
          />
        </div>
      )}
      
      {/* Typography Preview */}
      <div className="astra-section-group">
        <h4 className="astra-group-title">Preview</h4>
        <div className="astra-typography-preview">
          <h1 style={{
            fontFamily: typography.headings.h1.fontFamily,
            fontSize: `${typography.headings.h1.fontSize.desktop}px`,
            fontWeight: typography.headings.h1.fontWeight,
            lineHeight: typography.headings.h1.lineHeight.desktop,
            letterSpacing: `${typography.headings.h1.letterSpacing.desktop}px`,
            textTransform: typography.headings.h1.textTransform,
          }}>
            Heading 1 Example
          </h1>
          <h2 style={{
            fontFamily: typography.headings.h2.fontFamily,
            fontSize: `${typography.headings.h2.fontSize.desktop}px`,
            fontWeight: typography.headings.h2.fontWeight,
            lineHeight: typography.headings.h2.lineHeight.desktop,
            letterSpacing: `${typography.headings.h2.letterSpacing.desktop}px`,
            textTransform: typography.headings.h2.textTransform,
          }}>
            Heading 2 Example
          </h2>
          <p style={{
            fontFamily: typography.bodyFont.fontFamily,
            fontSize: `${typography.bodyFont.fontSize.desktop}px`,
            fontWeight: typography.bodyFont.fontWeight,
            lineHeight: typography.bodyFont.lineHeight.desktop,
            letterSpacing: `${typography.bodyFont.letterSpacing.desktop}px`,
            textTransform: typography.bodyFont.textTransform,
          }}>
            This is a paragraph of body text. The quick brown fox jumps over the lazy dog. 
            This preview shows how your typography settings will look on the actual site.
          </p>
          <button style={{
            fontFamily: typography.button.fontFamily,
            fontSize: `${typography.button.fontSize.desktop}px`,
            fontWeight: typography.button.fontWeight,
            letterSpacing: `${typography.button.letterSpacing.desktop}px`,
            textTransform: typography.button.textTransform,
            padding: '10px 20px',
            background: settings.colors.primaryColor,
            color: '#fff',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
          }}>
            Button Example
          </button>
        </div>
      </div>
    </div>
  );
};