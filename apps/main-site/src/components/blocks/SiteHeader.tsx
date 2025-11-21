import { FC, useState } from 'react';
import { Link } from 'react-router-dom';
import Navigation from './Navigation';
import { CartModule } from './CartModule';
import { AccountModule } from './AccountModule';
import RoleSwitcher from './RoleSwitcher';
import { NotificationIcon, NotificationCenter } from '@/components/notifications';

// Fallback header component - only shown when explicitly needed
const SiteHeader: FC = () => {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  return (
    <header className="site-header bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="text-xl font-bold text-primary-600">
            O4O Platform
          </Link>

          {/* Navigation Menu */}
          <Navigation menuRef="primary" />

          {/* Right Side Actions */}
          <div className="flex items-center gap-2 relative">
            <CartModule />

            {/* HP-5: Notification Center */}
            <div className="relative">
              <NotificationIcon
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                isActive={isNotificationOpen}
              />
              <NotificationCenter
                isOpen={isNotificationOpen}
                onClose={() => setIsNotificationOpen(false)}
              />
            </div>

            <AccountModule />
            <RoleSwitcher />
          </div>
        </div>
      </div>
    </header>
  );
};

export default SiteHeader;