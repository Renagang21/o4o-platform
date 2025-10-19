"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheService = exports.CacheService = exports.CacheKeys = void 0;
const redis_service_1 = require("./redis.service");
const logger_1 = __importDefault(require("../utils/logger"));
var CacheKeys;
(function (CacheKeys) {
    // Vendor caching
    CacheKeys["VENDOR_LIST"] = "vendor:list";
    CacheKeys["VENDOR_DETAILS"] = "vendor:details";
    CacheKeys["VENDOR_STATS"] = "vendor:stats";
    CacheKeys["VENDOR_COMMISSION"] = "vendor:commission";
    // Supplier caching  
    CacheKeys["SUPPLIER_LIST"] = "supplier:list";
    CacheKeys["SUPPLIER_DETAILS"] = "supplier:details";
    CacheKeys["SUPPLIER_PRODUCTS"] = "supplier:products";
    CacheKeys["SUPPLIER_SETTLEMENT"] = "supplier:settlement";
    // Commission caching
    CacheKeys["COMMISSION_STATS"] = "commission:stats";
    CacheKeys["COMMISSION_HISTORY"] = "commission:history";
    CacheKeys["SETTLEMENT_STATS"] = "settlement:stats";
    // Analytics caching
    CacheKeys["PERFORMANCE_STATS"] = "analytics:performance";
    CacheKeys["ERROR_STATS"] = "analytics:errors";
    CacheKeys["DASHBOARD_DATA"] = "dashboard:data";
    // Product caching
    CacheKeys["PRODUCT_LIST"] = "product:list";
    CacheKeys["INVENTORY_STATUS"] = "inventory:status";
    CacheKeys["STOCK_ALERTS"] = "stock:alerts";
})(CacheKeys || (exports.CacheKeys = CacheKeys = {}));
class CacheService {
    constructor() {
        this.defaultTTL = 300; // 5 minutes default
        this.compressionThreshold = 1024; // 1KB
        this.redis = new redis_service_1.RedisService();
    }
    // Generic cache methods
    async get(key) {
        try {
            const cached = await this.redis.get(key);
            if (!cached) {
                return null;
            }
            // Check if compressed
            if (cached.startsWith('COMPRESSED:')) {
                const compressed = cached.substring(11);
                const decompressed = this.decompress(compressed);
                return JSON.parse(decompressed);
            }
            return JSON.parse(cached);
        }
        catch (error) {
            logger_1.default.error('Cache get error:', { key, error });
            return null;
        }
    }
    async set(key, value, options = {}) {
        try {
            const ttl = options.ttl || this.defaultTTL;
            let serialized = JSON.stringify(value);
            // Compress if large
            if (options.compress && serialized.length > this.compressionThreshold) {
                serialized = 'COMPRESSED:' + this.compress(serialized);
            }
            await this.redis.setex(key, ttl, serialized);
            // Store cache tags for invalidation
            if (options.tags && options.tags.length > 0) {
                await this.storeCacheTags(key, options.tags, ttl);
            }
            return true;
        }
        catch (error) {
            logger_1.default.error('Cache set error:', { key, error });
            return false;
        }
    }
    async del(key) {
        try {
            await this.redis.del(key);
            return true;
        }
        catch (error) {
            logger_1.default.error('Cache delete error:', { key, error });
            return false;
        }
    }
    // Alias for del method to match expected interface
    async delete(key) {
        return this.del(key);
    }
    async invalidateByTag(tag) {
        try {
            const keys = await this.redis.smembers(`tag:${tag}`);
            if (keys.length === 0) {
                return 0;
            }
            // Delete all keys with this tag
            await this.redis.del(...keys);
            // Clean up tag set
            await this.redis.del(`tag:${tag}`);
            logger_1.default.info(`Invalidated ${keys.length} cache entries for tag: ${tag}`);
            return keys.length;
        }
        catch (error) {
            logger_1.default.error('Cache invalidation error:', { tag, error });
            return 0;
        }
    }
    // Vendor-specific cache methods
    async getVendorList(filters) {
        const cacheKey = `${CacheKeys.VENDOR_LIST}:${this.hashFilters(filters)}`;
        return this.get(cacheKey);
    }
    async setVendorList(filters, data, ttl = 300) {
        const cacheKey = `${CacheKeys.VENDOR_LIST}:${this.hashFilters(filters)}`;
        return this.set(cacheKey, data, { ttl, tags: ['vendors'] });
    }
    async getVendorDetails(vendorId) {
        const cacheKey = `${CacheKeys.VENDOR_DETAILS}:${vendorId}`;
        return this.get(cacheKey);
    }
    async setVendorDetails(vendorId, data, ttl = 600) {
        const cacheKey = `${CacheKeys.VENDOR_DETAILS}:${vendorId}`;
        return this.set(cacheKey, data, { ttl, tags: ['vendors', `vendor:${vendorId}`] });
    }
    async getVendorCommission(vendorId, filters) {
        const cacheKey = `${CacheKeys.VENDOR_COMMISSION}:${vendorId}:${this.hashFilters(filters)}`;
        return this.get(cacheKey);
    }
    async setVendorCommission(vendorId, filters, data, ttl = 300) {
        const cacheKey = `${CacheKeys.VENDOR_COMMISSION}:${vendorId}:${this.hashFilters(filters)}`;
        return this.set(cacheKey, data, { ttl, tags: ['commissions', `vendor:${vendorId}`] });
    }
    // Supplier-specific cache methods
    async getSupplierList(filters) {
        const cacheKey = `${CacheKeys.SUPPLIER_LIST}:${this.hashFilters(filters)}`;
        return this.get(cacheKey);
    }
    async setSupplierList(filters, data, ttl = 300) {
        const cacheKey = `${CacheKeys.SUPPLIER_LIST}:${this.hashFilters(filters)}`;
        return this.set(cacheKey, data, { ttl, tags: ['suppliers'] });
    }
    async getSupplierProducts(supplierId, filters) {
        const cacheKey = `${CacheKeys.SUPPLIER_PRODUCTS}:${supplierId}:${this.hashFilters(filters)}`;
        return this.get(cacheKey);
    }
    async setSupplierProducts(supplierId, filters, data, ttl = 300) {
        const cacheKey = `${CacheKeys.SUPPLIER_PRODUCTS}:${supplierId}:${this.hashFilters(filters)}`;
        return this.set(cacheKey, data, { ttl, tags: ['products', `supplier:${supplierId}`] });
    }
    async getSupplierSettlement(supplierId, filters) {
        const cacheKey = `${CacheKeys.SUPPLIER_SETTLEMENT}:${supplierId}:${this.hashFilters(filters)}`;
        return this.get(cacheKey);
    }
    async setSupplierSettlement(supplierId, filters, data, ttl = 300) {
        const cacheKey = `${CacheKeys.SUPPLIER_SETTLEMENT}:${supplierId}:${this.hashFilters(filters)}`;
        return this.set(cacheKey, data, { ttl, tags: ['settlements', `supplier:${supplierId}`] });
    }
    // Commission-specific cache methods
    async getCommissionStats(timeRange) {
        const cacheKey = `${CacheKeys.COMMISSION_STATS}:${timeRange}`;
        return this.get(cacheKey);
    }
    async setCommissionStats(timeRange, data, ttl = 600) {
        const cacheKey = `${CacheKeys.COMMISSION_STATS}:${timeRange}`;
        return this.set(cacheKey, data, { ttl, tags: ['commissions', 'stats'] });
    }
    // Analytics cache methods
    async getDashboardData(userId, role) {
        const cacheKey = `${CacheKeys.DASHBOARD_DATA}:${role}:${userId}`;
        return this.get(cacheKey);
    }
    async setDashboardData(userId, role, data, ttl = 300) {
        const cacheKey = `${CacheKeys.DASHBOARD_DATA}:${role}:${userId}`;
        return this.set(cacheKey, data, { ttl, tags: ['dashboard', `user:${userId}`] });
    }
    async getPerformanceStats(timeRange) {
        const cacheKey = `${CacheKeys.PERFORMANCE_STATS}:${timeRange}`;
        return this.get(cacheKey);
    }
    async setPerformanceStats(timeRange, data, ttl = 300) {
        const cacheKey = `${CacheKeys.PERFORMANCE_STATS}:${timeRange}`;
        return this.set(cacheKey, data, { ttl, tags: ['analytics', 'performance'] });
    }
    // Cache warming methods
    async warmVendorCache() {
        logger_1.default.info('Starting vendor cache warm-up');
        try {
            // Warm up basic vendor list with common filters
            const commonFilters = [
                { status: 'active' },
                { status: 'pending' },
                { vendorType: 'individual' },
                { vendorType: 'company' }
            ];
            for (const filter of commonFilters) {
                // This would call the actual service to populate cache
                // Implementation depends on your service layer
            }
            logger_1.default.info('Vendor cache warm-up completed');
        }
        catch (error) {
            logger_1.default.error('Vendor cache warm-up failed:', error);
        }
    }
    async warmCommissionCache() {
        logger_1.default.info('Starting commission cache warm-up');
        try {
            // Warm up commission stats for common time ranges
            const timeRanges = ['hour', 'day', 'week', 'month'];
            for (const range of timeRanges) {
                // This would call the commission service to populate cache
                // Implementation depends on your service layer
            }
            logger_1.default.info('Commission cache warm-up completed');
        }
        catch (error) {
            logger_1.default.error('Commission cache warm-up failed:', error);
        }
    }
    // Utility methods
    async storeCacheTags(key, tags, ttl) {
        for (const tag of tags) {
            await this.redis.sadd(`tag:${tag}`, key);
            await this.redis.expire(`tag:${tag}`, ttl + 60); // Expire tag sets slightly later
        }
    }
    hashFilters(filters) {
        // Create a consistent hash from filter object
        const sortedKeys = Object.keys(filters).sort();
        const filterString = sortedKeys
            .map(key => `${key}:${JSON.stringify(filters[key])}`)
            .join('|');
        // Simple hash function (in production, consider using crypto)
        let hash = 0;
        for (let i = 0; i < filterString.length; i++) {
            const char = filterString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }
    compress(data) {
        // Simple compression placeholder
        // In production, use a real compression library like zlib
        return Buffer.from(data).toString('base64');
    }
    decompress(data) {
        // Simple decompression placeholder
        // In production, use a real compression library like zlib
        return Buffer.from(data, 'base64').toString();
    }
    // Cache statistics
    async getCacheStats() {
        try {
            const info = await this.redis.info();
            const keyCount = await this.redis.dbsize();
            return {
                connected: true,
                keyCount,
                memoryUsed: info.used_memory_human || 'Unknown',
                memoryPeak: info.used_memory_peak_human || 'Unknown',
                uptime: info.uptime_in_seconds || 0
            };
        }
        catch (error) {
            logger_1.default.error('Failed to get cache stats:', error);
            return {
                connected: false,
                error: error.message
            };
        }
    }
}
exports.CacheService = CacheService;
exports.cacheService = new CacheService();
//# sourceMappingURL=cache.service.js.map