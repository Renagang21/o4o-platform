export declare enum CacheKeys {
    VENDOR_LIST = "vendor:list",
    VENDOR_DETAILS = "vendor:details",
    VENDOR_STATS = "vendor:stats",
    VENDOR_COMMISSION = "vendor:commission",
    SUPPLIER_LIST = "supplier:list",
    SUPPLIER_DETAILS = "supplier:details",
    SUPPLIER_PRODUCTS = "supplier:products",
    SUPPLIER_SETTLEMENT = "supplier:settlement",
    COMMISSION_STATS = "commission:stats",
    COMMISSION_HISTORY = "commission:history",
    SETTLEMENT_STATS = "settlement:stats",
    PERFORMANCE_STATS = "analytics:performance",
    ERROR_STATS = "analytics:errors",
    DASHBOARD_DATA = "dashboard:data",
    PRODUCT_LIST = "product:list",
    INVENTORY_STATUS = "inventory:status",
    STOCK_ALERTS = "stock:alerts"
}
export interface CacheOptions {
    ttl?: number;
    compress?: boolean;
    tags?: string[];
}
export declare class CacheService {
    private redis;
    private defaultTTL;
    private compressionThreshold;
    constructor();
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, options?: CacheOptions): Promise<boolean>;
    del(key: string): Promise<boolean>;
    delete(key: string): Promise<boolean>;
    invalidateByTag(tag: string): Promise<number>;
    getVendorList(filters: any): Promise<any[] | null>;
    setVendorList(filters: any, data: any[], ttl?: number): Promise<boolean>;
    getVendorDetails(vendorId: string): Promise<any | null>;
    setVendorDetails(vendorId: string, data: any, ttl?: number): Promise<boolean>;
    getVendorCommission(vendorId: string, filters: any): Promise<any | null>;
    setVendorCommission(vendorId: string, filters: any, data: any, ttl?: number): Promise<boolean>;
    getSupplierList(filters: any): Promise<any[] | null>;
    setSupplierList(filters: any, data: any[], ttl?: number): Promise<boolean>;
    getSupplierProducts(supplierId: string, filters: any): Promise<any[] | null>;
    setSupplierProducts(supplierId: string, filters: any, data: any[], ttl?: number): Promise<boolean>;
    getSupplierSettlement(supplierId: string, filters: any): Promise<any | null>;
    setSupplierSettlement(supplierId: string, filters: any, data: any, ttl?: number): Promise<boolean>;
    getCommissionStats(timeRange: string): Promise<any | null>;
    setCommissionStats(timeRange: string, data: any, ttl?: number): Promise<boolean>;
    getDashboardData(userId: string, role: string): Promise<any | null>;
    setDashboardData(userId: string, role: string, data: any, ttl?: number): Promise<boolean>;
    getPerformanceStats(timeRange: string): Promise<any | null>;
    setPerformanceStats(timeRange: string, data: any, ttl?: number): Promise<boolean>;
    warmVendorCache(): Promise<void>;
    warmCommissionCache(): Promise<void>;
    private storeCacheTags;
    private hashFilters;
    private compress;
    private decompress;
    getCacheStats(): Promise<any>;
}
export declare const cacheService: CacheService;
//# sourceMappingURL=cache.service.d.ts.map