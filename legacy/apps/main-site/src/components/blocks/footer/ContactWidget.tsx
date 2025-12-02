import React from 'react';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';

interface ContactWidgetProps {
  data?: {
    title?: string;
    address?: string;
    phone?: string;
    email?: string;
    hours?: string;
    showIcons?: boolean;
    customClass?: string;
  };
}

export const ContactWidget: React.FC<ContactWidgetProps> = ({ data = {} }) => {
  const {
    title,
    address,
    phone,
    email,
    hours,
    showIcons = true,
    customClass = ''
  } = data;

  return (
    <div className={`footer-widget footer-widget--contact ${customClass}`}>
      {title && (
        <h3 className="footer-widget__title">{title}</h3>
      )}
      <div className="footer-contact">
        {address && (
          <div className="footer-contact__item">
            {showIcons && <MapPin size={16} className="footer-contact__icon" />}
            <address className="footer-contact__text">{address}</address>
          </div>
        )}
        
        {phone && (
          <div className="footer-contact__item">
            {showIcons && <Phone size={16} className="footer-contact__icon" />}
            <a href={`tel:${phone.replace(/[^0-9]/g, '')}`} className="footer-contact__link">
              {phone}
            </a>
          </div>
        )}
        
        {email && (
          <div className="footer-contact__item">
            {showIcons && <Mail size={16} className="footer-contact__icon" />}
            <a href={`mailto:${email}`} className="footer-contact__link">
              {email}
            </a>
          </div>
        )}
        
        {hours && (
          <div className="footer-contact__item">
            {showIcons && <Clock size={16} className="footer-contact__icon" />}
            <span className="footer-contact__text">{hours}</span>
          </div>
        )}
      </div>
    </div>
  );
};