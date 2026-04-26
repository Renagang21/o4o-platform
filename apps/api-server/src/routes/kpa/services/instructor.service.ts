/**
 * Instructor Qualification Service
 * 강사 자격 관리 서비스
 *
 * WO-O4O-ROUTES-REFACTOR-V1: Extracted from kpa.routes.ts (Q1-Q7)
 * WO-KPA-B-LMS-GUARD-BYPASS-AUDIT-AND-IMPLEMENTATION-V1 origin
 * WO-PLATFORM-APPROVAL-ENGINE-UNIFICATION-V1: dual-query (legacy + unified)
 */

import type { DataSource, QueryRunner } from 'typeorm';
import { roleAssignmentService } from '../../../modules/auth/services/role-assignment.service.js';

export class InstructorService {
  constructor(private dataSource: DataSource) {}

  // ── Helpers ──────────────────────────────────────────────────────

  /** 강사 자격 — active KPA 회원 확인 helper
   * WO-KPA-AFFILIATION-TEXT-DECOUPLING-PHASE2-V1: organization_id 인가 조건 제거
   */
  async verifyActiveMember(
    userId: string,
  ): Promise<{ memberId: string } | null> {
    const [member] = await this.dataSource.query(
      `SELECT id FROM kpa_members WHERE user_id = $1 AND status = 'active' LIMIT 1`,
      [userId],
    );
    return member ? { memberId: member.id } : null;
  }

  /** 강사 자격 — approved qualification 확인 helper (dual-query: legacy + unified)
   * WO-KPA-AFFILIATION-TEXT-DECOUPLING-PHASE2-V1: organization_id 인가 조건 제거
   */
  async verifyQualifiedInstructor(
    userId: string,
    userRoles: string[],
  ): Promise<{ qualificationId: string } | null> {
    if (userRoles.some(r => r === 'kpa:admin')) return { qualificationId: 'admin-bypass' };
    // 1. Check unified table first
    const [qNew] = await this.dataSource.query(
      `SELECT id FROM kpa_approval_requests WHERE requester_id = $1 AND entity_type = 'instructor_qualification' AND status = 'approved' LIMIT 1`,
      [userId],
    );
    if (qNew) return { qualificationId: qNew.id };
    // 2. Fallback to legacy table (transition period)
    const [qLegacy] = await this.dataSource.query(
      `SELECT id FROM kpa_instructor_qualifications WHERE user_id = $1 AND status = 'approved' LIMIT 1`,
      [userId],
    );
    return qLegacy ? { qualificationId: qLegacy.id } : null;
  }

  // ── Q1: 강사 자격 신청 ──────────────────────────────────────────

  async applyQualification(
    userId: string,
    organizationId: string,
    data: {
      qualificationType: string;
      licenseNumber?: string;
      specialtyArea?: string;
      teachingExperienceYears?: number;
      supportingDocuments?: any[];
      applicantNote?: string;
      userName?: string;
      userEmail?: string;
    },
  ): Promise<{ qualificationId: string; status: string } | { error: { code: string; message: string; httpStatus: number } }> {
    // 활성 회원 확인
    const memberCheck = await this.verifyActiveMember(userId);
    if (!memberCheck) {
      return { error: { code: 'NOT_ACTIVE_MEMBER', message: '해당 분회의 활성 회원만 강사 자격을 신청할 수 있습니다', httpStatus: 403 } };
    }

    // 중복 확인 — dual-query (legacy + unified)
    // WO-KPA-AFFILIATION-TEXT-DECOUPLING-PHASE2-V1: organization_id 인가 조건 제거
    const [existingNew] = await this.dataSource.query(
      `SELECT id, status FROM kpa_approval_requests WHERE requester_id = $1 AND entity_type = 'instructor_qualification' AND status IN ('pending', 'approved') LIMIT 1`,
      [userId],
    );
    if (existingNew) {
      const msg = existingNew.status === 'pending' ? '이미 대기 중인 신청이 있습니다' : '이미 승인된 자격이 있습니다';
      return { error: { code: 'DUPLICATE', message: msg, httpStatus: 409 } };
    }
    const [existingLegacy] = await this.dataSource.query(
      `SELECT id, status FROM kpa_instructor_qualifications WHERE user_id = $1 AND status IN ('pending', 'approved') LIMIT 1`,
      [userId],
    );
    if (existingLegacy) {
      const msg = existingLegacy.status === 'pending' ? '이미 대기 중인 신청이 있습니다' : '이미 승인된 자격이 있습니다';
      return { error: { code: 'DUPLICATE', message: msg, httpStatus: 409 } };
    }

    const [inserted] = await this.dataSource.query(
      `INSERT INTO kpa_approval_requests
        (id, entity_type, organization_id, payload, status, requester_id, requester_name, requester_email, submitted_at, created_at, updated_at)
       VALUES (gen_random_uuid(), 'instructor_qualification', $1, $2, 'pending', $3, $4, $5, NOW(), NOW(), NOW())
       RETURNING id, status, created_at`,
      [
        organizationId,
        JSON.stringify({
          qualification_type: data.qualificationType,
          license_number: data.licenseNumber || null,
          specialty_area: data.specialtyArea || null,
          teaching_experience_years: data.teachingExperienceYears || 0,
          supporting_documents: data.supportingDocuments || [],
          applicant_note: data.applicantNote || null,
          member_id: memberCheck.memberId,
        }),
        userId,
        data.userName || data.userEmail || 'Unknown',
        data.userEmail || null,
      ],
    );

    return { qualificationId: inserted.id, status: 'pending' };
  }

