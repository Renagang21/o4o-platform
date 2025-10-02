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
        const response = await authClient.api.get('/settings/customizer');
        if (response.status === 200 && response.data) {
          // API returns { success: true, data: {...} }
          const settings = response.data.data || response.data;
          if (settings?.siteIdentity?.logo?.desktop) {
            // Remove any existing timestamp for clean comparison
            const cleanUrl = settings.siteIdentity.logo.desktop.split('?')[0];
            // Add fresh timestamp for cache busting
            setLogoUrl(`${cleanUrl}?t=${Date.now()}`);
          }
          if (settings?.siteIdentity?.siteTitle?.text) {
            setSiteName(settings.siteIdentity.siteTitle.text);
          }
        }
      } catch (error) {
        // Fallback to local image if API fails
        setLogoUrl('/images/logo.svg');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSiteSettings();
    
    // Listen for logo update messages from customizer
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'update-logo' && event.data.url) {
        setLogoUrl(event.data.url);
      } else if (event.data.type === 'customizer-update' && event.data.settings) {
        const settings = event.data.settings;
        if (settings?.siteIdentity?.logo?.desktop) {
          setLogoUrl(settings.siteIdentity.logo.desktop);
        }
        if (settings?.siteIdentity?.siteTitle?.text) {
          setSiteName(settings.siteIdentity.siteTitle.text);
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
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