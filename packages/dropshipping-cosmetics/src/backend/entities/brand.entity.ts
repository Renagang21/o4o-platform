/**
 * CosmeticsBrand Entity
 *
 * Represents a cosmetics brand in the system
 */

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('cosmetics_brands')
export class CosmeticsBrand {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  logoUrl!: string;

  @Column({ nullable: true })
  description!: string;

  @Column({ type: 'jsonb', default: {} })
  metadata!: {
    country?: string;
    founded?: string;
    tags?: string[];
  };

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
