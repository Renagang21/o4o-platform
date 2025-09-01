import { useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';

interface WebSocketOptions {
  url?: string;
  storeId?: string;
  autoConnect?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

interface PlaybackStatus {
  isPlaying: boolean;
  currentContent?: {
    id: string;
    title: string;
    type: string;
    url: string;
    duration?: number;
  };
  currentPlaylist?: {
    id: string;
    name: string;
    items: any[];
  };
  progress?: number;
  volume?: number;
  lastUpdated: Date;
}

interface WebSocketEvents {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onContentChange?: (content: any) => void;
  onPlaylistChange?: (playlist: any) => void;
  onScheduleChange?: (schedule: any) => void;
  onPlaybackStatusChange?: (status: PlaybackStatus) => void;
  onControlCommand?: (command: any) => void;
  onError?: (error: any) => void;
}

export const useWebSocket = (
  options: WebSocketOptions = {},
  events: WebSocketEvents = {}
) => {
  const {
    url = process.env.REACT_APP_WEBSOCKET_URL || 'http://localhost:3001',
    storeId,
    autoConnect = true,
    reconnectionAttempts = 5,
    reconnectionDelay = 1000
  } = options;

  const socketRef = useRef<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus | null>(null);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  // Initialize socket connection
  useEffect(() => {
    if (!autoConnect) return;

    const socket = io(url, {
      transports: ['websocket'],
      query: storeId ? { storeId } : {},
      reconnection: true,
      reconnectionAttempts,
      reconnectionDelay,
      reconnectionDelayMax: reconnectionDelay * 5,
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      // Connected to signage server
      setIsConnected(true);
      setConnectionError(null);
      setReconnectAttempt(0);
      
      // Join store room if storeId provided
      if (storeId) {
        socket.emit('join-store', { storeId });
      }
      
      events.onConnect?.();
    });

    socket.on('disconnect', () => {
      // Disconnected from signage server
      setIsConnected(false);
      events.onDisconnect?.();
    });

    socket.on('connect_error', (error: Error) => {
      // Error log removed
      setConnectionError(error.message);
      events.onError?.(error);
    });

    socket.on('reconnect_attempt', (attemptNumber: number) => {
      // Reconnection attempt in progress
      setReconnectAttempt(attemptNumber);
    });

    // Signage-specific events
    socket.on('content-updated', (data: any) => {
      // Content updated
      setLastMessage({ type: 'content-updated', data, timestamp: new Date() });
      events.onContentChange?.(data);
    });

    socket.on('playlist-updated', (data: any) => {
      // Playlist updated
      setLastMessage({ type: 'playlist-updated', data, timestamp: new Date() });
      events.onPlaylistChange?.(data);
    });

    socket.on('schedule-updated', (data: any) => {
      // Schedule updated
      setLastMessage({ type: 'schedule-updated', data, timestamp: new Date() });
      events.onScheduleChange?.(data);
    });

    socket.on('playback-status', (status: PlaybackStatus) => {
      // Playback status received
      setPlaybackStatus(status);
      events.onPlaybackStatusChange?.(status);
    });

    socket.on('control-command', (command: any) => {
      // Control command received
      setLastMessage({ type: 'control-command', data: command, timestamp: new Date() });
      events.onControlCommand?.(command);
    });

    // Store-specific events
    socket.on('store-config-updated', (config: any) => {
      // Store config updated
      setLastMessage({ type: 'store-config-updated', data: config, timestamp: new Date() });
    });

    socket.on('emergency-broadcast', (message: any) => {
      // Emergency broadcast received
      setLastMessage({ type: 'emergency-broadcast', data: message, timestamp: new Date() });
    });

    return () => {
      if (socket.connected) {
        if (storeId) {
          socket.emit('leave-store', { storeId });
        }
        socket.disconnect();
      }
    };
  }, [url, storeId, autoConnect, reconnectionAttempts, reconnectionDelay, events]);

  // Send playback status update
  const sendPlaybackStatus = useCallback((status: Partial<PlaybackStatus>) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('playback-status-update', {
        storeId,
        ...status,
        lastUpdated: new Date()
      });
    }
  }, [storeId]);

  // Send control command
  const sendControlCommand = useCallback((command: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('control-command', {
        storeId,
        command,
        data,
        timestamp: new Date()
      });
    }
  }, [storeId]);

  // Request content update
  const requestContentUpdate = useCallback((contentId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('request-content', {
        storeId,
        contentId,
        timestamp: new Date()
      });
    }
  }, [storeId]);

  // Request playlist update
  const requestPlaylistUpdate = useCallback((playlistId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('request-playlist', {
        storeId,
        playlistId,
        timestamp: new Date()
      });
    }
  }, [storeId]);

  // Manual connect/disconnect
  const connect = useCallback(() => {
    if (socketRef.current && !socketRef.current.connected) {
      socketRef.current.connect();
    }
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current?.connected) {
      if (storeId) {
        socketRef.current.emit('leave-store', { storeId });
      }
      socketRef.current.disconnect();
    }
  }, [storeId]);

  // Send custom event
  const emit = useCallback((event: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  // Subscribe to custom event
  const on = useCallback((event: string, handler: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, handler);
    }
  }, []);

  // Unsubscribe from custom event
  const off = useCallback((event: string, handler?: (data: any) => void) => {
    if (socketRef.current) {
      if (handler) {
        socketRef.current.off(event, handler);
      } else {
        socketRef.current.off(event);
      }
    }
  }, []);

  return {
    // Connection state
    isConnected,
    connectionError,
    reconnectAttempt,
    
    // Data state
    playbackStatus,
    lastMessage,
    
    // Methods
    connect,
    disconnect,
    sendPlaybackStatus,
    sendControlCommand,
    requestContentUpdate,
    requestPlaylistUpdate,
    emit,
    on,
    off,
    
    // Socket instance (for advanced usage)
    socket: socketRef.current
  };
};