/**
 * Card Block Renderer
 */

import { BlockRendererProps } from '../BlockRenderer';

export const CardBlock = ({ node, children }: BlockRendererProps) => {
  const {
    padding = 'md',
    shadow = 'md',
    rounded = 'md',
    bgColor,
    borderColor,
  } = node.props;

  const paddingClasses = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const shadowClasses = {
    none: 'shadow-none',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
  };

  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
  };

  return (
    <div
      className={`${paddingClasses[padding as keyof typeof paddingClasses] || 'p-6'} ${
        shadowClasses[shadow as keyof typeof shadowClasses] || 'shadow-md'
      } ${roundedClasses[rounded as keyof typeof roundedClasses] || 'rounded-md'}`}
      style={{
        backgroundColor: bgColor,
        borderColor: borderColor,
        borderWidth: borderColor ? '1px' : undefined,
      }}
    >
      {children}
    </div>
  );
};
