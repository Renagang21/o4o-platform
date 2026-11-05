import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { authClient } from '../../lib/apiClient';
/** Only accounts explicitly marked by the new signup path require this step. Old accounts are not redirected. */
export default function MemberRegistrationCompletion() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation(),
    navigate = useNavigate();
  useEffect(() => {
    if (
      !isAuthenticated ||
      isLoading ||
      !user?.id ||
      /^\/(signup|verify-email|operator-invite|handoff|terms|privacy|legal|policy)(\/|$)/.test(
        location.pathname,
      )
    )
      return;
    let current = true;
    void authClient.api
      .get('/member-registration/completion')
      .then((response) => {
        if (current && response.data?.data?.requiresRegistration === true)
          navigate('/signup', { replace: true });
      })
      .catch(() => undefined); // Business API authorization still enforces the pending membership.
    return () => {
      current = false;
    };
  }, [user?.id, isAuthenticated, isLoading, location.pathname, navigate]);
  return null;
}
