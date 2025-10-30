import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User.js';

export interface NotificationData {
  title: string;
  message: string;
  type: string;
  recipientId: string;
  data?: any;
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 255 })
  title!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ length: 50 })
  type!: string;

  @Column('uuid')
  recipientId!: string;

  @Column({ type: 'json', nullable: true })
  data?: any;

  @Column({ type: 'boolean', default: false })
  read!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  readAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'recipientId' })
  recipient!: User;
}