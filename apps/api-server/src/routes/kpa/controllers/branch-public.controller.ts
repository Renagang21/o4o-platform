/**
 * KPA Branch Public Controller
 *
 * Public (no auth) read-only endpoints for branch pages.
 * Frontend branchApi calls /api/v1/kpa/branches/:branchId/*
 *
 * branchId can be a UUID (direct) or a slug/name matched via ILIKE.
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { OrganizationStore } from '../entities/organization-store.entity.js';
import { KpaBranchNews } from '../entities/kpa-branch-news.entity.js';
import { KpaBranchOfficer } from '../entities/kpa-branch-officer.entity.js';
import { KpaBranchDoc } from '../entities/kpa-branch-doc.entity.js';
import { KpaBranchSettings } from '../entities/kpa-branch-settings.entity.js';
import { KpaMember } from '../entities/kpa-member.entity.js';

// UUID v4 regex for detecting direct ID lookups
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Known branch slug → display name map (matches frontend BRANCH_NAMES)
const BRANCH_DISPLAY_NAMES: Record<string, string> = {
  demo: '데모',
  gangnam: '강남',
  gangbuk: '강북',
  gangdong: '강동',
  gangseo: '강서',
  gwanak: '관악',
  dongjak: '동작',
  mapo: '마포',
  seodaemun: '서대문',
  seongbuk: '성북',
  yeongdeungpo: '영등포',
  yongsan: '용산',
  eunpyeong: '은평',
  jongno: '종로',
  junggu: '중구',
};

/** Resolved branch — either a real DB org or a virtual placeholder */
interface ResolvedBranch {
  id: string;        // UUID or slug
  name: string;
  type: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  isVirtual: boolean; // true → no DB record, data queries return empty
}

/**
 * Resolve branchId param → branch info.
 * Tries UUID first, then case-insensitive name match.
 * Falls back to a virtual branch so pages render with empty data instead of 404.
 */
async function resolveBranch(
  dataSource: DataSource,
  branchId: string,
): Promise<ResolvedBranch> {
  const repo = dataSource.getRepository(OrganizationStore);

  // Try UUID lookup
  if (UUID_RE.test(branchId)) {
    const org = await repo.findOne({ where: { id: branchId, isActive: true } });
    if (org) {
      return { id: org.id, name: org.name, type: org.type, description: org.description, address: org.address, phone: org.phone, isVirtual: false };
    }
  } else {
    // Slug / name lookup – match name ignoring case
    const org = await repo
      .createQueryBuilder('o')
      .where('o.isActive = true')
      .andWhere('LOWER(o.name) = LOWER(:name)', { name: branchId })
      .getOne();
    if (org) {
      return { id: org.id, name: org.name, type: org.type, description: org.description, address: org.address, phone: org.phone, isVirtual: false };
    }
  }

  // No DB record — return virtual branch so pages render with empty data
  const displayName = BRANCH_DISPLAY_NAMES[branchId.toLowerCase()] || branchId;
  return {
    id: branchId,
    name: displayName,
    type: 'branch',
    description: null,
    address: null,
    phone: null,
    isVirtual: true,
  };
}

