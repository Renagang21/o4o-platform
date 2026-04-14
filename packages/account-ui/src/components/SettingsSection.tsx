import type { ReactNode } from 'react';

interface SettingsSectionProps {
  /** Section heading */
  title: string;
  /** Optional description below the heading */
  description?: string;
  children: ReactNode;
}

export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-gray-400 mb-4">{description}</p>
      )}
      {!description && <div className="mb-3" />}
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
}
