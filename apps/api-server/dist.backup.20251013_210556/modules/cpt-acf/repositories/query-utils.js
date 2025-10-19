"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toPage = exports.applySearch = exports.applyPagination = exports.normalizePaging = void 0;
function normalizePaging(params) {
    var _a, _b, _c, _d;
    if (!params)
        return { limit: 20, offset: 0 };
    if (typeof params.page !== 'undefined' || typeof params.per_page !== 'undefined') {
        const per = Number((_a = params.per_page) !== null && _a !== void 0 ? _a : 20);
        const page = Number((_b = params.page) !== null && _b !== void 0 ? _b : 1);
        return { limit: per, offset: (page - 1) * per };
    }
    return { limit: Number((_c = params.limit) !== null && _c !== void 0 ? _c : 20), offset: Number((_d = params.offset) !== null && _d !== void 0 ? _d : 0) };
}
exports.normalizePaging = normalizePaging;
function applyPagination(qb, paging) {
    qb.skip(paging.offset).take(paging.limit);
}
exports.applyPagination = applyPagination;
function applySearch(qb, clauses, paramValue) {
    if (!paramValue)
        return;
    const where = `(${clauses.join(' OR ')})`;
    qb.andWhere(where, { q: `%${paramValue}%` });
}
exports.applySearch = applySearch;
function toPage(items, total, paging) {
    return { items, total, limit: paging.limit, offset: paging.offset };
}
exports.toPage = toPage;
//# sourceMappingURL=query-utils.js.map