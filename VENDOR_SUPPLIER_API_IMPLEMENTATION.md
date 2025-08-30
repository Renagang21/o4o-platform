# 판매자/공급자 시스템 API 구현 작업 지시서

## 📋 작업 개요
O4O Platform의 판매자(Vendor) 및 공급자(Supplier) 시스템의 백엔드 API를 완성하는 작업입니다.
현재 프론트엔드 UI(85%)와 데이터베이스 설계(95%)는 완성되었으나, API 연동 부분이 30% 수준입니다.

## 🎯 작업 목표
1. VendorController 및 SupplierController 생성
2. 수수료 정산 시스템(CommissionService) 구현
3. 프론트엔드와 백엔드 연동 완성
4. 실제 데이터 기반 시스템 구동

## 📁 현재 파일 구조
```
apps/api-server/src/
├── entities/
│   ├── VendorInfo.ts (✅ 완성)
│   └── SupplierInfo.ts (✅ 완성)
├── services/
│   └── vendor/ (❌ 생성 필요)
│       ├── vendor.service.ts
│       ├── supplier.service.ts
│       └── commission.service.ts
└── controllers/
    └── vendor/ (❌ 생성 필요)
        ├── vendor.controller.ts
        └── supplier.controller.ts
```

## 🔧 Phase 1: VendorController 구현

### 1.1 VendorController 생성
**파일 위치**: `apps/api-server/src/controllers/vendor/vendor.controller.ts`

```typescript
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { VendorService } from '../../services/vendor/vendor.service';
import { CreateVendorDto, UpdateVendorDto, VendorFilterDto } from '../../dto/vendor.dto';

@ApiTags('vendors')
@Controller('vendors')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  @Get()
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '모든 판매자 조회' })
  async findAll(@Query() filter: VendorFilterDto) {
    return this.vendorService.findAll(filter);
  }

  @Get('pending')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '승인 대기 중인 판매자 조회' })
  async findPending() {
    return this.vendorService.findByStatus('pending');
  }

  @Get('statistics')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '판매자 통계 조회' })
  async getStatistics() {
    return this.vendorService.getStatistics();
  }

  @Get(':id')
  @Roles('admin', 'manager', 'vendor')
  @ApiOperation({ summary: '특정 판매자 상세 조회' })
  async findOne(@Param('id') id: string) {
    return this.vendorService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '새 판매자 등록 (회원가입)' })
  async create(@Body() createVendorDto: CreateVendorDto) {
    return this.vendorService.create(createVendorDto);
  }

  @Put(':id')
  @Roles('admin', 'manager', 'vendor')
  @ApiOperation({ summary: '판매자 정보 수정' })
  async update(@Param('id') id: string, @Body() updateVendorDto: UpdateVendorDto) {
    return this.vendorService.update(id, updateVendorDto);
  }

  @Post(':id/approve')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '판매자 승인' })
  async approve(@Param('id') id: string) {
    return this.vendorService.approve(id);
  }

  @Post(':id/reject')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '판매자 거절' })
  async reject(@Param('id') id: string, @Body('reason') reason: string) {
    return this.vendorService.reject(id, reason);
  }

  @Post(':id/suspend')
  @Roles('admin')
  @ApiOperation({ summary: '판매자 정지' })
  async suspend(@Param('id') id: string, @Body('reason') reason: string) {
    return this.vendorService.suspend(id, reason);
  }

  @Get(':id/commission')
  @Roles('admin', 'manager', 'vendor')
  @ApiOperation({ summary: '판매자 수수료 내역 조회' })
  async getCommission(@Param('id') id: string, @Query('month') month?: string) {
    return this.vendorService.getCommission(id, month);
  }

  @Get(':id/products')
  @Roles('admin', 'manager', 'vendor')
  @ApiOperation({ summary: '판매자의 제품 목록 조회' })
  async getProducts(@Param('id') id: string) {
    return this.vendorService.getProducts(id);
  }

  @Get(':id/sales-report')
  @Roles('admin', 'manager', 'vendor')
  @ApiOperation({ summary: '판매자 매출 보고서' })
  async getSalesReport(@Param('id') id: string, @Query('period') period: string) {
    return this.vendorService.getSalesReport(id, period);
  }
}
```

### 1.2 VendorService 구현
**파일 위치**: `apps/api-server/src/services/vendor/vendor.service.ts`

