import { FC } from 'react';
import { Link } from 'react-router-dom';

interface SiteLogoProps {
  width?: number;
  height?: number;
  isLink?: boolean;
  linkTarget?: string;
  className?: string;
  logoUrl?: string;
  siteName?: string;
  data?: {
    width?: number;
    logoUrl?: string;
    isLink?: boolean;
    linkTarget?: string;
  };
}

const SiteLogo: FC<SiteLogoProps> = ({
  width,
  height,
  isLink,
  linkTarget,
  className = '',
  logoUrl: propLogoUrl,
  siteName: propSiteName,
  data
}) => {
  // Extract values from props or data object (from TemplatePartRenderer)
  const logoWidth = data?.width || width || 120;
  const logoUrl = data?.logoUrl || propLogoUrl || '/images/logo.svg';
  const siteName = propSiteName || 'Neture Platform';
  const shouldLink = data?.isLink !== undefined ? data.isLink : (isLink ?? true);
  const target = data?.linkTarget || linkTarget || '_self';

  // 🔍 DEBUG: Log logo rendering
  console.log('🖼️  SiteLogo rendering:', {
    'data?.logoUrl': data?.logoUrl,
    'propLogoUrl': propLogoUrl,
    'final logoUrl': logoUrl,
    'logoWidth': logoWidth,
    'full data': data
  });

  // Don't render anything if no logo URL
  if (!logoUrl) {
    console.warn('⚠️  SiteLogo: No logo URL, not rendering');
    return null;
  }
  
  const logo = (
    <img
      src={logoUrl}
      alt={siteName}
      width={logoWidth}
      height={height || 'auto'}
      className={`site-logo ${className}`}
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        
        // Try SVG fallback if PNG fails
        if (target.src.includes('logo.png')) {
          target.src = '/images/logo.svg';
        } else {
          // If SVG also fails, hide the logo
          if (target.parentElement) {
            target.parentElement.style.display = 'none';
          }
        }
      }}
    />
  );

  if (!shouldLink) {
    return logo;
  }

  if (target === '_blank') {
    return (
      <a href="/" target="_blank" rel="noopener noreferrer" className="site-logo-link">
        {logo}
      </a>
    );
  }

  return (
    <Link to="/" className="site-logo-link">
      {logo}
    </Link>
  );
};

export default SiteLogo;