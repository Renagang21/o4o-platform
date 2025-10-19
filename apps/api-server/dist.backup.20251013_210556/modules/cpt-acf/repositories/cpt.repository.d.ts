import type { DataSource, EntityManager, Repository } from 'typeorm';
import { CustomPostType } from '../../../entities/CustomPostType';
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
    list: (params?: CptListParams) => Promise<{
        items: CustomPostType[];
        total: number;
        limit: number;
        offset: number;
    }>;
    findBySlug: (slug: string, activeOnly?: boolean) => Promise<CustomPostType | null>;
    existsBySlug: (slug: string) => Promise<boolean>;
    softDeactivateBySlug: (slug: string, m?: EntityManager) => Promise<boolean>;
};
export declare function getCptRepository(ds?: DataSource): CptRepository;
export default getCptRepository;
//# sourceMappingURL=cpt.repository.d.ts.map