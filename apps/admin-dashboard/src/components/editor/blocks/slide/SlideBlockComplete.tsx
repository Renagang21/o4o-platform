/**
 * SlideBlockComplete - Complete integration of Phase 1-4 features
 * Main component for advanced slide presentation system
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Eye,
  Video,
  Link,
  Timer,
  Filter,
  Save,
  FolderOpen
} from 'lucide-react';

// Phase 1-3 Components
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

// Phase 4 Components
import VideoSlide from './VideoSlide';
import SlideLink, { LinkEditor } from './SlideLink';
import SlideTemplates from './SlideTemplates';
import { SlideTiming, SlideTimingManager } from './SlideTiming';
import SlideConditional, { evaluateSlideConditions } from './SlideConditional';
import SlideGroups from './SlideGroups';

// Types
import { 
  Slide, 
  SlideBlockAttributes, 
  SlideGroup, 
  SlideTemplate,
  SlideTimingConfig,
  ConditionalConfig,
  LinkConfig,
  CTAButton,
  VideoConfig
} from './types';

// Styles
import './SlideBlock.css';
import './AdvancedTransitions.css';
import './InteractionStyles.css';

interface SlideBlockCompleteProps {
  attributes: SlideBlockAttributes;
  setAttributes: (attributes: Partial<SlideBlockAttributes>) => void;
  isSelected?: boolean;
  className?: string;
}

const SlideBlockComplete: React.FC<SlideBlockCompleteProps> = ({
  attributes,
  setAttributes,
  isSelected = false,
  className = ''
}) => {
  // State management
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
  
  // Phase 4 state
  const [activeTab, setActiveTab] = useState<'slides' | 'templates' | 'groups' | 'timing' | 'conditional'>('slides');
  const [showVideoEditor, setShowVideoEditor] = useState(false);
  const [showLinkEditor, setShowLinkEditor] = useState(false);
  const [currentSlideTimer, setCurrentSlideTimer] = useState<number>(0);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const slideTimerRef = useRef<NodeJS.Timeout>();

  // Destructure attributes
  const {
    slides = [],
    groups = [],
    templates = [],
    aspectRatio = '16:9',
    transition = 'fade',
    autoPlay = false,
    autoPlayInterval = 5000,
    showNavigation = true,
    showPagination = true,
    backgroundColor = '#f0f0f0',
    enableKeyboardNavigation = true,
    fullscreenEnabled = true,
    loop = true,
    globalTiming,
    enableConditional = false
  } = attributes;

  // Initialize with one slide if empty
  useEffect(() => {
    if (slides.length === 0) {
      addSlide('text');
    }
  }, []);

  // Detect touch device
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Generate unique ID
  const generateId = () => `slide-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Get visible slides based on conditions
  const getVisibleSlides = useCallback(() => {
    if (!enableConditional) return slides;

    const context = {
      currentDate: new Date(),
      currentTime: new Date().toTimeString().slice(0, 5),
      deviceType: isTouchDevice ? 'mobile' : 'desktop',
      screenWidth: window.innerWidth,
      userRole: 'visitor', // Would come from auth context
      language: navigator.language.slice(0, 2)
    };

    return slides.filter(slide => {
      if (!slide.conditional?.enabled) return true;
      return evaluateSlideConditions(slide.conditional, context);
    });
  }, [slides, enableConditional, isTouchDevice]);

  // Advanced auto-play with individual timing
  useEffect(() => {
    if (isPlaying && !pausedForHover) {
      const visibleSlides = getVisibleSlides();
      if (visibleSlides.length <= 1) return;

      const currentVisibleSlide = visibleSlides[currentSlide];
      const duration = currentVisibleSlide?.timing?.duration || globalTiming?.duration || autoPlayInterval;
      
      if (duration === 'auto') {
        // Calculate auto duration based on content
        const contentLength = (currentVisibleSlide?.content?.length || 0) + 
                            (currentVisibleSlide?.title?.length || 0) * 2;
        const calculatedDuration = Math.max(3000, Math.min(contentLength * 50, 30000));
        
        slideTimerRef.current = setTimeout(() => {
          goToNextSlide();
        }, calculatedDuration);
      } else {
        slideTimerRef.current = setTimeout(() => {
          goToNextSlide();
        }, duration * 1000);
      }

      return () => {
        if (slideTimerRef.current) {
          clearTimeout(slideTimerRef.current);
        }
      };
    }
  }, [isPlaying, pausedForHover, currentSlide, slides, globalTiming, autoPlayInterval]);

  // Slide timer progress
  useEffect(() => {
    if (isPlaying && !pausedForHover) {
      const interval = setInterval(() => {
        setCurrentSlideTimer(prev => prev + 100);
      }, 100);
      
      return () => clearInterval(interval);
    } else {
      setCurrentSlideTimer(0);
    }
  }, [isPlaying, pausedForHover, currentSlide]);

  // Add new slide
  const addSlide = (type: 'text' | 'image' | 'mixed' | 'video') => {
    const newSlide: Slide = {
      id: generateId(),
      type,
      order: slides.length,
      backgroundColor: '#ffffff',
      textColor: '#000000',
      title: type === 'image' ? '' : 'New Slide Title',
      subtitle: type === 'image' ? '' : 'Add your subtitle here',
      content: type === 'image' ? '' : 'Enter your content here...',
      timing: globalTiming || { duration: 5, transition: 'immediate' }
    };

    // Add video config if video slide
    if (type === 'video') {
      newSlide.videoConfig = {
        videoUrl: '',
        autoPlay: true,
        muted: true,
        controls: true,
        loop: false
      };
      newSlide.title = '';
      newSlide.subtitle = '';
      newSlide.content = '';
    }

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

  // Navigation functions
  const goToNextSlide = () => {
    const visibleSlides = getVisibleSlides();
    if (visibleSlides.length <= 1) return;
    
    setCurrentSlide((prev) => {
      const next = (prev + 1) % visibleSlides.length;
      return next;
    });
  };

  const goToPrevSlide = () => {
    const visibleSlides = getVisibleSlides();
    if (visibleSlides.length <= 1) return;
    
    setCurrentSlide((prev) => {
      const next = prev === 0 ? visibleSlides.length - 1 : prev - 1;
      return next;
    });
  };

  // Template functions
  const handleApplyTemplate = (templateSlides: Slide[]) => {
    const newSlides = templateSlides.map((slide, index) => ({
      ...slide,
      id: generateId(),
      order: index
    }));
    
    setAttributes({ slides: newSlides });
    setCurrentSlide(0);
  };

  const handleSaveAsTemplate = (template: Omit<SlideTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTemplate: SlideTemplate = {
      ...template,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    setAttributes({
      templates: [...(templates || []), newTemplate]
    });
  };

  // Group functions
  const handleGroupsChange = (newGroups: SlideGroup[]) => {
    setAttributes({ groups: newGroups });
  };

  const handleSlideMove = (slideId: string, groupId: string | null) => {
    const newSlides = slides.map(slide => ({
      ...slide,
      groupId: slide.id === slideId ? groupId || undefined : slide.groupId
    }));
    
    setAttributes({ slides: newSlides });
  };

  // Timing functions
  const handleSlideTimingChange = (slideId: string, timing: SlideTimingConfig) => {
    const newSlides = slides.map(slide => 
      slide.id === slideId ? { ...slide, timing } : slide
    );
    
    setAttributes({ slides: newSlides });
  };

  const handleGlobalTimingChange = (timing: SlideTimingConfig) => {
    setAttributes({ globalTiming: timing });
  };

  // Conditional functions
  const handleConditionalChange = (slideId: string, conditional: ConditionalConfig) => {
    const newSlides = slides.map(slide => 
      slide.id === slideId ? { ...slide, conditional } : slide
    );
    
    setAttributes({ slides: newSlides });
  };

  // Keyboard navigation
  useKeyboardNavigation({
    enabled: enableKeyboardNavigation && !isEditing,
    onNext: goToNextSlide,
    onPrevious: goToPrevSlide,
    onFirst: () => setCurrentSlide(0),
    onLast: () => setCurrentSlide(getVisibleSlides().length - 1),
    onTogglePlay: () => setIsPlaying(!isPlaying),
    onToggleFullscreen: () => setPresentationMode(!presentationMode),
    onEscape: () => setPresentationMode(false)
  });

  // Touch gestures
  const { attachToElement: attachTouchElement } = useTouchGestures({
    enabled: isTouchDevice && !isEditing,
    onSwipeLeft: goToNextSlide,
    onSwipeRight: goToPrevSlide,
    onDoubleTap: () => setIsPlaying(!isPlaying)
  });

  // Mouse interactions
  const { attachToElement: attachMouseElement } = useMouseInteractions({
    enabled: !isTouchDevice && !isEditing,
    onWheelNext: goToNextSlide,
    onWheelPrev: goToPrevSlide,
    onHoverStart: () => setPausedForHover(true),
    onHoverEnd: () => setPausedForHover(false),
    pauseOnHover: true
  });

  // Attach interaction handlers
  useEffect(() => {
    if (viewportRef.current) {
      if (isTouchDevice) {
        attachTouchElement(viewportRef.current);
      } else {
        attachMouseElement(viewportRef.current);
      }
    }
  }, [isTouchDevice, isEditing]);

  const visibleSlides = getVisibleSlides();
  const currentVisibleSlide = visibleSlides[currentSlide];

  return (
    <div 
      ref={containerRef}
      className={`slide-block-complete ${className} ${presentationMode ? 'presentation-mode' : ''}`}
    >
      {/* Skip Links for Accessibility */}
      <SkipLinks
        onSkipToContent={() => viewportRef.current?.focus()}
        onSkipToNavigation={() => {}}
      />

      {/* Toolbar */}
      {isEditing && isSelected && (
        <div className="slide-block__toolbar">
          <div className="toolbar-tabs">
            <button
              className={`tab-btn ${activeTab === 'slides' ? 'active' : ''}`}
              onClick={() => setActiveTab('slides')}
            >
              <Layers size={16} />
              Slides
            </button>
            <button
              className={`tab-btn ${activeTab === 'templates' ? 'active' : ''}`}
              onClick={() => setActiveTab('templates')}
            >
              <Save size={16} />
              Templates
            </button>
            <button
              className={`tab-btn ${activeTab === 'groups' ? 'active' : ''}`}
              onClick={() => setActiveTab('groups')}
            >
              <FolderOpen size={16} />
              Groups
            </button>
            <button
              className={`tab-btn ${activeTab === 'timing' ? 'active' : ''}`}
              onClick={() => setActiveTab('timing')}
            >
              <Timer size={16} />
              Timing
            </button>
            <button
              className={`tab-btn ${activeTab === 'conditional' ? 'active' : ''}`}
              onClick={() => setActiveTab('conditional')}
            >
              <Filter size={16} />
              Conditional
            </button>
          </div>

          <div className="toolbar-controls">
            <button
              className="toolbar-btn"
              onClick={() => setPresentationMode(!presentationMode)}
            >
              <Maximize2 size={16} />
              {presentationMode ? 'Exit' : 'Present'}
            </button>
            
            <button
              className="toolbar-btn"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              {isPlaying ? 'Pause' : 'Play'}
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="slide-block__content">
        {isEditing && isSelected ? (
          /* Edit Mode */
          <div className="slide-block__editor">
            {/* Tab Content */}
            <div className="editor-tab-content">
              {activeTab === 'slides' && (
                <div className="slides-panel">
                  <div className="slides-panel__header">
                    <h3>Slides ({slides.length})</h3>
                    <div className="slides-panel__actions">
                      <button onClick={() => addSlide('text')} title="Add Text Slide">
                        <Type size={16} />
                      </button>
                      <button onClick={() => addSlide('image')} title="Add Image Slide">
                        <Image size={16} />
                      </button>
                      <button onClick={() => addSlide('mixed')} title="Add Mixed Slide">
                        <Plus size={16} />
                      </button>
                      <button onClick={() => addSlide('video')} title="Add Video Slide">
                        <Video size={16} />
                      </button>
                    </div>
                  </div>

                  {showThumbnails ? (
                    <SlideSortableList
                      slides={slides}
                      currentSlide={currentSlide}
                      onReorder={(newSlides) => setAttributes({ slides: newSlides })}
                      onSelect={setCurrentSlide}
                      onDuplicate={(index) => {
                        const newSlide = { ...slides[index], id: generateId() };
                        const newSlides = [...slides];
                        newSlides.splice(index + 1, 0, newSlide);
                        setAttributes({ slides: newSlides });
                      }}
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
                    <div className="slides-simple-list">
                      {slides.map((slide, index) => (
                        <div 
                          key={slide.id}
                          className={`slide-list-item ${currentSlide === index ? 'active' : ''}`}
                          onClick={() => setCurrentSlide(index)}
                        >
                          <span>Slide {index + 1}: {slide.title || slide.type}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'templates' && (
                <SlideTemplates
                  onApplyTemplate={handleApplyTemplate}
                  currentSlides={slides}
                  onSaveTemplate={handleSaveAsTemplate}
                />
              )}

              {activeTab === 'groups' && (
                <SlideGroups
                  groups={groups || []}
                  slides={slides}
                  onGroupsChange={handleGroupsChange}
                  onSlideMove={handleSlideMove}
                  currentSlideId={slides[currentSlide]?.id}
                />
              )}

              {activeTab === 'timing' && (
                <SlideTimingManager
                  slides={slides}
                  onTimingChange={handleSlideTimingChange}
                  currentSlideId={slides[currentSlide]?.id}
                  globalTiming={globalTiming}
                  onGlobalTimingChange={handleGlobalTimingChange}
                />
              )}

              {activeTab === 'conditional' && currentVisibleSlide && (
                <div className="conditional-panel">
                  <h3>Conditional Display Settings</h3>
                  <SlideConditional
                    config={currentVisibleSlide.conditional || {
                      enabled: false,
                      conditions: [],
                      hideWhenFalse: true
                    }}
                    onChange={(config) => handleConditionalChange(currentVisibleSlide.id, config)}
                    slideId={currentVisibleSlide.id}
                    availableSlides={slides}
                  />
                </div>
              )}
            </div>

            {/* Slide Editor */}
            {currentVisibleSlide && (
              <div className="slide-editor-panel">
                {useAdvancedEditor ? (
                  <AdvancedSlideEditor
                    slide={currentVisibleSlide}
                    onChange={(updatedSlide) => {
                      const newSlides = slides.map((s) =>
                        s.id === updatedSlide.id ? updatedSlide : s
                      );
                      setAttributes({ slides: newSlides });
                    }}
                    onImageSelect={(url) => {
                      const newSlides = slides.map((s) =>
                        s.id === currentVisibleSlide.id 
                          ? { ...s, imageUrl: url } 
                          : s
                      );
                      setAttributes({ slides: newSlides });
                    }}
                  />
                ) : (
                  <SlideEditor
                    slide={currentVisibleSlide}
                    onChange={(updatedSlide) => {
                      const newSlides = slides.map((s) =>
                        s.id === updatedSlide.id ? updatedSlide : s
                      );
                      setAttributes({ slides: newSlides });
                    }}
                    onImageSelect={(url) => {
                      const newSlides = slides.map((s) =>
                        s.id === currentVisibleSlide.id 
                          ? { ...s, imageUrl: url } 
                          : s
                      );
                      setAttributes({ slides: newSlides });
                    }}
                  />
                )}

                {/* Video Settings for Video Slides */}
                {currentVisibleSlide.type === 'video' && (
                  <div className="video-settings">
                    <h4>Video Settings</h4>
                    <input
                      type="url"
                      placeholder="Video URL"
                      value={currentVisibleSlide.videoConfig?.videoUrl || ''}
                      onChange={(e) => {
                        const newSlides = slides.map((s) =>
                          s.id === currentVisibleSlide.id 
                            ? { 
                                ...s, 
                                videoConfig: { 
                                  ...s.videoConfig, 
                                  videoUrl: e.target.value 
                                } as VideoConfig
                              } 
                            : s
                        );
                        setAttributes({ slides: newSlides });
                      }}
                    />
                  </div>
                )}

                {/* Link Editor */}
                {currentVisibleSlide && (
                  <div className="link-settings">
                    <h4>Link Settings</h4>
                    <LinkEditor
                      link={currentVisibleSlide.link}
                      onChange={(link) => {
                        const newSlides = slides.map((s) =>
                          s.id === currentVisibleSlide.id 
                            ? { ...s, link } 
                            : s
                        );
                        setAttributes({ slides: newSlides });
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* View Mode */
          <div className="slide-block__viewer" ref={viewportRef}>
            {/* Screen Reader Announcements */}
            <SlideAnnouncer
              currentSlide={currentSlide}
              totalSlides={visibleSlides.length}
              slideTitle={currentVisibleSlide?.title}
            />

            <FocusTrap active={presentationMode}>
              <div className="viewer-container">
                {/* Progress Indicator */}
                {currentVisibleSlide?.timing && (
                  <SlideProgress
                    current={currentSlideTimer}
                    total={(currentVisibleSlide.timing.duration === 'auto' ? 5 : currentVisibleSlide.timing.duration as number) * 1000}
                    showPercentage={false}
                  />
                )}

                {/* Render slide with link wrapper */}
                <SlideLink
                  link={currentVisibleSlide?.link}
                  cta={currentVisibleSlide?.cta}
                  onLinkClick={(link) => {
                    // Handle link click tracking
                    console.log('Link clicked:', link);
                  }}
                  isEditing={false}
                >
                  {currentVisibleSlide?.type === 'video' && currentVisibleSlide.videoConfig ? (
                    <VideoSlide
                      {...currentVisibleSlide.videoConfig}
                      onPlay={() => setIsPlaying(false)}
                      onEnded={goToNextSlide}
                    />
                  ) : (
                    <EnhancedSlideViewer
                      slides={visibleSlides}
                      currentSlide={currentSlide}
                      aspectRatio={aspectRatio}
                      transition={transition}
                      backgroundColor={backgroundColor}
                    />
                  )}
                </SlideLink>

                {/* Navigation */}
                {showNavigation && (
                  <BasicNavigation
                    currentSlide={currentSlide}
                    totalSlides={visibleSlides.length}
                    onPrevious={goToPrevSlide}
                    onNext={goToNextSlide}
                    onGoToSlide={setCurrentSlide}
                    isPlaying={isPlaying}
                    onPlayPause={() => setIsPlaying(!isPlaying)}
                    showDots={showPagination}
                  />
                )}
              </div>
            </FocusTrap>
          </div>
        )}

        {/* Bulk Edit Panel */}
        {showBulkEdit && selectedSlides.size > 0 && (
          <BulkEditPanel
            selectedSlides={Array.from(selectedSlides)}
            slides={slides}
            onApplyChanges={(indices, changes) => {
              const newSlides = [...slides];
              indices.forEach(index => {
                newSlides[index] = { ...newSlides[index], ...changes };
              });
              setAttributes({ slides: newSlides });
            }}
            onClose={() => setShowBulkEdit(false)}
          />
        )}
      </div>
    </div>
  );
};

export default SlideBlockComplete;