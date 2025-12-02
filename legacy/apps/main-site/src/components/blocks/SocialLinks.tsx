import { FC } from 'react';
import { 
  Facebook, 
  Twitter, 
  Instagram, 
  Linkedin, 
  Youtube,
  Github
} from 'lucide-react';

interface SocialLinksProps {
  iconColor?: string;
  iconColorValue?: string;
  size?: 'has-small-icon-size' | 'has-normal-icon-size' | 'has-large-icon-size' | 'has-huge-icon-size';
  className?: string;
}

// TODO: Get from settings
const socialLinks = [
  { platform: 'facebook', url: 'https://facebook.com', icon: Facebook },
  { platform: 'twitter', url: 'https://twitter.com', icon: Twitter },
  { platform: 'instagram', url: 'https://instagram.com', icon: Instagram },
  { platform: 'linkedin', url: 'https://linkedin.com', icon: Linkedin },
];

const SocialLinks: FC<SocialLinksProps> = ({
  iconColor,
  iconColorValue,
  size = 'has-normal-icon-size',
  className = ''
}) => {
  const iconSizes = {
    'has-small-icon-size': 'h-4 w-4',
    'has-normal-icon-size': 'h-5 w-5',
    'has-large-icon-size': 'h-6 w-6',
    'has-huge-icon-size': 'h-8 w-8'
  };

  const iconSize = iconSizes[size];

  return (
    <div className={`social-links ${size} ${className}`}>
      <ul className="social-links-list">
        {socialLinks.map(({ platform, url, icon: Icon }) => (
          <li key={platform} className="social-links-item">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="social-link"
              aria-label={platform}
              style={{ color: iconColorValue || iconColor }}
            >
              <Icon className={iconSize} />
            </a>
          </li>
        ))}
      </ul>
      
      <style>{`
        .social-links-list {
          display: flex;
          gap: 1rem;
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .social-link {
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s, opacity 0.2s;
        }
        
        .social-link:hover {
          transform: translateY(-2px);
          opacity: 0.8;
        }
      `}</style>
    </div>
  );
};

export default SocialLinks;