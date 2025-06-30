import { EventEmitter } from 'events';

// 이벤트 타입 정의
export enum SyncEventType {
  // 상품 관련
  PRODUCT_CREATED = 'product:created',
  PRODUCT_UPDATED = 'product:updated',
  PRODUCT_DELETED = 'product:deleted',
  INVENTORY_CHANGED = 'inventory:changed',
  
  // 주문 관련
  ORDER_CREATED = 'order:created',
  ORDER_STATUS_CHANGED = 'order:status_changed',
  ORDER_CANCELLED = 'order:cancelled',
  
  // 파트너 관련
  CAMPAIGN_CREATED = 'campaign:created',
  CAMPAIGN_UPDATED = 'campaign:updated',
  COMMISSION_CALCULATED = 'commission:calculated',
  COMMISSION_CONFIRMED = 'commission:confirmed',
  
  // 정산 관련
  SETTLEMENT_REQUESTED = 'settlement:requested',
  SETTLEMENT_COMPLETED = 'settlement:completed',
}

// 알림 타입 정의
export interface Notification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  role: 'seller' | 'supplier' | 'partner' | 'admin';
  timestamp: Date;
  read: boolean;
  data?: any;
}

// 실시간 동기화 클래스
class RealtimeSyncService extends EventEmitter {
  private notifications: Map<string, Notification[]> = new Map();
  private dataCache: Map<string, any> = new Map();
  
  constructor() {
    super();
    this.initializeListeners();
  }

  // 이벤트 리스너 초기화
  private initializeListeners() {
    // 판매자 상품 등록 시 파트너 캠페인 가능 상품 업데이트
    this.on(SyncEventType.PRODUCT_CREATED, (data) => {
      this.updatePartnerAvailableProducts(data);
      this.notifyRole('partner', {
        type: 'info',
        title: '새 상품 등록',
        message: `판매자가 새 상품 "${data.name}"을 등록했습니다. 캠페인에 추가할 수 있습니다.`,
        data: data
      });
    });

    // 주문 발생 시 처리
    this.on(SyncEventType.ORDER_CREATED, (order) => {
      this.calculatePartnerCommission(order);
      this.addSupplierOrder(order);
      this.updateInventory(order);
      
      // 각 Role에 알림 전송
      this.notifyRole('partner', {
        type: 'success',
        title: '새 주문 전환',
        message: `주문 #${order.id}이 전환되었습니다. 커미션: ₩${order.commission?.toLocaleString()}`,
        data: order
      });
      
      this.notifyRole('seller', {
        type: 'success',
        title: '새 주문',
        message: `주문 #${order.id}이 접수되었습니다. 금액: ₩${order.totalAmount.toLocaleString()}`,
        data: order
      });
      
      this.notifyRole('supplier', {
        type: 'info',
        title: '배송 요청',
        message: `주문 #${order.id}의 배송을 준비해주세요.`,
        data: order
      });
    });

    // 재고 변경 시 처리
    this.on(SyncEventType.INVENTORY_CHANGED, (data) => {
      this.syncProductInfo(data);
      
      if (data.stock < 10) {
        this.notifyRole('seller', {
          type: 'warning',
          title: '재고 부족',
          message: `"${data.productName}"의 재고가 ${data.stock}개 남았습니다.`,
          data: data
        });
        
        this.notifyRole('supplier', {
          type: 'warning',
          title: '재고 보충 필요',
          message: `"${data.productName}"의 재고 보충이 필요합니다.`,
          data: data
        });
      }
    });

    // 커미션 확정 시 처리
    this.on(SyncEventType.COMMISSION_CONFIRMED, (data) => {
      this.notifyRole('partner', {
        type: 'success',
        title: '커미션 확정',
        message: `주문 #${data.orderId}의 커미션 ₩${data.amount.toLocaleString()}이 확정되었습니다.`,
        data: data
      });
    });
  }

  // 파트너 사용 가능 상품 업데이트
  private updatePartnerAvailableProducts(product: any) {
    const availableProducts = this.dataCache.get('partnerAvailableProducts') || [];
    availableProducts.push({
      id: product.id,
      name: product.name,
      category: product.category,
      retailPrice: product.retailPrice,
      wholesalePrice: product.wholesalePrice,
      stock: product.stock,
      supplierId: product.supplierId,
      createdAt: new Date()
    });
    this.dataCache.set('partnerAvailableProducts', availableProducts);
    
    // 파트너 대시보드 업데이트 이벤트 발생
    this.emit('partner:products:updated', availableProducts);
  }

  // 파트너 커미션 계산
  private calculatePartnerCommission(order: any) {
    if (!order.campaignId) return;
    
    const campaign = this.getCampaignById(order.campaignId);
    if (!campaign) return;
    
    const commission = {
      orderId: order.id,
      campaignId: campaign.id,
      partnerId: campaign.partnerId,
      orderAmount: order.totalAmount,
      commissionRate: campaign.commissionRate,
      commissionAmount: order.totalAmount * (campaign.commissionRate / 100),
      status: 'pending',
      createdAt: new Date()
    };
    
    // 커미션 데이터 저장
    const commissions = this.dataCache.get('partnerCommissions') || [];
    commissions.push(commission);
    this.dataCache.set('partnerCommissions', commissions);
    
    // 커미션 계산 완료 이벤트
    this.emit(SyncEventType.COMMISSION_CALCULATED, commission);
  }

