/**
 * AdvancedSlideEditor - Enhanced editor with gradient and advanced text styles
 * Phase 2: Advanced editing features
 */

import React, { useState } from 'react';
import { 
  Type, 
  Image, 
  Palette, 
  Upload,
  X,
  Sliders,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Sparkles
} from 'lucide-react';
import { Slide } from './types';

interface AdvancedSlideEditorProps {
  slide: Slide;
  onChange: (slide: Partial<Slide>) => void;
  onMediaSelect: (media: { url: string; alt: string }) => void;
}

const AdvancedSlideEditor: React.FC<AdvancedSlideEditorProps> = ({
  slide,
  onChange,
  onMediaSelect
}) => {
  const [showGradient, setShowGradient] = useState(!!slide.backgroundGradient);
  const [gradientColors, setGradientColors] = useState<string[]>(
    slide.backgroundGradient?.colors || ['#ffffff', '#000000']
  );
  const [gradientAngle, setGradientAngle] = useState(
    slide.backgroundGradient?.angle || 90
  );
  const [backgroundImage, setBackgroundImage] = useState(slide.backgroundImage || '');
  
  // Text formatting states
  const textStyles = slide.textStyles || {};
  const [fontSize, setFontSize] = useState(textStyles.fontSize || 'medium');
  const [fontWeight, setFontWeight] = useState(textStyles.fontWeight || '400');
  const [textAlign, setTextAlign] = useState(textStyles.textAlign || 'center');
  const [textShadow, setTextShadow] = useState(textStyles.textShadow || 'none');
  const [lineHeight, setLineHeight] = useState(textStyles.lineHeight || '1.6');

  // Handle text changes
  const handleTextChange = (field: keyof Slide, value: string) => {
    onChange({ [field]: value });
  };

  // Handle gradient changes
  const handleGradientChange = () => {
    if (showGradient) {
      onChange({
        backgroundGradient: {
          type: 'linear',
          angle: gradientAngle,
          colors: gradientColors
        }
      });
    } else {
      onChange({ backgroundGradient: undefined });
    }
  };

  // Add gradient color stop
  const addGradientColor = () => {
    if (gradientColors.length < 4) {
      const newColors = [...gradientColors, '#808080'];
      setGradientColors(newColors);
      onChange({
        backgroundGradient: {
          type: 'linear',
          angle: gradientAngle,
          colors: newColors
        }
      });
    }
  };

  // Remove gradient color stop
  const removeGradientColor = (index: number) => {
    if (gradientColors.length > 2) {
      const newColors = gradientColors.filter((_, i) => i !== index);
      setGradientColors(newColors);
      onChange({
        backgroundGradient: {
          type: 'linear',
          angle: gradientAngle,
          colors: newColors
        }
      });
    }
  };

  // Handle background image
  const handleBackgroundImage = () => {
    const imageUrl = prompt('Enter background image URL:');
    if (imageUrl) {
      setBackgroundImage(imageUrl);
      onChange({ backgroundImage: imageUrl });
    }
  };

  // Remove background image
  const removeBackgroundImage = () => {
    setBackgroundImage('');
    onChange({ backgroundImage: undefined });
  };

  // Handle text style changes
  const updateTextStyles = (newStyles: any) => {
    const updatedStyles = { ...textStyles, ...newStyles };
    onChange({ textStyles: updatedStyles });
  };

  return (
    <div className="advanced-slide-editor">
      <div className="slide-editor__header">
        <h3>Edit Slide #{slide.order + 1}</h3>
        <div className="slide-type-indicators">
          <span className="slide-type-badge">{slide.type}</span>
          {slide.transitionType && (
            <span className="transition-badge">{slide.transitionType}</span>
          )}
        </div>
      </div>

      <div className="slide-editor__content">
        {/* Background Section */}
        <div className="editor-section">
          <h4>
            <Palette size={14} />
            Background
          </h4>
          
          {/* Background Type Selector */}
          <div className="background-type-selector">
            <label className="radio-option">
              <input
                type="radio"
                name="bgType"
                checked={!showGradient && !backgroundImage}
                onChange={() => {
                  setShowGradient(false);
                  setBackgroundImage('');
                  onChange({ 
                    backgroundGradient: undefined,
                    backgroundImage: undefined 
                  });
                }}
              />
              Solid Color
            </label>
            <label className="radio-option">
              <input
                type="radio"
                name="bgType"
                checked={showGradient}
                onChange={() => {
                  setShowGradient(true);
                  setBackgroundImage('');
                  handleGradientChange();
                }}
              />
              Gradient
            </label>
            <label className="radio-option">
              <input
                type="radio"
                name="bgType"
                checked={!!backgroundImage}
                onChange={() => {
                  setShowGradient(false);
                  if (!backgroundImage) {
                    handleBackgroundImage();
                  }
                }}
              />
              Image
            </label>
          </div>

          {/* Solid Color */}
          {!showGradient && !backgroundImage && (
            <div className="color-control">
              <label>Background Color</label>
              <div className="color-input-wrapper">
                <input
                  type="color"
                  value={slide.backgroundColor || '#ffffff'}
                  onChange={(e) => onChange({ backgroundColor: e.target.value })}
                />
                <input
                  type="text"
                  value={slide.backgroundColor || '#ffffff'}
                  onChange={(e) => onChange({ backgroundColor: e.target.value })}
                  placeholder="#ffffff"
                />
              </div>
            </div>
          )}

          {/* Gradient Controls */}
          {showGradient && (
            <div className="gradient-editor">
              <div className="gradient-preview" 
                style={{
                  background: `linear-gradient(${gradientAngle}deg, ${gradientColors.join(', ')})`
                }}
              />
              
              <div className="gradient-colors-list">
                {gradientColors.map((color, index) => (
                  <div key={index} className="gradient-color-item">
                    <span>Color {index + 1}</span>
                    <div className="color-input-wrapper">
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => {
                          const newColors = [...gradientColors];
                          newColors[index] = e.target.value;
                          setGradientColors(newColors);
                          handleGradientChange();
                        }}
                      />
                      <input
                        type="text"
                        value={color}
                        onChange={(e) => {
                          const newColors = [...gradientColors];
                          newColors[index] = e.target.value;
                          setGradientColors(newColors);
                          handleGradientChange();
                        }}
                      />
                      {gradientColors.length > 2 && (
                        <button
                          className="remove-color-btn"
                          onClick={() => removeGradientColor(index)}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {gradientColors.length < 4 && (
                <button className="add-color-btn" onClick={addGradientColor}>
                  + Add Color Stop
                </button>
              )}
              
              <div className="gradient-angle-control">
                <label>Angle: {gradientAngle}°</label>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={gradientAngle}
                  onChange={(e) => {
                    const angle = parseInt(e.target.value);
                    setGradientAngle(angle);
                    onChange({
                      backgroundGradient: {
                        type: 'linear',
                        angle,
                        colors: gradientColors
                      }
                    });
                  }}
                />
              </div>
            </div>
          )}

          {/* Background Image */}
          {backgroundImage && (
            <div className="background-image-control">
              <div className="image-preview">
                <img src={backgroundImage} alt="Background" />
                <div className="image-actions">
                  <button onClick={handleBackgroundImage} className="btn btn-secondary">
                    <Upload size={14} />
                    Replace
                  </button>
                  <button onClick={removeBackgroundImage} className="btn btn-danger">
                    <X size={14} />
                    Remove
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Advanced Text Styling */}
        {(slide.type === 'text' || slide.type === 'mixed') && (
          <div className="editor-section">
            <h4>
              <Type size={14} />
              Text Styling
            </h4>

            {/* Text Color */}
            <div className="color-control">
              <label>Text Color</label>
              <div className="color-input-wrapper">
                <input
                  type="color"
                  value={slide.textColor || '#000000'}
                  onChange={(e) => onChange({ textColor: e.target.value })}
                />
                <input
                  type="text"
                  value={slide.textColor || '#000000'}
                  onChange={(e) => onChange({ textColor: e.target.value })}
                  placeholder="#000000"
                />
              </div>
            </div>

            {/* Font Size */}
            <div className="form-group">
              <label>Font Size</label>
              <div className="button-group">
                {['small', 'medium', 'large', 'x-large'].map(size => (
                  <button
                    key={size}
                    className={`size-btn ${fontSize === size ? 'active' : ''}`}
                    onClick={() => {
                      setFontSize(size as 'small' | 'medium' | 'large' | 'x-large');
                      updateTextStyles({ fontSize: size });
                    }}
                  >
                    {size.charAt(0).toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Weight */}
            <div className="form-group">
              <label>Font Weight</label>
              <input
                type="range"
                min="300"
                max="900"
                step="100"
                value={fontWeight}
                onChange={(e) => {
                  setFontWeight(e.target.value);
                  updateTextStyles({ fontWeight: e.target.value });
                }}
              />
              <span className="range-value">{fontWeight}</span>
            </div>

            {/* Text Alignment */}
            <div className="form-group">
              <label>Text Alignment</label>
              <div className="button-group">
                <button
                  className={`align-btn ${textAlign === 'left' ? 'active' : ''}`}
                  onClick={() => {
                    setTextAlign('left');
                    updateTextStyles({ textAlign: 'left' });
                  }}
                >
                  <AlignLeft size={16} />
                </button>
                <button
                  className={`align-btn ${textAlign === 'center' ? 'active' : ''}`}
                  onClick={() => {
                    setTextAlign('center');
                    updateTextStyles({ textAlign: 'center' });
                  }}
                >
                  <AlignCenter size={16} />
                </button>
                <button
                  className={`align-btn ${textAlign === 'right' ? 'active' : ''}`}
                  onClick={() => {
                    setTextAlign('right');
                    updateTextStyles({ textAlign: 'right' });
                  }}
                >
                  <AlignRight size={16} />
                </button>
              </div>
            </div>

            {/* Text Shadow */}
            <div className="form-group">
              <label>
                <Sparkles size={14} />
                Text Shadow
              </label>
              <select
                value={textShadow}
                onChange={(e) => {
                  setTextShadow(e.target.value as 'none' | 'subtle' | 'medium' | 'strong' | 'glow');
                  updateTextStyles({ textShadow: e.target.value });
                }}
              >
                <option value="none">None</option>
                <option value="subtle">Subtle</option>
                <option value="medium">Medium</option>
                <option value="strong">Strong</option>
                <option value="glow">Glow Effect</option>
              </select>
            </div>

            {/* Line Height */}
            <div className="form-group">
              <label>Line Height</label>
              <input
                type="range"
                min="1"
                max="3"
                step="0.1"
                value={lineHeight}
                onChange={(e) => {
                  setLineHeight(e.target.value);
                  updateTextStyles({ lineHeight: e.target.value });
                }}
              />
              <span className="range-value">{lineHeight}</span>
            </div>
          </div>
        )}

        {/* Text Content */}
        {(slide.type === 'text' || slide.type === 'mixed') && (
          <div className="editor-section">
            <h4>Content</h4>
            
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                value={slide.title || ''}
                onChange={(e) => handleTextChange('title', e.target.value)}
                placeholder="Enter slide title..."
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Subtitle</label>
              <input
                type="text"
                value={slide.subtitle || ''}
                onChange={(e) => handleTextChange('subtitle', e.target.value)}
                placeholder="Enter slide subtitle..."
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Body Text</label>
              <textarea
                value={slide.content || ''}
                onChange={(e) => handleTextChange('content', e.target.value)}
                placeholder="Enter slide content..."
                className="form-textarea"
                rows={5}
              />
            </div>
          </div>
        )}

        {/* Image Section */}
        {(slide.type === 'image' || slide.type === 'mixed') && (
          <div className="editor-section">
            <h4>
              <Image size={14} />
              Main Image
            </h4>
            
            {slide.imageUrl ? (
              <div className="image-preview">
                <img src={slide.imageUrl} alt={slide.imageAlt || 'Slide image'} />
                <div className="image-actions">
                  <button
                    onClick={() => {
                      const imageUrl = prompt('Enter image URL:', slide.imageUrl);
                      if (imageUrl) {
                        onMediaSelect({ 
                          url: imageUrl, 
                          alt: slide.imageAlt || 'Slide image' 
                        });
                      }
                    }}
                    className="btn btn-secondary"
                  >
                    <Upload size={14} />
                    Replace
                  </button>
                  <button
                    onClick={() => onChange({ 
                      imageUrl: undefined, 
                      imageAlt: undefined 
                    })}
                    className="btn btn-danger"
                  >
                    <X size={14} />
                    Remove
                  </button>
                </div>
                
                <div className="form-group">
                  <label>Alt Text</label>
                  <input
                    type="text"
                    value={slide.imageAlt || ''}
                    onChange={(e) => handleTextChange('imageAlt', e.target.value)}
                    placeholder="Describe the image..."
                    className="form-input"
                  />
                </div>
              </div>
            ) : (
              <div className="image-upload">
                <button
                  onClick={() => {
                    const imageUrl = prompt('Enter image URL:');
                    if (imageUrl) {
                      onMediaSelect({ 
                        url: imageUrl, 
                        alt: 'Slide image' 
                      });
                    }
                  }}
                  className="upload-btn"
                >
                  <Image size={24} />
                  <span>Click to add image</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedSlideEditor;