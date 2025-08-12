"use strict";
/**
 * Request validation middleware
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = validateRequest;
const express_validator_1 = require("express-validator");
function validateRequest(req, res, next) {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors.array()
        });
        return;
    }
    next();
}
//# sourceMappingURL=validateRequest.js.map