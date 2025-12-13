import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type NoteType =
  | 'meal'           // 식사
  | 'exercise'       // 운동
  | 'medication'     // 약물 복용
  | 'insulin'        // 인슐린 주사
  | 'stress'         // 스트레스
  | 'sleep'          // 수면
  | 'illness'        // 질병/몸 상태
  | 'other';         // 기타

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type ExerciseIntensity = 'light' | 'moderate' | 'vigorous';

/**
 * UserNote Entity
 * 사용자 생활 기록 (식사, 운동, 약물 등)
 */
@Entity('diabetes_user_notes')
@Index(['userId', 'timestamp'])
@Index(['noteType', 'timestamp'])
export class UserNote {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  userId!: string;

  @Column({ type: 'varchar', length: 50 })
  noteType!: NoteType;

  @Column({ type: 'timestamp' })
  timestamp!: Date;

  @Column({ type: 'text', nullable: true })
  content?: string;

  // 식사 관련
  @Column({ type: 'varchar', length: 20, nullable: true })
  mealType?: MealType;

  @Column({ type: 'int', nullable: true })
  carbsGrams?: number; // 탄수화물 (g)

  @Column({ type: 'int', nullable: true })
  calories?: number;

  @Column({ type: 'jsonb', nullable: true })
  foodItems?: Array<{
    name: string;
    amount?: string;
    carbs?: number;
  }>;

  // 운동 관련
  @Column({ type: 'int', nullable: true })
  exerciseDurationMinutes?: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  exerciseIntensity?: ExerciseIntensity;

  @Column({ type: 'varchar', length: 100, nullable: true })
  exerciseType?: string;

  // 약물/인슐린 관련
  @Column({ type: 'varchar', length: 100, nullable: true })
  medicationName?: string;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  dosage?: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  dosageUnit?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  insulinType?: 'rapid' | 'short' | 'intermediate' | 'long' | 'mixed';

  // 수면 관련
  @Column({ type: 'int', nullable: true })
  sleepDurationMinutes?: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  sleepQuality?: 'poor' | 'fair' | 'good' | 'excellent';

  // 스트레스/기분 관련
  @Column({ type: 'int', nullable: true })
  stressLevel?: number; // 1-10

  @Column({ type: 'varchar', length: 20, nullable: true })
  mood?: 'very_bad' | 'bad' | 'neutral' | 'good' | 'very_good';

  // 기록 시점 혈당값 (참조용)
  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  glucoseAtTime?: number;

  @Column({ type: 'jsonb', nullable: true })
  tags?: string[];

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Helper methods
  isMeal(): boolean {
    return this.noteType === 'meal';
  }

  isExercise(): boolean {
    return this.noteType === 'exercise';
  }

  isInsulin(): boolean {
    return this.noteType === 'insulin';
  }
}