export function createBranchPublicController(dataSource: DataSource): Router {
  const router = Router();

  // ──────────────────────────────────────────────────────
  // GET /branches/:branchId — branch info
  // ──────────────────────────────────────────────────────
  router.get(
    '/:branchId',
    async (req: Request, res: Response): Promise<void> => {
      try {
        const branch = await resolveBranch(dataSource, req.params.branchId);

        if (branch.isVirtual) {
          res.json({
            success: true,
            data: {
              id: branch.id,
              name: branch.name,
              type: branch.type,
              description: null,
              address: null,
              phone: null,
              email: null,
              memberCount: 0,
              establishedDate: null,
              region: branch.name,
            },
          });
          return;
        }

        // Enrich with settings & member count for real branches
        const settings = await dataSource.getRepository(KpaBranchSettings)
          .findOne({ where: { organization_id: branch.id } });

        const memberCount = await dataSource.getRepository(KpaMember)
          .count({ where: { organization_id: branch.id, status: 'active' as any } });

        res.json({
          success: true,
          data: {
            id: branch.id,
            name: branch.name,
            type: branch.type,
            description: settings?.description || branch.description || null,
            address: settings?.address || branch.address || null,
            phone: settings?.phone || branch.phone || null,
            email: settings?.email || null,
            memberCount,
            establishedDate: null,
            region: branch.name,
          },
        });
      } catch (error: any) {
        console.error('Failed to get branch info:', error);
        res.status(500).json({ success: false, error: { message: error.message } });
      }
    },
  );

  // ──────────────────────────────────────────────────────
  // GET /branches/:branchId/news — published news
  // ──────────────────────────────────────────────────────
  router.get(
    '/:branchId/news',
    async (req: Request, res: Response): Promise<void> => {
      try {
        const branch = await resolveBranch(dataSource, req.params.branchId);

        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
        const category = req.query.category as string | undefined;

        if (branch.isVirtual) {
          res.json({ success: true, data: { items: [], total: 0, page, totalPages: 0 } });
          return;
        }

        const qb = dataSource.getRepository(KpaBranchNews)
          .createQueryBuilder('n')
          .where('n.organization_id = :orgId', { orgId: branch.id })
          .andWhere('n.is_published = true')
          .andWhere('n.is_deleted = false')
          .orderBy('n.is_pinned', 'DESC')
          .addOrderBy('n.created_at', 'DESC')
          .skip((page - 1) * limit)
          .take(limit);

        if (category && category !== 'all') {
          qb.andWhere('n.category = :category', { category });
        }

        const [items, total] = await qb.getManyAndCount();

        res.json({
          success: true,
          data: {
            items,
            total,
            page,
            totalPages: Math.ceil(total / limit),
          },
        });
      } catch (error: any) {
        console.error('Failed to get branch news:', error);
        res.status(500).json({ success: false, error: { message: error.message } });
      }
    },
  );

  // ──────────────────────────────────────────────────────
  // GET /branches/:branchId/news/:id — news detail
  // ──────────────────────────────────────────────────────
  router.get(
    '/:branchId/news/:id',
    async (req: Request, res: Response): Promise<void> => {
      try {
        const branch = await resolveBranch(dataSource, req.params.branchId);
        if (branch.isVirtual) {
          res.status(404).json({ success: false, error: { message: 'News not found' } });
          return;
        }

        const news = await dataSource.getRepository(KpaBranchNews).findOne({
          where: { id: req.params.id, organization_id: branch.id, is_published: true, is_deleted: false },
        });
        if (!news) {
          res.status(404).json({ success: false, error: { message: 'News not found' } });
          return;
        }

        // Increment view count (fire and forget)
        dataSource.getRepository(KpaBranchNews)
          .increment({ id: news.id }, 'view_count', 1)
          .catch(() => {});

        res.json({ success: true, data: news });
      } catch (error: any) {
        console.error('Failed to get branch news detail:', error);
        res.status(500).json({ success: false, error: { message: error.message } });
      }
    },
  );

  // ──────────────────────────────────────────────────────
  // GET /branches/:branchId/officers — active officers
  // ──────────────────────────────────────────────────────
  router.get(
    '/:branchId/officers',
    async (req: Request, res: Response): Promise<void> => {
      try {
        const branch = await resolveBranch(dataSource, req.params.branchId);
        if (branch.isVirtual) {
          res.json({ success: true, data: [] });
          return;
        }

        const officers = await dataSource.getRepository(KpaBranchOfficer).find({
          where: { organization_id: branch.id, is_active: true, is_deleted: false },
          order: { sort_order: 'ASC', created_at: 'ASC' },
        });

        res.json({ success: true, data: officers });
      } catch (error: any) {
        console.error('Failed to get branch officers:', error);
        res.status(500).json({ success: false, error: { message: error.message } });
      }
    },
  );

  // ──────────────────────────────────────────────────────
  // GET /branches/:branchId/resources — public docs
  // ──────────────────────────────────────────────────────
  router.get(
    '/:branchId/resources',
    async (req: Request, res: Response): Promise<void> => {
      try {
        const branch = await resolveBranch(dataSource, req.params.branchId);

        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
        const category = req.query.category as string | undefined;

        if (branch.isVirtual) {
          res.json({ success: true, data: { items: [], total: 0, page, totalPages: 0 } });
          return;
        }

        const qb = dataSource.getRepository(KpaBranchDoc)
          .createQueryBuilder('d')
          .where('d.organization_id = :orgId', { orgId: branch.id })
          .andWhere('d.is_public = true')
          .andWhere('d.is_deleted = false')
          .orderBy('d.created_at', 'DESC')
          .skip((page - 1) * limit)
          .take(limit);

        if (category && category !== 'all') {
          qb.andWhere('d.category = :category', { category });
        }

        const [items, total] = await qb.getManyAndCount();

        res.json({
          success: true,
          data: {
            items,
            total,
            page,
            totalPages: Math.ceil(total / limit),
          },
        });
      } catch (error: any) {
        console.error('Failed to get branch resources:', error);
        res.status(500).json({ success: false, error: { message: error.message } });
      }
    },
  );

  // ──────────────────────────────────────────────────────
  // GET /branches/:branchId/contact — contact info
  // ──────────────────────────────────────────────────────
  router.get(
    '/:branchId/contact',
    async (req: Request, res: Response): Promise<void> => {
      try {
        const branch = await resolveBranch(dataSource, req.params.branchId);

        if (branch.isVirtual) {
          res.json({
            success: true,
            data: {
              address: null,
              phone: null,
              fax: null,
              email: null,
              workingHours: '평일 09:00 - 18:00',
            },
          });
          return;
        }

        const settings = await dataSource.getRepository(KpaBranchSettings)
          .findOne({ where: { organization_id: branch.id } });

        res.json({
          success: true,
          data: {
            address: settings?.address || branch.address || null,
            phone: settings?.phone || branch.phone || null,
            fax: settings?.fax || null,
            email: settings?.email || null,
            workingHours: settings?.working_hours || '평일 09:00 - 18:00',
          },
        });
      } catch (error: any) {
        console.error('Failed to get branch contact:', error);
        res.status(500).json({ success: false, error: { message: error.message } });
      }
    },
  );

  // ──────────────────────────────────────────────────────
  // GET /branches/:branchId/forum/posts — forum posts (stub)
  // Forum data comes from the platform Forum module, not branch entities.
  // Return empty until forum-branch integration is built.
  // ──────────────────────────────────────────────────────
  router.get(
    '/:branchId/forum/posts',
    async (req: Request, res: Response): Promise<void> => {
      try {
        // Forum posts are managed by the platform Forum module.
        // Returning empty paginated result until branch-forum integration.
        res.json({
          success: true,
          data: {
            items: [],
            total: 0,
            page: 1,
            totalPages: 0,
          },
        });
      } catch (error: any) {
        console.error('Failed to get branch forum posts:', error);
        res.status(500).json({ success: false, error: { message: error.message } });
      }
    },
  );

  // ──────────────────────────────────────────────────────
  // GET /branches/:branchId/groupbuys — groupbuys (stub)
  // ──────────────────────────────────────────────────────
  router.get(
    '/:branchId/groupbuys',
    async (_req: Request, res: Response): Promise<void> => {
      res.json({ success: true, data: { items: [], total: 0, page: 1, totalPages: 0 } });
    },
  );

  router.get(
    '/:branchId/groupbuys/history',
    async (_req: Request, res: Response): Promise<void> => {
      res.json({ success: true, data: { items: [], total: 0, page: 1, totalPages: 0 } });
    },
  );

  router.get(
    '/:branchId/groupbuys/:id',
    async (_req: Request, res: Response): Promise<void> => {
      res.status(404).json({ success: false, error: { message: 'Groupbuy not found' } });
    },
  );

  return router;
}
