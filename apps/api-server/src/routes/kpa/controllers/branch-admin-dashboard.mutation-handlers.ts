/**
 * KPA Branch Admin Dashboard — Mutation Handlers (POST/PATCH/DELETE)
 *
 * WO-O4O-BRANCH-ADMIN-DASHBOARD-CONTROLLER-SPLIT-V1
 * 11 mutation handlers extracted from branch-admin-dashboard.controller.ts
 */

import type { Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { KpaMember } from '../entities/kpa-member.entity.js';
import { KpaBranchNews } from '../entities/kpa-branch-news.entity.js';
import { KpaBranchOfficer } from '../entities/kpa-branch-officer.entity.js';
import { KpaBranchDoc } from '../entities/kpa-branch-doc.entity.js';
import { KpaBranchSettings } from '../entities/kpa-branch-settings.entity.js';
import type { AuthRequest } from '../../../types/auth.js';
import { getUserOrganizationId, writeAuditLog } from './branch-admin-dashboard.types.js';

// ──────────────────────────────────────────────────────
// News Mutations
// ──────────────────────────────────────────────────────

/** POST /news */
export function createCreateNewsHandler(dataSource: DataSource) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;

      if (!userId) { res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User ID not found' } }); return; }

      const organizationId = await getUserOrganizationId(dataSource, userId);
      if (!organizationId) { res.status(400).json({ error: { code: 'NO_ORGANIZATION', message: 'User not associated with an organization' } }); return; }

      const { title, content, category, is_pinned, is_published } = req.body;
      if (!title) { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'title is required' } }); return; }

      const repo = dataSource.getRepository(KpaBranchNews);
      const news = repo.create({
        organization_id: organizationId,
        title,
        content: content || null,
        category: category || 'notice',
        author: authReq.user?.name || null,
        author_id: userId,
        is_pinned: is_pinned ?? false,
        is_published: is_published ?? true,
      });
      const saved = await repo.save(news);
      await writeAuditLog(dataSource, authReq.user, 'CONTENT_CREATED', 'branch_news', saved.id, { title, organizationId });
      res.status(201).json({ success: true, data: saved });
    } catch (error: any) {
      console.error('Failed to create branch news:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
  };
}

/** PATCH /news/:id */
export function createUpdateNewsHandler(dataSource: DataSource) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;

      if (!userId) { res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User ID not found' } }); return; }

      const organizationId = await getUserOrganizationId(dataSource, userId);
      if (!organizationId) { res.status(400).json({ error: { code: 'NO_ORGANIZATION', message: 'User not associated with an organization' } }); return; }

      const repo = dataSource.getRepository(KpaBranchNews);
      const existing = await repo.findOne({ where: { id: req.params.id, organization_id: organizationId, is_deleted: false } });
      if (!existing) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'News not found' } }); return; }

      const { title, content, category, is_pinned, is_published } = req.body;
      if (title !== undefined) existing.title = title;
      if (content !== undefined) existing.content = content;
      if (category !== undefined) existing.category = category;
      if (is_pinned !== undefined) existing.is_pinned = is_pinned;
      if (is_published !== undefined) existing.is_published = is_published;

      const saved = await repo.save(existing);
      await writeAuditLog(dataSource, authReq.user, 'CONTENT_UPDATED', 'branch_news', saved.id, { title: saved.title, organizationId });
      res.json({ success: true, data: saved });
    } catch (error: any) {
      console.error('Failed to update branch news:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
  };
}

