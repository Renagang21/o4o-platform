/**
 * Documents Controller
 *
 * API: /api/v1/sellerops/documents
 */

import { Controller, Get, Param, Query } from '@nestjs/common';
import { NotificationService } from '../services/NotificationService.js';
import type { DocumentDto } from '../dto/index.js';

@Controller('api/v1/sellerops/documents')
export class DocumentsController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async getDocuments(
    @Query('category') category?: string
  ): Promise<DocumentDto[]> {
    return await this.notificationService.getDocuments(category);
  }

  @Get(':id')
  async getDocument(@Param('id') id: string): Promise<DocumentDto> {
    const document = await this.notificationService.getDocumentById(id);
    if (!document) {
      throw new Error('Document not found');
    }
    return document;
  }
}
