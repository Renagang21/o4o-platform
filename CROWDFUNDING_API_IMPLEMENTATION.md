# 크라우드펀딩 시스템 API 구현 작업 지시서

## 📋 작업 개요
O4O Platform의 B2B 크라우드펀딩 시스템을 완성하는 작업입니다.
현재 기본 CRUD(60%)는 구현되었으나, 리워드 시스템, 참여자 관리, 결제 통합이 필요합니다.

## 🎯 작업 목표
1. 리워드 시스템 구축 (엔티티, 서비스, API)
2. 참여자(Backer) 관리 기능 구현
3. Toss Payments 결제 통합
4. 리포트 및 분석 기능 구현

## 📁 현재 파일 구조
```
apps/api-server/src/
├── entities/
│   ├── CrowdfundingProject.ts (✅ 완성)
│   ├── CrowdfundingParticipation.ts (✅ 완성)
│   ├── CrowdfundingReward.ts (❌ 생성 필요)
│   └── CrowdfundingBacker.ts (❌ 생성 필요)
├── services/
│   ├── CrowdfundingService.ts (🔶 확장 필요)
│   ├── CrowdfundingRewardService.ts (❌ 생성 필요)
│   └── CrowdfundingBackerService.ts (❌ 생성 필요)
└── controllers/
    ├── crowdfundingController.ts (🔶 확장 필요)
    └── crowdfundingRewardController.ts (❌ 생성 필요)
```

## 🔧 Phase 1: 리워드 시스템 구현

### 1.1 CrowdfundingReward 엔티티 생성
**파일 위치**: `apps/api-server/src/entities/CrowdfundingReward.ts`

```typescript
import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  ManyToOne, 
  OneToMany, 
  CreateDateColumn, 
  UpdateDateColumn,
  Index 
} from 'typeorm';
import { CrowdfundingProject } from './CrowdfundingProject';
import { CrowdfundingBacker } from './CrowdfundingBacker';

@Entity('crowdfunding_rewards')
@Index(['project', 'sortOrder'])
@Index(['status'])
export class CrowdfundingReward {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => CrowdfundingProject, project => project.rewards)
  project: CrowdfundingProject;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column('decimal', { precision: 10, scale: 2 })
  minAmount: number; // 최소 펀딩 금액

  @Column({ nullable: true })
  quantity?: number; // 총 수량 (null = 무제한)

  @Column({ default: 0 })
  quantityClaimed: number; // 선택된 수량

  @Column({ type: 'date', nullable: true })
  deliveryDate?: Date; // 예상 배송일

  @Column({ default: false })
  shippingRequired: boolean; // 배송 필요 여부

  @Column('simple-array', { nullable: true })
  items?: string[]; // 포함 아이템 리스트

  @Column({ nullable: true })
  imageUrl?: string;

  @Column({
    type: 'enum',
    enum: ['active', 'sold_out', 'hidden'],
    default: 'active'
  })
  status: 'active' | 'sold_out' | 'hidden';

  @Column({ default: 0 })
  sortOrder: number; // 표시 순서

  @OneToMany(() => CrowdfundingBacker, backer => backer.reward)
  backers: CrowdfundingBacker[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // 가용 수량 계산
  get availableQuantity(): number | null {
    if (!this.quantity) return null;
    return this.quantity - this.quantityClaimed;
  }

  // 품절 여부
  get isSoldOut(): boolean {
    if (!this.quantity) return false;
    return this.quantityClaimed >= this.quantity;
  }
}
```

### 1.2 CrowdfundingBacker 엔티티 생성
**파일 위치**: `apps/api-server/src/entities/CrowdfundingBacker.ts`

```typescript
import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  ManyToOne, 
  CreateDateColumn, 
  UpdateDateColumn,
  Index,
  OneToOne,
  JoinColumn
} from 'typeorm';
import { CrowdfundingProject } from './CrowdfundingProject';
import { CrowdfundingReward } from './CrowdfundingReward';
import { User } from './User';
import { Payment } from './Payment';

@Entity('crowdfunding_backers')
@Index(['project', 'user'])
@Index(['paymentStatus'])
@Index(['createdAt'])
export class CrowdfundingBacker {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => CrowdfundingProject, project => project.backers)
  project: CrowdfundingProject;

  @ManyToOne(() => User)
  user: User;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @ManyToOne(() => CrowdfundingReward, { nullable: true })
  reward?: CrowdfundingReward;

  @Column({
    type: 'enum',
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  })
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';

  @OneToOne(() => Payment, { nullable: true })
  @JoinColumn()
  payment?: Payment;

  @Column({ nullable: true })
  paymentMethod?: string;

  @Column({ type: 'timestamp', nullable: true })
  paymentDate?: Date;

  @Column('json', { nullable: true })
  shippingAddress?: {
    name: string;
    phone: string;
    address: string;
    addressDetail?: string;
    postalCode: string;
  };

  @Column({
    type: 'enum',
    enum: ['pending', 'preparing', 'shipped', 'delivered', 'returned'],
    nullable: true
  })
  deliveryStatus?: 'pending' | 'preparing' | 'shipped' | 'delivered' | 'returned';

  @Column({ nullable: true })
  trackingNumber?: string;

  @Column({ type: 'text', nullable: true })
  message?: string; // 응원 메시지

  @Column({ default: false })
  isAnonymous: boolean; // 익명 참여

  @Column({ type: 'text', nullable: true })
  refundReason?: string;

  @Column({ type: 'timestamp', nullable: true })
  refundedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 1.3 엔티티 관계 업데이트
**파일 수정**: `apps/api-server/src/entities/CrowdfundingProject.ts`에 추가

```typescript
import { CrowdfundingReward } from './CrowdfundingReward';
import { CrowdfundingBacker } from './CrowdfundingBacker';

