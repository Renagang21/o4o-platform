import { Router } from 'express';
import passport from '../config/passport';
import { SocialAuthService } from '../services/socialAuthService';
import { authenticateCookie, AuthRequest } from '../middleware/auth-v2';

const router: Router = Router();

// Success/Failure redirect URLs
const getRedirectUrls = () => ({
  success: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?success=true`,
  failure: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?error=social_auth_failed`
});

// Google OAuth routes
router.get('/google', passport.authenticate('google', { 
  scope: ['profile', 'email'] 
}));

router.get('/google/callback', 
  passport.authenticate('google', { session: false }),
  async (req, res) => {
    try {
      const user = req.user as any;
      if (!user) {
        return res.redirect(getRedirectUrls().failure);
      }

      await SocialAuthService.completeSocialLogin(user, res);
      res.redirect(getRedirectUrls().success);
    } catch (error: any) {
      // Error log removed
      res.redirect(getRedirectUrls().failure);
    }
  }
);

// Kakao OAuth routes
router.get('/kakao', passport.authenticate('kakao'));

router.get('/kakao/callback',
  passport.authenticate('kakao', { session: false }),
  async (req, res) => {
    try {
      const user = req.user as any;
      if (!user) {
        return res.redirect(getRedirectUrls().failure);
      }

      await SocialAuthService.completeSocialLogin(user, res);
      res.redirect(getRedirectUrls().success);
    } catch (error: any) {
      // Error log removed
      res.redirect(getRedirectUrls().failure);
    }
  }
);

// Naver OAuth routes
router.get('/naver', passport.authenticate('naver'));

router.get('/naver/callback',
  passport.authenticate('naver', { session: false }),
  async (req, res) => {
    try {
      const user = req.user as any;
      if (!user) {
        return res.redirect(getRedirectUrls().failure);
      }

      await SocialAuthService.completeSocialLogin(user, res);
      res.redirect(getRedirectUrls().success);
    } catch (error: any) {
      // Error log removed
      res.redirect(getRedirectUrls().failure);
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