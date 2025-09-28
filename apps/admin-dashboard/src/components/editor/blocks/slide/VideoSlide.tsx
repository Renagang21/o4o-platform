/**
 * VideoSlide - Video slide component with controls
 * Phase 4: Advanced features
 */

import React, { useRef, useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  SkipForward,
  RotateCw
} from 'lucide-react';

interface VideoSlideProps {
  videoUrl: string;
  posterUrl?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  volume?: number;
  startTime?: number;
  endTime?: number;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  className?: string;
}

export const VideoSlide: React.FC<VideoSlideProps> = ({
  videoUrl,
  posterUrl,
  autoPlay = false,
  muted = false,
  loop = false,
  controls = true,
  volume = 1,
  startTime = 0,
  endTime,
  onPlay,
  onPause,
  onEnded,
  onTimeUpdate,
  className = ''
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  // Initialize video
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.volume = volume;
    video.muted = isMuted;
    
    if (startTime > 0) {
      video.currentTime = startTime;
    }

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      
      if (onTimeUpdate) {
        onTimeUpdate(video.currentTime, video.duration);
      }

      // Check for end time
      if (endTime && video.currentTime >= endTime) {
        video.pause();
        if (onEnded) onEnded();
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      if (onPlay) onPlay();
    };

    const handlePause = () => {
      setIsPlaying(false);
      if (onPause) onPause();
    };

    const handleEnded = () => {
      setIsPlaying(false);
      if (onEnded) onEnded();
    };

    const handleError = () => {
      setHasError(true);
      setIsLoading(false);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
    };
  }, [videoUrl, startTime, endTime, volume, isMuted, onPlay, onPause, onEnded, onTimeUpdate]);

  // Auto-play handling
  useEffect(() => {
    if (autoPlay && videoRef.current && !hasError) {
      videoRef.current.play().catch(() => {
        // Auto-play might be blocked, try muted
        if (videoRef.current) {
          videoRef.current.muted = true;
          setIsMuted(true);
          videoRef.current.play();
        }
      });
    }
  }, [autoPlay, hasError]);

  // Play/Pause toggle
  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  // Mute toggle
  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  // Seek to time
  const seekTo = (time: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = Math.min(Math.max(0, time), duration);
  };

  // Progress bar click
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    seekTo(percent * duration);
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    const container = videoRef.current?.parentElement;
    if (!container) return;

    if (!isFullscreen) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      } else if ((container as any).webkitRequestFullscreen) {
        (container as any).webkitRequestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  // Restart video
  const restart = () => {
    seekTo(startTime || 0);
    videoRef.current?.play();
  };

  // Show/hide controls
  const handleMouseMove = () => {
    setShowControls(true);
    
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  const handleMouseLeave = () => {
    if (isPlaying) {
      setShowControls(false);
    }
  };

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (hasError) {
    return (
      <div className="video-slide video-slide--error">
        <div className="video-error">
          <p>Unable to load video</p>
          <button onClick={() => window.location.reload()}>
            <RotateCw size={16} />
            Reload
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`video-slide ${className} ${isFullscreen ? 'video-slide--fullscreen' : ''}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <video
        ref={videoRef}
        className="video-slide__player"
        src={videoUrl}
        poster={posterUrl}
        loop={loop}
        playsInline
        preload="metadata"
      />

      {isLoading && (
        <div className="video-slide__loading">
          <div className="video-loading-spinner" />
          <p>Loading video...</p>
        </div>
      )}

      {controls && (showControls || !isPlaying) && (
        <div className="video-slide__controls">
          {/* Progress bar */}
          <div 
            className="video-progress"
            onClick={handleProgressClick}
          >
            <div 
              className="video-progress__filled"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
            <div 
              className="video-progress__thumb"
              style={{ left: `${(currentTime / duration) * 100}%` }}
            />
          </div>

          {/* Control buttons */}
          <div className="video-controls">
            <div className="video-controls__left">
              <button 
                className="video-btn"
                onClick={togglePlayPause}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </button>
              
              <button 
                className="video-btn"
                onClick={toggleMute}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>

              <span className="video-time">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="video-controls__right">
              <button 
                className="video-btn"
                onClick={restart}
                aria-label="Restart"
              >
                <RotateCw size={18} />
              </button>
              
              {endTime && (
                <button 
                  className="video-btn"
                  onClick={() => seekTo(endTime)}
                  aria-label="Skip to end"
                >
                  <SkipForward size={18} />
                </button>
              )}
              
              <button 
                className="video-btn"
                onClick={toggleFullscreen}
                aria-label="Fullscreen"
              >
                <Maximize size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Center play button for initial state */}
      {!isPlaying && !controls && (
        <button 
          className="video-slide__play-overlay"
          onClick={togglePlayPause}
          aria-label="Play video"
        >
          <Play size={64} />
        </button>
      )}
    </div>
  );
};

export default VideoSlide;