/**
 * SlideBlock - Phase 2: Advanced Slide System
 * Main component for slide presentation block with advanced features
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  ChevronUp, 
  ChevronDown,
  Image,
  Type,
  Play,
  Pause,
  Settings,
  Maximize2,
  Grid,
  Layers,
  Copy,
  Eye
} from 'lucide-react';
import SlideEditor from './SlideEditor';
import AdvancedSlideEditor from './AdvancedSlideEditor';
import SlideViewer from './SlideViewer';
import EnhancedSlideViewer from './EnhancedSlideViewer';
import BasicNavigation from './BasicNavigation';
import SlideSortableList from './SlideSortableList';
import BulkEditPanel from './BulkEditPanel';
import useKeyboardNavigation from './useKeyboardNavigation';
import useTouchGestures from './useTouchGestures';
import useMouseInteractions from './useMouseInteractions';
import { SlideProgress } from './SlideProgress';
import { SlideAnnouncer, FocusTrap, SkipLinks } from './SlideAccessibility';
import { Slide, SlideBlockAttributes } from './types';
import './SlideBlock.css';
import './AdvancedTransitions.css';
import './InteractionStyles.css';

// Re-export types for backward compatibility
export type { Slide, SlideBlockAttributes } from './types';

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
  const [presentationMode, setPresentationMode] = useState(false);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [selectedSlides, setSelectedSlides] = useState<Set<number>>(new Set());
  const [useAdvancedEditor, setUseAdvancedEditor] = useState(true);
  const [showThumbnails, setShowThumbnails] = useState(attributes.showThumbnails ?? true);
  const [pausedForHover, setPausedForHover] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const {
    slides = [],
    aspectRatio = '16:9',
    transition = 'fade',
    autoPlay = false,
    autoPlayInterval = 5000,
    showNavigation = true,
    showPagination = true,
    backgroundColor = '#f0f0f0',
    enableKeyboardNavigation = true,
    fullscreenEnabled = true,
    loop = true
  } = attributes;

  // Initialize with one slide if empty
  useEffect(() => {
    if (slides.length === 0) {
      addSlide('text');
    }
  }, []);

  // Auto-play functionality with hover pause
  useEffect(() => {
    if (isPlaying && !pausedForHover && slides.length > 1) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      }, autoPlayInterval);
      return () => clearInterval(interval);
    }
  }, [isPlaying, pausedForHover, slides.length, autoPlayInterval]);

  // Detect touch device
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

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

  // Duplicate slide
  const duplicateSlide = (index: number) => {
    const slideToDuplicate = slides[index];
    const newSlide: Slide = {
      ...slideToDuplicate,
      id: generateId(),
      order: index + 1,
      title: slideToDuplicate.title ? `${slideToDuplicate.title} (Copy)` : undefined
    };
    
    const newSlides = [
      ...slides.slice(0, index + 1),
      newSlide,
      ...slides.slice(index + 1)
    ];
    
    // Update order numbers
    newSlides.forEach((slide, i) => {
      slide.order = i;
    });
    
    setAttributes({ slides: newSlides });
    setCurrentSlide(index + 1);
  };

  // Bulk edit functions
  const applyBulkChanges = (indices: number[], changes: Partial<Slide>) => {
    const newSlides = [...slides];
    indices.forEach(index => {
      newSlides[index] = { ...newSlides[index], ...changes };
    });
    setAttributes({ slides: newSlides });
  };

  const duplicateSelectedSlides = () => {
    const indicesToDuplicate = Array.from(selectedSlides).sort((a, b) => b - a);
    let newSlides = [...slides];
    
    indicesToDuplicate.forEach(index => {
      const slideToDuplicate = slides[index];
      const newSlide: Slide = {
        ...slideToDuplicate,
        id: generateId(),
        title: slideToDuplicate.title ? `${slideToDuplicate.title} (Copy)` : undefined
      };
      newSlides.splice(index + 1, 0, newSlide);
    });
    
    // Update order numbers
    newSlides.forEach((slide, i) => {
      slide.order = i;
    });
    
    setAttributes({ slides: newSlides });
    setSelectedSlides(new Set());
  };

  const deleteSelectedSlides = () => {
    if (selectedSlides.size === slides.length) {
      alert('You must keep at least one slide');
      return;
    }
    
    const newSlides = slides.filter((_, index) => !selectedSlides.has(index));
    setAttributes({ slides: newSlides });
    setSelectedSlides(new Set());
    
    if (currentSlide >= newSlides.length) {
      setCurrentSlide(Math.max(0, newSlides.length - 1));
    }
  };

  const toggleVisibilitySelected = () => {
    const newSlides = [...slides];
    selectedSlides.forEach(index => {
      newSlides[index] = {
        ...newSlides[index],
        visible: newSlides[index].visible === false ? true : false
      };
    });
    setAttributes({ slides: newSlides });
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
    if (loop) {
      setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    } else {
      setCurrentSlide((prev) => Math.max(0, prev - 1));
    }
  };

  const goToNextSlide = () => {
    if (loop) {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    } else {
      setCurrentSlide((prev) => Math.min(slides.length - 1, prev + 1));
    }
  };

  const goToSlide = (index: number) => {
    if (index >= 0 && index < slides.length) {
      setCurrentSlide(index);
    }
  };

  // Fullscreen handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen();
      setPresentationMode(true);
    } else if (document.fullscreenElement) {
      document.exitFullscreen();
      setPresentationMode(false);
    }
  };

  // Keyboard navigation
  const { shortcuts } = useKeyboardNavigation({
    onNext: goToNextSlide,
    onPrev: goToPrevSlide,
    onTogglePlay: () => setIsPlaying(!isPlaying),
    onEscape: () => {
      if (presentationMode) {
        toggleFullscreen();
      }
    },
    onFullscreen: toggleFullscreen,
    onDelete: () => {
      if (selectedSlides.size > 0) {
        deleteSelectedSlides();
      } else {
        deleteSlide(currentSlide);
      }
    },
    onDuplicate: () => {
      if (selectedSlides.size > 0) {
        duplicateSelectedSlides();
      } else {
        duplicateSlide(currentSlide);
      }
    },
    enabled: enableKeyboardNavigation && !presentationMode,
    isEditing
  });

  // Handle slide go to event
  useEffect(() => {
    const handleGoTo = (e: CustomEvent) => {
      goToSlide(e.detail);
    };
    window.addEventListener('slideGoTo', handleGoTo as any);
    return () => {
      window.removeEventListener('slideGoTo', handleGoTo as any);
    };
  }, []);

  // Touch gestures
  const { attachToElement: attachTouchElement } = useTouchGestures({
    onSwipeLeft: goToNextSlide,
    onSwipeRight: goToPrevSlide,
    onDoubleTap: () => setIsPlaying(!isPlaying),
    enabled: isTouchDevice && !isEditing
  });

  // Mouse interactions
  const { attachToElement: attachMouseElement } = useMouseInteractions({
    onWheelNext: goToNextSlide,
    onWheelPrev: goToPrevSlide,
    onHoverStart: () => setPausedForHover(true),
    onHoverEnd: () => setPausedForHover(false),
    enabled: !isEditing && !presentationMode,
    pauseOnHover: autoPlay
  });

  // Attach interactions to viewport
  useEffect(() => {
    if (viewportRef.current) {
      attachTouchElement(viewportRef.current);
      attachMouseElement(viewportRef.current);
    }
  }, [viewportRef.current, isEditing, presentationMode]);

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
    <div 
      ref={containerRef}
      className={`slide-block ${className} ${isSelected ? 'selected' : ''} ${presentationMode ? 'presentation-mode' : ''} ${isTouchDevice ? 'slide-block--touch-enabled' : ''}`}
      role="region"
      aria-label="Slide presentation"
    >
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
            
            {fullscreenEnabled && (
              <button
                className="toolbar-btn"
                onClick={toggleFullscreen}
                title="Fullscreen"
              >
                <Maximize2 size={16} />
                Fullscreen
              </button>
            )}
            
            <button
              className="toolbar-btn"
              onClick={() => setShowThumbnails(!showThumbnails)}
              title={showThumbnails ? 'Hide Thumbnails' : 'Show Thumbnails'}
            >
              <Grid size={16} />
              Thumbnails
            </button>
            
            {selectedSlides.size > 0 && (
              <button
                className="toolbar-btn"
                onClick={() => setShowBulkEdit(!showBulkEdit)}
                title="Bulk Edit"
              >
                <Layers size={16} />
                Bulk Edit ({selectedSlides.size})
              </button>
            )}
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
              <option value="zoom">Zoom</option>
              <option value="flip">Flip</option>
              <option value="cube">Cube</option>
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
            {/* Slide List or Sortable List */}
            <div className="slide-list">
              <div className="slide-list__header">
                <h3>Slides ({slides.length})</h3>
                <div className="slide-list__actions">
                  <button
                    className="btn-add"
                    onClick={() => setUseAdvancedEditor(!useAdvancedEditor)}
                    title="Toggle Advanced Editor"
                  >
                    <Settings size={16} />
                  </button>
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

              {showThumbnails ? (
                <SlideSortableList
                  slides={slides}
                  currentSlide={currentSlide}
                  onReorder={(newSlides) => setAttributes({ slides: newSlides })}
                  onSelect={setCurrentSlide}
                  onDuplicate={duplicateSlide}
                  onDelete={deleteSlide}
                  onToggleVisibility={(index) => {
                    const newSlides = [...slides];
                    newSlides[index] = {
                      ...newSlides[index],
                      visible: newSlides[index].visible === false ? true : false
                    };
                    setAttributes({ slides: newSlides });
                  }}
                  selectedSlides={selectedSlides}
                  onSelectionChange={setSelectedSlides}
                />
              ) : (
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
                            duplicateSlide(index);
                          }}
                          title="Duplicate Slide"
                        >
                          <Copy size={14} />
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
              )}
            </div>

            {/* Slide Editor */}
            <div className="slide-editor-container">
              {showBulkEdit && selectedSlides.size > 0 ? (
                <BulkEditPanel
                  slides={slides}
                  selectedIndices={selectedSlides}
                  onApplyChanges={applyBulkChanges}
                  onDuplicateSelected={duplicateSelectedSlides}
                  onDeleteSelected={deleteSelectedSlides}
                  onToggleVisibilitySelected={toggleVisibilitySelected}
                  onClose={() => setShowBulkEdit(false)}
                />
              ) : slides[currentSlide] && (
                useAdvancedEditor ? (
                  <AdvancedSlideEditor
                    slide={slides[currentSlide]}
                    onChange={(updatedSlide) => updateSlide(currentSlide, updatedSlide)}
                    onMediaSelect={(media) => {
                      updateSlide(currentSlide, {
                        imageUrl: media.url,
                        imageAlt: media.alt
                      });
                    }}
                  />
                ) : (
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
                )
              )}
            </div>
          </div>
        ) : (
          /* Preview Mode */
          <FocusTrap active={presentationMode} onEscape={() => setPresentationMode(false)}>
            <div 
              className="slide-block__viewer"
              style={{ backgroundColor }}
              ref={viewportRef}
            >
              <SkipLinks
                onSkipToContent={() => viewportRef.current?.focus()}
                onSkipToNavigation={() => (document.querySelector('.slide-navigation') as HTMLElement)?.focus()}
              />
              
              <SlideAnnouncer
                currentSlide={currentSlide}
                totalSlides={slides.length}
                slideTitle={slides[currentSlide]?.title}
                isPlaying={isPlaying && !pausedForHover}
              />
              
              <div 
                className="slide-viewport"
                style={getAspectRatioStyle()}
                role="application"
                aria-roledescription="slide viewer"
              >
                <div className="slide-viewport__inner">
                  {slides[currentSlide] && (
                    <EnhancedSlideViewer
                      slide={slides[currentSlide]}
                      transition={transition}
                      isActive={true}
                      lazyLoad={true}
                      reducedMotion={false}
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
                  
                  <SlideProgress
                    current={currentSlide}
                    total={slides.length}
                    autoPlayInterval={autoPlayInterval}
                    isPlaying={isPlaying && !pausedForHover}
                    showProgressBar={true}
                    position="bottom"
                  />
                </div>
              </div>
            </div>
          </FocusTrap>
        )}
      </div>
    </div>
  );
};

export default SlideBlock;