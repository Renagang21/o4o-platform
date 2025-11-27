import { User } from '../entities/User.js';
import { BusinessInfo } from '../types/user.js';

/**
 * Phase 3-1: Profile Completeness Service
 *
 * Calculates profile completeness score (0-100) based on:
 * - Basic user information (name, email verification, avatar)
 * - Business information (businessInfo fields)
 * - Role-specific requirements
 */

interface FieldWeight {
  field: string;
  label: string;
  weight: number;
  category: 'basic' | 'business' | 'contact' | 'legal';
}

interface MissingField {
  field: string;
  label: string;
  weight: number;
  category: string;
}

interface CompletenessResult {
  score: number;
  completedFields: Array<{ field: string; label: string; weight: number; category: string }>;
  missingFields: MissingField[];
  timestamp: string;
}

export class ProfileCompletenessService {
  /**
   * Field weights for profile completeness calculation
   * Total weight: 100%
   */
  private static readonly FIELD_WEIGHTS: FieldWeight[] = [
    // Basic user information (30%)
    { field: 'name', label: '이름', weight: 10, category: 'basic' },
    { field: 'isEmailVerified', label: '이메일 인증', weight: 10, category: 'basic' },
    { field: 'avatar', label: '프로필 사진', weight: 10, category: 'basic' },

    // Business information (40%)
    { field: 'businessInfo.businessName', label: '사업자명 (상호명)', weight: 15, category: 'business' },
    { field: 'businessInfo.businessNumber', label: '사업자등록번호', weight: 15, category: 'business' },
    { field: 'businessInfo.ceoName', label: '대표자명', weight: 10, category: 'business' },

    // Contact information (20%)
    { field: 'businessInfo.phone', label: '대표 전화번호', weight: 10, category: 'contact' },
    { field: 'businessInfo.email', label: '사업자 이메일', weight: 5, category: 'contact' },
    { field: 'businessInfo.address', label: '사업장 주소', weight: 5, category: 'contact' },

    // Legal requirements (10%)
    { field: 'businessInfo.telecomLicense', label: '통신판매업 신고번호', weight: 10, category: 'legal' },
  ];

  /**
   * Calculate profile completeness for a user
   */
  static calculateCompleteness(user: User): CompletenessResult {
    const completedFields: Array<{ field: string; label: string; weight: number; category: string }> = [];
    const missingFields: MissingField[] = [];
    let totalScore = 0;

    for (const fieldConfig of this.FIELD_WEIGHTS) {
      const isCompleted = this.checkFieldCompletion(user, fieldConfig.field);

      if (isCompleted) {
        completedFields.push({
          field: fieldConfig.field,
          label: fieldConfig.label,
          weight: fieldConfig.weight,
          category: fieldConfig.category
        });
        totalScore += fieldConfig.weight;
      } else {
        missingFields.push({
          field: fieldConfig.field,
          label: fieldConfig.label,
          weight: fieldConfig.weight,
          category: fieldConfig.category
        });
      }
    }

    return {
      score: Math.round(totalScore),
      completedFields,
      missingFields,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Check if a specific field is completed
   */
  private static checkFieldCompletion(user: User, fieldPath: string): boolean {
    const parts = fieldPath.split('.');

    if (parts.length === 1) {
      // Direct user field
      const fieldName = parts[0] as keyof User;
      const value = user[fieldName];

      // Special handling for boolean fields
      if (fieldName === 'isEmailVerified') {
        return value === true;
      }

      // For string fields, check if not empty
      return typeof value === 'string' && value.trim().length > 0;
    } else if (parts.length === 2 && parts[0] === 'businessInfo') {
      // Business info field
      const businessInfoField = parts[1] as keyof BusinessInfo;
      const businessInfo = user.businessInfo;

      if (!businessInfo) {
        return false;
      }

      const value = businessInfo[businessInfoField];
      return typeof value === 'string' && value.trim().length > 0;
    }

    return false;
  }

  /**
   * Get missing fields grouped by category
   */
  static getMissingFieldsByCategory(user: User): Record<string, MissingField[]> {
    const result = this.calculateCompleteness(user);
    const grouped: Record<string, MissingField[]> = {
      basic: [],
      business: [],
      contact: [],
      legal: []
    };

    for (const field of result.missingFields) {
      grouped[field.category].push(field);
    }

    return grouped;
  }

  /**
   * Check if profile is complete (100% score)
   */
  static isProfileComplete(user: User): boolean {
    const result = this.calculateCompleteness(user);
    return result.score === 100;
  }

  /**
   * Get next recommended field to complete
   */
  static getNextRecommendedField(user: User): MissingField | null {
    const result = this.calculateCompleteness(user);

    if (result.missingFields.length === 0) {
      return null;
    }

    // Return the field with highest weight
    return result.missingFields.sort((a, b) => b.weight - a.weight)[0];
  }
}
