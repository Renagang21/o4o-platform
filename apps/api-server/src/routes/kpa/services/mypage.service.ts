/**
 * KPA Mypage Service
 *
 * WO-O4O-ROUTES-REFACTOR-V1: Extracted from kpa.routes.ts (lines 2601-2781)
 *
 * Responsibilities:
 * - User profile retrieval (User + KpaMember + OrganizationMember)
 * - Profile update (name, phone)
 * - Settings placeholder
 * - Activities / summary placeholder
 * - Groupbuys placeholder
 */

import type { DataSource } from 'typeorm';

export class MypageService {
  constructor(private dataSource: DataSource) {}

  /**
   * GET /profile — Full user profile with pharmacist/pharmacy/organization info
   *
   * WO-KPA-A-ADMIN-OPERATOR-REALIGNMENT-V1: KPA roles only
   */
  async getProfile(userId: string): Promise<any> {
    // Fetch full user data from database
    const userRepository = this.dataSource.getRepository('User');
    const fullUser = await userRepository.findOne({ where: { id: userId } }) as any;

    // Fetch KpaMember data (pharmacist/pharmacy info)
    let kpaMember: any = null;
    try {
      const kpaMemberRepository = this.dataSource.getRepository('KpaMember');
      kpaMember = await kpaMemberRepository.findOne({
        where: { user_id: userId },
        relations: ['organization']
      });
    } catch {
      // KpaMember may not exist for all users
    }

    // Fetch OrganizationMember data (officer info)
    let organizationMemberships: any[] = [];
    try {
      const orgMemberRepository = this.dataSource.getRepository('OrganizationMember');
      organizationMemberships = await orgMemberRepository.find({
        where: { userId },
        relations: ['organization']
      });
    } catch {
      // OrganizationMember may not exist
    }

    // Determine user type based on roles
    const roles: string[] = fullUser?.roles || [];
    // WO-KPA-A-ADMIN-OPERATOR-REALIGNMENT-V1: KPA roles only
    const isSuperOperator = roles.some((r: string) =>
      ['kpa:admin', 'kpa:operator'].includes(r)
    );
    const isPharmacyOwner = kpaMember?.pharmacy_name ? true : false;
    const isOfficer = organizationMemberships.some((m: any) =>
      ['admin', 'manager', 'chair', 'officer'].includes(m.role)
    );

    return {
      // Basic info (all users)
      id: fullUser?.id,
      name: fullUser?.name || '',
      lastName: fullUser?.lastName || '',
      firstName: fullUser?.firstName || '',
      email: fullUser?.email || '',
      phone: fullUser?.phone || '',
      roles: roles,

      // User type flags
      userType: {
        isSuperOperator,
        isPharmacyOwner,
        isOfficer,
      },

      // Pharmacist info (약사 정보) - Super Operator가 아닌 경우에만
      pharmacist: !isSuperOperator ? {
        licenseNumber: kpaMember?.license_number || null,
        university: fullUser?.university || null,
        workplace: fullUser?.workplace || null,
      } : null,

      // Pharmacy info (약국 정보) - 약국개설자인 경우에만
      pharmacy: isPharmacyOwner ? {
        name: kpaMember?.pharmacy_name || null,
        address: kpaMember?.pharmacy_address || null,
      } : null,

      // Business info (사업장/근무지 정보) — users.businessInfo JSONB
      businessInfo: fullUser?.businessInfo || null,

      // Organization/Officer info (조직/임원 정보)
      organizations: organizationMemberships.map((m: any) => ({
        id: m.organization?.id,
        name: m.organization?.name,
        type: m.organization?.type,
        role: m.role,
        position: m.metadata?.position || null,
      })),
    };
  }

