import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import './HamburgerMenu.css';

interface MenuItem {
  id: string;
  title: string;
  url: string;
  target?: string;
  children?: MenuItem[];
}

interface HamburgerMenuProps {
  menuRef?: string;
}

const HamburgerMenu: React.FC<HamburgerMenuProps> = ({ menuRef = 'primary-menu' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const response = await authClient.api.get(`/v1/menus/${menuRef}`);
        if (response.data?.success && response.data?.data?.items) {
          setMenuItems(response.data.data.items);
        } else if (response.data?.items) {
          setMenuItems(response.data.items);
        } else {
          throw new Error('Invalid menu data');
        }
      } catch (error) {
        // Fallback menu items
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if click is outside both menu and button
      if (
        isOpen &&
        menuPanelRef.current &&
        buttonRef.current &&
        !menuPanelRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen]);

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(prev => !prev);
  };

  const handleMenuItemClick = () => {
    setIsOpen(false);
  };

  const renderMenuItem = (item: MenuItem): React.ReactNode => {
    const hasChildren = item.children && item.children.length > 0;
    
    return (
      <li key={item.id} className="hm-item">
        {item.target === '_blank' ? (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hm-link"
            onClick={handleMenuItemClick}
          >
            {item.title}
          </a>
        ) : (
          <Link 
            to={item.url} 
            className="hm-link"
            onClick={handleMenuItemClick}
          >
            {item.title}
          </Link>
        )}
        
        {hasChildren && (
          <ul className="hm-submenu">
            {item.children!.map(child => renderMenuItem(child))}
          </ul>
        )}
      </li>
    );
  };

  if (loading) {
    return (
      <div className="hm-container">
        <button className="hm-btn" disabled>
          <span className="hm-line"></span>
          <span className="hm-line"></span>
          <span className="hm-line"></span>
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="hm-container">
        <button 
          ref={buttonRef}
          className={`hm-btn ${isOpen ? 'is-open' : ''}`}
          onClick={toggleMenu}
          aria-label="Toggle menu"
          aria-expanded={isOpen}
        >
          <span className="hm-line"></span>
          <span className="hm-line"></span>
          <span className="hm-line"></span>
        </button>
      </div>

      {/* Backdrop */}
      {isOpen && <div className="hm-backdrop" onClick={() => setIsOpen(false)} />}

      {/* Menu Panel */}
      <div 
        ref={menuPanelRef}
        className={`hm-panel ${isOpen ? 'is-open' : ''}`}
      >
        <nav className="hm-nav">
          <ul className="hm-list">
            {menuItems.map(item => renderMenuItem(item))}
          </ul>
        </nav>
      </div>
    </>
  );
};

export default HamburgerMenu;