import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../../../config/api';

interface MenuItem {
  id: string | number;
  title: string;
  url: string;
  target?: string;
  children?: MenuItem[];
}

interface MenuWidgetProps {
  data?: {
    title?: string;
    menuId?: string;
    menuRef?: string;
    orientation?: 'horizontal' | 'vertical';
    showSubmenuIcon?: boolean;
    customClass?: string;
  };
}

export const MenuWidget: React.FC<MenuWidgetProps> = ({ data = {} }) => {
  const {
    title,
    menuId,
    menuRef,
    orientation = 'vertical',
    showSubmenuIcon = false,
    customClass = ''
  } = data;

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch menu items from API
    const fetchMenu = async () => {
      try {
        const menuIdentifier = menuRef || menuId || 'footer-menu';
        const response = await fetch(`${API_BASE_URL}/menus/${menuIdentifier}/items`);
        
        if (response.ok) {
          const data = await response.json();
          setMenuItems(data.items || []);
        }
      } catch (error) {
        console.error('Failed to fetch menu:', error);
        // Fallback menu items
        setMenuItems([
          { id: 1, title: 'About Us', url: '/about' },
          { id: 2, title: 'Services', url: '/services' },
          { id: 3, title: 'Contact', url: '/contact' },
          { id: 4, title: 'Privacy Policy', url: '/privacy' }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, [menuId, menuRef]);

  const renderMenuItem = (item: MenuItem) => {
    const isExternal = item.url?.startsWith('http');
    
    if (isExternal) {
      return (
        <li key={item.id} className="footer-menu__item">
          <a
            href={item.url}
            target={item.target || '_blank'}
            rel="noopener noreferrer"
            className="footer-menu__link"
          >
            {item.title}
          </a>
        </li>
      );
    }

    return (
      <li key={item.id} className="footer-menu__item">
        <Link to={item.url} className="footer-menu__link">
          {item.title}
        </Link>
      </li>
    );
  };

  if (loading) {
    return (
      <div className={`footer-widget footer-widget--menu ${customClass}`}>
        {title && <h3 className="footer-widget__title">{title}</h3>}
        <div className="footer-widget__loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className={`footer-widget footer-widget--menu ${customClass}`}>
      {title && (
        <h3 className="footer-widget__title">{title}</h3>
      )}
      <ul className={`footer-menu footer-menu--${orientation}`}>
        {menuItems.map(renderMenuItem)}
      </ul>
    </div>
  );
};