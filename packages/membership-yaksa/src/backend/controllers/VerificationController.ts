import { Request, Response } from 'express';
import { VerificationService } from '../services/VerificationService.js';

/**
 * VerificationController
 *
 * 자격 검증 API 컨트롤러
 */
export class VerificationController {
  constructor(private verificationService: VerificationService) {}

  /**
   * GET /verifications
   */
  async list(req: Request, res: Response) {
    try {
      const memberId = req.query.memberId as string | undefined;
      const status = req.query.status as 'pending' | 'approved' | 'rejected' | 'expired' | undefined;

      let verifications;
      if (memberId) {
        verifications = await this.verificationService.listByMember(memberId);
      } else if (status) {
        verifications = await this.verificationService.listByStatus(status);
      } else {
        verifications = [];
      }

      res.json(verifications);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /verifications/:id
   */
  async get(req: Request, res: Response) {
    try {
      const verification = await this.verificationService.findById(req.params.id);
      if (!verification) {
        return res.status(404).json({ error: 'Verification not found' });
      }
      res.json(verification);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /verifications
   */
  async create(req: Request, res: Response) {
    try {
      const verification = await this.verificationService.create(req.body);
      res.status(201).json(verification);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * PATCH /verifications/:id/approve
   */
  async approve(req: Request, res: Response) {
    try {
      const { verifierId, notes } = req.body;
      const verification = await this.verificationService.approve(
        req.params.id,
        verifierId,
        notes
      );
      res.json(verification);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * PATCH /verifications/:id/reject
   */
  async reject(req: Request, res: Response) {
    try {
      const { verifierId, reason } = req.body;
      const verification = await this.verificationService.reject(
        req.params.id,
        verifierId,
        reason
      );
      res.json(verification);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
