/**
 * Commission Controller
 *
 * API: /api/v1/dropshipping/core/commission
 */

import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { CommissionService } from '../services/CommissionService.js';
import { CommissionRule, CommissionRuleStatus } from '../entities/CommissionRule.entity.js';
import { CommissionTransaction } from '../entities/CommissionTransaction.entity.js';

@Controller('api/v1/dropshipping/core/commission')
export class CommissionController {
  constructor(private readonly commissionService: CommissionService) {}

  // Commission Rules
  @Get('rules')
  async findAllRules(
    @Query('status') status?: CommissionRuleStatus
  ): Promise<CommissionRule[]> {
    return await this.commissionService.findAllRules({ status });
  }

  @Get('rules/:id')
  async findRule(@Param('id') id: string): Promise<CommissionRule> {
    const rule = await this.commissionService.findRuleById(id);
    if (!rule) {
      throw new Error('Commission rule not found');
    }
    return rule;
  }

  @Post('rules')
  async createRule(@Body() data: Partial<CommissionRule>): Promise<CommissionRule> {
    return await this.commissionService.createRule(data);
  }

  @Put('rules/:id')
  async updateRule(
    @Param('id') id: string,
    @Body() data: Partial<CommissionRule>
  ): Promise<CommissionRule> {
    return await this.commissionService.updateRule(id, data);
  }

  @Delete('rules/:id')
  async deleteRule(@Param('id') id: string): Promise<void> {
    await this.commissionService.deleteRule(id);
  }

  // Commission Transactions
  @Get('transactions')
  async findAllTransactions(
    @Query('orderRelayId') orderRelayId?: string,
    @Query('settlementBatchId') settlementBatchId?: string
  ): Promise<CommissionTransaction[]> {
    return await this.commissionService.findAllTransactions({
      orderRelayId,
      settlementBatchId,
    });
  }

  @Get('transactions/:id')
  async findTransaction(@Param('id') id: string): Promise<CommissionTransaction> {
    const transaction = await this.commissionService.findTransactionById(id);
    if (!transaction) {
      throw new Error('Commission transaction not found');
    }
    return transaction;
  }
}
