/**
 * Mobile Menu Panel Component
 * Sliding/fullscreen menu panel for mobile navigation
 */

import React, { useEffect, useState, useRef } from 'react';
import { ChevronDown, ChevronRight, X, User, ShoppingCart, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

interface MenuItem {
  id: string;
  title: string;
  url: string;
  children?: MenuItem[];
}

interface MobileMenuPanelProps {
  isOpen: boolean;
  onClose: () => void;
  menuItems: MenuItem[];
  position?: 'left' | 'right' | 'fullscreen';
  animation?: 'slide' | 'fade' | 'push';
  overlayEnabled?: boolean;
  overlayColor?: string;
  overlayOpacity?: number;
  backgroundColor?: string;
  textColor?: string;
  showAccountIcon?: boolean;
  showCartIcon?: boolean;
  showSearchIcon?: boolean;
  submenuStyle?: 'accordion' | 'dropdown';
  closeOnItemClick?: boolean;
  swipeToClose?: boolean;
  logoUrl?: string;
  siteName?: string;
}

const MobileMenuPanel: React.FC<MobileMenuPanelProps> = ({
  isOpen,
  onClose,
  menuItems = [],
  position = 'left',
  animation = 'slide',
  overlayEnabled = true,
  overlayColor = '#000000',
  overlayOpacity = 0.5,
  backgroundColor = '#ffffff',
  textColor = '#000000',
  showAccountIcon = true,
  showCartIcon = true,
  showSearchIcon = true,
  submenuStyle = 'accordion',
  closeOnItemClick = false,
  swipeToClose = true,
  logoUrl,
  siteName = 'Site'
}) => {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle swipe to close
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!swipeToClose) return;
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipeToClose) return;
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd || !swipeToClose) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if ((position === 'left' && isLeftSwipe) || (position === 'right' && isRightSwipe)) {
      onClose();
    }
  };

  // Toggle submenu expansion
  const toggleSubmenu = (itemId: string) => {
    setExpandedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  // Handle menu item click
  const handleItemClick = () => {
    if (closeOnItemClick) {
      onClose();
    }
  };

  // Render menu items recursively
  const renderMenuItem = (item: MenuItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.id);

    return (
      <li key={item.id} className="menu-item">
        {hasChildren ? (
          <>
            <button
              className="menu-item-button"
              onClick={() => toggleSubmenu(item.id)}
              style={{ paddingLeft: `${20 + level * 20}px`, color: textColor }}
            >
              <span className="menu-item-text">{item.title}</span>
              {submenuStyle === 'accordion' && (
                isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
              )}
            </button>
            {isExpanded && (
              <ul className="submenu">
                {item.children!.map(child => renderMenuItem(child, level + 1))}
              </ul>
            )}
          </>
        ) : (
          <Link
            to={item.url}
            className="menu-item-link"
            onClick={handleItemClick}
            style={{ paddingLeft: `${20 + level * 20}px`, color: textColor }}
          >
            {item.title}
          </Link>
        )}
      </li>
    );
  };

  return (
    <>
      {/* Overlay */}
      {overlayEnabled && isOpen && (
        <div
          className="mobile-menu-overlay"
          onClick={onClose}
          style={{
            backgroundColor: overlayColor,
            opacity: overlayOpacity
          }}
        />
      )}

      {/* Menu Panel */}
      <div
        ref={panelRef}
        className={`mobile-menu-panel ${position} ${animation} ${isOpen ? 'is-open' : ''}`}
        style={{ backgroundColor }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header */}
        <div className="menu-header" style={{ borderBottomColor: `${textColor}20` }}>
          <div className="menu-header-content">
            {logoUrl ? (
              <img src={logoUrl} alt={siteName} className="menu-logo" />
            ) : (
              <h2 className="menu-title" style={{ color: textColor }}>{siteName}</h2>
            )}
            <button
              className="menu-close"
              onClick={onClose}
              aria-label="Close menu"
              style={{ color: textColor }}
            >
              <X size={24} />
            </button>
          </div>

          {/* Action Icons */}
          <div className="menu-actions">
            {showSearchIcon && (
              <button className="action-icon" aria-label="Search" style={{ color: textColor }}>
                <Search size={20} />
              </button>
            )}
            {showAccountIcon && (
              <Link to="/account" className="action-icon" aria-label="Account" style={{ color: textColor }}>
                <User size={20} />
              </Link>
            )}
            {showCartIcon && (
              <Link to="/cart" className="action-icon" aria-label="Cart" style={{ color: textColor }}>
                <ShoppingCart size={20} />
              </Link>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="menu-navigation">
          <ul className="menu-list">
            {menuItems.map(item => renderMenuItem(item))}
          </ul>
        </nav>
      </div>

      <style>{`
        .mobile-menu-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 998;
          backdrop-filter: blur(4px);
          transition: opacity 0.3s ease;
        }

        .mobile-menu-panel {
          position: fixed;
          top: 0;
          bottom: 0;
          width: 85%;
          max-width: 400px;
          z-index: 999;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 0 20px rgba(0, 0, 0, 0.2);
        }

        .mobile-menu-panel.left {
          left: 0;
          transform: translateX(-100%);
        }

        .mobile-menu-panel.left.is-open {
          transform: translateX(0);
        }

        .mobile-menu-panel.right {
          right: 0;
          transform: translateX(100%);
        }

        .mobile-menu-panel.right.is-open {
          transform: translateX(0);
        }

        .mobile-menu-panel.fullscreen {
          left: 0;
          right: 0;
          width: 100%;
          max-width: none;
          transform: translateY(-100%);
        }

        .mobile-menu-panel.fullscreen.is-open {
          transform: translateY(0);
        }

        /* Fade animation */
        .mobile-menu-panel.fade {
          opacity: 0;
          transform: none;
        }

        .mobile-menu-panel.fade.is-open {
          opacity: 1;
          transform: none;
        }

        /* Push animation */
        .mobile-menu-panel.push {
          transform: scale(0.9);
          opacity: 0;
        }

        .mobile-menu-panel.push.is-open {
          transform: scale(1);
          opacity: 1;
        }

        .menu-header {
          padding: 1rem;
          border-bottom: 1px solid;
        }

        .menu-header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .menu-logo {
          max-height: 40px;
          width: auto;
        }

        .menu-title {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0;
        }

        .menu-close {
          background: none;
          border: none;
          padding: 0.5rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 0.25rem;
          transition: background-color 0.2s;
        }

        .menu-close:hover {
          background-color: rgba(0, 0, 0, 0.05);
        }

        .menu-actions {
          display: flex;
          gap: 0.5rem;
        }

        .action-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.75rem;
          background: none;
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 0.375rem;
          text-decoration: none;
          transition: background-color 0.2s;
        }

        .action-icon:hover {
          background-color: rgba(0, 0, 0, 0.05);
        }

        .menu-navigation {
          padding: 1rem 0;
        }

        .menu-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .menu-item {
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }

        .menu-item-button,
        .menu-item-link {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          padding: 1rem 1.25rem;
          background: none;
          border: none;
          text-align: left;
          text-decoration: none;
          font-size: 0.9375rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .menu-item-button:hover,
        .menu-item-link:hover {
          background-color: rgba(0, 0, 0, 0.03);
        }

        .menu-item-text {
          flex: 1;
        }

        .submenu {
          list-style: none;
          padding: 0;
          margin: 0;
          background-color: rgba(0, 0, 0, 0.02);
        }

        .submenu .menu-item {
          border-bottom: 1px solid rgba(0, 0, 0, 0.03);
        }

        .submenu .menu-item:last-child {
          border-bottom: none;
        }

        /* Responsive adjustments */
        @media (max-width: 480px) {
          .mobile-menu-panel {
            width: 90%;
          }
        }

        @media (min-width: 768px) {
          .mobile-menu-panel {
            display: none;
          }
        }

        /* Accessibility */
        .mobile-menu-panel:focus-visible {
          outline: 2px solid currentColor;
          outline-offset: -2px;
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .mobile-menu-overlay,
          .mobile-menu-panel {
            transition: none !important;
          }
        }
      `}</style>
    </>
  );
};

export default MobileMenuPanel;