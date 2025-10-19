"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendError = void 0;
const errors_1 = require("../errors");
function sendError(res, err) {
    if (err instanceof errors_1.ValidationError) {
        return res.status(400).json({ success: false, message: err.message, details: err.details });
    }
    if (err instanceof errors_1.NotFoundError) {
        return res.status(404).json({ success: false, message: err.message });
    }
    if (err instanceof errors_1.ConflictError) {
        return res.status(409).json({ success: false, message: err.message });
    }
    if (err instanceof errors_1.ForbiddenError) {
        return res.status(403).json({ success: false, message: err.message });
    }
    const msg = typeof (err === null || err === void 0 ? void 0 : err.message) === 'string' ? err.message : 'Internal Server Error';
    return res.status(500).json({ success: false, message: msg });
}
exports.sendError = sendError;
//# sourceMappingURL=http-utils.js.map