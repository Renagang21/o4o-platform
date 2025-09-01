/**
 * usePostMessage - Handle iframe PostMessage communication
 */

import { useCallback, useEffect, RefObject } from 'react';

export const usePostMessage = (iframeRef: RefObject<HTMLIFrameElement>) => {
  // Send message to iframe
  const sendMessage = useCallback((message: any) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(message, '*');
    }
  }, [iframeRef]);

  // Listen for messages from iframe
  const onMessage = useCallback((handler: (event: MessageEvent) => void) => {
    const messageHandler = (event: MessageEvent) => {
      // Verify origin if needed
      // if (event.origin !== window.location.origin) return;
      
      handler(event);
    };

    window.addEventListener('message', messageHandler);

    // Cleanup
    return () => {
      window.removeEventListener('message', messageHandler);
    };
  }, []);

  return {
    sendMessage,
    onMessage
  };
};