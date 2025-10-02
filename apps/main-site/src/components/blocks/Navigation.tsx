import { FC, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { authClient } from '@o4o/auth-client';
import HamburgerMenu from '../HamburgerMenu';

interface MenuItem {
  id: string;
  title: string;
  url: string;
  target?: string;
  children?: MenuItem[];
}

interface NavigationProps {
  menuRef?: string; // Menu reference/slug (renamed from ref to avoid React conflict)
  orientation?: 'horizontal' | 'vertical';
  showSubmenuIcon?: boolean;
  className?: string;
}

const Navigation: FC<NavigationProps> = ({
  menuRef = 'primary-menu',
  orientation = 'horizontal',
  showSubmenuIcon = true,
  className = ''
}) => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const response = await authClient.api.get(`/menus/${menuRef}`);
        if (response.status === 200 && response.data) {
          // Handle new API response structure
          const data = response.data;
          if (data && typeof data === 'object' && 'success' in data) {
            // New structure: {success: true, data: {...}}
            if (data.success && data.data) {
              setMenuItems(data.data.items || []);
            } else {
              throw new Error(data.error || 'Failed to fetch menu');
            }
          } else if (data && data.items) {
            // Old structure: direct object with items
            setMenuItems(data.items);
          } else {
            throw new Error('Invalid menu data structure');
          }
        } else {
          throw new Error('Failed to fetch menu');
        }
      } catch (error) {
        // Use fallback menu items for graceful degradation
        setMenuItems([
          { id: '1', title: '홈', url: '/' },
          { id: '2', title: '소개', url: '/about' },
          { id: '3', title: '서비스', url: '/services' },
          { id: '4', title: '문의', url: '/contact' }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, [menuRef]);

  const renderMenuItem = (item: MenuItem, depth = 0): React.ReactNode => {
    const hasChildren = item.children && item.children.length > 0;
    
    return (
      <li key={item.id} className={`menu-item menu-item-depth-${depth} ${hasChildren ? 'has-children' : ''}`}>
        {item.target === '_blank' ? (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="menu-link"
          >
            {item.title}
            {hasChildren && showSubmenuIcon && (
              <ChevronDown className="submenu-icon ml-1 h-4 w-4" />
            )}
          </a>
        ) : (
          <Link to={item.url} className="menu-link">
            {item.title}
            {hasChildren && showSubmenuIcon && (
              <ChevronDown className="submenu-icon ml-1 h-4 w-4" />
            )}
          </Link>
        )}
        
        {hasChildren && (
          <ul className="submenu">
            {item.children!.map(child => renderMenuItem(child, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  if (loading) {
    return <div className="navigation-skeleton animate-pulse h-10 w-64 bg-gray-200 rounded" />;
  }

  const navClasses = [
    'navigation',
    `navigation-${orientation}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <>
      <nav className={`${navClasses} hidden md:block`}>
        <ul className={`menu menu-${orientation}`}>
          {menuItems.map(item => renderMenuItem(item))}
        </ul>
      </nav>
      
      <HamburgerMenu menuRef={menuRef} />
      
      <style>{`
        .navigation-horizontal .menu {
          display: flex;
          gap: 1rem;
          align-items: center;
        }
        
        .navigation-vertical .menu {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .menu-item {
          position: relative;
        }
        
        .menu-link {
          display: flex;
          align-items: center;
          padding: 0.5rem 1rem;
          color: inherit;
          text-decoration: none;
          transition: color 0.2s;
        }
        
        .menu-link:hover {
          color: #3b82f6;
        }
        
        .has-children:hover .submenu {
          display: block;
        }
        
        .submenu {
          display: none;
          position: absolute;
          top: 100%;
          left: 0;
          min-width: 200px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.375rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          z-index: 50;
        }
        
        .navigation-vertical .submenu {
          position: static;
          margin-left: 1rem;
          box-shadow: none;
          border: none;
        }
        
        .submenu .menu-link {
          padding: 0.5rem 1rem;
        }
        
        .submenu .menu-link:hover {
          background-color: #f3f4f6;
        }
      `}</style>
    </>
  );
};

export default Navigation;