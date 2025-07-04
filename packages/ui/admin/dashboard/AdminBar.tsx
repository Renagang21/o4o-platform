import React, { useState } from 'react';
import { 
  Plus, 
  Bell, 
  MessageCircle, 
  Mail,
  ChevronDown,
  Menu,
  User,
  Settings,
  LogOut
} from 'lucide-react';

interface AdminBarProps {
  onToggleSidebar: () => void;
  userRole: 'admin' | 'editor' | 'author';
}

export function AdminBar({ onToggleSidebar, userRole }: AdminBarProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [newMenuOpen, setNewMenuOpen] = useState(false);

  return (
    <div className="h-8 bg-gray-800 text-white flex items-center px-2 text-sm fixed top-0 left-0 right-0 z-50">
      {/* Left Section */}
      <div className="flex items-center space-x-4">
        {/* Mobile Menu Toggle */}
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-1 hover:bg-gray-700 rounded"
        >
          <Menu className="h-4 w-4" />
        </button>

        {/* WordPress Logo + Site Name */}
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
            <span className="text-white font-bold text-xs">WP</span>
          </div>
          <span className="font-medium hidden sm:inline">O4O Platform</span>
          <ChevronDown className="h-3 w-3 text-gray-400" />
        </div>

        {/* Notifications */}
        <div className="hidden md:flex items-center space-x-3">
          <div className="flex items-center space-x-1 text-gray-300">
            <Mail className="h-4 w-4" />
            <span>18</span>
          </div>
          <div className="flex items-center space-x-1 text-gray-300">
            <MessageCircle className="h-4 w-4" />
            <span>0</span>
          </div>
        </div>

        {/* New Content Dropdown */}
        <div className="relative">
          <button
            onClick={() => setNewMenuOpen(!newMenuOpen)}
            className="flex items-center space-x-1 px-2 py-1 hover:bg-gray-700 rounded"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">새로 추가</span>
          </button>

          {newMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-10"
                onClick={() => setNewMenuOpen(false)}
              />
              <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded shadow-lg z-20">
                <div className="py-1">
                  <a href="/admin/posts/new" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">글</a>
                  <a href="/admin/pages/new" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">페이지</a>
                  <a href="/admin/media" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">미디어</a>
                  {userRole === 'admin' && (
                    <a href="/admin/users/new" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">사용자</a>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right Section */}
      <div className="ml-auto flex items-center space-x-4">
        {/* Notifications Bell */}
        <button className="p-1 hover:bg-gray-700 rounded relative">
          <Bell className="h-4 w-4" />
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            3
          </span>
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center space-x-1 px-2 py-1 hover:bg-gray-700 rounded"
          >
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">관리자</span>
            <ChevronDown className="h-3 w-3" />
          </button>

          {userMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-10"
                onClick={() => setUserMenuOpen(false)}
              />
              <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-200 rounded shadow-lg z-20">
                <div className="py-1">
                  <a href="/admin/profile" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <User className="h-4 w-4 mr-2" />
                    프로필 편집
                  </a>
                  <a href="/admin/settings" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <Settings className="h-4 w-4 mr-2" />
                    설정
                  </a>
                  <hr className="my-1" />
                  <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <LogOut className="h-4 w-4 mr-2" />
                    로그아웃
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}