```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VendorInfo } from '../../entities/VendorInfo';
import { User } from '../../entities/User';
import { Product } from '../../entities/Product';
import { Order } from '../../entities/Order';
import { CreateVendorDto, UpdateVendorDto, VendorFilterDto } from '../../dto/vendor.dto';

@Injectable()
export class VendorService {
  constructor(
    @InjectRepository(VendorInfo)
    private vendorRepository: Repository<VendorInfo>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
  ) {}

  async findAll(filter: VendorFilterDto) {
    const query = this.vendorRepository.createQueryBuilder('vendor')
      .leftJoinAndSelect('vendor.user', 'user')
      .leftJoinAndSelect('vendor.products', 'products');

    if (filter.status) {
      query.andWhere('vendor.status = :status', { status: filter.status });
    }

    if (filter.vendorType) {
      query.andWhere('vendor.vendorType = :type', { type: filter.vendorType });
    }

    if (filter.search) {
      query.andWhere('(user.name LIKE :search OR vendor.businessName LIKE :search)', 
        { search: `%${filter.search}%` });
    }

    const [vendors, total] = await query
      .skip(filter.skip || 0)
      .take(filter.take || 20)
      .getManyAndCount();

    return {
      data: vendors,
      total,
      page: Math.floor((filter.skip || 0) / (filter.take || 20)) + 1,
      pageSize: filter.take || 20
    };
  }

  async findByStatus(status: 'pending' | 'active' | 'suspended') {
    return this.vendorRepository.find({
      where: { status },
      relations: ['user', 'products'],
      order: { createdAt: 'DESC' }
    });
  }

  async getStatistics() {
    const [total, pending, active, suspended] = await Promise.all([
      this.vendorRepository.count(),
      this.vendorRepository.count({ where: { status: 'pending' } }),
      this.vendorRepository.count({ where: { status: 'active' } }),
      this.vendorRepository.count({ where: { status: 'suspended' } })
    ]);

    const topVendors = await this.vendorRepository.find({
      where: { status: 'active' },
      order: { totalRevenue: 'DESC' },
      take: 5,
      relations: ['user']
    });

    return {
      total,
      byStatus: { pending, active, suspended },
      topVendors,
      averageRating: await this.getAverageRating(),
      totalRevenue: await this.getTotalRevenue()
    };
  }

  async findOne(id: string) {
    const vendor = await this.vendorRepository.findOne({
      where: { id },
      relations: ['user', 'products', 'bankAccount']
    });

    if (!vendor) {
      throw new NotFoundException('판매자를 찾을 수 없습니다');
    }

    return vendor;
  }

  async create(createVendorDto: CreateVendorDto) {
    // 1. User 생성
    const user = this.userRepository.create({
      email: createVendorDto.email,
      password: createVendorDto.password, // 해시 처리 필요
      name: createVendorDto.name,
      phone: createVendorDto.phone,
      role: 'vendor'
    });

    const savedUser = await this.userRepository.save(user);

    // 2. VendorInfo 생성
    const vendor = this.vendorRepository.create({
      user: savedUser,
      vendorType: createVendorDto.vendorType,
      businessName: createVendorDto.businessName,
      businessNumber: createVendorDto.businessNumber,
      businessAddress: createVendorDto.businessAddress,
      commissionRate: createVendorDto.commissionRate || 10,
      status: 'pending',
      totalSales: 0,
      totalRevenue: 0,
      rating: 0,
      reviewCount: 0
    });

    return this.vendorRepository.save(vendor);
  }

  async update(id: string, updateVendorDto: UpdateVendorDto) {
    const vendor = await this.findOne(id);
    
    Object.assign(vendor, updateVendorDto);
    
    return this.vendorRepository.save(vendor);
  }

  async approve(id: string) {
    const vendor = await this.findOne(id);
    
    if (vendor.status !== 'pending') {
      throw new BadRequestException('승인 대기 상태의 판매자만 승인할 수 있습니다');
    }

    vendor.status = 'active';
    vendor.approvedAt = new Date();
    
    // 제휴 코드 생성
    vendor.affiliateCode = this.generateAffiliateCode(vendor.businessName);
    
    return this.vendorRepository.save(vendor);
  }

  async reject(id: string, reason: string) {
    const vendor = await this.findOne(id);
    
    if (vendor.status !== 'pending') {
      throw new BadRequestException('승인 대기 상태의 판매자만 거절할 수 있습니다');
    }

    vendor.status = 'rejected';
    vendor.rejectionReason = reason;
    
    return this.vendorRepository.save(vendor);
  }

  async suspend(id: string, reason: string) {
    const vendor = await this.findOne(id);
    
    if (vendor.status !== 'active') {
      throw new BadRequestException('활성 상태의 판매자만 정지할 수 있습니다');
    }

    vendor.status = 'suspended';
    vendor.suspensionReason = reason;
    vendor.suspendedAt = new Date();
    
    return this.vendorRepository.save(vendor);
  }

  async getCommission(vendorId: string, month?: string) {
    const vendor = await this.findOne(vendorId);
    
    // CommissionService에서 상세 구현
    const commissionData = await this.calculateCommission(vendor, month);
    
    return commissionData;
  }

  async getProducts(vendorId: string) {
    return this.productRepository.find({
      where: { vendor: { id: vendorId } },
      relations: ['category', 'images']
    });
  }

  async getSalesReport(vendorId: string, period: string) {
    const vendor = await this.findOne(vendorId);
    
    // 기간별 매출 데이터 조회
    const salesData = await this.orderRepository
      .createQueryBuilder('order')
      .leftJoin('order.orderItems', 'items')
      .leftJoin('items.product', 'product')
      .where('product.vendor.id = :vendorId', { vendorId })
      .andWhere('order.createdAt >= :startDate', { startDate: this.getPeriodStartDate(period) })
      .select([
        'DATE(order.createdAt) as date',
        'COUNT(DISTINCT order.id) as orderCount',
        'SUM(items.quantity) as totalQuantity',
        'SUM(items.price * items.quantity) as totalRevenue'
      ])
      .groupBy('DATE(order.createdAt)')
      .getRawMany();

    return {
      vendor,
      period,
      salesData,
      summary: this.calculateSalesSummary(salesData)
    };
  }

  // Helper methods
  private generateAffiliateCode(businessName: string): string {
    const prefix = businessName.substring(0, 3).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${random}`;
  }

  private async getAverageRating(): Promise<number> {
    const result = await this.vendorRepository
      .createQueryBuilder('vendor')
      .select('AVG(vendor.rating)', 'avg')
      .getRawOne();
    return result.avg || 0;
  }

  private async getTotalRevenue(): Promise<number> {
    const result = await this.vendorRepository
      .createQueryBuilder('vendor')
      .select('SUM(vendor.totalRevenue)', 'sum')
      .getRawOne();
    return result.sum || 0;
  }

  private async calculateCommission(vendor: VendorInfo, month?: string) {
    // CommissionService로 이동 예정
    return {
      vendorId: vendor.id,
      month: month || new Date().toISOString().substring(0, 7),
      totalSales: 0,
      commissionRate: vendor.commissionRate,
      commissionAmount: 0,
      status: 'pending'
    };
  }

  private getPeriodStartDate(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'week':
        return new Date(now.setDate(now.getDate() - 7));
      case 'month':
        return new Date(now.setMonth(now.getMonth() - 1));
      case 'quarter':
        return new Date(now.setMonth(now.getMonth() - 3));
      case 'year':
        return new Date(now.setFullYear(now.getFullYear() - 1));
      default:
        return new Date(now.setMonth(now.getMonth() - 1));
    }
  }

  private calculateSalesSummary(salesData: any[]) {
    return {
      totalOrders: salesData.reduce((sum, d) => sum + d.orderCount, 0),
      totalQuantity: salesData.reduce((sum, d) => sum + d.totalQuantity, 0),
      totalRevenue: salesData.reduce((sum, d) => sum + d.totalRevenue, 0),
      averageOrderValue: salesData.length > 0 
        ? salesData.reduce((sum, d) => sum + d.totalRevenue, 0) / salesData.reduce((sum, d) => sum + d.orderCount, 0)
        : 0
    };
  }
}
```

## 🔧 Phase 2: SupplierController 구현

### 2.1 SupplierController 생성
**파일 위치**: `apps/api-server/src/controllers/vendor/supplier.controller.ts`

```typescript
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { SupplierService } from '../../services/vendor/supplier.service';
import { CreateSupplierDto, UpdateSupplierDto, SupplierFilterDto } from '../../dto/supplier.dto';

