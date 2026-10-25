import type { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { AppDataSource } from '../../../database/connection.js';
import { getPublicPreview, listPublicPreviews } from '../services/public-preview.service.js';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export class PublicPreviewController extends BaseController {
  static async list(req: Request, res: Response) {
    if (!UUID.test(req.params.courseId)) return BaseController.notFound(res, 'Preview not found');
    return BaseController.ok(res, { items: await listPublicPreviews(AppDataSource, req.params.courseId) });
  }
  static async get(req: Request, res: Response) {
    const { courseId, lessonId } = req.params;
    if (!UUID.test(courseId) || !UUID.test(lessonId)) return BaseController.notFound(res, 'Preview not found');
    const preview = await getPublicPreview(AppDataSource, courseId, lessonId);
    if (!preview) return BaseController.notFound(res, 'Preview not found');
    return BaseController.ok(res, { preview });
  }
}
