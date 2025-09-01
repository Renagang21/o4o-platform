/**
 * 주문 상태 자동화 서비스
 * 주문 처리 워크플로우 자동화 및 알림
 */

import { Order, OrderStatus } from '../entities/Order';
import { AppDataSource } from '../database/connection';
import { emailService } from './email.service';
import logger from '../utils/simpleLogger';
import { EventEmitter } from 'events';
import { CronJob } from 'cron';

interface OrderStatusRule {
  fromStatus: string;
  toStatus: string;
  condition: (order: Order) => boolean;
  action?: (order: Order) => Promise<void>;
  delayMinutes?: number;
}

interface OrderNotification {
  type: 'email' | 'sms' | 'webhook' | 'admin';
  template: string;
  recipients?: string[];
}

export class OrderAutomationService extends EventEmitter {
  private orderRepository = AppDataSource.getRepository(Order);
  private statusRules: OrderStatusRule[] = [];
  private notificationRules = new Map<string, OrderNotification[]>();
  private cronJobs: CronJob[] = [];
  
  constructor() {
    super();
    this.initializeRules();
    this.initializeCronJobs();
  }

  /**
   * 상태 전환 규칙 초기화
   */
  private initializeRules() {
    // 결제 완료 → 처리중
    this.addStatusRule({
      fromStatus: 'pending',
      toStatus: 'processing',
      condition: (order) => order.paymentStatus === 'paid',
      action: async (order) => {
        await this.sendOrderConfirmation(order);
        await this.notifyWarehouse(order);
      }
    });

    // 처리중 → 배송준비
    this.addStatusRule({
      fromStatus: 'processing',
      toStatus: 'ready_to_ship',
      condition: (order) => {
        // 모든 상품이 준비되었는지 확인
        return order.items ? order.items.every((item: any) => item.status === 'prepared') : false;
      },
      delayMinutes: 30 // 30분 후 자동 전환
    });

    // 배송준비 → 배송중
    this.addStatusRule({
      fromStatus: 'ready_to_ship',
      toStatus: 'shipped',
      condition: (order) => {
        // 운송장 번호가 등록되었는지 확인
        return !!order.shipping?.trackingNumber;
      },
      action: async (order) => {
        await this.sendShippingNotification(order);
      }
    });

    // 배송중 → 배송완료
    this.addStatusRule({
      fromStatus: 'shipped',
      toStatus: 'delivered',
      condition: (order) => {
        // 배송 API 연동 또는 예상 배송일 기준
        const estimatedDelivery = order.shipping?.estimatedDelivery;
        if (estimatedDelivery) {
          return new Date() >= new Date(estimatedDelivery);
        }
        return false;
      },
      action: async (order) => {
        await this.sendDeliveryConfirmation(order);
        await this.requestReview(order);
      }
    });

    // 배송완료 → 구매확정
    this.addStatusRule({
      fromStatus: 'delivered',
      toStatus: 'completed',
      condition: (order) => {
        // 배송 후 7일 자동 구매확정
        const deliveredAt = order.metadata?.deliveredAt;
        if (deliveredAt) {
          const daysSinceDelivery = (Date.now() - new Date(deliveredAt).getTime()) / (1000 * 60 * 60 * 24);
          return daysSinceDelivery >= 7;
        }
        return false;
      },
      delayMinutes: 10080 // 7일
    });

    // 알림 규칙 설정
    this.setNotificationRules();
  }

  /**
   * 알림 규칙 설정
   */
  private setNotificationRules() {
    // 주문 접수 알림
    this.notificationRules.set('pending', [
      {
        type: 'email',
        template: 'order_received'
      },
      {
        type: 'admin',
        template: 'new_order_admin'
      }
    ]);

    // 결제 완료 알림
    this.notificationRules.set('processing', [
      {
        type: 'email',
        template: 'payment_confirmed'
      }
    ]);

    // 배송 시작 알림
    this.notificationRules.set('shipped', [
      {
        type: 'email',
        template: 'order_shipped'
      },
      {
        type: 'sms',
        template: 'shipping_sms'
      }
    ]);

    // 배송 완료 알림
    this.notificationRules.set('delivered', [
      {
        type: 'email',
        template: 'order_delivered'
      }
    ]);

    // 주문 취소 알림
    this.notificationRules.set('cancelled', [
      {
        type: 'email',
        template: 'order_cancelled'
      },
      {
        type: 'admin',
        template: 'order_cancelled_admin'
      }
    ]);
  }

  /**
   * 크론 작업 초기화
   */
  private initializeCronJobs() {
    // 매 10분마다 주문 상태 자동 업데이트 체크
    const statusCheckJob = new CronJob('*/10 * * * *', async () => {
      await this.checkAndUpdateOrderStatuses();
    });

    // 매일 오전 9시 리뷰 요청 이메일 발송
    const reviewReminderJob = new CronJob('0 9 * * *', async () => {
      await this.sendReviewReminders();
    });

    // 매일 자정 통계 업데이트
    const statsUpdateJob = new CronJob('0 0 * * *', async () => {
      await this.updateOrderStatistics();
    });

    // 매시간 재고 부족 알림 체크
    const inventoryCheckJob = new CronJob('0 * * * *', async () => {
      await this.checkLowInventory();
    });

    this.cronJobs = [
      statusCheckJob,
      reviewReminderJob,
      statsUpdateJob,
      inventoryCheckJob
    ];

    // 크론 작업 시작
    this.cronJobs.forEach(job => job.start());
  }