// CrowdfundingProject 엔티티에 추가
@OneToMany(() => CrowdfundingReward, reward => reward.project)
rewards: CrowdfundingReward[];

@OneToMany(() => CrowdfundingBacker, backer => backer.project)
backers: CrowdfundingBacker[];
```

## 🔧 Phase 2: 리워드 서비스 구현

### 2.1 CrowdfundingRewardService 생성
**파일 위치**: `apps/api-server/src/services/CrowdfundingRewardService.ts`

```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrowdfundingReward } from '../entities/CrowdfundingReward';
import { CrowdfundingProject } from '../entities/CrowdfundingProject';
import { EventEmitter2 } from '@nestjs/event-emitter';
import logger from '../utils/simpleLogger';

interface CreateRewardDto {
  projectId: string;
  title: string;
  description: string;
  minAmount: number;
  quantity?: number;
  deliveryDate?: Date;
  shippingRequired?: boolean;
  items?: string[];
  imageUrl?: string;
}

interface UpdateRewardDto {
  title?: string;
  description?: string;
  minAmount?: number;
  quantity?: number;
  deliveryDate?: Date;
  shippingRequired?: boolean;
  items?: string[];
  imageUrl?: string;
  status?: 'active' | 'sold_out' | 'hidden';
}

@Injectable()
export class CrowdfundingRewardService {
  constructor(
    @InjectRepository(CrowdfundingReward)
    private rewardRepository: Repository<CrowdfundingReward>,
    @InjectRepository(CrowdfundingProject)
    private projectRepository: Repository<CrowdfundingProject>,
    private eventEmitter: EventEmitter2,
  ) {}

  // 리워드 목록 조회
  async getRewards(projectId: string) {
    const rewards = await this.rewardRepository.find({
      where: { project: { id: projectId } },
      order: { sortOrder: 'ASC', minAmount: 'ASC' }
    });

    return rewards.map(reward => ({
      ...reward,
      availableQuantity: reward.availableQuantity,
      isSoldOut: reward.isSoldOut
    }));
  }

  // 리워드 상세 조회
  async getReward(id: string) {
    const reward = await this.rewardRepository.findOne({
      where: { id },
      relations: ['project', 'backers']
    });

    if (!reward) {
      throw new NotFoundException('리워드를 찾을 수 없습니다');
    }

    return reward;
  }

  // 리워드 생성
  async createReward(data: CreateRewardDto) {
    const project = await this.projectRepository.findOne({
      where: { id: data.projectId }
    });

    if (!project) {
      throw new NotFoundException('프로젝트를 찾을 수 없습니다');
    }

    // 프로젝트 상태 확인
    if (project.status !== 'recruiting') {
      throw new BadRequestException('모집 중인 프로젝트만 리워드를 추가할 수 있습니다');
    }

    // 다음 sortOrder 계산
    const maxOrder = await this.rewardRepository
      .createQueryBuilder('reward')
      .where('reward.projectId = :projectId', { projectId: data.projectId })
      .select('MAX(reward.sortOrder)', 'max')
      .getRawOne();

    const reward = this.rewardRepository.create({
      project,
      ...data,
      sortOrder: (maxOrder?.max || 0) + 1
    });

    const savedReward = await this.rewardRepository.save(reward);

    // 이벤트 발생
    this.eventEmitter.emit('reward.created', {
      rewardId: savedReward.id,
      projectId: project.id
    });

    logger.info(`Reward created: ${savedReward.id} for project ${project.id}`);

    return savedReward;
  }

  // 리워드 수정
  async updateReward(id: string, data: UpdateRewardDto) {
    const reward = await this.getReward(id);

    // 프로젝트 상태 확인
    if (reward.project.status !== 'recruiting') {
      throw new BadRequestException('모집 중인 프로젝트의 리워드만 수정할 수 있습니다');
    }

    // 수량 변경 시 검증
    if (data.quantity !== undefined && data.quantity < reward.quantityClaimed) {
      throw new BadRequestException('이미 선택된 수량보다 적게 설정할 수 없습니다');
    }

    Object.assign(reward, data);

    // 품절 상태 자동 업데이트
    if (reward.quantity && reward.quantityClaimed >= reward.quantity) {
      reward.status = 'sold_out';
    }

    return this.rewardRepository.save(reward);
  }

