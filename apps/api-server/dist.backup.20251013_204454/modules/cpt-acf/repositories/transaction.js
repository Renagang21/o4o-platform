"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withTransaction = void 0;
async function withTransaction(ds, fn) {
    return ds.transaction(fn);
}
exports.withTransaction = withTransaction;
//# sourceMappingURL=transaction.js.map