import React from 'react';

interface TextWidgetProps {
  data?: {
    title?: string;
    content?: string;
    textAlign?: 'left' | 'center' | 'right';
    customClass?: string;
  };
}

export const TextWidget: React.FC<TextWidgetProps> = ({ data = {} }) => {
  const {
    title,
    content = '',
    textAlign = 'left',
    customClass = ''
  } = data;

  return (
    <div className={`footer-widget footer-widget--text ${customClass}`}>
      {title && (
        <h3 className="footer-widget__title">{title}</h3>
      )}
      {content && (
        <div 
          className="footer-widget__content"
          style={{ textAlign }}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      )}
    </div>
  );
};