import { Request, Response } from 'express';
import { MemberService } from '../services/MemberService.js';

/**
 * MemberController
 *
 * 회원 관리 API 컨트롤러
 */
export class MemberController {
  constructor(private memberService: MemberService) {}

  /**
   * GET /members
   */
  async list(req: Request, res: Response) {
    try {
      const filter = {
        organizationId: req.query.organizationId as string | undefined,
        categoryId: req.query.categoryId as string | undefined,
        isVerified: req.query.isVerified === 'true' ? true : req.query.isVerified === 'false' ? false : undefined,
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
      };

      const members = await this.memberService.list(filter);
      res.json(members);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /members/:id
   */
  async get(req: Request, res: Response) {
    try {
      const member = await this.memberService.findById(req.params.id);
      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }
      res.json(member);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /members
   */
  async create(req: Request, res: Response) {
    try {
      const member = await this.memberService.create(req.body);
      res.status(201).json(member);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * PUT /members/:id
   */
  async update(req: Request, res: Response) {
    try {
      const member = await this.memberService.update(req.params.id, req.body);
      res.json(member);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * DELETE /members/:id
   */
  async delete(req: Request, res: Response) {
    try {
      await this.memberService.delete(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * PATCH /members/:id/verify
   */
  async verify(req: Request, res: Response) {
    try {
      const member = await this.memberService.setVerified(req.params.id, true);
      res.json(member);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
