import { http, HttpResponse } from 'msw';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// Mock inventory data
let mockInventory = [
  {
    id: 'inv-1',
    productId: 'prod-1',
    productName: '프리미엄 오메가3',
    sku: 'OMEGA3-001',
    variantId: 'var-1',
    variantOptions: { size: '60캡슐', type: '소프트젤' },
    currentStock: 150,
    reservedStock: 25,
    availableStock: 125,
    reorderPoint: 30,
    maxStock: 500,
    cost: 25000,
    location: 'A-01-001',
    batch: 'BATCH-2025-001',
    expiryDate: '2026-12-31',
    lastUpdated: '2025-01-24T09:00:00Z',
    status: 'in_stock'
  },
  {
    id: 'inv-2',
    productId: 'prod-2',
    productName: '비타민D',
    sku: 'VITD-001',
    currentStock: 25,
    reservedStock: 10,
    availableStock: 15,
    reorderPoint: 20,
    maxStock: 200,
    cost: 8000,
    location: 'A-01-002',
    batch: 'BATCH-2025-002',
    expiryDate: '2026-06-30',
    lastUpdated: '2025-01-24T08:30:00Z',
    status: 'low_stock'
  },
  {
    id: 'inv-3',
    productId: 'prod-3',
    productName: '종합비타민 프리미엄',
    sku: 'MULTI-PREM-001',
    variantId: 'var-2',
    variantOptions: { size: '90정', type: '타블렛' },
    currentStock: 0,
    reservedStock: 0,
    availableStock: 0,
    reorderPoint: 15,
    maxStock: 300,
    cost: 35000,
    location: 'A-02-001',
    lastUpdated: '2025-01-23T16:00:00Z',
    status: 'out_of_stock'
  },
  {
    id: 'inv-4',
    productId: 'prod-4',
    productName: '프로바이오틱스',
    sku: 'PROBIO-001',
    variantId: 'var-3',
    variantOptions: { count: '100억 CFU', capsules: '30캡슐' },
    currentStock: 89,
    reservedStock: 5,
    availableStock: 84,
    reorderPoint: 25,
    maxStock: 250,
    cost: 45000,
    location: 'A-02-002',
    batch: 'BATCH-2025-003',
    expiryDate: '2025-12-31',
    lastUpdated: '2025-01-24T07:15:00Z',
    status: 'in_stock'
  },
  {
    id: 'inv-5',
    productId: 'prod-5',
    productName: '콜라겐 플러스',
    sku: 'COLLAGEN-001',
    variantId: 'var-4',
    variantOptions: { flavor: '베리믹스', powder: '분말형' },
    currentStock: 67,
    reservedStock: 12,
    availableStock: 55,
    reorderPoint: 20,
    maxStock: 180,
    cost: 62000,
    location: 'B-01-001',
    batch: 'BATCH-2025-004',
    expiryDate: '2026-09-30',
    lastUpdated: '2025-01-24T06:45:00Z',
    status: 'in_stock'
  }
];

// Mock stock movements
let mockMovements = [
  {
    id: 'move-1',
    inventoryItemId: 'inv-1',
    type: 'in',
    quantity: 100,
    remainingStock: 150,
    reason: '신규 입고',
    reference: 'PO-2025-001',
    notes: '정기 발주 입고',
    performedBy: 'admin',
    createdAt: '2025-01-24T09:00:00Z'
  },
  {
    id: 'move-2',
    inventoryItemId: 'inv-1',
    type: 'out',
    quantity: 2,
    remainingStock: 148,
    reason: '주문 출고',
    reference: 'ORD-2025-0001',
    notes: '고객 주문',
    performedBy: 'system',
    createdAt: '2025-01-24T09:30:00Z'
  },
  {
    id: 'move-3',
    inventoryItemId: 'inv-1',
    type: 'reserved',
    quantity: 25,
    remainingStock: 148,
    reason: '주문 예약',
    reference: 'ORD-2025-0010',
    notes: '대량 주문 예약',
    performedBy: 'system',
    createdAt: '2025-01-24T10:00:00Z'
  },
  {
    id: 'move-4',
    inventoryItemId: 'inv-2',
    type: 'adjustment',
    quantity: -5,
    remainingStock: 25,
    reason: 'manual_count',
    notes: '실사 조정: 파손품 5개 발견',
    performedBy: 'admin',
    createdAt: '2025-01-24T08:30:00Z'
  },
  {
    id: 'move-5',
    inventoryItemId: 'inv-3',
    type: 'out',
    quantity: 15,
    remainingStock: 0,
    reason: '주문 출고',
    reference: 'ORD-2025-0002',
    notes: '마지막 재고 출고',
    performedBy: 'system',
    createdAt: '2025-01-23T16:00:00Z'
  }
];

