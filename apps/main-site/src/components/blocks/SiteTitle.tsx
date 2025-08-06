import { FC } from 'react';
import { Link } from 'react-router-dom';

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
  // TODO: Get site title from settings
  const siteTitle = 'O4O Platform';
  
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