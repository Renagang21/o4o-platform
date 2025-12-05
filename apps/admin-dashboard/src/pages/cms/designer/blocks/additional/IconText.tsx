/**
 * Additional Block - IconText
 *
 * Icon with text combination
 */

export interface IconTextProps {
  icon: string;
  text: string;
  layout?: 'horizontal' | 'vertical';
  iconSize?: 'sm' | 'md' | 'lg' | 'xl';
  textAlign?: 'left' | 'center' | 'right';
  gap?: 'sm' | 'md' | 'lg';
}

const iconSizeClasses = {
  sm: 'text-2xl',
  md: 'text-4xl',
  lg: 'text-6xl',
  xl: 'text-8xl',
};

const gapClasses = {
  horizontal: {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  },
  vertical: {
    sm: 'gap-1',
    md: 'gap-2',
    lg: 'gap-4',
  },
};

const alignClasses = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

export default function IconText({
  icon = '✨',
  text = 'Sample Text',
  layout = 'horizontal',
  iconSize = 'md',
  textAlign = 'left',
  gap = 'md',
}: IconTextProps) {
  if (layout === 'vertical') {
    return (
      <div className={`flex flex-col items-${textAlign === 'center' ? 'center' : textAlign === 'right' ? 'end' : 'start'} ${gapClasses.vertical[gap]}`}>
        <div className={iconSizeClasses[iconSize]}>{icon}</div>
        <div className={alignClasses[textAlign]}>{text}</div>
      </div>
    );
  }

  // Horizontal layout
  return (
    <div className={`flex items-center ${gapClasses.horizontal[gap]}`}>
      <div className={iconSizeClasses[iconSize]}>{icon}</div>
      <div className={alignClasses[textAlign]}>{text}</div>
    </div>
  );
}
