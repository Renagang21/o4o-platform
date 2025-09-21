import type { DataSource, EntityManager, Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection';
import { CustomPostType } from '../../../entities/CustomPostType';
import { applyPagination, applySearch, normalizePaging, toPage } from './query-utils';

export interface CptListParams {
  q?: string;
  limit?: number;
  offset?: number;
  sort?: 'createdAt' | 'name';
  order?: 'ASC' | 'DESC';
  activeOnly?: boolean;
}

/**
 * CptRepository
 * Thin data-access layer for CustomPostType entity.
 * Keeps TypeORM specifics encapsulated and provides methods used by services.
 */
export type CptRepository = Repository<CustomPostType> & {
  list: (params?: CptListParams) => Promise<{ items: CustomPostType[]; total: number; limit: number; offset: number }>;
  findBySlug: (slug: string, activeOnly?: boolean) => Promise<CustomPostType | null>;
  existsBySlug: (slug: string) => Promise<boolean>;
  softDeactivateBySlug: (slug: string, m?: EntityManager) => Promise<boolean>;
};

export function getCptRepository(ds: DataSource = AppDataSource): CptRepository {
  const base = ds.getRepository(CustomPostType);
  return base.extend({
    async list(params: CptListParams = {}) {
      const { q, sort = 'createdAt', order = 'DESC', activeOnly = true } = params;
      const paging = normalizePaging({ limit: params.limit, offset: params.offset });
      const qb = base.createQueryBuilder('cpt');
      if (activeOnly) qb.where('cpt.active = :active', { active: true });
      if (q) applySearch(qb, ['cpt.slug ILIKE :q', 'cpt.name ILIKE :q'], q);
      qb.orderBy(`cpt.${sort}`, order);
      applyPagination(qb, paging);
      const [items, total] = await qb.getManyAndCount();
      return toPage(items, total, paging);
    },
    async findBySlug(slug: string, activeOnly = true) {
      return base.findOne({ where: { slug, ...(activeOnly ? { active: true } : {}) } as any });
    },
    async existsBySlug(slug: string) {
      const found = await base.findOne({ where: { slug } });
      return Boolean(found);
    },
    async softDeactivateBySlug(slug: string, m?: EntityManager) {
      const r = m ? m.getRepository(CustomPostType) : base;
      const entity = await r.findOne({ where: { slug } });
      if (!entity) return false;
      (entity as any).active = false;
      await r.save(entity);
      return true;
    },
  }) as CptRepository;
}

export default getCptRepository;
