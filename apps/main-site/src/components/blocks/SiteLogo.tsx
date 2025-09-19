import { FC } from 'react';
import { Link } from 'react-router-dom';

interface SiteLogoProps {
  width?: number;
  height?: number;
  isLink?: boolean;
  linkTarget?: string;
  className?: string;
}

const SiteLogo: FC<SiteLogoProps> = ({
  width = 120,
  height,
  isLink = true,
  linkTarget = '_self',
  className = ''
}) => {
  // TODO: Get logo from settings
  const logoUrl = '/images/logo.png'; // Updated path
  const siteName = 'Neture Platform';

  const logo = (
    <img
      src={logoUrl}
      alt={siteName}
      width={width}
      height={height || 'auto'}
      className={`site-logo ${className}`}
      onError={(e) => {
        // Enhanced debugging for browser testing
        const target = e.target as HTMLImageElement;
        const errorDetails = {
          src: target.src,
          naturalWidth: target.naturalWidth,
          naturalHeight: target.naturalHeight,
          complete: target.complete,
          timestamp: new Date().toISOString()
        };
        
        console.warn('🖼️ Logo loading failed:', {
          attempted_url: logoUrl,
          resolved_url: target.src,
          error_details: errorDetails,
          fallback_action: 'Hiding logo - no fallback',
          current_domain: window.location.origin,
          expected_logo_url: `${window.location.origin}${logoUrl}`
        });
        
        // Simply hide the logo without any fallback
        target.style.display = 'none';
      }}
    />
  );

  if (!isLink) {
    return logo;
  }

  if (linkTarget === '_blank') {
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