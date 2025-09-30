/**
 * SlideAccessibility - Accessibility components and utilities
 * Phase 3: Interaction features
 */

import React, { useEffect, useRef } from 'react';
import { AlertCircle, Volume2, VolumeX } from 'lucide-react';

interface SlideAccessibilityProps {
  currentSlide: number;
  totalSlides: number;
  slideTitle?: string;
  isPlaying?: boolean;
  onAnnounce?: (message: string) => void;
}

// Screen reader announcements
export const SlideAnnouncer: React.FC<SlideAccessibilityProps> = ({
  currentSlide,
  totalSlides,
  slideTitle,
  isPlaying,
  onAnnounce
}) => {
  const announcerRef = useRef<HTMLDivElement>(null);
  const lastAnnouncedSlide = useRef<number>(-1);

  useEffect(() => {
    if (currentSlide !== lastAnnouncedSlide.current) {
      const message = `Slide ${currentSlide + 1} of ${totalSlides}${
        slideTitle ? `: ${slideTitle}` : ''
      }${isPlaying ? ', auto-playing' : ''}`;
      
      if (announcerRef.current) {
        announcerRef.current.textContent = message;
      }
      
      if (onAnnounce) {
        onAnnounce(message);
      }
      
      lastAnnouncedSlide.current = currentSlide;
    }
  }, [currentSlide, totalSlides, slideTitle, isPlaying, onAnnounce]);

  return (
    <div
      ref={announcerRef}
      className="sr-only"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    />
  );
};

interface FocusTrapProps {
  children: React.ReactNode;
  active?: boolean;
  onEscape?: () => void;
}

// Focus trap for modal/fullscreen mode
export const FocusTrap: React.FC<FocusTrapProps> = ({
  children,
  active = false,
  onEscape
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    // Store previous focus
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Get focusable elements
    const getFocusableElements = () => {
      if (!containerRef.current) return [];
      
      const selectors = [
        'button:not([disabled])',
        'a[href]',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
      ].join(', ');
      
      return Array.from(containerRef.current.querySelectorAll(selectors)) as HTMLElement[];
    };

    // Focus first element
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    // Handle tab navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onEscape) {
        onEscape();
        return;
      }

      if (e.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
      
      if (e.shiftKey) {
        // Backward tab
        if (currentIndex <= 0) {
          e.preventDefault();
          focusableElements[focusableElements.length - 1].focus();
        }
      } else {
        // Forward tab
        if (currentIndex === focusableElements.length - 1 || currentIndex === -1) {
          e.preventDefault();
          focusableElements[0].focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      
      // Restore previous focus
      if (previousFocusRef.current && previousFocusRef.current.focus) {
        previousFocusRef.current.focus();
      }
    };
  }, [active, onEscape]);

  return (
    <div ref={containerRef} className="focus-trap">
      {children}
    </div>
  );
};

interface SkipLinksProps {
  onSkipToContent?: () => void;
  onSkipToNavigation?: () => void;
  onSkipToControls?: () => void;
}

// Skip links for keyboard navigation
export const SkipLinks: React.FC<SkipLinksProps> = ({
  onSkipToContent,
  onSkipToNavigation,
  onSkipToControls
}) => {
  return (
    <div className="skip-links">
      {onSkipToContent && (
        <button
          className="skip-link"
          onClick={onSkipToContent}
        >
          Skip to slide content
        </button>
      )}
      {onSkipToNavigation && (
        <button
          className="skip-link"
          onClick={onSkipToNavigation}
        >
          Skip to navigation
        </button>
      )}
      {onSkipToControls && (
        <button
          className="skip-link"
          onClick={onSkipToControls}
        >
          Skip to controls
        </button>
      )}
    </div>
  );
};

interface ReducedMotionProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

// Component that respects prefers-reduced-motion
export const ReducedMotion: React.FC<ReducedMotionProps> = ({
  children,
  fallback
}) => {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  if (prefersReducedMotion && fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className={prefersReducedMotion ? 'reduced-motion' : ''}>
      {children}
    </div>
  );
};

interface AudioDescriptionProps {
  description: string;
  enabled?: boolean;
  autoPlay?: boolean;
  volume?: number;
}

// Audio description for visually impaired users
export const AudioDescription: React.FC<AudioDescriptionProps> = ({
  description,
  enabled = false,
  autoPlay = false,
  volume = 0.8
}) => {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(false);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (!enabled || !description) return;

    if ('speechSynthesis' in window) {
      synthRef.current = new SpeechSynthesisUtterance(description);
      synthRef.current.volume = isMuted ? 0 : volume;
      
      if (autoPlay) {
        window.speechSynthesis.speak(synthRef.current);
        setIsPlaying(true);
      }

      synthRef.current.onend = () => {
        setIsPlaying(false);
      };
    }

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [description, enabled, autoPlay, volume, isMuted]);

  const togglePlayback = () => {
    if (!synthRef.current) return;

    if (isPlaying) {
      window.speechSynthesis.pause();
      setIsPlaying(false);
    } else {
      window.speechSynthesis.resume();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (synthRef.current) {
      synthRef.current.volume = !isMuted ? 0 : volume;
    }
  };

  if (!enabled) return null;

  return (
    <div className="audio-description">
      <button
        onClick={togglePlayback}
        aria-label={isPlaying ? 'Pause audio description' : 'Play audio description'}
        className="audio-description__toggle"
      >
        {isPlaying ? 'Pause' : 'Play'} Audio
      </button>
      <button
        onClick={toggleMute}
        aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
        className="audio-description__mute"
      >
        {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </button>
      <span className="sr-only">{description}</span>
    </div>
  );
};

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Error boundary for graceful error handling
export class SlideErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    console.error('Slide error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="slide-error">
          <AlertCircle size={48} />
          <h2>Something went wrong</h2>
          <p>Unable to display this slide.</p>
          {this.state.error && (
            <details className="slide-error__details">
              <summary>Error details</summary>
              <pre>{this.state.error.toString()}</pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default SlideAnnouncer;