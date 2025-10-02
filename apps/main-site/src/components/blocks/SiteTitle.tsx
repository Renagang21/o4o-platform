import { FC, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';

interface SiteTitleProps {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  isLink?: boolean;
  textColor?: string;
  className?: string;
}

const SiteTitle: FC<SiteTitleProps> = ({
  level = 1,
  isLink = true,
  textColor,
  className = ''
}) => {
  const [siteTitle, setSiteTitle] = useState<string>('O4O Platform');
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchSiteSettings = async () => {
      try {
        const response = await authClient.api.get('/settings/customizer');
        if (response.status === 200 && response.data) {
          const settings = response.data.data || response.data;
          if (settings?.siteIdentity?.siteTitle?.text) {
            setSiteTitle(settings.siteIdentity.siteTitle.text);
          }
        }
      } catch (error) {
        // Keep default title on error
      } finally {
        setLoading(false);
      }
    };
    
    fetchSiteSettings();
  }, []);
  
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  
  const titleElement = (
    <Tag 
      className={`site-title ${className}`}
      style={{ color: textColor }}
    >
      {siteTitle}
    </Tag>
  );

  if (!isLink) {
    return titleElement;
  }

  return (
    <Link to="/" className="site-title-link">
      {titleElement}
    </Link>
  );
};

export default SiteTitle;