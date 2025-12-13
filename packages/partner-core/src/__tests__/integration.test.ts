/**
 * Partner-Core Integration Tests
 *
 * Phase 7: Click → Conversion → Commission → Settlement 전체 흐름 검증
 *
 * @package @o4o/partner-core
 */

import { DataSource, Repository } from 'typeorm';
import { Partner, PartnerStatus, PartnerLevel } from '../entities/Partner.entity.js';
import { PartnerLink, PartnerLinkStatus, LinkTargetType } from '../entities/PartnerLink.entity.js';
import { PartnerClick } from '../entities/PartnerClick.entity.js';
import { PartnerConversion, ConversionStatus } from '../entities/PartnerConversion.entity.js';
import { PartnerCommission, CommissionStatus } from '../entities/PartnerCommission.entity.js';
import { PartnerSettlementBatch, SettlementBatchStatus } from '../entities/PartnerSettlementBatch.entity.js';

import { PartnerService } from '../services/PartnerService.js';
import { PartnerLinkService } from '../services/PartnerLinkService.js';
import { PartnerClickService } from '../services/PartnerClickService.js';
import { PartnerConversionService } from '../services/PartnerConversionService.js';
import { PartnerCommissionService } from '../services/PartnerCommissionService.js';
import { PartnerSettlementService } from '../services/PartnerSettlementService.js';

// Mock DataSource for unit testing
let dataSource: DataSource;
let partnerRepository: Repository<Partner>;
let linkRepository: Repository<PartnerLink>;
let clickRepository: Repository<PartnerClick>;
let conversionRepository: Repository<PartnerConversion>;
let commissionRepository: Repository<PartnerCommission>;
let settlementBatchRepository: Repository<PartnerSettlementBatch>;

// Services
let partnerService: PartnerService;
let linkService: PartnerLinkService;
let clickService: PartnerClickService;
let conversionService: PartnerConversionService;
let commissionService: PartnerCommissionService;
let settlementService: PartnerSettlementService;

// Test IDs
let testPartnerId: string;
let testLinkId: string;
let testClickId: string;
let testConversionId: string;
let testCommissionId: string;
let testBatchId: string;

/**
 * Test Suite 1: Click Engine Stability Test
 */
export async function testClickEngine(ds: DataSource): Promise<{
  passed: boolean;
  message: string;
  details?: any;
}> {
  try {
    // Initialize
    partnerRepository = ds.getRepository(Partner);
    linkRepository = ds.getRepository(PartnerLink);
    clickRepository = ds.getRepository(PartnerClick);

    clickService = new PartnerClickService(
      clickRepository,
      linkRepository,
      partnerRepository
    );

    // 1. Create test partner
    const partner = partnerRepository.create({
      userId: 'test-user-' + Date.now(),
      name: 'Test Partner',
      status: PartnerStatus.ACTIVE,
      level: PartnerLevel.STANDARD,
      commissionRate: 5,
    });
    const savedPartner = await partnerRepository.save(partner);
    testPartnerId = savedPartner.id;

    // 2. Create test link
    const link = linkRepository.create({
      partnerId: testPartnerId,
      shortUrl: `https://link.test.com/${Date.now()}`,
      originalUrl: 'https://example.com/product/123',
      targetType: LinkTargetType.PRODUCT,
      targetId: 'product-123',
      productType: 'cosmetics', // Non-pharmaceutical
      status: PartnerLinkStatus.ACTIVE,
    });
    const savedLink = await linkRepository.save(link);
    testLinkId = savedLink.id;

    // 3. Record click
    const clickResult = await clickService.recordClick({
      linkId: testLinkId,
      userAgent: 'Mozilla/5.0 Test Agent',
      referrer: 'https://google.com',
      ipAddress: '127.0.0.1',
      deviceType: 'desktop',
    });

    if (!clickResult.valid) {
      return {
        passed: false,
        message: `Click recording failed: ${clickResult.reason}`,
      };
    }

    testClickId = clickResult.click!.id;

    // 4. Verify click count increase
    const updatedLink = await linkRepository.findOne({ where: { id: testLinkId } });
    const updatedPartner = await partnerRepository.findOne({ where: { id: testPartnerId } });

    if (!updatedLink || updatedLink.clickCount < 1) {
      return {
        passed: false,
        message: 'Link click count not incremented',
      };
    }

    if (!updatedPartner || updatedPartner.clickCount < 1) {
      return {
        passed: false,
        message: 'Partner click count not incremented',
      };
    }

    return {
      passed: true,
      message: 'Click Engine test passed',
      details: {
        partnerId: testPartnerId,
        linkId: testLinkId,
        clickId: testClickId,
        linkClickCount: updatedLink.clickCount,
        partnerClickCount: updatedPartner.clickCount,
      },
    };
  } catch (error: any) {
    return {
      passed: false,
      message: `Click Engine test failed: ${error.message}`,
    };
  }
}

