import React from 'react';
import { Outlet } from 'react-router-dom';
import AppHeader from './AppHeader';
import Footer from './Footer';

const Layout: FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <AppHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default Layout; 