@ApiTags('suppliers')
@Controller('suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Get()
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '모든 공급자 조회' })
  async findAll(@Query() filter: SupplierFilterDto) {
    return this.supplierService.findAll(filter);
  }

  @Get(':id')
  @Roles('admin', 'manager', 'supplier')
  @ApiOperation({ summary: '특정 공급자 상세 조회' })
  async findOne(@Param('id') id: string) {
    return this.supplierService.findOne(id);
  }

  @Post()
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '새 공급자 등록' })
  async create(@Body() createSupplierDto: CreateSupplierDto) {
    return this.supplierService.create(createSupplierDto);
  }

  @Put(':id')
  @Roles('admin', 'manager', 'supplier')
  @ApiOperation({ summary: '공급자 정보 수정' })
  async update(@Param('id') id: string, @Body() updateSupplierDto: UpdateSupplierDto) {
    return this.supplierService.update(id, updateSupplierDto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: '공급자 삭제' })
  async remove(@Param('id') id: string) {
    return this.supplierService.remove(id);
  }

  @Get(':id/products')
  @Roles('admin', 'manager', 'supplier')
  @ApiOperation({ summary: '공급자의 제품 목록' })
  async getProducts(@Param('id') id: string) {
    return this.supplierService.getProducts(id);
  }

  @Post(':id/products/sync')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '공급자 제품 동기화' })
  async syncProducts(@Param('id') id: string) {
    return this.supplierService.syncProducts(id);
  }

  @Get(':id/inventory')
  @Roles('admin', 'manager', 'supplier')
  @ApiOperation({ summary: '공급자 재고 현황' })
  async getInventory(@Param('id') id: string) {
    return this.supplierService.getInventory(id);
  }

  @Post(':id/orders')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: '공급자에게 주문 전송' })
  async sendOrder(@Param('id') id: string, @Body() orderData: any) {
    return this.supplierService.sendOrder(id, orderData);
  }

  @Get(':id/settlement')
  @Roles('admin', 'manager', 'supplier')
  @ApiOperation({ summary: '공급자 정산 내역' })
  async getSettlement(@Param('id') id: string, @Query('month') month?: string) {
    return this.supplierService.getSettlement(id, month);
  }

  @Put(':id/margin-rate')
  @Roles('admin')
  @ApiOperation({ summary: '공급자 마진율 설정' })
  async updateMarginRate(@Param('id') id: string, @Body('rate') rate: number) {
    return this.supplierService.updateMarginRate(id, rate);
  }

  @Put(':id/auto-approval')
  @Roles('admin')
  @ApiOperation({ summary: '자동 승인 설정' })
  async toggleAutoApproval(@Param('id') id: string, @Body('enabled') enabled: boolean) {
    return this.supplierService.toggleAutoApproval(id, enabled);
  }
}
```

### 2.2 SupplierService 구현
**파일 위치**: `apps/api-server/src/services/vendor/supplier.service.ts`

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupplierInfo } from '../../entities/SupplierInfo';
import { Product } from '../../entities/Product';
import { SupplierConnectorFactory } from '@o4o/supplier-connector';
import { CreateSupplierDto, UpdateSupplierDto, SupplierFilterDto } from '../../dto/supplier.dto';

@Injectable()
export class SupplierService {
  private connectorFactory: SupplierConnectorFactory;

  constructor(
    @InjectRepository(SupplierInfo)
    private supplierRepository: Repository<SupplierInfo>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {
    this.connectorFactory = new SupplierConnectorFactory();
  }

  async findAll(filter: SupplierFilterDto) {
    const query = this.supplierRepository.createQueryBuilder('supplier')
      .leftJoinAndSelect('supplier.products', 'products');

    if (filter.isActive !== undefined) {
      query.andWhere('supplier.isActive = :isActive', { isActive: filter.isActive });
    }

    if (filter.search) {
      query.andWhere('(supplier.companyName LIKE :search OR supplier.businessNumber LIKE :search)', 
        { search: `%${filter.search}%` });
    }

    const [suppliers, total] = await query
      .skip(filter.skip || 0)
      .take(filter.take || 20)
      .getManyAndCount();

    return {
      data: suppliers,
      total,
      page: Math.floor((filter.skip || 0) / (filter.take || 20)) + 1,
      pageSize: filter.take || 20
    };
  }

  async findOne(id: string) {
    const supplier = await this.supplierRepository.findOne({
      where: { id },
      relations: ['products', 'orders']
    });

    if (!supplier) {
      throw new NotFoundException('공급자를 찾을 수 없습니다');
    }

    return supplier;
  }

  async create(createSupplierDto: CreateSupplierDto) {
    const supplier = this.supplierRepository.create({
      ...createSupplierDto,
      isActive: true,
      autoApproval: false,
      preferredMarginRate: createSupplierDto.preferredMarginRate || 30,
      preferredAffiliateRate: createSupplierDto.preferredAffiliateRate || 5
    });

    return this.supplierRepository.save(supplier);
  }

  async update(id: string, updateSupplierDto: UpdateSupplierDto) {
    const supplier = await this.findOne(id);
    Object.assign(supplier, updateSupplierDto);
    return this.supplierRepository.save(supplier);
  }

  async remove(id: string) {
    const supplier = await this.findOne(id);
    supplier.isActive = false;
    return this.supplierRepository.save(supplier);
  }

  async getProducts(supplierId: string) {
    return this.productRepository.find({
      where: { supplier: { id: supplierId } },
      relations: ['category', 'images', 'vendor']
    });
  }

  async syncProducts(supplierId: string) {
    const supplier = await this.findOne(supplierId);
    
    // Supplier Connector 사용
    const connector = this.connectorFactory.createConnector(supplier.integrationType, {
      apiUrl: supplier.apiUrl,
      apiKey: supplier.apiKey,
      csvPath: supplier.csvPath
    });

    const products = await connector.fetchProducts();
    
    // 제품 업데이트 또는 생성
    const results = {
      created: 0,
      updated: 0,
      failed: 0,
      products: []
    };

    for (const productData of products) {
      try {
        const existingProduct = await this.productRepository.findOne({
          where: { 
            supplierSku: productData.sku,
            supplier: { id: supplierId }
          }
        });

        if (existingProduct) {
          // 업데이트
          Object.assign(existingProduct, {
            name: productData.name,
            description: productData.description,
            supplierPrice: productData.price,
            price: this.calculateSellingPrice(productData.price, supplier.preferredMarginRate),
            stockQuantity: productData.stock,
            lastSyncedAt: new Date()
          });
          
          await this.productRepository.save(existingProduct);
          results.updated++;
        } else {
          // 생성
          const newProduct = this.productRepository.create({
            name: productData.name,
            description: productData.description,
            supplierSku: productData.sku,
            supplier: supplier,
            supplierPrice: productData.price,
            price: this.calculateSellingPrice(productData.price, supplier.preferredMarginRate),
            stockQuantity: productData.stock,
            status: supplier.autoApproval ? 'active' : 'pending',
            lastSyncedAt: new Date()
          });
          
          await this.productRepository.save(newProduct);
          results.created++;
        }
        
        results.products.push(productData);
      } catch (error) {
        results.failed++;
        console.error(`Failed to sync product ${productData.sku}:`, error);
      }
    }

    return results;
  }

  async getInventory(supplierId: string) {
    const products = await this.getProducts(supplierId);
    
    return {
      totalProducts: products.length,
      totalStock: products.reduce((sum, p) => sum + p.stockQuantity, 0),
      lowStockProducts: products.filter(p => p.stockQuantity < 10),
      outOfStockProducts: products.filter(p => p.stockQuantity === 0),
      products: products.map(p => ({
        id: p.id,
        name: p.name,
        sku: p.supplierSku,
        stock: p.stockQuantity,
        status: p.status
      }))
    };
  }

  async sendOrder(supplierId: string, orderData: any) {
    const supplier = await this.findOne(supplierId);
    
    // Supplier Connector를 통한 주문 전송
    const connector = this.connectorFactory.createConnector(supplier.integrationType, {
      apiUrl: supplier.apiUrl,
      apiKey: supplier.apiKey
    });

    const orderResult = await connector.createOrder(orderData);
    
    // 주문 기록 저장
    // Order 엔티티에 supplier 관계 추가 필요
    
    return orderResult;
  }

  async getSettlement(supplierId: string, month?: string) {
    const supplier = await this.findOne(supplierId);
    const targetMonth = month || new Date().toISOString().substring(0, 7);
    
    // 해당 월의 주문 데이터 조회
    const orders = await this.getMonthlyOrders(supplierId, targetMonth);
    
    const totalRevenue = orders.reduce((sum, order) => sum + order.supplierRevenue, 0);
    const totalMargin = orders.reduce((sum, order) => sum + order.platformMargin, 0);
    
    return {
      supplier,
      month: targetMonth,
      orderCount: orders.length,
      totalRevenue,
      totalMargin,
      marginRate: supplier.preferredMarginRate,
      supplierPayment: totalRevenue * (1 - supplier.preferredMarginRate / 100),
      status: 'pending',
      orders
    };
  }

  async updateMarginRate(supplierId: string, rate: number) {
    const supplier = await this.findOne(supplierId);
    supplier.preferredMarginRate = rate;
    
    // 관련 제품 가격 재계산
    const products = await this.getProducts(supplierId);
    for (const product of products) {
      product.price = this.calculateSellingPrice(product.supplierPrice, rate);
      await this.productRepository.save(product);
    }
    
    return this.supplierRepository.save(supplier);
  }

  async toggleAutoApproval(supplierId: string, enabled: boolean) {
    const supplier = await this.findOne(supplierId);
    supplier.autoApproval = enabled;
    return this.supplierRepository.save(supplier);
  }

  // Helper methods
  private calculateSellingPrice(supplierPrice: number, marginRate: number): number {
    return Math.ceil(supplierPrice * (1 + marginRate / 100));
  }

  private async getMonthlyOrders(supplierId: string, month: string) {
    // Order 엔티티와 연동 필요
    // 임시 데이터
    return [];
  }
}
```