/** DELETE /news/:id */
export function createDeleteNewsHandler(dataSource: DataSource) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;

      if (!userId) { res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User ID not found' } }); return; }

      const organizationId = await getUserOrganizationId(dataSource, userId);
      if (!organizationId) { res.status(400).json({ error: { code: 'NO_ORGANIZATION', message: 'User not associated with an organization' } }); return; }

      const repo = dataSource.getRepository(KpaBranchNews);
      const existing = await repo.findOne({ where: { id: req.params.id, organization_id: organizationId, is_deleted: false } });
      if (!existing) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'News not found' } }); return; }

      existing.is_deleted = true;
      await repo.save(existing);
      await writeAuditLog(dataSource, authReq.user, 'CONTENT_DELETED', 'branch_news', existing.id, { title: existing.title, organizationId });
      res.json({ success: true, data: { deleted: true } });
    } catch (error: any) {
      console.error('Failed to delete branch news:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
  };
}

// ──────────────────────────────────────────────────────
// Officers Mutations
// ──────────────────────────────────────────────────────

/** POST /officers */
export function createCreateOfficerHandler(dataSource: DataSource) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;

      if (!userId) { res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User ID not found' } }); return; }

      const organizationId = await getUserOrganizationId(dataSource, userId);
      if (!organizationId) { res.status(400).json({ error: { code: 'NO_ORGANIZATION', message: 'User not associated with an organization' } }); return; }

      const { member_id, position, role, phone, email, term_start, term_end, is_active, sort_order } = req.body;
      if (!member_id || !position || !role) { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'member_id, position, role are required' } }); return; }

      // Verify member exists in same organization
      const memberRepo = dataSource.getRepository(KpaMember);
      const member = await memberRepo.findOne({
        where: { id: member_id, organization_id: organizationId, status: 'active' },
      });
      if (!member) { res.status(404).json({ error: { code: 'MEMBER_NOT_FOUND', message: 'Member not found in this organization' } }); return; }

      // WO-O4O-SERVICE-DATA-ISOLATION-FIX-V1: derive name with service_memberships filter
      const [memberUser] = await dataSource.query(
        `SELECT u.name, u.email FROM users u
         JOIN service_memberships sm ON sm.user_id = u.id AND sm.service_key = 'kpa-society'
         WHERE u.id = $1`,
        [member.user_id],
      ) as Array<{ name: string; email: string }>;

      const repo = dataSource.getRepository(KpaBranchOfficer);
      const officer = repo.create({
        organization_id: organizationId,
        member_id,
        name: memberUser?.name || 'Unknown',
        position, role,
        pharmacy_name: member.pharmacy_name || null,
        phone: phone ? phone.replace(/\D/g, '') : null,
        email: email || memberUser?.email || null,
        term_start: term_start || null,
        term_end: term_end || null,
        is_active: is_active ?? true,
        sort_order: sort_order ?? 0,
      });
      const saved = await repo.save(officer);
      await writeAuditLog(dataSource, authReq.user, 'OFFICER_CREATED', 'branch_officer', saved.id, { member_id, name: saved.name, position, organizationId });
      res.status(201).json({ success: true, data: saved });
    } catch (error: any) {
      console.error('Failed to create branch officer:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
  };
}