export const inventoryHandlers = [
  // Get inventory items
  http.get(`${API_BASE}/v1/inventory`, ({ request }: any) => {
    const url = new URL(request.url);
    const search = url.searchParams.get('search');
    const status = url.searchParams.get('status');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    let filteredInventory = [...mockInventory];

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filteredInventory = filteredInventory.filter(item =>
        item.productName.toLowerCase().includes(searchLower) ||
        item.sku.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (status && status !== 'all') {
      filteredInventory = filteredInventory.filter(item => item.status === status);
    }

    // Sort by last updated (newest first)
    filteredInventory.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedInventory = filteredInventory.slice(startIndex, endIndex);

    return HttpResponse.json({
      success: true,
      data: paginatedInventory,
      pagination: {
        current: page,
        total: Math.ceil(filteredInventory.length / limit),
        count: paginatedInventory.length,
        totalItems: filteredInventory.length
      }
    });
  }),

  // Get inventory statistics
  http.get(`${API_BASE}/v1/inventory/stats`, () => {
    const totalItems = mockInventory.length;
    const lowStockItems = mockInventory.filter(item => item.currentStock <= item.reorderPoint && item.status !== 'discontinued').length;
    const outOfStockItems = mockInventory.filter(item => item.currentStock === 0).length;
    const totalValue = mockInventory.reduce((sum, item) => sum + (item.currentStock * item.cost), 0);

    return HttpResponse.json({
      success: true,
      data: {
        totalItems,
        lowStockItems,
        outOfStockItems,
        totalValue,
        inStockItems: mockInventory.filter(item => item.status === 'in_stock').length,
        discontinuedItems: mockInventory.filter(item => item.status === 'discontinued').length
      }
    });
  }),

  // Get single inventory item
  http.get(`${API_BASE}/v1/inventory/:id`, ({ params }: any) => {
    const item = mockInventory.find(i => i.id === params.id);
    
    if (!item) {
      return HttpResponse.json(
        { success: false, error: 'Inventory item not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      success: true,
      data: item
    });
  }),

  // Get stock movements for an inventory item
  http.get(`${API_BASE}/v1/inventory/:id/movements`, ({ params, request }: any) => {
    const { id } = params;
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    const itemMovements = mockMovements
      .filter(movement => movement.inventoryItemId === id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedMovements = itemMovements.slice(startIndex, endIndex);

    return HttpResponse.json({
      success: true,
      data: paginatedMovements,
      pagination: {
        current: page,
        total: Math.ceil(itemMovements.length / limit),
        count: paginatedMovements.length,
        totalItems: itemMovements.length
      }
    });
  }),

  // Adjust stock
  http.post(`${API_BASE}/v1/inventory/adjust`, async ({ request }: any) => {
    const data = await request.json();
    const { inventoryItemId, type, quantity, reason, notes } = data;

    const itemIndex = mockInventory.findIndex(item => item.id === inventoryItemId);
    if (itemIndex === -1) {
      return HttpResponse.json(
        { success: false, error: 'Inventory item not found' },
        { status: 404 }
      );
    }

    const item = mockInventory[itemIndex];
    let newStock = item.currentStock;
    let movementQuantity = quantity;

    // Calculate new stock based on adjustment type
    switch (type) {
      case 'increase':
        newStock = item.currentStock + quantity;
        break;
      case 'decrease':
        newStock = Math.max(0, item.currentStock - quantity);
        movementQuantity = -quantity;
        break;
      case 'set':
        movementQuantity = quantity - item.currentStock;
        newStock = quantity;
        break;
    }

    // Update inventory status based on new stock
    let newStatus = item.status;
    if (newStock === 0) {
      newStatus = 'out_of_stock';
    } else if (newStock <= item.reorderPoint) {
      newStatus = 'low_stock';
    } else {
      newStatus = 'in_stock';
    }

    // Update inventory item
    mockInventory[itemIndex] = {
      ...item,
      currentStock: newStock,
      availableStock: newStock - item.reservedStock,
      status: newStatus,
      lastUpdated: new Date().toISOString()
    };

    // Add movement record
    const movement = {
      id: `move-${Date.now()}`,
      inventoryItemId,
      type: 'adjustment' as const,
      quantity: Math.abs(movementQuantity),
      remainingStock: newStock,
      reason,
      notes,
      performedBy: 'admin',
      createdAt: new Date().toISOString()
    };

    mockMovements.push(movement);

    return HttpResponse.json({
      success: true,
      data: {
        inventory: mockInventory[itemIndex],
        movement
      },
      message: '재고가 조정되었습니다'
    });
  }),

  // Bulk reorder
  http.post(`${API_BASE}/v1/inventory/bulk-reorder`, async ({ request }: any) => {
    const { itemIds } = await request.json();

    // In a real implementation, this would create purchase orders
    // For now, just simulate the process
    const reorderedItems = mockInventory.filter(item => itemIds.includes(item.id));
    
    return HttpResponse.json({
      success: true,
      data: {
        reorderedItems: reorderedItems.length,
        estimatedDelivery: '2025-02-01',
        purchaseOrderNumber: `PO-${Date.now()}`
      },
      message: `${reorderedItems.length}개 상품의 재주문이 요청되었습니다`
    });
  }),

  // Update inventory item
  http.put(`${API_BASE}/v1/inventory/:id`, async ({ params, request }: any) => {
    const { id } = params;
    const data = await request.json();

    const itemIndex = mockInventory.findIndex(item => item.id === id);
    if (itemIndex === -1) {
      return HttpResponse.json(
        { success: false, error: 'Inventory item not found' },
        { status: 404 }
      );
    }

    // Update inventory item
    mockInventory[itemIndex] = {
      ...mockInventory[itemIndex],
      ...data,
      lastUpdated: new Date().toISOString()
    };

    return HttpResponse.json({
      success: true,
      data: mockInventory[itemIndex],
      message: '재고 정보가 업데이트되었습니다'
    });
  })
];