/**
 * Hamburger Menu Button Component
 * Animated hamburger menu icon with different styles
 */

import React from 'react';

interface HamburgerMenuProps {
  isOpen: boolean;
  onClick: () => void;
  style?: 'default' | 'animated' | 'minimal';
  color?: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const HamburgerMenu: React.FC<HamburgerMenuProps> = ({
  isOpen,
  onClick,
  style = 'default',
  color = '#000000',
  size = 'medium',
  className = ''
}) => {
  const sizeClasses = {
    small: 'w-5 h-5',
    medium: 'w-6 h-6',
    large: 'w-8 h-8'
  };

  const barHeight = size === 'small' ? '2px' : size === 'large' ? '3px' : '2.5px';

  const renderDefault = () => (
    <div className={`hamburger-default ${sizeClasses[size]} ${className}`}>
      <span className="hamburger-bar" />
      <span className="hamburger-bar" />
      <span className="hamburger-bar" />
    </div>
  );

  const renderAnimated = () => (
    <div className={`hamburger-animated ${sizeClasses[size]} ${className}`}>
      <span className="hamburger-bar hamburger-bar-1" />
      <span className="hamburger-bar hamburger-bar-2" />
      <span className="hamburger-bar hamburger-bar-3" />
    </div>
  );

  const renderMinimal = () => (
    <div className={`hamburger-minimal ${sizeClasses[size]} ${className}`}>
      <span className="hamburger-bar" />
      <span className="hamburger-bar" />
    </div>
  );

  return (
    <>
      <button
        className={`hamburger-menu ${style} ${isOpen ? 'is-open' : ''} ${className}`}
        onClick={onClick}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isOpen}
        type="button"
      >
        {style === 'animated' && renderAnimated()}
        {style === 'minimal' && renderMinimal()}
        {style === 'default' && renderDefault()}
      </button>

      <style>{`
        .hamburger-menu {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.5rem;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: opacity 0.2s ease;
          z-index: 1001;
        }

        .hamburger-menu:hover {
          opacity: 0.7;
        }

        .hamburger-menu:focus {
          outline: 2px solid currentColor;
          outline-offset: 2px;
          border-radius: 4px;
        }

        /* Default Style */
        .hamburger-default {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
        }

        .hamburger-default .hamburger-bar {
          display: block;
          width: 100%;
          height: ${barHeight};
          background-color: ${color};
          border-radius: 2px;
          transition: all 0.3s ease;
        }

        .hamburger-menu.default.is-open .hamburger-bar:nth-child(1) {
          transform: translateY(${size === 'small' ? '7px' : size === 'large' ? '11px' : '9px'}) rotate(45deg);
        }

        .hamburger-menu.default.is-open .hamburger-bar:nth-child(2) {
          opacity: 0;
        }

        .hamburger-menu.default.is-open .hamburger-bar:nth-child(3) {
          transform: translateY(-${size === 'small' ? '7px' : size === 'large' ? '11px' : '9px'}) rotate(-45deg);
        }

        /* Animated Style */
        .hamburger-animated {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
        }

        .hamburger-animated .hamburger-bar {
          display: block;
          width: 100%;
          height: ${barHeight};
          background-color: ${color};
          border-radius: 2px;
          transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
          transform-origin: center;
        }

        .hamburger-menu.animated.is-open .hamburger-bar-1 {
          transform: translateY(${size === 'small' ? '7px' : size === 'large' ? '11px' : '9px'}) rotate(135deg);
        }

        .hamburger-menu.animated.is-open .hamburger-bar-2 {
          transform: scale(0);
          opacity: 0;
        }

        .hamburger-menu.animated.is-open .hamburger-bar-3 {
          transform: translateY(-${size === 'small' ? '7px' : size === 'large' ? '11px' : '9px'}) rotate(-135deg);
        }

        /* Minimal Style */
        .hamburger-minimal {
          display: flex;
          flex-direction: column;
          justify-content: space-around;
          position: relative;
        }

        .hamburger-minimal .hamburger-bar {
          display: block;
          width: 100%;
          height: ${barHeight};
          background-color: ${color};
          border-radius: 2px;
          transition: transform 0.3s ease;
        }

        .hamburger-menu.minimal.is-open .hamburger-bar:nth-child(1) {
          transform: rotate(45deg) translateY(${size === 'small' ? '3px' : size === 'large' ? '5px' : '4px'});
        }

        .hamburger-menu.minimal.is-open .hamburger-bar:nth-child(2) {
          transform: rotate(-45deg) translateY(-${size === 'small' ? '3px' : size === 'large' ? '5px' : '4px'});
        }

        /* Accessibility - Reduced Motion */
        @media (prefers-reduced-motion: reduce) {
          .hamburger-bar {
            transition: none !important;
          }
        }
      `}</style>
    </>
  );
};

export default HamburgerMenu;