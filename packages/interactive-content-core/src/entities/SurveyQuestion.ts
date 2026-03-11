import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

/**
 * SurveyQuestion Entity
 *
 * 설문조사 질문
 */

export enum QuestionType {
  SINGLE = 'single',       // 단일 선택
  MULTI = 'multi',         // 다중 선택
  TEXT = 'text',           // 주관식
  RATING = 'rating',       // 별점/점수
  SCALE = 'scale',         // 척도 (1-5, 1-10 등)
  DATE = 'date',           // 날짜
  NUMBER = 'number',       // 숫자
}

export interface QuestionOption {
  id: string;
  label: string;
  value: string;
  order: number;
}

@Entity('lms_survey_questions')
@Index(['surveyId', 'order'])
export class SurveyQuestion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  surveyId!: string;

  @Column({
    type: 'enum',
    enum: QuestionType,
    default: QuestionType.SINGLE,
  })
  type!: QuestionType;

  @Column({ type: 'text' })
  question!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'jsonb', default: [] })
  options!: QuestionOption[];

  @Column({ type: 'integer', default: 0 })
  order!: number;

  // 필수 응답 여부
  @Column({ type: 'boolean', default: false })
  isRequired!: boolean;

  // 척도 설정 (scale 타입용)
  @Column({ type: 'integer', nullable: true })
  scaleMin?: number;

  @Column({ type: 'integer', nullable: true })
  scaleMax?: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  scaleMinLabel?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  scaleMaxLabel?: string;

  // 텍스트 입력 제한 (text 타입용)
  @Column({ type: 'integer', nullable: true })
  maxLength?: number;

  // 조건부 표시 (다른 질문 응답에 따라)
  @Column({ type: 'jsonb', nullable: true })
  conditionalDisplay?: {
    questionId: string;
    operator: 'equals' | 'notEquals' | 'contains';
    value: string;
  };

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Helper Methods

  /**
   * Add an option
   */
  addOption(label: string, value?: string): void {
    const id = crypto.randomUUID ? crypto.randomUUID() : `opt-${Date.now()}`;
    const order = this.options.length;
    this.options.push({
      id,
      label,
      value: value || label,
      order,
    });
  }

  /**
   * Remove an option by id
   */
  removeOption(optionId: string): void {
    this.options = this.options.filter((o) => o.id !== optionId);
    this.options.forEach((o, index) => {
      o.order = index;
    });
  }

  /**
   * Validate an answer
   */
  validateAnswer(answer: any): { valid: boolean; error?: string } {
    if (this.isRequired && (answer === undefined || answer === null || answer === '')) {
      return { valid: false, error: 'This question is required' };
    }

    switch (this.type) {
      case QuestionType.SINGLE:
        if (answer && !this.options.some((o) => o.value === answer)) {
          return { valid: false, error: 'Invalid option selected' };
        }
        break;
      case QuestionType.MULTI:
        if (answer && Array.isArray(answer)) {
          const validValues = this.options.map((o) => o.value);
          if (!answer.every((a) => validValues.includes(a))) {
            return { valid: false, error: 'Invalid options selected' };
          }
        }
        break;
      case QuestionType.SCALE:
      case QuestionType.RATING:
        if (answer !== undefined) {
          const num = Number(answer);
          if (this.scaleMin !== undefined && num < this.scaleMin) {
            return { valid: false, error: `Value must be at least ${this.scaleMin}` };
          }
          if (this.scaleMax !== undefined && num > this.scaleMax) {
            return { valid: false, error: `Value must be at most ${this.scaleMax}` };
          }
        }
        break;
      case QuestionType.TEXT:
        if (answer && this.maxLength && answer.length > this.maxLength) {
          return { valid: false, error: `Text exceeds maximum length of ${this.maxLength}` };
        }
        break;
    }

    return { valid: true };
  }
}
