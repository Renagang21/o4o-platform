/**
 * Patient Profile Controller
 * WO-GLYCOPHARM-PATIENT-PROFILE-V1
 *
 * 환자 본인의 건강 프로필 CRUD.
 * authenticate만 사용 (pharmacy context 불요).
 *
 * Routes:
 *   GET  /patient-profile/me  — 본인 프로필 조회
 *   POST /patient-profile      — 건강 프로필 생성
 *   PUT  /patient-profile      — 건강 프로필 수정
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { authenticate } from '../../../middleware/auth.middleware.js';
import type { AuthRequest } from '../../../middleware/auth.middleware.js';
import { PatientHealthProfile } from '../entities/patient-health-profile.entity.js';
import { GlucoseViewCustomer } from '../../../routes/glucoseview/entities/glucoseview-customer.entity.js';

export function createPatientProfileRouter(dataSource: DataSource): Router {
  const router = Router();
  const profileRepo = dataSource.getRepository(PatientHealthProfile);
  const customerRepo = dataSource.getRepository(GlucoseViewCustomer);

  /**
   * GET /patient-profile/me — 본인 프로필 조회
   *
   * 3가지 데이터 소스 병합:
   * 1. users 테이블 (req.user) → 기본 정보
   * 2. patient_health_profiles → 건강 프로필
   * 3. glucoseview_customers (email 매칭) → 추가 정보 (optional)
   */
  router.get('/patient-profile/me', authenticate, async (req, res) => {
    try {
      const authReq = req as AuthRequest;
      const user = authReq.user;

      if (!user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }

      // 1. Basic info from user
      const basicInfo = {
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        email: user.email,
        phone: user.phone || null,
      };

      // 2. Health profile
      const healthProfile = await profileRepo.findOne({
        where: { userId: user.id },
      });

      // 3. Customer info (optional, email match)
      let customerInfo: { birthYear?: number | null; gender?: string | null } | null = null;
      if (user.email) {
        const customer = await customerRepo.findOne({
          where: { email: user.email },
        });
        if (customer) {
          customerInfo = {
            birthYear: customer.birth_year || null,
            gender: customer.gender || null,
          };
        }
      }

      res.json({
        success: true,
        data: {
          basicInfo,
          customerInfo,
          healthProfile: healthProfile
            ? {
                id: healthProfile.id,
                diabetesType: healthProfile.diabetesType,
                treatmentMethod: healthProfile.treatmentMethod,
                height: healthProfile.height,
                weight: healthProfile.weight,
                targetHbA1c: healthProfile.targetHbA1c,
                targetGlucoseLow: healthProfile.targetGlucoseLow,
                targetGlucoseHigh: healthProfile.targetGlucoseHigh,
                birthDate: healthProfile.birthDate,
              }
            : null,
        },
      });
    } catch (error) {
      console.error('[patient-profile] GET /me failed:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to load profile' } });
    }
  });

  /**
   * POST /patient-profile — 건강 프로필 생성
   */
  router.post('/patient-profile', authenticate, async (req, res) => {
    try {
      const authReq = req as AuthRequest;
      const user = authReq.user;

      if (!user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }

      // Check if profile already exists
      const existing = await profileRepo.findOne({ where: { userId: user.id } });
      if (existing) {
        res.status(409).json({ success: false, error: { code: 'PROFILE_EXISTS', message: 'Health profile already exists. Use PUT to update.' } });
        return;
      }

      const {
        diabetesType,
        treatmentMethod,
        height,
        weight,
        targetHbA1c,
        targetGlucoseLow,
        targetGlucoseHigh,
        birthDate,
      } = req.body;

      const profile = profileRepo.create({
        userId: user.id,
        diabetesType: diabetesType || null,
        treatmentMethod: treatmentMethod || null,
        height: height != null ? String(height) : null,
        weight: weight != null ? String(weight) : null,
        targetHbA1c: targetHbA1c != null ? String(targetHbA1c) : null,
        targetGlucoseLow: targetGlucoseLow ?? 70,
        targetGlucoseHigh: targetGlucoseHigh ?? 180,
        birthDate: birthDate || null,
      });

      const saved = await profileRepo.save(profile);
      res.status(201).json({ success: true, data: saved });
    } catch (error) {
      console.error('[patient-profile] POST failed:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create profile' } });
    }
  });

  /**
   * PUT /patient-profile — 건강 프로필 수정
   */
  router.put('/patient-profile', authenticate, async (req, res) => {
    try {
      const authReq = req as AuthRequest;
      const user = authReq.user;

      if (!user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }

      let profile = await profileRepo.findOne({ where: { userId: user.id } });

      const {
        diabetesType,
        treatmentMethod,
        height,
        weight,
        targetHbA1c,
        targetGlucoseLow,
        targetGlucoseHigh,
        birthDate,
      } = req.body;

      if (!profile) {
        // Auto-create if not exists (upsert behavior)
        profile = profileRepo.create({
          userId: user.id,
        });
      }

      if (diabetesType !== undefined) profile.diabetesType = diabetesType || null;
      if (treatmentMethod !== undefined) profile.treatmentMethod = treatmentMethod || null;
      if (height !== undefined) profile.height = height != null ? String(height) : null;
      if (weight !== undefined) profile.weight = weight != null ? String(weight) : null;
      if (targetHbA1c !== undefined) profile.targetHbA1c = targetHbA1c != null ? String(targetHbA1c) : null;
      if (targetGlucoseLow !== undefined) profile.targetGlucoseLow = targetGlucoseLow ?? 70;
      if (targetGlucoseHigh !== undefined) profile.targetGlucoseHigh = targetGlucoseHigh ?? 180;
      if (birthDate !== undefined) profile.birthDate = birthDate || null;

      const saved = await profileRepo.save(profile);
      res.json({ success: true, data: saved });
    } catch (error) {
      console.error('[patient-profile] PUT failed:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update profile' } });
    }
  });

  return router;
}
