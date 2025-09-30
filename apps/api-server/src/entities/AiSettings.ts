import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('ai_settings')
export class AiSettings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, unique: true })
  @Index()
  provider: string;

  @Column({ name: 'apikey', type: 'text', nullable: true })
  apiKey: string | null;

  @Column({ name: 'default_model', type: 'varchar', length: 255, nullable: true })
  defaultModel: string | null;

  @Column({ type: 'json', nullable: true })
  settings: Record<string, any> | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}