import { FC, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';

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
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [siteName, setSiteName] = useState<string>('Neture Platform');
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchSiteSettings = async () => {
      try {
        // Try to get site identity settings from API
        const response = await authClient.api.get('/v1/settings/customizer');
        if (response.status === 200 && response.data) {
          const settings = response.data.settings || response.data;
          if (settings?.siteIdentity?.logo?.desktop) {
            setLogoUrl(settings.siteIdentity.logo.desktop);
          }
          if (settings?.siteIdentity?.siteTitle?.text) {
            setSiteName(settings.siteIdentity.siteTitle.text);
          }
        }
      } catch (error) {
        console.info('Using default logo settings:', error);
        // Fallback to local image if API fails
        setLogoUrl('/images/logo.png');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSiteSettings();
  }, []);

  // Don't render anything if loading or no logo URL
  if (loading || !logoUrl) {
    return null;
  }
  
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
          fallback_action: 'Hiding logo element',
          current_domain: window.location.origin
        });
        
        // Remove the logo completely from DOM
        if (target.parentElement) {
          target.parentElement.style.display = 'none';
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