import React from 'react';
import { Menu, Bell, Search, User } from 'lucide-react';

interface HeaderProps {
  title: string;
  breadcrumb?: Array<{ label: string; href?: string }>;
  onMenuToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, breadcrumb, onMenuToggle }) => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
        {/* Left Side */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
          {/* Mobile menu button */}
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 flex-shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          {/* Breadcrumb and Title */}
          <div className="min-w-0 flex-1">
            {breadcrumb && breadcrumb.length > 0 && (
              <nav className="hidden sm:flex text-sm text-gray-500 mb-1">
                {breadcrumb.map((item, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && <span className="mx-2">/</span>}
                    {item.href ? (
                      <button className="hover:text-gray-700 transition-colors truncate">
                        {item.label}
                      </button>
                    ) : (
                      <span className="truncate">{item.label}</span>
                    )}
                  </React.Fragment>
                ))}
              </nav>
            )}
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">{title}</h1>
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          {/* Search - Only show on desktop */}
          <div className="hidden xl:block relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="검색..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
            />
          </div>

          {/* Mobile Search Button */}
          <button className="xl:hidden p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-md">
            <Search className="w-5 h-5" />
          </button>

          {/* Notifications */}
          <button className="relative p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-md">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
          </button>

          {/* User Menu */}
          <div className="relative">
            <button className="flex items-center gap-2 p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-md">
              <User className="w-5 h-5" />
              <span className="hidden md:inline text-sm font-medium text-gray-700">관리자</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};