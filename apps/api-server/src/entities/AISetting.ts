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

  @Column({ unique: true })
  @Index()
  provider: string; // 'gemini', 'openai', 'claude'

  @Column({ type: 'text', nullable: true })
  apiKey: string | null;

  @Column({ nullable: true })
  defaultModel: string | null;

  @Column({ type: 'json', nullable: true })
  settings: Record<string, any>; // Additional provider-specific settings

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}