type ZoneBasedContent = any;
type LegacyContent = any;
type Zone = any;
type LayoutType = any;
type ZoneValidationResult = any;
type ZoneConfig = any;
/**
 * Zone Content Adapter
 * Handles conversion between legacy and zone-based content structures
 */
export declare class ZoneContentAdapter {
    /**
     * Convert legacy flat block structure to zone-based structure
     */
    static toZoneFormat(content: LegacyContent, layoutType?: LayoutType): ZoneBasedContent;
    /**
     * Convert zone-based structure back to legacy format
     * Used for backward compatibility
     */
    static fromZoneFormat(zoneContent: ZoneBasedContent): LegacyContent;
    /**
     * Validate zone content against constraints
     */
    static validateZoneContent(zoneContent: ZoneBasedContent, zoneConfig?: ZoneConfig): ZoneValidationResult;
    /**
     * Merge zone content with default zones
     */
    static mergeWithDefaults(zoneContent: Partial<ZoneBasedContent>, defaultZones: Record<string, Zone>): ZoneBasedContent;
    /**
     * Check nesting level of blocks
     */
    private static getBlockNestingLevel;
}
export {};
//# sourceMappingURL=zone-adapter.d.ts.map