import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';

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

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const response = await authClient.api.get(`/v1/menus/${menuRef}`);
        if (response.status === 200 && response.data) {
          const data = response.data;
          if (data && typeof data === 'object' && 'success' in data) {
            if (data.success && data.data) {
              setMenuItems(data.data.items || []);
            }
          } else if (data && data.items) {
            setMenuItems(data.items);
          }
        }
      } catch (error) {
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
      if (menuPanelRef.current && !menuPanelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const renderMenuItem = (item: MenuItem): React.ReactNode => {
    const hasChildren = item.children && item.children.length > 0;
    
    return (
      <li key={item.id} className="hamburger-menu-item">
        {item.target === '_blank' ? (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hamburger-menu-link"
            onClick={() => setIsOpen(false)}
          >
            {item.title}
          </a>
        ) : (
          <Link 
            to={item.url} 
            className="hamburger-menu-link"
            onClick={() => setIsOpen(false)}
          >
            {item.title}
          </Link>
        )}
        
        {hasChildren && (
          <ul className="hamburger-submenu">
            {item.children!.map(child => renderMenuItem(child))}
          </ul>
        )}
      </li>
    );
  };

  if (loading) {
    return (
      <div className="hamburger-menu">
        <button className="hamburger-toggle">
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
        </button>
      </div>
    );
  }

  return (
    <div className="hamburger-menu" ref={menuPanelRef}>
      <button 
        className={`hamburger-toggle ${isOpen ? 'is-open' : ''}`}
        onClick={toggleMenu}
        aria-label="Toggle menu"
      >
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
      </button>

      <div className={`hamburger-panel ${isOpen ? 'is-open' : ''}`}>
        <nav className="hamburger-nav">
          <ul className="hamburger-menu-list">
            {menuItems.map(item => renderMenuItem(item))}
          </ul>
        </nav>
      </div>

      <style>{`
        .hamburger-menu {
          display: none;
          position: relative;
        }

        @media (max-width: 768px) {
          .hamburger-menu {
            display: block;
          }
        }

        .hamburger-toggle {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          width: 30px;
          height: 24px;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0;
          z-index: 1001;
          position: relative;
        }

        .hamburger-line {
          display: block;
          width: 100%;
          height: 3px;
          background-color: #333;
          border-radius: 2px;
          transition: all 0.3s ease;
        }

        .hamburger-toggle.is-open .hamburger-line:nth-child(1) {
          transform: translateY(10px) rotate(45deg);
        }

        .hamburger-toggle.is-open .hamburger-line:nth-child(2) {
          opacity: 0;
        }

        .hamburger-toggle.is-open .hamburger-line:nth-child(3) {
          transform: translateY(-10px) rotate(-45deg);
        }

        .hamburger-panel {
          position: fixed;
          top: 0;
          right: -100%;
          width: 280px;
          height: 100vh;
          background-color: white;
          box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
          transition: right 0.3s ease;
          z-index: 1000;
          overflow-y: auto;
        }

        .hamburger-panel.is-open {
          right: 0;
        }

        .hamburger-nav {
          padding-top: 60px;
        }

        .hamburger-menu-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .hamburger-menu-item {
          border-bottom: 1px solid #e5e7eb;
        }

        .hamburger-menu-link {
          display: block;
          padding: 1rem 1.5rem;
          color: #333;
          text-decoration: none;
          transition: background-color 0.2s;
        }

        .hamburger-menu-link:hover {
          background-color: #f3f4f6;
        }

        .hamburger-submenu {
          list-style: none;
          padding: 0;
          margin: 0;
          background-color: #f9fafb;
        }

        .hamburger-submenu .hamburger-menu-link {
          padding-left: 2.5rem;
          font-size: 0.9em;
        }

        @media (min-width: 769px) {
          .hamburger-menu {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default HamburgerMenu;