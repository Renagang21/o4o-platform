import { useCookieAuth } from '@o4o/auth-context';

// Re-export the auth hook for consistency
export const useAuth = () => {
  const auth = useCookieAuth();
  
  // Add any e-commerce specific auth logic here if needed
  const isVendor = auth.user?.role === 'supplier' || auth.user?.role === 'business';
  const isCustomer = auth.user?.role === 'customer';
  const isAdmin = auth.user?.role === 'admin';
  
  return {
    ...auth,
    isVendor,
    isCustomer,
    isAdmin
  };
};