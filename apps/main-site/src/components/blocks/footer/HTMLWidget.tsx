import React from 'react';
import DOMPurify from 'dompurify';

interface HTMLWidgetProps {
  data?: {
    title?: string;
    htmlContent?: string;
    customClass?: string;
  };
}

export const HTMLWidget: React.FC<HTMLWidgetProps> = ({ data = {} }) => {
  const {
    title,
    htmlContent = '',
    customClass = ''
  } = data;

  // Sanitize HTML to prevent XSS attacks
  const sanitizedHTML = DOMPurify.sanitize(htmlContent, {
    ADD_TAGS: ['iframe', 'script'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling']
  });

  return (
    <div className={`footer-widget footer-widget--html ${customClass}`}>
      {title && (
        <h3 className="footer-widget__title">{title}</h3>
      )}
      {sanitizedHTML && (
        <div 
          className="footer-widget__content"
          dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
        />
      )}
    </div>
  );
};