import { FC } from 'react';
import { Link } from 'react-router-dom';

interface ButtonProps {
  text?: string;
  href?: string;
  target?: '_self' | '_blank' | '_parent' | '_top';
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  className?: string;
  data?: {
    text?: string;
    href?: string;
    target?: string;
    variant?: string;
    size?: string;
  };
}

const Button: FC<ButtonProps> = ({
  text: propText,
  href: propHref,
  target: propTarget = '_self',
  variant: propVariant = 'primary',
  size: propSize = 'medium',
  className = '',
  data
}) => {
  // Extract values from props or data object
  const text = data?.text || propText || 'Button';
  const href = data?.href || propHref || '#';
  const target = data?.target || propTarget;
  const variant = data?.variant || propVariant;
  const size = data?.size || propSize;

  // Variant styles
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50'
  };

  // Size styles
  const sizeClasses = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2 text-base',
    large: 'px-6 py-3 text-lg'
  };

  const buttonClasses = [
    'inline-flex',
    'items-center',
    'justify-center',
    'rounded',
    'font-medium',
    'transition-colors',
    'duration-200',
    variantClasses[variant as keyof typeof variantClasses] || variantClasses.primary,
    sizeClasses[size as keyof typeof sizeClasses] || sizeClasses.medium,
    className
  ].filter(Boolean).join(' ');

  // Check if external link
  const isExternal = href.startsWith('http') || target === '_blank';

  if (isExternal) {
    return (
      <a
        href={href}
        target={target}
        rel={target === '_blank' ? 'noopener noreferrer' : undefined}
        className={buttonClasses}
      >
        {text}
      </a>
    );
  }

  return (
    <Link to={href} className={buttonClasses}>
      {text}
    </Link>
  );
};

export default Button;
