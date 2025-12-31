/**
 * Main Layout
 *
 * Phase G-2: B2C 핵심 기능 확장
 * Header + Footer를 포함한 공통 레이아웃
 */

import { Outlet } from 'react-router-dom';
import { Header, Footer } from '@/components';

export default function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
