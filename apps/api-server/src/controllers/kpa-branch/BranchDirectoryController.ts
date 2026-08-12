/**
 * BranchDirectoryController — 분회 registry 공개 조회
 * WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1 §2
 *
 * kpa_organizations(type='group', 209행)를 분회 Registry 로 그대로 사용한다.
 * 새 분회 테이블을 만들지 않는다. parent_id 는 표시용으로만 내보낸다.
 */
import type { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import {
  KpaOrganization,
  BRANCH_ORG_TYPE,
} from '../../routes/kpa-branch/entities/kpa-organization.entity.js';

export class BranchDirectoryController {
  /** GET /api/v1/kpa-branch/branches?q=&parentId= — 분회 목록 (public) */
  static async list(req: Request, res: Response) {
    const q = (req.query.q as string | undefined)?.trim();
    const parentId = req.query.parentId as string | undefined;

    const qb = AppDataSource.getRepository(KpaOrganization)
      .createQueryBuilder('o')
      .where('o.type = :type', { type: BRANCH_ORG_TYPE })
      .andWhere('o.is_active = true');

    if (q) qb.andWhere('(o.name ILIKE :q OR o.slug ILIKE :q)', { q: `%${q}%` });
    if (parentId) qb.andWhere('o.parent_id = :parentId', { parentId });

    const items = await qb.orderBy('o.name', 'ASC').getMany();

    return res.json({
      success: true,
      data: items.map((o) => ({
        id: o.id,
        slug: o.slug,
        name: o.name,
        // 표시용. 권한 계산에 사용하지 않는다 (모든 분회는 동급 tenant).
        parentId: o.parent_id,
        address: o.address,
        phone: o.phone,
      })),
    });
  }

  /** GET /api/v1/kpa-branch/branches/:branchSlug — 분회 단건 (public, resolveBranch 후) */
  static async detail(req: Request, res: Response) {
    const branch = req.branch!;
    const org = await AppDataSource.getRepository(KpaOrganization).findOne({ where: { id: branch.id } });
    if (!org) {
      return res.status(404).json({ success: false, error: '분회를 찾을 수 없습니다.', code: 'BRANCH_NOT_FOUND' });
    }
    return res.json({
      success: true,
      data: {
        id: org.id,
        slug: org.slug,
        name: org.name,
        parentId: org.parent_id,
        description: org.description,
        address: org.address,
        phone: org.phone,
        resolvedBy: branch.source,
      },
    });
  }
}
