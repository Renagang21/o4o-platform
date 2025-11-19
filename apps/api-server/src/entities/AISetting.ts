import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm';

@Entity('ai_settings')
export class AISetting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', unique: true })
  @Index()
  provider: string; // 'gemini', 'openai', 'claude'

  @Column({ type: 'text', nullable: true })
  apiKey: string | null;

  @Column({ type: 'varchar', nullable: true })
  defaultModel: string | null;

  @Column({ type: 'json', nullable: true })
  settings: Record<string, any>; // Additional provider-specific settings

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}