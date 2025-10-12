import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useMenu } from '../../hooks/useMenu';
import './HamburgerMenu.css';

interface MenuItem {
  id: string;
  title: string;
  url: string;
  target?: string;
  children?: MenuItem[];
}

interface HamburgerMenuProps {
  menuRef?: string; // Menu location key (e.g., 'primary', 'mobile')
  subdomain?: string | null;
  path?: string;
}

const HamburgerMenu: React.FC<HamburgerMenuProps> = ({
  menuRef = 'mobile',
  subdomain,
  path
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Fetch menu data using the hook
  const { items: menuItems, isLoading: loading, error } = useMenu({
    location: menuRef,
    subdomain,
    path,
  });

  // Fallback menu items if fetch fails
  const fallbackItems: MenuItem[] = [
    { id: '1', title: '홈', url: '/' },
    { id: '2', title: '소개', url: '/about' },
    { id: '3', title: '서비스', url: '/services' },
    { id: '4', title: '문의', url: '/contact' }
  ];

  const displayMenuItems = error ? fallbackItems : menuItems;

  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      // Get the target element
      const target = event.target as Node;
      
      // Check if click is outside both menu and button
      if (
        menuPanelRef.current &&
        buttonRef.current &&
        !menuPanelRef.current.contains(target) &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    // Use a proper delay to ensure the menu is fully opened
    // This prevents the opening click from immediately closing the menu
    const timeoutId = setTimeout(() => {
      // Listen for both mouse and touch events
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }, 100); // 100ms delay ensures the menu opening is complete
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const toggleMenu = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Prevent ghost clicks on mobile
    if ('touches' in e) {
      e.nativeEvent.stopImmediatePropagation();
    }
    
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
          onTouchEnd={toggleMenu}
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
            {displayMenuItems.map(item => renderMenuItem(item))}
          </ul>
        </nav>
      </div>
    </>
  );
};

export default HamburgerMenu;