/**
 * Test Suite 2: Conversion Engine Integration Test
 */
export async function testConversionEngine(ds: DataSource): Promise<{
  passed: boolean;
  message: string;
  details?: any;
}> {
  try {
    conversionRepository = ds.getRepository(PartnerConversion);
    clickRepository = ds.getRepository(PartnerClick);
    linkRepository = ds.getRepository(PartnerLink);
    partnerRepository = ds.getRepository(Partner);

    conversionService = new PartnerConversionService(
      conversionRepository,
      clickRepository,
      linkRepository,
      partnerRepository
    );

    // 1. Create conversion from click
    const orderId = `ORD-TEST-${Date.now()}`;
    const conversion = await conversionService.createConversion({
      partnerId: testPartnerId,
      clickId: testClickId,
      orderId,
      orderNumber: orderId,
      productType: 'cosmetics',
      orderAmount: 150000,
    });

    testConversionId = conversion.id;

    // 2. Verify conversion created
    if (conversion.status !== ConversionStatus.PENDING) {
      return {
        passed: false,
        message: `Conversion status should be PENDING, got: ${conversion.status}`,
      };
    }

    // 3. Verify click marked as converted
    const click = await clickRepository.findOne({ where: { id: testClickId } });
    if (!click?.converted) {
      return {
        passed: false,
        message: 'Click not marked as converted',
      };
    }

    // 4. Confirm conversion
    const confirmedConversion = await conversionService.confirmConversion(testConversionId);
    if (!confirmedConversion || confirmedConversion.status !== ConversionStatus.CONFIRMED) {
      return {
        passed: false,
        message: 'Conversion confirmation failed',
      };
    }

    if (!confirmedConversion.confirmedAt) {
      return {
        passed: false,
        message: 'confirmedAt not set',
      };
    }

    return {
      passed: true,
      message: 'Conversion Engine test passed',
      details: {
        conversionId: testConversionId,
        orderId,
        orderAmount: conversion.orderAmount,
        status: confirmedConversion.status,
        attributionDays: conversion.attributionDays,
        confirmedAt: confirmedConversion.confirmedAt,
      },
    };
  } catch (error: any) {
    return {
      passed: false,
      message: `Conversion Engine test failed: ${error.message}`,
    };
  }
}

/**
 * Test Suite 3: Partner Commission Engine Test
 */
export async function testCommissionEngine(ds: DataSource): Promise<{
  passed: boolean;
  message: string;
  details?: any;
}> {
  try {
    commissionRepository = ds.getRepository(PartnerCommission);
    conversionRepository = ds.getRepository(PartnerConversion);
    partnerRepository = ds.getRepository(Partner);
    settlementBatchRepository = ds.getRepository(PartnerSettlementBatch);

    commissionService = new PartnerCommissionService(
      commissionRepository,
      conversionRepository,
      partnerRepository,
      settlementBatchRepository
    );

    // 1. Create commission from conversion
    const commission = await commissionService.createCommissionFromConversion(
      testConversionId
    );

    if (!commission) {
      return {
        passed: false,
        message: 'Commission creation failed',
      };
    }

    testCommissionId = commission.id;

    // 2. Verify commission calculation
    // Order amount: 150000, Partner rate: 5%
    const expectedCommission = 150000 * 0.05; // 7500
    if (Math.abs(commission.commissionAmount - expectedCommission) > 0.01) {
      return {
        passed: false,
        message: `Commission calculation error. Expected: ${expectedCommission}, Got: ${commission.commissionAmount}`,
      };
    }

    // 3. Confirm commission
    const confirmedCommission = await commissionService.confirmCommission(testCommissionId);
    if (!confirmedCommission || confirmedCommission.status !== CommissionStatus.CONFIRMED) {
      return {
        passed: false,
        message: 'Commission confirmation failed',
      };
    }

    // 4. Verify partner totalCommission updated
    const partner = await partnerRepository.findOne({ where: { id: testPartnerId } });
    if (!partner || Number(partner.totalCommission) < commission.finalAmount) {
      return {
        passed: false,
        message: 'Partner totalCommission not updated correctly',
      };
    }

    return {
      passed: true,
      message: 'Commission Engine test passed',
      details: {
        commissionId: testCommissionId,
        baseAmount: commission.baseAmount,
        commissionRate: commission.commissionRate,
        commissionAmount: commission.commissionAmount,
        finalAmount: commission.finalAmount,
        status: confirmedCommission.status,
        partnerTotalCommission: partner?.totalCommission,
      },
    };
  } catch (error: any) {
    return {
      passed: false,
      message: `Commission Engine test failed: ${error.message}`,
    };
  }
}