## 🔧 Phase 3: CommissionService 구현

### 3.1 CommissionService 생성
**파일 위치**: `apps/api-server/src/services/vendor/commission.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { VendorInfo } from '../../entities/VendorInfo';
import { SupplierInfo } from '../../entities/SupplierInfo';
import { Order } from '../../entities/Order';
import { OrderItem } from '../../entities/OrderItem';
import { Commission } from '../../entities/Commission'; // 새로 생성 필요

@Injectable()
export class CommissionService {
  constructor(
    @InjectRepository(VendorInfo)
    private vendorRepository: Repository<VendorInfo>,
    @InjectRepository(SupplierInfo)
    private supplierRepository: Repository<SupplierInfo>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Commission)
    private commissionRepository: Repository<Commission>,
  ) {}

  // 매월 1일 자정에 실행되는 정산 작업
  @Cron('0 0 1 * *')
  async processMonthlySettlement() {
    const lastMonth = this.getLastMonth();
    
    // 모든 활성 판매자 정산
    const activeVendors = await this.vendorRepository.find({
      where: { status: 'active' }
    });

    for (const vendor of activeVendors) {
      await this.calculateVendorCommission(vendor.id, lastMonth);
    }

    // 모든 활성 공급자 정산
    const activeSuppliers = await this.supplierRepository.find({
      where: { isActive: true }
    });

    for (const supplier of activeSuppliers) {
      await this.calculateSupplierSettlement(supplier.id, lastMonth);
    }
  }

  async calculateVendorCommission(vendorId: string, month: string) {
    const vendor = await this.vendorRepository.findOne({ where: { id: vendorId } });
    const { startDate, endDate } = this.getMonthDateRange(month);

    // 해당 월의 판매 데이터 조회
    const orders = await this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.orderItems', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .where('product.vendor.id = :vendorId', { vendorId })
      .andWhere('order.status = :status', { status: 'completed' })
      .andWhere('order.completedAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getMany();

    let totalSales = 0;
    let totalCommission = 0;
    let totalAffiliateCommission = 0;

    for (const order of orders) {
      for (const item of order.orderItems) {
        const itemTotal = item.price * item.quantity;
        totalSales += itemTotal;
        
        // 플랫폼 수수료 계산
        const platformCommission = itemTotal * (vendor.commissionRate / 100);
        totalCommission += platformCommission;
        
        // 제휴 수수료 계산 (있는 경우)
        if (order.affiliateCode) {
          const affiliateCommission = itemTotal * (vendor.affiliateCommissionRate / 100);
          totalAffiliateCommission += affiliateCommission;
        }
      }
    }

    // Commission 레코드 생성
    const commission = this.commissionRepository.create({
      vendor,
      month,
      totalSales,
      commissionRate: vendor.commissionRate,
      commissionAmount: totalCommission,
      affiliateCommission: totalAffiliateCommission,
      netAmount: totalSales - totalCommission - totalAffiliateCommission,
      status: 'pending',
      orderCount: orders.length
    });

    return this.commissionRepository.save(commission);
  }

  async calculateSupplierSettlement(supplierId: string, month: string) {
    const supplier = await this.supplierRepository.findOne({ where: { id: supplierId } });
    const { startDate, endDate } = this.getMonthDateRange(month);

    // 해당 월의 공급자 제품 판매 데이터
    const orders = await this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.orderItems', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .where('product.supplier.id = :supplierId', { supplierId })
      .andWhere('order.status = :status', { status: 'completed' })
      .andWhere('order.completedAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getMany();

    let totalSupplierRevenue = 0;
    let totalPlatformMargin = 0;
    let totalAffiliateCommission = 0;

    for (const order of orders) {
      for (const item of order.orderItems) {
        const supplierPrice = item.product.supplierPrice * item.quantity;
        const sellingPrice = item.price * item.quantity;
        
        totalSupplierRevenue += supplierPrice;
        totalPlatformMargin += (sellingPrice - supplierPrice);
        
        // 제휴 수수료 계산
        if (order.affiliateCode) {
          const affiliateCommission = sellingPrice * (supplier.preferredAffiliateRate / 100);
          totalAffiliateCommission += affiliateCommission;
        }
      }
    }

    // SupplierSettlement 레코드 생성 (새 엔티티 필요)
    const settlement = {
      supplier,
      month,
      orderCount: orders.length,
      totalRevenue: totalSupplierRevenue,
      platformMargin: totalPlatformMargin,
      affiliateCommission: totalAffiliateCommission,
      payableAmount: totalSupplierRevenue,
      status: 'pending'
    };

    // settlement 저장 로직
    return settlement;
  }

  async getVendorCommissionHistory(vendorId: string, limit = 12) {
    return this.commissionRepository.find({
      where: { vendor: { id: vendorId } },
      order: { month: 'DESC' },
      take: limit
    });
  }

  async getSupplierSettlementHistory(supplierId: string, limit = 12) {
    // SupplierSettlement 조회 로직
    return [];
  }

  async approveCommission(commissionId: string) {
    const commission = await this.commissionRepository.findOne({ 
      where: { id: commissionId },
      relations: ['vendor']
    });

    commission.status = 'approved';
    commission.approvedAt = new Date();
    
    // 실제 지급 처리 로직 추가 필요
    await this.processPayment(commission);
    
    return this.commissionRepository.save(commission);
  }

  async rejectCommission(commissionId: string, reason: string) {
    const commission = await this.commissionRepository.findOne({ 
      where: { id: commissionId }
    });

    commission.status = 'rejected';
    commission.rejectionReason = reason;
    
    return this.commissionRepository.save(commission);
  }

  async processPayment(commission: Commission) {
    // 실제 은행 이체 API 연동
    // 결제 게이트웨이 연동
    // 지급 완료 후 상태 업데이트
    
    commission.status = 'paid';
    commission.paidAt = new Date();
    
    // 판매자 총 수익 업데이트
    const vendor = commission.vendor;
    vendor.totalRevenue += commission.netAmount;
    await this.vendorRepository.save(vendor);
  }

  async getDashboardStatistics() {
    const currentMonth = this.getCurrentMonth();
    const lastMonth = this.getLastMonth();

    const [currentMonthTotal, lastMonthTotal, pendingPayments, totalVendors] = await Promise.all([
      this.getTotalCommissionByMonth(currentMonth),
      this.getTotalCommissionByMonth(lastMonth),
      this.getPendingPaymentsTotal(),
      this.vendorRepository.count({ where: { status: 'active' } })
    ]);

    return {
      currentMonth: {
        month: currentMonth,
        total: currentMonthTotal
      },
      lastMonth: {
        month: lastMonth,
        total: lastMonthTotal
      },
      growth: this.calculateGrowthRate(currentMonthTotal, lastMonthTotal),
      pendingPayments,
      totalVendors,
      averageCommissionRate: await this.getAverageCommissionRate()
    };
  }

  // Helper methods
  private getLastMonth(): string {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().substring(0, 7);
  }

  private getCurrentMonth(): string {
    return new Date().toISOString().substring(0, 7);
  }

  private getMonthDateRange(month: string) {
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59);
    return { startDate, endDate };
  }

  private async getTotalCommissionByMonth(month: string): Promise<number> {
    const result = await this.commissionRepository
      .createQueryBuilder('commission')
      .where('commission.month = :month', { month })
      .select('SUM(commission.commissionAmount)', 'total')
      .getRawOne();
    return result?.total || 0;
  }

  private async getPendingPaymentsTotal(): Promise<number> {
    const result = await this.commissionRepository
      .createQueryBuilder('commission')
      .where('commission.status = :status', { status: 'pending' })
      .select('SUM(commission.netAmount)', 'total')
      .getRawOne();
    return result?.total || 0;
  }

  private async getAverageCommissionRate(): Promise<number> {
    const result = await this.vendorRepository
      .createQueryBuilder('vendor')
      .where('vendor.status = :status', { status: 'active' })
      .select('AVG(vendor.commissionRate)', 'avg')
      .getRawOne();
    return result?.avg || 0;
  }

  private calculateGrowthRate(current: number, previous: number): number {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }
}
```

