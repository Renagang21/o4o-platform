import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('cms_acf_values')
@Index(['entityType', 'entityId', 'fieldId'], { unique: true })
export class CmsAcfValue {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  organizationId!: string;

  @Column({ type: 'uuid' })
  @Index()
  fieldId!: string; // Reference to CmsAcfField

  @Column({ type: 'varchar', length: 100 })
  @Index()
  entityType!: string; // post, user, term, option, etc.

  @Column({ type: 'uuid' })
  @Index()
  entityId!: string; // ID of the entity (post ID, user ID, etc.)

  @Column({ type: 'text', nullable: true })
  value!: string | null; // Serialized value

  @Column({ type: 'jsonb', nullable: true })
  valueJson!: Record<string, any> | null; // JSON value for complex types

  @Column({ type: 'int', nullable: true })
  rowIndex!: number | null; // For repeater fields

  @Column({ type: 'varchar', length: 255, nullable: true })
  subFieldKey!: string | null; // For nested fields

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
