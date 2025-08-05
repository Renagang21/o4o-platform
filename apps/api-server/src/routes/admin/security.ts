import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin } from '../../middleware/auth';
import { LoginSecurityService } from '../../services/LoginSecurityService';
import { UserService } from '../../services/UserService';

const router: Router = Router();

// Apply admin authentication to all routes
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * Get security metrics
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const metrics = await LoginSecurityService.getSecurityMetrics(hours);
    
    res.json({
      success: true,
      data: metrics,
      timeframe: `${hours} hours`
    });
  } catch (error: any) {
    console.error('Error fetching security metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch security metrics'
    });
  }
});

/**
 * Get login attempts for a specific user
 */
router.get('/login-attempts/:email', async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    
    const attempts = await LoginSecurityService.getRecentLoginAttempts(email, limit);
    
    res.json({
      success: true,
      data: attempts,
      count: attempts.length
    });
  } catch (error: any) {
    console.error('Error fetching login attempts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch login attempts'
    });
  }
});

/**
 * Get login attempts by IP address
 */
router.get('/login-attempts-by-ip/:ip', async (req: Request, res: Response) => {
  try {
    const { ip } = req.params;
    const hours = parseInt(req.query.hours as string) || 24;
    
    const attempts = await LoginSecurityService.getLoginAttemptsByIp(ip, hours);
    
    res.json({
      success: true,
      data: attempts,
      count: attempts.length,
      timeframe: `${hours} hours`
    });
  } catch (error: any) {
    console.error('Error fetching login attempts by IP:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch login attempts'
    });
  }
});

/**
 * Unlock user account
 */
router.post('/unlock-account', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }
    
    await LoginSecurityService.unlockAccount(email);
    
    res.json({
      success: true,
      message: 'Account unlocked successfully'
    });
  } catch (error: any) {
    console.error('Error unlocking account:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unlock account'
    });
  }
});

/**
 * Lock user account
 */
router.post('/lock-account', async (req: Request, res: Response) => {
  try {
    const { email, minutes } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }
    
    await LoginSecurityService.lockAccount(email, minutes);
    
    res.json({
      success: true,
      message: `Account locked for ${minutes || 30} minutes`
    });
  } catch (error: any) {
    console.error('Error locking account:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to lock account'
    });
  }
});

/**
 * Reset login attempts for a user
 */
router.post('/reset-login-attempts', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }
    
    await LoginSecurityService.resetLoginAttempts(email);
    
    res.json({
      success: true,
      message: 'Login attempts reset successfully'
    });
  } catch (error: any) {
    console.error('Error resetting login attempts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset login attempts'
    });
  }
});

/**
 * Get locked accounts
 */
router.get('/locked-accounts', async (req: Request, res: Response) => {
  try {
    const users = await UserService.getLockedAccounts();
    
    res.json({
      success: true,
      data: users.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        lockedUntil: user.lockedUntil,
        loginAttempts: user.loginAttempts,
        lastLoginAt: user.lastLoginAt
      })),
      count: users.length
    });
  } catch (error: any) {
    console.error('Error fetching locked accounts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch locked accounts'
    });
  }
});

/**
 * Clean old login attempts
 */
router.post('/clean-login-attempts', async (req: Request, res: Response) => {
  try {
    const { daysToKeep } = req.body;
    const days = daysToKeep || 30;
    
    const deleted = await LoginSecurityService.clearOldLoginAttempts(days);
    
    res.json({
      success: true,
      message: `Deleted ${deleted} old login attempts`,
      daysKept: days
    });
  } catch (error: any) {
    console.error('Error cleaning login attempts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clean login attempts'
    });
  }
});

export default router;