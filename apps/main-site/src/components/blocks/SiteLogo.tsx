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
  const logoUrl = '/logo.png'; // Placeholder
  const siteName = 'O4O Platform';

  const logo = (
    <img
      src={logoUrl}
      alt={siteName}
      width={width}
      height={height || 'auto'}
      className={`site-logo ${className}`}
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