  // 공급자 주문 추가
  private addSupplierOrder(order: any) {
    const supplierOrders = this.dataCache.get('supplierOrders') || [];
    
    // 주문 항목별로 공급자 주문 생성
    order.items.forEach((item: any) => {
      const supplierOrder = {
        id: `SUP-${order.id}-${item.productId}`,
        orderId: order.id,
        supplierId: item.supplierId,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        status: 'pending',
        shippingAddress: order.shippingAddress,
        customerName: order.customerName,
        createdAt: new Date()
      };
      
      supplierOrders.push(supplierOrder);
    });
    
    this.dataCache.set('supplierOrders', supplierOrders);
    
    // 공급자 대시보드 업데이트
    this.emit('supplier:orders:updated', supplierOrders);
  }

  // 재고 업데이트
  private updateInventory(order: any) {
    order.items.forEach((item: any) => {
      const product = this.getProductById(item.productId);
      if (product) {
        product.stock -= item.quantity;
        
        // 재고 변경 이벤트 발생
        this.emit(SyncEventType.INVENTORY_CHANGED, {
          productId: product.id,
          productName: product.name,
          stock: product.stock,
          change: -item.quantity
        });
      }
    });
  }

  // 상품 정보 동기화
  private syncProductInfo(data: any) {
    // 모든 Role의 캐시된 상품 정보 업데이트
    ['sellerProducts', 'supplierProducts', 'partnerAvailableProducts'].forEach(key => {
      const products = this.dataCache.get(key) || [];
      const index = products.findIndex((p: any) => p.id === data.productId);
      if (index !== -1) {
        products[index] = { ...products[index], stock: data.stock };
        this.dataCache.set(key, products);
      }
    });
    
    // 업데이트 이벤트 발생
    this.emit('products:synced', data);
  }

  // Role별 알림 전송
  private notifyRole(role: string, notification: Omit<Notification, 'id' | 'timestamp' | 'read' | 'role'>) {
    const fullNotification: Notification = {
      id: `NOTIF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...notification,
      role: role as any,
      timestamp: new Date(),
      read: false
    };
    
    const roleNotifications = this.notifications.get(role) || [];
    roleNotifications.unshift(fullNotification);
    this.notifications.set(role, roleNotifications);
    
    // 실시간 알림 이벤트 발생
    this.emit(`notification:${role}`, fullNotification);
  }

  // Public API
  
  // 이벤트 발생
  public triggerEvent(eventType: SyncEventType, data: any) {
    this.emit(eventType, data);
  }

  // Role별 알림 가져오기
  public getNotifications(role: string): Notification[] {
    return this.notifications.get(role) || [];
  }

  // 알림 읽음 처리
  public markNotificationAsRead(role: string, notificationId: string) {
    const roleNotifications = this.notifications.get(role) || [];
    const notification = roleNotifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.emit(`notification:read:${role}`, notificationId);
    }
  }

  // 캐시 데이터 가져오기
  public getCachedData(key: string): any {
    return this.dataCache.get(key);
  }

  // Helper methods
  private getCampaignById(campaignId: string): any {
    const campaigns = this.dataCache.get('partnerCampaigns') || [];
    return campaigns.find((c: any) => c.id === campaignId);
  }

  private getProductById(productId: string): any {
    const products = this.dataCache.get('allProducts') || [];
    return products.find((p: any) => p.id === productId);
  }

  // 초기 데이터 설정 (개발용)
  public initializeMockData() {
    // 모든 상품
    this.dataCache.set('allProducts', [
      { id: 'PROD001', name: '스마트폰 케이스', stock: 150, retailPrice: 15000 },
      { id: 'PROD002', name: '무선 이어폰', stock: 80, retailPrice: 45000 },
      { id: 'PROD003', name: '충전 케이블', stock: 200, retailPrice: 12000 },
    ]);

    // 파트너 캠페인
    this.dataCache.set('partnerCampaigns', [
      { id: 'CAMP001', name: '스마트폰 액세서리', partnerId: 'PARTNER001', commissionRate: 5 },
      { id: 'CAMP002', name: '여름 전자기기', partnerId: 'PARTNER001', commissionRate: 3 },
    ]);
  }
}

// 싱글톤 인스턴스
export const realtimeSync = new RealtimeSyncService();

// React Hook for notifications
export const useNotifications = (role: string) => {
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);

  React.useEffect(() => {
    // 초기 알림 로드
    const loadNotifications = () => {
      const notifs = realtimeSync.getNotifications(role);
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
    };

    loadNotifications();

    // 실시간 알림 리스너
    const handleNewNotification = (notification: Notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    };

    const handleNotificationRead = () => {
      loadNotifications();
    };

    realtimeSync.on(`notification:${role}`, handleNewNotification);
    realtimeSync.on(`notification:read:${role}`, handleNotificationRead);

    return () => {
      realtimeSync.off(`notification:${role}`, handleNewNotification);
      realtimeSync.off(`notification:read:${role}`, handleNotificationRead);
    };
  }, [role]);

  const markAsRead = (notificationId: string) => {
    realtimeSync.markNotificationAsRead(role, notificationId);
  };

  return {
    notifications,
    unreadCount,
    markAsRead
  };
};

// React Hook for real-time data
export const useRealtimeData = (dataKey: string, eventName?: string) => {
  const [data, setData] = React.useState<any>(null);

  React.useEffect(() => {
    // 초기 데이터 로드
    setData(realtimeSync.getCachedData(dataKey));

    if (eventName) {
      // 실시간 업데이트 리스너
      const handleUpdate = (updatedData: any) => {
        setData(updatedData);
      };

      realtimeSync.on(eventName, handleUpdate);

      return () => {
        realtimeSync.off(eventName, handleUpdate);
      };
    }
  }, [dataKey, eventName]);

  return data;
};

import React from 'react';