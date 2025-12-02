import { FC } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDown, Home, ShoppingBag, HelpCircle, LucideIcon,
  LayoutDashboard, Package, ShoppingCart, TrendingUp, Users, Heart,
  MessageCircle, ClipboardList, Box, Handshake, BarChart, Megaphone,
  Tag, DollarSign, Link as LinkIcon, PieChart, Warehouse
} from 'lucide-react';
import HamburgerMenu from '../layout/HamburgerMenu';
import { useMenu } from '../../hooks/useMenu';
import { useAuth } from '../../contexts/AuthContext';
import { getMenuForRole } from '../../config/roles/menus';

interface MenuItem {
  id: string;
  title: string;
  url: string;
  icon?: string;
  target?: string;
  badge?: string;
  children?: MenuItem[];
}

interface NavigationProps {
  menuRef?: string; // Menu location key (e.g., 'primary', 'shop-categories')
  orientation?: 'horizontal' | 'vertical';
  showSubmenuIcon?: boolean;
  className?: string;
  menuItems?: MenuItem[]; // Legacy support - will be deprecated
  data?: {
    menuRef?: string;
    menuLocation?: string; // Alternative to menuRef
    orientation?: 'horizontal' | 'vertical';
    showSubmenuIcon?: boolean;
  };
  subdomain?: string | null;
  path?: string;
}

const Navigation: FC<NavigationProps> = ({
  menuRef,
  orientation,
  showSubmenuIcon,
  className = '',
  menuItems: propMenuItems,
  data,
  subdomain,
  path
}) => {
  // Extract values from props or data object (from TemplatePartRenderer)
  const finalMenuRef = data?.menuLocation || data?.menuRef || menuRef || 'primary';
  const finalOrientation = data?.orientation || orientation || 'horizontal';
  const finalShowSubmenuIcon = data?.showSubmenuIcon !== undefined ? data.showSubmenuIcon : (showSubmenuIcon ?? true);

  // Get current user role
  const { user, isAuthenticated } = useAuth();
  const currentRole = user?.activeRole || user?.currentRole || (user?.roles && user.roles.length > 0 ? user.roles[0] : null);

  // Get role-based menu configuration
  const roleMenuConfig = getMenuForRole(currentRole);
  const roleMenuItems: MenuItem[] = roleMenuConfig.primary || [];

  // Fetch menu data using the hook
  const { items: fetchedItems, isLoading, error } = useMenu({
    location: finalMenuRef,
    subdomain,
    path,
    enabled: !propMenuItems, // Only fetch if menuItems not provided
  });

  // Menu merging strategy: Role menus take priority, DB menus as fallback
  // For authenticated users with roles: use role menu
  // For guest users or no role menu: use DB menu
  let menuItems: MenuItem[];

  if (propMenuItems) {
    // Legacy: use provided menuItems
    menuItems = propMenuItems;
  } else if (roleMenuItems.length > 0) {
    // Priority: Use role-based menu if available
    menuItems = roleMenuItems;
  } else {
    // Fallback: Use DB menu
    menuItems = fetchedItems;
  }

  // Loading state
  if (isLoading && !propMenuItems) {
    return (
      <nav className={`navigation navigation-${finalOrientation} ${className}`}>
        <div className="animate-pulse flex gap-4">
          <div className="h-8 w-20 bg-gray-200 rounded"></div>
          <div className="h-8 w-20 bg-gray-200 rounded"></div>
          <div className="h-8 w-20 bg-gray-200 rounded"></div>
        </div>
      </nav>
    );
  }

  // Error state - render empty menu
  if (error && !propMenuItems) {
    // Silently return null if menu doesn't exist yet
    // console.log('Menu not found, using fallback');
    return null;
  }

  // Icon mapping for menu items (expanded for role-based menus)
  const iconMap: Record<string, LucideIcon> = {
    'Home': Home,
    'Shop': ShoppingBag,
    'ShoppingBag': ShoppingBag,
    'ShoppingCart': ShoppingCart,
    'Support': HelpCircle,
    'HelpCircle': HelpCircle,
    'LayoutDashboard': LayoutDashboard,
    'Package': Package,
    'TrendingUp': TrendingUp,
    'Users': Users,
    'Heart': Heart,
    'MessageCircle': MessageCircle,
    'ClipboardList': ClipboardList,
    'Box': Box,
    'Handshake': Handshake,
    'BarChart': BarChart,
    'Megaphone': Megaphone,
    'Tag': Tag,
    'DollarSign': DollarSign,
    'Link': LinkIcon,
    'PieChart': PieChart,
    'Warehouse': Warehouse,
  };

  const getMenuIcon = (title: string, iconName?: string) => {
    // Priority: iconName (from role menu) > title (fallback)
    const key = iconName || title;
    const IconComponent = iconMap[key];
    return IconComponent ? <IconComponent className="w-4 h-4" /> : null;
  };

  const renderMenuItem = (item: MenuItem, depth = 0): React.ReactNode => {
    const hasChildren = item.children && item.children.length > 0;
    const icon = depth === 0 ? getMenuIcon(item.title, item.icon) : null;

    return (
      <li key={item.id} className={`menu-item menu-item-depth-${depth} ${hasChildren ? 'has-children' : ''}`}>
        {item.target === '_blank' ? (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="menu-link"
          >
            {icon}
            <span>{item.title}</span>
            {hasChildren && finalShowSubmenuIcon && (
              <ChevronDown className="submenu-icon ml-1 h-4 w-4" />
            )}
          </a>
        ) : (
          <Link to={item.url} className="menu-link">
            {icon}
            <span>{item.title}</span>
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
          gap: 0.5rem;
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