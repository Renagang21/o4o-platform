import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * SignageSlide Entity
 * Represents an individual slide/screen for digital signage
 * Based on ViewRenderer JSON structure
 */
@Entity('signage_slides')
export class SignageSlide {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'jsonb' })
  json!: Record<string, any>; // ViewRenderer JSON

  @Column({ type: 'varchar', length: 500, nullable: true })
  thumbnail?: string;

  @Column({ type: 'integer', default: 10 })
  duration!: number; // seconds

  @Column({ type: 'varchar', length: 100, nullable: true })
  category?: string;

  @Column({ type: 'jsonb', nullable: true })
  tags?: string[];

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
