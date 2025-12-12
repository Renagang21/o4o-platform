import { Request, Response } from 'express';
import { DataSource, Repository } from 'typeorm';
import { AnnualReport } from '../entities/AnnualReport.js';

export class ReportingYaksaController {
    private reportRepo: Repository<AnnualReport>;

    constructor(dataSource: DataSource) {
        this.reportRepo = dataSource.getRepository(AnnualReport);
    }

    /**
     * Get annual report for a specific year
     * GET /api/v1/yaksa/reporting/:year
     */
    async getMyReport(req: Request, res: Response): Promise<void> {
        try {
            // Mock user ID for now - in real app, get from req.user
            const memberId = req.headers['x-member-id'] as string;
            const year = parseInt(req.params.year, 10);

            if (!memberId || isNaN(year)) {
                res.status(400).json({ success: false, message: 'Invalid parameters' });
                return;
            }

            const report = await this.reportRepo.findOne({
                where: { memberId, year },
                relations: ['logs']
            });

            if (!report) {
                res.status(404).json({ success: false, message: 'Report not found' });
                return;
            }

            res.json({ success: true, data: report });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * Create or update draft report
     * POST /api/v1/yaksa/reporting/:year/draft
     */
    async saveDraft(req: Request, res: Response): Promise<void> {
        try {
            const memberId = req.headers['x-member-id'] as string || 'test-member-id';
            const year = parseInt(req.params.year, 10);
            const { fields, organizationId } = req.body;

            if (!memberId || isNaN(year)) {
                res.status(400).json({ success: false, message: 'Invalid parameters' });
                return;
            }

            let report = await this.reportRepo.findOne({ where: { memberId, year } });

            if (!report) {
                report = this.reportRepo.create({
                    memberId,
                    year,
                    organizationId: organizationId || 'default-org',
                    status: 'draft',
                    fields: fields || {},
                });
            } else {
                if (!report.canEdit()) {
                    res.status(403).json({ success: false, message: 'Cannot edit submitted report' });
                    return;
                }
                report.fields = { ...report.fields, ...fields };
                // Update organization if provided
                if (organizationId) report.organizationId = organizationId;
            }

            const saved = await this.reportRepo.save(report);
            res.json({ success: true, data: saved });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * Submit report
     * POST /api/v1/yaksa/reporting/:year/submit
     */
    async submitReport(req: Request, res: Response): Promise<void> {
        try {
            const memberId = req.headers['x-member-id'] as string || 'test-member-id';
            const year = parseInt(req.params.year, 10);

            const report = await this.reportRepo.findOne({ where: { memberId, year } });

            if (!report) {
                res.status(404).json({ success: false, message: 'Report not found' });
                return;
            }

            if (!report.canSubmit()) {
                res.status(400).json({ success: false, message: 'Report cannot be submitted (already submitted or approved)' });
                return;
            }

            report.status = 'submitted';
            report.submittedAt = new Date();

            const saved = await this.reportRepo.save(report);
            res.json({ success: true, data: saved });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}
