/**
 * AppEnableToggle Component
 *
 * Toggle switch for enabling/disabling an app.
 */

import { useState } from 'react';

export interface AppEnableToggleProps {
  appId: string;
  enabled: boolean;
  onToggle?: (appId: string, enabled: boolean) => void;
  disabled?: boolean;
}

export function AppEnableToggle({ appId, enabled, onToggle, disabled }: AppEnableToggleProps) {
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
    if (toggling || disabled) return;

    setToggling(true);

    try {
      await onToggle?.(appId, !enabled);
    } catch (error) {
      console.error('Failed to toggle app:', error);
    } finally {
      setToggling(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={toggling || disabled}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full transition-colors
        ${enabled ? 'bg-blue-600' : 'bg-gray-200'}
        ${(toggling || disabled) && 'opacity-50 cursor-not-allowed'}
      `}
      aria-label={enabled ? 'Disable app' : 'Enable app'}
    >
      <span
        className={`
          inline-block h-4 w-4 transform rounded-full bg-white transition-transform
          ${enabled ? 'translate-x-6' : 'translate-x-1'}
        `}
      />
      {toggling && (
        <span className="absolute inset-0 flex items-center justify-center">
          <svg
            className="animate-spin h-3 w-3 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </span>
      )}
    </button>
  );
}
