import { Router } from 'express';
import passport, { getActiveStrategies } from '../config/passportDynamic.js';
import { SocialAuthService } from '../services/socialAuthService.js';
import { authenticateCookie, AuthRequest } from '../middleware/auth.middleware.js';

const router: Router = Router();

// Success/Failure redirect URLs (with dynamic redirect_url support)
const getRedirectUrls = (redirectUrl?: string) => {
  const defaultUrl = process.env.FRONTEND_URL || 'https://neture.co.kr';

  // If specific redirect URL provided, use it directly
  if (redirectUrl) {
    const frontendUrl = defaultUrl;
    return {
      success: `${frontendUrl}${redirectUrl}`,
      failure: `${frontendUrl}${redirectUrl}?auth_error=social_login_failed`
    };
  }

  // Otherwise use home page with query params
  return {
    success: `${defaultUrl}?social_auth=success`,
    failure: `${defaultUrl}?social_auth=error`
  };
};

// OAuth status endpoint (for debugging)
router.get('/status', (req, res) => {
  const activeStrategies = getActiveStrategies();
  const hasOAuth = activeStrategies.length > 0;

  res.json({
    success: true,
    oauth: {
      enabled: hasOAuth,
      providers: {
        google: activeStrategies.includes('google'),
        kakao: activeStrategies.includes('kakao'),
        naver: activeStrategies.includes('naver')
      },
      activeStrategies,
      message: hasOAuth
        ? 'OAuth is configured and ready'
        : 'OAuth is not configured. Set environment variables or configure in Admin Dashboard.'
    }
  });
});

// Google OAuth routes
router.get('/google', (req, res, next) => {
  const redirectUrl = (req.query.redirect || req.query.redirect_url) as string;
  const state = redirectUrl ? Buffer.from(JSON.stringify({ redirect_url: redirectUrl })).toString('base64') : undefined;

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state
  })(req, res, next);
});

router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  async (req, res) => {
    try {
      const { user, isNewUser } = req.user as any;

      // Debug logging
      console.log('[GOOGLE OAUTH] User:', user?.id, 'Email:', user?.email, 'isNewUser:', isNewUser);

      // Extract redirect_url from state
      let redirectUrl: string | undefined;
      const state = req.query.state as string;
      if (state) {
        try {
          const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
          redirectUrl = decoded.redirect_url;
        } catch (error) {
          // Invalid state, ignore
        }
      }

      if (!user) {
        console.log('[GOOGLE OAUTH] No user in req.user, redirecting to failure');
        return res.redirect(getRedirectUrls(redirectUrl).failure);
      }

      await SocialAuthService.completeSocialLogin(user, res);

      // Redirect to signup-complete if new user, otherwise to intended destination
      const frontendUrl = process.env.FRONTEND_URL || 'https://neture.co.kr';
      if (isNewUser) {
        const signupCompleteUrl = `${frontendUrl}/auth/signup-complete`;
        console.log('[GOOGLE OAUTH] New user detected, redirecting to:', signupCompleteUrl);
        res.redirect(signupCompleteUrl);
      } else {
        const successUrl = getRedirectUrls(redirectUrl).success;
        console.log('[GOOGLE OAUTH] Existing user, redirecting to:', successUrl);
        res.redirect(successUrl);
      }
    } catch (error: any) {
      console.error('[GOOGLE OAUTH ERROR]', error);
      const state = req.query.state as string;
      let redirectUrl: string | undefined;
      if (state) {
        try {
          const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
          redirectUrl = decoded.redirect_url;
        } catch (error) {
          // Invalid state, ignore
        }
      }
      res.redirect(getRedirectUrls(redirectUrl).failure);
    }
  }
);

// Kakao OAuth routes
router.get('/kakao', (req, res, next) => {
  const redirectUrl = (req.query.redirect || req.query.redirect_url) as string;
  const state = redirectUrl ? Buffer.from(JSON.stringify({ redirect_url: redirectUrl })).toString('base64') : undefined;

  passport.authenticate('kakao', { state })(req, res, next);
});

router.get('/kakao/callback',
  passport.authenticate('kakao', { session: false }),
  async (req, res) => {
    try {
      const { user, isNewUser } = req.user as any;

      // Debug logging
      console.log('[KAKAO OAUTH] User:', user?.id, 'Email:', user?.email, 'isNewUser:', isNewUser);

      // Extract redirect_url from state
      let redirectUrl: string | undefined;
      const state = req.query.state as string;
      if (state) {
        try {
          const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
          redirectUrl = decoded.redirect_url;
        } catch (error) {
          // Invalid state, ignore
        }
      }

      if (!user) {
        console.log('[KAKAO OAUTH] No user in req.user, redirecting to failure');
        return res.redirect(getRedirectUrls(redirectUrl).failure);
      }

      await SocialAuthService.completeSocialLogin(user, res);

      // Redirect to signup-complete if new user, otherwise to intended destination
      const frontendUrl = process.env.FRONTEND_URL || 'https://neture.co.kr';
      if (isNewUser) {
        const signupCompleteUrl = `${frontendUrl}/auth/signup-complete`;
        console.log('[KAKAO OAUTH] New user detected, redirecting to:', signupCompleteUrl);
        res.redirect(signupCompleteUrl);
      } else {
        const successUrl = getRedirectUrls(redirectUrl).success;
        console.log('[KAKAO OAUTH] Existing user, redirecting to:', successUrl);
        res.redirect(successUrl);
      }
    } catch (error: any) {
      console.error('[KAKAO OAUTH ERROR]', error);
      const state = req.query.state as string;
      let redirectUrl: string | undefined;
      if (state) {
        try {
          const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
          redirectUrl = decoded.redirect_url;
        } catch (error) {
          // Invalid state, ignore
        }
      }
      res.redirect(getRedirectUrls(redirectUrl).failure);
    }
  }
);

