/**
 * KPA Branch Member Service
 *
 * WO-O4O-ROUTES-REFACTOR-V1
 * Extracted from kpa.routes.ts lines 185-558 — branch member workflow + district hierarchy
 *
 * Responsibilities:
 * - Branch admin verification
 * - Pending member dual-query (unified + legacy tables)
 * - Approve / reject member with transaction support
 * - District hierarchy summaries (branches-summary, overview-summary)
 */

import type { DataSource, QueryRunner } from 'typeorm';
import { OrganizationStore } from '../../../modules/store-core/entities/organization-store.entity.js';

export class BranchMemberService {
  constructor(private dataSource: DataSource) {}

  // ─── Branch admin 권한 검증 ───────────────────────────────────────

  async verifyBranchAdmin(
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

  // ─── Pending members (dual-query: unified + legacy) ───────────────

  async getPendingMembers(branchId: string): Promise<any[]> {
    const [newRows, legacyRows] = await Promise.all([
      this.dataSource.query(`
        SELECT
          ar.id           AS "requestId",
          ar.requester_id AS "userId",
          u.name,
          u.email         AS "contactEmail",
          ar.payload->>'requested_role' AS "requestedRole",
          ar.payload->>'request_type'   AS "requestType",
          ar.created_at   AS "requestedAt",
          m.activity_type AS "activityType"
        FROM kpa_approval_requests ar
        JOIN users u ON u.id = ar.requester_id
        LEFT JOIN kpa_members m ON m.user_id = ar.requester_id AND m.organization_id = ar.organization_id
        WHERE ar.entity_type = 'membership' AND ar.organization_id = $1 AND ar.status = 'pending'
        ORDER BY ar.created_at ASC
      `, [branchId]),
      this.dataSource.query(`
        SELECT
          r.id            AS "requestId",
          r.user_id       AS "userId",
          u.name,
          u.email         AS "contactEmail",
          r.requested_role AS "requestedRole",
          r.request_type  AS "requestType",
          r.created_at    AS "requestedAt",
          m.activity_type AS "activityType"
        FROM kpa_organization_join_requests r
        JOIN users u ON u.id = r.user_id
        LEFT JOIN kpa_members m ON m.user_id = r.user_id AND m.organization_id = r.organization_id
        WHERE r.organization_id = $1
          AND r.status = 'pending'
        ORDER BY r.created_at ASC
      `, [branchId]),
    ]);

    return [...newRows, ...legacyRows];
  }

  // ─── Approve member (TRANSACTION, dual-table lookup) ──────────────

  async approveMember(
    branchId: string,
    requestId: string,
    reviewerId: string,
  ): Promise<{ requestId: string; status: string }> {
    // Helper: approve logic (shared between unified and legacy)
    const approveMemberInner = async (
      qr: QueryRunner,
      userId: string,
      requestedRole: string,
    ) => {
      const [existingMember] = await qr.query(
        `SELECT id FROM organization_members WHERE "organizationId" = $1 AND "userId" = $2 AND "leftAt" IS NULL`,
        [branchId, userId],
      );
      if (!existingMember) {
        await qr.query(
          `INSERT INTO organization_members (id, "organizationId", "userId", role, "isPrimary", "joinedAt", "createdAt", "updatedAt")
           VALUES (gen_random_uuid(), $1, $2, $3, false, NOW(), NOW(), NOW())`,
          [branchId, userId, requestedRole || 'member'],
        );
      }
      await qr.query(
        `UPDATE users SET status = 'active', "isActive" = true, "approvedAt" = NOW(), "approvedBy" = $2
         WHERE id = $1 AND status != 'active'`,
        [userId, reviewerId],
      );
    };

    // Try unified table first
    const [arRow] = await this.dataSource.query(
      `SELECT id, requester_id, payload FROM kpa_approval_requests WHERE id = $1 AND organization_id = $2 AND entity_type = 'membership' AND status = 'pending' LIMIT 1`,
      [requestId, branchId],
    );
    if (arRow) {
      const payload = typeof arRow.payload === 'string' ? JSON.parse(arRow.payload) : arRow.payload;
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        await queryRunner.query(
          `UPDATE kpa_approval_requests SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), updated_at = NOW() WHERE id = $2`,
          [reviewerId, requestId],
        );
        await approveMemberInner(queryRunner, arRow.requester_id, payload?.requested_role);
        // Store result
        const [newMember] = await queryRunner.query(
          `SELECT id FROM organization_members WHERE "organizationId" = $1 AND "userId" = $2 AND "leftAt" IS NULL LIMIT 1`,
          [branchId, arRow.requester_id],
        );
        if (newMember) {
          await queryRunner.query(
            `UPDATE kpa_approval_requests SET result_entity_id = $1, updated_at = NOW() WHERE id = $2`,
            [newMember.id, requestId],
          );
        }
        await queryRunner.commitTransaction();
        return { requestId, status: 'approved' };
      } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
      } finally {
        await queryRunner.release();
      }
    }

    // Fallback: legacy table
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const [request] = await queryRunner.query(
        `SELECT id, user_id, organization_id, requested_role, request_type, status
         FROM kpa_organization_join_requests
         WHERE id = $1 AND organization_id = $2 AND status = 'pending'`,
        [requestId, branchId],
      );
      if (!request) {
        await queryRunner.rollbackTransaction();
        return null as any; // signals 409 to controller
      }
      await queryRunner.query(
        `UPDATE kpa_organization_join_requests SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), updated_at = NOW() WHERE id = $2`,
        [reviewerId, requestId],
      );
      await approveMemberInner(queryRunner, request.user_id, request.requested_role);
      await queryRunner.commitTransaction();
      return { requestId, status: 'approved' };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ─── Reject member (dual-table lookup) ────────────────────────────

