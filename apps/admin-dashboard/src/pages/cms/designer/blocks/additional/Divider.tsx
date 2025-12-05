/**
 * Additional Block - Divider
 *
 * Horizontal divider line
 */

export interface DividerProps {
  thickness?: number;
  width?: 'full' | 'content';
  color?: string;
  style?: 'solid' | 'dashed' | 'dotted';
  marginY?: 'none' | 'sm' | 'md' | 'lg';
}

const marginClasses = {
  none: '',
  sm: 'my-2',
  md: 'my-4',
  lg: 'my-8',
};

const widthClasses = {
  full: 'w-full',
  content: 'w-3/4 mx-auto',
};

export default function Divider({
  thickness = 1,
  width = 'full',
  color = '#e5e7eb',
  style = 'solid',
  marginY = 'md',
}: DividerProps) {
  return (
    <hr
      className={`${widthClasses[width]} ${marginClasses[marginY]} border-0`}
      style={{
        height: `${thickness}px`,
        backgroundColor: color,
        borderTopStyle: style,
        borderTopWidth: style !== 'solid' ? `${thickness}px` : undefined,
        borderTopColor: style !== 'solid' ? color : undefined,
      }}
    />
  );
}