  // ── Q2: 내 자격 현황 ──────────────────────────────────────────

  async getMyQualification(userId: string): Promise<any[]> {
    // Unified table
    const newRows = await this.dataSource.query(
      `SELECT id, organization_id,
              payload->>'qualification_type' AS qualification_type,
              status,
              payload->>'license_number' AS license_number,
              payload->>'specialty_area' AS specialty_area,
              (payload->>'teaching_experience_years')::int AS teaching_experience_years,
              reviewed_at,
              review_comment AS rejection_reason,
              payload->>'revoke_reason' AS revoke_reason,
              created_at
       FROM kpa_approval_requests
       WHERE requester_id = $1 AND entity_type = 'instructor_qualification'
       ORDER BY created_at DESC`,
      [userId],
    );
    // Legacy table (transition period)
    const legacyRows = await this.dataSource.query(
      `SELECT id, organization_id, qualification_type, status, license_number, specialty_area, teaching_experience_years, reviewed_at, rejection_reason, revoke_reason, created_at
       FROM kpa_instructor_qualifications WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId],
    );
    return [...newRows, ...legacyRows];
  }

  // ── Q3: 분회 내 자격 목록 ──────────────────────────────────────

  // WO-KPA-AFFILIATION-TEXT-DECOUPLING-PHASE2-V1: branchId 제거 — 서비스 레벨 조회
  async listQualifications(filters: { status?: string }): Promise<any[]> {
    const validStatuses = ['pending', 'approved', 'rejected', 'revoked'];

    // Unified table
    let sqlNew = `SELECT ar.id, ar.requester_id AS user_id,
                         payload->>'qualification_type' AS qualification_type,
                         ar.status,
                         payload->>'license_number' AS license_number,
                         payload->>'specialty_area' AS specialty_area,
                         (payload->>'teaching_experience_years')::int AS teaching_experience_years,
                         payload->>'applicant_note' AS applicant_note,
                         ar.reviewed_at,
                         ar.review_comment AS rejection_reason,
                         ar.created_at,
                         u.name AS user_name, u.email AS user_email
                  FROM kpa_approval_requests ar
                  LEFT JOIN users u ON u.id = ar.requester_id
                  WHERE ar.entity_type = 'instructor_qualification'`;
    const paramsNew: any[] = [];
    if (filters.status && typeof filters.status === 'string' && validStatuses.includes(filters.status)) {
      sqlNew += ` AND ar.status = $1`;
      paramsNew.push(filters.status);
    }
    sqlNew += ` ORDER BY ar.created_at DESC`;

    // Legacy table
    let sqlLegacy = `SELECT q.id, q.user_id, q.qualification_type, q.status, q.license_number, q.specialty_area,
                            q.teaching_experience_years, q.applicant_note, q.reviewed_at, q.rejection_reason, q.created_at,
                            u.name AS user_name, u.email AS user_email
                     FROM kpa_instructor_qualifications q
                     LEFT JOIN users u ON u.id = q.user_id
                     WHERE 1=1`;
    const paramsLegacy: any[] = [];
    if (filters.status && typeof filters.status === 'string' && validStatuses.includes(filters.status)) {
      sqlLegacy += ` AND q.status = $1`;
      paramsLegacy.push(filters.status);
    }
    sqlLegacy += ` ORDER BY q.created_at DESC`;

    const [newRows, legacyRows] = await Promise.all([
      this.dataSource.query(sqlNew, paramsNew),
      this.dataSource.query(sqlLegacy, paramsLegacy),
    ]);
    return [...newRows, ...legacyRows];
  }

  // ── Q4: 대기 중 자격만 ──────────────────────────────────────────

  // WO-KPA-AFFILIATION-TEXT-DECOUPLING-PHASE2-V1: branchId 제거 — 서비스 레벨 조회
  async getPendingQualifications(): Promise<any[]> {
    // Unified table
    const newRows = await this.dataSource.query(
      `SELECT ar.id, ar.requester_id AS user_id,
              ar.payload->>'qualification_type' AS qualification_type,
              ar.payload->>'license_number' AS license_number,
              ar.payload->>'specialty_area' AS specialty_area,
              (ar.payload->>'teaching_experience_years')::int AS teaching_experience_years,
              ar.payload->'supporting_documents' AS supporting_documents,
              ar.payload->>'applicant_note' AS applicant_note,
              ar.created_at,
              u.name AS user_name, u.email AS user_email
       FROM kpa_approval_requests ar
       LEFT JOIN users u ON u.id = ar.requester_id
       WHERE ar.entity_type = 'instructor_qualification' AND ar.status = 'pending'
       ORDER BY ar.created_at ASC`,
    );
    // Legacy table (transition period)
    const legacyRows = await this.dataSource.query(
      `SELECT q.id, q.user_id, q.qualification_type, q.license_number, q.specialty_area,
              q.teaching_experience_years, q.supporting_documents, q.applicant_note, q.created_at,
              u.name AS user_name, u.email AS user_email
       FROM kpa_instructor_qualifications q
       LEFT JOIN users u ON u.id = q.user_id
       WHERE q.status = 'pending'
       ORDER BY q.created_at ASC`,
    );
    return [...newRows, ...legacyRows];
  }

  // ── Q5: 승인 (TRANSACTION with role assignment) ──────────────────

  // WO-KPA-AFFILIATION-TEXT-DECOUPLING-PHASE2-V1: branchId 제거
  async approveQualification(
    qualificationId: string,
    reviewerId: string,
    reviewComment?: string,
  ): Promise<{ qualificationId: string; status: string; roleAssigned: string } | { error: { code: string; message: string; httpStatus: number } }> {
    // Try unified table first
    const [arRow] = await this.dataSource.query(
      `SELECT id, requester_id, status FROM kpa_approval_requests WHERE id = $1 AND entity_type = 'instructor_qualification' LIMIT 1`,
      [qualificationId],
    );
    if (arRow) {
      if (arRow.status !== 'pending') {
        return { error: { code: 'INVALID_STATUS', message: `현재 상태(${arRow.status})에서는 승인할 수 없습니다`, httpStatus: 400 } };
      }
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        await queryRunner.query(
          `UPDATE kpa_approval_requests SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), review_comment = $2, updated_at = NOW() WHERE id = $3`,
          [reviewerId, reviewComment || null, qualificationId],
        );
        await roleAssignmentService.assignRole({ userId: arRow.requester_id, role: 'lms:instructor', assignedBy: reviewerId });
        await queryRunner.commitTransaction();
        return { qualificationId, status: 'approved', roleAssigned: 'lms:instructor' };
      } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
      } finally {
        await queryRunner.release();
      }
    }

    // Fallback: legacy table
    const [qual] = await this.dataSource.query(
      `SELECT id, user_id, status FROM kpa_instructor_qualifications WHERE id = $1 LIMIT 1`,
      [qualificationId],
    );
    if (!qual) {
      return { error: { code: 'NOT_FOUND', message: 'Qualification not found', httpStatus: 404 } };
    }
    if (qual.status !== 'pending') {
      return { error: { code: 'INVALID_STATUS', message: `현재 상태(${qual.status})에서는 승인할 수 없습니다`, httpStatus: 400 } };
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.query(
        `UPDATE kpa_instructor_qualifications SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), review_comment = $2, updated_at = NOW() WHERE id = $3`,
        [reviewerId, reviewComment || null, qualificationId],
      );
      await roleAssignmentService.assignRole({ userId: qual.user_id, role: 'lms:instructor', assignedBy: reviewerId });
      await queryRunner.commitTransaction();
      return { qualificationId, status: 'approved', roleAssigned: 'lms:instructor' };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ── Q6: 거절 ──────────────────────────────────────────────────

  // WO-KPA-AFFILIATION-TEXT-DECOUPLING-PHASE2-V1: branchId 제거
  async rejectQualification(
    qualificationId: string,
    reviewerId: string,
    reason?: string,
  ): Promise<{ qualificationId: string; status: string } | { error: { code: string; message: string; httpStatus: number } }> {
    // Try unified table first
    const [arRow] = await this.dataSource.query(
      `SELECT id, status FROM kpa_approval_requests WHERE id = $1 AND entity_type = 'instructor_qualification' LIMIT 1`,
      [qualificationId],
    );
    if (arRow) {
      if (arRow.status !== 'pending') {
        return { error: { code: 'INVALID_STATUS', message: `현재 상태(${arRow.status})에서는 거절할 수 없습니다`, httpStatus: 400 } };
      }
      await this.dataSource.query(
        `UPDATE kpa_approval_requests SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), review_comment = $2, updated_at = NOW() WHERE id = $3`,
        [reviewerId, reason, qualificationId],
      );
      return { qualificationId, status: 'rejected' };
    }

    // Fallback: legacy table
    const [qual] = await this.dataSource.query(
      `SELECT id, status FROM kpa_instructor_qualifications WHERE id = $1 LIMIT 1`,
      [qualificationId],
    );
    if (!qual) {
      return { error: { code: 'NOT_FOUND', message: 'Qualification not found', httpStatus: 404 } };
    }
    if (qual.status !== 'pending') {
      return { error: { code: 'INVALID_STATUS', message: `현재 상태(${qual.status})에서는 거절할 수 없습니다`, httpStatus: 400 } };
    }

    await this.dataSource.query(
      `UPDATE kpa_instructor_qualifications SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), rejection_reason = $2, updated_at = NOW() WHERE id = $3`,
      [reviewerId, reason, qualificationId],
    );
    return { qualificationId, status: 'rejected' };
  }

  // ── Q7: 해지 (TRANSACTION with role removal) ──────────────────

  // WO-KPA-AFFILIATION-TEXT-DECOUPLING-PHASE2-V1: branchId 제거
  async revokeQualification(
    qualificationId: string,
    reviewerId: string,
    reason?: string,
  ): Promise<{ qualificationId: string; status: string } | { error: { code: string; message: string; httpStatus: number } }> {
    // Try unified table first
    const [arRow] = await this.dataSource.query(
      `SELECT id, requester_id, status FROM kpa_approval_requests WHERE id = $1 AND entity_type = 'instructor_qualification' LIMIT 1`,
      [qualificationId],
    );
    if (arRow) {
      if (arRow.status !== 'approved') {
        return { error: { code: 'INVALID_STATUS', message: `현재 상태(${arRow.status})에서는 해지할 수 없습니다`, httpStatus: 400 } };
      }
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        await queryRunner.query(
          `UPDATE kpa_approval_requests SET status = 'revoked', reviewed_by = $1, reviewed_at = NOW(),
                  payload = payload || $2::jsonb,
                  updated_at = NOW() WHERE id = $3`,
          [reviewerId, JSON.stringify({ revoke_reason: reason, revoked_by: reviewerId, revoked_at: new Date().toISOString() }), qualificationId],
        );
        await roleAssignmentService.removeRole(arRow.requester_id, 'lms:instructor');
        await queryRunner.commitTransaction();
        return { qualificationId, status: 'revoked' };
      } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
      } finally {
        await queryRunner.release();
      }
    }

    // Fallback: legacy table
    const [qual] = await this.dataSource.query(
      `SELECT id, user_id, status FROM kpa_instructor_qualifications WHERE id = $1 LIMIT 1`,
      [qualificationId],
    );
    if (!qual) {
      return { error: { code: 'NOT_FOUND', message: 'Qualification not found', httpStatus: 404 } };
    }
    if (qual.status !== 'approved') {
      return { error: { code: 'INVALID_STATUS', message: `현재 상태(${qual.status})에서는 해지할 수 없습니다`, httpStatus: 400 } };
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.query(
        `UPDATE kpa_instructor_qualifications SET status = 'revoked', revoked_by = $1, revoked_at = NOW(), revoke_reason = $2, updated_at = NOW() WHERE id = $3`,
        [reviewerId, reason, qualificationId],
      );
      await roleAssignmentService.removeRole(qual.user_id, 'lms:instructor');
      await queryRunner.commitTransaction();
      return { qualificationId, status: 'revoked' };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
