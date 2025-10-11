import React from 'react';

interface CopyrightWidgetProps {
  data?: {
    copyrightText?: string;
    showYear?: boolean;
    companyName?: string;
    customClass?: string;
  };
}

export const CopyrightWidget: React.FC<CopyrightWidgetProps> = ({ data = {} }) => {
  const {
    copyrightText,
    showYear = true,
    companyName = 'Your Company',
    customClass = ''
  } = data;

  const currentYear = new Date().getFullYear();
  
  const defaultText = `© ${showYear ? currentYear + ' ' : ''}${companyName}. All rights reserved.`;
  const text = copyrightText || defaultText;
  
  // Replace {year} placeholder with current year
  const processedText = text.replace(/{year}/g, currentYear.toString());

  return (
    <div className={`footer-widget footer-widget--copyright ${customClass}`}>
      <p className="footer-copyright">
        {processedText}
      </p>
    </div>
  );
};