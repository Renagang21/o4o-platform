/**
 * CleanBlockWrapper with Debug Instrumentation
 *
 * This is a copy of CleanBlockWrapper that tracks:
 * - When useEffect runs
 * - Whether editable element is found
 * - What activeElement is before/after focus()
 * - Whether focus() actually succeeds
 */

import React, { ReactNode, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface DebugEvent {
  timestamp: string;
  stage: string;
  detail: string;
}

interface CleanBlockWrapperDebugProps {
  id: string;
  type: string;
  isSelected: boolean;
  onSelect?: () => void;
  children: ReactNode;
  className?: string;
  onDebugEvent?: (event: DebugEvent) => void;
}

export const CleanBlockWrapperDebug: React.FC<CleanBlockWrapperDebugProps> = ({
  id,
  type,
  isSelected,
  onSelect,
  children,
  className,
  onDebugEvent,
}) => {
  const blockRef = useRef<HTMLDivElement>(null);

  const logDebug = (stage: string, detail: string) => {
    const timestamp = new Date().toLocaleTimeString('ko-KR', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    } as any);

    // Also log to console for easier debugging
    // eslint-disable-next-line no-console
    console.log(`[${id}:${type}] ${stage}:`, detail);

    if (onDebugEvent) {
      onDebugEvent({ timestamp, stage, detail });
    }
  };

  // Auto-focus when block becomes selected
  useEffect(() => {
    logDebug('useEffect START', `isSelected: ${isSelected}, hasRef: ${!!blockRef.current}`);

    if (isSelected && blockRef.current) {
      // Try multiple selectors: Slate's contenteditable, textarea, or input
      const editable = (
        blockRef.current.querySelector('[contenteditable="true"]') ||
        blockRef.current.querySelector('textarea') ||
        blockRef.current.querySelector('input[type="text"]')
      ) as HTMLElement;

      const activeElementBefore = document.activeElement;

      logDebug('querySelector', `Found editable: ${!!editable} (${editable?.tagName || 'none'}), activeElement: ${activeElementBefore?.tagName}`);

      if (editable) {
        // Use setTimeout to ensure focus happens after React finishes rendering
        setTimeout(() => {
          editable.focus();
          const activeElementAfter = document.activeElement;
          const focusSuccess = activeElementAfter === editable;

          logDebug('After focus()', `activeElement: ${activeElementAfter?.tagName}, success: ${focusSuccess}`);
        }, 0);
      } else {
        logDebug('No editable found', 'Cannot restore focus');
      }
    }
  }, [isSelected, onDebugEvent]);

  return (
    <div
      ref={blockRef}
      data-block-id={id}
      data-block-type={type}
      className={cn(
        'wp-block',
        `wp-block-${type.replace('/', '-')}`,
        'relative',
        'my-7',
        isSelected && 'is-selected',
        className
      )}
      onClick={() => {
        logDebug('onClick', 'Block clicked, calling onSelect()');
        if (onSelect) onSelect();
      }}
    >
      {children}
    </div>
  );
};

export default CleanBlockWrapperDebug;