/** PATCH /officers/:id */
export function createUpdateOfficerHandler(dataSource: DataSource) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;

      if (!userId) { res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User ID not found' } }); return; }

      const organizationId = await getUserOrganizationId(dataSource, userId);
      if (!organizationId) { res.status(400).json({ error: { code: 'NO_ORGANIZATION', message: 'User not associated with an organization' } }); return; }

      const repo = dataSource.getRepository(KpaBranchOfficer);
      const existing = await repo.findOne({ where: { id: req.params.id, organization_id: organizationId, is_deleted: false } });
      if (!existing) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Officer not found' } }); return; }

      // If member_id changed, re-derive name/pharmacy_name
      if (req.body.member_id && req.body.member_id !== existing.member_id) {
        const memberRepo = dataSource.getRepository(KpaMember);
        const member = await memberRepo.findOne({
          where: { id: req.body.member_id, organization_id: organizationId, status: 'active' },
        });
        if (!member) { res.status(404).json({ error: { code: 'MEMBER_NOT_FOUND', message: 'Member not found in this organization' } }); return; }

        // WO-O4O-SERVICE-DATA-ISOLATION-FIX-V1: derive name with service_memberships filter
        const [memberUser] = await dataSource.query(
          `SELECT u.name FROM users u
           JOIN service_memberships sm ON sm.user_id = u.id AND sm.service_key = 'kpa-society'
           WHERE u.id = $1`,
          [member.user_id],
        ) as Array<{ name: string }>;
        existing.member_id = member.id;
        existing.name = memberUser?.name || existing.name;
        existing.pharmacy_name = member.pharmacy_name || existing.pharmacy_name;
      }

      const fields = ['position', 'role', 'phone', 'email', 'term_start', 'term_end', 'is_active', 'sort_order'] as const;
      for (const f of fields) {
        if (req.body[f] !== undefined) (existing as any)[f] = req.body[f];
      }
      // Normalize phone (digits only)
      if (existing.phone) existing.phone = existing.phone.replace(/\D/g, '');

      const saved = await repo.save(existing);
      await writeAuditLog(dataSource, authReq.user, 'OFFICER_UPDATED', 'branch_officer', saved.id, { name: saved.name, organizationId });
      res.json({ success: true, data: saved });
    } catch (error: any) {
      console.error('Failed to update branch officer:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
  };
}

/** DELETE /officers/:id */
export function createDeleteOfficerHandler(dataSource: DataSource) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;

      if (!userId) { res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User ID not found' } }); return; }

      const organizationId = await getUserOrganizationId(dataSource, userId);
      if (!organizationId) { res.status(400).json({ error: { code: 'NO_ORGANIZATION', message: 'User not associated with an organization' } }); return; }

      const repo = dataSource.getRepository(KpaBranchOfficer);
      const existing = await repo.findOne({ where: { id: req.params.id, organization_id: organizationId, is_deleted: false } });
      if (!existing) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Officer not found' } }); return; }

      existing.is_deleted = true;
      await repo.save(existing);
      await writeAuditLog(dataSource, authReq.user, 'OFFICER_DELETED', 'branch_officer', existing.id, { name: existing.name, organizationId });
      res.json({ success: true, data: { deleted: true } });
    } catch (error: any) {
      console.error('Failed to delete branch officer:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
  };
}

// ──────────────────────────────────────────────────────
// Docs Mutations
// ──────────────────────────────────────────────────────

/** POST /docs */
export function createCreateDocHandler(dataSource: DataSource) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;

      if (!userId) { res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User ID not found' } }); return; }

      const organizationId = await getUserOrganizationId(dataSource, userId);
      if (!organizationId) { res.status(400).json({ error: { code: 'NO_ORGANIZATION', message: 'User not associated with an organization' } }); return; }

      const { title, description, category, file_url, file_name, file_size, is_public } = req.body;
      if (!title) { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'title is required' } }); return; }

      const repo = dataSource.getRepository(KpaBranchDoc);
      const doc = repo.create({
        organization_id: organizationId,
        title,
        description: description || null,
        category: category || 'general',
        file_url: file_url || null,
        file_name: file_name || null,
        file_size: file_size || 0,
        is_public: is_public ?? true,
        uploaded_by: userId,
      });
      const saved = await repo.save(doc);
      await writeAuditLog(dataSource, authReq.user, 'DOC_CREATED', 'branch_doc', saved.id, { title, organizationId });
      res.status(201).json({ success: true, data: saved });
    } catch (error: any) {
      console.error('Failed to create branch doc:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
  };
}

