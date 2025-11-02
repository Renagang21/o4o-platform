import { FC } from 'react';
import { Link } from 'react-router-dom';
import { useCustomizerSettings } from '../../hooks/useCustomizerSettings';

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
  // Fetch customizer settings for logo
  const { settings, viewportMode } = useCustomizerSettings();

  // Get logo from customizer settings based on viewport
  const customizerLogo = viewportMode === 'mobile'
    ? settings?.siteIdentity?.logo?.mobile
    : settings?.siteIdentity?.logo?.desktop;

  // Get logo width from customizer settings
  const customizerLogoWidth = settings?.siteIdentity?.logo?.width?.[viewportMode] ||
                               settings?.siteIdentity?.logo?.width?.desktop;

  // Extract values from props or data object (from TemplatePartRenderer)
  // Priority: props > data > customizer > default
  const logoWidth = data?.width || width || customizerLogoWidth || 120;
  const logoUrl = data?.logoUrl || propLogoUrl || customizerLogo || '/images/logo.svg';
  const siteName = propSiteName || settings?.siteIdentity?.siteTitle?.text || 'Neture Platform';
  const shouldLink = data?.isLink !== undefined ? data.isLink : (isLink ?? true);
  const target = data?.linkTarget || linkTarget || '_self';

  // Don't render anything if no logo URL
  if (!logoUrl) {
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