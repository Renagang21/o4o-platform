import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * SignageSchedule Entity
 * Defines when a playlist should play on a device
 */
@Entity('signage_schedules')
export class SignageSchedule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  deviceId!: string;

  @Column({ type: 'uuid' })
  playlistId!: string;

  @Column({ type: 'varchar', length: 10 })
  startTime!: string; // Format: "09:00"

  @Column({ type: 'varchar', length: 10 })
  endTime!: string; // Format: "18:00"

  @Column({ type: 'jsonb', nullable: true })
  daysOfWeek?: number[]; // [0,1,2,3,4,5,6] = Sunday to Saturday

  @Column({ type: 'date', nullable: true })
  startDate?: Date;

  @Column({ type: 'date', nullable: true })
  endDate?: Date;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @Column({ type: 'integer', default: 0 })
  priority!: number; // Higher priority schedules override lower ones

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
