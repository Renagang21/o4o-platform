/**
 * SlideBlock - Phase 1: Basic Slide System
 * Main component for slide presentation block
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  ChevronUp, 
  ChevronDown,
  Image,
  Type,
  Play,
  Pause,
  Settings
} from 'lucide-react';
import SlideEditor from './SlideEditor';
import SlideViewer from './SlideViewer';
import BasicNavigation from './BasicNavigation';
import './SlideBlock.css';

export interface Slide {
  id: string;
  type: 'text' | 'image' | 'mixed';
  title?: string;
  subtitle?: string;
  content?: string;
  imageUrl?: string;
  imageAlt?: string;
  backgroundColor?: string;
  textColor?: string;
  order: number;
}

export interface SlideBlockAttributes {
  slides: Slide[];
  aspectRatio: '16:9' | '4:3' | '1:1';
  transition: 'fade' | 'slide' | 'none';
  autoPlay: boolean;
  autoPlayInterval: number;
  showNavigation: boolean;
  showPagination: boolean;
  backgroundColor?: string;
}

interface SlideBlockProps {
  attributes: SlideBlockAttributes;
  setAttributes: (attributes: Partial<SlideBlockAttributes>) => void;
  isSelected?: boolean;
  className?: string;
}

const SlideBlock: React.FC<SlideBlockProps> = ({
  attributes,
  setAttributes,
  isSelected = false,
  className = ''
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(attributes.autoPlay);
  const [isEditing, setIsEditing] = useState(true);

  const {
    slides = [],
    aspectRatio = '16:9',
    transition = 'fade',
    autoPlay = false,
    autoPlayInterval = 5000,
    showNavigation = true,
    showPagination = true,
    backgroundColor = '#f0f0f0'
  } = attributes;

  // Initialize with one slide if empty
  useEffect(() => {
    if (slides.length === 0) {
      addSlide('text');
    }
  }, []);

  // Auto-play functionality
  useEffect(() => {
    if (isPlaying && slides.length > 1) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      }, autoPlayInterval);
      return () => clearInterval(interval);
    }
  }, [isPlaying, slides.length, autoPlayInterval]);

  // Generate unique ID
  const generateId = () => `slide-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Add new slide
  const addSlide = (type: 'text' | 'image' | 'mixed') => {
    const newSlide: Slide = {
      id: generateId(),
      type,
      order: slides.length,
      backgroundColor: '#ffffff',
      textColor: '#000000',
      title: type === 'image' ? '' : 'New Slide Title',
      subtitle: type === 'image' ? '' : 'Add your subtitle here',
      content: type === 'image' ? '' : 'Enter your content here...'
    };

    setAttributes({
      slides: [...slides, newSlide]
    });
    setCurrentSlide(slides.length);
  };

  // Delete slide
  const deleteSlide = (index: number) => {
    if (slides.length <= 1) {
      alert('You must have at least one slide');
      return;
    }

    const newSlides = slides.filter((_, i) => i !== index);
    setAttributes({ slides: newSlides });
    
    if (currentSlide >= newSlides.length) {
      setCurrentSlide(newSlides.length - 1);
    }
  };

  // Update slide
  const updateSlide = (index: number, updatedSlide: Partial<Slide>) => {
    const newSlides = [...slides];
    newSlides[index] = { ...newSlides[index], ...updatedSlide };
    setAttributes({ slides: newSlides });
  };

  // Move slide up/down
  const moveSlide = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= slides.length) {
      return;
    }

    const newSlides = [...slides];
    [newSlides[index], newSlides[newIndex]] = [newSlides[newIndex], newSlides[index]];
    
    // Update order
    newSlides.forEach((slide, i) => {
      slide.order = i;
    });
    
    setAttributes({ slides: newSlides });
    setCurrentSlide(newIndex);
  };

  // Navigation handlers
  const goToPrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  // Get aspect ratio styles
  const getAspectRatioStyle = () => {
    const ratios = {
      '16:9': { paddingTop: '56.25%' },
      '4:3': { paddingTop: '75%' },
      '1:1': { paddingTop: '100%' }
    };
    return ratios[aspectRatio];
  };

  return (
    <div className={`slide-block ${className} ${isSelected ? 'selected' : ''}`}>
      {/* Toolbar */}
      {isSelected && (
        <div className="slide-block__toolbar">
          <div className="toolbar-group">
            <button
              className="toolbar-btn"
              onClick={() => setIsEditing(!isEditing)}
              title={isEditing ? 'Preview' : 'Edit'}
            >
              {isEditing ? <Play size={16} /> : <Settings size={16} />}
              {isEditing ? 'Preview' : 'Edit'}
            </button>
            
            <button
              className="toolbar-btn"
              onClick={() => setIsPlaying(!isPlaying)}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              {isPlaying ? 'Pause' : 'Auto-play'}
            </button>
          </div>

          <div className="toolbar-group">
            <label>Aspect Ratio:</label>
            <select
              value={aspectRatio}
              onChange={(e) => setAttributes({ 
                aspectRatio: e.target.value as '16:9' | '4:3' | '1:1' 
              })}
              className="toolbar-select"
            >
              <option value="16:9">16:9</option>
              <option value="4:3">4:3</option>
              <option value="1:1">1:1</option>
            </select>
          </div>

          <div className="toolbar-group">
            <label>Transition:</label>
            <select
              value={transition}
              onChange={(e) => setAttributes({ 
                transition: e.target.value as 'fade' | 'slide' | 'none' 
              })}
              className="toolbar-select"
            >
              <option value="fade">Fade</option>
              <option value="slide">Slide</option>
              <option value="none">None</option>
            </select>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="slide-block__content">
        {isEditing && isSelected ? (
          /* Edit Mode */
          <div className="slide-block__editor">
            {/* Slide List */}
            <div className="slide-list">
              <div className="slide-list__header">
                <h3>Slides ({slides.length})</h3>
                <div className="slide-list__actions">
                  <button
                    className="btn-add"
                    onClick={() => addSlide('text')}
                    title="Add Text Slide"
                  >
                    <Type size={16} />
                  </button>
                  <button
                    className="btn-add"
                    onClick={() => addSlide('image')}
                    title="Add Image Slide"
                  >
                    <Image size={16} />
                  </button>
                  <button
                    className="btn-add"
                    onClick={() => addSlide('mixed')}
                    title="Add Mixed Slide"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              <div className="slide-list__items">
                {slides.map((slide, index) => (
                  <div
                    key={slide.id}
                    className={`slide-item ${currentSlide === index ? 'active' : ''}`}
                    onClick={() => setCurrentSlide(index)}
                  >
                    <div className="slide-item__header">
                      <span className="slide-number">#{index + 1}</span>
                      <span className="slide-type">{slide.type}</span>
                    </div>
                    
                    <div className="slide-item__preview">
                      {slide.title && <div className="preview-title">{slide.title}</div>}
                      {slide.imageUrl && <div className="preview-image">🖼️ Image</div>}
                    </div>

                    <div className="slide-item__actions">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveSlide(index, 'up');
                        }}
                        disabled={index === 0}
                        title="Move Up"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveSlide(index, 'down');
                        }}
                        disabled={index === slides.length - 1}
                        title="Move Down"
                      >
                        <ChevronDown size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSlide(index);
                        }}
                        className="btn-delete"
                        title="Delete Slide"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Slide Editor */}
            <div className="slide-editor-container">
              {slides[currentSlide] && (
                <SlideEditor
                  slide={slides[currentSlide]}
                  onChange={(updatedSlide) => updateSlide(currentSlide, updatedSlide)}
                  onMediaSelect={(media) => {
                    updateSlide(currentSlide, {
                      imageUrl: media.url,
                      imageAlt: media.alt
                    });
                  }}
                />
              )}
            </div>
          </div>
        ) : (
          /* Preview Mode */
          <div 
            className="slide-block__viewer"
            style={{ backgroundColor }}
          >
            <div 
              className="slide-viewport"
              style={getAspectRatioStyle()}
            >
              <div className="slide-viewport__inner">
                {slides[currentSlide] && (
                  <SlideViewer
                    slide={slides[currentSlide]}
                    transition={transition}
                    isActive={true}
                  />
                )}

                {showNavigation && slides.length > 1 && (
                  <BasicNavigation
                    currentSlide={currentSlide}
                    totalSlides={slides.length}
                    onPrev={goToPrevSlide}
                    onNext={goToNextSlide}
                    onGoToSlide={goToSlide}
                    showPagination={showPagination}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SlideBlock;