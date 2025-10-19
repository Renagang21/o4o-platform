"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createValidationError = exports.validateRequest = void 0;
const express_validator_1 = require("express-validator");
const validateRequest = (validations) => {
    return async (req, res, next) => {
        // Run all validations
        await Promise.all(validations.map(validation => validation.run(req)));
        // Check for errors
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid request data',
                    details: errors.array()
                }
            });
        }
        next();
    };
};
exports.validateRequest = validateRequest;
const createValidationError = (message, field) => {
    const error = new Error(message);
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    error.field = field;
    return error;
};
exports.createValidationError = createValidationError;
//# sourceMappingURL=validation.middleware.js.map