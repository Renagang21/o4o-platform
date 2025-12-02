/**
 * AppInstallButton Component
 *
 * Button for installing an app.
 */

import { useState } from 'react';

export interface AppInstallButtonProps {
  appId: string;
  onInstall?: (appId: string) => void;
  disabled?: boolean;
}

export function AppInstallButton({ appId, onInstall, disabled }: AppInstallButtonProps) {
  const [installing, setInstalling] = useState(false);

  const handleInstall = async () => {
    if (installing || disabled) return;

    setInstalling(true);

    try {
      await onInstall?.(appId);
    } catch (error) {
      console.error('Failed to install app:', error);
    } finally {
      setInstalling(false);
    }
  };

  return (
    <button
      onClick={handleInstall}
      disabled={installing || disabled}
      className={`
        w-full px-4 py-2 rounded-md font-medium transition-colors
        ${
          installing || disabled
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }
      `}
    >
      {installing ? (
        <span className="flex items-center justify-center">
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
          Installing...
        </span>
      ) : (
        'Install'
      )}
    </button>
  );
}
