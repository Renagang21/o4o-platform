/**
 * SlideEditor - Edit individual slide content
 */

import React from 'react';
import { 
  Type, 
  Image, 
  Palette, 
  Upload,
  X
} from 'lucide-react';
import { Slide } from './types';

interface SlideEditorProps {
  slide: Slide;
  onChange: (slide: Partial<Slide>) => void;
  onMediaSelect: (media: { url: string; alt: string }) => void;
}

const SlideEditor: React.FC<SlideEditorProps> = ({
  slide,
  onChange,
  onMediaSelect
}) => {
  // Handle text changes
  const handleTextChange = (field: keyof Slide, value: string) => {
    onChange({ [field]: value });
  };

  // Handle color changes
  const handleColorChange = (field: 'backgroundColor' | 'textColor', value: string) => {
    onChange({ [field]: value });
  };

  // Handle image upload (simplified for Phase 1)
  const handleImageUpload = () => {
    // For Phase 1, we'll use a simple prompt
    // In production, this would open the WordPress media library
    const imageUrl = prompt('Enter image URL:');
    if (imageUrl) {
      onMediaSelect({ 
        url: imageUrl, 
        alt: slide.imageAlt || 'Slide image' 
      });
    }
  };

  // Remove image
  const removeImage = () => {
    onChange({ 
      imageUrl: undefined, 
      imageAlt: undefined 
    });
  };

  return (
    <div className="slide-editor">
      <div className="slide-editor__header">
        <h3>Edit Slide #{slide.order + 1}</h3>
        <span className="slide-type-badge">{slide.type}</span>
      </div>

      <div className="slide-editor__content">
        {/* Colors Section */}
        <div className="editor-section">
          <h4>Colors</h4>
          <div className="color-controls">
            <div className="color-control">
              <label>
                <Palette size={14} />
                Background Color
              </label>
              <div className="color-input-wrapper">
                <input
                  type="color"
                  value={slide.backgroundColor || '#ffffff'}
                  onChange={(e) => handleColorChange('backgroundColor', e.target.value)}
                />
                <input
                  type="text"
                  value={slide.backgroundColor || '#ffffff'}
                  onChange={(e) => handleColorChange('backgroundColor', e.target.value)}
                  placeholder="#ffffff"
                />
              </div>
            </div>
            
            {(slide.type === 'text' || slide.type === 'mixed') && (
              <div className="color-control">
                <label>
                  <Type size={14} />
                  Text Color
                </label>
                <div className="color-input-wrapper">
                  <input
                    type="color"
                    value={slide.textColor || '#000000'}
                    onChange={(e) => handleColorChange('textColor', e.target.value)}
                  />
                  <input
                    type="text"
                    value={slide.textColor || '#000000'}
                    onChange={(e) => handleColorChange('textColor', e.target.value)}
                    placeholder="#000000"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Text Content Section */}
        {(slide.type === 'text' || slide.type === 'mixed') && (
          <div className="editor-section">
            <h4>Text Content</h4>
            
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
              <label>Content</label>
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
            <h4>Image</h4>
            
            {slide.imageUrl ? (
              <div className="image-preview">
                <img 
                  src={slide.imageUrl} 
                  alt={slide.imageAlt || 'Slide image'} 
                />
                <div className="image-actions">
                  <button
                    onClick={handleImageUpload}
                    className="btn btn-secondary"
                  >
                    <Upload size={14} />
                    Replace Image
                  </button>
                  <button
                    onClick={removeImage}
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
                  onClick={handleImageUpload}
                  className="upload-btn"
                >
                  <Image size={24} />
                  <span>Click to add image</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Preview Section */}
        <div className="editor-section">
          <h4>Preview</h4>
          <div 
            className="slide-preview"
            style={{
              backgroundColor: slide.backgroundColor || '#ffffff',
              color: slide.textColor || '#000000'
            }}
          >
            {slide.imageUrl && slide.type === 'image' && (
              <div className="preview-image-only">
                <img src={slide.imageUrl} alt={slide.imageAlt} />
              </div>
            )}
            
            {slide.type === 'mixed' && (
              <div className="preview-mixed">
                {slide.imageUrl && (
                  <div className="preview-mixed__image">
                    <img src={slide.imageUrl} alt={slide.imageAlt} />
                  </div>
                )}
                <div className="preview-mixed__text">
                  {slide.title && <h2>{slide.title}</h2>}
                  {slide.subtitle && <h3>{slide.subtitle}</h3>}
                  {slide.content && <p>{slide.content}</p>}
                </div>
              </div>
            )}
            
            {slide.type === 'text' && (
              <div className="preview-text">
                {slide.title && <h2>{slide.title}</h2>}
                {slide.subtitle && <h3>{slide.subtitle}</h3>}
                {slide.content && <p>{slide.content}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlideEditor;