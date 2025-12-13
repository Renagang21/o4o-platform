/**
 * PartnerOps Conversions Controller
 *
 * Partner-Core 기반 전환 컨트롤러
 *
 * @package @o4o/partnerops
 */

import { Request, Response } from 'express';
import type { ConversionService } from '../services/ConversionService.js';
import type { ApiResponseDto, ConversionQueryDto } from '../dto/index.js';

export class ConversionsController {
  constructor(private conversionService: ConversionService) {}

  /**
   * GET /partnerops/conversions
   * 전환 목록 조회
   */
  async list(req: Request, res: Response): Promise<void> {
    try {
      const partnerId = (req as any).partnerId;

      if (!partnerId) {
        const response: ApiResponseDto<null> = {
          success: false,
          error: 'Partner ID required',
        };
        res.status(400).json(response);
        return;
      }

      const filters: ConversionQueryDto = {
        status: req.query.status as any,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      };

      const conversions = await this.conversionService.list(partnerId, filters);

      const response: ApiResponseDto<typeof conversions> = {
        success: true,
        data: conversions,
      };
      res.json(response);
    } catch (error: any) {
      console.error('List conversions error:', error);
      const response: ApiResponseDto<null> = {
        success: false,
        error: error.message,
      };
      res.status(500).json(response);
    }
  }

  /**
   * GET /partnerops/conversions/:id
   * 전환 상세 조회
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const partnerId = (req as any).partnerId;
      const conversionId = req.params.id;

      if (!partnerId) {
        const response: ApiResponseDto<null> = {
          success: false,
          error: 'Partner ID required',
        };
        res.status(400).json(response);
        return;
      }

      const conversion = await this.conversionService.getById(partnerId, conversionId);

      if (!conversion) {
        const response: ApiResponseDto<null> = {
          success: false,
          error: 'Conversion not found',
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponseDto<typeof conversion> = {
        success: true,
        data: conversion,
      };
      res.json(response);
    } catch (error: any) {
      console.error('Get conversion error:', error);
      const response: ApiResponseDto<null> = {
        success: false,
        error: error.message,
      };
      res.status(500).json(response);
    }
  }

  /**
   * GET /partnerops/conversions/summary
   * 전환 요약 조회
   */
  async getSummary(req: Request, res: Response): Promise<void> {
    try {
      const partnerId = (req as any).partnerId;

      if (!partnerId) {
        const response: ApiResponseDto<null> = {
          success: false,
          error: 'Partner ID required',
        };
        res.status(400).json(response);
        return;
      }

      const summary = await this.conversionService.getSummary(partnerId);

      const response: ApiResponseDto<typeof summary> = {
        success: true,
        data: summary,
      };
      res.json(response);
    } catch (error: any) {
      console.error('Get conversion summary error:', error);
      const response: ApiResponseDto<null> = {
        success: false,
        error: error.message,
      };
      res.status(500).json(response);
    }
  }

  /**
   * GET /partnerops/conversions/funnel
   * 퍼널 분석 조회
   */
  async getFunnel(req: Request, res: Response): Promise<void> {
    try {
      const partnerId = (req as any).partnerId;

      if (!partnerId) {
        const response: ApiResponseDto<null> = {
          success: false,
          error: 'Partner ID required',
        };
        res.status(400).json(response);
        return;
      }

      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : undefined;
      const endDate = req.query.endDate
        ? new Date(req.query.endDate as string)
        : undefined;

      const funnel = await this.conversionService.getFunnel(partnerId, startDate, endDate);

      const response: ApiResponseDto<typeof funnel> = {
        success: true,
        data: funnel,
      };
      res.json(response);
    } catch (error: any) {
      console.error('Get conversion funnel error:', error);
      const response: ApiResponseDto<null> = {
        success: false,
        error: error.message,
      };
      res.status(500).json(response);
    }
  }
}

export default ConversionsController;