## 🔧 Phase 4: DTOs 생성

### 4.1 VendorDto 생성
**파일 위치**: `apps/api-server/src/dto/vendor.dto.ts`

```typescript
import { IsString, IsEmail, IsEnum, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVendorDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  password: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  phone: string;

  @ApiProperty({ enum: ['individual', 'business'] })
  @IsEnum(['individual', 'business'])
  vendorType: 'individual' | 'business';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessAddress?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate?: number;
}

export class UpdateVendorDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankAccount?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accountHolder?: string;
}

export class VendorFilterDto {
  @ApiPropertyOptional({ enum: ['pending', 'active', 'suspended', 'rejected'] })
  @IsOptional()
  @IsEnum(['pending', 'active', 'suspended', 'rejected'])
  status?: string;

  @ApiPropertyOptional({ enum: ['individual', 'business'] })
  @IsOptional()
  @IsEnum(['individual', 'business'])
  vendorType?: 'individual' | 'business';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  skip?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  take?: number;
}
```

### 4.2 SupplierDto 생성
**파일 위치**: `apps/api-server/src/dto/supplier.dto.ts`

```typescript
import { IsString, IsOptional, IsNumber, IsBoolean, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSupplierDto {
  @ApiProperty()
  @IsString()
  companyName: string;

  @ApiProperty()
  @IsString()
  businessNumber: string;

  @ApiProperty()
  @IsString()
  representativeName: string;

  @ApiProperty()
  @IsString()
  businessAddress: string;

  @ApiProperty()
  @IsString()
  contactEmail: string;

  @ApiProperty()
  @IsString()
  contactPhone: string;

  @ApiPropertyOptional({ enum: ['api', 'csv', 'manual'] })
  @IsOptional()
  @IsEnum(['api', 'csv', 'manual'])
  integrationType?: 'api' | 'csv' | 'manual';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  apiUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  preferredMarginRate?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 50 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  preferredAffiliateRate?: number;
}

export class UpdateSupplierDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  representativeName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoApproval?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  preferredMarginRate?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 50 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  preferredAffiliateRate?: number;
}

export class SupplierFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  skip?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  take?: number;
}
```

