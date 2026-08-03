/**
 * Category Routes
 *
 * /api/v1/membership/categories
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { MemberCategoryService } from '../services/MemberCategoryService.js';

export function createCategoryRoutes(dataSource: DataSource): Router {
  const router = Router();
  const categoryService = new MemberCategoryService(dataSource);

  // GET /api/v1/membership/categories
  //
  // WO-O4O-ADMIN-MEMBERSHIP-INACTIVE-CATEGORY-LIST-FIX-V1
  //   이 경로는 WO-O4O-ADMIN-MEMBERSHIP-API-AUTHORIZATION-GUARD-V2 로
  //   platform:admin / platform:super_admin 전용이다(mount 지점 guard).
  //   관리자는 비활성 분류를 다시 활성화할 수 있어야 하므로 활성·비활성을 모두 반환한다.
  //   응답 구조({ success, data })와 정렬은 변경하지 않는다.
  router.get('/', async (req: Request, res: Response) => {
    try {
      const categories = await categoryService.list({ includeInactive: true });
      res.json({ success: true, data: categories });
    } catch (error: any) {
      console.error('Failed to list categories:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/v1/membership/categories/:id
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const category = await categoryService.findById(req.params.id);
      if (!category) {
        return res.status(404).json({ success: false, error: 'Category not found' });
      }
      res.json({ success: true, data: category });
    } catch (error: any) {
      console.error('Failed to get category:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/v1/membership/categories
  router.post('/', async (req: Request, res: Response) => {
    try {
      const category = await categoryService.create(req.body);
      res.status(201).json({ success: true, data: category });
    } catch (error: any) {
      console.error('Failed to create category:', error);
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // PUT /api/v1/membership/categories/:id
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const category = await categoryService.update(req.params.id, req.body);
      res.json({ success: true, data: category });
    } catch (error: any) {
      console.error('Failed to update category:', error);
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // PATCH /api/v1/membership/categories/:id
  router.patch('/:id', async (req: Request, res: Response) => {
    try {
      const category = await categoryService.update(req.params.id, req.body);
      res.json({ success: true, data: category });
    } catch (error: any) {
      console.error('Failed to update category:', error);
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // DELETE /api/v1/membership/categories/:id
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      await categoryService.delete(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Failed to delete category:', error);
      res.status(400).json({ success: false, error: error.message });
    }
  });

  return router;
}
