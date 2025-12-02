import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * SignageDevice Entity
 * Represents a physical display device (TV, monitor, tablet) for digital signage
 */
@Entity('signage_devices')
export class SignageDevice {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 500, unique: true })
  token!: string;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  resolution?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  orientation?: string; // 'landscape' | 'portrait'

  @Column({ type: 'timestamp', nullable: true })
  lastHeartbeat?: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  registeredAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
