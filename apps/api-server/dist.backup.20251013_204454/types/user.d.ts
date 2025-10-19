/**
 * User-related type definitions
 */
export interface BusinessInfo {
    companyName?: string;
    businessType?: string;
    taxId?: string;
    address?: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
    };
    contactInfo?: {
        phone: string;
        website?: string;
    };
    metadata?: Record<string, string | number | boolean>;
}
//# sourceMappingURL=user.d.ts.map