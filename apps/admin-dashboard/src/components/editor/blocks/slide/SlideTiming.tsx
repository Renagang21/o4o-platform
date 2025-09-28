/**
 * SlideTiming - Individual slide timing controls
 * Phase 4: Advanced features
 */

import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Play, 
  Pause, 
  Timer,
  Infinity,
  Settings
} from 'lucide-react';

export interface SlideTimingConfig {
  duration: number | 'auto';
  minDuration?: number;
  maxDuration?: number;
  transition: 'immediate' | 'after-transition';
  pauseOnHover?: boolean;
  pauseOnInteraction?: boolean;
  videoDuration?: 'full' | 'custom' | number;
}

interface SlideTimingProps {
  timing: SlideTimingConfig;
  onChange: (timing: SlideTimingConfig) => void;
  isActive?: boolean;
  hasVideo?: boolean;
}

export const SlideTiming: React.FC<SlideTimingProps> = ({
  timing,
  onChange,
  isActive = false,
  hasVideo = false
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [currentDuration, setCurrentDuration] = useState<number | 'auto'>(timing.duration);

  useEffect(() => {
    setCurrentDuration(timing.duration);
  }, [timing.duration]);

  const handleDurationChange = (value: string) => {
    if (value === 'auto') {
      onChange({ ...timing, duration: 'auto' });
    } else {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue >= 0) {
        onChange({ ...timing, duration: numValue });
      }
    }
  };

  const presetDurations = [
    { label: 'Auto', value: 'auto', icon: <Infinity size={14} /> },
    { label: '3s', value: 3 },
    { label: '5s', value: 5 },
    { label: '10s', value: 10 },
    { label: '15s', value: 15 },
    { label: '30s', value: 30 }
  ];

  return (
    <div className={`slide-timing ${isActive ? 'slide-timing--active' : ''}`}>
      <div className="slide-timing__header">
        <h4>
          <Clock size={16} />
          Timing Settings
        </h4>
        <button
          className="btn-icon"
          onClick={() => setShowAdvanced(!showAdvanced)}
          title="Advanced settings"
        >
          <Settings size={14} />
        </button>
      </div>

      <div className="slide-timing__content">
        {/* Duration Control */}
        <div className="timing-control">
          <label>Duration</label>
          <div className="duration-selector">
            <div className="duration-presets">
              {presetDurations.map(preset => (
                <button
                  key={preset.value}
                  className={`duration-preset ${timing.duration === preset.value ? 'active' : ''}`}
                  onClick={() => handleDurationChange(String(preset.value))}
                >
                  {preset.icon}
                  {preset.label}
                </button>
              ))}
            </div>
            
            {timing.duration !== 'auto' && (
              <div className="duration-custom">
                <input
                  type="range"
                  min="0.5"
                  max="60"
                  step="0.5"
                  value={timing.duration as number}
                  onChange={(e) => handleDurationChange(e.target.value)}
                  className="duration-slider"
                />
                <input
                  type="number"
                  min="0.5"
                  max="999"
                  step="0.5"
                  value={timing.duration as number}
                  onChange={(e) => handleDurationChange(e.target.value)}
                  className="duration-input"
                />
                <span className="duration-unit">seconds</span>
              </div>
            )}
          </div>
        </div>

        {/* Video Duration (if slide has video) */}
        {hasVideo && (
          <div className="timing-control">
            <label>Video Playback</label>
            <select
              value={typeof timing.videoDuration === 'number' ? 'custom' : timing.videoDuration || 'full'}
              onChange={(e) => {
                if (e.target.value === 'full') {
                  onChange({ ...timing, videoDuration: 'full' });
                } else if (e.target.value === 'custom') {
                  onChange({ ...timing, videoDuration: 10 });
                }
              }}
              className="form-select"
            >
              <option value="full">Play Full Video</option>
              <option value="custom">Custom Duration</option>
            </select>
            
            {typeof timing.videoDuration === 'number' && (
              <div className="video-duration-custom">
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={timing.videoDuration}
                  onChange={(e) => onChange({ ...timing, videoDuration: parseFloat(e.target.value) })}
                  className="form-input"
                />
                <span>seconds</span>
              </div>
            )}
          </div>
        )}

        {/* Transition Timing */}
        <div className="timing-control">
          <label>Advance Slide</label>
          <select
            value={timing.transition || 'immediate'}
            onChange={(e) => onChange({ ...timing, transition: e.target.value as any })}
            className="form-select"
          >
            <option value="immediate">Immediately</option>
            <option value="after-transition">After transition completes</option>
          </select>
        </div>

        {/* Advanced Settings */}
        {showAdvanced && (
          <div className="timing-advanced">
            <h5>Advanced Settings</h5>
            
            {/* Min/Max Duration for Auto */}
            {timing.duration === 'auto' && (
              <>
                <div className="form-group">
                  <label>Minimum Duration</label>
                  <div className="input-group">
                    <input
                      type="number"
                      min="0.5"
                      max="60"
                      step="0.5"
                      value={timing.minDuration || 3}
                      onChange={(e) => onChange({ 
                        ...timing, 
                        minDuration: parseFloat(e.target.value) 
                      })}
                      className="form-input"
                    />
                    <span>seconds</span>
                  </div>
                </div>

                <div className="form-group">
                  <label>Maximum Duration</label>
                  <div className="input-group">
                    <input
                      type="number"
                      min="1"
                      max="120"
                      step="1"
                      value={timing.maxDuration || 30}
                      onChange={(e) => onChange({ 
                        ...timing, 
                        maxDuration: parseFloat(e.target.value) 
                      })}
                      className="form-input"
                    />
                    <span>seconds</span>
                  </div>
                </div>
              </>
            )}

            {/* Pause Options */}
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={timing.pauseOnHover !== false}
                  onChange={(e) => onChange({ 
                    ...timing, 
                    pauseOnHover: e.target.checked 
                  })}
                />
                Pause on hover
              </label>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={timing.pauseOnInteraction !== false}
                  onChange={(e) => onChange({ 
                    ...timing, 
                    pauseOnInteraction: e.target.checked 
                  })}
                />
                Pause on user interaction
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Timing Preview */}
      {isActive && timing.duration !== 'auto' && (
        <div className="timing-preview">
          <div className="timing-progress">
            <div 
              className="timing-progress-bar"
              style={{
                animationDuration: `${timing.duration}s`
              }}
            />
          </div>
          <span className="timing-countdown">
            {timing.duration}s
          </span>
        </div>
      )}
    </div>
  );
};

interface SlideTimingManagerProps {
  slides: Array<{ id: string; timing?: SlideTimingConfig }>;
  onTimingChange: (slideId: string, timing: SlideTimingConfig) => void;
  currentSlideId?: string;
  globalTiming?: SlideTimingConfig;
  onGlobalTimingChange?: (timing: SlideTimingConfig) => void;
}

export const SlideTimingManager: React.FC<SlideTimingManagerProps> = ({
  slides,
  onTimingChange,
  currentSlideId,
  globalTiming,
  onGlobalTimingChange
}) => {
  const [useGlobalTiming, setUseGlobalTiming] = useState(true);
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null);

  const defaultTiming: SlideTimingConfig = {
    duration: 5,
    transition: 'immediate',
    pauseOnHover: true,
    pauseOnInteraction: true
  };

  const handleGlobalToggle = () => {
    setUseGlobalTiming(!useGlobalTiming);
    if (!useGlobalTiming && onGlobalTimingChange) {
      // Apply global timing to all slides
      slides.forEach(slide => {
        onTimingChange(slide.id, globalTiming || defaultTiming);
      });
    }
  };

  return (
    <div className="slide-timing-manager">
      <div className="timing-manager-header">
        <h3>
          <Timer size={18} />
          Slide Timing
        </h3>
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={useGlobalTiming}
            onChange={handleGlobalToggle}
          />
          Use global timing
        </label>
      </div>

      {useGlobalTiming ? (
        <div className="global-timing">
          <h4>Global Timing Settings</h4>
          <SlideTiming
            timing={globalTiming || defaultTiming}
            onChange={(timing) => {
              if (onGlobalTimingChange) {
                onGlobalTimingChange(timing);
              }
              // Apply to all slides
              slides.forEach(slide => {
                onTimingChange(slide.id, timing);
              });
            }}
          />
        </div>
      ) : (
        <div className="individual-timing">
          <div className="slide-timing-list">
            {slides.map((slide, index) => (
              <div 
                key={slide.id}
                className={`slide-timing-item ${
                  slide.id === currentSlideId ? 'current' : ''
                } ${
                  slide.id === selectedSlideId ? 'selected' : ''
                }`}
                onClick={() => setSelectedSlideId(slide.id)}
              >
                <div className="slide-timing-item-header">
                  <span className="slide-number">Slide {index + 1}</span>
                  <span className="slide-duration">
                    {slide.timing?.duration === 'auto' ? 
                      'Auto' : 
                      `${slide.timing?.duration || defaultTiming.duration}s`
                    }
                  </span>
                </div>
                
                {slide.id === selectedSlideId && (
                  <SlideTiming
                    timing={slide.timing || defaultTiming}
                    onChange={(timing) => onTimingChange(slide.id, timing)}
                    isActive={slide.id === currentSlideId}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Total Duration Display */}
      <div className="timing-summary">
        <div className="timing-total">
          <span>Total Duration:</span>
          <strong>
            {slides.reduce((total, slide) => {
              const duration = slide.timing?.duration || defaultTiming.duration;
              if (duration === 'auto') return total;
              return total + (duration as number);
            }, 0)}s
          </strong>
        </div>
        {slides.some(s => s.timing?.duration === 'auto') && (
          <span className="timing-note">
            * Auto-timed slides not included
          </span>
        )}
      </div>
    </div>
  );
};

export default SlideTiming;