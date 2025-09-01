import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
  OneToMany
} from 'typeorm';
import { Product } from './Product';
import { User } from './User';
import { Order } from './Order';

@Entity('product_reviews')
@Index(['productId', 'userId'], { unique: true }) // 한 사용자는 한 상품에 하나의 리뷰만
@Index(['productId', 'rating']) // 평점별 조회용
@Index(['userId'])
@Index(['isVerifiedPurchase'])
export class ProductReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product, product => product.reviews)
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'uuid', nullable: true })
  variationId?: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid', nullable: true })
  orderId?: string;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'orderId' })
  order?: Order;

  @Column({ type: 'int' })
  rating: number; // 1-5

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'json', nullable: true })
  images?: string[];

  @Column({ type: 'json', nullable: true })
  pros?: string[]; // 장점

  @Column({ type: 'json', nullable: true })
  cons?: string[]; // 단점

  @Column({ default: false })
  isVerifiedPurchase: boolean;

  @Column({ default: false })
  isRecommended: boolean;

  @Column({ default: 0 })
  helpfulCount: number;

  @Column({ default: 0 })
  unhelpfulCount: number;

  @Column({ type: 'enum', enum: ['pending', 'approved', 'rejected'], default: 'pending' })
  status: 'pending' | 'approved' | 'rejected';

  @Column({ type: 'text', nullable: true })
  moderationNote?: string;

  @Column({ type: 'text', nullable: true })
  merchantReply?: string;

  @Column({ type: 'timestamp', nullable: true })
  merchantReplyAt?: Date;

  @Column({ type: 'json', nullable: true })
  attributes?: {
    size?: string;
    color?: string;
    fit?: string;
    quality?: string;
    [key: string]: any;
  };

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => ReviewVote, vote => vote.review)
  votes!: ReviewVote[];
}

@Entity('review_votes')
@Index(['reviewId', 'userId'], { unique: true }) // 한 사용자는 한 리뷰에 한 번만 투표
export class ReviewVote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  reviewId: string;

  @ManyToOne(() => ProductReview, review => review.votes)
  @JoinColumn({ name: 'reviewId' })
  review: ProductReview;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'enum', enum: ['helpful', 'unhelpful'] })
  voteType: 'helpful' | 'unhelpful';

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('wishlists')
@Index(['userId', 'productId'], { unique: true })
@Index(['userId'])
export class Wishlist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'uuid', nullable: true })
  variationId?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  priceWhenAdded: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  targetPrice?: number; // 가격 알림 설정

  @Column({ default: false })
  notifyOnPriceDrop: boolean;

  @Column({ default: false })
  notifyOnRestock: boolean;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ type: 'int', default: 0 })
  priority: number; // 우선순위

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}