  /**
   * PUT /profile — Update user profile fields
   */
  async updateProfile(
    userId: string,
    data: { name?: string; lastName?: string; firstName?: string; phone?: string; university?: string; workplace?: string },
    currentUser: any,
  ): Promise<any> {
    const userRepository = this.dataSource.getRepository('User');

    // Build update object with only provided fields
    const updateData: Record<string, any> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.phone !== undefined) updateData.phone = data.phone ? data.phone.replace(/\D/g, '') : data.phone;
    if (data.university !== undefined) updateData.university = data.university;
    if (data.workplace !== undefined) updateData.workplace = data.workplace;

    // If lastName and firstName provided, auto-generate name
    if (data.lastName !== undefined || data.firstName !== undefined) {
      const newLastName = data.lastName ?? currentUser.lastName ?? '';
      const newFirstName = data.firstName ?? currentUser.firstName ?? '';
      updateData.name = `${newLastName}${newFirstName}`.trim() || updateData.name;
    }

    await userRepository.update(userId, updateData);

    // Fetch updated user
    const updatedUser = await userRepository.findOne({ where: { id: userId } }) as any;

    return {
      id: updatedUser?.id,
      name: updatedUser?.name || '',
      lastName: updatedUser?.lastName || '',
      firstName: updatedUser?.firstName || '',
      email: updatedUser?.email || '',
      phone: updatedUser?.phone || '',
    };
  }

  /**
   * GET /settings — User settings (placeholder)
   */
  getSettings(): any {
    return {
      emailNotifications: true,
      smsNotifications: false,
      marketingConsent: false,
    };
  }

  /**
   * PUT /settings — Update settings (placeholder)
   */
  updateSettings(): { message: string } {
    return { message: 'Settings update - Integration pending' };
  }

  /**
   * GET /activities — User activities (placeholder)
   */
  getActivities(): { data: any[]; pagination: any } {
    return {
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  }

  /**
   * GET /summary — User summary stats (placeholder)
   */
  getSummary(): any {
    return {
      enrolledCourses: 0,
      completedCourses: 0,
      certificates: 0,
      forumPosts: 0,
      groupbuyParticipations: 0,
    };
  }

  /**
   * GET /groupbuys — User groupbuys (placeholder)
   */
  getGroupbuys(): { data: any[]; pagination: any } {
    return {
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
  }

  /**
   * GET /my-requests — 통합 승인 요청 조회
   * WO-KPA-A-MYPAGE-UNIFIED-REQUEST-INBOX-V1
   */
  async listMyRequests(
    userId: string,
    filters?: { entityType?: string; status?: string },
  ): Promise<any[]> {
    let sql = `SELECT id, entity_type, organization_id, payload, status,
               requester_name, review_comment, revision_note, reviewed_at,
               result_entity_id, result_metadata,
               submitted_at, created_at, updated_at
               FROM kpa_approval_requests WHERE requester_id = $1`;
    const params: any[] = [userId];
    let idx = 2;

    if (filters?.entityType) {
      sql += ` AND entity_type = $${idx++}`;
      params.push(filters.entityType);
    }
    if (filters?.status) {
      sql += ` AND status = $${idx++}`;
      params.push(filters.status);
    }

    sql += ` ORDER BY created_at DESC LIMIT 50`;

    try {
      const rows = await this.dataSource.query(sql, params);
      return rows.map((r: any) => {
        const payload = typeof r.payload === 'string' ? JSON.parse(r.payload) : (r.payload || {});
        return {
          id: r.id,
          entityType: r.entity_type,
          status: r.status,
          displayTitle: payload.name || payload.proposed_title || payload.specialization || '요청',
          displayDescription: payload.description || payload.proposed_description || '',
          reviewComment: r.review_comment,
          revisionNote: r.revision_note,
          reviewedAt: r.reviewed_at,
          resultEntityId: r.result_entity_id,
          resultMetadata: typeof r.result_metadata === 'string' ? JSON.parse(r.result_metadata) : r.result_metadata,
          submittedAt: r.submitted_at,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          payload,
        };
      });
    } catch {
      return [];
    }
  }
}
