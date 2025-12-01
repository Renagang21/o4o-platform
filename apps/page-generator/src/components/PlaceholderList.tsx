/**
 * Placeholder List Component
 * Shows list of unmapped components that became placeholders
 */

import { FC } from 'react';

interface PlaceholderInfo {
  componentName: string;
  count: number;
}

interface PlaceholderListProps {
  placeholders: PlaceholderInfo[];
}

export const PlaceholderList: FC<PlaceholderListProps> = ({ placeholders }) => {
  if (placeholders.length === 0) {
    return null;
  }

  return (
    <div className="border border-yellow-400 bg-yellow-50 rounded-md p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg
            className="w-5 h-5 text-yellow-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <div className="flex-1">
          <h3 className="text-sm font-semibold text-yellow-800 mb-2">
            ⚠️ Placeholder Blocks Created
          </h3>
          <p className="text-sm text-yellow-700 mb-3">
            The following components could not be automatically mapped to O4O blocks. They have
            been converted to placeholder blocks that you can manually replace later.
          </p>

          <div className="space-y-2">
            {placeholders.map((placeholder) => (
              <div
                key={placeholder.componentName}
                className="flex items-center gap-2 text-sm"
              >
                <span className="font-mono bg-yellow-100 px-2 py-1 rounded text-yellow-900">
                  {placeholder.componentName}
                </span>
                <span className="text-yellow-700">× {placeholder.count}</span>
              </div>
            ))}
          </div>

          <div className="mt-3 text-xs text-yellow-600">
            💡 Tip: You can manually replace these placeholders in the O4O Admin after creating
            the page.
          </div>
        </div>
      </div>
    </div>
  );
};
