/**
 * Responsive Header Component
 * Handles switching between desktop and mobile headers based on screen size
 */

import React, { useState, useEffect, useCallback } from 'react';
import HamburgerMenu from '../mobile/HamburgerMenu';
import MobileMenuPanel from '../mobile/MobileMenuPanel';
import { MobileHeaderSettings } from '@/pages/appearance/astra-customizer/types/customizer-types';

interface ResponsiveHeaderProps {
  children: React.ReactNode;
  mobileSettings?: MobileHeaderSettings;
  menuItems?: any[];
  siteName?: string;
}

const ResponsiveHeader: React.FC<ResponsiveHeaderProps> = ({
  children,
  mobileSettings,
  menuItems = [],
  siteName = 'Site'
}) => {
  const [isMobileView, setIsMobileView] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Check if mobile header is enabled
  const isMobileEnabled = mobileSettings?.enabled ?? true;
  const breakpoint = mobileSettings?.breakpoint ?? 768;

  // Handle window resize
  const handleResize = useCallback(() => {
    const shouldBeMobile = window.innerWidth <= breakpoint;
    setIsMobileView(shouldBeMobile);
    
    // Close mobile menu on resize to desktop
    if (!shouldBeMobile && isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  }, [breakpoint, isMobileMenuOpen]);

  // Set initial state and add resize listener
  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize]);

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Close mobile menu
  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // If mobile header is disabled or not in mobile view, show desktop header
  if (!isMobileEnabled || !isMobileView) {
    return <>{children}</>;
  }

  // Mobile header layout
  return (
    <>
      {/* Mobile Header */}
      <header className="mobile-header">
        <div className="mobile-header-container">
          {/* Logo/Site Name */}
          <div className="mobile-header-logo">
            {mobileSettings?.mobileLogoUrl ? (
              <img 
                src={mobileSettings.mobileLogoUrl} 
                alt={siteName}
                style={{ 
                  maxWidth: `${mobileSettings.mobileLogoWidth || 120}px`,
                  height: 'auto' 
                }}
              />
            ) : (
              <h1 className="mobile-site-title">{siteName}</h1>
            )}
          </div>

          {/* Right Side Icons */}
          <div className="mobile-header-actions">
            {/* Search Icon */}
            {mobileSettings?.showSearchIcon && (
              <button 
                className="mobile-action-btn"
                aria-label="Search"
                style={{ color: mobileSettings?.textColor }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                  <circle cx="8.5" cy="8.5" r="6.5" strokeWidth="2"/>
                  <path d="M13.5 13.5L17.5 17.5" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            )}

            {/* Account Icon */}
            {mobileSettings?.showAccountIcon && (
              <button 
                className="mobile-action-btn"
                aria-label="Account"
                style={{ color: mobileSettings?.textColor }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                  <circle cx="10" cy="6" r="3" strokeWidth="2"/>
                  <path d="M3 17C3 13.686 6.134 11 10 11C13.866 11 17 13.686 17 17" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            )}

            {/* Cart Icon */}
            {mobileSettings?.showCartIcon && (
              <button 
                className="mobile-action-btn"
                aria-label="Cart"
                style={{ color: mobileSettings?.textColor }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                  <path d="M5 6H16L15 13H6L5 6Z" strokeWidth="2" strokeLinejoin="round"/>
                  <path d="M5 6L4 3H2" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="8" cy="17" r="1" fill="currentColor"/>
                  <circle cx="13" cy="17" r="1" fill="currentColor"/>
                </svg>
              </button>
            )}

            {/* Hamburger Menu */}
            <HamburgerMenu
              isOpen={isMobileMenuOpen}
              onClick={toggleMobileMenu}
              style={mobileSettings?.hamburgerStyle || 'default'}
              color={mobileSettings?.textColor || '#000000'}
              size="medium"
            />
          </div>
        </div>
      </header>

      {/* Mobile Menu Panel */}
      <MobileMenuPanel
        isOpen={isMobileMenuOpen}
        onClose={closeMobileMenu}
        menuItems={menuItems}
        position={mobileSettings?.menuPosition || 'left'}
        animation={mobileSettings?.menuAnimation || 'slide'}
        overlayEnabled={mobileSettings?.overlayEnabled ?? true}
        overlayColor={mobileSettings?.overlayColor}
        overlayOpacity={mobileSettings?.overlayOpacity}
        backgroundColor={mobileSettings?.backgroundColor}
        textColor={mobileSettings?.textColor}
        showAccountIcon={mobileSettings?.showAccountIcon}
        showCartIcon={mobileSettings?.showCartIcon}
        showSearchIcon={mobileSettings?.showSearchIcon}
        submenuStyle={mobileSettings?.submenuStyle}
        closeOnItemClick={mobileSettings?.closeOnItemClick}
        swipeToClose={mobileSettings?.swipeToClose}
        logoUrl={mobileSettings?.mobileLogoUrl}
        siteName={siteName}
      />

      {/* Inline Styles */}
      <style>{`
        .mobile-header {
          position: relative;
          width: 100%;
          background: ${mobileSettings?.backgroundColor || '#ffffff'};
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
          z-index: 100;
        }

        .mobile-header-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 1rem;
          max-width: 100%;
        }

        .mobile-header-logo {
          flex: 1;
          display: flex;
          align-items: center;
        }

        .mobile-header-logo img {
          display: block;
        }

        .mobile-site-title {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0;
          color: ${mobileSettings?.textColor || '#000000'};
        }

        .mobile-header-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .mobile-action-btn {
          padding: 0.5rem;
          background: transparent;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 0.2s;
        }

        .mobile-action-btn:hover {
          opacity: 0.7;
        }

        @media (min-width: ${breakpoint + 1}px) {
          .mobile-header {
            display: none;
          }
        }
      `}</style>
    </>
  );
};

export default ResponsiveHeader;