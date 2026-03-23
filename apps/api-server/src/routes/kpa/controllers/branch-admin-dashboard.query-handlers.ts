/**
 * KPA Branch Admin Dashboard — Query Handlers (GET)
 *
 * WO-O4O-BRANCH-ADMIN-DASHBOARD-CONTROLLER-SPLIT-V1
 * 8 GET handlers extracted from branch-admin-dashboard.controller.ts
 */

import type { Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { KpaMember } from '../entities/kpa-member.entity.js';
import { KpaBranchNews } from '../entities/kpa-branch-news.entity.js';
import { KpaBranchOfficer } from '../entities/kpa-branch-officer.entity.js';
import { KpaBranchDoc } from '../entities/kpa-branch-doc.entity.js';
import { KpaBranchSettings } from '../entities/kpa-branch-settings.entity.js';
import { OrganizationStore } from '../../../modules/store-core/entities/organization-store.entity.js';
import type { AuthRequest } from '../../../types/auth.js';
import logger from '../../../utils/logger.js';
import { getUserOrganizationId } from './branch-admin-dashboard.types.js';
import type { BranchDashboardStats, RecentActivity } from './branch-admin-dashboard.types.js';

/** GET /dashboard/stats */
export function createGetStatsHandler(dataSource: DataSource) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;

      if (!userId) {
        res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'User ID not found' },
        });
        return;
      }

      const organizationId = await getUserOrganizationId(dataSource, userId);

      if (!organizationId) {
        res.json({
          success: true,
          data: {
            totalMembers: 0,
            activeMembers: 0,
          } as BranchDashboardStats,
        });
        return;
      }

      const memberRepo = dataSource.getRepository(KpaMember);

      // WO-O4O-DASHBOARD-QUERY-STABILITY-V1: individual .catch() per query
      const [totalMembers, activeMembers] = await Promise.all([
        memberRepo.count({ where: { organization_id: organizationId } }).catch((e) => { logger.warn('[KpaBranchDashboard] totalMembers failed:', e.message); return 0; }),
        memberRepo.count({ where: { organization_id: organizationId, status: 'active' } }).catch((e) => { logger.warn('[KpaBranchDashboard] activeMembers failed:', e.message); return 0; }),
      ]);

      const stats: BranchDashboardStats = {
        totalMembers,
        activeMembers,
      };

      res.json({ success: true, data: stats });
    } catch (error: any) {
      console.error('Failed to get KPA branch admin dashboard stats:', error);
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  };
}

/** GET /dashboard/activities */
export function createGetActivitiesHandler(dataSource: DataSource) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;

      if (!userId) {
        res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'User ID not found' },
        });
        return;
      }

      const organizationId = await getUserOrganizationId(dataSource, userId);

      if (!organizationId) {
        res.json({ success: true, data: [] });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 10;

      const memberRepo = dataSource.getRepository(KpaMember);
      const recentMembers = await memberRepo.find({
        where: { organization_id: organizationId },
        order: { created_at: 'DESC' },
        take: limit,
      });

      const activities: RecentActivity[] = recentMembers.map((member) => ({
        id: member.id,
        type: 'member_join' as const,
        title: `${member.pharmacy_name || member.license_number || '신규 회원'} - 가입`,
        date: member.created_at?.toISOString() || new Date().toISOString(),
        status: (member.status === 'active' || member.identity_status === 'active') ? 'completed' : 'pending',
      }));

      res.json({ success: true, data: activities });
    } catch (error: any) {
      console.error('Failed to get KPA branch activities:', error);
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  };
}

/** GET /dashboard/members */
export function createGetMemberStatsHandler(dataSource: DataSource) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;

      if (!userId) {
        res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'User ID not found' },
        });
        return;
      }

      const organizationId = await getUserOrganizationId(dataSource, userId);

      if (!organizationId) {
        res.json({
          success: true,
          data: {
            total: 0,
            byStatus: { active: 0, pending: 0, suspended: 0 },
            byRole: { member: 0, operator: 0, admin: 0 },
          },
        });
        return;
      }

      const memberRepo = dataSource.getRepository(KpaMember);

      // WO-O4O-DASHBOARD-QUERY-STABILITY-V1: individual .catch() per query
      const [
        total,
        active,
        pending,
        suspended,
        memberRole,
        operatorRole,
        adminRole,
      ] = await Promise.all([
        memberRepo.count({ where: { organization_id: organizationId } }).catch((e) => { logger.warn('[KpaBranchDashboard] member total failed:', e.message); return 0; }),
        memberRepo.count({ where: { organization_id: organizationId, status: 'active' } }).catch((e) => { logger.warn('[KpaBranchDashboard] member active failed:', e.message); return 0; }),
        memberRepo.count({ where: { organization_id: organizationId, status: 'pending' } }).catch((e) => { logger.warn('[KpaBranchDashboard] member pending failed:', e.message); return 0; }),
        memberRepo.count({ where: { organization_id: organizationId, status: 'suspended' } }).catch((e) => { logger.warn('[KpaBranchDashboard] member suspended failed:', e.message); return 0; }),
        memberRepo.count({ where: { organization_id: organizationId, role: 'member' } }).catch((e) => { logger.warn('[KpaBranchDashboard] role member failed:', e.message); return 0; }),
        memberRepo.count({ where: { organization_id: organizationId, role: 'operator' } }).catch((e) => { logger.warn('[KpaBranchDashboard] role operator failed:', e.message); return 0; }),
        memberRepo.count({ where: { organization_id: organizationId, role: 'admin' } }).catch((e) => { logger.warn('[KpaBranchDashboard] role admin failed:', e.message); return 0; }),
      ]);

      res.json({
        success: true,
        data: {
          total,
          byStatus: { active, pending, suspended },
          byRole: { member: memberRole, operator: operatorRole, admin: adminRole },
        },
      });
    } catch (error: any) {
      console.error('Failed to get KPA branch member stats:', error);
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  };
}

