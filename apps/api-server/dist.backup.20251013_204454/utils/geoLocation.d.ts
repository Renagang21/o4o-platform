/**
 * Lightweight geo-location utility
 * Replaces heavy geoip-lite package (149MB) with API-based solution
 */
interface GeoLocation {
    country?: string;
    region?: string;
    city?: string;
    lat?: number;
    lng?: number;
}
/**
 * Get geo location from IP address using free API service
 * Falls back gracefully if API is unavailable
 */
export declare function getGeoLocation(ip: string): Promise<GeoLocation | null>;
/**
 * Clear geo location cache
 */
export declare function clearGeoCache(): void;
/**
 * Get cache statistics
 */
export declare function getGeoCacheStats(): {
    size: number;
    hits: number;
    misses: number;
};
export {};
//# sourceMappingURL=geoLocation.d.ts.map