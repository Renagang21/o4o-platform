import { FC, ReactNode } from 'react';

interface GroupProps {
  children?: ReactNode;
  layout?: 'default' | 'flex' | 'grid';
  flexDirection?: 'row' | 'column';
  justifyContent?: string;
  alignItems?: string;
  gap?: string;
  gridTemplateColumns?: string;
  justifySelf?: string;
  padding?: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
  margin?: string;
  marginTop?: string;
  paddingTop?: string;
  borderTop?: string;
  backgroundColor?: string;
  textColor?: string;
  className?: string;
}

const Group: FC<GroupProps> = ({
  children,
  layout = 'default',
  flexDirection = 'row',
  justifyContent,
  alignItems,
  gap,
  gridTemplateColumns,
  justifySelf,
  padding,
  margin,
  marginTop,
  paddingTop,
  borderTop,
  backgroundColor,
  textColor,
  className = ''
}) => {
  const layoutClasses = {
    default: '',
    flex: 'flex',
    grid: 'grid'
  };

  const style: React.CSSProperties = {
    flexDirection: layout === 'flex' ? flexDirection : undefined,
    justifyContent,
    alignItems,
    gap,
    gridTemplateColumns: layout === 'grid' ? gridTemplateColumns : undefined,
    justifySelf,
    paddingTop: padding?.top || paddingTop,
    paddingBottom: padding?.bottom,
    paddingLeft: padding?.left,
    paddingRight: padding?.right,
    margin,
    marginTop,
    borderTop,
    backgroundColor,
    color: textColor
  };

  return (
    <div
      className={`${layoutClasses[layout]} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
};

export default Group;