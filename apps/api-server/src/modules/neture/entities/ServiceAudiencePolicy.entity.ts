import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Historical table mapping retained for existing schema/migration compatibility.
 * WO-O4O-ADMIN-PLATFORM-MENU-ROLE-CLEANUP-V1 retires audience settings and runtime
 * policy consumers. This entity does not enable a policy editor or drug gate.
 */
@Entity('service_audience_policies')
@Index(['serviceKey'], { unique: true })
export class ServiceAudiencePolicy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'service_key', type: 'varchar', length: 50, unique: true })
  serviceKey: string;

  /** Retained historical value; not consulted by product supply. */
  @Column({ name: 'is_pharmacy_target_service', type: 'boolean', default: false })
  isPharmacyTargetService: boolean;

  @Column({ name: 'note', type: 'text', nullable: true })
  note: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
