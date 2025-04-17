import React from 'react';
import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <header className="bg-white shadow">
      <nav className="container mx-auto px-6 py-3">
        <div className="flex justify-between items-center">
          <Link to="/" className="text-xl font-bold">
            O4O Platform
          </Link>
          <div className="flex items-center space-x-4">
            <Link to="/marketplace" className="hover:text-gray-600">마켓플레이스</Link>
            <Link to="/marketplace/admin" className="hover:text-gray-600">관리자</Link>
            <Link to="/marketplace/seller" className="hover:text-gray-600">판매자</Link>
            <Link to="/marketplace/vendor" className="hover:text-gray-600">벤더</Link>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header; 