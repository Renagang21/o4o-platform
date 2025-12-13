import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import type { CGMReading } from './CGMReading.entity.js';
import type { CGMEvent } from './CGMEvent.entity.js';

export type CGMDeviceType = 'freestyle_libre' | 'dexcom' | 'medtronic' | 'other';
export type SessionStatus = 'active' | 'completed' | 'cancelled';

/**
 * CGMSession Entity
 * CGM 센서 세션 (보통 10-14일 단위)
 */
@Entity('diabetes_cgm_sessions')
@Index(['userId', 'startDate'])
@Index(['status'])
export class CGMSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  userId!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  pharmacyId?: string;

  @Column({ type: 'varchar', length: 50 })
  deviceType!: CGMDeviceType;

  @Column({ type: 'varchar', length: 100, nullable: true })
  deviceSerial?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sensorId?: string;

  @Column({ type: 'timestamp' })
  startDate!: Date;

  @Column({ type: 'timestamp', nullable: true })
  endDate?: Date;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: SessionStatus;

  @Column({ type: 'int', default: 0 })
  totalReadings!: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations (lazy loaded)
  @OneToMany('CGMReading', 'session')
  readings?: CGMReading[];

  @OneToMany('CGMEvent', 'session')
  events?: CGMEvent[];

  // Helper methods
  isActive(): boolean {
    return this.status === 'active';
  }

  getDurationDays(): number {
    const end = this.endDate || new Date();
    const diffMs = end.getTime() - this.startDate.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }
}
