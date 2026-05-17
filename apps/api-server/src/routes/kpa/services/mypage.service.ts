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
      nickname: fullUser?.nickname || null,
      email: fullUser?.email || '',
      phone: fullUser?.phone || '',
      roles: roles,

      // User type flags
      userType: {
        isSuperOperator,
        isPharmacyOwner,
        isOfficer,
      },

      // Pharmacist info (약사 정보) — kpa_members 보유자 본인의 profession 데이터
      // WO-O4O-KPA-MYPROFILE-PHARMACIST-GATE-RELAX-V1:
      //   role(admin/operator) 과 profession(pharmacist) 을 분리. visibility gate 를
      //   role 기반(!isSuperOperator) → profession 기반(kpaMember 존재) 으로 정렬.
      //   admin/operator 겸직 약사 사용자가 본인 면허/출신교/근무처를 못 보던 버그 수정.
      // FIX-O4O-MYPAGE-PROFILE-COLUMN-ROUTING-V1:
      //   university 는 kpa_members.university_name 컬럼이 SSOT (User 에는 컬럼 없음)
      //   workplace 는 User.businessInfo.metadata.workplace JSONB 슬롯에 저장
      //   기존 코드가 fullUser.university / fullUser.workplace 를 읽어 항상 null 반환하던 버그 수정
      pharmacist: kpaMember ? {
        licenseNumber: kpaMember?.license_number || null,
        university: kpaMember?.university_name || null,
        workplace: fullUser?.businessInfo?.metadata?.workplace || null,
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
   *
   * FIX-O4O-MYPAGE-PROFILE-COLUMN-ROUTING-V1:
   *   university / workplace 는 User entity 컬럼이 아니므로 직접 update 하면
   *   TypeORM EntityPropertyNotFoundError → 500. 각 필드의 SSOT 위치로 라우팅한다.
   *   - name/lastName/firstName/nickname/phone → users 테이블
   *   - university                              → kpa_members.university_name (KpaMember 존재 시)
   *   - workplace                               → users.businessInfo.metadata.workplace (JSONB merge)
   */
  async updateProfile(
    userId: string,
    data: { name?: string; lastName?: string; firstName?: string; nickname?: string; phone?: string; university?: string; workplace?: string },
    currentUser: any,
  ): Promise<any> {
    const userRepository = this.dataSource.getRepository('User');

    // 1) users 테이블 컬럼만 updateData 에 모은다 (university/workplace 는 별도 처리).
    const updateData: Record<string, any> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.nickname !== undefined) updateData.nickname = data.nickname;
    if (data.phone !== undefined) updateData.phone = data.phone ? data.phone.replace(/\D/g, '') : data.phone;

    // workplace → businessInfo.metadata.workplace (JSONB). 기존 businessInfo 와 병합.
    if (data.workplace !== undefined) {
      const existing = await userRepository.findOne({ where: { id: userId } }) as any;
      const bi = (existing?.businessInfo as any) || {};
      const meta = (bi.metadata as Record<string, any> | undefined) || {};
      updateData.businessInfo = {
        ...bi,
        metadata: { ...meta, workplace: data.workplace || null },
      };
    }

    // lastName/firstName 둘 중 하나만 와도 name 자동 생성
    if (data.lastName !== undefined || data.firstName !== undefined) {
      const newLastName = data.lastName ?? currentUser.lastName ?? '';
      const newFirstName = data.firstName ?? currentUser.firstName ?? '';
      updateData.name = `${newLastName}${newFirstName}`.trim() || updateData.name;
    }

    if (Object.keys(updateData).length > 0) {
      await userRepository.update(userId, updateData);
    }

    // 2) university → kpa_members.university_name (KpaMember 존재 시에만)
    //    학생/약사 회원이 아닌 사용자는 university 저장 위치가 없으므로 silently no-op.
    if (data.university !== undefined) {
      try {
        const kpaMemberRepository = this.dataSource.getRepository('KpaMember');
        const member = await kpaMemberRepository.findOne({ where: { user_id: userId } }) as any;
        if (member) {
          await kpaMemberRepository.update(member.id, { university_name: data.university || null });
        }
      } catch {
        // KpaMember 미가입 또는 update 실패 시에도 users 업데이트 결과는 그대로 반환
      }
    }

    // Fetch updated user
    const updatedUser = await userRepository.findOne({ where: { id: userId } }) as any;

    return {
      id: updatedUser?.id,
      name: updatedUser?.name || '',
      lastName: updatedUser?.lastName || '',
      firstName: updatedUser?.firstName || '',
      nickname: updatedUser?.nickname || null,
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