## 🔧 Phase 5: 새 엔티티 생성

### 5.1 Commission 엔티티
**파일 위치**: `apps/api-server/src/entities/Commission.ts`

```typescript
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { VendorInfo } from './VendorInfo';

@Entity('commissions')
export class Commission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => VendorInfo, vendor => vendor.commissions)
  vendor: VendorInfo;

  @Column()
  month: string; // YYYY-MM format

  @Column('decimal', { precision: 10, scale: 2 })
  totalSales: number;

  @Column('decimal', { precision: 5, scale: 2 })
  commissionRate: number;

  @Column('decimal', { precision: 10, scale: 2 })
  commissionAmount: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  affiliateCommission: number;

  @Column('decimal', { precision: 10, scale: 2 })
  netAmount: number; // totalSales - commissionAmount - affiliateCommission

  @Column('int')
  orderCount: number;

  @Column({
    type: 'enum',
    enum: ['pending', 'approved', 'rejected', 'paid'],
    default: 'pending'
  })
  status: 'pending' | 'approved' | 'rejected' | 'paid';

  @Column({ nullable: true })
  rejectionReason?: string;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  paidAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 5.2 SupplierSettlement 엔티티
**파일 위치**: `apps/api-server/src/entities/SupplierSettlement.ts`

```typescript
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { SupplierInfo } from './SupplierInfo';

