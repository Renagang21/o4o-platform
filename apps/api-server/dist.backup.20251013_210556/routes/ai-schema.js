"use strict";
/**
 * AI Schema Routes
 * Sprint 2 - P2: JSON Schema validation endpoint (SSOT)
 *
 * Provides JSON Schema for AI output validation with ETag caching
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rateLimit_middleware_1 = require("../middleware/rateLimit.middleware");
const ai_output_schema_1 = require("../schemas/ai-output.schema");
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
// AI schema endpoint rate limit (generous for read-only reference)
const aiSchemaRateLimit = (0, rateLimit_middleware_1.rateLimitMiddleware)({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute per user
    message: 'AI schema requests exceeded. Please try again later.',
    keyGenerator: (req) => {
        var _a;
        const authReq = req;
        return `ai:schema:${((_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId) || req.ip || 'anonymous'}`;
    }
});
/**
 * GET /api/ai/schema
 * Returns JSON Schema for AI output validation
 *
 * Features:
 * - ETag caching (304 Not Modified for unchanged schema)
 * - schemaVersion tracking
 * - lastUpdated timestamp
 * - JWT authentication required
 */
router.get('/', auth_middleware_1.authenticate, aiSchemaRateLimit, async (req, res) => {
    var _a, _b, _c, _d, _e, _f;
    const authReq = req;
    const startTime = Date.now();
    try {
        // Generate ETag from schemaVersion (schema version serves as unique identifier)
        const etag = `"${ai_output_schema_1.AI_OUTPUT_SCHEMA_VERSION}"`;
        // Check client ETag (304 Not Modified)
        const clientEtag = req.headers['if-none-match'];
        if (clientEtag === etag) {
            const duration = Date.now() - startTime;
            logger_1.default.info('AI schema - 304 Not Modified', {
                userId: (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId,
                userEmail: (_b = authReq.user) === null || _b === void 0 ? void 0 : _b.email,
                route: '/api/ai/schema',
                method: 'GET',
                status: 304,
                etag,
                schemaVersion: ai_output_schema_1.AI_OUTPUT_SCHEMA_VERSION,
                duration: `${duration}ms`,
                timestamp: new Date().toISOString()
            });
            return res.status(304).set({
                'Cache-Control': 'public, max-age=3600', // 1 hour caching
                'ETag': etag
            }).end();
        }
        // Return schema with caching headers
        res.set({
            'Cache-Control': 'public, max-age=3600', // 1 hour caching
            'ETag': etag,
            'Content-Type': 'application/json'
        });
        const duration = Date.now() - startTime;
        logger_1.default.info('AI schema - Success', {
            userId: (_c = authReq.user) === null || _c === void 0 ? void 0 : _c.userId,
            userEmail: (_d = authReq.user) === null || _d === void 0 ? void 0 : _d.email,
            route: '/api/ai/schema',
            method: 'GET',
            status: 200,
            etag,
            schemaVersion: ai_output_schema_1.AI_OUTPUT_SCHEMA_VERSION,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString()
        });
        res.json({
            success: true,
            data: {
                schema: ai_output_schema_1.AI_OUTPUT_JSON_SCHEMA,
                metadata: ai_output_schema_1.AI_OUTPUT_SCHEMA_METADATA,
                migrations: ai_output_schema_1.SCHEMA_MIGRATIONS, // Sprint 3: Migration history
                deprecations: ai_output_schema_1.SCHEMA_DEPRECATIONS // Sprint 3: Deprecated fields
            }
        });
    }
    catch (error) {
        const duration = Date.now() - startTime;
        logger_1.default.error('AI schema error', {
            userId: (_e = authReq.user) === null || _e === void 0 ? void 0 : _e.userId,
            userEmail: (_f = authReq.user) === null || _f === void 0 ? void 0 : _f.email,
            route: '/api/ai/schema',
            method: 'GET',
            status: 500,
            error: error.message,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString()
        });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch AI output schema',
            message: error.message
        });
    }
});
/**
 * GET /api/ai/schema/version
 * Returns current schema version (lightweight endpoint)
 */
router.get('/version', auth_middleware_1.authenticate, aiSchemaRateLimit, async (req, res) => {
    var _a, _b;
    const authReq = req;
    try {
        res.json({
            success: true,
            data: {
                schemaVersion: ai_output_schema_1.AI_OUTPUT_SCHEMA_VERSION,
                lastUpdated: ai_output_schema_1.AI_OUTPUT_SCHEMA_METADATA.lastUpdated
            }
        });
        logger_1.default.info('AI schema version check', {
            userId: (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId,
            schemaVersion: ai_output_schema_1.AI_OUTPUT_SCHEMA_VERSION
        });
    }
    catch (error) {
        logger_1.default.error('AI schema version error', {
            userId: (_b = authReq.user) === null || _b === void 0 ? void 0 : _b.userId,
            error: error.message
        });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch schema version'
        });
    }
});
/**
 * GET /api/ai/schema/history
 * Sprint 3: Get schema version history with migrations and changes
 * Returns full migration history with diffs between versions
 */
router.get('/history', auth_middleware_1.authenticate, aiSchemaRateLimit, async (req, res) => {
    var _a, _b;
    const authReq = req;
    try {
        // Build version history from migrations
        const versions = [
            {
                version: ai_output_schema_1.AI_OUTPUT_SCHEMA_VERSION,
                releaseDate: ai_output_schema_1.AI_OUTPUT_SCHEMA_METADATA.lastUpdated,
                current: true,
                deprecations: ai_output_schema_1.SCHEMA_DEPRECATIONS.filter(d => d.deprecatedIn === ai_output_schema_1.AI_OUTPUT_SCHEMA_VERSION),
                breaking: false,
            }
        ];
        // Add historical versions from migrations
        ai_output_schema_1.SCHEMA_MIGRATIONS.forEach(migration => {
            const existingVersion = versions.find(v => v.version === migration.fromVersion);
            if (!existingVersion) {
                versions.push({
                    version: migration.fromVersion,
                    releaseDate: migration.date,
                    current: false,
                    changes: [],
                    breaking: false,
                });
            }
            versions.push({
                version: migration.toVersion,
                releaseDate: migration.date,
                current: migration.toVersion === ai_output_schema_1.AI_OUTPUT_SCHEMA_VERSION,
                changes: migration.changes,
                breaking: migration.breaking,
                migrationGuide: migration.migrationGuide,
                deprecations: ai_output_schema_1.SCHEMA_DEPRECATIONS.filter(d => d.deprecatedIn === migration.toVersion),
            });
        });
        // Sort by version (newest first)
        versions.sort((a, b) => b.version.localeCompare(a.version));
        logger_1.default.info('AI schema history retrieved', {
            userId: (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId,
            totalVersions: versions.length,
        });
        res.json({
            success: true,
            data: {
                versions,
                currentVersion: ai_output_schema_1.AI_OUTPUT_SCHEMA_VERSION,
                totalMigrations: ai_output_schema_1.SCHEMA_MIGRATIONS.length,
                totalDeprecations: ai_output_schema_1.SCHEMA_DEPRECATIONS.length,
            }
        });
    }
    catch (error) {
        logger_1.default.error('AI schema history error', {
            userId: (_b = authReq.user) === null || _b === void 0 ? void 0 : _b.userId,
            error: error.message,
        });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch schema history',
        });
    }
});
exports.default = router;
//# sourceMappingURL=ai-schema.js.map