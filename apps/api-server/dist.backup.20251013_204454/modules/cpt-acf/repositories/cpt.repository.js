"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCptRepository = void 0;
const connection_1 = require("../../../database/connection");
const CustomPostType_1 = require("../../../entities/CustomPostType");
const query_utils_1 = require("./query-utils");
function getCptRepository(ds = connection_1.AppDataSource) {
    const base = ds.getRepository(CustomPostType_1.CustomPostType);
    return base.extend({
        async list(params = {}) {
            const { q, sort = 'createdAt', order = 'DESC', activeOnly = true } = params;
            const paging = (0, query_utils_1.normalizePaging)({ limit: params.limit, offset: params.offset });
            const qb = base.createQueryBuilder('cpt');
            if (activeOnly)
                qb.where('cpt.active = :active', { active: true });
            if (q)
                (0, query_utils_1.applySearch)(qb, ['cpt.slug ILIKE :q', 'cpt.name ILIKE :q'], q);
            qb.orderBy(`cpt.${sort}`, order);
            (0, query_utils_1.applyPagination)(qb, paging);
            const [items, total] = await qb.getManyAndCount();
            return (0, query_utils_1.toPage)(items, total, paging);
        },
        async findBySlug(slug, activeOnly = true) {
            return base.findOne({ where: { slug, ...(activeOnly ? { active: true } : {}) } });
        },
        async existsBySlug(slug) {
            const found = await base.findOne({ where: { slug } });
            return Boolean(found);
        },
        async softDeactivateBySlug(slug, m) {
            const r = m ? m.getRepository(CustomPostType_1.CustomPostType) : base;
            const entity = await r.findOne({ where: { slug } });
            if (!entity)
                return false;
            entity.active = false;
            await r.save(entity);
            return true;
        },
    });
}
exports.getCptRepository = getCptRepository;
exports.default = getCptRepository;
//# sourceMappingURL=cpt.repository.js.map