/**
 * Test Suite 4: Settlement Engine Integration Test
 */
export async function testSettlementEngine(ds: DataSource): Promise<{
  passed: boolean;
  message: string;
  details?: any;
}> {
  try {
    settlementBatchRepository = ds.getRepository(PartnerSettlementBatch);
    commissionRepository = ds.getRepository(PartnerCommission);
    partnerRepository = ds.getRepository(Partner);

    settlementService = new PartnerSettlementService(
      settlementBatchRepository,
      commissionRepository,
      partnerRepository
    );

    // 1. Create settlement batch
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const paymentDueDate = new Date(now.getFullYear(), now.getMonth() + 1, 15);

    const batch = await settlementService.createBatch({
      partnerId: testPartnerId,
      periodStart,
      periodEnd,
      paymentDueDate,
    });

    testBatchId = batch.id;

    if (batch.status !== SettlementBatchStatus.OPEN) {
      return {
        passed: false,
        message: `Batch status should be OPEN, got: ${batch.status}`,
      };
    }

    // 2. Add commissions to batch
    const updatedBatch = await settlementService.addCommissionsToBatch(testBatchId);
    if (!updatedBatch) {
      return {
        passed: false,
        message: 'Failed to add commissions to batch',
      };
    }

    // 3. Close batch
    const closedBatch = await settlementService.closeBatch(testBatchId);
    if (!closedBatch || closedBatch.status !== SettlementBatchStatus.CLOSED) {
      return {
        passed: false,
        message: 'Batch closing failed',
      };
    }

    // 4. Start processing
    const processingBatch = await settlementService.startProcessing(testBatchId);
    if (!processingBatch || processingBatch.status !== SettlementBatchStatus.PROCESSING) {
      return {
        passed: false,
        message: 'Batch processing start failed',
      };
    }

    // 5. Mark as paid
    const paidBatch = await settlementService.markAsPaid(testBatchId, {
      method: 'bank_transfer',
      bankName: 'Test Bank',
      reference: 'TEST-REF-123',
    });

    if (!paidBatch || paidBatch.status !== SettlementBatchStatus.PAID) {
      return {
        passed: false,
        message: 'Batch payment marking failed',
      };
    }

    return {
      passed: true,
      message: 'Settlement Engine test passed',
      details: {
        batchId: testBatchId,
        batchNumber: batch.batchNumber,
        conversionCount: updatedBatch.conversionCount,
        totalCommissionAmount: updatedBatch.totalCommissionAmount,
        netAmount: updatedBatch.netAmount,
        status: paidBatch.status,
        paidAt: paidBatch.paidAt,
      },
    };
  } catch (error: any) {
    return {
      passed: false,
      message: `Settlement Engine test failed: ${error.message}`,
    };
  }
}

/**
 * Test Suite 6: Pharmaceutical Exclusion Validation
 */
export async function testPharmaceuticalExclusion(ds: DataSource): Promise<{
  passed: boolean;
  message: string;
  details?: any;
}> {
  try {
    linkRepository = ds.getRepository(PartnerLink);
    clickRepository = ds.getRepository(PartnerClick);
    conversionRepository = ds.getRepository(PartnerConversion);
    partnerRepository = ds.getRepository(Partner);

    linkService = new PartnerLinkService(linkRepository, partnerRepository);
    clickService = new PartnerClickService(clickRepository, linkRepository, partnerRepository);

    // 1. Create pharmaceutical link (should be allowed at core level)
    const pharmaLink = linkRepository.create({
      partnerId: testPartnerId,
      shortUrl: `https://link.test.com/pharma-${Date.now()}`,
      originalUrl: 'https://example.com/pharma/123',
      targetType: LinkTargetType.PRODUCT,
      targetId: 'pharma-product-123',
      productType: 'PHARMACEUTICAL', // Pharmaceutical product
      status: PartnerLinkStatus.ACTIVE,
    });
    const savedPharmaLink = await linkRepository.save(pharmaLink);

    // 2. Verify pharmaceutical filtering is available
    // Partner-Core stores the data, but filtering happens at PartnerOps level
    // Check that productType is correctly stored
    const verifiedLink = await linkRepository.findOne({ where: { id: savedPharmaLink.id } });
    if (verifiedLink?.productType !== 'PHARMACEUTICAL') {
      return {
        passed: false,
        message: 'Pharmaceutical productType not stored correctly',
      };
    }

    // 3. Test filtering query (what PartnerOps should use)
    const nonPharmaLinks = await linkRepository
      .createQueryBuilder('link')
      .where('link.partnerId = :partnerId', { partnerId: testPartnerId })
      .andWhere('(link.productType IS NULL OR link.productType != :pharmaType)', {
        pharmaType: 'PHARMACEUTICAL',
      })
      .getMany();

    // Should not include pharmaceutical link
    const hasPharmaLink = nonPharmaLinks.some(l => l.productType === 'PHARMACEUTICAL');
    if (hasPharmaLink) {
      return {
        passed: false,
        message: 'Pharmaceutical filtering query not working',
      };
    }

    // 4. Clean up pharmaceutical test data
    await linkRepository.delete(savedPharmaLink.id);

    return {
      passed: true,
      message: 'Pharmaceutical Exclusion test passed',
      details: {
        pharmaLinkCreated: true,
        productTypeStored: 'PHARMACEUTICAL',
        filterQueryWorks: true,
        nonPharmaLinksCount: nonPharmaLinks.length,
      },
    };
  } catch (error: any) {
    return {
      passed: false,
      message: `Pharmaceutical Exclusion test failed: ${error.message}`,
    };
  }
}

