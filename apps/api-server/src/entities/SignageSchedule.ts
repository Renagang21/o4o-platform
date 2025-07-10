import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Store } from './Store';
import { StorePlaylist } from './StorePlaylist';

export enum ScheduleType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  ONE_TIME = 'one_time'
}

export enum ScheduleStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired'
}

@Entity('signage_schedules')
export class SignageSchedule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: ScheduleType,
    default: ScheduleType.DAILY
  })
  type!: ScheduleType;

  @Column({
    type: 'enum',
    enum: ScheduleStatus,
    default: ScheduleStatus.ACTIVE
  })
  status!: ScheduleStatus;

  @Column({ type: 'time' })
  startTime!: string; // HH:MM format

  @Column({ type: 'time' })
  endTime!: string; // HH:MM format

  @Column({ type: 'json', nullable: true })
  daysOfWeek?: number[]; // [0,1,2,3,4,5,6] for Sunday to Saturday

  @Column({ type: 'date', nullable: true })
  specificDate?: Date; // For one-time schedules

  @Column({ type: 'date', nullable: true })
  validFrom?: Date;

  @Column({ type: 'date', nullable: true })
  validUntil?: Date;

  @Column({ type: 'int', default: 0 })
  priority!: number; // Higher number = higher priority

  @Column()
  storeId!: string;

  @ManyToOne(() => Store, store => store.schedules)
  @JoinColumn({ name: 'storeId' })
  store!: Store;

  @Column()
  playlistId!: string;

  @ManyToOne(() => StorePlaylist)
  @JoinColumn({ name: 'playlistId' })
  playlist!: StorePlaylist;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Business logic methods
  isActiveNow(): boolean {
    if (this.status !== ScheduleStatus.ACTIVE) return false;

    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM
    const currentDay = now.getDay();
    const currentDate = now.toISOString().split('T')[0];

    // Check time range
    if (currentTime < this.startTime || currentTime > this.endTime) {
      return false;
    }

    // Check date validity
    if (this.validFrom && now < this.validFrom) return false;
    if (this.validUntil && now > this.validUntil) return false;

    // Check schedule type
    switch (this.type) {
      case ScheduleType.DAILY:
        return true;
      case ScheduleType.WEEKLY:
        return this.daysOfWeek?.includes(currentDay) || false;
      case ScheduleType.ONE_TIME:
        return this.specificDate?.toISOString().split('T')[0] === currentDate;
      default:
        return false;
    }
  }

  conflictsWith(other: SignageSchedule): boolean {
    if (this.storeId !== other.storeId) return false;
    
    // Simple time overlap check (can be enhanced)
    return !(this.endTime <= other.startTime || this.startTime >= other.endTime);
  }
}