// Naver OAuth routes
router.get('/naver', (req, res, next) => {
  const redirectUrl = (req.query.redirect || req.query.redirect_url) as string;
  const state = redirectUrl ? Buffer.from(JSON.stringify({ redirect_url: redirectUrl })).toString('base64') : undefined;

  passport.authenticate('naver', { state })(req, res, next);
});

router.get('/naver/callback',
  passport.authenticate('naver', { session: false }),
  async (req, res) => {
    try {
      const { user, isNewUser } = req.user as any;

      // Debug logging
      console.log('[NAVER OAUTH] User:', user?.id, 'Email:', user?.email, 'isNewUser:', isNewUser);

      // Extract redirect_url from state
      let redirectUrl: string | undefined;
      const state = req.query.state as string;
      if (state) {
        try {
          const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
          redirectUrl = decoded.redirect_url;
        } catch (error) {
          // Invalid state, ignore
        }
      }

      if (!user) {
        console.log('[NAVER OAUTH] No user in req.user, redirecting to failure');
        return res.redirect(getRedirectUrls(redirectUrl).failure);
      }

      await SocialAuthService.completeSocialLogin(user, res);

      // Redirect to signup-complete if new user, otherwise to intended destination
      const frontendUrl = process.env.FRONTEND_URL || 'https://neture.co.kr';
      if (isNewUser) {
        const signupCompleteUrl = `${frontendUrl}/auth/signup-complete`;
        console.log('[NAVER OAUTH] New user detected, redirecting to:', signupCompleteUrl);
        res.redirect(signupCompleteUrl);
      } else {
        const successUrl = getRedirectUrls(redirectUrl).success;
        console.log('[NAVER OAUTH] Existing user, redirecting to:', successUrl);
        res.redirect(successUrl);
      }
    } catch (error: any) {
      console.error('[NAVER OAUTH ERROR]', error);
      const state = req.query.state as string;
      let redirectUrl: string | undefined;
      if (state) {
        try {
          const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
          redirectUrl = decoded.redirect_url;
        } catch (error) {
          // Invalid state, ignore
        }
      }
      res.redirect(getRedirectUrls(redirectUrl).failure);
    }
  }
);

// Link social account (authenticated users only)
router.post('/link/:provider', authenticateCookie, async (req: AuthRequest, res) => {
  try {
    const { provider } = req.params;
    const { providerId } = req.body;

    if (!['google', 'kakao', 'naver'].includes(provider)) {
      return res.status(400).json({
        error: 'Invalid provider',
        code: 'INVALID_PROVIDER'
      });
    }

    if (!providerId) {
      return res.status(400).json({
        error: 'Provider ID is required',
        code: 'PROVIDER_ID_REQUIRED'
      });
    }

    const user = await SocialAuthService.linkSocialAccount(
      (req.user as any).userId || (req.user as any).id || '',
      provider,
      providerId
    );

    res.json({
      success: true,
      message: `${provider} account linked successfully`,
      user: {
        id: user.id,
        email: user.email,
        provider: user.provider,
        hasPassword: !!user.password
      }
    });
  } catch (error: any) {
    // Error log removed
    res.status(400).json({
      error: error.message || 'Failed to link social account',
      code: 'LINK_FAILED'
    });
  }
});

// Unlink social account
router.delete('/unlink', authenticateCookie, async (req: AuthRequest, res) => {
  try {
    const user = await SocialAuthService.unlinkSocialAccount((req.user as any).userId || (req.user as any).id || '');

    res.json({
      success: true,
      message: 'Social account unlinked successfully',
      user: {
        id: user.id,
        email: user.email,
        provider: user.provider,
        hasPassword: !!user.password
      }
    });
  } catch (error: any) {
    // Error log removed
    res.status(400).json({
      error: error.message || 'Failed to unlink social account',
      code: 'UNLINK_FAILED'
    });
  }
});

// Get linked accounts
router.get('/linked-accounts', authenticateCookie, async (req: AuthRequest, res) => {
  try {
    const accounts = await SocialAuthService.getLinkedAccounts((req.user as any).userId || (req.user as any).id || '');

    res.json({
      success: true,
      accounts
    });
  } catch (error: any) {
    // Error log removed
    res.status(400).json({
      error: error.message || 'Failed to get linked accounts',
      code: 'GET_LINKED_FAILED'
    });
  }
});

export default router;