/** GET /news */
export function createListNewsHandler(dataSource: DataSource) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;

      if (!userId) { res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User ID not found' } }); return; }

      const organizationId = await getUserOrganizationId(dataSource, userId);
      if (!organizationId) { res.json({ success: true, data: [] }); return; }

      const repo = dataSource.getRepository(KpaBranchNews);
      const category = req.query.category as string | undefined;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

      const qb = repo.createQueryBuilder('n')
        .where('n.organization_id = :organizationId', { organizationId })
        .andWhere('n.is_deleted = false')
        .orderBy('n.is_pinned', 'DESC')
        .addOrderBy('n.created_at', 'DESC')
        .skip((page - 1) * limit)
        .take(limit);

      if (category) qb.andWhere('n.category = :category', { category });

      const [items, total] = await qb.getManyAndCount();
      res.json({ success: true, data: { items, total, page, limit } });
    } catch (error: any) {
      console.error('Failed to get branch news:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
  };
}

/** GET /members — active members for dropdown */
export function createListMembersHandler(dataSource: DataSource) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;
      if (!userId) { res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User ID not found' } }); return; }

      const organizationId = await getUserOrganizationId(dataSource, userId);
      if (!organizationId) { res.json({ success: true, data: [] }); return; }

      const memberRepo = dataSource.getRepository(KpaMember);
      const members = await memberRepo.find({
        where: { organization_id: organizationId, status: 'active' },
        select: ['id', 'user_id', 'pharmacy_name', 'license_number'],
      });

      // WO-O4O-SERVICE-DATA-ISOLATION-FIX-V1: batch-fetch with service_memberships filter
      const userIds = members.map((m) => m.user_id).filter(Boolean);
      const userNameMap = new Map<string, string>();
      if (userIds.length > 0) {
        const users: Array<{ id: string; name: string }> = await dataSource.query(
          `SELECT u.id, u.name FROM users u
           JOIN service_memberships sm ON sm.user_id = u.id AND sm.service_key = 'kpa-society'
           WHERE u.id = ANY($1)`,
          [userIds],
        );
        for (const u of users) userNameMap.set(u.id, u.name);
      }
      const data = members.map((m) => ({
        id: m.id,
        user_name: userNameMap.get(m.user_id) || 'Unknown',
        pharmacy_name: m.pharmacy_name,
        license_number: m.license_number,
      }));

      res.json({ success: true, data });
    } catch (error: any) {
      console.error('Failed to get members for officer selection:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
  };
}

/** GET /officers */
export function createListOfficersHandler(dataSource: DataSource) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;

      if (!userId) { res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User ID not found' } }); return; }

      const organizationId = await getUserOrganizationId(dataSource, userId);
      if (!organizationId) { res.json({ success: true, data: [] }); return; }

      const repo = dataSource.getRepository(KpaBranchOfficer);
      const items = await repo.find({
        where: { organization_id: organizationId, is_deleted: false },
        order: { sort_order: 'ASC', created_at: 'ASC' },
      });
      res.json({ success: true, data: items });
    } catch (error: any) {
      console.error('Failed to get branch officers:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
  };
}

/** GET /docs */
export function createListDocsHandler(dataSource: DataSource) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;

      if (!userId) { res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User ID not found' } }); return; }

      const organizationId = await getUserOrganizationId(dataSource, userId);
      if (!organizationId) { res.json({ success: true, data: [] }); return; }

      const repo = dataSource.getRepository(KpaBranchDoc);
      const category = req.query.category as string | undefined;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

      const qb = repo.createQueryBuilder('d')
        .where('d.organization_id = :organizationId', { organizationId })
        .andWhere('d.is_deleted = false')
        .orderBy('d.created_at', 'DESC')
        .skip((page - 1) * limit)
        .take(limit);

      if (category) qb.andWhere('d.category = :category', { category });

      const [items, total] = await qb.getManyAndCount();
      res.json({ success: true, data: { items, total, page, limit } });
    } catch (error: any) {
      console.error('Failed to get branch docs:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
  };
}

/** GET /settings */
export function createGetSettingsHandler(dataSource: DataSource) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;

      if (!userId) { res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User ID not found' } }); return; }

      const organizationId = await getUserOrganizationId(dataSource, userId);
      if (!organizationId) { res.status(400).json({ error: { code: 'NO_ORGANIZATION', message: 'User not associated with an organization' } }); return; }

      const repo = dataSource.getRepository(KpaBranchSettings);
      let settings = await repo.findOne({ where: { organization_id: organizationId } });

      // Auto-create settings row if it doesn't exist
      if (!settings) {
        settings = repo.create({ organization_id: organizationId });
        settings = await repo.save(settings);
      }

      // Also return organization basic info
      const orgRepo = dataSource.getRepository(OrganizationStore);
      const org = await orgRepo.findOne({ where: { id: organizationId } });

      res.json({ success: true, data: { settings, organization: org } });
    } catch (error: any) {
      console.error('Failed to get branch settings:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
  };
}
