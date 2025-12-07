import { Router } from 'express';
import { MemberController } from '../controllers/MemberController.js';
import { MemberService } from '../services/MemberService.js';
import { DataSource } from 'typeorm';

/**
 * Create Member Routes
 */
export function createMemberRoutes(dataSource: DataSource): Router {
  const router = Router();
  const memberService = new MemberService(dataSource);
  const controller = new MemberController(memberService);

  // GET /api/membership/members
  router.get('/', (req, res) => controller.list(req, res));

  // GET /api/membership/members/:id
  router.get('/:id', (req, res) => controller.get(req, res));

  // POST /api/membership/members
  router.post('/', (req, res) => controller.create(req, res));

  // PUT /api/membership/members/:id
  router.put('/:id', (req, res) => controller.update(req, res));

  // DELETE /api/membership/members/:id
  router.delete('/:id', (req, res) => controller.delete(req, res));

  // PATCH /api/membership/members/:id/verify
  router.patch('/:id/verify', (req, res) => controller.verify(req, res));

  // POST /api/membership/members/bulk-update
  router.post('/bulk-update', (req, res) => controller.bulkUpdate(req, res));

  return router;
}
