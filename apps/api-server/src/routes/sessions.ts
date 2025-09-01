import { Router, Request, Response } from 'express';
import type { Router as ExpressRouter } from 'express';
import { authenticateToken } from '../middleware/auth';
import { SessionSyncService } from '../services/sessionSyncService';

const router: ExpressRouter = Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * Get all active sessions for current user
 */
router.get('/my-sessions', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const sessions = await SessionSyncService.getUserSessions(userId);
    const currentSessionId = req.cookies?.sessionId;

    // Enrich session data with current session indicator
    const enrichedSessions = sessions.map(session => ({
      ...session,
      isCurrent: currentSessionId === (session as any).sessionId,
      loginAt: session.loginAt,
      lastActivity: session.lastActivity,
      device: session.deviceInfo,
      ipAddress: session.ipAddress
    }));

    res.json({
      success: true,
      data: {
        sessions: enrichedSessions,
        count: enrichedSessions.length
      }
    });
  } catch (error) {
    // Error log removed
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sessions'
    });
  }
});

/**
 * Logout from specific session
 */
router.post('/logout/:sessionId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { sessionId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Verify session belongs to user
    const sessions = await SessionSyncService.getUserSessions(userId);
    const sessionExists = sessions.some((s: any) => s.sessionId === sessionId);

    if (!sessionExists) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    await SessionSyncService.removeSession(sessionId, userId);

    res.json({
      success: true,
      message: 'Session terminated successfully'
    });
  } catch (error) {
    // Error log removed
    res.status(500).json({
      success: false,
      error: 'Failed to terminate session'
    });
  }
});

/**
 * Logout from all devices
 */
router.post('/logout-all', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    await SessionSyncService.logoutAllDevices(userId);

    res.json({
      success: true,
      message: 'Logged out from all devices successfully'
    });
  } catch (error) {
    // Error log removed
    res.status(500).json({
      success: false,
      error: 'Failed to logout from all devices'
    });
  }
});

/**
 * Get session statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const sessions = await SessionSyncService.getUserSessions(userId);
    
    // Calculate statistics
    const deviceTypes = sessions.reduce((acc, session) => {
      const type = session.deviceInfo?.deviceType || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const browsers = sessions.reduce((acc, session) => {
      const browser = session.deviceInfo?.browser || 'unknown';
      acc[browser] = (acc[browser] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      success: true,
      data: {
        totalSessions: sessions.length,
        deviceTypes,
        browsers,
        lastActivity: sessions.reduce((latest, session) => {
          const activity = new Date(session.lastActivity || session.loginAt);
          return activity > latest ? activity : latest;
        }, new Date(0))
      }
    });
  } catch (error) {
    // Error log removed
    res.status(500).json({
      success: false,
      error: 'Failed to fetch session statistics'
    });
  }
});

export default router;