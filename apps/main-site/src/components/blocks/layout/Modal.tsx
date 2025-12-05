/**
 * Modal Block Renderer
 */

'use client';

import { BlockRendererProps } from '../BlockRenderer';

export const ModalBlock = ({ node, children }: BlockRendererProps) => {
  const { title = 'Modal', size = 'md' } = node.props;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  // Modal is typically not rendered directly in static pages
  // This is a placeholder that shows the modal content without the overlay
  return (
    <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
      <div className="text-sm text-gray-600 mb-2">Modal: {title}</div>
      <div className={`bg-white rounded-lg shadow-xl ${sizeClasses[size as keyof typeof sizeClasses] || 'max-w-lg'}`}>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};