  // 리워드 삭제
  async deleteReward(id: string) {
    const reward = await this.getReward(id);

    // 이미 선택한 참여자가 있는지 확인
    if (reward.quantityClaimed > 0) {
      throw new BadRequestException('이미 선택한 참여자가 있는 리워드는 삭제할 수 없습니다');
    }

    await this.rewardRepository.remove(reward);

    logger.info(`Reward deleted: ${id}`);
  }

  // 리워드 상태 변경
  async updateRewardStatus(id: string, status: 'active' | 'sold_out' | 'hidden') {
    const reward = await this.getReward(id);
    
    reward.status = status;
    
    return this.rewardRepository.save(reward);
  }

  // 리워드 순서 변경
  async updateRewardOrder(projectId: string, rewardOrders: { id: string; order: number }[]) {
    const rewards = await this.rewardRepository.find({
      where: { project: { id: projectId } }
    });

    for (const orderItem of rewardOrders) {
      const reward = rewards.find(r => r.id === orderItem.id);
      if (reward) {
        reward.sortOrder = orderItem.order;
        await this.rewardRepository.save(reward);
      }
    }

    return this.getRewards(projectId);
  }

  // 리워드 선택 (참여자가 리워드 선택 시)
  async claimReward(rewardId: string, userId: string) {
    const reward = await this.getReward(rewardId);

    // 수량 확인
    if (reward.isSoldOut) {
      throw new BadRequestException('품절된 리워드입니다');
    }

    // 상태 확인
    if (reward.status !== 'active') {
      throw new BadRequestException('선택할 수 없는 리워드입니다');
    }

    // 수량 증가
    reward.quantityClaimed++;

    // 품절 처리
    if (reward.quantity && reward.quantityClaimed >= reward.quantity) {
      reward.status = 'sold_out';
    }

    await this.rewardRepository.save(reward);

    // 이벤트 발생
    this.eventEmitter.emit('reward.claimed', {
      rewardId,
      userId,
      projectId: reward.project.id
    });

    return reward;
  }

  // 리워드 선택 취소
  async unclaimReward(rewardId: string, userId: string) {
    const reward = await this.getReward(rewardId);

    if (reward.quantityClaimed > 0) {
      reward.quantityClaimed--;

      // 품절 상태 해제
      if (reward.status === 'sold_out' && reward.quantity && reward.quantityClaimed < reward.quantity) {
        reward.status = 'active';
      }

      await this.rewardRepository.save(reward);
    }

    return reward;
  }

  // 프로젝트별 리워드 통계
  async getRewardStatistics(projectId: string) {
    const rewards = await this.getRewards(projectId);

    const totalRewards = rewards.length;
    const activeRewards = rewards.filter(r => r.status === 'active').length;
    const soldOutRewards = rewards.filter(r => r.isSoldOut).length;
    const totalClaimed = rewards.reduce((sum, r) => sum + r.quantityClaimed, 0);
    const totalAvailable = rewards.reduce((sum, r) => {
      if (!r.quantity) return sum + 100; // 무제한은 100으로 계산
      return sum + (r.quantity - r.quantityClaimed);
    }, 0);

    return {
      totalRewards,
      activeRewards,
      soldOutRewards,
      totalClaimed,
      totalAvailable,
      rewards: rewards.map(r => ({
        id: r.id,
        title: r.title,
        minAmount: r.minAmount,
        quantityClaimed: r.quantityClaimed,
        availableQuantity: r.availableQuantity,
        claimRate: r.quantity ? (r.quantityClaimed / r.quantity) * 100 : 0
      }))
    };
  }
}
```

## 🔧 Phase 3: 참여자 관리 서비스 구현

### 3.1 CrowdfundingBackerService 생성
**파일 위치**: `apps/api-server/src/services/CrowdfundingBackerService.ts`

```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { CrowdfundingBacker } from '../entities/CrowdfundingBacker';
import { CrowdfundingProject } from '../entities/CrowdfundingProject';
import { CrowdfundingReward } from '../entities/CrowdfundingReward';
import { User } from '../entities/User';
import { Payment } from '../entities/Payment';
import { TossPaymentsService } from './TossPaymentsService';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import logger from '../utils/simpleLogger';
import * as nodemailer from 'nodemailer';

interface BackProjectDto {
  projectId: string;
  userId: string;
  amount: number;
  rewardId?: string;
  message?: string;
  isAnonymous?: boolean;
  shippingAddress?: {
    name: string;
    phone: string;
    address: string;
    addressDetail?: string;
    postalCode: string;
  };
}

