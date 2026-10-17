/** Every service forum request resolves live community service membership.
 * Retired aliases fail closed; business spaces retain their own resolver.
 */
import type { RequestHandler } from 'express';
import { AppDataSource } from '../database/connection.js';
import { resolveCommunityWorkspace } from '../services/community/community-workspace.service.js';

export function requireCommunityAccess(communityKey: string): RequestHandler {
  return async (req, res, next) => {
    const user = (req as any).user;
    if (!user?.id) {
      res.status(401).json({ success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' });
      return;
    }

    try {
      const workspace = await resolveCommunityWorkspace(AppDataSource, user, communityKey);
      if (!workspace?.allowed) {
        res.status(workspace ? 403 : 404).json({
          success: false,
          error: '이 커뮤니티의 가입 상태를 확인해 주세요.',
          code: workspace?.reason ?? 'COMMUNITY_NOT_FOUND',
        });
        return;
      }
    } catch (error) {
      next(error);
      return;
    }

    next();
  };
}
