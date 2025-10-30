import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index
} from 'typeorm';
import type { User } from './User.js';

export enum BusinessType {
  SOLE_PROPRIETORSHIP = 'sole_proprietorship',
  PARTNERSHIP = 'partnership',
  CORPORATION = 'corporation',
  LLC = 'llc',
  NON_PROFIT = 'non_profit',
  OTHER = 'other'
}

export enum BusinessSize {
  MICRO = 'micro',      // 1-9 employees
  SMALL = 'small',      // 10-49 employees
  MEDIUM = 'medium',    // 50-249 employees
  LARGE = 'large',      // 250+ employees
  ENTERPRISE = 'enterprise' // 1000+ employees
}

export enum Industry {
  TECHNOLOGY = 'technology',
  HEALTHCARE = 'healthcare',
  FINANCE = 'finance',
  RETAIL = 'retail',
  MANUFACTURING = 'manufacturing',
  EDUCATION = 'education',
  REAL_ESTATE = 'real_estate',
  HOSPITALITY = 'hospitality',
  CONSULTING = 'consulting',
  MARKETING = 'marketing',
  CONSTRUCTION = 'construction',
  AGRICULTURE = 'agriculture',
  ENTERTAINMENT = 'entertainment',
  TRANSPORTATION = 'transportation',
  ENERGY = 'energy',
  TELECOMMUNICATIONS = 'telecommunications',
  AUTOMOTIVE = 'automotive',
  AEROSPACE = 'aerospace',
  PHARMACEUTICAL = 'pharmaceutical',
  FOOD_BEVERAGE = 'food_beverage',
  OTHER = 'other'
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
  fiscalYearEnd?: string; // MM-DD format
}

export interface BusinessLegal {
  taxId?: string;
  vatNumber?: string;
  dunsNumber?: string;
  businessLicense?: string;
  businessLicenseExpiry?: Date;
}

@Entity('business_info')
@Index(['userId'], { unique: true })
@Index(['businessType', 'industry'])
@Index(['businessSize', 'industry'])
export class BusinessInfo {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', unique: true })
  userId!: string;

