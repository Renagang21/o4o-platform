import { Request, Response } from 'express';
import { ExportService } from '../services/ExportService.js';
import { MemberFilterDto } from '../services/MemberService.js';

/**
 * ExportController
 *
 * Excel export API 컨트롤러
 */
export class ExportController {
  constructor(private exportService: ExportService) {}

  /**
   * GET /export/members.xlsx
   *
   * Query Parameters: MemberFilterDto와 동일
   */
  async exportMembers(req: Request, res: Response) {
    try {
      const filter: MemberFilterDto = {
        organizationId: req.query.organizationId as string | undefined,
        categoryId: req.query.categoryId as string | undefined,
        isVerified:
          req.query.isVerified === 'true'
            ? true
            : req.query.isVerified === 'false'
            ? false
            : undefined,
        isActive:
          req.query.isActive === 'true'
            ? true
            : req.query.isActive === 'false'
            ? false
            : undefined,
        search: req.query.search as string | undefined,
        name: req.query.name as string | undefined,
        licenseNumber: req.query.licenseNumber as string | undefined,
        year: req.query.year ? parseInt(req.query.year as string, 10) : undefined,
        paid:
          req.query.paid === 'true'
            ? true
            : req.query.paid === 'false'
            ? false
            : undefined,
        verificationStatus: req.query.verificationStatus as
          | 'pending'
          | 'approved'
          | 'rejected'
          | undefined,
        createdFrom: req.query.createdFrom
          ? new Date(req.query.createdFrom as string)
          : undefined,
        createdTo: req.query.createdTo
          ? new Date(req.query.createdTo as string)
          : undefined,
      };

      const buffer = await this.exportService.exportMembers(filter);

      // Excel 파일 헤더 설정
      const filename = `members_${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /export/verifications.xlsx
   *
   * Query Parameters:
   * - status: pending | approved | rejected
   * - organizationId: string
   */
  async exportVerifications(req: Request, res: Response) {
    try {
      const filter = {
        status: req.query.status as string | undefined,
        organizationId: req.query.organizationId as string | undefined,
      };

      const buffer = await this.exportService.exportVerifications(filter);

      const filename = `verifications_${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /export/categories.xlsx
   */
  async exportCategories(req: Request, res: Response) {
    try {
      const buffer = await this.exportService.exportCategories();

      const filename = `categories_${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}
