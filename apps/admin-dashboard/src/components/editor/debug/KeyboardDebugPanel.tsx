/**
 * KeyboardDebugPanel
 *
 * Visual debugging panel for keyboard events
 * Shows real-time keyboard event information on screen
 */

import React, { useState, useEffect } from 'react';

interface KeyboardEvent {
  timestamp: string;
  source: string;
  key: string;
  target?: string;
  isContentEditable?: boolean;
  defaultPrevented?: boolean;
  editorSelection?: any;
  isSelected?: boolean;
  [key: string]: any;
}

let eventLog: KeyboardEvent[] = [];
let listeners: Array<(events: KeyboardEvent[]) => void> = [];

export function logKeyboardEvent(source: string, data: any) {
  const event: KeyboardEvent = {
    timestamp: new Date().toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 }),
    source,
    ...data,
  };

  eventLog = [event, ...eventLog].slice(0, 50); // Keep last 50 events
  listeners.forEach(listener => listener([...eventLog]));
}

export const KeyboardDebugPanel: React.FC = () => {
  const [events, setEvents] = useState<KeyboardEvent[]>([]);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    listeners.push(setEvents);
    return () => {
      listeners = listeners.filter(l => l !== setEvents);
    };
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          padding: '8px 12px',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          zIndex: 10000,
          fontSize: '12px',
          fontWeight: 'bold',
        }}
      >
        🔍 Show Keyboard Debug
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        width: '600px',
        maxHeight: '400px',
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        color: '#00ff00',
        border: '2px solid #00ff00',
        borderRadius: '8px',
        padding: '12px',
        fontFamily: 'monospace',
        fontSize: '11px',
        zIndex: 10000,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ color: '#00ff00', fontWeight: 'bold' }}>
          🔍 Keyboard Events Debug ({events.length})
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => {
              eventLog = [];
              setEvents([]);
            }}
            style={{
              padding: '4px 8px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '10px',
            }}
          >
            Clear
          </button>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              padding: '4px 8px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '10px',
            }}
          >
            Hide
          </button>
        </div>
      </div>

      <div
        style={{
          overflowY: 'auto',
          flex: 1,
        }}
      >
        {events.length === 0 && (
          <div style={{ color: '#888', textAlign: 'center', padding: '20px' }}>
            Waiting for keyboard events...
          </div>
        )}
        {events.map((event, index) => (
          <div
            key={index}
            style={{
              marginBottom: '8px',
              paddingBottom: '8px',
              borderBottom: '1px solid #333',
            }}
          >
            <div style={{ color: '#00ff00', marginBottom: '4px' }}>
              <span style={{ color: '#888' }}>[{event.timestamp}]</span>{' '}
              <span style={{ fontWeight: 'bold', color: '#3b82f6' }}>{event.source}</span>
              {' '}<span style={{ color: '#fbbf24', fontWeight: 'bold' }}>key: {event.key}</span>
            </div>
            <div style={{ paddingLeft: '12px', fontSize: '10px' }}>
              {event.target && <div style={{ color: '#888' }}>target: {event.target}</div>}
              {event.isContentEditable !== undefined && (
                <div style={{ color: event.isContentEditable ? '#10b981' : '#ef4444' }}>
                  isContentEditable: {String(event.isContentEditable)}
                </div>
              )}
              {event.defaultPrevented !== undefined && (
                <div style={{ color: event.defaultPrevented ? '#ef4444' : '#10b981' }}>
                  defaultPrevented: {String(event.defaultPrevented)}
                </div>
              )}
              {event.isSelected !== undefined && (
                <div style={{ color: '#888' }}>isSelected: {String(event.isSelected)}</div>
              )}
              {event.editorSelection && (
                <div style={{ color: '#888' }}>
                  editorSelection: {JSON.stringify(event.editorSelection)}
                </div>
              )}
              {event.activeElement && (
                <div style={{ color: '#888' }}>activeElement: {event.activeElement}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
