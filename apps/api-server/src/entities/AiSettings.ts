import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('ai_settings')
export class AiSettings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, unique: true })
  @Index()
  provider: string;

  @Column({ type: 'text', nullable: true })
  apiKey: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  defaultModel: string | null;

  @Column({ type: 'json', nullable: true })
  settings: Record<string, any> | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}