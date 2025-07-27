import { FC } from 'react';
import { Link } from 'react-router-dom';

interface ButtonBlockProps {
  text: string;
  url: string;
  style?: 'primary' | 'secondary' | 'outline';
  alignment?: 'left' | 'center' | 'right';
  settings?: {
    backgroundColor?: string;
    textColor?: string;
    borderRadius?: string;
    padding?: string;
    fontSize?: string;
    width?: string;
  };
}

const ButtonBlock: FC<ButtonBlockProps> = ({ 
  text, 
  url,
  style = 'primary',
  alignment = 'left',
  settings = {}
}) => {
  const isExternal = url.startsWith('http://') || url.startsWith('https://');
  
  const buttonClasses = `
    button-block-btn 
    button-${style}
    inline-block
    px-6 py-3
    font-medium
    transition-all
    hover:opacity-90
  `;

  const containerStyle: React.CSSProperties = {
    textAlign: alignment,
    marginBottom: '1rem',
  };

  const buttonStyle: React.CSSProperties = {
    backgroundColor: settings.backgroundColor || (style === 'primary' ? '#3B82F6' : 'transparent'),
    color: settings.textColor || (style === 'primary' ? 'white' : '#3B82F6'),
    borderRadius: settings.borderRadius || '0.375rem',
    padding: settings.padding || '0.75rem 1.5rem',
    fontSize: settings.fontSize || '1rem',
    width: settings.width || 'auto',
    border: style === 'outline' ? '2px solid currentColor' : 'none',
  };

  const ButtonContent = (
    <span 
      className={buttonClasses}
      style={buttonStyle}
    >
      {text}
    </span>
  );

  return (
    <div className="button-block" style={containerStyle}>
      {isExternal ? (
        <a href={url} target="_blank" rel="noopener noreferrer">
          {ButtonContent}
        </a>
      ) : (
        <Link to={url}>
          {ButtonContent}
        </Link>
      )}
    </div>
  );
};

export default ButtonBlock;