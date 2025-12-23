/**
 * Patient Controller
 *
 * 환자 관리 API 엔드포인트
 */

import type { Request, Response } from 'express';
import { patientService } from '../services/PatientService.js';
import type { GetPatientsRequest } from '../dto/index.js';

export class PatientController {
  /**
   * GET /api/v1/cgm-pharmacist/patients
   * 환자 목록 조회
   */
  async getPatients(req: Request, res: Response): Promise<void> {
    try {
      const request: GetPatientsRequest = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        riskLevel: req.query.riskLevel as GetPatientsRequest['riskLevel'],
        sortBy: (req.query.sortBy as GetPatientsRequest['sortBy']) || 'riskLevel',
        sortOrder: (req.query.sortOrder as GetPatientsRequest['sortOrder']) || 'desc',
        search: req.query.search as string,
      };

      const result = await patientService.getPatients(request);
      res.json(result);
    } catch (error) {
      console.error('[PatientController] getPatients error:', error);
      res.status(500).json({ error: 'Failed to get patients' });
    }
  }

  /**
   * GET /api/v1/cgm-pharmacist/patients/:id
   * 환자 상세 조회
   */
  async getPatientDetail(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await patientService.getPatientDetail(id);

      if (!result) {
        res.status(404).json({ error: 'Patient not found' });
        return;
      }

      res.json(result);
    } catch (error) {
      console.error('[PatientController] getPatientDetail error:', error);
      res.status(500).json({ error: 'Failed to get patient detail' });
    }
  }

  /**
   * GET /api/v1/cgm-pharmacist/patients/risk
   * 위험 환자 목록 조회
   */
  async getRiskPatients(req: Request, res: Response): Promise<void> {
    try {
      const result = await patientService.getRiskPatients();
      res.json({ patients: result });
    } catch (error) {
      console.error('[PatientController] getRiskPatients error:', error);
      res.status(500).json({ error: 'Failed to get risk patients' });
    }
  }

  /**
   * GET /api/v1/cgm-pharmacist/patients/today-coaching
   * 오늘 상담 예정 환자 조회
   */
  async getTodayCoachingPatients(req: Request, res: Response): Promise<void> {
    try {
      const result = await patientService.getTodayCoachingPatients();
      res.json({ patients: result });
    } catch (error) {
      console.error('[PatientController] getTodayCoachingPatients error:', error);
      res.status(500).json({ error: 'Failed to get today coaching patients' });
    }
  }
}

export const patientController = new PatientController();
