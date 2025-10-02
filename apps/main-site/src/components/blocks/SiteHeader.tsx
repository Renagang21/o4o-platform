import { FC } from 'react';
import { Link } from 'react-router-dom';
import Navigation from './Navigation';

// Fallback header component - only shown when explicitly needed
const SiteHeader: FC = () => {
  return (
    <header className="site-header bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="text-xl font-bold text-primary-600">
            O4O Platform
          </Link>
          
          {/* Use dynamic Navigation component instead of hardcoded menu */}
          <Navigation menuRef="primary-menu" />
        </div>
      </div>
    </header>
  );
};

export default SiteHeader;