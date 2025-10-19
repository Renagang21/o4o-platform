import { FieldGroup } from '../../../entities/CustomField';
/**
 * ACF Service - Business logic layer for Advanced Custom Fields
 * Follows the pattern from affiliate module
 */
export declare class ACFService {
    private fieldGroupRepo;
    private fieldRepo;
    private fieldValueRepo;
    /**
     * Get all field groups
     */
    getFieldGroups(): Promise<{
        success: boolean;
        data: FieldGroup[];
        total: number;
    }>;
    /**
     * Get field group by ID
     */
    getFieldGroup(id: string): Promise<{
        success: boolean;
        error: string;
        data?: undefined;
    } | {
        success: boolean;
        data: FieldGroup;
        error?: undefined;
    }>;
    /**
     * Create field group
     */
    createFieldGroup(data: any): Promise<{
        success: boolean;
        error: string;
        details: import("class-validator").ValidationError[];
        data?: undefined;
    } | {
        success: boolean;
        data: FieldGroup;
        error?: undefined;
        details?: undefined;
    }>;
    /**
     * Update field group
     */
    updateFieldGroup(id: string, data: any): Promise<{
        success: boolean;
        error: string;
        details?: undefined;
        data?: undefined;
    } | {
        success: boolean;
        error: string;
        details: import("class-validator").ValidationError[];
        data?: undefined;
    } | {
        success: boolean;
        data: FieldGroup;
        error?: undefined;
        details?: undefined;
    }>;
    /**
     * Delete field group
     */
    deleteFieldGroup(id: string): Promise<{
        success: boolean;
        error: string;
        message?: undefined;
    } | {
        success: boolean;
        message: string;
        error?: undefined;
    }>;
    /**
     * Get field values for an entity
     */
    getFieldValues(entityType: string, entityId: string): Promise<{
        success: boolean;
        data: {};
    }>;
    /**
     * Save field values for an entity
     */
    saveFieldValues(entityType: string, entityId: string, values: any): Promise<{
        success: boolean;
        data: any[];
        message: string;
    }>;
    /**
     * Export field groups
     */
    exportFieldGroups(groupIds?: string[]): Promise<{
        success: boolean;
        data: {
            version: string;
            groups: FieldGroup[];
            exportedAt: Date;
        };
    }>;
    /**
     * Import field groups
     */
    importFieldGroups(data: any): Promise<{
        success: boolean;
        error: string;
        data?: undefined;
        message?: undefined;
    } | {
        success: boolean;
        data: any[];
        message: string;
        error?: undefined;
    }>;
}
export declare const acfService: ACFService;
//# sourceMappingURL=acf.service.d.ts.map