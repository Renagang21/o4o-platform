import { useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';

export const useSignageWebSocket = (storeId?: string) => {
  const socketRef = useRef<any>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!storeId) return;

    // Connect to WebSocket server
    socketRef.current = io('/signage', {
      transports: ['websocket'],
      query: { storeId },
    });

    const socket = socketRef.current;

    // Join store room
    socket.emit('join-store', storeId);

    // Listen for content updates
    socket.on('content-updated', (data: unknown) => {
      console.log('Content updated:', data);
      queryClient.invalidateQueries({ queryKey: ['signage', 'content'] });
      queryClient.invalidateQueries({ queryKey: ['signage', 'display', storeId] });
    });

    // Listen for schedule changes
    socket.on('schedule-changed', (data: unknown) => {
      console.log('Schedule changed:', data);
      queryClient.invalidateQueries({ queryKey: ['signage', 'schedules'] });
      queryClient.invalidateQueries({ queryKey: ['signage', 'display', storeId] });
    });

    // Listen for display control commands
    socket.on('display-control', (command: unknown) => {
      console.log('Display control command:', command);
      // Handle display control commands (play, pause, next, etc.)
      window.dispatchEvent(new CustomEvent('display-control', { detail: command }));
    });

    // Cleanup
    return () => {
      socket.emit('leave-store', storeId);
      socket.disconnect();
    };
  }, [storeId, queryClient]);

  // Send display status updates
  const sendDisplayStatus = (status: Record<string, any>) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('display-status', { storeId, ...status });
    }
  };

  // Send playback events
  const sendPlaybackEvent = (event: Record<string, any>) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('playback-event', { storeId, ...event });
    }
  };

  return {
    sendDisplayStatus,
    sendPlaybackEvent,
  };
};