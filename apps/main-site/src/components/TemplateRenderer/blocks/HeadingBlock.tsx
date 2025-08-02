import { CSSProperties, FC } from 'react';

interface HeadingBlockProps {
  text: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  alignment?: 'left' | 'center' | 'right';
  settings?: {
    color?: string;
    marginTop?: string;
    marginBottom?: string;
  };
}

const HeadingBlock: FC<HeadingBlockProps> = ({ 
  text, 
  level = 2,
  alignment = 'left',
  settings = {}
}) => {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  
  const style: CSSProperties = {
    textAlign: alignment,
    color: settings.color || 'inherit',
    marginTop: settings.marginTop || '0',
    marginBottom: settings.marginBottom || '1rem',
  };

  return (
    <Tag 
      className={`heading-block heading-h${level}`}
      style={style}
    >
      {text}
    </Tag>
  );
};

export default HeadingBlock;