  async rejectMember(
    branchId: string,
    requestId: string,
    reviewerId: string,
  ): Promise<{ requestId: string; status: string } | null> {
    // Try unified table first
    const [arRow] = await this.dataSource.query(
      `SELECT id FROM kpa_approval_requests WHERE id = $1 AND organization_id = $2 AND entity_type = 'membership' AND status = 'pending' LIMIT 1`,
      [requestId, branchId],
    );
    if (arRow) {
      await this.dataSource.query(
        `UPDATE kpa_approval_requests SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), updated_at = NOW() WHERE id = $2`,
        [reviewerId, requestId],
      );
      return { requestId, status: 'rejected' };
    }

    // Fallback: legacy table
    const [request] = await this.dataSource.query(
      `SELECT id FROM kpa_organization_join_requests WHERE id = $1 AND organization_id = $2 AND status = 'pending'`,
      [requestId, branchId],
    );
    if (!request) {
      return null; // signals 409 to controller
    }
    await this.dataSource.query(
      `UPDATE kpa_organization_join_requests SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), updated_at = NOW() WHERE id = $2`,
      [reviewerId, requestId],
    );
    return { requestId, status: 'rejected' };
  }

  // ─── District branches summary ────────────────────────────────────

  async getBranchesSummary(districtId: string): Promise<{
    district: { id: string; name: string };
    branches: Array<{
      id: string;
      name: string;
      type: string;
      memberCount: number;
      pendingCount: number;
      recentActivityCount: number;
    }>;
    totalBranches: number;
  } | null> {
    // 지부(district) 존재 확인
    const orgRepo = this.dataSource.getRepository(OrganizationStore);
    const district = await orgRepo.findOne({ where: { id: districtId, isActive: true } });
    if (!district) {
      return null; // signals 404 to controller
    }

    // N+1 free 단일 쿼리: 산하 분회 + 회원/대기/최근활동 집계
    const branches: Array<{
      id: string;
      name: string;
      type: string;
      memberCount: string;
      pendingCount: string;
      recentActivityCount: string;
    }> = await this.dataSource.query(`
      SELECT
        o.id,
        o.name,
        o.type,
        COALESCE(ms.active_count, 0) AS "memberCount",
        COALESCE(ms.pending_count, 0) AS "pendingCount",
        COALESCE(ns.recent_count, 0) AS "recentActivityCount"
      FROM organizations o
      LEFT JOIN (
        SELECT organization_id,
          COUNT(*) FILTER (WHERE status = 'active') AS active_count,
          COUNT(*) FILTER (WHERE status = 'pending') AS pending_count
        FROM kpa_members
        GROUP BY organization_id
      ) ms ON ms.organization_id = o.id
      LEFT JOIN (
        SELECT organization_id,
          COUNT(*) AS recent_count
        FROM kpa_branch_news
        WHERE is_deleted = false AND created_at > NOW() - INTERVAL '30 days'
        GROUP BY organization_id
      ) ns ON ns.organization_id = o.id
      WHERE o."parentId" = $1
        AND o."isActive" = true
      ORDER BY o.name ASC
    `, [districtId]);

    return {
      district: { id: district.id, name: district.name },
      branches: branches.map(b => ({
        id: b.id,
        name: b.name,
        type: b.type,
        memberCount: Number(b.memberCount),
        pendingCount: Number(b.pendingCount),
        recentActivityCount: Number(b.recentActivityCount),
      })),
      totalBranches: branches.length,
    };
  }

  // ─── District overview summary (KPI) ──────────────────────────────

  async getOverviewSummary(districtId: string): Promise<{
    district: { id: string; name: string };
    totals: {
      totalBranches: number;
      totalMembers: number;
      totalPending: number;
      totalRecentActivity: number;
    };
  } | null> {
    // 지부(district) 존재 확인
    const orgRepo = this.dataSource.getRepository(OrganizationStore);
    const district = await orgRepo.findOne({ where: { id: districtId, isActive: true } });
    if (!district) {
      return null; // signals 404 to controller
    }

    // N+1 free 단일 쿼리: 산하 분회 집계 totals
    const [totals] = await this.dataSource.query(`
      SELECT
        COUNT(DISTINCT o.id) AS "totalBranches",
        COALESCE(SUM(ms.active_count), 0) AS "totalMembers",
        COALESCE(SUM(ms.pending_count), 0) AS "totalPending",
        COALESCE(SUM(ns.recent_count), 0) AS "totalRecentActivity"
      FROM organizations o
      LEFT JOIN (
        SELECT organization_id,
          COUNT(*) FILTER (WHERE status = 'active') AS active_count,
          COUNT(*) FILTER (WHERE status = 'pending') AS pending_count
        FROM kpa_members
        GROUP BY organization_id
      ) ms ON ms.organization_id = o.id
      LEFT JOIN (
        SELECT organization_id,
          COUNT(*) AS recent_count
        FROM kpa_branch_news
        WHERE is_deleted = false AND created_at > NOW() - INTERVAL '30 days'
        GROUP BY organization_id
      ) ns ON ns.organization_id = o.id
      WHERE o."parentId" = $1
        AND o."isActive" = true
    `, [districtId]);

    return {
      district: { id: district.id, name: district.name },
      totals: {
        totalBranches: Number(totals?.totalBranches || 0),
        totalMembers: Number(totals?.totalMembers || 0),
        totalPending: Number(totals?.totalPending || 0),
        totalRecentActivity: Number(totals?.totalRecentActivity || 0),
      },
    };
  }
}