@Entity('supplier_settlements')
export class SupplierSettlement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => SupplierInfo, supplier => supplier.settlements)
  supplier: SupplierInfo;

  @Column()
  month: string; // YYYY-MM format

  @Column('int')
  orderCount: number;

  @Column('decimal', { precision: 10, scale: 2 })
  totalRevenue: number; // 공급자가 받을 금액

  @Column('decimal', { precision: 10, scale: 2 })
  platformMargin: number; // 플랫폼 마진

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  affiliateCommission: number; // 제휴 수수료

  @Column('decimal', { precision: 10, scale: 2 })
  payableAmount: number; // 실제 지급할 금액

  @Column({
    type: 'enum',
    enum: ['pending', 'approved', 'paid', 'rejected'],
    default: 'pending'
  })
  status: 'pending' | 'approved' | 'paid' | 'rejected';

  @Column({ nullable: true })
  rejectionReason?: string;

  @Column({ nullable: true })
  invoiceNumber?: string;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  paidAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

## 🔧 Phase 6: Module 설정

### 6.1 VendorModule 생성
**파일 위치**: `apps/api-server/src/modules/vendor.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

// Controllers
import { VendorController } from '../controllers/vendor/vendor.controller';
import { SupplierController } from '../controllers/vendor/supplier.controller';

// Services
import { VendorService } from '../services/vendor/vendor.service';
import { SupplierService } from '../services/vendor/supplier.service';
import { CommissionService } from '../services/vendor/commission.service';

// Entities
import { VendorInfo } from '../entities/VendorInfo';
import { SupplierInfo } from '../entities/SupplierInfo';
import { Commission } from '../entities/Commission';
import { SupplierSettlement } from '../entities/SupplierSettlement';
import { User } from '../entities/User';
import { Product } from '../entities/Product';
import { Order } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VendorInfo,
      SupplierInfo,
      Commission,
      SupplierSettlement,
      User,
      Product,
      Order,
      OrderItem
    ]),
    ScheduleModule.forRoot()
  ],
  controllers: [
    VendorController,
    SupplierController
  ],
  providers: [
    VendorService,
    SupplierService,
    CommissionService
  ],
  exports: [
    VendorService,
    SupplierService,
    CommissionService
  ]
})
export class VendorModule {}
```

### 6.2 app.module.ts 업데이트
**파일 위치**: `apps/api-server/src/app.module.ts`

```typescript
// 기존 imports에 추가
import { VendorModule } from './modules/vendor.module';

@Module({
  imports: [
    // ... 기존 모듈들
    VendorModule, // 추가
  ],
  // ... 나머지 설정
})
export class AppModule {}
```

## 🔧 Phase 7: 마이그레이션 생성

### 7.1 Commission 테이블 마이그레이션
```bash
cd apps/api-server
npm run migration:generate -- -n AddCommissionTable
```

### 7.2 SupplierSettlement 테이블 마이그레이션
```bash
npm run migration:generate -- -n AddSupplierSettlementTable
```

### 7.3 VendorInfo 관계 업데이트
```bash
npm run migration:generate -- -n UpdateVendorRelations
```

## 🔧 Phase 8: Frontend API 연동

### 8.1 API 서비스 생성
**파일 위치**: `packages/api-client/src/services/vendor.service.ts`

