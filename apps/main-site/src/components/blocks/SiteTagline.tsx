import { FC, useState, useEffect } from 'react';
import { authClient } from '@o4o/auth-client';

interface SiteTaglineProps {
  textColor?: string;
  className?: string;
}

const SiteTagline: FC<SiteTaglineProps> = ({
  textColor,
  className = ''
}) => {
  const [siteTagline, setSiteTagline] = useState<string>('당신만의 특별한 제품을 만드는 곳');
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchSiteSettings = async () => {
      try {
        const response = await authClient.api.get('/settings/customizer');
        if (response.status === 200 && response.data) {
          const settings = response.data.data || response.data;
          if (settings?.siteIdentity?.tagline?.text) {
            setSiteTagline(settings.siteIdentity.tagline.text);
          }
        }
      } catch (error) {
        // Keep default tagline on error
      } finally {
        setLoading(false);
      }
    };
    
    fetchSiteSettings();
  }, []);

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