  /**
   * 상태 전환 규칙 추가
   */
  addStatusRule(rule: OrderStatusRule) {
    this.statusRules.push(rule);
  }

  /**
   * 주문 상태 자동 업데이트 체크
   */
  async checkAndUpdateOrderStatuses() {
    try {
      const orders = await this.orderRepository.find({
        where: [
          { status: OrderStatus.PENDING },
          { status: OrderStatus.PROCESSING },
          { status: OrderStatus.READY_TO_SHIP },
          { status: OrderStatus.SHIPPED },
          { status: OrderStatus.DELIVERED }
        ],
        relations: ['items', 'items.product', 'shipping']
      });

      for (const order of orders) {
        await this.processOrderStatusRules(order);
      }
    } catch (error) {
      logger.error('Failed to check order statuses:', error);
    }
  }

  /**
   * 주문 상태 규칙 처리
   */
  async processOrderStatusRules(order: Order) {
    const applicableRules = this.statusRules.filter(
      rule => rule.fromStatus === order.status
    );

    for (const rule of applicableRules) {
      if (rule.condition(order)) {
        // 지연 시간이 설정된 경우
        if (rule.delayMinutes) {
          const lastStatusChange = order.metadata?.lastStatusChange || order.updatedAt;
          const minutesSinceChange = (Date.now() - new Date(lastStatusChange).getTime()) / (1000 * 60);
          
          if (minutesSinceChange < rule.delayMinutes) {
            continue;
          }
        }

        // 상태 업데이트
        await this.updateOrderStatus(order, rule.toStatus);

        // 액션 실행
        if (rule.action) {
          await rule.action(order);
        }

        // 알림 발송
        await this.sendStatusNotifications(order, rule.toStatus);

        logger.info(`Order ${order.id} status changed from ${rule.fromStatus} to ${rule.toStatus}`);
        break;
      }
    }
  }

  /**
   * 주문 상태 업데이트
   */
  async updateOrderStatus(order: Order, newStatus: string) {
    const previousStatus = order.status;
    
    order.status = newStatus as OrderStatus;
    order.metadata = {
      ...order.metadata,
      lastStatusChange: new Date().toISOString(),
      statusHistory: [
        ...(order.metadata?.statusHistory || []),
        {
          from: previousStatus,
          to: newStatus,
          timestamp: new Date().toISOString()
        }
      ]
    };

    await this.orderRepository.save(order);

    // 이벤트 발생
    this.emit('statusChanged', {
      orderId: order.id,
      previousStatus,
      newStatus,
      order
    });
  }

  /**
   * 상태 변경 알림 발송
   */
  async sendStatusNotifications(order: Order, status: string) {
    const notifications = this.notificationRules.get(status) || [];

    for (const notification of notifications) {
      try {
        switch (notification.type) {
          case 'email':
            await this.sendEmailNotification(order, notification.template);
            break;
          case 'sms':
            await this.sendSmsNotification(order, notification.template);
            break;
          case 'admin':
            await this.sendAdminNotification(order, notification.template);
            break;
          case 'webhook':
            await this.sendWebhookNotification(order, notification.template);
            break;
        }
      } catch (error) {
        logger.error(`Failed to send ${notification.type} notification:`, error);
      }
    }
  }

  /**
   * 이메일 알림 발송
   */
  private async sendEmailNotification(order: Order, template: string) {
    const customerEmail = order.billing?.email;
    if (!customerEmail) return;

    const emailData = this.prepareEmailData(order, template);
    
    await emailService.sendEmail({
      to: customerEmail,
      subject: emailData.subject,
      text: JSON.stringify(emailData.data)
    });
  }

  /**
   * SMS 알림 발송 (구현 필요)
   */
  private async sendSmsNotification(order: Order, template: string) {
    const phoneNumber = order.billing?.phone;
    if (!phoneNumber) return;

    // SMS 서비스 연동 필요
    logger.info(`SMS notification would be sent to ${phoneNumber} with template ${template}`);
  }

  /**
   * 관리자 알림 발송
   */
  private async sendAdminNotification(order: Order, template: string) {
    // 관리자 이메일 목록 조회
    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
    
    for (const email of adminEmails) {
      const emailData = this.prepareEmailData(order, template);
      
      await emailService.sendEmail({
        to: email.trim(),
        subject: `[Admin] ${emailData.subject}`,
        text: JSON.stringify(emailData.data)
      });
    }
  }

