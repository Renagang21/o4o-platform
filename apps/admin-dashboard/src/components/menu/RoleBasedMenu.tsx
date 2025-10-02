import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';

interface MenuItem {
  id: string;
  title: string;
  url?: string;
  type: string;
  target?: '_blank' | '_self';
  css_class?: string;
  display_mode?: 'show' | 'hide';
  target_audience?: {
    roles: string[];
    user_ids?: string[];
  };
  children?: MenuItem[];
}

interface Menu {
  id: string;
  name: string;
  slug: string;
  location: string;
  is_active: boolean;
  items: MenuItem[];
}

interface RoleBasedMenuProps {
  menuId: string;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
  showSubmenus?: boolean;
  onItemClick?: (item: MenuItem) => void;
}

export const RoleBasedMenu: React.FC<RoleBasedMenuProps> = ({
  menuId,
  className = '',
  orientation = 'horizontal',
  showSubmenus = true,
  onItemClick
}) => {
  const { user } = useAuthStore();
  const [menu, setMenu] = useState<Menu | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFilteredMenu = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';
        const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
        
        const response = await fetch(`${apiUrl}/api/menus/${menuId}/filtered`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setMenu(result.data);
          } else {
            setError('Failed to load menu');
          }
        } else {
          setError('Menu not found');
        }
      } catch (err) {
        setError('Error loading menu');
        
      } finally {
        setLoading(false);
      }
    };

    fetchFilteredMenu();
  }, [menuId, user]);

  const handleItemClick = (item: MenuItem, event: React.MouseEvent) => {
    if (onItemClick) {
      event.preventDefault();
      onItemClick(item);
      return;
    }

    if (item.url) {
      if (item.target === '_blank') {
        window.open(item.url, '_blank');
      } else {
        window.location.href = item.url;
      }
    }
  };

  const renderMenuItem = (item: MenuItem, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const itemClasses = `
      menu-item 
      ${item.css_class || ''} 
      ${depth > 0 ? 'submenu-item' : 'top-level-item'}
      ${hasChildren ? 'has-children' : ''}
    `.trim();

    return (
      <li key={item.id} className={itemClasses}>
        <a
          href={item.url || '#'}
          target={item.target || '_self'}
          onClick={(e) => handleItemClick(item, e)}
          className={`
            block px-3 py-2 text-sm transition-colors
            ${depth === 0 ? 'text-gray-700 hover:text-blue-600' : 'text-gray-600 hover:text-gray-900'}
            ${depth > 0 ? 'pl-4' : ''}
          `}
        >
          {item.title}
        </a>
        
        {hasChildren && showSubmenus && (
          <ul className={`
            submenu 
            ${orientation === 'vertical' ? 'ml-4' : 'absolute top-full left-0 bg-white shadow-lg rounded-md'}
            ${depth === 0 && orientation === 'horizontal' ? 'min-w-48' : ''}
          `}>
            {item.children?.map(child => renderMenuItem(child, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  if (loading) {
    return (
      <div className={`menu-loading ${className}`}>
        <div className="animate-pulse">Loading menu...</div>
      </div>
    );
  }

  if (error || !menu) {
    return (
      <div className={`menu-error ${className}`}>
        <span className="text-red-500">{error || 'Menu not available'}</span>
      </div>
    );
  }

  if (!menu.items || menu.items.length === 0) {
    return (
      <div className={`menu-empty ${className}`}>
        <span className="text-gray-500">No menu items available</span>
      </div>
    );
  }

  return (
    <nav className={`role-based-menu ${className}`} role="navigation" aria-label={menu.name}>
      <ul className={`
        menu-list 
        ${orientation === 'horizontal' ? 'flex space-x-1' : 'space-y-1'}
        ${orientation === 'horizontal' ? 'relative' : ''}
      `}>
        {menu.items.map(item => renderMenuItem(item))}
      </ul>
    </nav>
  );
};

export default RoleBasedMenu;