/**
 * Clean up test data
 */
export async function cleanup(ds: DataSource): Promise<void> {
  try {
    // Delete in reverse order of creation (due to foreign keys)
    if (testBatchId) {
      await ds.getRepository(PartnerSettlementBatch).delete(testBatchId);
    }
    if (testCommissionId) {
      await ds.getRepository(PartnerCommission).delete(testCommissionId);
    }
    if (testConversionId) {
      await ds.getRepository(PartnerConversion).delete(testConversionId);
    }
    if (testClickId) {
      await ds.getRepository(PartnerClick).delete(testClickId);
    }
    if (testLinkId) {
      await ds.getRepository(PartnerLink).delete(testLinkId);
    }
    if (testPartnerId) {
      await ds.getRepository(Partner).delete(testPartnerId);
    }
    console.log('[Partner-Core Test] Cleanup completed');
  } catch (error) {
    console.error('[Partner-Core Test] Cleanup error:', error);
  }
}

/**
 * Run all tests
 */
export async function runAllTests(ds: DataSource): Promise<{
  allPassed: boolean;
  results: Array<{ test: string; passed: boolean; message: string; details?: any }>;
}> {
  const results: Array<{ test: string; passed: boolean; message: string; details?: any }> = [];

  console.log('\n========================================');
  console.log('Partner-Core Integration Tests - Phase 7');
  console.log('========================================\n');

  // Task 1: Click Engine
  console.log('[1/6] Testing Click Engine...');
  const clickResult = await testClickEngine(ds);
  results.push({ test: 'Click Engine', ...clickResult });
  console.log(`     ${clickResult.passed ? '✓' : '✗'} ${clickResult.message}`);

  // Task 2: Conversion Engine
  console.log('[2/6] Testing Conversion Engine...');
  const conversionResult = await testConversionEngine(ds);
  results.push({ test: 'Conversion Engine', ...conversionResult });
  console.log(`     ${conversionResult.passed ? '✓' : '✗'} ${conversionResult.message}`);

  // Task 3: Commission Engine
  console.log('[3/6] Testing Commission Engine...');
  const commissionResult = await testCommissionEngine(ds);
  results.push({ test: 'Commission Engine', ...commissionResult });
  console.log(`     ${commissionResult.passed ? '✓' : '✗'} ${commissionResult.message}`);

  // Task 4: Settlement Engine
  console.log('[4/6] Testing Settlement Engine...');
  const settlementResult = await testSettlementEngine(ds);
  results.push({ test: 'Settlement Engine', ...settlementResult });
  console.log(`     ${settlementResult.passed ? '✓' : '✗'} ${settlementResult.message}`);

  // Task 6: Pharmaceutical Exclusion
  console.log('[5/6] Testing Pharmaceutical Exclusion...');
  const pharmaResult = await testPharmaceuticalExclusion(ds);
  results.push({ test: 'Pharmaceutical Exclusion', ...pharmaResult });
  console.log(`     ${pharmaResult.passed ? '✓' : '✗'} ${pharmaResult.message}`);

  // Cleanup
  console.log('[6/6] Cleaning up test data...');
  await cleanup(ds);
  console.log('     ✓ Cleanup completed');

  const allPassed = results.every(r => r.passed);

  console.log('\n========================================');
  console.log(`Results: ${results.filter(r => r.passed).length}/${results.length} tests passed`);
  console.log(`Status: ${allPassed ? 'ALL PASSED ✓' : 'SOME FAILED ✗'}`);
  console.log('========================================\n');

  return { allPassed, results };
}

export default runAllTests;
