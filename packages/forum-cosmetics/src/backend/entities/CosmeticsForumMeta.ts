import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm';

/**
 * Skin Type Enum
 */
export enum CosmeticsSkinType {
  DRY = 'dry',
  OILY = 'oily',
  COMBINATION = 'combination',
  SENSITIVE = 'sensitive',
  NORMAL = 'normal',
}

/**
 * Skin Concern Enum
 */
export enum CosmeticsConcern {
  PORES = 'pores',
  WHITENING = 'whitening',
  WRINKLES = 'wrinkles',
  ELASTICITY = 'elasticity',
  ACNE = 'acne',
  REDNESS = 'redness',
  DEAD_SKIN = 'dead_skin',
  SPOTS = 'spots',
  DARK_CIRCLES = 'dark_circles',
}

/**
 * Post Type for Cosmetics Forum
 */
export enum CosmeticsPostType {
  REVIEW = 'review',
  ROUTINE = 'routine',
  QUESTION = 'question',
  TIP = 'tip',
  INGREDIENT = 'ingredient',
}

/**
 * Cosmetics Forum Meta Entity
 *
 * Stores cosmetics-specific metadata for forum posts.
 * This is stored as extension data in ForumPost.metadata.extensions.cosmetics
 * but also maintained in a separate table for efficient querying.
 */
@Entity('cosmetics_forum_meta')
@Index(['postId'])
@Index(['skinType'])
@Index(['brand'])
@Index(['rating'])
export class CosmeticsForumMeta {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  postId!: string;

  @Column({
    type: 'enum',
    enum: CosmeticsSkinType,
    nullable: true,
  })
  skinType?: CosmeticsSkinType;

  @Column({
    type: 'simple-array',
    nullable: true,
  })
  concerns?: string[];

  @Column({ type: 'varchar', length: 100, nullable: true })
  brand?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  productId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  productName?: string;

  @Column({ type: 'decimal', precision: 2, scale: 1, nullable: true })
  rating?: number;

  @Column({
    type: 'simple-array',
    nullable: true,
  })
  ingredients?: string[];

  @Column({
    type: 'enum',
    enum: CosmeticsPostType,
    default: CosmeticsPostType.REVIEW,
  })
  postType!: CosmeticsPostType;

  @Column({ type: 'boolean', default: false })
  isVerifiedPurchase!: boolean;

  @Column({ type: 'boolean', default: false })
  isFeatured!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  additionalData?: Record<string, unknown>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
