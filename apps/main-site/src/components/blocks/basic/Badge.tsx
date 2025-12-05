/**
 * Badge Block Renderer
 */

import { BlockRendererProps } from '../BlockRenderer';

export const BadgeBlock = ({ node }: BlockRendererProps) => {
  const { text = '', variant = 'default', size = 'md' } = node.props;

  const variantClasses = {
    default: 'bg-gray-100 text-gray-800',
    primary: 'bg-blue-100 text-blue-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-cyan-100 text-cyan-800',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-sm',
    lg: 'px-3 py-1 text-base',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${
        variantClasses[variant as keyof typeof variantClasses] || variantClasses.default
      } ${sizeClasses[size as keyof typeof sizeClasses] || sizeClasses.md}`}
    >
      {text}
    </span>
  );
};
