"use strict";
/**
 * Lightweight geo-location utility
 * Replaces heavy geoip-lite package (149MB) with API-based solution
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGeoLocation = getGeoLocation;
exports.clearGeoCache = clearGeoCache;
exports.getGeoCacheStats = getGeoCacheStats;
const fetch = require('node-fetch');
// Cache to reduce API calls
const geoCache = new Map();
const CACHE_TTL = 3600000; // 1 hour
const cacheTimestamps = new Map();
/**
 * Get geo location from IP address using free API service
 * Falls back gracefully if API is unavailable
 */
async function getGeoLocation(ip) {
    // Skip for local IPs
    if (!ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
        return null;
    }
    // Clean IPv6 prefix if present
    const cleanIp = ip.replace(/^::ffff:/, '');
    // Check cache
    const cached = geoCache.get(cleanIp);
    const cachedTime = cacheTimestamps.get(cleanIp);
    if (cached !== undefined && cachedTime && Date.now() - cachedTime < CACHE_TTL) {
        return cached;
    }
    try {
        // Use environment variable to enable/disable geo lookup
        const enableGeoLocation = process.env.ENABLE_GEO_LOCATION !== 'false';
        if (!enableGeoLocation) {
            return null;
        }
        // Use ipapi.co free tier (1000 requests/day)
        // Alternative: ip-api.com (45 requests/minute)
        const response = await fetch(`https://ipapi.co/${cleanIp}/json/`, {
            timeout: 2000, // 2 second timeout
            headers: {
                'User-Agent': 'o4o-platform/1.0'
            }
        });
        if (!response.ok) {
            // Cache null result to avoid repeated failed requests
            geoCache.set(cleanIp, null);
            cacheTimestamps.set(cleanIp, Date.now());
            return null;
        }
        const data = await response.json();
        // Check if we got an error response
        if (data.error || data.reason === 'RateLimited') {
            console.warn(`Geo location API error for ${cleanIp}:`, data.reason || data.error);
            geoCache.set(cleanIp, null);
            cacheTimestamps.set(cleanIp, Date.now());
            return null;
        }
        const location = {
            country: data.country_name || data.country,
            region: data.region,
            city: data.city,
            lat: data.latitude,
            lng: data.longitude
        };
        // Cache successful result
        geoCache.set(cleanIp, location);
        cacheTimestamps.set(cleanIp, Date.now());
        return location;
    }
    catch (error) {
        // Silently fail - geo location is optional
        console.debug(`Failed to get geo location for ${cleanIp}:`, error);
        // Cache null to avoid repeated failures
        geoCache.set(cleanIp, null);
        cacheTimestamps.set(cleanIp, Date.now());
        return null;
    }
}
/**
 * Clear geo location cache
 */
function clearGeoCache() {
    geoCache.clear();
    cacheTimestamps.clear();
}
/**
 * Get cache statistics
 */
function getGeoCacheStats() {
    return {
        size: geoCache.size,
        hits: 0, // Would need to track this separately
        misses: 0 // Would need to track this separately
    };
}
//# sourceMappingURL=geoLocation.js.map