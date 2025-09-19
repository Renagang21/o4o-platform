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
        // Enhanced fallback with debugging for browser testing
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
          fallback_action: 'Switching to text logo'
        });
        
        target.style.display = 'none';
        const parent = target.parentElement;
        if (parent && !parent.querySelector('.text-logo')) {
          const textLogo = document.createElement('div');
          textLogo.className = 'text-logo font-bold text-xl text-blue-600';
          textLogo.textContent = siteName;
          textLogo.title = `Fallback logo (image failed: ${logoUrl})`;
          parent.appendChild(textLogo);
          
          console.info('✅ Text logo fallback applied:', {
            text: siteName,
            parent_element: parent.tagName,
            css_classes: textLogo.className
          });
        }
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