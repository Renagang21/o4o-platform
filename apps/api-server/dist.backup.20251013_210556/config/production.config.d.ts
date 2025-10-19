import compression from 'compression';
import helmet from 'helmet';
import { Express } from 'express';
export declare const rateLimitConfig: {
    general: import("express-rate-limit").RateLimitRequestHandler;
    auth: import("express-rate-limit").RateLimitRequestHandler;
    financial: import("express-rate-limit").RateLimitRequestHandler;
    webhook: import("express-rate-limit").RateLimitRequestHandler;
};
export declare const securityConfig: {
    helmet: ReturnType<typeof helmet>;
    cors: any;
    compression: ReturnType<typeof compression>;
};
export declare const performanceConfig: {
    database: {
        maxConnections: number;
        minConnections: number;
        acquireTimeout: number;
        timeout: number;
        logQueries: boolean;
    };
    cache: {
        defaultTTL: number;
        maxMemoryUsage: string;
        keyPrefix: string;
        enableCompression: boolean;
    };
    timeout: {
        server: number;
        keepAlive: number;
    };
};
export declare const monitoringConfig: {
    healthCheck: {
        interval: number;
        timeout: number;
    };
    metrics: {
        collectInterval: number;
        retentionPeriod: number;
    };
};
export declare const setupProductionMiddleware: (app: Express) => void;
export declare const setupGracefulShutdown: (server: any) => void;
declare const config: {
    readonly rateLimitConfig: {
        general: import("express-rate-limit").RateLimitRequestHandler;
        auth: import("express-rate-limit").RateLimitRequestHandler;
        financial: import("express-rate-limit").RateLimitRequestHandler;
        webhook: import("express-rate-limit").RateLimitRequestHandler;
    };
    readonly securityConfig: {
        helmet: ReturnType<typeof helmet>;
        cors: any;
        compression: ReturnType<typeof compression>;
    };
    readonly performanceConfig: {
        database: {
            maxConnections: number;
            minConnections: number;
            acquireTimeout: number;
            timeout: number;
            logQueries: boolean;
        };
        cache: {
            defaultTTL: number;
            maxMemoryUsage: string;
            keyPrefix: string;
            enableCompression: boolean;
        };
        timeout: {
            server: number;
            keepAlive: number;
        };
    };
    readonly monitoringConfig: {
        healthCheck: {
            interval: number;
            timeout: number;
        };
        metrics: {
            collectInterval: number;
            retentionPeriod: number;
        };
    };
    readonly setupProductionMiddleware: (app: Express) => void;
    readonly setupGracefulShutdown: (server: any) => void;
};
export default config;
//# sourceMappingURL=production.config.d.ts.map