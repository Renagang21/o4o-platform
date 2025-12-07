/**
 * CosmeticsSkinType Entity
 *
 * Represents a skin type in the cosmetics dictionary
 * Used for product filtering and recommendations
 */

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('cosmetics_skin_types')
export class CosmeticsSkinType {
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
  };

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
