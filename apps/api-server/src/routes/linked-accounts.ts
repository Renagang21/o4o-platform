import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { SessionSyncService } from '../services/sessionSyncService';

const router = Router();

/**
 * Get user's linked accounts
 */
router.get('/linked-accounts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const user = await req.app.locals.AppDataSource
      .getRepository('User')
      .findOne({
        where: { id: userId },
        select: ['id', 'email', 'authProvider', 'googleId', 'kakaoId', 'naverId']
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const accounts = {
      local: !!user.email && user.authProvider === 'local',
      google: !!user.googleId,
      kakao: !!user.kakaoId,
      naver: !!user.naverId
    };

    res.json({
      success: true,
      accounts
    });
  } catch (error) {
    console.error('Failed to get linked accounts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve linked accounts'
    });
  }
});

/**
 * Get user's active sessions
 */
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const sessions = await SessionSyncService.getUserSessions(userId);

    res.json({
      success: true,
      sessions,
      activeSessions: sessions.length
    });
  } catch (error) {
    console.error('Failed to get sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve sessions'
    });
  }
});

/**
 * Logout from specific session
 */
router.delete('/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { sessionId } = req.params;

    await SessionSyncService.removeSession(sessionId, userId);

    res.json({
      success: true,
      message: 'Session removed successfully'
    });
  } catch (error) {
    console.error('Failed to remove session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove session'
    });
  }
});

/**
 * Logout from all devices
 */
router.post('/logout-all-devices', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    
    await SessionSyncService.logoutAllDevices(userId);

    res.json({
      success: true,
      message: 'Logged out from all devices'
    });
  } catch (error) {
    console.error('Failed to logout all devices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to logout from all devices'
    });
  }
});

export default router;