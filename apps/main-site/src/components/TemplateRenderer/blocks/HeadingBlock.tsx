import { CSSProperties, FC } from 'react';

interface HeadingBlockProps {
  text?: string;
  content?: string; // AI-generated blocks use "content"
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  alignment?: 'left' | 'center' | 'right';
  settings?: {
    color?: string;
    marginTop?: string;
    marginBottom?: string;
  };
}

const HeadingBlock: FC<HeadingBlockProps> = ({
  text,
  content,
  level = 2,
  alignment = 'left',
  settings = {}
}) => {
  // Support both "text" and "content" props
  const headingText = content || text || '';
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
      {headingText}
    </Tag>
  );
};

export default HeadingBlock;