import { FC } from 'react';
import { Link } from 'react-router-dom';
import HamburgerMenu from '../HamburgerMenu';

// Fallback header component
const SiteHeader: FC = () => {
  return (
    <header className="site-header bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="text-xl font-bold text-primary-600">
            O4O Platform
          </Link>
          
          <nav className="hidden md:flex space-x-8">
            <Link to="/" className="text-gray-700 hover:text-gray-900">홈</Link>
            <Link to="/about" className="text-gray-700 hover:text-gray-900">소개</Link>
            <Link to="/services" className="text-gray-700 hover:text-gray-900">서비스</Link>
            <Link to="/contact" className="text-gray-700 hover:text-gray-900">문의</Link>
          </nav>
          
          <HamburgerMenu />
        </div>
      </div>
    </header>
  );
};

export default SiteHeader;