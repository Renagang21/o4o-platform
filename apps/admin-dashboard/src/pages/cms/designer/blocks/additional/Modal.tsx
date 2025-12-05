/**
 * Additional Block - Modal
 *
 * Modal/Dialog placeholder (Designer mode only)
 */

import { ReactNode } from 'react';

export interface ModalProps {
  title?: string;
  buttonText?: string;
  size?: 'sm' | 'md' | 'lg';
  children?: ReactNode;
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
};

export default function Modal({
  title = 'Modal Title',
  buttonText = 'Open Modal',
  size = 'md',
  children,
}: ModalProps) {
  // Designer preview - shows modal structure
  return (
    <div className="py-4">
      {/* Trigger Button */}
      <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
        {buttonText}
      </button>

      {/* Modal Preview (always visible in designer) */}
      <div className="mt-4 p-4 border-2 border-dashed border-purple-400 rounded-lg bg-purple-50">
        <div className="text-xs text-purple-700 mb-3">
          📦 Modal Content (click button to trigger in live view)
        </div>
        <div className={`bg-white rounded-lg shadow-xl p-6 ${sizeClasses[size]}`}>
          {title && (
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">{title}</h3>
              <button className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
          )}
          <div>
            {children || (
              <div className="text-gray-500">
                Modal content goes here. Add children in the canvas.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
