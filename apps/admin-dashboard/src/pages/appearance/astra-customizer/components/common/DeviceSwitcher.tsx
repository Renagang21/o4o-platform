/**
 * DeviceSwitcher Component
 * Device toggle for responsive settings (Desktop/Tablet/Mobile)
 */

import React from 'react';

export type DeviceType = 'desktop' | 'tablet' | 'mobile';

export interface DeviceSwitcherProps {
  /**
   * Currently selected device
   */
  value: DeviceType;

  /**
   * Callback when device selection changes
   */
  onChange: (device: DeviceType) => void;

  /**
   * Optional className for custom styling
   */
  className?: string;
}

/**
 * DeviceSwitcher Component
 *
 * Provides a segmented control for switching between device views.
 * Common pattern for responsive settings in customizer panels.
 *
 * @example
 * ```tsx
 * <DeviceSwitcher
 *   value={device}
 *   onChange={setDevice}
 * />
 * ```
 */
export const DeviceSwitcher: React.FC<DeviceSwitcherProps> = ({
  value,
  onChange,
  className = ''
}) => {
  const devices: DeviceType[] = ['desktop', 'tablet', 'mobile'];

  return (
    <div className={`flex gap-2 p-1 bg-gray-100 rounded ${className}`}>
      {devices.map((device) => (
        <button
          key={device}
          onClick={() => onChange(device)}
          className={`flex-1 px-3 py-1 text-sm rounded transition-colors ${
            value === device ? 'bg-white shadow-sm' : 'hover:bg-gray-50'
          }`}
          aria-pressed={value === device}
          aria-label={`Switch to ${device} view`}
        >
          {device.charAt(0).toUpperCase() + device.slice(1)}
        </button>
      ))}
    </div>
  );
};
