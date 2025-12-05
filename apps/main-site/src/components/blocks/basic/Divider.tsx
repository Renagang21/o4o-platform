/**
 * Divider Block Renderer
 */

import { BlockRendererProps } from '../BlockRenderer';

export const DividerBlock = ({ node }: BlockRendererProps) => {
  const {
    thickness = 1,
    width = 'full',
    color = '#e5e7eb',
    style = 'solid',
    marginY = 'md',
  } = node.props;

  const widthClasses = {
    full: 'w-full',
    '75': 'w-3/4 mx-auto',
    '50': 'w-1/2 mx-auto',
    '25': 'w-1/4 mx-auto',
  };

  const marginClasses = {
    none: '',
    sm: 'my-2',
    md: 'my-4',
    lg: 'my-8',
    xl: 'my-12',
  };

  const borderStyle = style === 'dashed' ? 'dashed' : style === 'dotted' ? 'dotted' : 'solid';

  return (
    <hr
      className={`${widthClasses[width as keyof typeof widthClasses] || 'w-full'} ${
        marginClasses[marginY as keyof typeof marginClasses] || 'my-4'
      } border-0`}
      style={{
        height: `${thickness}px`,
        backgroundColor: borderStyle === 'solid' ? color : 'transparent',
        borderTop: borderStyle !== 'solid' ? `${thickness}px ${borderStyle} ${color}` : undefined,
      }}
    />
  );
};
