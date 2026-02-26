import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../database/connection.js';
import { User } from '../modules/auth/entities/User.js';
import { UserRole } from '../types/auth.js';
import logger from '../utils/logger.js';

// Extend Request type to include user
declare global {
    namespace Express {
        interface Request {
            user?: User;
        }
    }
}

/**
 * Dev Test Token Middleware
 * 
 * Allows automated agents to bypass UI login in DEVELOPMENT environment only.
 * Secured by multiple gates:
 * 1. Env Var Enabled check
 * 2. Production Guard (Hard stop)
 * 3. Token Match
 * 4. Origin Match (Exact)
 * 5. Role Whitelist
 */
export const devTestTokenMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const isEnabled = process.env.DEV_TEST_TOKEN_ENABLED === 'true';
    const isProduction = process.env.NODE_ENV === 'production';

    // GUARD: Production Safety Check
    if (isProduction && isEnabled) {
        logger.error('CRITICAL: DEV_TEST_TOKEN_ENABLED is true in PRODUCTION. Shutting down request blocking.');
        // We throw error to ensure this is noticed immediately
        throw new Error('DEV_TEST_TOKEN_ENABLED must not be enabled in production environment');
    }

    // Fast exit if not enabled
    if (!isEnabled) {
        return next();
    }

    const tokenHeader = req.headers['x-dev-test-token'];
    const originHeader = req.headers['origin'];
    const roleHeader = req.headers['x-dev-test-as'];

    // Fast exit if no dev token provided
    if (!tokenHeader) {
        return next();
    }

    // 1. Token Check
    const validToken = process.env.DEV_TEST_TOKEN;
    if (!validToken || tokenHeader !== validToken) {
        // If they tried to use the header but failed token, we strictly reject (don't fall back to normal auth helps debugging)
        // Or we can fall back. Let's fall back to normal auth but log warn.
        logger.warn('[DevToken] Invalid token attempt');
        return next();
    }

    // 2. Origin Check (Strict Exact Match)
    const allowedOriginsRaw = process.env.DEV_TEST_ALLOWED_ORIGINS || 'https://dev-admin.neture.co.kr';
    const allowedOrigins = allowedOriginsRaw.split(',').map(o => o.trim());

    if (!originHeader || !allowedOrigins.includes(originHeader as string)) {
        logger.warn(`[DevToken] Origin mismatch: ${originHeader}`);
        return next();
    }

    // 3. Role Whitelist
    if (roleHeader !== 'admin' && roleHeader !== 'seller') {
        logger.warn(`[DevToken] Invalid role requested: ${roleHeader}`);
        return next();
    }

    // ALL GATES PASSED - Proceed to Bypass
    logger.info(`[DevToken] Bypass authorized for role: ${roleHeader}`);

    try {
        const userRepo = AppDataSource.getRepository(User);
        let targetUser: User | null = null;

        if (roleHeader === 'admin') {
            // Find the admin user
            targetUser = await userRepo.findOne({
                where: { email: 'admin@neture.co.kr' },
                relations: ['linkedAccounts'] // mimic auth middleware
            });

            if (!targetUser) {
                logger.error('[DevToken] Admin user not found despite valid token');
                return res.status(500).json({ code: 'DEV_CONFIG_ERROR', message: 'Admin user missing' });
            }
        } else if (roleHeader === 'seller') {
            // Phase3-E: role is no longer a DB column, use RoleAssignment EXISTS subquery
            targetUser = await userRepo.createQueryBuilder('user')
                .where('user."isActive" = true')
                .andWhere(`EXISTS (SELECT 1 FROM role_assignments ra WHERE ra.user_id = user.id AND ra.is_active = true AND ra.role = :role)`, { role: UserRole.SELLER })
                .getOne();

            if (!targetUser) {
                // Fallback: try to find admin and pretend? No, seller verification needs seller data.
                logger.error('[DevToken] No active seller user found for testing');
                return res.status(500).json({ code: 'DEV_CONFIG_ERROR', message: 'No seller user found' });
            }
        }

        if (targetUser && targetUser.isActive) {
            // Inject User - mirroring the shape in auth.middleware
            req.user = targetUser;

            // Explicitly mark as authenticated for downstream
            logger.info(`[DevToken] User injected: ${targetUser.id} (${targetUser.email})`);
        }

        return next();
    } catch (err) {
        logger.error('[DevToken] Injection error', err);
        return next();
    }
};
