/**
 * CosmeticsConcern Entity
 *
 * Represents a skin concern in the cosmetics dictionary
 * Used for product filtering and recommendations
 */

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('cosmetics_concerns')
export class CosmeticsConcern {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  name!: string;

  @Column({ nullable: true })
  description!: string;

  @Column({ type: 'jsonb', default: {} })
  metadata!: {
    tags?: string[];
    displayOrder?: number;
    icon?: string;
    category?: string; // e.g., 'hydration', 'anti-aging', 'acne'
  };

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
