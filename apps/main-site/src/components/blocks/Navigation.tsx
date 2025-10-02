import { FC } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import HamburgerMenu from '../layout/HamburgerMenu';

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
  menuItems?: MenuItem[];
  data?: {
    menuRef?: string;
    orientation?: 'horizontal' | 'vertical';
    showSubmenuIcon?: boolean;
  };
}

const Navigation: FC<NavigationProps> = ({
  menuRef,
  orientation,
  showSubmenuIcon,
  className = '',
  menuItems: propMenuItems = [],
  data
}) => {
  // Extract values from props or data object (from TemplatePartRenderer)
  const finalMenuRef = data?.menuRef || menuRef || 'primary-menu';
  const finalOrientation = data?.orientation || orientation || 'horizontal';
  const finalShowSubmenuIcon = data?.showSubmenuIcon !== undefined ? data.showSubmenuIcon : (showSubmenuIcon ?? true);
  const menuItems = propMenuItems;

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
            {hasChildren && finalShowSubmenuIcon && (
              <ChevronDown className="submenu-icon ml-1 h-4 w-4" />
            )}
          </a>
        ) : (
          <Link to={item.url} className="menu-link">
            {item.title}
            {hasChildren && finalShowSubmenuIcon && (
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

  const navClasses = [
    'navigation',
    `navigation-${finalOrientation}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <>
      <nav className={`${navClasses} hidden md:block`}>
        <ul className={`menu menu-${finalOrientation}`}>
          {menuItems.map(item => renderMenuItem(item))}
        </ul>
      </nav>
      
      <HamburgerMenu menuRef={finalMenuRef} />
      
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