import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';

/**
 * Organization Entity
 *
 * 전사 조직 데이터의 최상위 구조.
 * 계층 구조(트리)를 지원하며 모든 도메인에서 재사용 가능합니다.
 *
 * @example
 * ```typescript
 * // 약사회 조직 구조 (지부 → 분회 2단 구조)
 * 서울지부 (지부, level=0, path="/seoul")
 *  ├─ 강남분회 (분회, level=1, path="/seoul/gangnam")
 *  └─ 강서분회 (분회, level=1, path="/seoul/gangseo")
 * 부산지부 (지부, level=0, path="/busan")
 *  └─ 해운대분회 (분회, level=1, path="/busan/haeundae")
 * ```
 */
@Entity('organizations')
@Index(['code'], { unique: true })
@Index(['parentId'])
@Index(['type'])
@Index(['isActive'])
export class Organization {
  /**
   * 조직 고유 ID (PK)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 조직명 (예: "서울지부", "강남분회")
   */
  @Column({ type: 'varchar', length: 255 })
  name!: string;

  /**
   * 조직 코드 (예: "SEOUL", "GANGNAM") - 고유값
   *
   * @unique
   */
  @Column({ type: 'varchar', length: 100, unique: true })
  code!: string;

  /**
   * 조직 유형
   * - division: 지부 (최상위 조직)
   * - branch: 분회 (하위 조직)
   */
  @Column({
    type: 'varchar',
    length: 50,
    default: 'branch',
  })
  type!: 'division' | 'branch';

  /**
   * 상위 조직 ID (null = 최상위 조직)
   */
  @Column({ type: 'uuid', nullable: true })
  parentId?: string;

  /**
   * 상위 조직 관계
   */
  @ManyToOne(() => Organization, (org) => org.children, { nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent?: Organization;

  /**
   * 하위 조직 목록
   */
  @OneToMany(() => Organization, (org) => org.parent)
  children!: Organization[];

  /**
   * 계층 레벨
   * - 0: 지부 (최상위 조직)
   * - 1: 분회 (하위 조직)
   */
  @Column({ type: 'int', default: 0 })
  level!: number;

  /**
   * 계층 경로 (예: "/seoul/gangnam")
   *
   * 하위 조직 조회 시 LIKE 검색에 사용됩니다.
   */
  @Column({ type: 'text' })
  path!: string;

  /**
   * 확장 필드 (주소, 연락처 등)
   *
   * @example
   * ```typescript
   * // 약사회 지부 메타데이터
   * {
   *   "address": "서울특별시 강남구 테헤란로 123",
   *   "phone": "02-1234-5678",
   *   "email": "seoul@yaksa.or.kr",
   *   "website": "https://seoul.yaksa.or.kr"
   * }
   *
   * // 화장품 매장 메타데이터
   * {
   *   "storeCode": "STORE-001",
   *   "managerName": "김매니저",
   *   "squareMeters": 150
   * }
   * ```
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  /**
   * 활성 여부
   */
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  /**
   * 하위 조직 개수 (캐시 필드)
   *
   * 조직 생성/삭제 시 자동으로 업데이트됩니다.
   */
  @Column({ type: 'int', default: 0 })
  childrenCount!: number;

  /**
   * 생성일시 (자동)
   */
  @CreateDateColumn()
  createdAt!: Date;

  /**
   * 수정일시 (자동)
   */
  @UpdateDateColumn()
  updatedAt!: Date;
}
