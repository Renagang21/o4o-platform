import { FC, useState, useEffect, useCallback  } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Wifi, WifiOff, Calendar, Volume2, VolumeX,
  AlertCircle, RefreshCw, Maximize2, Minimize2
} from 'lucide-react';
import axios from 'axios';

interface PlaybackStatus {
  isPlaying: boolean;
  currentItem?: {
    id: string;
    order: number;
    duration: number;
    content: {
      id: string;
      title: string;
      type: 'youtube' | 'vimeo';
      url: string;
      videoId: string;
    };
  };
  playlist?: {
    id: string;
    name: string;
    loop: boolean;
    items: Array<{
      id: string;
      order: number;
      duration: number;
      content: {
        id: string;
        title: string;
        type: 'youtube' | 'vimeo';
        url: string;
        videoId: string;
      };
    }>;
  };
  schedule?: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
  };
}

const LiveTVDisplay: FC = () => {
  const { storeId } = useParams<{ storeId: string }>();
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isConnected, setIsConnected] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch playback status
  const fetchPlaybackStatus = useCallback(async () => {
    try {
      const response = await axios.get(`/api/signage/stores/${storeId}/playback/status`);
      setPlaybackStatus(response.data.data);
      setIsConnected(true);
      setError(null);
    } catch (error: any) {
    // Error logging - use proper error handler
      setIsConnected(false);
      setError('Connection lost. Retrying...');
    }
  }, [storeId]);

  // Initialize and auto-refresh
  useEffect(() => {
    fetchPlaybackStatus();
    
    const interval = setInterval(() => {
      fetchPlaybackStatus();
    }, 10000); // Refresh every 10 seconds
    
    // Auto-refresh is set but not stored in state
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fetchPlaybackStatus]);

  // Update clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  // Handle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
        case 'm':
        case 'M':
          setIsMuted(!isMuted);
          break;
        case 'r':
        case 'R':
          fetchPlaybackStatus();
          break;
      }
    };
    
    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [isMuted, fetchPlaybackStatus]);

  // YouTube Player Component
  const YouTubePlayer = ({ videoId }: { videoId: string }) => (
    <iframe
      src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&loop=1&playlist=${videoId}`}
      className="w-full h-full"
      frameBorder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  );

  // Vimeo Player Component
  const VimeoPlayer = ({ videoId }: { videoId: string }) => (
    <iframe
      src={`https://player.vimeo.com/video/${videoId}?autoplay=1&muted=${isMuted ? 1 : 0}&loop=1&title=0&byline=0&portrait=0`}
      className="w-full h-full"
      frameBorder="0"
      allow="autoplay; fullscreen; picture-in-picture"
      allowFullScreen
    />
  );

  // Format time
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  // No content state
  if (!playbackStatus || !playbackStatus.isPlaying || !playbackStatus.currentItem) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <AlertCircle className="w-24 h-24 mx-auto mb-6 text-gray-600" />
          <h1 className="text-3xl font-bold mb-2">No Content Playing</h1>
          <p className="text-xl text-gray-400 mb-8">Waiting for content...</p>
          
          {error && (
            <div className="bg-red-900 bg-opacity-50 text-red-200 px-6 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}
          
          <button
            onClick={fetchPlaybackStatus}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
          >
            <RefreshCw className="w-5 h-5" />
            Refresh
          </button>
        </div>
        
        {/* Status Overlay */}
        <div className="fixed top-4 right-4 text-white">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Wifi className="w-5 h-5 text-green-400" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-400" />
            )}
            <span className="text-sm">{formatTime(currentTime)}</span>
          </div>
        </div>
      </div>
    );
  }

  const { content } = playbackStatus.currentItem;

  return (
    <div className="fixed inset-0 bg-black">
      {/* Video Player */}
      <div className="w-full h-full relative">
        {content.type === 'youtube' ? (
          <YouTubePlayer videoId={content.videoId} />
        ) : (
          <VimeoPlayer videoId={content.videoId} />
        )}
        
        {/* Overlay Controls (hidden after 3 seconds of inactivity) */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Top Bar */}
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-4">
            <div className="flex items-center justify-between text-white">
              <div>
                <h2 className="text-xl font-bold">{content.title}</h2>
                {playbackStatus.playlist && (
                  <p className="text-sm text-gray-300">
                    Playlist: {playbackStatus.playlist.name} 
                    ({playbackStatus.currentItem.order}/{playbackStatus.playlist.items.length})
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-lg font-medium">{formatTime(currentTime)}</p>
                  <p className="text-sm text-gray-300">{formatDate(currentTime)}</p>
                </div>
                
                <div className="flex items-center gap-2">
                  {isConnected ? (
                    <Wifi className="w-5 h-5 text-green-400" />
                  ) : (
                    <WifiOff className="w-5 h-5 text-red-400 animate-pulse" />
                  )}
                </div>
              </div>
            </div>
            
            {playbackStatus.schedule && (
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-300">
                <Calendar className="w-4 h-4" />
                <span>
                  Schedule: {playbackStatus.schedule.name} 
                  ({playbackStatus.schedule.startTime} - {playbackStatus.schedule.endTime})
                </span>
              </div>
            )}
          </div>
          
          {/* Bottom Bar (Controls) */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
            <div className="flex items-center justify-between text-white pointer-events-auto">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2 hover:bg-white/20 rounded transition-colors"
                  title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                
                <button
                  onClick={fetchPlaybackStatus}
                  className="p-2 hover:bg-white/20 rounded transition-colors"
                  title="Refresh (R)"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex items-center gap-4">
                {playbackStatus.playlist?.loop && (
                  <span className="text-sm bg-white/20 px-3 py-1 rounded">
                    Loop Mode
                  </span>
                )}
                
                <button
                  onClick={toggleFullscreen}
                  className="p-2 hover:bg-white/20 rounded transition-colors"
                  title="Fullscreen (F)"
                >
                  {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            {/* Keyboard Shortcuts Help */}
            <div className="mt-2 text-center text-xs text-gray-400">
              Press F for fullscreen • M to mute/unmute • R to refresh
            </div>
          </div>
        </div>
        
        {/* Error Notification */}
        {error && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-900 bg-opacity-90 text-white px-6 py-4 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-6 h-6" />
            <div>
              <p className="font-semibold">Connection Error</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveTVDisplay;