import { http, HttpResponse } from 'msw';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// Mock Toss Payments configuration
let mockTossConfig = {
  id: 'toss-config-1',
  clientKey: 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoqo',
  secretKey: 'test_sk_zXLkKEypNArWmo50nX3lmeaxYG5R',
  webhookSecretKey: 'test_whsk_sample_webhook_secret_key_123456',
  isLive: false,
  isEnabled: true,
  supportedMethods: [
    { type: 'card', name: '신용카드', enabled: true },
    { type: 'transfer', name: '계좌이체', enabled: true },
    { type: 'virtualAccount', name: '가상계좌', enabled: false },
    { type: 'mobilePhone', name: '휴대폰 결제', enabled: false },
    { type: 'giftCertificate', name: '상품권', enabled: false },
    { type: 'foreignEasyPay', name: '해외간편결제', enabled: false }
  ],
  webhookUrl: 'https://api.neture.co.kr/api/webhooks/toss',
  returnUrl: 'https://neture.co.kr/payment/success',
  failUrl: 'https://neture.co.kr/payment/fail',
  lastUpdated: '2025-01-24T10:00:00Z',
  createdAt: '2024-12-01T00:00:00Z'
};

// Mock test results
let mockTests = [
  {
    id: 'test-1',
    testType: 'connection',
    status: 'success',
    result: 'API 연결 성공',
    executedAt: '2025-01-24T09:30:00Z'
  },
  {
    id: 'test-2',
    testType: 'payment',
    status: 'success',
    result: '결제 테스트 성공 (100원)',
    executedAt: '2025-01-24T09:25:00Z'
  },
  {
    id: 'test-3',
    testType: 'webhook',
    status: 'failed',
    error: '웹훅 URL 응답 시간 초과',
    executedAt: '2025-01-24T09:20:00Z'
  }
];

// Mock payment statistics
const mockStats = {
  totalPayments: 1245,
  successRate: 98.7,
  totalAmount: 45678900,
  refundCount: 23,
  averageAmount: 36700,
  topPaymentMethod: 'card',
  monthlyGrowth: 15.3
};

// Mock refund data
let mockRefunds = [
  {
    id: 'refund-1',
    orderId: 'order-1',
    orderNumber: 'ORD-2025-0001',
    customerName: '김고객',
    customerEmail: 'customer@example.com',
    paymentKey: 'payment_20250124001',
    requestedAmount: 89000,
    approvedAmount: 89000,
    reason: '단순 변심',
    status: 'completed',
    requestedAt: '2025-01-24T10:00:00Z',
    processedAt: '2025-01-24T10:30:00Z',
    completedAt: '2025-01-24T11:00:00Z',
    adminNote: '고객 요청에 따른 전액 환불',
    tossRefundKey: 'refund_20250124001',
    receiptUrl: 'https://dashboard.tosspayments.com/receipt/refund_20250124001',
    items: [
      {
        id: 'item-1',
        productName: '프리미엄 오메가3',
        sku: 'OMEGA3-001',
        quantity: 2,
        refundQuantity: 2,
        unitPrice: 39000,
        refundAmount: 78000,
        reason: '단순 변심'
      },
      {
        id: 'item-2',
        productName: '비타민D',
        sku: 'VITD-001',
        quantity: 1,
        refundQuantity: 1,
        unitPrice: 11000,
        refundAmount: 11000,
        reason: '단순 변심'
      }
    ]
  },
  {
    id: 'refund-2',
    orderId: 'order-2',
    orderNumber: 'ORD-2025-0005',
    customerName: '이고객',
    customerEmail: 'customer2@example.com',
    paymentKey: 'payment_20250124002',
    requestedAmount: 156000,
    reason: '제품 불량',
    status: 'requested',
    requestedAt: '2025-01-24T14:00:00Z',
    adminNote: '',
    items: [
      {
        id: 'item-3',
        productName: '종합비타민 프리미엄',
        sku: 'MULTI-PREM-001',
        quantity: 3,
        refundQuantity: 3,
        unitPrice: 52000,
        refundAmount: 156000,
        reason: '제품 불량 - 캡슐 변색'
      }
    ]
  },
  {
    id: 'refund-3',
    orderId: 'order-3',
    orderNumber: 'ORD-2025-0008',
    customerName: '박고객',
    customerEmail: 'customer3@example.com',
    paymentKey: 'payment_20250124003',
    requestedAmount: 45000,
    reason: '배송 지연',
    status: 'processing',
    requestedAt: '2025-01-24T16:00:00Z',
    processedAt: '2025-01-24T16:30:00Z',
    adminNote: '배송 지연 사과, 전액 환불 승인',
    approvedAmount: 45000,
    items: [
      {
        id: 'item-4',
        productName: '마그네슘',
        sku: 'MAG-001',
        quantity: 1,
        refundQuantity: 1,
        unitPrice: 45000,
        refundAmount: 45000,
        reason: '배송 지연으로 인한 불편'
      }
    ]
  }
];

export const tossPaymentsHandlers = [
  // Get Toss Payments configuration
  http.get(`${API_BASE}/v1/payments/toss/config`, () => {
    return HttpResponse.json({
      success: true,
      data: mockTossConfig
    });
  }),

  // Update Toss Payments configuration
  http.put(`${API_BASE}/v1/payments/toss/config`, async ({ request }: any) => {
    const data = await request.json();
    
    // Update mock config
    mockTossConfig = {
      ...mockTossConfig,
      ...data,
      lastUpdated: new Date().toISOString()
    };

    return HttpResponse.json({
      success: true,
      data: mockTossConfig,
      message: '토스페이먼츠 설정이 업데이트되었습니다'
    });
  }),

  // Get test results
  http.get(`${API_BASE}/v1/payments/toss/tests`, () => {
    // Sort by execution date (newest first)
    const sortedTests = [...mockTests].sort((a, b) => 
      new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime()
    );

    return HttpResponse.json({
      success: true,
      data: sortedTests.slice(0, 10) // Return latest 10 tests
    });
  }),

  // Run test
  http.post(`${API_BASE}/v1/payments/toss/test`, async ({ request }: any) => {
    const { testType } = await request.json();
    
    // Simulate test execution
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay

    let testResult;
    let isSuccess = true;
    let errorMessage = '';

    switch (testType) {
      case 'connection':
        // Simulate connection test
        if (mockTossConfig.clientKey && mockTossConfig.secretKey) {
          testResult = 'API 연결 성공 - 토스페이먼츠 서버와 정상 통신';
        } else {
          isSuccess = false;
          errorMessage = 'API 키가 설정되지 않았습니다';
        }
        break;

      case 'payment':
        // Simulate payment test
        if (mockTossConfig.isEnabled && !mockTossConfig.isLive) {
          testResult = '결제 테스트 성공 - 100원 테스트 결제 완료 및 자동 취소';
        } else if (mockTossConfig.isLive) {
          isSuccess = false;
          errorMessage = '운영 환경에서는 결제 테스트를 실행할 수 없습니다';
        } else {
          isSuccess = false;
          errorMessage = '토스페이먼츠가 비활성화되어 있습니다';
        }
        break;

      case 'webhook':
        // Simulate webhook test
        if (mockTossConfig.webhookUrl) {
          // Random success/failure for demo
          if (Math.random() > 0.3) {
            testResult = '웹훅 테스트 성공 - URL 응답 정상 및 시그니처 검증 완료';
          } else {
            isSuccess = false;
            errorMessage = '웹훅 URL 응답 시간 초과 (5초)';
          }
        } else {
          isSuccess = false;
          errorMessage = '웹훅 URL이 설정되지 않았습니다';
        }
        break;

      default:
        isSuccess = false;
        errorMessage = '알 수 없는 테스트 유형입니다';
    }

    // Add test result to mock data
    const newTest = {
      id: `test-${Date.now()}`,
      testType,
      status: isSuccess ? 'success' : 'failed',
      result: isSuccess ? testResult : undefined,
      error: isSuccess ? undefined : errorMessage,
      executedAt: new Date().toISOString()
    };

    mockTests.unshift(newTest); // Add to beginning of array

    // Keep only latest 50 tests
    if (mockTests.length > 50) {
      mockTests = mockTests.slice(0, 50);
    }

    return HttpResponse.json({
      success: isSuccess,
      data: newTest,
      message: isSuccess ? 'テ스트가 성공했습니다' : 'テ스트가 실패했습니다'
    });
  }),

  // Get payment statistics
  http.get(`${API_BASE}/v1/payments/toss/stats`, () => {
    return HttpResponse.json({
      success: true,
      data: mockStats
    });
  }),

  // Get payment methods
  http.get(`${API_BASE}/v1/payments/toss/methods`, () => {
    return HttpResponse.json({
      success: true,
      data: mockTossConfig.supportedMethods
    });
  }),

  // Update payment methods
  http.put(`${API_BASE}/v1/payments/toss/methods`, async ({ request }: any) => {
    const { supportedMethods } = await request.json();
    
    mockTossConfig.supportedMethods = supportedMethods;
    mockTossConfig.lastUpdated = new Date().toISOString();

    return HttpResponse.json({
      success: true,
      data: mockTossConfig.supportedMethods,
      message: '결제 수단 설정이 업데이트되었습니다'
    });
  }),

  // Process payment (for integration testing)
  http.post(`${API_BASE}/v1/payments/toss/process`, async ({ request }: any) => {
    const data = await request.json();
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Random success/failure for demo
    const isSuccess = Math.random() > 0.1; // 90% success rate

    if (isSuccess) {
      return HttpResponse.json({
        success: true,
        data: {
          paymentKey: `payment_${Date.now()}`,
          orderId: data.orderId,
          amount: data.amount,
          status: 'DONE',
          approvedAt: new Date().toISOString(),
          method: data.method || 'card'
        },
        message: '결제가 성공적으로 처리되었습니다'
      });
    } else {
      return HttpResponse.json({
        success: false,
        error: 'PAYMENT_FAILED',
        message: '결제 처리 중 오류가 발생했습니다'
      }, { status: 400 });
    }
  }),

  // Cancel payment
  http.post(`${API_BASE}/v1/payments/toss/cancel`, async ({ request }: any) => {
    const { paymentKey, cancelReason } = await request.json();
    
    // Simulate cancellation processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    return HttpResponse.json({
      success: true,
      data: {
        paymentKey,
        status: 'CANCELED',
        canceledAt: new Date().toISOString(),
        cancelReason
      },
      message: '결제가 성공적으로 취소되었습니다'
    });
  }),

  // Get webhooks
  http.get(`${API_BASE}/v1/payments/toss/webhooks`, ({ request }: any) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    // Mock webhook data
    const webhooks = Array.from({ length: 45 }, (_, i) => ({
      id: `webhook-${i + 1}`,
      eventType: ['payment.confirmed', 'payment.canceled', 'payment.failed'][i % 3],
      paymentKey: `payment_${Date.now() - i * 3600000}`,
      status: ['success', 'failed', 'pending'][i % 3],
      receivedAt: new Date(Date.now() - i * 3600000).toISOString(),
      processedAt: i % 3 === 1 ? null : new Date(Date.now() - i * 3600000 + 1000).toISOString(),
      retryCount: i % 3 === 1 ? 1 : 0,
      response: i % 3 === 1 ? null : { status: 200, message: 'OK' }
    }));

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedWebhooks = webhooks.slice(startIndex, endIndex);

    return HttpResponse.json({
      success: true,
      data: paginatedWebhooks,
      pagination: {
        current: page,
        total: Math.ceil(webhooks.length / limit),
        count: paginatedWebhooks.length,
        totalItems: webhooks.length
      }
    });
  }),

  // Refund Management APIs
  // Get refund requests
  http.get(`${API_BASE}/v1/payments/refunds`, ({ request }: any) => {
    const url = new URL(request.url);
    const search = url.searchParams.get('search');
    const status = url.searchParams.get('status');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    let filteredRefunds = [...mockRefunds];

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filteredRefunds = filteredRefunds.filter(refund =>
        refund.orderNumber.toLowerCase().includes(searchLower) ||
        refund.customerName.toLowerCase().includes(searchLower) ||
        refund.customerEmail.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (status && status !== 'all') {
      filteredRefunds = filteredRefunds.filter(refund => refund.status === status);
    }

    // Sort by request date (newest first)
    filteredRefunds.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedRefunds = filteredRefunds.slice(startIndex, endIndex);

    return HttpResponse.json({
      success: true,
      data: paginatedRefunds,
      pagination: {
        current: page,
        total: Math.ceil(filteredRefunds.length / limit),
        count: paginatedRefunds.length,
        totalItems: filteredRefunds.length
      }
    });
  }),

  // Get refund statistics
  http.get(`${API_BASE}/v1/payments/refunds/stats`, () => {
    const stats = mockRefunds.reduce((acc, refund) => {
      acc[refund.status] = (acc[refund.status] || 0) + 1;
      if (refund.status === 'completed') {
        acc.totalAmount = (acc.totalAmount || 0) + (refund.approvedAmount || refund.requestedAmount);
      }
      return acc;
    }, {} as Record<string, number>);

    return HttpResponse.json({
      success: true,
      data: {
        requested: stats.requested || 0,
        processing: stats.processing || 0,
        approved: stats.approved || 0,
        completed: stats.completed || 0,
        rejected: stats.rejected || 0,
        failed: stats.failed || 0,
        totalAmount: stats.totalAmount || 0,
        averageAmount: stats.totalAmount ? Math.round(stats.totalAmount / stats.completed) : 0
      }
    });
  }),

  // Process refund (approve/reject)
  http.post(`${API_BASE}/v1/payments/refunds/:id/process`, async ({ params, request }: any) => {
    const { id } = params;
    const data = await request.json();
    
    const refundIndex = mockRefunds.findIndex(r => r.id === id);
    if (refundIndex === -1) {
      return HttpResponse.json(
        { success: false, error: 'Refund not found' },
        { status: 404 }
      );
    }

    const refund = mockRefunds[refundIndex];
    const now = new Date().toISOString();

    if (data.action === 'approve') {
      // Simulate Toss Payments API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Random success/failure for demo
      const isSuccess = Math.random() > 0.1; // 90% success rate

      if (isSuccess) {
        mockRefunds[refundIndex] = {
          ...refund,
          status: 'completed',
          approvedAmount: data.approvedAmount,
          processedAt: now,
          completedAt: now,
          adminNote: data.adminNote,
          tossRefundKey: `refund_${Date.now()}`,
          receiptUrl: `https://dashboard.tosspayments.com/receipt/refund_${Date.now()}`
        };

        return HttpResponse.json({
          success: true,
          data: mockRefunds[refundIndex],
          message: '환불이 성공적으로 처리되었습니다'
        });
      } else {
        mockRefunds[refundIndex] = {
          ...refund,
          status: 'failed',
          processedAt: now,
          adminNote: data.adminNote,
          cancelReason: '토스페이먼츠 API 오류'
        };

        return HttpResponse.json({
          success: false,
          data: mockRefunds[refundIndex],
          error: '토스페이먼츠 환불 처리 중 오류가 발생했습니다'
        }, { status: 400 });
      }
    } else if (data.action === 'reject') {
      mockRefunds[refundIndex] = {
        ...refund,
        status: 'rejected',
        processedAt: now,
        adminNote: data.adminNote
      };

      return HttpResponse.json({
        success: true,
        data: mockRefunds[refundIndex],
        message: '환불 요청이 거부되었습니다'
      });
    }

    return HttpResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  }),

  // Retry failed refund
  http.post(`${API_BASE}/v1/payments/refunds/:id/retry`, async ({ params }: any) => {
    const { id } = params;
    
    const refundIndex = mockRefunds.findIndex(r => r.id === id);
    if (refundIndex === -1) {
      return HttpResponse.json(
        { success: false, error: 'Refund not found' },
        { status: 404 }
      );
    }

    const refund = mockRefunds[refundIndex];
    if (refund.status !== 'failed') {
      return HttpResponse.json(
        { success: false, error: 'Only failed refunds can be retried' },
        { status: 400 }
      );
    }

    // Reset to processing status
    mockRefunds[refundIndex] = {
      ...refund,
      status: 'processing'
    };

    // Simulate retry process
    setTimeout(() => {
      const updatedRefundIndex = mockRefunds.findIndex(r => r.id === id);
      if (updatedRefundIndex !== -1) {
        const isSuccess = Math.random() > 0.3; // 70% success rate on retry
        
        if (isSuccess) {
          mockRefunds[updatedRefundIndex] = {
            ...mockRefunds[updatedRefundIndex],
            status: 'completed',
            completedAt: new Date().toISOString(),
            tossRefundKey: `refund_retry_${Date.now()}`,
            receiptUrl: `https://dashboard.tosspayments.com/receipt/refund_retry_${Date.now()}`
          };
        } else {
          mockRefunds[updatedRefundIndex] = {
            ...mockRefunds[updatedRefundIndex],
            status: 'failed',
            cancelReason: '토스페이먼츠 재시도 실패'
          };
        }
      }
    }, 3000);

    return HttpResponse.json({
      success: true,
      data: mockRefunds[refundIndex],
      message: '환불 재시도가 시작되었습니다'
    });
  }),

  // Create refund request (from order detail)
  http.post(`${API_BASE}/v1/payments/refunds/create`, async ({ request }: any) => {
    const data = await request.json();
    
    const newRefund = {
      id: `refund-${Date.now()}`,
      orderId: data.orderId,
      orderNumber: data.orderNumber || `ORD-${Date.now()}`,
      customerName: data.customerName || '고객',
      customerEmail: data.customerEmail || 'customer@example.com',
      paymentKey: data.paymentKey || `payment_${Date.now()}`,
      requestedAmount: data.amount,
      reason: data.reason || '관리자 환불 처리',
      status: 'requested' as const,
      requestedAt: new Date().toISOString(),
      adminNote: '',
      items: data.items || []
    };

    mockRefunds.unshift(newRefund);

    return HttpResponse.json({
      success: true,
      data: newRefund,
      message: '환불 요청이 생성되었습니다'
    });
  })
];