/**
 * User-related type definitions
 */

// Business information for business users
export interface BusinessInfo {
  businessName: string;
  businessType: string;
  businessNumber?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  website?: string;
  description?: string;
  logoUrl?: string;
  category?: string;
  registrationDate?: string;
  taxId?: string;
  bankAccount?: {
    bankName?: string;
    accountNumber?: string;
    accountHolder?: string;
  };
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
    [key: string]: string | undefined;
  };
  operatingHours?: {
    monday?: string;
    tuesday?: string;
    wednesday?: string;
    thursday?: string;
    friday?: string;
    saturday?: string;
    sunday?: string;
  };
  [key: string]: unknown;
}