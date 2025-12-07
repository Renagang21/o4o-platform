/**
 * CosmeticsCategory Entity
 *
 * Represents a product category in the cosmetics dictionary
 * Used for product filtering and organization
 */

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('cosmetics_categories')
export class CosmeticsCategory {
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
    parentCategory?: string;
    routineStep?: number; // e.g., 1=cleansing, 2=toning, 3=treatment
  };

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
