/**
 * KPA Course Request Service
 *
 * WO-O4O-ROUTES-REFACTOR-V1: Extracted from kpa.routes.ts (C1-C11)
 * 강좌 기획안(Course Request) 도메인 서비스
 *
 * Dual-query pattern: kpa_approval_requests (unified) + kpa_course_requests (legacy)
 */

import type { DataSource } from 'typeorm';
import { CourseService } from '../../../modules/lms/services/CourseService.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class CourseRequestService {
  constructor(private dataSource: DataSource) {}

  // ── Helpers ──

  /** 강사 자격 — active KPA 회원 확인 helper */
  async verifyActiveMember(
    userId: string,
    organizationId: string,
  ): Promise<{ memberId: string } | null> {
    const [member] = await this.dataSource.query(
      `SELECT id FROM kpa_members WHERE user_id = $1 AND organization_id = $2 AND status = 'active' LIMIT 1`,
      [userId, organizationId],
    );
    return member ? { memberId: member.id } : null;
  }

  /** 강사 자격 — approved qualification 확인 helper (dual-query: legacy + unified) */
  async verifyQualifiedInstructor(
    userId: string,
    organizationId: string,
    userRoles: string[],
  ): Promise<{ qualificationId: string } | null> {
    if (userRoles.some(r => r === 'kpa:admin')) return { qualificationId: 'admin-bypass' };
    // 1. Check unified table first
    const [qNew] = await this.dataSource.query(
      `SELECT id FROM kpa_approval_requests WHERE requester_id = $1 AND organization_id = $2 AND entity_type = 'instructor_qualification' AND status = 'approved' LIMIT 1`,
      [userId, organizationId],
    );
    if (qNew) return { qualificationId: qNew.id };
    // 2. Fallback to legacy table (transition period)
    const [qLegacy] = await this.dataSource.query(
      `SELECT id FROM kpa_instructor_qualifications WHERE user_id = $1 AND organization_id = $2 AND status = 'approved' LIMIT 1`,
      [userId, organizationId],
    );
    return qLegacy ? { qualificationId: qLegacy.id } : null;
  }

  /** Branch admin 권한 검증 helper */
  private async verifyBranchAdmin(
    userId: string,
    branchId: string,
    userRoles: string[],
  ): Promise<boolean> {
    // kpa:admin / kpa:district_admin → bypass
    if (userRoles.some(r => r === 'kpa:admin' || r === 'kpa:district_admin')) return true;
    // 분회 소속 admin 확인
    const [member] = await this.dataSource.query(
      `SELECT id FROM kpa_members WHERE user_id = $1 AND organization_id = $2 AND status = 'active' AND role = 'admin' LIMIT 1`,
      [userId, branchId],
    );
    return !!member;
  }

  // ── C1: 강좌 기획안 생성 (draft) ──

  async createDraft(
    userId: string,
    data: {
      organizationId: string;
      proposedTitle: string;
      proposedDescription: string;
      proposedLevel?: string;
      proposedDuration: number;
      proposedCredits?: number;
      proposedTags?: string[];
      proposedMetadata?: Record<string, any>;
      userName?: string;
      userEmail?: string;
      userRoles?: string[];
    },
  ): Promise<{ success: true; data: any; status: 201 } | { success: false; error: any; status: number }> {
    const { organizationId, proposedTitle, proposedDescription, proposedLevel, proposedDuration, proposedCredits, proposedTags, proposedMetadata, userName, userEmail, userRoles } = data;

    if (!organizationId || !UUID_RE.test(organizationId)) {
      return { success: false, error: { code: 'INVALID_ORG', message: 'Valid organizationId required' }, status: 400 };
    }
    if (!proposedTitle || !proposedDescription || !proposedDuration) {
      return { success: false, error: { code: 'MISSING_FIELDS', message: 'proposedTitle, proposedDescription, proposedDuration are required' }, status: 400 };
    }

    // qualification 확인 (dual-query: unified + legacy)
    const qualCheck = await this.verifyQualifiedInstructor(userId, organizationId, userRoles || []);
    if (!qualCheck) {
      return { success: false, error: { code: 'NOT_QUALIFIED', message: '승인된 강사 자격이 필요합니다' }, status: 403 };
    }

    const [inserted] = await this.dataSource.query(
      `INSERT INTO kpa_approval_requests
        (id, entity_type, organization_id, payload, status, requester_id, requester_name, requester_email, created_at, updated_at)
       VALUES (gen_random_uuid(), 'course', $1, $2, 'draft', $3, $4, $5, NOW(), NOW())
       RETURNING id, status, created_at`,
      [
        organizationId,
        JSON.stringify({
          proposed_title: proposedTitle,
          proposed_description: proposedDescription,
          proposed_level: proposedLevel || 'beginner',
          proposed_duration: proposedDuration,
          proposed_credits: proposedCredits || 0,
          proposed_tags: proposedTags || [],
          proposed_metadata: proposedMetadata || {},
          qualification_id: qualCheck.qualificationId,
          instructor_id: userId,
        }),
        userId,
        userName || 'Unknown',
        userEmail || null,
      ],
    );

    return { success: true, data: { requestId: inserted.id, status: 'draft' }, status: 201 };
  }

  // ── C2: 내 기획안 목록 ──

  async listMy(userId: string): Promise<any> {
    // Unified table
    const newRows = await this.dataSource.query(
      `SELECT id, organization_id,
              payload->>'proposed_title' AS proposed_title,
              payload->>'proposed_level' AS proposed_level,
              (payload->>'proposed_duration')::int AS proposed_duration,
              status,
              result_entity_id AS created_course_id,
              submitted_at, reviewed_at,
              review_comment AS rejection_reason,
              revision_note,
              created_at
       FROM kpa_approval_requests
       WHERE requester_id = $1 AND entity_type = 'course'
       ORDER BY created_at DESC`,
      [userId],
    );
    // Legacy table (transition period)
    const legacyRows = await this.dataSource.query(
      `SELECT id, organization_id, proposed_title, proposed_level, proposed_duration, status, created_course_id, submitted_at, reviewed_at, rejection_reason, revision_note, created_at
       FROM kpa_course_requests WHERE instructor_id = $1 ORDER BY created_at DESC`,
      [userId],
    );
    return [...newRows, ...legacyRows];
  }

  // ── C3: 기획안 상세 ──

  async getDetail(
    requestId: string,
    userId: string,
    userRoles: string[],
  ): Promise<{ success: true; data: any } | { success: false; error: any; status: number }> {
    if (!UUID_RE.test(requestId)) {
      return { success: false, error: { code: 'INVALID_ID', message: 'Invalid ID' }, status: 400 };
    }

    // Try unified table first
    const [arRow] = await this.dataSource.query(
      `SELECT * FROM kpa_approval_requests WHERE id = $1 AND entity_type = 'course' LIMIT 1`,
      [requestId],
    );
    if (arRow) {
      if (arRow.requester_id !== userId) {
        if (!(await this.verifyBranchAdmin(userId, arRow.organization_id, userRoles))) {
          return { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' }, status: 403 };
        }
      }
      return { success: true, data: arRow };
    }

    // Fallback: legacy table
    const [row] = await this.dataSource.query(
      `SELECT * FROM kpa_course_requests WHERE id = $1 LIMIT 1`,
      [requestId],
    );
    if (!row) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Course request not found' }, status: 404 };
    }
    if (row.instructor_id !== userId) {
      if (!(await this.verifyBranchAdmin(userId, row.organization_id, userRoles))) {
        return { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' }, status: 403 };
      }
    }
    return { success: true, data: row };
  }

  // ── C4: 기획안 수정 (draft/revision_requested에서만) ──

  async updateDraft(
    requestId: string,
    userId: string,
    data: {
      proposedTitle?: string;
      proposedDescription?: string;
      proposedLevel?: string;
      proposedDuration?: number;
      proposedCredits?: number;
      proposedTags?: string[];
      proposedMetadata?: Record<string, any>;
    },
  ): Promise<{ success: true; data: any } | { success: false; error: any; status: number }> {
    if (!UUID_RE.test(requestId)) {
      return { success: false, error: { code: 'INVALID_ID', message: 'Invalid ID' }, status: 400 };
    }

    const { proposedTitle, proposedDescription, proposedLevel, proposedDuration, proposedCredits, proposedTags, proposedMetadata } = data;

    // Try unified table first
    const [arRow] = await this.dataSource.query(
      `SELECT id, requester_id, status FROM kpa_approval_requests WHERE id = $1 AND entity_type = 'course' LIMIT 1`,
      [requestId],
    );
    if (arRow) {
      if (arRow.requester_id !== userId) {
        return { success: false, error: { code: 'FORBIDDEN', message: 'Only owner can edit' }, status: 403 };
      }
      if (!['draft', 'revision_requested'].includes(arRow.status)) {
        return { success: false, error: { code: 'INVALID_STATUS', message: `현재 상태(${arRow.status})에서는 수정할 수 없습니다` }, status: 400 };
      }

      const payloadPatch: Record<string, any> = {};
      if (proposedTitle) payloadPatch.proposed_title = proposedTitle;
      if (proposedDescription) payloadPatch.proposed_description = proposedDescription;
      if (proposedLevel) payloadPatch.proposed_level = proposedLevel;
      if (proposedDuration) payloadPatch.proposed_duration = proposedDuration;
      if (proposedCredits !== undefined) payloadPatch.proposed_credits = proposedCredits;
      if (proposedTags) payloadPatch.proposed_tags = proposedTags;
      if (proposedMetadata) payloadPatch.proposed_metadata = proposedMetadata;

      await this.dataSource.query(
        `UPDATE kpa_approval_requests SET payload = payload || $1::jsonb, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(payloadPatch), requestId],
      );
      return { success: true, data: { requestId, message: 'Updated' } };
    }

    // Fallback: legacy table
    const [row] = await this.dataSource.query(
      `SELECT id, instructor_id, status FROM kpa_course_requests WHERE id = $1 LIMIT 1`,
      [requestId],
    );
    if (!row) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Course request not found' }, status: 404 };
    }
    if (row.instructor_id !== userId) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Only owner can edit' }, status: 403 };
    }
    if (!['draft', 'revision_requested'].includes(row.status)) {
      return { success: false, error: { code: 'INVALID_STATUS', message: `현재 상태(${row.status})에서는 수정할 수 없습니다` }, status: 400 };
    }

    const setClauses: string[] = ['updated_at = NOW()'];
    const params: any[] = [];
    let pi = 1;
    if (proposedTitle) { setClauses.push(`proposed_title = $${pi++}`); params.push(proposedTitle); }
    if (proposedDescription) { setClauses.push(`proposed_description = $${pi++}`); params.push(proposedDescription); }
    if (proposedLevel) { setClauses.push(`proposed_level = $${pi++}`); params.push(proposedLevel); }
    if (proposedDuration) { setClauses.push(`proposed_duration = $${pi++}`); params.push(proposedDuration); }
    if (proposedCredits !== undefined) { setClauses.push(`proposed_credits = $${pi++}`); params.push(proposedCredits); }
    if (proposedTags) { setClauses.push(`proposed_tags = $${pi++}`); params.push(`{${proposedTags.join(',')}}`); }
    if (proposedMetadata) { setClauses.push(`proposed_metadata = $${pi++}::jsonb`); params.push(JSON.stringify(proposedMetadata)); }
    params.push(requestId);
    await this.dataSource.query(`UPDATE kpa_course_requests SET ${setClauses.join(', ')} WHERE id = $${pi}`, params);
    return { success: true, data: { requestId, message: 'Updated' } };
  }

  // ── C5: 제출 ──

  async submit(
    requestId: string,
    userId: string,
  ): Promise<{ success: true; data: any } | { success: false; error: any; status: number }> {
    if (!UUID_RE.test(requestId)) {
      return { success: false, error: { code: 'INVALID_ID', message: 'Invalid ID' }, status: 400 };
    }

    // Try unified table first
    const [arRow] = await this.dataSource.query(
      `SELECT id, requester_id, status FROM kpa_approval_requests WHERE id = $1 AND entity_type = 'course' LIMIT 1`,
      [requestId],
    );
    if (arRow) {
      if (arRow.requester_id !== userId) {
        return { success: false, error: { code: 'FORBIDDEN', message: 'Only owner can submit' }, status: 403 };
      }
      if (!['draft', 'revision_requested'].includes(arRow.status)) {
        return { success: false, error: { code: 'INVALID_STATUS', message: `현재 상태(${arRow.status})에서는 제출할 수 없습니다` }, status: 400 };
      }
      await this.dataSource.query(
        `UPDATE kpa_approval_requests SET status = 'submitted', submitted_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [requestId],
      );
      return { success: true, data: { requestId, status: 'submitted' } };
    }

    // Fallback: legacy table
    const [row] = await this.dataSource.query(
      `SELECT id, instructor_id, status FROM kpa_course_requests WHERE id = $1 LIMIT 1`,
      [requestId],
    );
    if (!row) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Course request not found' }, status: 404 };
    }
    if (row.instructor_id !== userId) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Only owner can submit' }, status: 403 };
    }
    if (!['draft', 'revision_requested'].includes(row.status)) {
      return { success: false, error: { code: 'INVALID_STATUS', message: `현재 상태(${row.status})에서는 제출할 수 없습니다` }, status: 400 };
    }
    await this.dataSource.query(
      `UPDATE kpa_course_requests SET status = 'submitted', submitted_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [requestId],
    );
    return { success: true, data: { requestId, status: 'submitted' } };
  }

  // ── C6: 취소 ──

  async cancel(
    requestId: string,
    userId: string,
  ): Promise<{ success: true; data: any } | { success: false; error: any; status: number }> {
    if (!UUID_RE.test(requestId)) {
      return { success: false, error: { code: 'INVALID_ID', message: 'Invalid ID' }, status: 400 };
    }

    // Try unified table first
    const [arRow] = await this.dataSource.query(
      `SELECT id, requester_id, status FROM kpa_approval_requests WHERE id = $1 AND entity_type = 'course' LIMIT 1`,
      [requestId],
    );
    if (arRow) {
      if (arRow.requester_id !== userId) {
        return { success: false, error: { code: 'FORBIDDEN', message: 'Only owner can cancel' }, status: 403 };
      }
      if (['approved', 'cancelled'].includes(arRow.status)) {
        return { success: false, error: { code: 'INVALID_STATUS', message: `현재 상태(${arRow.status})에서는 취소할 수 없습니다` }, status: 400 };
      }
      await this.dataSource.query(
        `UPDATE kpa_approval_requests SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
        [requestId],
      );
      return { success: true, data: { requestId, status: 'cancelled' } };
    }

    // Fallback: legacy table
    const [row] = await this.dataSource.query(
      `SELECT id, instructor_id, status FROM kpa_course_requests WHERE id = $1 LIMIT 1`,
      [requestId],
    );
    if (!row) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Course request not found' }, status: 404 };
    }
    if (row.instructor_id !== userId) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Only owner can cancel' }, status: 403 };
    }
    if (['approved', 'cancelled'].includes(row.status)) {
      return { success: false, error: { code: 'INVALID_STATUS', message: `현재 상태(${row.status})에서는 취소할 수 없습니다` }, status: 400 };
    }
    await this.dataSource.query(
      `UPDATE kpa_course_requests SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
      [requestId],
    );
    return { success: true, data: { requestId, status: 'cancelled' } };
  }

  // ── C7: 분회 내 기획안 목록 ──

  async listByBranch(
    branchId: string,
    userId: string,
    userRoles: string[],
  ): Promise<{ success: true; data: any } | { success: false; error: any; status: number }> {
    if (!UUID_RE.test(branchId)) {
      return { success: false, error: { code: 'INVALID_ID', message: 'Invalid branch ID' }, status: 400 };
    }
    if (!(await this.verifyBranchAdmin(userId, branchId, userRoles))) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Branch admin access required' }, status: 403 };
    }

    const [newRows, legacyRows] = await Promise.all([
      this.dataSource.query(
        `SELECT ar.id, ar.requester_id AS instructor_id,
                ar.payload->>'proposed_title' AS proposed_title,
                ar.payload->>'proposed_level' AS proposed_level,
                (ar.payload->>'proposed_duration')::int AS proposed_duration,
                (ar.payload->>'proposed_credits')::numeric AS proposed_credits,
                ar.status, ar.result_entity_id AS created_course_id,
                ar.submitted_at, ar.reviewed_at,
                ar.review_comment AS rejection_reason,
                ar.revision_note, ar.created_at,
                u.name AS instructor_name, u.email AS instructor_email
         FROM kpa_approval_requests ar
         LEFT JOIN users u ON u.id = ar.requester_id
         WHERE ar.entity_type = 'course' AND ar.organization_id = $1
         ORDER BY ar.created_at DESC`,
        [branchId],
      ),
      this.dataSource.query(
        `SELECT cr.id, cr.instructor_id, cr.proposed_title, cr.proposed_level, cr.proposed_duration, cr.proposed_credits,
                cr.status, cr.created_course_id, cr.submitted_at, cr.reviewed_at, cr.rejection_reason, cr.revision_note, cr.created_at,
                u.name AS instructor_name, u.email AS instructor_email
         FROM kpa_course_requests cr
         LEFT JOIN users u ON u.id = cr.instructor_id
         WHERE cr.organization_id = $1
         ORDER BY cr.created_at DESC`,
        [branchId],
      ),
    ]);
    return { success: true, data: [...newRows, ...legacyRows] };
  }

  // ── C8: 제출된 기획안만 ──

  async listPending(
    branchId: string,
    userId: string,
    userRoles: string[],
  ): Promise<{ success: true; data: any } | { success: false; error: any; status: number }> {
    if (!UUID_RE.test(branchId)) {
      return { success: false, error: { code: 'INVALID_ID', message: 'Invalid branch ID' }, status: 400 };
    }
    if (!(await this.verifyBranchAdmin(userId, branchId, userRoles))) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Branch admin access required' }, status: 403 };
    }

    const [newRows, legacyRows] = await Promise.all([
      this.dataSource.query(
        `SELECT ar.id, ar.requester_id AS instructor_id,
                ar.payload->>'proposed_title' AS proposed_title,
                ar.payload->>'proposed_description' AS proposed_description,
                ar.payload->>'proposed_level' AS proposed_level,
                (ar.payload->>'proposed_duration')::int AS proposed_duration,
                (ar.payload->>'proposed_credits')::numeric AS proposed_credits,
                ar.submitted_at, ar.created_at,
                u.name AS instructor_name, u.email AS instructor_email
         FROM kpa_approval_requests ar
         LEFT JOIN users u ON u.id = ar.requester_id
         WHERE ar.entity_type = 'course' AND ar.organization_id = $1 AND ar.status = 'submitted'
         ORDER BY ar.submitted_at ASC`,
        [branchId],
      ),
      this.dataSource.query(
        `SELECT cr.id, cr.instructor_id, cr.proposed_title, cr.proposed_description, cr.proposed_level, cr.proposed_duration,
                cr.proposed_credits, cr.proposed_tags, cr.proposed_metadata, cr.submitted_at, cr.created_at,
                u.name AS instructor_name, u.email AS instructor_email
         FROM kpa_course_requests cr
         LEFT JOIN users u ON u.id = cr.instructor_id
         WHERE cr.organization_id = $1 AND cr.status = 'submitted'
         ORDER BY cr.submitted_at ASC`,
        [branchId],
      ),
    ]);
    return { success: true, data: [...newRows, ...legacyRows] };
  }

  // ── C9: 승인 → Course 생성 (TRANSACTION) ──

  async approve(
    branchId: string,
    requestId: string,
    reviewerId: string,
    userRoles: string[],
    reviewComment?: string,
  ): Promise<{ success: true; data: any } | { success: false; error: any; status: number }> {
    if (!UUID_RE.test(branchId) || !UUID_RE.test(requestId)) {
      return { success: false, error: { code: 'INVALID_ID', message: 'Invalid ID' }, status: 400 };
    }
    if (!(await this.verifyBranchAdmin(reviewerId, branchId, userRoles))) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Branch admin access required' }, status: 403 };
    }

    // Try unified table first
    const [arRow] = await this.dataSource.query(
      `SELECT * FROM kpa_approval_requests WHERE id = $1 AND organization_id = $2 AND entity_type = 'course' LIMIT 1`,
      [requestId, branchId],
    );
    if (arRow) {
      if (arRow.status !== 'submitted') {
        return { success: false, error: { code: 'INVALID_STATUS', message: `현재 상태(${arRow.status})에서는 승인할 수 없습니다` }, status: 400 };
      }
      const payload = typeof arRow.payload === 'string' ? JSON.parse(arRow.payload) : arRow.payload;

      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        await queryRunner.query(
          `UPDATE kpa_approval_requests SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), review_comment = $2, updated_at = NOW() WHERE id = $3`,
          [reviewerId, reviewComment || null, requestId],
        );
        const courseService = CourseService.getInstance();
        const course = await courseService.createCourse({
          title: payload.proposed_title,
          description: payload.proposed_description,
          level: payload.proposed_level?.toUpperCase() as any || 'BEGINNER',
          duration: payload.proposed_duration,
          credits: Number(payload.proposed_credits) || 0,
          tags: payload.proposed_tags || [],
          instructorId: payload.instructor_id || arRow.requester_id,
          organizationId: branchId,
          isOrganizationExclusive: true,
          metadata: { kpaCourseRequestId: requestId, createdVia: 'kpa_extension' },
        });
        await queryRunner.query(
          `UPDATE kpa_approval_requests SET result_entity_id = $1, result_metadata = $2::jsonb, updated_at = NOW() WHERE id = $3`,
          [course.id, JSON.stringify({ courseId: course.id }), requestId],
        );
        await queryRunner.commitTransaction();
        return { success: true, data: { requestId, status: 'approved', createdCourseId: course.id } };
      } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
      } finally {
        await queryRunner.release();
      }
    }

    // Fallback: legacy table
    const [cr] = await this.dataSource.query(
      `SELECT * FROM kpa_course_requests WHERE id = $1 AND organization_id = $2 LIMIT 1`,
      [requestId, branchId],
    );
    if (!cr) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Course request not found' }, status: 404 };
    }
    if (cr.status !== 'submitted') {
      return { success: false, error: { code: 'INVALID_STATUS', message: `현재 상태(${cr.status})에서는 승인할 수 없습니다` }, status: 400 };
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.query(
        `UPDATE kpa_course_requests SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), review_comment = $2, updated_at = NOW() WHERE id = $3`,
        [reviewerId, reviewComment || null, requestId],
      );
      const courseService = CourseService.getInstance();
      const course = await courseService.createCourse({
        title: cr.proposed_title,
        description: cr.proposed_description,
        level: cr.proposed_level?.toUpperCase() as any || 'BEGINNER',
        duration: cr.proposed_duration,
        credits: Number(cr.proposed_credits) || 0,
        tags: cr.proposed_tags || [],
        instructorId: cr.instructor_id,
        organizationId: branchId,
        isOrganizationExclusive: true,
        metadata: { kpaCourseRequestId: requestId, createdVia: 'kpa_extension' },
      });
      await queryRunner.query(
        `UPDATE kpa_course_requests SET created_course_id = $1 WHERE id = $2`,
        [course.id, requestId],
      );
      await queryRunner.commitTransaction();
      return { success: true, data: { requestId, status: 'approved', createdCourseId: course.id } };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ── C10: 거절 ──

  async reject(
    branchId: string,
    requestId: string,
    reviewerId: string,
    userRoles: string[],
    rejectionReason?: string,
  ): Promise<{ success: true; data: any } | { success: false; error: any; status: number }> {
    if (!UUID_RE.test(branchId) || !UUID_RE.test(requestId)) {
      return { success: false, error: { code: 'INVALID_ID', message: 'Invalid ID' }, status: 400 };
    }
    if (!rejectionReason) {
      return { success: false, error: { code: 'REASON_REQUIRED', message: 'rejectionReason is required' }, status: 400 };
    }
    if (!(await this.verifyBranchAdmin(reviewerId, branchId, userRoles))) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Branch admin access required' }, status: 403 };
    }

    // Try unified table first
    const [arRow] = await this.dataSource.query(
      `SELECT id, status FROM kpa_approval_requests WHERE id = $1 AND organization_id = $2 AND entity_type = 'course' LIMIT 1`,
      [requestId, branchId],
    );
    if (arRow) {
      if (arRow.status !== 'submitted') {
        return { success: false, error: { code: 'INVALID_STATUS', message: `현재 상태(${arRow.status})에서는 거절할 수 없습니다` }, status: 400 };
      }
      await this.dataSource.query(
        `UPDATE kpa_approval_requests SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), review_comment = $2, updated_at = NOW() WHERE id = $3`,
        [reviewerId, rejectionReason, requestId],
      );
      return { success: true, data: { requestId, status: 'rejected' } };
    }

    // Fallback: legacy table
    const [cr] = await this.dataSource.query(
      `SELECT id, status FROM kpa_course_requests WHERE id = $1 AND organization_id = $2 LIMIT 1`,
      [requestId, branchId],
    );
    if (!cr) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Course request not found' }, status: 404 };
    }
    if (cr.status !== 'submitted') {
      return { success: false, error: { code: 'INVALID_STATUS', message: `현재 상태(${cr.status})에서는 거절할 수 없습니다` }, status: 400 };
    }
    await this.dataSource.query(
      `UPDATE kpa_course_requests SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), rejection_reason = $2, updated_at = NOW() WHERE id = $3`,
      [reviewerId, rejectionReason, requestId],
    );
    return { success: true, data: { requestId, status: 'rejected' } };
  }

  // ── C11: 보완 요청 ──

  async requestRevision(
    branchId: string,
    requestId: string,
    reviewerId: string,
    userRoles: string[],
    revisionNote?: string,
  ): Promise<{ success: true; data: any } | { success: false; error: any; status: number }> {
    if (!UUID_RE.test(branchId) || !UUID_RE.test(requestId)) {
      return { success: false, error: { code: 'INVALID_ID', message: 'Invalid ID' }, status: 400 };
    }
    if (!revisionNote) {
      return { success: false, error: { code: 'NOTE_REQUIRED', message: 'revisionNote is required' }, status: 400 };
    }
    if (!(await this.verifyBranchAdmin(reviewerId, branchId, userRoles))) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Branch admin access required' }, status: 403 };
    }

    // Try unified table first
    const [arRow] = await this.dataSource.query(
      `SELECT id, status FROM kpa_approval_requests WHERE id = $1 AND organization_id = $2 AND entity_type = 'course' LIMIT 1`,
      [requestId, branchId],
    );
    if (arRow) {
      if (arRow.status !== 'submitted') {
        return { success: false, error: { code: 'INVALID_STATUS', message: `현재 상태(${arRow.status})에서는 보완 요청할 수 없습니다` }, status: 400 };
      }
      await this.dataSource.query(
        `UPDATE kpa_approval_requests SET status = 'revision_requested', reviewed_by = $1, reviewed_at = NOW(), revision_note = $2, updated_at = NOW() WHERE id = $3`,
        [reviewerId, revisionNote, requestId],
      );
      return { success: true, data: { requestId, status: 'revision_requested' } };
    }

    // Fallback: legacy table
    const [cr] = await this.dataSource.query(
      `SELECT id, status FROM kpa_course_requests WHERE id = $1 AND organization_id = $2 LIMIT 1`,
      [requestId, branchId],
    );
    if (!cr) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Course request not found' }, status: 404 };
    }
    if (cr.status !== 'submitted') {
      return { success: false, error: { code: 'INVALID_STATUS', message: `현재 상태(${cr.status})에서는 보완 요청할 수 없습니다` }, status: 400 };
    }
    await this.dataSource.query(
      `UPDATE kpa_course_requests SET status = 'revision_requested', reviewed_by = $1, reviewed_at = NOW(), revision_note = $2, updated_at = NOW() WHERE id = $3`,
      [reviewerId, revisionNote, requestId],
    );
    return { success: true, data: { requestId, status: 'revision_requested' } };
  }
}