  @OneToOne('User', 'businessInfo', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  // Basic Business Information
  @Column({ type: 'varchar', length: 255 })
  businessName!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  tradingName?: string; // DBA name

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: BusinessType })
  businessType!: BusinessType;

  @Column({ type: 'enum', enum: Industry })
  industry!: Industry;

  @Column({ type: 'enum', enum: BusinessSize, nullable: true })
  businessSize?: BusinessSize;

  // Contact Information
  @Column({ type: 'json' })
  address!: BusinessAddress;

  @Column({ type: 'json', nullable: true })
  billingAddress?: BusinessAddress;

  @Column({ type: 'json', nullable: true })
  contact?: BusinessContact;

  // Financial Information
  @Column({ type: 'json', nullable: true })
  financials?: BusinessFinancials;

  // Legal Information
  @Column({ type: 'json', nullable: true })
  legal?: BusinessLegal;

  // Additional Information
  @Column({ type: 'simple-array', nullable: true })
  services?: string[]; // Services offered

  @Column({ type: 'simple-array', nullable: true })
  markets?: string[]; // Markets served

  @Column({ type: 'varchar', length: 10, nullable: true })
  timezone?: string;

  @Column({ type: 'varchar', length: 3, nullable: true })
  currency?: string; // USD, EUR, etc.

  @Column({ type: 'varchar', length: 5, nullable: true })
  language?: string; // en-US, etc.

  // Verification Status
  @Column({ type: 'boolean', default: false })
  isVerified!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  verifiedBy?: string;

  @Column({ type: 'text', nullable: true })
  verificationNotes?: string;

  // Social Media and Online Presence
  @Column({ type: 'json', nullable: true })
  socialMedia?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
    youtube?: string;
  };

  // Compliance and Certifications
  @Column({ type: 'simple-array', nullable: true })
  certifications?: string[];

  @Column({ type: 'simple-array', nullable: true })
  licenses?: string[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Helper methods
  getFullBusinessName(): string {
    if (this.tradingName && this.tradingName !== this.businessName) {
      return `${this.businessName} (${this.tradingName})`;
    }
    return this.businessName;
  }

  getFormattedAddress(): string {
    const addr = this.address;
    const parts = [
      addr.street1,
      addr.street2,
      addr.city,
      addr.state,
      addr.postalCode,
      addr.country
    ].filter(Boolean);
    
    return parts.join(', ');
  }

  getBusinessTypeDisplayName(): string {
    const typeNames: Record<BusinessType, string> = {
      [BusinessType.SOLE_PROPRIETORSHIP]: 'Sole Proprietorship',
      [BusinessType.PARTNERSHIP]: 'Partnership',
      [BusinessType.CORPORATION]: 'Corporation',
      [BusinessType.LLC]: 'Limited Liability Company',
      [BusinessType.NON_PROFIT]: 'Non-Profit Organization',
      [BusinessType.OTHER]: 'Other'
    };
    return typeNames[this.businessType];
  }

  getIndustryDisplayName(): string {
    const industryNames: Record<Industry, string> = {
      [Industry.TECHNOLOGY]: 'Technology',
      [Industry.HEALTHCARE]: 'Healthcare',
      [Industry.FINANCE]: 'Finance',
      [Industry.RETAIL]: 'Retail',
      [Industry.MANUFACTURING]: 'Manufacturing',
      [Industry.EDUCATION]: 'Education',
      [Industry.REAL_ESTATE]: 'Real Estate',
      [Industry.HOSPITALITY]: 'Hospitality',
      [Industry.CONSULTING]: 'Consulting',
      [Industry.MARKETING]: 'Marketing',
      [Industry.CONSTRUCTION]: 'Construction',
      [Industry.AGRICULTURE]: 'Agriculture',
      [Industry.ENTERTAINMENT]: 'Entertainment',
      [Industry.TRANSPORTATION]: 'Transportation',
      [Industry.ENERGY]: 'Energy',
      [Industry.TELECOMMUNICATIONS]: 'Telecommunications',
      [Industry.AUTOMOTIVE]: 'Automotive',
      [Industry.AEROSPACE]: 'Aerospace',
      [Industry.PHARMACEUTICAL]: 'Pharmaceutical',
      [Industry.FOOD_BEVERAGE]: 'Food & Beverage',
      [Industry.OTHER]: 'Other'
    };
    return industryNames[this.industry];
  }

  getBusinessSizeDisplayName(): string {
    if (!this.businessSize) return 'Unknown';
    
    const sizeNames: Record<BusinessSize, string> = {
      [BusinessSize.MICRO]: 'Micro (1-9 employees)',
      [BusinessSize.SMALL]: 'Small (10-49 employees)',
      [BusinessSize.MEDIUM]: 'Medium (50-249 employees)',
      [BusinessSize.LARGE]: 'Large (250-999 employees)',
      [BusinessSize.ENTERPRISE]: 'Enterprise (1000+ employees)'
    };
    return sizeNames[this.businessSize];
  }

  isComplete(): boolean {
    return !!(
      this.businessName &&
      this.businessType &&
      this.industry &&
      this.address?.street1 &&
      this.address?.city &&
      this.address?.state &&
      this.address?.country
    );
  }

  getCompletionPercentage(): number {
    const requiredFields = [
      'businessName',
      'businessType', 
      'industry',
      'address.street1',
      'address.city',
      'address.state',
      'address.country'
    ];
    
    const optionalFields = [
      'tradingName',
      'description',
      'businessSize',
      'contact.phone',
      'contact.website',
      'contact.email',
      'financials.numberOfEmployees',
      'legal.taxId'
    ];
    
    let filledRequired = 0;
    let filledOptional = 0;
    
    // Check required fields
    requiredFields.forEach(field => {
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        if ((this as any)[parent]?.[child]) filledRequired++;
      } else {
        if ((this as any)[field]) filledRequired++;
      }
    });
    
    // Check optional fields
    optionalFields.forEach(field => {
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        if ((this as any)[parent]?.[child]) filledOptional++;
      } else {
        if ((this as any)[field]) filledOptional++;
      }
    });
    
    const totalFields = requiredFields.length + optionalFields.length;
    const totalFilled = filledRequired + filledOptional;
    
    return Math.round((totalFilled / totalFields) * 100);
  }
}