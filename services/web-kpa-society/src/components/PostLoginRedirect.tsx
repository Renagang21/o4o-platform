import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAuthModal } from '../contexts/AuthModalContext';
import { getKpaPostLoginRoute } from '../config/dashboard';

/** Operator fallback only. LoginModal owns member defaults and explicit destinations. */
export default function PostLoginRedirect() {
  const { user, isAuthenticated, isKpaContextLoaded } = useAuth();
  const { onLoginSuccess, loginNavigationHandled } = useAuthModal();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const wasAuthenticated = useRef(isAuthenticated);
  const pendingLogin = useRef(false);
  useEffect(() => {
    if (!isAuthenticated) {
      wasAuthenticated.current = false; pendingLogin.current = false;
      return;
    }
    if (!wasAuthenticated.current) pendingLogin.current = true;
    wasAuthenticated.current = true;
    if (loginNavigationHandled || onLoginSuccess) {
      pendingLogin.current = false;
      return;
    }
    if (!pendingLogin.current || !isKpaContextLoaded || !user) return;
    pendingLogin.current = false;
    if (['/businesses', '/store', '/operator', '/admin'].some(prefix => pathname.startsWith(prefix))) return;
    const target = getKpaPostLoginRoute(user);
    // Restoring an ordinary member session must preserve any current detail URL.
    if (target && target !== '/') navigate(target, { replace: true });
  }, [isAuthenticated, isKpaContextLoaded, user, loginNavigationHandled, onLoginSuccess, pathname, navigate]);
  return null;
}
