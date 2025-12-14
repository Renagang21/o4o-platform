/**
 * SupplierProfile Entity
 *
 * Stores supplier onboarding information and profile data.
 * Phase R11: Supplier Onboarding System
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Onboarding status values
 */
export type OnboardingStatus = 'not_started' | 'in_progress' | 'completed';

/**
 * Onboarding checklist item
 */
export interface OnboardingChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  completedAt?: Date;
}

@Entity('lms_marketing_supplier_profiles')
@Index(['supplierId'], { unique: true })
@Index(['onboardingStatus'])
export class SupplierProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Reference to the supplier user */
  @Column({ type: 'varchar', length: 255, unique: true })
  supplierId: string;

  /** Brand name */
  @Column({ type: 'varchar', length: 255, nullable: true })
  brandName: string | null;

  /** Contact email */
  @Column({ type: 'varchar', length: 255, nullable: true })
  contactEmail: string | null;

  /** Contact phone */
  @Column({ type: 'varchar', length: 50, nullable: true })
  contactPhone: string | null;

  /** Product categories */
  @Column({ type: 'jsonb', default: [] })
  categories: string[];

  /** Product types */
  @Column({ type: 'jsonb', default: [] })
  productTypes: string[];

  /** Region */
  @Column({ type: 'varchar', length: 100, nullable: true })
  region: string | null;

  /** Onboarding status */
  @Column({
    type: 'varchar',
    length: 20,
    default: 'not_started',
  })
  onboardingStatus: OnboardingStatus;

  /** Onboarding checklist progress */
  @Column({
    type: 'jsonb',
    default: [
      { id: 'profile', label: 'Complete brand profile', completed: false },
      { id: 'first_product', label: 'Publish first product info', completed: false },
      { id: 'first_quiz', label: 'Create first quiz campaign', completed: false },
      { id: 'first_survey', label: 'Create first survey campaign', completed: false },
      { id: 'view_dashboard', label: 'View insights dashboard', completed: false },
    ],
  })
  onboardingChecklist: OnboardingChecklistItem[];

  /** Onboarding completed timestamp */
  @Column({ type: 'timestamptz', nullable: true })
  onboardingCompletedAt: Date | null;

  /** Additional metadata */
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
