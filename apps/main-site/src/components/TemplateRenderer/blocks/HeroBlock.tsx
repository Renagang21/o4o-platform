import React from 'react';
import ButtonBlock from './ButtonBlock';

interface HeroBlockProps {
  title: string;
  subtitle?: string;
  backgroundImage?: string;
  backgroundColor?: string;
  buttons?: Array<{
    text: string;
    url: string;
    style?: 'primary' | 'secondary' | 'outline';
  }>;
  settings?: {
    height?: string;
    overlay?: boolean;
    overlayOpacity?: number;
    textColor?: string;
    alignment?: 'left' | 'center' | 'right';
  };
}

const HeroBlock: React.FC<HeroBlockProps> = ({ 
  title, 
  subtitle,
  backgroundImage,
  backgroundColor = '#1a1a1a',
  buttons = [],
  settings = {}
}) => {
  const {
    height = '500px',
    overlay = true,
    overlayOpacity = 0.5,
    textColor = 'white',
    alignment = 'center'
  } = settings;

  const heroStyle: React.CSSProperties = {
    minHeight: height,
    backgroundColor,
    backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: textColor,
  };

  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, ' + overlayOpacity + ')',
  };

  return (
    <section className="hero-block" style={heroStyle}>
      {backgroundImage && overlay && <div style={overlayStyle} />}
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ textAlign: alignment }}>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
          {title}
        </h1>
        
        {subtitle && (
          <p className="text-xl md:text-2xl mb-8 opacity-90">
            {subtitle}
          </p>
        )}
        
        {buttons.length > 0 && (
          <div className="flex flex-wrap gap-4" style={{ justifyContent: alignment }}>
            {buttons.map((button, index) => (
              <ButtonBlock
                key={index}
                text={button.text}
                url={button.url}
                style={button.style}
                settings={{
                  textColor: button.style === 'primary' ? 'white' : textColor,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default HeroBlock;