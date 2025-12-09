import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('cms_settings')
@Index(['organizationId', 'key'], { unique: true })
export class CmsSetting {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  organizationId!: string;

  @Column({ type: 'varchar', length: 255 })
  key!: string;

  @Column({ type: 'text', nullable: true })
  value!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  valueJson!: Record<string, any> | null;

  @Column({ type: 'varchar', length: 100, default: 'string' })
  type!: string; // string, number, boolean, json, array

  @Column({ type: 'varchar', length: 255, nullable: true })
  group!: string | null; // Settings group for organization

  @Column({ type: 'varchar', length: 255, nullable: true })
  label!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'boolean', default: false })
  isSystem!: boolean; // System settings cannot be deleted

  @Column({ type: 'boolean', default: true })
  isEditable!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
