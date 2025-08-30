/**
 * PreviewWebSocket - Real-time preview update service
 * Manages WebSocket connection for live theme customization updates
 */

import React from 'react'
import { ThemeCustomization } from '@o4o/types'

export interface PreviewUpdate {
  type: 'customization' | 'layout' | 'content' | 'full-refresh'
  data: any
  timestamp: string
  sessionId: string
}

export interface PreviewSession {
  sessionId: string
  userId: string
  pageId?: string
  isActive: boolean
  lastUpdate: string
}

class PreviewWebSocketService {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private pingInterval: NodeJS.Timeout | null = null
  private sessionId: string = `preview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  // Event listeners
  private onUpdateCallbacks = new Set<(update: PreviewUpdate) => void>()
  private onConnectionCallbacks = new Set<(connected: boolean) => void>()
  private onErrorCallbacks = new Set<(error: Error) => void>()

  constructor(private userId: string, private pageId?: string) {}

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve()
        return
      }

      const wsUrl = this.getWebSocketUrl()
      
      try {
        this.ws = new WebSocket(wsUrl)
        
        this.ws.onopen = () => {
          console.log('Preview WebSocket connected')
          this.reconnectAttempts = 0
          this.startPing()
          this.sendHandshake()
          this.notifyConnectionChange(true)
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const update: PreviewUpdate = JSON.parse(event.data)
            this.handleUpdate(update)
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }

        this.ws.onclose = (event) => {
          console.log('Preview WebSocket disconnected', event.code, event.reason)
          this.stopPing()
          this.notifyConnectionChange(false)
          
          if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect()
          }
        }

        this.ws.onerror = (error) => {
          console.error('Preview WebSocket error:', error)
          const errorObj = new Error('WebSocket connection failed')
          this.notifyError(errorObj)
          reject(errorObj)
        }

      } catch (error) {
        console.error('Failed to create WebSocket:', error)
        reject(error instanceof Error ? error : new Error('WebSocket creation failed'))
      }
    })
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }
    this.stopPing()
  }

  /**
   * Send theme customization update
   */
  sendCustomizationUpdate(customization: ThemeCustomization): void {
    this.sendUpdate({
      type: 'customization',
      data: customization,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId
    })
  }

  /**
   * Send layout change update
   */
  sendLayoutUpdate(layout: string): void {
    this.sendUpdate({
      type: 'layout',
      data: { layout },
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId
    })
  }

  /**
   * Send content update
   */
  sendContentUpdate(content: any): void {
    this.sendUpdate({
      type: 'content',
      data: content,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId
    })
  }

  /**
   * Request full preview refresh
   */
  requestFullRefresh(): void {
    this.sendUpdate({
      type: 'full-refresh',
      data: {},
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId
    })
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  /**
   * Add update listener
   */
  onUpdate(callback: (update: PreviewUpdate) => void): () => void {
    this.onUpdateCallbacks.add(callback)
    return () => this.onUpdateCallbacks.delete(callback)
  }

  /**
   * Add connection status listener
   */
  onConnection(callback: (connected: boolean) => void): () => void {
    this.onConnectionCallbacks.add(callback)
    return () => this.onConnectionCallbacks.delete(callback)
  }

  /**
   * Add error listener
   */
  onError(callback: (error: Error) => void): () => void {
    this.onErrorCallbacks.add(callback)
    return () => this.onErrorCallbacks.delete(callback)
  }

  /**
   * Get WebSocket URL
   */
  private getWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const path = '/api/preview/ws'
    const params = new URLSearchParams({
      userId: this.userId,
      sessionId: this.sessionId,
      ...(this.pageId && { pageId: this.pageId })
    })
    
    return `${protocol}//${host}${path}?${params.toString()}`
  }

  /**
   * Send handshake message
   */
  private sendHandshake(): void {
    const handshake = {
      type: 'handshake',
      data: {
        userId: this.userId,
        sessionId: this.sessionId,
        pageId: this.pageId,
        timestamp: new Date().toISOString()
      }
    }

    this.sendMessage(handshake)
  }

  /**
   * Send update through WebSocket
   */
  private sendUpdate(update: PreviewUpdate): void {
    this.sendMessage(update)
  }

  /**
   * Send message through WebSocket
   */
  private sendMessage(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message))
      } catch (error) {
        console.error('Failed to send WebSocket message:', error)
        this.notifyError(error instanceof Error ? error : new Error('Send failed'))
      }
    } else {
      console.warn('Cannot send message: WebSocket not connected')
    }
  }

  /**
   * Handle incoming update
   */
  private handleUpdate(update: PreviewUpdate): void {
    // Filter out updates from same session to avoid loops
    if (update.sessionId === this.sessionId) {
      return
    }

    this.onUpdateCallbacks.forEach(callback => {
      try {
        callback(update)
      } catch (error) {
        console.error('Error in update callback:', error)
      }
    })
  }

  /**
   * Start ping to keep connection alive
   */
  private startPing(): void {
    this.stopPing()
    
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.sendMessage({ type: 'ping', timestamp: new Date().toISOString() })
      }
    }, 30000) // Ping every 30 seconds
  }

  /**
   * Stop ping interval
   */
  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts)
    
    setTimeout(() => {
      this.reconnectAttempts++
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
      this.connect().catch(error => {
        console.error('Reconnection failed:', error)
      })
    }, delay)
  }

  /**
   * Notify connection status change
   */
  private notifyConnectionChange(connected: boolean): void {
    this.onConnectionCallbacks.forEach(callback => {
      try {
        callback(connected)
      } catch (error) {
        console.error('Error in connection callback:', error)
      }
    })
  }

  /**
   * Notify error
   */
  private notifyError(error: Error): void {
    this.onErrorCallbacks.forEach(callback => {
      try {
        callback(error)
      } catch (error) {
        console.error('Error in error callback:', error)
      }
    })
  }
}

// React hook for using preview WebSocket
export const usePreviewWebSocket = (userId: string, pageId?: string) => {
  const [service] = React.useState(() => new PreviewWebSocketService(userId, pageId))
  const [isConnected, setIsConnected] = React.useState(false)
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    const unsubscribeConnection = service.onConnection(setIsConnected)
    const unsubscribeError = service.onError(setError)

    // Connect on mount
    service.connect().catch(console.error)

    // Cleanup on unmount
    return () => {
      unsubscribeConnection()
      unsubscribeError()
      service.disconnect()
    }
  }, [service])

  return {
    service,
    isConnected,
    error,
    sendCustomizationUpdate: React.useCallback((customization: ThemeCustomization) => {
      service.sendCustomizationUpdate(customization)
    }, [service]),
    sendLayoutUpdate: React.useCallback((layout: string) => {
      service.sendLayoutUpdate(layout)
    }, [service]),
    sendContentUpdate: React.useCallback((content: any) => {
      service.sendContentUpdate(content)
    }, [service]),
    requestFullRefresh: React.useCallback(() => {
      service.requestFullRefresh()
    }, [service]),
    onUpdate: React.useCallback((callback: (update: PreviewUpdate) => void) => {
      return service.onUpdate(callback)
    }, [service])
  }
}

export default PreviewWebSocketService