/** PATCH /docs/:id */
export function createUpdateDocHandler(dataSource: DataSource) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;

      if (!userId) { res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User ID not found' } }); return; }

      const organizationId = await getUserOrganizationId(dataSource, userId);
      if (!organizationId) { res.status(400).json({ error: { code: 'NO_ORGANIZATION', message: 'User not associated with an organization' } }); return; }

      const repo = dataSource.getRepository(KpaBranchDoc);
      const existing = await repo.findOne({ where: { id: req.params.id, organization_id: organizationId, is_deleted: false } });
      if (!existing) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Doc not found' } }); return; }

      const fields = ['title', 'description', 'category', 'file_url', 'file_name', 'file_size', 'is_public'] as const;
      for (const f of fields) {
        if (req.body[f] !== undefined) (existing as any)[f] = req.body[f];
      }

      const saved = await repo.save(existing);
      await writeAuditLog(dataSource, authReq.user, 'DOC_UPDATED', 'branch_doc', saved.id, { title: saved.title, organizationId });
      res.json({ success: true, data: saved });
    } catch (error: any) {
      console.error('Failed to update branch doc:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
  };
}

/** DELETE /docs/:id */
export function createDeleteDocHandler(dataSource: DataSource) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;

      if (!userId) { res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User ID not found' } }); return; }

      const organizationId = await getUserOrganizationId(dataSource, userId);
      if (!organizationId) { res.status(400).json({ error: { code: 'NO_ORGANIZATION', message: 'User not associated with an organization' } }); return; }

      const repo = dataSource.getRepository(KpaBranchDoc);
      const existing = await repo.findOne({ where: { id: req.params.id, organization_id: organizationId, is_deleted: false } });
      if (!existing) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Doc not found' } }); return; }

      existing.is_deleted = true;
      await repo.save(existing);
      await writeAuditLog(dataSource, authReq.user, 'DOC_DELETED', 'branch_doc', existing.id, { title: existing.title, organizationId });
      res.json({ success: true, data: { deleted: true } });
    } catch (error: any) {
      console.error('Failed to delete branch doc:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
  };
}

// ──────────────────────────────────────────────────────
// Settings Mutations
// ──────────────────────────────────────────────────────

/** PATCH /settings */
export function createUpdateSettingsHandler(dataSource: DataSource) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;

      if (!userId) { res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User ID not found' } }); return; }

      const organizationId = await getUserOrganizationId(dataSource, userId);
      if (!organizationId) { res.status(400).json({ error: { code: 'NO_ORGANIZATION', message: 'User not associated with an organization' } }); return; }

      const repo = dataSource.getRepository(KpaBranchSettings);
      let settings = await repo.findOne({ where: { organization_id: organizationId } });
      if (!settings) {
        settings = repo.create({ organization_id: organizationId });
      }

      const fields = ['address', 'phone', 'fax', 'email', 'working_hours', 'description',
        'membership_fee_deadline', 'annual_report_deadline', 'fee_settings'] as const;
      for (const f of fields) {
        if (req.body[f] !== undefined) (settings as any)[f] = req.body[f];
      }
      // Normalize phone/fax (digits only)
      if (settings.phone) settings.phone = settings.phone.replace(/\D/g, '');
      if (settings.fax) settings.fax = settings.fax.replace(/\D/g, '');

      const saved = await repo.save(settings);
      res.json({ success: true, data: saved });
    } catch (error: any) {
      console.error('Failed to update branch settings:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
  };
}

/** PATCH /settings/status */
export function createUpdateSettingsStatusHandler(dataSource: DataSource) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;

      if (!userId) { res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User ID not found' } }); return; }

      const organizationId = await getUserOrganizationId(dataSource, userId);
      if (!organizationId) { res.status(400).json({ error: { code: 'NO_ORGANIZATION', message: 'User not associated with an organization' } }); return; }

      const { is_active } = req.body;
      if (typeof is_active !== 'boolean') { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'is_active (boolean) is required' } }); return; }

      const repo = dataSource.getRepository(KpaBranchSettings);
      let settings = await repo.findOne({ where: { organization_id: organizationId } });
      if (!settings) {
        settings = repo.create({ organization_id: organizationId });
      }
      settings.is_active = is_active;
      const saved = await repo.save(settings);

      res.json({ success: true, data: saved });
    } catch (error: any) {
      console.error('Failed to update branch status:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
  };
}
