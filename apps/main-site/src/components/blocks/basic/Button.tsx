/**
 * Button Block Renderer
 */

import { BlockRendererProps } from '../BlockRenderer';
import { Link } from 'react-router-dom';

const variantClasses = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700',
  secondary: 'bg-gray-600 text-white hover:bg-gray-700',
  outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50',
  ghost: 'text-blue-600 hover:bg-blue-50',
};

const sizeClasses = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
};

export const ButtonBlock = ({ node }: BlockRendererProps) => {
  const {
    text = 'Button',
    href = '#',
    variant = 'primary',
    size = 'md',
    fullWidth = false,
  } = node.props;

  const className = `inline-block rounded-lg font-semibold transition-colors ${
    variantClasses[variant as keyof typeof variantClasses] || variantClasses.primary
  } ${sizeClasses[size as keyof typeof sizeClasses] || sizeClasses.md} ${
    fullWidth ? 'w-full text-center' : ''
  }`;

  return (
    <Link to={href} className={className}>
      {text}
    </Link>
  );
};
