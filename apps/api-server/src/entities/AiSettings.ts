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

  @Column({ name: 'defaultmodel', type: 'varchar', length: 255, nullable: true })
  defaultModel: string | null;

  @Column({ type: 'json', nullable: true })
  settings: Record<string, any> | null;

  @Column({ name: 'isactive', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'createdat' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedat' })
  updatedAt: Date;
}