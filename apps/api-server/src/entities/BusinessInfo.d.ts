import type { User } from './User.js';
export declare enum BusinessType {
    SOLE_PROPRIETORSHIP = "sole_proprietorship",
    PARTNERSHIP = "partnership",
    CORPORATION = "corporation",
    LLC = "llc",
    NON_PROFIT = "non_profit",
    OTHER = "other"
}
export declare enum BusinessSize {
    MICRO = "micro",// 1-9 employees
    SMALL = "small",// 10-49 employees
    MEDIUM = "medium",// 50-249 employees
    LARGE = "large",// 250+ employees
    ENTERPRISE = "enterprise"
}
export declare enum Industry {
    TECHNOLOGY = "technology",
    HEALTHCARE = "healthcare",
    FINANCE = "finance",
    RETAIL = "retail",
    MANUFACTURING = "manufacturing",
    EDUCATION = "education",
    REAL_ESTATE = "real_estate",
    HOSPITALITY = "hospitality",
    CONSULTING = "consulting",
    MARKETING = "marketing",
    CONSTRUCTION = "construction",
    AGRICULTURE = "agriculture",
    ENTERTAINMENT = "entertainment",
    TRANSPORTATION = "transportation",
    ENERGY = "energy",
    TELECOMMUNICATIONS = "telecommunications",
    AUTOMOTIVE = "automotive",
    AEROSPACE = "aerospace",
    PHARMACEUTICAL = "pharmaceutical",
    FOOD_BEVERAGE = "food_beverage",
    OTHER = "other"
}
export interface BusinessAddress {
    street1: string;
    street2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
}
export interface BusinessContact {
    phone?: string;
    fax?: string;
    website?: string;
    email?: string;
}
export interface BusinessFinancials {
    annualRevenue?: number;
    numberOfEmployees?: number;
    foundedYear?: number;
    fiscalYearEnd?: string;
}
export interface BusinessLegal {
    taxId?: string;
    vatNumber?: string;
    dunsNumber?: string;
    businessLicense?: string;
    businessLicenseExpiry?: Date;
}
export declare class BusinessInfo {
    id: string;
    userId: string;
    user: User;
    businessName: string;
    tradingName?: string;
    description?: string;
    businessType: BusinessType;
    industry: Industry;
    businessSize?: BusinessSize;
    address: BusinessAddress;
    billingAddress?: BusinessAddress;
    contact?: BusinessContact;
    financials?: BusinessFinancials;
    legal?: BusinessLegal;
    services?: string[];
    markets?: string[];
    timezone?: string;
    currency?: string;
    language?: string;
    defaultCommissionRate?: number;
    isVerified: boolean;
    verifiedAt?: Date;
    verifiedBy?: string;
    verificationNotes?: string;
    socialMedia?: {
        linkedin?: string;
        twitter?: string;
        facebook?: string;
        instagram?: string;
        youtube?: string;
    };
    certifications?: string[];
    licenses?: string[];
    createdAt: Date;
    updatedAt: Date;
    getFullBusinessName(): string;
    getFormattedAddress(): string;
    getBusinessTypeDisplayName(): string;
    getIndustryDisplayName(): string;
    getBusinessSizeDisplayName(): string;
    isComplete(): boolean;
    getCompletionPercentage(): number;
}
//# sourceMappingURL=BusinessInfo.d.ts.map