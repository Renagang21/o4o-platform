/**
 * CosmeticsIngredient Entity
 *
 * Represents an ingredient in the cosmetics dictionary
 * Used for product filtering and recommendations
 */

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('cosmetics_ingredients')
export class CosmeticsIngredient {
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
    scientificName?: string;
    benefits?: string[];
    warnings?: string[];
    category?: string; // e.g., 'active', 'preservative', 'fragrance'
  };

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