interface BackerFilterDto {
  projectId?: string;
  paymentStatus?: string;
  deliveryStatus?: string;
  search?: string;
  skip?: number;
  take?: number;
}

@Injectable()
export class CrowdfundingBackerService {
  private mailer: nodemailer.Transporter;

  constructor(
    @InjectRepository(CrowdfundingBacker)
    private backerRepository: Repository<CrowdfundingBacker>,
    @InjectRepository(CrowdfundingProject)
    private projectRepository: Repository<CrowdfundingProject>,
    @InjectRepository(CrowdfundingReward)
    private rewardRepository: Repository<CrowdfundingReward>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    private tossPaymentsService: TossPaymentsService,
    private eventEmitter: EventEmitter2,
  ) {
    // 메일 전송 설정
    this.mailer = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // 프로젝트 참여 (펀딩)
  async backProject(data: BackProjectDto) {
    // 프로젝트 확인
    const project = await this.projectRepository.findOne({
      where: { id: data.projectId }
    });

    if (!project) {
      throw new NotFoundException('프로젝트를 찾을 수 없습니다');
    }

    if (project.status !== 'recruiting') {
      throw new BadRequestException('모집 중인 프로젝트만 참여할 수 있습니다');
    }

    // 사용자 확인
    const user = await this.userRepository.findOne({
      where: { id: data.userId }
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다');
    }

    // 리워드 확인 및 선택
    let reward: CrowdfundingReward | undefined;
    if (data.rewardId) {
      reward = await this.rewardRepository.findOne({
        where: { id: data.rewardId, project: { id: data.projectId } }
      });

      if (!reward) {
        throw new NotFoundException('리워드를 찾을 수 없습니다');
      }

      if (reward.minAmount > data.amount) {
        throw new BadRequestException(`이 리워드는 최소 ${reward.minAmount}원 이상 펀딩해야 합니다`);
      }

      if (reward.isSoldOut) {
        throw new BadRequestException('품절된 리워드입니다');
      }

      // 배송지 필수 확인
      if (reward.shippingRequired && !data.shippingAddress) {
        throw new BadRequestException('이 리워드는 배송지 정보가 필요합니다');
      }
    }

    // 중복 참여 확인
    const existingBacker = await this.backerRepository.findOne({
      where: {
        project: { id: data.projectId },
        user: { id: data.userId },
        paymentStatus: 'paid'
      }
    });

    if (existingBacker) {
      throw new BadRequestException('이미 이 프로젝트에 참여하셨습니다');
    }

    // Backer 생성
    const backer = this.backerRepository.create({
      project,
      user,
      amount: data.amount,
      reward,
      message: data.message,
      isAnonymous: data.isAnonymous || false,
      shippingAddress: data.shippingAddress,
      paymentStatus: 'pending',
      deliveryStatus: reward?.shippingRequired ? 'pending' : undefined
    });

    const savedBacker = await this.backerRepository.save(backer);

    // 결제 처리
    try {
      const payment = await this.processPayment(savedBacker);
      
      savedBacker.payment = payment;
      savedBacker.paymentStatus = 'paid';
      savedBacker.paymentDate = new Date();
      savedBacker.paymentMethod = payment.method;
      
      await this.backerRepository.save(savedBacker);

      // 리워드 수량 업데이트
      if (reward) {
        reward.quantityClaimed++;
        if (reward.quantity && reward.quantityClaimed >= reward.quantity) {
          reward.status = 'sold_out';
        }
        await this.rewardRepository.save(reward);
      }

      // 프로젝트 통계 업데이트
      project.currentAmount += data.amount;
      project.participantCount++;
      
      // 목표 달성 확인
      if (project.currentAmount >= project.targetAmount) {
        project.status = 'funded';
        this.eventEmitter.emit('project.funded', { projectId: project.id });
      }
      
      await this.projectRepository.save(project);

      // 이벤트 발생
      this.eventEmitter.emit('project.backed', {
        backerId: savedBacker.id,
        projectId: project.id,
        amount: data.amount,
        userId: user.id
      });

      // 확인 이메일 전송
      await this.sendConfirmationEmail(savedBacker);

      logger.info(`User ${user.id} backed project ${project.id} with ${data.amount}`);

      return savedBacker;
    } catch (error) {
      // 결제 실패 처리
      savedBacker.paymentStatus = 'failed';
      await this.backerRepository.save(savedBacker);
      
      throw new BadRequestException('결제 처리 중 오류가 발생했습니다');
    }
  }

  // 결제 처리
  private async processPayment(backer: CrowdfundingBacker): Promise<Payment> {
    const paymentData = {
      amount: backer.amount,
      orderId: `CROWD-${backer.project.id}-${backer.id}`,
      orderName: `${backer.project.title} 펀딩`,
      customerName: backer.user.name,
      customerEmail: backer.user.email,
      successUrl: `${process.env.FRONTEND_URL}/crowdfunding/success`,
      failUrl: `${process.env.FRONTEND_URL}/crowdfunding/fail`
    };

    const tossPayment = await this.tossPaymentsService.createPayment(paymentData);
    
    // Payment 엔티티 생성
    const payment = this.paymentRepository.create({
      amount: backer.amount,
      method: 'card', // 기본값
      status: 'completed',
      provider: 'toss',
      providerPaymentKey: tossPayment.paymentKey,
      providerOrderId: tossPayment.orderId,
      user: backer.user
    });

    return this.paymentRepository.save(payment);
  }

  // 참여자 목록 조회
  async getBackers(filter: BackerFilterDto) {
    const query = this.backerRepository.createQueryBuilder('backer')
      .leftJoinAndSelect('backer.user', 'user')
      .leftJoinAndSelect('backer.reward', 'reward')
      .leftJoinAndSelect('backer.project', 'project');

    if (filter.projectId) {
      query.andWhere('backer.project.id = :projectId', { projectId: filter.projectId });
    }

    if (filter.paymentStatus) {
      query.andWhere('backer.paymentStatus = :status', { status: filter.paymentStatus });
    }

    if (filter.deliveryStatus) {
      query.andWhere('backer.deliveryStatus = :status', { status: filter.deliveryStatus });
    }

    if (filter.search) {
      query.andWhere('(user.name LIKE :search OR user.email LIKE :search OR user.phone LIKE :search)', 
        { search: `%${filter.search}%` });
    }

    const [backers, total] = await query
      .skip(filter.skip || 0)
      .take(filter.take || 20)
      .orderBy('backer.createdAt', 'DESC')
      .getManyAndCount();

    // 통계 계산
    const stats = await this.getBackerStatistics(filter.projectId);

    return {
      data: backers.map(b => ({
        ...b,
        userName: b.isAnonymous ? '익명' : b.user.name,
        userEmail: b.isAnonymous ? null : b.user.email,
        userPhone: b.isAnonymous ? null : b.user.phone
      })),
      total,
      stats
    };
  }

  // 참여자 통계
  private async getBackerStatistics(projectId?: string) {
    const query = this.backerRepository.createQueryBuilder('backer');
    
    if (projectId) {
      query.where('backer.project.id = :projectId', { projectId });
    }

    const totalBackers = await query.getCount();
    
    const totalAmount = await query
      .select('SUM(backer.amount)', 'total')
      .getRawOne();

    const completedPayments = await query
      .andWhere('backer.paymentStatus = :status', { status: 'paid' })
      .getCount();

    const pendingPayments = await query
      .andWhere('backer.paymentStatus = :status', { status: 'pending' })
      .getCount();

    const refundedPayments = await query
      .andWhere('backer.paymentStatus = :status', { status: 'refunded' })
      .getCount();

    return {
      totalBackers,
      totalAmount: totalAmount?.total || 0,
      averageAmount: totalBackers > 0 ? (totalAmount?.total || 0) / totalBackers : 0,
      completedPayments,
      pendingPayments,
      refundedPayments
    };
  }

  // 참여자에게 메시지 전송
  async sendMessageToBacker(backerId: string, message: string) {
    const backer = await this.backerRepository.findOne({
      where: { id: backerId },
      relations: ['user', 'project']
    });

    if (!backer) {
      throw new NotFoundException('참여자를 찾을 수 없습니다');
    }

    // 이메일 전송
    await this.mailer.sendMail({
      from: process.env.SMTP_FROM,
      to: backer.user.email,
      subject: `[${backer.project.title}] 프로젝트 창작자로부터 메시지`,
      html: `
        <h2>프로젝트 창작자로부터 메시지가 도착했습니다</h2>
        <p>${message}</p>
        <hr>
        <p>프로젝트: ${backer.project.title}</p>
        <p>펀딩액: ${backer.amount.toLocaleString()}원</p>
      `
    });

    logger.info(`Message sent to backer ${backerId}`);
  }

  // 환불 처리
  async processRefund(backerId: string, reason: string) {
    const backer = await this.backerRepository.findOne({
      where: { id: backerId },
      relations: ['user', 'project', 'reward', 'payment']
    });

    if (!backer) {
      throw new NotFoundException('참여자를 찾을 수 없습니다');
    }

    if (backer.paymentStatus !== 'paid') {
      throw new BadRequestException('결제 완료된 참여만 환불할 수 있습니다');
    }

    // Toss Payments 환불 처리
    if (backer.payment) {
      await this.tossPaymentsService.cancelPayment(
        backer.payment.providerPaymentKey,
        reason
      );
    }

    // 상태 업데이트
    backer.paymentStatus = 'refunded';
    backer.refundReason = reason;
    backer.refundedAt = new Date();
    await this.backerRepository.save(backer);

    // 프로젝트 통계 업데이트
    const project = backer.project;
    project.currentAmount -= backer.amount;
    project.participantCount--;
    await this.projectRepository.save(project);

    // 리워드 수량 복구
    if (backer.reward) {
      backer.reward.quantityClaimed--;
      if (backer.reward.status === 'sold_out' && backer.reward.quantityClaimed < backer.reward.quantity) {
        backer.reward.status = 'active';
      }
      await this.rewardRepository.save(backer.reward);
    }

    // 환불 알림 이메일
    await this.sendRefundEmail(backer, reason);

    logger.info(`Refund processed for backer ${backerId}`);

    return backer;
  }

  // 배송 상태 업데이트
  async updateDeliveryStatus(backerId: string, status: string, trackingNumber?: string) {
    const backer = await this.backerRepository.findOne({
      where: { id: backerId }
    });

    if (!backer) {
      throw new NotFoundException('참여자를 찾을 수 없습니다');
    }

    backer.deliveryStatus = status as any;
    if (trackingNumber) {
      backer.trackingNumber = trackingNumber;
    }

    await this.backerRepository.save(backer);

    // 배송 시작 알림
    if (status === 'shipped' && trackingNumber) {
      await this.sendShippingNotification(backer, trackingNumber);
    }

    return backer;
  }

  // 참여자 목록 내보내기 (CSV)
  async exportBackers(projectId: string): Promise<string> {
    const backers = await this.backerRepository.find({
      where: { project: { id: projectId } },
      relations: ['user', 'reward'],
      order: { createdAt: 'DESC' }
    });

    const csv = [
      'ID,이름,이메일,전화번호,펀딩액,리워드,결제상태,결제일,배송지,운송장번호,메시지',
      ...backers.map(b => [
        b.id,
        b.isAnonymous ? '익명' : b.user.name,
        b.isAnonymous ? '' : b.user.email,
        b.isAnonymous ? '' : b.user.phone || '',
        b.amount,
        b.reward?.title || '',
        b.paymentStatus,
        b.paymentDate?.toISOString() || '',
        b.shippingAddress ? `${b.shippingAddress.address} ${b.shippingAddress.addressDetail || ''}` : '',
        b.trackingNumber || '',
        b.message || ''
      ].join(','))
    ].join('\n');

    return csv;
  }

  // 확인 이메일 전송
  private async sendConfirmationEmail(backer: CrowdfundingBacker) {
    await this.mailer.sendMail({
      from: process.env.SMTP_FROM,
      to: backer.user.email,
      subject: `[${backer.project.title}] 펀딩 참여 확인`,
      html: `
        <h2>펀딩 참여가 완료되었습니다!</h2>
        <p>프로젝트: ${backer.project.title}</p>
        <p>펀딩액: ${backer.amount.toLocaleString()}원</p>
        ${backer.reward ? `<p>선택 리워드: ${backer.reward.title}</p>` : ''}
        ${backer.message ? `<p>응원 메시지: ${backer.message}</p>` : ''}
        <hr>
        <p>프로젝트가 성공적으로 마무리되면 추가 안내를 드리겠습니다.</p>
      `
    });
  }

  // 환불 이메일 전송
  private async sendRefundEmail(backer: CrowdfundingBacker, reason: string) {
    await this.mailer.sendMail({
      from: process.env.SMTP_FROM,
      to: backer.user.email,
      subject: `[${backer.project.title}] 펀딩 환불 안내`,
      html: `
        <h2>펀딩이 환불 처리되었습니다</h2>
        <p>프로젝트: ${backer.project.title}</p>
        <p>환불액: ${backer.amount.toLocaleString()}원</p>
        <p>환불 사유: ${reason}</p>
        <hr>
        <p>환불은 영업일 기준 3-5일 내에 처리됩니다.</p>
      `
    });
  }

  // 배송 알림 전송
  private async sendShippingNotification(backer: CrowdfundingBacker, trackingNumber: string) {
    await this.mailer.sendMail({
      from: process.env.SMTP_FROM,
      to: backer.user.email,
      subject: `[${backer.project.title}] 리워드 배송 시작`,
      html: `
        <h2>리워드 배송이 시작되었습니다!</h2>
        <p>프로젝트: ${backer.project.title}</p>
        <p>리워드: ${backer.reward?.title}</p>
        <p>운송장 번호: ${trackingNumber}</p>
        <hr>
        <p>배송 추적: <a href="https://tracker.delivery/#/${trackingNumber}">여기를 클릭</a></p>
      `
    });
  }

  // 정기 작업: 프로젝트 마감 처리
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkProjectDeadlines() {
    const now = new Date();
    
    // 마감된 프로젝트 찾기
    const projects = await this.projectRepository.find({
      where: {
        status: 'recruiting',
        endDate: Between(new Date(now.getTime() - 24 * 60 * 60 * 1000), now)
      }
    });

    for (const project of projects) {
      if (project.currentAmount >= project.targetAmount) {
        project.status = 'funded';
        
        // 성공 알림 전송
        await this.notifyProjectSuccess(project);
      } else {
        project.status = 'failed';
        
        // 실패 처리 및 환불
        await this.handleProjectFailure(project);
      }
      
      await this.projectRepository.save(project);
    }

    logger.info(`Checked ${projects.length} project deadlines`);
  }

  // 프로젝트 성공 알림
  private async notifyProjectSuccess(project: CrowdfundingProject) {
    const backers = await this.backerRepository.find({
      where: { project: { id: project.id }, paymentStatus: 'paid' },
      relations: ['user']
    });

    for (const backer of backers) {
      await this.mailer.sendMail({
        from: process.env.SMTP_FROM,
        to: backer.user.email,
        subject: `[${project.title}] 프로젝트 펀딩 성공!`,
        html: `
          <h2>축하합니다! 프로젝트가 성공했습니다!</h2>
          <p>${project.title} 프로젝트가 목표 금액을 달성했습니다.</p>
          <p>달성률: ${Math.round((project.currentAmount / project.targetAmount) * 100)}%</p>
          <hr>
          <p>리워드 배송 등 후속 절차는 별도로 안내드리겠습니다.</p>
        `
      });
    }
  }

  // 프로젝트 실패 처리
  private async handleProjectFailure(project: CrowdfundingProject) {
    const backers = await this.backerRepository.find({
      where: { project: { id: project.id }, paymentStatus: 'paid' },
      relations: ['user']
    });

    for (const backer of backers) {
      // 자동 환불 처리
      await this.processRefund(backer.id, '프로젝트 목표 미달성으로 인한 자동 환불');
    }
  }
}
```

## 🔧 Phase 4: Controller 구현

### 4.1 CrowdfundingRewardController 생성
**파일 위치**: `apps/api-server/src/controllers/crowdfundingRewardController.ts`

```typescript
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CrowdfundingRewardService } from '../services/CrowdfundingRewardService';
import { CrowdfundingBackerService } from '../services/CrowdfundingBackerService';

@ApiTags('crowdfunding')
@Controller('crowdfunding')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CrowdfundingRewardController {
  constructor(
    private readonly rewardService: CrowdfundingRewardService,
    private readonly backerService: CrowdfundingBackerService,
  ) {}

  // 리워드 관련 엔드포인트
  @Get('projects/:projectId/rewards')
  @ApiOperation({ summary: '프로젝트 리워드 목록 조회' })
  async getRewards(@Param('projectId') projectId: string) {
    const rewards = await this.rewardService.getRewards(projectId);
    return { success: true, data: rewards };
  }

  @Get('rewards/:id')
  @ApiOperation({ summary: '리워드 상세 조회' })
  async getReward(@Param('id') id: string) {
    const reward = await this.rewardService.getReward(id);
    return { success: true, data: reward };
  }

  @Post('projects/:projectId/rewards')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '리워드 생성' })
  async createReward(
    @Param('projectId') projectId: string,
    @Body() data: any
  ) {
    const reward = await this.rewardService.createReward({ ...data, projectId });
    return { success: true, data: reward };
  }

  @Put('rewards/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '리워드 수정' })
  async updateReward(
    @Param('id') id: string,
    @Body() data: any
  ) {
    const reward = await this.rewardService.updateReward(id, data);
    return { success: true, data: reward };
  }

  @Delete('rewards/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '리워드 삭제' })
  async deleteReward(@Param('id') id: string) {
    await this.rewardService.deleteReward(id);
    return { success: true };
  }

  @Patch('rewards/:id/status')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '리워드 상태 변경' })
  async updateRewardStatus(
    @Param('id') id: string,
    @Body('status') status: 'active' | 'sold_out' | 'hidden'
  ) {
    const reward = await this.rewardService.updateRewardStatus(id, status);
    return { success: true, data: reward };
  }

  // 참여자 관련 엔드포인트
  @Get('projects/:projectId/backers')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '프로젝트 참여자 목록 조회' })
  async getBackers(
    @Param('projectId') projectId: string,
    @Query() filter: any
  ) {
    const result = await this.backerService.getBackers({ ...filter, projectId });
    return { success: true, ...result };
  }

  @Post('projects/:projectId/back')
  @ApiOperation({ summary: '프로젝트 참여 (펀딩)' })
  async backProject(
    @Param('projectId') projectId: string,
    @Body() data: any,
    @Request() req: any
  ) {
    const backer = await this.backerService.backProject({
      ...data,
      projectId,
      userId: req.user.id
    });
    return { success: true, data: backer };
  }

  @Post('backers/:id/message')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '참여자에게 메시지 전송' })
  async sendMessage(
    @Param('id') backerId: string,
    @Body('message') message: string
  ) {
    await this.backerService.sendMessageToBacker(backerId, message);
    return { success: true };
  }

  @Post('backers/:id/refund')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '참여자 환불 처리' })
  async processRefund(
    @Param('id') backerId: string,
    @Body('reason') reason: string
  ) {
    const backer = await this.backerService.processRefund(backerId, reason);
    return { success: true, data: backer };
  }

  @Patch('backers/:id/delivery')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '배송 상태 업데이트' })
  async updateDeliveryStatus(
    @Param('id') backerId: string,
    @Body() data: { status: string; trackingNumber?: string }
  ) {
    const backer = await this.backerService.updateDeliveryStatus(
      backerId,
      data.status,
      data.trackingNumber
    );
    return { success: true, data: backer };
  }

  @Get('projects/:projectId/backers/export')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '참여자 목록 내보내기' })
  async exportBackers(@Param('projectId') projectId: string) {
    const csv = await this.backerService.exportBackers(projectId);
    return csv; // Response with CSV headers
  }

  @Get('projects/:projectId/statistics')
  @ApiOperation({ summary: '프로젝트 통계' })
  async getProjectStatistics(@Param('projectId') projectId: string) {
    const rewardStats = await this.rewardService.getRewardStatistics(projectId);
    const backerStats = await this.backerService.getBackerStatistics(projectId);
    
    return {
      success: true,
      data: {
        rewards: rewardStats,
        backers: backerStats
      }
    };
  }
}

