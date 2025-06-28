import React, { useState } from 'react';
import { AdminBar } from './AdminBar';
import { AdminSidebar } from './AdminSidebar';
import { AdminMain } from './AdminMain';

interface AdminDashboardProps {
  children?: React.ReactNode;
  currentPage?: string;
  userRole?: 'admin' | 'editor' | 'author';
}

export function AdminDashboard({ 
  children, 
  currentPage = 'dashboard',
  userRole = 'admin' 
}: AdminDashboardProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* WordPress Admin Bar */}
      <AdminBar 
        onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        userRole={userRole}
      />

      {/* Main Admin Container */}
      <div className="flex">
        {/* Admin Sidebar */}
        <AdminSidebar
          collapsed={sidebarCollapsed}
          mobileOpen={mobileSidebarOpen}
          currentPage={currentPage}
          onCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          onMobileClose={() => setMobileSidebarOpen(false)}
          userRole={userRole}
        />

        {/* Main Content Area */}
        <AdminMain 
          sidebarCollapsed={sidebarCollapsed}
          currentPage={currentPage}
        >
          {children}
        </AdminMain>
      </div>
    </div>
  );
}