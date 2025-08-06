import { FC } from 'react';

// Fallback footer component
const SiteFooter: FC = () => {
  return (
    <footer className="site-footer bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center text-sm">
          © {new Date().getFullYear()} O4O Platform. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;