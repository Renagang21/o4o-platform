import React from 'react';
import { 
  Facebook, 
  Twitter, 
  Instagram, 
  Linkedin, 
  Youtube, 
  Github,
  Mail,
  Phone,
  MessageCircle,
  Globe
} from 'lucide-react';

interface SocialLink {
  platform: string;
  url: string;
  icon?: string;
  label?: string;
}

interface SocialWidgetProps {
  data?: {
    title?: string;
    socialLinks?: SocialLink[];
    iconSize?: 'small' | 'normal' | 'large';
    iconColor?: string;
    showLabels?: boolean;
    customClass?: string;
  };
}

const socialIcons: Record<string, React.ComponentType<any>> = {
  facebook: Facebook,
  twitter: Twitter,
  instagram: Instagram,
  linkedin: Linkedin,
  youtube: Youtube,
  github: Github,
  email: Mail,
  phone: Phone,
  whatsapp: MessageCircle,
  website: Globe
};

export const SocialWidget: React.FC<SocialWidgetProps> = ({ data = {} }) => {
  const {
    title,
    socialLinks = [],
    iconSize = 'normal',
    iconColor = 'currentColor',
    showLabels = false,
    customClass = ''
  } = data;

  // Default social links if none provided
  const defaultLinks: SocialLink[] = socialLinks.length > 0 ? socialLinks : [
    { platform: 'facebook', url: '#', label: 'Facebook' },
    { platform: 'twitter', url: '#', label: 'Twitter' },
    { platform: 'instagram', url: '#', label: 'Instagram' },
    { platform: 'linkedin', url: '#', label: 'LinkedIn' }
  ];

  const getIconSize = () => {
    switch (iconSize) {
      case 'small': return 16;
      case 'large': return 28;
      default: return 20;
    }
  };

  const renderSocialLink = (link: SocialLink) => {
    const Icon = socialIcons[link.platform.toLowerCase()] || Globe;
    const size = getIconSize();
    
    return (
      <a
        key={link.platform}
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`footer-social__link footer-social__link--${link.platform.toLowerCase()}`}
        aria-label={link.label || link.platform}
      >
        <Icon size={size} color={iconColor} />
        {showLabels && link.label && (
          <span className="footer-social__label">{link.label}</span>
        )}
      </a>
    );
  };

  return (
    <div className={`footer-widget footer-widget--social ${customClass}`}>
      {title && (
        <h3 className="footer-widget__title">{title}</h3>
      )}
      <div className="footer-social">
        {defaultLinks.map(renderSocialLink)}
      </div>
    </div>
  );
};