// Request import 추가
import { Request } from '@nestjs/common';
import { Patch } from '@nestjs/common';
```

## 🔧 Phase 5: 마이그레이션 생성

```bash
# 크라우드펀딩 리워드 및 참여자 테이블 생성
cd apps/api-server
npm run migration:generate -- -n AddCrowdfundingRewardsAndBackers

# 마이그레이션 실행
npm run migration:run
```

## 🔧 Phase 6: 환경 변수 설정

**.env 파일에 추가**
```env
# SMTP 설정 (이메일 전송)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@o4o-platform.com

# 프론트엔드 URL
FRONTEND_URL=http://localhost:5173
```

## 📊 테스트 시나리오

### 1. 리워드 관리 테스트
```bash
# 리워드 생성
curl -X POST http://localhost:3001/api/crowdfunding/projects/{projectId}/rewards \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "얼리버드 패키지",
    "description": "한정 수량 특별 패키지",
    "minAmount": 50000,
    "quantity": 100,
    "deliveryDate": "2024-06-01",
    "shippingRequired": true,
    "items": ["제품 본품", "스티커 세트", "감사 카드"]
  }'

# 리워드 목록 조회
curl -X GET http://localhost:3001/api/crowdfunding/projects/{projectId}/rewards \
  -H "Authorization: Bearer ${JWT_TOKEN}"