```typescript
import { apiClient } from '../client';

export interface Vendor {
  id: string;
  user: {
    email: string;
    name: string;
    phone: string;
  };
  vendorType: 'individual' | 'business';
  businessName?: string;
  businessNumber?: string;
  status: 'pending' | 'active' | 'suspended' | 'rejected';
  commissionRate: number;
  totalSales: number;
  totalRevenue: number;
  rating: number;
}

export interface Commission {
  id: string;
  month: string;
  totalSales: number;
  commissionAmount: number;
  netAmount: number;
  status: string;
}

export const vendorService = {
  // Vendor APIs
  async getVendors(params?: any) {
    return apiClient.get<{ data: Vendor[], total: number }>('/vendors', { params });
  },

  async getPendingVendors() {
    return apiClient.get<Vendor[]>('/vendors/pending');
  },

  async getVendor(id: string) {
    return apiClient.get<Vendor>(`/vendors/${id}`);
  },

  async approveVendor(id: string) {
    return apiClient.post(`/vendors/${id}/approve`);
  },

  async rejectVendor(id: string, reason: string) {
    return apiClient.post(`/vendors/${id}/reject`, { reason });
  },

  async getVendorCommission(id: string, month?: string) {
    return apiClient.get<Commission>(`/vendors/${id}/commission`, { 
      params: { month } 
    });
  },

  async getVendorProducts(id: string) {
    return apiClient.get(`/vendors/${id}/products`);
  },

  async getVendorSalesReport(id: string, period: string) {
    return apiClient.get(`/vendors/${id}/sales-report`, { 
      params: { period } 
    });
  },

  // Statistics
  async getStatistics() {
    return apiClient.get('/vendors/statistics');
  }
};
```

### 8.2 VendorsList 컴포넌트 업데이트
**파일 위치**: `apps/admin-dashboard/src/pages/vendors/VendorsList.tsx`

```typescript
// 기존 Mock 데이터를 실제 API 호출로 변경
import { useState, useEffect } from 'react';
import { vendorService } from '@o4o/api-client';

export default function VendorsList() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState(null);

  useEffect(() => {
    loadVendors();
    loadStatistics();
  }, []);

  const loadVendors = async () => {
    try {
      setLoading(true);
      const response = await vendorService.getVendors();
      setVendors(response.data.data);
    } catch (error) {
      console.error('Failed to load vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = await vendorService.getStatistics();
      setStatistics(stats.data);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  const handleApprove = async (vendorId: string) => {
    try {
      await vendorService.approveVendor(vendorId);
      // 성공 메시지 표시
      await loadVendors(); // 목록 새로고침
    } catch (error) {
      console.error('Failed to approve vendor:', error);
    }
  };

  const handleReject = async (vendorId: string, reason: string) => {
    try {
      await vendorService.rejectVendor(vendorId, reason);
      // 성공 메시지 표시
      await loadVendors(); // 목록 새로고침
    } catch (error) {
      console.error('Failed to reject vendor:', error);
    }
  };

  // ... 나머지 컴포넌트 로직
}
```

## 📋 테스트 시나리오

### 1. Vendor CRUD 테스트
```bash
# 판매자 목록 조회
curl -X GET http://localhost:3001/api/vendors \
  -H "Authorization: Bearer ${JWT_TOKEN}"

# 판매자 승인
curl -X POST http://localhost:3001/api/vendors/{id}/approve \
  -H "Authorization: Bearer ${JWT_TOKEN}"

# 수수료 조회
curl -X GET http://localhost:3001/api/vendors/{id}/commission?month=2025-08 \
  -H "Authorization: Bearer ${JWT_TOKEN}"
```

### 2. Supplier 동기화 테스트
```bash
# 공급자 제품 동기화
curl -X POST http://localhost:3001/api/suppliers/{id}/products/sync \
  -H "Authorization: Bearer ${JWT_TOKEN}"

# 재고 현황 조회
curl -X GET http://localhost:3001/api/suppliers/{id}/inventory \
  -H "Authorization: Bearer ${JWT_TOKEN}"
```

### 3. 정산 처리 테스트
```bash
# 수동 정산 실행
curl -X POST http://localhost:3001/api/admin/settlement/process \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -d '{"month": "2025-08"}'
```

## 🚀 배포 체크리스트

1. **데이터베이스 마이그레이션 실행**
   ```bash
   npm run migration:run
   ```

2. **환경 변수 설정**
   - JWT_SECRET 확인
   - 데이터베이스 연결 정보 확인
   - 결제 게이트웨이 API 키 설정

3. **권한 설정 확인**
   - admin: 모든 기능 접근 가능
   - manager: 승인/거절, 조회 가능
   - vendor: 자신의 정보만 조회 가능
   - supplier: 자신의 정보만 조회 가능

4. **스케줄 작업 확인**
   - 월별 정산 크론잡 활성화
   - 제품 동기화 스케줄 설정

5. **모니터링 설정**
   - 정산 처리 로그
   - API 에러 로그
   - 성능 메트릭

## 📌 주의사항

1. **보안**
   - 모든 엔드포인트에 적절한 인증/인가 적용
   - 민감한 정보(계좌번호 등) 암호화
   - SQL Injection 방지

2. **성능**
   - 대량 데이터 처리 시 페이지네이션 필수
   - 정산 처리는 배치로 실행
   - 캐싱 전략 적용

3. **데이터 정합성**
   - 트랜잭션 처리 필수
   - 정산 금액 이중 체크
   - 실패 시 롤백 처리

---

이 작업 지시서를 API 서버의 Claude Code에게 전달하여 구현을 완료하세요.
전체 구현 예상 시간: 6-8시간