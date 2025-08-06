import { FC } from 'react';

interface SiteTaglineProps {
  textColor?: string;
  className?: string;
}

const SiteTagline: FC<SiteTaglineProps> = ({
  textColor,
  className = ''
}) => {
  // TODO: Get site tagline from settings
  const siteTagline = '당신만의 특별한 제품을 만드는 곳';

  return (
    <p 
      className={`site-tagline ${className}`}
      style={{ color: textColor }}
    >
      {siteTagline}
    </p>
  );
};

export default SiteTagline;