```

### 2. 펀딩 참여 테스트
```bash
# 프로젝트 참여
curl -X POST http://localhost:3001/api/crowdfunding/projects/{projectId}/back \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100000,
    "rewardId": "reward-id",
    "message": "프로젝트 응원합니다!",
    "shippingAddress": {
      "name": "홍길동",
      "phone": "010-1234-5678",
      "address": "서울시 강남구",
      "postalCode": "06000"
    }
  }'

# 참여자 목록 조회
curl -X GET http://localhost:3001/api/crowdfunding/projects/{projectId}/backers \
  -H "Authorization: Bearer ${JWT_TOKEN}"
```

### 3. 환불 처리 테스트
```bash
# 환불 처리
curl -X POST http://localhost:3001/api/crowdfunding/backers/{backerId}/refund \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "고객 요청에 의한 환불"
  }'
```

## 🚀 배포 체크리스트

1. **데이터베이스 마이그레이션**
   - [ ] CrowdfundingReward 테이블 생성
   - [ ] CrowdfundingBacker 테이블 생성
   - [ ] 외래 키 및 인덱스 설정

2. **환경 변수 확인**
   - [ ] SMTP 설정
   - [ ] Toss Payments 키
   - [ ] Frontend URL

3. **크론 작업 활성화**
   - [ ] 프로젝트 마감 처리 (매일 자정)
   - [ ] 환불 처리 확인

4. **권한 설정**
   - [ ] 프로젝트 생성: business, affiliate 역할
   - [ ] 펀딩 참여: 모든 로그인 사용자
   - [ ] 관리 기능: admin, manager

5. **모니터링**
   - [ ] 결제 실패 알림
   - [ ] 프로젝트 마감 알림
   - [ ] 환불 처리 로그

## 📌 주의사항

1. **결제 처리**
   - Toss Payments 연동 필수
   - 실패 시 롤백 처리
   - 중복 결제 방지

2. **리워드 관리**
   - 수량 관리 정확성
   - 품절 처리 자동화
   - 배송 정보 검증

3. **이메일 전송**
   - SMTP 설정 필수
   - 템플릿 관리
   - 발송 실패 재시도

---

이 작업 지시서를 API 서버의 Claude Code에게 전달하여 크라우드펀딩 시스템을 완성하세요.
예상 작업 시간: 4-6시간