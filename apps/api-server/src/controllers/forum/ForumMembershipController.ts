/**
 * ForumMembershipController
 *
 * WO-O4O-FORUM-MEMBER-MANAGEMENT-BACKEND-CANONICALIZATION-V1
 *
 * Canonical membership endpoints mounted on /api/v1/forum/categories/:id/...
 * Uses AppDataSource directly (matches existing forum controller pattern).
 * Logic delegated to ForumMembershipService (forum_join_requests table).
 */

import { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import { ForumMembershipService } from '../../routes/kpa/services/forum-membership.service.js';

function getService(): ForumMembershipService {
  return new ForumMembershipService(AppDataSource);
}

function sendResult(res: Response, result: { data?: any; error?: { status: number; code: string; message: string } }): void {
  if (result.error) {
    res.status(result.error.status).json({ success: false, error: result.error.message, code: result.error.code });
    return;
  }
  res.json({ success: true, data: result.data });
}

export class ForumMembershipController {
  /** POST /categories/:id/join-requests — 가입 신청 */
  async requestJoin(req: Request, res: Response): Promise<void> {
    const user = (req as any).user;
    if (!user) { res.status(401).json({ success: false, error: 'Unauthorized' }); return; }
    const result = await getService().requestJoin(req.params.id, user);
    sendResult(res, result);
  }

  /** GET /categories/:id/join-requests — 대기 중 신청 목록 (owner only) */
  async listJoinRequests(req: Request, res: Response): Promise<void> {
    const user = (req as any).user;
    if (!user) { res.status(401).json({ success: false, error: 'Unauthorized' }); return; }
    const result = await getService().listPendingJoinRequests(req.params.id, user);
    sendResult(res, result);
  }

  /** POST /categories/:id/join-requests/:requestId/approve — 승인 (owner only) */
  async approveJoin(req: Request, res: Response): Promise<void> {
    const user = (req as any).user;
    if (!user) { res.status(401).json({ success: false, error: 'Unauthorized' }); return; }
    const result = await getService().approveJoin(req.params.id, req.params.requestId, user);
    sendResult(res, result);
  }

  /** POST /categories/:id/join-requests/:requestId/reject — 거절 (owner only) */
  async rejectJoin(req: Request, res: Response): Promise<void> {
    const user = (req as any).user;
    if (!user) { res.status(401).json({ success: false, error: 'Unauthorized' }); return; }
    const result = await getService().rejectJoin(
      req.params.id,
      req.params.requestId,
      user,
      req.body?.reviewComment,
    );
    sendResult(res, result);
  }

  /** GET /categories/:id/members — 회원 목록 (owner only) */
  async listMembers(req: Request, res: Response): Promise<void> {
    const user = (req as any).user;
    if (!user) { res.status(401).json({ success: false, error: 'Unauthorized' }); return; }
    const result = await getService().listMembers(req.params.id, user);
    sendResult(res, result);
  }

  /** DELETE /categories/:id/members/:userId — 회원 제거 (owner only) */
  async removeMember(req: Request, res: Response): Promise<void> {
    const user = (req as any).user;
    if (!user) { res.status(401).json({ success: false, error: 'Unauthorized' }); return; }
    const result = await getService().removeMember(req.params.id, req.params.userId, user);
    sendResult(res, result);
  }

  /** GET /categories/:id/membership-status — 내 멤버십 상태 */
  async getMembershipStatus(req: Request, res: Response): Promise<void> {
    const user = (req as any).user;
    if (!user) {
      res.json({ success: true, data: { isMember: false, role: null, pendingRequest: false } });
      return;
    }
    const result = await getService().getMembershipStatus(req.params.id, user.id);
    sendResult(res, result);
  }
}
