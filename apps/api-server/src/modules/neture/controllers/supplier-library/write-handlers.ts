import { Request, Response } from 'express';
import { NetureLibraryService } from '../../services/neture-library.service.js';
import logger from '../../../../utils/logger.js';
import type { SupplierRequest } from './access.js';
export function createSupplierLibraryWriteHandlers(
  libraryService: Pick<NetureLibraryService, 'create' | 'update' | 'delete'>,
) {
  return {
    create: async (req: Request, res: Response) => {
      try {
        const supplierId = (req as SupplierRequest).supplierId;
        const {
          title,
          description,
          fileUrl,
          fileName,
          fileSize,
          mimeType,
          category,
          isPublic,
          contentType,
          blocks,
        } = req.body;
        const isDocument = contentType === 'document';

        // 입력 검증
        if (!title || typeof title !== 'string') {
          res
            .status(400)
            .json({
              success: false,
              error: { code: 'MISSING_TITLE', message: 'title is required' },
            });
          return;
        }

        if (isDocument) {
          // document 타입: blocks 필수, file 필드 불필요
          if (!Array.isArray(blocks) || blocks.length === 0) {
            res
              .status(400)
              .json({
                success: false,
                error: { code: 'MISSING_BLOCKS', message: 'blocks are required for document type' },
              });
            return;
          }
        } else {
          // media 타입: file 필드 필수
          if (!fileUrl || typeof fileUrl !== 'string') {
            res
              .status(400)
              .json({
                success: false,
                error: { code: 'MISSING_FILE_URL', message: 'fileUrl is required' },
              });
            return;
          }
          if (!fileName || typeof fileName !== 'string') {
            res
              .status(400)
              .json({
                success: false,
                error: { code: 'MISSING_FILE_NAME', message: 'fileName is required' },
              });
            return;
          }
          if (fileSize === undefined || fileSize === null || typeof fileSize !== 'number') {
            res
              .status(400)
              .json({
                success: false,
                error: { code: 'MISSING_FILE_SIZE', message: 'fileSize is required (number)' },
              });
            return;
          }
          if (!mimeType || typeof mimeType !== 'string') {
            res
              .status(400)
              .json({
                success: false,
                error: { code: 'MISSING_MIME_TYPE', message: 'mimeType is required' },
              });
            return;
          }
        }

        const result = await libraryService.create(supplierId, {
          title: title.slice(0, 200),
          description: description ?? null,
          fileUrl: !isDocument ? fileUrl : '',
          fileName: !isDocument ? fileName.slice(0, 255) : '',
          fileSize: !isDocument ? fileSize : 0,
          mimeType: !isDocument ? mimeType.slice(0, 100) : 'text/html',
          category: category ? String(category).slice(0, 100) : null,
          isPublic: isPublic === true,
          contentType: typeof contentType === 'string' ? contentType.slice(0, 50) : undefined,
          blocks: Array.isArray(blocks) ? blocks : undefined,
        });

        res.status(201).json(result);
      } catch (error) {
        logger.error('[Neture Library API] Error creating item:', error);
        res
          .status(500)
          .json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Failed to create library item' },
          });
      }
    },
    update: async (req: Request, res: Response) => {
      try {
        const supplierId = (req as SupplierRequest).supplierId;
        const { id } = req.params;
        const {
          title,
          description,
          fileUrl,
          fileName,
          fileSize,
          mimeType,
          category,
          isPublic,
          contentType,
          blocks,
        } = req.body;

        const input: Record<string, unknown> = {};
        if (title !== undefined) input.title = String(title).slice(0, 200);
        if (description !== undefined) input.description = description;
        if (fileUrl !== undefined) input.fileUrl = fileUrl;
        if (fileName !== undefined) input.fileName = String(fileName).slice(0, 255);
        if (fileSize !== undefined) input.fileSize = fileSize;
        if (mimeType !== undefined) input.mimeType = String(mimeType).slice(0, 100);
        if (category !== undefined)
          input.category = category ? String(category).slice(0, 100) : null;
        if (isPublic !== undefined) input.isPublic = isPublic === true;
        if (contentType !== undefined) input.contentType = String(contentType).slice(0, 50);
        if (blocks !== undefined) input.blocks = Array.isArray(blocks) ? blocks : null;

        if (Object.keys(input).length === 0) {
          res
            .status(400)
            .json({
              success: false,
              error: { code: 'NO_FIELDS', message: 'At least one field to update is required' },
            });
          return;
        }

        const result = await libraryService.update(id, supplierId, input);
        if (!result.success) {
          const errResult = result as { success: false; error: string };
          res
            .status(404)
            .json({
              success: false,
              error: { code: errResult.error, message: 'Library item not found' },
            });
          return;
        }
        res.json(result);
      } catch (error) {
        logger.error('[Neture Library API] Error updating item:', error);
        res
          .status(500)
          .json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Failed to update library item' },
          });
      }
    },
    remove: async (req: Request, res: Response) => {
      try {
        const supplierId = (req as SupplierRequest).supplierId;
        const { id } = req.params;

        const result = await libraryService.delete(id, supplierId);
        if (!result.success) {
          const errResult = result as { success: false; error: string };
          res
            .status(404)
            .json({
              success: false,
              error: { code: errResult.error, message: 'Library item not found' },
            });
          return;
        }
        res.json(result);
      } catch (error) {
        logger.error('[Neture Library API] Error deleting item:', error);
        res
          .status(500)
          .json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Failed to delete library item' },
          });
      }
    },
  };
}