  /**
   * 웹훅 알림 발송
   */
  private async sendWebhookNotification(order: Order, template: string) {
    const webhookUrl = process.env.ORDER_WEBHOOK_URL;
    if (!webhookUrl) return;

    const payload = {
      event: `order.${order.status}`,
      timestamp: new Date().toISOString(),
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: order.totalAmount,
        customer: {
          name: `${order.billing?.firstName} ${order.billing?.lastName}`,
          email: order.billing?.email
        }
      }
    };

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': process.env.WEBHOOK_SECRET || ''
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status}`);
      }
    } catch (error) {
      logger.error('Webhook notification failed:', error);
    }
  }

  /**
   * 이메일 데이터 준비
   */
  private prepareEmailData(order: Order, template: string) {
    const subjects: Record<string, string> = {
      order_received: `주문이 접수되었습니다 #${order.orderNumber}`,
      payment_confirmed: `결제가 완료되었습니다 #${order.orderNumber}`,
      order_shipped: `상품이 발송되었습니다 #${order.orderNumber}`,
      order_delivered: `상품이 배송 완료되었습니다 #${order.orderNumber}`,
      order_cancelled: `주문이 취소되었습니다 #${order.orderNumber}`,
      review_request: `구매하신 상품은 어떠셨나요? #${order.orderNumber}`
    };

    return {
      subject: subjects[template] || `주문 업데이트 #${order.orderNumber}`,
      data: {
        orderNumber: order.orderNumber,
        customerName: `${order.billing?.firstName} ${order.billing?.lastName}`,
        orderStatus: order.status,
        totalAmount: order.totalAmount,
        trackingNumber: order.shipping?.trackingNumber,
        trackingUrl: order.shipping?.trackingUrl,
        items: order.items ? order.items.map((item: any) => ({
          name: item.product?.name,
          quantity: item.quantity,
          price: item.price
        })) : []
      }
    };
  }

  /**
   * 주문 확인 이메일 발송
   */
  async sendOrderConfirmation(order: Order) {
    await this.sendEmailNotification(order, 'order_confirmation');
  }

  /**
   * 창고 알림
   */
  async notifyWarehouse(order: Order) {
    // 창고 시스템 연동
    logger.info(`Warehouse notified for order ${order.orderNumber}`);
  }

  /**
   * 배송 알림 발송
   */
  async sendShippingNotification(order: Order) {
    await this.sendEmailNotification(order, 'order_shipped');
  }

  /**
   * 배송 완료 확인
   */
  async sendDeliveryConfirmation(order: Order) {
    await this.sendEmailNotification(order, 'order_delivered');
  }

  /**
   * 리뷰 요청
   */
  async requestReview(order: Order) {
    // 배송 완료 3일 후 리뷰 요청
    setTimeout(async () => {
      await this.sendEmailNotification(order, 'review_request');
    }, 3 * 24 * 60 * 60 * 1000);
  }

  /**
   * 리뷰 리마인더 발송
   */
  async sendReviewReminders() {
    try {
      // 배송 완료 후 7-14일 사이 리뷰 미작성 주문 조회
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 14);
      
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 7);

      const orders = await this.orderRepository
        .createQueryBuilder('order')
        .where('order.status = :status', { status: 'delivered' })
        .andWhere('order.updatedAt BETWEEN :start AND :end', {
          start: sevenDaysAgo,
          end: fourteenDaysAgo
        })
        .andWhere('order.metadata->>"reviewRequested" IS NULL')
        .getMany();

      for (const order of orders) {
        await this.requestReview(order);
        
        order.metadata = {
          ...order.metadata,
          reviewRequested: new Date().toISOString()
        };
        await this.orderRepository.save(order);
      }

      logger.info(`Sent review reminders for ${orders.length} orders`);
    } catch (error) {
      logger.error('Failed to send review reminders:', error);
    }
  }

  /**
   * 주문 통계 업데이트
   */
  async updateOrderStatistics() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // 오늘의 주문 통계
      const stats = await this.orderRepository
        .createQueryBuilder('order')
        .select('COUNT(*)', 'totalOrders')
        .addSelect('SUM(order.totalAmount)', 'totalRevenue')
        .addSelect('AVG(order.totalAmount)', 'averageOrderValue')
        .where('order.createdAt BETWEEN :today AND :tomorrow', {
          today,
          tomorrow
        })
        .getRawOne();

      logger.info('Daily order statistics:', stats);

      // 통계를 별도 테이블에 저장하거나 대시보드로 전송
      this.emit('dailyStats', stats);
    } catch (error) {
      logger.error('Failed to update order statistics:', error);
    }
  }

  /**
   * 재고 부족 체크
   */
  async checkLowInventory() {
    // ProductVariation 엔티티와 연동하여 재고 체크
    logger.info('Checking low inventory...');
    
    // 재고 부족 상품 알림
    this.emit('lowInventory', {
      timestamp: new Date(),
      products: [] // 실제 구현 시 재고 부족 상품 목록
    });
  }

  /**
   * 서비스 시작
   */
  start() {
    logger.info('Order automation service started');
    this.cronJobs.forEach(job => job.start());
  }

  /**
   * 서비스 중지
   */
  stop() {
    logger.info('Order automation service stopped');
    this.cronJobs.forEach(job => job.stop());
  }
}

// 싱글톤 인스턴스
export const orderAutomationService = new OrderAutomationService();